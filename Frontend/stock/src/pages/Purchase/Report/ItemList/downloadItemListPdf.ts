// downloadItemListPdf.ts
// The Item List as a PDF (returned as a Blob; saveFile.ts saves it).
// Same three layouts as the printed page: "branch" (A4 landscape, grouped by
// item group), "status" and "allBranch" (A4 portrait). Column labels repeat on
// every page, page number top right, report info bottom right.
// Needs:  npm i jspdf jspdf-autotable
import { jsPDF } from "jspdf";
import autoTable, { type CellDef } from "jspdf-autotable";
import { COLS, type PrintReport } from "./printItemListReport";

type RGB = [number, number, number];
const BORDER: RGB = [199, 209, 228]; // #c7d1e4
const HEAD_FILL: RGB = [239, 243, 250]; // #eff3fa

const TABLE_TOP = 38; // below company / heading / branch

export const buildItemListPdf = (report: PrintReport): Blob => {
  const landscape = report.variant === "branch";
  const PAGE_W = landscape ? 297 : 210; // A4, mm

  // same page margins as the printed page (VB: 100,0,50,50 / 80,0,50,50)
  const MARGIN = landscape
    ? { top: 12.7, right: 10, bottom: 14, left: 25.4 }
    : { top: 12.7, right: 10, bottom: 14, left: 20.3 };

  const cols = COLS[report.variant];
  const total = cols.reduce((t, c) => t + c.width, 0);
  const usable = PAGE_W - MARGIN.left - MARGIN.right;

  const doc = new jsPDF({
    orientation: landscape ? "landscape" : "portrait",
    unit: "mm",
    format: "a4",
  });

  // ---- body (a band per item group in the "branch" layout) ----
  const body: CellDef[][] = [];
  let currentGroup: string | null = null;

  for (const r of report.rows) {
    if (landscape && r.itemGroupId !== currentGroup) {
      currentGroup = r.itemGroupId;
      body.push([
        {
          content: `Item Group :  ${r.itemGroupId}   ${r.itemGroupName}`,
          colSpan: cols.length,
          styles: {
            fontSize: 10,
            fontStyle: "bold",
            halign: "left",
            lineWidth: { top: 0, right: 0, left: 0, bottom: 0.2 },
          },
        },
      ]);
    }
    body.push(cols.map((c) => ({ content: c.get(r) })));
  }

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

  const columnStyles: Record<number, { cellWidth: number; halign?: "right" }> = {};
  cols.forEach((c, i) => {
    columnStyles[i] = {
      cellWidth: (c.width / total) * usable,
      ...(c.right ? { halign: "right" as const } : {}),
    };
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
      cols.map((c) => ({
        content: c.label,
        styles: { halign: c.right ? ("right" as const) : ("left" as const) },
      })),
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
