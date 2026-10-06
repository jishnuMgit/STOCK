import {
  type ValidationResult,
  passed,
  failed,
  isNullOrEmpty,
  getUserStatus,
  idleUserMessage,
} from "./common.js";

/* =========================================================
   SET BRANCH INFO - validations
   (port of the old form's ValidateMe)

   Field names are the same as the element ids on the page,
   so the page can put the cursor straight into `field`.
   Every row has an English box (txtXxx) and an Arabic box
   (txtXxx_AR); the English one is checked first.
========================================================= */

export interface SetBranchInfoData {
  lkpBranch?: unknown;
  PstrUserID?: unknown;
  [field: string]: unknown;
}

interface Row {
  field: string; // English box; the Arabic box is `${field}_AR`
  label: string; // the label shown on the page
  optional?: boolean; // may stay empty
  length?: number; // when filled, exactly this many characters
}

// in the order the old ValidateMe checked them
const ROWS: Row[] = [
  { field: "txtBuildingNo", label: "Building No.", length: 4 },
  { field: "txtStreetName", label: "Street Name" },
  { field: "txtDistrict", label: "District" },
  { field: "txtCity", label: "City" },
  { field: "txtCountry", label: "Country" },
  { field: "txtPostalCode", label: "Postal Code", length: 5 },
  { field: "txtAdditionalNo", label: "Additional No.", optional: true, length: 4 },
  { field: "txtCRNo", label: "CR No." },
  { field: "txtLicenseNo", label: "License No." },
  { field: "txtLicenseCategory", label: "License Category" },
];

const text = (value: unknown): string => String(value ?? "").trim();

export async function validateSetBranchInfo(
  data: SetBranchInfoData
): Promise<ValidationResult> {
  // 1. the user must not be idle
  const userId = text(data.PstrUserID);

  if (!(await getUserStatus(userId))) {
    return failed(idleUserMessage(userId), "lkpBranch", 403);
  }

  // 2. a branch is chosen
  if (isNullOrEmpty(data.lkpBranch)) {
    return failed("Please select a 'Branch'", "lkpBranch");
  }

  // 3. each row: English box, then Arabic box
  for (const row of ROWS) {
    for (const [field, label] of [
      [row.field, row.label],
      [`${row.field}_AR`, `${row.label} (AR)`],
    ] as const) {
      const value = text(data[field]);

      if (value === "") {
        if (row.optional) continue;

        return failed(`Please input '${label}'`, field);
      }

      // "Should be 4 digits" - the old code only counted characters
      // (it did not check that they are digits), and so does this
      if (row.length && value.length !== row.length) {
        return failed(
          `Length of '${label}' Should be ${row.length} digits`,
          field
        );
      }
    }
  }

  return passed;
}
