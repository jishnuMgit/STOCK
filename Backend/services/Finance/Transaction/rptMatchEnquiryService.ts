import pool from "../../../DB/db.js";

const text = (value: unknown): string => String(value ?? "");

const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

// the amounts are kept to 2 decimals so the additions do not drag float noise along
const round2 = (v: number) => Math.round(v * 100) / 100;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// dd-MMM-yyyy of a date the database sent (a Date or a yyyy-mm-dd text); "" when there is none
const ddmmmyyyy = (value: unknown): string => {
  if (value === null || value === undefined || value === "") return "";

  const d = value instanceof Date ? value : new Date(`${text(value).slice(0, 10)}T00:00:00`);

  if (Number.isNaN(d.getTime())) return "";

  return `${String(d.getDate()).padStart(2, "0")}-${MONTHS[d.getMonth()]}-${d.getFullYear()}`;
};

// the name of a branch the logged-in user has a right to; null when the user has no right to it (or it is not there)
export const getAllowedBranchName = async (
  PstrCoID: string,
  PstrUserID: string,
  lkpBranch: string
): Promise<string | null> => {
  const { rows } = await pool.query(
    `
    SELECT fbrname
      FROM dbo.tblbranch
     WHERE fcoid = $1
       AND fbrid = $3
       AND dbo.userbranches($1, $2, fbrid)
    `,
    [PstrCoID, PstrUserID, lkpBranch]
  );

  return rows.length === 0 ? null : text(rows[0].fbrname).trim();
};

/* =========================================================
   THE REPORT: dbo.sp_rptmatchenquiry (a document and the documents matched to it)
   PROCEDURE with an INOUT refcursor
========================================================= */

// what the screen asks for, as the procedure takes it
export type RptMatchEnquiryParams = {
  PstrCoID: string;
  PstrYear: string; // the financial year of the document
  lkpBranch: string; // the branch of the document
  lkpDocType: string; // the document type: BR, CR ...
  lkpDocNo: string; // the document number
};

// one printed line: the document itself (P) or a document matched to it (C)
export type RptMatchEnquiryLine = {
  txtBrID: string;
  txtDate: string; // dd-MMM-yyyy
  txtDocType: string;
  txtDocNo: string;
  txtDescription: string;
  txtDebit: number;
  txtCredit: number;
  txtMatchApplyDate: string; // dd-MMM-yyyy
};

// the lines of one customer / supplier account, with their total (the old group header and group footer)
export type RptMatchEnquiryGroup = {
  lkpAccountID: string;
  txtAccountName: string;
  lines: RptMatchEnquiryLine[];
  totals: { txtDebit: number; txtCredit: number };
};

// CALL and FETCH must run in ONE transaction
let cursorSeq = 0;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DbRow = Record<string, any>;

export const getRptMatchEnquiry = async (p: RptMatchEnquiryParams): Promise<RptMatchEnquiryGroup[]> => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const cursor = `cur_rptmatchenquiry_${process.pid}_${++cursorSeq}`.toLowerCase();

    await client.query(
      `
      CALL dbo.sp_rptmatchenquiry(
        $1::varchar, $2::varchar, $3::varchar, $4::varchar, $5::varchar, $6::refcursor
      )
      `,
      [
        p.PstrCoID, // p_pstrcoid
        p.PstrYear, // p_pstryear
        p.lkpBranch, // p_lkpbranch
        p.lkpDocType, // p_lkpdoctype
        p.lkpDocNo, // p_lkpdocno
        cursor, // p_cursor
      ]
    );

    const { rows } = await client.query<DbRow>(`FETCH ALL FROM "${cursor}"`);

    await client.query("COMMIT");

    // the rows come by account (P before C): one group for each account, in that order
    const groups: RptMatchEnquiryGroup[] = [];

    for (const r of rows) {
      const lkpAccountID = text(r.fcsaccountid).trim();

      let group = groups.find((g) => g.lkpAccountID === lkpAccountID);

      if (!group) {
        group = {
          lkpAccountID,
          txtAccountName: text(r.fcsaccountname).trim(),
          lines: [],
          totals: { txtDebit: 0, txtCredit: 0 },
        };
        groups.push(group);
      }

      group.lines.push({
        txtBrID: text(r.fbrid).trim(),
        txtDate: ddmmmyyyy(r.fdate),
        txtDocType: text(r.fdoctype).trim(),
        txtDocNo: text(r.fdocno).trim(),
        txtDescription: text(r.fdescription).trim(),
        txtDebit: num(r.fdebit),
        txtCredit: num(r.fcredit),
        txtMatchApplyDate: ddmmmyyyy(r.fmatchapplydate),
      });
    }

    for (const g of groups) {
      g.totals = {
        txtDebit: round2(g.lines.reduce((s, l) => s + l.txtDebit, 0)),
        txtCredit: round2(g.lines.reduce((s, l) => s + l.txtCredit, 0)),
      };
    }

    return groups;
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
