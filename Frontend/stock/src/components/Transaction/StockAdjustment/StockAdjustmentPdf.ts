// StockAdjustmentPdf.ts
// The Stock Adjustment report as a PDF (returned as a Blob; saveFile.ts saves it):
// A4 landscape, company name, heading, Branch / Entry No. / Date and the note, then
// Sl.# / Item ID / Item Name / Unit / Qty. In / Qty. Out / Unit Cost / Total Cost, a
// Total row at the end. Column labels repeat on every page, page number top right,
// report info bottom right.
import { jsPDF } from "jspdf";
import autoTable, { type CellDef } from "jspdf-autotable";

import { PDF_BLACK, hexToRgb } from "../../common/reportPdf";
import { REPORT_STYLE } from "../../common/reportStyle";

import {
  REPORT_HEADING,
  formatCost,
  formatDate,
  formatQty,
  totalsOf,
  type PrintReport,
} from "./StockAdjustmentPrintReport";

const BORDER = hexToRgb(REPORT_STYLE.lineColor);
const BLACK = PDF_BLACK;

const PAGE_W = 297; // A4 landscape, mm
const MARGIN = { top: 12, right: 10, bottom: 14, left: 15 };

const PAD = REPORT_STYLE.pdf.cellPadding;

export const buildStockAdjustmentPdf = (report: PrintReport): Blob => {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const usable = PAGE_W - MARGIN.left - MARGIN.right;

  // below company / heading / the Branch line (and the note)
  const tableTop = MARGIN.top + (report.txtNote ? 36 : 30);

  // Sl.# | Item ID | Item Name (the rest) | Unit | Qty. In | Qty. Out | Unit Cost | Total Cost
  const slW = 14;
  const idW = 38;
  const unitW = 20;
  const qtyW = 28;
  const costW = 34;
  const columnStyles = {
    0: { cellWidth: slW },
    1: { cellWidth: idW },
    2: { cellWidth: usable - slW - idW - unitW - qtyW * 2 - costW * 2 },
    3: { cellWidth: unitW },
    4: { cellWidth: qtyW, halign: "right" as const },
    5: { cellWidth: qtyW, halign: "right" as const },
    6: { cellWidth: costW, halign: "right" as const },
    7: { cellWidth: costW, halign: "right" as const },
  };

  const right = { halign: "right" as const };

  const body: CellDef[][] = report.rows.map((r) => [
    { content: String(r.txtSlNo) },
    { content: r.lkpItemID },
    { content: r.lkpItemName ?? "" },
    { content: r.txtUnit ?? "" },
    { content: formatQty(Number(r.txtQtyIn)), styles: right },
    { content: formatQty(Number(r.txtQtyOut)), styles: right },
    { content: formatCost(Number(r.txtUnitCost)), styles: right },
    { content: formatCost(Number(r.txtTotalCost)), styles: right },
  ]);

  // the shaded Total row at the end
  const totals = totalsOf(report.rows);
  const bold = { fontStyle: "bold" as const };
  body.push([
    { content: "Total :", colSpan: 4, styles: bold },
    { content: formatQty(totals.qtyIn), styles: { ...bold, ...right } },
    { content: formatQty(totals.qtyOut), styles: { ...bold, ...right } },
    { content: "", styles: bold },
    { content: formatCost(totals.cost), styles: { ...bold, ...right } },
  ]);

  // company / heading / the info line - drawn on every page
  const drawTitle = () => {
    doc.setTextColor(0, 0, 0);
    doc.setFont(REPORT_STYLE.pdfFont, "normal");
    doc.setFontSize(REPORT_STYLE.size.company);
    doc.text(report.txtCoName, PAGE_W / 2, MARGIN.top + 8, { align: "center" });

    doc.setFontSize(REPORT_STYLE.size.heading);
    doc.text(REPORT_HEADING, PAGE_W / 2, MARGIN.top + 15, { align: "center" });

    doc.setFontSize(REPORT_STYLE.size.pdfBody);
    const y = MARGIN.top + 23;
    doc.text(`Branch : ${report.txtBranchName}`, MARGIN.left, y);
    doc.text(`Entry No. : ${report.txtDocNo}`, PAGE_W / 2, y, { align: "center" });
    doc.text(`Date : ${formatDate(report.dtpDate)}`, PAGE_W - MARGIN.right, y, {
      align: "right",
    });

    if (report.txtNote) {
      doc.text(`Note : ${report.txtNote}`, MARGIN.left, y + 6);
    }
  };

  autoTable(doc, {
    theme: "plain",
    startY: tableTop,
    margin: {
      top: tableTop,
      right: MARGIN.right,
      bottom: MARGIN.bottom,
      left: MARGIN.left,
    },
    tableWidth: usable,
    rowPageBreak: "avoid",
    showHead: "everyPage",
    styles: {
      font: REPORT_STYLE.pdfFont,
      fontSize: REPORT_STYLE.size.pdfBody,
      cellPadding: PAD,
      lineColor: BORDER,
      lineWidth: REPORT_STYLE.pdf.lineWidth,
      minCellHeight: 7,
      valign: "middle",
      overflow: "ellipsize",
      textColor: BLACK,
    },
    headStyles: {
      textColor: BLACK,
      fontStyle: "normal",
    },
    columnStyles,
    head: [
      [
        { content: "Sl.#", styles: { halign: "left" as const } },
        { content: "Item ID", styles: { halign: "left" as const } },
        { content: "Item Name", styles: { halign: "left" as const } },
        { content: "Unit", styles: { halign: "left" as const } },
        { content: "Qty. In", styles: right },
        { content: "Qty. Out", styles: right },
        { content: "Unit Cost", styles: right },
        { content: "Total Cost", styles: right },
      ],
    ],
    body,
    didDrawPage: drawTitle,
  });

  // page numbers need the final page count, so they are added at the end
  const pages = doc.getNumberOfPages();
  doc.setFont(REPORT_STYLE.pdfFont, "normal");
  doc.setFontSize(REPORT_STYLE.size.small);
  doc.setTextColor(0, 0, 0);
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    const h = doc.internal.pageSize.getHeight();
    doc.text(`Page ${i} of ${pages}`, PAGE_W - MARGIN.right, MARGIN.top, {
      align: "right",
    });
    doc.text(report.txtReportInfo, PAGE_W - MARGIN.right, h - MARGIN.bottom + 6, {
      align: "right",
    });
  }

  return doc.output("blob");
};
