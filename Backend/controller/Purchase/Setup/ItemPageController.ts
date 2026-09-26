import { Request, Response } from "express";

import pool from "../../../DB/db.js";

/* =========================================================
   GET UNIT LIST (lkpUnit dropdown)
========================================================= */

export const getUnitList = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const { CoID } = req.query;

    if (!CoID) {
      return res.status(400).json({
        success: false,
        message: "Company ID is required",
      });
    }

    const result = await pool.query(
      `
      SELECT *
      FROM dbo.fillunit($1)
      `,
      [CoID]
    );

    return res.status(200).json({
      success: true,
      data: result.rows,
    });
  } catch (error: unknown) {
    console.error("getUnitList error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load unit list",
      error:
        error instanceof Error
          ? error.message
          : String(error),
    });
  }
};

/* =========================================================
   GET ITEM GROUP LIST (lkpItemGroupID dropdown)
========================================================= */

export const getItemGroupList = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const { CoID } = req.query;

    if (!CoID) {
      return res.status(400).json({
        success: false,
        message: "Company ID is required",
      });
    }

    const result = await pool.query(
      `
      SELECT *
      FROM dbo.fillitemgroup($1)
      `,
      [CoID]
    );

    return res.status(200).json({
      success: true,
      data: result.rows,
    });
  } catch (error: unknown) {
    console.error("getItemGroupList error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load item group list",
      error:
        error instanceof Error
          ? error.message
          : String(error),
    });
  }
};

/* =========================================================
   GET SUPPLIER LIST (lkpSupplierID dropdown)
========================================================= */

export const getSupplierList = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const { CoID } = req.query;

    if (!CoID) {
      return res.status(400).json({
        success: false,
        message: "Company ID is required",
      });
    }

    const result = await pool.query(
      `
      SELECT *
      FROM dbo.fillsupplier($1)
      `,
      [CoID]
    );

    return res.status(200).json({
      success: true,
      data: result.rows,
    });
  } catch (error: unknown) {
    console.error("getSupplierList error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load supplier list",
      error:
        error instanceof Error
          ? error.message
          : String(error),
    });
  }
};
