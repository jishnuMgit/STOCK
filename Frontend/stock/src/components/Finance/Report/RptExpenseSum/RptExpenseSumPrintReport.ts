// RptExpenseSumPrintReport.ts
// The printed Expense Summary report (the old rptExpenseSumRpt), A4 portrait.
//
//   Account ID / Account Name / Opening / Current / Closing, and a Total row.
//   The amounts have 2 decimals, a negative in brackets (the old #,#.00;(#,#.00);0.00).
//   The line is coloured by the account level, as the old report: 1 red, 2 green, 3 blue, the rest black.
//   The Total row adds only the accounts of the chosen Account Level (the server sends it), so no account is counted
//   twice when the groups are printed too.
//   Plain: no fill on the heading row, thin light lines.
//   "Page x of y" is top right of every page; the company, the heading, the branch / cost center and the report
//   info repeat at the top of every page.
// Printed through components/common/printHtml (a hidden iframe).
import { esc, printHtmlDocument } from "../../../common/printHtml";
import { reportPrintCss } from "../../../common/reportStyle";

// ---- what the server sends (names = the server's response keys) ----

export type ExpenseSumLine = {
  lkpAccountID: string;
  // the name keeps its leading spaces: the indent of Print A/c Group
  txtAccountName: string;
  txtAccountLevel: number;
  txtOpening: number;
  txtCurrent: number;
  txtClosing: number;
};

// For a Period: Opening / Current / Closing (rdgDate 1)
export type PeriodReport = {
  rdgDate: 1;
  txtCoName: string;
  txtHeading: string;
  // "Branch : X" and "Cost Center : ID - Name", as chosen
  txtBranch: string;
  txtReportInfo: string;
  lines: ExpenseSumLine[];
  totals: { txtOpening: number; txtCurrent: number; txtClosing: number };
};

// Up to Month: January to December (rdgDate 0)
export type ExpenseSumMonthLine = {
  lkpAccountID: string;
  txtAccountName: string;
  txtAccountLevel: number;
  // January to December
  txtMonths: number[];
  // January to June, and the whole year
  txtJanToJun: number;
  txtJanToDec: number;
};

export type MonthReport = {
  rdgDate: 0;
  txtCoName: string;
  // the heading of the January to June page: "Expense Summary Up to June - 2026", or "... Up to March - 2026" when the
  // month is not after June (then it is the only page)
  txtHeading: string;
  // the heading of the July to December page, with the January to June total as its Opening ("" when the month is
  // not after June: that page is not printed)
  txtHeadingJulToDec: string;
  txtBranch: string;
  txtReportInfo: string;
  lines: ExpenseSumMonthLine[];
  totals: { txtMonths: number[]; txtJanToJun: number; txtJanToDec: number };
};

export type PrintReport = PeriodReport | MonthReport;

export const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// One page of the monthly report: the labels of its columns and the numbers of a line / of the Total row.
//   January to June : Account ID | Account Name | Jan .. Jun | Total (= January to June)
//   July to December: Account ID | Account Name | Opening (= January to June) | Jul .. Dec | Total (= the whole year)
export const monthPageLabels = (secondHalf: boolean) => [
  "Account ID",
  "Account Name",
  ...(secondHalf ? ["Opening"] : []),
  ...MONTH_LABELS.slice(secondHalf ? 6 : 0, secondHalf ? 12 : 6),
  "Total",
];

export const monthPageNumbers = (
  months: number[],
  janToJun: number,
  janToDec: number,
  secondHalf: boolean
) => [
  ...(secondHalf ? [janToJun] : []),
  ...months.slice(secondHalf ? 6 : 0, secondHalf ? 12 : 6),
  secondHalf ? janToDec : janToJun,
];

// the column weights of a monthly page (they add up to 1)
export const monthPageWeights = (secondHalf: boolean) => {
  // the Account Name column is the wide one: the names are long and a group's name is indented by up to 12 spaces
  // (the number columns have to hold a 7-figure amount with the cell padding)
  const raw = secondHalf
    ? [0.095, 0.16, 0.1, 0.09, 0.09, 0.09, 0.09, 0.09, 0.09, 0.105]
    : [0.1, 0.19, 0.095, 0.095, 0.095, 0.095, 0.095, 0.095, 0.14];
  const sum = raw.reduce((s, w) => s + w, 0);

  return raw.map((w) => w / sum);
};

// the amounts: 2 decimals, a negative in brackets, 0 as 0.00
export const formatAmount = (value: number) => {
  const text = Math.abs(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return value < 0 ? `(${text})` : text;
};

// the old report's colour of a line by its account level: 1 red, 2 green, 3 blue, the rest black
export const LEVEL_COLORS: Record<number, [number, number, number]> = {
  1: [255, 0, 0],
  2: [0, 128, 0],
  3: [0, 0, 255],
};

export const levelCssColor = (level: number) => {
  const rgb = LEVEL_COLORS[level];
  return rgb ? `rgb(${rgb[0]},${rgb[1]},${rgb[2]})` : "#000";
};

// the column weights, as the old report: Account ID 80 | Account Name 250 | Opening 104 | Current 104 | Closing 122
// (Account ID a little wider than the old report: its 14 px label has to fit)
export const COLUMN_WEIGHTS = [100 / 660, 230 / 660, 104 / 660, 104 / 660, 122 / 660];

// the first column that is a number
export const FIRST_NUMBER_COLUMN = 2;

const lineHtml = (l: ExpenseSumLine) => `<tr style="color:${levelCssColor(l.txtAccountLevel)}">
      <td>${esc(l.lkpAccountID)}</td>
      <td style="white-space:pre;overflow:hidden;text-overflow:ellipsis">${esc(l.txtAccountName)}</td>
      <td class="r">${formatAmount(l.txtOpening)}</td>
      <td class="r">${formatAmount(l.txtCurrent)}</td>
      <td class="r">${formatAmount(l.txtClosing)}</td>
    </tr>`;

// ---- the monthly report: a table for January to June, then (after June) one for July to December, a page break between ----

const monthLineHtml = (l: ExpenseSumMonthLine, secondHalf: boolean) => `<tr style="color:${levelCssColor(l.txtAccountLevel)}">
      <td>${esc(l.lkpAccountID)}</td>
      <td style="white-space:pre;overflow:hidden;text-overflow:ellipsis">${esc(l.txtAccountName)}</td>
      ${monthPageNumbers(l.txtMonths, l.txtJanToJun, l.txtJanToDec, secondHalf)
        .map((v) => `<td class="r">${formatAmount(v)}</td>`)
        .join("")}
    </tr>`;

const monthTableHtml = (r: MonthReport, heading: string, secondHalf: boolean, pageBreak: boolean) => {
  const labels = monthPageLabels(secondHalf);
  const weights = monthPageWeights(secondHalf);
  const t = r.totals;

  return `<table${pageBreak ? ' style="page-break-before:always"' : ""}>
  <colgroup>
    ${weights.map((w) => `<col style="width:${(w * 100).toFixed(1)}%" />`).join("")}
  </colgroup>
  <thead>
    <tr><td colspan="${labels.length}" class="co"   style="border:0">${esc(r.txtCoName)}</td></tr>
    <tr><td colspan="${labels.length}" class="head" style="border:0">${esc(heading)}</td></tr>
    <tr><td colspan="${labels.length}" class="sub"  style="border:0"><div><span>${esc(r.txtBranch)}</span><span class="info">${secondHalf ? "" : esc(r.txtReportInfo)}</span></div></td></tr>
    <tr>${labels.map((label, i) => `<th${i >= FIRST_NUMBER_COLUMN ? ' class="r"' : ""}>${label}</th>`).join("")}</tr>
  </thead>
  <tbody>
    ${r.lines.map((l) => monthLineHtml(l, secondHalf)).join("\n    ")}
    <tr class="tot">
      <td colspan="2" class="r"><b>Total :</b></td>
      ${monthPageNumbers(t.txtMonths, t.txtJanToJun, t.txtJanToDec, secondHalf)
        .map((v) => `<td class="r"><b>${formatAmount(v)}</b></td>`)
        .join("")}
    </tr>
  </tbody>
</table>`;
};

const buildMonthHtml = (r: MonthReport) => `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Expense Summary</title>
<style>${reportPrintCss({ look: "inter", reportInfo: r.txtReportInfo, orientation: "landscape", marginLeft: "15mm", groupSelector: "td.group" })}
</style>
</head>
<body>
${monthTableHtml(r, r.txtHeading, false, false)}${
  r.txtHeadingJulToDec === "" ? "" : `\n${monthTableHtml(r, r.txtHeadingJulToDec, true, true)}`
}
</body>
</html>`;

export const buildHtml = (r: PrintReport) => {
  if (r.rdgDate === 0) return buildMonthHtml(r);

  const t = r.totals;

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Expense Summary</title>
<style>${reportPrintCss({ look: "inter", reportInfo: r.txtReportInfo, orientation: "portrait", marginLeft: "15mm", groupSelector: "td.group" })}
</style>
</head>
<body>
<table>
  <colgroup>
    ${COLUMN_WEIGHTS.map((w) => `<col style="width:${(w * 100).toFixed(1)}%" />`).join("")}
  </colgroup>
  <thead>
    <tr><td colspan="5" class="co"   style="border:0">${esc(r.txtCoName)}</td></tr>
    <tr><td colspan="5" class="head" style="border:0">${esc(r.txtHeading)}</td></tr>
    <tr><td colspan="5" class="sub"  style="border:0"><div><span>${esc(r.txtBranch)}</span><span class="info">${esc(r.txtReportInfo)}</span></div></td></tr>
    <tr><th>Account ID</th><th>Account Name</th><th class="r">Opening</th><th class="r">Current</th><th class="r">Closing</th></tr>
  </thead>
  <tbody>
    ${r.lines.map(lineHtml).join("\n    ")}
    <tr class="tot">
      <td colspan="2" class="r"><b>Total :</b></td>
      <td class="r"><b>${formatAmount(t.txtOpening)}</b></td>
      <td class="r"><b>${formatAmount(t.txtCurrent)}</b></td>
      <td class="r"><b>${formatAmount(t.txtClosing)}</b></td>
    </tr>
  </tbody>
</table>
</body>
</html>`;
};

export const printExpenseSumReport = (report: PrintReport): void =>
  printHtmlDocument(buildHtml(report));
