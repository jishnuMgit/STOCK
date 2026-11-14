// PrintSOAReport.ts
// The printed page (port of rptSOARpt / rptSOAAgeRpt): A4 PORTRAIT, one
// section per account: company, heading, period, customer block, then
// Date / Br. ID / Type / Doc. No. / Description / Debit / Credit / Balance,
// Total, the ageing line (when asked), the statement note, bank details and
// "Prepared By". "Page x / y" top right, "Printed : user  date" bottom right.
// Opens the browser print dialog from a hidden iframe (no pop-up to block).
// The font, the sizes and the line colour are the "inter" look of components/common/reportStyle.ts.
import { cssStr, esc, printHtmlDocument } from "../../../../../components/common/printHtml";
import { REPORT_STYLE, reportLook } from "../../../../../components/common/reportStyle";

export type PrintRow = {
  date: string;
  brId: string;
  docType: string;
  docNo: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
};

export type PrintAccount = {
  accountId: string;
  accountName: string;
  paymentDays: string;
  creditLimit: number;
  division: string;
  company: {
    name: string;
    nameAr: string;
    address: string[]; // address 1, 2, 4, 3 (the order of the VB header)
    addressAr: string[];
    telephone: string;
  };
  bank: {
    beneficiary: string;
    bankName: string;
    branch: string;
    accountNo: string;
    iban: string;
    swift: string;
  };
  ageing: { total: number; buckets: number[] } | null;
  rows: PrintRow[];
  totalDebit: number;
  totalCredit: number;
  closing: number;
};

export type PrintReport = {
  logo: string; // data: URI, "" = none
  footerImage: string; // data: URI, "" = none
  coName: string;
  heading1: string;
  heading2: string;
  branchLabel: string;
  currency: string;
  statementNote: string;
  ageingHeadings: string[];
  reportInfo: string;
  userId: string;
  accounts: PrintAccount[];
};

export const money = (v: number | null) =>
  v == null
    ? ""
    : v.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
// debit / credit stay empty when 0
export const blankZero = (v: number) => (v ? money(v) : "");

const accountHtml = (r: PrintReport, a: PrintAccount, index: number, total: number) => {
  const last = index === total - 1;
  const b = a.bank;
  const c = a.company;
  const tel = c.telephone ? `<div>${esc(c.telephone)}</div>` : "";

  // data-stmt: what the Print Preview shows where this statement starts (it has no page breaks); a print ignores it
  const stmt = `Statement ${index + 1} of ${total} : ${a.accountId} ${a.accountName}`;

  return `<section class="acc" data-stmt="${esc(stmt)}" ${last ? 'style="page-break-after:auto"' : ""}>
  <table class="hdr"><tr>
    <td class="hl">
      <div class="coname">${esc(c.name || r.coName)}</div>
      ${c.address.map((l) => `<div>${esc(l)}</div>`).join("")}${tel}
    </td>
    <td class="hc">${r.logo ? `<img class="logo" src="${r.logo}" />` : ""}</td>
    <td class="hr" dir="rtl">
      <div class="coname">${esc(c.nameAr)}</div>
      ${c.addressAr.map((l) => `<div>${esc(l)}</div>`).join("")}${tel}
    </td>
  </tr></table>
  <div class="h1">${esc(r.heading1)}</div>
  <div class="h2">${esc(r.heading2)}</div>
  ${r.branchLabel ? `<div class="br">${esc(r.branchLabel)}</div>` : ""}

  <table class="info">
    <colgroup>
      <col style="width:17%" /><col style="width:1.5%" /><col style="width:43.5%" />
      <col style="width:15%" /><col style="width:1.5%" /><col style="width:21.5%" />
    </colgroup>
    <tr><td class="k">Customer ID</td><td class="c">:</td><td>${esc(a.accountId)}</td>
        <td class="k">Customer Name</td><td class="c">:</td><td class="v">${esc(a.accountName)}</td></tr>
    <tr><td class="k">Payment Terms</td><td class="c">:</td><td>${esc(a.paymentDays)} DAYS</td>
        <td class="k">Credit Limit</td><td class="c">:</td><td class="v">${esc(money(a.creditLimit))}</td></tr>
    <tr><td class="k">Division</td><td class="c">:</td><td>${esc(a.division)}</td>
        <td class="k">Currency</td><td class="c">:</td><td class="v">${esc(r.currency)}</td></tr>
  </table>

  <table class="grid">
    <colgroup>
      <col style="width:11%" /><col style="width:7%" /><col style="width:7%" />
      <col style="width:15%" /><col style="width:30%" />
      <col style="width:10%" /><col style="width:10%" /><col style="width:10%" />
    </colgroup>
    <thead>
      <tr>
        <th>Date</th><th>Br. ID</th><th>Type</th><th>Doc. No.</th><th>Description</th>
        <th class="r">Debit</th><th class="r">Credit</th><th class="r">Balance</th>
      </tr>
    </thead>
    <tbody>
      ${a.rows
        .map(
          (row) => `<tr>
        <td>${esc(row.date)}</td><td>${esc(row.brId)}</td><td>${esc(row.docType)}</td>
        <td>${esc(row.docNo)}</td><td>${esc(row.description)}</td>
        <td class="r">${esc(blankZero(row.debit))}</td>
        <td class="r">${esc(blankZero(row.credit))}</td>
        <td class="r">${esc(money(row.balance))}</td>
      </tr>`,
        )
        .join("\n")}
      <tr class="tot">
        <td colspan="5" class="r">Total :</td>
        <td class="r">${esc(money(a.totalDebit))}</td>
        <td class="r">${esc(money(a.totalCredit))}</td>
        <td class="r">${esc(money(a.closing))}</td>
      </tr>
    </tbody>
  </table>

  ${
    a.ageing
      ? `<table class="age"><thead><tr>
      ${r.ageingHeadings.map((h) => `<th>${esc(h)}</th>`).join("")}<th>Total</th></tr></thead>
      <tbody><tr>${a.ageing.buckets.map((v) => `<td>${esc(money(v))}</td>`).join("")}
      <td>${esc(money(a.ageing.total))}</td></tr></tbody></table>`
      : ""
  }

  <div class="note">${esc(r.statementNote)}</div>

  ${
    b.accountNo || b.iban
      ? `<div class="bank"><div class="bt">Please transfer to our below bank account :</div>
    <table>
      <tr><td>Account Name</td><td>: ${esc(b.beneficiary)}</td></tr>
      <tr><td>Bank Name</td><td>: ${esc([b.bankName, b.branch].filter(Boolean).join(" "))}</td></tr>
      <tr><td>Account Number</td><td>: ${esc(b.accountNo)}</td></tr>
      <tr><td>IBAN</td><td>: ${esc(b.iban)}</td></tr>
      <tr><td>SWIFT CODE</td><td>: ${esc(b.swift)}</td></tr>
    </table></div>`
      : ""
  }
  <div class="by">Prepared By : ${esc(r.userId)}</div>
  ${r.footerImage ? `<img class="foot" src="${r.footerImage}" />` : ""}
</section>`;
};

export const buildHtml = (r: PrintReport) => {
  // the font and the sizes come from the shared look (components/common/reportStyle.ts)
  const { css, size } = reportLook("inter");
  const font = css.family;
  const { lineColor } = REPORT_STYLE;

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${esc(r.heading1)}</title>
<style>${css.importCss}
  @page {
    size: A4 portrait;
    margin: 12mm 10mm 14mm 12mm;
    @top-right    { content: "Page " counter(page) " / " counter(pages); font: ${size.small}pt ${font}; }
    @bottom-right { content: "Printed : ${cssStr(r.reportInfo)}"; font: ${size.small}pt ${font}; }
  }
  * { box-sizing: border-box; }
  body { margin: 0; font: ${size.group}pt ${font}; color: #000;
         -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .acc { page-break-after: always; }
  .hdr { margin-bottom: 6px; }
  .hl, .hr { width: 40%; vertical-align: top; font-size: ${size.group}pt; line-height: 1.35; }
  .hl { text-align: left; } .hr { text-align: right; }
  .hc { width: 20%; text-align: center; vertical-align: top; }
  .logo { max-width: 154px; max-height: 140px; }
  .foot { display: block; width: 100%; height: 80px; margin-top: 10px; }
  .coname { font-size: ${size.company}pt; font-weight: bold; }
  .addr { font-size: ${size.group}pt; text-align: center; }
  .h1   { font-size: ${size.heading}pt; font-weight: bold; text-align: center; margin-top: 8px; }
  .h2   { font-size: ${size.columnHead}pt; text-align: center; margin-bottom: 6px; }
  .br   { margin-bottom: 4px; }
  table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  thead { display: table-header-group; }            /* header repeats on every page */
  tr { page-break-inside: avoid; }
  /* the columns of the block follow the grid below: the right-hand pair starts at 62% of the width (room for a long customer name) and its value ends at the right edge of the Balance column */
  .info { margin-bottom: 8px; }
  .info td { padding: 1px 4px; vertical-align: top; overflow-wrap: anywhere; }
  .info .k { font-weight: bold; }
  .info .c { text-align: center; padding: 1px 0; }
  .info .v { text-align: right; }
  th { border: 1px solid ${lineColor}; height: 22px; font-size: ${size.columnHead}pt;
       padding: 0 4px; font-weight: normal; text-align: left; }
  .grid td { border: 1px solid ${lineColor}; border-top: 0; padding: 2px 4px; font-size: ${size.body}pt;
             vertical-align: middle; overflow-wrap: anywhere; }
  .r { text-align: right; }
  .tot td { font-weight: bold; }
  .age { margin-top: 12px; }
  .age th, .age td { border: 1px solid ${lineColor}; padding: 3px 4px; text-align: right; }
  .age td { font-size: ${size.body}pt; }
  .note { margin-top: 12px; font-size: ${size.small}pt; }
  .bank { margin-top: 8px; page-break-inside: avoid; }
  .bank .bt { font-weight: bold; }
  .bank table { width: auto; table-layout: auto; }
  .bank td { padding: 1px 12px 1px 0; }
  .by { margin-top: 12px; }
</style>
</head>
<body>
${r.accounts.map((a, i) => accountHtml(r, a, i, r.accounts.length)).join("\n")}
</body>
</html>`;
};

export const printSoaReport = (report: PrintReport): void => printHtmlDocument(buildHtml(report));
