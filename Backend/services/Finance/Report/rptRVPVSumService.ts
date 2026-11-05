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

export type Document = { docType: string; docName: string };

// the documents of the Finance module (the old objFinCommon.strModuleID, 'FIN'): dbo.filldocument gives them in their
// position order; the Journal Voucher, the Purchase Journal and the Sales Journal (JV, PJ, SJ) are left out, as the old
// form did: the receipts, the payments, the notes
export const getDocuments = async (PstrCoID: string): Promise<Document[]> => {
  const { rows } = await pool.query(
    `
    SELECT fdoctype, fdocname
      FROM dbo.filldocument($1::varchar, 'FIN')
     WHERE fdoctype NOT IN ('JV', 'PJ', 'SJ')
    `,
    [PstrCoID]
  );

  return rows.map((r) => ({ docType: text(r.fdoctype).trim(), docName: text(r.fdocname).trim() }));
};

export type Account = { accountId: string; accountName: string };

// the head accounts (the accounts that carry transactions: dbo.isaccounthead, the old IsAccountHead), by account id
export const getAccounts = async (PstrCoID: string): Promise<Account[]> => {
  const { rows } = await pool.query(
    `
    SELECT faccountid, faccountname
      FROM dbo.tblaccount
     WHERE fcoid = $1
       AND dbo.isaccounthead(fcoid, faccountid)
     ORDER BY faccountid
    `,
    [PstrCoID]
  );

  return rows.map((r) => ({
    accountId: text(r.faccountid).trim(),
    accountName: text(r.faccountname).trim(),
  }));
};

/* =========================================================
   THE REPORT: dbo.sp_rptrvpvsum (one line per voucher)
   PROCEDURE with an INOUT refcursor
========================================================= */

// what the screen asks for, as the procedure takes it (the codes of the old form)
export type RVPVSumParams = {
  PstrCoID: string;
  rdgBranch: 0 | 1 | 2; // 0 One Branch, 1 Selected Branch, 2 All Branch
  lkpBranch: string; // One Branch
  chkBranch: string[]; // Selected Branch: the ticked branches
  lkpDocument: string; // the document type: BR, CR, BP, CP ...
  rdgAccount: 0 | 1; // 0 One Account, 1 All Account
  lkpAccountID: string; // One Account
  dtpFromDate: string; // yyyy-mm-dd
  dtpToDate: string; // yyyy-mm-dd
  lkpPostStatus: 0 | 1 | 2; // 0 All, 1 Posted, 2 Non Posted (the same as the other reports)
};

// one printed line: a voucher
export type RVPVSumLine = {
  txtDocNo: string; // Entry No.
  txtDate: string; // dd-MMM-yyyy
  txtAccountName: string; // the Cash / Bank account
  txtReceivedFromPaidTo: string;
  txtAmount: number;
};

export type RVPVSumResult = {
  lines: RVPVSumLine[];
  totals: { txtAmount: number };
};

const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

// the amounts are kept to 2 decimals so the additions do not drag float noise along
const round2 = (v: number) => Math.round(v * 100) / 100;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// dd-MMM-yyyy of a date the database sent (a Date or a yyyy-mm-dd text)
const ddmmmyyyy = (value: unknown): string => {
  const d = value instanceof Date ? value : new Date(`${text(value).slice(0, 10)}T00:00:00`);

  if (Number.isNaN(d.getTime())) return "";

  return `${String(d.getDate()).padStart(2, "0")}-${MONTHS[d.getMonth()]}-${d.getFullYear()}`;
};

// CALL and FETCH must run in ONE transaction
let cursorSeq = 0;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DbRow = Record<string, any>;

export const getRVPVSum = async (p: RVPVSumParams): Promise<RVPVSumResult> => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const cursor = `cur_rptrvpvsum_${process.pid}_${++cursorSeq}`.toLowerCase();

    await client.query(
      `
      CALL dbo.sp_rptrvpvsum(
        $1::varchar, $2::int, $3::varchar, $4::varchar[], $5::varchar,
        $6::boolean, $7::varchar, $8::date, $9::date, $10::int, $11::refcursor
      )
      `,
      [
        p.PstrCoID, // p_pstrcoid
        p.rdgBranch, // p_rdgbranch: 0 One Branch, 1 Selected Branch, 2 All Branch
        p.rdgBranch === 0 ? p.lkpBranch : null, // p_lkpbranch
        p.rdgBranch === 1 ? p.chkBranch : null, // p_chkbranch
        p.lkpDocument, // p_lkpdocument
        p.rdgAccount === 1, // p_rdgaccount: false One Account, true All Account
        p.rdgAccount === 0 ? p.lkpAccountID : null, // p_lkpaccountid
        p.dtpFromDate, // p_dtpfromdate
        p.dtpToDate, // p_dtptodate
        p.lkpPostStatus, // p_lkppoststatus
        cursor, // p_cursor
      ]
    );

    const { rows } = await client.query<DbRow>(`FETCH ALL FROM "${cursor}"`);

    await client.query("COMMIT");

    const lines: RVPVSumLine[] = rows.map((r) => ({
      txtDocNo: text(r.fdocno).trim(),
      txtDate: ddmmmyyyy(r.fdate),
      txtAccountName: text(r.fcbaccountname).trim(),
      txtReceivedFromPaidTo: text(r.freceivedfrompaidto).trim(),
      txtAmount: num(r.famt),
    }));

    return {
      lines,
      totals: { txtAmount: round2(lines.reduce((s, l) => s + l.txtAmount, 0)) },
    };
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
