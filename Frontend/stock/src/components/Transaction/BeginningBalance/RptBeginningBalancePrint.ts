// RptBeginningBalancePrint.ts
// The printed page (port of rptYearCloseBalRpt): A4 portrait, company name, heading,
// branch, then Account ID / Account Name / C.C. ID / Debit / Credit, coloured by the
// account level, and a Total row at the end. "Page x of y" top right and the report
// info bottom right of every page.
// Printed through components/common/printHtml (a hidden iframe).

import dayjs from "dayjs";

import { cssStr, esc, printHtmlDocument } from "../../common/printHtml";
import { documentPrintCss } from "../../common/reportStyle";

// the level of the accounts the report is made for (the old strInputAccountLevel)
export const INPUT_ACCOUNT_LEVEL = 4;

// one row of the report (names = the server's response keys)
export type PrintRow = {
  lkpAccountID: string;
  txtAccountName: string | null;
  txtAccountLevel: number | null;
  lkpCCID: string | null;
  txtDebit: string;
  txtCredit: string;
};

export type PrintReport = {
  txtCoName: string;
  txtBranchName: string;
  // the date of the balance
  dtpDate?: string | null;
  // "<user>  dd/mm/yyyy hh:mm" - bottom right of every page
  txtReportInfo: string;
  // "<user>  dd/mm/yyyy hh:mm" of the save - bottom right of every page, after "Created By :" (the print's own user and time are used when empty)
  txtSavedBy?: string;
  rows: PrintRow[];
};

export const REPORT_HEADING = "Beginning Balance";

// a row: 1,234.50 (the old {0:#,#0.00})
export const formatAmount = (value: number) =>
  value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

// the Total row: a negative total in brackets, zero as 0.00 (the old
// {0:#,#.00;(#,#.00);0.00})
export const formatTotal = (value: number) =>
  value > 0 ? formatAmount(value) : value < 0 ? `(${formatAmount(-value)})` : "0.00";

// the old Detail_BeforePrint: level 1 red, 2 green, 3 blue, the accounts black
export const levelColor = (level: number | null) => {
  switch (Number(level)) {
    case 1:
      return "#ff0000";
    case 2:
      return "#008000";
    case 3:
      return "#0000ff";
    default:
      return "#000000";
  }
};

// the totals add up only the rows of the input level, so a group is not counted twice
export const totalsOf = (rows: PrintRow[]) => {
  const accounts = rows.filter(
    (row) => Number(row.txtAccountLevel) === INPUT_ACCOUNT_LEVEL,
  );

  return {
    debit: accounts.reduce((sum, row) => sum + Number(row.txtDebit), 0),
    credit: accounts.reduce((sum, row) => sum + Number(row.txtCredit), 0),
  };
};

// the date as 25-Nov-2026
export const formatDate = (value: string | null | undefined) =>
  value ? dayjs(value).format("DD-MMM-YYYY") : "";

const rowHtml = (row: PrintRow) => `<tr style="color:${levelColor(row.txtAccountLevel)}">
      <td>${esc(row.lkpAccountID)}</td>
      <td class="name">${esc(row.txtAccountName)}</td>
      <td>${esc(String(row.lkpCCID ?? "").trim())}</td>
      <td class="r">${formatAmount(Number(row.txtDebit))}</td>
      <td class="r">${formatAmount(Number(row.txtCredit))}</td>
    </tr>`;

export const buildHtml = (r: PrintReport) => {
  const totals = totalsOf(r.rows);

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${esc(REPORT_HEADING)}</title>
<style>${documentPrintCss({
  look: "inter",
  orientation: "portrait",
  margin: "12mm 10mm 14mm 12mm",
  // the bottom right of every page: "Created By : <user> <time of the save>" (the print's own user and time when none is saved)
  reportInfo: cssStr(r.txtSavedBy || r.txtReportInfo),
  infoLabel: r.txtSavedBy ? "Created By" : "Printed",
  // the stock document look (common/reportStyle.ts, STOCK_DOCUMENT_CSS): the 11 px text, the line colour and the row spaces
  stockLook: true,
  extra: `
  .name { white-space: pre; } /* keeps the level indent */
  th:first-child { text-align: left; padding: 0 4px; } /* the first column here is the Account ID (text), not a centred Line column */
  `,
})}
</style>
</head>
<body>
<table>
  <colgroup>
    <col style="width:13%" /><col style="width:51%" /><col style="width:10%" />
    <col style="width:13%" /><col style="width:13%" />
  </colgroup>
  <thead>
    <tr><td colspan="5" class="co"   style="border:0">${esc(r.txtCoName)}</td></tr>
    <tr><td colspan="5" class="head" style="border:0">${esc(REPORT_HEADING)}</td></tr>
    <tr><td colspan="5" class="pagerow" style="border:0"></td></tr>
    <tr><td colspan="5" class="info" style="border:0"><div style="display:flex;justify-content:space-between">
      <!-- Branch at the left, Date at the right end -->
      <span>Branch : <b>${esc(r.txtBranchName)}</b></span>
      <span class="date">Date : <b>${esc(formatDate(r.dtpDate))}</b></span>
    </div></td></tr>
    <tr>
      <th>Account ID</th><th>Account Name</th><th>C.C. ID</th>
      <th class="r">Debit</th><th class="r">Credit</th>
    </tr>
  </thead>
  <tbody>
    ${r.rows.map(rowHtml).join("\n    ")}
    <tr class="tot">
      <td colspan="3" class="r"><b>Total :</b></td>
      <td class="r"><b>${formatTotal(totals.debit)}</b></td>
      <td class="r"><b>${formatTotal(totals.credit)}</b></td>
    </tr>
  </tbody>
</table>
</body>
</html>`;
};

export const printBeginningBalanceReport = (report: PrintReport): void =>
  printHtmlDocument(buildHtml(report));
