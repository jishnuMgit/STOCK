import type { Response } from "express";
import pool from "../../../DB/db.js";
import type { AuthenticatedRequest } from "../../../middleware/authMiddleware.js";

/* =====================================================
   HELPERS
===================================================== */

// Postgres folds column names to lowercase, VB used fSelect etc.
// This reads a field case-insensitively so both shapes work.
const getField = (row: Record<string, any>, name: string): any => {
  if (row == null) return undefined;
  if (name in row) return row[name];
  const key = Object.keys(row).find(
    (k) => k.toLowerCase() === name.toLowerCase(),
  );
  return key ? row[key] : undefined;
};

const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const isTrue = (v: unknown): boolean =>
  v === true || v === "true" || v === "True" || v === 1 || v === "1";

const isEmpty = (v: unknown): boolean =>
  v === null || v === undefined || String(v).trim() === "";

const NO_COMPANY_MESSAGE = "Company ID is not available in session";

/* =====================================================
   LOAD DROPDOWN DATA
   GET /getLookups
   (VB: clsUnMatchAccounts.FillCombos - document list)
===================================================== */

export const getMatchReversalLookups = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<Response> => {
  try {
    const coId = req.user?.CoID;

    if (!coId) {
      return res
        .status(400)
        .json({ success: false, message: NO_COMPANY_MESSAGE });
    }

    const docType = await pool.query(`SELECT * FROM dbo.getdoctype($1,$2)`, [
      coId,
      "FIN",
    ]);

    return res.status(200).json({
      success: true,
      DocType: docType.rows,
      message: "Match reversal lookups loaded successfully",
    });
  } catch (error: unknown) {
    console.error("getMatchReversalLookups error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load match reversal lookups",
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

/* =====================================================
   GET MATCHED TRANSACTION LINES (GetTL)
   POST /getMatchedTransactions
   body: { year, brId, docType, docNo, divId? }
   (VB: clsUnMatchAccounts.GetData)
===================================================== */

export const getMatchedTransactions = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<Response> => {
  const coId = req.user?.CoID;
  const { year, brId, docType, docNo, divId } = req.body;

  if (!coId) {
    return res
      .status(400)
      .json({ success: false, message: NO_COMPANY_MESSAGE });
  }
  if (isEmpty(year)) {
    return res
      .status(400)
      .json({ success: false, message: "Please select 'Year'" });
  }
  if (isEmpty(brId)) {
    return res
      .status(400)
      .json({ success: false, message: "Please select 'Branch'" });
  }
  if (isEmpty(docType)) {
    return res
      .status(400)
      .json({ success: false, message: "Please input 'Document'" });
  }
  if (isEmpty(docNo)) {
    return res
      .status(400)
      .json({ success: false, message: "Please input 'Document No.'" });
  }

  const client = await pool.connect();

  try {
    const cursorName = "cur_unmatchaccounts";

    await client.query("BEGIN");

    await client.query(
      `
      CALL dbo.sp_pageunmatchaccounts(
        p_strmode        => $1::varchar,
        p_pstrcoid       => $2::varchar,
        p_pstryear       => $3::varchar,
        p_strbrid        => $4::varchar,
        p_strdoctype     => $5::varchar,
        p_strdocno       => $6::varchar,
        p_intslno        => $7::smallint,
        p_intslnosub     => $8::smallint,
        p_strcsaccountid => $9::varchar,
        p_strdivid       => $10::varchar,
        p_pstruserid     => $11::varchar,
        p_result         => $12::refcursor
      )
      `,
      [
        "GetTL", // 1  p_strmode
        coId, // 2  p_pstrcoid
        String(year), // 3  p_pstryear
        brId, // 4  p_strbrid
        docType, // 5  p_strdoctype
        String(docNo).trim(), // 6  p_strdocno
        0, // 7  p_intslno
        0, // 8  p_intslnosub
        null, // 9  p_strcsaccountid
        isEmpty(divId) ? null : divId, // 10 p_strdivid
        req.user?.userId ?? null, // 11 p_pstruserid
        cursorName, // 12 p_result
      ],
    );

    const result = await client.query(`FETCH ALL FROM "${cursorName}"`);

    await client.query("COMMIT");

    return res.status(200).json({
      success: true,
      data: result.rows,
      message: "Matched transactions loaded successfully",
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("getMatchedTransactions error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to get matched transactions",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  } finally {
    client.release();
  }
};

/* =====================================================
   UN-MATCH (mode 'U')
   POST /unmatch
   body: {
     year, brId, docType, docNo, divId?,
     data: [...grid rows; selected ones have fSelect = true]
   }
   (VB: clsUnMatchAccounts.Apply + frmUnMatchAccounts.cmdSave_Click)
   coId and userId come from the session.

   All selected rows are reversed in ONE transaction;
   if any row fails, everything is rolled back.
===================================================== */

export const unmatchTransactions = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<Response> => {
  const coId = req.user?.CoID;
  const userId = req.user?.userId ?? null;
  const { year, brId, docType, docNo, divId, data } = req.body;

  if (!coId) {
    return res
      .status(400)
      .json({ success: false, message: NO_COMPANY_MESSAGE });
  }
  if (!userId) {
    return res
      .status(400)
      .json({ success: false, message: "User ID is not available in session" });
  }

  /* ---------- ValidateMe ---------- */
  if (isEmpty(year)) {
    return res
      .status(400)
      .json({ success: false, message: "Please select 'Year'" });
  }
  if (isEmpty(brId)) {
    return res
      .status(400)
      .json({ success: false, message: "Please select 'Branch'" });
  }
  if (isEmpty(docType)) {
    return res
      .status(400)
      .json({ success: false, message: "Please input 'Document'" });
  }
  if (isEmpty(docNo)) {
    return res
      .status(400)
      .json({ success: false, message: "Please input 'Document No.'" });
  }
  if (!Array.isArray(data)) {
    return res
      .status(400)
      .json({ success: false, message: "data must be an array" });
  }

  /* ---------- ValidateGrid ---------- */
  // rows that have an account and are ticked "Un-Match"
  const selectedRows = data.filter(
    (r: any) =>
      !isEmpty(getField(r, "fCSAccountID") ?? getField(r, "fAccountID")) &&
      isTrue(getField(r, "fSelect")),
  );

  if (selectedRows.length === 0) {
    return res.status(400).json({
      success: false,
      message: "There is no Account selected for Un-Match",
    });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const processed = new Set<string>();
    let count = 0;

    for (const row of selectedRows) {
      const accountId = String(
        getField(row, "fCSAccountID") ?? getField(row, "fAccountID"),
      ).trim();
      const slNo = num(getField(row, "fSlNo"));
      const slNoSub = num(getField(row, "fSlNoSub"));

      // guard against the same line being sent twice
      const key = `${accountId}|${slNo}|${slNoSub}`;
      if (processed.has(key)) continue;
      processed.add(key);

      await client.query(
        `
        CALL dbo.sp_pageunmatchaccounts(
          p_strmode        => $1::varchar,
          p_pstrcoid       => $2::varchar,
          p_pstryear       => $3::varchar,
          p_strbrid        => $4::varchar,
          p_strdoctype     => $5::varchar,
          p_strdocno       => $6::varchar,
          p_intslno        => $7::smallint,
          p_intslnosub     => $8::smallint,
          p_strcsaccountid => $9::varchar,
          p_strdivid       => $10::varchar,
          p_pstruserid     => $11::varchar,
          p_result         => $12::refcursor
        )
        `,
        [
          "U", // 1  p_strmode
          coId, // 2  p_pstrcoid
          String(year), // 3  p_pstryear
          brId, // 4  p_strbrid
          docType, // 5  p_strdoctype
          String(docNo).trim(), // 6  p_strdocno
          slNo, // 7  p_intslno
          slNoSub, // 8  p_intslnosub
          accountId, // 9  p_strcsaccountid
          isEmpty(divId) ? null : divId, // 10 p_strdivid
          userId, // 11 p_pstruserid
          "cur_unmatch_dummy", // 12 p_result (not used by mode 'U')
        ],
      );

      count++;
    }

    await client.query("COMMIT");

    return res.status(200).json({
      success: true,
      message: "Accounts Un-Matched",
      unmatched: count,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("unmatchTransactions error:", error);

    return res.status(500).json({
      success: false,
      message: "Accounts Not Un-Matched, try Again",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  } finally {
    client.release();
  }
};
