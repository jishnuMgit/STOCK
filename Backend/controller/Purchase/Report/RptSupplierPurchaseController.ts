import { Response } from "express";

import type { AuthenticatedRequest } from "../../../middleware/authMiddleware.js";
import {
  getBranches,
  getDefaultBranch,
  getSuppliers,
} from "../../../services/Purchase/Report/rptSupplierPurchaseService.js";

// The Supplier Purchase report (Purchase > Report > Supplier Purchase). The logged-in company and user come
// from the SESSION (authenticate), never from the request.

/* =========================================================
   GET /RptSupplierPurchase/lookups  -> what the screen needs to open
   branches            the branches the logged-in user has a right to
   lkpDefaultBranch    the user's default branch ("" when none is set)
   suppliers           the suppliers of the company (Supplier ID and Supplier Name boxes)
========================================================= */

export const getLookups = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    const { CoID: PstrCoID, userId: PstrUserID } = req.user;

    const [branches, defaultBranch, suppliers] = await Promise.all([
      getBranches(PstrCoID, PstrUserID),
      getDefaultBranch(PstrCoID, PstrUserID),
      getSuppliers(PstrCoID),
    ]);

    return res.status(200).json({
      success: true,
      branches: branches.map((b) => ({ lkpBranch: b.brId, txtBranchName: b.brName })),
      lkpDefaultBranch: defaultBranch,
      suppliers: suppliers.map((s) => ({
        lkpSupplierID: s.supplierId,
        txtSupplierName: s.supplierName,
      })),
    });
  } catch (error: unknown) {
    console.error("rptSupplierPurchase getLookups error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load the lookups",
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
