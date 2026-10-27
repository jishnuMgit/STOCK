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


export type ItemGroup = { groupId: string; groupName: string };

// the item groups of the company (dbo.filllookupitemgroupid, shared with the other screens)
export const getItemGroups = async (PstrCoID: string): Promise<ItemGroup[]> => {
  const { rows } = await pool.query(`SELECT * FROM dbo.filllookupitemgroupid($1)`, [PstrCoID]);

  return rows.map((r) => ({
    groupId: text(r.fitemgroupid).trim(),
    groupName: text(r.fitemgroupname).trim(),
  }));
};

/* =========================================================
   THE REPORT - dbo.sp_rptstockvalue (PROCEDURE with an INOUT refcursor)
========================================================= */

// what the screen asks for, as the procedure takes it (the codes of the old SP_rptStockValue)
export type StockValuationParams = {
  PstrCoID: string;
  PstrYear: string; // the login year: which tblstockcontrol row gives the Unit Cost
  rdgBranch: 0 | 1 | 2; // 0 One Branch, 1 Selected Branch, 2 All Branch
  lkpBranch: string; // One Branch
  chkBranch: string[]; // Selected Branch: the ticked branches
  rdgItemGroup: 0 | 1; // 0 One Item Group, 1 All Item Group
  lkpOneItemGroupID: string; // One Item Group
  dtpAsOnDate: string; // yyyy-mm-dd
  lkpPostStatus: 0 | 1 | 2; // 0 All, 1 Posted, 2 Non Posted (the same as the Stock report)
};

// one printed line: an item (of a branch)
export type StockValuationLine = {
  lkpBranch: string;
  lkpItemID: string;
  txtItemName: string;
  lkpItemGroupID: string;
  txtItemGroupName: string;
  txtUnit: string;
  txtStock: number;
  txtUnitCost: number;
  txtStockValue: number;
};

// one branch of the report: its name, its lines and its Total
export type StockValuationBranch = {
  lkpBranch: string;
  txtBranchName: string;
  lines: StockValuationLine[];
  totals: { txtStock: number; txtStockValue: number };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DbRow = Record<string, any>;

const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

// the numbers are kept to 4 decimals so the additions do not drag float noise along
export const round4 = (v: number) => Math.round(v * 10000) / 10000;

// CALL and FETCH must run in ONE transaction
let cursorSeq = 0;

const callStockValue = async (p: StockValuationParams): Promise<DbRow[]> => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const cursor = `cur_rptstockvalue_${process.pid}_${++cursorSeq}`.toLowerCase();

    // the arguments of sp_rptstockvalue, in its order
    await client.query(
      `
      CALL dbo.sp_rptstockvalue(
        $1::varchar, $2::int, $3::varchar, $4::varchar[], $5::int,
        $6::varchar, $7::date, $8::int, $9::varchar, $10::refcursor
      )
      `,
      [
        p.PstrCoID, // p_pstrcoid
        p.rdgBranch, // p_rdgbranch
        p.rdgBranch === 0 ? p.lkpBranch : null, // p_strbrid
        p.rdgBranch === 1 ? p.chkBranch : null, // p_strfilter
        p.rdgItemGroup, // p_rdgitemgroup
        p.rdgItemGroup === 0 ? p.lkpOneItemGroupID : null, // p_stritemgroupid
        p.dtpAsOnDate, // p_strasondate
        p.lkpPostStatus, // p_lkppoststatus
        p.PstrYear, // p_pstryear
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

export const getStockValuation = async (
  p: StockValuationParams
): Promise<{ lines: StockValuationLine[]; totals: { txtStock: number; txtStockValue: number } }> => {
  const rows = await callStockValue(p);

  const lines: StockValuationLine[] = rows.map((r) => ({
    lkpBranch: text(r.fbrid).trim(),
    lkpItemID: text(r.fitemid).trim(),
    txtItemName: text(r.fitemname).trim(),
    lkpItemGroupID: text(r.fitemgroupid).trim(),
    txtItemGroupName: text(r.fitemgroupname).trim(),
    txtUnit: text(r.funit).trim(),
    txtStock: num(r.fstock),
    txtUnitCost: num(r.funitcost),
    txtStockValue: num(r.fstockvalue),
  }));

  // the Grand Total row of the report footer
  return {
    lines,
    totals: {
      txtStock: round4(lines.reduce((sum, l) => sum + l.txtStock, 0)),
      txtStockValue: round4(lines.reduce((sum, l) => sum + l.txtStockValue, 0)),
    },
  };
};
