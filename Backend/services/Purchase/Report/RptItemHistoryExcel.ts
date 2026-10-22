// services/Purchase/Report/RptItemHistoryExcel.ts
// The Item History as an Excel file (same blocks as the printed report: per
// item a header block, the transactions and a "Total :" row).
// Needs:  npm i exceljs
import ExcelJS from "exceljs";
import type { HistoryGroup } from "./RptItemHistoryService.js";

export type ItemHistoryReport = {
  coName: string;
  heading: string;
  branch: string;
  reportInfo: string;
  groups: HistoryGroup[];
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

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

// "YYYY-MM-DD" -> dd-MMM-yyyy / dd-MMM-yy ; empty stays empty
const dmy = (iso: string | null, longYear: boolean) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso ?? "");
  if (!m) return "";
  return `${m[3]}-${MONTHS[Number(m[2]) - 1]}-${longYear ? m[1] : m[1].slice(2)}`;
};

const WHOLE = "#,##0";
const MONEY = "#,##0.00";
const COST4 = "#,##0.0000";

export const buildItemHistoryWorkbook = async (
  report: ItemHistoryReport,
): Promise<Buffer> => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Item History", {
    views: [{ state: "frozen", ySplit: 3 }],
    pageSetup: {
      paperSize: 9, // A4
      orientation: "portrait",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      printTitlesRow: "1:3",
    },
  });

  ws.columns = [
    { width: 13 }, // Date
    { width: 12 }, // Type
    { width: 16 }, // Document No.
    { width: 16 }, // Account ID
    { width: 12 }, // Qty. In
    { width: 12 }, // Qty. Out
    { width: 14 }, // Unit Cost
    { width: 16 }, // Unit Price
  ];

  // ---- company / heading / branch (rows 1-3) ----
  ws.mergeCells("A1:H1");
  ws.getCell("A1").value = report.coName;
  ws.getCell("A1").font = { name: "Times New Roman", size: 14, bold: true };
  ws.getCell("A1").alignment = { horizontal: "center" };

  ws.mergeCells("A2:H2");
  ws.getCell("A2").value = report.heading;
  ws.getCell("A2").font = { name: "Times New Roman", size: 12 };
  ws.getCell("A2").alignment = { horizontal: "center" };

  ws.mergeCells("A3:D3");
  ws.getCell("A3").value = report.branch;
  ws.mergeCells("E3:H3");
  ws.getCell("E3").value = report.reportInfo;
  ws.getCell("E3").font = { name: "Times New Roman", size: 8 };
  ws.getCell("E3").alignment = { horizontal: "right" };

  // one header-block line: label | value | label | value
  const infoRow = (
    l1: string,
    v1: string | number | null,
    fmt1?: string,
    l2?: string,
    v2?: string | number | null,
    fmt2?: string,
  ) => {
    const row = ws.addRow([l1, "", v1 ?? "", "", l2 ?? "", "", v2 ?? "", ""]);
    const n = row.number;
    ws.mergeCells(n, 1, n, 2); // label
    ws.mergeCells(n, 3, n, 4); // value
    ws.mergeCells(n, 5, n, 6); // label
    ws.mergeCells(n, 7, n, 8); // value
    row.getCell(1).value = l1 ? `${l1} :` : "";
    row.getCell(5).value = l2 ? `${l2} :` : "";
    row.getCell(3).alignment = { horizontal: "left" };
    row.getCell(7).alignment = { horizontal: "left" };
    if (fmt1) row.getCell(3).numFmt = fmt1;
    if (fmt2) row.getCell(7).numFmt = fmt2;
    return row;
  };

  for (const g of report.groups) {
    // ---- header block ----
    const item = ws.addRow([`Item :`, "", `${g.itemId}   ${g.itemName}`]);
    ws.mergeCells(item.number, 1, item.number, 2);
    ws.mergeCells(item.number, 3, item.number, 8);
    item.font = { bold: true };

    infoRow("Supplier", g.supplier, undefined, "Last Sale Date", dmy(g.lastSaleDate, true));
    infoRow(
      "Last Purchase Date", dmy(g.lastPurDate, true), undefined,
      "Last Sale Unit Price", g.lastSaleUnitPrice, MONEY,
    );
    infoRow(
      "Last Purchase Unit Price", g.lastPurUnitPrice, COST4,
      "Current Stock", g.stock, WHOLE,
    );
    infoRow("Last Purchase Unit Cost", g.lastPurUnitCost, COST4);

    // ---- column labels ----
    const head = ws.addRow([
      "Date", "Type", "Document No.", "Account ID",
      "Qty. In", "Qty. Out", "Unit Cost", "Unit Price",
    ]);
    head.eachCell((c, col) => {
      c.font = { bold: true };
      c.fill = HEAD_FILL;
      c.border = thin;
      c.alignment = { horizontal: col >= 5 ? "right" : "left" };
    });

    // ---- transactions ----
    for (const r of g.rows) {
      const row = ws.addRow([
        dmy(r.date, false), r.docType, r.docNo, r.accountId,
        r.qtyIn, r.qtyOut, r.unitCost, r.unitPrice,
      ]);
      row.eachCell({ includeEmpty: true }, (c, col) => {
        c.border = thin;
        if (col >= 5) c.alignment = { horizontal: "right" };
      });
      row.getCell(5).numFmt = WHOLE;
      row.getCell(7).numFmt = MONEY;
      row.getCell(8).numFmt = MONEY;
    }

    // ---- total (VB group footer) ----
    const sum = (pick: (r: (typeof g.rows)[number]) => number | null) =>
      Number(g.rows.reduce((t, r) => t + (pick(r) ?? 0), 0).toFixed(4));

    const total = ws.addRow([
      "Total :", "", "", "", sum((r) => r.qtyIn), sum((r) => r.qtyOut), "", "",
    ]);
    ws.mergeCells(total.number, 1, total.number, 4);
    total.eachCell({ includeEmpty: true }, (c, col) => {
      c.font = { bold: true };
      c.border = thin;
      if (col === 1 || col >= 5) c.alignment = { horizontal: "right" };
    });

    ws.addRow([]); // space before the next item
  }

  return Buffer.from(await wb.xlsx.writeBuffer());
};
