import {
  type ValidationResult,
  passed,
  failed,
  isNullOrEmpty,
  getUserStatus,
  idleUserMessage,
} from "./common.js";

/* =========================================================
   SET POSTING ACCOUNT - validations

   Same shape as the other screens' validators: the FIRST rule
   that fails is returned, with the field to put the cursor on
   (the same name as the element id on the page).
========================================================= */

export interface SetPostingAccountData {
  lkpBranch?: unknown;
  PstrUserID?: unknown;
  [field: string]: unknown;
}

export async function validateSetPostingAccount(
  data: SetPostingAccountData
): Promise<ValidationResult> {
  // 1. the user must not be idle
  const userId = String(data.PstrUserID ?? "").trim();

  if (!(await getUserStatus(userId))) {
    return failed(idleUserMessage(userId), "lkpBranch", 403);
  }

  // 2. a branch is chosen
  if (isNullOrEmpty(data.lkpBranch)) {
    return failed("Please select a 'Branch'", "lkpBranch");
  }

  return passed;
}
