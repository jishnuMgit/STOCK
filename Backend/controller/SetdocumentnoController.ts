import { Request, Response } from "express";

import pool from "../DB/db.js";
import { AuthenticatedRequest } from "../middleware/authMiddleware.js";
import {
  getDocumentNoListService,
  saveDocumentNoListService,
  deleteDocumentNoRowService,
  type DocumentNoRowPayload,
} from "../services/setdocumentnoService.js";

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
  req: AuthenticatedRequest,
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

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const { userId, userType } = req.user;

    /* =====================================================
       AU → ALL BRANCHES
       RU → ONLY PERMITTED BRANCHES
    ===================================================== */

    const result =
      userType === "AU"
        ? await pool.query(
            `SELECT * FROM dbo.fillbranch($1)`,
            [PstrCoID]
          )
        : await pool.query(
            `SELECT * FROM dbo.fillbranchbyuser($1, $2)`,
            [PstrCoID, userId]
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

/* =========================================================
   GET DOCUMENT LIST (grid's Document dropdown, per module)
========================================================= */

export const getDocumentList = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const PstrCoID = process.env.PstrCoID;
    const { lkpModule } = req.query;

    if (!PstrCoID) {
      return res.status(400).json({
        success: false,
        message: "Company ID is not configured",
      });
    }

    if (!lkpModule) {
      return res.status(400).json({
        success: false,
        message: "Module is required",
      });
    }

    const result = await pool.query(
      `
      SELECT *
      FROM dbo.filldocument($1, $2)
      `,
      [PstrCoID, lkpModule]
    );

    return res.status(200).json({
      success: true,
      data: result.rows,
    });
  } catch (error: unknown) {
    console.error("getDocumentList error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load document list",
      error:
        error instanceof Error
          ? error.message
          : String(error),
    });
  }
};

/* =========================================================
   GET DOCUMENT NO LIST (grid data, mode 'G')
========================================================= */

export const getDocumentNoList = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const PstrCoID = process.env.PstrCoID;
    const { lkpYear, lkpBranch, lkpModule } = req.query;

    if (!PstrCoID) {
      return res.status(400).json({
        success: false,
        message: "Company ID is not configured",
      });
    }

    if (!lkpYear || !lkpBranch || !lkpModule) {
      return res.status(400).json({
        success: false,
        message: "Year, Branch and Module are required",
      });
    }

    const data = await getDocumentNoListService(
      PstrCoID,
      String(lkpYear),
      String(lkpBranch),
      String(lkpModule)
    );

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error: unknown) {
    console.error("getDocumentNoList error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load document number list",
      error:
        error instanceof Error
          ? error.message
          : String(error),
    });
  }
};

/* =========================================================
   SAVE DOCUMENT NO LIST (mode 'S' or 'M' per row)
========================================================= */

export const saveDocumentNo = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const PstrCoID = process.env.PstrCoID;
    const PstrUserID = process.env.PstrUserID || "ADMIN";

    const {
      lkpYear,
      lkpBranch,
      lkpModule,
      rows,
    }: {
      lkpYear: string;
      lkpBranch: string;
      lkpModule: string;
      rows: DocumentNoRowPayload[];
    } = req.body;

    if (!PstrCoID) {
      return res.status(400).json({
        success: false,
        message: "Company ID is not configured",
      });
    }

    if (!lkpYear || !lkpBranch || !lkpModule) {
      return res.status(400).json({
        success: false,
        message: "Year, Branch and Module are required",
      });
    }

    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: "There is no information for saving.",
      });
    }

    await saveDocumentNoListService(
      PstrCoID,
      lkpYear,
      lkpBranch,
      lkpModule,
      PstrUserID,
      rows
    );

    return res.status(200).json({
      success: true,
      message: "Document numbering saved successfully",
    });
  } catch (error: unknown) {
    console.error("saveDocumentNo error:", error);

    return res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Document numbering could not be saved",
    });
  }
};

/* =========================================================
   DELETE ONE DOCUMENT NO ROW (mode 'D1')
========================================================= */

export const deleteDocumentNoRow = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const PstrCoID = process.env.PstrCoID;

    const {
      lkpYear,
      lkpBranch,
      lkpModule,
      docType,
    }: {
      lkpYear: string;
      lkpBranch: string;
      lkpModule: string;
      docType: string;
    } = req.body;

    if (!PstrCoID) {
      return res.status(400).json({
        success: false,
        message: "Company ID is not configured",
      });
    }

    if (!lkpYear || !lkpBranch || !lkpModule || !docType) {
      return res.status(400).json({
        success: false,
        message: "Year, Branch, Module and Document Type are required",
      });
    }

    await deleteDocumentNoRowService(
      PstrCoID,
      lkpYear,
      lkpBranch,
      lkpModule,
      docType
    );

    return res.status(200).json({
      success: true,
      message: "Document numbering row deleted successfully",
    });
  } catch (error: unknown) {
    console.error("deleteDocumentNoRow error:", error);

    return res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Document numbering row could not be deleted",
    });
  }
};

