import type { ZatcaDocStatusParams } from "../services/ZATCA/Transaction/zatcaDocumentStatusService.js";

const DATE_RE = /^(\d{2})\/(\d{2})\/(\d{4})$/; // DD/MM/YYYY, what the SP's to_date expects

const isRealDate = (s: string): boolean => {
  const m = DATE_RE.exec(s);
  if (!m) return false;
  const d = Number(m[1]);
  const mo = Number(m[2]);
  const y = Number(m[3]);
  const dt = new Date(y, mo - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === mo - 1 && dt.getDate() === d;
};

// sortable yyyymmdd
const key = (s: string): string => s.slice(6) + s.slice(3, 5) + s.slice(0, 2);

/* the old ValidateMe_P of rptZATCADoxStatus; returns the message, or null */
export const validateZATCADocumentStatus = (p: ZatcaDocStatusParams): string | null => {
  if (p.branchMode === "one" && !p.branchId) return "Please select 'Branch'";

  if (!p.fromDate) return "Please select 'From Date'";
  if (!p.toDate) return "Please select 'To Date'";
  if (!isRealDate(p.fromDate)) return "Invalid 'From Date'";
  if (!isRealDate(p.toDate)) return "Invalid 'To Date'";

  if (key(p.fromDate) > key(p.toDate)) {
    return "'To Date' should be greater than or equal to 'From Date'";
  }
  return null;
};
