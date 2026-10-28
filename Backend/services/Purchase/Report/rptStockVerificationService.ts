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
   THE REPORT - dbo.sp_rptstockverification (PROCEDURE with an INOUT refcursor)
========================================================= */

// what the screen asks for, as the procedure takes it (the codes of the old SP_rptStockVerIfication)
export type StockVerificationParams = {
  PstrCoID: string;
  rdgBranch: 0 | 1; // 0 One Branch, 1 All Branch
  lkpBranch: string; // One Branch
  rdgItemGroup: 0 | 1; // 0 One Item Group, 1 All Item Group
  lkpOneItemGroupID: string; // One Item Group
  dtpAsOnDate: string; // yyyy-mm-dd
  lkpPostStatus: 0 | 1 | 2; // 0 All, 1 Posted, 2 Non Posted (the same as the other reports)
};

// one printed line: an item of a branch
export type StockVerificationLine = {
  lkpItemID: string;
  txtItemName: string;
  txtUnit: string;
  txtStock: number; // Comp. Stock
};

// one item group of a branch: its heading, its lines and its Total
export type StockVerificationGroup = {
  lkpItemGroupID: string;
  txtItemGroupName: string;
  lines: StockVerificationLine[];
  totals: { txtStock: number };
};

// one branch: its item groups and its Total (txtBranchName is put in by the controller)
export type StockVerificationBranch = {
  lkpBranch: string;
  txtBranchName: string;
  groups: StockVerificationGroup[];
  totals: { txtStock: number };
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

const callStockVerification = async (p: StockVerificationParams): Promise<DbRow[]> => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const cursor = `cur_rptstockverification_${process.pid}_${++cursorSeq}`.toLowerCase();

    // the arguments of sp_rptstockverification, in its order
    await client.query(
      `
      CALL dbo.sp_rptstockverification(
        $1::varchar, $2::boolean, $3::varchar, $4::int, $5::varchar,
        $6::date, $7::int, $8::refcursor
      )
      `,
      [
        p.PstrCoID, // p_pstrcoid
        p.rdgBranch === 1, // p_rdgbranch: false One Branch, true All Branch
        p.rdgBranch === 0 ? p.lkpBranch : null, // p_strbrid
        p.rdgItemGroup, // p_rdgitemgroup
        p.rdgItemGroup === 0 ? p.lkpOneItemGroupID : null, // p_stritemgroupid
        p.dtpAsOnDate, // p_dtpasondate
        p.lkpPostStatus, // p_lkppoststatus
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

// the rows come ordered by item group, then item, then branch: they are sorted into one block per branch,
// and in it one block per item group (the old report's group header and group footer)
export const getStockVerification = async (
  p: StockVerificationParams
): Promise<{ branches: StockVerificationBranch[]; totals: { txtStock: number } }> => {
  const rows = await callStockVerification(p);

  const branches = new Map<string, StockVerificationBranch>();

  for (const r of rows) {
    const brId = text(r.fbrid).trim();

    let branch = branches.get(brId);

    if (!branch) {
      branch = { lkpBranch: brId, txtBranchName: brId, groups: [], totals: { txtStock: 0 } };
      branches.set(brId, branch);
    }

    const groupId = text(r.fitemgroupid).trim();

    let group = branch.groups[branch.groups.length - 1];

    if (!group || group.lkpItemGroupID !== groupId) {
      group = {
        lkpItemGroupID: groupId,
        txtItemGroupName: text(r.fitemgroupname).trim(),
        lines: [],
        totals: { txtStock: 0 },
      };
      branch.groups.push(group);
    }

    group.lines.push({
      lkpItemID: text(r.fitemid).trim(),
      txtItemName: text(r.fitemname).trim(),
      txtUnit: text(r.funit).trim(),
      txtStock: num(r.fstock),
    });
  }

  // the Total of every group, of every branch and of the report
  let grand = 0;

  for (const branch of branches.values()) {
    let branchTotal = 0;

    for (const group of branch.groups) {
      group.totals.txtStock = round4(group.lines.reduce((sum, l) => sum + l.txtStock, 0));
      branchTotal += group.totals.txtStock;
    }

    branch.totals.txtStock = round4(branchTotal);
    grand += branch.totals.txtStock;
  }

  return { branches: [...branches.values()], totals: { txtStock: round4(grand) } };
};
