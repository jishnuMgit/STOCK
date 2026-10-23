// downloadChartOfAccountPdf.ts
// The Chart Of Account as a PDF (returned as a Blob; saveFile.ts saves it):
// A4 portrait, company name, heading, then Account ID / Account Name / C.C /
// Level coloured by level (1 green, 2 blue, 3 purple, else dark slate). Column labels
// repeat on every page, page number top right, report info bottom right.
// Needs:  npm i jspdf jspdf-autotable
import { jsPDF } from "jspdf";
import autoTable, { type CellDef } from "jspdf-autotable";
import type { PrintReport } from "./PrintChartOfAccountReport";

type RGB = [number, number, number];
const BORDER: RGB = [199, 209, 228]; // #c7d1e4
const HEAD_FILL: RGB = [239, 243, 250]; // #eff3fa
const BLACK: RGB = [0, 0, 0];

// level colours as on the tree: 1 green, 2 blue, 3 purple, else dark slate
const LEVEL_COLOR: Record<number, RGB> = {
  1: [0, 166, 62], // #00a63e
  2: [21, 93, 252], // #155dfc
  3: [200, 0, 222], // #c800de
};
const LEVEL_OTHER: RGB = [49, 65, 88]; // #314158

const PAGE_W = 210; // A4 portrait, mm
const MARGIN = { top: 12, right: 10, bottom: 14, left: 12 };
const TABLE_TOP = 30; // below company / heading

const PAD = 1.2;
const INDENT_PER_SPACE = 1.0; // mm: the leading spaces of the name become padding

export const buildChartOfAccountPdf = (report: PrintReport): Blob => {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const usable = PAGE_W - MARGIN.left - MARGIN.right;

  // Account ID | Account Name (the rest) | C.C | Level
  const idW = 23;
  const ccW = 11;
  const lvW = 15;
  const columnStyles = {
    0: { cellWidth: idW },
    1: { cellWidth: usable - idW - ccW - lvW },
    2: { cellWidth: ccW },
    3: { cellWidth: lvW, halign: "right" as const },
  };

  const body: CellDef[][] = report.rows.map((r) => {
    const color = LEVEL_COLOR[r.accountLevel] ?? LEVEL_OTHER;
    const lead = /^ */.exec(r.accountName)?.[0].length ?? 0;

    return [
      { content: r.accountId, styles: { textColor: color } },
      {
        content: r.accountName.trimStart(),
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
      { content: r.haveCC ? "Yes" : "", styles: { textColor: color } },
      {
        content: String(r.accountLevel),
        styles: { textColor: color, halign: "right" as const },
      },
    ];
  });

  // company / heading - drawn on every page
  const drawTitle = () => {
    doc.setTextColor(0, 0, 0);
    doc.setFont("times", "bold");
    doc.setFontSize(14);
    doc.text(report.coName, PAGE_W / 2, MARGIN.top + 8, { align: "center" });

    doc.setFont("times", "normal");
    doc.setFontSize(12);
    doc.text(report.heading, PAGE_W / 2, MARGIN.top + 15, { align: "center" });
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
      font: "times",
      fontSize: 10,
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
        { content: "Account ID", styles: { halign: "left" as const } },
        { content: "Account Name", styles: { halign: "left" as const } },
        { content: "C.C", styles: { halign: "left" as const } },
        { content: "Level", styles: { halign: "right" as const } },
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