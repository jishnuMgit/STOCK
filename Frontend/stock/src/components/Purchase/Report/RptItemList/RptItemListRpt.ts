// RptItemListRpt.ts
// The printed Item List report (port of rptItemListRpt / rptItemListStatusRpt /
// rptItemListAllBrRpt). Three layouts, chosen by the server:
//   "branch"    one branch, active   - A4 portrait, grouped by item group:
//               Item ID, Item Name, Unit, Packing, R. Level, R. Qty., Unit Price, Stock
//   "status"    one branch, inactive / hidden - A4 portrait:
//               Item ID, Item Name, Unit, Packing, Stock
//   "allBranch" all branches - A4 portrait:
//               Item ID, Item Name, Unit, Packing
// The stock look (common/reportStyle.ts, STOCK_REPORT_CSS): the same design as the stock documents - "Page x of y" on a line of its
// own under the heading, the 11 px text, the light thin lines, "Printed : ..." at the bottom right (9 px). The company, the heading
// and the branch repeat at the top of every page.
// buildHtml is used by the print preview; printItemListReport sends the report
// to the printer (browser print dialog, hidden iframe - no pop-up to block).
// COLS is shared with the PDF file so both have the same columns.

import { branchLineHtml, esc, printHtmlDocument } from "../../../common/printHtml";
import { reportPrintCss } from "../../../common/reportStyle";

export type Variant = "branch" | "status" | "allBranch";

export type ItemRow = {
  itemId: string;
  itemGroupId: string;
  itemGroupName: string;
  itemName: string;
  unit: string;
  packing: number | null;
  reorderLevel: number | null;
  reorderQty: number | null;
  unitPrice: number | null;
  stock: number | null;
};

export type PrintReport = {
  variant: Variant;
  coName: string;
  heading: string;
  branch: string;
  reportInfo: string; // "<user>  dd/mm/yyyy hh:mm" - bottom right of every page, "Printed : ..."
  rows: ItemRow[];
};

// ---- VB number formats ----
export const fixed = (v: number | null, decimals: number) =>
  v == null
    ? ""
    : v.toLocaleString("en-US", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });

// {0:#,#0}
const whole = (v: number | null) =>
  v == null ? "" : v.toLocaleString("en-US", { maximumFractionDigits: 0 });

export type Col = {
  label: string;
  width: number; // VB width (1/100 inch) - only the proportions matter
  right?: boolean;
  get: (r: ItemRow) => string;
};

export const COLS: Record<Variant, Col[]> = {
  // rptItemListRpt - A4 PORTRAIT now, like the Item History (it was landscape): the proportions of 1000
  branch: [
    { label: "Item ID", width: 195, get: (r) => r.itemId }, // an id like ACCSS-1.5MM-CABLE on one line
    { label: "Item Name", width: 275, get: (r) => r.itemName }, // a long name goes on to a second line
    { label: "Unit", width: 60, get: (r) => r.unit },
    { label: "Packing", width: 95, right: true, get: (r) => whole(r.packing) },
    { label: "R. Level", width: 100, right: true, get: (r) => whole(r.reorderLevel) },
    { label: "R. Qty.", width: 85, right: true, get: (r) => whole(r.reorderQty) },
    { label: "Unit Price", width: 110, right: true, get: (r) => fixed(r.unitPrice, 2) },
    { label: "Stock", width: 80, right: true, get: (r) => whole(r.stock) },
  ],
  // rptItemListStatusRpt (700 wide)
  status: [
    { label: "Item ID", width: 170, get: (r) => r.itemId },
    { label: "Item Name", width: 345, get: (r) => r.itemName },
    { label: "Unit", width: 45, get: (r) => r.unit },
    { label: "Packing", width: 70, right: true, get: (r) => whole(r.packing) },
    { label: "Stock", width: 70, right: true, get: (r) => whole(r.stock) },
  ],
  // rptItemListAllBrRpt (700 wide)
  allBranch: [
    { label: "Item ID", width: 185, get: (r) => r.itemId },
    { label: "Item Name", width: 360, get: (r) => r.itemName },
    { label: "Unit", width: 55, get: (r) => r.unit },
    { label: "Packing", width: 100, right: true, get: (r) => whole(r.packing) },
  ],
};

const rowHtml = (cols: Col[], r: ItemRow, first = false) =>
  `<tr${first ? ' class="first"' : ""}>${cols
    .map((c) => `<td${c.right ? ' class="r"' : ""}>${esc(c.get(r))}</td>`)
    .join("")}</tr>`;

// "branch" layout: one band per item group (VB ghCategory)
const groupedBody = (cols: Col[], rows: ItemRow[]) => {
  const out: string[] = [];
  let current: string | null = null;

  for (const r of rows) {
    if (r.itemGroupId !== current) {
      current = r.itemGroupId;
      out.push(
        `<tr><td colspan="${cols.length}" class="group">Item Group&nbsp; : &nbsp;<b>${esc(r.itemGroupId)}</b>&nbsp;&nbsp;${esc(r.itemGroupName)}</td></tr>`,
      );
      out.push(rowHtml(cols, r, true)); // the first line under the group line has the line above it
      continue;
    }
    out.push(rowHtml(cols, r));
  }
  return out.join("\n");
};

export const buildHtml = (r: PrintReport) => {
  const cols = COLS[r.variant];
  const total = cols.reduce((t, c) => t + c.width, 0);

  const body =
    r.variant === "branch"
      ? groupedBody(cols, r.rows)
      : r.rows.map((row) => rowHtml(cols, row)).join("\n");

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${esc(r.heading)}</title>
<style>${reportPrintCss({ reportInfo: r.reportInfo, look: "inter", stockLook: true, orientation: "portrait", marginLeft: "12mm", groupSelector: "td.group",
  extra: `
  td.group { font-size: 11px; } /* the item group line is 11 px too, as the rows */` })}
</style>
</head>
<body>
<table>
  <colgroup>
    ${cols.map((c) => `<col style="width:${((c.width / total) * 100).toFixed(2)}%" />`).join("\n    ")}
  </colgroup>
  <thead>
    <tr><td colspan="${cols.length}" class="co"   style="border:0">${esc(r.coName)}</td></tr>
    <tr><td colspan="${cols.length}" class="head" style="border:0">${esc(r.heading)}</td></tr>
    <tr><td colspan="${cols.length}" class="pagerow" style="border:0"></td></tr>
    <tr><td colspan="${cols.length}" class="sub"  style="border:0">${branchLineHtml(r.branch)}</td></tr>
    <tr>${cols
      .map((c) => `<th${c.right ? ' class="r"' : ""}>${esc(c.label)}</th>`)
      .join("")}</tr>
  </thead>
  <tbody>
    ${body}
  </tbody>
</table>
</body>
</html>`;
};

export const printItemListReport = (report: PrintReport): void =>
  printHtmlDocument(buildHtml(report)); // waits for the Inter font before the print dialog opens
