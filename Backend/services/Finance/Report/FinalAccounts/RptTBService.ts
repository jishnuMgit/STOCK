// services/Purchase/Report/RptTBService.ts
// Data access for the Trial Balance REPORT page
// (port of the rptTB form + rptTB_MRpt / SP_rptTB -> dbo.sp_rpttb).
import type { PoolClient } from "pg";
import pool from "../../../../DB/db.js";

export type Branch = { brId: string; brName: string };

export type TBRow = {
  accountId: string;
  accountName: string; // indented with spaces when "Print A/C Group" is Yes
  accountNameA: string;
  level: number;
  opening: number;
  currentDr: number;
  currentCr: number;
  movement: number;
  closing: number;
};

export type TBTotals = {
  opening: number;
  currentDr: number;
  currentCr: number;
  movement: number;
  closing: number;
};

export type TBParams = {
  coId: string;
  allBranches: boolean;
  branchId: string;
  fromDate: string; // DD/MM/YYYY (what the procedure expects)
  toDate: string; // DD/MM/YYYY
  accountLevel: number;
  postStatus: 0 | 1 | 2; // 0 unposted, 1 posted, 2 all
  print0Bal: boolean;
  transType: 0 | 1 | 2; // 0 manual, 1 generated, 2 all
  printAcGroup: boolean;
};

type Db = Pick<PoolClient, "query">;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DbRow = Record<string, any>;

const text = (v: unknown): string => String(v ?? "");

// numeric columns come back from pg as strings
const money = (v: unknown): number => {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
};

const round2 = (n: number) => Number(n.toFixed(2));

// ------------------------------------------------------------
// Calls a Postgres PROCEDURE that returns a refcursor (INOUT):
// CALL + FETCH must run in ONE transaction (the procedure's temporary tables
// live until that transaction ends).
// ------------------------------------------------------------
let cursorSeq = 0;

const callCursor = async (
  name: string,
  args: unknown[],
  casts: string[],
): Promise<DbRow[]> => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const cur = `cur_${name}_${process.pid}_${++cursorSeq}`.toLowerCase();
    const list = casts.map((c, i) => `$${i + 1}::${c}`).join(", ");

    await client.query(
      `CALL dbo.${name}(${list}, $${args.length + 1}::refcursor)`,
      [...args, cur],
    );
    const { rows } = await client.query(`FETCH ALL FROM "${cur}"`);
    await client.query("COMMIT");
    return rows;
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch {
      /* ignore */
    }
    throw err;
  } finally {
    client.release();
  }
};

// ------------------------------------------------------------
// LOOKUPS (VB FillCombos) - a plain FUNCTION, called with SELECT
// ------------------------------------------------------------
const q = (db: Db, sql: string, args: unknown[]) => db.query(sql, args);

// the branches the user may use (lkpBranch)
export const getUserBranches = async (
  coId: string,
  userId: string,
): Promise<Branch[]> => {
  const { rows } = await q(
    pool,
    `SELECT * FROM dbo.fillbranchofuser($1::varchar, $2::varchar)`,
    [coId, userId],
  );
  return rows
    .map((r) => ({
      brId: text(r.fbrid ?? r.brid).trim(),
      brName: text(r.fbrname ?? r.brname).trim(),
    }))
    .filter((b) => b.brId !== "");
};

// ------------------------------------------------------------
// THE REPORT - dbo.sp_rpttb (PROCEDURE with an INOUT refcursor)
//   rdgbranch: 0 one branch, 1 all branches
// ------------------------------------------------------------
export const getTrialBalance = async (p: TBParams): Promise<TBRow[]> => {
  const rows = await callCursor(
    "sp_rpttb",
    [
      p.coId,
      p.allBranches ? 1 : 0,
      p.allBranches ? null : p.branchId,
      p.fromDate,
      p.toDate,
      p.accountLevel,
      p.postStatus,
      p.print0Bal,
      p.transType,
      p.printAcGroup,
    ],
    [
      "varchar",
      "smallint",
      "varchar",
      "varchar",
      "varchar",
      "smallint",
      "smallint",
      "boolean",
      "smallint",
      "boolean",
    ],
  );

  return rows.map((r) => ({
    accountId: text(r.fgaccountid).trim(),
    accountName: text(r.faccountname),
    accountNameA: text(r.faccountname_a),
    level: Number(r.faccountlevel ?? 0),
    opening: money(r.fop_drcr),
    currentDr: money(r.fcu_dr),
    currentCr: money(r.fcu_cr),
    movement: money(r.fcu_movement),
    closing: money(r.fcl_drcr),
  }));
};

// VB report footer: the totals add up ONLY the rows of the requested account
// level (strInputAccountLevel), so the groups above are not counted twice.
export const sumTotals = (rows: TBRow[], accountLevel: number): TBTotals => {
  const t: TBTotals = {
    opening: 0,
    currentDr: 0,
    currentCr: 0,
    movement: 0,
    closing: 0,
  };

  for (const r of rows) {
    if (r.level !== accountLevel) continue;
    t.opening += r.opening;
    t.currentDr += r.currentDr;
    t.currentCr += r.currentCr;
    t.movement += r.movement;
    t.closing += r.closing;
  }

  return {
    opening: round2(t.opening),
    currentDr: round2(t.currentDr),
    currentCr: round2(t.currentCr),
    movement: round2(t.movement),
    closing: round2(t.closing),
  };
};
