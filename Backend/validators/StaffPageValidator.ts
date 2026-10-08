import {
  type ValidationResult,
  passed,
  failed,
  isNullOrEmpty,
  getUserStatus,
  idleUserMessage,
} from "./common.js";

/* =========================================================
   STAFF PAGE - validations

   Same shape as the other screens' validators: the FIRST rule
   that fails is returned, with the field to put the cursor on
   (the same name as the element id on the page: txtStaffID-<row>,
   txtStaffName-<row>).

   The page sends only the filled rows, packed one after the other,
   so each row carries `txtGridRow` - its position in the grid
   (0 = first row) - and the field names point at the right box.

   The rules are the old form's: a staff member needs BOTH an id and a
   name, and neither the id nor the name may be entered twice.
========================================================= */

export interface StaffPageData {
  PstrUserID?: unknown;
  rows?: unknown;
  // saved staff the user removed from the grid (deleted when Modify is pressed)
  deletedRows?: unknown;
}

// tblstaff.fstaffid varchar(4), fstaffname varchar(50)
const STAFF_ID_LENGTH = 4;
const STAFF_NAME_LENGTH = 50;

const text = (value: unknown): string => String(value ?? "").trim();

export async function validateStaffPage(
  data: StaffPageData
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
    return failed(
      idleUserMessage(userId),
      `txtStaffID-${rows.length ? gridIndexOf(rows[0], 0) : 0}`,
      403
    );
  }

  // 2. something to save: a staff member in the grid, or one removed from it
  const deletedRows = Array.isArray(data.deletedRows) ? data.deletedRows : [];

  if (rows.length === 0 && deletedRows.length === 0) {
    return failed("There is no information for saving.", "txtStaffID-0");
  }

  // 3. every staff member: id and name filled, within the lengths, and neither
  //    entered twice
  const seenIds = new Set<string>();
  const seenNames = new Set<string>();

  for (const [position, row] of rows.entries()) {
    const index = gridIndexOf(row, position);
    const txtStaffID = text(row.txtStaffID);
    const txtStaffName = text(row.txtStaffName);

    if (isNullOrEmpty(txtStaffID)) {
      return failed("Please input 'Staff ID'", `txtStaffID-${index}`);
    }

    if (txtStaffID.length > STAFF_ID_LENGTH) {
      return failed(
        `'Staff ID' cannot be longer than ${STAFF_ID_LENGTH} characters`,
        `txtStaffID-${index}`
      );
    }

    if (isNullOrEmpty(txtStaffName)) {
      return failed("Please input 'Staff Name'", `txtStaffName-${index}`);
    }

    if (txtStaffName.length > STAFF_NAME_LENGTH) {
      return failed(
        `'Staff Name' cannot be longer than ${STAFF_NAME_LENGTH} characters`,
        `txtStaffName-${index}`
      );
    }

    if (seenIds.has(txtStaffID.toLowerCase())) {
      return failed("Staff ID already exists", `txtStaffID-${index}`);
    }

    if (seenNames.has(txtStaffName.toLowerCase())) {
      return failed("Staff Name already exists", `txtStaffName-${index}`);
    }

    seenIds.add(txtStaffID.toLowerCase());
    seenNames.add(txtStaffName.toLowerCase());
  }

  return passed;
}
