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

// the items of every branch (the Item ID / Item Name boxes and the Item Range boxes), one row per branch and item,
// by Item ID: dbo.filllookupitemid, the same lookup the other screens use. The screen shows the items of the branch
// that is chosen.
export const getItems = async (PstrCoID: string): Promise<Item[]> => {
  const { rows } = await pool.query(`SELECT * FROM dbo.filllookupitemid($1)`, [PstrCoID]);

  return rows.map((r) => ({
    itemId: text(r.fitemid).trim(),
    itemName: text(r.fitemname).trim(),
    brId: text(r.fbrid).trim(),
  }));
};

/* =========================================================
   THE REPORT - dbo.sp_rptitemmovement (Fast / Slow Moving) and dbo.sp_rptitemnonmoving (Non Moving):
   PROCEDURES with an INOUT refcursor
========================================================= */

// what the screen asks for, as the procedures take it (the codes of the old form)
export type ItemMovementParams = {
  PstrCoID: string;
  rdgBranch: 0 | 1; // 0 One Branch, 1 All Branch
  lkpBranch: string; // One Branch
  rdgItem: 0 | 1 | 2; // 0 One Item, 1 Range Item, 2 All Item
  lkpItemID: string; // One Item
  lkpFromItem: string; // Range Item
  lkpToItem: string; // Range Item
  dtpFromDate: string; // yyyy-mm-dd
  dtpToDate: string; // yyyy-mm-dd
  lkpPostStatus: 0 | 1 | 2; // 0 All, 1 Posted, 2 Non Posted (the same as the other reports)
  rdgItemMovement: 0 | 1 | 2; // 0 Fast Moving, 1 Slow Moving, 2 Non Moving
  rdgOrderBy: 0 | 1; // 0 Order by Qty., 1 Order by Value (Fast / Slow only)
};

// one printed line: an item. A Non Moving line has no Moved Qty / Moved Value (they are 0 and not printed).
export type ItemMovementLine = {
  lkpItemID: string;
  txtItemName: string;
  txtItemGroupName: string;
  txtMovedQty: number;
  txtMovedValue: number;
  txtStock: number;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DbRow = Record<string, any>;

const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

// the numbers are kept to 4 decimals so the additions do not drag float noise along
const round4 = (v: number) => Math.round(v * 10000) / 10000;

// CALL and FETCH must run in ONE transaction
let cursorSeq = 0;

const callProcedure = async (sql: string, args: unknown[], cursorPrefix: string): Promise<DbRow[]> => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const cursor = `${cursorPrefix}_${process.pid}_${++cursorSeq}`.toLowerCase();

    await client.query(sql, [...args, cursor]);

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

// the arguments both procedures share, in their order: company, branch, All Branch, item mode, item, from, to,
// from date, to date, post status
const commonArgs = (p: ItemMovementParams): unknown[] => [
  p.PstrCoID, // p_pstrcoid
  p.rdgBranch === 0 ? p.lkpBranch : null, // p_strbrid
  p.rdgBranch === 1, // p_rdgbranch: false One Branch, true All Branch
  p.rdgItem, // p_rdgitem
  p.rdgItem === 0 ? p.lkpItemID : null, // p_stritemid
  p.rdgItem === 1 ? p.lkpFromItem : null, // p_strfromitemid
  p.rdgItem === 1 ? p.lkpToItem : null, // p_strtoitemid
  p.dtpFromDate, // p_dtpfromdate
  p.dtpToDate, // p_dtptodate
  p.lkpPostStatus, // p_lkppoststatus
];

export type ItemMovementResult = {
  lines: ItemMovementLine[];
  // the Total row of Fast / Slow Moving (Non Moving has none)
  totals: { txtMovedQty: number; txtMovedValue: number; txtStock: number };
};

export const getItemMovement = async (p: ItemMovementParams): Promise<ItemMovementResult> => {
  let rows: DbRow[];

  if (p.rdgItemMovement === 2) {
    // Non Moving: dbo.sp_rptitemnonmoving
    rows = await callProcedure(
      `
      CALL dbo.sp_rptitemnonmoving(
        $1::varchar, $2::varchar, $3::boolean, $4::int, $5::varchar,
        $6::varchar, $7::varchar, $8::date, $9::date, $10::int, $11::refcursor
      )
      `,
      commonArgs(p),
      "cur_rptitemnonmoving"
    );
  } else {
    // Fast / Slow Moving: dbo.sp_rptitemmovement
    rows = await callProcedure(
      `
      CALL dbo.sp_rptitemmovement(
        $1::varchar, $2::varchar, $3::boolean, $4::int, $5::varchar,
        $6::varchar, $7::varchar, $8::date, $9::date, $10::int,
        $11::varchar, $12::int, $13::refcursor
      )
      `,
      [...commonArgs(p), p.rdgItemMovement === 0 ? "F" : "S", p.rdgOrderBy],
      "cur_rptitemmovement"
    );
  }

  const lines: ItemMovementLine[] = rows.map((r) => ({
    lkpItemID: text(r.fitemid).trim(),
    txtItemName: text(r.fitemname).trim(),
    txtItemGroupName: text(r.fitemgroupname).trim(),
    txtMovedQty: num(r.fmovedqty),
    txtMovedValue: num(r.fmovedvalue),
    txtStock: num(r.fstock),
  }));

  return {
    lines,
    totals: {
      txtMovedQty: round4(lines.reduce((s, l) => s + l.txtMovedQty, 0)),
      txtMovedValue: round4(lines.reduce((s, l) => s + l.txtMovedValue, 0)),
      txtStock: round4(lines.reduce((s, l) => s + l.txtStock, 0)),
    },
  };
};
