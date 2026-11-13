// printItemListReport.ts
// The printed page (port of rptItemListRpt / rptItemListStatusRpt /
// rptItemListAllBrRpt). Three layouts, chosen by the server:
//   "branch"    one branch, active   - A4 portrait, grouped by item group:
//               Item ID, Item Name, Unit, Packing, R. Level, R. Qty., Unit Price, Stock
//   "status"    one branch, inactive / hidden - A4 portrait:
//               Item ID, Item Name, Unit, Packing, Stock
//   "allBranch" all branches - A4 portrait:
//               Item ID, Item Name, Unit, Packing
// buildHtml is used by the print preview; printItemListReport sends the report
// to the printer (browser print dialog, hidden iframe - no pop-up to block).
// COLS is shared with the Excel / PDF files so all of them have the same columns.

import { cssStr, printHtmlDocument } from "../../../../components/common/printHtml";
import { reportLook } from "../../../../components/common/reportStyle";

// the font and the sizes of the shared look (components/common/reportStyle.ts): the same in every report
const LOOK = reportLook("inter");

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

const esc = (v: unknown) =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

// ---- VB number formats ----
const fixed = (v: number | null, decimals: number) =>
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

const rowHtml = (cols: Col[], r: ItemRow) =>
  `<tr>${cols
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
        `<tr class="gh"><td colspan="${cols.length}"><b>Item Group :</b>&nbsp;&nbsp;<b>${esc(
          r.itemGroupId,
        )}</b>&nbsp;&nbsp;&nbsp;<b>${esc(r.itemGroupName)}</b></td></tr>`,
      );
    }
    out.push(rowHtml(cols, r));
  }
  return out.join("\n");
};

export const buildHtml = (r: PrintReport) => {
  const cols = COLS[r.variant];
  const total = cols.reduce((t, c) => t + c.width, 0);

  // VB margins (left, right, top, bottom) in 1/100 inch:
  // branch 100,0,50,50 - status / all branch 80,0,50,50
  // A4 portrait for every layout, with the margins of the Item History
  const page = "A4; margin: 12mm 10mm 14mm 12mm";

  const body =
    r.variant === "branch"
      ? groupedBody(cols, r.rows)
      : r.rows.map((row) => rowHtml(cols, row)).join("\n");

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${esc(r.heading)}</title>
<style>${LOOK.css.importCss}
  @page {
    size: ${page.split(";")[0]};
    margin: ${page.split("margin:")[1].trim()};
    @top-right    { content: "Page " counter(page) " / " counter(pages); font: ${LOOK.size.small}pt ${LOOK.css.family}; }
    @bottom-right { content: "Printed : ${cssStr(r.reportInfo)}"; font: ${LOOK.size.small}pt ${LOOK.css.family}; }
  }
  * { box-sizing: border-box; }
  body { margin: 0; font: ${LOOK.size.body}pt ${LOOK.css.family}; color: #000;
         -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  table.main { width: 100%; border-collapse: collapse; table-layout: fixed; }
  thead { display: table-header-group; }   /* company / heading / labels repeat on every page */
  tr { page-break-inside: avoid; }
  .co   { font-size: ${LOOK.size.company}pt; text-align: center; height: 24px; }
  .head { font-size: ${LOOK.size.heading}pt; text-align: center; height: 22px; }
  .br   { font-size: ${LOOK.size.body}pt;  text-align: left;   height: 20px; }
  th { border: 1px solid #c7d1e4; height: 24px;
       padding: 0 4px; font-size: ${LOOK.size.columnHead ?? LOOK.size.body}pt; font-weight: normal; text-align: left; }
  th.r { text-align: right; }
  td { border: 1px solid #c7d1e4; border-top: 0; height: 24px; padding: 0 4px;
       vertical-align: middle; overflow-wrap: anywhere; }
  td.r { text-align: right; }
  tr.gh td { font-size: ${LOOK.size.group}pt; border: 0; height: 30px; padding-top: 8px; } /* space above the group line, no rule under it: as in the other reports */
</style>
</head>
<body>
<table class="main">
  <colgroup>
    ${cols.map((c) => `<col style="width:${((c.width / total) * 100).toFixed(2)}%" />`).join("\n    ")}
  </colgroup>
  <thead>
    <tr><td colspan="${cols.length}" class="co"   style="border:0">${esc(r.coName)}</td></tr>
    <tr><td colspan="${cols.length}" class="head" style="border:0">${esc(r.heading)}</td></tr>
    <tr><td colspan="${cols.length}" class="br"   style="border:0">${esc(r.branch)}</td></tr>
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
