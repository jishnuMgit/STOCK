import {
  type ValidationResult,
  passed,
  failed,
  isNullOrEmpty,
  getUserStatus,
  idleUserMessage,
} from "./common.js";

/* =========================================================
   ITEM GROUP PAGE - validations

   Same shape as the other screens' validators: the FIRST rule
   that fails is returned, with the field to put the cursor on
   (the same name as the element id on the page).

   All four boxes carry the red *: Item Group ID, Item Group Name,
   VAT Slab (and the VAT % that comes with it).
========================================================= */

export interface ItemGroupPageData {
  PstrUserID?: unknown;
  txtItemGroupID?: unknown;
  txtItemGroupName?: unknown;
  lkpVATSlab?: unknown;
}

// tblitemgroup.fitemgroupid varchar(8), fitemgroupname varchar(60)
const ITEM_GROUP_ID_LENGTH = 8;
const ITEM_GROUP_NAME_LENGTH = 60;

const text = (value: unknown): string => String(value ?? "").trim();

export async function validateItemGroupPage(
  data: ItemGroupPageData
): Promise<ValidationResult> {
  // 1. the user must not be idle
  const userId = text(data.PstrUserID);

  if (!(await getUserStatus(userId))) {
    return failed(idleUserMessage(userId), "txtItemGroupID", 403);
  }

  // 2. Item Group ID
  if (isNullOrEmpty(data.txtItemGroupID)) {
    return failed("Please input 'Item Group ID'", "txtItemGroupID");
  }

  if (text(data.txtItemGroupID).length > ITEM_GROUP_ID_LENGTH) {
    return failed(
      `'Item Group ID' cannot be longer than ${ITEM_GROUP_ID_LENGTH} characters`,
      "txtItemGroupID"
    );
  }

  // 3. Item Group Name
  if (isNullOrEmpty(data.txtItemGroupName)) {
    return failed("Please input 'Item Group Name'", "txtItemGroupName");
  }

  if (text(data.txtItemGroupName).length > ITEM_GROUP_NAME_LENGTH) {
    return failed(
      `'Item Group Name' cannot be longer than ${ITEM_GROUP_NAME_LENGTH} characters`,
      "txtItemGroupName"
    );
  }

  // 4. VAT Slab
  if (isNullOrEmpty(data.lkpVATSlab)) {
    return failed("Please select 'VAT Slab'", "lkpVATSlab");
  }

  return passed;
}
