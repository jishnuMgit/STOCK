import { Response } from "express";

import type { AuthenticatedRequest } from "../../../middleware/authMiddleware.js";
import { hasButtonRight } from "../../../utils/buttonRights.js";
import { UserAudit } from "../../../utils/UserAudit.js";
import {
  validateBeginningBalance,
  validateBeginningBalanceDelete,
  validateBeginningBalancePost,
  validateBeginningBalancePrint,
  validateBeginningBalanceView,
} from "../../../validators/BeginningBalanceValidator.js";
import {
  getBeginningBalanceBranchListService,
  getBeginningBalanceDefaultBranchService,
  getBeginningBalanceAccountListService,
  getBeginningBalanceCostCenterListService,
  getBeginningBalanceService,
  saveBeginningBalanceService,
  deleteBeginningBalanceService,
  postBeginningBalanceService,
  getBeginningBalancePrintService,
  buildBeginningBalanceAuditNote,
  buildBeginningBalanceDeleteAuditNote,
  buildBeginningBalancePostAuditNote,
  type BeginningBalanceRowPayload,
} from "../../../services/Finance/Transaction/beginningBalanceService.js";
import {
  mapRows,
  mapKeys,
  branchListKeys,
  beginningBalanceAccountKeys,
  beginningBalanceCostCenterKeys,
  beginningBalanceHeaderKeys,
  beginningBalanceLineKeys,
  beginningBalancePrintHeaderKeys,
  beginningBalancePrintLineKeys,
} from "../../../utils/responseKeys.js";

// dbo.tblmenu fmenuid of the Beginning Balance page
const MENU_ID = "110110";

const SCREEN_NAME = "Beginning Balance";

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

/* =========================================================
   GET BEGINNING BALANCE (the grid of a branch)
   The branch's balance: the header (date, saved by, modified by), the lines, and
   whether it is posted (then the page is locked). Nothing is returned for a
   branch that has no balance yet. Needs a branch the user has a right to.
========================================================= */

export const getBeginningBalance = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    const { PstrCoID, PstrYear, lkpBranch } = req.query;

    if (!PstrCoID) {
      return res.status(400).json({
        success: false,
        message: "Company ID is required",
      });
    }

    if (!PstrYear || !/^\d{4}$/.test(String(PstrYear))) {
      return res.status(400).json({
        success: false,
        message: "Year is required",
      });
    }

    if (!lkpBranch) {
      return res.status(400).json({
        success: false,
        message: "Branch is required",
      });
    }

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const check = await validateBeginningBalanceView({
      PstrCoID,
      PstrUserID: req.user.userId,
      lkpBranch,
    });

    if (!check.valid) {
      return res.status(check.status).json({
        success: false,
        message: check.message,
        field: check.field,
      });
    }

    const current = await getBeginningBalanceService(
      String(PstrCoID),
      String(PstrYear),
      String(lkpBranch)
    );

    return res.status(200).json({
      success: true,
      chkSaved: current.lines.length > 0,
      chkPosted: current.posted,
      header: current.header
        ? mapKeys(current.header, beginningBalanceHeaderKeys)
        : null,
      data: mapRows(current.lines, beginningBalanceLineKeys),
    });
  } catch (error: unknown) {
    console.error("getBeginningBalance error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load the Beginning Balance",
      error: messageOf(error),
    });
  }
};

/* =========================================================
   SAVE BEGINNING BALANCE (the Save / Modify button)
   S: the branch has no balance yet   M: it has one (each needs its own button
   right). A posted balance is locked. The logged-in user comes from the SESSION,
   not from the request body.
========================================================= */

export const saveBeginningBalance = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    const {
      PstrCoID,
      PstrYear,
      lkpBranch,
      dtpDate,
      rows = [],
    }: {
      PstrCoID: string;
      PstrYear: string;
      lkpBranch: string;
      dtpDate: string;
      rows: BeginningBalanceRowPayload[];
    } = req.body;

    if (!PstrCoID) {
      return res.status(400).json({
        success: false,
        message: "Company ID is required",
      });
    }

    if (!PstrYear || !/^\d{4}$/.test(String(PstrYear))) {
      return res.status(400).json({
        success: false,
        message: "Year is required",
      });
    }

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const PstrUserID = req.user.userId;

    // validators/BeginningBalanceValidator.ts: idle user, year not closed, branch
    // (and the right to it), date, then every line - the first rule that fails
    // stops the save
    const check = await validateBeginningBalance({
      PstrCoID,
      PstrYear,
      PstrUserID,
      lkpBranch,
      dtpDate,
      rows,
    });

    if (!check.valid) {
      return res.status(check.status).json({
        success: false,
        message: check.message,
        field: check.field,
      });
    }

    // Save (S) when the branch has no balance yet, Modify (M) when it has one -
    // each needs its own button right
    const current = await getBeginningBalanceService(
      PstrCoID,
      PstrYear,
      lkpBranch
    );

    const wantedMode = current.lines.length > 0 ? "M" : "S";

    if (!(await hasButtonRight(req.user, MENU_ID, wantedMode))) {
      return res.status(403).json({
        success: false,
        message: `You do not have permission to ${wantedMode === "M" ? "Modify" : "Save"}.`,
        field: "lkpBranch",
      });
    }

    // a posted balance is locked: it cannot be changed
    if (current.posted) {
      return res.status(409).json({
        success: false,
        message: "This Beginning Balance is already posted and cannot be modified.",
        field: "lkpBranch",
      });
    }

    const result = await saveBeginningBalanceService({
      PstrCoID,
      PstrYear,
      lkpBranch,
      dtpDate,
      rows,
      PstrUserID,
    });

    // =====================================================
    // USER AUDIT (only after the save has actually succeeded)
    // =====================================================

    try {
      // the note says WHAT was added, changed and removed, line by line
      const note = buildBeginningBalanceAuditNote(lkpBranch, dtpDate, result);

      await UserAudit(
        PstrCoID,
        PstrYear,
        lkpBranch,
        "BG",
        "BG",
        SCREEN_NAME,
        result.mode,
        PstrUserID,
        note
      );
    } catch (auditError: unknown) {
      // the balance is already saved - don't fail the request over an
      // audit-logging problem, just log it
      console.error("UserAudit error (saveBeginningBalance):", auditError);
    }

    return res.status(200).json({
      success: true,
      message:
        result.mode === "M"
          ? "Beginning Balance modified successfully"
          : "Beginning Balance saved successfully",
      mode: result.mode,
    });
  } catch (error: unknown) {
    console.error("saveBeginningBalance error:", error);

    return res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Beginning Balance could not be saved",
    });
  }
};

/* =========================================================
   DELETE BEGINNING BALANCE (the Delete button)
   The whole balance of the branch. Needs the Delete right; a posted one cannot
   be deleted. The logged-in user comes from the SESSION.
========================================================= */

export const deleteBeginningBalance = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    const {
      PstrCoID,
      PstrYear,
      lkpBranch,
    }: { PstrCoID: string; PstrYear: string; lkpBranch: string } = req.body;

    if (!PstrCoID) {
      return res.status(400).json({
        success: false,
        message: "Company ID is required",
      });
    }

    if (!PstrYear || !/^\d{4}$/.test(String(PstrYear))) {
      return res.status(400).json({
        success: false,
        message: "Year is required",
      });
    }

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const PstrUserID = req.user.userId;

    // validators/BeginningBalanceValidator.ts: idle user, year not closed, branch
    // (and the right to it) - the first rule that fails stops the delete
    const check = await validateBeginningBalanceDelete({
      PstrCoID,
      PstrYear,
      PstrUserID,
      lkpBranch,
    });

    if (!check.valid) {
      return res.status(check.status).json({
        success: false,
        message: check.message,
        field: check.field,
      });
    }

    if (!(await hasButtonRight(req.user, MENU_ID, "D"))) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to Delete.",
        field: "lkpBranch",
      });
    }

    const current = await getBeginningBalanceService(
      PstrCoID,
      PstrYear,
      lkpBranch
    );

    if (current.lines.length === 0) {
      return res.status(404).json({
        success: false,
        message: "There is no Beginning Balance to delete.",
        field: "lkpBranch",
      });
    }

    // a posted balance is locked: it cannot be deleted
    if (current.posted) {
      return res.status(409).json({
        success: false,
        message: "This Beginning Balance is already posted and cannot be deleted.",
        field: "lkpBranch",
      });
    }

    const result = await deleteBeginningBalanceService({
      PstrCoID,
      PstrYear,
      lkpBranch,
      PstrUserID,
    });

    // =====================================================
    // USER AUDIT (only after the delete has actually succeeded)
    // =====================================================

    try {
      await UserAudit(
        PstrCoID,
        PstrYear,
        lkpBranch,
        "BG",
        "BG",
        SCREEN_NAME,
        "D",
        PstrUserID,
        buildBeginningBalanceDeleteAuditNote(lkpBranch, result.date, result.lines)
      );
    } catch (auditError: unknown) {
      // the balance is already deleted - don't fail the request over an
      // audit-logging problem, just log it
      console.error("UserAudit error (deleteBeginningBalance):", auditError);
    }

    return res.status(200).json({
      success: true,
      message: "Beginning Balance deleted successfully",
    });
  } catch (error: unknown) {
    console.error("deleteBeginningBalance error:", error);

    return res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Beginning Balance could not be deleted",
    });
  }
};

/* =========================================================
   POST BEGINNING BALANCE (the Post button)
   Marks the branch's balance posted (dbo.sp_pagebeginningbalancepost). Needs the
   Post right (T). Once posted, the balance is locked. As in the old form the
   totals are not compared: posting does not need debit to equal credit. The
   logged-in user comes from the SESSION.
========================================================= */

export const postBeginningBalance = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    const {
      PstrCoID,
      PstrYear,
      lkpBranch,
      dtpDate,
    }: { PstrCoID: string; PstrYear: string; lkpBranch: string; dtpDate: string } =
      req.body;

    if (!PstrCoID) {
      return res.status(400).json({
        success: false,
        message: "Company ID is required",
      });
    }

    if (!PstrYear || !/^\d{4}$/.test(String(PstrYear))) {
      return res.status(400).json({
        success: false,
        message: "Year is required",
      });
    }

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const PstrUserID = req.user.userId;

    // validators/BeginningBalanceValidator.ts: idle user, year not closed, branch
    // (and the right to it), date - the first rule that fails stops the post
    const check = await validateBeginningBalancePost({
      PstrCoID,
      PstrYear,
      PstrUserID,
      lkpBranch,
      dtpDate,
    });

    if (!check.valid) {
      return res.status(check.status).json({
        success: false,
        message: check.message,
        field: check.field,
      });
    }

    if (!(await hasButtonRight(req.user, MENU_ID, "T"))) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to Post.",
        field: "lkpBranch",
      });
    }

    const current = await getBeginningBalanceService(
      PstrCoID,
      PstrYear,
      lkpBranch
    );

    // the old ValidateMe("T"): "Beginning balance not found" (here: of THIS branch)
    if (current.lines.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Beginning balance not found",
        field: "lkpBranch",
      });
    }

    // a posted balance is locked already
    if (current.posted) {
      return res.status(409).json({
        success: false,
        message: "This Beginning Balance is already posted.",
        field: "lkpBranch",
      });
    }

    const result = await postBeginningBalanceService({
      PstrCoID,
      PstrYear,
      lkpBranch,
      PstrUserID,
    });

    // =====================================================
    // USER AUDIT (only after the post has actually succeeded)
    // =====================================================

    try {
      await UserAudit(
        PstrCoID,
        PstrYear,
        lkpBranch,
        "BG",
        "BG",
        SCREEN_NAME,
        "T",
        PstrUserID,
        buildBeginningBalancePostAuditNote(lkpBranch, result.date, result.lines)
      );
    } catch (auditError: unknown) {
      // the balance is already posted - don't fail the request over an
      // audit-logging problem, just log it
      console.error("UserAudit error (postBeginningBalance):", auditError);
    }

    return res.status(200).json({
      success: true,
      message: "Beginning Balance posted successfully",
    });
  } catch (error: unknown) {
    console.error("postBeginningBalance error:", error);

    return res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Beginning Balance could not be posted",
    });
  }
};

/* =========================================================
   PRINT BEGINNING BALANCE (the Print button)
   The branch's balance as the report rows, for the print page. A POST: the print
   page asks for the data itself. Needs the Print right (P). A posted balance can
   be printed too - nothing is changed. The logged-in user comes from the SESSION.
========================================================= */

export const printBeginningBalance = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    const {
      PstrCoID,
      PstrYear,
      lkpBranch,
      dtpDate,
    }: { PstrCoID: string; PstrYear: string; lkpBranch: string; dtpDate: string } =
      req.body;

    if (!PstrCoID) {
      return res.status(400).json({
        success: false,
        message: "Company ID is required",
      });
    }

    if (!PstrYear || !/^\d{4}$/.test(String(PstrYear))) {
      return res.status(400).json({
        success: false,
        message: "Year is required",
      });
    }

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    // validators/BeginningBalanceValidator.ts: idle user, branch (and the right to
    // it), date - the branch is checked BEFORE it goes into the report
    const check = await validateBeginningBalancePrint({
      PstrCoID,
      PstrYear,
      PstrUserID: req.user.userId,
      lkpBranch,
      dtpDate,
    });

    if (!check.valid) {
      return res.status(check.status).json({
        success: false,
        message: check.message,
        field: check.field,
      });
    }

    if (!(await hasButtonRight(req.user, MENU_ID, "P"))) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to Print.",
        field: "lkpBranch",
      });
    }

    // the old form passed the year of the date
    const report = await getBeginningBalancePrintService(
      PstrCoID,
      lkpBranch,
      Number(String(dtpDate).slice(0, 4))
    );

    if (report.lines.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Beginning Balance not found",
        field: "lkpBranch",
      });
    }

    return res.status(200).json({
      success: true,
      header: mapKeys(report.header, beginningBalancePrintHeaderKeys),
      data: mapRows(report.lines, beginningBalancePrintLineKeys),
    });
  } catch (error: unknown) {
    console.error("printBeginningBalance error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load the Beginning Balance print",
      error: messageOf(error),
    });
  }
};
