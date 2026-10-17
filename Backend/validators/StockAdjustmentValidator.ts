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
   STOCK ADJUSTMENT - validations (the old form's ValidateMe + ValidateGrid)

   Same shape as the other screens' validators: the FIRST rule that fails is
   returned, with the field to put the cursor on (the same name as the element
   id on the page: lkpBranch, txtDocNo, dtpDate, lkpItemID-<row>,
   txtQtyIn-<row>, txtQtyOut-<row>). The page sends only the rows that have an
   item, each with txtGridRow - its position in the grid (0 = first row). The
   date is yyyy-mm-dd.
========================================================= */

const DOC_TYPE = "ADJ";

// tblstocktrans.fnote is varchar(100), fdocno varchar(14)
const NOTE_LENGTH = 100;
const DOC_NO_LENGTH = 14;

const text = (value: unknown): string => String(value ?? "").trim();

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

/* ---------------------------------------------------------
   The checks every action shares: the user is not idle, the login year is not
   permanently closed (not for Print), a branch is chosen that the user has a
   right to, and an Entry No. is given.
--------------------------------------------------------- */

async function checkBranchAndEntryNo(
  data: {
    PstrCoID?: unknown;
    PstrYear?: unknown;
    PstrUserID?: unknown;
    lkpBranch?: unknown;
    txtDocNo?: unknown;
  },
  checkYearClosed: boolean
): Promise<ValidationResult> {
  const userId = text(data.PstrUserID);

  if (!(await getUserStatus(userId))) {
    return failed(idleUserMessage(userId), "lkpBranch", 403);
  }

  const PstrCoID = text(data.PstrCoID);
  const PstrYear = text(data.PstrYear);
  const lkpBranch = text(data.lkpBranch);

  if (checkYearClosed && lkpBranch !== "" && /^\d+$/.test(PstrYear)) {
    const yearResult = await pool.query(
      `SELECT fyearclosestatusid FROM dbo.tblyear WHERE fcoid = $1 AND fyear = $2 AND fbrid = $3`,
      [PstrCoID, Number(PstrYear), lkpBranch]
    );

    if (yearResult.rows[0]?.fyearclosestatusid === "P") {
      return failed(
        "'Login Year' has permanently closed.\nSo, you can't Save/Modify any document with this 'Year'",
        "txtDocNo"
      );
    }
  }

  if (lkpBranch === "") {
    return failed("Please select 'Branch'", "lkpBranch");
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

  if (isNullOrEmpty(data.txtDocNo)) {
    return failed("Please enter 'Entry No'", "txtDocNo");
  }

  return passed;
}

// Delete (the old ValidateMe "D"), Print ("P") and Post ("T")
export const validateStockAdjustmentDelete = (data: {
  PstrCoID?: unknown;
  PstrYear?: unknown;
  PstrUserID?: unknown;
  lkpBranch?: unknown;
  txtDocNo?: unknown;
}) => checkBranchAndEntryNo(data, true);

export const validateStockAdjustmentPrint = (data: {
  PstrCoID?: unknown;
  PstrYear?: unknown;
  PstrUserID?: unknown;
  lkpBranch?: unknown;
  txtDocNo?: unknown;
}) => checkBranchAndEntryNo(data, false);

export const validateStockAdjustmentPost = (data: {
  PstrCoID?: unknown;
  PstrYear?: unknown;
  PstrUserID?: unknown;
  lkpBranch?: unknown;
  txtDocNo?: unknown;
}) => checkBranchAndEntryNo(data, true);

/* =========================================================
   SAVE / MODIFY (the old ValidateMe "S" / "M" and ValidateGrid "S")
========================================================= */

export interface StockAdjustmentData {
  PstrCoID?: unknown;
  PstrYear?: unknown;
  // the logged-in user - from the session, not from the request body
  PstrUserID?: unknown;
  lkpBranch?: unknown;
  txtDocNo?: unknown;
  dtpDate?: unknown;
  txtNote?: unknown;
  rows?: unknown;
}

export async function validateStockAdjustment(
  data: StockAdjustmentData
): Promise<ValidationResult> {
  const rows = Array.isArray(data.rows)
    ? (data.rows as Record<string, unknown>[])
    : [];

  const gridIndexOf = (row: Record<string, unknown>, position: number) => {
    const given = Number(row.txtGridRow);
    return Number.isInteger(given) && given >= 0 ? given : position;
  };

  // the user, the year, the branch and its right, the Entry No. given
  const common = await checkBranchAndEntryNo(data, true);

  if (!common.valid) {
    return common;
  }

  const PstrCoID = text(data.PstrCoID);
  const PstrYear = Number(text(data.PstrYear));
  const lkpBranch = text(data.lkpBranch);
  const txtDocNo = text(data.txtDocNo);
  const dtpDate = text(data.dtpDate);

  // the Entry No. fits the column and starts with the prefix of the branch's
  // ADJ setting (the old GetPrefix)
  if (txtDocNo.length > DOC_NO_LENGTH) {
    return failed(`'Entry No' cannot be longer than ${DOC_NO_LENGTH} characters`, "txtDocNo");
  }

  const prefixResult = await pool.query(
    `
    SELECT fdocnoprefix
    FROM dbo.tbldocumentno
    WHERE fcoid = $1 AND fyear = $2 AND fbrid = $3 AND fdoctype = $4
    LIMIT 1
    `,
    [PstrCoID, String(PstrYear), lkpBranch, DOC_TYPE]
  );

  const prefix = text(prefixResult.rows[0]?.fdocnoprefix);

  // the Entry No. is the branch's prefix followed by NUMBERS only: dbo.getnextdocno reads
  // what follows the prefix as a number to make the next Entry No., so a number like
  // 'ST11-2600001' under the prefix 'ST' would break the numbering of the branch
  if (
    prefixResult.rowCount !== 0 &&
    (!txtDocNo.startsWith(prefix) || !/^\d+$/.test(txtDocNo.slice(prefix.length)))
  ) {
    return failed("Please Check 'Entry No.'", "txtDocNo");
  }

  // the date: chosen, real, in the login year, inside the branch's Active Period
  if (isNullOrEmpty(dtpDate)) {
    return failed("Please enter 'Date'", "dtpDate");
  }

  if (!isRealDate(dtpDate)) {
    return failed("'Date' is not a valid date", "dtpDate");
  }

  if (Number(dtpDate.slice(0, 4)) !== PstrYear) {
    return failed("'Login Year' should be same as 'Transaction Year'", "dtpDate");
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

  if (text(data.txtNote).length > NOTE_LENGTH) {
    return failed(`'Note' cannot be longer than ${NOTE_LENGTH} characters`, "txtNote");
  }

  // something to save
  if (rows.length === 0) {
    return failed("There is no information for saving.", "lkpItemID-0");
  }

  // the lines: the items of the branch, none blocked, none twice, either Qty.
  // In or Qty. Out (not both, not negative). Out of stock is only a warning on
  // the page, as in the old form - it does not stop the save.
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
      return failed("Item already exits !", `lkpItemID-${index}`);
    }

    seenItems.add(lkpItemID.toLowerCase());

    const qtyIn = Number(row.txtQtyIn);
    const qtyOut = Number(row.txtQtyOut);
    const unitCost = Number(row.txtUnitCost);

    const isNumberOrEmpty = (value: unknown, parsed: number) =>
      value === "" || value === null || value === undefined || !Number.isNaN(parsed);

    if (
      !isNumberOrEmpty(row.txtQtyIn, qtyIn) ||
      !isNumberOrEmpty(row.txtQtyOut, qtyOut) ||
      !isNumberOrEmpty(row.txtUnitCost, unitCost)
    ) {
      return failed(
        ` Sl.# : ${position + 1} - Qty. and UnitCost must be numbers.`,
        `txtQtyIn-${index}`
      );
    }

    if ((qtyIn || 0) < 0) {
      return failed(`Sl.# : ${position + 1} - Qty. In can't be negative`, `txtQtyIn-${index}`);
    }

    if ((qtyOut || 0) < 0) {
      return failed(`Sl.# : ${position + 1} - Qty. Out can't be negative`, `txtQtyOut-${index}`);
    }

    // the old ValidateGrid: either 'Qty. Out' or 'Qty. In'
    if ((qtyIn || 0) !== 0 && (qtyOut || 0) !== 0) {
      return failed(
        `Sl.# : ${position + 1} - Please input either 'Qty. Out' or 'Qty. In'`,
        `txtQtyOut-${index}`
      );
    }

    if ((qtyIn || 0) === 0 && (qtyOut || 0) === 0) {
      return failed(
        `Sl.# : ${position + 1} - Please enter 'Qty. In' or 'Qty. Out'`,
        `txtQtyIn-${index}`
      );
    }

    if ((unitCost || 0) < 0) {
      return failed(
        ` Sl.# : ${position + 1} - UnitCost can't be less than 0.`,
        `txtQtyIn-${index}`
      );
    }
  }

  return passed;
}

/* =========================================================
   POST (the old ValidateMe "T" and ValidateGrid "T")

   The first part is the same as Delete (validateStockAdjustmentPost). The rest
   is checked here (the controller calls it after it has found the document):
     * the branch has its Stock Account and Stock Adjustment Account (Set
       Posting Account) - the finance lines need them;
     * enough POSTED stock for a line taking stock out - the old
       GetItemPostedStock: the quantity can't be more than tblstockcontrol.fstock
       of the branch;
     * a unit cost - the old HaveUnitCost, the TL's dbo.haveunitcost. The
       quantities are passed rounded UP: the function's quantity arguments are
       whole numbers.
========================================================= */

export async function validateStockAdjustmentPostLines(
  PstrCoID: string,
  PstrYear: number,
  lkpBranch: string,
  txtDocNo: string,
  lines: {
    fslno: number | string;
    fitemid: string;
    fqtyin: number | string;
    fqtyout: number | string;
  }[]
): Promise<ValidationResult> {
  const accounts = await pool.query(
    `SELECT dbo.getstockaccountid($1::varchar, $2::varchar) AS "stockAccount",
            dbo.getstockadjaccountid($1::varchar, $2::varchar) AS "adjAccount"`,
    [PstrCoID, lkpBranch]
  );

  if (text(accounts.rows[0]?.stockAccount) === "") {
    return failed(
      `The Stock Account of the Branch ${lkpBranch} is not set (Set Posting Account)`,
      "lkpBranch"
    );
  }

  if (text(accounts.rows[0]?.adjAccount) === "") {
    return failed(
      `The Stock Adjustment Account of the Branch ${lkpBranch} is not set (Set Posting Account)`,
      "lkpBranch"
    );
  }

  for (const line of lines) {
    const index = Number(line.fslno) - 1; // the grid row of the line
    const itemId = String(line.fitemid);
    const qtyOut = Number(line.fqtyout) || 0;
    const qtyIn = Number(line.fqtyin) || 0;

    if (qtyOut > 0) {
      const stockResult = await pool.query(
        `
        SELECT COALESCE(fstock, 0) AS "stock"
        FROM dbo.tblstockcontrol
        WHERE fcoid   = $1
          AND fyear   = $2::varchar
          AND fbrid   = $3
          AND fitemid = $4
        `,
        [PstrCoID, String(PstrYear), lkpBranch, itemId]
      );

      const stock = Number(stockResult.rows[0]?.stock ?? 0);

      if (qtyOut > stock) {
        return failed(` Out of Stock for the Item  : ${itemId}`, `txtQtyOut-${index}`);
      }
    }

    // the TL's dbo.haveunitcost (company, branch, item, year, doc type, doc no,
    // qty in, qty out)
    const costResult = await pool.query(
      `SELECT dbo.haveunitcost($1::varchar, $2::varchar, $3::varchar, $4::varchar, $5::varchar, $6::varchar, $7::numeric, $8::numeric) AS "haveCost"`,
      [
        PstrCoID,
        lkpBranch,
        itemId,
        String(PstrYear),
        DOC_TYPE,
        txtDocNo,
        Math.ceil(qtyIn),
        Math.ceil(qtyOut),
      ]
    );

    if (!costResult.rows[0]?.haveCost) {
      return failed(` Check unit cost for the Item  : ${itemId}`, `lkpItemID-${index}`);
    }
  }

  return passed;
}
