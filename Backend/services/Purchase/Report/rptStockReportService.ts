// services/Purchase/Report/rptStockReportService.ts
// Data access for the Stock report (Sales > Report > Stock; port of the rptStockReport form and
// its two reports rptStockDetRpt / rptStockSumRpt -> dbo.sp_rptstock).
import pool from "../../../DB/db.js";

export type Branch = { brId: string; brName: string };
export type ItemLookup = { itemId: string; itemName: string; itemGroupId: string; brId: string };
export type ItemGroup = { groupId: string; groupName: string };

export type StockReportParams = {
  detOrSum: "D" | "S";
  postStatus: 0 | 1 | 2; // 0 all, 1 posted, 2 non posted (as in SP_rptStock)
  coId: string;
  oneBranch: boolean;
  branchId: string;
  itemMode: 0 | 1 | 2 | 3; // 0 one item, 1 one item group, 2 all items, 3 item range
  itemId: string;
  itemGroupId: string;
  itemIdFrom: string; // item range: the first item
  itemIdTo: string; // item range: the last item
  fromDate: string; // yyyy-mm-dd
  toDate: string; // yyyy-mm-dd
  txnOrder: boolean;
};

// ---- Detailed: grouped by item, with the running balance ------------------
export type DetailLine = {
  txtDate: string | null; // yyyy-mm-dd, null for the opening row
  txtDocType: string;
  txtDocNo: string;
  txtTxnNo: string; // posting number, "" when not posted
  txtUnitCost: number | null;
  txtQtyIn: number;
  txtQtyOut: number;
  txtBalance: number;
};

export type DetailItem = {
  lkpItemID: string;
  txtItemName: string;
  lines: DetailLine[];
  txtTotalIn: number;
  txtTotalOut: number;
  txtTotalBalance: number;
};

// one branch of the Detailed report: its items (the branch name is put in by the controller)
export type DetailBranch = {
  lkpBranch: string;
  txtBranchName: string;
  items: DetailItem[];
};

// ---- Summary: one row per item ---------------------------------------------
export type SummaryLine = {
  lkpItemID: string;
  txtItemName: string;
  txtUnit: string;
  txtQtyOpening: number;
  txtQtyIn: number;
  txtQtyOut: number;
  txtQtyClosing: number;
};

export type SummaryTotals = {
  txtQtyOpening: number;
  txtQtyIn: number;
  txtQtyOut: number;
  txtQtyClosing: number;
};

// one branch of the Summary report: its rows and its Total
export type SummaryBranch = {
  lkpBranch: string;
  txtBranchName: string;
  lines: SummaryLine[];
  totals: SummaryTotals;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DbRow = Record<string, any>;

const text = (v: unknown): string => String(v ?? "");

const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

// the numbers are kept to 4 decimals so the additions do not drag float noise along
const round4 = (v: number) => Math.round(v * 10000) / 10000;

// a timestamp column comes back from pg as a Date (local) or as text
const ymd = (v: unknown): string | null => {
  if (v === null || v === undefined || v === "") return null;

  if (v instanceof Date) {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${v.getFullYear()}-${pad(v.getMonth() + 1)}-${pad(v.getDate())}`;
  }

  return String(v).slice(0, 10);
};

/* =========================================================
   Calls a Postgres PROCEDURE that returns a refcursor:
   CALL + FETCH must run in ONE transaction.
========================================================= */

let cursorSeq = 0;

const callCursor = async (name: string, args: unknown[], casts: string[]): Promise<DbRow[]> => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const cur = `cur_${name}_${process.pid}_${++cursorSeq}`.toLowerCase();
    const list = casts.map((c, i) => `$${i + 1}::${c}`).join(", ");

    await client.query(`CALL dbo.${name}(${list}, $${args.length + 1}::refcursor)`, [
      ...args,
      cur,
    ]);

    const { rows } = await client.query(`FETCH ALL FROM "${cur}"`);

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

/* =========================================================
   LOOKUPS (the old FillCombos)
========================================================= */

// the branches the logged-in user has a right to, in the order of the Branch screen
export const getBranches = async (coId: string, userId: string): Promise<Branch[]> => {
  const { rows } = await pool.query(
    `
    SELECT fbrid, fbrname
      FROM dbo.tblbranch
     WHERE fcoid = $1
       AND dbo.userbranches($1, $2, fbrid)
     ORDER BY fpositionno, fbrid
    `,
    [coId, userId]
  );

  return rows.map((r) => ({ brId: text(r.fbrid).trim(), brName: text(r.fbrname).trim() }));
};

// the user's default branch (Set Default Branch); "" when none is set
export const getDefaultBranch = async (coId: string, userId: string): Promise<string> => {
  const { rows } = await pool.query(`SELECT dbo.getuserdefbranch($1, $2) AS "defaultBranch"`, [
    coId,
    userId,
  ]);

  return text(rows[0]?.defaultBranch).trim();
};

// the items of every branch (the Item ID / Item Name boxes and the Item Range boxes), one row per branch and
// item, by Item ID: dbo.filllookupitemid, the same lookup the other screens use (tblitemtl - the items a branch
// trades - with the name and the group from tblitemhd). The screen shows the items of the branch that is chosen.
export const getItems = async (coId: string): Promise<ItemLookup[]> => {
  const { rows } = await pool.query(`SELECT * FROM dbo.filllookupitemid($1)`, [coId]);

  return rows.map((r) => ({
    itemId: text(r.fitemid).trim(),
    itemName: text(r.fitemname).trim(),
    itemGroupId: text(r.fitemgroupid).trim(),
    brId: text(r.fbrid).trim(),
  }));
};

export const getItemGroups = async (coId: string): Promise<ItemGroup[]> => {
  const { rows } = await pool.query(
    `
    SELECT fitemgroupid, fitemgroupname
      FROM dbo.tblitemgroup
     WHERE fcoid = $1
     ORDER BY fitemgroupid
    `,
    [coId]
  );

  return rows.map((r) => ({
    groupId: text(r.fitemgroupid).trim(),
    groupName: text(r.fitemgroupname).trim(),
  }));
};

// Is the first item of an item range after the last one? Both are read from the item table, so
// the comparison uses the same order as the Item ID column (and as BETWEEN in the report).
export const isItemRangeReversed = async (
  coId: string,
  itemIdFrom: string,
  itemIdTo: string
): Promise<boolean> => {
  const { rows } = await pool.query(
    `
    SELECT (SELECT fitemid FROM dbo.tblitemhd WHERE fcoid = $1 AND fitemid = $2)
         > (SELECT fitemid FROM dbo.tblitemhd WHERE fcoid = $1 AND fitemid = $3) AS "reversed"
    `,
    [coId, itemIdFrom, itemIdTo]
  );

  return rows[0]?.reversed === true;
};

// one branch of the company, for the heading ("Branch : X")
export const getBranchName = async (coId: string, branchId: string): Promise<string> => {
  const { rows } = await pool.query(
    `SELECT fbrname FROM dbo.tblbranch WHERE fcoid = $1 AND fbrid = $2`,
    [coId, branchId]
  );

  return text(rows[0]?.fbrname).trim();
};

/* =========================================================
   THE REPORT - dbo.sp_rptstock
========================================================= */

const fetchRows = (p: StockReportParams) =>
  callCursor(
    "sp_rptstock",
    // the arguments of SP_rptStock, in its order
    [
      p.detOrSum, // strDetOrSum
      p.postStatus, // lkpPostStatus
      p.coId, // pstrCoID
      !p.oneBranch, // rdgBranch: 0 one branch, 1 all branches
      p.oneBranch ? p.branchId : null, // strBrID
      p.itemMode !== 1, // rdgByItem: 0 by item group, 1 by item
      p.itemMode === 1 ? p.itemGroupId : null, // strItemGroupID (null = every group)
      p.itemMode === 0 ? 0 : p.itemMode === 3 ? 1 : 2, // rdgItem: 0 one item, 1 range, 2 all
      p.itemMode === 0 ? p.itemId : null, // strItemID
      p.itemMode === 3 ? p.itemIdFrom : null, // strFromItemID
      p.itemMode === 3 ? p.itemIdTo : null, // strToItemID
      p.fromDate, // strFromDate
      p.toDate, // strToDate
      p.txnOrder, // blnOrderBy
    ],
    [
      "varchar",
      "int",
      "varchar",
      "boolean",
      "varchar",
      "boolean",
      "varchar",
      "int",
      "varchar",
      "varchar",
      "varchar",
      "date",
      "date",
      "boolean",
    ]
  );

// DETAILED: the rows come ordered by branch, then item; the running balance restarts for each item
// of each branch (the old rptStockDetRpt: balance += In - Out, set back to 0 after each item's group)
export const getDetailed = async (p: StockReportParams): Promise<DetailBranch[]> => {
  const rows = await fetchRows(p);
  const branches: DetailBranch[] = [];
  const items: DetailItem[] = []; // every item of every branch, for the footers below

  for (const r of rows) {
    const branchId = text(r.fbrid).trim();
    const itemId = text(r.fitemid).trim();

    let branch = branches[branches.length - 1];

    if (!branch || branch.lkpBranch !== branchId) {
      branch = { lkpBranch: branchId, txtBranchName: branchId, items: [] };
      branches.push(branch);
    }

    let item = branch.items[branch.items.length - 1];

    if (!item || item.lkpItemID !== itemId) {
      item = {
        lkpItemID: itemId,
        txtItemName: text(r.fitemname),
        lines: [],
        txtTotalIn: 0,
        txtTotalOut: 0,
        txtTotalBalance: 0,
      };
      branch.items.push(item);
      items.push(item);
    }

    const qtyIn = num(r.fqtyin);
    const qtyOut = num(r.fqtyout);

    item.txtTotalBalance = round4(item.txtTotalBalance + qtyIn - qtyOut);

    item.lines.push({
      txtDate: ymd(r.fdate),
      txtDocType: text(r.fdoctype),
      txtDocNo: text(r.fdocno),
      txtTxnNo: r.ftxnno === null || r.ftxnno === undefined ? "" : text(r.ftxnno),
      txtUnitCost: r.funitcost === null || r.funitcost === undefined ? null : num(r.funitcost),
      txtQtyIn: qtyIn,
      txtQtyOut: qtyOut,
      txtBalance: item.txtTotalBalance,
    });
  }

  // the group footer: the In and Out of the item and its final balance. The opening row
  // counts in the In / Out total as in the old report (its footer summed the column).
  for (const item of items) {
    item.txtTotalIn = round4(item.lines.reduce((sum, l) => sum + l.txtQtyIn, 0));
    item.txtTotalOut = round4(item.lines.reduce((sum, l) => sum + l.txtQtyOut, 0));
  }

  return branches;
};

// SUMMARY: one row per item, plus the totals of the report footer
export const getSummary = async (
  p: StockReportParams
): Promise<{ branches: SummaryBranch[]; totals: SummaryTotals }> => {
  const rows = await fetchRows(p);

  // the totals of a list of rows
  const totalsOf = (list: SummaryLine[]): SummaryTotals => {
    const sum = (pick: (l: SummaryLine) => number) =>
      round4(list.reduce((total, l) => total + pick(l), 0));

    return {
      txtQtyOpening: sum((l) => l.txtQtyOpening),
      txtQtyIn: sum((l) => l.txtQtyIn),
      txtQtyOut: sum((l) => l.txtQtyOut),
      txtQtyClosing: sum((l) => l.txtQtyClosing),
    };
  };

  // the rows come ordered by branch, then item: one section per branch
  const branches: SummaryBranch[] = [];
  const all: SummaryLine[] = [];

  for (const r of rows) {
    const branchId = text(r.fbrid).trim();

    let branch = branches[branches.length - 1];

    if (!branch || branch.lkpBranch !== branchId) {
      branch = {
        lkpBranch: branchId,
        txtBranchName: branchId,
        lines: [],
        totals: { txtQtyOpening: 0, txtQtyIn: 0, txtQtyOut: 0, txtQtyClosing: 0 },
      };
      branches.push(branch);
    }

    const line: SummaryLine = {
      lkpItemID: text(r.fitemid).trim(),
      txtItemName: text(r.fitemname),
      txtUnit: text(r.funit),
      txtQtyOpening: num(r.fqtyop),
      txtQtyIn: num(r.fqtyin),
      txtQtyOut: num(r.fqtyout),
      txtQtyClosing: num(r.fqtycl),
    };

    branch.lines.push(line);
    all.push(line);
  }

  for (const branch of branches) branch.totals = totalsOf(branch.lines);

  return { branches, totals: totalsOf(all) };
};
