import { Request, Response } from "express";
import pool from "../DB/db.js";
import { AuthenticatedRequest } from "../middleware/authMiddleware.js";

export const getMenus = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<Response> => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const { userId, userType } = req.user;

    const { companyId } = req.query;

    /* =====================================================
       VALIDATION
    ===================================================== */

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User is not authenticated",
      });
    }

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: "Company ID is required",
      });
    }

    /* =====================================================
       ADMIN USER
       AU → ACCESS TO ALL MENUS
    ===================================================== */

    if (userType === "AU") {
      const menuResult = await pool.query(
        `
        SELECT
          fmenuid,
          fmenuname,
          fmenucaption,
          fmenubuttons
        FROM dbo.tblmenu
        ORDER BY fmenuid
        `,
      );

      return res.status(200).json({
        success: true,
        data: menuResult.rows,
      });
    }

    /* =====================================================
       RESTRICTED USER
       RU → ONLY PERMITTED MENUS
    ===================================================== */

    if (userType === "RU") {
      const menuResult = await pool.query(
        `
        SELECT
          m.fmenuid,
          m.fmenuname,
          m.fmenucaption,
          m.fmenubuttons,
          p.fuserbuttons
        FROM dbo.tblmenu m
        INNER JOIN dbo.tbluserpermission p
          ON m.fmenuid = p.fmenuid
        WHERE p.fuserid = $1
          AND p.fcoid = $2
        ORDER BY m.fmenuid
        `,
        [userId, companyId],
      );

      return res.status(200).json({
        success: true,
        data: menuResult.rows,
      });
    }

    /* =====================================================
       INVALID USER TYPE
    ===================================================== */

    return res.status(403).json({
      success: false,
      message: "Invalid user type",
    });
  } catch (error: unknown) {
    console.error("Get menus error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load menus",
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
