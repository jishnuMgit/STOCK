// downloadSalesPriceListPdf.ts
// The Price List as a PDF (returned as a Blob; saveFile.ts saves it): A4 portrait, company name, heading,
// branch, column labels repeated on every page, items grouped by item group,
// page number top right and the report info bottom right of every page.
// Needs:  npm i jspdf jspdf-autotable
import { jsPDF } from "jspdf";
import autoTable, { type CellDef } from "jspdf-autotable";
import type { PriceListReport } from "./PrintSalesPriceListReport";

const fixed = (v: number | null, digits: number) =>
  v == null
    ? ""
    : v.toLocaleString("en-US", {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      });

type RGB = [number, number, number];
const BORDER: RGB = [176, 196, 222]; // LightSteelBlue
const HEAD_FILL: RGB = [255, 255, 240]; // Ivory

// VB column weights
// Unit Cost and Unit Price share the same width
const COL_WIDTHS = [0.232, 0.4291, 0.0686, 0.13515, 0.13515];

const PAGE_W = 210; // A4 portrait, mm
const MARGIN = { top: 12, right: 10, bottom: 12, left: 15 };
const TABLE_TOP = 38; // below company / heading / branch

export const buildSalesPriceListPdf = (report: PriceListReport): Blob => {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const usable = PAGE_W - MARGIN.left - MARGIN.right;

  const body: CellDef[][] = [];
  for (const g of report.groups) {
    body.push([
      {
        content: `Item Group :  ${g.groupId}  ${g.groupName}`,
        colSpan: 5,
        styles: {
          fontSize: 10,
          halign: "left",
          lineWidth: { top: 0, right: 0, left: 0, bottom: 0.2 },
        },
      },
    ]);
    for (const it of g.items) {
      body.push([
        { content: it.itemId },
        { content: it.itemName },
        { content: it.unit },
        { content: fixed(it.unitCost, 4) },
        { content: fixed(it.unitPrice, 2) },
      ]);
    }
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
    columnStyles: {
      0: { cellWidth: COL_WIDTHS[0] * usable },
      1: { cellWidth: COL_WIDTHS[1] * usable },
      2: { cellWidth: COL_WIDTHS[2] * usable },
      3: { cellWidth: COL_WIDTHS[3] * usable, halign: "right" },
      4: { cellWidth: COL_WIDTHS[4] * usable, halign: "right" },
    },
    head: [
      [
        { content: "Item ID", styles: { halign: "left" } },
        { content: "Item Name", styles: { halign: "left" } },
        { content: "Unit", styles: { halign: "left" } },
        { content: "Unit Cost", styles: { halign: "right" } },
        { content: "Unit Price", styles: { halign: "right" } },
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