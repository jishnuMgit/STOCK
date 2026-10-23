// UserAuditPrintReport.ts
// The printed page (the old rptUserAuditRpt): A4 landscape, company name, "User Audit
// For The Period dd-MMM-yyyy To dd-MMM-yyyy", then by user: "User ID : X" and that
// user's rows - Sl.# / Year / Br. ID / Doc. Type / Doc. No. / Screen / Action / Audit
// Note / Audit Date (Sl.# restarts for each user). "Page x of y" top right and the
// report info bottom right of every page.
// Printed through components/common/printHtml (a hidden iframe).
import dayjs from "dayjs";

import { cssStr, esc, printHtmlDocument } from "../../common/printHtml";

// one report row, as the server sends it (names = the server's response keys)
export type AuditLine = {
  txtYear: string | null;
  txtBranchID: string | null;
  txtBranchName: string | null;
  txtDocType: string | null;
  txtDocNo: string | null;
  txtScreenName: string | null;
  txtAction: string | null;
  txtAuditNote: string | null;
  txtUserID: string;
  txtAuditDate: string;
};

export type PrintReport = {
  txtCompanyName: string;
  // "<user>  dd/mm/yyyy hh:mm" - bottom right of every page
  txtReportInfo: string;
  // yyyy-mm-dd
  dtpFromDate: string;
  dtpToDate: string;
  rows: AuditLine[];
};

export const REPORT_HEADING = "User Audit";

// the heading line under the company name
export const periodHeading = (r: PrintReport) =>
  `${REPORT_HEADING} For The Period ${dayjs(r.dtpFromDate).format("DD-MMM-YYYY")} To ${dayjs(r.dtpToDate).format("DD-MMM-YYYY")}`;

// the report by user, in the order the server sent it
export type AuditGroup = { txtUserID: string; items: AuditLine[] };

export const groupByUser = (rows: AuditLine[]): AuditGroup[] => {
  const groups: AuditGroup[] = [];

  for (const row of rows) {
    const last = groups[groups.length - 1];

    if (last && last.txtUserID === row.txtUserID) {
      last.items.push(row);
    } else {
      groups.push({ txtUserID: row.txtUserID, items: [row] });
    }
  }

  return groups;
};

const lineHtml = (row: AuditLine, slNo: number) => `<tr>
      <td>${slNo}</td>
      <td>${esc(row.txtYear)}</td>
      <td>${esc(row.txtBranchID)}</td>
      <td>${esc(row.txtDocType)}</td>
      <td>${esc(row.txtDocNo)}</td>
      <td>${esc(row.txtScreenName)}</td>
      <td>${esc(row.txtAction)}</td>
      <td class="note">${esc(row.txtAuditNote)}</td>
      <td>${esc(row.txtAuditDate)}</td>
    </tr>`;

export const buildHtml = (r: PrintReport) => {
  const body = groupByUser(r.rows)
    .map(
      (group) => `<tr><td colspan="9" class="user" style="border:0">User ID : <b>${esc(group.txtUserID)}</b></td></tr>
    ${group.items.map((row, index) => lineHtml(row, index + 1)).join("\n    ")}`
    )
    .join("\n    ");

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${esc(REPORT_HEADING)}</title>
<style>
  @page {
    size: A4 landscape;
    margin: 12mm 10mm 14mm 15mm;
    @top-right    { content: "Page " counter(page) " of " counter(pages); font: 8pt "Times New Roman", serif; }
    @bottom-right { content: "${cssStr(r.txtReportInfo)}"; font: 8pt "Times New Roman", serif; }
  }
  * { box-sizing: border-box; }
  body { margin: 0; font: 9pt "Times New Roman", serif; color: #000;
         -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  thead { display: table-header-group; }            /* header repeats on every page */
  tr { page-break-inside: avoid; }
  .co   { font-size: 14pt; text-align: center; height: 24px; }
  .head { font-size: 12pt; text-align: center; height: 24px; }
  .user { height: 24px; padding-top: 6px; }
  th { background: #eff3fa; border: 1px solid #c7d1e4; height: 24px;
       padding: 0 4px; font-weight: normal; text-align: left; }
  td { border: 1px solid #c7d1e4; border-top: 0; min-height: 22px; padding: 2px 4px;
       vertical-align: top; overflow-wrap: anywhere; }
  td.note { white-space: pre-wrap; }
</style>
</head>
<body>
<table>
  <colgroup>
    <col style="width:4%" /><col style="width:5%" /><col style="width:5%" />
    <col style="width:7%" /><col style="width:11%" /><col style="width:15%" />
    <col style="width:6%" /><col style="width:32%" /><col style="width:15%" />
  </colgroup>
  <thead>
    <tr><td colspan="9" class="co"   style="border:0">${esc(r.txtCompanyName)}</td></tr>
    <tr><td colspan="9" class="head" style="border:0">${esc(periodHeading(r))}</td></tr>
    <tr>
      <th>Sl.#</th><th>Year</th><th>Br. ID</th><th>Doc. Type</th><th>Doc. No.</th>
      <th>Screen</th><th>Action</th><th>Audit Note</th><th>Audit Date</th>
    </tr>
  </thead>
  <tbody>
    ${body}
  </tbody>
</table>
</body>
</html>`;
};

export const printUserAuditReport = (report: PrintReport): void =>
  printHtmlDocument(buildHtml(report));
