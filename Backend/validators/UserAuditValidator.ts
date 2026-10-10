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
   USER AUDIT REPORT - validations

   Same shape as the other screens' validators: the FIRST rule
   that fails is returned, with the field to put the cursor on
   (the same name as the element id on the page: lkpUserID, lkpAction,
   dtpFromDate, dtpToDate).

   lkpUserID and lkpAction are both required: a user (or "*" = every user) and
   an action (or "*" = every action). The dates are yyyy-mm-dd.
========================================================= */

export interface UserAuditData {
  PstrCoID?: unknown;
  // the logged-in user - from the session, not from the request
  PstrUserID?: unknown;
  PstrUserType?: unknown;
  lkpUserID?: unknown;
  lkpAction?: unknown;
  dtpFromDate?: unknown;
  dtpToDate?: unknown;
}

// the audit letters dbo.sp_useraudit is given by the screens: S save, M modify,
// D delete
export const AUDIT_ACTIONS = ["S", "M", "D"];

// the "All" choice of the User ID and Action boxes
export const ALL_CHOICE = "*";

const text = (value: unknown): string => String(value ?? "").trim();

// a real calendar date written yyyy-mm-dd
const isRealDate = (value: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00Z`);

  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

export async function validateUserAudit(
  data: UserAuditData
): Promise<ValidationResult> {
  // 1. the user must not be idle
  const userId = text(data.PstrUserID);

  if (!(await getUserStatus(userId))) {
    return failed(idleUserMessage(userId), "lkpUserID", 403);
  }

  const lkpUserID = text(data.lkpUserID);
  const lkpAction = text(data.lkpAction);
  const dtpFromDate = text(data.dtpFromDate);
  const dtpToDate = text(data.dtpToDate);

  // 2. both boxes are chosen (All counts as a choice)
  if (lkpUserID === "") {
    return failed("Please select 'User ID'", "lkpUserID");
  }

  if (lkpAction === "") {
    return failed("Please select 'Action'", "lkpAction");
  }

  // 3. anyone but an Admin User (AU) sees only their own audit - asking for
  //    "All" is fine, the report then holds only their own rows
  if (
    lkpUserID !== ALL_CHOICE &&
    text(data.PstrUserType) !== "AU" &&
    lkpUserID.toLowerCase() !== userId.toLowerCase()
  ) {
    return failed("You can only see your own audit.", "lkpUserID", 403);
  }

  // 4. the user, when one is asked for, exists
  if (lkpUserID !== ALL_CHOICE) {
    const userResult = await pool.query(
      `SELECT 1 FROM dbo.filluserlogin($1) WHERE lower(fuserid) = lower($2)`,
      [text(data.PstrCoID), lkpUserID]
    );

    if (userResult.rowCount === 0) {
      return failed(`User '${lkpUserID}' not found`, "lkpUserID");
    }
  }

  // 5. the action, when one is asked for, is a known one
  if (lkpAction !== ALL_CHOICE && !AUDIT_ACTIONS.includes(lkpAction)) {
    return failed("Invalid action", "lkpAction");
  }

  // 6. the period: both dates, real, and From not later than To
  if (isNullOrEmpty(dtpFromDate)) {
    return failed("Please input 'From Date'", "dtpFromDate");
  }

  if (!isRealDate(dtpFromDate)) {
    return failed("'From Date' is not a valid date", "dtpFromDate");
  }

  if (isNullOrEmpty(dtpToDate)) {
    return failed("Please input 'To Date'", "dtpToDate");
  }

  if (!isRealDate(dtpToDate)) {
    return failed("'To Date' is not a valid date", "dtpToDate");
  }

  // yyyy-mm-dd text compares in date order
  if (dtpFromDate > dtpToDate) {
    return failed(
      "'From Date' should be less than or equal to 'To Date'",
      "dtpFromDate"
    );
  }

  return passed;
}
