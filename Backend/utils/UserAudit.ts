import pool from "../DB/db.js";

/* =========================================================
   USER AUDIT
   Writes one row to dbo.tbluseraudit via dbo.sp_useraudit.
   Shared by every screen that needs an audit trail entry -
   the caller builds its own note text (screen-specific) and
   passes it in as `note`.

   PstrYear / lkpBranch / Type / txtDocNo are only meaningful
   for document-based screens (e.g. Receipt); pass null for
   screens with no year/branch/document concept (e.g. User
   Login) - dbo.sp_useraudit defaults them to NULL / ''.
========================================================= */

export const UserAudit = async (
  PstrCoID: string,
  PstrYear: string | null,
  lkpBranch: string | null,
  Type: string | null,
  txtDocNo: string | null,
  strscreenname: string,
  straction: string,
  PstrUserID: string,
  note: string
) => {
  try {
    await pool.query(
      `CALL dbo.sp_useraudit(
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9
      )`,
      [
        PstrCoID,
        PstrYear,
        lkpBranch,
        Type,
        txtDocNo,
        strscreenname,
        straction,
        note,
        PstrUserID,
      ]
    );

    return {
      success: true,
      note,
    };
  } catch (error) {
    console.error("UserAudit Error:", error);
    throw error;
  }
};