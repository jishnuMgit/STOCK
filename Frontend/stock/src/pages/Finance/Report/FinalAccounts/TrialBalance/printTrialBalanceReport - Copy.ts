// printTrialBalanceReport.ts
// The printed page (port of rptTB_MRpt): A4 landscape, company name, heading,
// branch, then a two-line header: Account ID, Account Name, Opening,
// Transactions (Debit, Credit, Movement), Closing - and a "Total :" row at the end.
// Rows are coloured by account level (1 green, 2 blue, 3 magenta, 4 slate).
// Opens the browser print dialog from a hidden iframe (no pop-up to block).

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

// VB {0:#,#.00;(#,#.00);0.00}: 1,234.50 / (1,234.50) / 0.00
const amount = (v: number) => {
  if (!v) return "0.00";
  const s = Math.abs(v).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return v < 0 ? `(${s})` : s;
};

// same colours as the account tree: level 1 green, 2 blue, 3 magenta,
// level 4 (the accounts) dark slate. Levels 1-3 (the groups) are bold.
const LEVEL_COLOR: Record<number, string> = {
  1: "#00a63e",
  2: "#155dfc",
  3: "#c800de",
};
const DETAIL_COLOR = "#314158";

// VB column weights
const COL_WIDTHS = [0.0798, 0.3646, 0.1101, 0.1101, 0.1101, 0.1101, 0.1152];

const rowHtml = (r: TBRow) => `<tr style="color:${LEVEL_COLOR[r.level] ?? DETAIL_COLOR};${r.level >= 1 && r.level <= 3 ? "font-weight:bold" : ""}">
  <td>${esc(r.accountId)}</td>
  <td class="name">${esc(r.accountName)}</td>
  <td class="r">${amount(r.opening)}</td>
  <td class="r">${amount(r.currentDr)}</td>
  <td class="r">${amount(r.currentCr)}</td>
  <td class="r">${amount(r.movement)}</td>
  <td class="r">${amount(r.closing)}</td>
</tr>`;

const buildHtml = (r: PrintReport) => `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${esc(r.heading)}</title>
<style>
  @page {
    size: A4 landscape;
    margin: 12mm 10mm 12mm 15mm;
    @top-right    { content: "Page " counter(page) " of " counter(pages); font: 8pt "Times New Roman", serif; }
    @bottom-right { content: "${cssStr(r.reportInfo)}"; font: 8pt "Times New Roman", serif; }
  }
  * { box-sizing: border-box; }
  body { margin: 0; font: 9pt "Times New Roman", serif; color: #000;
         -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  table.main { width: 100%; border-collapse: collapse; table-layout: fixed; }
  thead { display: table-header-group; }   /* company / heading / labels repeat on every page */
  tr { page-break-inside: avoid; }
  .co   { font-size: 14pt; font-weight: bold; text-align: center; height: 24px; }
  .head { font-size: 12pt; text-align: center; height: 22px; }
  .br   { font-size: 9pt;  text-align: left;   height: 20px; }
  th { background: #eff3fa; border: 1px solid #b0c4de; height: 24px;
       padding: 0 4px; font-weight: normal; text-align: left; }
  th { vertical-align: bottom; }   /* spanning labels sit on the same line as Debit / Credit / Movement */
  th.r { text-align: right; }
  th.c { text-align: center; }
  th.m { vertical-align: middle; }          /* Account ID / Account Name: centred between the two lines */
  td { border: 1px solid #b0c4de; border-top: 0; height: 24px; padding: 0 4px;
       overflow: hidden; white-space: nowrap; }
  td.name { white-space: pre; }            /* keeps the A/C group indent */
  td.r { text-align: right; }
  tr.tot td { background: #eff3fa; font-weight: bold; border-top: 1px solid #b0c4de; }
</style>
</head>
<body>
<table class="main">
  <colgroup>
    ${COL_WIDTHS.map((w) => `<col style="width:${(w * 100).toFixed(2)}%" />`).join("\n    ")}
  </colgroup>
  <thead>
    <tr><td colspan="7" class="co"   style="border:0">${esc(r.coName)}</td></tr>
    <tr><td colspan="7" class="head" style="border:0">${esc(r.heading)}</td></tr>
    <tr><td colspan="7" class="br"   style="border:0">${esc(r.branch)}</td></tr>
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
      <td colspan="2" class="r">Total :</td>
      <td class="r">${amount(r.totals.opening)}</td>
      <td class="r">${amount(r.totals.currentDr)}</td>
      <td class="r">${amount(r.totals.currentCr)}</td>
      <td class="r">${amount(r.totals.movement)}</td>
      <td class="r">${amount(r.totals.closing)}</td>
    </tr>
  </tbody>
</table>
</body>
</html>`;

export const printTrialBalanceReport = (report: PrintReport): void => {
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