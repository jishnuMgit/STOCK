// RptReceivablesRpt.ts
// The printed Receivables report (port of rptReceivablesRpt): A4 portrait, company name,
// heading, branch, columns Account ID, Account Name, Debit, Credit and a
// "Total :" row at the end.
// The stock look (common/reportStyle.ts, STOCK_REPORT_CSS): the same design as the stock documents - "Page x of y" on a line of its
// own under the heading, the 11 px text, the light thin lines, "Printed : ..." at the bottom right (9 px). The company, the heading
// and the branch repeat at the top of every page.
// buildHtml is used by the print preview; printReceivablesReport sends the
// report to the printer (browser print dialog, hidden iframe - no pop-up).

import { branchLineHtml, esc, printHtmlDocument } from "../../../common/printHtml";
import { reportPrintCss } from "../../../common/reportStyle";

export type ReceivableRow = {
  accountId: string;
  accountName: string;
  debit: number;
  credit: number;
};

export type PrintReport = {
  coName: string;
  heading: string;
  branch: string;
  reportInfo: string; // "<user>  dd/mm/yyyy hh:mm" - bottom right of every page
  rows: ReceivableRow[];
  totalDebit: number;
  totalCredit: number;
};

// VB {0:#,#0.00}
export const amount = (v: number) =>
  v.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

// Account ID, Account Name, Debit, Credit
export const COL_WIDTHS = [0.2, 0.4, 0.2, 0.2];

const rowHtml = (r: ReceivableRow) => `<tr>
  <td>${esc(r.accountId)}</td>
  <td>${esc(r.accountName)}</td>
  <td class="r">${amount(r.debit)}</td>
  <td class="r">${amount(r.credit)}</td>
</tr>`;

export const buildHtml = (r: PrintReport) => `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${esc(r.heading)}</title>
<style>${reportPrintCss({ reportInfo: r.reportInfo, look: "inter", stockLook: true, orientation: "portrait", marginLeft: "25.4mm", groupSelector: "td.group" })}
</style>
</head>
<body>
<table>
  <colgroup>
    ${COL_WIDTHS.map((w) => `<col style="width:${(w * 100).toFixed(2)}%" />`).join("\n    ")}
  </colgroup>
  <thead>
    <tr><td colspan="4" class="co"   style="border:0">${esc(r.coName)}</td></tr>
    <tr><td colspan="4" class="head" style="border:0">${esc(r.heading)}</td></tr>
    <tr><td colspan="4" class="pagerow" style="border:0"></td></tr>
    <tr><td colspan="4" class="sub"  style="border:0">${branchLineHtml(r.branch)}</td></tr>
    <tr>
      <th>Account ID</th><th>Account Name</th>
      <th class="r">Debit</th><th class="r">Credit</th>
    </tr>
  </thead>
  <tbody>
    ${r.rows.map(rowHtml).join("\n")}
    <tr class="tot">
      <td colspan="2" class="r"><b>Total :</b></td>
      <td class="r"><b>${amount(r.totalDebit)}</b></td>
      <td class="r"><b>${amount(r.totalCredit)}</b></td>
    </tr>
  </tbody>
</table>
</body>
</html>`;

export const printReceivablesReport = (report: PrintReport): void => printHtmlDocument(buildHtml(report));
