// downloadSoaPdf.ts
// The Statement Of Account as a PDF (returned as a Blob; saveFile.ts saves it):
// A4 PORTRAIT, one section per account (each starts on a new page): company,
// heading, period, customer block, the transactions with Total, the ageing
// line (when asked), the statement note, bank details and "Prepared By".
// Column labels repeat on every page, page number top right, report info
// bottom right.
// Needs:  npm i jspdf jspdf-autotable
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { blankZero, money, type PrintReport } from "./PrintSOAReport";

type RGB = [number, number, number];
const BORDER: RGB = [199, 209, 228]; // #c7d1e4
const HEAD_FILL: RGB = [239, 243, 250]; // #eff3fa
const BLACK: RGB = [0, 0, 0];

const PAGE_W = 210; // A4 portrait, mm
const PAGE_H = 297;
const MARGIN = { top: 14, right: 10, bottom: 16, left: 12 };

// same column proportions as the printed page
const COL_PCT = [11, 7, 7, 15, 30, 10, 10, 10];
const PAD = 1.2;

export const buildSoaPdf = (report: PrintReport): Blob => {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const usable = PAGE_W - MARGIN.left - MARGIN.right;
  const centre = PAGE_W / 2;
  const lastY = () => (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;

  const columnStyles: Record<number, { cellWidth: number; halign?: "right" }> = {};
  COL_PCT.forEach((p, i) => {
    columnStyles[i] = {
      cellWidth: (p / 100) * usable,
      ...(i >= 5 ? { halign: "right" as const } : {}),
    };
  });

  // moves to a new page when the next block does not fit
  const ensureSpace = (y: number, needed: number) => {
    if (y + needed > PAGE_H - MARGIN.bottom) {
      doc.addPage();
      return MARGIN.top;
    }
    return y;
  };

  report.accounts.forEach((a, idx) => {
    if (idx > 0) doc.addPage();
    let y = MARGIN.top;

    doc.setTextColor(0, 0, 0);
    doc.setFont("times", "bold");
    doc.setFontSize(14);
    doc.text(a.company.name || report.coName, centre, (y += 4), { align: "center" });

    doc.setFont("times", "normal");
    doc.setFontSize(9);
    a.company.address.forEach((l) => doc.text(l, centre, (y += 4.2), { align: "center" }));
    const lic = [a.company.license, a.company.category].filter(Boolean).join("     ");
    if (lic) doc.text(lic, centre, (y += 4.2), { align: "center" });

    doc.setFont("times", "bold");
    doc.setFontSize(12);
    doc.text(report.heading1, centre, (y += 8), { align: "center" });
    doc.setFont("times", "normal");
    doc.setFontSize(10);
    doc.text(report.heading2, centre, (y += 5), { align: "center" });
    if (report.branchLabel) {
      doc.setFontSize(9);
      doc.text(report.branchLabel, MARGIN.left, (y += 5));
    }

    // customer block
    autoTable(doc, {
      theme: "plain",
      startY: y + 3,
      margin: { left: MARGIN.left, right: MARGIN.right },
      styles: { font: "times", fontSize: 9, cellPadding: 0.8, textColor: BLACK },
      columnStyles: {
        0: { fontStyle: "bold", cellWidth: 28 },
        1: { cellWidth: 60 },
        2: { fontStyle: "bold", cellWidth: 28 },
      },
      body: [
        ["Customer ID", `: ${a.accountId}`, "Customer Name", `: ${a.accountName}`],
        ["Payment Terms", `: ${a.paymentDays} DAYS`, "Credit Limit", `: ${money(a.creditLimit)}`],
        ["Division", `: ${a.division}`, "Currency", `: ${report.currency}`],
      ],
    });

    // transactions + Total
    autoTable(doc, {
      theme: "plain",
      startY: lastY() + 3,
      margin: {
        top: MARGIN.top,
        right: MARGIN.right,
        bottom: MARGIN.bottom,
        left: MARGIN.left,
      },
      tableWidth: usable,
      rowPageBreak: "avoid",
      showHead: "everyPage",
      styles: {
        font: "times",
        fontSize: 8.5,
        cellPadding: PAD,
        lineColor: BORDER,
        lineWidth: 0.2,
        minCellHeight: 6,
        valign: "middle",
        overflow: "linebreak",
        textColor: BLACK,
      },
      headStyles: { fillColor: HEAD_FILL, textColor: BLACK, fontStyle: "normal" },
      columnStyles,
      head: [
        ["Date", "Br. ID", "Type", "Doc. No.", "Description", "Debit", "Credit", "Balance"].map(
          (t, i) => ({
            content: t,
            styles: { halign: i >= 5 ? ("right" as const) : ("left" as const) },
          }),
        ),
      ],
      body: [
        ...a.rows.map((r) => [
          r.date,
          r.brId,
          r.docType,
          r.docNo,
          r.description,
          blankZero(r.debit),
          blankZero(r.credit),
          money(r.balance),
        ]),
        [
          { content: "Total :", colSpan: 5, styles: { halign: "right" as const, fontStyle: "bold" as const } },
          { content: money(a.totalDebit), styles: { halign: "right" as const, fontStyle: "bold" as const } },
          { content: money(a.totalCredit), styles: { halign: "right" as const, fontStyle: "bold" as const } },
          { content: money(a.closing), styles: { halign: "right" as const, fontStyle: "bold" as const } },
        ],
      ],
    });

    y = lastY();

    // ageing line
    if (a.ageing) {
      y = ensureSpace(y + 5, 16);
      autoTable(doc, {
        theme: "plain",
        startY: y,
        margin: { left: MARGIN.left, right: MARGIN.right },
        styles: {
          font: "times",
          fontSize: 8.5,
          halign: "right",
          cellPadding: PAD,
          lineColor: BORDER,
          lineWidth: 0.2,
          textColor: BLACK,
        },
        headStyles: { fillColor: HEAD_FILL, textColor: BLACK, fontStyle: "normal" },
        head: [[...report.ageingHeadings, "Total"]],
        body: [[...a.ageing.buckets.map((v) => money(v)), money(a.ageing.total)]],
      });
      y = lastY();
    }

    // statement note
    doc.setFont("times", "normal");
    doc.setFontSize(8);
    const note = doc.splitTextToSize(report.statementNote, usable) as string[];
    y = ensureSpace(y + 6, note.length * 3.6 + 40);
    doc.text(note, MARGIN.left, y);
    y += note.length * 3.6 + 2;

    // bank details
    const b = a.bank;
    if (b.accountNo || b.iban) {
      doc.setFontSize(9);
      doc.setFont("times", "bold");
      doc.text("Please transfer to our below bank account :", MARGIN.left, (y += 3));
      doc.setFont("times", "normal");
      (
        [
          ["Account Name", b.beneficiary],
          ["Bank Name", [b.bankName, b.branch].filter(Boolean).join(" ")],
          ["Account Number", b.accountNo],
          ["IBAN", b.iban],
          ["SWIFT CODE", b.swift],
        ] as const
      ).forEach(([k, v]) => {
        y += 4.2;
        doc.text(k, MARGIN.left, y);
        doc.text(`: ${v}`, MARGIN.left + 32, y);
      });
      y += 3;
    }

    doc.setFontSize(9);
    doc.text(`Prepared By : ${report.userId}`, MARGIN.left, (y += 6));
  });

  // page numbers need the final page count, so they are added at the end
  const pages = doc.getNumberOfPages();
  doc.setFont("times", "normal");
  doc.setFontSize(8);
  doc.setTextColor(0, 0, 0);
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.text(`Page ${i} of ${pages}`, PAGE_W - MARGIN.right, MARGIN.top - 4, { align: "right" });
    doc.text(report.reportInfo, PAGE_W - MARGIN.right, PAGE_H - MARGIN.bottom + 8, {
      align: "right",
    });
  }

  return doc.output("blob");
};
