import { Response } from "express";
import pool from "../../../DB/db.js";
import { AuthenticatedRequest } from "../../../middleware/authMiddleware.js";

const DOC_TYPE = "PI";

interface PILine {
  slNo: number;
  itemId: string;
  unit?: string;
  qtyIn: number;
  unitPriceFC?: number;
  unitPrice?: number;
  totalPrice?: number;
  totalPriceFC?: number;
  unitCost?: number;
  totalCost?: number;
}

const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/* docNo like "PI0012" -> 12 (VB used DocNo minus prefix) */
const getIntDocNo = (docNo: string): number => {
  const m = docNo.match(/(\d+)$/);
  return m ? parseInt(m[1], 10) : 0;
};

/* =========================================================
   POST /purchase-invoice/calc-unit-cost
   Port of VB CalcUnitCost (cmdCalcUnitcost_Click)
   body: { lines: [{ itemId, qtyIn, unitPrice }], totalExpense, discAmt }
   ========================================================= */
export const calcUnitCost = (
  req: AuthenticatedRequest,
  res: Response,
): Response => {
  try {
    const { lines, totalExpense, discAmt } = req.body as {
      lines: { itemId?: string; qtyIn?: number; unitPrice?: number }[];
      totalExpense?: number;
      discAmt?: number;
    };

    if (!Array.isArray(lines)) {
      return res
        .status(400)
        .json({ success: false, message: "lines are required" });
    }

    const round4 = (v: number) =>
      Math.round((v + Number.EPSILON) * 10000) / 10000;

    // VB: grdvDoc.Columns("fTotalPrice").SummaryText (SAR total = qty * unit price)
    const totalInvoiceAmt = lines.reduce(
      (sum, l) =>
        l.itemId
          ? sum + Number((num(l.qtyIn) * num(l.unitPrice)).toFixed(2))
          : sum,
      0,
    );

    const expFor1SAR =
      totalInvoiceAmt !== 0 ? num(totalExpense) / totalInvoiceAmt : 0;
    const discFor1SAR =
      totalInvoiceAmt !== 0 ? num(discAmt) / totalInvoiceAmt : 0;

    let totalCost = 0;

    const result = lines.map((l) => {
      // VB skips rows with no item
      if (!l.itemId) return { unitCost: 0, totalCost: 0 };

      const unitPrice = num(l.unitPrice);

      let unitCost =
        unitPrice * expFor1SAR + unitPrice - unitPrice * discFor1SAR;
      unitCost =
        unitCost <= 0 || !Number.isFinite(unitCost) ? 0 : round4(unitCost);

      let rowTotal = num(l.qtyIn) * unitCost;
      rowTotal = rowTotal <= 0 ? 0 : round4(rowTotal);

      totalCost += rowTotal;
      return { unitCost, totalCost: rowTotal };
    });

    return res.status(200).json({
      success: true,
      data: { lines: result, totalCost: round4(totalCost) },
    });
  } catch (error: unknown) {
    console.error("calcUnitCost error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to calculate unit cost" });
  }
};

/* =========================================================
   GET  /purchase-invoice?year=&brId=&docNo=
   (reads tables directly: a PROCEDURE can't return rows)
   ========================================================= */
export const getPurchaseInvoice = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<Response> => {
  try {
    const coId = req.user?.companyId;
    const { year, brId, docNo } = req.query as Record<string, string>;

    if (!coId || !year || !brId || !docNo) {
      return res.status(400).json({
        success: false,
        message: "year, brId and docNo are required",
      });
    }

    const params = [coId, year, brId, DOC_TYPE, docNo];

    const header = await pool.query(
      `SELECT fsupplierid, fsuppliername, fcurrency, fcurrencyrate, fdate,
              fpino, fpono, fvatno, finvoicetype, fnote
       FROM dbo.tblpurchaseinvoice
       WHERE fcoid=$1 AND fyear=$2 AND fbrid=$3 AND fdoctype=$4 AND fdocno=$5`,
      params,
    );

    if (header.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Purchase Invoice not found" });
    }

    const lines = await pool.query(
      `SELECT fslno, fitemid, funit, fqtyin, funitprice_fc, funitprice,
              ftotalprice, ftotalprice_fc, funitcost, ftotalcost,
              fsupplieramt, fdiscamt_fc, fdiscamt, fvatamt
       FROM dbo.tblpurchaseinvoicedetail
       WHERE fcoid=$1 AND fyear=$2 AND fbrid=$3 AND fdoctype=$4 AND fdocno=$5
       ORDER BY fslno`,
      params,
    );

    return res.status(200).json({
      success: true,
      data: { header: header.rows[0], lines: lines.rows },
    });
  } catch (error: unknown) {
    console.error("getPurchaseInvoice error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch Purchase Invoice" });
  }
};

/* =========================================================
   POST /purchase-invoice   (create or modify)
   ========================================================= */
export const savePurchaseInvoice = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<Response> => {
  const client = await pool.connect();

  try {
    const coId = req.user?.companyId;
    const userId = req.user?.userId;

    const {
      mode, // "S" = new, "M" = modify
      year,
      brId,
      docNo,
      invoiceType, // "C" cash / "R" credit
      piNo,
      poNo,
      date,
      vatNo,
      supplierId,
      supplierName,
      currency,
      currencyRate,
      note,
      discAmtFC,
      discAmt,
      vatAmt,
      menuName,
      lines,
    } = req.body as {
      mode: "S" | "M";
      year: string;
      brId: string;
      docNo: string;
      invoiceType: string;
      piNo: string;
      poNo?: string;
      date: string;
      vatNo?: string;
      supplierId: string;
      supplierName?: string;
      currency: string;
      currencyRate: number;
      note?: string;
      discAmtFC?: number;
      discAmt?: number;
      vatAmt?: number;
      menuName?: string;
      lines: PILine[];
    };

    /* ---------- validation (from frmPI.ValidateMe / ValidateGrid) ---------- */
    if (!coId || !userId)
      return res
        .status(401)
        .json({ success: false, message: "Authentication required" });
    if (!["S", "M"].includes(mode))
      return res
        .status(400)
        .json({ success: false, message: "mode must be 'S' or 'M'" });
    if (!year || !brId)
      return res
        .status(400)
        .json({ success: false, message: "Please select Year and Branch" });
    if (!docNo)
      return res
        .status(400)
        .json({ success: false, message: "Please enter 'Entry No.'" });
    if (!date)
      return res
        .status(400)
        .json({ success: false, message: "Please enter 'Date'" });
    if (new Date(date).getFullYear() !== Number(year))
      return res.status(400).json({
        success: false,
        message: "'Login Year' should be same as 'Transaction Year'",
      });
    if (!piNo)
      return res
        .status(400)
        .json({ success: false, message: "Please enter 'Invoice No'" });
    if (invoiceType === "C" && !supplierName)
      return res
        .status(400)
        .json({ success: false, message: "Please enter 'Supplier Name'" });
    if (invoiceType !== "C" && !supplierId)
      return res
        .status(400)
        .json({ success: false, message: "Please select 'Supplier ID'" });

    const validLines = (lines ?? []).filter((l) => l.itemId);
    if (validLines.length === 0)
      return res.status(400).json({
        success: false,
        message: "There is no Information for Saving",
      });

    for (const l of validLines) {
      if (num(l.qtyIn) <= 0)
        return res.status(400).json({
          success: false,
          message: `Sl.# ${l.slNo} - Please input 'Qty.'`,
        });
    }

    if (poNo) {
      const po = await client.query(
        `SELECT 1 FROM dbo.tblpo WHERE fcoid=$1 AND fbrid=$2 AND fpono=$3`,
        [coId, brId, poNo.trim()],
      );
      if (po.rows.length === 0)
        return res.status(400).json({
          success: false,
          message: "Purchase Order No. does not exist.",
        });
    }

    /* ---------- totals (same as VB) ---------- */
    const grossPrice = validLines.reduce((s, l) => s + num(l.totalPrice), 0);
    const totalCost = validLines.reduce((s, l) => s + num(l.totalCost), 0);
    const totalPriceFC = validLines.reduce(
      (s, l) => s + num(l.totalPriceFC),
      0,
    );
    const supplierAmt = Number((grossPrice - num(discAmt)).toFixed(2));

    /* ---------- named-arg CALL helper ---------- */
    const callSP = (args: Record<string, unknown>) => {
      const keys = Object.keys(args);
      const sql = `CALL dbo.sp_pagepi(${keys.map((k, i) => `${k} => $${i + 1}`).join(", ")})`;
      return client.query(
        sql,
        keys.map((k) => args[k]),
      );
    };

    const base = {
      pstrcoid: coId,
      stryear: String(year),
      strbrid: brId,
      strdoctype: DOC_TYPE,
      strdocno: docNo,
      intdocno: getIntDocNo(docNo),
      gstruserid: userId,
      strmenuname: menuName ?? "frmPI",
    };

    await client.query("BEGIN");

    if (mode === "S") {
      const exists = await client.query(
        `SELECT 1 FROM dbo.tblpurchaseinvoice
         WHERE fcoid=$1 AND fyear=$2 AND fbrid=$3 AND fdoctype=$4 AND fdocno=$5`,
        [coId, String(year), brId, DOC_TYPE, docNo],
      );
      if (exists.rows.length > 0) {
        await client.query("ROLLBACK");
        return res.status(409).json({
          success: false,
          message: "Purchase Invoice with the same 'Entry No.' already exists",
        });
      }
    } else {
      // modify = wipe header + lines, then re-insert (as VB did for expenses)
      await callSP({ strmode: "D", ...base });
    }

    /* ---------- header ---------- */
    await callSP({
      strmode: "S",
      ...base,
      strinvoicetype: invoiceType,
      dtpdate: date,
      strpino: piNo,
      strpono: poNo?.trim() ?? null,
      strvatno: vatNo ?? null,
      strsupplierid: supplierId,
      strsuppliername:
        invoiceType === "C" ? supplierName : (supplierName ?? null),
      strcurrency: currency,
      numcurrencyrate: num(currencyRate) || 1,
      strnote: note ?? null,
    });

    /* ---------- lines ---------- */
    for (const l of validLines) {
      await callSP({
        strmode: "M",
        ...base,
        dtpdate: date,
        strsupplierid: supplierId,
        strcurrency: currency,
        numcurrencyrate: num(currencyRate) || 1,
        intslno: l.slNo,
        stritemid: l.itemId,
        strunit: l.unit ?? null,
        numqtyin: num(l.qtyIn),
        numunitprice_fc: num(l.unitPriceFC),
        numunitprice: num(l.unitPrice),
        numtotalprice: num(l.totalPrice),
        numtotalprice_fc: num(l.totalPriceFC),
        numunitcost: num(l.unitCost),
        numtotalcost: num(l.totalCost),
        numgtotalcost: totalCost,
        numgtotalprice_fc: totalPriceFC,
        numsupplieramt: supplierAmt,
        numdiscamt_fc: num(discAmtFC),
        numdiscamt: num(discAmt),
        numvatamt: num(vatAmt),
        strnote: note ?? null,
      });
    }

    await client.query("COMMIT");

    return res.status(200).json({
      success: true,
      message: mode === "S" ? "Saved" : "Modified",
      data: { docNo },
    });
  } catch (error: unknown) {
    await client.query("ROLLBACK").catch(() => undefined);
    console.error("savePurchaseInvoice error:", error);
    return res.status(500).json({
      success: false,
      message: "Not saved, try again",
      error: error instanceof Error ? error.message : String(error),
    });
  } finally {
    client.release();
  }
};

/* =========================================================
   DELETE /purchase-invoice?year=&brId=&docNo=
   ========================================================= */
export const deletePurchaseInvoice = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<Response> => {
  try {
    const coId = req.user?.companyId;
    const userId = req.user?.userId;
    const { year, brId, docNo } = req.query as Record<string, string>;

    if (!coId || !userId || !year || !brId || !docNo) {
      return res.status(400).json({
        success: false,
        message: "year, brId and docNo are required",
      });
    }

    await pool.query(
      `CALL dbo.sp_pagepi(
         strmode => 'D', pstrcoid => $1, stryear => $2, strbrid => $3,
         strdoctype => $4, strdocno => $5, gstruserid => $6)`,
      [coId, year, brId, DOC_TYPE, docNo, userId],
    );

    return res.status(200).json({ success: true, message: "Deleted" });
  } catch (error: unknown) {
    console.error("deletePurchaseInvoice error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Not deleted, try again" });
  }
};

/* =========================================================
   CASH (MISC.) SUPPLIER  -  port of VB clsCashSupplier
   ========================================================= */

/* VB: SP_GetCashSupplier -> list for the combos */
export const getCashSuppliers = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<Response> => {
  try {
    const coId = req.user?.companyId;
    if (!coId)
      return res
        .status(401)
        .json({ success: false, message: "Authentication required" });

    const result = await pool.query(
      `SELECT "fCashSupplierID"   AS fcashsupplierid,
          "fCashSupplierName" AS fcashsuppliername,
          "fVATNo"            AS fvatno
   FROM dbo."tblCashSupplier"
   WHERE "fCoID" = $1
   ORDER BY "fCashSupplierID"`,
      [coId],
    );

    return res.status(200).json({ success: true, data: result.rows });
  } catch (error: unknown) {
    console.error("getCashSuppliers error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch cash suppliers" });
  }
};

/* VB: GetCashSupplierID -> Select dbo.GetCashSupplierID(CoID) */
export const getNextCashSupplierId = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<Response> => {
  try {
    const coId = req.user?.companyId;
    if (!coId)
      return res
        .status(401)
        .json({ success: false, message: "Authentication required" });

    const result = await pool.query(
      `SELECT dbo.getcashsupplierid($1::varchar) AS id`,
      [coId],
    );

    return res
      .status(200)
      .json({ success: true, data: { id: result.rows[0]?.id ?? "" } });
  } catch (error: unknown) {
    console.error("getNextCashSupplierId error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to get next supplier id" });
  }
};

/* VB: GetData (strMode "G") */
export const getCashSupplier = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<Response> => {
  try {
    const coId = req.user?.companyId;
    const { id } = req.params;
    if (!coId || !id)
      return res
        .status(400)
        .json({ success: false, message: "Cash Supplier ID is required" });

    const result = await pool.query(
      `SELECT "fCashSupplierID"   AS fcashsupplierid,
          "fCashSupplierName" AS fcashsuppliername,
          "fVATNo"            AS fvatno
   FROM dbo."tblCashSupplier"
   WHERE "fCoID" = $1 AND "fCashSupplierID" = $2`,
      [coId, id],
    );

    if (result.rows.length === 0)
      return res
        .status(404)
        .json({ success: false, message: "Cash Supplier not found" });

    return res.status(200).json({ success: true, data: result.rows[0] });
  } catch (error: unknown) {
    console.error("getCashSupplier error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch cash supplier" });
  }
};

/* VB: Apply (strMode S / M) + ValidateMe */
export const saveCashSupplier = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<Response> => {
  try {
    const coId = req.user?.companyId;
    const userId = req.user?.userId;

    const { mode, cashSupplierId, cashSupplierName, vatNo } = req.body as {
      mode: "S" | "M";
      cashSupplierId: string;
      cashSupplierName: string;
      vatNo?: string;
    };

    if (!coId || !userId)
      return res
        .status(401)
        .json({ success: false, message: "Authentication required" });
    if (!["S", "M"].includes(mode))
      return res
        .status(400)
        .json({ success: false, message: "mode must be 'S' or 'M'" });
    if (!cashSupplierId?.trim())
      return res
        .status(400)
        .json({ success: false, message: "Please input 'Cash Supplier ID'" });
    if (!cashSupplierName?.trim())
      return res
        .status(400)
        .json({ success: false, message: "Please input 'Cash Supplier Name'" });

    const vat = (vatNo ?? "").trim();
    if (vat && vat.length < 15)
      return res.status(400).json({
        success: false,
        message: "'VAT No.' Should be 15 digits width",
      });

    await pool.query(
      `CALL dbo.sp_pagecashsupplier(
     strmode => $1, gstrcoid => $2, strcashsupplierid => $3,
     strcashsuppliername => $4, strvatno => $5, gstruserid => $6)`,
      [
        mode,
        coId,
        cashSupplierId.trim(),
        cashSupplierName.trim().toUpperCase(),
        vat,
        userId,
      ],
    );

    return res.status(200).json({
      success: true,
      message: mode === "S" ? "Saved" : "Modified",
      data: { cashSupplierId: cashSupplierId.trim() },
    });
  } catch (error: unknown) {
    console.error("saveCashSupplier error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Not saved, try again" });
  }
};

/* VB: ApplyD */
export const deleteCashSupplier = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<Response> => {
  try {
    const coId = req.user?.companyId;
    const userId = req.user?.userId;
    const { id } = req.params;
    if (!coId || !userId || !id)
      return res
        .status(400)
        .json({ success: false, message: "Please input 'Cash Supplier ID'" });

    await pool.query(
      `CALL dbo.sp_pagecashsupplier(
     strmode => 'D', gstrcoid => $1, strcashsupplierid => $2, gstruserid => $3)`,
      [coId, id, userId],
    );

    return res.status(200).json({ success: true, message: "Deleted" });
  } catch (error: unknown) {
    console.error("deleteCashSupplier error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Document is not deleted, try again" });
  }
};
