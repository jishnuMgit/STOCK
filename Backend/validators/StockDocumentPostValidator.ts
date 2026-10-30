import pool from "../DB/db.js";
import {
  type ValidationResult,
  passed,
  failed,
  isNullOrEmpty,
  getUserStatus,
  idleUserMessage,
} from "./common.js";

/* =========================================================
   STOCK DOCUMENT POST - validations (the old frmStDocPost.ValidateMe)

   Same shape as the other screens' validators: the FIRST rule that fails is
   returned, with the field to put the cursor on (the same name as the element
   id on the page: lkpBranch, lkpDocument, lkpYear, lkpMonth).

   Used by the list (GetData) and by the Post button.
========================================================= */

export interface StockDocumentPostData {
  PstrCoID?: unknown;
  // the login year
  PstrYear?: unknown;
  // the logged-in user - from the session, not from the request body
  PstrUserID?: unknown;
  lkpBranch?: unknown;
  lkpDocument?: unknown;
  lkpYear?: unknown;
  lkpMonth?: unknown;
}

const text = (value: unknown): string => String(value ?? "").trim();

export async function validateStockDocumentPost(
  data: StockDocumentPostData
): Promise<ValidationResult> {
  // 1. the user must not be idle
  const userId = text(data.PstrUserID);

  if (!(await getUserStatus(userId))) {
    return failed(idleUserMessage(userId), "lkpBranch", 403);
  }

  const PstrCoID = text(data.PstrCoID);
  const PstrYear = text(data.PstrYear);
  const lkpBranch = text(data.lkpBranch);

  // 2. the login year must not be permanently closed (the old YearCloseStatusID = "P")
  if (lkpBranch !== "" && /^\d+$/.test(PstrYear)) {
    const yearResult = await pool.query(
      `SELECT fyearclosestatusid FROM dbo.tblyear WHERE fcoid = $1 AND fyear = $2 AND fbrid = $3`,
      [PstrCoID, Number(PstrYear), lkpBranch]
    );

    if (yearResult.rows[0]?.fyearclosestatusid === "P") {
      return failed(
        "'Login Year' has permanently closed.\nSo, you can't Save/Modify any document with this 'Year'",
        "lkpBranch"
      );
    }
  }

  // 3. Branch, Document, Year and Month are chosen
  if (isNullOrEmpty(lkpBranch)) {
    return failed("Please select a 'Branch'", "lkpBranch");
  }

  if (isNullOrEmpty(data.lkpDocument)) {
    return failed("Please select a 'Document'", "lkpDocument");
  }

  if (isNullOrEmpty(data.lkpYear)) {
    return failed("Please select 'Year'", "lkpYear");
  }

  const month = Number(text(data.lkpMonth));

  if (!Number.isInteger(month) || month < 1 || month > 12) {
    return failed("Please select 'Month'", "lkpMonth");
  }

  // 4. the user has a right to the branch
  const branchResult = await pool.query(
    `SELECT dbo.userbranches($1, $2, $3) AS "hasAccess"
       FROM dbo.tblbranch WHERE fcoid = $1 AND fbrid = $3`,
    [PstrCoID, userId, lkpBranch]
  );

  if (branchResult.rowCount === 0) {
    return failed(`Branch '${lkpBranch}' not found`, "lkpBranch");
  }

  if (!branchResult.rows[0]?.hasAccess) {
    return failed(
      `The user '${userId}' don't have the Right to access the Branch : ${lkpBranch}`,
      "lkpBranch",
      403
    );
  }

  // 5. "'Year' should be same as 'Login Year'"
  if (text(data.lkpYear) !== PstrYear) {
    return failed("'Year' should be same as 'Login Year'", "lkpYear");
  }

  return passed;
}
