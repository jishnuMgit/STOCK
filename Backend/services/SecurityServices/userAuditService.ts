import type { PoolClient } from "pg";
import pool from "../../DB/db.js";

/* =========================================================
   USER AUDIT REPORT - calls dbo.sp_pageuseraudit
   (the old report rptUserAuditRpt, on dbo.tbluseraudit)
========================================================= */

// one audit row as the procedure gives it. The audit date is text
// (16 Jun 2026 09:42:34) - the procedure formats it, so no time zone moves it.
export type UserAuditRow = {
  fyear: string | null;
  fbrid: string | null;
  fbrname: string | null;
  fdoctype: string | null;
  fdocno: string | null;
  fscreenname: string | null;
  faction: string | null;
  fnote: string | null;
  fuserid: string;
  fuserdate: string;
};

/* =========================================================
   USER LIST (the User ID dropdown - every user, ADMIN included,
   because the report shows ADMIN's rows too)
========================================================= */

export async function getUserAuditUserListService(
  PstrCoID: string
): Promise<{ fuserid: string }[]> {
  const result = await pool.query(
    `SELECT fuserid FROM dbo.filluserlogin($1)`,
    [PstrCoID]
  );

  return result.rows;
}

/* =========================================================
   COMPANY NAME (the report heading)
========================================================= */

export async function getUserAuditCompanyNameService(
  PstrCoID: string
): Promise<string> {
  const result = await pool.query(
    `SELECT fconame FROM dbo.tblcompany WHERE fcoid = $1`,
    [PstrCoID]
  );

  return String(result.rows[0]?.fconame ?? "").trim();
}

/* =========================================================
   GET THE REPORT ROWS
   lkpUserID "*"  = every user         lkpAction "*" = every action
   The dates are yyyy-mm-dd; the to date counts the whole day.
   PstrUserID is the logged-in user: the procedure shows an Admin User every
   user's rows and anyone else only their own.
========================================================= */

export async function getUserAuditListService(p: {
  PstrCoID: string;
  lkpUserID: string;
  lkpAction: string;
  dtpFromDate: string;
  dtpToDate: string;
  PstrUserID: string;
}): Promise<UserAuditRow[]> {
  const client: PoolClient = await pool.connect();

  try {
    await client.query("BEGIN");

    const cursorName =
      `cur_pageuseraudit_${Date.now()}_${Math.floor(Math.random() * 100000)}`;

    await client.query(
      `
      CALL dbo.sp_pageuseraudit(
        p_pstrcoid      => $1::varchar,
        p_rdguser       => $2::smallint,
        p_struserid     => $3::varchar,
        p_rdgaction     => $4::smallint,
        p_stractionid   => $5::varchar,
        p_dtpfromdate   => $6::date,
        p_dtptodate     => $7::date,
        p_pstruserid    => $8::varchar,
        p_result_cursor => $9::refcursor
      )
      `,
      [
        p.PstrCoID,
        p.lkpUserID === "*" ? 1 : 0, // 0 = only this user, 1 = every user
        p.lkpUserID === "*" ? null : p.lkpUserID,
        p.lkpAction === "*" ? 1 : 0, // 0 = only this action, 1 = every action
        p.lkpAction === "*" ? null : p.lkpAction,
        p.dtpFromDate,
        p.dtpToDate,
        p.PstrUserID,
        cursorName,
      ]
    );

    const result = await client.query(`FETCH ALL FROM "${cursorName}"`);

    await client.query("COMMIT");

    return result.rows;
  } catch (error: unknown) {
    await client.query("ROLLBACK");
    console.error("getUserAuditListService error:", error);
    throw error;
  } finally {
    client.release();
  }
}
