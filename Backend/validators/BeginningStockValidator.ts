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
   BEGINNING STOCK - validations (the old form's ValidateMe + ValidateGrid)

   Same shape as the other screens' validators: the FIRST rule that fails is
   returned, with the field to put the cursor on (the same name as the element
   id on the page: lkpBranch, dtpDate, lkpItemID-<row>, txtQty-<row>).

   The page sends only the rows that have an item, each with txtGridRow - its
   position in the grid (0 = first row) - so the field names point at the
   right box. The date is yyyy-mm-dd.
========================================================= */

export interface BeginningStockData {
  PstrCoID?: unknown;
  PstrYear?: unknown;
  // the logged-in user - from the session, not from the request body
  PstrUserID?: unknown;
  lkpBranch?: unknown;
  dtpDate?: unknown;
  txtNote?: unknown;
  rows?: unknown;
}

// tblstocktrans.fnote is varchar(100)
const NOTE_LENGTH = 100;

const text = (value: unknown): string => String(value ?? "").trim();

// a real calendar date written yyyy-mm-dd
const isRealDate = (value: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00Z`);

  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

// yyyy-mm-dd -> dd/mm/yyyy (what dbo.isactiveperiod reads, and what people read)
const showDate = (value: string): string =>
  value ? value.split("-").reverse().join("/") : "";

/* =========================================================
   DELETE and POST (the old ValidateMe, Cases "D" and "T"): the user is not
   idle, the login year is not permanently closed, and a branch is chosen (that
   the user has a right to). No date or lines are needed - that a Beginning
   Stock exists, and is not posted, is checked by the controller.
========================================================= */

type BranchActionData = {
  PstrCoID?: unknown;
  PstrYear?: unknown;
  PstrUserID?: unknown;
  lkpBranch?: unknown;
};

async function validateBranchAction(
  data: BranchActionData
): Promise<ValidationResult> {
  const userId = text(data.PstrUserID);

  if (!(await getUserStatus(userId))) {
    return failed(idleUserMessage(userId), "lkpBranch", 403);
  }

  const PstrCoID = text(data.PstrCoID);
  const PstrYear = text(data.PstrYear);
  const lkpBranch = text(data.lkpBranch);

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

  if (lkpBranch === "") {
    return failed("Please select a 'Branch'", "lkpBranch");
  }

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

  return passed;
}

export const validateBeginningStockDelete = validateBranchAction;
export const validateBeginningStockPost = validateBranchAction;
export const validateBeginningStockPrint = validateBranchAction;

export async function validateBeginningStock(
  data: BeginningStockData
): Promise<ValidationResult> {
  const rows = Array.isArray(data.rows)
    ? (data.rows as Record<string, unknown>[])
    : [];

  const gridIndexOf = (row: Record<string, unknown>, position: number) => {
    const given = Number(row.txtGridRow);
    return Number.isInteger(given) && given >= 0 ? given : position;
  };

  // 1. the user must not be idle
  const userId = text(data.PstrUserID);

  if (!(await getUserStatus(userId))) {
    return failed(idleUserMessage(userId), "lkpBranch", 403);
  }

  const PstrCoID = text(data.PstrCoID);
  const PstrYear = text(data.PstrYear);
  const lkpBranch = text(data.lkpBranch);
  const dtpDate = text(data.dtpDate);

  // 2. the login year must not be permanently closed (the old
  //    YearCloseStatusID = "P")
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

  // 3. a branch is chosen, and the user has a right to it
  if (lkpBranch === "") {
    return failed("Please select a 'Branch'", "lkpBranch");
  }

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

  // 4. a date is chosen, and it is inside the branch's Active Period
  if (isNullOrEmpty(dtpDate)) {
    return failed("Please select 'Date'", "dtpDate");
  }

  if (!isRealDate(dtpDate)) {
    return failed("'Date' is not a valid date", "dtpDate");
  }

  const periodResult = await pool.query(
    `SELECT dbo.isactiveperiod($1, $2, $3) AS "inPeriod",
            to_char(factivefromdate, 'DD/MM/YYYY') AS "fromDate",
            to_char(factivetodate, 'DD/MM/YYYY') AS "toDate"
       FROM dbo.tblbranch WHERE fcoid = $1 AND fbrid = $2`,
    [PstrCoID, lkpBranch, showDate(dtpDate)]
  );

  if (!periodResult.rows[0]?.inPeriod) {
    const from = periodResult.rows[0]?.fromDate;
    const to = periodResult.rows[0]?.toDate;

    return failed(
      `'Date' must be within the Active Period '${from && to ? `${from} - ${to}` : "not set"}'`,
      "dtpDate"
    );
  }

  // 5. the note fits the column
  if (text(data.txtNote).length > NOTE_LENGTH) {
    return failed(
      `'Note' cannot be longer than ${NOTE_LENGTH} characters`,
      "txtNote"
    );
  }

  // 6. something to save
  if (rows.length === 0) {
    return failed("There is no information for saving.", "lkpItemID-0");
  }

  // 7. the lines: the items of this branch, none blocked, none twice, and not
  //    both Qty and Unit Cost at 0 or less
  const itemResult = await pool.query(
    `
    SELECT t.fitemid, COALESCE(t.finactive, false) AS "blocked"
    FROM dbo.tblitemtl t
    WHERE t.fcoid = $1 AND t.fbrid = $2
    `,
    [PstrCoID, lkpBranch]
  );
  const itemState = new Map<string, boolean>(
    itemResult.rows.map((row) => [row.fitemid as string, row.blocked as boolean])
  );

  const seenItems = new Set<string>();

  for (const [position, row] of rows.entries()) {
    const index = gridIndexOf(row, position);
    const lkpItemID = text(row.lkpItemID);

    if (lkpItemID === "") {
      return failed("Please select an 'Item'", `lkpItemID-${index}`);
    }

    if (!itemState.has(lkpItemID)) {
      return failed(
        `Item '${lkpItemID}' is not available for this Branch`,
        `lkpItemID-${index}`
      );
    }

    if (itemState.get(lkpItemID)) {
      return failed("Selected Item Blocked For This Branch.", `lkpItemID-${index}`);
    }

    if (seenItems.has(lkpItemID.toLowerCase())) {
      return failed("Item already exists !", `lkpItemID-${index}`);
    }

    seenItems.add(lkpItemID.toLowerCase());

    const qty = Number(row.txtQty);
    const unitCost = Number(row.txtUnitCost);

    if (
      (row.txtQty !== "" && row.txtQty !== null && Number.isNaN(qty)) ||
      (row.txtUnitCost !== "" && row.txtUnitCost !== null && Number.isNaN(unitCost))
    ) {
      return failed(
        ` Sl.# : ${position + 1} - Qty and UnitCost must be numbers.`,
        `txtQty-${index}`
      );
    }

    if ((qty || 0) <= 0 && (unitCost || 0) <= 0) {
      return failed(
        ` Sl.# : ${position + 1} - Not Both Qty and UnitCost less than or equal to 0.`,
        `txtQty-${index}`
      );
    }
  }

  return passed;
}
