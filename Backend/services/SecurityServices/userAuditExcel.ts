// services/SecurityServices/userAuditExcel.ts
// The User Audit report as an Excel file (same columns as the printed report: Sl.#,
// Year, Br. ID, Doc. Type, Doc. No., Screen, Action, Audit Note, Audit Date - by user,
// "User ID : X" then that user's rows, Sl.# restarting for each user).
import ExcelJS from "exceljs";
import { REPORT_FONT_SIZE, applyReportFont, font, thin } from "../../utils/reportStyle.js";

// one report row, under the response keys (the same rows the Print returns)
export type UserAuditExcelRow = {
  txtYear: string | null;
  txtBranchID: string | null;
  txtDocType: string | null;
  txtDocNo: string | null;
  txtScreenName: string | null;
  txtAction: string | null;
  txtAuditNote: string | null;
  txtUserID: string;
  txtAuditDate: string;
};

export type UserAuditExcelReport = {
  companyName: string;
  dtpFromDate: string; // yyyy-mm-dd
  dtpToDate: string; // yyyy-mm-dd
  reportInfo: string;
  rows: UserAuditExcelRow[];
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// DD-MMM-YYYY of a yyyy-mm-dd text
const dmmy = (value: string): string => {
  const [year, month, day] = String(value).slice(0, 10).split("-");
  const monthName = MONTHS[Number(month) - 1];

  return monthName ? `${day}-${monthName}-${year}` : String(value);
};

const LAST_COLUMN = "I";

export const buildUserAuditWorkbook = async ({
  companyName,
  dtpFromDate,
  dtpToDate,
  reportInfo,
  rows,
}: UserAuditExcelReport): Promise<Buffer> => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("User Audit", {
    pageSetup: {
      paperSize: 9, // A4
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
    },
  });

  ws.columns = [
    { width: 7 }, // Sl.#
    { width: 8 }, // Year
    { width: 9 }, // Br. ID
    { width: 12 }, // Doc. Type
    { width: 18 }, // Doc. No.
    { width: 26 }, // Screen
    { width: 10 }, // Action
    { width: 50 }, // Audit Note
    { width: 22 }, // Audit Date
  ];

  // ---- company / heading / info (rows 1-3) ----
  ws.mergeCells(`A1:${LAST_COLUMN}1`);
  ws.getCell("A1").value = companyName;
  ws.getCell("A1").font = font(REPORT_FONT_SIZE.company, true);
  ws.getCell("A1").alignment = { horizontal: "center" };

  ws.mergeCells(`A2:${LAST_COLUMN}2`);
  ws.getCell("A2").value = `User Audit For The Period ${dmmy(dtpFromDate)} To ${dmmy(dtpToDate)}`;
  ws.getCell("A2").font = font(REPORT_FONT_SIZE.heading);
  ws.getCell("A2").alignment = { horizontal: "center" };

  ws.mergeCells(`A3:${LAST_COLUMN}3`);
  ws.getCell("A3").value = reportInfo;
  ws.getCell("A3").font = font(REPORT_FONT_SIZE.small);
  ws.getCell("A3").alignment = { horizontal: "right" };

  // ---- column labels (row 4) ----
  const headRow = 4;
  const head = ws.getRow(headRow);
  head.values = [
    "Sl.#",
    "Year",
    "Br. ID",
    "Doc. Type",
    "Doc. No.",
    "Screen",
    "Action",
    "Audit Note",
    "Audit Date",
  ];
  head.eachCell((cell) => {
    cell.font = { bold: true };
    cell.border = thin;
    cell.alignment = { horizontal: "left" };
  });

  ws.views = [{ state: "frozen", ySplit: headRow }];
  ws.pageSetup.printTitlesRow = `1:${headRow}`;

  // ---- the rows, by user ----
  let lastUser: string | null = null;
  let slNo = 0;

  for (const row of rows) {
    if (row.txtUserID !== lastUser) {
      lastUser = row.txtUserID;
      slNo = 0;

      const userRow = ws.addRow([`User ID : ${row.txtUserID}`]);
      ws.mergeCells(userRow.number, 1, userRow.number, 9);
      userRow.getCell(1).font = { bold: true };
      userRow.getCell(1).alignment = { horizontal: "left" };
    }

    slNo += 1;

    const line = ws.addRow([
      slNo,
      row.txtYear ?? "",
      row.txtBranchID ?? "",
      row.txtDocType ?? "",
      row.txtDocNo ?? "",
      row.txtScreenName ?? "",
      row.txtAction ?? "",
      row.txtAuditNote ?? "",
      row.txtAuditDate ?? "",
    ]);

    line.eachCell({ includeEmpty: true }, (cell) => {
      cell.border = thin;
      cell.alignment = { horizontal: "left", vertical: "top", wrapText: true };
    });
  }

  // the whole sheet in the report font (the table too, not only the title)
  applyReportFont(ws);

  return Buffer.from(await wb.xlsx.writeBuffer());
};
