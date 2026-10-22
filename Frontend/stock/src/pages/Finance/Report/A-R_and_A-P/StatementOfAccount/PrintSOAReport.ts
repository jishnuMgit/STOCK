// PrintSOAReport.ts
// The printed page (port of rptSOARpt / rptSOAAgeRpt): A4 PORTRAIT, one
// section per account: company, heading, period, customer block, then
// Date / Br. ID / Type / Doc. No. / Description / Debit / Credit / Balance,
// Total, the ageing line (when asked), the statement note, bank details and
// "Prepared By". Page number top right, user id + date bottom right.
// Opens the browser print dialog from a hidden iframe (no pop-up to block).

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
  company: { name: string; address: string[]; license: string; category: string };
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

const esc = (v: unknown) =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

// text placed inside a CSS string ("...") in the print stylesheet
const cssStr = (v: unknown) =>
  String(v ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/</g, "\\3C ")
    .replace(/[\r\n]+/g, " ");

export const money = (v: number | null) =>
  v == null
    ? ""
    : v.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
// debit / credit stay empty when 0
export const blankZero = (v: number) => (v ? money(v) : "");

const accountHtml = (r: PrintReport, a: PrintAccount, last: boolean) => {
  const b = a.bank;
  const lic = [a.company.license, a.company.category].filter(Boolean).join("     ");

  return `<section class="acc" ${last ? 'style="page-break-after:auto"' : ""}>
  <div class="co">${esc(a.company.name || r.coName)}</div>
  ${a.company.address.map((l) => `<div class="addr">${esc(l)}</div>`).join("")}
  ${lic ? `<div class="addr">${esc(lic)}</div>` : ""}
  <div class="h1">${esc(r.heading1)}</div>
  <div class="h2">${esc(r.heading2)}</div>
  ${r.branchLabel ? `<div class="br">${esc(r.branchLabel)}</div>` : ""}

  <table class="info">
    <tr><td class="k">Customer ID</td><td>: ${esc(a.accountId)}</td>
        <td class="k">Customer Name</td><td>: ${esc(a.accountName)}</td></tr>
    <tr><td class="k">Payment Terms</td><td>: ${esc(a.paymentDays)} DAYS</td>
        <td class="k">Credit Limit</td><td>: ${esc(money(a.creditLimit))}</td></tr>
    <tr><td class="k">Division</td><td>: ${esc(a.division)}</td>
        <td class="k">Currency</td><td>: ${esc(r.currency)}</td></tr>
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
</section>`;
};

export const buildHtml = (r: PrintReport) => `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${esc(r.heading1)}</title>
<style>
  @page {
    size: A4 portrait;
    margin: 12mm 10mm 14mm 12mm;
    @top-right    { content: "Page " counter(page) " of " counter(pages); font: 8pt "Times New Roman", serif; }
    @bottom-right { content: "${cssStr(r.reportInfo)}"; font: 8pt "Times New Roman", serif; }
  }
  * { box-sizing: border-box; }
  body { margin: 0; font: 9pt "Times New Roman", serif; color: #000;
         -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .acc { page-break-after: always; }
  .co   { font-size: 14pt; font-weight: bold; text-align: center; }
  .addr { font-size: 9pt; text-align: center; }
  .h1   { font-size: 12pt; font-weight: bold; text-align: center; margin-top: 8px; }
  .h2   { font-size: 10pt; text-align: center; margin-bottom: 6px; }
  .br   { margin-bottom: 4px; }
  table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  thead { display: table-header-group; }            /* header repeats on every page */
  tr { page-break-inside: avoid; }
  .info { margin-bottom: 8px; table-layout: auto; }
  .info td { padding: 1px 4px; }
  .info .k { width: 17%; font-weight: bold; }
  th { background: #eff3fa; border: 1px solid #c7d1e4; height: 22px;
       padding: 0 4px; font-weight: normal; text-align: left; }
  .grid td { border: 1px solid #c7d1e4; border-top: 0; padding: 2px 4px;
             vertical-align: middle; overflow-wrap: anywhere; }
  .r { text-align: right; }
  .tot td { font-weight: bold; }
  .age { margin-top: 12px; }
  .age th, .age td { border: 1px solid #c7d1e4; padding: 3px 4px; text-align: right; }
  .note { margin-top: 12px; font-size: 8pt; }
  .bank { margin-top: 8px; page-break-inside: avoid; }
  .bank .bt { font-weight: bold; }
  .bank table { width: auto; table-layout: auto; }
  .bank td { padding: 1px 12px 1px 0; }
  .by { margin-top: 12px; }
</style>
</head>
<body>
${r.accounts.map((a, i) => accountHtml(r, a, i === r.accounts.length - 1)).join("\n")}
</body>
</html>`;

export const printSoaReport = (report: PrintReport): void => {
  const iframe = document.createElement("iframe");
  iframe.style.cssText =
    "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden";
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument;
  const win = iframe.contentWindow;
  if (!doc || !win) {
    iframe.remove();
    throw new Error("Could not open the print view");
  }

  doc.open();
  doc.write(buildHtml(report));
  doc.close();

  const cleanup = () => setTimeout(() => iframe.remove(), 500);
  win.addEventListener("afterprint", cleanup);

  // let the iframe lay out before printing
  setTimeout(() => {
    win.focus();
    win.print();
    // some browsers never fire afterprint: remove it anyway after a minute
    setTimeout(() => iframe.remove(), 60000);
  }, 250);
};
