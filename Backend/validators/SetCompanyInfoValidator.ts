import {
  type ValidationResult,
  passed,
  failed,
  isNullOrEmpty,
  getUserStatus,
  idleUserMessage,
} from "./common.js";

/* =========================================================
   SET COMPANY INFO - validations
   (port of the old form's ValidateMe)

   Field names are the same as the element ids on the page,
   so the page can put the cursor straight into `field`.
========================================================= */

export interface SetCompanyInfoData {
  lkpCoName?: unknown;
  PstrUserID?: unknown;
  txtCoName_AR?: unknown;
  txtCoName_QR?: unknown;
  txtCoName_Short?: unknown;
  txtCoVATNo?: unknown;
  txtCoVATNo_AR?: unknown;
}

// a VAT number is exactly this many characters
const VAT_LENGTH = 15;

const text = (value: unknown): string => String(value ?? "").trim();

/* ---------------------------------------------------------
   mode "G"        - loading a company: a company is chosen
   mode "S" / "M"  - save / modify: the checks below, in this
                     order, stopping at the first one that fails
--------------------------------------------------------- */

export async function validateSetCompanyInfo(
  mode: "G" | "S" | "M",
  data: SetCompanyInfoData
): Promise<ValidationResult> {
  if (mode === "G") {
    if (isNullOrEmpty(data.lkpCoName)) {
      return failed("Please select a 'Company'", "lkpCoName");
    }

    return passed;
  }

  // 1. the user must not be idle
  const userId = text(data.PstrUserID);

  if (!(await getUserStatus(userId))) {
    return failed(idleUserMessage(userId), "lkpCoName", 403);
  }

  // 2. a company is chosen
  if (isNullOrEmpty(data.lkpCoName)) {
    return failed("Please select a 'Company'", "lkpCoName");
  }

  // 3. the names (the fields marked with a red * on the form)
  if (isNullOrEmpty(data.txtCoName_AR)) {
    return failed("Please input 'Company Name (AR)'", "txtCoName_AR");
  }

  if (isNullOrEmpty(data.txtCoName_QR)) {
    return failed("Please input a 'Company Name in QR Code'", "txtCoName_QR");
  }

  if (isNullOrEmpty(data.txtCoName_Short)) {
    return failed("Please input 'Company Name (Short)'", "txtCoName_Short");
  }

  // 4. VAT No.
  if (isNullOrEmpty(data.txtCoVATNo)) {
    return failed("Please input 'VAT No.'", "txtCoVATNo");
  }

  if (text(data.txtCoVATNo).length !== VAT_LENGTH) {
    return failed(
      `Length of 'VAT No.' Should be ${VAT_LENGTH}`,
      "txtCoVATNo"
    );
  }

  // 5. VAT No. (AR) - the old form measured the English field here by
  //    mistake; this measures the Arabic one
  if (isNullOrEmpty(data.txtCoVATNo_AR)) {
    return failed("Please input 'VAT No. (AR)'", "txtCoVATNo_AR");
  }

  if (text(data.txtCoVATNo_AR).length !== VAT_LENGTH) {
    return failed(
      `Length of 'VAT No. (AR)' Should be ${VAT_LENGTH}`,
      "txtCoVATNo_AR"
    );
  }

  return passed;
}
