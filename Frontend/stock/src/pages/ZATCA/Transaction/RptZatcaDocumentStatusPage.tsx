
import React, { useEffect, useState } from "react";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";

import {
  buildPdfBlob,
  buildReportHtml,
  printZatcaDocumentStatusReport,
  type ReportData,
  type ReportRow,
} from "./zatcaDocumentStatusReport";

import ReportPreview from "../../../components/common/ReportPreview";
import { CustomRadio, RadioPanel } from "../../../components/common/ReportFormParts";
import {
  BranchFilter,
  FilterRow,
  PeriodFilter,
  ReportForm,
  ReportPrintRow,
} from "../../../components/common/ReportFilters";
import { useMessageModal } from "../../../hooks/useMessageModal";
import { useCtrlShortcuts } from "../../../hooks/useCtrlShortcuts";
import { useAltShortcuts } from "../../../hooks/useAltShortcuts";
import { useEnterAsTab } from "../../../hooks/useEnterAsTab";
import { useInitialFocus } from "../../../hooks/useInitialFocus";

type Option = { value: string; label: string };

dayjs.extend(customParseFormat);

const DATE_FORMAT = "DD-MM-YYYY";
const TODAY = dayjs().format(DATE_FORMAT);

// Router mount: app.use("/api/zatca-document-status", zatcaDocumentStatusRouter)
const API = import.meta.env.VITE_API_URL + "/zatca-document-status";

const api = async <T,>(path: string, init?: RequestInit): Promise<T> => {
  const res = await fetch(`${API}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  const type = res.headers.get("content-type") ?? "";
  if (!type.includes("application/json")) {
    throw new Error(`Unexpected response from ${API}${path} (${res.status}): route not reachable`);
  }
  const json = await res.json();
  if (!res.ok || json.success === false) {
    throw new Error(json.message || `Request failed (${res.status})`);
  }
  return json as T;
};

type ApiResult = {
  data: {
    coName: string;
    heading: string;
    branchLabel: string;
    reportInfo: string;
    rows: ReportRow[];
    totals: { amountExVat: number; vatAmount: number; amountInVat: number };
    fileBase: string;
  };
};

const RptZatcaDocumentStatus: React.FC = () => {
  // the messages (warnings, errors ...) are the common message window, as on the Payment screen - not a toast
  const { notify, dialog: messageDialog } = useMessageModal("ZATCA Status");
  const [branchMode, setBranchMode] = useState("All Branch");
  const [branch, setBranch] = useState<Option | null>(null);

  const [documentStatus, setDocumentStatus] = useState("Not Cleared");

  const [dateMode, setDateMode] = useState("By Document Issue Date");

  const [fromDate, setFromDate] = useState(TODAY);
  const [toDate, setToDate] = useState(TODAY);

  const [excludeInterCompany, setExcludeInterCompany] = useState(true);

  const [branchOptions, setBranchOptions] = useState<Option[]>([]);

  // the branches have been asked for (found or not): the cursor can start
  const [lookupsLoaded, setLookupsLoaded] = useState(false);

  // Enter moves on like Tab, as on every report page
  const handleEnterAsTab = useEnterAsTab();
  const [busy, setBusy] = useState(false);

  // the Print Preview: shown after Print
  const [preview, setPreview] = useState<{
    data: ReportData;
    fileBase: string;
    body: Record<string, unknown>;
  } | null>(null);

  useEffect(() => {
    api<{ data: { fbrname: string; fbrid: string }[] }>("/getBranchList")
      .then(({ data }) =>
        setBranchOptions(
          (data ?? []).map((b) => ({ value: b.fbrid, label: b.fbrname })),
        ),
      )
      .catch((e: Error) => notify.error(e.message))
      .finally(() => setLookupsLoaded(true));
  }, []);

  // ValidateMe_P (the server checks again) + one call for the report data
  const loadReport = async (): Promise<{
    data: ReportData;
    fileBase: string;
    body: Record<string, unknown>;
  } | null> => {
    if (branchMode === "One Branch" && !branch) {
      notify.error("Please select 'Branch'");
      return null;
    }
    if (!fromDate) {
      notify.error("Please select 'From Date'");
      return null;
    }
    if (!toDate) {
      notify.error("Please select 'To Date'");
      return null;
    }
    if (dayjs(fromDate, DATE_FORMAT).isAfter(dayjs(toDate, DATE_FORMAT))) {
      notify.error("'To Date' should be greater than or equal to 'From Date'");
      return null;
    }

    const body = {
      branchMode: branchMode === "One Branch" ? "one" : "all",
      branchId: branch?.value ?? null,
      clearType: documentStatus === "Cleared" ? 0 : 1,
      // rdgDate: 0 submission, 1 issue, 2 document
      dateType:
        dateMode === "By Submission Date" ? 0 : dateMode === "By Document Issue Date" ? 1 : 2,
      excludeInterCompany,
     fromDate: dayjs(fromDate, DATE_FORMAT).format("DD/MM/YYYY"),
     toDate: dayjs(toDate, DATE_FORMAT).format("DD/MM/YYYY"),
    };

    setBusy(true);
    try {
      const { data } = await api<ApiResult>("/getZATCADocumentStatus", {
        method: "POST",
        body: JSON.stringify(body),
      });

      // the heading, branch line and report info come from the server, so the
      // preview, the PDF and the Excel file always carry the same text
      const { fileBase, ...report } = data;
      return { data: report, fileBase, body };
    } catch (e) {
      notify.error((e as Error).message);
      return null;
    } finally {
      setBusy(false);
    }
  };

  // Print opens the preview, like the VB form (objRpt.ShowPreview);
  // Print and Download are inside the preview
  const handlePrint = async () => {
    if (busy || preview) return;
    const r = await loadReport();
    if (r) setPreview({ data: r.data, fileBase: r.fileBase, body: r.body });
  };

  // gets the .xlsx made by the server (null after an error message)
  const fetchExcel = async (body: Record<string, unknown>): Promise<Blob | null> => {
    const res = await fetch(`${API}/downloadZATCADocumentStatusExcel`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    // an error comes back as JSON, the file as a blob
    if (!res.ok) {
      let message = "Could not create the Excel file";
      try {
        const json = await res.json();
        message = json.message || message;
      } catch {
        // not JSON: the server has no such route (404) or crashed (500)
        message =
          res.status === 404
            ? "Excel is not available: the route was not found (404)"
            : `Could not create the Excel file (error ${res.status})`;
      }
      notify.error(message);
      return null;
    }

    return res.blob();
  };

  // the cursor starts on the Branch box (or on the first date when it is All Branch)
  useInitialFocus(lookupsLoaded, branchMode === "One Branch" ? "lkpBranch" : "dtpFromDate");

  // Alt+P -> Print (the underlined letter on the button)
  useAltShortcuts({ p: handlePrint });

  // Ctrl+P -> Print (the key of the Payment screen). With the Print Preview open it prints the report that is shown.
  useCtrlShortcuts({
    p: () => (preview ? printZatcaDocumentStatusReport(preview.data) : handlePrint()),
  });

  return (
    <ReportForm
      title="ZATCA Status"
      // the radio text of "By Document Issue Date" is longer than the usual 150 px column: every panel and label of the page gets this width
      labelWidth={216}
      onKeyDown={handleEnterAsTab}
      overlay={
        <>
          {/* Print Preview (the common one, with Print / Download and the File Format) */}
          {preview && (
            <ReportPreview
              showClose={false}
              html={buildReportHtml(preview.data)}
              fileBase={preview.fileBase}
              onPrint={() => printZatcaDocumentStatusReport(preview.data)}
              buildPdf={() => buildPdfBlob(preview.data)}
              fetchExcel={() => fetchExcel(preview.body)}
              onClose={() => setPreview(null)}
            />
          )}

          {messageDialog}
        </>
      }
    >
      <BranchFilter
        mode={branchMode}
        onModeChange={setBranchMode}
        options={branchOptions}
        value={branch}
        onChange={setBranch}
        placeholder=""
      />

      {/* Document status */}
      <FilterRow
        className="w-full"
        panel={
          <RadioPanel id="rdgStatus" className="h-17.5 w-[var(--filter-panel,9.5rem)]">
            <CustomRadio
              name="rdgStatus"
              value="Cleared"
              label="Cleared"
              checked={documentStatus === "Cleared"}
              onChange={() => setDocumentStatus("Cleared")}
            />
            <CustomRadio
              name="rdgStatus"
              value="Not Cleared"
              label="Not Cleared"
              checked={documentStatus === "Not Cleared"}
              onChange={() => setDocumentStatus("Not Cleared")}
            />
          </RadioPanel>
        }
      >
        {/* Exclude Inter Company - at the right end of the row */}
        <div className="flex justify-end">
          <label
            htmlFor="chkExcludeInterCompany"
            className="flex h-7.5 cursor-pointer items-center gap-2 rounded-sm border border-gray-300 bg-white px-2 text-[14px] text-[#172b43] select-none"
          >
            <input
              id="chkExcludeInterCompany"
              type="checkbox"
              checked={excludeInterCompany}
              onChange={(event) => setExcludeInterCompany(event.target.checked)}
              className="h-4 w-4 accent-[#4ade80]"
            />
            Exclude Inter Company
          </label>
        </div>
      </FilterRow>

      {/* The date the period is of - in the next row, on the left like the other panels */}
      <FilterRow
        className="w-full"
        panel={
          <RadioPanel id="rdgDate" className="h-22.5 w-[var(--filter-panel,9.5rem)]">
            <CustomRadio
              name="rdgDate"
              value="By Submission Date"
              label="By Submission Date"
              checked={dateMode === "By Submission Date"}
              onChange={() => setDateMode("By Submission Date")}
            />
            <CustomRadio
              name="rdgDate"
              value="By Document Issue Date"
              label="By Document Issue Date"
              checked={dateMode === "By Document Issue Date"}
              onChange={() => setDateMode("By Document Issue Date")}
            />
            <CustomRadio
              name="rdgDate"
              value="By Document Date"
              label="By Document Date"
              checked={dateMode === "By Document Date"}
              onChange={() => setDateMode("By Document Date")}
            />
          </RadioPanel>
        }
      />

      <PeriodFilter
        from={fromDate}
        to={toDate}
        onFromChange={setFromDate}
        onToChange={setToDate}
      />

      <ReportPrintRow onPrint={handlePrint} disabled={busy} />
    </ReportForm>
  );
};

export default RptZatcaDocumentStatus;
