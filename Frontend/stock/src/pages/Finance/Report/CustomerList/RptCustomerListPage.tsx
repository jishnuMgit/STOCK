import React, { useEffect, useMemo, useRef, useState } from "react";
import Header from "../../../../components/common/Header";
import { toast } from "react-toastify";
import {
  buildHtml,
  printCustomerListReport,
  type PrintReport,
} from "./PrintCustomerListReport";
import { previewPrintedLine } from "../../../../components/common/printHtml";
import { buildCustomerListPdf } from "./downloadCustomerListPdf";
import { saveFile } from "./saveFile";

// ============================================================
// TYPES
// ============================================================

type TreeAccount = {
  accountId: string;
  accountName: string;
  accountGroupId: string | null;
  accountLevel: number;
};

const API = `${import.meta.env.VITE_API_URL}/RptCustomerList`;

// Sends the login cookie, and the company / user kept at sign-in as a stopgap
// (the server uses its session first and only falls back to these).
// TODO: if your COA page sends a token, add the same Authorization header here,
// then delete the coId / userId part.
const apiFetch = (url: string, init: RequestInit = {}) => {
  const coId = localStorage.getItem("PstrCoID") ?? "";
  const userId = localStorage.getItem("PstrUserID") ?? "";
  const sep = url.includes("?") ? "&" : "?";

  return fetch(
    `${url}${sep}coId=${encodeURIComponent(coId)}&userId=${encodeURIComponent(userId)}`,
    { credentials: "include", ...init },
  );
};

// ============================================================
// RADIO (Report File, inside the Print Preview)
// ============================================================

type RadioOptionProps = {
  name: string;
  value: string;
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: () => void;
};

const CustomRadio: React.FC<RadioOptionProps> = ({
  name,
  value,
  label,
  checked,
  disabled = false,
  onChange,
}) => (
  <label
    className={`flex items-center gap-2.5 whitespace-nowrap select-none ${
      disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
    }`}
  >
    <input
      type="radio"
      name={name}
      value={value}
      checked={checked}
      disabled={disabled}
      onChange={onChange}
      className="sr-only"
    />
    <span
      className={`flex h-[19px] w-[19px] shrink-0 items-center justify-center rounded-full border bg-white ${
        checked ? "border-[#64d96e]" : "border-[#cbd3dc]"
      }`}
    >
      <span
        className={`h-2.5 w-2.5 rounded-full bg-[#64d96e] ${
          checked ? "opacity-100" : "opacity-0"
        }`}
      />
    </span>
    <span className="text-[12px] font-normal text-[#35445a]">{label}</span>
  </label>
);

// ============================================================
// PAGE
// ============================================================

type RptCustomerListPageProps = {
  onClose?: () => void;
};

const RptCustomerListPage: React.FC<RptCustomerListPageProps> = ({
  onClose,
}) => {
  const [accounts, setAccounts] = useState<TreeAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [printing, setPrinting] = useState(false);

  // rdgReportFile (inside the Print Preview): what Download saves
  const [reportFile, setReportFile] = useState("Excel"); // "Excel" | "PDF"

  // print preview: shown after Print. Print there sends it to the printer,
  // Download saves the "Report File" choice
  const [preview, setPreview] = useState<{
    report: PrintReport;
    fileBase: string;
    accountIds: string[];
  } | null>(null);

  // The customer tree is not shown any more: the report is always for all the customers (everything was checked
  // at the start). The page before this change is kept as RptCustomerListPagebackup.tsx.
  const accountIds = accounts.map((a) => a.accountId);

  // ------------------------------------------------------------
  // LOAD THE TREE
  // ------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await apiFetch(API);
        const data = await res.json();

        if (!res.ok || !data.success) {
          toast.error(data.message || "Failed to load customers");
          return;
        }
        if (cancelled) return;

        const list = data.accounts as TreeAccount[];
        setAccounts(list);
      } catch {
        if (!cancelled) toast.error("Failed to load customers");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // gets the .xlsx made by the server (null after an error message)
  const fetchExcel = async (accountIds: string[]): Promise<Blob | null> => {
    const res = await apiFetch(`${API}/excel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountIds }),
    });

    // an error comes back as JSON, the file as a blob
    if (!res.ok) {
      let message = "Could not create the Excel file";
      try {
        const data = await res.json();
        message = data.message || message;
      } catch {
        // not JSON: the server has no /excel route (404) or crashed (500)
        message =
          res.status === 404
            ? "Excel is not available: the /excel route was not found (404)"
            : `Could not create the Excel file (error ${res.status})`;
      }
      toast.error(message);
      return null;
    }

    return res.blob();
  };

  // ------------------------------------------------------------
  // PRINT (VB cmdPrint_Click)
  // The checked accounts go to the server, which returns the report rows;
  // the Print Preview is then shown (Print = printer, Download = Excel / PDF).
  // ------------------------------------------------------------
  const handlePrint = async () => {
    if (printing || preview) return;

    if (accountIds.length === 0) {
      toast.warning("No customers found", { toastId: "cust-none" });
      return;
    }

    setPrinting(true);
    try {
      const res = await apiFetch(`${API}/print`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountIds }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        toast.error(data.message || "Could not prepare the report");
        return;
      }

      setPreview({ report: data.report, fileBase: data.fileBase, accountIds });
    } catch {
      toast.error("Could not prepare the report");
    } finally {
      setPrinting(false);
    }
  };

  // Print in the preview: the browser print dialog (printer)
  const handlePreviewPrint = () => {
    if (!preview || printing) return;
    try {
      printCustomerListReport(preview.report);
    } catch {
      toast.error("Could not open the print view");
    }
  };

  // Download in the preview: saves the chosen file ("Save as" window, so the
  // browser does not open it afterwards).
  // A double click must not start two saves (state is not updated yet on the
  // second click, so a ref is used).
  const downloading = useRef(false);

  const handlePreviewOk = async () => {
    if (!preview || printing || downloading.current) return;
    downloading.current = true;
    const { report, fileBase, accountIds } = preview;
    const asPdf = reportFile === "PDF";

    setPrinting(true);
    try {
      const blob = asPdf
        ? await buildCustomerListPdf(report)
        : await fetchExcel(accountIds);
      if (!blob) return; // the error is already shown

      const kind = asPdf ? "pdf" : "xlsx";
      const saved = await saveFile(blob, `${fileBase}.${kind}`, kind);
      if (saved) {
      
        toast.success(asPdf ? "PDF file downloaded" : "Excel file downloaded");
          setPreview(null); // cancelled "Save as": the preview stays
      }
    } catch {
      toast.error(
        asPdf ? "Could not create the PDF file" : "Could not create the Excel file",
      );
    } finally {
      downloading.current = false;
      setPrinting(false);
    }
  };

  const previewHtml = useMemo(() => {
    if (!preview) return "";

    const html = buildHtml(preview.report);
    // the user and the time at the bottom right (a browser draws the page margin box only when it prints)
    const printed = previewPrintedLine(html);

    return html
      .replace(
        "</head>",
        // 40px left / 20px right margin for the preview only
        `<style>body{padding-left:40px;padding-right:20px}${printed.css}</style></head>`,
      )
      .replace("</body>", `${printed.line}</body>`);
  }, [preview]);

  const handleClose = () => {
    setReportFile("Excel");
    setPreview(null);
    if (onClose) onClose();
    else window.history.back();
  };

  // Alt+P prints, Alt+C closes (Ctrl+P / Ctrl+L of the old form clash with the
  // browser). Re-attached every render so it always sees the latest state.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (preview) {
        if (event.key === "Escape") setPreview(null);
        return;
      }
      if (!event.altKey || event.ctrlKey || event.metaKey) return;

      if (event.code === "KeyP") {
        event.preventDefault();
        handlePrint();
      } else if (event.code === "KeyC") {
        event.preventDefault();
        handleClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  return (
    <div className="flex min-h-full w-full items-start justify-center bg-white px-4 py-4">
      <div className="min-h-fit w-150 max-w-full bg-white p-0">
        <main className="w-full overflow-hidden border border-[#d5dce2] bg-white">
          <Header Name="Customer List" />

          <section id="trlCustomer" className="px-3.5 pb-6 pt-3">
            <div className="flex justify-center gap-3">
              <button
                id="btnPrint"
                type="button"
                onClick={handlePrint}
                disabled={loading || printing}
                title="Alt+P"
                className="btn-style disabled:cursor-not-allowed disabled:opacity-40"
              >
                <u>P</u>rint
              </button>
            </div>
          </section>
        </main>
      </div>

      {/* Print preview */}
      {preview && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/40 p-4">
          <div className="flex h-[90vh] w-full max-w-300 flex-col overflow-hidden border border-gray-400 bg-white shadow-xl">
            <header className="flex h-7.5 shrink-0 items-center bg-[#9fdfbc] pl-3 text-[17px] font-semibold text-slate-700">
              Print Preview
            </header>

            <iframe
              title="Print Preview"
              srcDoc={previewHtml}
              className="min-h-0 flex-1 border-0 bg-white"
            />

            <footer className="flex shrink-0 flex-wrap items-center justify-center gap-4 border-t border-[#e0e5ea] px-3 py-4">
              <div className="flex gap-3">
                <button
                  id="btnPreviewPrint"
                  type="button"
                  onClick={handlePreviewPrint}
                  disabled={printing}
                  className="btn-style focus-visible:ring-2 focus-visible:ring-[#64d96e] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <u>P</u>rint
                </button>
                <button
                  id="btnPreviewOk"
                  type="button"
                  autoFocus
                  onClick={handlePreviewOk}
                  disabled={printing}
                  className="btn-style focus-visible:ring-2 focus-visible:ring-[#64d96e] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <u>D</u>ownload
                </button>
              </div>

              {/* Report File: what Download saves */}
              <div
                id="rdgReportFile"
                className="relative  flex items-center gap-5 border border-[#e0e5ea] bg-white px-10.5 py-2.5"
              >
                <span className="absolute -top-2.5 left-2.5 bg-white px-1 text-[13px] text-[#405066]">
                   File Format
                </span>
                <CustomRadio
                  name="rdgReportFile"
                  value="Excel"
                  label="Excel"
                  checked={reportFile === "Excel"}
                  onChange={() => setReportFile("Excel")}
                />
                <CustomRadio
                  name="rdgReportFile"
                  value="PDF"
                  label="PDF"
                  checked={reportFile === "PDF"}
                  onChange={() => setReportFile("PDF")}
                />
              </div>
            </footer>
          </div>
        </div>
      )}

      {/* Draw a white checkmark on checked boxes. */}
      <style>{`
        .account-checkbox:checked {
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath d='m3 8 3 3 7-7' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: center;
          background-size: 12px 12px;
        }
      `}</style>
    </div>
  );
};

export default RptCustomerListPage;
