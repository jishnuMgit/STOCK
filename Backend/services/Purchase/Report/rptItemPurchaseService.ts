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

export type Item = { itemId: string; itemName: string; brId: string };

// the items of every branch (the Item ID / Item Name boxes), one row per branch and item, by Item ID:
// dbo.filllookupitemid, the same lookup the other screens use (tblitemtl - the items a branch trades - with the
// name from tblitemhd). The screen shows the items of the branch that is chosen. Inactive items are kept: a
// purchase report may need an item that is not traded any more.
export const getItems = async (PstrCoID: string): Promise<Item[]> => {
  const { rows } = await pool.query(`SELECT * FROM dbo.filllookupitemid($1)`, [PstrCoID]);

  return rows.map((r) => ({
    itemId: text(r.fitemid).trim(),
    itemName: text(r.fitemname).trim(),
    brId: text(r.fbrid).trim(),
  }));
};

/* =========================================================
   THE REPORT - dbo.sp_rptitempurchase (PROCEDURE with an INOUT refcursor)
========================================================= */

// what the screen asks for, as the procedure takes it (the codes of the old form)
export type ItemPurchaseParams = {
  PstrCoID: string;
  rdgBranch: 0 | 1; // 0 One Branch, 1 All Branch
  lkpBranch: string; // One Branch
  rdgItem: 0 | 1; // 0 One Item, 1 All Item
  lkpItemID: string; // One Item
  dtpFromDate: string; // yyyy-mm-dd
  dtpToDate: string; // yyyy-mm-dd
};

// one printed line: a purchase (PI) or a return (PR) of the item
export type ItemPurchaseLine = {
  txtDate: string; // dd-MMM-yy
  txtDocType: string; // PI or PR
  txtDocNo: string;
  txtPINo: string; // the supplier's invoice no. of a PI, "" for a PR
  txtQty: number; // a Purchase Return is minus
  txtUnitPrice: number;
  txtSupplierName: string;
};

// one item: its heading, its lines and its Total (the Qty)
export type ItemPurchaseItem = {
  lkpItemID: string;
  txtItemName: string;
  lines: ItemPurchaseLine[];
  totals: { txtQty: number };
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

// a date column comes as a JS Date (the day at midnight, server time): dd-MMM-yy
const ddmmmyy = (value: unknown): string => {
  const d = value instanceof Date ? value : new Date(String(value));

  if (Number.isNaN(d.getTime())) return "";

  return `${String(d.getDate()).padStart(2, "0")}-${MONTHS[d.getMonth()]}-${String(d.getFullYear()).slice(-2)}`;
};

// CALL and FETCH must run in ONE transaction
let cursorSeq = 0;

const callItemPurchase = async (p: ItemPurchaseParams): Promise<DbRow[]> => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const cursor = `cur_rptitempurchase_${process.pid}_${++cursorSeq}`.toLowerCase();

    // the arguments of sp_rptitempurchase, in its order
    await client.query(
      `
      CALL dbo.sp_rptitempurchase(
        $1::varchar, $2::varchar, $3::boolean, $4::boolean, $5::varchar,
        $6::date, $7::date, $8::refcursor
      )
      `,
      [
        p.PstrCoID, // p_pstrcoid
        p.rdgBranch === 0 ? p.lkpBranch : null, // p_strbrid
        p.rdgBranch === 1, // p_rdgbranch: false One Branch, true All Branch
        p.rdgItem === 1, // p_rdgitem: false One Item, true All Item
        p.rdgItem === 0 ? p.lkpItemID : null, // p_stritemid
        p.dtpFromDate, // p_dtpfromdate
        p.dtpToDate, // p_dtptodate
        cursor,
      ]
    );

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

// the procedure gives one row per document line ordered by item, date, document no.; they are cut into one
// block per item, each with its Total (the old report's group header and group footer)
export const getItemPurchase = async (p: ItemPurchaseParams): Promise<ItemPurchaseItem[]> => {
  const rows = await callItemPurchase(p);

  const items: ItemPurchaseItem[] = [];

  for (const r of rows) {
    const itemId = text(r.fitemid).trim();

    let item = items[items.length - 1];

    if (!item || item.lkpItemID !== itemId) {
      item = {
        lkpItemID: itemId,
        txtItemName: text(r.fitemname).trim(),
        lines: [],
        totals: { txtQty: 0 },
      };
      items.push(item);
    }

    item.lines.push({
      txtDate: ddmmmyy(r.fdate),
      txtDocType: text(r.fdoctype).trim(),
      txtDocNo: text(r.fdocno).trim(),
      txtPINo: text(r.fpino).trim(),
      txtQty: num(r.fqty),
      txtUnitPrice: num(r.funitprice),
      txtSupplierName: text(r.fcsaccountname).trim(),
    });
  }

  for (const item of items) {
    item.totals.txtQty = round4(item.lines.reduce((s, l) => s + l.txtQty, 0));
  }

  return items;
};
