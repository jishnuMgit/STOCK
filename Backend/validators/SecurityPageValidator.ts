import {
  type ValidationResult,
  passed,
  failed,
  getUserStatus,
  idleUserMessage,
} from "./common.js";
import {
  hasButtonRight,
  type ButtonCode,
  type RightsUser,
} from "../utils/buttonRights.js";

/* =========================================================
   SECURITY SCREENS (User Login, User Permission - Menu,
   User Permission - Branch) - validations before a write

   Same shape as the other screens' validators: the FIRST rule
   that fails is returned, with the field to put the cursor on
   (the same name as the element id on the page).

   1. the user must not be idle
   2. the user is logged in (session) and holds the button right:
        S = Save, D = Delete
========================================================= */

export interface SecurityWriteData {
  PstrUserID?: unknown;
  // the logged-in user from the session (req.user set by `authenticate`)
  user?: RightsUser;
  // the screen's menu id (tblmenu.fmenuid)
  menuId: string;
  // the button right the action needs
  code: Extract<ButtonCode, "S" | "D">;
  // element id the cursor goes to when a rule fails
  field: string;
}

export async function validateSecurityWrite(
  data: SecurityWriteData
): Promise<ValidationResult> {
  // 1. the user must not be idle
  const userId = String(data.PstrUserID ?? "").trim();

  if (!(await getUserStatus(userId))) {
    return failed(idleUserMessage(userId), data.field, 403);
  }

  // 2. logged in, and allowed to Save / Delete on this screen
  if (!data.user) {
    return failed("Authentication required", data.field, 401);
  }

  if (!(await hasButtonRight(data.user, data.menuId, data.code))) {
    return failed(
      `You do not have permission to ${data.code === "S" ? "Save" : "Delete"}.`,
      data.field,
      403
    );
  }

  return passed;
}
