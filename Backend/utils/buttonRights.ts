import pool from "../DB/db.js";

/* =========================================================
   BUTTON RIGHTS (server side)

   The same rule the page uses (hooks/useButtonPermissions) so the
   two can never disagree:
     AU (admin user) -> the buttons the MENU supports (tblmenu.fmenubuttons)
     RU (restricted) -> the buttons GRANTED to the user
                        (tbluserpermission.fuserbuttons)

   Button letters: S Save, M Modify, D Delete, P Print, T Post,
   N Print DN, E E-Print.

   Used by the routes that already sit behind `authenticate`, with the
   user taken from the session (not from the request body).
========================================================= */

export type ButtonCode = "S" | "M" | "D" | "P" | "T" | "N" | "E";

export interface RightsUser {
  userId: string;
  userType: string;
  companyId: string;
}

export async function hasButtonRight(
  user: RightsUser,
  menuId: string,
  code: ButtonCode
): Promise<boolean> {
  if (user.userType === "AU") {
    const result = await pool.query(
      `SELECT fmenubuttons FROM dbo.tblmenu WHERE fmenuid = $1`,
      [menuId]
    );

    return String(result.rows[0]?.fmenubuttons ?? "").includes(code);
  }

  const result = await pool.query(
    `
    SELECT fuserbuttons
    FROM dbo.tbluserpermission
    WHERE fuserid = $1
      AND fcoid = $2
      AND fmenuid = $3
    `,
    [user.userId, user.companyId, menuId]
  );

  return String(result.rows[0]?.fuserbuttons ?? "").includes(code);
}
