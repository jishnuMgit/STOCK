// services/Finance/Report/RptSOAService.ts
// Data access for the Statement Of Account REPORT page
// (port of FinBL.rptSOA.FillCombos / GetAgeingPeriod / FillDivision /
// GetDataStAc + SP_rptSOA -> dbo.sp_rptsoa).
import pool from "../../../../DB/db.js";

export type Option = { value: string; label: string };

// What the page sends (dates are DD-MM-YYYY)
export type SoaRequest = {
  branchMode: "One Branch" | "All Branches";
  branchId: string | null;
  branchName: string | null;
  reportType: "Customer" | "Supplier";
  accountMode: "One Customer" | "Range Customer" | "All Customers";
  accountId: string | null;
  fromAccountId: string | null;
  toAccountId: string | null;
  divisionMode: "One Division" | "All Division";
  divisionId: string | null;
  fromDate: string;
  toDate: string;
  ageing: boolean;
  ageingMode: "Days" | "Months" | null;
  postStatus: "ALL" | "POSTED" | "UNPOSTED";
  print0Balance: boolean;
  soaType: "Outstanding" | "All";
};

export type ReportRow = {
  date: string;
  brId: string;
  docType: string;
  docNo: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
};

export type ReportAccount = {
  accountId: string;
  accountName: string;
  paymentDays: string;
  creditLimit: number;
  division: string;
  company: { name: string; address: string[]; license: string; category: string };
  bank: {
    beneficiary: string;
    bankName: string;
    branch: string;
    accountNo: string;
    iban: string;
    swift: string;
  };
  ageing: { total: number; buckets: number[] } | null;
  rows: ReportRow[];
  totalDebit: number;
  totalCredit: number;
  closing: number;
};

export type SoaReportData = {
  heading1: string;
  heading2: string;
  branchLabel: string;
  currency: string;
  statementNote: string;
  ageingHeadings: string[];
  accounts: ReportAccount[];
};

// thrown for a bad request -> the controller answers 400
export class SoaValidationError extends Error {}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DATE_RE = /^\d{2}-\d{2}-\d{4}$/;
const ACCOUNT_ID_MAX = 12; // VB: @strAccountID varchar(12)
const DIV_ID_MAX = 4; // VB: @strDivID varchar(4)

const num = (v: unknown): number => (v == null ? 0 : Number(v));
const str = (v: unknown): string => (v == null ? "" : String(v));

const parseDMY = (s: string) => {
  const [d, m, y] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const longDate = (s: string) => {
  const d = parseDMY(s);
  return `${String(d.getDate()).padStart(2, "0")}-${MONTHS[d.getMonth()]}-${d.getFullYear()}`;
};

// ------------------------------------------------------------
// LOOKUPS (VB FillCombos / FillDivision)
// ------------------------------------------------------------
export const getBranches = async (coId: string, userId: string): Promise<Option[]> => {
  const { rows } = await pool.query(`SELECT * FROM dbo.fillbranchofuser($1, $2)`, [coId, userId]);
  return rows.map((r) => ({ value: r.fbrid, label: r.fbrname ?? r.fbrid }));
};

export const getAccounts = async (coId: string) => {
  const [ids, names] = await Promise.all([
    pool.query(`SELECT * FROM dbo.filllookupcustomerid($1)`, [coId]),
    pool.query(`SELECT * FROM dbo.filllookupcustomername($1)`, [coId]),
  ]);
  return {
    ids: ids.rows.map((r) => ({ value: r.fcsaccountid, label: r.fcsaccountid })) as Option[],
    names: names.rows.map((r) => ({ value: r.fcsaccountid, label: r.fcsaccountname })) as Option[],
  };
};

export const getDivisions = async (coId: string, accountId: string) => {
  const { rows } = await pool.query(`SELECT * FROM dbo.fillcustomerdivisions($1, $2)`, [
    coId,
    accountId,
  ]);
  return {
    ids: rows.map((r) => ({ value: r.fdivid, label: r.fdivid })) as Option[],
    names: rows.map((r) => ({ value: r.fdivid, label: r.fdivname })) as Option[],
  };
};

// ------------------------------------------------------------
// VALIDATION (VB ValidateMe)
// ------------------------------------------------------------
const validate = (p: SoaRequest) => {
  const fail = (m: string): never => {
    throw new SoaValidationError(m);
  };

  if (p.branchMode === "One Branch" && !p.branchId) fail("Please select a 'Branch'");

  if (p.accountMode === "One Customer") {
    if (!p.accountId) fail("Please select an 'Account'");
    if (p.accountId!.length > ACCOUNT_ID_MAX) fail("Invalid 'Account'");
    if (p.divisionMode === "One Division" && !p.divisionId) fail("Please select 'Division'");
    if (p.divisionId && p.divisionId.length > DIV_ID_MAX) fail("Invalid 'Division'");
  } else if (p.accountMode === "Range Customer") {
    if (!p.fromAccountId) fail("Please select 'From Account ID'");
    if (!p.toAccountId) fail("Please select 'To Account ID'");
  }

  if (!p.fromDate || !DATE_RE.test(p.fromDate)) fail("Please select 'From Date'");
  if (!p.toDate || !DATE_RE.test(p.toDate)) fail("Please select 'To Date'");
  if (parseDMY(p.fromDate) > parseDMY(p.toDate))
    fail("'To Date' should be greater than 'From Date'");

  if (p.ageing && p.ageingMode !== "Days" && p.ageingMode !== "Months")
    fail("Please select an 'Ageing Mode'");
  if (!["ALL", "POSTED", "UNPOSTED"].includes(p.postStatus)) fail("Please select an 'Option'");
};

// ------------------------------------------------------------
// AGEING HEADINGS (VB GetAgeingPeriod + CreateRptHeading)
// ------------------------------------------------------------
const getAgeingHeadings = async (coId: string, mode: string): Promise<string[]> => {
  const { rows } = await pool.query(
    `SELECT frptcolumnid, ffrom, fto
       FROM dbo.tblageingperiod
      WHERE fcoid = $1 AND fmoduleid = 'FIN' AND fageingmode = $2
      ORDER BY frptcolumnid`,
    [coId, mode],
  );
  const unit = mode === "Months" ? "Months" : "Days";
  const list = rows.slice(0, 5);
  const headings = list.map((r) => `${r.ffrom} - ${r.fto} ${unit}`);
  const last = list[list.length - 1];
  headings.push(last ? `Over ${last.fto} ${unit}` : "Older");
  while (headings.length < 6) headings.push("");
  return headings;
};

// ------------------------------------------------------------
// dbo.sp_rptsoa (refcursor: needs a transaction, then FETCH ALL)
// ------------------------------------------------------------
const CURSOR = "cur_rptsoa";

const callProc = async (coId: string, userId: string, p: SoaRequest) => {
  const oneBranch = p.branchMode === "One Branch";
  const acct = { "One Customer": 0, "Range Customer": 1, "All Customers": 2 }[p.accountMode];
  const oneDivision = p.accountMode === "One Customer" && p.divisionMode === "One Division";
  const post = { UNPOSTED: 0, POSTED: 1, ALL: 2 }[p.postStatus];

  const args = [
    coId, //                                              p_pstrcoid
    p.reportType === "Supplier" ? 1 : 0, //               p_rdgcs         0 customer / 1 supplier
    oneBranch ? 0 : 1, //                                 p_rdgbranch     0 one / 1 all
    oneBranch ? p.branchId : null, //                     p_strbrid
    acct, //                                              p_rdgcsaccount  0 one / 1 range / 2 all
    acct === 0 ? p.accountId : null, //                   p_strcsaccountid
    acct === 1 ? p.fromAccountId : null, //               p_strfromcsaccountid
    acct === 1 ? p.toAccountId : null, //                 p_strtocsaccountid
    oneDivision ? 0 : 1, //                               p_rdgdivision   0 one / 1 all
    oneDivision ? p.divisionId : null, //                 p_strdivid
    p.fromDate.replace(/-/g, "/"), //                     p_strfromdate   DD/MM/YYYY
    p.toDate.replace(/-/g, "/"), //                       p_strtodate     DD/MM/YYYY
    !!p.ageing, //                                        p_cboageing
    p.ageing ? p.ageingMode : null, //                    p_strageingmode 'Days' | 'Months'
    post, //                                              p_cbopoststatus 0 unposted / 1 posted / 2 all
    p.soaType === "Outstanding" ? 0 : 1, //               p_rdgsoatype    0 outstanding / 1 SOA
    !!p.print0Balance, //                                 p_blnprint0bal
    userId, //                                            p_pstruserid
    CURSOR, //                                            p_result_cursor
  ];

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `CALL dbo.sp_rptsoa(
         $1::varchar,  $2::smallint, $3::smallint, $4::varchar,  $5::smallint,
         $6::varchar,  $7::varchar,  $8::varchar,  $9::smallint, $10::varchar,
         $11::varchar, $12::varchar, $13::boolean, $14::varchar, $15::smallint,
         $16::smallint,$17::boolean, $18::varchar, $19::refcursor)`,
      args,
    );
    const { rows } = await client.query(`FETCH ALL FROM "${CURSOR}"`);
    await client.query("COMMIT");
    return rows;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
};

// ------------------------------------------------------------
// The report: the proc rows grouped by account, with running balance
// ------------------------------------------------------------
export const getReportData = async (
  coId: string,
  userId: string,
  p: SoaRequest,
): Promise<SoaReportData> => {
  validate(p);

  const rows = await callProc(coId, userId, p);
  const ageingHeadings = p.ageing && p.ageingMode ? await getAgeingHeadings(coId, p.ageingMode) : [];

  const byAccount = new Map<string, ReportAccount>();

  for (const r of rows) {
    let acc = byAccount.get(r.fcsaccountid);
    if (!acc) {
      acc = {
        accountId: r.fcsaccountid,
        accountName: str(r.faccountname),
        paymentDays: str(r.fcreditdays),
        creditLimit: num(r.fcreditlimit),
        division: r.fdivid ? str(r.fdivname || r.fdivid) : "",
        company: {
          name: str(r.fconame),
          address: [r.fcombinedaddress1, r.fcombinedaddress2, r.fcombinedaddress3, r.fcombinedaddress4]
            .map(str)
            .filter((s) => s !== ""),
          license: str(r.fcombinedlicenseno),
          category: str(r.fcombinedcategory),
        },
        bank: {
          beneficiary: str(r.fbeneficiaryname),
          bankName: str(r.fbankname),
          branch: str(r.fbankbranch),
          accountNo: str(r.fbankaccountno),
          iban: str(r.fibanno),
          swift: str(r.fswiftcode),
        },
        ageing: p.ageing
          ? {
              total: num(r.fbal),
              buckets: [r.fbaldr1, r.fbaldr2, r.fbaldr3, r.fbaldr4, r.fbaldr5, r.fbaldr6].map(num),
            }
          : null,
        rows: [],
        totalDebit: 0,
        totalCredit: 0,
        closing: 0,
      };
      byAccount.set(r.fcsaccountid, acc);
    }

    // numeric columns come back from pg as strings
    const debit = num(r.fdebit);
    const credit = num(r.fcredit);
    acc.closing += num(r.fdrcr);
    acc.totalDebit += debit;
    acc.totalCredit += credit;
    acc.rows.push({
      date: r.fdoctype === "OP" ? "" : str(r.fedate),
      brId: str(r.fbrid),
      docType: str(r.fdoctype),
      docNo: str(r.fdocno),
      description: str(r.fdescription),
      debit,
      credit,
      balance: acc.closing,
    });
  }

  return {
    heading1:
      p.soaType === "Outstanding" ? "OUTSTANDING STATEMENT OF ACCOUNT" : "STATEMENT OF ACCOUNT",
    heading2: `Period : ${longDate(p.fromDate)}  To  ${longDate(p.toDate)}`,
    branchLabel: p.branchMode === "One Branch" ? `Branch : ${p.branchName ?? p.branchId ?? ""}` : "",
    currency: "SAR",
    statementNote:
      "This statement shall be considered correct unless we are notified in writing non-agreement in the statement within 10 days from date of receipt.",
    ageingHeadings,
    accounts: [...byAccount.values()],
  };
};
