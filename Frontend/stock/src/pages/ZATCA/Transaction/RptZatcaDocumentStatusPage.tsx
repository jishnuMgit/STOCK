
import React, { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";

import { saveFile } from "./saveFile";
import {
  buildPdfBlob,
  buildReportHtml,
  printZatcaDocumentStatusReport,
  type ReportData,
  type ReportRow,
} from "./zatcaDocumentStatusReport";

import Header from "../../../components/common/Header";
import CommonTableSelect, {
  type TableSelectOption,
} from "../../../components/common/CommonTableSelect";

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

const branchColumns = [
  { key: "label", label: "Branch", width: "1fr" },
  { key: "id", label: "ID", width: "65px", align: "right" as const },
];

type RadioProps = {
  name: string;
  value: string;
  label: string;
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
};

const CustomRadio: React.FC<RadioProps> = ({
  name,
  value,
  label,
  checked,
  onChange,
  disabled = false,
}) => (
  <label
    className={`flex items-center gap-1.25 whitespace-nowrap select-none ${
      disabled ? "cursor-not-allowed opacity-40" : "cursor-pointer"
    }`}
  >
    <input
      type="radio"
      name={name}
      value={value}
      checked={checked}
      onChange={onChange}
      disabled={disabled}
      className="sr-only"
    />

    <span
      className={`flex h-4.75 w-4.75 shrink-0 items-center justify-center rounded-full border ${
        checked ? "border-[#4ade80]" : "border-[#c3cbd3]"
      } bg-white`}
    >
      {checked && (
        <span className="h-2.25 w-2.25 rounded-full bg-[#4ade80]" />
      )}
    </span>

    <span className="text-[14px] leading-4.25 text-[#172b43]">
      {label}
    </span>
  </label>
);

const RadioPanel: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = "" }) => (
  <div
    className={`flex flex-col justify-center gap-1.5 border border-gray-300 rounded-sm bg-white px-1.75 py-1.75 ${className}`}
  >
    {children}
  </div>
);

const AppDatePicker: React.FC<{
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}> = ({ id, label, value, onChange }) => (
  <LocalizationProvider dateAdapter={AdapterDayjs}>
    <DatePicker
      value={value ? dayjs(value, DATE_FORMAT) : null}
      onChange={(newValue) => {
        onChange(
          newValue?.isValid() ? newValue.format(DATE_FORMAT) : ""
        );
      }}
      format={DATE_FORMAT}
      slotProps={{
        textField: {
          id,
          slotProps: {
            htmlInput: { "aria-label": label },
          },
        },
        openPickerButton: {
          sx: { padding: "2px", margin: 0 },
        },
        inputAdornment: {
          sx: { margin: 0, padding: 0 },
        },
      }}
      sx={{
        width: "100%",
        minWidth: 0,
        "& .MuiPickersTextField-root": {
          width: "100%",
        },
        "& .MuiPickersInputBase-root": {
          width: "100%",
          height: "28px",
          minHeight: "28px",
          boxSizing: "border-box",
          borderRadius: "4px",
          backgroundColor: "#ffffff",
          fontSize: "14px",
          padding: 0,
          overflow: "hidden",
        },
        "& .MuiPickersInputBase-sectionsContainer": {
          paddingLeft: "8px !important",
          paddingRight: "0px !important",
          marginBottom: "-5px !important",
          marginLeft: "0px !important",
          boxSizing: "border-box",
          overflow: "hidden",
        },
        "& .MuiPickersInputBase-sectionContent": {
          fontSize: "14px",
          color: "#344054",
        },
        "& .MuiPickersInputBase-input": {
          minWidth: 0,
          width: "100%",
          fontSize: "14px",
          padding: 0,
          height: "28px",
          boxSizing: "border-box",
        },
        "& .MuiInputAdornment-root": {
          margin: 0,
          padding: 0,
        },
        "& .MuiIconButton-root": {
          width: "22px",
          height: "22px",
          padding: "2px",
          margin: 0,
        },
        "& .MuiSvgIcon-root": {
          fontSize: "15px",
        },
        "& .Mui-disabled": {
          WebkitTextFillColor: "#24364d",
        },
        ...(!value && {
          "&:not(:focus-within) .MuiPickersInputBase-sectionsContainer *": {
            color: "transparent",
          },
        }),
        "& .MuiPickersOutlinedInput-notchedOutline": {
          borderColor: "#B7C7D7 !important",
        },
        "& .MuiPickersInputBase-root:hover .MuiPickersOutlinedInput-notchedOutline":
          {
            borderColor: "#B7C7D7 !important",
          },
        "& .MuiPickersInputBase-root.Mui-focused .MuiPickersOutlinedInput-notchedOutline":
          {
            borderColor: "#B7C7D7 !important",
            borderWidth: "1px",
          },
        "& .MuiPickersInputBase-root.Mui-error .MuiPickersOutlinedInput-notchedOutline":
          {
            borderColor: "#B7C7D7 !important",
          },
      }}
    />
  </LocalizationProvider>
);

const ActionButton: React.FC<{
  children: React.ReactNode;
  onClick: () => void;
  className?: string;
  disabled?: boolean;
}> = ({ children, onClick, className = "", disabled = false }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={`min-w-20 btn-style ${disabled ? "opacity-50" : ""} ${className}`}
  >
    {children}
  </button>
);

const RptZatcaDocumentStatus: React.FC = () => {
  const [branchMode, setBranchMode] = useState("All Branch");
  const [branch, setBranch] = useState<TableSelectOption | null>(null);

  const [documentStatus, setDocumentStatus] = useState("Not Cleared");

  const [dateMode, setDateMode] = useState("By Document Issue Date");

  const [fromDate, setFromDate] = useState(TODAY);
  const [toDate, setToDate] = useState(TODAY);

  const [excludeInterCompany, setExcludeInterCompany] = useState(true);

  const [branchOptions, setBranchOptions] = useState<TableSelectOption[]>([]);
  const [busy, setBusy] = useState(false);

  // rdgReportFile (inside the Print Preview): what Download saves
  const [reportFile, setReportFile] = useState("Excel"); // "Excel" | "PDF"

  // print preview: shown after Print. Print there sends it to the printer,
  // Download saves the "File Format" choice
  const [preview, setPreview] = useState<{
    data: ReportData;
    fileBase: string;
    body: Record<string, unknown>;
  } | null>(null);

  useEffect(() => {
    api<{ data: { fbrname: string; fbrid: string }[] }>("/getBranchList")
      .then(({ data }) =>
        setBranchOptions(
          (data ?? []).map((b) => ({ value: b.fbrid, label: b.fbrname, id: b.fbrid })),
        ),
      )
      .catch((e: Error) => toast.error(e.message));
  }, []);

  // ValidateMe_P (the server checks again) + one call for the report data
  const loadReport = async (): Promise<{
    data: ReportData;
    fileBase: string;
    body: Record<string, unknown>;
  } | null> => {
    if (branchMode === "One Branch" && !branch) {
      toast.error("Please select 'Branch'");
      return null;
    }
    if (!fromDate) {
      toast.error("Please select 'From Date'");
      return null;
    }
    if (!toDate) {
      toast.error("Please select 'To Date'");
      return null;
    }
    if (dayjs(fromDate, DATE_FORMAT).isAfter(dayjs(toDate, DATE_FORMAT))) {
      toast.error("'To Date' should be greater than or equal to 'From Date'");
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
      fromDate,
      toDate,
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
      toast.error((e as Error).message);
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

  // Print in the preview: the browser print dialog (printer)
  const handlePreviewPrint = () => {
    if (!preview || busy) return;
    try {
      printZatcaDocumentStatusReport(preview.data);
    } catch {
      toast.error("Could not open the print view");
    }
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
      toast.error(message);
      return null;
    }

    return res.blob();
  };

  // Download in the preview: saves the chosen file ("Save as" window, so the
  // browser does not open it afterwards). A double click must not start two
  // saves (state is not updated yet on the second click, so a ref is used)
  const downloading = useRef(false);

  const handlePreviewOk = async () => {
    if (!preview || busy || downloading.current) return;
    downloading.current = true;
    const { data, fileBase, body } = preview;
    const asPdf = reportFile === "PDF";

    setBusy(true);
    try {
      const blob = asPdf ? await buildPdfBlob(data) : await fetchExcel(body);
      if (!blob) return; // the error is already shown

      const kind = asPdf ? "pdf" : "xlsx";
      const saved = await saveFile(blob, `${fileBase}.${kind}`, kind);
      if (saved) {
        toast.success(asPdf ? "PDF file downloaded" : "Excel file downloaded");
        setPreview(null); // cancelled "Save as": the preview stays
      }
    } catch {
      toast.error(asPdf ? "Could not create the PDF file" : "Could not create the Excel file");
    } finally {
      downloading.current = false;
      setBusy(false);
    }
  };

  // 40px left / 20px right margin for the preview only
  const previewHtml = useMemo(
    () =>
      preview
        ? buildReportHtml(preview.data).replace(
            "</head>",
            "<style>body{padding-left:40px;padding-right:20px}</style></head>",
          )
        : "",
    [preview],
  );

  const handleClose = () => {
    setReportFile("Excel");
    setPreview(null);
    window.history.back();
  };

  // Escape closes the preview. Alt+P prints, Alt+C closes (Ctrl+P of the old
  // form clashes with the browser). Re-attached every render so it always sees
  // the latest state.
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
    <div className="min-h-full w-full bg-white p-1 sm:p-2">
      <main className="mx-auto w-full max-w-165 overflow-hidden rounded-[3px] border border-[#91a7bb] bg-white shadow-sm">

        {/* Header */}
        <Header Name="ZATCA Status" />

        <section className="relative min-h-60 px-3.5 pb-3 pt-3.5">

          <div className="grid grid-cols-[minmax(0,1fr)_172px] gap-x-4.75 gap-y-3">

            {/* Branch Selection */}
            <div className="flex min-w-0 items-start gap-2">
              <RadioPanel className="h-17.5 w-30">
                <CustomRadio
                  name="rgdBranch"
                  value="One Branch"
                  label="One Branch"
                  checked={branchMode === "One Branch"}
                  onChange={() => setBranchMode("One Branch")}
                />

                <CustomRadio
                  name="rgdBranch"
                  value="All Branch"
                  label="All Branches"
                  checked={branchMode === "All Branch"}
                  onChange={() => setBranchMode("All Branch")}
                />
              </RadioPanel>

              {branchMode === "One Branch" && (
                <div className="w-62.5 min-w-0 pt-1.5">
                  <CommonTableSelect
                    inputId="zatca-document-status-branch"
                    options={branchOptions}
                    value={branch}
                    onChange={setBranch}
                    columns={branchColumns}
                    width="100%"
                    menuWidth="290px"
                    placeholder="Select Branch"
                    menuPortalTarget={
                      typeof document !== "undefined" ? document.body : undefined
                    }
                  />
                </div>
              )}
            </div>

            {/* Document Status */}
            <div className="flex justify-end mr-">
              <RadioPanel className="h-17.5 w-43 ">
                <CustomRadio
                  name="rgdStatus"
                  value="Cleared"
                  label="Cleared"
                  checked={documentStatus === "Cleared"}
                  onChange={() => setDocumentStatus("Cleared")}
                />

                <CustomRadio
                  name="rgdStatus"
                  value="Not Cleared"
                  label="Not Cleared"
                  checked={documentStatus === "Not Cleared"}
                  onChange={() => setDocumentStatus("Not Cleared")}
                />
              </RadioPanel>
            </div>

            {/* Period */}
            <div className="flex min-w-0 items-center gap-1.25">
              <div className="flex h-7.5 w-30 shrink-0 items-center justify-end border border-gray-300 bg-[#FAFBFC] px-1.75">
                <span className="text-[14px] text-[#172b43]">
                  Period :
                </span>
              </div>

              <div className="w-[140px] min-w-0">
                <AppDatePicker
                  id="dtpFromDate"
                  label="Period start date"
                  value={fromDate}
                  onChange={setFromDate}
                />
              </div>

              <div className="w-[140px] min-w-0">
                <AppDatePicker
                  id="dtpToDate"
                  label="Period end date"
                  value={toDate}
                  onChange={setToDate}
                />
              </div>
            </div>

            {/* Date Selection */}
            <div className="flex justify-end mr-0">
              <RadioPanel className="min-h-22.5 w-55">
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
            </div>

            {/* Buttons */}
            <div className="flex items-center justify-center gap-1 pt-0.5">
              <ActionButton
                onClick={handlePrint}
                disabled={busy}
                className="h-9 w-20"
              >
                <u>P</u>rint
              </ActionButton>

              
            </div>

            {/* Exclude Inter Company */}
            <div className="flex justify-end">
              <label className="flex h-6 items-center gap-1 border border-gray-300 bg-[#FAFBFC] px-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={excludeInterCompany}
                  onChange={(e) =>
                    setExcludeInterCompany(e.target.checked)
                  }
                  className="h-3.5 w-3.5 accent-[#64748b]"
                />

                <span className="whitespace-nowrap text-[14px] text-[#172b43]">
                  Exclude Inter Company
                </span>
              </label>
            </div>

          </div>
        </section>
      </main>

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
                  disabled={busy}
                  className="btn-style focus-visible:ring-2 focus-visible:ring-[#64d96e] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <u>P</u>rint
                </button>
                <button
                  id="btnPreviewOk"
                  type="button"
                  autoFocus
                  onClick={handlePreviewOk}
                  disabled={busy}
                  className="btn-style focus-visible:ring-2 focus-visible:ring-[#64d96e] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <u>D</u>ownload
                </button>
                <button
                  id="btnPreviewCancel"
                  type="button"
                  onClick={() => setPreview(null)}
                  disabled={busy}
                  className="btn-style focus-visible:ring-2 focus-visible:ring-[#64d96e] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <u>C</u>lose
                </button>
              </div>

              {/* File Format: what Download saves */}
              <div
                id="rdgReportFile"
                className="relative flex items-center gap-5 border border-[#e0e5ea] bg-white px-10.5 py-2.5"
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
    </div>
  );
};

export default RptZatcaDocumentStatus;
