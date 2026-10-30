// RptStockReportPdf.ts
// The Stock report as a PDF (returned as a Blob; saveFile.ts saves it).
//   Detailed - A4 portrait, by item with a running balance and a Total row per item.
//   Summary  - A4 landscape, one row per item and a Total row at the end.
// Column labels repeat on every page; "Page x of y" top right; the company, the heading, the
// branch and the report info at the top of every page.
import { jsPDF } from "jspdf";
import autoTable, { type CellDef } from "jspdf-autotable";

import {
  PDF_BLACK,
  addPageNumbers,
  drawReportTitle,
  pdfMargin,
  pdfTableStyles,
  pdfTableTop,
} from "../../../common/reportPdf";

import {
  formatCost,
  formatDate,
  formatQty,
  type PrintReport,
} from "./RptStockReportPrintReport";

export const buildStockReportPdf = (report: PrintReport): Blob => {
  const detailed = report.txtMode === "D";
  const sections = (detailed ? report.detail.length : report.summary.branches.length) > 1;

  const doc = new jsPDF({
    orientation: detailed ? "portrait" : "landscape",
    unit: "mm",
    format: "a4",
  });

  const pageW = detailed ? 210 : 297;
  const margin = pdfMargin(detailed ? 22.9 : 25.4);
  const usable = pageW - margin.left - margin.right;
  const tableTop = pdfTableTop(margin);

  const right = { halign: "right" as const };
  const bold = { fontStyle: "bold" as const };

  // "Branch : Jeddah" (one row over the whole width)
  const branchRow = (name: string, colSpan: number): CellDef[] => [
    {
      content: `Branch : ${name}`,
      colSpan,
      styles: { fontStyle: "bold" as const, lineWidth: 0, minCellHeight: 9, valign: "bottom" },
    },
  ];

  let head: CellDef[][];
  const body: CellDef[][] = [];
  let columnStyles: Record<number, { cellWidth: number; halign?: "right" }>;

  if (detailed) {
    // Date | Type | Document No. | Txn.# | Unit Cost | Qty. In | Qty. Out | Balance (the old weights)
    const weights = [0.136, 0.072, 0.133, 0.107, 0.121, 0.145, 0.144, 0.142];

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
          styles: { fontStyle: "bold" as const, lineWidth: 0, minCellHeight: 9, valign: "bottom" },
        },
      ]);

      for (const l of item.lines) {
        body.push([
          { content: formatDate(l.txtDate) },
          { content: l.txtDocType },
          { content: l.txtDocNo },
          { content: l.txtTxnNo },
          { content: formatCost(l.txtUnitCost), styles: right },
          { content: formatQty(l.txtQtyIn), styles: right },
          { content: formatQty(l.txtQtyOut), styles: right },
          { content: formatQty(l.txtBalance), styles: right },
        ]);
      }

      body.push([
        { content: "Total :", colSpan: 5, styles: { ...bold, ...right } },
        { content: formatQty(item.txtTotalIn), styles: { ...bold, ...right } },
        { content: formatQty(item.txtTotalOut), styles: { ...bold, ...right } },
        { content: formatQty(item.txtTotalBalance), styles: { ...bold, ...right } },
      ]);
    }
  } else {
    // Item ID | Item Name | Unit | Opening | Qty. In | Qty. Out | Closing (the old weights)
    const weights = [0.174, 0.395, 0.048, 0.105, 0.093, 0.093, 0.093];

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

      for (const l of branch.lines) {
        body.push([
          { content: l.lkpItemID },
          { content: l.txtItemName },
          { content: l.txtUnit },
          { content: formatQty(l.txtQtyOpening), styles: right },
          { content: formatQty(l.txtQtyIn), styles: right },
          { content: formatQty(l.txtQtyOut), styles: right },
          { content: formatQty(l.txtQtyClosing), styles: right },
        ]);
      }

      // the Total of the branch
      if (sections) body.push(totalRow("Total :", branch.totals));
    }

    body.push(totalRow(sections ? "Grand Total :" : "Total :", report.summary.totals));
  }

  // company / heading / branch + report info - drawn on every page
  const drawTitle = () => drawReportTitle(doc, pageW, margin, report, report.txtBranch);

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
    styles: pdfTableStyles(),
    headStyles: {
      textColor: PDF_BLACK,
      fontStyle: "normal",
    },
    columnStyles,
    head,
    body,
    didDrawPage: drawTitle,
  });

  addPageNumbers(doc, pageW, margin);

  return doc.output("blob");
};
