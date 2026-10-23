// PrintSalesPriceListReport.ts
// The Price List page (port of rptPriceListRpt): A4 PORTRAIT, company name,
// heading, branch, column labels (Item ID, Item Name, Unit, Unit Cost,
// Unit Price) and the items grouped by item group.
// Page number top right, user id + date bottom right of every page.
// buildHtml is used by the print preview; printSalesPriceListReport sends the
// report to the printer (browser print dialog, hidden iframe - no pop-up).

export type PriceItem = {
  itemId: string;
  itemName: string;
  unit: string;
  unitCost: number | null;
  unitPrice: number | null;
};

export type PriceGroup = {
  groupId: string;
  groupName: string;
  items: PriceItem[];
};

export type PriceListReport = {
  coName: string;
  heading: string;
  branch: string;
  reportInfo: string; // "<user>  dd/mm/yyyy hh:mm" - bottom right of every page
  groups: PriceGroup[];
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

// VB formats: Unit Cost {0:#,#0.0000}, Unit Price {0:#,#0.00}; empty stays empty
const fixed = (v: number | null, digits: number) =>
  v == null
    ? ""
    : v.toLocaleString("en-US", {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      });

// VB column weights
// Unit Cost and Unit Price share the same width
const COL_WIDTHS = [0.232, 0.4291, 0.0686, 0.13515, 0.13515];

const groupHtml = (g: PriceGroup) =>
  `<tr class="grp"><td colspan="5">Item Group :&nbsp; ${esc(g.groupId)} &nbsp;${esc(g.groupName)}</td></tr>
${g.items
  .map(
    (it) => `<tr>
  <td>${esc(it.itemId)}</td>
  <td>${esc(it.itemName)}</td>
  <td>${esc(it.unit)}</td>
  <td class="r">${fixed(it.unitCost, 4)}</td>
  <td class="r">${fixed(it.unitPrice, 2)}</td>
</tr>`,
  )
  .join("\n")}`;

export const buildHtml = (r: PriceListReport) => `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${esc(r.heading)}</title>
<style>
  @page {
    size: A4 portrait;
    margin: 12mm 10mm 14mm 15mm;
    @top-right    { content: "Page " counter(page) " of " counter(pages); font: 8pt "Times New Roman", serif; }
    @bottom-right { content: "${cssStr(r.reportInfo)}"; font: 8pt "Times New Roman", serif; }
  }
  * { box-sizing: border-box; }
  body { margin: 0; font: 9pt "Times New Roman", serif; color: #000;
         -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  thead { display: table-header-group; }   /* header repeats on every page */
  tr { page-break-inside: avoid; }
  .co   { font-size: 14pt; text-align: center; height: 24px; }
  .head { font-size: 12pt; text-align: center; height: 24px; }
  .br   { font-size: 9pt;  text-align: left;   height: 22px; }
  th { background: #fffff0; border: 1px solid #b0c4de; height: 24px;
       padding: 0 4px; font-weight: normal; text-align: left; }
  th.r { text-align: right; }
  td { border: 1px solid #b0c4de; border-top: 0; height: 24px; padding: 0 4px;
       overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
  td.r { text-align: right; }
  tr.grp td { border: 0; border-bottom: 1px solid #b0c4de; font-size: 10pt; }
</style>
</head>
<body>
<table>
  <colgroup>
    ${COL_WIDTHS.map((w) => `<col style="width:${(w * 100).toFixed(2)}%" />`).join("\n    ")}
  </colgroup>
  <thead>
    <tr><td colspan="5" class="co"   style="border:0">${esc(r.coName)}</td></tr>
    <tr><td colspan="5" class="head" style="border:0">${esc(r.heading)}</td></tr>
    <tr><td colspan="5" class="br"   style="border:0">${esc(r.branch)}</td></tr>
    <tr>
      <th>Item ID</th><th>Item Name</th><th>Unit</th>
      <th class="r">Unit Cost</th><th class="r">Unit Price</th>
    </tr>
  </thead>
  <tbody>
    ${r.groups.map(groupHtml).join("\n")}
  </tbody>
</table>
</body>
</html>`;

export const printSalesPriceListReport = (report: PriceListReport): void => {
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
