// RptRVPVSumPrintReport.ts
// The printed Receipt / Payment Summary report (the old rptRVPVSumRpt), A4 portrait.
//
//   Entry No. / Date / Cash/Bank Account Name / Received From/Paid To / Amount, and a Total row.
//   The amounts have 2 decimals, a negative in brackets (as the other reports).
//   Plain: no fill on the heading row, thin light lines.
//   "Page x of y" is top right of every page; the company, the heading, the branch and the report info repeat at the
//   top of every page.
// Printed through components/common/printHtml (a hidden iframe).
import { esc, printHtmlDocument } from "../../../common/printHtml";
import { reportPrintCss } from "../../../common/reportStyle";

// ---- what the server sends (names = the server's response keys) ----

export type RVPVSumLine = {
  txtDocNo: string;
  // dd-MMM-yyyy
  txtDate: string;
  // the Cash / Bank account
  txtAccountName: string;
  txtReceivedFromPaidTo: string;
  txtAmount: number;
};

export type PrintReport = {
  txtCoName: string;
  txtHeading: string;
  // "Branch : X" (one branch), "Branch : X, Y" (selected branches), "" for All Branch
  txtBranch: string;
  txtReportInfo: string;
  lines: RVPVSumLine[];
  totals: { txtAmount: number };
};

// the amounts: 2 decimals, a negative in brackets, 0 as 0.00
export const formatAmount = (value: number) => {
  const text = Math.abs(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return value < 0 ? `(${text})` : text;
};

// the column weights (the old report's, widened where the 14 px column labels need room): Entry No. | Date |
// Cash/Bank Account Name | Received From/Paid To | Amount
export const COLUMN_WEIGHTS = [0.125, 0.14, 0.285, 0.295, 0.155];

// the column of the amount (the only number)
export const AMOUNT_COLUMN = 4;

const lineHtml = (l: RVPVSumLine) => `<tr>
      <td>${esc(l.txtDocNo)}</td>
      <td>${esc(l.txtDate)}</td>
      <td>${esc(l.txtAccountName)}</td>
      <td>${esc(l.txtReceivedFromPaidTo)}</td>
      <td class="r">${formatAmount(l.txtAmount)}</td>
    </tr>`;

export const buildHtml = (r: PrintReport) => `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Receipt / Payment Summary</title>
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
    <tr><th>Entry No.</th><th>Date</th><th>Cash/Bank Account Name</th><th>Received From/Paid To</th><th class="r">Amount</th></tr>
  </thead>
  <tbody>
    ${r.lines.map(lineHtml).join("\n    ")}
    <tr class="tot">
      <td colspan="4" class="r"><b>Total :</b></td>
      <td class="r"><b>${formatAmount(r.totals.txtAmount)}</b></td>
    </tr>
  </tbody>
</table>
</body>
</html>`;

export const printRVPVSumReport = (report: PrintReport): void =>
  printHtmlDocument(buildHtml(report));
