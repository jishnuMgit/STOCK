import React, { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

// ============================================================

// ============================================================

const BEGINNING_BALANCE_PATH = "/Finance/Transaction/BeginningBalance";

// the level of the accounts the report is made for (the old strInputAccountLevel)
const INPUT_ACCOUNT_LEVEL = 4;

// what the Beginning Balance page sent
type Picked = {
  lkpBranch: string;
  // yyyy-mm-dd
  dtpDate: string;
};

// the heading, as the server sends it (names = the server's response keys)
type PrintHeader = {
  txtCoName: string;
  txtBranchName: string;
};

// one row of the report
type PrintLine = {
  lkpAccountID: string;
  txtAccountName: string | null;
  txtAccountLevel: number | null;
  lkpCCID: string | null;
  txtDebit: string;
  txtCredit: string;
};

// a row: 1,234.50 (the old {0:#,#0.00})
const formatAmount = (value: number) =>
  value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

// the Total row: a negative total in brackets, zero as 0.00 (the old
// {0:#,#.00;(#,#.00);0.00})
const formatTotal = (value: number) =>
  value > 0 ? formatAmount(value) : value < 0 ? `(${formatAmount(-value)})` : "0.00";

// the old Detail_BeforePrint: level 1 red, 2 green, 3 blue, the accounts black
const levelColor = (level: number | null) => {
  switch (Number(level)) {
    case 1:
      return "#ff0000";
    case 2:
      return "#008000";
    case 3:
      return "#0000ff";
    default:
      return "#000000";
  }
};

// What the browser's Print (or Save as PDF) does with this page: only the report is
// printed, on A4 portrait (like the old report), the table heading repeated on every
// page and a row never split between two pages.
//
// On the screen the report is kept out of sight (the browser still prints it): you go
// from the Beginning Balance page straight to the print window.
//
// The page margin is 0: that is what makes Chrome leave out its own header and footer
// (the date, the page title, the address). The white space round the sheet is made by
// the sheet itself instead - padding on the sides, and a blank spacer row at the top
// and at the bottom of every page.
const printCss = `
.print-spacer { display: none; }
@media screen {
  #beginningBalanceReport {
    position: absolute;
    left: -10000px;
    top: 0;
    width: 780px;
  }
}
@page {
  size: A4 portrait;
  margin: 0;
}
@media print {
  body * { visibility: hidden; }
  #beginningBalanceReport, #beginningBalanceReport * { visibility: visible; }
  #beginningBalanceReport {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    border: none !important;
    padding: 0 12mm 0 12mm !important;
  }
  .no-print { display: none !important; }
  thead { display: table-header-group; }
  tfoot { display: table-footer-group; }
  tr { break-inside: avoid; }
  .print-spacer { display: table-row; }
  .print-spacer td {
    height: 10mm;
    padding: 0 !important;
    border: none !important;
  }
  #beginningBalanceReport td,
  #beginningBalanceReport th {
    padding: 3px 5px !important;
    font-size: 15px !important;
    line-height: 14px !important;
  }
  #beginningBalanceReport .print-spacer td { padding: 0 !important; }
  /* the heading keeps its own sizes (company name, title, branch) */
  #beginningBalanceReport td.report-heading {
    padding: 0 0 4px 0 !important;
    font-size: inherit !important;
    line-height: 1.3 !important;
  }
}
`;

const reportCellClass =
  "border border-[#c7d1e4] px-[6px] py-[3px] align-middle text-[12px]";

const reportHeadClass =
  "border border-[#c7d1e4] bg-[#eff3fa] px-[6px] py-[4px] text-[12px] font-normal text-[#374151]";

const BeginningBalancePrintPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // what the Beginning Balance page picked
  const picked = (location.state ?? null) as Picked | null;
  const lkpBranch = picked?.lkpBranch ?? "";
  const dtpDate = picked?.dtpDate ?? "";

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [header, setHeader] = useState<PrintHeader | null>(null);
  const [rows, setRows] = useState<PrintLine[]>([]);

  // the browser's print window opens by itself once, when the report is ready
  const autoPrintedRef = useRef(false);
  const returnedRef = useRef(false);
  const printTimerRef = useRef<number | undefined>(undefined);

  // ============================================================

  // ============================================================

  useEffect(() => {
    if (picked === null) {
      navigate(BEGINNING_BALANCE_PATH, { replace: true });
    }
  }, [picked, navigate]);

  // ============================================================
  // LOAD THE REPORT (a POST: the branch and the date go in the body)
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
          `${import.meta.env.VITE_API_URL}/BeginningBalance/printBeginningBalance`,
          {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ PstrCoID, PstrYear, lkpBranch, dtpDate }),
          },
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
          const message =
            result.message || "The Beginning Balance could not be loaded.";

          setErrorMessage(message);
          toast.error(message);
          return;
        }

        setHeader(result.header ?? null);
        setRows(result.data || []);
      } catch (error) {
        console.error("printBeginningBalance error:", error);
        setErrorMessage("Cannot connect to Beginning Balance API.");
        toast.error("Cannot connect to Beginning Balance API.");
      } finally {
        setLoading(false);
      }
    };

    loadReport();
    // picked is read once per branch and date
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lkpBranch, dtpDate]);

  // ============================================================
  // OPEN THE PRINT WINDOW once the report has loaded (and has rows). A short wait
  // first, so the table is on the screen when the browser takes its copy.
  // ============================================================

  useEffect(() => {
    if (loading || errorMessage !== "" || rows.length === 0) return;
    if (autoPrintedRef.current) return;

    autoPrintedRef.current = true;

    printTimerRef.current = window.setTimeout(() => window.print(), 400);
  }, [loading, errorMessage, rows.length]);

  // ============================================================
  // BACK TO THE BEGINNING BALANCE PAGE, with the same branch and date chosen - this
  // page is only a stop on the way. Once only (the page loads twice in development).
  // ============================================================

  const goBackToPage = useCallback(() => {
    if (returnedRef.current) return;
    returnedRef.current = true;

    navigate(BEGINNING_BALANCE_PATH, { replace: true, state: picked });
  }, [navigate, picked]);

  // after the print window closes (Print / Save as PDF, or Cancel)
  useEffect(() => {
    window.addEventListener("afterprint", goBackToPage);

    return () => window.removeEventListener("afterprint", goBackToPage);
  }, [goBackToPage]);

  // nothing to print (the report could not be loaded): the message is already a
  // toast - go back to the page, it is shown there
  useEffect(() => {
    if (loading) return;

    if (errorMessage !== "") {
      goBackToPage();
    } else if (picked !== null && rows.length === 0) {
      toast.info("Beginning Balance not found");
      goBackToPage();
    }
  }, [loading, errorMessage, rows.length, picked, goBackToPage]);

  // leaving the page before the window opened: cancel it
  useEffect(() => () => window.clearTimeout(printTimerRef.current), []);

  // ============================================================
  // THE TOTALS: debit and credit of the rows of the input level (the old
  // Detail_BeforePrint added only those, so a group is not counted twice)
  // ============================================================

  const totalRows = rows.filter(
    (row) => Number(row.txtAccountLevel) === INPUT_ACCOUNT_LEVEL,
  );
  const totalDebit = totalRows.reduce((sum, row) => sum + Number(row.txtDebit), 0);
  const totalCredit = totalRows.reduce((sum, row) => sum + Number(row.txtCredit), 0);

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="min-h-full w-full bg-[#f3f4f6] py-[16px] flex flex-col items-center gap-[12px]">
      <style>{printCss}</style>

      {/* a short message while the report is made ready; the print window opens by
          itself after it */}

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
        id="beginningBalanceReport"
        className="w-full max-w-[780px] border border-[#d1d5db] bg-white p-[20px]"
        style={{ fontFamily: "Arial, Helvetica, sans-serif" }}
      >
        {!loading && errorMessage === "" && header !== null && rows.length > 0 && (
          <table className="w-full table-fixed border-collapse">
            <colgroup>
              <col style={{ width: "13%" }} />
              <col style={{ width: "44%" }} />
              <col style={{ width: "10%" }} />
              <col style={{ width: "16.5%" }} />
              <col style={{ width: "16.5%" }} />
            </colgroup>

            <thead>
              <tr className="print-spacer">
                <td colSpan={5} />
              </tr>

              {/* the heading: part of the repeating table head, so the browser prints
                  it again at the top of EVERY page */}
              <tr>
                <td colSpan={5} className="report-heading">
                  <div
                    className="text-center"
                    style={{ fontFamily: '"Times New Roman", Times, serif' }}
                  >
                    <div className="text-[19px] text-[#111827]">
                      {header.txtCoName}
                    </div>
                    <div className="mt-[2px] text-[16px] text-[#111827]">
                      Beginning Balance
                    </div>
                  </div>

                  <div className="mt-[10px] mb-[8px] text-[12px] text-[#111827]">
                    Branch : {header.txtBranchName}
                  </div>
                </td>
              </tr>

              <tr>
                <th className={`${reportHeadClass} text-left`}>Account ID</th>
                <th className={`${reportHeadClass} text-left`}>Account Name</th>
                <th className={`${reportHeadClass} text-left`}>C.C. ID</th>
                <th className={`${reportHeadClass} text-right`}>Debit</th>
                <th className={`${reportHeadClass} text-right`}>Credit</th>
              </tr>
            </thead>

            <tfoot>
              <tr className="print-spacer">
                <td colSpan={5} />
              </tr>
            </tfoot>

            <tbody>
              {rows.map((row, index) => (
                <tr
                  key={`${row.lkpAccountID}-${row.lkpCCID ?? ""}-${index}`}
                  style={{ color: levelColor(row.txtAccountLevel) }}
                >
                  <td className={reportCellClass}>{row.lkpAccountID}</td>
                  <td className={`${reportCellClass} break-words`}>
                    <span style={{ whiteSpace: "pre" }}>{row.txtAccountName}</span>
                  </td>
                  <td className={reportCellClass}>{row.lkpCCID}</td>
                  <td className={`${reportCellClass} text-right`}>
                    {formatAmount(Number(row.txtDebit))}
                  </td>
                  <td className={`${reportCellClass} text-right`}>
                    {formatAmount(Number(row.txtCredit))}
                  </td>
                </tr>
              ))}

              {/* the shaded "Total" row at the end */}
              <tr className="bg-[#eff3fa]">
                <td
                  colSpan={3}
                  className="border border-[#c7d1e4] px-[6px] py-[3px] text-right text-[12px] text-[#111827]"
                >
                  Total
                </td>
                <td className="border border-[#c7d1e4] px-[6px] py-[3px] text-right text-[12px] text-[#111827]">
                  {formatTotal(totalDebit)}
                </td>
                <td className="border border-[#c7d1e4] px-[6px] py-[3px] text-right text-[12px] text-[#111827]">
                  {formatTotal(totalCredit)}
                </td>
              </tr>
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default BeginningBalancePrintPage;
