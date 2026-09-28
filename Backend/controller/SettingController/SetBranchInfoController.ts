import { Request, Response } from "express";

import pool from "../../DB/db.js";
import {
  getBranchInfoService,
  saveBranchInfoService,
  type BranchInfoPayload,
} from "../../services/SettingServices/setBranchInfoService.js";

/* =========================================================
   GET BRANCH LIST (lkpBranch dropdown, filtered by
   dbo.userbranches — same as SetDocumentNo / ItemPage)
========================================================= */

export const getBranchList = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const { CoID, userId } = req.query;

    if (!CoID) {
      return res.status(400).json({
        success: false,
        message: "Company ID is required",
      });
    }

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    const result = await pool.query(
      `
      SELECT fbrid, fbrname
      FROM dbo.tblbranch
      WHERE fcoid = $1
        AND dbo.userbranches($1, fbrid, $2)
      ORDER BY fpositionno, fbrid
      `,
      [CoID, userId]
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
   GET BRANCH INFO (mode 'G', prefill on branch select)
========================================================= */

export const getBranchInfo = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const { CoID, lkpBranch } = req.query;

    if (!CoID) {
      return res.status(400).json({
        success: false,
        message: "Company ID is required",
      });
    }

    if (!lkpBranch) {
      return res.status(400).json({
        success: false,
        message: "Branch is required",
      });
    }

    const data = await getBranchInfoService(
      String(CoID),
      String(lkpBranch)
    );

    if (!data) {
      return res.status(404).json({
        success: false,
        message: `Branch '${lkpBranch}' not found`,
      });
    }

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error: unknown) {
    console.error("getBranchInfo error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load branch info",
      error:
        error instanceof Error
          ? error.message
          : String(error),
    });
  }
};

/* =========================================================
   SAVE BRANCH INFO (mode 'M')
========================================================= */

export const saveBranchInfo = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const {
      CoID,
      userId,
      lkpBranch,
      ...payload
    }: {
      CoID: string;
      userId: string;
      lkpBranch: string;
    } & BranchInfoPayload = req.body;

    if (!CoID) {
      return res.status(400).json({
        success: false,
        message: "Company ID is required",
      });
    }

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    if (!lkpBranch) {
      return res.status(400).json({
        success: false,
        message: "Branch is required",
      });
    }

    const branchAccessResult = await pool.query(
      `SELECT dbo.userbranches($1, $2, $3) AS "hasAccess"`,
      [CoID, lkpBranch, userId]
    );

    if (!branchAccessResult.rows[0]?.hasAccess) {
      return res.status(403).json({
        success: false,
        message: `User '${userId}' does not have access to Branch '${lkpBranch}'`,
      });
    }

    await saveBranchInfoService(CoID, lkpBranch, payload, userId);

    return res.status(200).json({
      success: true,
      message: "Branch info saved successfully",
    });
  } catch (error: unknown) {
    console.error("saveBranchInfo error:", error);

    return res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Branch info could not be saved",
    });
  }
};
