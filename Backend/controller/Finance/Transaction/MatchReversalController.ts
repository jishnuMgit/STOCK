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
  // if (isEmpty(docType)) {
  //   return res
  //     .status(400)
  //     .json({ success: false, message: "Please input 'Document'" });
  // }
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
        p_strdocno       => $5::varchar,
        p_intslno        => $6::smallint,
        p_intslnosub     => $7::smallint,
        p_strcsaccountid => $8::varchar,
        p_strdivid       => $9::varchar,
        p_pstruserid     => $10::varchar,
        p_result         => $11::refcursor
      )
      `,
      [
        "GetTL", // 1  p_strmode
        coId, // 2  p_pstrcoid
        String(year), // 3  p_pstryear
        brId, // 4  p_strbrid
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
   GET MATCHED DOCUMENTS (mode 'GM' = get matched)
   POST /getMatchAccounts
   body: { strDocType, strCSAccountID, strDivID?, year }
   (Match module sends the non-matched mode; reversal needs matched)
===================================================== */

export const getMatchAccounts = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<Response> => {
  const strCoID = req.user?.CoID;
  const { strDocType, strCSAccountID, strDivID, year } = req.body;
  const strYear = isEmpty(year) ? "" : String(year);

  if (!strCoID) {
    return res
      .status(400)
      .json({ success: false, message: NO_COMPANY_MESSAGE });
  }
  if (isEmpty(strYear)) {
    return res
      .status(400)
      .json({ success: false, message: "Year is required" });
  }
  // if (isEmpty(strDocType)) {
  //   return res
  //     .status(400)
  //     .json({ success: false, message: "Please input 'Document Type'" });
  // }
  if (isEmpty(strCSAccountID)) {
    return res
      .status(400)
      .json({ success: false, message: "Please select 'Customer'" });
  }

  const client = await pool.connect();

  try {
    const cursorName = "cur_matchedaccounts";

    await client.query("BEGIN");

    await client.query(
      `
      CALL dbo.sp_getparentdocuments(
        $1::varchar,
        $2::varchar,
        $3::varchar,
        $4::varchar,
        $5::varchar,
        $6::bigint,
        $7::varchar,
        $8::smallint,
        $9::smallint,
        $10::varchar,
        $11::varchar,
        $12::varchar,
        $13::refcursor
      )
      `,
      [
        "GM", // 1  p_strmode  (GM = get matched)
        strCoID, // 2  p_strcoid
        strYear, // 3  p_stryear
        null, // 4  p_strbrid // 5  p_strdoctype
        null, // 6  p_strdocno
        0, // 7  p_intdocno
        null, // 8  p_dtpdate
        0, // 9  p_intslno
        0, // 10 p_intslnosub
        req.user?.userId ?? null, // 11 p_struserid
        strCSAccountID, // 12 p_strcsaccountid
        strDivID || null, // 13 p_strdivid
        cursorName, // 14 p_result_cursor
      ],
    );

    const result = await client.query(`FETCH ALL FROM "${cursorName}"`);

    await client.query("COMMIT");

    return res.status(200).json({
      success: true,
      data: result.rows,
      message: "Matched documents loaded successfully",
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("getMatchAccounts (reversal) error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to get matched documents",
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

  // parent line is optional in the request; if missing it is looked up below
  const rawParentSlNo = req.body.parentSlNo ?? req.body.slNo;
  const hasParentSlNo =
    rawParentSlNo !== undefined && rawParentSlNo !== null && rawParentSlNo !== "";

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
  // docType is optional (the SP ignores it when blank)
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
  // child rows that are ticked "Un-Match"
  const selectedRows = data.filter((r: any) => isTrue(getField(r, "fSelect")));

  if (selectedRows.length === 0) {
    return res.status(400).json({
      success: false,
      message: "There is no Account selected for Un-Match",
    });
  }

  const pDocType = isEmpty(docType) ? "" : String(docType).trim();
  const pDocNo = String(docNo).trim();

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    /* ---------- parent line (slno) ---------- */
    let parentSlNo: number;

    if (hasParentSlNo) {
      parentSlNo = num(rawParentSlNo);
    } else {
      // not sent by the frontend: take it from the parent (P) row
      const pRes = await client.query(
        `
        SELECT DISTINCT fslno
          FROM dbo.tblmatchrecords
         WHERE fpc = 'P'
           AND fcoid = $1
           AND fpyear = $2
           AND fpbrid = $3
           AND ($4 = '' OR fpdoctype = $4)
           AND fpdocno = $5
        `,
        [coId, String(year), brId, pDocType, pDocNo],
      );

      if (pRes.rows.length === 0) {
        throw new Error("No matched records found for this document");
      }
      if (pRes.rows.length > 1) {
        throw new Error(
          "Document has more than one matched line, parent line (slNo) is required",
        );
      }
      parentSlNo = Number(pRes.rows[0].fslno);
    }

    const processed = new Set<number>();
    let count = 0;

    for (const row of selectedRows) {
      // the grid only sends the serial (fslno 1,2,3...) of the matched row
      const serial = num(getField(row, "fSlNo"));

      if (!serial) {
        throw new Error("Serial no. missing in the selected row");
      }

      // guard against the same row being sent twice
      if (processed.has(serial)) continue;
      processed.add(serial);

      // child document key, read from the matched (C) row itself
      const cRes = await client.query(
        `
        SELECT fyear, fbrid, fdoctype, fdocno
          FROM dbo.tblmatchrecords
         WHERE fpc = 'C'
           AND fcoid = $1
           AND fpyear = $2
           AND fpbrid = $3
           AND ($4 = '' OR fpdoctype = $4)
           AND fpdocno = $5
           AND fslno = $6
        `,
        [coId, String(year), brId, pDocType, pDocNo, serial],
      );

      if (cRes.rows.length === 0) {
        throw new Error(`Matched row ${serial} not found`);
      }

      const cYear = String(cRes.rows[0].fyear).trim();
      const cBrId = String(cRes.rows[0].fbrid).trim();
      const cDocType = String(cRes.rows[0].fdoctype).trim();
      const cDocNo = String(cRes.rows[0].fdocno).trim();

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
          p_strdivid       => $8::varchar,
          p_pstruserid     => $9::varchar,
          p_result         => $10::refcursor,
          p_strcyear       => $11::varchar,
          p_strcbrid       => $12::varchar,
          p_strcdoctype    => $13::varchar,
          p_strcdocno      => $14::varchar,
          p_intcslno       => $15::smallint
        )
        `,
        [
          "UC", // 1  p_strmode
          coId, // 2  p_pstrcoid
          String(year), // 3  p_pstryear
          brId, // 4  p_strbrid
          pDocType === "" ? null : pDocType, // 5  p_strdoctype
          pDocNo, // 6  p_strdocno
          parentSlNo, // 7  p_intslno (parent line)
          isEmpty(divId) ? null : divId, // 8  p_strdivid
          userId, // 9  p_pstruserid
          "cur_unmatch_dummy", // 10 p_result (not used by mode 'UC')
          cYear, // 11 p_strcyear
          cBrId, // 12 p_strcbrid
          cDocType, // 13 p_strcdoctype
          cDocNo, // 14 p_strcdocno
          serial, // 15 p_intcslno (serial of the C row)
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
