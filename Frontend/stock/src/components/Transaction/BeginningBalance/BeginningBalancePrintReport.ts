// BeginningBalancePrintReport.ts
// The printed page (port of rptYearCloseBalRpt): A4 portrait, company name, heading,
// branch, then Account ID / Account Name / C.C. ID / Debit / Credit, coloured by the
// account level, and a Total row at the end. "Page x of y" top right and the report
// info bottom right of every page.
// Printed through components/common/printHtml (a hidden iframe).

import { cssStr, esc, printHtmlDocument } from "../../common/printHtml";

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
  // "<user>  dd/mm/yyyy hh:mm" - bottom right of every page
  txtReportInfo: string;
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
<style>
  @page {
    size: A4;
    margin: 12mm 10mm 14mm 12mm;
    @top-right    { content: "Page " counter(page) " of " counter(pages); font: 8pt "Times New Roman", serif; }
    @bottom-right { content: "${cssStr(r.txtReportInfo)}"; font: 8pt "Times New Roman", serif; }
  }
  * { box-sizing: border-box; }
  body { margin: 0; font: 9pt "Times New Roman", serif; color: #000;
         -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  table { width: 100%; border-collapse: collapse; table-layout: fixed;
          margin-left: 0; margin-right: 0; }
  thead { display: table-header-group; }            /* header repeats on every page */
  tr { page-break-inside: avoid; }
  .co   { font-size: 14pt; text-align: center; height: 24px; }
  .head { font-size: 12pt; text-align: center; height: 24px; }
  .br   { font-size: 9pt;  text-align: left;   height: 24px; }
  th { border: 1px solid #c7d1e4; height: 24px;
       padding: 0 6px; font-weight: normal; text-align: left; }
  th.r { text-align: right; }
  td { border: 1px solid #c7d1e4; border-top: 0; height: 24px; padding: 0 6px; }
  .name { white-space: pre; }                       /* keeps the level indent */
  .r { text-align: right; }
  tr.tot td { border-top: 1px solid #c7d1e4; }
</style>
</head>
<body>
<table>
  <colgroup>
    <col style="width:13%" /><col style="width:44%" /><col style="width:10%" />
    <col style="width:16.5%" /><col style="width:16.5%" />
  </colgroup>
  <thead>
    <tr><td colspan="5" class="co"   style="border:0">${esc(r.txtCoName)}</td></tr>
    <tr><td colspan="5" class="head" style="border:0">${esc(REPORT_HEADING)}</td></tr>
    <tr><td colspan="5" class="br"   style="border:0">Branch : ${esc(r.txtBranchName)}</td></tr>
    <tr>
      <th>Account ID</th><th>Account Name</th><th>C.C. ID</th>
      <th class="r">Debit</th><th class="r">Credit</th>
    </tr>
  </thead>
  <tbody>
    ${r.rows.map(rowHtml).join("\n    ")}
    <tr class="tot">
      <td colspan="3" class="r">Total</td>
      <td class="r">${formatTotal(totals.debit)}</td>
      <td class="r">${formatTotal(totals.credit)}</td>
    </tr>
  </tbody>
</table>
</body>
</html>`;
};

export const printBeginningBalanceReport = (report: PrintReport): void =>
  printHtmlDocument(buildHtml(report));
