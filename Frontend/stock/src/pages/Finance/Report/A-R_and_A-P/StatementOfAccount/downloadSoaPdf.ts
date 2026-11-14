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
import {
  pdfHeadStyles,
  pdfTableStyles,
  registerReportPdfFont,
} from "../../../../../components/common/reportPdf";
import { blankZero, money, type PrintReport } from "./PrintSOAReport";

type RGB = [number, number, number];
const BLACK: RGB = [0, 0, 0];

const PAGE_W = 210; // A4 portrait, mm
const PAGE_H = 297;
const MARGIN = { top: 14, right: 10, bottom: 16, left: 12 };

// same column proportions as the printed page
const COL_PCT = [11, 9, 7.5, 14, 18.5, 13, 13.5, 13.5]; // wide enough for the 14 px labels and a 6-figure amount, with the cell padding

// Arabic needs a font with Arabic letters. jsPDF cannot use the system fonts, so
// the file public/fonts/ArabicPdf.ttf (a small DejaVu Sans subset) is fetched
// once and embedded. Without it the PDF is still made, only without Arabic.
const bytesToBase64 = (buf: ArrayBuffer) => {
  const bytes = new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(bin);
};

let arabicFont: Promise<string | null> | null = null;
const loadArabicFont = (): Promise<string | null> => {
  if (!arabicFont) {
    arabicFont = fetch(`${import.meta.env.BASE_URL}fonts/ArabicPdf.ttf`)
      .then((r) => {
        if (!r.ok) throw new Error(`Arabic font not found (${r.status})`);
        return r.arrayBuffer();
      })
      .then(bytesToBase64)
      .catch((error) => {
        console.warn("SOA pdf:", error);
        arabicFont = null; // try again next time
        return null;
      });
  }
  return arabicFont;
};

export const buildSoaPdf = async (report: PrintReport): Promise<Blob> => {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const look = await registerReportPdfFont(doc, "inter"); // the font and the sizes of the look

  const fontData = await loadArabicFont();
  if (fontData) {
    doc.addFileToVFS("ArabicPdf.ttf", fontData);
    doc.addFont("ArabicPdf.ttf", "ArabicPdf", "normal");
  }
  const hasArabic = fontData !== null;
  const usable = PAGE_W - MARGIN.left - MARGIN.right;
  const centre = PAGE_W / 2;
  // room for the footer image (Footer.jpg) at the bottom of every page
  const FOOT_H = 18;
  const bottom = report.footerImage ? MARGIN.bottom + FOOT_H + 2 : MARGIN.bottom;
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
    if (y + needed > PAGE_H - bottom) {
      doc.addPage();
      return MARGIN.top;
    }
    return y;
  };

  report.accounts.forEach((a, idx) => {
    if (idx > 0) doc.addPage();
    let y = MARGIN.top;

    doc.setTextColor(0, 0, 0);
    // header: company name, address 1/2/4/3 and telephone on the left
    doc.setFont(look.font, "bold");
    doc.setFontSize(look.size.company);
    doc.text(a.company.name || report.coName, MARGIN.left, (y += 4));

    doc.setFont(look.font, "normal");
    doc.setFontSize(look.size.group);
    [...a.company.address, a.company.telephone]
      .filter((l) => l !== "")
      .forEach((l) => doc.text(l, MARGIN.left, (y += 4.2)));

    // the same header in Arabic on the right
    if (hasArabic) {
      const xr = PAGE_W - MARGIN.right;
      let ya = MARGIN.top + 4;
      doc.setFont("ArabicPdf", "normal");
      doc.setFontSize(look.size.company);
      if (a.company.nameAr) doc.text(a.company.nameAr, xr, ya, { align: "right" });
      doc.setFontSize(look.size.group);
      [...a.company.addressAr, a.company.telephone]
        .filter((l) => l !== "")
        .forEach((l) => doc.text(l, xr, (ya += 4.2), { align: "right" }));
      y = Math.max(y, ya);
      doc.setFont(look.font, "normal");
    }

    // company logo (Header_<CoID>.jpg) in the middle, fitted into 40 x 37 mm
    if (report.logo) {
      try {
        const p = doc.getImageProperties(report.logo);
        const s = Math.min(40 / p.width, 37 / p.height);
        const w = p.width * s;
        const h = p.height * s;
        doc.addImage(report.logo, "JPEG", centre - w / 2, MARGIN.top, w, h);
        y = Math.max(y, MARGIN.top + h);
      } catch {
        // an unreadable image is skipped
      }
    }

    doc.setFont(look.font, "bold");
    doc.setFontSize(look.size.heading);
    doc.text(report.heading1, centre, (y += 8), { align: "center" });
    doc.setFont(look.font, "normal");
    doc.setFontSize(look.size.columnHead ?? look.size.pdfBody);
    doc.text(report.heading2, centre, (y += 5), { align: "center" });
    if (report.branchLabel) {
      doc.setFontSize(look.size.group);
      doc.text(report.branchLabel, MARGIN.left, (y += 5));
    }

    // customer block
    autoTable(doc, {
      theme: "plain",
      startY: y + 3,
      margin: { left: MARGIN.left, right: MARGIN.right },
      styles: { font: look.font, fontSize: look.size.group, cellPadding: 0.8, textColor: BLACK },
      tableWidth: usable,
      // the same columns as the printed page: the right-hand pair starts at 62% of the width and its value ends
      // at the right edge of the Balance column
      columnStyles: {
        0: { fontStyle: "bold", cellWidth: 0.17 * usable },
        1: { halign: "center", cellWidth: 0.015 * usable },
        2: { cellWidth: 0.435 * usable },
        3: { fontStyle: "bold", cellWidth: 0.15 * usable },
        4: { halign: "center", cellWidth: 0.015 * usable },
        5: { halign: "right", cellWidth: 0.215 * usable },
      },
      body: [
        ["Customer ID", ":", a.accountId, "Customer Name", ":", a.accountName],
        ["Payment Terms", ":", `${a.paymentDays} DAYS`, "Credit Limit", ":", money(a.creditLimit)],
        ["Division", ":", a.division, "Currency", ":", report.currency],
      ],
    });

    // transactions + Total
    autoTable(doc, {
      theme: "plain",
      startY: lastY() + 3,
      margin: {
        top: MARGIN.top,
        right: MARGIN.right,
        bottom,
        left: MARGIN.left,
      },
      tableWidth: usable,
      rowPageBreak: "avoid",
      showHead: "everyPage",
      styles: pdfTableStyles(look),
      headStyles: pdfHeadStyles(look),
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
        styles: { ...pdfTableStyles(look), halign: "right" },
        headStyles: pdfHeadStyles(look),
        head: [[...report.ageingHeadings, "Total"]],
        body: [[...a.ageing.buckets.map((v) => money(v)), money(a.ageing.total)]],
      });
      y = lastY();
    }

    // statement note
    doc.setFont(look.font, "normal");
    doc.setFontSize(look.size.small);
    const note = doc.splitTextToSize(report.statementNote, usable) as string[];
    y = ensureSpace(y + 6, note.length * 3.6 + 40);
    doc.text(note, MARGIN.left, y);
    y += note.length * 3.6 + 2;

    // bank details
    const b = a.bank;
    if (b.accountNo || b.iban) {
      doc.setFontSize(look.size.group);
      doc.setFont(look.font, "bold");
      doc.text("Please transfer to our below bank account :", MARGIN.left, (y += 3));
      doc.setFont(look.font, "normal");
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

    doc.setFontSize(look.size.group);
    doc.text(`Prepared By : ${report.userId}`, MARGIN.left, (y += 6));
  });

  // page numbers need the final page count, so they are added at the end
  const pages = doc.getNumberOfPages();
  doc.setFont(look.font, "normal");
  doc.setFontSize(look.size.small);
  doc.setTextColor(0, 0, 0);
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    if (report.footerImage) {
      try {
        doc.addImage(
          report.footerImage,
          "JPEG",
          MARGIN.left,
          PAGE_H - MARGIN.bottom - FOOT_H,
          usable,
          FOOT_H,
        );
      } catch {
        // an unreadable image is skipped
      }
    }
    doc.text(`Page ${i} / ${pages}`, PAGE_W - MARGIN.right, MARGIN.top - 4, { align: "right" });
    doc.text(`Printed : ${report.reportInfo}`, PAGE_W - MARGIN.right, PAGE_H - MARGIN.bottom + 8, {
      align: "right",
    });
  }

  return doc.output("blob");
};