import React from "react";

import logo from './global-network.png'
/* ============================================================
   TYPES
============================================================ */

export interface SOATransaction {
  date: string;
  branchId: string;
  type: string;
  docNo: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
}

export interface SOAAgeing {
  label: string;
  amount: number;
}

export interface SOABankDetails {
  accountName: string;
  accountNumber: string;
  iban: string;
  swiftCode: string;
  bankName: string;
}

export interface StatementOfAccountProps {
  customerId: string;
  customerName: string;
  division?: string;

  paymentTerms?: string;
  creditLimit?: number;
  currency?: string;

  periodFrom: string;
  periodTo: string;

  vatNumber: string;

  transactions: SOATransaction[];

  ageing?: SOAAgeing[];

  bankDetails: SOABankDetails;

  amountInWords?: string;

  logoSrc?: string;
  logo?:string

  pageNumber?: number;
  totalPages?: number;
}

/* ============================================================
   HELPERS
============================================================ */

const formatAmount = (
  amount: number,
  decimals: number = 2
): string => {
  return amount.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

const formatBalance = (amount: number): string => {
  return `${formatAmount(Math.abs(amount))} ${amount < 0 ? "Cr" : "Dr"}`;
};

/* ============================================================
   DEFAULT DATA
============================================================ */

const defaultAgeing: SOAAgeing[] = [
  {
    label: "0 - 30 Days",
    amount: 0,
  },
  {
    label: "31 - 60 Days",
    amount: 0,
  },
  {
    label: "61 - 90 Days",
    amount: 0,
  },
  {
    label: "91 - 120 Days",
    amount: 0,
  },
  {
    label: "121 - 180 Days",
    amount: 0,
  },
  {
    label: "181 - 365 Days",
    amount: 0,
  },
];

/* ============================================================
   COMPONENT
============================================================ */

const StatementOfAccount: React.FC<StatementOfAccountProps> = ({
  customerId,
  customerName,
  division = "",

  paymentTerms = "30 DAYS",
  creditLimit = 0,
  currency = "SAR",

  periodFrom,
  periodTo,

  vatNumber,

  transactions,

  ageing = defaultAgeing,

  bankDetails,

  amountInWords = "",

  logoSrc = logo,

  pageNumber = 1,
  totalPages = 1,
}) => {
  /* ----------------------------------------------------------
     TOTALS
  ---------------------------------------------------------- */

  const totalDebit = transactions.reduce(
    (sum, row) => sum + Number(row.debit || 0),
    0
  );

  const totalCredit = transactions.reduce(
    (sum, row) => sum + Number(row.credit || 0),
    0
  );

  const closingBalance =
    transactions.length > 0
      ? Number(
          transactions[transactions.length - 1].balance || 0
        )
      : totalDebit - totalCredit;

  /* ----------------------------------------------------------
     PRINT
  ---------------------------------------------------------- */

  const handlePrint = () => {
    window.print();
  };

  /* ----------------------------------------------------------
     RENDER
  ---------------------------------------------------------- */

  return (
    <div className="soa-page-wrapper">

      {/* ======================================================
          SCREEN TOOLBAR
      ====================================================== */}

      <div className="soa-toolbar no-print">

        <div className="soa-toolbar-title">
          Statement Of Account
        </div>

        <button
          type="button"
          id="btnPrint"
          className="soa-print-button"
          onClick={handlePrint}
        >
          Print
        </button>

      </div>

      {/* ======================================================
          A4 DOCUMENT
      ====================================================== */}

      <div className="soa-document">

        {/* ====================================================
            HEADER
        ==================================================== */}

        <header className="soa-header">

          <div className="soa-header-top">

            <div className="soa-company-block">

              <div className="soa-company-name">
                CARAVAN TOURS &amp; TRAVEL COMPANY
              </div>

              <div className="soa-company-arabic">
                شركة القافلة للسياحه والسفريات
                {" "}
                (سفريات ايس)
              </div>

            </div>

          </div>

          <div className="soa-header-middle">

            {/* LEFT VAT */}

            <div className="soa-vat soa-vat-left">
              <span className="soa-label">
                VAT Number:
              </span>

              <span className="soa-value">
                {vatNumber}
              </span>
            </div>

            {/* LOGO */}

            <div className="soa-logo-container">

              <img
                src={logo}
                alt="Caravan Tours & Travel"
                className="soa-logo"
              />

            </div>

            {/* RIGHT VAT */}

            <div className="soa-vat soa-vat-right">

              <span className="soa-arabic-label">
                رقم الضريبة :
              </span>

              <span className="soa-value">
                {vatNumber}
              </span>

            </div>

          </div>

          {/* ==================================================
              REPORT TITLE
          ================================================== */}

          <div className="soa-title-section">

            
<span style={{fontWeight:700}}>
  OUTSTANDING STATEMENT OF ACCOUNT

</span>
            <div className="soa-period">

              <span>
                Period :
              </span>

              {/* <strong> */}
                {periodFrom}
              {/* </strong> */}

              <span>
                To
              </span>

              {/* <strong> */}
                {periodTo}
              {/* </strong> */}

            </div>

          </div>

          <div className="soa-page-number">

            Page {pageNumber} of {totalPages}

          </div>

        </header>

        {/* ====================================================
            CUSTOMER INFORMATION
        ==================================================== */}

        <section className="soa-info-section">

          {/* LEFT SIDE */}

          <div className="soa-info-left">

            <div className="soa-info-row">

              <span className="soa-info-label">
                Customer ID
              </span>

              <span className="soa-colon">
                :
              </span>

              <strong>
                {customerId}
              </strong>

            </div>

            <div className="soa-info-row">

              <span className="soa-info-label">
                Customer Name
              </span>

              <span className="soa-colon">
                :
              </span>

              <strong>
                {customerName}
              </strong>

            </div>

            <div className="soa-info-row">

              <span className="soa-info-label">
                Division
              </span>

              <span className="soa-colon">
                :
              </span>

              <span>
                {division}
              </span>

            </div>

          </div>

          {/* RIGHT SIDE */}

          <div className="soa-info-right">

            <div className="soa-info-row">

              <span className="soa-info-label">
                Payment Terms
              </span>

              <span className="soa-colon">
                :
              </span>

              <strong>
                {paymentTerms}
              </strong>

            </div>

            <div className="soa-info-row">

              <span className="soa-info-label">
                Credit Limit
              </span>

              <span className="soa-colon">
                :
              </span>

              <strong>
                {formatAmount(creditLimit)}
              </strong>

            </div>

            <div className="soa-info-row">

              <span className="soa-info-label">
                Currency
              </span>

              <span className="soa-colon">
                :
              </span>

              <strong>
                {currency}
              </strong>

            </div>

          </div>

        </section>

        {/* ====================================================
            TRANSACTION TABLE
        ==================================================== */}

        <section className="soa-table-section">

          <table className="soa-table">

            <thead>

              <tr>

                <th className="col-date">
                  Date
                </th>

                <th className="col-branch">
                  Br. ID
                </th>

                <th className="col-type">
                  Type
                </th>

                <th className="col-doc">
                  Doc. No.
                </th>

                <th className="col-description">
                  Description
                </th>

                <th className="col-number">
                  Debit
                </th>

                <th className="col-number">
                  Credit
                </th>

                <th className="col-number">
                  Balance
                </th>

              </tr>

            </thead>

            <tbody>

              {transactions.length === 0 ? (

                <tr>

                  <td
                    colSpan={8}
                    className="soa-empty-row"
                  >
                    No transactions found
                  </td>

                </tr>

              ) : (

                transactions.map((transaction, index) => (

                  <tr key={`${transaction.docNo}-${index}`}>

                    <td>
                      {transaction.date}
                    </td>

                    <td>
                      {transaction.branchId}
                    </td>

                    <td>
                      {transaction.type}
                    </td>

                    <td>
                      {transaction.docNo}
                    </td>

                    <td className="description-cell">
                      {transaction.description}
                    </td>

                    <td className="number-cell">
                      {formatAmount(transaction.debit)}
                    </td>

                    <td className="number-cell">
                      {formatAmount(transaction.credit)}
                    </td>

                    <td className="number-cell balance-cell">
                      {formatBalance(transaction.balance)}
                    </td>

                  </tr>

                ))

              )}

            </tbody>

            <tfoot>

              <tr>

                <td
                  colSpan={5}
                  className="total-label"
                >
                  Total :
                </td>

                <td className="number-cell total-value">
                  {formatAmount(totalDebit)}
                </td>

                <td className="number-cell total-value">
                  {formatAmount(totalCredit)}
                </td>

                <td className="number-cell total-value balance-cell">
                  {formatBalance(closingBalance)}
                </td>

              </tr>

            </tfoot>

          </table>

        </section>

        {/* ====================================================
            AMOUNT IN WORDS
        ==================================================== */}

        <div className="soa-amount-words">

          {amountInWords && (
            <>
              <strong>
                ({currency} :
              </strong>

              <span>
                {" "}
                {amountInWords}
              </span>

              <strong>
                )
              </strong>
            </>
          )}

        </div>

        {/* ====================================================
            BANK SECTION
        ==================================================== */}

        <section className="soa-bank-section">

          <div className="soa-bank-title">

            Please transfer to our below bank account :

          </div>

          <table className="soa-bank-table">

            <thead>

              <tr>

                <th>
                  Account Name
                </th>

                <th>
                  Account Number
                </th>

                <th>
                  IBAN
                </th>

                <th>
                  SWIFT CODE
                </th>

                <th>
                  Bank Name
                </th>

              </tr>

            </thead>

            <tbody>

              <tr>

                <td>
                  {bankDetails.accountName}
                </td>

                <td>
                  {bankDetails.accountNumber}
                </td>

                <td>
                  {bankDetails.iban}
                </td>

                <td>
                  {bankDetails.swiftCode}
                </td>

                <td>
                  {bankDetails.bankName}
                </td>

              </tr>

            </tbody>

          </table>

        </section>

        {/* ====================================================
            DISCLAIMER
        ==================================================== */}

        <div className="soa-disclaimer">

          This statement shall be considered correct unless we
          are notified in writing non-receipt of any invoices
          or credit notes reflected in the statement within
          10 days from date of receipt.

        </div>

        {/* ====================================================
            FOOTER
        ==================================================== */}

        <footer className="soa-footer">

          <div>
            CARAVAN TOURS &amp; TRAVEL COMPANY
          </div>

          <div>
            VAT No. {vatNumber}
          </div>

        </footer>

      </div>

      {/* ======================================================
          COMPONENT STYLES
      ====================================================== */}

      <style>{`

        /* ====================================================
           BASE
        ==================================================== */

        * {
          box-sizing: border-box;
        }

        .soa-page-wrapper {
        // border: 1px solid #b7d7c8;
          min-height: 100vh;
          background: #eef2f5;
          padding: 24px;
          font-family:
            "Segoe UI",
            Arial,
            Helvetica,
            sans-serif;
          color: #17212b;
        }

        /* ====================================================
           TOOLBAR
        ==================================================== */

        .soa-toolbar {
          width: 210mm;
          max-width: 100%;
          margin: 0 auto 14px;

          display: flex;
          align-items: center;
          justify-content: space-between;

          padding: 9px 12px;

          background: #dff3e9;

          border: 1px solid #a7d9c0;

          border-radius: 3px;

          box-shadow:
            0 1px 2px rgba(0, 0, 0, 0.08);
        }

        .soa-toolbar-title {
          font-size: 14px;
          font-weight: 600;
          color: #184c39;
        }

        .soa-print-button {
          min-width: 85px;
          height: 32px;

          border: 1px solid #8fc7ad;
          border-radius: 3px;

          background: #ffffff;

          color: #176b48;

          font-size: 13px;

          cursor: pointer;

          transition: 0.15s ease;
        }

        .soa-print-button:hover {
          background: #edf9f3;
          border-color: #4caa7b;
        }

        /* ====================================================
           A4 DOCUMENT
        ==================================================== */

        .soa-document {
          position: relative;

          width: 210mm;
          min-height: 297mm;

          margin: 0 auto;

          padding:
            11mm
            11mm
            14mm;

          background: #ffffff;

          border: 1px solid #b5c0c8;

          box-shadow:
            0 2px 10px rgba(0, 0, 0, 0.15);
        }

        /* ====================================================
           HEADER
        ==================================================== */

        .soa-header {
          position: relative;
        }

        .soa-header-top {
          min-height: 25px;

          border-top: 1px solid #b7d7c8;
          // border-bottom: 1px solid #b7d7c8;

          display: flex;
          align-items: center;
          justify-content: center;

          padding: 5px 0;
        }

        .soa-company-block {
          width: 100%;

          display: flex;
          align-items: center;
          justify-content: center;

          gap: 20px;
        }

        .soa-company-name {
          font-size: 16px;
          font-weight: 500;

          color: #111827;

          white-space: nowrap;
        }

        .soa-company-arabic {
          font-size: 15px;
          direction: rtl;

          color: #111827;

          white-space: nowrap;
        }

        /* ====================================================
           HEADER MIDDLE
        ==================================================== */

        .soa-header-middle {
          position: relative;

          min-height: 100px;

          display: grid;

          grid-template-columns:
            1fr
            110px
            1fr;

          align-items: center;

          margin-top: 3px;
        }

        .soa-logo-container {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .soa-logo {
          width: 88px;
          height: 88px;

          object-fit: contain;
        }

        .soa-vat {
          font-size: 11px;
          color: #1f3e50;
        }

        .soa-vat-left {
          text-align: left;
        }

        .soa-vat-right {
          text-align: right;
          direction: rtl;
        }

        .soa-label,
        .soa-arabic-label {
          font-weight: 500;
        }

        .soa-value {
          color: #164d72;
          margin-left: 3px;
        }

        /* ====================================================
           TITLE
        ==================================================== */

        .soa-title-section {
          text-align: center;

          margin-top: 5px;
          margin-bottom: 13px;
        }

        .soa-title-section h1 {
          margin: 0;

          font-family:
            Georgia,
            "Times New Roman",
            serif;

          font-size: 14px;

          font-weight: 500;

          color: black;

          letter-spacing: 0.1px;
        }

        .soa-period {
          margin-top: 5px;

          display: flex;
          align-items: center;
          justify-content: center;

          gap: 7px;

          // font-family:
          //   Georgia,
          //   "Times New Roman",
          //   serif;

          font-size: 13px;

          color: #1d2935;
        }

        .soa-page-number {
          position: absolute;

          right: 3px;
          bottom: -4px;

          font-size: 10px;

          color: #364552;
        }

        /* ====================================================
           INFO SECTION
        ==================================================== */

        .soa-info-section {
          display: grid;

          grid-template-columns: 1fr 0.42fr;

          border: 1px solid #39454e;

          border-bottom: none;

          min-height: 74px;
        }

        .soa-info-left {
          padding: 6px 7px;
        }

        .soa-info-right {
          padding: 6px 7px;

          border-left: 1px solid #39454e;
        }

        .soa-info-row {
          min-height: 24px;

          display: grid;

          grid-template-columns:
            104px
            13px
            1fr;

          align-items: center;

          font-size: 11px;
        }

        .soa-info-label {
          // color: #244457;
        }

        .soa-colon {
          text-align: center;
          color: #34434e;
        }

        .soa-info-row strong {
          color: #101820;
          font-weight: 600;
        }

        /* ====================================================
           MAIN TABLE
        ==================================================== */

        .soa-table-section {
          width: 100%;
        }

        .soa-table {
          width: 100%;

          border-collapse: collapse;

          table-layout: fixed;

          font-size: 9.5px;

          color: #17212b;
        }

        .soa-table th,
        .soa-table td {
          border: 1px solid black;//9bd8bd

          padding: 4px 4px;

          vertical-align: middle;
        }

        .soa-table thead th {
          height: 25px;

          // background: #e6f7ef;

          color: #173c31;

          font-weight: 600;

          text-align: center;

          white-space: nowrap;
        }

        .soa-table tbody tr {
          min-height: 23px;
        }

        .soa-table tbody td {
          height: 23px;
        }

        .soa-table tbody tr:nth-child(even) {
          background: #fbfefd;
        }

        .soa-table tbody tr:hover {
          background: #f1faf6;
        }

        .soa-table tfoot td {
          height: 25px;

          background: #f7faf9;

          font-weight: 600;

          border-top: 1px solid #35454e;
        }

        .soa-table .col-date {
          width: 9%;
        }

        .soa-table .col-branch {
          width: 6%;
        }

        .soa-table .col-type {
          width: 6%;
        }

        .soa-table .col-doc {
          width: 13%;
        }

        .soa-table .col-description {
          width: 29%;
        }

        .soa-table .col-number {
          width: 12.33%;
        }

        .description-cell {
          text-align: left;
          word-break: break-word;
        }

        .number-cell {
          text-align: right;
          white-space: nowrap;
        }

        .balance-cell {
          font-weight: 600;
        }

        .total-label {
          text-align: right;
          padding-right: 8px !important;
        }

        .total-value {
          font-weight: 700;
        }

        .soa-empty-row {
          height: 40px !important;

          text-align: center;

          color: #73808a;
        }

        /* ====================================================
           AMOUNT WORDS
        ==================================================== */

        .soa-amount-words {
          min-height: 25px;

          display: flex;
          align-items: center;

          margin-top: 2px;

          padding: 4px 3px;

          font-size: 9.5px;

          color: #25333e;
        }

        .soa-amount-words strong {
          font-weight: 500;
        }

        /* ====================================================
           BANK SECTION
        ==================================================== */

        .soa-bank-section {
          margin-top: 7px;
        }

        .soa-bank-title {
          margin-bottom: 6px;

          font-size: 10px;

          color: #173d55;
        }

        .soa-bank-table {
          width: 100%;

          border-collapse: collapse;

          table-layout: fixed;

          font-size: 9px;
        }

        .soa-bank-table th,
        .soa-bank-table td {
          border: 1px solid #f09a58;

          padding: 5px 4px;

          text-align: center;

          vertical-align: middle;
        }

        .soa-bank-table th {
          background: #E0E0E0;

          color: #274052;

          font-weight: 600;
        }

        .soa-bank-table td {
          background: #fffdfb;

          color: #182631;

          min-height: 34px;

          word-break: break-word;
        }

        .soa-bank-table th:nth-child(1) {
          width: 23%;
        }

        .soa-bank-table th:nth-child(2) {
          width: 16%;
        }

        .soa-bank-table th:nth-child(3) {
          width: 24%;
        }

        .soa-bank-table th:nth-child(4) {
          width: 13%;
        }

        .soa-bank-table th:nth-child(5) {
          width: 24%;
        }

        /* ====================================================
           DISCLAIMER
        ==================================================== */

        .soa-disclaimer {
          margin-top: 9px;

          max-width: 100%;

          font-size: 9.5px;

          line-height: 1.65;

          color: #263844;
        }

        /* ====================================================
           FOOTER
        ==================================================== */

        .soa-footer {
          display: none;
        }

        /* ====================================================
           PRINT
        ==================================================== */

        @page {
          size: A4 portrait;

          margin: 8mm;
        }

        @media print {

          html,
          body {
            width: 210mm;
            min-height: 297mm;

            margin: 0;
            padding: 0;

            background: #ffffff !important;
          }

          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .no-print {
            display: none !important;
          }

          .soa-page-wrapper {
            width: 100%;

            min-height: 0;

            margin: 0;
            padding: 0;

            background: #ffffff !important;
          }

          .soa-document {
            width: 100%;

            min-height: 0;

            margin: 0;

            padding:
              5mm
              5mm
              8mm;

            border: none;

            box-shadow: none;
          }

          .soa-table tbody tr:hover {
            background: transparent;
          }

          .soa-footer {
            display: none;
          }

          .soa-table thead {
            display: table-header-group;
          }

          .soa-table tfoot {
            display: table-row-group;
          }

          .soa-bank-section {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          .soa-disclaimer {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          .soa-info-section {
            break-inside: avoid;
            page-break-inside: avoid;
          }

        }

        /* ====================================================
           SMALL SCREEN
        ==================================================== */

        @media screen and (max-width: 900px) {

          .soa-page-wrapper {
            padding: 10px;
          }

          .soa-document {
            width: 100%;
            min-height: auto;
            overflow-x: auto;
          }

          .soa-company-block {
            flex-direction: column;
            gap: 2px;
          }

          .soa-company-name {
            font-size: 14px;
          }

          .soa-company-arabic {
            font-size: 13px;
          }

          .soa-info-section {
            grid-template-columns: 1fr;
          }

          .soa-info-right {
            border-left: none;
            border-top: 1px solid #39454e;
          }

        }

      `}</style>

    </div>
  );
};

export default StatementOfAccount;