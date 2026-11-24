import React, { useEffect, useMemo, useRef, useState } from "react";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { previewPrintedLine } from "../../../../../components/common/printHtml";
import { buildReceivablesPdf } from "./downloadReceivablesPdf";
import { saveFile } from "./saveFile";
import {
  buildHtml,
  printReceivablesReport,
  type PrintReport,
} from "./printReceivablesReport";
import Header from "../../../../../components/common/Header";
import { CustomRadio, RadioPanel } from "../../../../../components/common/ReportFormParts";
import {
  BranchFilter,
  FILTER_GAP,
  FilterRow,
  LabelSelectFilter,
  PostStatusFilter,
  ReportDatePicker,
  ReportForm,
  ReportPrintRow,
} from "../../../../../components/common/ReportFilters";
import { useMessageModal } from "../../../../../hooks/useMessageModal";

// Receivables - laid out with the common template of the report forms (components/common/ReportFilters.tsx), like every other
// report page. The Print Preview, the lookups and the request sent to the server are as they were.

dayjs.extend(customParseFormat);

type Option = { value: string; label: string };

const DATE_FORMAT = "DD-MM-YYYY";
const TODAY = dayjs().format(DATE_FORMAT);

const API = `${import.meta.env.VITE_API_URL}/RptReceivables`;

// Sends the login cookie, and the company / user kept at sign-in as a stopgap
// (the server uses its session first and only falls back to these).
const apiFetch = (url: string, init: RequestInit = {}) => {
  const coId = localStorage.getItem("PstrCoID") ?? "";
  const userId = localStorage.getItem("PstrUserID") ?? "";
  const sep = url.includes("?") ? "&" : "?";

  return fetch(
    `${url}${sep}coId=${encodeURIComponent(coId)}&userId=${encodeURIComponent(userId)}`,
    { credentials: "include", ...init },
  );
};

const postStatusOptions: Option[] = [
  { value: "ALL", label: "All" },
  { value: "POSTED", label: "Posted" },
  { value: "UNPOSTED", label: "Not Posted" },
];

// what the procedure expects: 0 non posted, 1 posted, 2 all
const POST_STATUS: Record<string, number> = { UNPOSTED: 0, POSTED: 1, ALL: 2 };

const yesNoOptions: Option[] = [
  { value: "YES", label: "Yes" },
  { value: "NO", label: "No" },
];

type ReceivablesRequest = {
  allBranches: boolean;
  branchId: string;
  forPeriod: boolean; // false = As On Date
  fromDate: string; // DD/MM/YYYY (For A Period only)
  toDate: string; // DD/MM/YYYY (the As On Date, or the end of the period)
  postStatus: number;
  print0Bal: boolean;
};

type RptReceivablesPageProps = {
  onClose?: () => void;
};

const RptReceivablesPage: React.FC<RptReceivablesPageProps> = ({ onClose }) => {
  const { notify, dialog: messageDialog } = useMessageModal();
  const [branchOptions, setBranchOptions] = useState<Option[]>([]);

  const [branchMode, setBranchMode] = useState("One Branch"); // rdgBranch
  const [branch, setBranch] = useState<Option | null>(null); // lkpBranch

  const [dateMode, setDateMode] = useState("For A Period"); // rdgDate
  const [fromDate, setFromDate] = useState(TODAY); // dtpFromDate (also used as the As On Date)
  const [toDate, setToDate] = useState(TODAY); // dtpToDate

  const [postStatus, setPostStatus] = useState<Option | null>(
    postStatusOptions[0],
  ); // lkpPostStatus
  const [printZeroBalance, setPrintZeroBalance] = useState<Option | null>(
    yesNoOptions[0],
  ); // lkpPrint0Balance

  const isPeriod = dateMode === "For A Period";

  const [printing, setPrinting] = useState(false);

  // rdgReportFile (inside the Print Preview): what Download saves
  const [reportFile, setReportFile] = useState("Excel"); // "Excel" | "PDF"

  // print preview: shown after Print. Print there sends it to the printer,
  // Download saves the "Report File" choice
  const [preview, setPreview] = useState<{
    report: PrintReport;
    fileBase: string;
    request: ReceivablesRequest;
  } | null>(null);

  // ------------------------------------------------------------
  // LOAD THE LOOKUPS (VB FillCombos)
  // ------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await apiFetch(`${API}/lookups`);
        const data = await res.json();

        if (!res.ok || !data.success) {
          notify.error(data.message || "Failed to load the lookups");
          return;
        }
        if (cancelled) return;

        const branches: Option[] = (
          data.branches as { brId: string; brName: string }[]
        ).map((b) => ({
          value: b.brId,
          label: b.brName,
        }));

        setBranchOptions(branches);
        setBranch(branches[0] ?? null);
      } catch {
        if (!cancelled) notify.error("Failed to load the lookups");
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // VB ValidateMe: returns the request, or null after showing the message
  const buildRequest = (): ReceivablesRequest | null => {
    const oneBranch = branchMode === "One Branch";
    const valid = (v: string) => !!v && dayjs(v, DATE_FORMAT, true).isValid();

    if (oneBranch && !branch) {
      notify.warning("Please select a 'Branch'");
      document.getElementById("lkpBranch")?.focus();
      return null;
    }

    if (isPeriod) {
      if (!valid(fromDate)) {
        notify.warning("Please select 'From Date'");
        document.getElementById("dtpFromDate")?.focus();
        return null;
      }
      if (!valid(toDate)) {
        notify.warning("Please select 'To Date'");
        document.getElementById("dtpToDate")?.focus();
        return null;
      }
      if (dayjs(fromDate, DATE_FORMAT).isAfter(dayjs(toDate, DATE_FORMAT))) {
        notify.warning("'To Date' should be greater than 'From Date'");
        document.getElementById("dtpToDate")?.focus();
        return null;
      }
    } else if (!valid(fromDate)) {
      notify.warning("Please Select 'As on Date'");
      document.getElementById("dtpFromDate")?.focus();
      return null;
    }

    const slash = (v: string) => v.replace(/-/g, "/"); // DD-MM-YYYY -> DD/MM/YYYY

    return {
      allBranches: !oneBranch,
      branchId: oneBranch ? (branch?.value ?? "") : "",
      forPeriod: isPeriod,
      fromDate: isPeriod ? slash(fromDate) : "",
      // As On Date uses the first date picker
      toDate: slash(isPeriod ? toDate : fromDate),
      postStatus: POST_STATUS[postStatus?.value ?? "ALL"] ?? 2,
      print0Bal: printZeroBalance?.value === "YES",
    };
  };

  // gets the .xlsx made by the server (null after an error message)
  const fetchExcel = async (
    request: ReceivablesRequest,
  ): Promise<Blob | null> => {
    const res = await apiFetch(`${API}/excel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
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
  // PRINT (VB cmdPrint_Click): validates, gets the report and shows the
  // Print Preview (Print = printer, Download = Excel / PDF file)
  // ------------------------------------------------------------
  const handlePrint = async () => {
    if (printing || preview) return;

    const request = buildRequest();
    if (!request) return;

    setPrinting(true);
    try {
      const res = await apiFetch(`${API}/print`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        notify.error(data.message || "Could not prepare the report");
        return;
      }

      setPreview({ report: data.report, fileBase: data.fileBase, request });
    } catch {
      notify.error("Could not prepare the report");
    } finally {
      setPrinting(false);
    }
  };

  // Print in the preview: the browser print dialog (printer)
  const handlePreviewPrint = () => {
    if (!preview || printing) return;
    try {
      printReceivablesReport(preview.report);
    } catch {
      notify.error("Could not open the print view");
    }
  };

  // Download in the preview: saves the chosen file ("Save as" window, so the
  // browser does not open it afterwards)
  // a double click must not start two saves (state is not updated yet on the
  // second click, so a ref is used)
  const downloading = useRef(false);

  const handlePreviewOk = async () => {
    if (!preview || printing || downloading.current) return;
    downloading.current = true;
    const { report, fileBase, request } = preview;
    const asPdf = reportFile === "PDF";

    setPrinting(true);
    try {
      const blob = asPdf ? await buildReceivablesPdf(report) : await fetchExcel(request);
      if (!blob) return; // the error is already shown

      const kind = asPdf ? "pdf" : "xlsx";
      const saved = await saveFile(blob, `${fileBase}.${kind}`, kind);
      if (saved) {
        setPreview(null); // cancelled "Save as": the preview stays
        notify.success(asPdf ? "PDF file downloaded" : "Excel file downloaded");
      }
    } catch {
      notify.error(
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
    setBranchMode("One Branch");
    setBranch(branchOptions[0] ?? null);
    setDateMode("For A Period");
    setFromDate(TODAY);
    setToDate(TODAY);
    setPostStatus(postStatusOptions[0]);
    setPrintZeroBalance(yesNoOptions[0]);
    setReportFile("Excel");
    setPreview(null);
    onClose?.();
  };

  // Alt+P prints, Alt+C closes (Ctrl+P / Ctrl+L of the old form clash with the
  // browser); Esc closes the preview. Re-attached every render so it always
  // sees the latest state.
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
    <ReportForm
      title="Receivables"
      overlay={
        // Print preview
        preview && (
          <div className="fixed inset-0 z-99999 flex items-center justify-center bg-black/40 p-4">
            <div className="flex h-[90vh] w-full max-w-250 flex-col overflow-hidden border border-gray-400 bg-white shadow-xl">
              <Header Name="Print Preview" />

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
                  className="relative flex items-center gap-5 border border-[#e0e5ea] bg-white px-3.5 py-2.5"
                >
                  <span className="absolute -top-2.5 left-2.5 bg-white px-1 text-[13px] text-[#405066]">
                    Report File
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
        )
      }
    >
      {messageDialog}
      <BranchFilter
        mode={branchMode}
        onModeChange={setBranchMode}
        options={branchOptions}
        value={branch}
        onChange={setBranch}
      />

      {/* Date mode: As On Date (one date) / For A Period (two dates) */}
      <FilterRow
        panel={
          <RadioPanel id="rdgDate" className="h-17.5 w-38">
            <CustomRadio
              name="rdgDate"
              value="As On Date"
              label="As On Date"
              checked={dateMode === "As On Date"}
              onChange={() => setDateMode("As On Date")}
            />
            <CustomRadio
              name="rdgDate"
              value="For A Period"
              label="For A Period"
              checked={dateMode === "For A Period"}
              onChange={() => setDateMode("For A Period")}
            />
          </RadioPanel>
        }
      >
        <div className="flex min-w-0 flex-wrap items-center" style={{ gap: FILTER_GAP }}>
          <div className="w-38.5">
            <ReportDatePicker
              id="dtpFromDate"
              label={isPeriod ? "From Date" : "As On Date"}
              value={fromDate}
              onChange={setFromDate}
            />
          </div>
          {isPeriod && (
            <div className="w-38.5">
              <ReportDatePicker id="dtpToDate" label="To Date" value={toDate} onChange={setToDate} />
            </div>
          )}
        </div>
      </FilterRow>

      <PostStatusFilter options={postStatusOptions} value={postStatus} onChange={setPostStatus} />

      <LabelSelectFilter
        label="Print 0 Balance"
        id="lkpPrint0Balance"
        options={yesNoOptions}
        value={printZeroBalance}
        onChange={setPrintZeroBalance}
      />

      <ReportPrintRow onPrint={() => void handlePrint()} disabled={printing} />
    </ReportForm>
  );
};

export default RptReceivablesPage;
