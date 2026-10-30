// RptStockVerificationPrintReport.ts
// The printed Stock Verification report (the old rptStockVerificationrpt) - the stock-taking list.
//
//   A4 portrait: Item ID / Item Name / Unit / Comp. Stock (the books' quantity) / Phys. Stock (an empty
//   box for the counters), by item group:
//       Item Group : 01   Tiles        <- the item group
//       ... its items ...
//       Total :                        <- the Comp. Stock of the group
//   With more than one branch the report has one section per branch:
//       Branch : Jeddah                <- the branch, then its item groups, then
//       Branch Total :                 <- the Comp. Stock of the branch
//   A Grand Total row closes the report.
//   Plain: no fill on the heading row or the Total rows, thin light lines.
//   "Page x of y" is top right of every page; the company, the heading, the branch and the report
//   info repeat at the top of every page.
// Printed through components/common/printHtml (a hidden iframe).
import { esc, printHtmlDocument } from "../../../common/printHtml";
import { reportPrintCss } from "../../../common/reportStyle";

// ---- what the server sends (names = the server's response keys) ----

export type StockVerificationLine = {
  lkpItemID: string;
  txtItemName: string;
  txtUnit: string;
  txtStock: number;
};

export type StockVerificationGroup = {
  lkpItemGroupID: string;
  txtItemGroupName: string;
  lines: StockVerificationLine[];
  totals: { txtStock: number };
};

export type StockVerificationBranch = {
  lkpBranch: string;
  txtBranchName: string;
  groups: StockVerificationGroup[];
  totals: { txtStock: number };
};

export type PrintReport = {
  txtCoName: string;
  txtHeading: string;
  txtBranch: string;
  txtReportInfo: string;
  branches: StockVerificationBranch[];
  totals: { txtStock: number };
};

// the Comp. Stock: a whole number shows without decimals (the old #,#0), a fraction up to 3
export const formatStock = (value: number) =>
  value.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  });


// the branch sections (with their Total) only when the report holds more than one branch
export const hasBranchSections = (r: PrintReport) => r.branches.length > 1;

// the column weights: Item ID | Item Name | Unit | Comp. Stock | Phys. Stock
export const COLUMN_WEIGHTS = [0.2, 0.42, 0.07, 0.15, 0.16];

const groupHtml = (g: StockVerificationGroup) => `<tr><td colspan="5" class="group">Item Group&nbsp; : &nbsp;<b>${esc(g.lkpItemGroupID)}</b>&nbsp;&nbsp;${esc(g.txtItemGroupName)}</td></tr>
    ${g.lines
      .map(
        (l, index) => `<tr${index === 0 ? ' class="first"' : ""}>
      <td>${esc(l.lkpItemID)}</td>
      <td>${esc(l.txtItemName)}</td>
      <td>${esc(l.txtUnit)}</td>
      <td class="r">${formatStock(l.txtStock)}</td>
      <td></td>
    </tr>`
      )
      .join("\n    ")}
    <tr class="tot">
      <td colspan="3" class="r"><b>Total :</b></td>
      <td class="r"><b>${formatStock(g.totals.txtStock)}</b></td>
      <td></td>
    </tr>`;

const branchHtml = (b: StockVerificationBranch, sections: boolean) => `${
  sections
    ? `<tr><td colspan="5" class="branch">Branch&nbsp; : &nbsp;<b>${esc(b.txtBranchName)}</b></td></tr>
    `
    : ""
}${b.groups.map(groupHtml).join("\n    ")}${
  sections
    ? `
    <tr class="tot">
      <td colspan="3" class="r"><b>Branch Total :</b></td>
      <td class="r"><b>${formatStock(b.totals.txtStock)}</b></td>
      <td></td>
    </tr>`
    : ""
}`;

export const buildHtml = (r: PrintReport) => {
  const sections = hasBranchSections(r);

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Stock Verification</title>
<style>${reportPrintCss({ orientation: "portrait", marginLeft: "20mm", groupSelector: "td.branch, td.group" })}
</style>
</head>
<body>
<table>
  <colgroup>
    ${COLUMN_WEIGHTS.map((w) => `<col style="width:${(w * 100).toFixed(1)}%" />`).join("")}
  </colgroup>
  <thead>
    <tr><td colspan="5" class="co"   style="border:0">${esc(r.txtCoName)}</td></tr>
    <tr><td colspan="5" class="head" style="border:0">${esc(r.txtHeading)}</td></tr>
    <tr><td colspan="5" class="sub"  style="border:0"><div><span>${esc(r.txtBranch)}</span><span class="info">${esc(r.txtReportInfo)}</span></div></td></tr>
    <tr>
      <th>Item ID</th><th>Item Name</th><th>Unit</th>
      <th class="r">Comp. Stock</th><th class="r">Phys. Stock</th>
    </tr>
  </thead>
  <tbody>
    ${r.branches.map((b) => branchHtml(b, sections)).join("\n    ")}
    <tr class="tot">
      <td colspan="3" class="r"><b>Grand Total :</b></td>
      <td class="r"><b>${formatStock(r.totals.txtStock)}</b></td>
      <td></td>
    </tr>
  </tbody>
</table>
</body>
</html>`;
};

export const printStockVerificationReport = (report: PrintReport): void =>
  printHtmlDocument(buildHtml(report));
