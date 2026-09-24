import { Request, Response } from "express";

import pool from "../DB/db.js";

/* =========================================================
   GET YEAR LIST (lkpYear dropdown)
========================================================= */

export const getYearList = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const PstrCoID = process.env.PstrCoID;

    if (!PstrCoID) {
      return res.status(400).json({
        success: false,
        message: "Company ID is not configured",
      });
    }

    const result = await pool.query(
      `
      SELECT *
      FROM dbo.fillyear($1)
      `,
      [PstrCoID]
    );

    return res.status(200).json({
      success: true,
      data: result.rows,
    });
  } catch (error: unknown) {
    console.error("getYearList error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load year list",
      error:
        error instanceof Error
          ? error.message
          : String(error),
    });
  }
};

/* =========================================================
   GET BRANCH LIST (lkpBranch dropdown)
========================================================= */

export const getBranchList = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const PstrCoID = process.env.PstrCoID;

    if (!PstrCoID) {
      return res.status(400).json({
        success: false,
        message: "Company ID is not configured",
      });
    }

    const result = await pool.query(
      `
      SELECT *
      FROM dbo.fillbranch($1)
      `,
      [PstrCoID]
    );

    return res.status(200).json({
      success: true,
      data: result.rows,
    });
  } catch (error: unknown) {
    console.error("getBranchList error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load branch list",
      error:
        error instanceof Error
          ? error.message
          : String(error),
    });
  }
};

/* =========================================================
   GET MODULE LIST (lkpModule dropdown)
========================================================= */

export const getModuleList = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const PstrCoID = process.env.PstrCoID;

    if (!PstrCoID) {
      return res.status(400).json({
        success: false,
        message: "Company ID is not configured",
      });
    }

    const result = await pool.query(
      `
      SELECT *
      FROM dbo.fillmodule($1)
      `,
      [PstrCoID]
    );

    return res.status(200).json({
      success: true,
      data: result.rows,
    });
  } catch (error: unknown) {
    console.error("getModuleList error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load module list",
      error:
        error instanceof Error
          ? error.message
          : String(error),
    });
  }
};
