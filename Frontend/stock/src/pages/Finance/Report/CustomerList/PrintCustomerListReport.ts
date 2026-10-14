// printCustomerListReport.ts
// The printed page (port of rptCustomerListRpt): A4 LANDSCAPE, company name,
// heading, report info, then Customer ID / Name / Address / Contact / Phone /
// VAT No. / Credit Limit / Credit Days, coloured by account level.
// Opens the browser print dialog from a hidden iframe (no pop-up to block).

export type PrintRow = {
  accountId: string;
  accountName: string;
  accountLevel: number;
  address: string;
  contact: string;
  phone: string;
  vatNo: string;
  creditLimit: number | null;
  creditDays: number | null;
};

export type PrintReport = {
  coName: string;
  heading: string;
  reportInfo: string;
  rows: PrintRow[];
};

const esc = (v: unknown) =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

// VB Detail_BeforePrint: level 1 red, 2 green, 3 blue, else black
const levelClass = (level: number) =>
  level === 1 ? "l1" : level === 2 ? "l2" : level === 3 ? "l3" : "l4";

// VB formats: Credit Limit {0:#,#0.00}, Credit Days {0:#,#0}; empty stays empty
const money = (v: number | null) =>
  v == null
    ? ""
    : v.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
const whole = (v: number | null) =>
  v == null ? "" : v.toLocaleString("en-US", { maximumFractionDigits: 0 });

const buildHtml = (r: PrintReport) => `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${esc(r.heading)}</title>
<style>
  @page {
    size: A4 landscape;
    margin: 12mm 10mm 14mm 15mm;
    @bottom-right { content: "Page " counter(page) " of " counter(pages); font: 8pt "Times New Roman", serif; }
  }
  * { box-sizing: border-box; }
  body { margin: 0; font: 9pt "Times New Roman", serif; color: #000;
         -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  thead { display: table-header-group; }            /* header repeats on every page */
  tr { page-break-inside: avoid; }
  .co   { font-size: 14pt; text-align: center; height: 24px; }
  .head { font-size: 12pt; text-align: center; height: 24px; }
  .info { font-size: 8pt;  text-align: right;  height: 24px; }
  th { background: #eff3fa; border: 1px solid #c7d1e4; height: 24px;
       padding: 0 4px; font-weight: normal; text-align: left; }
  td { border: 1px solid #c7d1e4; border-top: 0; min-height: 22px; padding: 2px 4px;
       vertical-align: middle; overflow-wrap: anywhere; }
  tbody tr:nth-child(even) td { background: #f7f9fd; }
  .name { white-space: pre-wrap; }                  /* keeps the level 4 indent */
  .r { text-align: right; }
  .l1 { color: #ff0000; } .l2 { color: #008000; } .l3 { color: #0000ff; } .l4 { color: #000; }
</style>
</head>
<body>
<table>
  <colgroup>
    <col style="width:7.4%" />   <!-- Customer ID -->
    <col style="width:24.4%" />  <!-- Customer Name -->
    <col style="width:18.2%" />  <!-- Address -->
    <col style="width:14.9%" />  <!-- Contact -->
    <col style="width:10.7%" />  <!-- Phone -->
    <col style="width:10.5%" />  <!-- VAT No. -->
    <col style="width:7.1%" />   <!-- Credit Limit -->
    <col style="width:6.8%" />   <!-- Credit Days -->
  </colgroup>
  <thead>
    <tr><td colspan="8" class="co"   style="border:0">${esc(r.coName)}</td></tr>
    <tr><td colspan="8" class="head" style="border:0">${esc(r.heading)}</td></tr>
    <tr><td colspan="8" class="info" style="border:0">${esc(r.reportInfo)}</td></tr>
    <tr>
      <th>Customer ID</th><th>Customer Name</th><th>Address</th><th>Contact</th>
      <th>Phone</th><th>VAT No.</th>
      <th class="r">Credit Limit</th><th class="r">Credit Days</th>
    </tr>
  </thead>
  <tbody>
    ${r.rows
      .map(
        (row) => `<tr class="${levelClass(row.accountLevel)}">
      <td>${esc(row.accountId)}</td>
      <td class="name">${esc(row.accountName)}</td>
      <td>${esc(row.address)}</td>
      <td>${esc(row.contact)}</td>
      <td>${esc(row.phone)}</td>
      <td>${esc(row.vatNo)}</td>
      <td class="r">${esc(money(row.creditLimit))}</td>
      <td class="r">${esc(whole(row.creditDays))}</td>
    </tr>`,
      )
      .join("\n")}
  </tbody>
</table>
</body>
</html>`;

export const printCustomerListReport = (report: PrintReport): void => {
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
