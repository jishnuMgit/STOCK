import {
  type ValidationResult,
  passed,
  failed,
  isNullOrEmpty,
  getUserStatus,
  idleUserMessage,
} from "./common.js";

/* =========================================================
   STOCK DOCUMENT RE-POST - validations

   Same shape as the other screens' validators: the FIRST rule that fails is returned, with the field to put the
   cursor on (the same name as the element id on the page: txtFromTxnNo, txtToTxnNo).
========================================================= */

export interface StockDocumentRePostData {
  // the logged-in user - from the session, not from the request body
  PstrUserID?: unknown;
  txtFromTxnNo?: unknown;
  txtToTxnNo?: unknown;
}

const text = (value: unknown): string => String(value ?? "").trim();

export async function validateStockDocumentRePost(
  data: StockDocumentRePostData
): Promise<ValidationResult> {
  // 1. the user must not be idle
  const userId = text(data.PstrUserID);

  if (!(await getUserStatus(userId))) {
    return failed(idleUserMessage(userId), "txtFromTxnNo", 403);
  }

  // 2. both Txn. Nos are entered
  if (isNullOrEmpty(data.txtFromTxnNo)) {
    return failed("Please enter 'From Txn. No.'", "txtFromTxnNo");
  }

  if (isNullOrEmpty(data.txtToTxnNo)) {
    return failed("Please enter 'To Txn. No.'", "txtToTxnNo");
  }

  const from = text(data.txtFromTxnNo);
  const to = text(data.txtToTxnNo);

  // 3. a Txn. No. is digits (the posting numbers: the year and a running number)
  if (!/^\d{1,15}$/.test(from)) {
    return failed("'From Txn. No.' is not a valid Txn. No.", "txtFromTxnNo");
  }

  if (!/^\d{1,15}$/.test(to)) {
    return failed("'To Txn. No.' is not a valid Txn. No.", "txtToTxnNo");
  }

  // 4. the two have the same length (the numbers are compared as text), and From is not after To
  if (from.length !== to.length) {
    return failed("'From Txn. No.' and 'To Txn. No.' must have the same length", "txtToTxnNo");
  }

  if (from > to) {
    return failed("'To Txn. No.' should be greater than 'From Txn. No.'", "txtToTxnNo");
  }

  return passed;
}
