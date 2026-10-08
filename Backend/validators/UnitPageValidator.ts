import {
  type ValidationResult,
  passed,
  failed,
  isNullOrEmpty,
  getUserStatus,
  idleUserMessage,
} from "./common.js";

/* =========================================================
   UNIT PAGE - validations

   Same shape as the other screens' validators: the FIRST rule
   that fails is returned, with the field to put the cursor on
   (the same name as the element id on the page: txtUnit-<row>).

   The page sends only the filled rows, packed one after the other,
   so each row carries `txtGridRow` - its position in the grid
   (0 = first row) - and the field names point at the right box.
========================================================= */

export interface UnitPageData {
  PstrUserID?: unknown;
  rows?: unknown;
  // saved units the user removed from the grid (deleted when Modify is pressed)
  deletedRows?: unknown;
}

// tblunit.funit varchar(8)
const UNIT_LENGTH = 8;

const text = (value: unknown): string => String(value ?? "").trim();

export async function validateUnitPage(
  data: UnitPageData
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
      `txtUnit-${rows.length ? gridIndexOf(rows[0], 0) : 0}`,
      403
    );
  }

  // 2. something to save: a unit in the grid, or a unit removed from it
  const deletedRows = Array.isArray(data.deletedRows) ? data.deletedRows : [];

  if (rows.length === 0 && deletedRows.length === 0) {
    return failed("There is no information for saving.", "txtUnit-0");
  }

  // 3. every unit: filled, at most 8 characters, and not entered twice
  const seen = new Set<string>();

  for (const [position, row] of rows.entries()) {
    const index = gridIndexOf(row, position);
    const unit = text(row.txtUnit);

    if (isNullOrEmpty(unit)) {
      return failed("Please input 'Unit'", `txtUnit-${index}`);
    }

    if (unit.length > UNIT_LENGTH) {
      return failed(
        `'Unit' cannot be longer than ${UNIT_LENGTH} characters`,
        `txtUnit-${index}`
      );
    }

    if (seen.has(unit.toLowerCase())) {
      return failed("Unit already exists", `txtUnit-${index}`);
    }

    seen.add(unit.toLowerCase());
  }

  return passed;
}
