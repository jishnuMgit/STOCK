// printItemListReport.ts
// The printed page (port of rptItemListRpt / rptItemListStatusRpt /
// rptItemListAllBrRpt). Three layouts, chosen by the server:
//   "branch"    one branch, active   - A4 landscape, grouped by item group:
//               Item ID, Item Name, Unit, Packing, R. Level, R. Qty., Unit Price, Stock
//   "status"    one branch, inactive / hidden - A4 portrait:
//               Item ID, Item Name, Unit, Packing, Stock
//   "allBranch" all branches - A4 portrait:
//               Item ID, Item Name, Unit, Packing
// Opens the browser print dialog from a hidden iframe (no pop-up to block).

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
  reportInfo: string; // "<user>  dd/mm/yyyy hh:mm" - bottom right of every page
  rows: ItemRow[];
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

type Col = {
  label: string;
  width: number; // VB width (1/100 inch) - only the proportions matter
  right?: boolean;
  get: (r: ItemRow) => string;
};

const idName: Col[] = [
  { label: "Item ID", width: 125, get: (r) => r.itemId },
  { label: "Item Name", width: 350, get: (r) => r.itemName },
  { label: "Unit", width: 50, get: (r) => r.unit },
];

const COLS: Record<Variant, Col[]> = {
  // rptItemListRpt (1025 wide, landscape)
  branch: [
    ...idName,
    { label: "Packing", width: 75, right: true, get: (r) => whole(r.packing) },
    { label: "R. Level", width: 75, right: true, get: (r) => whole(r.reorderLevel) },
    { label: "R. Qty.", width: 74, right: true, get: (r) => whole(r.reorderQty) },
    { label: "Unit Price", width: 138, right: true, get: (r) => fixed(r.unitPrice, 2) },
    { label: "Stock", width: 138, right: true, get: (r) => whole(r.stock) },
  ],
  // rptItemListStatusRpt (700 wide)
  status: [
    { label: "Item ID", width: 125, get: (r) => r.itemId },
    { label: "Item Name", width: 342, get: (r) => r.itemName },
    { label: "Unit", width: 50, get: (r) => r.unit },
    { label: "Packing", width: 75, right: true, get: (r) => whole(r.packing) },
    { label: "Stock", width: 108, right: true, get: (r) => whole(r.stock) },
  ],
  // rptItemListAllBrRpt (700 wide)
  allBranch: [
    { label: "Item ID", width: 142, get: (r) => r.itemId },
    { label: "Item Name", width: 366, get: (r) => r.itemName },
    { label: "Unit", width: 84, get: (r) => r.unit },
    { label: "Packing", width: 108, right: true, get: (r) => whole(r.packing) },
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

const buildHtml = (r: PrintReport) => {
  const cols = COLS[r.variant];
  const total = cols.reduce((t, c) => t + c.width, 0);
  const landscape = r.variant === "branch";

  // VB margins (left, right, top, bottom) in 1/100 inch:
  // branch 100,0,50,50 - status / all branch 80,0,50,50
  const page = landscape
    ? "A4 landscape; margin: 12.7mm 10mm 14mm 25.4mm"
    : "A4; margin: 12.7mm 10mm 14mm 20.3mm";

  const body =
    r.variant === "branch"
      ? groupedBody(cols, r.rows)
      : r.rows.map((row) => rowHtml(cols, row)).join("\n");

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${esc(r.heading)}</title>
<style>
  @page {
    size: ${page.split(";")[0]};
    margin: ${page.split("margin:")[1].trim()};
    @top-right    { content: "Page " counter(page) " of " counter(pages); font: 8pt "Times New Roman", serif; }
    @bottom-right { content: "${cssStr(r.reportInfo)}"; font: 8pt "Times New Roman", serif; }
  }
  * { box-sizing: border-box; }
  body { margin: 0; font: 9pt "Times New Roman", serif; color: #000;
         -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  table.main { width: 100%; border-collapse: collapse; table-layout: fixed; }
  thead { display: table-header-group; }   /* company / heading / labels repeat on every page */
  tr { page-break-inside: avoid; }
  .co   { font-size: 14pt; text-align: center; height: 24px; }
  .head { font-size: 12pt; text-align: center; height: 22px; }
  .br   { font-size: 9pt;  text-align: left;   height: 20px; }
  th { background: #eff3fa; border: 1px solid #c7d1e4; height: 24px;
       padding: 0 4px; font-weight: normal; text-align: left; }
  th.r { text-align: right; }
  td { border: 1px solid #c7d1e4; border-top: 0; height: 24px; padding: 0 4px;
       overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
  td.r { text-align: right; }
  tr.gh td { font-size: 10pt; border: 0; border-bottom: 1px solid #c7d1e4; }
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

export const printItemListReport = (report: PrintReport): void => {
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
