import type { Request, Response } from "express";
import pool from "../DB/db.js";
import { getDocumentsToMatch } from '../services/matchService.js'



export const getCSaccounts = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const PstrCoID =
      process.env.PstrCoID;

    console.log(
      "================================="
    );

    console.log(
      "COMPANY ID:",
      PstrCoID
    );

    console.log(
      "================================="
    );

    /* =====================================================
       ENVIRONMENT VALIDATION
    ===================================================== */

    if (!PstrCoID) {
      return res.status(400).json({
        success: false,
        message:
          "Company ID is not configured",
      });
    }

    /* =====================================================
       LOAD ACCOUNTS
    ===================================================== */

    const [
      AccountID,
      AccountName,
      DocType
    ] = await Promise.all([
      pool.query(
        `
        SELECT *
        FROM dbo.filllookupcustomerid($1)
        `,
        [PstrCoID]
      ),

      pool.query(
        `
        SELECT *
        FROM dbo.filllookupcustomername($1)
        `,
        [PstrCoID]
      ),

      pool.query(`
        SELECT *
        FROM dbo.getdoctype($1,$2)
        `,
        [PstrCoID, "FIN"]
      ),

    ]);








    /* =====================================================
       RESPONSE
    ===================================================== */

    return res.status(200).json({
      success: true,

      AccountID:
        AccountID.rows,

      AccountName:
        AccountName.rows,

      DocType: DocType.rows,

      message:
        "Receipt data loaded successfully",
    });

  } catch (error: unknown) {

    console.error(
      "getCSaccounts error:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        "Failed to load receipt data",

      error:
        error instanceof Error
          ? error.message
          : String(error),
    });
  }
};

export const GetData = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const client = await pool.connect();

  try {






    console.log("===============================")
    console.log(req.body)

    console.log("===============================")

    const strCoID = process.env.PstrCoID;
    const strYear = process.env.PstrYear;
    const {
      strDocType,
      strCSAccountID,
      strDivID,
    } = req.body;
    if (!strCoID) {
      return res.status(500).json({
        success: false,
        message: "Company ID is not configured",
      });
    }

    if (!strDocType || strDocType.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Please input 'Document Type'",
      });
    }

    if (
      !strCSAccountID ||
      strCSAccountID.trim() === ""
    ) {
      return res.status(400).json({
        success: false,
        message: "Please select 'Customer'",
      });
    }

    /* =====================================================
       CURSOR NAME
    ===================================================== */

    const cursorName = "cur_matchaccounts";

    /* =====================================================
       START TRANSACTION
    ===================================================== */

    await client.query("BEGIN");

    /* =====================================================
       CALL PROCEDURE
       14 PARAMETERS
    ===================================================== */

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

        /* 1 - p_strmode */
        "GetTL",

        /* 2 - p_strcoid */
        strCoID,

        /* 3 - p_stryear */
        strYear,

        /* 4 - p_strbrid */
        null,

        /* 5 - p_strdoctype */
        strDocType,

        /* 6 - p_strdocno */
        null,

        /* 7 - p_intdocno */
        0,

        /* 8 - p_dtpdate */
        null,

        /* 9 - p_intslno */
        0,

        /* 10 - p_intslnosub */
        0,

        /* 11 - p_struserid */
        null,

        /* 12 - p_strcsaccountid */
        strCSAccountID,

        /* 13 - p_strdivid */
        strDivID || null,

        /* 14 - p_result_cursor */
        cursorName,
      ]
    );

    /* =====================================================
       FETCH CURSOR
    ===================================================== */

    const result = await client.query(
      `FETCH ALL FROM "${cursorName}"`
    );

    console.log(
      "================================="
    );

    console.log(
      "Match Accounts Result:",
      result.rows
    );

    console.log(
      "================================="
    );

    /* =====================================================
       COMMIT
    ===================================================== */

    await client.query("COMMIT");

    return res.status(200).json({
      success: true,
      data: result.rows,
      message:
        "Match accounts loaded successfully",
    });

  } catch (error) {

    await client.query("ROLLBACK");

    console.error(
      "Get Match Accounts Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to get match accounts",
      error:
        error instanceof Error
          ? error.message
          : "Unknown error",
    });

  } finally {

    client.release();

  }
};



export async function getDocumentsToMatchController(
  req: Request,
  res: Response
) {
  try {
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
      // Use your actual company ID source here
      req.body.coId
    );

    return res.status(200).json({
      success: true,
      ...result,
    });

  } catch (error) {
    console.error(
      "getDocumentsToMatch error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to get documents to match",
    });
  }
}