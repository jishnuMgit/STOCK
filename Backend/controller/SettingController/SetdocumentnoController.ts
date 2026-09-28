import { Request, Response } from "express";

import pool from "../../DB/db.js";
import {
  getDocumentNoListService,
  saveDocumentNoListService,
  deleteDocumentNoRowService,
  type DocumentNoRowPayload,
} from "../../services/SettingServices/setdocumentnoService.js";

/* =========================================================
   GET YEAR LIST (lkpYear dropdown)
========================================================= */

export const getYearList = async (
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
      FROM dbo.fillyear($1)
      `,
      [CoID]
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
   GET MODULE LIST (lkpModule dropdown)
========================================================= */

export const getModuleList = async (
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
      FROM dbo.fillmodule($1)
      `,
      [CoID]
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
    const { CoID, lkpModule } = req.query;

    if (!CoID) {
      return res.status(400).json({
        success: false,
        message: "Company ID is required",
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
      [CoID, lkpModule]
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
    const { CoID, lkpYear, lkpBranch, lkpModule } = req.query;

    if (!CoID) {
      return res.status(400).json({
        success: false,
        message: "Company ID is required",
      });
    }

    if (!lkpYear || !lkpBranch || !lkpModule) {
      return res.status(400).json({
        success: false,
        message: "Year, Branch and Module are required",
      });
    }

    const data = await getDocumentNoListService(
      String(CoID),
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
    const PstrUserID = process.env.PstrUserID || "ADMIN";

    const {
      CoID,
      lkpYear,
      lkpBranch,
      lkpModule,
      userId,
      rows,
    }: {
      CoID: string;
      lkpYear: string;
      lkpBranch: string;
      lkpModule: string;
      userId: string;
      rows: DocumentNoRowPayload[];
    } = req.body;

    if (!CoID) {
      return res.status(400).json({
        success: false,
        message: "Company ID is required",
      });
    }

    if (!lkpYear || !lkpBranch || !lkpModule) {
      return res.status(400).json({
        success: false,
        message: "Year, Branch and Module are required",
      });
    }

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: "There is no information for saving.",
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

    await saveDocumentNoListService(
      CoID,
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
    const {
      CoID,
      lkpYear,
      lkpBranch,
      lkpModule,
      lkpDocument,
      userId,
    }: {
      CoID: string;
      lkpYear: string;
      lkpBranch: string;
      lkpModule: string;
      lkpDocument: string;
      userId: string;
    } = req.body;

    if (!CoID) {
      return res.status(400).json({
        success: false,
        message: "Company ID is required",
      });
    }

    if (!lkpYear || !lkpBranch || !lkpModule || !lkpDocument) {
      return res.status(400).json({
        success: false,
        message: "Year, Branch, Module and Document Type are required",
      });
    }

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
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

    await deleteDocumentNoRowService(
      CoID,
      lkpYear,
      lkpBranch,
      lkpModule,
      lkpDocument
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

/* =========================================================
   GET DEFAULT BRANCH (lkpBranch pre-select, live lookup)
========================================================= */

export const getDefaultBranch = async (
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
      `SELECT dbo.getuserdefbranch($1, $2) AS "defBranch"`,
      [CoID, userId]
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
