import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import logo from "./global-network.png";

import type {
 ReceiptPrintData,
   ReceiptPrintRow,
} from "../../../../types/receiptypes";

const FIRST_PAGE_ROWS = 7;
const NEXT_PAGE_ROWS = 13;
const ROW_HEIGHT_MM = 12.7;

const formatAmount = (amount: number) =>
  Number(amount || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const splitIntoPages = (
  rows: ReceiptPrintRow[]
): ReceiptPrintRow[][] => {
  const pages: ReceiptPrintRow[][] = [
    rows.slice(0, FIRST_PAGE_ROWS),
  ];

  for (
    let index = FIRST_PAGE_ROWS;
    index < rows.length;
    index += NEXT_PAGE_ROWS
  ) {
    pages.push(rows.slice(index, index + NEXT_PAGE_ROWS));
  }

  return pages.length ? pages : [[]];
};

const getFillerHeightMm = (rowsOnPage: number) => {
  const units =
    rowsOnPage >= 1 && rowsOnPage <= 4
      ? (5 - rowsOnPage) * 50 + 10
      : 10;

  return units * 0.254;
};

const assetUrl = (fileName: string) =>
  `${import.meta.env.BASE_URL}images/${fileName}`;

const probeImage = (src: string) =>
  new Promise<boolean>((resolve) => {
    const image = new Image();

    image.onload = () => resolve(true);
    image.onerror = () => resolve(false);
    image.src = src;
  });

const OptionalImage: React.FC<{
  sources: string[];
  className: string;
}> = ({ sources, className }) => {
  const [resolved, setResolved] =
    useState<string | null | undefined>(undefined);

  const sourceKey = sources.join("|");

  useEffect(() => {
    let cancelled = false;

    const resolveSource = async () => {
      for (const source of sourceKey.split("|")) {
        if (await probeImage(source)) {
          if (!cancelled) {
            setResolved(source);
          }
          return;
        }
      }

      if (!cancelled) {
        setResolved(null);
      }
    };

    void resolveSource();

    return () => {
      cancelled = true;
    };
  }, [sourceKey]);

  if (resolved === undefined) {
    return <span data-image-pending="true" />;
  }

  if (resolved === null) {
    return null;
  }

  return (
    <img
      src={resolved}
      alt=""
      className={className}
    />
  );
};

/* =========================================================
   PAGE HEADER
========================================================= */

const PageHeader: React.FC<{
  data: ReceiptPrintData;
}> = ({ data }) => (
  <>
    <div className="receipt-company-header">
      <div className="receipt-company-left">
        <div className="receipt-company-name">
          {data.company.nameEn}
        </div>

        {data.company.addressEn.map(
          (line: string | number | bigint | boolean | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | React.ReactPortal | Promise<string | number | bigint | boolean | React.ReactPortal | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | null | undefined> | null | undefined, index: React.Key | null | undefined) => (
            <div key={index}>{line}</div>
          )
        )}
      </div>

      <div className="receipt-company-logo">
        <OptionalImage
          sources={[
            assetUrl(`Header_${data.coId}.jpg`),
            logo,
          ]}
          className="receipt-logo"
        />
      </div>

      <div className="receipt-company-right">
        <div className="receipt-company-name">
          {data.company.nameAr}
        </div>

        {data.company.addressAr.map(
          (line: string | number | bigint | boolean | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | React.ReactPortal | Promise<string | number | bigint | boolean | React.ReactPortal | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | null | undefined> | null | undefined, index: React.Key | null | undefined) => (
            <div key={index}>{line}</div>
          )
        )}
      </div>
    </div>

    <div className="receipt-title">
      {data.heading}
    </div>
  </>
);

/* =========================================================
   RECEIPT DETAILS BOX
========================================================= */

const InfoBox: React.FC<{
  data: ReceiptPrintData;
}> = ({ data }) => (
  <div className="receipt-info">
    <div className="receipt-info-top">
      <div className="receipt-info-left">
        <div className="receipt-info-row">
          <span className="receipt-label">
            Received With thanks From
          </span>

          <span className="receipt-colon">:</span>

          <strong>
            {data.receivedFrom}
          </strong>
        </div>
      </div>

      <div className="receipt-info-right">
        <div className="receipt-info-row">
          <span className="receipt-label">
            Receipt No.
          </span>

          <span className="receipt-colon">:</span>

          <span className="receipt-docno">
            {data.docNo}
          </span>
        </div>

        <div className="receipt-info-row">
          <span className="receipt-label">
            Date
          </span>

          <span className="receipt-colon">:</span>

          <span>{data.date}</span>
        </div>

        <div className="receipt-info-row">
          <span className="receipt-label">
            Reference
          </span>

          <span className="receipt-colon">:</span>

          <span>{data.reference}</span>
        </div>

        <div className="receipt-info-row">
          <span className="receipt-label">
            FOP
          </span>

          <span className="receipt-colon">:</span>

          <span>{data.fop}</span>
        </div>
      </div>
    </div>

    <div className="receipt-info-bottom">
      <div className="receipt-info-row receipt-info-row-wide">
        <span className="receipt-label">
          Currency
        </span>

        <span className="receipt-colon">:</span>

        <span>{data.currency}</span>
      </div>

      <div className="receipt-info-row receipt-info-row-wide">
        <span className="receipt-label">
          Amount In Figures
        </span>

        <span className="receipt-colon">:</span>

        <span>
          {formatAmount(data.total)}
        </span>
      </div>

      <div className="receipt-info-row receipt-info-row-wide">
        <span className="receipt-label">
          Amount In Words
        </span>

        <span className="receipt-colon">:</span>

        <span>
          ({data.currency} :{" "}
          {data.amountInWords})
        </span>
      </div>

      <div className="receipt-info-row receipt-info-row-wide receipt-info-description">
        <span className="receipt-label">
          Description
        </span>

        <span className="receipt-colon">:</span>

        <span>{data.note}</span>
      </div>
    </div>
  </div>
);

/* =========================================================
   RECEIPT PRINT
========================================================= */

interface ReceiptPrintProps {
  data: ReceiptPrintData;
  onPrintComplete?: () => void;
}

const ReceiptPrint: React.FC<
  ReceiptPrintProps
> = ({ data, onPrintComplete }) => {
  const pages = splitIntoPages(data.rows);

  /*
   * Browser HTML printing.
   * The receipt component is rendered as a sibling of the
   * normal application screen, so only the receipt is printed.
   */
  useEffect(() => {
    const printTimer = window.setTimeout(() => {
      window.print();
    }, 350);

    const handleAfterPrint = () => {
      onPrintComplete?.();
    };

    window.addEventListener(
      "afterprint",
      handleAfterPrint
    );

    return () => {
      window.clearTimeout(printTimer);
      window.removeEventListener(
        "afterprint",
        handleAfterPrint
      );
    };
  }, [onPrintComplete]);

  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div className="receipt-print-root">
      <div className="receipt-doc">
        {pages.map(
          (pageRows, pageIndex) => {
            const isFirstPage =
              pageIndex === 0;

            const isLastPage =
              pageIndex === pages.length - 1;

            return (
              <section
                className="receipt-page"
                key={pageIndex}
              >
                <PageHeader data={data} />

                {isFirstPage && (
                  <InfoBox data={data} />
                )}

                <table
                  className={
                    isFirstPage
                      ? "receipt-lines receipt-lines-first"
                      : "receipt-lines"
                  }
                >
                  <colgroup>
                    <col
                      style={{
                        width: "17.6%",
                      }}
                    />

                    <col
                      style={{
                        width: "62.9%",
                      }}
                    />

                    <col
                      style={{
                        width: "19.5%",
                      }}
                    />
                  </colgroup>

                  {isFirstPage && (
                    <thead>
                      <tr>
                        <th>Account ID</th>

                        <th>
                          Account Name / Description
                        </th>

                        <th className="receipt-right">
                          Credit Amount
                        </th>
                      </tr>
                    </thead>
                  )}

                  <tbody>
                    {pageRows.map(
                      (row, index) => (
                        <tr
                          className="receipt-row"
                          key={`${row.slNo}-${index}`}
                          style={{
                            height: `${ROW_HEIGHT_MM}mm`,
                          }}
                        >
                          <td>
                            {row.accountId}
                          </td>

                          <td>
                            <div className="receipt-account-name">
                              {row.accountName}
                            </div>

                            {row.description && (
                              <div className="receipt-line-description">
                                {row.description}
                              </div>
                            )}
                          </td>

                          <td className="receipt-right">
                            {formatAmount(
                              row.amount
                            )}
                          </td>
                        </tr>
                      )
                    )}

                    {isLastPage && (
                      <tr
                        className="receipt-filler"
                        style={{
                          height: `${getFillerHeightMm(
                            pageRows.length
                          )}mm`,
                        }}
                      >
                        <td />
                        <td />
                        <td />
                      </tr>
                    )}
                  </tbody>

                  {isLastPage && (
                    <tfoot>
                      <tr>
                        <td
                          colSpan={2}
                          className="receipt-right receipt-total-cell"
                        >
                          Total :
                        </td>

                        <td className="receipt-right receipt-total-cell">
                          {formatAmount(
                            data.total
                          )}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>

                {isLastPage && (
                  <div className="receipt-signoff">
                    <div>
                      <div>
                        Prepared By :{" "}
                        <span>
                          {data.preparedBy}
                        </span>
                      </div>

                      <div className="receipt-prepared-date">
                        {data.preparedDate}
                      </div>
                    </div>

                    <div>
                      Checked By :
                    </div>

                    <div>
                      Approved By :
                    </div>
                  </div>
                )}

                <OptionalImage
                  sources={[
                    assetUrl("Footer.jpg"),
                  ]}
                  className="receipt-footer-image"
                />
              </section>
            );
          }
        )}
      </div>

      <style>{`
        /* =================================================
           BROWSER PAGE
        ================================================= */

        @page {
          size: A4;
          margin: 5mm 7.5mm 0 12mm;
        }

        @media screen {
          .receipt-print-root {
            position: fixed;
            inset: 0;
            z-index: 99999;
            overflow: auto;
            background: #ffffff;
          }

          .receipt-doc {
            margin: 0 auto;
          }
        }

        @media print {
          html,
          body {
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            min-height: 0 !important;
            background: #ffffff !important;
          }

          /* Hide the normal receipt-entry screen. */
          .receipt-screen {
            display: none !important;
          }

          /*
           * The print component is a sibling of .receipt-screen.
           * Force it out of the application's flex layout and make
           * it the printable page itself.
           */
          .receipt-print-root {
            display: block !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            min-width: 0 !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            visibility: visible !important;
            background: #ffffff !important;
            z-index: 2147483647 !important;
          }

          .receipt-print-root * {
            visibility: visible !important;
          }

          .receipt-doc {
            display: block !important;
            width: 190.5mm !important;
            margin: 0 auto !important;
          }
        }

        /* =================================================
           RECEIPT DOCUMENT
        ================================================= */

        .receipt-doc {
          width: 190.5mm;
          color: #000000;
          background: #ffffff;
          font-family: "Times New Roman",
            Times, serif;
          font-size: 10pt;
          line-height: 1.3;
        }

        .receipt-doc * {
          box-sizing: border-box;
        }

        .receipt-page {
          position: relative;
          width: 190.5mm;
          min-height: 288mm;
          break-after: page;
          page-break-after: always;
        }

        .receipt-page:last-of-type {
          break-after: auto;
          page-break-after: auto;
        }

        /* =================================================
           COMPANY HEADER
        ================================================= */

        .receipt-company-header {
          display: grid;
          grid-template-columns:
            minmax(0, 1fr)
            39mm
            minmax(0, 1fr);

          column-gap: 2mm;

          min-height: 47mm;

          padding: 2mm 0 0;

          border-top: 0.5pt solid #b5b5b5;

          font-family:
            "Segoe UI",
            Tahoma,
            Arial,
            sans-serif;

          font-size: 8.75pt;
          line-height: 1.45;

          white-space: nowrap;
        }

        .receipt-company-name {
          font-size: 12.5pt;
          line-height: 1.3;
          white-space: nowrap;
        }

        .receipt-company-right {
          direction: rtl;
          text-align: right;
        }

        .receipt-company-logo {
          display: flex;
          justify-content: center;
          align-items: flex-start;
          padding-top: 6mm;
        }

        .receipt-logo {
          width: 39mm;
          height: 35.6mm;
          object-fit: contain;
        }

        /* =================================================
           HEADING
        ================================================= */

        .receipt-title {
          height: 17.8mm;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 15pt;
        }

        /* =================================================
           DETAILS BOX
        ================================================= */

        .receipt-info {
          min-height: 78mm;
          padding: 1.5mm 2mm;
          border: 0.75pt solid #000000;
          border-bottom: 0;
        }

        .receipt-info-top {
          display: grid;
          grid-template-columns: 1fr 40%;
          min-height: 29mm;
        }

        .receipt-info-row {
          display: grid;
          grid-template-columns:
            42mm 4mm 1fr;

          min-height: 6.35mm;
          align-items: start;
          line-height: 1.3;
        }

        .receipt-info-right
          .receipt-info-row {
          grid-template-columns:
            21mm 4mm 1fr;
        }

        .receipt-info-bottom {
          padding-top: 1.5mm;
        }

        .receipt-info-bottom
          .receipt-info-row {
          min-height: 7.5mm;
        }

        .receipt-info-description {
          min-height: 27mm;
        }

        .receipt-label {
          white-space: nowrap;
        }

        .receipt-colon {
          text-align: center;
        }

        .receipt-docno {
          font-size: 13pt;
          line-height: 1.1;
        }

        .receipt-info-row > span:last-child,
        .receipt-info-row > strong {
          min-width: 0;
          overflow-wrap: anywhere;
        }

        /* =================================================
           TRANSACTION TABLE

           IMPORTANT:
           No horizontal border is applied to data rows.
           Only the outside border, header separator and
           total separator are shown.
        ================================================= */

        .receipt-lines {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
          border: 0.75pt solid #000000;
        }

        .receipt-lines th,
        .receipt-lines td {
          padding: 0.6mm 2mm 0;
          vertical-align: top;
          overflow-wrap: anywhere;
        }

        .receipt-lines th + th,
        .receipt-lines td + td {
          border-left: 0.5pt solid #000000;
        }

        .receipt-lines th {
          height: 7mm;
          font-weight: normal;
          text-align: left;
          vertical-align: middle;
          border-bottom: 0.5pt solid #000000;
        }

        /*
         * Data rows:
         * no horizontal border between rows.
         */
        .receipt-lines tbody tr.receipt-row td {
          border-top: 0 !important;
          border-bottom: 0 !important;
        }

        .receipt-right {
          text-align: right !important;
        }

        .receipt-account-name,
        .receipt-line-description {
          min-height: 6.35mm;
          line-height: 1.3;
        }

        .receipt-line-description {
          margin-top: 0;
        }

        .receipt-lines tfoot td {
          height: 7mm;
          vertical-align: middle;
          border-top: 0.5pt solid #000000;
          font-family:
            "Segoe UI",
            Tahoma,
            Arial,
            sans-serif;
          font-size: 10pt;
        }

        .receipt-total-cell {
          padding-top: 0 !important;
          padding-bottom: 0 !important;
        }

        /* =================================================
           PREPARED / CHECKED / APPROVED
        ================================================= */

        .receipt-signoff {
          display: grid;
          grid-template-columns:
            1fr 1fr 1fr;

          min-height: 21mm;

          padding:
            8mm 2mm 2mm;

          border: 0.75pt solid #000000;
          border-top: 0;

          font-family:
            "Segoe UI",
            Tahoma,
            Arial,
            sans-serif;

          font-size: 9pt;
        }

        .receipt-prepared-date {
          margin-top: 2.5mm;
          padding-left: 0;
        }

        /* =================================================
           FOOTER IMAGE
        ================================================= */

        .receipt-footer-image {
          position: absolute;
          left: 0;
          bottom: 0;
          width: 190.5mm;
          height: 11.85mm;
          object-fit: contain;
        }

        /* =================================================
           PRINT SAFETY
        ================================================= */

        @media print {
          .receipt-page {
            break-inside: avoid;
          }

          .receipt-company-header,
          .receipt-info,
          .receipt-lines,
          .receipt-signoff {
            break-inside: avoid;
          }
        }
      `}</style>
    </div>,
    document.body
  );
};

export default ReceiptPrint;
