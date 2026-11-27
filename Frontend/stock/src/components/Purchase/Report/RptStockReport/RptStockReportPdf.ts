// RptStockReportPdf.ts
// The Stock report as a PDF (returned as a Blob; saveFile.ts saves it).
//   Detailed - A4 portrait, by item with a running balance and a Total row per item.
//   Summary  - A4 landscape, one row per item and a Total row at the end.
// Column labels repeat on every page; "Page x of y" on a line of its own under the heading; the company, the heading
// and the branch at the top of every page; "Printed : ..." at the bottom right (the stock look, common/reportPdf.ts).
import { jsPDF } from "jspdf";
import autoTable, { type CellDef } from "jspdf-autotable";

import {
  STOCK_DOCUMENT_PDF,
  addStockDocumentPageNumbers,
  drawStockReportTitle,
  pdfGroupStyles,
  pdfMargin,
  registerReportPdfFont,
  stockDocumentTable,
  stockReportTableTop,
} from "../../../common/reportPdf";
import { REPORT_STYLE } from "../../../common/reportStyle";

import {
  formatCost,
  formatDate,
  formatQty,
  type PrintReport,
} from "./RptStockReportRpt";

export const buildStockReportPdf = async (report: PrintReport): Promise<Blob> => {
  const detailed = report.txtMode === "D";
  const sections = (detailed ? report.detail.length : report.summary.branches.length) > 1;

  const doc = new jsPDF({
    orientation: detailed ? "portrait" : "landscape",
    unit: "mm",
    format: "a4",
  });
  const look = await registerReportPdfFont(doc, "inter"); // the font and the sizes of the look

  const pageW = detailed ? 210 : 297;
  const margin = pdfMargin(detailed ? 22.9 : 25.4);
  const usable = pageW - margin.left - margin.right;
  const tableTop = stockReportTableTop(margin);

  const right = { halign: "right" as const };
  const bold = { fontStyle: "bold" as const };

  // the sides of a cell that is drawn with its own lines (the first row under a branch or an item line): the top, the right
  // and the bottom - and the left on the first column. A cell takes its sides from stockDocumentTable() unless it names them.
  const sides = (firstColumn: boolean) => {
    const w = STOCK_DOCUMENT_PDF.lineWidth;
    return { lineWidth: { top: w, right: w, bottom: w, left: firstColumn ? w : 0 } };
  };

  // the heading rows (Branch, Item): 11 px, as the rows and the totals
  const groupStyles = { ...pdfGroupStyles(look), fontSize: look.size.pdfBody, lineWidth: 0, minCellHeight: 9, valign: "bottom" as const };

  // "Branch : Jeddah" (one row over the whole width)
  const branchRow = (name: string, colSpan: number): CellDef[] => [
    {
      content: `Branch : ${name}`,
      colSpan,
      styles: groupStyles,
    },
  ];

  let head: CellDef[][];
  const body: CellDef[][] = [];
  let columnStyles: Record<number, { cellWidth: number; halign?: "right" }>;

  if (detailed) {
    // Date | Type | Document No. | Txn.# | Unit Cost | Qty. In | Qty. Out | Balance (the old weights)
    const weights = [0.136, 0.072, 0.175, 0.107, 0.121, 0.13, 0.13, 0.129]; // the Document No. label (14 px) needs room

    columnStyles = Object.fromEntries(
      weights.map((w, i) => [i, { cellWidth: w * usable, ...(i >= 4 ? right : {}) }])
    );

    head = [
      ["Date", "Type", "Document No.", "Txn.#", "Unit Cost", "Qty. In", "Qty. Out", "Balance"].map(
        (content, i) => ({
          content,
          styles: { halign: i >= 4 ? ("right" as const) : ("left" as const) },
        })
      ),
    ];

    for (const { branch, item } of report.detail.flatMap((b) =>
      b.items.map((item) => ({ branch: b, item }))
    )) {
      // "Branch : Jeddah" before the first item of each branch
      if (sections && item === branch.items[0]) body.push(branchRow(branch.txtBranchName, 8));

      body.push([
        {
          content: `Item : ${item.lkpItemID}   ${item.txtItemName}`,
          colSpan: 8,
          styles: groupStyles,
        },
      ]);

      item.lines.forEach((l, index) => {
        // the first line under the item has the line above it (the item row has no lines)
        const top = (first: boolean) => (index === 0 ? sides(first) : {});
        body.push([
          { content: formatDate(l.txtDate), styles: top(true) },
          { content: l.txtDocType, styles: top(false) },
          { content: l.txtDocNo, styles: top(false) },
          { content: l.txtTxnNo, styles: top(false) },
          { content: formatCost(l.txtUnitCost), styles: { ...right, ...top(false) } },
          { content: formatQty(l.txtQtyIn), styles: { ...right, ...top(false) } },
          { content: formatQty(l.txtQtyOut), styles: { ...right, ...top(false) } },
          { content: formatQty(l.txtBalance), styles: { ...right, ...top(false) } },
        ]);
      });

      body.push([
        { content: "Total :", colSpan: 5, styles: { ...bold, ...right } },
        { content: formatQty(item.txtTotalIn), styles: { ...bold, ...right } },
        { content: formatQty(item.txtTotalOut), styles: { ...bold, ...right } },
        { content: formatQty(item.txtTotalBalance), styles: { ...bold, ...right } },
      ]);
    }
  } else {
    // Item ID | Item Name | Unit | Opening | Qty. In | Qty. Out | Closing (the old weights)
    const weights = [0.174, 0.394, 0.048, 0.105, 0.093, 0.093, 0.093]; // (they add up to exactly 1)

    columnStyles = Object.fromEntries(
      weights.map((w, i) => [i, { cellWidth: w * usable, ...(i >= 3 ? right : {}) }])
    );

    head = [
      ["Item ID", "Item Name", "Unit", "Opening", "Qty. In", "Qty. Out", "Closing"].map(
        (content, i) => ({
          content,
          styles: { halign: i >= 3 ? ("right" as const) : ("left" as const) },
        })
      ),
    ];

    // a Total row: the label over the first 3 columns, then the 4 quantities
    const totalRow = (
      label: string,
      t: { txtQtyOpening: number; txtQtyIn: number; txtQtyOut: number; txtQtyClosing: number }
    ): CellDef[] => [
      { content: label, colSpan: 3, styles: { ...bold, ...right } },
      { content: formatQty(t.txtQtyOpening), styles: { ...bold, ...right } },
      { content: formatQty(t.txtQtyIn), styles: { ...bold, ...right } },
      { content: formatQty(t.txtQtyOut), styles: { ...bold, ...right } },
      { content: formatQty(t.txtQtyClosing), styles: { ...bold, ...right } },
    ];

    for (const branch of report.summary.branches) {
      if (sections) body.push(branchRow(branch.txtBranchName, 7));

      branch.lines.forEach((l, index) => {
        // under a branch line the first row has the line above it (the branch row has no lines)
        const top = (first: boolean) => (sections && index === 0 ? sides(first) : {});
        body.push([
          { content: l.lkpItemID, styles: top(true) },
          { content: l.txtItemName, styles: top(false) },
          { content: l.txtUnit, styles: top(false) },
          { content: formatQty(l.txtQtyOpening), styles: { ...right, ...top(false) } },
          { content: formatQty(l.txtQtyIn), styles: { ...right, ...top(false) } },
          { content: formatQty(l.txtQtyOut), styles: { ...right, ...top(false) } },
          { content: formatQty(l.txtQtyClosing), styles: { ...right, ...top(false) } },
        ]);
      });

      // the Total of the branch
      if (sections) body.push(totalRow("Total :", branch.totals));
    }

    body.push(totalRow(sections ? "Grand Total :" : "Total :", report.summary.totals));
  }

  // company / heading / branch + report info - drawn on every page
  const drawTitle = () => drawStockReportTitle(doc, pageW, margin, report, report.txtBranch, look);

  autoTable(doc, {
    theme: "plain",
    startY: tableTop,
    margin: {
      top: tableTop,
      right: margin.right,
      bottom: margin.bottom,
      left: margin.left,
    },
    tableWidth: usable,
    rowPageBreak: "avoid",
    showHead: "everyPage",
    // the stock look (common/reportPdf.ts, STOCK_DOCUMENT_PDF): the cell space, the thin light lines drawn once
    ...stockDocumentTable(look, STOCK_DOCUMENT_PDF.cellPaddingX, STOCK_DOCUMENT_PDF.cellPaddingX),
    columnStyles,
    head,
    body,
    didDrawPage: drawTitle,
  });

  // "Page x of y" on a line of its own under the heading, and "Printed : ..." at the bottom right of every page
  addStockDocumentPageNumbers(doc, look, {
    right: pageW - margin.right,
    pageRight: pageW - margin.right - STOCK_DOCUMENT_PDF.shiftLeft,
    pageY: margin.top + 20 + REPORT_STYLE.pdf.titleGap,
    bottomY: margin.bottom - 6,
    footer: `Printed : ${report.txtReportInfo}`,
  });

  return doc.output("blob");
};
