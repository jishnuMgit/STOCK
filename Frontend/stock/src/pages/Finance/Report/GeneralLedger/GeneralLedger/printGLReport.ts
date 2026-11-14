// printGLReport.ts
// The General Ledger (port of rptGLRpt): A4 LANDSCAPE, company name, heading,
// branch, then one block per account ("Account : id name", column labels,
// the lines with a running balance Dr / Cr and a "Total :" row). Every account
// starts on a new page and its header repeats on each page of the account.
// "Page x / y" top right and "Printed : user  date" bottom right of every page; the font, the sizes and the line colour
// are the "inter" look of components/common/reportStyle.ts.
// buildHtml is used by the print preview; printGLReport sends the report to the
// printer (browser print dialog, hidden iframe - no pop-up).
//
// NOTE: the browser numbers the pages of the whole report ("Page 3 of 12").
// The PDF restarts the numbering for each account, like the VB report.

import { cssStr, esc, printHtmlDocument } from "../../../../../components/common/printHtml";
import { REPORT_STYLE, reportLook } from "../../../../../components/common/reportStyle";

export type GLLine = {
  date: string;
  brId: string;
  docType: string;
  docNo: string;
  description: string;
  ref: string;
  ccId: string;
  debit: number;
  credit: number;
  balance: string; // "1,234.00 Dr" / "1,234.00 Cr"
};

export type GLAccount = {
  accountId: string;
  accountName: string;
  rows: GLLine[];
  totalDebit: number;
  totalCredit: number;
  balance: string;
};

export type PrintReport = {
  coName: string;
  heading: string;
  branch: string;
  reportInfo: string; // "<user>  dd/mm/yyyy hh:mm" - "Printed : ..." bottom right of every page
  accounts: GLAccount[];
};

// VB {0:#,#0.00}
export const amount = (v: number) =>
  v.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

// Date, Br. ID, Type, Doc. No., Description, C.C ID, Debit, Credit, Balance (percent of the width; the labels are in the
// 14 px of the look, so the narrow columns are wide enough for them)
const PERCENT = [8, 5.5, 5, 9, 32, 6, 11, 11, 12.5];
export const COL_WIDTHS = PERCENT.map((p) => p / 100);

export const COL_LABELS = [
  "Date", "Br. ID", "Type", "Doc. No.", "Description",
  "C.C ID", "Debit", "Credit", "Balance",
];

const rowHtml = (r: GLLine) => `<tr>
  <td>${esc(r.date)}</td>
  <td>${esc(r.brId)}</td>
  <td>${esc(r.docType)}</td>
  <td>${esc(r.docNo)}</td>
  <td>${esc(r.description)}</td>
  <td>${esc(r.ccId)}</td>
  <td class="r">${amount(r.debit)}</td>
  <td class="r">${amount(r.credit)}</td>
  <td class="r">${esc(r.balance)}</td>
</tr>`;

const accountHtml = (r: PrintReport, a: GLAccount, first: boolean) => `
<table class="g${first ? "" : " pb"}">
  <colgroup>
    ${COL_WIDTHS.map((w) => `<col style="width:${(w * 100).toFixed(2)}%" />`).join("\n    ")}
  </colgroup>
  <thead>
    <tr><td colspan="9" class="co"   style="border:0">${esc(r.coName)}</td></tr>
    <tr><td colspan="9" class="head" style="border:0">${esc(r.heading)}</td></tr>
    <tr><td colspan="9" class="br" style="border:0">${esc(r.branch)}</td></tr>
    <tr><td colspan="9" class="acc">Account : &nbsp;${esc(a.accountId)} &nbsp;&nbsp;${esc(a.accountName)}</td></tr>
    <tr>
      ${COL_LABELS.map((l, i) => `<th class="${i >= 6 ? "r" : ""}">${l}</th>`).join("")}
    </tr>
  </thead>
  <tbody>
    ${a.rows.map(rowHtml).join("\n")}
    <tr class="tot">
      <td colspan="6" class="r">Total :</td>
      <td class="r">${amount(a.totalDebit)}</td>
      <td class="r">${amount(a.totalCredit)}</td>
      <td class="r">${esc(a.balance)}</td>
    </tr>
  </tbody>
</table>`;

export const buildHtml = (r: PrintReport) => {
  // the font and the sizes come from the shared look (components/common/reportStyle.ts)
  const { css, size } = reportLook("inter");
  const font = css.family;
  const { lineColor } = REPORT_STYLE;

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${esc(r.heading)}</title>
<style>${css.importCss}
  @page {
    size: A4 landscape;
    margin: 12.7mm 10mm 14mm 19mm;
    @top-right    { content: "Page " counter(page) " / " counter(pages); font: ${size.small}pt ${font}; }
    @bottom-right { content: "Printed : ${cssStr(r.reportInfo)}"; font: ${size.small}pt ${font}; }
  }
  * { box-sizing: border-box; }
  body { margin: 0; font: ${size.body}pt ${font}; color: #000;
         -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  table.pb { break-before: page; page-break-before: always; }   /* each account on a new page */
  thead { display: table-header-group; }   /* header repeats on every page */
  tr { page-break-inside: avoid; }
  .co   { font-size: ${size.company}pt; text-align: center; height: 34px; vertical-align: top; }
  .head { font-size: ${size.heading}pt; text-align: center; height: 26px; }
  .br   { font-size: ${size.group}pt; text-align: left; height: 22px; }
  .acc  { font-size: ${size.group}pt; height: 26px; padding: 0 4px; border: 1px solid ${lineColor}; }
  th { border: 1px solid ${lineColor}; height: 24px; font-size: ${size.columnHead}pt;
       padding: 0 4px; font-weight: normal; text-align: left; }
  th.r { text-align: right; }
  td { border: 1px solid ${lineColor}; border-top: 0; height: 22px; padding: 0 4px;
       overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
  td.r { text-align: right; }
  tr.tot td { font-weight: bold; border-top: 1px solid ${lineColor}; }
</style>
</head>
<body>
${r.accounts.map((a, i) => accountHtml(r, a, i === 0)).join("\n")}
</body>
</html>`;
};

export const printGLReport = (report: PrintReport): void => printHtmlDocument(buildHtml(report));
