// RptTBRpt.ts
// The printed Trial Balance (port of rptTB_MRpt): A4 landscape, company name, heading,
// branch, then a two-line header: Account ID, Account Name, Opening,
// Transactions (Debit, Credit, Movement), Closing - and a "Total :" row at the end.
// Rows are coloured by account level (1 green, 2 blue, 3 magenta, 4 slate).
// Opens the browser print dialog from a hidden iframe (no pop-up to block).
// The stock look (common/reportStyle.ts, STOCK_REPORT_CSS): the same design as the stock documents - "Page x of y" on a line of its
// own under the heading, the 11 px text, the light thin lines, "Printed : ..." at the bottom right (9 px). The company, the heading
// and the branch repeat at the top of every page.
import { branchLineHtml, esc, printHtmlDocument } from "../../../common/printHtml";
import { reportPrintCss } from "../../../common/reportStyle";

export type TBRow = {
  accountId: string;
  accountName: string; // indented with spaces when "Print A/C Group" is Yes
  level: number;
  opening: number;
  currentDr: number;
  currentCr: number;
  movement: number;
  closing: number;
};

export type TBTotals = {
  opening: number;
  currentDr: number;
  currentCr: number;
  movement: number;
  closing: number;
};

export type PrintReport = {
  coName: string;
  heading: string;
  branch: string;
  reportInfo: string; // "<user>  dd/mm/yyyy hh:mm" - bottom right of every page
  accountLevel: number;
  rows: TBRow[];
  totals: TBTotals;
};

// VB {0:#,#.00;(#,#.00);0.00}: 1,234.50 / (1,234.50) / 0.00
export const amount = (v: number) => {
  if (!v) return "0.00";
  const s = Math.abs(v).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return v < 0 ? `(${s})` : s;
};

// same colours as the account tree: level 1 green, 2 blue, 3 magenta,
// level 4 (the accounts) dark slate. Levels 1-3 (the groups) are bold.
export const LEVEL_COLOR: Record<number, string> = {
  1: "#00a63e",
  2: "#155dfc",
  3: "#c800de",
};
const DETAIL_COLOR = "#314158";

// VB column weights
// Movement is a little narrower than Debit / Credit; Account Name gets the rest
// (Account ID a little wider: its 14 px label has to fit)
export const COL_WIDTHS = [0.09, 0.3694, 0.1101, 0.1101, 0.1101, 0.0951, 0.1152];

const rowHtml = (r: TBRow) => `<tr style="color:${LEVEL_COLOR[r.level] ?? DETAIL_COLOR};${r.level >= 1 && r.level <= 3 ? "font-weight:bold" : ""}">
  <td>${esc(r.accountId)}</td>
  <td class="name">${esc(r.accountName)}</td>
  <td class="r">${amount(r.opening)}</td>
  <td class="r">${amount(r.currentDr)}</td>
  <td class="r">${amount(r.currentCr)}</td>
  <td class="r">${amount(r.movement)}</td>
  <td class="r">${amount(r.closing)}</td>
</tr>`;

export const buildHtml = (r: PrintReport) => `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${esc(r.heading)}</title>
<style>${reportPrintCss({ reportInfo: r.reportInfo, look: "inter", stockLook: true, orientation: "landscape", marginLeft: "15mm", groupSelector: "td.group",
  extra: `
  th { vertical-align: bottom; } /* spanning labels sit on the same line as Debit / Credit / Movement */
  th.c { text-align: center; }
  th.m { vertical-align: middle; } /* Account ID / Account Name: centred between the two lines */
  td.name { white-space: pre; } /* keeps the A/C group indent */` })}
</style>
</head>
<body>
<table>
  <colgroup>
    ${COL_WIDTHS.map((w) => `<col style="width:${(w * 100).toFixed(2)}%" />`).join("\n    ")}
  </colgroup>
  <thead>
    <tr><td colspan="7" class="co"   style="border:0">${esc(r.coName)}</td></tr>
    <tr><td colspan="7" class="head" style="border:0">${esc(r.heading)}</td></tr>
    <tr><td colspan="7" class="pagerow" style="border:0"></td></tr>
    <tr><td colspan="7" class="sub"  style="border:0">${branchLineHtml(r.branch)}</td></tr>
    <tr>
      <th rowspan="2" class="m">Account ID</th><th rowspan="2" class="m">Account Name</th>
      <th rowspan="2" class="r">Opening</th>
      <th colspan="3" class="c">Transactions</th>
      <th rowspan="2" class="r">Closing</th>
    </tr>
    <tr>
      <th class="r">Debit</th><th class="r">Credit</th><th class="r">Movement</th>
    </tr>
  </thead>
  <tbody>
    ${r.rows.map(rowHtml).join("\n")}
    <tr class="tot">
      <td colspan="2" class="r"><b>Total :</b></td>
      <td class="r"><b>${amount(r.totals.opening)}</b></td>
      <td class="r"><b>${amount(r.totals.currentDr)}</b></td>
      <td class="r"><b>${amount(r.totals.currentCr)}</b></td>
      <td class="r"><b>${amount(r.totals.movement)}</b></td>
      <td class="r"><b>${amount(r.totals.closing)}</b></td>
    </tr>
  </tbody>
</table>
</body>
</html>`;

export const printTrialBalanceReport = (report: PrintReport): void => printHtmlDocument(buildHtml(report));
