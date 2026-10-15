import React, { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import dayjs from "dayjs";

// ============================================================
// STOCK TRANSFER - THE PRINT PAGE (the old rptSTprint)
//
// The Stock Transfer page sends you here with the branch and the Entry No., in
// the browser's navigation state - not in the address, so the address stays
// clean (lkpBranch, txtDocNo). This page asks the server for the report itself
// with a POST, so a refresh works too (the browser keeps the state through a
// refresh). The server checks the Print right, and prints what is SAVED.
//
// The layout follows the Beginning Stock print: company name, "Stock Transfer",
// an info line, then Branch / Transfer To / Entry No. / Date, the lines, and a
// "Total :" row with the quantity and the cost. (The old rptSTprint layout was
// not available, so this is an assumption.)
// ============================================================

const STOCK_TRANSFER_PATH = "/Sales/Transaction/StockTransferPage";

// what the Stock Transfer page sent
type Picked = {
  lkpBranch: string;
  txtDocNo: string;
};

// the heading, as the server sends it (names = the server's response keys)
type PrintHeader = {
  txtCoName: string;
  txtBranchName: string;
  txtToBranchName: string;
  txtDocNo: string;
  dtpDate: string | null;
  txtNote: string | null;
};

// one line of the report
type PrintLine = {
  txtSlNo: number;
  lkpItemID: string;
  lkpItemName: string | null;
  txtUnit: string | null;
  txtQty: string;
  txtUnitCost: string;
  txtTotalCost: string;
};

// Qty with 3 decimals, Unit Cost and Total Cost with 4 (the columns)
const formatQty = (value: number) =>
  value.toLocaleString("en-US", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  });

const formatCost = (value: number) =>
  value.toLocaleString("en-US", {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  });

// What the browser's Print (or Save as PDF) does with this page: only the
// report is printed, on A4 landscape, the table heading repeated on every page
// and a row never split between two pages.
//
// On the screen the report is kept out of sight (the browser still prints it):
// you go from the Stock Transfer page straight to the print window.
//
// The page margin is 0: that is what makes Chrome leave out its own header and
// footer (the date, the page title, the address). The white space round the
// sheet is made by the sheet itself instead - padding on the sides, and a blank
// spacer row at the top and at the bottom of every page. The price: without a
// page margin there is nowhere for "Page x of y".
const printCss = `
.print-spacer { display: none; }
@media screen {
  #stockTransferReport {
    position: absolute;
    left: -10000px;
    top: 0;
    width: 1100px;
  }
}
@page {
  size: A4 landscape;
  margin: 0;
}
@media print {
  body * { visibility: hidden; }
  #stockTransferReport, #stockTransferReport * { visibility: visible; }
  #stockTransferReport {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    border: none !important;
    padding: 0 10mm 0 10mm !important;
  }
  .no-print { display: none !important; }
  thead { display: table-header-group; }
  tfoot { display: table-footer-group; }
  tr { break-inside: avoid; }
  .print-spacer { display: table-row; }
  .print-spacer td {
    height: 8mm;
    padding: 0 !important;
    border: none !important;
  }
  #stockTransferReport td,
  #stockTransferReport th {
    padding: 3px 5px !important;
    font-size: 14px !important;
    line-height: 14px !important;
  }
  #stockTransferReport .print-spacer td { padding: 0 !important; }
  /* the heading keeps its own sizes (company name, title, info line) */
  #stockTransferReport td.report-heading {
    padding: 0 0 4px 0 !important;
    font-size: inherit !important;
    line-height: 1.3 !important;
  }
}
`;

const reportCellClass =
  "border border-[#c0c7d6] px-[6px] py-[3px] align-top text-[12px] text-[#111827]";

const reportHeadClass =
  "border border-[#c0c7d6] bg-[#fffff0] px-[6px] py-[4px] text-[12px] font-normal text-[#374151]";

const StockTransferPrintPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // what the Stock Transfer page picked
  const picked = (location.state ?? null) as Picked | null;
  const lkpBranch = picked?.lkpBranch ?? "";
  const txtDocNo = picked?.txtDocNo ?? "";

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [header, setHeader] = useState<PrintHeader | null>(null);
  const [rows, setRows] = useState<PrintLine[]>([]);

  // the browser's print window opens by itself once, when the report is ready
  const autoPrintedRef = useRef(false);
  const returnedRef = useRef(false);
  const printTimerRef = useRef<number | undefined>(undefined);

  // ============================================================
  // NOTHING PICKED (the address opened directly): there is nothing to print -
  // to the Stock Transfer page
  // ============================================================

  useEffect(() => {
    if (picked === null) {
      navigate(STOCK_TRANSFER_PATH, { replace: true });
    }
  }, [picked, navigate]);

  // ============================================================
  // LOAD THE REPORT (a POST: the branch and the Entry No. go in the body)
  // ============================================================

  useEffect(() => {
    if (picked === null) return;

    const loadReport = async () => {
      setLoading(true);
      setErrorMessage("");

      try {
        const PstrCoID = localStorage.getItem("PstrCoID");
        const PstrYear = localStorage.getItem("PstrYear");

        if (!PstrCoID || !PstrYear) {
          setErrorMessage("Company ID / Year not found. Please log in again.");
          toast.error("Company ID / Year not found. Please log in again.");
          return;
        }

        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/StockTransfer/printStockTransfer`,
          {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ PstrCoID, PstrYear, lkpBranch, txtDocNo }),
          },
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
          const message =
            result.message || "The Stock Transfer could not be loaded.";

          setErrorMessage(message);
          toast.error(message);
          return;
        }

        setHeader(result.header ?? null);
        setRows(result.data || []);
      } catch (error) {
        console.error("printStockTransfer error:", error);
        setErrorMessage("Cannot connect to Stock Transfer API.");
        toast.error("Cannot connect to Stock Transfer API.");
      } finally {
        setLoading(false);
      }
    };

    loadReport();
    // picked is read once per branch and Entry No.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lkpBranch, txtDocNo]);

  // ============================================================
  // OPEN THE PRINT WINDOW once the report has loaded (and has rows). A short
  // wait first, so the table is on the screen when the browser takes its copy.
  // ============================================================

  useEffect(() => {
    if (loading || errorMessage !== "" || rows.length === 0) return;
    if (autoPrintedRef.current) return;

    autoPrintedRef.current = true;

    printTimerRef.current = window.setTimeout(() => window.print(), 400);
  }, [loading, errorMessage, rows.length]);

  // ============================================================
  // BACK TO THE STOCK TRANSFER PAGE, with the same transfer shown - this page
  // is only a stop on the way. Once only (the page loads twice in development).
  // ============================================================

  const goBackToPage = useCallback(() => {
    if (returnedRef.current) return;
    returnedRef.current = true;

    navigate(STOCK_TRANSFER_PATH, { replace: true, state: picked });
  }, [navigate, picked]);

  // after the print window closes (Print / Save as PDF, or Cancel)
  useEffect(() => {
    window.addEventListener("afterprint", goBackToPage);

    return () => window.removeEventListener("afterprint", goBackToPage);
  }, [goBackToPage]);

  // nothing to print (the report could not be loaded): the message is already
  // a toast - go back to the page, it is shown there
  useEffect(() => {
    if (loading) return;

    if (errorMessage !== "") {
      goBackToPage();
    } else if (picked !== null && rows.length === 0) {
      toast.info("Stock Transfer not found");
      goBackToPage();
    }
  }, [loading, errorMessage, rows.length, picked, goBackToPage]);

  // leaving the page before the window opened: cancel it
  useEffect(() => () => window.clearTimeout(printTimerRef.current), []);

  // ============================================================
  // THE TOTALS: the quantity and the cost of all the lines
  // ============================================================

  const txtTotalQty = rows.reduce((sum, row) => sum + Number(row.txtQty), 0);
  const txtTotalCost = rows.reduce(
    (sum, row) => sum + Number(row.txtTotalCost),
    0,
  );

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="min-h-full w-full bg-[#f3f4f6] py-[16px] flex flex-col items-center gap-[12px]">
      <style>{printCss}</style>

      {/* a short message while the report is made ready; the print window
          opens by itself after it */}

      {(loading || (errorMessage === "" && rows.length > 0)) && (
        <div className="no-print py-[40px] text-center text-[14px] text-gray-500">
          Preparing the print...
        </div>
      )}

      {!loading && errorMessage !== "" && (
        <div className="no-print py-[40px] text-center text-[14px] text-red-600">
          {errorMessage}
        </div>
      )}

      {/* ====================================================
          THE REPORT - out of sight on the screen, printed by the browser
      ==================================================== */}

      <div
        id="stockTransferReport"
        className="w-full max-w-[1100px] border border-[#d1d5db] bg-white p-[20px]"
        style={{ fontFamily: "Arial, Helvetica, sans-serif" }}
      >
        {!loading && errorMessage === "" && header !== null && rows.length > 0 && (
          <table className="w-full table-fixed border-collapse">
            <colgroup>
              <col className="w-[50px]" />
              <col className="w-[170px]" />
              <col />
              <col className="w-[80px]" />
              <col className="w-[110px]" />
              <col className="w-[120px]" />
              <col className="w-[130px]" />
            </colgroup>

            <thead>
              <tr className="print-spacer">
                <td colSpan={7} />
              </tr>

              {/* the heading: part of the repeating table head, so the browser
                  prints it again at the top of EVERY page */}
              <tr>
                <td colSpan={7} className="report-heading">
                  <div className="text-center">
                    <div className="text-[20px] text-[#111827]">
                      {header.txtCoName}
                    </div>
                    <div className="mt-[2px] text-[16px] text-[#111827]">
                      Stock Transfer
                    </div>
                  </div>

                  <div className="mt-[6px] flex items-center justify-end text-[11px] text-[#111827]">
                    <span>
                      Info. : {dayjs().format("DD-MMM-YYYY hh:mm A")}{" "}
                      {localStorage.getItem("PstrUserID")}
                    </span>
                  </div>

                  <div className="mt-[8px] mb-[4px] flex items-center justify-between gap-[16px] text-[12px] text-[#111827]">
                    <span>
                      Branch : <b className="ml-[4px]">{header.txtBranchName}</b>
                    </span>
                    <span>
                      Transfer To :{" "}
                      <b className="ml-[4px]">{header.txtToBranchName}</b>
                    </span>
                    <span>
                      Entry No. : <b className="ml-[4px]">{header.txtDocNo}</b>
                    </span>
                    <span>
                      Date :{" "}
                      <b className="ml-[4px]">
                        {header.dtpDate
                          ? dayjs(header.dtpDate).format("DD-MMM-YYYY")
                          : ""}
                      </b>
                    </span>
                  </div>

                  {header.txtNote ? (
                    <div className="mb-[8px] text-[12px] text-[#111827]">
                      Note : <b className="ml-[4px]">{header.txtNote}</b>
                    </div>
                  ) : (
                    <div className="mb-[8px]" />
                  )}
                </td>
              </tr>

              <tr>
                <th className={`${reportHeadClass} text-left`}>Sl.#</th>
                <th className={`${reportHeadClass} text-left`}>Item ID</th>
                <th className={`${reportHeadClass} text-left`}>Item Name</th>
                <th className={`${reportHeadClass} text-left`}>Unit</th>
                <th className={`${reportHeadClass} text-right`}>Qty.</th>
                <th className={`${reportHeadClass} text-right`}>Unit Cost</th>
                <th className={`${reportHeadClass} text-right`}>Total Cost</th>
              </tr>
            </thead>

            <tfoot>
              <tr className="print-spacer">
                <td colSpan={7} />
              </tr>
            </tfoot>

            <tbody>
              {rows.map((row) => (
                <tr key={row.txtSlNo}>
                  <td className={reportCellClass}>{row.txtSlNo}</td>
                  <td className={`${reportCellClass} break-words`}>
                    {row.lkpItemID}
                  </td>
                  <td className={`${reportCellClass} break-words`}>
                    {row.lkpItemName}
                  </td>
                  <td className={reportCellClass}>{row.txtUnit}</td>
                  <td className={`${reportCellClass} text-right`}>
                    {formatQty(Number(row.txtQty))}
                  </td>
                  <td className={`${reportCellClass} text-right`}>
                    {formatCost(Number(row.txtUnitCost))}
                  </td>
                  <td className={`${reportCellClass} text-right`}>
                    {formatCost(Number(row.txtTotalCost))}
                  </td>
                </tr>
              ))}

              {/* the grey "Total :" row, then the dashed line */}
              <tr className="bg-[#e5e7eb]">
                <td
                  colSpan={4}
                  className="border border-[#c0c7d6] px-[6px] py-[3px] text-[12px] font-bold text-[#111827]"
                >
                  Total :
                </td>
                <td className="border border-[#c0c7d6] px-[6px] py-[3px] text-right text-[12px] font-bold text-[#111827]">
                  {formatQty(txtTotalQty)}
                </td>
                <td className="border border-[#c0c7d6] px-[6px] py-[3px]" />
                <td className="border border-[#c0c7d6] px-[6px] py-[3px] text-right text-[12px] font-bold text-[#111827]">
                  {formatCost(txtTotalCost)}
                </td>
              </tr>
              <tr>
                <td
                  colSpan={7}
                  className="border-0 border-t border-dashed border-[#6b7280] p-0"
                />
              </tr>
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default StockTransferPrintPage;
