import { Response } from "express";

import type { AuthenticatedRequest } from "../../middleware/authMiddleware.js";
import { UserAudit } from "../../utils/UserAudit.js";
import {
  validateAdministrationYear,
  validateDeleteAdministrationYear,
} from "../../validators/YearValidator.js";
import {
  getAdministrationYearService,
  saveAdministrationYearService,
  deleteAdministrationYearService,
  buildAdministrationYearMessage,
  type AdministrationYearRowPayload,
} from "../../services/Administration/yearService.js";
import {
  mapRows,
  branchListKeys,
  administrationYearGridKeys,
} from "../../utils/responseKeys.js";

// Administration is not a row of dbo.tblmenu (it is added to the menu for the
// administrator only), so there are no button rights to check: the screen is for
// the admin user (userType AU) alone
const SCREEN_NAME = "Year";

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

const ADMIN_ONLY = "Only the administrator can maintain the Years.";

/* =========================================================
   GET YEAR: the logged-in company's branches (the Branch dropdown) and the open
   years of its branches (the grid)
========================================================= */

export const getYear = async (
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

    const result = await getAdministrationYearService(String(PstrCoID));

    return res.status(200).json({
      success: true,
      branches: mapRows(result.branches, branchListKeys),
      data: mapRows(result.years, administrationYearGridKeys),
    });
  } catch (error: unknown) {
    console.error("getYear (administration) error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load the Years",
      error: messageOf(error, String(error)),
    });
  }
};

/* =========================================================
   SAVE / MODIFY YEAR (the Save / Modify button)
   The page sends the WHOLE grid (every open year of every branch): the open
   years that are not in it are taken away, the new ones are opened. A closed year
   is refused. The logged-in user comes from the SESSION, not from the body.
========================================================= */

export const saveYear = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    const {
      PstrCoID,
      PstrYear = null,
      rows = [],
    }: {
      PstrCoID: string;
      PstrYear?: string | null;
      rows: AdministrationYearRowPayload[];
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

    // validators/YearValidator.ts: idle user, company, then every
    // row, no duplicate and no closed year - the first rule that fails stops it
    const check = await validateAdministrationYear({
      PstrCoID,
      PstrUserID,
      rows,
    });

    if (!check.valid) {
      return reject(res, check.status, check.message, check.field);
    }

    const result = await saveAdministrationYearService({
      PstrCoID,
      PstrUserID,
      rows,
    });

    // =====================================================
    // USER AUDIT (only after the save has actually succeeded): one row for each
    // year that was opened or taken away
    // =====================================================

    for (const entry of result.done) {
      try {
        await UserAudit(
          PstrCoID,
          PstrYear && /^\d+$/.test(String(PstrYear)) ? String(PstrYear) : null,
          entry.lkpBranch,
          null,
          null,
          SCREEN_NAME,
          entry.mode,
          PstrUserID,
          entry.note
        );
      } catch (auditError: unknown) {
        // the years are already saved - don't fail the request over an
        // audit-logging problem, just log it
        console.error("UserAudit error (saveYear):", auditError);
      }
    }

    return res.status(200).json({
      success: true,
      message: buildAdministrationYearMessage(result.wasEmpty),
      count: result.done.length,
    });
  } catch (error: unknown) {
    console.error("saveYear error:", error);

    return reject(res, 400, messageOf(error, "Not Saved,try again"));
  }
};

/* =========================================================
   DELETE YEAR (the x of a row, after "Do you want to delete?"): the open year of
   the branch is taken away at once. A closed year is refused. The logged-in
   user comes from the SESSION, not from the body.
========================================================= */

export const deleteYear = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    const {
      PstrCoID,
      PstrYear = null,
      lkpBranch,
      txtYear,
    }: {
      PstrCoID: string;
      PstrYear?: string | null;
      lkpBranch: string;
      txtYear: string | number;
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

    // validators/YearValidator.ts: idle user, company, branch and
    // an open year of it
    const check = await validateDeleteAdministrationYear({
      PstrCoID,
      PstrUserID,
      lkpBranch,
      txtYear,
    });

    if (!check.valid) {
      return reject(res, check.status, check.message, check.field);
    }

    const entry = await deleteAdministrationYearService({
      PstrCoID,
      PstrUserID,
      lkpBranch,
      txtYear,
    });

    // USER AUDIT (only after the delete has actually succeeded)
    try {
      await UserAudit(
        PstrCoID,
        PstrYear && /^\d+$/.test(String(PstrYear)) ? String(PstrYear) : null,
        entry.lkpBranch,
        null,
        null,
        SCREEN_NAME,
        entry.mode,
        PstrUserID,
        entry.note
      );
    } catch (auditError: unknown) {
      // the year is already deleted - don't fail the request over an
      // audit-logging problem, just log it
      console.error("UserAudit error (deleteYear):", auditError);
    }

    return res.status(200).json({
      success: true,
      message: "Year deleted successfully",
    });
  } catch (error: unknown) {
    console.error("deleteYear error:", error);

    return reject(res, 400, messageOf(error, "Not Deleted,try again"));
  }
};
