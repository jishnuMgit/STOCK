// downloadTrialBalancePdf.ts
// The Trial Balance as a PDF (returned as a Blob; saveFile.ts saves it): A4 landscape, company name, heading,
// branch, two-line column header (repeated on every page), rows coloured by
// account level, "Total :" row at the end, page number top right and the
// report info bottom right of every page.
// Needs:  npm i jspdf jspdf-autotable
import { jsPDF } from "jspdf";
import autoTable, { type CellDef } from "jspdf-autotable";
import { pdfHeadStyles, pdfTableStyles, registerReportPdfFont } from "../../../../../components/common/reportPdf";
import { REPORT_STYLE } from "../../../../../components/common/reportStyle";
import type { PrintReport, TBRow } from "./printTrialBalanceReport";

// VB {0:#,#.00;(#,#.00);0.00}: 1,234.50 / (1,234.50) / 0.00
const amount = (v: number) => {
  if (!v) return "0.00";
  const s = Math.abs(v).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return v < 0 ? `(${s})` : s;
};

type RGB = [number, number, number];

// same colours as the account tree (levels 1-3 are the bold groups)
const LEVEL_COLOR: Record<number, RGB> = {
  1: [0, 166, 62],
  2: [21, 93, 252],
  3: [200, 0, 222],
};
const DETAIL_COLOR: RGB = [49, 65, 88];

// VB column weights (same as the print page)
// Movement is a little narrower than Debit / Credit; Account Name gets the rest
const COL_WIDTHS = [0.09, 0.3694, 0.1101, 0.1101, 0.1101, 0.0951, 0.1152];

const PAGE_W = 297; // A4 landscape, mm
const MARGIN = { top: 12, right: 10, bottom: 12, left: 15 };
const TABLE_TOP = 38 + REPORT_STYLE.pdf.titleGap; // below company / heading / branch

export const buildTrialBalancePdf = async (report: PrintReport): Promise<Blob> => {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const look = await registerReportPdfFont(doc, "inter"); // the font and the sizes of the look
  const usable = PAGE_W - MARGIN.left - MARGIN.right;

  // width of one space, to keep the A/C group indent (autoTable trims spaces)
  doc.setFont(look.font, "normal");
  doc.setFontSize(look.size.pdfBody);
  const spaceW = doc.getTextWidth(" ");
  const PAD = 1.2;

  const bodyRow = (r: TBRow): CellDef[] => {
    const color = LEVEL_COLOR[r.level] ?? DETAIL_COLOR;
    const fontStyle = r.level >= 1 && r.level <= 3 ? "bold" : "normal";
    const base = { textColor: color, fontStyle } as const;

    const indent = r.accountName.length - r.accountName.trimStart().length;

    return [
      { content: r.accountId, styles: base },
      {
        content: r.accountName.trim(),
        styles: {
          ...base,
          cellPadding: {
            top: PAD,
            bottom: PAD,
            right: PAD,
            left: PAD + indent * spaceW,
          },
        },
      },
      { content: amount(r.opening), styles: base },
      { content: amount(r.currentDr), styles: base },
      { content: amount(r.currentCr), styles: base },
      { content: amount(r.movement), styles: base },
      { content: amount(r.closing), styles: base },
    ];
  };

  const t = report.totals;
  const totalStyle = {
    fontStyle: "bold" as const,
    textColor: [0, 0, 0] as RGB,
    halign: "right" as const,
  };
  const totalRow: CellDef[] = [
    { content: "Total :", colSpan: 2, styles: totalStyle },
    { content: amount(t.opening), styles: totalStyle },
    { content: amount(t.currentDr), styles: totalStyle },
    { content: amount(t.currentCr), styles: totalStyle },
    { content: amount(t.movement), styles: totalStyle },
    { content: amount(t.closing), styles: totalStyle },
  ];

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
    styles: { ...pdfTableStyles(look), cellPadding: PAD, minCellHeight: 6, overflow: "hidden" as const },
    headStyles: { ...pdfHeadStyles(look), valign: "bottom" as const },
    columnStyles: {
      0: { cellWidth: COL_WIDTHS[0] * usable },
      1: { cellWidth: COL_WIDTHS[1] * usable },
      2: { cellWidth: COL_WIDTHS[2] * usable, halign: "right" },
      3: { cellWidth: COL_WIDTHS[3] * usable, halign: "right" },
      4: { cellWidth: COL_WIDTHS[4] * usable, halign: "right" },
      5: { cellWidth: COL_WIDTHS[5] * usable, halign: "right" },
      6: { cellWidth: COL_WIDTHS[6] * usable, halign: "right" },
    },
    head: [
      [
        { content: "Account ID", rowSpan: 2, styles: { halign: "left", valign: "middle" } },
        { content: "Account Name", rowSpan: 2, styles: { halign: "left", valign: "middle" } },
        { content: "Opening", rowSpan: 2, styles: { halign: "right" } },
        { content: "Transactions", colSpan: 3, styles: { halign: "center" } },
        { content: "Closing", rowSpan: 2, styles: { halign: "right" } },
      ],
      [
        { content: "Debit", styles: { halign: "right" } },
        { content: "Credit", styles: { halign: "right" } },
        { content: "Movement", styles: { halign: "right" } },
      ],
    ],
    body: [...report.rows.map(bodyRow), totalRow],
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
