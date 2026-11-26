// StockTransferPdf.ts
// The Stock Transfer report as a PDF (returned as a Blob; saveFile.ts saves it):
// A4 landscape, company name, heading, Branch / Transfer To / Entry No. / Date and the
// note, then Line / Item ID / Item Name / Unit / Qty. / Unit Cost / Total Cost, a Total
// row at the end. Column labels repeat on every page, page number top right, report
// info bottom right.
import { jsPDF } from "jspdf";
import autoTable, { type CellDef } from "jspdf-autotable";

import { pdfHeadStyles, pdfTableStyles, registerReportPdfFont } from "../../common/reportPdf";
import { REPORT_STYLE } from "../../common/reportStyle";

import {
  REPORT_HEADING,
  formatCost,
  formatDate,
  formatQty,
  totalsOf,
  type PrintReport,
} from "./RptStockTransferPrint";

const PAGE_W = 297; // A4 landscape, mm
const MARGIN = { top: 12, right: 10, bottom: 14, left: 15 };

export const buildStockTransferPdf = async (report: PrintReport): Promise<Blob> => {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const look = await registerReportPdfFont(doc, "inter"); // the font and the sizes of the look
  const usable = PAGE_W - MARGIN.left - MARGIN.right;

  // the table lines of this PDF: width (mm) and colour (#e2e8f2) - one place
  const LINE_WIDTH = 0.1;
  const LINE_COLOR: [number, number, number] = [226, 232, 242];

  // below company / heading / the Branch line (the note is after the Total row, not here)
  // SPACE_AFTER_HEADING: the room under "Stock Transfer" for the line of "Page x of y" (the Branch line and the table move down with it)
  const SPACE_AFTER_HEADING = 3;
  const tableTop = MARGIN.top + 30 + SPACE_AFTER_HEADING + REPORT_STYLE.pdf.titleGap + REPORT_STYLE.pdf.tableGap - 4.5; // 4.5 mm: the info line is 30 px high (the common one is 32 px), as in the preview

  // Line | Item ID | Item Name (the rest) | Unit | Qty. | Unit Cost | Total Cost
  const slW = 12; // the Line column holds 4 digits (1000)
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

    // the line under the heading is 11 px (8.25 pt), except the Entry No. itself (JD-2600001): 14 px (10.5 pt)
    const SMALL = look.size.pdfBody;
    const BIG = 10.5;
    doc.setFontSize(SMALL);
    const y = MARGIN.top + 23 + SPACE_AFTER_HEADING + REPORT_STYLE.pdf.titleGap;
    // Branch, Entry No., Date, Transfer To (right most). A branch name can be up to 40 characters (30 are common), so the four are placed
    // by their real widths with a 10 mm space between them; when the line is too long, the two branch names are cut short with "..."
    const GAP = 10;
    const entryLabel = "Entry No. : ";
    const dateText = `Date : ${formatDate(report.dtpDate)}`;
    let branchText = `Branch : ${report.txtBranchName}`;
    let toText = `Transfer To : ${report.txtToBranchName}`;
    const width = (text: string, size: number = SMALL) => {
      doc.setFontSize(size);
      return doc.getTextWidth(text);
    };
    const entryWidth = width(entryLabel) + width(report.txtDocNo, BIG);
    doc.setFontSize(SMALL);
    const room = usable - entryWidth - width(dateText) - GAP * 3; // what is left for the two branch names
    const cut = (text: string, max: number) => {
      let out = text;
      while (out.length > 1 && width(`${out}...`) > max) out = out.slice(0, -1);
      return `${out}...`;
    };
    if (width(branchText) + width(toText) > room) {
      const each = room / 2;
      if (width(branchText) > each) branchText = cut(branchText, each);
      if (width(toText) > each) toText = cut(toText, each);
    }
    doc.setFontSize(SMALL);
    doc.text(branchText, MARGIN.left, y);
    const entryX = MARGIN.left + width(branchText) + GAP;
    doc.setFontSize(SMALL);
    doc.text(entryLabel, entryX, y);
    doc.setFontSize(BIG);
    doc.text(report.txtDocNo, entryX + width(entryLabel, SMALL), y);
    doc.setFontSize(SMALL);
    doc.text(dateText, entryX + entryWidth + GAP, y);
    // Transfer To is the right most of the line ("Page x of y" has a line of its own above)
    doc.text(toText, PAGE_W - MARGIN.right, y, { align: "right" });
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
    // the table lines of this PDF only: thin and light (#e2e8f2), the same on every line. Every line is drawn ONCE: a cell draws only its
    // right and bottom side (see didParseCell) - when each cell drew all four sides, a line shared by two cells was drawn twice and showed
    // darker than the outer lines
    styles: { ...pdfTableStyles(look), overflow: "ellipsize" as const, lineWidth: LINE_WIDTH, lineColor: LINE_COLOR },
    // the column headings are the size of the rows (8.25 pt = 11 px)
    headStyles: { ...pdfHeadStyles(look), fontSize: look.size.pdfBody, lineWidth: LINE_WIDTH, lineColor: LINE_COLOR },
    didParseCell: (hook) => {
      const first = hook.column.index === 0;
      const topRow = hook.section === "head" && hook.row.index === 0;
      hook.cell.styles.lineWidth = { top: topRow ? LINE_WIDTH : 0, right: LINE_WIDTH, bottom: LINE_WIDTH, left: first ? LINE_WIDTH : 0 };
    },
    columnStyles,
    head: [
      [
        { content: "Line", styles: { halign: "left" as const } },
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

  // the "Note :" label after the Total row - printed even when the note is empty (on a new page when it does not fit under the table)
  {
    const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
    const noteLines = doc.splitTextToSize(`Note : ${report.txtNote ?? ""}`.trimEnd() || "Note :", usable) as string[];
    const noteHeight = noteLines.length * 5;
    let noteY = finalY + 7;

    if (noteY + noteHeight > doc.internal.pageSize.getHeight() - MARGIN.bottom) {
      doc.addPage();
      drawTitle();
      noteY = tableTop;
    }

    doc.setFont(look.font, "normal");
    doc.setFontSize(look.size.pdfBody);
    doc.setTextColor(0, 0, 0);
    // at the left side, under the Total row
    doc.text(noteLines, MARGIN.left, noteY);
  }

  // page numbers need the final page count, so they are added at the end
  const pages = doc.getNumberOfPages();
  doc.setFont(look.font, "normal");
  doc.setFontSize(look.size.pdfBody); // "Page x of y" and "Printed : ..." are 11 px (8.25 pt)
  doc.setTextColor(0, 0, 0);
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    const h = doc.internal.pageSize.getHeight();
    // "Page x of y" is on a line of its own, between "Stock Transfer" and the Branch line
    doc.text(`Page ${i} of ${pages}`, PAGE_W - MARGIN.right, MARGIN.top + 20 + REPORT_STYLE.pdf.titleGap, {
      align: "right",
    });
    doc.text(`${report.txtSavedBy ? "Saved By" : "Printed"} : ${report.txtSavedBy || report.txtReportInfo}`, PAGE_W - MARGIN.right, h - MARGIN.bottom + 6, {
      align: "right",
    });
  }

  return doc.output("blob");
};
