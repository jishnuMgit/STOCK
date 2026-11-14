// downloadReceivablesPdf.ts
// The Receivables as a PDF (returned as a Blob; saveFile.ts saves it):
// A4 portrait, company name, heading, branch, column labels repeated on every
// page and a "Total :" row at the end. Page number top right, report info bottom right.
// Needs:  npm i jspdf jspdf-autotable
import { jsPDF } from "jspdf";
import autoTable, { type CellDef } from "jspdf-autotable";
import { amount, COL_WIDTHS, type PrintReport } from "./printReceivablesReport";

import { pdfHeadStyles, pdfTableStyles, registerReportPdfFont } from "../../../../../components/common/reportPdf";
import { REPORT_STYLE } from "../../../../../components/common/reportStyle";

const PAGE_W = 210; // A4 portrait, mm
const MARGIN = { top: 12.7, right: 10, bottom: 14, left: 25.4 };
const TABLE_TOP = 38 + REPORT_STYLE.pdf.titleGap + REPORT_STYLE.pdf.tableGap; // below company / heading / branch

export const buildReceivablesPdf = async (report: PrintReport): Promise<Blob> => {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const look = await registerReportPdfFont(doc, "inter"); // the font and the sizes of the look
  const usable = PAGE_W - MARGIN.left - MARGIN.right;

  const tot = {
    halign: "right" as const,
    fontStyle: "bold" as const,
  };

  const body: CellDef[][] = report.rows.map((r) => [
    { content: r.accountId },
    { content: r.accountName },
    { content: amount(r.debit), styles: { halign: "right" as const } },
    { content: amount(r.credit), styles: { halign: "right" as const } },
  ]);
  body.push([
    { content: "Total :", colSpan: 2, styles: tot },
    { content: amount(report.totalDebit), styles: tot },
    { content: amount(report.totalCredit), styles: tot },
  ]);

  // company / heading / branch - drawn on every page
  const drawTitle = () => {
    doc.setTextColor(0, 0, 0);
    const gap = REPORT_STYLE.pdf.titleGap; // between the company name and the heading
    doc.setFont(look.font, "normal");
    doc.setFontSize(look.size.company);
    doc.text(report.coName, PAGE_W / 2, MARGIN.top + 8, { align: "center" });

    doc.setFontSize(look.size.heading);
    doc.text(report.heading, PAGE_W / 2, MARGIN.top + 15 + gap, { align: "center" });

    doc.setFontSize(look.size.group);
    doc.text(report.branch, MARGIN.left, MARGIN.top + 22 + gap);
  };

  const columnStyles: Record<number, { cellWidth: number }> = {};
  COL_WIDTHS.forEach((w, i) => {
    columnStyles[i] = { cellWidth: w * usable };
  });

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
    styles: { ...pdfTableStyles(look), overflow: "ellipsize" as const },
    headStyles: pdfHeadStyles(look),
    columnStyles,
    head: [
      [
        { content: "Account ID", styles: { halign: "left" } },
        { content: "Account Name", styles: { halign: "left" } },
        { content: "Debit", styles: { halign: "right" } },
        { content: "Credit", styles: { halign: "right" } },
      ],
    ],
    body,
    didDrawPage: drawTitle,
  });

  // page numbers need the final page count, so they are added at the end
  const pages = doc.getNumberOfPages();
  doc.setFont(look.font, "normal");
  doc.setFontSize(look.size.small);
  doc.setTextColor(0, 0, 0);
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    const h = doc.internal.pageSize.getHeight();
    doc.text(`Page ${i} / ${pages}`, PAGE_W - MARGIN.right, MARGIN.top, {
      align: "right",
    });
    doc.text(`Printed : ${report.reportInfo}`, PAGE_W - MARGIN.right, h - MARGIN.bottom + 6, {
      align: "right",
    });
  }

  return doc.output("blob");
};
