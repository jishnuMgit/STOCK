// printPayablesReport.ts
// The Payables page (port of rptPayablesRpt): A4 portrait, company name,
// heading, branch, columns Account ID, Account Name, Debit, Credit and a
// "Total :" row at the end.
// Page number top right, user id + date bottom right of every page.
// The font, the sizes and the line colour are the "inter" look of components/common/reportStyle.ts.
// buildHtml is used by the print preview; printPayablesReport sends the
// report to the printer (browser print dialog, hidden iframe - no pop-up).

import { cssStr, esc, printHtmlDocument } from "../../../../../components/common/printHtml";
import { REPORT_STYLE, reportLook } from "../../../../../components/common/reportStyle";

export type PayableRow = {
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
  rows: PayableRow[];
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

const rowHtml = (r: PayableRow) => `<tr>
  <td>${esc(r.accountId)}</td>
  <td>${esc(r.accountName)}</td>
  <td class="r">${amount(r.debit)}</td>
  <td class="r">${amount(r.credit)}</td>
</tr>`;

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
    size: A4;
    margin: 12.7mm 10mm 14mm 25.4mm;
    @top-right    { content: "Page " counter(page) " / " counter(pages); font: ${size.small}pt ${font}; }
    @bottom-right { content: "Printed : ${cssStr(r.reportInfo)}"; font: ${size.small}pt ${font}; }
  }
  * { box-sizing: border-box; }
  body { margin: 0; font: ${size.body}pt ${font}; color: #000;
         -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  thead { display: table-header-group; }   /* header repeats on every page */
  tr { page-break-inside: avoid; }
  .co   { font-size: ${size.company}pt; text-align: center; height: ${html.companyHeight}px; vertical-align: top; }
  .head { font-size: ${size.heading}pt; text-align: center; height: ${html.headingHeight}px; }
  .br   { font-size: ${size.group}pt; text-align: left; height: ${html.subHeight + html.tableGap}px; vertical-align: top; }
  th { border: 1px solid ${lineColor}; height: ${html.rowHeight}px; font-size: ${size.columnHead}pt;
       padding: 0 ${html.cellPaddingX}px; font-weight: normal; text-align: left; }
  th.r { text-align: right; }
  td { border: 1px solid ${lineColor}; border-top: 0; height: ${html.rowHeight}px; padding: 0 ${html.cellPaddingX}px;
       overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
  td.r { text-align: right; }
  tr.tot td { font-weight: bold; border-top: 1px solid ${lineColor}; }
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
    <tr><td colspan="4" class="br"   style="border:0">${esc(r.branch)}</td></tr>
    <tr>
      <th>Account ID</th><th>Account Name</th>
      <th class="r">Debit</th><th class="r">Credit</th>
    </tr>
  </thead>
  <tbody>
    ${r.rows.map(rowHtml).join("\n")}
    <tr class="tot">
      <td colspan="2" class="r">Total :</td>
      <td class="r">${amount(r.totalDebit)}</td>
      <td class="r">${amount(r.totalCredit)}</td>
    </tr>
  </tbody>
</table>
</body>
</html>`;
};

export const printPayablesReport = (report: PrintReport): void => printHtmlDocument(buildHtml(report));
