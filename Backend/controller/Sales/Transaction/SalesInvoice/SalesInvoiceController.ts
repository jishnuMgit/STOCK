import { Response } from "express";
import pool from "../../../../DB/db.js";
import { AuthenticatedRequest } from "../../../../middleware/authMiddleware.js";

const DOC_TYPE = "SIR"; // Sales Invoice (Credit)
const INVOICE_TYPE = "R"; // VB always passed "R"

/* VERIFY: procedure names (VB: SP_frmSI / SP_SIPost) */
const SP_PAGE_SI = "dbo.sp_pagesi";
const SP_SI_POST = "dbo.sp_sipost";

/* =========================================================
   Types
   ========================================================= */
interface SILine {
  slNo: number;
  itemId: string;
  unit?: string;
  priceLevel?: string;
  qtyOut: number;
  unitPrice: number;
  itemDiscAmt?: number; // per-unit discount
  unitCost?: number;
  dnNo?: string; // delivery note the line came from
}

interface DNLink {
  slNo: number;
  dnNo: string;
  checked: boolean;
}

type PgClient = {
  query: (sql: string, params?: unknown[]) => Promise<any>;
};

/* =========================================================
   Helpers
   ========================================================= */
const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const round2 = (v: number) => Math.round((v + Number.EPSILON) * 100) / 100;
const round4 = (v: number) => Math.round((v + Number.EPSILON) * 10000) / 10000;

/* docNo like "SIR0012" -> 12 (VB used DocNo minus prefix) */
const getIntDocNo = (docNo: string): number => {
  const m = docNo.match(/(\d+)$/);
  return m ? parseInt(m[1], 10) : 0;
};

/* CALL <proc> with named args. All SP params start with "p_". */
const callProc = (db: PgClient, proc: string, args: Record<string, unknown>) => {
  const keys = Object.keys(args);
  const sql = `CALL ${proc}(${keys
    .map((k, i) => `p_${k} => $${i + 1}`)
    .join(", ")})`;
  return db.query(
    sql,
    keys.map((k) => args[k]),
  );
};

/* =========================================================
   Calculation  (port of CalcNetUnitPrice / CalcTotalPrice /
   CalcTotalPriceInclVAT / CalcDiscPer)
   ========================================================= */
const vatOf = (amt: number, vatPer: number) =>
  vatPer !== 0 ? round2((amt * vatPer) / 100) : 0;

const computeLine = (l: SILine, vatPer: number) => {
  const qty = num(l.qtyOut);
  const disc = num(l.itemDiscAmt);
  const totItemDiscAmt = round2(qty * disc);
  const netUnitPrice = round2(num(l.unitPrice) - disc);
  const totalPrice = round2(qty * netUnitPrice);
  const itemVatAmt = vatOf(totalPrice, vatPer);
  const totalPriceV = round2(totalPrice + itemVatAmt);
  const totalCost = round4(qty * num(l.unitCost));
  return {
    totItemDiscAmt,
    netUnitPrice,
    totalPrice,
    itemVatAmt,
    totalPriceV,
    totalCost,
  };
};

const computeTotals = (
  lines: SILine[],
  vatPer: number,
  discType: string,
  discPerIn: number,
  discAmtIn: number,
) => {
  const rows = lines.filter((l) => l.itemId).map((l) => computeLine(l, vatPer));
  const sum = (f: (r: (typeof rows)[number]) => number) =>
    rows.reduce((s, r) => s + f(r), 0);

  const docAmt = round2(sum((r) => r.totalPriceV));
  const sumTotalPrice = sum((r) => r.totalPrice);
  const sumTotItemDisc = sum((r) => r.totItemDiscAmt);

  let discAmt = num(discAmtIn);
  let discPer = num(discPerIn);
  if (discType === "P") {
    discAmt = round2((docAmt / 100) * discPer);
  } else {
    discPer = docAmt !== 0 ? round2((discAmt * 100) / docAmt) : 0;
  }

  let discAmtAFTVAT = 0;
  let discAmtVAT = 0;
  if (discAmt !== 0) {
    discAmtAFTVAT = round2((discAmt / (100 + vatPer)) * 100);
    discAmtVAT = round2(discAmt - discAmtAFTVAT);
  }

  const netDocAmtWoVAT = round2(round2(sumTotalPrice) - discAmtAFTVAT);
  const vatAmt = round2(vatOf(sumTotalPrice, vatPer) - discAmtVAT);
  const netDocAmt = round2(netDocAmtWoVAT + vatAmt);

  return {
    rows,
    docAmt,
    discPer,
    discAmt,
    discAmtAFTVAT,
    discAmtVAT,
    netDocAmtWoVAT,
    vatPer,
    vatAmt,
    netDocAmt,
    netItemDiscAmt: round2(sumTotItemDisc + discAmtAFTVAT),
    totalPriceExclVAT: round2(sumTotalPrice + sumTotItemDisc),
    costOfSaleAmt: round4(sum((r) => r.totalCost)),
  };
};

/* true when every row of the document is posted; null if not found */
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
    [coId, Number(year), brId, DOC_TYPE, docNo],
  );
  if (r.rows.length === 0) return null;
  return r.rows.every((x: { fpost: boolean }) => x.fpost);
};

/* =========================================================
   POST /sales-invoice/calc
   Server-side version of the form's total calculation.
   body: { lines, vatPer, discType, discPer, discAmt }
   ========================================================= */
export const calcSalesInvoice = (
  req: AuthenticatedRequest,
  res: Response,
): Response => {
  try {
    const { lines, vatPer, discType, discPer, discAmt } = req.body as {
      lines: SILine[];
      vatPer?: number;
      discType?: "A" | "P";
      discPer?: number;
      discAmt?: number;
    };

    if (!Array.isArray(lines))
      return res
        .status(400)
        .json({ success: false, message: "lines are required" });

    const t = computeTotals(
      lines,
      num(vatPer),
      discType === "P" ? "P" : "A",
      num(discPer),
      num(discAmt),
    );

    return res.status(200).json({ success: true, data: t });
  } catch (error: unknown) {
    console.error("calcSalesInvoice error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to calculate totals" });
  }
};

/* =========================================================
   GET /sales-invoice?year=&brId=&docNo=
   sp_pagesi GHD / GTL / GD are SELECTs inside a PROCEDURE, which
   Postgres can't return, so we read tblstocktrans directly.
   VERIFY column names against your table.
   ========================================================= */
export const getSalesInvoice = async (
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

    const header = await pool.query(
      `SELECT DISTINCT
              to_char(t.fdate, 'YYYY-MM-DD') AS fdate,
              t.fdate_h,
              to_char(t.finvoicedate, 'YYYY-MM-DD HH24:MI:SS') AS finvoicedate,
              t.faccountid,
              a.faccountname,
              t.faddress1, t.fphone, t.fcustomerref, t.fpricelevel, t.fnote,
              t.fdisctype, t.fdiscper, t.fdiscamt,
              t.fnetdocamtwovat, t.fvatper, t.fvatamt, t.fnetdocamt,
              t.fpostorder, COALESCE(t.fpost, false) AS fpost,
              t.finvdatetime,
              t.fcuserid, t.fcuserdate, t.fmuserid, t.fmuserdate
         FROM dbo.tblstocktrans t
         LEFT JOIN dbo.tblaccount a
                ON a.fcoid = t.fcoid AND a.faccountid = t.faccountid
        WHERE t.fcoid=$1 AND t.fyear=$2 AND t.fbrid=$3
          AND t.fdoctype=$4 AND t.fdocno=$5`,
      params,
    );

    if (header.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Sales Invoice not found" });
    }

    const lines = await pool.query(
      `SELECT fslno, fitemid, funit, fpricelevel, fqtyout, funitprice,
              fnetunitprice, fitemdiscamt, fitemvatamt, ftotalprice,
              ftotalpricev, funitcost, ftotalcost, ftotitemdiscamt, fdnno
         FROM dbo.tblstocktrans
        WHERE fcoid=$1 AND fyear=$2 AND fbrid=$3 AND fdoctype=$4 AND fdocno=$5
        ORDER BY fslno`,
      params,
    );

    // delivery notes linked to this invoice = distinct DN numbers on its lines
    const deliveryNotes = [
      ...new Set(
        lines.rows
          .map((r: { fdnno: string | null }) => r.fdnno)
          .filter((x: string | null): x is string => !!x),
      ),
    ].map((dnNo, i) => ({ slNo: i + 1, dnNo, checked: true }));

    return res.status(200).json({
      success: true,
      data: { header: header.rows[0], lines: lines.rows, deliveryNotes },
    });
  } catch (error: unknown) {
    console.error("getSalesInvoice error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch Sales Invoice" });
  }
};

/* =========================================================
   POST /sales-invoice   (create or modify)

   Flow (same as VB / PI controller):
   - New    : S for every line
   - Modify : M (update header) -> D1 for every old line -> S for every new line
   - Then   : delivery note links (DD, then SD per checked DN)
   Totals are recomputed on the server, not trusted from the client.
   ========================================================= */
export const saveSalesInvoice = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<Response> => {
  const client = await pool.connect();

  try {
    const coId = req.user?.CoID;
    const userId = req.user?.userId;

    const {
      mode, // "S" new, "M" modify
      year,
      brId,
      docNo,
      date, // yyyy-mm-dd
      dateH, // hijri date string from the form
      customerId,
      customerName,
      address,
      phone,
      customerRef,
      custPriceLevel,
      note,
      discType, // "A" amount, "P" percent
      discPer,
      discAmt,
      vatPer,
      menuName,
      lines,
      originalSlNos,
      deliveryNotes,
    } = req.body as {
      mode: "S" | "M";
      year: string;
      brId: string;
      docNo: string;
      date: string;
      dateH?: string;
      customerId: string;
      customerName?: string;
      address?: string;
      phone: string;
      customerRef?: string;
      custPriceLevel?: string;
      note?: string;
      discType?: "A" | "P";
      discPer?: number;
      discAmt?: number;
      vatPer: number;
      menuName?: string;
      lines: SILine[];
      originalSlNos?: number[]; // sl.# of lines loaded from DB (modify only)
      deliveryNotes?: DNLink[];
    };

    /* ---------- validation (VB ValidateMe / ValidateGrid) ---------- */
    const bad = (message: string) =>
      res.status(400).json({ success: false, message });

    if (!coId || !userId)
      return res
        .status(401)
        .json({ success: false, message: "Authentication required" });
    if (!["S", "M"].includes(mode)) return bad("mode must be 'S' or 'M'");
    if (!year || !brId) return bad("Please select Year and Branch");
    if (!docNo) return bad("Please enter 'Invoice No.'");
    if (!date) return bad("Please enter 'Date'");
    if (new Date(date).getFullYear() !== Number(year))
      return bad("'Login Year' should be same as 'Transaction Year'");
    if (!customerId) return bad("Please select 'Customer ID'");
    if (!phone?.trim()) return bad("Please input 'Phone No.'");
    if (vatPer === undefined || vatPer === null || !Number.isFinite(Number(vatPer)))
      return bad("vatPer is required");
    if (mode === "M" && !Array.isArray(originalSlNos))
      return bad("originalSlNos is required for modify");

    const dType = discType === "P" ? "P" : "A";
    if (dType === "P" && num(discPer) > 100)
      return bad("Discount % cannot exceed 100");

    const validLines = (lines ?? []).filter((l) => l.itemId);
    if (validLines.length === 0) return bad("There is no information for saving.");

    for (const l of validLines) {
      if (!l.priceLevel)
        return bad(`Sl.# ${l.slNo} - Please select 'Item Price Level'`);
      if (num(l.qtyOut) <= 0)
        return bad(`Sl.# ${l.slNo} - Qty. can't be less than or equal to 0.`);
      if (num(l.unitPrice) <= 0)
        return bad(`Sl.# ${l.slNo} - Unit Price can't be less than or equal to 0.`);
    }

    /* ---------- totals ---------- */
    const t = computeTotals(
      validLines,
      num(vatPer),
      dType,
      num(discPer),
      num(discAmt),
    );

    if (dType === "A" && t.discAmt > t.docAmt)
      return bad("Discount amount cannot exceed the 'Document Amount'");

    for (let i = 0; i < validLines.length; i++) {
      if (t.rows[i].totalPriceV === 0)
        return bad(`Sl.# ${validLines[i].slNo} - Total Price can't be 0.`);
    }

    await client.query("BEGIN");

    /* ---------- new / modify checks ---------- */
    let origInvoiceDate: string | null = null;
    let origInvDateTime: string | null = null;
    let origCreator:
      | { fcuserid: string | null; fcuserdate: Date | null }
      | undefined;

    const docKey = [coId, Number(year), brId, DOC_TYPE, docNo];

    if (mode === "S") {
      const exists = await client.query(
        `SELECT 1 FROM dbo.tblstocktrans
          WHERE fcoid=$1 AND fyear=$2 AND fbrid=$3 AND fdoctype=$4 AND fdocno=$5
          LIMIT 1`,
        docKey,
      );
      if (exists.rows.length > 0) {
        await client.query("ROLLBACK");
        return res.status(409).json({
          success: false,
          message: "Sales Invoice with the same 'Invoice No.' already exists",
        });
      }
    } else {
      const posted = await isPosted(client, coId, year, brId, docNo);
      if (posted === null) {
        await client.query("ROLLBACK");
        return res
          .status(404)
          .json({ success: false, message: "Sales Invoice not found" });
      }
      if (posted) {
        await client.query("ROLLBACK");
        return res.status(409).json({
          success: false,
          message: "Sales Invoice is already posted and cannot be modified",
        });
      }

      const orig = await client.query(
        `SELECT fcuserid, fcuserdate,
                to_char(finvoicedate, 'YYYY-MM-DD HH24:MI:SS') AS finvoicedate,
                finvdatetime
           FROM dbo.tblstocktrans
          WHERE fcoid=$1 AND fyear=$2 AND fbrid=$3 AND fdoctype=$4 AND fdocno=$5
          LIMIT 1`,
        docKey,
      );
      origCreator = orig.rows[0];
      origInvoiceDate = orig.rows[0]?.finvoicedate ?? null;
      origInvDateTime = orig.rows[0]?.finvdatetime ?? null;
    }

    /* ---------- invoice date/time (VB: date + server time rules) ---------- */
    const inv = await client.query(
      `SELECT to_char(
                CASE WHEN $1::date <> CURRENT_DATE
                     THEN ($1::date + LOCALTIME)::timestamp
                     ELSE COALESCE($2::timestamp, LOCALTIMESTAMP) END,
                'YYYY-MM-DD HH24:MI:SS') AS d`,
      [date, origInvoiceDate],
    );
    const invoiceDate: string = inv.rows[0].d;

    /* ---------- common SP args ---------- */
    const base = {
      gstrcoid: coId,
      intyear: Number(year),
      strbrid: brId,
      strdoctype: DOC_TYPE,
      strdocno: docNo,
      gstruserid: userId,
      strmenuname: menuName ?? "pageSIR",
    };

    const header = {
      intdocno: getIntDocNo(docNo),
      strinvoicetype: INVOICE_TYPE,
      dtpdate: date,
      strdate_h: dateH ?? "",
      dtpinvoicedate: invoiceDate,
      straccountid: customerId,
      straccountname: customerName ?? "",
      straddress1: address ?? "",
      strphone: phone.trim(),
      strcustref: customerRef ?? "",
      strcustpricelevel: custPriceLevel ?? "",
      strnote: note ?? "",
      strdisctype: dType,
      numdiscper: t.discPer,
      numdiscamt: t.discAmt,
      numdiscamtvat: t.discAmtVAT,
      numdiscamtaftvat: t.discAmtAFTVAT,
      numdocamt: t.docAmt,
      numnetdocamtwovat: t.netDocAmtWoVAT,
      numvatper: t.vatPer,
      numvatamt: t.vatAmt,
      numnetdocamt: t.netDocAmt,
      numpaidamt: 0,
      numpendingamt: 0,
      numcostofsaleamt: t.costOfSaleAmt,
      numnetitemdiscamt: t.netItemDiscAmt,
      numtotalpriceexclvat: t.totalPriceExclVAT,
      dtpcreatedinvuserdate: origInvDateTime,
    };

    if (mode === "M") {
      // 1) update header on existing rows
      await callProc(client, SP_PAGE_SI, { strmode: "M", ...base, ...header });
      // 2) remove old lines one by one
      for (const sl of originalSlNos ?? []) {
        await callProc(client, SP_PAGE_SI, {
          strmode: "D1",
          ...base,
          original_fslno: sl,
        });
      }
    }

    /* ---------- lines ---------- */
    for (let i = 0; i < validLines.length; i++) {
      const l = validLines[i];
      const r = t.rows[i];
      await callProc(client, SP_PAGE_SI, {
        strmode: "S",
        ...base,
        ...header,
        intslno: l.slNo,
        stritemid: l.itemId,
        numqtyout: num(l.qtyOut),
        strunit: l.unit ?? null,
        stritempricelevel: l.priceLevel,
        numunitprice: num(l.unitPrice),
        numnetunitprice: r.netUnitPrice,
        numitemdiscamt: num(l.itemDiscAmt),
        numitemvatamt: r.itemVatAmt,
        numtotalprice: r.totalPrice,
        numtotalpricev: r.totalPriceV,
        numunitcost: num(l.unitCost),
        numtotalcost: r.totalCost,
        numtotitemdiscamt: r.totItemDiscAmt,
        strdnno: l.dnNo ?? null,
      });
    }

    /* modify -> put back the original creator and set the modifier */
    if (mode === "M" && origCreator) {
      await client.query(
        `UPDATE dbo.tblstocktrans
            SET fcuserid = $6, fcuserdate = $7,
                fmuserid = $8, fmuserdate = now()
          WHERE fcoid=$1 AND fyear=$2 AND fbrid=$3 AND fdoctype=$4 AND fdocno=$5`,
        [...docKey, origCreator.fcuserid, origCreator.fcuserdate, userId],
      );
    }

    /* ---------- delivery note links (VB ApplyDN: DD then SD) ----------
       - deliveryNotes omitted -> existing links untouched
       - deliveryNotes: []     -> existing links cleared */
    if (Array.isArray(deliveryNotes)) {
      await callProc(client, SP_PAGE_SI, {
        strmode: "DD",
        gstrcoid: coId,
        strbrid: brId,
        strdoctype: DOC_TYPE,
        strdocno: docNo,
      });

      let sl = 1;
      for (const dn of deliveryNotes.filter((d) => d.dnNo && d.checked)) {
        await callProc(client, SP_PAGE_SI, {
          strmode: "SD",
          gstrcoid: coId,
          strbrid: brId,
          strdoctype: DOC_TYPE,
          strdocno: docNo,
          straccountid: customerId,
          intslno: sl++,
          strdnno: dn.dnNo,
          blnchecked: true,
          gstruserid: userId,
        });
      }
    }

    await client.query("COMMIT");

    return res.status(200).json({
      success: true,
      message: mode === "S" ? "Saved" : "Modified",
      data: {
        docNo,
        totals: {
          docAmt: t.docAmt,
          discAmt: t.discAmt,
          netDocAmtWoVAT: t.netDocAmtWoVAT,
          vatAmt: t.vatAmt,
          netDocAmt: t.netDocAmt,
        },
      },
    });
  } catch (error: unknown) {
    await client.query("ROLLBACK").catch(() => undefined);
    console.error("saveSalesInvoice error:", error);
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
   DELETE /sales-invoice?year=&brId=&docNo=
   ========================================================= */
export const deleteSalesInvoice = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<Response> => {
  const client = await pool.connect();

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

    await client.query("BEGIN");

    const posted = await isPosted(client, coId, year, brId, docNo);
    if (posted === null) {
      await client.query("ROLLBACK");
      return res
        .status(404)
        .json({ success: false, message: "Sales Invoice not found" });
    }
    if (posted) {
      await client.query("ROLLBACK");
      return res.status(409).json({
        success: false,
        message: "Sales Invoice is already posted and cannot be deleted",
      });
    }

    await callProc(client, SP_PAGE_SI, {
      strmode: "D",
      gstrcoid: coId,
      intyear: Number(year),
      strbrid: brId,
      strdoctype: DOC_TYPE,
      strdocno: docNo,
      gstruserid: userId,
      strmenuname: "pageSIR",
    });

    await client.query("COMMIT");

    return res.status(200).json({ success: true, message: "Deleted" });
  } catch (error: unknown) {
    await client.query("ROLLBACK").catch(() => undefined);
    console.error("deleteSalesInvoice error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Not deleted, try again" });
  } finally {
    client.release();
  }
};

/* =========================================================
   POST /sales-invoice/post
   body: { year, brId, docNo }   -> sp_sipost mode 'P'
   ========================================================= */
export const postSalesInvoice = async (
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
        .json({ success: false, message: "Sales Invoice not found" });
    }
    if (posted) {
      await client.query("ROLLBACK");
      return res.status(409).json({
        success: false,
        message: "Sales Invoice is already posted",
      });
    }

    await callProc(client, SP_SI_POST, {
      strmode: "P",
      gstrcoid: coId,
      gintyear: Number(year),
      strbrid: brId,
      strdoctype: DOC_TYPE,
      strdocno: docNo,
      gstruserid: userId,
    });

    await client.query("COMMIT");

    return res.status(200).json({ success: true, message: "Posted" });
  } catch (error: unknown) {
    await client.query("ROLLBACK").catch(() => undefined);
    console.error("postSalesInvoice error:", error);
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
   GET /sales-invoice/next-doc-no?year=&brId=
   ========================================================= */
export const getNextDocNo = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<Response> => {
  try {
    const coId = req.user?.CoID;
    const year = String(req.query.year ?? "").trim();
    const brId = String(req.query.brId ?? "").trim();

    if (!coId)
      return res
        .status(401)
        .json({ success: false, message: "Authentication required" });
    if (!year || !brId)
      return res
        .status(400)
        .json({ success: false, message: "year and brId are required" });

    const result = await pool.query(
      `SELECT fdocno, fdocnolen
         FROM dbo.getnextdocno($1::varchar, $2::varchar, $3::varchar, $4::varchar)`,
      [coId, year, brId, DOC_TYPE],
    );

    return res.status(200).json({
      success: true,
      data: {
        docNo: String(result.rows[0]?.fdocno ?? ""),
        docNoLen: Number(result.rows[0]?.fdocnolen ?? 0),
      },
    });
  } catch (error: unknown) {
    console.error("getNextDocNo error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to generate invoice no." });
  }
};

/* =========================================================
   LOOKUPS  (port of clsSIR.FillCombos)
   GET /sales-invoice/lookups?brId=
   - customers   : AR or Cash accounts that are account heads
   - discTypes   : tblstockparam fptype = 'DISCTP'
   - priceLevels : tblstockparam fptype = 'PLTP'
   - items       : branch items that are not hidden
   ========================================================= */
export const getSalesInvoiceLookups = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<Response> => {
  try {
    const coId = req.user?.CoID;
    const brId = String(req.query.brId ?? "").trim();

    if (!coId)
      return res
        .status(401)
        .json({ success: false, message: "Authentication required" });
    if (!brId)
      return res
        .status(400)
        .json({ success: false, message: "brId is required" });

    const [customers, discTypes, priceLevels, items] = await Promise.all([
      pool.query(
        `SELECT a.faccountid   AS "fAccountID",
                a.faccountname AS "fAccountName"
           FROM dbo.tblaccount a
          WHERE a.fcoid = $1
            AND (dbo.isar($1::varchar, a.faccountid) = true
                 OR dbo.iscash($1::varchar, a.faccountid) = true)
            AND dbo.isaccounthead($1::varchar, a.faccountid) = true
          ORDER BY a.faccountid`,
        [coId],
      ),
      pool.query(
        `SELECT fpid AS "fPID", fpname AS "fPName"
           FROM dbo.tblstockparam WHERE fptype = 'DISCTP'`,
      ),
      pool.query(
        `SELECT fpid AS "fPID", fpname AS "fPName"
           FROM dbo.tblstockparam WHERE fptype = 'PLTP' ORDER BY fpid`,
      ),
      pool.query(
        `SELECT a.fitemid AS "fItemID", b.fitemname AS "fItemName"
           FROM dbo.tblitemtl a
           LEFT JOIN dbo.tblitemhd b
                  ON a.fcoid = b.fcoid AND a.fitemid = b.fitemid
          WHERE a.fcoid = $1 AND a.fbrid = $2
          ORDER BY a.fitemid`,
        [coId, brId],
      ),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        customers: customers.rows,
        discTypes: discTypes.rows,
        priceLevels: priceLevels.rows,
        items: items.rows,
      },
    });
  } catch (error: unknown) {
    console.error("getSalesInvoiceLookups error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch lookups" });
  }
};