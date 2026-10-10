import React, { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import dayjs from "dayjs";

// ============================================================
// USER AUDIT - THE PRINT PAGE (the old rptUserAuditRpt)
//
// The User Audit dialog sends you here with what you picked, in the browser's
// navigation state - not in the address, so the address stays clean (lkpUserID,
// lkpAction, dtpFromDate, dtpToDate - yyyy-mm-dd). This page asks the server for
// the report itself with a POST, so a refresh works too (the browser keeps the
// state through a refresh).
// The server decides who sees what (an Admin User every user's rows, anyone
// else only their own) and checks the Print right.
// ============================================================

// what the dialog picked
type Picked = {
  lkpUserID: string;
  lkpAction: string;
  dtpFromDate: string;
  dtpToDate: string;
};

// one report row, as the server sends it (names = the server's response keys)
type UserAuditRow = {
  txtYear: string | null;
  txtBranchID: string | null;
  txtBranchName: string | null;
  txtDocType: string | null;
  txtDocNo: string | null;
  txtScreenName: string | null;
  txtAction: string | null;
  txtAuditNote: string | null;
  txtUserID: string;
  txtAuditDate: string;
};

// What the browser's Print (or Save as PDF) does with this page: only the
// report is printed - on A4 landscape, about 30 rows to a page, the table
// heading repeated on every page, and a row never split between two pages.
//
// On the screen the report is kept out of sight (the browser still prints it):
// you go from the dialog straight to the print window.
//
// The company name, the title and the info line sit in the table's repeating
// head, so they are printed at the top of every page.
//
// The page margin is 0: that is what makes Chrome leave out its own header and
// footer (the date, the page title, the address). The white space round the
// sheet is made by the sheet itself instead - padding on the sides, and a blank
// spacer row at the top (in the repeating table heading) and at the bottom (in
// the repeating table footer) so EVERY page has it. The price: without a page
// margin there is nowhere for "Page x of y".
const printCss = `
.print-spacer { display: none; }
@media screen {
  #userAuditReport {
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
  #userAuditReport, #userAuditReport * { visibility: visible; }
  #userAuditReport {
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
  /* compact rows when printing: a one-line row is 21px, so about 30 rows fit
     on an A4 landscape page (a note that wraps takes a second line) */
  #userAuditReport td,
  #userAuditReport th {
    padding: 3px 5px !important;
    font-size: 13px !important;
    line-height: 14px !important;
  }
  #userAuditReport .print-spacer td { padding: 0 !important; }
  /* the heading keeps its own sizes (company name, title, info line) */
  #userAuditReport td.report-heading {
    padding: 0 0 4px 0 !important;
    font-size: inherit !important;
    line-height: 1.3 !important;
  }
}
`;

const reportCellClass =
  "border border-[#9ca3af] px-[6px] py-[3px] align-top text-[14px] text-[#111827]";

const reportHeadClass =
  "border border-[#9ca3af] bg-[#f3f4f6] px-[6px] py-[4px] text-left text-[12px] font-normal text-[#374151]";

const UserAuditPrintPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // what the dialog picked: lkpUserID / lkpAction "*" = every user / action
  const picked = (location.state ?? null) as Picked | null;
  const lkpUserID = picked?.lkpUserID ?? "";
  const lkpAction = picked?.lkpAction ?? "";
  const dtpFromDate = picked?.dtpFromDate ?? "";
  const dtpToDate = picked?.dtpToDate ?? "";

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [rows, setRows] = useState<UserAuditRow[]>([]);
  const [txtCompanyName, setTxtCompanyName] = useState("");

  // the browser's print window opens by itself once, when the report is ready
  const autoPrintedRef = useRef(false);
  const returnedRef = useRef(false);
  const printTimerRef = useRef<number | undefined>(undefined);

  // ============================================================
  // NOTHING PICKED (the address opened directly): there is nothing to print -
  // to the dialog
  // ============================================================

  useEffect(() => {
    if (picked === null) {
      navigate("/Security/UserAudit", { replace: true });
    }
  }, [picked, navigate]);

  // ============================================================
  // LOAD THE REPORT (a POST: what was picked goes in the body)
  // ============================================================

  useEffect(() => {
    if (picked === null) return;

    const loadReport = async () => {
      setLoading(true);
      setErrorMessage("");

      try {
        const PstrCoID = localStorage.getItem("PstrCoID");

        if (!PstrCoID) {
          setErrorMessage("Company ID not found. Please log in again.");
          toast.error("Company ID not found. Please log in again.");
          return;
        }

        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/UserAudit/getUserAuditList`,
          {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              PstrCoID,
              lkpUserID,
              lkpAction,
              dtpFromDate,
              dtpToDate,
            }),
          },
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
          const message =
            result.message || "The user audit could not be loaded.";

          setErrorMessage(message);
          toast.error(message);
          return;
        }

        setTxtCompanyName(result.txtCompanyName ?? "");
        setRows(result.data || []);
      } catch (error) {
        console.error("getUserAuditList error:", error);
        setErrorMessage("Cannot connect to User Audit API.");
        toast.error("Cannot connect to User Audit API.");
      } finally {
        setLoading(false);
      }
    };

    loadReport();
    // picked is read once per set of choices (its four values)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lkpUserID, lkpAction, dtpFromDate, dtpToDate]);

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
  // BACK TO THE DIALOG, with what was picked still filled in - this page is only
  // a stop on the way. Once only (the page loads twice in development). Opened
  // straight from the address (nothing to go back to), it replaces itself with
  // the dialog instead.
  // ============================================================

  const goBackToDialog = useCallback(() => {
    if (returnedRef.current) return;
    returnedRef.current = true;

    const canGoBack = (window.history.state?.idx ?? 0) > 0;

    if (canGoBack) {
      navigate(-1);
    } else {
      navigate("/Security/UserAudit", { replace: true, state: picked });
    }
  }, [navigate, picked]);

  // after the print window closes (Print / Save as PDF, or Cancel)
  useEffect(() => {
    window.addEventListener("afterprint", goBackToDialog);

    return () => window.removeEventListener("afterprint", goBackToDialog);
  }, [goBackToDialog]);

  // nothing to print (the report could not be loaded, or has no rows): the
  // message is already a toast - go back to the dialog, it is shown there
  useEffect(() => {
    if (loading) return;

    if (errorMessage !== "") {
      goBackToDialog();
    } else if (picked !== null && rows.length === 0) {
      toast.info("No audit rows for this selection.");
      goBackToDialog();
    }
  }, [loading, errorMessage, rows.length, picked, goBackToDialog]);

  // leaving the page before the window opened: cancel it
  useEffect(() => () => window.clearTimeout(printTimerRef.current), []);

  // ============================================================
  // THE REPORT, BY USER: "User ID : X" then that user's rows (Sl# restarts)
  // ============================================================

  const reportGroups: { txtUserID: string; items: UserAuditRow[] }[] = [];

  for (const row of rows) {
    const last = reportGroups[reportGroups.length - 1];

    if (last && last.txtUserID === row.txtUserID) {
      last.items.push(row);
    } else {
      reportGroups.push({ txtUserID: row.txtUserID, items: [row] });
    }
  }

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
        id="userAuditReport"
        className="w-full max-w-[1100px] border border-[#d1d5db] bg-white p-[20px]"
        style={{ fontFamily: '"Times New Roman", Times, serif' }}
      >
        {!loading && errorMessage === "" && rows.length > 0 && (
          <>
            <table className="w-full table-fixed border-collapse">
              <colgroup>
                <col className="w-[44px]" />
                <col className="w-[48px]" />
                <col className="w-[52px]" />
                <col className="w-[70px]" />
                <col className="w-[110px]" />
                <col className="w-[150px]" />
                <col className="w-[52px]" />
                <col />
                <col className="w-[150px]" />
              </colgroup>

              <thead>
                <tr className="print-spacer">
                  <td colSpan={9} />
                </tr>
                {/* the heading: it is part of the repeating table head, so
                    the browser prints it again at the top of EVERY page */}
                <tr>
                  <td colSpan={9} className="report-heading">
                      <div className="text-center">
                        <div className="text-[20px] text-[#111827]">{txtCompanyName}</div>
                        <div className="mt-[2px] text-[16px] text-[#111827]">
                          User Audit For The Period{" "}
                          {dayjs(dtpFromDate).format("DD-MMM-YYYY")} To{" "}
                          {dayjs(dtpToDate).format("DD-MMM-YYYY")}
                        </div>
                      </div>

                      <div className="mt-[6px] mb-[8px] flex items-center justify-end gap-[24px] text-[11px] text-[#111827]">
                        <span>
                          Info. : {dayjs().format("DD-MMM-YYYY hh:mm A")}{" "}
                          {localStorage.getItem("PstrUserID")}
                        </span>
                        {/* <span>Rows  : {rows.length}</span> */}
                      </div>
                  </td>
                </tr>
                <tr>
                  <th className={reportHeadClass}>Sl.#</th>
                  <th className={reportHeadClass}>Year</th>
                  <th className={reportHeadClass}>Br. ID</th>
                  <th className={reportHeadClass}>Doc. Type</th>
                  <th className={reportHeadClass}>Doc. No.</th>
                  <th className={reportHeadClass}>Screen</th>
                  <th className={reportHeadClass}>Action</th>
                  <th className={reportHeadClass}>Audit Note</th>
                  <th className={reportHeadClass}>Audit Date</th>
                </tr>
              </thead>

              <tfoot>
                <tr className="print-spacer">
                  <td colSpan={9} />
                </tr>
              </tfoot>

              <tbody>
                {reportGroups.length === 0 && (
                  <tr>
                    <td
                      colSpan={9}
                      className={`${reportCellClass} text-center text-gray-500`}
                    >
                      No audit rows for this selection.
                    </td>
                  </tr>
                )}

                {reportGroups.map((group) => (
                  <React.Fragment key={group.txtUserID}>
                    <tr>
                      <td
                        colSpan={9}
                        className="px-[6px] pt-[8px] pb-[2px] text-[12px] text-[#111827]"
                      >
                        User ID : <b className="ml-[8px]">{group.txtUserID}</b>
                      </td>
                    </tr>

                    {group.items.map((row, index) => (
                      <tr key={`${group.txtUserID}-${index}`}>
                        <td className={reportCellClass}>{index + 1}</td>
                        <td className={reportCellClass}>{row.txtYear}</td>
                        <td className={reportCellClass}>{row.txtBranchID}</td>
                        <td className={reportCellClass}>{row.txtDocType}</td>
                        <td className={`${reportCellClass} break-words`}>
                          {row.txtDocNo}
                        </td>
                        <td className={reportCellClass}>{row.txtScreenName}</td>
                        <td className={reportCellClass}>{row.txtAction}</td>
                        <td
                          className={`${reportCellClass} whitespace-pre-wrap break-words`}
                        >
                          {row.txtAuditNote}
                        </td>
                        <td className={reportCellClass}>{row.txtAuditDate}</td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  );
};

export default UserAuditPrintPage;
