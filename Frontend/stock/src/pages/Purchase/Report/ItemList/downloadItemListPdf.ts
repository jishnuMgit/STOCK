// downloadItemListPdf.ts
// The Item List as a PDF (returned as a Blob; saveFile.ts saves it).
// Same three layouts as the printed page: "branch" (A4 portrait, grouped by
// item group), "status" and "allBranch" (A4 portrait). Column labels repeat on
// every page, page number top right, report info bottom right.
// Needs:  npm i jspdf jspdf-autotable
import { jsPDF } from "jspdf";
import autoTable, { type CellDef } from "jspdf-autotable";
import { pdfGroupStyles, pdfLabelFontSize, registerReportPdfFont } from "../../../../components/common/reportPdf";
import { COLS, type PrintReport } from "./printItemListReport";

type RGB = [number, number, number];
const BORDER: RGB = [199, 209, 228]; // #c7d1e4

const TABLE_TOP = 38; // below company / heading / branch

export const buildItemListPdf = async (report: PrintReport): Promise<Blob> => {
  // A4 portrait for every layout, with the margins of the Item History
  const grouped = report.variant === "branch";
  const PAGE_W = 210; // A4 portrait, mm
  const MARGIN = { top: 12, right: 10, bottom: 14, left: 12 };

  const cols = COLS[report.variant];
  const total = cols.reduce((t, c) => t + c.width, 0);
  const usable = PAGE_W - MARGIN.left - MARGIN.right;

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });
  const look = await registerReportPdfFont(doc, "inter"); // the font and the sizes of the look

  // ---- body (a band per item group in the "branch" layout) ----
  const body: CellDef[][] = [];
  let currentGroup: string | null = null;

  for (const r of report.rows) {
    if (grouped && r.itemGroupId !== currentGroup) {
      currentGroup = r.itemGroupId;
      body.push([
        {
          content: `Item Group :  ${r.itemGroupId}   ${r.itemGroupName}`,
          colSpan: cols.length,
          // space above the group line, no rule under it: as in the other reports
          styles: { ...pdfGroupStyles(look), halign: "left", lineWidth: 0, minCellHeight: 9, valign: "bottom" },
        },
      ]);
    }
    body.push(cols.map((c) => ({ content: c.get(r) })));
  }

  // company / heading / branch - drawn on every page
  const drawTitle = () => {
    doc.setTextColor(0, 0, 0);
    doc.setFont(look.font, "normal");
    doc.setFontSize(look.size.company);
    doc.text(report.coName, PAGE_W / 2, MARGIN.top + 8, { align: "center" });

    doc.setFontSize(look.size.heading);
    doc.text(report.heading, PAGE_W / 2, MARGIN.top + 15, { align: "center" });

    doc.setFontSize(look.size.pdfBody);
    doc.text(report.branch, MARGIN.left, MARGIN.top + 22);

    // the user and the time, on the right of the branch line
    doc.setFontSize(look.size.small);
    doc.text(report.reportInfo, PAGE_W - MARGIN.right, MARGIN.top + 22, { align: "right" });
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
      font: look.font,
      fontSize: look.size.pdfBody,
      cellPadding: 1.2,
      lineColor: BORDER,
      lineWidth: 0.2,
      minCellHeight: 6,
      valign: "middle",
      overflow: "linebreak",
      textColor: [0, 0, 0],
    },
    headStyles: {
      textColor: [0, 0, 0],
      fontStyle: "normal",
      fontSize: pdfLabelFontSize(look),
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
  doc.setFont(look.font, "normal");
  doc.setFontSize(look.size.small);
  doc.setTextColor(0, 0, 0);
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.text(`Page ${i} of ${pages}`, PAGE_W - MARGIN.right, MARGIN.top, {
      align: "right",
    });
  }

  return doc.output("blob");
};
