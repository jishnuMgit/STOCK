// RptCustomerListRpt.ts
// The printed Customer List (port of rptCustomerListRpt): A4 LANDSCAPE, company name,
// heading, then Customer ID / Name / Address / Contact / Phone /
// VAT No. / Credit Limit / Credit Days, coloured by account level.
// The stock look (common/reportStyle.ts, STOCK_REPORT_CSS): the same design as the stock documents - "Page x of y" on a line of its
// own under the heading, the 11 px text, the light thin lines, "Printed : ..." at the bottom right (9 px). The company and the
// heading repeat at the top of every page (this report has no branch line).
// Opens the browser print dialog from a hidden iframe (no pop-up to block).
import { esc, printHtmlDocument } from "../../../common/printHtml";
import { reportPrintCss } from "../../../common/reportStyle";

export type PrintRow = {
  accountId: string;
  accountName: string;
  accountLevel: number;
  address: string;
  contact: string;
  phone: string;
  vatNo: string;
  creditLimit: number | null;
  creditDays: number | null;
};

export type PrintReport = {
  coName: string;
  heading: string;
  reportInfo: string;
  rows: PrintRow[];
};

// VB Detail_BeforePrint: level 1 red, 2 green, 3 blue, else black
const levelClass = (level: number) =>
  level === 1 ? "l1" : level === 2 ? "l2" : level === 3 ? "l3" : "l4";

// VB formats: Credit Limit {0:#,#0.00}, Credit Days {0:#,#0}; empty stays empty
export const money = (v: number | null) =>
  v == null
    ? ""
    : v.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
export const whole = (v: number | null) =>
  v == null ? "" : v.toLocaleString("en-US", { maximumFractionDigits: 0 });

export const buildHtml = (r: PrintReport) => `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${esc(r.heading)}</title>
<style>${reportPrintCss({ reportInfo: r.reportInfo, look: "inter", stockLook: true, orientation: "landscape", marginLeft: "15mm", groupSelector: "td.group",
  extra: `
  .name { white-space: pre-wrap; } /* keeps the level 4 indent */
  .l1 { color: #ff0000; } .l2 { color: #008000; } .l3 { color: #0000ff; } .l4 { color: #000; }
  .head { height: 32px; vertical-align: top; }` })}
</style>
</head>
<body>
<table>
  <colgroup>
    <col style="width:10.5%" />   <!-- Customer ID -->
    <col style="width:18%" />    <!-- Customer Name -->
    <col style="width:14.5%" />  <!-- Address -->
    <col style="width:12.5%" />    <!-- Contact -->
    <col style="width:10.5%" />  <!-- Phone -->
    <col style="width:12.5%" />    <!-- VAT No. -->
    <col style="width:11%" />  <!-- Credit Limit -->
    <col style="width:10.5%" />    <!-- Credit Days -->
  </colgroup>
  <thead>
    <tr><td colspan="8" class="co"   style="border:0">${esc(r.coName)}</td></tr>
    <tr><td colspan="8" class="head" style="border:0">${esc(r.heading)}</td></tr>
    <tr><td colspan="8" class="pagerow" style="border:0"></td></tr>
    <tr>
      <th>Customer ID</th><th>Customer Name</th><th>Address</th><th>Contact</th>
      <th>Phone</th><th>VAT No.</th>
      <th class="r">Credit Limit</th><th class="r">Credit Days</th>
    </tr>
  </thead>
  <tbody>
    ${r.rows
      .map(
        (row) => `<tr class="${levelClass(row.accountLevel)}">
      <td>${esc(row.accountId)}</td>
      <td class="name">${esc(row.accountName)}</td>
      <td>${esc(row.address)}</td>
      <td>${esc(row.contact)}</td>
      <td>${esc(row.phone)}</td>
      <td>${esc(row.vatNo)}</td>
      <td class="r">${esc(money(row.creditLimit))}</td>
      <td class="r">${esc(whole(row.creditDays))}</td>
    </tr>`,
      )
      .join("\n")}
  </tbody>
</table>
</body>
</html>`;

export const printCustomerListReport = (report: PrintReport): void => printHtmlDocument(buildHtml(report));
