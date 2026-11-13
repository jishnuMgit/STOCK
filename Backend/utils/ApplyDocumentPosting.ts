import pool from "../DB/db.js";



export const applyDocumentPosting = async (
    PstrCoID: string,
    PstrYear: string,
    lkpBranch: string,
    lkpDocType: string,
    intRdgByIDOrDate: number,
    txtDocNo: string,
    dtpDate: string,
  PstrUserID: string
): Promise<{ intDocPostCount: number }> => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1. Get Prefix Length
    const prefixResult = await client.query(
      `SELECT dbo.getprefixlen($1, $2, $3, $4) AS "intPrefixLen"`,
      [
        PstrCoID,
        PstrYear,
        lkpBranch,
        lkpDocType
      ]
    );

    const intPrefixLen: number = Number(
      prefixResult.rows[0]?.intPrefixLen ?? 0
    );

    // 2. Execute Document Posting Procedure
    const result = await client.query(
      `CALL dbo.sp_pagefindocpost(
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11, $12,
        $13
      )`,
      [
        PstrCoID,
        PstrYear,
        lkpBranch,
        lkpDocType,
        intRdgByIDOrDate,
        intPrefixLen,
        txtDocNo,
        txtDocNo,
        dtpDate || null,
        dtpDate || null,
        PstrUserID,
        null,
        0
      ]
    );

    await client.query("COMMIT");

    return {
      intDocPostCount: Number(
        result.rows[0]?.p_intdocpostcount ?? 0
      )
    };

  } catch (error) {
    await client.query("ROLLBACK");
    throw error;

  } finally {
    client.release();
  }
};