import { Request, Response } from "express";

import pool from "../../../DB/db.js";
import type { AuthenticatedRequest } from "../../../middleware/authMiddleware.js";
import { hasButtonRight } from "../../../utils/buttonRights.js";
import { UserAudit } from "../../../utils/UserAudit.js";
import { validateItemGroupPage } from "../../../validators/ItemGroupPageValidator.js";
import {
  getItemGroupPageService,
  saveItemGroupPageService,
  deleteItemGroupPageService,
} from "../../../services/Purchase/Setup/itemGroupPageService.js";
import {
  mapKeys,
  mapRows,
  itemGroupKeys,
  vatSlabListKeys,
} from "../../../utils/responseKeys.js";

// dbo.tblmenu fmenuid of the Item Group page
const MENU_ID = "010202";

/* =========================================================
   GET VAT SLAB LIST (lkpVATSlab dropdown - the company's VAT
   slabs with their percentage, in position order)
========================================================= */

export const getVATSlabList = async (
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

    const result = await pool.query(
      `
      SELECT *
      FROM dbo.fillvatslab($1)
      `,
      [PstrCoID]
    );

    return res.status(200).json({
      success: true,
      data: mapRows(result.rows, vatSlabListKeys),
    });
  } catch (error: unknown) {
    console.error("getVATSlabList error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load VAT slab list",
      error:
        error instanceof Error
          ? error.message
          : String(error),
    });
  }
};


/* =========================================================
   GET ITEM GROUP (mode 'G1') - prefills the form when an
   Item Group ID is typed
========================================================= */

export const getItemGroup = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const { PstrCoID, txtItemGroupID } = req.query;

    if (!PstrCoID) {
      return res.status(400).json({
        success: false,
        message: "Company ID is required",
      });
    }

    if (!txtItemGroupID) {
      return res.status(400).json({
        success: false,
        message: "Item Group ID is required",
      });
    }

    const data = await getItemGroupPageService(
      String(PstrCoID),
      String(txtItemGroupID)
    );

    if (!data) {
      return res.status(404).json({
        success: false,
        message: `Item Group '${txtItemGroupID}' not found`,
      });
    }

    return res.status(200).json({
      success: true,
      data: mapKeys(data, itemGroupKeys),
    });
  } catch (error: unknown) {
    console.error("getItemGroup error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load item group",
      error:
        error instanceof Error
          ? error.message
          : String(error),
    });
  }
};

/* =========================================================
   SAVE ITEM GROUP (mode 'S' / 'M')
========================================================= */

export const saveItemGroup = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    const {
      PstrCoID,
      PstrYear,
      PstrUserID,
      txtItemGroupID,
      txtItemGroupName,
      lkpVATSlab,
    }: {
      PstrCoID: string;
      PstrYear: string;
      PstrUserID: string;
      txtItemGroupID: string;
      txtItemGroupName: string;
      lkpVATSlab: string;
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

    // validators/ItemGroupPageValidator.ts: idle user, then Item Group ID,
    // Item Group Name and VAT Slab - the first rule that fails stops the save
    const check = await validateItemGroupPage({
      PstrUserID,
      txtItemGroupID,
      txtItemGroupName,
      lkpVATSlab,
    });

    if (!check.valid) {
      return res.status(check.status).json({
        success: false,
        message: check.message,
        field: check.field,
      });
    }

    // Save (S) for a new Item Group ID, Modify (M) for one that already exists -
    // each needs its own button right. The user comes from the session
    // (authenticate), not from the request body.
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const existing = await getItemGroupPageService(
      PstrCoID,
      txtItemGroupID.trim()
    );
    const wantedMode = existing ? "M" : "S";

    if (!(await hasButtonRight(req.user, MENU_ID, wantedMode))) {
      return res.status(403).json({
        success: false,
        message: `You do not have permission to ${wantedMode === "M" ? "Modify" : "Save"}.`,
        field: "txtItemGroupID",
      });
    }

    const { mode, before, txtVATPer } = await saveItemGroupPageService(
      PstrCoID,
      txtItemGroupID.trim(),
      txtItemGroupName.trim(),
      lkpVATSlab,
      PstrUserID
    );

    // =====================================================
    // USER AUDIT (only after the save has actually succeeded)
    // =====================================================

    try {
      const afterText = `${txtItemGroupName.trim()}, VAT Slab ${lkpVATSlab} (${Number(txtVATPer)}%)`;

      const note =
        mode === "S"
          ? `Inserted item group '${txtItemGroupID.trim()}' (${afterText})`
          : `Updated item group '${txtItemGroupID.trim()}': ${before?.fitemgroupname ?? ""}, VAT Slab ${before?.fvatslab ?? ""} (${Number(before?.fvatper ?? 0)}%) -> ${afterText}`;

      await UserAudit(
        PstrCoID,
        PstrYear,
        null,
        null,
        txtItemGroupID.trim(),
        "Item Group",
        mode,
        PstrUserID,
        note
      );
    } catch (auditError: unknown) {
      // the item group is already saved - don't fail the request over an
      // audit-logging problem, just log it
      console.error("UserAudit error (saveItemGroup):", auditError);
    }

    return res.status(200).json({
      success: true,
      message:
        mode === "M"
          ? "Item group modified successfully"
          : "Item group saved successfully",
      mode,
    });
  } catch (error: unknown) {
    console.error("saveItemGroup error:", error);

    return res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Item group could not be saved",
    });
  }
};

/* =========================================================
   DELETE ITEM GROUP (mode 'D')
========================================================= */

export const deleteItemGroup = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    const {
      PstrCoID,
      PstrYear,
      PstrUserID,
      txtItemGroupID,
    }: {
      PstrCoID: string;
      PstrYear: string;
      PstrUserID: string;
      txtItemGroupID: string;
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

    if (!txtItemGroupID) {
      return res.status(400).json({
        success: false,
        message: "Item Group ID is required",
      });
    }

    // the Delete button right, checked for the logged-in user (session)
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!(await hasButtonRight(req.user, MENU_ID, "D"))) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to Delete.",
      });
    }

    const existing = await getItemGroupPageService(PstrCoID, txtItemGroupID);

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: `Item Group '${txtItemGroupID}' not found`,
      });
    }

    // a group that items still use cannot go - they would be left pointing
    // at a group that no longer exists
    const used = await pool.query(
      `SELECT count(*)::int AS "itemCount" FROM dbo.tblitemhd WHERE fcoid = $1 AND fitemgroupid = $2`,
      [PstrCoID, txtItemGroupID]
    );

    const itemCount: number = used.rows[0]?.itemCount ?? 0;

    if (itemCount > 0) {
      return res.status(409).json({
        success: false,
        message: `Item Group '${txtItemGroupID}' is used by ${itemCount} item${itemCount === 1 ? "" : "s"} and cannot be deleted`,
      });
    }

    await deleteItemGroupPageService(PstrCoID, txtItemGroupID);

    // =====================================================
    // USER AUDIT (only after the delete has actually succeeded)
    // =====================================================

    try {
      await UserAudit(
        PstrCoID,
        PstrYear,
        null,
        null,
        txtItemGroupID,
        "Item Group",
        "D",
        PstrUserID,
        `Deleted item group '${txtItemGroupID}' (${existing.fitemgroupname ?? txtItemGroupID})`
      );
    } catch (auditError: unknown) {
      // the item group is already deleted - don't fail the request over an
      // audit-logging problem, just log it
      console.error("UserAudit error (deleteItemGroup):", auditError);
    }

    return res.status(200).json({
      success: true,
      message: "Item group deleted successfully",
    });
  } catch (error: unknown) {
    console.error("deleteItemGroup error:", error);

    return res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Item group could not be deleted",
    });
  }
};
