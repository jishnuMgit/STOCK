import { Response } from "express";
import pool from "../../../DB/db.js";
import { AuthenticatedRequest } from "../../../middleware/authMiddleware.js";

const DOC_TYPE = "PI";

/* FC (foreign currency) fields removed - the new sp_pagepi does not have them */
interface PILine {
  slNo: number;
  itemId: string;
  unit?: string;
  qtyIn: number;
  unitPrice?: number;
  totalPrice?: number;
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
   Helper: CALL dbo.sp_pagepi with named args.
   All SP params start with "p_", so we add the prefix here.
   Works with both `pool` and a transaction `client`.
   ========================================================= */
type PgClient = {
  query: (sql: string, params?: unknown[]) => Promise<any>;
};

interface PIExpLine {
  slNo: number;
  accountId: string;
  ccId?: string;
  currency?: string;
  currencyRate?: number;
  creditFC?: number;
  credit: number;
  description?: string;
}

/* CALL dbo.sp_frmpiexp with named args (all SP params start with "p_") */
const callPIExp = (db: PgClient, args: Record<string, unknown>) => {
  const keys = Object.keys(args);
  const sql = `CALL dbo.sp_frmpiexp(${keys
    .map((k, i) => `p_${k} => $${i + 1}`)
    .join(", ")})`;
  return db.query(
    sql,
    keys.map((k) => args[k]),
  );
};

/* Port of VB ApplyPIExp: D1 (delete all) then S for every row */
const applyPIExp = async (
  db: PgClient,
  a: {
    coId: string;
    userId: string;
    year: string;
    brId: string;
    docNo: string;
    date: string;
    currency: string;
    currencyRate: number;
    rows: PIExpLine[];
  },
) => {
  const common = {
    gstrcoid: a.coId,
    gintyear: Number(a.year),
    strbrid: a.brId,
    strdoctype: DOC_TYPE,
    strdocno: a.docNo,
  };

  // VB ApplyDExp: delete all existing expense postings
  await callPIExp(db, { strmode: "D1", ...common });

  for (const r of a.rows) {
    await callPIExp(db, {
      strmode: "S",
      ...common,
      intdocno: getIntDocNo(a.docNo),
      dtpdate: a.date,
      intslno: r.slNo,
      straccountid: r.accountId,
      strccid: r.ccId ?? "",
      strcurrency: r.currency || a.currency,
      numcurrencyrate: num(r.currencyRate) || num(a.currencyRate) || 1,
      numcreditfc: num(r.creditFC),
      numcredit: num(r.credit),
      strdescription: r.description?.slice(0, 100) ?? null,
      gstruserid: a.userId,
    });
  }
};

const callPagePI = (db: PgClient, args: Record<string, unknown>) => {
  const keys = Object.keys(args);
  const sql = `CALL dbo.sp_pagepi(${keys
    .map((k, i) => `p_${k} => $${i + 1}`)
    .join(", ")})`;
  return db.query(
    sql,
    keys.map((k) => args[k]),
  );
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

   NOTE: sp_pagepi modes GHD / GTL are SELECTs inside a PROCEDURE.
   A Postgres PROCEDURE cannot return rows, so those modes
   will fail. Until they are moved into table-returning
   functions, we read tblstocktrans directly using the same
   columns the SP's GHD / GTL modes select.
   ========================================================= */
export const getPurchaseInvoice = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<Response> => {
  try {
    const coId = req.user?.CoID;
    const { year, brId, docNo } = req.query as Record<string, string>;

    if (!coId || !year || !brId || !docNo) {
      return res.status(400).json({
        success: false,
        message: "year, brId and docNo are required",
      });
    }

    const params = [coId, Number(year), brId, DOC_TYPE, docNo];

    // same columns as sp_pagepi 'GHD'
    const header = await pool.query(
      `SELECT DISTINCT
      fpisitype AS finvoicetype, fdate, fcsaccountid AS faccountid,
      fpono, fpino, fcurrency, fcurrencyrate, fnote, fdiscamt, fdocamt,
      fnetdocamt, fvatamt, COALESCE(fpost, false) AS fpost,
      fcuserid, fcuserdate, fmuserid, fmuserdate
 FROM dbo.tblstocktrans
WHERE fcoid=$1 AND fyear=$2 AND fbrid=$3 AND fdoctype=$4 AND fdocno=$5`,
      params,
    );

    if (header.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Purchase Invoice not found" });
    }

    // same columns as sp_pagepi 'GTL'
    const lines = await pool.query(
      `SELECT fslno, fitemid, funit, fqtyin, funitprice, ftotalprice,
              funitcost, ftotalcost
         FROM dbo.tblstocktrans
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

   Flow (same as VB):
   - New    : S for every line
   - Modify : M (update header) -> D1 for every old line -> S for every new line
   ========================================================= */
export const savePurchaseInvoice = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<Response> => {
  const client = await pool.connect();

  try {
    const coId = req.user?.CoID;
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
      discAmt,
      vatAmt,
      menuName,
      lines,
      originalSlNos,
      expenses, // <-- new
    } = req.body as {
      mode: "S" | "M";
      year: string;
      brId: string;
      docNo: string;
      invoiceType: "C" | "R";
      piNo: string;
      poNo?: string;
      date: string;
      vatNo?: string;
      supplierId?: string;
      supplierName?: string;
      currency: string;
      currencyRate: number;
      note?: string;
      discAmt?: number;
      vatAmt?: number;
      menuName?: string;
      lines: PILine[];
      originalSlNos?: number[]; // sl.# of lines loaded from DB (modify only)
      expenses?: PIExpLine[]; // <-- new: purchase expense rows (frmPIExp)
    };

    /* ---------- validation ---------- */
    if (!coId || !userId)
      return res
        .status(401)
        .json({ success: false, message: "Authentication required" });
    if (!["S", "M"].includes(mode))
      return res
        .status(400)
        .json({ success: false, message: "mode must be 'S' or 'M'" });
    if (!["C", "R"].includes(invoiceType))
      return res
        .status(400)
        .json({ success: false, message: "invoiceType must be 'C' or 'R'" });
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
      return res.status(400).json({
        success: false,
        message: "Please enter 'Supplier Invoice No'",
      });
    if (invoiceType === "C" && !supplierName)
      return res
        .status(400)
        .json({ success: false, message: "Please enter 'Supplier Name'" });
    if (invoiceType === "R" && !supplierId)
      return res
        .status(400)
        .json({ success: false, message: "Please select 'Supplier ID'" });
    if (mode === "M" && !Array.isArray(originalSlNos))
      return res.status(400).json({
        success: false,
        message: "originalSlNos is required for modify",
      });

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

    /* ---------- expense validation (new) ---------- */
    const expRows = (expenses ?? []).filter((e) => e.accountId);
    for (const e of expRows) {
      if (num(e.credit) <= 0)
        return res.status(400).json({
          success: false,
          message: `Expense Sl.# ${e.slNo} - Please input 'Amount'`,
        });
    }

    /* ---------- cash invoice -> cash purchase account (VB GetCashPurchaseAccountID) ---------- */
    let resolvedSupplierId = supplierId ?? "";
    if (invoiceType === "C" && !resolvedSupplierId) {
      const acc = await client.query(
        `SELECT dbo.getcashpurchaseaccountid($1::varchar, $2::varchar) AS id`,
        [coId, brId],
      );
      resolvedSupplierId = acc.rows[0]?.id ?? "";
      if (!resolvedSupplierId)
        return res.status(400).json({
          success: false,
          message: "Cash purchase account is not configured for this branch",
        });
    }

    /* ---------- totals ---------- */
    const totalCost = validLines.reduce((s, l) => s + num(l.totalCost), 0);
    const grossPrice = validLines.reduce((s, l) => s + num(l.totalPrice), 0);
    const supplierAmt = Number((grossPrice - num(discAmt)).toFixed(2));

    /* ---------- common SP args ---------- */
    const base = {
      pstrcoid: coId,
      pstryear: String(year),
      strbrid: brId,
      strdoctype: DOC_TYPE,
      strdocno: docNo,
      pstruserid: userId,
      strmenuname: menuName ?? "pagePI",
    };

    const header = {
      strinvoicetype: invoiceType,
      dtpdate: date,
      strpino: piNo,
      strpono: poNo?.trim() || null,
      strvatno: vatNo ?? null,
      strsupplierid: resolvedSupplierId,
      strsuppliername: supplierName ?? null,
      strcurrency: currency,
      numcurrencyrate: num(currencyRate) || 1,
      strnote: note ?? null,
      numgtotalcost: totalCost,
      numsupplieramt: supplierAmt,
      numdiscamt: num(discAmt),
      numvatamt: num(vatAmt),
    };

    await client.query("BEGIN");

    if (mode === "S") {
      // duplicate Entry No. check (no SP exists for this)
      const exists = await client.query(
        `SELECT 1 FROM dbo.tblstocktrans
          WHERE fcoid=$1 AND fyear=$2 AND fbrid=$3 AND fdoctype=$4 AND fdocno=$5
          LIMIT 1`,
        [coId, Number(year), brId, DOC_TYPE, docNo],
      );
      if (exists.rows.length > 0) {
        await client.query("ROLLBACK");
        return res.status(409).json({
          success: false,
          message: "Purchase Invoice with the same 'Entry No.' already exists",
        });
      }
    } else {
      // 1) update header on existing rows
      await callPagePI(client, { strmode: "M", ...base, ...header });
      // 2) remove old lines one by one
      for (const sl of originalSlNos ?? []) {
        await callPagePI(client, {
          strmode: "D1",
          ...base,
          original_fslno: sl,
        });
      }
    }

    /* ---------- lines: S inserts row + header fields and rebuilds postings ---------- */
    for (const l of validLines) {
      await callPagePI(client, {
        strmode: "S",
        ...base,
        ...header,
        intslno: l.slNo,
        stritemid: l.itemId,
        strunit: l.unit ?? null,
        numqtyin: num(l.qtyIn),
        numunitprice: num(l.unitPrice),
        numtotalprice: num(l.totalPrice),
        numunitcost: num(l.unitCost),
        numtotalcost: num(l.totalCost),
      });
    }

    /* ---------- purchase expenses (frmPIExp) ----------
       Runs AFTER the PI lines so the PI posting rebuild doesn't
       overwrite them. Same transaction, so all-or-nothing.
       - expenses omitted  -> existing expenses are left untouched
       - expenses: []      -> existing expenses are cleared (D1 only)
       For exact VB behaviour (skip when empty), use: expRows.length > 0 */
    if (Array.isArray(expenses)) {
      await applyPIExp(client, {
        coId,
        userId,
        year: String(year),
        brId,
        docNo,
        date,
        currency,
        currencyRate: num(currencyRate) || 1,
        rows: expRows,
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
    const coId = req.user?.CoID;
    const userId = req.user?.userId;
    const { year, brId, docNo } = req.query as Record<string, string>;

    if (!coId || !userId || !year || !brId || !docNo) {
      return res.status(400).json({
        success: false,
        message: "year, brId and docNo are required",
      });
    }

    await callPagePI(pool, {
      strmode: "D",
      gstrcoid: coId,
      gintyear: Number(year),
      strbrid: brId,
      strdoctype: DOC_TYPE,
      strdocno: docNo,
      gstruserid: userId,
      strmenuname: "frmPI",
    });

    return res.status(200).json({ success: true, message: "Deleted" });
  } catch (error: unknown) {
    console.error("deletePurchaseInvoice error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Not deleted, try again" });
  }
};

/* =========================================================
   INVOICE TYPES (C / R)  -> dbo.getpurchasestockparam()
   GET /purchase-invoice/invoice-types
   ========================================================= */
export const getPurchaseInvoiceTypes = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<Response> => {
  try {
    const result = await pool.query(
      `SELECT fptype, fpid, fpname FROM dbo.getpurchasestockparam()`,
    );
    return res.status(200).json({ success: true, data: result.rows });
  } catch (error: unknown) {
    console.error("getPurchaseInvoiceTypes error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch invoice types" });
  }
};

/* =========================================================
   CASH PURCHASE ACCOUNT  (VB GetCashPurchaseAccountID)
   GET /purchase-invoice/cash-purchase-account?brId=
   ========================================================= */
export const getCashPurchaseAccount = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<Response> => {
  try {
    const coId = req.user?.CoID;
    const brId = String(req.query.brId ?? "").trim();
    if (!coId || !brId)
      return res
        .status(400)
        .json({ success: false, message: "brId is required" });

    const result = await pool.query(
      `SELECT dbo.getcashpurchaseaccountid($1::varchar, $2::varchar) AS id`,
      [coId, brId],
    );
    return res
      .status(200)
      .json({ success: true, data: { accountId: result.rows[0]?.id ?? "" } });
  } catch (error: unknown) {
    console.error("getCashPurchaseAccount error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch cash purchase account",
    });
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
    const coId = req.user?.CoID;
    if (!coId)
      return res
        .status(401)
        .json({ success: false, message: "Authentication required" });

    const result = await pool.query(
      `SELECT fcashsupplierid AS fcashsupplierid,
       fcashsuppliername AS fcashsuppliername,
       fvatno AS fvatno
FROM dbo.tblcashsupplier
WHERE fcoid = $1
ORDER BY fcashsupplierid;`,
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
    const coId = req.user?.CoID;
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
    const coId = req.user?.CoID;
    const { id } = req.params;
    if (!coId || !id)
      return res
        .status(400)
        .json({ success: false, message: "Cash Supplier ID is required" });

    const result = await pool.query(
      `SELECT fcashsupplierid AS fcashsupplierid,
       fcashsuppliername AS fcashsuppliername,
       fvatno AS fvatno
FROM dbo.tblcashsupplier
WHERE fcoid = $1
  AND fcashsupplierid = $2;`,
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
    const coId = req.user?.CoID;
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
    const coId = req.user?.CoID;
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

// GET /api/purchase-invoice/next-doc-no?year=2026&brId=OFFICE
export const getNextDocNo = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const coId = req.user?.CoID;
    const year = String(req.query.year ?? "").trim();
    const brId = String(req.query.brId ?? "").trim();

    if (!coId) {
      return res
        .status(401)
        .json({ success: false, message: "Authentication required" });
    }
    if (!year || !brId) {
      return res
        .status(400)
        .json({ success: false, message: "year and brId are required" });
    }

    const result = await pool.query(
      `SELECT fdocno, fdocnolen
         FROM dbo.getnextdocno($1::varchar, $2::varchar, $3::varchar, 'PI')`,
      [coId, year, brId],
    );

    return res.status(200).json({
      success: true,
      data: {
        docNo: String(result.rows[0]?.fdocno ?? ""),
        docNoLen: Number(result.rows[0]?.fdocnolen ?? 0),
      },
    });
  } catch (error: any) {
    console.error("getNextDocNo error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to generate entry no.",
    });
  }
};

/* =========================================================
   PURCHASE EXPENSE (frmPIExp) LOOKUPS
   Port of clsPIExp.FillCombos
   ========================================================= */

/* VB filter: fIsPurchaseExp=1 AND fIsAccountHead=1
   One list serves both the Account ID and Account Name combos. */
const queryPIExpAccounts = (coId: string) =>
  pool.query(
    `SELECT a.faccountid   AS "fAccountID",
            a.faccountname AS "fAccountName"
       FROM dbo.tblaccount a
      WHERE a.fcoid = $1
        AND dbo.ispurchaseexpense($1::varchar, a.faccountid) = true
      ORDER BY a.faccountid`,
    [coId],
  );

const queryPIExpCostCenters = (coId: string) =>
  pool.query(
    `SELECT fccid   AS "fCCID",
            fccname AS "fCCName"
       FROM dbo.tblcostcenter
      WHERE fcoid = $1
      ORDER BY fpositionno`,
    [coId],
  );

const queryPIExpCurrencies = (coId: string) =>
  pool.query(
    `SELECT fcurrency AS "fCurrency"
       FROM dbo.tblcurrency
      WHERE fcoid = $1
      ORDER BY fcurrency`,
    [coId],
  );

/* GET /purchase-invoice/expense/accounts */
export const getPIExpAccounts = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<Response> => {
  try {
    const coId = req.user?.CoID;
    if (!coId)
      return res
        .status(401)
        .json({ success: false, message: "Authentication required" });

    const result = await queryPIExpAccounts(coId);
    return res.status(200).json({ success: true, data: result.rows });
  } catch (error: unknown) {
    console.error("getPIExpAccounts error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch expense accounts" });
  }
};

/* GET /purchase-invoice/expense/cost-centers */
export const getPIExpCostCenters = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<Response> => {
  try {
    const coId = req.user?.CoID;
    if (!coId)
      return res
        .status(401)
        .json({ success: false, message: "Authentication required" });

    const result = await queryPIExpCostCenters(coId);
    return res.status(200).json({ success: true, data: result.rows });
  } catch (error: unknown) {
    console.error("getPIExpCostCenters error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch cost centers" });
  }
};

/* GET /purchase-invoice/expense/currencies */
export const getPIExpCurrencies = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<Response> => {
  try {
    const coId = req.user?.CoID;
    if (!coId)
      return res
        .status(401)
        .json({ success: false, message: "Authentication required" });

    const result = await queryPIExpCurrencies(coId);
    return res.status(200).json({ success: true, data: result.rows });
  } catch (error: unknown) {
    console.error("getPIExpCurrencies error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch currencies" });
  }
};

/* GET /purchase-invoice/expense/lookups -> all combos in one call */
export const getPIExpLookups = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<Response> => {
  try {
    const coId = req.user?.CoID;
    if (!coId)
      return res
        .status(401)
        .json({ success: false, message: "Authentication required" });

    const [accounts, costCenters, currencies] = await Promise.all([
      queryPIExpAccounts(coId),
      queryPIExpCostCenters(coId),
      queryPIExpCurrencies(coId),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        accounts: accounts.rows,
        costCenters: costCenters.rows,
        currencies: currencies.rows,
      },
    });
  } catch (error: unknown) {
    console.error("getPIExpLookups error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch expense lookups" });
  }
};

/* true when every row of the document is already posted */
const isPosted = async (
  db: PgClient,
  coId: string,
  year: string,
  brId: string,
  docNo: string,
): Promise<boolean | null> => {
  const r = await db.query(
    `SELECT COALESCE(fpost, false) AS fpost
       FROM dbo.tblstocktrans
      WHERE fcoid=$1 AND fyear=$2 AND fbrid=$3 AND fdoctype=$4 AND fdocno=$5
      FOR UPDATE`,
    [coId, String(year), brId, DOC_TYPE, docNo],
  );
  if (r.rows.length === 0) return null; // document not found
  return r.rows.every((x: { fpost: boolean }) => x.fpost);
};

/* =========================================================
   POST /purchase-invoice/post
   body: { year, brId, docNo }
   Calls dbo.sp_pipost in mode 'P'
   ========================================================= */
export const postPurchaseInvoice = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<Response> => {
  const client = await pool.connect();

  try {
    const coId = req.user?.CoID;
    const userId = req.user?.userId;
    const { year, brId, docNo } = req.body as {
      year: string;
      brId: string;
      docNo: string;
    };

    if (!coId || !userId)
      return res
        .status(401)
        .json({ success: false, message: "Authentication required" });
    if (!year || !brId || !docNo)
      return res.status(400).json({
        success: false,
        message: "year, brId and docNo are required",
      });

    await client.query("BEGIN");

    const posted = await isPosted(client, coId, year, brId, docNo);
    if (posted === null) {
      await client.query("ROLLBACK");
      return res
        .status(404)
        .json({ success: false, message: "Purchase Invoice not found" });
    }
    if (posted) {
      await client.query("ROLLBACK");
      return res.status(409).json({
        success: false,
        message: "Purchase Invoice is already posted",
      });
    }

    await client.query(
      `CALL dbo.sp_pipost(
         p_strmode => $1, p_gstrcoid => $2, p_ptryear => $3,
         p_strbrid => $4, p_strdoctype => $5, p_strdocno => $6,
         p_gstruserid => $7)`,
      ["P", coId, Number(year), brId, DOC_TYPE, docNo, userId],
    );

    await client.query("COMMIT");

    return res.status(200).json({ success: true, message: "Posted" });
  } catch (error: unknown) {
    await client.query("ROLLBACK").catch(() => undefined);
    console.error("postPurchaseInvoice error:", error);
    return res.status(500).json({
      success: false,
      message: "Not posted, try again",
      error: error instanceof Error ? error.message : String(error),
    });
  } finally {
    client.release();
  }
};

/* =========================================================
   GET /purchase-invoice/expense?year=&brId=&docNo=
   Port of VB GetPIExpDetail -> sp_frmpiexp mode 'G'.
   Procedures can't return rows, so we read tblfintrans with the
   same columns / filter / order as the SP's 'G' mode.
   ========================================================= */
export const getPIExpDetail = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<Response> => {
  try {
    const coId = req.user?.CoID;
    const { year, brId, docNo } = req.query as Record<string, string>;

    if (!coId || !year || !brId || !docNo) {
      return res.status(400).json({
        success: false,
        message: "year, brId and docNo are required",
      });
    }

    const result = await pool.query(
      `SELECT fslno         AS "fSlNo",
              faccountid    AS "fAccountID",
              fcredit       AS "fCredit",
              fccid         AS "fCCID",
              fdescription  AS "fDescription"
         FROM dbo.tblfintrans
        WHERE fcoid=$1 AND fyear=$2 AND fbrid=$3
          AND fdoctype=$4 AND fdocno=$5 AND fslno > 0
        ORDER BY fslno`,
      [coId, Number(year), brId, DOC_TYPE, docNo],
    );

    return res.status(200).json({ success: true, data: result.rows });
  } catch (error: unknown) {
    console.error("getPIExpDetail error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch expense details" });
  }
};
