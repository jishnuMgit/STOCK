// printCustomerListReport.ts
// The printed page (port of rptCustomerListRpt): A4 LANDSCAPE, company name,
// heading, then Customer ID / Name / Address / Contact / Phone /
// VAT No. / Credit Limit / Credit Days, coloured by account level.
// Page number top right, user id + date bottom right of every page.
// Opens the browser print dialog from a hidden iframe (no pop-up to block).
// The font, the sizes and the line colour are the "inter" look of components/common/reportStyle.ts.

import { cssStr, esc, printHtmlDocument } from "../../../../components/common/printHtml";
import { REPORT_STYLE, reportLook } from "../../../../components/common/reportStyle";

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
const money = (v: number | null) =>
  v == null
    ? ""
    : v.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
const whole = (v: number | null) =>
  v == null ? "" : v.toLocaleString("en-US", { maximumFractionDigits: 0 });

export const buildHtml = (r: PrintReport) => {
  // the font and the sizes come from the shared look (components/common/reportStyle.ts)
  const { css, size } = reportLook("inter");
  const font = css.family;
  const { lineColor, html } = REPORT_STYLE;

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${esc(r.heading)}</title>
<style>${css.importCss}
  @page {
    size: A4 landscape;
    margin: 12mm 10mm 14mm 15mm;
    @top-right    { content: "Page " counter(page) " / " counter(pages); font: ${size.small}pt ${font}; }
    @bottom-right { content: "Printed : ${cssStr(r.reportInfo)}"; font: ${size.small}pt ${font}; }
  }
  * { box-sizing: border-box; }
  body { margin: 0; font: ${size.body}pt ${font}; color: #000;
         -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  thead { display: table-header-group; }            /* header repeats on every page */
  tr { page-break-inside: avoid; }
  .co   { font-size: ${size.company}pt; text-align: center; height: ${html.companyHeight}px; vertical-align: top; }
  .head { font-size: ${size.heading}pt; text-align: center; height: ${html.headingHeight + html.tableGap}px; vertical-align: top; }
  th { border: 1px solid ${lineColor}; height: ${html.rowHeight}px; font-size: ${size.columnHead}pt;
       padding: 0 ${html.cellPaddingX}px; font-weight: normal; text-align: left; }
  td { border: 1px solid ${lineColor}; border-top: 0; height: ${html.rowHeight}px; padding: 2px ${html.cellPaddingX}px;
       vertical-align: middle; overflow-wrap: anywhere; }
  .name { white-space: pre-wrap; }                  /* keeps the level 4 indent */
  .r { text-align: right; }
  .l1 { color: #ff0000; } .l2 { color: #008000; } .l3 { color: #0000ff; } .l4 { color: #000; }
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
};

export const printCustomerListReport = (report: PrintReport): void => printHtmlDocument(buildHtml(report));
