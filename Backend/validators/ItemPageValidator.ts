import {
  type ValidationResult,
  passed,
  failed,
  isNullOrEmpty,
  getUserStatus,
  idleUserMessage,
} from "./common.js";

/* =========================================================
   ITEM PAGE - validations

   Same shape as the other screens' validators: the FIRST rule
   that fails is returned, with the field to put the cursor on
   (the same name as the element id on the page).

   The mandatory boxes are the ones that carry the red * on the page:
   Item ID, Item Name, Unit, Item Group, Supplier, Supplier Item ID,
   and at least one Branch row.
========================================================= */

export interface ItemPageData {
  PstrUserID?: unknown;
  txtItemID?: unknown;
  txtItemName?: unknown;
  lkpUnit?: unknown;
  lkpItemGroupID?: unknown;
  lkpSupplierID?: unknown;
  txtSupplierItemID?: unknown;
  rows?: unknown;
}

// in the order they sit on the page; "select" boxes get "Please select"
const REQUIRED_FIELDS: {
  field: keyof ItemPageData;
  label: string;
  select?: boolean;
}[] = [
  { field: "txtItemID", label: "Item ID" },
  { field: "txtItemName", label: "Item Name" },
  { field: "lkpUnit", label: "Unit", select: true },
  { field: "lkpItemGroupID", label: "Item Group", select: true },
  { field: "lkpSupplierID", label: "Supplier", select: true },
  { field: "txtSupplierItemID", label: "Supplier Item ID" },
];

export async function validateItemPage(
  data: ItemPageData
): Promise<ValidationResult> {
  // 1. the user must not be idle
  const userId = String(data.PstrUserID ?? "").trim();

  if (!(await getUserStatus(userId))) {
    return failed(idleUserMessage(userId), "txtItemID", 403);
  }

  // 2. the mandatory boxes
  for (const { field, label, select } of REQUIRED_FIELDS) {
    if (isNullOrEmpty(data[field])) {
      return failed(
        select ? `Please select '${label}'` : `Please input '${label}'`,
        field
      );
    }
  }

  // 3. at least one Branch row
  const rows = Array.isArray(data.rows)
    ? (data.rows as Record<string, unknown>[])
    : [];

  if (!rows.some((row) => !isNullOrEmpty(row.lkpBranch))) {
    return failed("Please select at least one 'Branch'", "lkpBranch_1");
  }

  return passed;
}
