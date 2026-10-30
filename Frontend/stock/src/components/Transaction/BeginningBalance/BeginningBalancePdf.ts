// BeginningBalancePdf.ts
// The Beginning Balance report as a PDF (returned as a Blob; saveFile.ts saves it):
// A4 portrait, company name, heading, branch, then Account ID / Account Name /
// C.C. ID / Debit / Credit coloured by the account level, a Total row at the end.
// Column labels repeat on every page, page number top right, report info bottom right.
import { jsPDF } from "jspdf";
import autoTable, { type CellDef } from "jspdf-autotable";

import { PDF_BLACK, hexToRgb, type RGB } from "../../common/reportPdf";
import { REPORT_STYLE } from "../../common/reportStyle";

import {
  REPORT_HEADING,
  formatAmount,
  formatTotal,
  totalsOf,
  type PrintReport,
} from "./BeginningBalancePrintReport";

const BORDER = hexToRgb(REPORT_STYLE.lineColor);
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
const TABLE_TOP = 38; // below company / heading / branch

const PAD = REPORT_STYLE.pdf.cellPadding;
const INDENT_PER_SPACE = 1.0; // mm: the leading spaces of the name become padding

export const buildBeginningBalancePdf = (report: PrintReport): Blob => {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const usable = PAGE_W - MARGIN.left - MARGIN.right;

  // Account ID | Account Name (the rest) | C.C. ID | Debit | Credit
  const idW = 24;
  const ccW = 20;
  const amountW = 32;
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
            right: PAD,
            left: PAD + lead * INDENT_PER_SPACE,
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
  const totalStyles = { halign: "right" as const };
  body.push([
    { content: "Total", colSpan: 3, styles: totalStyles },
    { content: formatTotal(totals.debit), styles: totalStyles },
    { content: formatTotal(totals.credit), styles: totalStyles },
  ]);

  // company / heading / branch - drawn on every page
  const drawTitle = () => {
    doc.setTextColor(0, 0, 0);
    doc.setFont(REPORT_STYLE.pdfFont, "normal");
    doc.setFontSize(REPORT_STYLE.size.company);
    doc.text(report.txtCoName, PAGE_W / 2, MARGIN.top + 8, { align: "center" });

    doc.setFontSize(REPORT_STYLE.size.heading);
    doc.text(REPORT_HEADING, PAGE_W / 2, MARGIN.top + 15, { align: "center" });

    doc.setFontSize(REPORT_STYLE.size.pdfBody);
    doc.text(`Branch : ${report.txtBranchName}`, MARGIN.left, MARGIN.top + 23);
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
