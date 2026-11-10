import type { PoolClient } from "pg";
import pool from "../../../DB/db.js";

export const DOC_TYPE = "SI";
const INVOICE_TYPE = "R";

const SP_PAGE_SI = "dbo.sp_pagesi";
const SP_SI_POST = "dbo.sp_sipost";

/* VERIFY: the mode your sp_sipost uses for delete (see notes) */
const SP_POST_MODE_POST = "P";

/* =========================================================
   Types
   ========================================================= */
export interface SILine {
  slNo: number;
  itemId: string;
  unit?: string;
  qtyOut: number;
  unitPrice: number;
  itemDiscAmt?: number; // per-unit discount
  unitCost?: number;
  dnNo?: string;
}

export interface DNLink {
  slNo: number;
  dnNo: string;
  checked: boolean;
}

export interface Ctx {
  coId?: string;
  userId?: string;
}

export interface DocKeyInput {
  year: string;
  brId: string;
  docNo: string;
}

export interface SaveInput extends DocKeyInput {
  mode: "S" | "M";
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
  originalSlNos?: number[];
  deliveryNotes?: DNLink[];
  userDate: string;
}

export interface PostInput extends DocKeyInput {
  userDate: string;
}

/* Thrown by the service, mapped to an HTTP status by the controller */
export class ServiceError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/* =========================================================
   Helpers
   ========================================================= */
export const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const round2 = (v: number) => Math.round((v + Number.EPSILON) * 100) / 100;
const round4 = (v: number) => Math.round((v + Number.EPSILON) * 10000) / 10000;

const USER_DATE_RE = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}$/;

/* docNo like "SIR0012" -> 12 */
const getIntDocNo = (docNo: string): number => {
  const m = docNo.match(/(\d+)$/);
  return m ? parseInt(m[1], 10) : 0;
};

const requireAuth = (ctx: Ctx): { coId: string; userId: string } => {
  if (!ctx.coId || !ctx.userId)
    throw new ServiceError(401, "Authentication required");
  return { coId: ctx.coId, userId: ctx.userId };
};

const withTransaction = async <T>(
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (e) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw e;
  } finally {
    client.release();
  }
};

/* CALL <proc> with named args. */
const callProc = (
  db: PoolClient,
  proc: string,
  args: Record<string, unknown>,
  prefix = "p_",
) => {
  const keys = Object.keys(args);
  const sql = `CALL ${proc}(${keys
    .map((k, i) => `${prefix}${k} => $${i + 1}`)
    .join(", ")})`;
  return db.query(
    sql,
    keys.map((k) => args[k]),
  );
};

const callSI = (db: PoolClient, args: Record<string, unknown>) =>
  callProc(db, SP_PAGE_SI, args, "");

/* =========================================================
   Calculation
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

export const computeTotals = (
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

/* =========================================================
   Invoice types (same idea as purchase: dbo.getpurchasestockparam)
   VERIFY: function name, I assumed dbo.getsalesstockparam()
   ========================================================= */
export const getInvoiceTypes = async (ctx: Ctx) => {
  if (!ctx.coId) throw new ServiceError(401, "Authentication required");

  const result = await pool.query(
    `SELECT fptype, fpid, fpname FROM dbo.getpurchasestockparam()`,
  );
  return result.rows as {
    fptype: string;
    fpid: string;
    fpname: string | null;
  }[];
};

export const calculate = (body: {
  lines: SILine[];
  vatPer?: number;
  discType?: "A" | "P";
  discPer?: number;
  discAmt?: number;
}) => {
  if (!Array.isArray(body.lines))
    throw new ServiceError(400, "lines are required");
  return computeTotals(
    body.lines,
    num(body.vatPer),
    body.discType === "P" ? "P" : "A",
    num(body.discPer),
    num(body.discAmt),
  );
};

/* =========================================================
   Validation  (VB ValidateMe + ValidateGrid)
   Shared by Save ("S"/"M") and Post ("T"), so both apply
   the same rules.
   ========================================================= */
interface ValidateInput {
  year: string;
  brId: string;
  docNo: string;
  date: string;
  customerId: string;
  phone?: string;
  vatPer: unknown;
  discType?: "A" | "P";
  discPer?: number;
  discAmt?: number;
  lines: SILine[];
}

const validateInvoice = (input: ValidateInput) => {
  const bad = (m: string) => new ServiceError(400, m);

  if (!input.year || !input.brId) throw bad("Please select Year and Branch");
  if (!input.docNo) throw bad("Please enter 'Invoice No.'");
  if (!input.date) throw bad("Please enter 'Date'");
  if (new Date(input.date).getFullYear() !== Number(input.year))
    throw bad("'Login Year' should be same as 'Transaction Year'");
  if (!input.customerId) throw bad("Please select 'Customer ID'");
  if (!input.phone?.trim()) throw bad("Please input 'Phone No.'");
  if (
    input.vatPer === undefined ||
    input.vatPer === null ||
    !Number.isFinite(Number(input.vatPer))
  )
    throw bad("vatPer is required");

  const dType = input.discType === "P" ? "P" : "A";
  if (dType === "P" && num(input.discPer) > 100)
    throw bad("Discount % cannot exceed 100");

  const validLines = (input.lines ?? []).filter((l) => l.itemId);
  if (validLines.length === 0) throw bad("There is no information for saving.");

  for (const l of validLines) {
    if (num(l.qtyOut) <= 0)
      throw bad(`Sl.# ${l.slNo} - Qty. can't be less than or equal to 0.`);
    if (num(l.unitPrice) <= 0)
      throw bad(
        `Sl.# ${l.slNo} - Unit Price can't be less than or equal to 0.`,
      );
  }

  const totals = computeTotals(
    validLines,
    num(input.vatPer),
    dType,
    num(input.discPer),
    num(input.discAmt),
  );

  if (dType === "A" && totals.discAmt > totals.docAmt)
    throw bad("Discount amount cannot exceed the 'Document Amount'");

  for (let i = 0; i < validLines.length; i++) {
    if (totals.rows[i].totalPriceV === 0)
      throw bad(`Sl.# ${validLines[i].slNo} - Total Price can't be 0.`);
  }

  return { dType, validLines, totals };
};

/* true when every row of the document is posted; null if not found */
const isPosted = async (
  db: PoolClient,
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
   GET
   ========================================================= */
export const getSalesInvoice = async (ctx: Ctx, q: Partial<DocKeyInput>) => {
  if (!ctx.coId || !q.year || !q.brId || !q.docNo)
    throw new ServiceError(400, "year, brId and docNo are required");

  const params = [ctx.coId, Number(q.year), q.brId, DOC_TYPE, q.docNo];

  const header = await pool.query(
    `SELECT DISTINCT
        to_char(t.fdate, 'YYYY-MM-DD') AS fdate,
        t.fcsaccountid AS faccountid,
        a.faccountname,
        t.faddress1,
        t.fphone,
        t.fnote,
        t.fdisctype, t.fdiscper, t.fdiscamt,
        t.fnetdocamtwovat, t.fvatper, t.fvatamt, t.fnetdocamt,
        COALESCE(t.fpost, false) AS fpost,
        t.fcuserid, t.fcuserdate, t.fmuserid, t.fmuserdate
   FROM dbo.tblstocktrans t
   LEFT JOIN dbo.tblaccount a
          ON a.fcoid = t.fcoid AND a.faccountid = t.fcsaccountid
  WHERE t.fcoid=$1 AND t.fyear=$2 AND t.fbrid=$3
    AND t.fdoctype=$4 AND t.fdocno=$5`,
    params,
  );

  if (header.rows.length === 0)
    throw new ServiceError(404, "Sales Invoice not found");

  const lines = await pool.query(
    `SELECT fslno, fitemid, funit, fqtyout, funitprice, fnetunitprice,
        funitdiscamt AS fitemdiscamt, fitemvatamt, ftotalprice,
        (ftotalprice + fitemvatamt) AS ftotalpricev,
        funitcost, ftotalcost, ftotitemdiscamt
   FROM dbo.tblstocktrans
  WHERE fcoid=$1 AND fyear=$2 AND fbrid=$3 AND fdoctype=$4 AND fdocno=$5
  ORDER BY fslno`,
    params,
  );

  const dn = await pool.query(
    `SELECT fslno, fdnno, fchecked
       FROM dbo.tblstocktransdo
      WHERE fcoid=$1 AND fbrid=$2 AND fdoctype=$3 AND fdocno=$4
      ORDER BY fslno`,
    [ctx.coId, q.brId, DOC_TYPE, q.docNo],
  );
  const deliveryNotes = dn.rows.map(
    (r: { fslno: number; fdnno: string; fchecked: boolean | null }) => ({
      slNo: r.fslno,
      dnNo: r.fdnno,
      checked: !!r.fchecked,
    }),
  );

  return { header: header.rows[0], lines: lines.rows, deliveryNotes };
};

/* =========================================================
   Item stock in a branch (VB GetItemStock)
   In - Out of every transaction of the item in the branch,
   excluding the invoice currently open (so editing a saved
   invoice doesn't count its own lines).
   ========================================================= */
export const getItemStock = async (
  ctx: Ctx,
  q: { brId?: unknown; itemId?: unknown; docNo?: unknown },
) => {
  if (!ctx.coId) throw new ServiceError(401, "Authentication required");
  const brId = String(q.brId ?? "").trim();
  const itemId = String(q.itemId ?? "").trim();
  const docNo = String(q.docNo ?? "").trim();
  if (!brId || !itemId)
    throw new ServiceError(400, "brId and itemId are required");

  const result = await pool.query(
    `SELECT COALESCE(SUM(COALESCE(fqtyin, 0)) - SUM(COALESCE(fqtyout, 0)), 0) AS stock
       FROM dbo.tblstocktrans
      WHERE fcoid = $1 AND fbrid = $2 AND fitemid = $3
        AND NOT (fdoctype = $4 AND fdocno = $5)`,
    [ctx.coId, brId, itemId, DOC_TYPE, docNo],
  );

  return { stock: num(result.rows[0]?.stock) };
};

/* =========================================================
   SAVE (create or modify)
   ========================================================= */
export const saveSalesInvoice = async (ctx: Ctx, input: SaveInput) => {
  const { coId, userId } = requireAuth(ctx);
  const {
    mode,
    year,
    brId,
    docNo,
    date,
    dateH,
    customerId,
    customerName,
    address,
    phone,
    customerRef,
    custPriceLevel,
    note,
    vatPer,
    menuName,
    originalSlNos,
    deliveryNotes,
    userDate,
  } = input;

  if (!["S", "M"].includes(mode))
    throw new ServiceError(400, "mode must be 'S' or 'M'");
  if (mode === "M" && !Array.isArray(originalSlNos))
    throw new ServiceError(400, "originalSlNos is required for modify");
  if (!USER_DATE_RE.test(userDate ?? ""))
    throw new ServiceError(400, "userDate is required (YYYY-MM-DD HH:mm:ss)");

  const { dType, validLines, totals: t } = validateInvoice(input);

  return withTransaction(async (client) => {
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
      if (exists.rows.length > 0)
        throw new ServiceError(
          409,
          "Sales Invoice with the same 'Invoice No.' already exists",
        );
    } else {
      const posted = await isPosted(client, coId, year, brId, docNo);
      if (posted === null)
        throw new ServiceError(404, "Sales Invoice not found");
      if (posted)
        throw new ServiceError(
          409,
          "Sales Invoice is already posted and cannot be modified",
        );

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

    const inv = await client.query(
      `SELECT to_char(
                CASE WHEN $1::date <> CURRENT_DATE
                     THEN ($1::date + LOCALTIME)::timestamp
                     ELSE COALESCE($2::timestamp, LOCALTIMESTAMP) END,
                'YYYY-MM-DD HH24:MI:SS') AS d`,
      [date, origInvoiceDate],
    );
    const invoiceDate: string = inv.rows[0].d;

    const base = {
      pstrcoid: coId,
      pstryear: String(year),
      strbrid: brId,
      strdoctype: DOC_TYPE,
      strdocno: docNo,
      pstruserid: userId,
      strmenuname: menuName ?? "pageSIR",
      dtpuserdate: userDate,
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
      await callSI(client, { strmode: "M", ...base, ...header });
      for (const sl of originalSlNos ?? []) {
        await callSI(client, { strmode: "D1", ...base, original_fslno: sl });
      }
    }

    for (let i = 0; i < validLines.length; i++) {
      const l = validLines[i];
      const r = t.rows[i];
      await callSI(client, {
        strmode: "S",
        ...base,
        ...header,
        intslno: l.slNo,
        stritemid: l.itemId,
        numqtyout: num(l.qtyOut),
        strunit: l.unit ?? null,
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

    if (mode === "M" && origCreator) {
      await client.query(
        `UPDATE dbo.tblstocktrans
            SET fcuserid = $6, fcuserdate = $7,
                fmuserid = $8, fmuserdate = $9::timestamp
          WHERE fcoid=$1 AND fyear=$2 AND fbrid=$3 AND fdoctype=$4 AND fdocno=$5`,
        [
          ...docKey,
          origCreator.fcuserid,
          origCreator.fcuserdate,
          userId,
          userDate,
        ],
      );
    }

    /* delivery note links: omitted -> untouched, [] -> cleared */
    if (Array.isArray(deliveryNotes)) {
      await callSI(client, {
        strmode: "DD",
        pstrcoid: coId,
        strbrid: brId,
        strdoctype: DOC_TYPE,
        strdocno: docNo,
      });

      let sl = 1;
      for (const dn of deliveryNotes.filter((d) => d.dnNo && d.checked)) {
        await callSI(client, {
          strmode: "SD",
          pstrcoid: coId,
          strbrid: brId,
          strdoctype: DOC_TYPE,
          strdocno: docNo,
          straccountid: customerId,
          intslno: sl++,
          strdnno: dn.dnNo,
          blnchecked: true,
          pstruserid: userId,
          dtpuserdate: userDate,
        });
      }
    }

    return {
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
    };
  });
};

/* =========================================================
   DELETE
   ========================================================= */
export const deleteSalesInvoice = async (ctx: Ctx, q: Partial<DocKeyInput>) => {
  const { coId } = requireAuth(ctx);
  const { year, brId, docNo } = q;
  if (!year || !brId || !docNo)
    throw new ServiceError(400, "year, brId and docNo are required");

  await withTransaction(async (client) => {
    const posted = await isPosted(client, coId, year, brId, docNo);
    if (posted === null) throw new ServiceError(404, "Sales Invoice not found");
    if (posted)
      throw new ServiceError(
        409,
        "Sales Invoice is already posted and cannot be deleted",
      );

    // sp_pagesi mode 'D' deletes tblstocktrans, tblstocktransdo,
    // tblfintrans and tblarap rows of the invoice
    await callSI(client, {
      strmode: "D",
      pstrcoid: coId,
      pstryear: String(year),
      strbrid: brId,
      strdoctype: DOC_TYPE,
      strdocno: docNo,
    });
  });

  return { message: "Deleted" };
};

/* =========================================================
   POST  (VB cmdPost_Click: ValidateMe("T") + ValidateGrid("T") + StPost)
   Validation runs against the document as stored in the DB,
   with the same rules as save.
   ========================================================= */
export const postSalesInvoice = async (ctx: Ctx, input: Partial<PostInput>) => {
  const { coId, userId } = requireAuth(ctx);
  const { year, brId, docNo, userDate } = input;

  if (!year || !brId || !docNo)
    throw new ServiceError(400, "year, brId and docNo are required");
  if (!USER_DATE_RE.test(userDate ?? ""))
    throw new ServiceError(400, "userDate is required (YYYY-MM-DD HH:mm:ss)");

  await withTransaction(async (client) => {
    const posted = await isPosted(client, coId, year, brId, docNo);
    if (posted === null) throw new ServiceError(404, "Sales Invoice not found");
    if (posted) throw new ServiceError(409, "Sales Invoice is already posted");

    const key = [coId, Number(year), brId, DOC_TYPE, docNo];

    const h = await client.query(
      `SELECT DISTINCT
              to_char(fdate, 'YYYY-MM-DD') AS fdate,
              fcsaccountid, fphone, fvatper, fdisctype, fdiscper, fdiscamt
         FROM dbo.tblstocktrans
        WHERE fcoid=$1 AND fyear=$2 AND fbrid=$3 AND fdoctype=$4 AND fdocno=$5`,
      key,
    );
    const l = await client.query(
      `SELECT fslno, fitemid, funit, fqtyout, funitprice,
              funitdiscamt, funitcost
         FROM dbo.tblstocktrans
        WHERE fcoid=$1 AND fyear=$2 AND fbrid=$3 AND fdoctype=$4 AND fdocno=$5
        ORDER BY fslno`,
      key,
    );
    const hd = h.rows[0];

    validateInvoice({
      year,
      brId,
      docNo,
      date: hd.fdate,
      customerId: hd.fcsaccountid,
      phone: hd.fphone,
      vatPer: hd.fvatper,
      discType: hd.fdisctype === "P" ? "P" : "A",
      discPer: num(hd.fdiscper),
      discAmt: num(hd.fdiscamt),
      lines: l.rows.map(
        (r: Record<string, unknown>): SILine => ({
          slNo: num(r.fslno),
          itemId: String(r.fitemid ?? ""),
          unit: r.funit as string | undefined,
          qtyOut: num(r.fqtyout),
          unitPrice: num(r.funitprice),
          itemDiscAmt: num(r.funitdiscamt),
          unitCost: num(r.funitcost),
        }),
      ),
    });

    await callProc(client, SP_SI_POST, {
      strmode: SP_POST_MODE_POST,
      pstrcoid: coId,
      pstryear: String(year),
      strbrid: brId,
      strdoctype: DOC_TYPE,
      strdocno: docNo,
      pstruserid: userId,
      dtpuserdate: userDate,
    });
  });

  return { message: "Posted" };
};

/* =========================================================
   Next doc no
   ========================================================= */
export const getNextDocNo = async (
  ctx: Ctx,
  q: { year?: unknown; brId?: unknown },
) => {
  if (!ctx.coId) throw new ServiceError(401, "Authentication required");
  const year = String(q.year ?? "").trim();
  const brId = String(q.brId ?? "").trim();
  if (!year || !brId) throw new ServiceError(400, "year and brId are required");

  const result = await pool.query(
    `SELECT fdocno, fdocnolen
       FROM dbo.getnextdocno($1::varchar, $2::varchar, $3::varchar, $4::varchar)`,
    [ctx.coId, year, brId, DOC_TYPE],
  );

  return {
    docNo: String(result.rows[0]?.fdocno ?? ""),
    docNoLen: Number(result.rows[0]?.fdocnolen ?? 0),
  };
};

/* =========================================================
   Lookups (clsSIR.FillCombos)
   ========================================================= */
export const getLookups = async (ctx: Ctx, q: { brId?: unknown }) => {
  if (!ctx.coId) throw new ServiceError(401, "Authentication required");
  const brId = String(q.brId ?? "").trim();
  if (!brId) throw new ServiceError(400, "brId is required");

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
      [ctx.coId],
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
      [ctx.coId, brId],
    ),
  ]);

  return {
    customers: customers.rows,
    discTypes: discTypes.rows,
    priceLevels: priceLevels.rows,
    items: items.rows,
  };
};
