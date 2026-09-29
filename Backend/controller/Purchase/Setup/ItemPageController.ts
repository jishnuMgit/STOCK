import { Request, Response } from "express";

import pool from "../../../DB/db.js";
import {
  getItemPageService,
  saveItemPageService,
  deleteItemService,
  deleteItemBranchRowService,
  type ItemBranchRowPayload,
} from "../../../services/Purchase/Setup/itemPageService.js";
import { UserAudit } from "../../../utils/UserAudit.js";

/* =========================================================
   GET UNIT LIST (lkpUnit dropdown)
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

    const result = await pool.query(
      `
      SELECT *
      FROM dbo.fillunit($1)
      `,
      [PstrCoID]
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
      FROM dbo.fillitemgroup($1)
      `,
      [PstrCoID]
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
      FROM dbo.fillsupplier($1)
      `,
      [PstrCoID]
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

/* =========================================================
   GET BRANCH LIST (lkpBranch dropdown, filtered by
   dbo.userbranches — same as SetDocumentNo)
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
   GET ITEM (header mode 'GHD', branch rows mode 'GTL')
   — used by the Find/Search button to prefill the form
========================================================= */

export const getItem = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const { PstrCoID, txtItemID } = req.query;

    if (!PstrCoID) {
      return res.status(400).json({
        success: false,
        message: "Company ID is required",
      });
    }

    if (!txtItemID) {
      return res.status(400).json({
        success: false,
        message: "Item ID is required",
      });
    }

    const { header, rows } = await getItemPageService(
      String(PstrCoID),
      String(txtItemID)
    );

    if (!header) {
      return res.status(404).json({
        success: false,
        message: `Item '${txtItemID}' not found`,
      });
    }

    return res.status(200).json({
      success: true,
      header,
      rows,
    });
  } catch (error: unknown) {
    console.error("getItem error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load item",
      error:
        error instanceof Error
          ? error.message
          : String(error),
    });
  }
};

/* =========================================================
   SAVE ITEM (header mode 'SHD'/'MHD', per-row 'STL'/'MTL')
========================================================= */

export const saveItem = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const {
      PstrCoID,
      PstrUserID,
      txtItemID,
      txtItemName,
      txtItemDescription,
      lkpUnit,
      txtPacking,
      txtCBM,
      lkpItemGroupID,
      lkpSupplierID,
      txtSupplierItemID,
      txtReorderLevel,
      txtReorderQty,
      rows,
    }: {
      PstrCoID: string;
      PstrUserID: string;
      txtItemID: string;
      txtItemName: string;
      txtItemDescription: string | null;
      lkpUnit: string;
      txtPacking: string | number;
      txtCBM: string | number;
      lkpItemGroupID: string;
      lkpSupplierID: string;
      txtSupplierItemID: string;
      txtReorderLevel: string | number;
      txtReorderQty: string | number;
      rows: ItemBranchRowPayload[];
    } = req.body;

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

    if (!txtItemID || !txtItemName || !lkpUnit || !lkpItemGroupID || !lkpSupplierID || !txtSupplierItemID) {
      return res.status(400).json({
        success: false,
        message: "Item ID, Item Name, Unit, Item Group, Supplier and Supplier Item ID are required",
      });
    }

    const branchRows = (rows || []).filter((row) => row.lkpBranch);

    if (branchRows.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one Branch row is required",
      });
    }

    await saveItemPageService(
      PstrCoID,
      txtItemID,
      txtItemName,
      txtItemDescription || null,
      lkpUnit,
      Number(txtPacking) || 0,
      Number(txtCBM) || 0,
      lkpItemGroupID,
      lkpSupplierID || null,
      txtSupplierItemID,
      Number(txtReorderLevel) || 0,
      Number(txtReorderQty) || 0,
      PstrUserID,
      branchRows
    );

    return res.status(200).json({
      success: true,
      message: "Item saved successfully",
    });
  } catch (error: unknown) {
    console.error("saveItem error:", error);

    return res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Item could not be saved",
    });
  }
};

/* =========================================================
   DELETE ITEM (mode 'D' — whole item)
========================================================= */

export const deleteItem = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const {
      PstrCoID,
      PstrYear,
      PstrUserID,
      txtItemID,
      txtItemName,
    }: {
      PstrCoID: string;
      PstrYear: string;
      PstrUserID: string;
      txtItemID: string;
      txtItemName: string;
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

    if (!txtItemID) {
      return res.status(400).json({
        success: false,
        message: "Item ID is required",
      });
    }

    await deleteItemService(PstrCoID, txtItemID);

    // =====================================================
    // USER AUDIT (only after the delete has actually succeeded)
    // Whole-item delete isn't branch-specific, so fbrid is null.
    // =====================================================

    try {
      await UserAudit(
        PstrCoID,
        PstrYear,
        null,
        null,
        txtItemID,
        "Item Page",
        "D",
        PstrUserID,
        `Deleted item '${txtItemID}' (${txtItemName || txtItemID})`
      );
    } catch (auditError: unknown) {
      // the item is already deleted - don't fail the request over
      // an audit-logging problem, just log it
      console.error("UserAudit error (deleteItem):", auditError);
    }

    return res.status(200).json({
      success: true,
      message: "Item deleted successfully",
    });
  } catch (error: unknown) {
    console.error("deleteItem error:", error);

    return res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Item could not be deleted",
    });
  }
};

/* =========================================================
   DELETE ONE BRANCH ROW (mode 'D1', guarded by
   dbo.userbranches — same pattern as SetDocumentNo)
========================================================= */

export const deleteItemBranchRow = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const {
      PstrCoID,
      PstrYear,
      PstrUserID,
      txtItemID,
      txtItemName,
      lkpBranch,
      branchName,
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

    if (!txtItemID || !lkpBranch) {
      return res.status(400).json({
        success: false,
        message: "Item ID and Branch are required",
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

    await deleteItemBranchRowService(PstrCoID, txtItemID, lkpBranch);

    // =====================================================
    // USER AUDIT (only after the delete has actually succeeded)
    // =====================================================

    try {
      await UserAudit(
        PstrCoID,
        PstrYear,
        lkpBranch,
        null,
        txtItemID,
        "Item Page",
        "D",
        PstrUserID,
        `Deleted item '${txtItemID}' (${txtItemName || txtItemID}) from branch '${branchName || lkpBranch}'`
      );
    } catch (auditError: unknown) {
      // the branch row is already deleted - don't fail the request over
      // an audit-logging problem, just log it
      console.error("UserAudit error (deleteItemBranchRow):", auditError);
    }

    return res.status(200).json({
      success: true,
      message: "Branch row deleted successfully",
    });
  } catch (error: unknown) {
    console.error("deleteItemBranchRow error:", error);

    return res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Branch row could not be deleted",
    });
  }
};
