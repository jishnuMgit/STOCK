import {
  type ValidationResult,
  passed,
  failed,
  isNullOrEmpty,
  getUserStatus,
  idleUserMessage,
} from "./common.js";

/* =========================================================
   SET DOCUMENT NO - validations

   Same shape as the other screens' validators: the FIRST rule
   that fails is returned, with the field to put the cursor on
   (the same name as the element id on the page).
========================================================= */

export interface SetDocumentNoData {
  PstrUserID?: unknown;
  lkpYear?: unknown;
  lkpBranch?: unknown;
  lkpModule?: unknown;
  rows?: unknown;
}

export async function validateSetDocumentNo(
  data: SetDocumentNoData
): Promise<ValidationResult> {
  // 1. the user must not be idle
  const userId = String(data.PstrUserID ?? "").trim();

  if (!(await getUserStatus(userId))) {
    return failed(idleUserMessage(userId), "lkpYear", 403);
  }

  // 2. Year, Branch and Module are chosen (page order)
  if (isNullOrEmpty(data.lkpYear)) {
    return failed("Please select 'Year'", "lkpYear");
  }

  if (isNullOrEmpty(data.lkpBranch)) {
    return failed("Please select 'Branch'", "lkpBranch");
  }

  if (isNullOrEmpty(data.lkpModule)) {
    return failed("Please select 'Module'", "lkpModule");
  }

  // 3. there is something to save
  if (!Array.isArray(data.rows) || data.rows.length === 0) {
    return failed("There is no information for saving.", "txtDocPrefix_1");
  }

  return passed;
}
