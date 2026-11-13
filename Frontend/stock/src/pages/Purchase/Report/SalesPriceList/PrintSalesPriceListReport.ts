// PrintSalesPriceListReport.ts
// The Price List page (port of rptPriceListRpt): A4 PORTRAIT, company name,
// heading, branch, column labels (Item ID, Item Name, Unit, Unit Cost,
// Unit Price) and the items grouped by item group.
// Page number top right, user id + date bottom right of every page.
// buildHtml is used by the print preview; printSalesPriceListReport sends the
// report to the printer (browser print dialog, hidden iframe - no pop-up).

import { printHtmlDocument } from "../../../../components/common/printHtml";
import { reportLook } from "../../../../components/common/reportStyle";

// the font and the sizes of the shared look (components/common/reportStyle.ts): the same in every report
const LOOK = reportLook("inter");

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
  reportInfo: string; // "<user>  dd/mm/yyyy hh:mm" - top right, on the branch line
  groups: PriceGroup[];
};

const esc = (v: unknown) =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

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
<style>${LOOK.css.importCss}
  @page {
    size: A4 portrait;
    margin: 12mm 10mm 14mm 15mm;
    @top-right    { content: "Page " counter(page) " of " counter(pages); font: ${LOOK.size.small}pt ${LOOK.css.family}; }
  }
  * { box-sizing: border-box; }
  body { margin: 0; font: ${LOOK.size.body}pt ${LOOK.css.family}; color: #000;
         -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  thead { display: table-header-group; }   /* header repeats on every page */
  tr { page-break-inside: avoid; }
  .co   { font-size: ${LOOK.size.company}pt; text-align: center; height: 24px; }
  .head { font-size: ${LOOK.size.heading}pt; text-align: center; height: 24px; }
  .br   { font-size: ${LOOK.size.body}pt;  text-align: left;   height: 22px; }
  .br div { display: flex; justify-content: space-between; gap: 16px; }
  .br .info { font-size: ${LOOK.size.small}pt; }
  th { border: 1px solid #b0c4de; height: 24px;
       padding: 0 4px; font-size: ${LOOK.size.columnHead ?? LOOK.size.body}pt; font-weight: normal; text-align: left; }
  th.r { text-align: right; }
  td { border: 1px solid #b0c4de; border-top: 0; height: 24px; padding: 0 4px;
       overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
  td.r { text-align: right; }
  tr.grp td { border: 0; height: 30px; padding-top: 8px; font-size: ${LOOK.size.group}pt; font-weight: bold; } /* space above the group line, no rule under it: as in the other reports */
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
    <tr><td colspan="5" class="br"   style="border:0"><div><span>${esc(r.branch)}</span><span class="info">${esc(r.reportInfo)}</span></div></td></tr>
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

export const printSalesPriceListReport = (report: PriceListReport): void =>
  printHtmlDocument(buildHtml(report)); // waits for the Inter font before the print dialog opens
