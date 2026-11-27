// BeginningBalancePdf.ts
// The Beginning Balance report as a PDF (returned as a Blob; saveFile.ts saves it):
// A4 portrait, company name, heading, branch, then Account ID / Account Name /
// C.C. ID / Debit / Credit coloured by the account level, a Total row at the end.
// Column labels repeat on every page, page number top right, report info bottom right.
import { jsPDF } from "jspdf";
import autoTable, { type CellDef } from "jspdf-autotable";

import {
  PDF_BLACK,
  STOCK_DOCUMENT_PDF,
  addStockDocumentPageNumbers,
  drawStockInfoLine,
  registerReportPdfFont,
  stockDocumentTable,
  type RGB,
} from "../../common/reportPdf";
import { REPORT_STYLE } from "../../common/reportStyle";

import {
  REPORT_HEADING,
  formatAmount,
  formatDate,
  formatTotal,
  totalsOf,
  type PrintReport,
} from "./RptBeginningBalance";

const BLACK = PDF_BLACK;

// the old Detail_BeforePrint: level 1 red, 2 green, 3 blue, the accounts black
const levelColor = (level: number | null): RGB => {
  switch (Number(level)) {
    case 1:
      return [255, 0, 0];
    case 2:
      return [0, 128, 0];
    case 3:
      return [0, 0, 255];
    default:
      return BLACK;
  }
};

const PAGE_W = 210; // A4 portrait, mm
const MARGIN = { top: 12, right: 10, bottom: 14, left: 12 };
// SPACE_AFTER_HEADING: the room under "Beginning Balance" for the line of "Page x of y" (the info line and the table move down with it)
const SPACE_AFTER_HEADING = 3;
// below company / heading / the info line - the same as the other stock documents (4.5 mm closer than the common gap)
const TABLE_TOP = MARGIN.top + 30 + SPACE_AFTER_HEADING + REPORT_STYLE.pdf.titleGap + REPORT_STYLE.pdf.tableGap - 4.5;

const PAD = REPORT_STYLE.pdf.cellPadding;
const INDENT_PER_SPACE = 1.0; // mm: the leading spaces of the name become padding

export const buildBeginningBalancePdf = async (report: PrintReport): Promise<Blob> => {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const look = await registerReportPdfFont(doc, "inter"); // the font and the sizes of the look
  const usable = PAGE_W - MARGIN.left - MARGIN.right;

  // Account ID | Account Name (the rest) | C.C. ID | Debit | Credit
  const idW = 24;
  const ccW = 20;
  const amountW = 28;
  const columnStyles = {
    0: { cellWidth: idW },
    1: { cellWidth: usable - idW - ccW - amountW * 2 },
    2: { cellWidth: ccW },
    3: { cellWidth: amountW, halign: "right" as const },
    4: { cellWidth: amountW, halign: "right" as const },
  };

  const body: CellDef[][] = report.rows.map((r) => {
    const color = levelColor(r.txtAccountLevel);
    const name = r.txtAccountName ?? "";
    const lead = /^ */.exec(name)?.[0].length ?? 0;

    return [
      { content: r.lkpAccountID, styles: { textColor: color } },
      {
        content: name.trimStart(),
        styles: {
          textColor: color,
          cellPadding: {
            top: PAD,
            bottom: PAD,
            right: STOCK_DOCUMENT_PDF.cellPaddingX,
            left: STOCK_DOCUMENT_PDF.cellPaddingX + lead * INDENT_PER_SPACE,
          },
        },
      },
      { content: String(r.lkpCCID ?? "").trim(), styles: { textColor: color } },
      {
        content: formatAmount(Number(r.txtDebit)),
        styles: { textColor: color, halign: "right" as const },
      },
      {
        content: formatAmount(Number(r.txtCredit)),
        styles: { textColor: color, halign: "right" as const },
      },
    ];
  });

  // the Total row at the end
  const totals = totalsOf(report.rows);
  const totalStyles = { halign: "right" as const, fontStyle: "bold" as const };
  body.push([
    { content: "Total :", colSpan: 3, styles: totalStyles },
    { content: formatTotal(totals.debit), styles: totalStyles },
    { content: formatTotal(totals.credit), styles: totalStyles },
  ]);

  // company / heading / the info line - drawn on every page
  const drawTitle = () => {
    doc.setTextColor(0, 0, 0);
    doc.setFont(look.font, "normal");
    doc.setFontSize(look.size.company);
    doc.text(report.txtCoName, PAGE_W / 2, MARGIN.top + 8, { align: "center" });

    doc.setFontSize(look.size.heading);
    doc.text(REPORT_HEADING, PAGE_W / 2, MARGIN.top + 15 + REPORT_STYLE.pdf.titleGap, { align: "center" });

    // the info line (common/reportPdf.ts): Branch at the left, Date at the right end - 11 px
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
    startY: TABLE_TOP,
    margin: {
      top: TABLE_TOP,
      right: MARGIN.right,
      bottom: MARGIN.bottom,
      left: MARGIN.left,
    },
    tableWidth: usable,
    rowPageBreak: "avoid",
    showHead: "everyPage",
    // the stock document look (common/reportPdf.ts, STOCK_DOCUMENT_PDF): the cell space, the thin light lines drawn once
    ...stockDocumentTable(look, STOCK_DOCUMENT_PDF.cellPaddingX, STOCK_DOCUMENT_PDF.cellPaddingX),
    columnStyles,
    head: [
      [
        { content: "Account ID", styles: { halign: "left" as const } },
        { content: "Account Name", styles: { halign: "left" as const } },
        { content: "C.C. ID", styles: { halign: "left" as const } },
        { content: "Debit", styles: { halign: "right" as const } },
        { content: "Credit", styles: { halign: "right" as const } },
      ],
    ],
    body,
    didDrawPage: drawTitle,
  });

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
