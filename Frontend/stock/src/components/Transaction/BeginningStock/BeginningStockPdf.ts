// BeginningStockPdf.ts
// The Beginning Stock report as a PDF (returned as a Blob; saveFile.ts saves it):
// A4 landscape, company name, heading, Branch / Date, then Sl.# / Item ID / Item Name /
// Unit / Qty. / Unit Cost / Total Cost, a Total row at the end. Column labels repeat on
// every page, page number top right, report info bottom right.
import { jsPDF } from "jspdf";
import autoTable, { type CellDef } from "jspdf-autotable";

import {
  STOCK_DOCUMENT_PDF,
  addStockDocumentPageNumbers,
  drawNoteAfterTotal,
  drawStockInfoLine,
  registerReportPdfFont,
  stockDocumentTable,
} from "../../common/reportPdf";
import { REPORT_STYLE } from "../../common/reportStyle";

import {
  REPORT_HEADING,
  formatCost,
  formatDate,
  formatQty,
  totalsOf,
  type PrintReport,
} from "./RptBeginningStock";

const PAGE_W = 297; // A4 landscape, mm
const MARGIN = { top: 12, right: 10, bottom: 14, left: 15 };

export const buildBeginningStockPdf = async (report: PrintReport): Promise<Blob> => {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const look = await registerReportPdfFont(doc, "inter"); // the font and the sizes of the look
  const usable = PAGE_W - MARGIN.left - MARGIN.right;

  // below company / heading / the info line (the note is after the Total row, not here)
  // SPACE_AFTER_HEADING: the room under "Beginning Stock" for the line of "Page x of y" (the info line and the table move down with it)
  const SPACE_AFTER_HEADING = 3;
  const tableTop = MARGIN.top + 30 + SPACE_AFTER_HEADING + REPORT_STYLE.pdf.titleGap + REPORT_STYLE.pdf.tableGap - 4.5; // 4.5 mm: the info line is 25 px high, as in the preview

  // Line | Item ID | Item Name (the rest) | Unit | Qty. | Unit Cost | Total Cost - the same widths as Stock Transfer
  const slW = 10; // the Line column holds 4 digits (8888) with 0.8 mm of space on each side
  const idW = 38;
  const unitW = 16;
  const qtyW = 24;
  const unitCostW = 28;
  const costW = 34;
  const columnStyles = {
    0: { cellWidth: slW },
    1: { cellWidth: idW },
    2: { cellWidth: usable - slW - idW - unitW - qtyW - unitCostW - costW },
    3: { cellWidth: unitW },
    4: { cellWidth: qtyW, halign: "right" as const },
    5: { cellWidth: unitCostW, halign: "right" as const },
    6: { cellWidth: costW, halign: "right" as const },
  };

  const body: CellDef[][] = report.rows.map((r) => [
    { content: String(r.txtSlNo), styles: { halign: "center" as const } },
    { content: r.lkpItemID },
    { content: r.lkpItemName ?? "" },
    { content: r.txtUnit ?? "" },
    { content: formatQty(Number(r.txtQty)), styles: { halign: "right" as const } },
    { content: formatCost(Number(r.txtUnitCost)), styles: { halign: "right" as const } },
    { content: formatCost(Number(r.txtTotalCost)), styles: { halign: "right" as const } },
  ]);

  // the shaded Total row at the end
  const totals = totalsOf(report.rows);
  const bold = { fontStyle: "bold" as const };
  body.push([
    { content: "Total :", colSpan: 4, styles: { ...bold, halign: "right" as const } },
    { content: formatQty(totals.qty), styles: { ...bold, halign: "right" as const } },
    { content: "", styles: bold },
    { content: formatCost(totals.cost), styles: { ...bold, halign: "right" as const } },
  ]);

  // company / heading / the info line - drawn on every page
  const drawTitle = () => {
    doc.setTextColor(0, 0, 0);
    doc.setFont(look.font, "normal");
    doc.setFontSize(look.size.company);
    doc.text(report.txtCoName, PAGE_W / 2, MARGIN.top + 8, { align: "center" });

    doc.setFontSize(look.size.heading);
    doc.text(REPORT_HEADING, PAGE_W / 2, MARGIN.top + 15 + REPORT_STYLE.pdf.titleGap, { align: "center" });

    // the info line (common/reportPdf.ts): Branch at the left, Date at the right end - 11 px (a Beginning Stock has no Entry No.)
    drawStockInfoLine(doc, {
      y: MARGIN.top + 23 + SPACE_AFTER_HEADING + REPORT_STYLE.pdf.titleGap,
      left: MARGIN.left,
      right: PAGE_W - MARGIN.right,
      dateRight: PAGE_W - MARGIN.right - STOCK_DOCUMENT_PDF.shiftLeft,
      branch: report.txtBranchName,
      date: formatDate(report.dtpDate),
    });
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
    // the stock document look (common/reportPdf.ts, STOCK_DOCUMENT_PDF): the cell space, the thin light lines drawn once
    ...stockDocumentTable(look),
    columnStyles,
    head: [
      [
        { content: "Line", styles: { halign: "center" as const } },
        { content: "Item ID", styles: { halign: "left" as const } },
        { content: "Item Name", styles: { halign: "left" as const } },
        { content: "Unit", styles: { halign: "left" as const } },
        { content: "Qty.", styles: { halign: "right" as const } },
        { content: "Unit Cost", styles: { halign: "right" as const } },
        { content: "Total Cost", styles: { halign: "right" as const } },
      ],
    ],
    body,
    didDrawPage: drawTitle,
  });

  // the "Note :" line after the Total row (common/reportPdf.ts) - printed even when the note is empty
  drawNoteAfterTotal(doc, look, report.txtNote, { x: MARGIN.left, width: usable, bottom: MARGIN.bottom, tableTop, drawTitle });

  // "Page x of y" (on a line of its own under the heading) and the "Created By" line at the bottom right of every page (common/reportPdf.ts)
  addStockDocumentPageNumbers(doc, look, {
    right: PAGE_W - MARGIN.right,
    pageRight: PAGE_W - MARGIN.right - STOCK_DOCUMENT_PDF.shiftLeft,
    pageY: MARGIN.top + 20 + REPORT_STYLE.pdf.titleGap,
    bottomY: MARGIN.bottom - 6,
    footer: `${report.txtSavedBy ? "Created By" : "Printed"} : ${report.txtSavedBy || report.txtReportInfo}`,
  });

  return doc.output("blob");
};
