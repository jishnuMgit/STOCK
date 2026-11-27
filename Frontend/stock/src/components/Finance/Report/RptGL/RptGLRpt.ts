// RptGLRpt.ts
// The printed General Ledger (port of rptGLRpt): A4 LANDSCAPE, company name, heading,
// branch, then one block per account ("Account : id name", column labels,
// the lines with a running balance Dr / Cr and a "Total :" row). Every account
// starts on a new page and its header repeats on each page of the account.
// The stock look (common/reportStyle.ts, STOCK_REPORT_CSS): the same design as the stock documents - "Page x of y" on a line of its
// own under the heading, the 11 px text, the light thin lines, "Printed : ..." at the bottom right (9 px). The company, the heading,
// the branch and the account repeat at the top of every page.
// buildHtml is used by the print preview; printGLReport sends the report to the
// printer (browser print dialog, hidden iframe - no pop-up).
//
// NOTE: the browser numbers the pages of the whole report ("Page 3 of 12").
// The PDF restarts the numbering for each account, like the VB report.

import { branchLineHtml, esc, printHtmlDocument } from "../../../common/printHtml";
import { reportPrintCss } from "../../../common/reportStyle";

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
    <tr><td colspan="9" class="pagerow" style="border:0"></td></tr>
    <tr><td colspan="9" class="sub"  style="border:0">${branchLineHtml(r.branch)}</td></tr>
    <tr><td colspan="9" class="group">Account&nbsp; : &nbsp;<b>${esc(a.accountId)}</b>&nbsp;&nbsp;${esc(a.accountName)}</td></tr>
    <tr>
      ${COL_LABELS.map((l, i) => `<th class="${i >= 6 ? "r" : ""}">${l}</th>`).join("")}
    </tr>
  </thead>
  <tbody>
    ${a.rows.map(rowHtml).join("\n")}
    <tr class="tot">
      <td colspan="6" class="r"><b>Total :</b></td>
      <td class="r"><b>${amount(a.totalDebit)}</b></td>
      <td class="r"><b>${amount(a.totalCredit)}</b></td>
      <td class="r"><b>${esc(a.balance)}</b></td>
    </tr>
  </tbody>
</table>`;

export const buildHtml = (r: PrintReport) => `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${esc(r.heading)}</title>
<style>${reportPrintCss({ reportInfo: r.reportInfo, look: "inter", stockLook: true, orientation: "landscape", marginLeft: "19mm", groupSelector: "td.group",
  extra: `
  table.pb { break-before: page; page-break-before: always; } /* each account on a new page */
  td.group { font-size: 11px; } /* the account line is 11 px too, as the rows */` })}
</style>
</head>
<body>
${r.accounts.map((a, i) => accountHtml(r, a, i === 0)).join("\n")}
</body>
</html>`;

export const printGLReport = (report: PrintReport): void => printHtmlDocument(buildHtml(report));
