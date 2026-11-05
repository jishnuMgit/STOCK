// MatchEnquiryPrintReport.ts
// The printed Match Enquiry report (the old rptMatchEnquiryPrint), A4 portrait.
//
//   Br. ID / Date / Type / Doc. No. / Description / Debit / Credit / Match Apply Date.
//   One block for each customer / supplier account: "Account : id name", its lines (the document and the documents
//   matched to it), "Total :" - and a new page after each block. The block's heading repeats on every page of it.
//   The amounts have 2 decimals, a negative in brackets (as the other reports).
//   "Page x of y" is top right of every page; the company, the heading, the branch, the document and the report info
//   repeat at the top of every page.
// Printed through components/common/printHtml (a hidden iframe).
import { esc, printHtmlDocument } from "../../common/printHtml";
import { reportPrintCss } from "../../common/reportStyle";

// ---- what the server sends (names = the server's response keys) ----

export type MatchEnquiryLine = {
  txtBrID: string;
  // dd-MMM-yyyy
  txtDate: string;
  txtDocType: string;
  txtDocNo: string;
  txtDescription: string;
  txtDebit: number;
  txtCredit: number;
  // dd-MMM-yyyy
  txtMatchApplyDate: string;
};

export type MatchEnquiryGroup = {
  lkpAccountID: string;
  txtAccountName: string;
  lines: MatchEnquiryLine[];
  totals: { txtDebit: number; txtCredit: number };
};

export type PrintReport = {
  txtCoName: string;
  txtHeading: string;
  // "Branch : X"
  txtBranch: string;
  // "Document : BR JD-26000010"
  txtDocument: string;
  txtReportInfo: string;
  groups: MatchEnquiryGroup[];
};

// the amounts: 2 decimals, a negative in brackets, 0 as 0.00
export const formatAmount = (value: number) => {
  const text = Math.abs(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return value < 0 ? `(${text})` : text;
};

export const COLUMN_LABELS = [
  "Br. ID",
  "Date",
  "Type",
  "Doc. No.",
  "Description",
  "Debit",
  "Credit",
  "Match Apply Date",
];

// the column weights, as the old report: Br. ID .069 | Date .113 | Type .056 | Doc. No. .110 | Description .248 |
// Debit .124 | Credit .124 | Match Apply Date .156
export const COLUMN_WEIGHTS = [0.0689, 0.1129, 0.0565, 0.1102, 0.2479, 0.124, 0.124, 0.1556];

// the columns that are numbers (Debit, Credit)
export const isAmountColumn = (column: number) => column === 5 || column === 6;

// the heading of a block
export const accountHeading = (g: MatchEnquiryGroup) =>
  `Account : ${g.lkpAccountID} ${g.txtAccountName}`.trimEnd();

const lineHtml = (l: MatchEnquiryLine) => `<tr>
      <td>${esc(l.txtBrID)}</td>
      <td>${esc(l.txtDate)}</td>
      <td>${esc(l.txtDocType)}</td>
      <td>${esc(l.txtDocNo)}</td>
      <td>${esc(l.txtDescription)}</td>
      <td class="r">${formatAmount(l.txtDebit)}</td>
      <td class="r">${formatAmount(l.txtCredit)}</td>
      <td>${esc(l.txtMatchApplyDate)}</td>
    </tr>`;

// one block: its own table (so the next block starts on a new page), the title and the column labels repeat on each page
const groupHtml = (r: PrintReport, g: MatchEnquiryGroup, pageBreak: boolean) => `<table${pageBreak ? ' style="page-break-before:always"' : ""}>
  <colgroup>
    ${COLUMN_WEIGHTS.map((w) => `<col style="width:${(w * 100).toFixed(1)}%" />`).join("")}
  </colgroup>
  <thead>
    <tr><td colspan="8" class="co"   style="border:0">${esc(r.txtCoName)}</td></tr>
    <tr><td colspan="8" class="head" style="border:0">${esc(r.txtHeading)}</td></tr>
    <tr><td colspan="8" class="sub"  style="border:0"><div><span>${esc(r.txtBranch)}</span><span class="info">${esc(r.txtReportInfo)}</span></div></td></tr>
    <tr><td colspan="8" class="sub"  style="border:0"><div><span>${esc(r.txtDocument)}</span></div></td></tr>
    <tr>${COLUMN_LABELS.map((label, i) => `<th${isAmountColumn(i) ? ' class="r"' : ""}>${label}</th>`).join("")}</tr>
    <tr><td colspan="8" class="group">${esc(accountHeading(g))}</td></tr>
  </thead>
  <tbody>
    ${g.lines.map(lineHtml).join("\n    ")}
    <tr class="tot">
      <td colspan="5" class="r"><b>Total :</b></td>
      <td class="r"><b>${formatAmount(g.totals.txtDebit)}</b></td>
      <td class="r"><b>${formatAmount(g.totals.txtCredit)}</b></td>
      <td></td>
    </tr>
  </tbody>
</table>`;

export const buildHtml = (r: PrintReport) => `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Match Enquiry</title>
<style>${reportPrintCss({ orientation: "portrait", marginLeft: "15mm", groupSelector: "td.group" })}
</style>
</head>
<body>
${r.groups.map((g, i) => groupHtml(r, g, i > 0)).join("\n")}
</body>
</html>`;

export const printMatchEnquiryReport = (report: PrintReport): void =>
  printHtmlDocument(buildHtml(report));
