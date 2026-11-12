import type { ZatcaPdfA3Params } from "../services/ZATCA/Transaction/zatcaPdfA3PendingService.js";

const DATE_RE = /^(\d{2})\/(\d{2})\/(\d{4})$/; // DD/MM/YYYY

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

// the running number at the end of an invoice no. (the VB form compared the numbers)
const tailNumber = (s: string): number => {
  const m = /(\d+)$/.exec(s);
  return m ? Number(m[1]) : NaN;
};

// document numbers go into the filter text of the procedure: letters and digits only
const DOCNO_RE = /^[A-Za-z0-9\-_/]+$/;

/* the old ValidateMe of frmZATCAPDFA3Pending; returns the message, or null.
   (the "This User is Idle" check is the session check of the router) */
export const validateZatcaPdfA3 = (p: ZatcaPdfA3Params): string | null => {
  if (p.documentMode === "one" && !p.invType) return "Please input 'Document'";

  if (p.branchMode === "one" && !p.branchId) return "Please select a 'Branch'";

  if (p.invoiceMode === "id") {
    if (!p.fromInvoiceNo) return "Please input 'From Invoice No.'";
    if (!DOCNO_RE.test(p.fromInvoiceNo) || !DOCNO_RE.test(p.toInvoiceNo)) {
      return "Invalid 'Invoice No.'";
    }
    if (p.fromInvoiceNo.length !== p.toInvoiceNo.length) {
      return "'From Invoice No.' and 'To Invoice No.' should have the same length";
    }
    if (tailNumber(p.fromInvoiceNo) > tailNumber(p.toInvoiceNo)) {
      return "'From Invoice No.' should be less than 'To Invoice No.'";
    }
    return null;
  }

  if (!p.fromDate) return "Please select 'Invoice From Date'";
  if (!p.toDate) return "Please select 'Invoice To Date'";
  if (!isRealDate(p.fromDate)) return "Invalid 'Invoice From Date'";
  if (!isRealDate(p.toDate)) return "Invalid 'Invoice To Date'";

  if (key(p.fromDate) > key(p.toDate)) {
    return "'To Date' should be greater than or equal to 'From Date'";
  }
  if (p.fromDate.slice(6) !== p.toDate.slice(6)) {
    return "'From Date' & 'To Date' should be in same year";
  }

  if (p.customerMode === "one" && !p.customerId) return "Please select 'Customer ID'";

  return null;
};
