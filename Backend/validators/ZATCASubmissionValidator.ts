import type { ZatcaSearchParams } from "../../../services/ZATCA/Transaction/zatcaSubmissionService.js";

/* the old ValidateMe of frmZATCAFileSubmission; returns the message, or null */
export const validateZATCASearch = (p: ZatcaSearchParams): string | null => {
  if (p.docMode === "one" && !p.docType) return "Please input 'Document'";

  if ((p.docType === "DN" || p.docType === "CN") && !p.branchId) {
    return "Please select a 'Branch'";
  }

  if (p.filterBy === "no") {
    if (!p.fromDocNo?.trim()) return "Please input 'From Invoice No.'";
    const from = Number(p.fromDocNo.replace(/\D/g, ""));
    const to = Number((p.toDocNo || p.fromDocNo).replace(/\D/g, ""));
    if (from > to) return "'From Invoice No.' should be less than 'To Invoice No.'";
    return null;
  }

  if (!p.fromDate) return "Please select 'Invoice From Date'";
  if (!p.toDate) return "Please select 'Invoice To Date'";
  if (p.fromDate > p.toDate) {
    return "'To Date' should be greater than or equal to 'From Date'";
  }
  if (p.fromDate.slice(0, 4) !== p.toDate.slice(0, 4)) {
    return "'From Date' & 'To Date' should be in same year";
  }
  return null;
};

export const validateZATCASubmit = (docs: unknown): string | null =>
  Array.isArray(docs) && docs.length > 0
    ? null
    : "Please select at least one document";
