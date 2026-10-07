import {
  type ValidationResult,
  passed,
  failed,
  isNullOrEmpty,
  getUserStatus,
  idleUserMessage,
} from "./common.js";

/* =========================================================
   SET CHART OF ACCOUNT - validations

   Same shape as the other screens' validators: the FIRST rule
   that fails is returned, with the field to put the cursor on
   (the same name as the element id on the page).

   The page sends only the filled rows, packed one after the other,
   so each row carries `txtGridRow` - its position in the grid
   (0 = first row) - and the field names point at the right cell.
========================================================= */

export interface SetChartOfAccountData {
  PstrUserID?: unknown;
  rows?: unknown;
}

export async function validateSetChartOfAccount(
  data: SetChartOfAccountData
): Promise<ValidationResult> {
  const rows = Array.isArray(data.rows)
    ? (data.rows as Record<string, unknown>[])
    : [];

  const gridIndexOf = (row: Record<string, unknown>, position: number) => {
    const given = Number(row.txtGridRow);
    return Number.isInteger(given) && given >= 0 ? given : position;
  };

  // 1. the user must not be idle
  const userId = String(data.PstrUserID ?? "").trim();

  if (!(await getUserStatus(userId))) {
    return failed(
      idleUserMessage(userId),
      `lkpParameterType-${rows.length ? gridIndexOf(rows[0], 0) : 0}`,
      403
    );
  }

  // 2. every row has both a Parameter and an Account, and no
  //    Parameter + Account pair is entered twice
  const seen = new Set<string>();

  for (const [position, row] of rows.entries()) {
    const index = gridIndexOf(row, position);
    const rowNo = index + 1;

    if (isNullOrEmpty(row.lkpParameterType)) {
      return failed(
        `Row ${rowNo}: select both a Parameter and an Account.`,
        `lkpParameterType-${index}`
      );
    }

    if (isNullOrEmpty(row.lkpAccountID)) {
      return failed(
        `Row ${rowNo}: select both a Parameter and an Account.`,
        `lkpAccountID-${index}`
      );
    }

    const pair = `${row.lkpParameterType}|${row.lkpAccountID}`
      .toString()
      .toUpperCase();

    if (seen.has(pair)) {
      return failed(`Row ${rowNo}: Duplicate Entry !`, `lkpAccountID-${index}`);
    }

    seen.add(pair);
  }

  return passed;
}
