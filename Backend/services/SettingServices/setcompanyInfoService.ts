import type { PoolClient } from "pg";
import pool from "../../DB/db.js";

/* =========================================================
   The procedure is called with NAMED arguments (p_xxx => value),
   so only the parameters a mode really uses are passed and the
   order of the procedure's parameters can never shift a value
   into the wrong one.
========================================================= */

/* =========================================================
   GET COMPANY INFO (mode 'G')
========================================================= */

export async function getCompanyInfoService(
  PstrCoID: string
): Promise<any | null> {
  const client: PoolClient = await pool.connect();

  const cursorName =
    `cur_companyinfo_${Date.now()}_${Math.floor(
      Math.random() * 100000
    )}`;

  try {
    await client.query("BEGIN");

    await client.query(
      `
      CALL dbo.sp_pagesetcompanyinfo(
        p_strmode       => $1::varchar,
        p_pstrcoid      => $2::varchar,
        p_result_cursor => $3::refcursor
      )
      `,
      ["G", PstrCoID, cursorName]
    );

    const result = await client.query(
      `FETCH ALL FROM "${cursorName}"`
    );

    await client.query("COMMIT");

    return result.rows[0] || null;
  } catch (error: unknown) {
    await client.query("ROLLBACK");
    console.error("getCompanyInfoService error:", error);
    throw error;
  } finally {
    client.release();
  }
}

/* =========================================================
   MODIFY COMPANY INFO (mode 'M')
========================================================= */

export async function updateCompanyInfoService(
  payload: {
    PstrCoID: string;
    txtCoName: string | null;
    txtCoName_AR: string | null;
    txtCoName_QR: string | null;
    txtCoName_Short: string | null;
    txtCoVATNo: string | null;
    txtCoVATNo_AR: string | null;
    txtCoStatus: string | null;
    PstrUserID: string;
  }
): Promise<void> {
  const client: PoolClient = await pool.connect();

  const cursorName =
    `cur_companyinfo_${Date.now()}_${Math.floor(
      Math.random() * 100000
    )}`;

  try {
    await client.query("BEGIN");

    await client.query(
      `
      CALL dbo.sp_pagesetcompanyinfo(
        p_strmode         => $1::varchar,
        p_pstrcoid        => $2::varchar,
        p_strconame       => $3::varchar,
        p_strconame_ar    => $4::varchar,
        p_strconame_qr    => $5::varchar,
        p_strconame_short => $6::varchar,
        p_strcovatno      => $7::varchar,
        p_strcovatno_ar   => $8::varchar,
        p_strcostatus     => $9::varchar,
        p_pstruserid      => $10::varchar,
        p_result_cursor   => $11::refcursor
      )
      `,
      [
        "M",
        payload.PstrCoID,
        payload.txtCoName,
        payload.txtCoName_AR,
        payload.txtCoName_QR,
        payload.txtCoName_Short,
        payload.txtCoVATNo,
        payload.txtCoVATNo_AR,
        payload.txtCoStatus,
        payload.PstrUserID,
        cursorName
      ]
    );

    await client.query("COMMIT");
  } catch (error: unknown) {
    await client.query("ROLLBACK");
    console.error("updateCompanyInfoService error:", error);
    throw error;
  } finally {
    client.release();
  }
}
