// services/Purchase/Report/RptItemListExcel.ts
// The Item List as an Excel file (same three layouts as the printed report:
// "branch" grouped by item group, "status", "allBranch").
// Needs:  npm i exceljs
import ExcelJS from "exceljs";
import type { ItemListRow } from "./RptItemListService.js";

export type Variant = "branch" | "status" | "allBranch";

export type ItemListReport = {
  variant: Variant;
  coName: string;
  heading: string;
  branch: string;
  reportInfo: string;
  rows: ItemListRow[];
};

type ColDef = {
  label: string;
  width: number;
  right?: boolean;
  numFmt?: string;
  get: (r: ItemListRow) => string | number | null;
};

const WHOLE = "#,##0";
const PRICE = "#,##0.00";

const idName: ColDef[] = [
  { label: "Item ID", width: 14, get: (r) => r.itemId },
  { label: "Item Name", width: 50, get: (r) => r.itemName },
  { label: "Unit", width: 10, get: (r) => r.unit },
];

const COLS: Record<Variant, ColDef[]> = {
  branch: [
    ...idName,
    { label: "Packing", width: 12, right: true, numFmt: WHOLE, get: (r) => r.packing },
    { label: "R. Level", width: 12, right: true, numFmt: WHOLE, get: (r) => r.reorderLevel },
    { label: "R. Qty.", width: 12, right: true, numFmt: WHOLE, get: (r) => r.reorderQty },
    { label: "Unit Price", width: 16, right: true, numFmt: PRICE, get: (r) => r.unitPrice },
    { label: "Stock", width: 16, right: true, numFmt: WHOLE, get: (r) => r.stock },
  ],
  status: [
    ...idName,
    { label: "Packing", width: 12, right: true, numFmt: WHOLE, get: (r) => r.packing },
    { label: "Stock", width: 16, right: true, numFmt: WHOLE, get: (r) => r.stock },
  ],
  allBranch: [
    ...idName,
    { label: "Packing", width: 14, right: true, numFmt: WHOLE, get: (r) => r.packing },
  ],
};

const BORDER_COLOR = { argb: "FFC7D1E4" };
const HEAD_FILL = {
  type: "pattern" as const,
  pattern: "solid" as const,
  fgColor: { argb: "FFEFF3FA" },
};

const thin = {
  top: { style: "thin" as const, color: BORDER_COLOR },
  left: { style: "thin" as const, color: BORDER_COLOR },
  bottom: { style: "thin" as const, color: BORDER_COLOR },
  right: { style: "thin" as const, color: BORDER_COLOR },
};

export const buildItemListWorkbook = async (
  report: ItemListReport,
): Promise<Buffer> => {
  const cols = COLS[report.variant];
  const last = cols.length;
  const grouped = report.variant === "branch";

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Item List", {
    views: [{ state: "frozen", ySplit: 4 }],
    pageSetup: {
      paperSize: 9, // A4
      orientation: grouped ? "landscape" : "portrait",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      printTitlesRow: "1:4",
    },
  });

  ws.columns = cols.map((c) => ({ width: c.width }));

  // ---- company / heading / branch (rows 1-3) ----
  ws.mergeCells(1, 1, 1, last);
  ws.getCell(1, 1).value = report.coName;
  ws.getCell(1, 1).font = { name: "Times New Roman", size: 14, bold: true };
  ws.getCell(1, 1).alignment = { horizontal: "center" };

  ws.mergeCells(2, 1, 2, last);
  ws.getCell(2, 1).value = report.heading;
  ws.getCell(2, 1).font = { name: "Times New Roman", size: 12 };
  ws.getCell(2, 1).alignment = { horizontal: "center" };

  ws.mergeCells(3, 1, 3, 2);
  ws.getCell(3, 1).value = report.branch;
  ws.mergeCells(3, 3, 3, last);
  ws.getCell(3, 3).value = report.reportInfo;
  ws.getCell(3, 3).font = { name: "Times New Roman", size: 8 };
  ws.getCell(3, 3).alignment = { horizontal: "right" };

  // ---- column labels (row 4) ----
  const head = ws.getRow(4);
  head.values = cols.map((c) => c.label);
  head.eachCell((cell, col) => {
    cell.font = { bold: true };
    cell.fill = HEAD_FILL;
    cell.border = thin;
    cell.alignment = { horizontal: cols[col - 1].right ? "right" : "left" };
  });

  // ---- detail (one band per item group in the "branch" layout) ----
  let currentGroup: string | null = null;

  for (const r of report.rows) {
    if (grouped && r.itemGroupId !== currentGroup) {
      currentGroup = r.itemGroupId;
      const gr = ws.addRow([
        `Item Group :  ${r.itemGroupId}   ${r.itemGroupName}`,
      ]);
      ws.mergeCells(gr.number, 1, gr.number, last);
      gr.getCell(1).font = { name: "Times New Roman", size: 10, bold: true };
      gr.getCell(1).border = { bottom: { style: "thin", color: BORDER_COLOR } };
    }

    const row = ws.addRow(cols.map((c) => c.get(r)));
    row.eachCell({ includeEmpty: true }, (cell, col) => {
      const def = cols[col - 1];
      cell.border = thin;
      if (def.numFmt) cell.numFmt = def.numFmt;
      if (def.right) cell.alignment = { horizontal: "right" };
    });
  }

  return Buffer.from(await wb.xlsx.writeBuffer());
};
