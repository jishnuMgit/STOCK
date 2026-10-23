import { Response } from "express";

import type { AuthenticatedRequest } from "../../middleware/authMiddleware.js";
import { hasButtonRight } from "../../utils/buttonRights.js";
import { validateUserAudit, AUDIT_ACTIONS } from "../../validators/UserAuditValidator.js";
import {
  getUserAuditUserListService,
  getUserAuditCompanyNameService,
  getUserAuditListService,
} from "../../services/SecurityServices/userAuditService.js";
import { buildUserAuditWorkbook } from "../../services/SecurityServices/userAuditExcel.js";
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
   THE REPORT (what Print and the Excel download share)
   lkpUserID "*" = every user, lkpAction "*" = every action (both required).
   The same body and the same checks: idle user, who may see whom, the period, and the
   Print right.
========================================================= */

type PreparedAudit =
  | {
      ok: true;
      companyName: string;
      dtpFromDate: string;
      dtpToDate: string;
      data: ReturnType<typeof mapRows>;
      // "<user>  dd/mm/yyyy hh:mm"
      reportInfo: string;
    }
  | { ok: false; status: number; body: Record<string, unknown> };

const prepareAudit = async (
  req: AuthenticatedRequest
): Promise<PreparedAudit> => {
  const { PstrCoID, lkpUserID, lkpAction, dtpFromDate, dtpToDate } = req.body;

  if (!PstrCoID) {
    return {
      ok: false,
      status: 400,
      body: { success: false, message: "Company ID is required" },
    };
  }

  if (!req.user) {
    return {
      ok: false,
      status: 401,
      body: { success: false, message: "Authentication required" },
    };
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
    return {
      ok: false,
      status: check.status,
      body: { success: false, message: check.message, field: check.field },
    };
  }

  // getting the report is the Print button: it needs the Print right
  if (!(await hasButtonRight(req.user, MENU_ID, "P"))) {
    return {
      ok: false,
      status: 403,
      body: {
        success: false,
        message: "You do not have permission to Print.",
        field: "btnPrint",
      },
    };
  }

  const data = await getUserAuditListService({
    PstrCoID: String(PstrCoID),
    lkpUserID: String(lkpUserID ?? "").trim(),
    lkpAction: String(lkpAction ?? "").trim(),
    dtpFromDate: String(dtpFromDate).trim(),
    dtpToDate: String(dtpToDate).trim(),
    PstrUserID: req.user.userId,
  });

  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");

  return {
    ok: true,
    companyName: await getUserAuditCompanyNameService(String(PstrCoID)),
    dtpFromDate: String(dtpFromDate).trim(),
    dtpToDate: String(dtpToDate).trim(),
    data: mapRows(data, userAuditGridKeys),
    reportInfo: `${req.user.userId}  ${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}`,
  };
};

/* =========================================================
   GET USER AUDIT LIST (the report rows - the Print)
========================================================= */

export const getUserAuditList = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    const prepared = await prepareAudit(req);

    if (!prepared.ok) {
      return res.status(prepared.status).json(prepared.body);
    }

    return res.status(200).json({
      success: true,
      txtCompanyName: prepared.companyName,
      txtReportInfo: prepared.reportInfo,
      data: prepared.data,
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

/* =========================================================
   DOWNLOAD USER AUDIT EXCEL (the Download button of the Print Preview)
   The same body and the same checks as Print; answers with the .xlsx file.
========================================================= */

export const downloadUserAuditExcel = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    const prepared = await prepareAudit(req);

    if (!prepared.ok) {
      return res.status(prepared.status).json(prepared.body);
    }

    const buffer = await buildUserAuditWorkbook({
      companyName: prepared.companyName,
      dtpFromDate: prepared.dtpFromDate,
      dtpToDate: prepared.dtpToDate,
      reportInfo: prepared.reportInfo,
      rows: prepared.data as unknown as Parameters<
        typeof buildUserAuditWorkbook
      >[0]["rows"],
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", 'attachment; filename="UserAudit.xlsx"');
    res.setHeader("Access-Control-Expose-Headers", "Content-Disposition");

    return res.status(200).send(buffer);
  } catch (error: unknown) {
    console.error("downloadUserAuditExcel error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create the User Audit Excel file",
      error:
        error instanceof Error
          ? error.message
          : String(error),
    });
  }
};
