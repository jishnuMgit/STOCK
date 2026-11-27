// RptSalesPriceListRpt.ts
// The printed Sales Price List report (the old rptPriceListRpt), A4 portrait: the items grouped by item group.
//   Item ID / Item Name / Unit / Unit Cost / Unit Price, under "Item Group : 01   Tiles" lines.
//   The stock look (common/reportStyle.ts, STOCK_REPORT_CSS): the same design as the stock documents - "Page x of y" on a line of its
//   own under the heading, the 11 px text, the light thin lines, "Printed : ..." at the bottom right (9 px). The company, the heading
//   and the branch repeat at the top of every page.
// buildHtml is used by the print preview; printSalesPriceListReport sends the report to the printer (browser print dialog,
// hidden iframe - no pop-up).
import { branchLineHtml, esc, printHtmlDocument } from "../../../common/printHtml";
import { reportPrintCss } from "../../../common/reportStyle";

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
  reportInfo: string; // "<user>  dd/mm/yyyy hh:mm" - bottom right of every page, "Printed : ..."
  groups: PriceGroup[];
};

// VB formats: Unit Cost {0:#,#0.0000}, Unit Price {0:#,#0.00}; empty stays empty
export const fixed = (v: number | null, digits: number) =>
  v == null
    ? ""
    : v.toLocaleString("en-US", {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      });

// VB column weights: Item ID | Item Name | Unit | Unit Cost | Unit Price (Unit Cost and Unit Price share the same width)
export const COL_WIDTHS = [0.232, 0.4291, 0.0686, 0.13515, 0.13515];

const groupHtml = (g: PriceGroup) => `<tr><td colspan="5" class="group">Item Group&nbsp; : &nbsp;<b>${esc(g.groupId)}</b>&nbsp;&nbsp;${esc(g.groupName)}</td></tr>
    ${g.items
      .map(
        (it, index) => `<tr${index === 0 ? ' class="first"' : ""}>
      <td>${esc(it.itemId)}</td>
      <td>${esc(it.itemName)}</td>
      <td class="u">${esc(it.unit)}</td>
      <td class="r">${fixed(it.unitCost, 4)}</td>
      <td class="r">${fixed(it.unitPrice, 2)}</td>
    </tr>`
      )
      .join("\n    ")}`;

export const buildHtml = (r: PriceListReport) => `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${esc(r.heading)}</title>
<style>${reportPrintCss({ reportInfo: r.reportInfo, look: "inter", stockLook: true, orientation: "portrait", marginLeft: "15mm", groupSelector: "td.group",
  extra: `
  td.group { font-size: 11px; } /* the item group line is 11 px too, as the rows */` })}
</style>
</head>
<body>
<table>
  <colgroup>
    ${COL_WIDTHS.map((w) => `<col style="width:${(w * 100).toFixed(2)}%" />`).join("")}
  </colgroup>
  <thead>
    <tr><td colspan="5" class="co"   style="border:0">${esc(r.coName)}</td></tr>
    <tr><td colspan="5" class="head" style="border:0">${esc(r.heading)}</td></tr>
    <tr><td colspan="5" class="pagerow" style="border:0"></td></tr>
    <tr><td colspan="5" class="sub"  style="border:0">${branchLineHtml(r.branch)}</td></tr>
    <tr>
      <th>Item ID</th><th>Item Name</th><th>Unit</th>
      <th class="r">Unit Cost</th><th class="r">Unit Price</th>
    </tr>
  </thead>
  <tbody>
    ${r.groups.map(groupHtml).join("\n    ")}
  </tbody>
</table>
</body>
</html>`;

export const printSalesPriceListReport = (report: PriceListReport): void =>
  printHtmlDocument(buildHtml(report)); // waits for the Inter font before the print dialog opens
