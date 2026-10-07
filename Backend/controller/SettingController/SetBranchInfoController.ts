import { Request, Response } from "express";

import pool from "../../DB/db.js";
import {
  getBranchInfoService,
  saveBranchInfoService,
  type BranchInfoPayload,
} from "../../services/SettingServices/setBranchInfoService.js";
import { mapKeys, mapRows, branchListKeys, branchInfoKeys } from "../../utils/responseKeys.js";
import { validateSetBranchInfo } from "../../validators/SetBranchInfoValidator.js";

/* =========================================================
   GET BRANCH LIST (lkpBranch dropdown, filtered by
   dbo.userbranches — same as SetDocumentNo / ItemPage)
========================================================= */

export const getBranchList = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const { PstrCoID, PstrUserID } = req.query;

    if (!PstrCoID) {
      return res.status(400).json({
        success: false,
        message: "Company ID is required",
      });
    }

    if (!PstrUserID) {
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
        AND dbo.userbranches($1, $2, fbrid)
      ORDER BY fpositionno, fbrid
      `,
      [PstrCoID, PstrUserID]
    );

    return res.status(200).json({
      success: true,
      data: mapRows(result.rows, branchListKeys),
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
   GET DEFAULT BRANCH (lkpBranch pre-select, live lookup —
   same as SetDocumentNo)
========================================================= */

export const getDefaultBranch = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const { PstrCoID, PstrUserID } = req.query;

    if (!PstrCoID) {
      return res.status(400).json({
        success: false,
        message: "Company ID is required",
      });
    }

    if (!PstrUserID) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    const result = await pool.query(
      `SELECT dbo.getuserdefbranch($1, $2) AS "defBranch"`,
      [PstrCoID, PstrUserID]
    );

    return res.status(200).json({
      success: true,
      data: result.rows[0]?.defBranch || "",
    });
  } catch (error: unknown) {
    console.error("getDefaultBranch error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load default branch",
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
    const { PstrCoID, lkpBranch } = req.query;

    if (!PstrCoID) {
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
      String(PstrCoID),
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
      data: mapKeys(data, branchInfoKeys),
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
      PstrCoID,
      PstrUserID,
      lkpBranch,
      ...payload
    }: {
      PstrCoID: string;
      PstrUserID: string;
      lkpBranch: string;
    } & BranchInfoPayload = req.body;

    if (!PstrCoID) {
      return res.status(400).json({
        success: false,
        message: "Company ID is required",
      });
    }

    if (!PstrUserID) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    // validators/SetBranchInfoValidator.ts: idle user, branch, and every
    // mandatory English / Arabic box - the first rule that fails stops the save
    const check = await validateSetBranchInfo({
      lkpBranch,
      PstrUserID,
      ...payload,
    });

    if (!check.valid) {
      return res.status(check.status).json({
        success: false,
        message: check.message,
        field: check.field,
      });
    }

    const branchAccessResult = await pool.query(
      `SELECT dbo.userbranches($1, $2, $3) AS "hasAccess"`,
      [PstrCoID, PstrUserID, lkpBranch]
    );

    if (!branchAccessResult.rows[0]?.hasAccess) {
      return res.status(403).json({
        success: false,
        message: `User '${PstrUserID}' does not have access to Branch '${lkpBranch}'`,
      });
    }

    await saveBranchInfoService(PstrCoID, lkpBranch, payload, PstrUserID);

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
