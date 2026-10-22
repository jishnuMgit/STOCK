// StockTransferPdf.ts
// The Stock Transfer report as a PDF (returned as a Blob; saveFile.ts saves it):
// A4 landscape, company name, heading, Branch / Transfer To / Entry No. / Date and the
// note, then Sl.# / Item ID / Item Name / Unit / Qty. / Unit Cost / Total Cost, a Total
// row at the end. Column labels repeat on every page, page number top right, report
// info bottom right.
import { jsPDF } from "jspdf";
import autoTable, { type CellDef } from "jspdf-autotable";

import {
  REPORT_HEADING,
  formatCost,
  formatDate,
  formatQty,
  totalsOf,
  type PrintReport,
} from "./StockTransferPrintReport";

type RGB = [number, number, number];
const BORDER: RGB = [199, 209, 228]; // #c7d1e4
const HEAD_FILL: RGB = [239, 243, 250]; // #eff3fa
const BLACK: RGB = [0, 0, 0];

const PAGE_W = 297; // A4 landscape, mm
const MARGIN = { top: 12, right: 10, bottom: 14, left: 15 };

const PAD = 1.2;

export const buildStockTransferPdf = (report: PrintReport): Blob => {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const usable = PAGE_W - MARGIN.left - MARGIN.right;

  // below company / heading / the Branch line (and the note)
  const tableTop = MARGIN.top + (report.txtNote ? 36 : 30);

  // Sl.# | Item ID | Item Name (the rest) | Unit | Qty. | Unit Cost | Total Cost
  const slW = 14;
  const idW = 38;
  const unitW = 22;
  const qtyW = 30;
  const costW = 34;
  const columnStyles = {
    0: { cellWidth: slW },
    1: { cellWidth: idW },
    2: { cellWidth: usable - slW - idW - unitW - qtyW - costW * 2 },
    3: { cellWidth: unitW },
    4: { cellWidth: qtyW, halign: "right" as const },
    5: { cellWidth: costW, halign: "right" as const },
    6: { cellWidth: costW, halign: "right" as const },
  };

  const body: CellDef[][] = report.rows.map((r) => [
    { content: String(r.txtSlNo) },
    { content: r.lkpItemID },
    { content: r.lkpItemName ?? "" },
    { content: r.txtUnit ?? "" },
    { content: formatQty(Number(r.txtQty)), styles: { halign: "right" as const } },
    { content: formatCost(Number(r.txtUnitCost)), styles: { halign: "right" as const } },
    { content: formatCost(Number(r.txtTotalCost)), styles: { halign: "right" as const } },
  ]);

  // the shaded Total row at the end
  const totals = totalsOf(report.rows);
  const bold = { fillColor: HEAD_FILL, fontStyle: "bold" as const };
  body.push([
    { content: "Total :", colSpan: 4, styles: bold },
    { content: formatQty(totals.qty), styles: { ...bold, halign: "right" as const } },
    { content: "", styles: bold },
    { content: formatCost(totals.cost), styles: { ...bold, halign: "right" as const } },
  ]);

  // company / heading / the info line - drawn on every page
  const drawTitle = () => {
    doc.setTextColor(0, 0, 0);
    doc.setFont("times", "normal");
    doc.setFontSize(14);
    doc.text(report.txtCoName, PAGE_W / 2, MARGIN.top + 8, { align: "center" });

    doc.setFontSize(12);
    doc.text(REPORT_HEADING, PAGE_W / 2, MARGIN.top + 15, { align: "center" });

    doc.setFontSize(9);
    const y = MARGIN.top + 23;
    doc.text(`Branch : ${report.txtBranchName}`, MARGIN.left, y);
    doc.text(`Transfer To : ${report.txtToBranchName}`, MARGIN.left + usable * 0.3, y);
    doc.text(`Entry No. : ${report.txtDocNo}`, MARGIN.left + usable * 0.6, y);
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
      font: "times",
      fontSize: 9,
      cellPadding: PAD,
      lineColor: BORDER,
      lineWidth: 0.2,
      minCellHeight: 7,
      valign: "middle",
      overflow: "ellipsize",
      textColor: BLACK,
    },
    headStyles: {
      fillColor: HEAD_FILL,
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
        { content: "Qty.", styles: { halign: "right" as const } },
        { content: "Unit Cost", styles: { halign: "right" as const } },
        { content: "Total Cost", styles: { halign: "right" as const } },
      ],
    ],
    body,
    didDrawPage: drawTitle,
  });

  // page numbers need the final page count, so they are added at the end
  const pages = doc.getNumberOfPages();
  doc.setFont("times", "normal");
  doc.setFontSize(8);
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
