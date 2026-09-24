import { Request, Response } from "express";
import pool from "../DB/db.js";
import { AuthenticatedRequest } from "../middleware/authMiddleware.js";

interface MenuRow {
  fmenuid: string;
  fmenuname: string;
  fmenucaption: string;
  fmenubuttons: string;
  fuserbuttons?: string;
}

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
       RU → ONLY PERMITTED MENUS, PLUS THEIR ANCESTOR
       FOLDERS SO THE FRONTEND CAN ALWAYS BUILD A FULL TREE

       fmenuid encodes hierarchy 2 chars/level (e.g.
       "010101" -> parents "0101", "01"). If
       tbluserpermission only grants a leaf-level id, the
       folder rows for its parents would otherwise be
       missing from this response and the sidebar couldn't
       render their captions. So: fetch what's permitted,
       work out every ancestor id, and backfill any that
       weren't already included.
    ===================================================== */

    if (userType === "RU") {
      const permittedResult = await pool.query(
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
        `,
        [userId, companyId],
      );

      const permittedRows: MenuRow[] = permittedResult.rows;

      const permittedIds = new Set(permittedRows.map((row) => row.fmenuid));
      const ancestorIds = new Set<string>();

      permittedRows.forEach((row) => {
        let id = row.fmenuid;

        while (id.length > 2) {
          id = id.slice(0, -2);
          ancestorIds.add(id);
        }
      });

      const missingAncestorIds = [...ancestorIds].filter(
        (id) => !permittedIds.has(id),
      );

      let ancestorRows: MenuRow[] = [];

      if (missingAncestorIds.length) {
        const ancestorResult = await pool.query(
          `
          SELECT
            fmenuid,
            fmenuname,
            fmenucaption,
            fmenubuttons
          FROM dbo.tblmenu
          WHERE fmenuid = ANY($1::varchar[])
          `,
          [missingAncestorIds],
        );

        ancestorRows = ancestorResult.rows;
      }

      const allRows = [...permittedRows, ...ancestorRows].sort((a, b) =>
        a.fmenuid.localeCompare(b.fmenuid),
      );

      return res.status(200).json({
        success: true,
        data: allRows,
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
