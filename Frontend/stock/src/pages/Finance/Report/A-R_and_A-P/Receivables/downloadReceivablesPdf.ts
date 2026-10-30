// downloadReceivablesPdf.ts
// The Receivables as a PDF (returned as a Blob; saveFile.ts saves it):
// A4 portrait, company name, heading, branch, column labels repeated on every
// page and a "Total :" row at the end. Page number top right, report info bottom right.
// Needs:  npm i jspdf jspdf-autotable
import { jsPDF } from "jspdf";
import autoTable, { type CellDef } from "jspdf-autotable";
import { amount, COL_WIDTHS, type PrintReport } from "./printReceivablesReport";

type RGB = [number, number, number];
const BORDER: RGB = [199, 209, 228]; // #c7d1e4
const HEAD_FILL: RGB = [239, 243, 250]; // #eff3fa

const PAGE_W = 210; // A4 portrait, mm
const MARGIN = { top: 12.7, right: 10, bottom: 14, left: 25.4 };
const TABLE_TOP = 38; // below company / heading / branch

export const buildReceivablesPdf = (report: PrintReport): Blob => {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const usable = PAGE_W - MARGIN.left - MARGIN.right;

  const tot = {
    halign: "right" as const,
    fontStyle: "bold" as const,
    fillColor: HEAD_FILL,
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
    doc.setFont("times", "bold");
    doc.setFontSize(14);
    doc.text(report.coName, PAGE_W / 2, MARGIN.top + 8, { align: "center" });

    doc.setFont("times", "normal");
    doc.setFontSize(12);
    doc.text(report.heading, PAGE_W / 2, MARGIN.top + 15, { align: "center" });

    doc.setFontSize(9);
    doc.text(report.branch, MARGIN.left, MARGIN.top + 22);
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
    styles: {
      font: "times",
      fontSize: 9,
      cellPadding: 1.2,
      lineColor: BORDER,
      lineWidth: 0.2,
      minCellHeight: 6,
      valign: "middle",
      overflow: "ellipsize",
      textColor: [0, 0, 0],
    },
    headStyles: {
      fillColor: HEAD_FILL,
      textColor: [0, 0, 0],
      fontStyle: "normal",
    },
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
  doc.setFont("times", "normal");
  doc.setFontSize(8);
  doc.setTextColor(0, 0, 0);
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    const h = doc.internal.pageSize.getHeight();
    doc.text(`Page ${i} of ${pages}`, PAGE_W - MARGIN.right, MARGIN.top, {
      align: "right",
    });
    doc.text(report.reportInfo, PAGE_W - MARGIN.right, h - MARGIN.bottom + 6, {
      align: "right",
    });
  }

  return doc.output("blob");
};
