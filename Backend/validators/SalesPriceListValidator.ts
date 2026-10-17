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
   SALES PRICE LIST - validations (the old ValidateMe of frmEditPriceList, and
   what the server must check again). The first rule that fails is returned,
   with the field to put the cursor on (the element id on the page).
========================================================= */

// the branch: chosen, exists, and the user has the right to it
async function checkBranch(
  PstrCoID: string,
  userId: string,
  lkpBranch: string
): Promise<ValidationResult> {
  if (isNullOrEmpty(lkpBranch)) {
    return failed("Please Select 'Branch'", "lkpBranch");
  }

  const branchResult = await pool.query(
    `SELECT dbo.userbranches($1, $2, $3) AS "hasAccess"
       FROM dbo.tblbranch WHERE fcoid = $1 AND fbrid = $3`,
    [PstrCoID, userId, lkpBranch]
  );

  if (branchResult.rowCount === 0) {
    return failed(`Branch '${lkpBranch}' not found`, "lkpBranch", 404);
  }

  if (!branchResult.rows[0]?.hasAccess) {
    return failed(
      `The user '${userId}' don't have the Right to access the Branch : ${lkpBranch}`,
      "lkpBranch",
      403
    );
  }

  return passed;
}

// One Item Group needs an item group, and it must exist
async function checkItemGroup(
  PstrCoID: string,
  rdgItemGroup: number,
  lkpItemGroupID: string
): Promise<ValidationResult> {
  if (rdgItemGroup !== 0) return passed;

  if (isNullOrEmpty(lkpItemGroupID)) {
    return failed("Please Select 'Item Group'", "lkpItemGroupID");
  }

  const groupResult = await pool.query(
    `SELECT 1 FROM dbo.tblitemgroup WHERE fcoid = $1 AND fitemgroupid = $2`,
    [PstrCoID, lkpItemGroupID]
  );

  if (groupResult.rowCount === 0) {
    return failed(`Item Group '${lkpItemGroupID}' not found`, "lkpItemGroupID", 404);
  }

  return passed;
}

/* =========================================================
   LOAD THE GRID
========================================================= */

export async function validateSalesPriceListLoad(data: {
  PstrCoID?: unknown;
  PstrUserID?: unknown;
  lkpBranch?: unknown;
  rdgItemGroup?: unknown;
  lkpItemGroupID?: unknown;
}): Promise<ValidationResult> {
  const userId = String(data.PstrUserID ?? "").trim();

  if (!(await getUserStatus(userId))) {
    return failed(idleUserMessage(userId), "lkpBranch", 403);
  }

  const PstrCoID = String(data.PstrCoID ?? "").trim();

  const branch = await checkBranch(
    PstrCoID,
    userId,
    String(data.lkpBranch ?? "").trim()
  );

  if (!branch.valid) return branch;

  const rdgItemGroup = Number(data.rdgItemGroup);

  if (rdgItemGroup !== 0 && rdgItemGroup !== 1) {
    return failed("Please select One Item Group or All Item Group", "rdgItemGroup");
  }

  return checkItemGroup(
    PstrCoID,
    rdgItemGroup,
    String(data.lkpItemGroupID ?? "").trim()
  );
}

/* =========================================================
   MODIFY - the branch, the item group (when One Item Group), and every
   changed row: an item of the branch with a Unit Price of 0 or more with at
   most 2 decimals
========================================================= */

export async function validateSalesPriceListModify(data: {
  PstrCoID?: unknown;
  PstrUserID?: unknown;
  lkpBranch?: unknown;
  rdgItemGroup?: unknown;
  lkpItemGroupID?: unknown;
  rows?: unknown;
}): Promise<ValidationResult> {
  const load = await validateSalesPriceListLoad(data);

  if (!load.valid) return load;

  const PstrCoID = String(data.PstrCoID ?? "").trim();
  const lkpBranch = String(data.lkpBranch ?? "").trim();
  const rows = Array.isArray(data.rows) ? data.rows : [];

  if (rows.length === 0) {
    return failed("There is no data in the grid to modify", "btnModify");
  }

  for (const row of rows as Record<string, unknown>[]) {
    const lkpItemID = String(row.lkpItemID ?? "").trim();

    if (isNullOrEmpty(lkpItemID)) {
      return failed("Please select an 'Item'", "lkpItemID");
    }

    const price = Number(row.txtUnitPrice);

    if (
      isNullOrEmpty(row.txtUnitPrice) ||
      !Number.isFinite(price) ||
      price < 0 ||
      price >= 1e16 ||
      Math.abs(price * 100 - Math.round(price * 100)) > 1e-6
    ) {
      return failed(
        `The Unit Price of the Item '${lkpItemID}' must be 0 or more, with at most 2 decimals`,
        "txtUnitPrice"
      );
    }

    const original = Number(row.txtOriginalUnitPrice);

    if (!Number.isFinite(original)) {
      return failed(
        `The old Unit Price of the Item '${lkpItemID}' is not valid`,
        "txtUnitPrice"
      );
    }

    const itemResult = await pool.query(
      `SELECT 1 FROM dbo.tblitemtl WHERE fcoid = $1 AND fbrid = $2 AND fitemid = $3`,
      [PstrCoID, lkpBranch, lkpItemID]
    );

    if (itemResult.rowCount === 0) {
      return failed(
        `Item '${lkpItemID}' is not an item of the Branch ${lkpBranch}`,
        "lkpItemID",
        404
      );
    }
  }

  return passed;
}
