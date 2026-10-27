import type { Response } from "express";
import pool from "../DB/db.js";
import { getDocumentsToMatch } from "../services/matchService.js";
import type { AuthenticatedRequest } from "../middleware/authMiddleware.js";

/* =====================================================
   HELPERS
===================================================== */

// Postgres folds column names to lowercase, VB used fMatchAmt etc.
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
   GET /getCSAccounts
===================================================== */

export const getCSaccounts = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<Response> => {
  try {
    const PstrCoID = req.user?.CoID;

    if (!PstrCoID) {
      return res.status(400).json({
        success: false,
        message: NO_COMPANY_MESSAGE,
      });
    }

    const [AccountID, AccountName, DocType] = await Promise.all([
      pool.query(`SELECT * FROM dbo.filllookupcustomerid($1)`, [PstrCoID]),
      pool.query(`SELECT * FROM dbo.filllookupcustomername($1)`, [PstrCoID]),
      pool.query(`SELECT * FROM dbo.getdoctype($1,$2)`, [PstrCoID, "FIN"]),
    ]);

    return res.status(200).json({
      success: true,
      AccountID: AccountID.rows,
      AccountName: AccountName.rows,
      DocType: DocType.rows,
      message: "Receipt data loaded successfully",
    });
  } catch (error: unknown) {
    console.error("getCSaccounts error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load receipt data",
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

/* =====================================================
   GET MATCH ACCOUNTS (GetTL)
   POST /getMatchAccounts
   body: { strDocType, strCSAccountID, strDivID, year }
===================================================== */

export const GetData = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<Response> => {
  const strCoID = req.user?.CoID;
  const { strDocType, strCSAccountID, strDivID, year } = req.body;
  const strYear = isEmpty(year) ? "" : String(year);

  if (!strCoID) {
    return res.status(400).json({
      success: false,
      message: NO_COMPANY_MESSAGE,
    });
  }

  if (isEmpty(strYear)) {
    return res.status(400).json({
      success: false,
      message: "Year is required",
    });
  }

  if (isEmpty(strDocType)) {
    return res.status(400).json({
      success: false,
      message: "Please input 'Document Type'",
    });
  }

  if (isEmpty(strCSAccountID)) {
    return res.status(400).json({
      success: false,
      message: "Please select 'Customer'",
    });
  }

  const client = await pool.connect();

  try {
    const cursorName = "cur_matchaccounts";

    await client.query("BEGIN");

    await client.query(
      `
      CALL dbo.sp_pagesmatchaccounts(
        $1::varchar,
        $2::varchar,
        $3::varchar,
        $4::varchar,
        $5::varchar,
        $6::varchar,
        $7::bigint,
        $8::varchar,
        $9::smallint,
        $10::smallint,
        $11::varchar,
        $12::varchar,
        $13::varchar,
        $14::refcursor
      )
      `,
      [
        "GetTL", // 1  p_strmode
        strCoID, // 2  p_strcoid
        strYear, // 3  p_stryear
        null, // 4  p_strbrid
        strDocType, // 5  p_strdoctype
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
      message: "Match accounts loaded successfully",
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error("Get Match Accounts Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to get match accounts",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  } finally {
    client.release();
  }
};

/* =====================================================
   GET DOCUMENTS TO MATCH (match grid)
   POST /getDocumentsToMatch
===================================================== */

export async function getDocumentsToMatchController(
  req: AuthenticatedRequest,
  res: Response,
): Promise<Response> {
  try {
    const coId = req.user?.CoID;

    if (!coId) {
      return res.status(400).json({
        success: false,
        message: NO_COMPANY_MESSAGE,
      });
    }

    const {
      customerAccountId,
      docNo,
      brId,
      docType,
      divId,
      year,
      matchAccountSlNo,
      matchAccountSlNoSub,
      debit,
      credit,
      matchDocAmt,
    } = req.body;

    const result = await getDocumentsToMatch(
      {
        customerAccountId,
        docNo,
        brId,
        docType,
        divId,
        year,
        matchAccountSlNo,
        matchAccountSlNoSub,
        debit,
        credit,
        matchDocAmt,
      },
      pool,
      coId, // from the session, not from the request body
    );

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("getDocumentsToMatch error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to get documents to match",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

/* =====================================================
   VALIDATION (port of ValidateGrid + ValidateMe)
===================================================== */

const validateMatchRows = (
  matchRows: Record<string, any>[],
  totalAmount: number,
): string | null => {
  let totalMatchAmt = 0;

  for (const row of matchRows) {
    if (!isTrue(getField(row, "fMatch"))) continue;

    const debit = num(getField(row, "fDebit"));
    const credit = num(getField(row, "fCredit"));
    const matchAmt = num(getField(row, "fMatchAmt"));

    if (Math.abs(matchAmt) > debit + credit) {
      return debit > 0
        ? "Match Amt. can't exceed 'Debit Amt.'"
        : "Match Amt. can't exceed 'Credit Amt.'";
    }
    if (debit > 0 && matchAmt <= 0) {
      return "Match Amt. should be greater than '0'.";
    }
    if (credit > 0 && matchAmt >= 0) {
      return "Match Amt. should be less than '0'.";
    }

    totalMatchAmt += matchAmt;
  }

  // VB: Math.Abs(sum of fMatchAmt) must equal txtAmount
  if (
    Math.round(Math.abs(totalMatchAmt) * 100) !==
    Math.round(Math.abs(totalAmount) * 100)
  ) {
    return "'Total Match Amt.' must be equal to 'Selected Match Total Amt.'";
  }

  return null;
};

/* =====================================================
   SAVE MATCH  (port of clsMatchAccounts.Apply)
   POST /saveMatch
   body: {
     strMode, year, brId, docType, docNo, intDocNo, docDate,
     efDate, divId, totalAmount,
     data:  [...rows of the main doc grid  (dtData)],
     match: [...rows of the match grid     (dtMatch)]
   }
   coId and userId come from the session.
===================================================== */

export const saveMatch = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<Response> => {
  const coId = req.user?.CoID;
  const userId = req.user?.userId ?? null;

  const {
    strMode,
    year,
    brId,
    docType,
    docNo,
    intDocNo,
    docDate,
    efDate,
    divId,
    totalAmount,
    data,
    match,
  } = req.body;

  if (!coId) {
    return res
      .status(400)
      .json({ success: false, message: NO_COMPANY_MESSAGE });
  }
  if (isEmpty(efDate)) {
    return res
      .status(400)
      .json({ success: false, message: "Please select Ef. Date" });
  }
  if (!Array.isArray(data) || !Array.isArray(match)) {
    return res
      .status(400)
      .json({ success: false, message: "data and match must be arrays" });
  }

  const matchedRows = match.filter((r: any) => isTrue(getField(r, "fMatch")));

  // Nothing matched -> nothing to save (same as VB, which just closes)
  if (matchedRows.length === 0) {
    return res
      .status(200)
      .json({ success: true, message: "No matched records to save" });
  }

  const validationError = validateMatchRows(match, num(totalAmount));
  if (validationError) {
    return res.status(400).json({ success: false, message: validationError });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    let parentCount = 0;
    let childCount = 0;

    for (const dRow of data) {
      if (isEmpty(getField(dRow, "fMatch"))) continue;

      const accountId = getField(dRow, "fAccountID");
      const slNo = num(getField(dRow, "fSlNo"));
      const slNoSub = num(getField(dRow, "fSlNoSub"));

      // IsMatchStatus: match rows belonging to this data row
      const childRows = matchedRows.filter(
        (m: any) =>
          getField(m, "fAccountID") === accountId &&
          num(getField(m, "fMAccountSlNo")) === slNo &&
          num(getField(m, "fMAccountSlNoSub")) === slNoSub,
      );

      if (!isTrue(getField(dRow, "fMatch")) || childRows.length === 0) {
        continue;
      }

      /* ---------- 1. parent row : sp_pagesmatchaccounts ---------- */
      const cursorName = `cur_save_${parentCount}`;

      await client.query(
        `
        CALL dbo.sp_pagesmatchaccounts(
          $1::varchar, $2::varchar, $3::varchar, $4::varchar,
          $5::varchar, $6::varchar, $7::bigint,  $8::varchar,
          $9::smallint, $10::smallint, $11::varchar, $12::varchar,
          $13::varchar, $14::refcursor
        )
        `,
        [
          strMode,
          coId,
          String(year),
          brId,
          docType,
          docNo,
          num(intDocNo),
          docDate,
          slNo,
          slNoSub,
          userId,
          accountId,
          divId || null,
          cursorName,
        ],
      );
      parentCount++;

      /* ---------- 2. child rows : sp_pagematchrecords ---------- */
      for (let i = 0; i < childRows.length; i++) {
        const c = childRows[i];
        const mSlNoSub = i + 1; // VB: intIndex_Match + 1

        await client.query(
          `
          CALL dbo.sp_pagematchrecords(
            $1::varchar,  $2::varchar,  $3::varchar,  $4::smallint,
            $5::varchar,  $6::varchar,  $7::smallint, $8::smallint,
            $9::bigint,   $10::varchar, $11::varchar, $12::varchar,
            $13::varchar, $14::float8,  $15::float8,  $16::float8,
            $17::smallint,$18::varchar, $19::varchar, $20::varchar,
            $21::bigint,  $22::smallint,$23::smallint,$24::varchar
          )
          `,
          [
            "S",
            coId,
            getField(c, "fBrID"),
            num(getField(c, "fYear")),
            getField(c, "fDocType"),
            getField(c, "fDocNo"),
            num(getField(c, "fSlNo")),
            num(getField(c, "fSlNoSub")),
            num(getField(c, "fIntDocNo")),
            getField(c, "fDate"),
            efDate,
            getField(c, "fAccountID"),
            String(getField(dRow, "fDescription") ?? " ").substring(0, 100),
            num(getField(c, "fDebit")),
            num(getField(c, "fCredit")),
            num(getField(c, "fMatchAmt")),
            num(year),
            brId,
            docType,
            docNo,
            num(intDocNo),
            slNo,
            mSlNoSub,
            userId,
          ],
        );

        /* ---------- 3. close fully matched docs ---------- */
        await client.query(
          `
          CALL dbo.sp_updatematchcloseddocs(
            $1::varchar, $2::smallint, $3::varchar, $4::varchar,
            $5::varchar, $6::varchar,  $7::smallint, $8::varchar
          )
          `,
          [
            coId,
            num(getField(c, "fYear")),
            getField(c, "fBrID"),
            getField(c, "fDocType"),
            getField(c, "fDocNo"),
            getField(c, "fAccountID"),
            num(getField(c, "fSlNo")),
            userId,
          ],
        );
        childCount++;
      }
    }

    await client.query("COMMIT");

    return res.status(200).json({
      success: true,
      message: "Match saved successfully",
      saved: { parentRows: parentCount, matchRows: childCount },
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("saveMatch error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to save match",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  } finally {
    client.release();
  }
};

/* =====================================================
   GET DATE  (port of clsMatchAccounts.GetDate)
   POST /getMatchDate
   body: { year, brId, docType, docNo }
===================================================== */

export const getMatchDate = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<Response> => {
  try {
    const coId = req.user?.CoID;
    const { year, brId, docType, docNo } = req.body;

    if (!coId) {
      return res
        .status(400)
        .json({ success: false, message: NO_COMPANY_MESSAGE });
    }
    if (isEmpty(year) || isEmpty(brId) || isEmpty(docType) || isEmpty(docNo)) {
      return res.status(400).json({
        success: false,
        message: "year, brId, docType and docNo are required",
      });
    }

    const result = await pool.query(
      `
      SELECT MAX(fdate) AS fdate
      FROM dbo.tblfintrans
      WHERE fcoid = $1
        AND fyear = $2
        AND fbrid = $3
        AND fdoctype = $4
        AND fdocno = $5
      `,
      [coId, Number(year), brId, docType, docNo],
    );

    return res.status(200).json({
      success: true,
      date: result.rows[0]?.fdate ?? null,
    });
  } catch (error) {
    console.error("getMatchDate error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get date",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
