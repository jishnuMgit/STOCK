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

export type CostCenter = { ccId: string; ccName: string };

// the cost centers of the company (dbo.fillcostcenters), in their position order
export const getCostCenters = async (PstrCoID: string): Promise<CostCenter[]> => {
  const { rows } = await pool.query(
    `SELECT fccid, fccname FROM dbo.fillcostcenters($1::varchar)`,
    [PstrCoID]
  );

  return rows.map((r) => ({ ccId: text(r.fccid).trim(), ccName: text(r.fccname).trim() }));
};

// the user's default branch (Set Default Branch); "" when none is set
export const getDefaultBranch = async (PstrCoID: string, PstrUserID: string): Promise<string> => {
  const { rows } = await pool.query(`SELECT dbo.getuserdefbranch($1, $2) AS "defaultBranch"`, [
    PstrCoID,
    PstrUserID,
  ]);

  return text(rows[0]?.defaultBranch).trim();
};

/* =========================================================
   THE REPORT: dbo.sp_rptincomesum (Opening / Current / Closing of the income accounts)
   PROCEDURE with an INOUT refcursor
========================================================= */

// what the screen asks for, as the procedure takes it (the codes of the old form)
export type IncomeSumParams = {
  PstrCoID: string;
  rdgBranch: 0 | 1; // 0 One Branch, 1 All Branch
  lkpBranch: string; // One Branch
  rdgCostCenter: 0 | 1; // 0 One Cost Center, 1 All Cost Center
  lkpCostCenter: string; // One Cost Center
  dtpFromDate: string; // yyyy-mm-dd
  dtpToDate: string; // yyyy-mm-dd
  txtAccountLevel: number; // 1 to 4
  lkpPostStatus: 0 | 1 | 2; // 0 All, 1 Posted, 2 Non Posted (the same as the other reports)
  lkpPrint0Balance: 0 | 1; // Print 0 Balance
  lkpPrintACGroup: 0 | 1; // Print A/c Group
};

// one printed line: an account (or a group when Print A/c Group is on)
export type IncomeSumLine = {
  lkpAccountID: string;
  txtAccountName: string;
  txtAccountLevel: number;
  txtOpening: number;
  txtCurrent: number;
  txtClosing: number;
};

export type IncomeSumResult = {
  lines: IncomeSumLine[];
  // the Total row: the lines of the chosen Account Level only, so no account is counted twice
  totals: { txtOpening: number; txtCurrent: number; txtClosing: number };
};

const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

// the amounts are kept to 2 decimals so the additions do not drag float noise along
const round2 = (v: number) => Math.round(v * 100) / 100;

// CALL and FETCH must run in ONE transaction
let cursorSeq = 0;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DbRow = Record<string, any>;

// the arguments both report procedures take, in their order (the 12th, the cursor name, is added by callProcedure)
const commonArgs = (p: IncomeSumParams): unknown[] => [
  p.PstrCoID, // p_pstrcoid
  p.rdgBranch === 1, // p_rdgbranch: false One Branch, true All Branch
  p.rdgBranch === 0 ? p.lkpBranch : null, // p_strbrid
  p.rdgCostCenter === 1, // p_rdgcc: false One Cost Center, true All Cost Center
  p.rdgCostCenter === 0 ? p.lkpCostCenter : null, // p_strccid
  p.dtpFromDate, // p_dtpfromdate
  p.dtpToDate, // p_dtptodate
  p.txtAccountLevel, // p_intaccountlevel
  p.lkpPostStatus, // p_lkppoststatus
  p.lkpPrint0Balance === 1, // p_blnprint0bal
  p.lkpPrintACGroup === 1, // p_blnprintacgroup
];

// CALL a procedure (the sql has the real procedure name and $1..$11 for the arguments, $12 for the cursor) and read
// its cursor, in one transaction
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

// the name keeps its leading spaces (the indent of Print A/c Group)
const accountName = (v: unknown): string => text(v).replace(/\s+$/, "");

// Opening / Current / Closing: dbo.sp_rptincomesum
export const getIncomeSum = async (p: IncomeSumParams): Promise<IncomeSumResult> => {
  // Opening / Current / Closing: dbo.sp_rptincomesum
  const rows = await callProcedure(
    `
    CALL dbo.sp_rptincomesum(
      $1::varchar, $2::boolean, $3::varchar, $4::boolean, $5::varchar,
      $6::date, $7::date, $8::int, $9::int, $10::boolean, $11::boolean, $12::refcursor
    )
    `,
    commonArgs(p),
    "cur_rptincomesum"
  );

  const lines: IncomeSumLine[] = rows.map((r) => ({
    lkpAccountID: text(r.faccountid).trim(),
    txtAccountName: accountName(r.faccountname),
    txtAccountLevel: num(r.faccountlevel),
    txtOpening: num(r.fop_drcr),
    txtCurrent: num(r.fcu_drcr),
    txtClosing: num(r.fcl_drcr),
  }));

  const atLevel = lines.filter((l) => l.txtAccountLevel === p.txtAccountLevel);

  return {
    lines,
    totals: {
      txtOpening: round2(atLevel.reduce((s, l) => s + l.txtOpening, 0)),
      txtCurrent: round2(atLevel.reduce((s, l) => s + l.txtCurrent, 0)),
      txtClosing: round2(atLevel.reduce((s, l) => s + l.txtClosing, 0)),
    },
  };
};

/* =========================================================
   THE MONTHLY REPORT ("Up to Month"): dbo.sp_rptincomesum_m (January to December)
========================================================= */

// one printed line: an account (or a group). txtMonths is January to December (12 numbers).
export type IncomeSumMonthLine = {
  lkpAccountID: string;
  txtAccountName: string;
  txtAccountLevel: number;
  txtMonths: number[];
  // January to June, and the whole year
  txtJanToJun: number;
  txtJanToDec: number;
};

export type IncomeSumMonthResult = {
  lines: IncomeSumMonthLine[];
  // the Total row: the lines of the chosen Account Level only
  totals: { txtMonths: number[]; txtJanToJun: number; txtJanToDec: number };
};

const MONTH_COLUMNS = [
  "fjan_drcr", "ffeb_drcr", "fmar_drcr", "fapr_drcr", "fmay_drcr", "fjun_drcr",
  "fjul_drcr", "faug_drcr", "fsep_drcr", "foct_drcr", "fnov_drcr", "fdec_drcr",
];

export const getIncomeSumMonthly = async (p: IncomeSumParams): Promise<IncomeSumMonthResult> => {
  // January to December: dbo.sp_rptincomesum_m
  const rows = await callProcedure(
    `
    CALL dbo.sp_rptincomesum_m(
      $1::varchar, $2::boolean, $3::varchar, $4::boolean, $5::varchar,
      $6::date, $7::date, $8::int, $9::int, $10::boolean, $11::boolean, $12::refcursor
    )
    `,
    commonArgs(p),
    "cur_rptincomesum_m"
  );

  const lines: IncomeSumMonthLine[] = rows.map((r) => ({
    lkpAccountID: text(r.faccountid).trim(),
    txtAccountName: accountName(r.faccountname),
    txtAccountLevel: num(r.faccountlevel),
    txtMonths: MONTH_COLUMNS.map((column) => num(r[column])),
    txtJanToJun: num(r.fjantojun),
    txtJanToDec: num(r.fjantodec),
  }));

  const atLevel = lines.filter((l) => l.txtAccountLevel === p.txtAccountLevel);

  return {
    lines,
    totals: {
      txtMonths: MONTH_COLUMNS.map((_, i) => round2(atLevel.reduce((s, l) => s + l.txtMonths[i], 0))),
      txtJanToJun: round2(atLevel.reduce((s, l) => s + l.txtJanToJun, 0)),
      txtJanToDec: round2(atLevel.reduce((s, l) => s + l.txtJanToDec, 0)),
    },
  };
};
