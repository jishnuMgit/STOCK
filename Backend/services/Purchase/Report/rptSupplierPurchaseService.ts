import pool from "../../../DB/db.js";

export type Branch = { brId: string; brName: string };

const text = (value: unknown): string => String(value ?? "");

// the branches the logged-in user has a right to
export const getBranches = async (PstrCoID: string, PstrUserID: string): Promise<Branch[]> => {
  const { rows } = await pool.query(
    `
    SELECT fbrid, fbrname
      FROM dbo.tblbranch
     WHERE fcoid = $1
       AND dbo.userbranches($1, $2, fbrid)
     ORDER BY fpositionno, fbrid
    `,
    [PstrCoID, PstrUserID]
  );

  return rows.map((r) => ({ brId: text(r.fbrid).trim(), brName: text(r.fbrname).trim() }));
};

// the user's default branch (Set Default Branch); "" when none is set
export const getDefaultBranch = async (PstrCoID: string, PstrUserID: string): Promise<string> => {
  const { rows } = await pool.query(`SELECT dbo.getuserdefbranch($1, $2) AS "defaultBranch"`, [
    PstrCoID,
    PstrUserID,
  ]);

  return text(rows[0]?.defaultBranch).trim();
};

export type Supplier = { supplierId: string; supplierName: string };

// the suppliers of the company (the Supplier ID / Supplier Name boxes), by Supplier ID:
// dbo.filllookupsupplierid (the accounts of tblaccountcs that are suppliers)
export const getSuppliers = async (PstrCoID: string): Promise<Supplier[]> => {
  const { rows } = await pool.query(`SELECT * FROM dbo.filllookupsupplierid($1)`, [PstrCoID]);

  return rows.map((r) => ({
    supplierId: text(r.fcsaccountid).trim(),
    supplierName: text(r.fcsaccountname).trim(),
  }));
};

/* =========================================================
   THE REPORT - dbo.sp_rptsupplierpurchase (Summary) and dbo.sp_rptstdocprint (Detailed)
   Both are PROCEDUREs with an INOUT refcursor.
========================================================= */

// what the screen asks for, as the procedures take it (the codes of the old form)
export type SupplierPurchaseParams = {
  PstrCoID: string;
  rdgBranch: 0 | 1; // 0 One Branch, 1 All Branch
  lkpBranch: string; // One Branch
  rdgSupplier: 0 | 1; // 0 One Supplier, 1 All Supplier
  lkpSupplierID: string; // One Supplier
  dtpFromDate: string; // yyyy-mm-dd
  dtpToDate: string; // yyyy-mm-dd
};

// ---- Summary: one line per document, a block per supplier ----

export type SupplierPurchaseLine = {
  txtDate: string; // dd-MMM-yy
  txtDocType: string; // PI or PR
  txtDocNo: string;
  txtAmountFC: number; // Amount_FC: a Purchase Return is minus
  txtAmount: number; // Amount: a Purchase Return is minus
};

export type SupplierPurchaseSupplier = {
  lkpSupplierID: string;
  txtSupplierName: string;
  lines: SupplierPurchaseLine[];
  totals: { txtAmountFC: number; txtAmount: number };
};

// ---- Detailed: a block per document, with its item lines ----

export type SupplierPurchaseDetailLine = {
  txtSlNo: number;
  lkpItemID: string;
  txtItemName: string;
  txtUnit: string;
  txtQty: number;
  txtUnitPriceFC: number;
  txtTotalPriceFC: number;
  txtUnitPrice: number;
  txtUnitCost: number;
  txtTotalCost: number;
};

export type SupplierPurchaseDocument = {
  lkpBranch: string;
  txtBranchName: string;
  txtDocNo: string; // Entry No.
  txtDate: string; // dd-MMM-yyyy
  lkpSupplierID: string;
  txtSupplierName: string;
  txtPINo: string; // P. Invoice No. of a PI, P. Entry No. of a PR
  txtPONo: string;
  txtCurrency: string;
  txtCurrencyRate: number;
  txtSupplierAmt: number; // the Sup. Amount typed on the Purchase Invoice screen
  txtDiscAmtFC: number;
  txtDiscAmt: number;
  txtNote: string;
  lines: SupplierPurchaseDetailLine[];
  totals: { txtQty: number; txtTotalPriceFC: number; txtTotalCost: number };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DbRow = Record<string, any>;

const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

// the numbers are kept to 4 decimals so the additions do not drag float noise along
const round4 = (v: number) => Math.round(v * 10000) / 10000;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// a date column comes as a JS Date (the day at midnight, server time): dd-MMM-yy / dd-MMM-yyyy
const dmy = (value: unknown, fullYear: boolean): string => {
  const d = value instanceof Date ? value : new Date(String(value));

  if (Number.isNaN(d.getTime())) return "";

  const year = fullYear ? String(d.getFullYear()) : String(d.getFullYear()).slice(-2);

  return `${String(d.getDate()).padStart(2, "0")}-${MONTHS[d.getMonth()]}-${year}`;
};

// CALL and FETCH must run in ONE transaction
let cursorSeq = 0;

// CALL dbo.<procedure>(<the arguments, each cast to its type>, <the cursor>) and read the cursor
const callCursor = async (
  procedure: "sp_rptsupplierpurchase" | "sp_rptstdocprint",
  casts: string[],
  args: unknown[]
): Promise<DbRow[]> => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const cursor = `cur_${procedure}_${process.pid}_${++cursorSeq}`.toLowerCase();

    const placeholders = [
      ...casts.map((cast, i) => `$${i + 1}::${cast}`),
      `$${casts.length + 1}::refcursor`,
    ].join(", ");

    await client.query(`CALL dbo.${procedure}(${placeholders})`, [...args, cursor]);

    const { rows } = await client.query(`FETCH ALL FROM "${cursor}"`);

    await client.query("COMMIT");

    return rows;
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {
      /* ignore */
    }

    throw error;
  } finally {
    client.release();
  }
};

// Summary: the procedure gives one row per document ordered by supplier, date, document no.;
// they are cut into one block per supplier, each with its Total (the old report's group header and footer)
export const getSupplierPurchaseSummary = async (
  p: SupplierPurchaseParams
): Promise<SupplierPurchaseSupplier[]> => {
  // the arguments of sp_rptsupplierpurchase, in its order
  const rows = await callCursor(
    "sp_rptsupplierpurchase",
    ["varchar", "boolean", "varchar", "boolean", "varchar", "date", "date"],
    [
      p.PstrCoID, // p_pstrcoid
      p.rdgBranch === 1, // p_rdgbranch: false One Branch, true All Branch
      p.rdgBranch === 0 ? p.lkpBranch : null, // p_strbrid
      p.rdgSupplier === 1, // p_rdgsupplier: false One Supplier, true All Supplier
      p.rdgSupplier === 0 ? p.lkpSupplierID : null, // p_strsupplierid
      p.dtpFromDate, // p_dtpfromdate
      p.dtpToDate, // p_dtptodate
    ]
  );

  const suppliers: SupplierPurchaseSupplier[] = [];

  for (const r of rows) {
    const supplierId = text(r.fcsaccountid).trim();

    let supplier = suppliers[suppliers.length - 1];

    if (!supplier || supplier.lkpSupplierID !== supplierId) {
      supplier = {
        lkpSupplierID: supplierId,
        txtSupplierName: text(r.fcsaccountname).trim(),
        lines: [],
        totals: { txtAmountFC: 0, txtAmount: 0 },
      };
      suppliers.push(supplier);
    }

    supplier.lines.push({
      txtDate: dmy(r.fdate, false),
      txtDocType: text(r.fdoctype).trim(),
      txtDocNo: text(r.fdocno).trim(),
      txtAmountFC: num(r.fnetdocamt_fc),
      txtAmount: num(r.fnetdocamt),
    });
  }

  for (const supplier of suppliers) {
    supplier.totals.txtAmountFC = round4(supplier.lines.reduce((s, l) => s + l.txtAmountFC, 0));
    supplier.totals.txtAmount = round4(supplier.lines.reduce((s, l) => s + l.txtAmount, 0));
  }

  return suppliers;
};

// Detailed: the procedure gives every line of every document (PI or PR) ordered by branch, document no., line;
// they are cut into one block per document, each with its Total
export const getSupplierPurchaseDetailed = async (
  p: SupplierPurchaseParams,
  rdgDocType: "PI" | "PR"
): Promise<SupplierPurchaseDocument[]> => {
  // the arguments of sp_rptstdocprint, in its order
  const rows = await callCursor(
    "sp_rptstdocprint",
    ["varchar", "varchar", "boolean", "varchar", "boolean", "varchar", "date", "date"],
    [
      rdgDocType, // p_strdoc
      p.PstrCoID, // p_pstrcoid
      p.rdgBranch === 1, // p_rdgbranch
      p.rdgBranch === 0 ? p.lkpBranch : null, // p_strbrid
      p.rdgSupplier === 1, // p_rdgsupplier
      p.rdgSupplier === 0 ? p.lkpSupplierID : null, // p_strsupplierid
      p.dtpFromDate, // p_dtpfromdate
      p.dtpToDate, // p_dtptodate
    ]
  );

  const documents: SupplierPurchaseDocument[] = [];

  for (const r of rows) {
    const brId = text(r.fbrid).trim();
    const docNo = text(r.fdocno).trim();

    let doc = documents[documents.length - 1];

    if (!doc || doc.lkpBranch !== brId || doc.txtDocNo !== docNo) {
      doc = {
        lkpBranch: brId,
        // a branch that is not in the branch list (the old data has branch "11") shows its id
        txtBranchName: text(r.fbrname).trim() || brId,
        txtDocNo: docNo,
        txtDate: dmy(r.fdate, true),
        lkpSupplierID: text(r.fcsaccountid).trim(),
        txtSupplierName: text(r.fcsaccountname).trim(),
        // the supplier's invoice no. of a PI, the original entry of a PR
        txtPINo: text(rdgDocType === "PI" ? r.fpino : r.fprsrorigdocno).trim(),
        txtPONo: text(r.fpono).trim(),
        txtCurrency: text(r.fcurrency).trim(),
        txtCurrencyRate: num(r.fcurrencyrate),
        txtSupplierAmt: num(r.fdocamt),
        txtDiscAmtFC: num(r.fsup_discamt),
        txtDiscAmt: num(r.fdiscamt),
        txtNote: text(r.fnote).trim(),
        lines: [],
        totals: { txtQty: 0, txtTotalPriceFC: 0, txtTotalCost: 0 },
      };
      documents.push(doc);
    }

    doc.lines.push({
      txtSlNo: num(r.fslno),
      lkpItemID: text(r.fitemid).trim(),
      txtItemName: text(r.fitemname).trim(),
      txtUnit: text(r.funit).trim(),
      txtQty: num(r.fqty),
      txtUnitPriceFC: num(r.fsup_unitprice),
      txtTotalPriceFC: num(r.fsup_totalprice),
      txtUnitPrice: num(r.funitprice),
      txtUnitCost: num(r.funitcost),
      txtTotalCost: num(r.ftotalcost),
    });
  }

  for (const doc of documents) {
    doc.totals.txtQty = round4(doc.lines.reduce((s, l) => s + l.txtQty, 0));
    doc.totals.txtTotalPriceFC = round4(doc.lines.reduce((s, l) => s + l.txtTotalPriceFC, 0));
    doc.totals.txtTotalCost = round4(doc.lines.reduce((s, l) => s + l.txtTotalCost, 0));
  }

  return documents;
};
