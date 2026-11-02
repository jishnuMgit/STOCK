import type { PoolClient } from "pg";
import pool from "../../../DB/db.js";

/* =========================================================
   STOCK DOCUMENT RE-POST - calls dbo.sp_pagestockdocumentrepost
   (the port of the old stock re-post: the stock is built again from the posted documents between two
   posting numbers). One transaction: if any document fails, nothing changes.
========================================================= */

export type RePostResult = {
  // how many documents were replayed
  count: number;
  // the procedure's own message ("3 document(s) re-posted")
  message: string;
};

export const rePostDocuments = async (p: {
  PstrCoID: string;
  PstrUserID: string;
  txtFromTxnNo: string;
  txtToTxnNo: string;
}): Promise<RePostResult> => {
  const client: PoolClient = await pool.connect();

  try {
    await client.query("BEGIN");

    // the two INOUT arguments (the count and the message) come back in the row
    const { rows } = await client.query(
      `
      CALL dbo.sp_pagestockdocumentrepost(
        $1::varchar, $2::varchar, $3::varchar, $4::varchar, 0, NULL::varchar
      )
      `,
      [p.PstrCoID, p.PstrUserID, p.txtFromTxnNo, p.txtToTxnNo]
    );

    await client.query("COMMIT");

    return {
      count: Number(rows[0]?.p_intrepostedcount ?? 0),
      message: String(rows[0]?.p_strmsg ?? ""),
    };
  } catch (error: unknown) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
};
