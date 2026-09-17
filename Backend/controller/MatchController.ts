import type { Request, Response } from "express";
import pool from "../DB/db.js";

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