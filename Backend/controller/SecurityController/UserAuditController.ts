import { Response } from "express";

import type { AuthenticatedRequest } from "../../middleware/authMiddleware.js";
import { hasButtonRight } from "../../utils/buttonRights.js";
import { validateUserAudit, AUDIT_ACTIONS } from "../../validators/UserAuditValidator.js";
import {
  getUserAuditUserListService,
  getUserAuditCompanyNameService,
  getUserAuditListService,
} from "../../services/SecurityServices/userAuditService.js";
import {
  mapRows,
  userAuditUserListKeys,
  userAuditActionListKeys,
  userAuditGridKeys,
} from "../../utils/responseKeys.js";

// dbo.tblmenu fmenuid of the User Audit page (its button is Print, letter P)
const MENU_ID = "9304";

/* =========================================================
   WHO SEES WHOM
   Any Admin User (type AU, ADMIN included) sees every user's audit.
   Everyone else sees only their own. The user comes from the SESSION
   (authenticate), not from the request.
========================================================= */

const isAdminUser = (user: { userType: string }): boolean =>
  user.userType === "AU";

// the names of the audit letters (what each screen writes into faction)
const ACTION_NAMES: Record<string, string> = {
  S: "Save",
  M: "Modify",
  D: "Delete",
};

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

    const allUsers = await getUserAuditUserListService(String(PstrCoID));

    const visibleUsers = isAdminUser(req.user)
      ? allUsers
      : allUsers.filter(
          (user) =>
            user.fuserid.toUpperCase() === req.user!.userId.toUpperCase()
        );

    return res.status(200).json({
      success: true,
      data: mapRows(visibleUsers, userAuditUserListKeys),
    });
  } catch (error: unknown) {
    console.error("getUserList (user audit) error:", error);

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
   GET ACTION LIST (the Action dropdown)
========================================================= */

export const getActionList = async (
  _req: AuthenticatedRequest,
  res: Response
): Promise<Response> =>
  res.status(200).json({
    success: true,
    data: mapRows(
      AUDIT_ACTIONS.map((fpid) => ({ fpid, fpname: ACTION_NAMES[fpid] })),
      userAuditActionListKeys
    ),
  });

/* =========================================================
   GET USER AUDIT LIST (the report rows)
   lkpUserID "*" = every user, lkpAction "*" = every action (both required).
========================================================= */

export const getUserAuditList = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    const { PstrCoID, lkpUserID, lkpAction, dtpFromDate, dtpToDate } =
      req.body;

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

    // validators/UserAuditValidator.ts: idle user, who may see whom, the user
    // and action asked for, then the period - the first rule that fails stops
    const check = await validateUserAudit({
      PstrCoID,
      PstrUserID: req.user.userId,
      PstrUserType: req.user.userType,
      lkpUserID,
      lkpAction,
      dtpFromDate,
      dtpToDate,
    });

    if (!check.valid) {
      return res.status(check.status).json({
        success: false,
        message: check.message,
        field: check.field,
      });
    }

    // getting the report is the Print button: it needs the Print right
    if (!(await hasButtonRight(req.user, MENU_ID, "P"))) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to Print.",
        field: "btnPrint",
      });
    }

    const data = await getUserAuditListService({
      PstrCoID: String(PstrCoID),
      lkpUserID: String(lkpUserID ?? "").trim(),
      lkpAction: String(lkpAction ?? "").trim(),
      dtpFromDate: String(dtpFromDate).trim(),
      dtpToDate: String(dtpToDate).trim(),
      PstrUserID: req.user.userId,
    });

    return res.status(200).json({
      success: true,
      txtCompanyName: await getUserAuditCompanyNameService(String(PstrCoID)),
      data: mapRows(data, userAuditGridKeys),
    });
  } catch (error: unknown) {
    console.error("getUserAuditList error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load the user audit",
      error:
        error instanceof Error
          ? error.message
          : String(error),
    });
  }
};
