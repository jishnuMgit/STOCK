// services/Sales/Report/rptStockExcel.ts
// The Stock report as an Excel file - the same columns as the printed report.
//   Detailed: by item ("Item : id name"), Date / Type / Document No. / Txn.# / Unit Cost /
//             Qty. In / Qty. Out / Balance, and a Total row for each item.
//   Summary:  Item ID / Item Name / Unit / Opening / Qty. In / Qty. Out / Closing, and a
//             Total row at the end.
import ExcelJS from "exceljs";

import type {
  DetailItem,
  SummaryLine,
  SummaryTotals,
} from "./rptStockService.js";

export type StockReport = {
  txtMode: "D" | "S";
  txtCoName: string;
  txtHeading: string;
  // "Branch : X" for one branch, "" for all branches
  txtBranch: string;
  // "<user>  dd/mm/yyyy hh:mm"
  txtReportInfo: string;
  // the Detailed report
  detail: DetailItem[];
  // the Summary report
  summary: { lines: SummaryLine[]; totals: SummaryTotals };
};

const BORDER_COLOR = { argb: "FFC7D1E4" };
const thin = {
  top: { style: "thin" as const, color: BORDER_COLOR },
  left: { style: "thin" as const, color: BORDER_COLOR },
  bottom: { style: "thin" as const, color: BORDER_COLOR },
  right: { style: "thin" as const, color: BORDER_COLOR },
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// dd-MMM-yy of a yyyy-mm-dd text
const ddmmmyy = (value: string | null): string => {
  if (!value) return "";

  const [year, month, day] = value.slice(0, 10).split("-");
  const monthName = MONTHS[Number(month) - 1];

  return monthName ? `${day}-${monthName}-${year.slice(2)}` : value;
};

// quantities: whole numbers show without decimals, a fraction shows up to 3 decimals
const QTY_FORMAT = "#,##0.###";
const COST_FORMAT = "#,##0.0000";

const font = (size: number, bold = false) => ({ name: "Times New Roman", size, bold });

export const buildStockWorkbook = async (report: StockReport): Promise<Buffer> => {
  const detailed = report.txtMode === "D";

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(detailed ? "Stock Detail" : "Stock Summary", {
    pageSetup: {
      paperSize: 9, // A4
      orientation: detailed ? "portrait" : "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
    },
  });

  const columns = detailed ? 8 : 7;
  const last = String.fromCharCode(64 + columns); // H or G

  ws.columns = detailed
    ? [
        { width: 12 }, // Date
        { width: 8 }, // Type
        { width: 18 }, // Document No.
        { width: 12 }, // Txn.#
        { width: 14 }, // Unit Cost
        { width: 14 }, // Qty. In
        { width: 14 }, // Qty. Out
        { width: 14 }, // Balance
      ]
    : [
        { width: 18 }, // Item ID
        { width: 44 }, // Item Name
        { width: 10 }, // Unit
        { width: 14 }, // Opening
        { width: 14 }, // Qty. In
        { width: 14 }, // Qty. Out
        { width: 14 }, // Closing
      ];

  // ---- company / heading / branch + report info (rows 1-3) ----
  ws.mergeCells(`A1:${last}1`);
  ws.getCell("A1").value = report.txtCoName;
  ws.getCell("A1").font = font(14, true);
  ws.getCell("A1").alignment = { horizontal: "center" };

  ws.mergeCells(`A2:${last}2`);
  ws.getCell("A2").value = report.txtHeading;
  ws.getCell("A2").font = font(12);
  ws.getCell("A2").alignment = { horizontal: "center" };

  const half = Math.floor(columns / 2);
  const split = String.fromCharCode(64 + half);
  const next = String.fromCharCode(65 + half);

  ws.mergeCells(`A3:${split}3`);
  ws.getCell("A3").value = report.txtBranch;
  ws.getCell("A3").alignment = { horizontal: "left" };

  ws.mergeCells(`${next}3:${last}3`);
  ws.getCell(`${next}3`).value = report.txtReportInfo;
  ws.getCell(`${next}3`).font = font(8);
  ws.getCell(`${next}3`).alignment = { horizontal: "right" };

  // ---- column labels (row 4) ----
  const labels = detailed
    ? ["Date", "Type", "Document No.", "Txn.#", "Unit Cost", "Qty. In", "Qty. Out", "Balance"]
    : ["Item ID", "Item Name", "Unit", "Opening", "Qty. In", "Qty. Out", "Closing"];

  const rightFrom = detailed ? 5 : 4; // the number columns

  const head = ws.getRow(4);
  head.values = labels;
  head.eachCell((cell, col) => {
    cell.font = { bold: true };
    cell.border = thin;
    cell.alignment = { horizontal: col >= rightFrom ? "right" : "left" };
  });

  ws.views = [{ state: "frozen", ySplit: 4 }];
  ws.pageSetup.printTitlesRow = "1:4";

  if (detailed) {
    // ---- by item ----
    for (const item of report.detail) {
      const itemRow = ws.addRow([`Item : ${item.lkpItemID}   ${item.txtItemName}`]);
      ws.mergeCells(itemRow.number, 1, itemRow.number, columns);
      itemRow.getCell(1).font = { bold: true };
      itemRow.getCell(1).alignment = { horizontal: "left" };

      for (const line of item.lines) {
        const row = ws.addRow([
          ddmmmyy(line.txtDate),
          line.txtDocType,
          line.txtDocNo,
          line.txtTxnNo,
          line.txtUnitCost === null ? "" : line.txtUnitCost,
          line.txtQtyIn,
          line.txtQtyOut,
          line.txtBalance,
        ]);

        row.eachCell({ includeEmpty: true }, (cell, col) => {
          cell.border = thin;
          cell.alignment = { horizontal: col >= rightFrom ? "right" : "left" };
          if (col === 5) cell.numFmt = COST_FORMAT;
          if (col >= 6) cell.numFmt = QTY_FORMAT;
        });
      }

      // the Total row of the item: Qty. In, Qty. Out and the final balance
      const total = ws.addRow([
        "Total :",
        "",
        "",
        "",
        "",
        item.txtTotalIn,
        item.txtTotalOut,
        item.txtTotalBalance,
      ]);
      ws.mergeCells(total.number, 1, total.number, 5);

      total.eachCell({ includeEmpty: true }, (cell, col) => {
        cell.border = thin;
        cell.font = { bold: true };
        cell.alignment = { horizontal: col === 1 ? "right" : "right" };
        if (col >= 6) cell.numFmt = QTY_FORMAT;
      });
    }
  } else {
    // ---- one row per item ----
    for (const line of report.summary.lines) {
      const row = ws.addRow([
        line.lkpItemID,
        line.txtItemName,
        line.txtUnit,
        line.txtQtyOpening,
        line.txtQtyIn,
        line.txtQtyOut,
        line.txtQtyClosing,
      ]);

      row.eachCell({ includeEmpty: true }, (cell, col) => {
        cell.border = thin;
        cell.alignment = { horizontal: col >= rightFrom ? "right" : "left" };
        if (col >= 4) cell.numFmt = QTY_FORMAT;
      });
    }

    // ---- the Total row of the report ----
    const t = report.summary.totals;
    const total = ws.addRow(["Total :", "", "", t.txtQtyOpening, t.txtQtyIn, t.txtQtyOut, t.txtQtyClosing]);
    ws.mergeCells(total.number, 1, total.number, 3);

    total.eachCell({ includeEmpty: true }, (cell, col) => {
      cell.border = thin;
      cell.font = { bold: true };
      cell.alignment = { horizontal: "right" };
      if (col >= 4) cell.numFmt = QTY_FORMAT;
    });
  }

  return Buffer.from(await wb.xlsx.writeBuffer());
};
