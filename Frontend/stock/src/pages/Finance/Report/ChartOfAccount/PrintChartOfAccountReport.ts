// printChartOfAccountReport.ts
// The printed page (port of rptChartofAccountRpt: company name, heading, report
// info, Account ID / Account Name / C.C / Level, coloured by level).
// Opens the browser print dialog from a hidden iframe (no pop-up to be blocked).

export type PrintRow = {
  accountId: string;
  accountName: string;
  accountLevel: number;
  haveCC: boolean;
};

export type PrintReport = {
  coName: string;
  heading: string;
  reportInfo: string;
  userId?: string;
  rows: PrintRow[];
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

// level colours as on the tree: 1 green, 2 blue, 3 purple, else dark slate
const levelClass = (level: number) =>
  level === 1 ? "l1" : level === 2 ? "l2" : level === 3 ? "l3" : "l4";

export const buildHtml = (r: PrintReport) => `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${esc(r.heading)}</title>
<style>
  @page {
    size: A4;
    margin: 12mm 10mm 14mm 12mm;
    @top-right    { content: "Page " counter(page) " of " counter(pages); font: 8pt "Times New Roman", serif; }
    @bottom-right { content: "${cssStr(r.reportInfo)}"; font: 8pt "Times New Roman", serif; }
  }
  * { box-sizing: border-box; }
  body { margin: 0; font: 10pt "Times New Roman", serif; color: #000;
         -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  table { width: 100%; border-collapse: collapse; table-layout: fixed;
          margin-left: 0; margin-right: 0; }
  thead { display: table-header-group; }            /* header repeats on every page */
  tr { page-break-inside: avoid; }
  .co   { font-size: 14pt; text-align: center; height: 24px; }
  .head { font-size: 12pt; text-align: center; height: 24px; }
  .info { font-size: 8pt;  text-align: right;  height: 24px; }
  th { background: #eff3fa; border: 1px solid #c7d1e4; height: 24px;
       padding: 0 6px; font-weight: normal; text-align: left; }
  td { border: 1px solid #c7d1e4; border-top: 0; height: 30px; padding: 0 6px; }
  .name { white-space: pre; }                       /* keeps the level indent */
  .c-id { width: 86px; } .c-cc { width: 42px; } .c-lv { width: 55px; text-align: right; }
  .l1 { color: #00a63e; } .l2 { color: #155dfc; } .l3 { color: #c800de; } .l4 { color: #314158; }
</style>
</head>
<body>
<table>
  <colgroup><col class="c-id" /><col /><col class="c-cc" /><col class="c-lv" /></colgroup>
  <thead>
    <tr><td colspan="4" class="co"   style="border:0">${esc(r.coName)}</td></tr>
    <tr><td colspan="4" class="head" style="border:0">${esc(r.heading)}</td></tr>
    <tr>
      <th>Account ID</th><th>Account Name</th><th>C.C</th>
      <th style="text-align:right">Level</th>
    </tr>
  </thead>
  <tbody>
    ${r.rows
      .map(
        (row) => `<tr class="${levelClass(row.accountLevel)}">
      <td>${esc(row.accountId)}</td>
      <td class="name">${esc(row.accountName)}</td>
      <td>${row.haveCC ? "Yes" : ""}</td>
      <td style="text-align:right">${esc(row.accountLevel)}</td>
    </tr>`,
      )
      .join("\n")}
  </tbody>
</table>
</body>
</html>`;

export const printChartOfAccountReport = (report: PrintReport): void => {
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