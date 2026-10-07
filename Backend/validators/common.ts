import pool from "../DB/db.js";

/* =========================================================
   COMMON VALIDATION HELPERS

   Shared by every screen's validator (one file per screen
   lives next to this one). They are ports of the old VB
   common functions IsNullorEmpty and GetUserStatus.
========================================================= */

// what a validator returns: either "all good", or the FIRST rule that
// failed - the message to show, the field to put the cursor on (its
// name is the same as the element id on the page) and the HTTP status
export type ValidationResult =
  | { valid: true }
  | { valid: false; status: number; message: string; field: string };

export const passed: ValidationResult = { valid: true };

export const failed = (
  message: string,
  field: string,
  status = 400
): ValidationResult => ({ valid: false, status, message, field });

/* ---------------------------------------------------------
   IsNullorEmpty - nothing, or only spaces
--------------------------------------------------------- */

export const isNullOrEmpty = (value: unknown): boolean =>
  String(value ?? "").trim() === "";

/* ---------------------------------------------------------
   GetUserStatus - is this user active?

   The user ADMIN is always active. Anyone else needs
   tbluserlogin.fuserstatus = 'A' (A = active, I = idle); a missing
   row or an empty value counts as idle (same as the old code, and
   as the database's own dbo.getuserstatus).
   (The old code glued the user id into the SQL text - this uses
   a parameter instead.)
--------------------------------------------------------- */

// the rule itself, for code that has already read the user's row
// (login, the authenticate middleware)
export const isUserActive = (userId: string, status: unknown): boolean =>
  userId === "ADMIN" || status === "A";

export const getUserStatus = async (userId: string): Promise<boolean> => {
  if (userId === "ADMIN") {
    return true;
  }

  const result = await pool.query(
    `SELECT fuserstatus FROM dbo.tbluserlogin WHERE fuserid = $1`,
    [userId]
  );

  return isUserActive(userId, result.rows[0]?.fuserstatus);
};

// the one message for an idle user - login, the middleware and every
// form's validator use this same text
export const idleUserMessage = (userId: string): string =>
  `This User (${userId}) is Idle.Please  Contact The Administrator`;
