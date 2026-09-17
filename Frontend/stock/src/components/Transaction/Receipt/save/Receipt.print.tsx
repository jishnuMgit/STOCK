import React from "react";

import logo from './global-network.png'

/* =========================================================
   TYPES
========================================================= */

interface ReceiptTransaction {
  accountId: string;
  accountName: string;
  description: string;
  creditAmount: number;
}

interface ReceiptPrintProps {
  receivedFrom?: string;
  receiptNo?: string;
  date?: string;
  reference?: string;
  fop?: string;
  currency?: string;
  amountInFigures?: number;
  amountInWords?: string;
  description?: string;
  transactions?: ReceiptTransaction[];
  preparedBy?: string;
  preparedDate?: string;
  checkedBy?: string;
  approvedBy?: string;
}

/* =========================================================
   DUMMY DATA
========================================================= */

const dummyTransactions: ReceiptTransaction[] = [
  {
    accountId: "21001",
    accountName: "CASH SALES",
    description:
      "INV-2026-0045 PAYMENT RECEIVED FROM ALI HASSAN AHMED",
    creditAmount: 1250,
  },
];

/* =========================================================
   RECEIPT PRINT
========================================================= */

const ReceiptPrint: React.FC<
  ReceiptPrintProps
> = ({
  receivedFrom = "ALI HASSAN AHMED",

  receiptNo = "RC202600145",

  date = "16-Sep-2026",

  reference = "REF/2026/0916/045",

  fop = "SAUDI NATIONAL BANK - SNB",

  currency = "SAR",

  amountInFigures = 1250,

  amountInWords =
    "SAR: ONE THOUSAND TWO HUNDRED FIFTY ONLY",

  description =
    "PAYMENT AGAINST INVOICE INV-2026-0045",

  transactions = dummyTransactions,

  preparedBy = "MOHAMMED",

  preparedDate = "16/09/2026 16:29",

  checkedBy = "",

  approvedBy = "",
}) => {
  /* =======================================================
     TOTAL
  ======================================================= */

  const total = transactions.reduce(
    (sum, transaction) =>
      sum +
      Number(
        transaction.creditAmount
      || 0),
    0
  );

  /* =======================================================
     FORMAT AMOUNT
  ======================================================= */

  const formatAmount = (
    amount: number
  ) => {
    return Number(amount || 0).toLocaleString(
      "en-US",
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }
    );
  };

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="receipt-print-page">
      {/* =================================================
          PRINT CONTAINER
      ================================================= */}

      <div className="receipt-print-container">

        {/* =================================================
            COMPANY HEADER
        ================================================= */}

        <div className="receipt-company-header">

          {/* LEFT */}
          <div className="receipt-company-left">
            <div className="receipt-company-name">
              CARAVAN TOURS &amp; TRAVEL COMPANY
            </div>

            <div>
              8442, AL MADINAH AL MUNAWARAH ROAD
            </div>

            <div>
              Postal Code : 23526, AL MINA DISTRICT, JEDDAH
            </div>

            <div>
              KINGDOM OF SAUDI ARABIA - CR No: 4030130099
            </div>

            <div>
              VAT Number: 500021746600003
            </div>

            <div>
              Telephone: +966 126060018
            </div>
          </div>

          {/* CENTER LOGO */}
          <div className="receipt-company-logo">

            <img
              src={logo}
              alt="Caravan Logo"
              className="receipt-logo"
            />

            <div className="receipt-logo-text">
              CARAVAN
            </div>

            <div className="receipt-logo-subtext">
              TOURS &amp; TRAVEL
            </div>

          </div>

          {/* RIGHT */}
          <div className="receipt-company-right">

            <div className="receipt-arabic-company">
              شركة القافلة للسياحة والسفر (سفريات القافلة)
            </div>

            <div>
              طريق المدينة المنورة، جدة 23526
            </div>

            <div>
              السجل التجاري: 4030130099
            </div>

            <div>
              الرقم الضريبي: 500021746600003
            </div>

            <div>
              هاتف: 00966126060018
            </div>

          </div>

        </div>

        {/* =================================================
            TITLE
        ================================================= */}

        <div className="receipt-title">
          BANK RECEIPT
        </div>

        {/* =================================================
            RECEIPT INFORMATION
        ================================================= */}

        <div className="receipt-info-box">

          {/* LEFT SIDE */}
          <div className="receipt-info-left">

            <div className="receipt-info-row">
              <span className="receipt-label">
                Received With thanks From
              </span>

              <span className="receipt-colon">
                :
              </span>

              <strong>
                {receivedFrom}
              </strong>
            </div>

            <div className="receipt-info-row">
              <span className="receipt-label">
                Currency
              </span>

              <span className="receipt-colon">
                :
              </span>

              <span>
                {currency}
              </span>
            </div>

            <div className="receipt-info-row">
              <span className="receipt-label">
                Amount In Figures
              </span>

              <span className="receipt-colon">
                :
              </span>

              <span>
                {formatAmount(
                  amountInFigures
                )}
              </span>
            </div>

            <div className="receipt-info-row">
              <span className="receipt-label">
                Amount In Words
              </span>

              <span className="receipt-colon">
                :
              </span>

              <span>
                ({currency}:{" "}
                {amountInWords})
              </span>
            </div>

            <div className="receipt-info-row receipt-description-row">
              <span className="receipt-label">
                Description
              </span>

              <span className="receipt-colon">
                :
              </span>

              <span>
                {description}
              </span>
            </div>

          </div>

          {/* RIGHT SIDE */}
          <div className="receipt-info-right">

            <div className="receipt-info-row">
              <span className="receipt-label">
                Receipt No.
              </span>

              <span className="receipt-colon">
                :
              </span>

              <span>
                {receiptNo}
              </span>
            </div>

            <div className="receipt-info-row">
              <span className="receipt-label">
                Date
              </span>

              <span className="receipt-colon">
                :
              </span>

              <span>
                {date}
              </span>
            </div>

            <div className="receipt-info-row">
              <span className="receipt-label">
                Reference
              </span>

              <span className="receipt-colon">
                :
              </span>

              <span>
                {reference}
              </span>
            </div>

            <div className="receipt-info-row">
              <span className="receipt-label">
                FOP
              </span>

              <span className="receipt-colon">
                :
              </span>

              <span>
                {fop}
                <br />
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                CVN
              </span>
            </div>

          </div>

        </div>

        {/* =================================================
            TRANSACTION TABLE
        ================================================= */}

        <table className="receipt-transaction-table">

          <colgroup>
            <col className="receipt-account-id-column" />
            <col className="receipt-account-name-column" />
            <col className="receipt-credit-column" />
          </colgroup>

          <thead>
            <tr>
              <th>
                Account ID
              </th>

              <th>
                Account Name / Description
              </th>

              <th>
                Credit Amount
              </th>
            </tr>
          </thead>

          <tbody>

            {transactions.map(
              (
                transaction,
                index
              ) => (
                <tr
                  key={`${transaction.accountId}-${index}`}
                  className="receipt-transaction-row"
                >

                  {/* ACCOUNT ID */}
                  <td className="receipt-account-id">
                    {transaction.accountId}
                  </td>

                  {/* ACCOUNT NAME + DESCRIPTION */}
                  <td className="receipt-account-description">

                    <div className="receipt-account-name">
                      {transaction.accountName}
                    </div>

                    <div className="receipt-line-description">
                      {transaction.description}
                    </div>

                  </td>

                  {/* CREDIT */}
                  <td className="receipt-credit-amount">
                    {formatAmount(
                      transaction.creditAmount
                    )}
                  </td>

                </tr>
              )
            )}

          </tbody>

          {/* TOTAL */}
          <tfoot>

            <tr>

              <td
                colSpan={2}
                className="receipt-total-label"
              >
                Total :
              </td>

              <td className="receipt-total-amount">
                {formatAmount(total)}
              </td>

            </tr>

          </tfoot>

        </table>

        {/* =================================================
            APPROVAL / SIGNATURE AREA
        ================================================= */}

        <div className="receipt-footer">

          <div className="receipt-footer-column">

            <div>
              Prepared By :
              <span className="receipt-footer-value">
                {preparedBy}
              </span>
            </div>

            <div className="receipt-prepared-date">
              {preparedDate}
            </div>

          </div>

          <div className="receipt-footer-column">
            <div>
              Checked By :
              <span className="receipt-footer-value">
                {checkedBy}
              </span>
            </div>
          </div>

          <div className="receipt-footer-column">
            <div>
              Approved By :
              <span className="receipt-footer-value">
                {approvedBy}
              </span>
            </div>
          </div>

        </div>

      </div>

      {/* ===================================================
          PRINT CSS
      =================================================== */}

      <style>
        {`

          /* ===============================================
             PAGE
          =============================================== */

          @page {
            size: A4;
            margin: 10mm;
          }

          * {
            box-sizing: border-box;
          }

          .receipt-print-page {
            width: 100%;
            min-height: 100vh;
            background: #ffffff;
            color: #000000;
            font-family:
              Arial,
              Helvetica,
              sans-serif;
            font-size: 10px;
          }

          .receipt-print-container {
            width: 100%;
            max-width: 760px;
            margin: 0 auto;
            background: #ffffff;
          }

          /* ===============================================
             COMPANY HEADER
          =============================================== */

          .receipt-company-header {
            width: 100%;
            display: grid;
            grid-template-columns:
              1fr
              145px
              1fr;

            min-height: 115px;

            border-top:
              1px solid #b5b5b5;

            padding:
              6px
              4px
              4px
              4px;

            font-size: 8px;
            line-height: 12px;

            align-items: start;
          }

          .receipt-company-left {
            text-align: left;
          }

          .receipt-company-name {
            font-size: 13px;
            line-height: 16px;
            margin-bottom: 2px;
          }

          .receipt-company-logo {
            text-align: center;
            min-height: 100px;
            padding-top: 2px;
          }

          .receipt-logo {
            width: 72px;
            height: 72px;
            object-fit: contain;
            display: block;
            margin:
              0 auto
              2px;
          }

          .receipt-logo-text {
            font-size: 10px;
            font-weight: bold;
            line-height: 10px;
          }

          .receipt-logo-subtext {
            font-size: 6px;
            line-height: 8px;
          }

          .receipt-company-right {
            text-align: right;
            direction: rtl;
          }

          .receipt-arabic-company {
            font-size: 11px;
            line-height: 15px;
            margin-bottom: 2px;
          }

          /* ===============================================
             TITLE
          =============================================== */

          .receipt-title {
            width: 100%;
            text-align: center;

            font-size: 16px;
            font-weight: normal;

            margin-top: 4px;
            margin-bottom: 18px;
          }

          /* ===============================================
             RECEIPT INFO
          =============================================== */

          .receipt-info-box {
            width: 100%;

            min-height: 215px;

            border:
              1px solid #000000;

            display: grid;

            grid-template-columns:
              58%
              42%;

            padding:
              7px
              7px
              10px
              7px;

            font-size: 8.5px;
            line-height: 13px;
          }

          .receipt-info-left,
          .receipt-info-right {
            min-width: 0;
          }

          .receipt-info-right {
            padding-left: 4px;
          }

          .receipt-info-row {
            display: grid;

            grid-template-columns:
              112px
              8px
              1fr;

            min-height: 18px;

            align-items: start;
          }

          .receipt-info-right
          .receipt-info-row {
            grid-template-columns:
              60px
              8px
              1fr;
          }

          .receipt-label {
            white-space: nowrap;
          }

          .receipt-colon {
            text-align: center;
          }

          .receipt-description-row {
            margin-top: 4px;
          }

          /* ===============================================
             TRANSACTION TABLE
          =============================================== */

          .receipt-transaction-table {
            width: 100%;

            border-collapse:
              collapse;

            table-layout:
              fixed;

            font-size: 8.5px;
          }

          .receipt-transaction-table th,
          .receipt-transaction-table td {
            border:
              1px solid #000000;

            padding:
              4px
              5px;

            vertical-align: top;
          }

          .receipt-transaction-table th {
            height: 25px;

            font-weight: normal;

            text-align: left;
          }

          .receipt-transaction-table th:last-child {
            text-align: right;
          }

          .receipt-account-id-column {
            width: 17%;
          }

          .receipt-account-name-column {
            width: 63%;
          }

          .receipt-credit-column {
            width: 20%;
          }

          .receipt-transaction-row {
            height: 205px;
          }

          .receipt-account-id {
            vertical-align: top;
          }

          .receipt-account-description {
            vertical-align: top;
          }

          .receipt-account-name {
            font-weight: normal;
            margin-bottom: 12px;
          }

          .receipt-line-description {
            line-height: 13px;
          }

          .receipt-credit-amount {
            text-align: right;
            font-weight: normal;
          }

          /* ===============================================
             TOTAL
          =============================================== */

          .receipt-transaction-table tfoot tr {
            height: 24px;
          }

          .receipt-total-label {
            text-align: right;

            vertical-align: middle !important;

            padding-right: 6px !important;
          }

          .receipt-total-amount {
            text-align: right;

            vertical-align: middle !important;

            font-weight: normal;
          }

          /* ===============================================
             FOOTER
          =============================================== */

          .receipt-footer {
            width: 100%;

            height: 75px;

            border:
              1px solid #000000;

            border-top:
              0;

            display: grid;

            grid-template-columns:
              1.4fr
              1fr
              1fr;

            padding:
              24px
              7px
              5px
              7px;

            font-size: 8.5px;
          }

          .receipt-footer-column {
            text-align: left;
          }

          .receipt-footer-value {
            margin-left: 4px;
          }

          .receipt-prepared-date {
            margin-top: 8px;
            margin-left: 58px;
          }

          /* ===============================================
             PRINT
          =============================================== */

          @media print {

            html,
            body {
              width: 210mm;
              min-height: 297mm;

              margin: 0;
              padding: 0;

              background:
                #ffffff;
            }

            .receipt-print-page {
              width: 100%;
              min-height: auto;

              background:
                #ffffff;
            }

            .receipt-print-container {
              width: 100%;
              max-width: none;

              margin: 0;
            }

            .receipt-company-header {
              break-inside:
                avoid;
            }

            .receipt-info-box {
              break-inside:
                avoid;
            }

            .receipt-transaction-table {
              break-inside:
                avoid;
            }

            .receipt-footer {
              break-inside:
                avoid;
            }

          }

        `}
      </style>
    </div>
  );
};

export default ReceiptPrint;