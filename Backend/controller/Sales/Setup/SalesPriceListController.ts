import { Response } from "express";

import type { AuthenticatedRequest } from "../../../middleware/authMiddleware.js";
import { hasButtonRight } from "../../../utils/buttonRights.js";
import { UserAudit } from "../../../utils/UserAudit.js";
import {
  validateSalesPriceListLoad,
  validateSalesPriceListModify,
} from "../../../validators/SalesPriceListValidator.js";
import {
  getSalesPriceListBranchListService,
  getSalesPriceListDefaultBranchService,
  getSalesPriceListItemGroupListService,
  getSalesPriceListService,
  modifySalesPriceListService,
  buildSalesPriceListAuditNote,
  type SalesPriceListRowPayload,
} from "../../../services/Sales/Setup/salesPriceListService.js";
import {
  mapRows,
  branchListKeys,
  salesPriceListItemGroupKeys,
  salesPriceListGridKeys,
} from "../../../utils/responseKeys.js";

// dbo.tblmenu fmenuid of the Sales Price List page (its only button is M)
const MENU_ID = "020202";
const SCREEN_NAME = "Sales Price List";

const messageOf = (error: unknown, fallback: string): string =>
  error instanceof Error ? error.message : fallback;

const reject = (
  res: Response,
  status: number,
  message: string,
  field?: string
): Response =>
  res.status(status).json({
    success: false,
    message,
    ...(field ? { field } : {}),
  });

// the year is sent as digits (the login year)
const isYear = (value: unknown): boolean => /^\d+$/.test(String(value ?? ""));

/* =========================================================
   GET BRANCH LIST (the Branch box)
   Only the branches the logged-in user has a right to, plus the user's own
   default branch (lkpDefaultBranch) when it is one of them.
========================================================= */

export const getBranchList = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    const { PstrCoID } = req.query;

    if (!PstrCoID) {
      return reject(res, 400, "Company ID is required");
    }

    if (!req.user) {
      return reject(res, 401, "Authentication required");
    }

    const branches = await getSalesPriceListBranchListService(
      String(PstrCoID),
      req.user.userId
    );

    const defaultBranch = await getSalesPriceListDefaultBranchService(
      String(PstrCoID),
      req.user.userId
    );

    const lkpDefaultBranch = branches.some((row) => row.fbrid === defaultBranch)
      ? defaultBranch
      : "";

    return res.status(200).json({
      success: true,
      data: mapRows(branches, branchListKeys),
      lkpDefaultBranch,
    });
  } catch (error: unknown) {
    console.error("getBranchList (sales price list) error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load branch list",
      error: messageOf(error, String(error)),
    });
  }
};

/* =========================================================
   GET ITEM GROUP LIST (the Item Group ID / Name boxes)
========================================================= */

export const getItemGroupList = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    const { PstrCoID } = req.query;

    if (!PstrCoID) {
      return reject(res, 400, "Company ID is required");
    }

    if (!req.user) {
      return reject(res, 401, "Authentication required");
    }

    const data = await getSalesPriceListItemGroupListService(String(PstrCoID));

    return res.status(200).json({
      success: true,
      data: mapRows(data, salesPriceListItemGroupKeys),
    });
  } catch (error: unknown) {
    console.error("getItemGroupList (sales price list) error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load item group list",
      error: messageOf(error, String(error)),
    });
  }
};

/* =========================================================
   GET SALES PRICE LIST (the grid): the items of the branch, with the unit cost
   (the login year's stock card) and the Unit Price.
   rdgItemGroup: 0 = One Item Group, 1 = All Item Group
========================================================= */

export const getSalesPriceList = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    const { PstrCoID, PstrYear, lkpBranch, rdgItemGroup, lkpItemGroupID } =
      req.query;

    if (!PstrCoID) {
      return reject(res, 400, "Company ID is required");
    }

    if (!isYear(PstrYear)) {
      return reject(res, 400, "Year is required");
    }

    if (!req.user) {
      return reject(res, 401, "Authentication required");
    }

    // validators/SalesPriceListValidator.ts: idle user, branch (and the right
    // to it), item group
    const check = await validateSalesPriceListLoad({
      PstrCoID,
      PstrUserID: req.user.userId,
      lkpBranch,
      rdgItemGroup,
      lkpItemGroupID,
    });

    if (!check.valid) {
      return reject(res, check.status, check.message, check.field);
    }

    const data = await getSalesPriceListService(
      String(PstrCoID),
      String(PstrYear),
      String(lkpBranch).trim(),
      Number(rdgItemGroup),
      String(lkpItemGroupID ?? "").trim() || null
    );

    return res.status(200).json({
      success: true,
      data: mapRows(data, salesPriceListGridKeys),
    });
  } catch (error: unknown) {
    console.error("getSalesPriceList error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load the Sales Price List",
      error: messageOf(error, String(error)),
    });
  }
};

/* =========================================================
   MODIFY SALES PRICE LIST (the Modify button)
   The page sends only the changed rows. chkApplyToAllBranches sets the Unit
   Price of those items in every branch (MTLA), not only in the chosen one
   (MTL). The logged-in user comes from the SESSION, not from the request body.
========================================================= */

export const modifySalesPriceList = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    const {
      PstrCoID,
      PstrYear,
      lkpBranch,
      rdgItemGroup,
      lkpItemGroupID = "",
      chkApplyToAllBranches = false,
      rows = [],
    }: {
      PstrCoID: string;
      PstrYear: string;
      lkpBranch: string;
      rdgItemGroup: number;
      lkpItemGroupID?: string;
      chkApplyToAllBranches?: boolean;
      rows: SalesPriceListRowPayload[];
    } = req.body;

    if (!PstrCoID) {
      return reject(res, 400, "Company ID is required");
    }

    if (!isYear(PstrYear)) {
      return reject(res, 400, "Year is required");
    }

    if (!req.user) {
      return reject(res, 401, "Authentication required");
    }

    const PstrUserID = req.user.userId;

    // validators/SalesPriceListValidator.ts: idle user, branch (and the right
    // to it), item group, then every row - the first rule that fails stops it
    const check = await validateSalesPriceListModify({
      PstrCoID,
      PstrUserID,
      lkpBranch,
      rdgItemGroup,
      lkpItemGroupID,
      rows,
    });

    if (!check.valid) {
      return reject(res, check.status, check.message, check.field);
    }

    if (!(await hasButtonRight(req.user, MENU_ID, "M"))) {
      return reject(res, 403, "You do not have permission to Modify.", "btnModify");
    }

    // only the rows whose price really changed
    const changedRows = rows.filter(
      (row) => Number(row.txtUnitPrice) !== Number(row.txtOriginalUnitPrice)
    );

    if (changedRows.length === 0) {
      return reject(res, 400, "No Unit Price is changed", "btnModify");
    }

    const result = await modifySalesPriceListService({
      PstrCoID,
      PstrYear: String(PstrYear),
      PstrUserID,
      lkpBranch: String(lkpBranch).trim(),
      chkApplyToAllBranches: Boolean(chkApplyToAllBranches),
      rows: changedRows,
    });

    // =====================================================
    // USER AUDIT (only after the prices have actually changed): one row for
    // each changed item, as the old form. All Branches has no branch.
    // =====================================================

    for (const row of changedRows) {
      try {
        await UserAudit(
          PstrCoID,
          PstrYear,
          result.mode === "MTLA" ? null : String(lkpBranch).trim(),
          null,
          row.lkpItemID,
          SCREEN_NAME,
          "M",
          PstrUserID,
          buildSalesPriceListAuditNote(row)
        );
      } catch (auditError: unknown) {
        // the prices are already changed - don't fail the request over an
        // audit-logging problem, just log it
        console.error("UserAudit error (modifySalesPriceList):", auditError);
      }
    }

    return res.status(200).json({
      success: true,
      message: "Modified",
      mode: result.mode,
      count: changedRows.length,
    });
  } catch (error: unknown) {
    console.error("modifySalesPriceList error:", error);

    return reject(res, 400, messageOf(error, "Not Modified,Try again"));
  }
};
