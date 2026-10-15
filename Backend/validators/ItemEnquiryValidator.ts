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
   ITEM ENQUIRY - validations. A view-only screen, so only: the user is not
   idle, an item is chosen, and it exists. The first rule that fails is
   returned, with the field to put the cursor on (the element id on the page).
========================================================= */

export async function validateItemEnquiry(data: {
  PstrCoID?: unknown;
  PstrUserID?: unknown;
  lkpItemID?: unknown;
}): Promise<ValidationResult> {
  const userId = String(data.PstrUserID ?? "").trim();

  if (!(await getUserStatus(userId))) {
    return failed(idleUserMessage(userId), "lkpItemID", 403);
  }

  const PstrCoID = String(data.PstrCoID ?? "").trim();
  const lkpItemID = String(data.lkpItemID ?? "").trim();

  if (isNullOrEmpty(lkpItemID)) {
    return failed("Please select an 'Item'", "lkpItemID");
  }

  const itemResult = await pool.query(
    `SELECT 1 FROM dbo.tblitemhd WHERE fcoid = $1 AND fitemid = $2`,
    [PstrCoID, lkpItemID]
  );

  if (itemResult.rowCount === 0) {
    return failed(`Item '${lkpItemID}' not found`, "lkpItemID", 404);
  }

  return passed;
}
