import type { PoolClient } from "pg";
import pool from "../../DB/db.js";
import { encryptPwd } from "../../utils/passwordCrypto.js";

/* =========================================================
   ROW SHAPES
   Keys follow the naming convention (state name = form id =
   payload key). The password is never sent back to the browser.
========================================================= */

export interface UserLoginRow {
  txtUserID: string;
  txtUserName: string;
  lkpUserType: string;
  lkpUserStatus: string;
}

export interface UserLoginRowPayload extends UserLoginRow {
  txtOriginal_UserID: string; // "" for a new user
  txtPwd: string;
  txtConfirmPwd: string;
}

/* =========================================================
   SHARED HELPER - call dbo.sp_userlogin
========================================================= */

async function callSpUserLogin(
  client: PoolClient,
  overrides: Partial<{
    strmode: string;
    coid: string;
    userid: string | null;
    username: string | null;
    userpwd: string | null;
    usertype: string | null;
    userstatus: string | null;
    datevalidity: number | null;
    original_userid: string | null;
    cursorName: string;
  }>
): Promise<void> {
  const p = {
    strmode: null,
    coid: null,
    userid: null,
    username: null,
    userpwd: null,
    usertype: null,
    userstatus: null,
    datevalidity: null,
    original_userid: null,
    cursorName: `cur_userlogin_${Date.now()}_${Math.floor(Math.random() * 100000)}`,
    ...overrides,
  };

  await client.query(
    `
    CALL dbo.sp_userlogin(
      $1::varchar, $2::varchar, $3::varchar, $4::varchar, $5::varchar,
      $6::varchar, $7::varchar, $8::numeric, $9::varchar, $10::varchar,
      $11::refcursor
    )
    `,
    [
      p.strmode,
      p.coid,
      p.userid,
      p.username,
      p.userpwd,
      p.usertype,
      p.userstatus,
      p.datevalidity,
      p.original_userid,
      null, // p_strmenuname (unused, as in the original)
      p.cursorName,
    ]
  );
}

/* =========================================================
   GET USER LIST (mode 'G')
========================================================= */

export async function getUserLoginListService(
  PstrCoID: string
): Promise<UserLoginRow[]> {
  const client: PoolClient = await pool.connect();

  const cursorName = `cur_userlogin_${Date.now()}_${Math.floor(Math.random() * 100000)}`;

  try {
    await client.query("BEGIN");

    await callSpUserLogin(client, { strmode: "G", coid: PstrCoID, cursorName });

    const result = await client.query(`FETCH ALL FROM "${cursorName}"`);

    await client.query("COMMIT");

    // fuserpwd is dropped here - the encrypted password never leaves the server
    return result.rows.map((row) => ({
      txtUserID: row.fuserid,
      txtUserName: row.fusername ?? "",
      lkpUserType: row.fusertype ?? "",
      lkpUserStatus: row.fuserstatus ?? "",
    }));
  } catch (error: unknown) {
    await client.query("ROLLBACK");
    console.error("getUserLoginListService error:", error);
    throw error;
  } finally {
    client.release();
  }
}

/* =========================================================
   SAVE USER LIST
   mode 'S' for a new user, mode 'M' for an existing one.
   A blank password on an existing user keeps the old password.
========================================================= */

export async function saveUserLoginListService(
  PstrCoID: string,
  rows: UserLoginRowPayload[]
): Promise<void> {
  const userPwdSeed = Number(process.env.USER_PWD_SEED);

  if (!Number.isFinite(userPwdSeed)) {
    throw new Error("User password seed is not configured");
  }

  const client: PoolClient = await pool.connect();

  try {
    // valid User Type / User Status values come from dbo.tbluserparam
    const typeList = await client.query(`SELECT fpid FROM dbo.fillusertype($1)`, [PstrCoID]);
    const statusList = await client.query(`SELECT fpid FROM dbo.filluserstatus($1)`, [PstrCoID]);

    const validTypes = typeList.rows.map((r) => r.fpid);
    const validStatuses = statusList.rows.map((r) => r.fpid);

    // ---- validate the whole batch before touching the users table ----
    const seen = new Set<string>();

    for (const row of rows) {
      const PstrUserID = (row.txtUserID ?? "").trim();

      if (!PstrUserID) {
        throw new Error("User ID is required");
      }

      if (seen.has(PstrUserID.toUpperCase())) {
        throw new Error(`User ID '${PstrUserID}' is entered more than once`);
      }
      seen.add(PstrUserID.toUpperCase());

      if (!(row.txtUserName ?? "").trim()) {
        throw new Error(`User Name is required for '${PstrUserID}'`);
      }

      if (!validTypes.includes(row.lkpUserType)) {
        throw new Error(`User Type is required for '${PstrUserID}'`);
      }

      if (!validStatuses.includes(row.lkpUserStatus)) {
        throw new Error(`User Status is required for '${PstrUserID}'`);
      }

      const isNew = !row.txtOriginal_UserID;
      const pwd = row.txtPwd ?? "";

      if (isNew && !pwd) {
        throw new Error(`Password is required for '${PstrUserID}'`);
      }

      if (pwd || row.txtConfirmPwd) {
        if (pwd.length < 6 || pwd.length > 12) {
          throw new Error(`Password for '${PstrUserID}' must be 6 to 12 characters`);
        }

        if (pwd !== row.txtConfirmPwd) {
          throw new Error(
            `Password and Confirm Password do not match for '${PstrUserID}'`
          );
        }
      }
    }

    // ---- write ----
    await client.query("BEGIN");

    for (const row of rows) {
      const PstrUserID = row.txtUserID.trim();
      const isNew = !row.txtOriginal_UserID;

      const existing = await client.query(
        `SELECT 1 FROM dbo.tbluserlogin WHERE fcoid = $1 AND upper(fuserid) = upper($2)`,
        [PstrCoID, isNew ? PstrUserID : row.txtOriginal_UserID]
      );

      if (isNew && existing.rows.length > 0) {
        throw new Error(`User ID '${PstrUserID}' already exists`);
      }

      if (!isNew && existing.rows.length === 0) {
        throw new Error(`User '${row.txtOriginal_UserID}' no longer exists`);
      }

      await callSpUserLogin(client, {
        strmode: isNew ? "S" : "M",
        coid: PstrCoID,
        userid: PstrUserID,
        username: row.txtUserName.trim(),
        userpwd: row.txtPwd ? encryptPwd(row.txtPwd, userPwdSeed) : null,
        usertype: row.lkpUserType,
        userstatus: row.lkpUserStatus,
        datevalidity: isNew ? 0 : null, // NULL = keep the existing validity
        original_userid: isNew ? null : row.txtOriginal_UserID,
      });
    }

    await client.query("COMMIT");
  } catch (error: unknown) {
    await client.query("ROLLBACK").catch(() => undefined);
    console.error("saveUserLoginListService error:", error);
    throw error;
  } finally {
    client.release();
  }
}

/* =========================================================
   DELETE ONE USER (mode 'D1')
========================================================= */

export async function deleteUserLoginRowService(
  PstrCoID: string,
  txtUserID: string
): Promise<void> {
  const client: PoolClient = await pool.connect();

  try {
    await client.query("BEGIN");

    await callSpUserLogin(client, {
      strmode: "D1",
      coid: PstrCoID,
      original_userid: txtUserID,
    });

    await client.query("COMMIT");
  } catch (error: unknown) {
    await client.query("ROLLBACK");
    console.error("deleteUserLoginRowService error:", error);
    throw error;
  } finally {
    client.release();
  }
}
