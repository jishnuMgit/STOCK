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
   SET ACTIVE PERIOD - validations

   Same shape as the other screens' validators: the FIRST rule
   that fails is returned, with the field to put the cursor on
   (the same name as the element id on the page: dtpFromDate-<row>,
   dtpToDate-<row>).

   The page sends every row (txtBranchID, dtpFromDate, dtpToDate and its
   position txtGridRow). The dates are yyyy-mm-dd.

   The rules are the old form's ValidateMe, per branch:
     - 'From Date' and 'To Date' are both needed
     - 'From Date' must be less than or equal to 'To Date'
   plus: the user must not be idle, and has a right to the branch.
========================================================= */

export interface SetActivePeriodData {
  PstrCoID?: unknown;
  // the logged-in user - from the session, not from the request body
  PstrUserID?: unknown;
  rows?: unknown;
}

const text = (value: unknown): string => String(value ?? "").trim();

// a real calendar date written yyyy-mm-dd
const isRealDate = (value: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00Z`);

  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

export async function validateSetActivePeriod(
  data: SetActivePeriodData
): Promise<ValidationResult> {
  const rows = Array.isArray(data.rows)
    ? (data.rows as Record<string, unknown>[])
    : [];

  const gridIndexOf = (row: Record<string, unknown>, position: number) => {
    const given = Number(row.txtGridRow);
    return Number.isInteger(given) && given >= 0 ? given : position;
  };

  // 1. the user must not be idle
  const userId = text(data.PstrUserID);

  if (!(await getUserStatus(userId))) {
    return failed(
      idleUserMessage(userId),
      `dtpFromDate-${rows.length ? gridIndexOf(rows[0], 0) : 0}`,
      403
    );
  }

  // 2. something to save
  if (rows.length === 0) {
    return failed("There is no information for saving.", "dtpFromDate-0");
  }

  const PstrCoID = text(data.PstrCoID);
  const seenBranches = new Set<string>();

  for (const [position, row] of rows.entries()) {
    const index = gridIndexOf(row, position);
    const txtBranchID = text(row.txtBranchID);
    const dtpFromDate = text(row.dtpFromDate);
    const dtpToDate = text(row.dtpToDate);

    // 3. every row has a branch, once
    if (txtBranchID === "" || seenBranches.has(txtBranchID.toLowerCase())) {
      return failed("Invalid branch", `dtpFromDate-${index}`);
    }

    seenBranches.add(txtBranchID.toLowerCase());

    // 4. the dates: both filled, real, and From not later than To
    if (isNullOrEmpty(dtpFromDate)) {
      return failed("Please input 'From Date'", `dtpFromDate-${index}`);
    }

    if (!isRealDate(dtpFromDate)) {
      return failed("'From Date' is not a valid date", `dtpFromDate-${index}`);
    }

    if (isNullOrEmpty(dtpToDate)) {
      return failed("Please input 'To Date'", `dtpToDate-${index}`);
    }

    if (!isRealDate(dtpToDate)) {
      return failed("'To Date' is not a valid date", `dtpToDate-${index}`);
    }

    // yyyy-mm-dd text compares in date order
    if (dtpFromDate > dtpToDate) {
      return failed(
        "'From Date' should be less than or equal to 'To Date'",
        `dtpFromDate-${index}`
      );
    }

    // 5. the user has a right to the branch (and it exists)
    const branchResult = await pool.query(
      `SELECT dbo.userbranches($1, $2, $3) AS "hasAccess"
         FROM dbo.tblbranch WHERE fcoid = $1 AND fbrid = $3`,
      [PstrCoID, userId, txtBranchID]
    );

    if (branchResult.rowCount === 0) {
      return failed(`Branch '${txtBranchID}' not found`, `dtpFromDate-${index}`);
    }

    if (!branchResult.rows[0]?.hasAccess) {
      return failed(
        `The user '${userId}' don't have the Right to access the Branch : ${txtBranchID}`,
        `dtpFromDate-${index}`,
        403
      );
    }
  }

  return passed;
}
