import type { PoolClient } from "pg";
import pool from "../../DB/db.js";

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
        $1::varchar,
        $2::varchar,
        $3::varchar,
        $4::varchar,
        $5::varchar,
        $6::varchar,
        $7::varchar,
        $8::varchar,
        $9::varchar,
        $10::varchar,
        $11::varchar,
        $12::varchar,
        $13::varchar,
        $14::varchar,
        $15::varchar,
        $16::varchar,
        $17::varchar,
        $18::varchar,
        $19::refcursor
      )
      `,
      [
        "G",       // p_strmode
        PstrCoID,  // p_pstrcoid
        null,      // p_strconame
        null,      // p_strconame_ar
        null,      // p_strconame_qr
        null,      // p_strconame_short
        null,      // p_strcovatno
        null,      // p_strcovatno_ar
        null,      // p_strcoaddress1
        null,      // p_strcoaddress2
        null,      // p_strcoaddress3
        null,      // p_strcoaddress4
        null,      // p_strcoaddress1_ar
        null,      // p_strcoaddress2_ar
        null,      // p_strcoaddress3_ar
        null,      // p_strcoaddress4_ar
        null,      // p_strcostatus
        null,      // p_pstruserid
        cursorName // p_result_cursor
      ]
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
    txtCoAddress1: string | null;
    txtCoAddress2: string | null;
    txtCoAddress3: string | null;
    txtCoAddress4: string | null;
    txtCoAddress1_AR: string | null;
    txtCoAddress2_AR: string | null;
    txtCoAddress3_AR: string | null;
    txtCoAddress4_AR: string | null;
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
        $1::varchar,
        $2::varchar,
        $3::varchar,
        $4::varchar,
        $5::varchar,
        $6::varchar,
        $7::varchar,
        $8::varchar,
        $9::varchar,
        $10::varchar,
        $11::varchar,
        $12::varchar,
        $13::varchar,
        $14::varchar,
        $15::varchar,
        $16::varchar,
        $17::varchar,
        $18::varchar,
        $19::refcursor
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
        payload.txtCoAddress1,
        payload.txtCoAddress2,
        payload.txtCoAddress3,
        payload.txtCoAddress4,
        payload.txtCoAddress1_AR,
        payload.txtCoAddress2_AR,
        payload.txtCoAddress3_AR,
        payload.txtCoAddress4_AR,
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
