import { Request, Response } from "express";
import pool from "../DB/db.js";

export const getYears = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const { companyId } = req.query;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: "Company ID is required",
      });
    }

    const result = await pool.query(
      `
      SELECT DISTINCT fyear AS "fYear"
      FROM dbo.tblyear
      WHERE fcoid = $1
      ORDER BY fyear DESC
      `,
      [companyId],
    );

    return res.status(200).json({
      success: true,
      years: result.rows,
    });
  } catch (error: unknown) {
    console.error("Get years error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load years",
      error: error instanceof Error ? error.message : String(error),
    });
  }
};