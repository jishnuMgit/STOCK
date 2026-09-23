import type { PoolClient } from "pg";
import pool from "../DB/db.js";

/* =========================================================
   GET COMPANY INFO (mode 'G')
========================================================= */

export async function getCompanyInfoService(
  coId: string
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
      CALL dbo.sp_setcompanyinfo(
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
        $17::refcursor
      )
      `,
      [
        "G",       // p_strmode
        coId,      // p_pstrcoid
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
    coId: string;
    coNameAr: string | null;
    coNameQr: string | null;
    coNameShort: string | null;
    coVatNo: string | null;
    coVatNoAr: string | null;
    coAddress1: string | null;
    coAddress2: string | null;
    coAddress3: string | null;
    coAddress4: string | null;
    coAddress1Ar: string | null;
    coAddress2Ar: string | null;
    coAddress3Ar: string | null;
    coAddress4Ar: string | null;
    userId: string;
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
      CALL dbo.sp_setcompanyinfo(
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
        $17::refcursor
      )
      `,
      [
        "M",
        payload.coId,
        payload.coNameAr,
        payload.coNameQr,
        payload.coNameShort,
        payload.coVatNo,
        payload.coVatNoAr,
        payload.coAddress1,
        payload.coAddress2,
        payload.coAddress3,
        payload.coAddress4,
        payload.coAddress1Ar,
        payload.coAddress2Ar,
        payload.coAddress3Ar,
        payload.coAddress4Ar,
        payload.userId,
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
