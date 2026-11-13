import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "react-toastify";
import logo from "./global-network.png";
import { saveFile } from "../../../../pages/Finance/Report/ChartOfAccount/saveFile";

import type {
 ReceiptPrintData,
   ReceiptPrintRow,
} from "../../../../types/receiptypes";

const FIRST_PAGE_ROWS = 7;
const NEXT_PAGE_ROWS = 13;
const ROW_HEIGHT_MM = 12.7;

/*
 * Pagination works in "text lines". A normal row (account name +
 * one description line) is 2 lines and is exactly ROW_HEIGHT_MM.
 * A row whose text wraps costs more lines, so a page never
 * overflows into a blank/extra page.
 */
const LINES_PER_ROW = 2;
const FIRST_PAGE_LINES = FIRST_PAGE_ROWS * LINES_PER_ROW;
const NEXT_PAGE_LINES = NEXT_PAGE_ROWS * LINES_PER_ROW;
const LINE_HEIGHT_MM = ROW_HEIGHT_MM / LINES_PER_ROW;
const CHARS_PER_LINE = 70;

const formatAmount = (amount: number) =>
  Number(amount || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const wrappedLines = (value: string) =>
  String(value || "")
    .split(/\r?\n/)
    .reduce(
      (sum, part) =>
        sum + Math.max(1, Math.ceil(part.length / CHARS_PER_LINE)),
      0
    );

const rowLines = (row: ReceiptPrintRow) =>
  Math.max(
    LINES_PER_ROW,
    wrappedLines(row.accountName) +
      (row.description ? wrappedLines(row.description) : 1)
  );

const rowHeightMm = (row: ReceiptPrintRow) =>
  rowLines(row) * LINE_HEIGHT_MM;

const splitIntoPages = (
  rows: ReceiptPrintRow[]
): ReceiptPrintRow[][] => {
  const pages: ReceiptPrintRow[][] = [[]];
  let used = 0;
  let capacity = FIRST_PAGE_LINES;

  for (const row of rows) {
    const cost = rowLines(row);
    const current = pages[pages.length - 1];

    if (current.length > 0 && used + cost > capacity) {
      pages.push([]);
      used = 0;
      capacity = NEXT_PAGE_LINES;
    }

    pages[pages.length - 1].push(row);
    used += cost;
  }

  return pages;
};

const getFillerHeightMm = (rowsOnPage: number) => {
  const units =
    rowsOnPage >= 1 && rowsOnPage <= 4
      ? (5 - rowsOnPage) * 50 + 10
      : 10;

  return units * 0.254;
};

const assetUrl = (fileName: string) =>
  `${import.meta.env.VITE_API_URL}images/${fileName}`;

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
          (line: string, index: number) => (
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
          (line: string, index: number) => (
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
          Note
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
  fileBase: string;
  buildPdf: (previewRoot: HTMLElement) => Promise<Blob>;
  fetchExcel: () => Promise<Blob | null>;
  onClose: () => void;
}

const ReceiptPrint: React.FC<ReceiptPrintProps> = ({
  data,
  fileBase,
  buildPdf,
  fetchExcel,
  onClose,
}) => {
  const pages = splitIntoPages(data.rows);

  const frameRef = useRef<HTMLIFrameElement>(null);
  const downloading = useRef(false);
  const [fileFormat, setFileFormat] = useState<"Excel" | "PDF">("Excel");
  const [busy, setBusy] = useState(false);
  const [mountNode, setMountNode] =
    useState<HTMLElement | null>(null);

  // Create an isolated document inside the iframe. This prevents
  // the application's header, sidebar and other layout from printing.
  useEffect(() => {
    const frame = frameRef.current;
    const frameDoc = frame?.contentDocument;

    if (!frame || !frameDoc) return;

    frameDoc.open();
    frameDoc.write(
      "<!doctype html><html><head><meta charset=\"utf-8\" />" +
        "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\" />" +
        "<title>Receipt Preview</title></head><body></body></html>"
    );
    frameDoc.close();

    setMountNode(frameDoc.body);

    return () => {
      setMountNode(null);
    };
  }, []);

  const handlePrint = async () => {
    const frameWindow = frameRef.current?.contentWindow;

    if (!frameWindow) return;

    await waitForPreviewImages();

    frameWindow.focus();
    frameWindow.print();
  };

  const waitForPreviewImages = async () => {
    const frameDoc = frameRef.current?.contentDocument;
    if (!frameDoc) throw new Error("The receipt preview is not ready.");

    await new Promise<void>((resolve) => {
      let attempts = 0;
      const timer = window.setInterval(() => {
        attempts += 1;

        const imagePending =
          frameDoc.querySelector("[data-image-pending]") !== null ||
          Array.from(frameDoc.images).some((image) => !image.complete);

        if ((!imagePending && attempts >= 3) || attempts >= 50) {
          window.clearInterval(timer);
          resolve();
        }
      }, 100);
    });
  };

  const handleDownload = async () => {
    if (busy || downloading.current) return;
    downloading.current = true;
    setBusy(true);

    try {
      const isPdf = fileFormat === "PDF";
      let blob: Blob | null;
      if (isPdf) {
        await waitForPreviewImages();
        const previewRoot =
          frameRef.current?.contentDocument?.querySelector<HTMLElement>(
            ".receipt-preview-root",
          );
        if (!previewRoot) {
          throw new Error("The receipt preview is not ready for PDF export.");
        }
        blob = await buildPdf(previewRoot);
      } else {
        blob = await fetchExcel();
      }
      if (!blob) return;

      const kind = isPdf ? "pdf" : "xlsx";
      const saved = await saveFile(blob, `${fileBase}.${kind}`, kind);
      if (saved) {
        toast.success(isPdf ? "PDF file downloaded" : "Excel file downloaded");
        onClose();
      }
    } catch (error) {
      console.error("Receipt download error:", error);
      toast.error(
        fileFormat === "PDF"
          ? "Could not create the PDF file."
          : "Could not create the Excel file.",
      );
    } finally {
      downloading.current = false;
      setBusy(false);
    }
  };

  return (
    <div
      className="receipt-preview-overlay"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        background: "rgba(0, 0, 0, 0.45)",
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Receipt Print Preview"
        style={{
          display: "flex",
          flexDirection: "column",
          width: "min(1100px, 96vw)",
          height: "min(850px, 90vh)",
          overflow: "hidden",
          border: "1px solid #9ca3af",
          background: "#ffffff",
          boxShadow: "0 20px 50px rgba(0, 0, 0, 0.3)",
        }}
      >
        <header className="relative flex h-8.25 items-center bg-[#9fdfbc] text-gray-800">
      <h1 className="ml-4 text-[17px] font-semibold">
        Receipt Print Preview
      </h1>
   </header >
      <iframe
        ref={frameRef}
        title="receipt-preview"
        className="receipt-preview-frame"
        style={{
          display: "block",
          flex: 1,
          width: "100%",
          minHeight: 0,
          border: 0,
          background: "#60656a",
        }}
      >
        {mountNode &&
          createPortal(
            <div className="receipt-preview-root">
              <div className="receipt-doc">
        {pages.map(
          (pageRows, pageIndex) => {
            const isFirstPage =
              pageIndex === 0;

            const isLastPage =
              pageIndex === pages.length - 1;

            return (
              <div
                className="receipt-preview-sheet"
                key={pageIndex}
              >
                <section className="receipt-page">
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
      <th>
        <span className="receipt-th-label">
          Account ID
        </span>
      </th>

      <th>
        <span className="receipt-th-label">
          Account Name / Description
        </span>
      </th>

      <th>
        <span className="receipt-th-label receipt-th-label-right">
          Credit Amount
        </span>
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
                            height: `${rowHeightMm(row)}mm`,
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
                          className="receipt-right receipt-total-cell "
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
              </div>
            );
          }
        )}
      </div>
      

      <style>{`
        /* =================================================
           BROWSER PAGE (isolated print iframe)

           A4 = 210 x 297 mm.
           Printable width = 210 - 12 - 7.5 = 190.5 mm.
        ================================================= */

        @page {
          size: A4;
          margin: 5mm 7.5mm 0 12mm;
        }

        html,
        body {
          width: 100%;
          min-height: 100%;
          margin: 0;
          padding: 0;
          background: white;
        }

        body {
          min-height: 100vh;
          overflow: auto;
          display: flex;
          justify-content: center;
        }

        /* =================================================
           PREVIEW WORKSPACE AND A4 PAPER
        ================================================= */

        .receipt-preview-root {
          display: block;
          width: 210mm;
          margin: 0;
          padding: 16px 0 24px;
          zoom: min(1, calc((100vw - 32px) / 793.7px));
        }

        .receipt-preview-sheet {
          position: relative;
          width: 210mm;
          height: 297mm;
          margin: 0 auto 14px;
          overflow: hidden;
          background: #ffffff;
          border: 0.25mm solid #42464a;
          box-shadow: 0 1px 8px rgba(0, 0, 0, 0.35);
          break-after: page;
          page-break-after: always;
        }

        .receipt-preview-sheet:last-child {
          break-after: auto;
          page-break-after: auto;
        }

        /* =================================================
           RECEIPT DOCUMENT
        ================================================= */

        .receipt-doc {
          width: 210mm;
          color: #000000;
          background: transparent;
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
          margin: 5mm 0 0 12mm;
          break-after: auto;
          page-break-after: auto;
        }

        .receipt-preview-sheet .receipt-page:last-of-type {
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
          border: 0.25pt solid #000000;
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
          border: 0.25pt solid #000000;
        }

        .receipt-lines th,
        .receipt-lines td {
          padding: 0.6mm 2mm 0;
          vertical-align: top;
          overflow-wrap: anywhere;
        }

        .receipt-lines th + th,
        .receipt-lines td + td {
          border-left: 0.25pt solid #000000;
        }

  .receipt-lines thead tr {
  height: 7mm;
}

.receipt-lines thead th {
  position: relative;
  height: 7mm;
  padding: 0 !important;
  font-weight: normal;
  vertical-align: middle;
  border-bottom: 0.25pt solid #000000;
}


/* Precisely position heading text */
.receipt-th-label {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 2mm;
  right: 2mm;

  display: flex;
  align-items: center;
  justify-content: flex-start;

  line-height: 1.2;
  white-space: nowrap;
  text-align: left;
}

.receipt-th-label-right {
  justify-content: flex-end;
  text-align: right;
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
          border-top: 0.25pt solid #000000;
          font-family:
            "Segoe UI",
            Tahoma,
            Arial,
            sans-serif;
          font-size: 10pt;
        }

        // .receipt-total-cell {
        //   padding-top: 0 !important;
        //   padding-bottom: 0 !important;
        // }

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

          border: 0.25pt solid #000000;
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
          html,
          body {
            width: auto;
            min-height: 0;
            margin: 0;
            padding: 0;
            background: #ffffff;
            overflow: visible;
          }

          .receipt-preview-root {
            width: 190.5mm;
            margin: 0;
            padding: 0;
            zoom: 1;
          }

          .receipt-doc {
            width: 190.5mm;
            background: #ffffff;
          }

          .receipt-preview-sheet {
            width: auto;
            height: auto;
            margin: 0;
            overflow: visible;
            border: 0;
            box-shadow: none;
            background: #ffffff;
            break-after: auto;
            page-break-after: auto;
          }

          .receipt-page {
            width: 190.5mm;
            min-height: 288mm;
            margin: 0;
            break-after: page;
            page-break-after: always;
            break-inside: avoid;
          }

          .receipt-preview-sheet:last-child .receipt-page {
            break-after: auto;
            page-break-after: auto;
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
            mountNode
          )}
      </iframe>
       <div
        className="receipt-preview-toolbar border-t border-gray-400"
        style={{
          minHeight: 56,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexWrap: "wrap",
          gap: 16,
          padding: "8px 20px",
          background: "#ffffff",
          borderBottom: "1px solid #d1d5db",
          boxSizing: "border-box",
        }}
      >
      

        <div className="receipt-preview-actions" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            type="button"
            className="btn-style"
            onClick={handlePrint}
            disabled={busy}
            
          >
           <u> P</u>rint
          </button>

          <button
            type="button"
            className="btn-style"
            onClick={handleDownload}
            disabled={busy}
            
          >
           <u> D</u>ownload
          </button>
 <button
            type="button"
            className="btn-style"
            onClick={onClose}
            disabled={busy}
           
          >
           <u> C</u>lose
          </button>
          <fieldset
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              margin: 0,
              width:180,
             
              padding: "6px 10px",
              border: "1px solid #d1d5db",
              borderRadius: 4,
              color: "#374151",
              fontSize: 13,
              marginBottom:10
            }}
          >
            
            <legend style={{ padding: "0 4px" }}>File Format</legend>
            {(["Excel", "PDF"] as const).map((format) => (
  <label
    key={format}
    style={{
      display: "flex",
      alignItems: "center",
      gap: 4,
       marginLeft:10,
    }}
  >
    <input
      type="radio"
      name="receiptFileFormat"
      value={format}
      checked={fileFormat === format}
      onChange={() => setFileFormat(format)}
      disabled={busy}
      style={{
        accentColor: "#64D96E",
        cursor: "pointer",
      }}
    />
    {format}
  </label>
))}
          </fieldset>

         
        </div>
      </div>
      </div>
      
    </div>
  );
};

export default ReceiptPrint;
