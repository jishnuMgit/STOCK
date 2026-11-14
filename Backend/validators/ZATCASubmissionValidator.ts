import type { ZatcaSearchParams } from "../services/ZATCA/Transaction/zatcaSubmissionService.js";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DOCNO_RE = /^[A-Za-z0-9._\-/]+$/;

const isRealDate = (s: string): boolean => {
  const m = DATE_RE.exec(s);
  if (!m) return false;

  const y = Number(m[0].slice(0, 4));
  const mo = Number(m[0].slice(5, 7));
  const d = Number(m[0].slice(8, 10));
  const date = new Date(Date.UTC(y, mo - 1, d));

  return (
    date.getUTCFullYear() === y &&
    date.getUTCMonth() === mo - 1 &&
    date.getUTCDate() === d
  );
};

/* the old ValidateMe of frmZATCAFileSubmission; returns the message, or null */
export const validateZATCASearch = (p: ZatcaSearchParams): string | null => {
  if (p.docMode === "one" && !p.docType) return "Please input 'Document'";

  if ((p.docType === "DN" || p.docType === "CN") && !p.branchId) {
    return "Please select a 'Branch'";
  }

  if (p.filterBy === "no") {
    const fromDocNo = p.fromDocNo?.trim() ?? "";
    const toDocNo = (p.toDocNo?.trim() || fromDocNo).trim();

    if (!fromDocNo) return "Please input 'From Invoice No.'";
    if (!DOCNO_RE.test(fromDocNo) || !DOCNO_RE.test(toDocNo)) {
      return "Invalid 'Invoice No.'";
    }

    const from = Number(fromDocNo.replace(/\D/g, ""));
    const to = Number(toDocNo.replace(/\D/g, ""));
    if (Number.isNaN(from) || Number.isNaN(to)) {
      return "Invalid 'Invoice No.'";
    }
    if (from > to) return "'From Invoice No.' should be less than 'To Invoice No.'";
    return null;
  }

  if (!p.fromDate) return "Please select 'Invoice From Date'";
  if (!p.toDate) return "Please select 'Invoice To Date'";
  if (!isRealDate(p.fromDate)) return "Invalid 'Invoice From Date'";
  if (!isRealDate(p.toDate)) return "Invalid 'Invoice To Date'";
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
