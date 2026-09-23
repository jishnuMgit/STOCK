import { Request, Response } from "express";
import pool from "../DB/db.js";

export const getCompanies = async (
  _req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const result = await pool.query(`
      SELECT
        fcoid AS "fCoID",
        fconame AS "fCoName",
        fconame_ar AS "fCoName_AR",
        fconame_qr AS "fCoName_QR",
        fconame_short AS "fCoName_Short",
        fcoaddress1 AS "fCoAddress1",
        fcoaddress2 AS "fCoAddress2",
        fcovatno AS "fCoVATNo",
        fcostatus AS "fCoStatus",
        fpositionno AS "fPositionNo"
      FROM dbo.tblcompany
      ORDER BY fpositionno, fcoid
    `);

    return res.status(200).json({
      success: true,
      companies: result.rows,
    });
  } catch (error: unknown) {
    console.error("Get companies error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load companies",
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
