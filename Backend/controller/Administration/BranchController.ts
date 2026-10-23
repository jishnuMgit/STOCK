import { Response } from "express";

import type { AuthenticatedRequest } from "../../middleware/authMiddleware.js";
import { UserAudit } from "../../utils/UserAudit.js";
import { validateAdministrationBranch } from "../../validators/BranchValidator.js";
import {
  getAdministrationBranchService,
  saveAdministrationBranchService,
  buildAdministrationBranchMessage,
  type AdministrationBranchRowPayload,
} from "../../services/Administration/branchService.js";
import {
  mapRows,
  mapKeys,
  administrationBranchHeaderKeys,
  administrationBranchGridKeys,
} from "../../utils/responseKeys.js";

// Administration is not a row of dbo.tblmenu (it is added to the menu for the
// administrator only), so there are no button rights to check: the screen is for
// the admin user (userType AU) alone
const SCREEN_NAME = "Branch";

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

const ADMIN_ONLY = "Only the administrator can maintain the Branches.";

/* =========================================================
   GET BRANCH: the logged-in company's name (the Company box) and its branches
   (the grid)
========================================================= */

export const getBranch = async (
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

    if (req.user.userType !== "AU") {
      return reject(res, 403, ADMIN_ONLY);
    }

    const result = await getAdministrationBranchService(String(PstrCoID));

    if (!result.company) {
      return reject(res, 404, `Company '${PstrCoID}' not found`, "txtCompany");
    }

    return res.status(200).json({
      success: true,
      header: mapKeys(result.company, administrationBranchHeaderKeys),
      data: mapRows(result.branches, administrationBranchGridKeys),
    });
  } catch (error: unknown) {
    console.error("getBranch (administration) error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load the Branches",
      error: messageOf(error, String(error)),
    });
  }
};

/* =========================================================
   SAVE BRANCH (the Save button: new rows, changed rows and deleted rows)
   The page sends the new rows, the saved rows whose name / position changed, and the branches the
   user took out of the list (deletedRows): those are deleted only here.
   The logged-in user comes from the SESSION, not from the request body.
========================================================= */

export const saveBranch = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    const {
      PstrCoID,
      PstrYear = null,
      rows = [],
      deletedRows = [],
    }: {
      PstrCoID: string;
      PstrYear?: string | null;
      rows: AdministrationBranchRowPayload[];
      deletedRows?: { txtBrID: string }[];
    } = req.body;

    if (!PstrCoID) {
      return reject(res, 400, "Company ID is required");
    }

    if (!req.user) {
      return reject(res, 401, "Authentication required");
    }

    if (req.user.userType !== "AU") {
      return reject(res, 403, ADMIN_ONLY);
    }

    const PstrUserID = req.user.userId;

    // validators/BranchValidator.ts: idle user, company, then every
    // row and the unique Branch ID / Branch name - the first rule that fails
    // stops the save
    const check = await validateAdministrationBranch({
      PstrCoID,
      PstrUserID,
      rows,
      deletedRows,
    });

    if (!check.valid) {
      return reject(res, check.status, check.message, check.field);
    }

    const saved = await saveAdministrationBranchService({
      PstrCoID,
      PstrUserID,
      rows,
      deletedRows,
    });

    // =====================================================
    // USER AUDIT (only after the save has actually succeeded): one row for each
    // branch that was added, changed or deleted
    // =====================================================

    for (const entry of saved) {
      try {
        await UserAudit(
          PstrCoID,
          PstrYear && /^\d+$/.test(String(PstrYear)) ? String(PstrYear) : null,
          entry.txtBrID,
          null,
          null,
          SCREEN_NAME,
          entry.mode,
          PstrUserID,
          entry.note
        );
      } catch (auditError: unknown) {
        // the branches are already saved - don't fail the request over an
        // audit-logging problem, just log it
        console.error("UserAudit error (saveBranch):", auditError);
      }
    }

    return res.status(200).json({
      success: true,
      message: buildAdministrationBranchMessage(saved),
      count: saved.length,
      // the new branches: the page reminds the user of their set-up
      added: saved.filter((entry) => entry.mode === "S").map((entry) => entry.txtBrID),
    });
  } catch (error: unknown) {
    console.error("saveBranch error:", error);

    return reject(res, 400, messageOf(error, "Not Saved,try again"));
  }
};
