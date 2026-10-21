// services/Sales/Report/RptSalesPriceListExcel.ts
// The Price List as an Excel file (same columns and groups as the printed
// report). Needs:  npm i exceljs
import ExcelJS from "exceljs";
import type { PriceGroup } from "./RptSalesPriceListService.js";

export type PriceListReport = {
  coName: string;
  heading: string;
  branch: string;
  reportInfo: string;
  groups: PriceGroup[];
};

const BORDER_COLOR = { argb: "FFB0C4DE" }; // LightSteelBlue
const HEAD_FILL = {
  type: "pattern" as const,
  pattern: "solid" as const,
  fgColor: { argb: "FFFFFFF0" }, // Ivory
};

const thin = {
  top: { style: "thin" as const, color: BORDER_COLOR },
  left: { style: "thin" as const, color: BORDER_COLOR },
  bottom: { style: "thin" as const, color: BORDER_COLOR },
  right: { style: "thin" as const, color: BORDER_COLOR },
};

export const buildPriceListWorkbook = async (
  report: PriceListReport,
): Promise<Buffer> => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Price List", {
    views: [{ state: "frozen", ySplit: 4 }],
    pageSetup: {
      paperSize: 9, // A4
      orientation: "portrait",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      printTitlesRow: "1:4",
    },
  });

  ws.columns = [
    { width: 14 }, // Item ID
    { width: 50 }, // Item Name
    { width: 10 }, // Unit
    { width: 16 }, // Unit Cost
    { width: 16 }, // Unit Price
  ];

  // ---- company / heading / branch (rows 1-3) ----
  ws.mergeCells("A1:E1");
  ws.getCell("A1").value = report.coName;
  ws.getCell("A1").font = { name: "Times New Roman", size: 14, bold: true };
  ws.getCell("A1").alignment = { horizontal: "center" };

  ws.mergeCells("A2:E2");
  ws.getCell("A2").value = report.heading;
  ws.getCell("A2").font = { name: "Times New Roman", size: 12 };
  ws.getCell("A2").alignment = { horizontal: "center" };

  ws.mergeCells("A3:B3");
  ws.getCell("A3").value = report.branch;
  ws.mergeCells("C3:E3");
  ws.getCell("C3").value = report.reportInfo;
  ws.getCell("C3").font = { name: "Times New Roman", size: 8 };
  ws.getCell("C3").alignment = { horizontal: "right" };

  // ---- column labels (row 4) ----
  const head = ws.getRow(4);
  head.values = ["Item ID", "Item Name", "Unit", "Unit Cost", "Unit Price"];
  head.eachCell((c, col) => {
    c.font = { bold: true };
    c.fill = HEAD_FILL;
    c.border = thin;
    c.alignment = { horizontal: col >= 4 ? "right" : "left" };
  });

  // ---- detail, grouped by item group ----
  for (const g of report.groups) {
    const gr = ws.addRow([`Item Group :  ${g.groupId}  ${g.groupName}`]);
    ws.mergeCells(`A${gr.number}:E${gr.number}`);
    gr.getCell(1).font = { name: "Times New Roman", size: 10, bold: true };
    gr.getCell(1).border = {
      bottom: { style: "thin", color: BORDER_COLOR },
    };

    for (const it of g.items) {
      const row = ws.addRow([
        it.itemId,
        it.itemName,
        it.unit,
        it.unitCost,
        it.unitPrice,
      ]);
      row.eachCell({ includeEmpty: true }, (c, col) => {
        c.border = thin;
        if (col === 4) {
          c.numFmt = "#,##0.0000";
          c.alignment = { horizontal: "right" };
        }
        if (col === 5) {
          c.numFmt = "#,##0.00";
          c.alignment = { horizontal: "right" };
        }
      });
    }
  }

  return Buffer.from(await wb.xlsx.writeBuffer());
};
