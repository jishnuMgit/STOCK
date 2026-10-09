import { Response } from "express";

import type { AuthenticatedRequest } from "../../middleware/authMiddleware.js";
import { hasButtonRight } from "../../utils/buttonRights.js";
import { UserAudit } from "../../utils/UserAudit.js";
import { validateSetDefaultBranch } from "../../validators/SetDefaultBranchValidator.js";
import {
  getDefaultBranchUserListService,
  getDefaultBranchBranchListService,
  getDefaultBranchListService,
  saveDefaultBranchService,
  type DefaultBranchRowPayload,
} from "../../services/SettingServices/setDefaultBranchService.js";
import {
  mapRows,
  defaultBranchUserListKeys,
  defaultBranchGridKeys,
  branchListKeys,
} from "../../utils/responseKeys.js";

// dbo.tblmenu fmenuid of the Set Default Branch page
const MENU_ID = "9101";

/* =========================================================
   WHO SEES WHOM (the old rule of SP_frmDefaultBr / FillCombo)

   Any Admin User (type AU, ADMIN included) sees every user. Everyone else
   sees only their own row, and may pick only themselves.
   The user is taken from the SESSION (authenticate), not from the request.
========================================================= */

const isAdminUser = (user: { userType: string }): boolean =>
  user.userType === "AU";

/* =========================================================
   GET USER LIST (the User ID dropdown)
========================================================= */

export const getUserList = async (
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

    const allUsers = await getDefaultBranchUserListService(String(PstrCoID));

    const visibleUsers = isAdminUser(req.user)
      ? allUsers
      : allUsers.filter(
          (user) =>
            user.fuserid.toUpperCase() === req.user!.userId.toUpperCase()
        );

    return res.status(200).json({
      success: true,
      data: mapRows(visibleUsers, defaultBranchUserListKeys),
    });
  } catch (error: unknown) {
    console.error("getUserList error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load user list",
      error:
        error instanceof Error
          ? error.message
          : String(error),
    });
  }
};

/* =========================================================
   GET BRANCH LIST (the Default Branch dropdown of one row: only the branches
   the chosen user has a right to)
========================================================= */

export const getBranchList = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    const { PstrCoID, txtUserID } = req.query;

    if (!PstrCoID) {
      return res.status(400).json({
        success: false,
        message: "Company ID is required",
      });
    }

    if (!txtUserID) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    // anyone but an Admin User may only ask about themselves
    if (
      !isAdminUser(req.user) &&
      String(txtUserID).toUpperCase() !== req.user.userId.toUpperCase()
    ) {
      return res.status(403).json({
        success: false,
        message: "You can only see your own default branch.",
      });
    }

    const data = await getDefaultBranchBranchListService(
      String(PstrCoID),
      String(txtUserID)
    );

    return res.status(200).json({
      success: true,
      data: mapRows(data, branchListKeys),
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
   GET DEFAULT BRANCH LIST (the grid rows)
========================================================= */

export const getDefaultBranchList = async (
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

    // the procedure gives an Admin User every row, and anyone else only their own
    const data = await getDefaultBranchListService(
      String(PstrCoID),
      req.user.userId
    );

    return res.status(200).json({
      success: true,
      data: mapRows(data, defaultBranchGridKeys),
    });
  } catch (error: unknown) {
    console.error("getDefaultBranchList error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load default branches",
      error:
        error instanceof Error
          ? error.message
          : String(error),
    });
  }
};

/* =========================================================
   SAVE DEFAULT BRANCHES (the Save / Modify button)
   S a user gets a default branch, M it is changed, D it is cleared.
   The logged-in user comes from the SESSION, not from the request body.
========================================================= */

export const saveDefaultBranch = async (
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
      rows: (DefaultBranchRowPayload & { txtGridRow?: number })[];
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

    // validators/SetDefaultBranchValidator.ts: idle user, something to save,
    // every row has an existing user (an Admin User may set anyone's, others only
    // their own) and a branch that user has a right to - the first rule that
    // fails stops the save
    const check = await validateSetDefaultBranch({
      PstrCoID,
      PstrUserID,
      PstrUserType: req.user.userType,
      rows,
    });

    if (!check.valid) {
      return res.status(check.status).json({
        success: false,
        message: check.message,
        field: check.field,
      });
    }

    // Save (S) when there is no default branch yet, Modify (M) when there is -
    // each needs its own button right
    const saved = await getDefaultBranchListService(PstrCoID, PstrUserID);
    const wantedMode = saved.length > 0 ? "M" : "S";

    if (!(await hasButtonRight(req.user, MENU_ID, wantedMode))) {
      return res.status(403).json({
        success: false,
        message: `You do not have permission to ${wantedMode === "M" ? "Modify" : "Save"}.`,
        field: "lkpDefaultBranch-0",
      });
    }

    // clearing a saved default branch removes it - that is a delete, so the
    // Delete right is needed too (the old CanDeleteGrid)
    const savedUsers = new Set(saved.map((row) => row.fuserid.toLowerCase()));
    const clearsSaved = rows.some(
      (row) =>
        String(row.lkpDefaultBranch ?? "").trim() === "" &&
        savedUsers.has(String(row.txtUserID ?? "").trim().toLowerCase())
    );

    if (clearsSaved && !(await hasButtonRight(req.user, MENU_ID, "D"))) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to Delete.",
        field: "lkpDefaultBranch-0",
      });
    }

    const result = await saveDefaultBranchService(
      PstrCoID,
      rows.map((row) => ({
        txtUserID: String(row.txtUserID ?? ""),
        lkpDefaultBranch: String(row.lkpDefaultBranch ?? ""),
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
      const parts: string[] = [
        ...result.inserted.map(
          (row) => `Set '${row.txtUserID}' -> ${row.lkpDefaultBranch}`
        ),
        ...result.changed.map(
          (row) =>
            `Changed '${row.txtUserID}' ${row.before} -> ${row.lkpDefaultBranch}`
        ),
        ...result.deleted.map(
          (row) => `Removed '${row.txtUserID}' (was ${row.before})`
        ),
      ];

      // the screen key (tbluseraudit.fscreenkey, 40 characters) is the user(s)
      // whose default branch changed - as User Login keys its rows by user
      const screenKey = [
        ...result.inserted,
        ...result.changed,
        ...result.deleted,
      ]
        .map((row) => row.txtUserID)
        .join(",")
        .slice(0, 40);

      await UserAudit(
        PstrCoID,
        PstrYear,
        null,
        null,
        screenKey,
        "Set Default Branch",
        // only new: S - only removals: D - anything else: M
        result.changed.length === 0 && result.deleted.length === 0
          ? "S"
          : result.inserted.length === 0 && result.changed.length === 0
            ? "D"
            : "M",
        PstrUserID,
        `Default Branch: ${parts.join("; ")}`
      );
    } catch (auditError: unknown) {
      // the default branches are already saved - don't fail the request over
      // an audit-logging problem, just log it
      console.error("UserAudit error (saveDefaultBranch):", auditError);
    }

    return res.status(200).json({
      success: true,
      message:
        wantedMode === "M"
          ? "Default branch modified successfully"
          : "Default branch saved successfully",
      mode: wantedMode,
    });
  } catch (error: unknown) {
    console.error("saveDefaultBranch error:", error);

    return res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Default branch could not be saved",
    });
  }
};
