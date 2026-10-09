import { Response } from "express";

import type { AuthenticatedRequest } from "../../middleware/authMiddleware.js";
import { hasButtonRight } from "../../utils/buttonRights.js";
import { UserAudit } from "../../utils/UserAudit.js";
import { validateSetActivePeriod } from "../../validators/SetActivePeriodValidator.js";
import {
  getActivePeriodListService,
  saveActivePeriodService,
  type ActivePeriodRowPayload,
} from "../../services/SettingServices/setActivePeriodService.js";
import { mapRows, activePeriodGridKeys } from "../../utils/responseKeys.js";

// dbo.tblmenu fmenuid of the Set Active Period page
const MENU_ID = "9103";

// yyyy-mm-dd -> dd/mm/yyyy, for the audit note ("not set" when a branch has
// no period yet)
const showPeriod = (from: string, to: string): string =>
  from === "" && to === ""
    ? "not set"
    : `${from.split("-").reverse().join("/")} - ${to.split("-").reverse().join("/")}`;

/* =========================================================
   GET ACTIVE PERIOD LIST (the grid rows)
   Only the branches the logged-in user has a right to - the user comes
   from the SESSION, not from the request.
========================================================= */

export const getActivePeriodList = async (
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

    const data = await getActivePeriodListService(
      String(PstrCoID),
      req.user.userId
    );

    return res.status(200).json({
      success: true,
      data: mapRows(data, activePeriodGridKeys),
    });
  } catch (error: unknown) {
    console.error("getActivePeriodList error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load active periods",
      error:
        error instanceof Error
          ? error.message
          : String(error),
    });
  }
};

/* =========================================================
   SAVE ACTIVE PERIOD (the Modify button)
   M the From / To date of a branch changed
========================================================= */

export const saveActivePeriod = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    const {
      PstrCoID,
      PstrYear,
      rows = [],
    }: {
      PstrCoID: string;
      PstrYear: string;
      rows: (ActivePeriodRowPayload & { txtGridRow?: number })[];
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

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const PstrUserID = req.user.userId;

    // validators/SetActivePeriodValidator.ts: idle user, something to save,
    // every branch with both dates (From not later than To) that the user has
    // a right to - the first rule that fails stops the save
    const check = await validateSetActivePeriod({ PstrCoID, PstrUserID, rows });

    if (!check.valid) {
      return res.status(check.status).json({
        success: false,
        message: check.message,
        field: check.field,
      });
    }

    // the branches already exist, so the screen only ever Modifies
    if (!(await hasButtonRight(req.user, MENU_ID, "M"))) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to Modify.",
        field: "dtpFromDate-0",
      });
    }

    const result = await saveActivePeriodService(
      PstrCoID,
      rows.map((row) => ({
        txtBranchID: String(row.txtBranchID ?? ""),
        dtpFromDate: String(row.dtpFromDate ?? ""),
        dtpToDate: String(row.dtpToDate ?? ""),
      })),
      PstrUserID
    );

    if (!result.anything) {
      return res.status(200).json({
        success: true,
        message: "No changes to save",
      });
    }

    // =====================================================
    // USER AUDIT (only after the save has actually succeeded)
    // =====================================================

    try {
      // one audit row per branch whose period changed. The branch goes in the
      // branch column, so the screen key (branch + doc type + doc no) is the
      // branch ID too.
      for (const item of result.changed) {
        await UserAudit(
          PstrCoID,
          PstrYear,
          item.txtBranchID,
          null,
          null,
          "Set Active Period",
          "M",
          PstrUserID,
          `Active Period: ${item.txtBranchID} ${showPeriod(item.beforeFrom, item.beforeTo)} -> ${showPeriod(item.dtpFromDate, item.dtpToDate)}`
        );
      }
    } catch (auditError: unknown) {
      // the periods are already saved - don't fail the request over an
      // audit-logging problem, just log it
      console.error("UserAudit error (saveActivePeriod):", auditError);
    }

    return res.status(200).json({
      success: true,
      message: "Active period modified successfully",
      mode: "M",
    });
  } catch (error: unknown) {
    console.error("saveActivePeriod error:", error);

    return res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Active period could not be saved",
    });
  }
};
