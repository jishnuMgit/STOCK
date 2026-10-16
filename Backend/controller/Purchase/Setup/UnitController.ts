import { Request, Response } from "express";

import type { AuthenticatedRequest } from "../../../middleware/authMiddleware.js";
import { hasButtonRight } from "../../../utils/buttonRights.js";
import { UserAudit } from "../../../utils/UserAudit.js";
import { validateUnitPage } from "../../../validators/UnitPageValidator.js";
import {
  getUnitPageService,
  saveUnitPageService,
  haveUnitTransService,
  type UnitRowPayload,
  type UnitDeletedRowPayload,
} from "../../../services/Purchase/Setup/unitPageService.js";
import { mapRows, unitGridKeys } from "../../../utils/responseKeys.js";

// dbo.tblmenu fmenuid of the Unit page
const MENU_ID = "010203";

/* =========================================================
   GET UNIT LIST (the grid rows - the company's units, A to Z)
========================================================= */

export const getUnitList = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const { PstrCoID } = req.query;

    if (!PstrCoID) {
      return res.status(400).json({
        success: false,
        message: "Company ID is required",
      });
    }

    const data = await getUnitPageService(String(PstrCoID));

    return res.status(200).json({
      success: true,
      data: mapRows(data, unitGridKeys),
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
   HAVE TRANS - "has a transaction already used this unit?" (the old
   HaveTrans). The page asks it when the X is clicked on a saved unit.
========================================================= */

export const haveUnitTrans = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const { PstrCoID, txtOriginalUnit } = req.query;

    if (!PstrCoID) {
      return res.status(400).json({
        success: false,
        message: "Company ID is required",
      });
    }

    if (!txtOriginalUnit) {
      return res.status(400).json({
        success: false,
        message: "Unit is required",
      });
    }

    return res.status(200).json({
      success: true,
      data: await haveUnitTransService(
        String(PstrCoID),
        String(txtOriginalUnit)
      ),
    });
  } catch (error: unknown) {
    console.error("haveUnitTrans error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to check the unit",
      error:
        error instanceof Error
          ? error.message
          : String(error),
    });
  }
};

/* =========================================================
   SAVE UNITS (the Modify button)
   mode 'D' units removed from the grid, 'M' renamed, 'S' new
========================================================= */

export const saveUnit = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    const {
      PstrCoID,
      PstrYear,
      PstrUserID,
      rows = [],
      deletedRows = [],
    }: {
      PstrCoID: string;
      PstrYear: string;
      PstrUserID: string;
      rows: (UnitRowPayload & { txtGridRow?: number })[];
      deletedRows: UnitDeletedRowPayload[];
    } = req.body;

    if (!PstrCoID) {
      return res.status(400).json({
        success: false,
        message: "Company ID is required",
      });
    }

    if (!PstrYear) {
      return res.status(400).json({
        success: false,
        message: "Year is required",
      });
    }

    if (!PstrUserID) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    // validators/UnitPageValidator.ts: idle user, something to save, then every
    // unit filled, at most 8 characters and not entered twice - the first
    // rule that fails stops the save
    const check = await validateUnitPage({ PstrUserID, rows, deletedRows });

    if (!check.valid) {
      return res.status(check.status).json({
        success: false,
        message: check.message,
        field: check.field,
      });
    }

    // Save (S) when the company has no units yet, Modify (M) when it already
    // has - each needs its own button right. The user comes from the session
    // (authenticate), not from the request body.
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const wantedMode =
      (await getUnitPageService(PstrCoID)).length > 0 ? "M" : "S";

    if (!(await hasButtonRight(req.user, MENU_ID, wantedMode))) {
      return res.status(403).json({
        success: false,
        message: `You do not have permission to ${wantedMode === "M" ? "Modify" : "Save"}.`,
        field: "txtUnit-0",
      });
    }

    // removing a unit: only an Admin User (type AU) may, whatever rights a
    // Restricted User was given; the Delete right is checked too (the old
    // CanDeleteGrid), and a unit that transactions already use cannot go
    // (the old HaveTrans)
    if (deletedRows.length > 0) {
      if (req.user.userType !== "AU") {
        return res.status(403).json({
          success: false,
          message: "Only an Admin User can delete units.",
          field: "txtUnit-0",
        });
      }

      if (!(await hasButtonRight(req.user, MENU_ID, "D"))) {
        return res.status(403).json({
          success: false,
          message: "You do not have permission to Delete.",
          field: "txtUnit-0",
        });
      }

      for (const row of deletedRows) {
        if (await haveUnitTransService(PstrCoID, row.txtOriginalUnit)) {
          return res.status(409).json({
            success: false,
            message: `You can't delete. Transactions already entered with this Unit '${row.txtOriginalUnit}'`,
            field: "txtUnit-0",
          });
        }
      }
    }

    // a unit that transactions already use cannot be renamed (the old
    // HaveTrans check on the OLD value)
    for (const [position, row] of rows.entries()) {
      const txtOriginalUnit = (row.txtOriginalUnit ?? "").trim();

      if (txtOriginalUnit !== "" && txtOriginalUnit !== row.txtUnit.trim()) {
        if (await haveUnitTransService(PstrCoID, txtOriginalUnit)) {
          return res.status(409).json({
            success: false,
            message: `You can't Modify. Transactions already entered with this Unit '${txtOriginalUnit}'`,
            field: `txtUnit-${Number.isInteger(Number(row.txtGridRow)) ? row.txtGridRow : position}`,
          });
        }
      }
    }

    const result = await saveUnitPageService(
      PstrCoID,
      rows.map((row) => ({
        txtUnit: row.txtUnit,
        txtOriginalUnit: row.txtOriginalUnit ?? null,
      })),
      deletedRows,
      PstrUserID
    );

    if (!result.changed) {
      return res.status(200).json({
        success: true,
        message: "No changes to save",
      });
    }

    // =====================================================
    // USER AUDIT (only after the save has actually succeeded)
    // the note lists every added / renamed / deleted unit
    // =====================================================

    try {
      const parts: string[] = [
        ...result.inserted.map((unit) => `Added '${unit}'`),
        ...result.renamed.map(
          ({ before, after }) => `Renamed '${before}' -> '${after}'`
        ),
        ...result.deleted.map((unit) => `Deleted '${unit}'`),
      ];

      await UserAudit(
        PstrCoID,
        PstrYear,
        null,
        null,
        null,
        "Unit",
        // only new units: S - only removals: D - anything else: M
        result.renamed.length === 0 && result.deleted.length === 0
          ? "S"
          : result.inserted.length === 0 && result.renamed.length === 0
            ? "D"
            : "M",
        PstrUserID,
        `Unit: ${parts.join("; ")}`
      );
    } catch (auditError: unknown) {
      // the units are already saved - don't fail the request over an
      // audit-logging problem, just log it
      console.error("UserAudit error (saveUnit):", auditError);
    }

    return res.status(200).json({
      success: true,
      message:
        wantedMode === "M"
          ? "Unit modified successfully"
          : "Unit saved successfully",
      mode: wantedMode,
    });
  } catch (error: unknown) {
    console.error("saveUnit error:", error);

    return res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unit could not be saved",
    });
  }
};
