import React, { useEffect, useState } from "react";
import Header from "../../../../components/common/Header";
import ReportPreview from "../../../../components/common/ReportPreview";
import {
  buildHtml,
  printCustomerListReport,
  type PrintReport,
} from "../../../../components/Finance/Report/RptCustomerList/RptCustomerListRpt";
import { buildCustomerListPdf } from "../../../../components/Finance/Report/RptCustomerList/RptCustomerListPdf";
import { useMessageModal } from "../../../../hooks/useMessageModal";

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
// PAGE
// ============================================================

type RptCustomerListPageProps = {
  onClose?: () => void;
};

const RptCustomerListPage: React.FC<RptCustomerListPageProps> = ({
  onClose,
}) => {
  const { notify, dialog: messageDialog } = useMessageModal();
  const [accounts, setAccounts] = useState<TreeAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [printing, setPrinting] = useState(false);

  // rdgReportFile (inside the Print Preview): what Download saves

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
          notify.error(data.message || "Failed to load customers");
          return;
        }
        if (cancelled) return;

        const list = data.accounts as TreeAccount[];
        setAccounts(list);
      } catch {
        if (!cancelled) notify.error("Failed to load customers");
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
      notify.error(message);
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
      notify.warning("No customers found");
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
        notify.error(data.message || "Could not prepare the report");
        return;
      }

      setPreview({ report: data.report, fileBase: data.fileBase, accountIds });
    } catch {
      notify.error("Could not prepare the report");
    } finally {
      setPrinting(false);
    }
  };

  const handleClose = () => {
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
      {messageDialog}
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

      {/* the Print Preview (after Print) */}
      {preview && (
        <ReportPreview
          showClose={false}
          html={buildHtml(preview.report)}
          fileBase={preview.fileBase}
          onPrint={() => printCustomerListReport(preview.report)}
          buildPdf={() => buildCustomerListPdf(preview.report)}
          fetchExcel={() => fetchExcel(preview.accountIds)}
          onClose={() => setPreview(null)}
        />
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
