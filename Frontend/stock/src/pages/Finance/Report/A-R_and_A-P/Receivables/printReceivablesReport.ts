// printReceivablesReport.ts
// The Receivables page (port of rptReceivablesRpt): A4 portrait, company name,
// heading, branch, columns Account ID, Account Name, Debit, Credit and a
// "Total :" row at the end.
// Page number top right, user id + date bottom right of every page.
// buildHtml is used by the print preview; printReceivablesReport sends the
// report to the printer (browser print dialog, hidden iframe - no pop-up).

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

const esc = (v: unknown) =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

// text placed inside a CSS string ("...") in the print stylesheet
const cssStr = (v: unknown) =>
  String(v ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/</g, "\\3C ")
    .replace(/[\r\n]+/g, " ");

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
<style>
  @page {
    size: A4;
    margin: 12.7mm 10mm 14mm 25.4mm;
    @top-right    { content: "Page " counter(page) " of " counter(pages); font: 8pt "Times New Roman", serif; }
    @bottom-right { content: "${cssStr(r.reportInfo)}"; font: 8pt "Times New Roman", serif; }
  }
  * { box-sizing: border-box; }
  body { margin: 0; font: 9pt "Times New Roman", serif; color: #000;
         -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  thead { display: table-header-group; }   /* header repeats on every page */
  tr { page-break-inside: avoid; }
  .co   { font-size: 14pt; font-weight: bold; text-align: center; height: 24px; }
  .head { font-size: 12pt; text-align: center; height: 22px; }
  .br   { font-size: 9pt;  text-align: left;   height: 20px; }
  th { background: #eff3fa; border: 1px solid #c7d1e4; height: 24px;
       padding: 0 4px; font-weight: normal; text-align: left; }
  th.r { text-align: right; }
  td { border: 1px solid #c7d1e4; border-top: 0; height: 24px; padding: 0 4px;
       overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
  td.r { text-align: right; }
  tr.tot td { background: #eff3fa; font-weight: bold; border-top: 1px solid #c7d1e4; }
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

export const printReceivablesReport = (report: PrintReport): void => {
  const iframe = document.createElement("iframe");
  iframe.style.cssText =
    "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden";
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument;
  const win = iframe.contentWindow;
  if (!doc || !win) {
    iframe.remove();
    throw new Error("Could not open the print view");
  }

  doc.open();
  doc.write(buildHtml(report));
  doc.close();

  const cleanup = () => setTimeout(() => iframe.remove(), 500);
  win.addEventListener("afterprint", cleanup);

  // let the iframe lay out before printing
  setTimeout(() => {
    win.focus();
    win.print();
    // some browsers never fire afterprint: remove it anyway after a minute
    setTimeout(() => iframe.remove(), 60000);
  }, 250);
};
