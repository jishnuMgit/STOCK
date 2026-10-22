import pool from "../DB/db.js";
import {
  type ValidationResult,
  passed,
  failed,
  isNullOrEmpty,
  getUserStatus,
  idleUserMessage,
} from "./common.js";

/* =========================================================
   BEGINNING BALANCE - validations (the old form's ValidateMe + ValidateGrid)

   Same shape as the other screens' validators: the FIRST rule that fails is
   returned, with the field to put the cursor on (the same name as the element
   id on the page: lkpBranch, dtpDate, lkpAccountID-<row>, lkpCCID-<row>,
   txtDebit-<row>).

   The page sends only the rows that have an account, each with txtGridRow - its
   position in the grid (0 = first row) - so the field names point at the right
   box. The date is yyyy-mm-dd.

   That the total debit equals the total credit is NOT checked here: the old form
   only warned about it and saved anyway (the page shows the warning).
========================================================= */

export interface BeginningBalanceData {
  PstrCoID?: unknown;
  PstrYear?: unknown;
  // the logged-in user - from the session, not from the request body
  PstrUserID?: unknown;
  lkpBranch?: unknown;
  dtpDate?: unknown;
  rows?: unknown;
}

// tblfintrans.fdebit / fcredit are numeric(18,2); this keeps every amount exact
const MAX_AMOUNT = 9999999999999;

const text = (value: unknown): string => String(value ?? "").trim();

// "1,234.50" -> 1234.5 ; "" -> 0 ; not a number -> NaN
export const toAmount = (value: unknown): number => {
  const cleaned = text(value).replace(/,/g, "");

  return cleaned === "" ? 0 : Number(cleaned);
};

// a real calendar date written yyyy-mm-dd
const isRealDate = (value: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00Z`);

  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

// yyyy-mm-dd -> dd/mm/yyyy (what dbo.isactiveperiod reads, and what people read)
const showDate = (value: string): string =>
  value ? value.split("-").reverse().join("/") : "";

/* =========================================================
   The checks the branch actions share: the user is not idle, a branch is chosen,
   it exists, and the user has a right to it.
========================================================= */

async function validateBranch(
  PstrCoID: string,
  userId: string,
  lkpBranch: string
): Promise<ValidationResult> {
  if (lkpBranch === "") {
    return failed("Please select a 'Branch'", "lkpBranch");
  }

  const branchResult = await pool.query(
    `SELECT dbo.userbranches($1, $2, $3) AS "hasAccess"
       FROM dbo.tblbranch WHERE fcoid = $1 AND fbrid = $3`,
    [PstrCoID, userId, lkpBranch]
  );

  if (branchResult.rowCount === 0) {
    return failed(`Branch '${lkpBranch}' not found`, "lkpBranch");
  }

  if (!branchResult.rows[0]?.hasAccess) {
    return failed(
      `The user '${userId}' don't have the Right to access the Branch : ${lkpBranch}`,
      "lkpBranch",
      403
    );
  }

  return passed;
}

// the login year of the branch is not permanently closed (the old
// YearCloseStatusID = "P"): nothing can be saved, modified or deleted in it
async function validateYearOpen(
  PstrCoID: string,
  PstrYear: string,
  lkpBranch: string
): Promise<ValidationResult> {
  if (lkpBranch !== "" && /^\d+$/.test(PstrYear)) {
    const yearResult = await pool.query(
      `SELECT fyearclosestatusid FROM dbo.tblyear WHERE fcoid = $1 AND fyear = $2 AND fbrid = $3`,
      [PstrCoID, Number(PstrYear), lkpBranch]
    );

    if (yearResult.rows[0]?.fyearclosestatusid === "P") {
      return failed(
        "'Login Year' has permanently closed.\nSo, you can't Save/Modify any document with this 'Year'",
        "lkpBranch"
      );
    }
  }

  return passed;
}

/* =========================================================
   VIEW (loading a branch's balance): not idle, and a branch the user has a
   right to - nothing else, so a closed year can still be looked at.
========================================================= */

export async function validateBeginningBalanceView(data: {
  PstrCoID?: unknown;
  PstrUserID?: unknown;
  lkpBranch?: unknown;
}): Promise<ValidationResult> {
  const userId = text(data.PstrUserID);

  if (!(await getUserStatus(userId))) {
    return failed(idleUserMessage(userId), "lkpBranch", 403);
  }

  return validateBranch(text(data.PstrCoID), userId, text(data.lkpBranch));
}

/* =========================================================
   DELETE (the old ValidateMe, Case "D"): not idle, the login year is not
   permanently closed, and a branch the user has a right to. That a balance
   exists, and is not posted, is checked by the controller.
========================================================= */

export async function validateBeginningBalanceDelete(data: {
  PstrCoID?: unknown;
  PstrYear?: unknown;
  PstrUserID?: unknown;
  lkpBranch?: unknown;
}): Promise<ValidationResult> {
  const userId = text(data.PstrUserID);

  if (!(await getUserStatus(userId))) {
    return failed(idleUserMessage(userId), "lkpBranch", 403);
  }

  const PstrCoID = text(data.PstrCoID);
  const lkpBranch = text(data.lkpBranch);

  const yearCheck = await validateYearOpen(PstrCoID, text(data.PstrYear), lkpBranch);

  if (!yearCheck.valid) {
    return yearCheck;
  }

  return validateBranch(PstrCoID, userId, lkpBranch);
}

/* =========================================================
   THE DATE CHECKS (the old ValidateMe): a date is chosen, a real date, in the login
   year, inside the branch's Active Period and not after today.
========================================================= */

async function validateBeginningBalanceDate(
  PstrCoID: string,
  PstrYear: string,
  lkpBranch: string,
  dtpDate: string
): Promise<ValidationResult> {
  // 4. a date is chosen: a real date, in the login year, inside the branch's
  //    Active Period, and not after today
  if (isNullOrEmpty(dtpDate)) {
    return failed("Please select 'Date'", "dtpDate");
  }

  if (!isRealDate(dtpDate)) {
    return failed("'Date' is not a valid date", "dtpDate");
  }

  if (dtpDate.slice(0, 4) !== PstrYear) {
    return failed(`'Date' must be within the year ${PstrYear}`, "dtpDate");
  }

  const periodResult = await pool.query(
    `SELECT dbo.isactiveperiod($1, $2, $3) AS "inPeriod",
            to_char(factivefromdate, 'DD/MM/YYYY') AS "fromDate",
            to_char(factivetodate, 'DD/MM/YYYY') AS "toDate"
       FROM dbo.tblbranch WHERE fcoid = $1 AND fbrid = $2`,
    [PstrCoID, lkpBranch, showDate(dtpDate)]
  );

  if (!periodResult.rows[0]?.inPeriod) {
    const from = periodResult.rows[0]?.fromDate;
    const to = periodResult.rows[0]?.toDate;

    return failed(
      `'Date' must be within the Active Period '${from && to ? `${from} - ${to}` : "not set"}'`,
      "dtpDate"
    );
  }

  const futureResult = await pool.query(
    `SELECT $1::date > current_date AS "isFuture"`,
    [dtpDate]
  );

  if (futureResult.rows[0]?.isFuture) {
    return failed("'Date' must be less than or equal to 'Current Date'", "dtpDate");
  }

  return passed;
}

/* =========================================================
   THE CHECKS SAVE AND POST SHARE (the old ValidateMe, Cases "S", "M" and "T"):
   not idle, the login year not permanently closed, a branch the user has a right
   to, and a date that is a real date, in the login year, inside the branch's
   Active Period and not after today.
========================================================= */

export async function validateBeginningBalanceHeader(
  data: BeginningBalanceData
): Promise<ValidationResult> {
  // 1. the user must not be idle
  const userId = text(data.PstrUserID);

  if (!(await getUserStatus(userId))) {
    return failed(idleUserMessage(userId), "lkpBranch", 403);
  }

  const PstrCoID = text(data.PstrCoID);
  const PstrYear = text(data.PstrYear);
  const lkpBranch = text(data.lkpBranch);
  const dtpDate = text(data.dtpDate);

  // 2. the login year must not be permanently closed
  const yearCheck = await validateYearOpen(PstrCoID, PstrYear, lkpBranch);

  if (!yearCheck.valid) {
    return yearCheck;
  }

  // 3. a branch is chosen, and the user has a right to it
  const branchCheck = await validateBranch(PstrCoID, userId, lkpBranch);

  if (!branchCheck.valid) {
    return branchCheck;
  }

  // 4. the date
  return validateBeginningBalanceDate(PstrCoID, PstrYear, lkpBranch, dtpDate);
}

/* =========================================================
   SAVE / MODIFY (the old ValidateMe "S" / "M" + ValidateGrid)
========================================================= */

export async function validateBeginningBalance(
  data: BeginningBalanceData
): Promise<ValidationResult> {
  const rows = Array.isArray(data.rows)
    ? (data.rows as Record<string, unknown>[])
    : [];

  const gridIndexOf = (row: Record<string, unknown>, position: number) => {
    const given = Number(row.txtGridRow);
    return Number.isInteger(given) && given >= 0 ? given : position;
  };

  // 1-4. not idle, the year, the branch and the date
  const headerCheck = await validateBeginningBalanceHeader(data);

  if (!headerCheck.valid) {
    return headerCheck;
  }

  const PstrCoID = text(data.PstrCoID);

  // 5. something to save
  if (rows.length === 0) {
    return failed("There is no information for saving.", "lkpAccountID-0");
  }

  // 6. the lines: head accounts of the company, a cost center for the accounts
  //    that need one, either a debit or a credit, no account twice (with the same
  //    cost center)
  const accountIds = [...new Set(rows.map((row) => text(row.lkpAccountID)))];

  const accountResult = await pool.query(
    `
    SELECT faccountid, fhavecc, dbo.isaccounthead(fcoid, faccountid) AS "isHead"
    FROM dbo.tblaccount
    WHERE fcoid = $1
      AND faccountid = ANY($2::varchar[])
    `,
    [PstrCoID, accountIds]
  );

  const accounts = new Map(
    accountResult.rows.map((row) => [
      String(row.faccountid),
      { haveCC: row.fhavecc === true, isHead: row.isHead === true },
    ])
  );

  const costCenterResult = await pool.query(
    `SELECT fccid FROM dbo.tblcostcenter WHERE fcoid = $1`,
    [PstrCoID]
  );

  const costCenters = new Set(costCenterResult.rows.map((row) => String(row.fccid)));

  const seen = new Set<string>();

  for (let position = 0; position < rows.length; position += 1) {
    const row = rows[position];
    const grid = gridIndexOf(row, position);
    const accountId = text(row.lkpAccountID);

    if (accountId === "") {
      return failed("Please select the 'Account ID'", `lkpAccountID-${grid}`);
    }

    const account = accounts.get(accountId);

    if (!account || !account.isHead) {
      return failed(`Account '${accountId}' not found`, `lkpAccountID-${grid}`, 404);
    }

    const costCenter = account.haveCC ? text(row.lkpCCID) : "";

    if (account.haveCC) {
      if (costCenter === "") {
        return failed(
          `Account ID : ${accountId} - 'Cost Center' is required`,
          `lkpCCID-${grid}`
        );
      }

      if (!costCenters.has(costCenter)) {
        return failed(`Cost Center '${costCenter}' not found`, `lkpCCID-${grid}`, 404);
      }
    }

    const debit = toAmount(row.txtDebit);
    const credit = toAmount(row.txtCredit);

    if (!Number.isFinite(debit) || debit < 0 || debit > MAX_AMOUNT) {
      return failed(
        `Account ID : ${accountId} - 'Debit' must be an amount from 0 to ${MAX_AMOUNT}`,
        `txtDebit-${grid}`
      );
    }

    if (!Number.isFinite(credit) || credit < 0 || credit > MAX_AMOUNT) {
      return failed(
        `Account ID : ${accountId} - 'Credit' must be an amount from 0 to ${MAX_AMOUNT}`,
        `txtCredit-${grid}`
      );
    }

    if (debit !== 0 && credit !== 0) {
      return failed(
        `Account ID : ${accountId} - Please input either 'Debit' or 'Credit'`,
        `txtDebit-${grid}`
      );
    }

    if (debit === 0 && credit === 0) {
      return failed(
        `Account ID : ${accountId} - Please input 'Debit' or 'Credit'`,
        `txtDebit-${grid}`
      );
    }

    const key = `${accountId}|${costCenter}`;

    if (seen.has(key)) {
      return failed("Account already exists", `lkpAccountID-${grid}`);
    }

    seen.add(key);
  }

  return passed;
}

/* =========================================================
   POST (the old ValidateMe, Case "T"): the shared checks. That the branch has a
   balance, and that it is not posted yet, is checked by the controller.
========================================================= */

export const validateBeginningBalancePost = validateBeginningBalanceHeader;

/* =========================================================
   PRINT (the old ValidateMe, Case "P"): not idle, a branch the user has a right to,
   and a date that passes the date checks. Unlike Save, Modify and Post it does not
   look at the year's close status, and the balance need not be saved (the report
   is simply empty then - the controller says "not found").
========================================================= */

export async function validateBeginningBalancePrint(
  data: BeginningBalanceData
): Promise<ValidationResult> {
  const userId = text(data.PstrUserID);

  if (!(await getUserStatus(userId))) {
    return failed(idleUserMessage(userId), "lkpBranch", 403);
  }

  const PstrCoID = text(data.PstrCoID);
  const lkpBranch = text(data.lkpBranch);

  const branchCheck = await validateBranch(PstrCoID, userId, lkpBranch);

  if (!branchCheck.valid) {
    return branchCheck;
  }

  return validateBeginningBalanceDate(
    PstrCoID,
    text(data.PstrYear),
    lkpBranch,
    text(data.dtpDate)
  );
}
