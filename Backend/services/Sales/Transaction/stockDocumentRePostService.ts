import type { PoolClient } from "pg";
import pool from "../../../DB/db.js";

/* =========================================================
   STOCK DOCUMENT RE-POST - calls dbo.sp_stockrepost
   (the port of the old stock re-post: the stock is built again from the posted documents between two
   posting numbers). One transaction: if any document fails, nothing changes.
========================================================= */

export type RePostResult = {
  // how many documents were replayed
  count: number;
  // the procedure's own message ("3 document(s) re-posted in 2.413 sec")
  message: string;
  // the last document processed ("260000016 - SI/26/125")
  processingDoc: string;
  // the total time the procedure took, in seconds
  timeTakenSec: number;
};

export type PostingRange = {
  minPostingNo: string;
  maxPostingNo: string;
  totalPostedCount: number;
};

// dbo.sp_getpostingrange - the first and the last posting number and how many documents are posted (company + year)
export const getPostingRange = async (p: {
  PstrCoID: string;
  PstrYear: string;
}): Promise<PostingRange> => {
  // the three INOUT arguments come back in the row
  const { rows } = await pool.query(
    `CALL dbo.sp_getpostingrange($1::varchar, $2::varchar, NULL::varchar, NULL::varchar, NULL::bigint)`,
    [p.PstrCoID, p.PstrYear]
  );

  return {
    minPostingNo: String(rows[0]?.p_minpostingno ?? ""),
    maxPostingNo: String(rows[0]?.p_maxpostingno ?? ""),
    // bigint comes back from pg as a string
    totalPostedCount: Number(rows[0]?.p_totalpostedcount ?? 0),
  };
};

export const rePostDocuments = async (p: {
  PstrCoID: string;
  PstrUserID: string;
  // the login year (the stock of this year is built again)
  PstrYear: string;
  txtFromTxnNo: string;
  txtToTxnNo: string;
  // called with the text of every RAISE NOTICE of the procedure (it names the document being posted)
  onNotice?: (message: string) => void;
}): Promise<RePostResult> => {
  const client: PoolClient = await pool.connect();

  const noticeHandler = (notice: { message?: string }) => {
    if (notice.message) p.onNotice?.(notice.message);
  };
  client.on("notice", noticeHandler);

  try {
    await client.query("BEGIN");

    // the INOUT arguments (the count, the message, the last document and the time taken) come back in the row
    const { rows } = await client.query(
      `
      CALL dbo.sp_stockrepost(
        $1::varchar, 0, $2::varchar, $3::varchar, $4::varchar, $5::varchar,
        NULL::varchar, NULL::varchar, NULL::numeric
      )
      `,
      [p.PstrCoID, p.PstrUserID, p.PstrYear, p.txtFromTxnNo, p.txtToTxnNo]
    );

    await client.query("COMMIT");

    return {
      count: Number(rows[0]?.p_intrepostedcount ?? 0),
      message: String(rows[0]?.p_strmsg ?? ""),
      processingDoc: String(rows[0]?.p_strprocessingdoc ?? ""),
      // numeric comes back from pg as a string
      timeTakenSec: Number(rows[0]?.p_dectimetakensec ?? 0),
    };
  } catch (error: unknown) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.removeListener("notice", noticeHandler);
    client.release();
  }
};
