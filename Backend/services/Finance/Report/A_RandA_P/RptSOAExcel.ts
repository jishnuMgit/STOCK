// services/Finance/Report/RptSOAExcel.ts
// The Statement Of Account as an Excel file (one block per account, same
// columns as the printed report).
// Needs:  npm i exceljs
import ExcelJS from "exceljs";
import type { SoaReportData } from "./RptSOAService.js";

export type SoaReport = SoaReportData & {
  coName: string;
  reportInfo: string; // "<user>  dd/mm/yyyy hh:mm"
  userId: string;
};

const BORDER_COLOR = { argb: "FFC7D1E4" };
const HEAD_FILL = {
  type: "pattern" as const,
  pattern: "solid" as const,
  fgColor: { argb: "FFEFF3FA" },
};
const thin = {
  top: { style: "thin" as const, color: BORDER_COLOR },
  left: { style: "thin" as const, color: BORDER_COLOR },
  bottom: { style: "thin" as const, color: BORDER_COLOR },
  right: { style: "thin" as const, color: BORDER_COLOR },
};

const MONEY = "#,##0.00;-#,##0.00";

export const buildSoaWorkbook = async (report: SoaReport): Promise<Buffer> => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Statement Of Account", {
    pageSetup: {
      paperSize: 9, // A4
      orientation: "portrait",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
    },
  });

  ws.columns = [
    { width: 14 }, // Date
    { width: 8 }, //  Br. ID
    { width: 8 }, //  Type
    { width: 18 }, // Doc. No.
    { width: 46 }, // Description
    { width: 16 }, // Debit
    { width: 16 }, // Credit
    { width: 16 }, // Balance
  ];

  const merged = (text: string, font: Partial<ExcelJS.Font>, align: "center" | "right" | "left") => {
    const r = ws.addRow([text]);
    ws.mergeCells(r.number, 1, r.number, 8);
    r.getCell(1).font = { name: "Times New Roman", ...font };
    r.getCell(1).alignment = { horizontal: align };
    return r;
  };

  report.accounts.forEach((a, idx) => {
    if (idx > 0) ws.addRow([]);

    // header: English on the left, Arabic on the right (like the VB header)
    const pair = (left: string, right: string, font: Partial<ExcelJS.Font>) => {
      const r = ws.addRow([left, "", "", "", right]);
      ws.mergeCells(r.number, 1, r.number, 4);
      ws.mergeCells(r.number, 5, r.number, 8);
      r.getCell(1).font = { name: "Times New Roman", ...font };
      r.getCell(5).font = { name: "Times New Roman", ...font };
      r.getCell(1).alignment = { horizontal: "left" };
      r.getCell(5).alignment = { horizontal: "right", readingOrder: "rtl" };
    };
    pair(a.company.name || report.coName, a.company.nameAr, { size: 14, bold: true });
    const rows = Math.max(a.company.address.length, a.company.addressAr.length);
    for (let i = 0; i < rows; i++) {
      pair(a.company.address[i] ?? "", a.company.addressAr[i] ?? "", { size: 9 });
    }
    if (a.company.telephone) pair(a.company.telephone, a.company.telephone, { size: 9 });
    merged(report.heading1, { size: 12, bold: true }, "center");
    merged(report.heading2, { size: 10 }, "center");
    if (report.branchLabel) merged(report.branchLabel, { size: 10 }, "left");
    ws.addRow([]);

    const info = (l1: string, v1: string | number, l2: string, v2: string | number) => {
      const r = ws.addRow([l1, v1, "", "", l2, v2]);
      r.getCell(1).font = { bold: true };
      r.getCell(5).font = { bold: true };
      r.getCell(5).alignment = { horizontal: "right" };
      return r;
    };
    info("Customer ID", a.accountId, "Customer Name", a.accountName);
    info("Payment Terms", `${a.paymentDays} DAYS`, "Credit Limit", a.creditLimit).getCell(6).numFmt = MONEY;
    info("Division", a.division, "Currency", report.currency);
    ws.addRow([]);

    const head = ws.addRow(["Date", "Br. ID", "Type", "Doc. No.", "Description", "Debit", "Credit", "Balance"]);
    head.eachCell((cell, col) => {
      cell.font = { bold: true };
      cell.fill = HEAD_FILL;
      cell.border = thin;
      cell.alignment = { horizontal: col >= 6 ? "right" : "left" };
    });

    for (const r of a.rows) {
      const row = ws.addRow([
        r.date,
        r.brId,
        r.docType,
        r.docNo,
        r.description,
        r.debit || null,
        r.credit || null,
        r.balance,
      ]);
      row.eachCell({ includeEmpty: true }, (cell, col) => {
        cell.border = thin;
        cell.alignment = {
          horizontal: col >= 6 ? "right" : "left",
          vertical: "middle",
          wrapText: col === 5,
        };
      });
      [6, 7, 8].forEach((c) => (row.getCell(c).numFmt = MONEY));
    }

    const tot = ws.addRow(["", "", "", "", "Total :", a.totalDebit, a.totalCredit, a.closing]);
    tot.eachCell({ includeEmpty: true }, (cell, col) => {
      cell.font = { bold: true };
      cell.border = thin;
      cell.alignment = { horizontal: col >= 5 ? "right" : "left" };
    });
    [6, 7, 8].forEach((c) => (tot.getCell(c).numFmt = MONEY));

    if (a.ageing) {
      ws.addRow([]);
      const h = ws.addRow(["", ...report.ageingHeadings, "Total"]);
      h.eachCell({ includeEmpty: false }, (cell) => {
        cell.font = { bold: true };
        cell.fill = HEAD_FILL;
        cell.border = thin;
        cell.alignment = { horizontal: "right" };
      });
      const v = ws.addRow(["", ...a.ageing.buckets, a.ageing.total]);
      for (let c = 2; c <= 8; c++) {
        v.getCell(c).numFmt = MONEY;
        v.getCell(c).border = thin;
      }
    }

    ws.addRow([]);
    merged(report.statementNote, { size: 9 }, "left");

    if (a.bank.accountNo || a.bank.iban) {
      merged("Please transfer to our below bank account :", { size: 9, bold: true }, "left");
      (
        [
          ["Account Name", a.bank.beneficiary],
          ["Bank Name", `${a.bank.bankName} ${a.bank.branch}`.trim()],
          ["Account Number", a.bank.accountNo],
          ["IBAN", a.bank.iban],
          ["SWIFT CODE", a.bank.swift],
        ] as const
      ).forEach(([k, v]) => ws.addRow([k, `: ${v}`]));
    }
    ws.addRow([`Prepared By : ${report.userId}`]);
  });

  ws.addRow([]);
  merged(report.reportInfo, { size: 8 }, "right");

  return Buffer.from(await wb.xlsx.writeBuffer());
};