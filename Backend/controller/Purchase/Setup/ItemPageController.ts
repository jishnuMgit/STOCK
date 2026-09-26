import { Request, Response } from "express";

import pool from "../../../DB/db.js";
import {
  getItemPageService,
  saveItemPageService,
  deleteItemService,
  deleteItemBranchRowService,
  type ItemBranchRowPayload,
} from "../../../services/Purchase/Setup/itemPageService.js";

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

/* =========================================================
   GET BRANCH LIST (lkpBranch dropdown, filtered by
   dbo.userbranches — same as SetDocumentNo)
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
   GET ITEM (header mode 'GHD', branch rows mode 'GTL')
   — used by the Find/Search button to prefill the form
========================================================= */

export const getItem = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const { CoID, txtItemID } = req.query;

    if (!CoID) {
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
      String(CoID),
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
      CoID,
      userId,
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
      CoID: string;
      userId: string;
      txtItemID: string;
      txtItemName: string;
      txtItemDescription: string | null;
      lkpUnit: string;
      txtPacking: string | number;
      txtCBM: string | number;
      lkpItemGroupID: string;
      lkpSupplierID: string | null;
      txtSupplierItemID: string;
      txtReorderLevel: string | number;
      txtReorderQty: string | number;
      rows: ItemBranchRowPayload[];
    } = req.body;

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

    if (!txtItemID || !txtItemName || !lkpUnit || !lkpItemGroupID || !txtSupplierItemID) {
      return res.status(400).json({
        success: false,
        message: "Item ID, Item Name, Unit, Item Group and Supplier Item ID are required",
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
      CoID,
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
      userId,
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
    const { CoID, userId, txtItemID } = req.body;

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

    if (!txtItemID) {
      return res.status(400).json({
        success: false,
        message: "Item ID is required",
      });
    }

    await deleteItemService(CoID, txtItemID);

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
    const { CoID, userId, txtItemID, lkpBranch } = req.body;

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

    if (!txtItemID || !lkpBranch) {
      return res.status(400).json({
        success: false,
        message: "Item ID and Branch are required",
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

    await deleteItemBranchRowService(CoID, txtItemID, lkpBranch);

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
