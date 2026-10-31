// services/Finance/Report/RptPayablesService.ts
// Data access for the Payables REPORT page
// (port of the rptPayables form + rptPayablesRpt / SP_rptPayables
//  -> dbo.sp_rptpayables).
import type { PoolClient } from "pg";
import pool from "../../../../DB/db.js";

export type Branch = { brId: string; brName: string };

export type PayablesParams = {
  coId: string;
  allBranches: boolean;
  branchId: string;
  forPeriod: boolean; // false = As On Date
  fromDate: string; // DD/MM/YYYY (As On Date: 01/01 of the as-on year)
  toDate: string; // DD/MM/YYYY (the As On Date / the end of the period)
  asOnDate: string; // DD/MM/YYYY
  postStatus: 0 | 1 | 2; // 0 non posted, 1 posted, 2 all
  print0Bal: boolean;
};

export type PayableRow = {
  accountId: string;
  accountName: string;
  debit: number;
  credit: number;
};

export type PayablesData = {
  rows: PayableRow[];
  totalDebit: number;
  totalCredit: number;
};

type Db = Pick<PoolClient, "query">;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DbRow = Record<string, any>;

const text = (v: unknown): string => String(v ?? "").trim();

// numeric columns come back from pg as strings
const money = (v: unknown): number => {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
};
const round2 = (n: number) => Number(n.toFixed(2));

// ------------------------------------------------------------
// Calls a Postgres PROCEDURE that returns a refcursor (INOUT):
// CALL + FETCH must run in ONE transaction (the procedure's temporary table
// lives until that transaction ends).
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

const q = (db: Db, sql: string, args: unknown[]) => db.query(sql, args);

// ------------------------------------------------------------
// LOOKUPS (VB FillCombos)
// ------------------------------------------------------------

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
      brId: text(r.fbrid ?? r.brid),
      brName: text(r.fbrname ?? r.brname),
    }))
    .filter((b) => b.brId !== "");
};

// ------------------------------------------------------------
// THE REPORT - dbo.sp_rptpayables (PROCEDURE with an INOUT refcursor)
//   rdgbranch: 0 = ONE, 1 = ALL
//   rdgperiod: 0 = As On Date, 1 = For A Period
//   cbopoststatus: 0 non posted, 1 posted, 2 all
//   strfromdate / strtodate / strasondate: DD/MM/YYYY
//   chkorderbyacname: false = by account id, true = by account name
//   columns: fcsaccountid, fcsaccountname, fdebit, fcredit (+ others)
// ------------------------------------------------------------
export const getPayables = async (
  p: PayablesParams,
): Promise<PayablesData> => {
  const rows = await callCursor(
    "sp_rptpayables",
    [
      p.coId,
      p.allBranches ? 1 : 0,
      p.allBranches ? null : p.branchId,
      p.forPeriod ? 1 : 0, // p_rdgperiod
      p.fromDate,
      p.toDate,
      p.asOnDate, // p_strasondate
      p.postStatus,
      p.print0Bal,
      false, // p_chkorderbyacname: by account id
    ],
    [
      "varchar", // p_pstrcoid
      "smallint", // p_rdgbranch
      "varchar", // p_strbrid
      "smallint", // p_rdgperiod
      "varchar", // p_strfromdate
      "varchar", // p_strtodate
      "varchar", // p_strasondate
      "smallint", // p_cbopoststatus
      "boolean", // p_blnprint0bal
      "boolean", // p_chkorderbyacname
    ],
  );

  const list: PayableRow[] = rows.map((r) => ({
    accountId: text(r.fcsaccountid),
    accountName: text(r.fcsaccountname),
    debit: money(r.fdebit),
    credit: money(r.fcredit),
  }));

  list.sort((a, b) =>
    a.accountId < b.accountId ? -1 : a.accountId > b.accountId ? 1 : 0,
  );

  return {
    rows: list,
    totalDebit: round2(list.reduce((t, r) => t + r.debit, 0)),
    totalCredit: round2(list.reduce((t, r) => t + r.credit, 0)),
  };
};