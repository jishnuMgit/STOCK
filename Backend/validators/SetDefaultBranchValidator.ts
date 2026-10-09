import pool from "../DB/db.js";
import {
  type ValidationResult,
  passed,
  failed,
  getUserStatus,
  idleUserMessage,
} from "./common.js";

/* =========================================================
   SET DEFAULT BRANCH - validations

   Same shape as the other screens' validators: the FIRST rule
   that fails is returned, with the field to put the cursor on
   (the same name as the element id on the page: lkpDefaultBranch-<row>).

   The page sends every row it shows (txtUserID, lkpDefaultBranch and its
   position txtGridRow). A row with no branch means "no default branch".

   The rules are the old form's:
     - the user must not be idle
     - the user of a row must exist
     - only an Admin User (type AU) may set another user's default branch
     - the branch of a row must be one the row's user has a right to
       (the old IsUserBrRight)
========================================================= */

export interface SetDefaultBranchData {
  PstrCoID?: unknown;
  // the logged-in user - from the session, not from the request body
  PstrUserID?: unknown;
  PstrUserType?: unknown;
  rows?: unknown;
}

const text = (value: unknown): string => String(value ?? "").trim();

export async function validateSetDefaultBranch(
  data: SetDefaultBranchData
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
      `lkpDefaultBranch-${rows.length ? gridIndexOf(rows[0], 0) : 0}`,
      403
    );
  }

  // 2. something to save
  if (rows.length === 0) {
    return failed("There is no information for saving.", "lkpDefaultBranch-0");
  }

  const PstrCoID = text(data.PstrCoID);
  const seenUsers = new Set<string>();

  for (const [position, row] of rows.entries()) {
    const index = gridIndexOf(row, position);
    const txtUserID = text(row.txtUserID);
    const lkpDefaultBranch = text(row.lkpDefaultBranch);

    // 3. every row has a user, and a user is in the grid once
    if (txtUserID === "") {
      return failed("Please input 'User ID'", `lkpDefaultBranch-${index}`);
    }

    if (seenUsers.has(txtUserID.toLowerCase())) {
      return failed(
        `User '${txtUserID}' already has a default branch`,
        `lkpDefaultBranch-${index}`
      );
    }

    seenUsers.add(txtUserID.toLowerCase());

    // 4. anyone but an Admin User (AU) may only set their own default branch
    if (
      text(data.PstrUserType) !== "AU" &&
      txtUserID.toLowerCase() !== userId.toLowerCase()
    ) {
      return failed(
        "You can only set your own default branch.",
        `lkpDefaultBranch-${index}`,
        403
      );
    }

    // 5. the user exists
    const userResult = await pool.query(
      `SELECT 1 FROM dbo.filluserlogin($1) WHERE lower(fuserid) = lower($2)`,
      [PstrCoID, txtUserID]
    );

    if (userResult.rowCount === 0) {
      return failed(`User '${txtUserID}' not found`, `lkpDefaultBranch-${index}`);
    }

    // 6. the branch is one this user has a right to (nothing to check when the
    //    row has no branch - that is "no default branch")
    if (lkpDefaultBranch !== "") {
      const rightResult = await pool.query(
        `SELECT dbo.userbranches($1, $2, $3) AS "hasAccess"`,
        [PstrCoID, txtUserID, lkpDefaultBranch]
      );

      if (!rightResult.rows[0]?.hasAccess) {
        return failed(
          `The user '${txtUserID}' don't have the Right to access the Branch : ${lkpDefaultBranch}`,
          `lkpDefaultBranch-${index}`
        );
      }
    }
  }

  return passed;
}
