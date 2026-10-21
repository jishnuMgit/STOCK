import { Response } from "express";

import type { AuthenticatedRequest } from "../../../middleware/authMiddleware.js";
import {
  getBeginningBalanceBranchListService,
  getBeginningBalanceDefaultBranchService,
  getBeginningBalanceAccountListService,
  getBeginningBalanceCostCenterListService,
} from "../../../services/Finance/Transaction/beginningBalanceService.js";
import {
  mapRows,
  branchListKeys,
  beginningBalanceAccountKeys,
  beginningBalanceCostCenterKeys,
} from "../../../utils/responseKeys.js";

const messageOf = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/* =========================================================
   GET BRANCH LIST (the Branch box)
   Only the branches the logged-in user has a right to, plus the user's own
   default branch (lkpDefaultBranch) when it is one of them. The user comes
   from the SESSION (authenticate), not from the request.
========================================================= */

export const getBranchList = async (
  req: AuthenticatedRequest,
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

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const branches = await getBeginningBalanceBranchListService(
      String(PstrCoID),
      req.user.userId
    );

    // the default branch counts only while the user still has a right to it
    const defaultBranch = await getBeginningBalanceDefaultBranchService(
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
    console.error("getBranchList (beginning balance) error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load branch list",
      error: messageOf(error),
    });
  }
};

/* =========================================================
   GET ACCOUNT LIST (the Account ID, Account Name and C.C. ID boxes of the grid)
   The head accounts twice - by Account ID and by Account Name - and the cost
   centers.
========================================================= */

export const getAccountList = async (
  req: AuthenticatedRequest,
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

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const accounts = await getBeginningBalanceAccountListService(
      String(PstrCoID)
    );

    const costCenters = await getBeginningBalanceCostCenterListService(
      String(PstrCoID)
    );

    return res.status(200).json({
      success: true,
      accountsByID: mapRows(accounts.byId, beginningBalanceAccountKeys),
      accountsByName: mapRows(accounts.byName, beginningBalanceAccountKeys),
      costCenters: mapRows(costCenters, beginningBalanceCostCenterKeys),
    });
  } catch (error: unknown) {
    console.error("getAccountList (beginning balance) error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load the accounts",
      error: messageOf(error),
    });
  }
};
