// services/Finance/Report/RptGLService.ts
// Data access for the General Ledger REPORT page
// (port of the rptGL form + rptGLRpt / SP_rptGL -> dbo.sp_rptgl).
import type { PoolClient } from "pg";
import pool from "../../../../DB/db.js";

export type Branch = { brId: string; brName: string };
export type CostCenter = { ccId: string; ccName: string };
export type Account = { accountId: string; accountName: string };

export type GLParams = {
  coId: string;
  allBranches: boolean;
  branchId: string;
  accountMode: 0 | 1 | 2; // 0 one account, 1 range, 2 all
  accountId: string;
  fromAccountId: string;
  toAccountId: string;
  ccId: string; // "" = all cost centers
  fromDate: string; // DD/MM/YYYY
  toDate: string; // DD/MM/YYYY
  withOpening: boolean; // With OP / Without OP
  postStatus: 0 | 1 | 2; // 0 non posted, 1 posted, 2 all
  print0Bal: boolean;
  transType: 0 | 1 | 2; // 0 generated, 1 manual, 2 all
};

// one printed line of the ledger
export type GLLine = {
  date: string; // "DD-Mon-YY" ("" for the opening balance line)
  brId: string;
  docType: string;
  docNo: string;
  description: string;
  ref: string;
  ccId: string;
  debit: number;
  credit: number;
  balance: string; // running balance, "1,234.00 Dr" / "1,234.00 Cr"
};

// one account = one group of the VB report (page break before each account)
export type GLAccount = {
  accountId: string;
  accountName: string;
  rows: GLLine[];
  totalDebit: number;
  totalCredit: number;
  balance: string; // closing balance, same format as the lines
};

export type GLData = { accounts: GLAccount[] };

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

// VB {0:#,#.00 Dr;#,#.00 Cr;0.00 Dr}
const amt = (n: number) =>
  n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
const balanceText = (n: number) =>
  n > 0 ? `${amt(n)} Dr` : n < 0 ? `${amt(-n)} Cr` : "0.00 Dr";

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

// lkpCCID  -> dbo.fillcostcenters(coid)  (fccid, fccname, fpositionno)
export const getCostCenters = async (coId: string): Promise<CostCenter[]> => {
  const { rows } = await q(
    pool,
    `SELECT * FROM dbo.fillcostcenters($1::varchar)`,
    [coId],
  );
  return rows
    .map((r) => ({ ccId: text(r.fccid), ccName: text(r.fccname) }))
    .filter((c) => c.ccId !== "");
};

const mapAccounts = (rows: DbRow[]): Account[] =>
  rows
    .map((r) => ({
      accountId: text(r.faccountid),
      accountName: text(r.faccountname),
    }))
    .filter((a) => a.accountId !== "");

// lkpAccountID / lkpFromAccountID / lkpToAccountID -> dbo.filllookupaccountid(coid)
// (ordered by account id)
export const getAccountsById = async (coId: string): Promise<Account[]> => {
  const { rows } = await q(
    pool,
    `SELECT * FROM dbo.filllookupaccountid($1::varchar)`,
    [coId],
  );
  return mapAccounts(rows);
};

// lkpAccountName -> dbo.filllookupaccountname(coid) (ordered by account name)
export const getAccountsByName = async (coId: string): Promise<Account[]> => {
  const { rows } = await q(
    pool,
    `SELECT * FROM dbo.filllookupaccountname($1::varchar)`,
    [coId],
  );
  return mapAccounts(rows);
};

// ------------------------------------------------------------
// THE REPORT - dbo.sp_rptgl (PROCEDURE with an INOUT refcursor)
//   rdgbranch: 0 = ONE, 1 = ALL
//   rdgaccount: 0 = ONE, 1 = RANGE, 2 = ALL
//   rdgopening: 0 = With OP, 1 = Without OP
//   cbopoststatus: 0 non posted, 1 posted, 2 all
//   rdgtranstype: 0 generated, 1 manual, 2 all
//   columns: fdoctype, fdocno, fedate, faccountid, fccid, fdescription, fref,
//            fbrid, fdebit, fcredit, faccountname ...
// The rows come already ordered by account, date, doc no, line no. They are
// grouped by account here, with the running balance (Dr / Cr) like the VB report.
// ------------------------------------------------------------
export const getGL = async (p: GLParams): Promise<GLData> => {
  const rows = await callCursor(
    "sp_rptgl",
    [
      p.coId,
      p.allBranches ? 1 : 0,
      p.allBranches ? null : p.branchId,
      p.accountMode,
      p.accountMode === 0 ? p.accountId : null,
      p.accountMode === 1 ? p.fromAccountId : null,
      p.accountMode === 1 ? p.toAccountId : null,
      p.ccId,
      p.fromDate,
      p.toDate,
      p.withOpening ? 0 : 1,
      p.postStatus,
      p.print0Bal,
      p.transType,
    ],
    [
      "varchar", // p_pstrcoid
      "smallint", // p_rdgbranch
      "varchar", // p_strbrid
      "smallint", // p_rdgaccount
      "varchar", // p_straccountid
      "varchar", // p_strfromaccountid
      "varchar", // p_strtoaccountid
      "varchar", // p_strccid
      "varchar", // p_strfromdate
      "varchar", // p_strtodate
      "smallint", // p_rdgopening
      "smallint", // p_cbopoststatus
      "boolean", // p_blnprint0bal
      "smallint", // p_rdgtranstype
    ],
  );

  // group by account (Map keeps the order of the procedure)
  const groups = new Map<string, GLAccount & { run: number }>();

  for (const r of rows) {
    const accountId = text(r.faccountid);
    let g = groups.get(accountId);
    if (!g) {
      g = {
        accountId,
        accountName: text(r.faccountname),
        rows: [],
        totalDebit: 0,
        totalCredit: 0,
        balance: "",
        run: 0,
      };
      groups.set(accountId, g);
    }

    const debit = money(r.fdebit);
    const credit = money(r.fcredit);
    g.run = round2(g.run + debit - credit);
    g.totalDebit = round2(g.totalDebit + debit);
    g.totalCredit = round2(g.totalCredit + credit);

    g.rows.push({
      date: text(r.fedate),
      brId: text(r.fbrid),
      docType: text(r.fdoctype),
      docNo: text(r.fdocno),
      description: text(r.fdescription),
      ref: text(r.fref),
      ccId: text(r.fccid),
      debit,
      credit,
      balance: balanceText(g.run),
    });
  }

  const accounts: GLAccount[] = [...groups.values()].map(
    ({ run, ...g }) => ({ ...g, balance: balanceText(run) }),
  );

  return { accounts };
};
