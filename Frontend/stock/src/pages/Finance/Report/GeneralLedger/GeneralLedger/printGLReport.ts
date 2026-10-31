// printGLReport.ts
// The General Ledger (port of rptGLRpt): A4 LANDSCAPE, company name, heading,
// branch, then one block per account ("Account : id name", column labels,
// the lines with a running balance Dr / Cr and a "Total :" row). Every account
// starts on a new page and its header repeats on each page of the account.
// Page number top right of every page.
// buildHtml is used by the print preview; printGLReport sends the report to the
// printer (browser print dialog, hidden iframe - no pop-up).
//
// NOTE: the browser numbers the pages of the whole report ("Page 3 of 12").
// The PDF restarts the numbering for each account, like the VB report.

export type GLLine = {
  date: string;
  brId: string;
  docType: string;
  docNo: string;
  description: string;
  ref: string;
  ccId: string;
  debit: number;
  credit: number;
  balance: string; // "1,234.00 Dr" / "1,234.00 Cr"
};

export type GLAccount = {
  accountId: string;
  accountName: string;
  rows: GLLine[];
  totalDebit: number;
  totalCredit: number;
  balance: string;
};

export type PrintReport = {
  coName: string;
  heading: string;
  branch: string;
  reportInfo: string; // "<user>  dd/mm/yyyy hh:mm" - top right, next to the branch
  accounts: GLAccount[];
};

const esc = (v: unknown) =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

// VB {0:#,#0.00}
export const amount = (v: number) =>
  v.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

// Date, Br. ID, Type, Doc. No., Description, C.C ID, Debit, Credit, Balance
// (the column weights of the VB report without Reference, scaled to 1)
const WEIGHTS = [
  0.0714286, 0.0428571, 0.0428571, 0.0809524, 0.280754,
  0.0478174, 0.1, 0.1, 0.1095238,
];
const WEIGHT_SUM = WEIGHTS.reduce((t, w) => t + w, 0);
export const COL_WIDTHS = WEIGHTS.map((w) => w / WEIGHT_SUM);

export const COL_LABELS = [
  "Date", "Br. ID", "Type", "Doc. No.", "Description",
  "C.C ID", "Debit", "Credit", "Balance",
];

const rowHtml = (r: GLLine) => `<tr>
  <td>${esc(r.date)}</td>
  <td>${esc(r.brId)}</td>
  <td>${esc(r.docType)}</td>
  <td>${esc(r.docNo)}</td>
  <td>${esc(r.description)}</td>
  <td>${esc(r.ccId)}</td>
  <td class="r">${amount(r.debit)}</td>
  <td class="r">${amount(r.credit)}</td>
  <td class="r">${esc(r.balance)}</td>
</tr>`;

const accountHtml = (r: PrintReport, a: GLAccount, first: boolean) => `
<table class="g${first ? "" : " pb"}">
  <colgroup>
    ${COL_WIDTHS.map((w) => `<col style="width:${(w * 100).toFixed(2)}%" />`).join("\n    ")}
  </colgroup>
  <thead>
    <tr><td colspan="9" class="co"   style="border:0">${esc(r.coName)}</td></tr>
    <tr><td colspan="9" class="head" style="border:0">${esc(r.heading)}</td></tr>
    <tr>
      <td colspan="5" class="br" style="border:0">${esc(r.branch)}</td>
      <td colspan="4" class="info" style="border:0">${esc(r.reportInfo)}</td>
    </tr>
    <tr><td colspan="9" class="acc">Account : &nbsp;${esc(a.accountId)} &nbsp;&nbsp;${esc(a.accountName)}</td></tr>
    <tr>
      ${COL_LABELS.map((l, i) => `<th class="${i >= 6 ? "r" : ""}">${l}</th>`).join("")}
    </tr>
  </thead>
  <tbody>
    ${a.rows.map(rowHtml).join("\n")}
    <tr class="tot">
      <td colspan="6" class="r">Total :</td>
      <td class="r">${amount(a.totalDebit)}</td>
      <td class="r">${amount(a.totalCredit)}</td>
      <td class="r">${esc(a.balance)}</td>
    </tr>
  </tbody>
</table>`;

export const buildHtml = (r: PrintReport) => `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${esc(r.heading)}</title>
<style>
  @page {
    size: A4 landscape;
    margin: 12.7mm 10mm 14mm 19mm;
    @top-right { content: "Page " counter(page) " of " counter(pages); font: 8pt Tahoma, Verdana, sans-serif; }
  }
  * { box-sizing: border-box; }
  body { margin: 0; font: 8.5pt Tahoma, Verdana, sans-serif; color: #000;
         -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  table.pb { break-before: page; page-break-before: always; }   /* each account on a new page */
  thead { display: table-header-group; }   /* header repeats on every page */
  tr { page-break-inside: avoid; }
  .co   { font-size: 14pt; font-weight: bold; text-align: center; height: 24px; }
  .head { font-size: 12pt; text-align: center; height: 22px; }
  .br   { font-size: 8.5pt; text-align: left;  height: 20px; }
  .info { font-size: 8.5pt; text-align: right; height: 20px; }
  .acc  { font: 10.5pt "Times New Roman", serif; height: 24px; padding: 0 4px;
          background: #eff3fa; border: 1px solid #c7d1e4; }
  th { background: #eff3fa; border: 1px solid #c7d1e4; height: 22px;
       padding: 0 4px; font-weight: normal; text-align: left; }
  th.r { text-align: right; }
  td { border: 1px solid #c7d1e4; border-top: 0; height: 22px; padding: 0 4px;
       overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
  td.r { text-align: right; }
  tr.tot td { background: #eff3fa; font-weight: bold; border-top: 1px solid #c7d1e4; }
</style>
</head>
<body>
${r.accounts.map((a, i) => accountHtml(r, a, i === 0)).join("\n")}
</body>
</html>`;

export const printGLReport = (report: PrintReport): void => {
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