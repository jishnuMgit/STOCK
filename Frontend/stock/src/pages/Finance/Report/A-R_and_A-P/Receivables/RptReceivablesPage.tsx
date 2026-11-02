import React, { useEffect, useMemo, useRef, useState } from "react";
import Select, {
  components,
  type MenuListProps,
  type OptionProps,
} from "react-select";
import { toast } from "react-toastify";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { buildReceivablesPdf } from "./downloadReceivablesPdf";
import { saveFile } from "./saveFile";
import {
  buildHtml,
  printReceivablesReport,
  type PrintReport,
} from "./printReceivablesReport";

dayjs.extend(customParseFormat);

type Option = { value: string; label: string };

type RadioOptionProps = {
  name: string;
  value: string;
  label: string;
  checked: boolean;
  onChange: () => void;
};

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
  { value: "UNPOSTED", label: "Unposted" },
];

// what the procedure expects: 0 non posted, 1 posted, 2 all
const POST_STATUS: Record<string, number> = { UNPOSTED: 0, POSTED: 1, ALL: 2 };

const yesNoOptions: Option[] = [
  { value: "YES", label: "Yes" },
  { value: "NO", label: "No" },
];

const selectClassNames = {
  control: ({
    isFocused,
    isDisabled,
  }: {
    isFocused: boolean;
    isDisabled: boolean;
  }) => `
    !min-h-[30px] !h-[30px] !rounded-[4px] !border !shadow-none !text-[14px]
    hover:!border-[#aab8c5]
    ${isDisabled ? "!bg-[#f6f8fa]" : "!bg-white"}
    ${isFocused ? "!border-[#91a7b9]" : "!border-[#cfd7df]"}
  `,
  valueContainer: () => "!h-[23px] !py-0 !px-[5px] !overflow-hidden",
  singleValue: () => "!m-0 !text-[13px] !text-[#24364d]",
  placeholder: () => "!m-0 !text-[13px] !text-[#7a8794]",
  input: () => "!m-0 !p-0 !text-[13px] !text-[#24364d]",
  indicatorsContainer: () => "!h-[23px]",
  dropdownIndicator: () => "!p-[3px] !text-[#657486]",
  indicatorSeparator: () => "!hidden",
  clearIndicator: () => "!p-[3px]",
  menu: () =>
    "!mt-[1px] !rounded-none !border !border-[#cfd7df] !z-[999999] !shadow-md",
  menuList: () => "!p-0 !max-h-[180px]",
  option: ({
    isFocused,
    isSelected,
  }: {
    isFocused: boolean;
    isSelected: boolean;
  }) => `
    !cursor-pointer !px-[6px] !py-[5px] !text-[14px] !text-[#24364d]
    ${isSelected ? "!bg-[#e7f7ed]" : isFocused ? "!bg-[#f2faf5]" : "!bg-white"}
  `,
};

const selectProps = {
  isSearchable: false,
  isClearable: false,
  placeholder: "",
  classNames: selectClassNames,
  menuPosition: "fixed" as const,
  menuPortalTarget: typeof document !== "undefined" ? document.body : undefined,
};

// ---- two-column lookup list (Branch | ID) ----
type LookupOption = Option & { id: string; name: string };

const lookupClassNames = (menuWidth: string) => ({
  ...selectClassNames,
  menu: () =>
    `!mt-[1px] ${menuWidth} !rounded-none !border !border-[#cfd7df] !z-[999999] !shadow-md`,
  menuList: () => "!p-0 !max-h-[240px]",
  option: ({
    isFocused,
    isSelected,
  }: {
    isFocused: boolean;
    isSelected: boolean;
  }) => `
    !cursor-pointer !p-0 !text-[13px] !text-[#24364d]
    ${isSelected ? "!bg-[#e7f7ed]" : isFocused ? "!bg-[#f2faf5]" : "!bg-white"}
  `,
});

const makeMenuList = (cols: string, first: string, second: string) => {
  const LookupMenuList = (props: MenuListProps<LookupOption, false>) => (
    <components.MenuList {...props}>
      <div
        className={`${cols} sticky top-0 z-[1] border-b border-[#cfd7df] bg-[#f5f6fa] text-[13px] font-semibold text-[#24364d]`}
      >
        <div className="border-r border-[#cfd7df] px-[8px] py-[7px]">
          {first}
        </div>
        <div className="px-[8px] py-[7px]">{second}</div>
      </div>
      {props.children}
    </components.MenuList>
  );
  return LookupMenuList;
};

const makeOptionRow = (cols: string) => {
  const LookupOptionRow = (props: OptionProps<LookupOption, false>) => (
    <components.Option {...props}>
      <div className={cols}>
        <div className="truncate px-[8px] py-[6px]">{props.data.name}</div>
        <div className="truncate px-[8px] py-[6px]">{props.data.id}</div>
      </div>
    </components.Option>
  );
  return LookupOptionRow;
};

// Name (= box width) | ID hanging outside the box to the right
const LOOKUP_COLS = "grid grid-cols-[1fr_55px]";
const lookupBoxClassNames = lookupClassNames("!w-[calc(100%_+_55px)]");
const branchComponents = {
  MenuList: makeMenuList(LOOKUP_COLS, "Branch", "ID"),
  Option: makeOptionRow(LOOKUP_COLS),
};

const CustomRadio: React.FC<RadioOptionProps> = ({
  name,
  value,
  label,
  checked,
  onChange,
}) => (
  <label className="flex cursor-pointer items-center gap-2.5 whitespace-nowrap select-none">
    <input
      type="radio"
      name={name}
      value={value}
      checked={checked}
      onChange={onChange}
      className="sr-only"
    />
    <span
      className={`flex h-4.75 w-4.75 shrink-0 items-center justify-center rounded-full border bg-white ${
        checked ? "border-[#64d96e]" : "border-[#cbd3dc]"
      }`}
    >
      <span
        className={`h-2.5 w-2.5 rounded-full bg-[#64d96e] ${
          checked ? "opacity-100" : "opacity-0"
        }`}
      />
    </span>
    <span className="text-[14px] font-normal text-[#35445a]">{label}</span>
  </label>
);

const RadioPanel: React.FC<{
  children: React.ReactNode;
  className?: string;
  id?: string;
}> = ({ children, className = "", id }) => (
  <div
    id={id}
    className={`border border-[#e0e5ea] bg-white px-3.5 py-3 ${className}`}
  >
    <div className="flex flex-col gap-3">{children}</div>
  </div>
);

const FieldLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex h-7.5 items-center justify-end border border-[#e0e5ea] bg-[#fafbfc] pr-3 text-[14px] text-[#405066]">
    {children}
  </div>
);

type AppDatePickerProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

const AppDatePicker: React.FC<AppDatePickerProps> = ({
  id,
  label,
  value,
  onChange,
  disabled = false,
}) => (
  <LocalizationProvider dateAdapter={AdapterDayjs}>
    <DatePicker
      value={value ? dayjs(value, DATE_FORMAT) : null}
      onChange={(newValue) => {
        onChange(newValue?.isValid() ? newValue.format(DATE_FORMAT) : "");
      }}
      format={DATE_FORMAT}
      disabled={disabled}
      slotProps={{
        textField: { id, slotProps: { htmlInput: { "aria-label": label } } },
        openPickerButton: { sx: { padding: "2px", margin: 0 } },
        inputAdornment: { sx: { margin: 0, padding: 0 } },
      }}
      sx={{
        width: "140px",
        "& .MuiPickersTextField-root": { width: "120px" },
        "& .MuiPickersInputBase-root": {
          width: "140px",
          height: "30px",
          minHeight: "30px",
          boxSizing: "border-box",
          borderRadius: "4px",
          backgroundColor: "#ffffff",
          fontSize: "12px",
          padding: 0,
          overflow: "hidden",
        },
        "& .MuiPickersInputBase-sectionsContainer": {
          paddingLeft: "10px !important",
          paddingRight: "0px !important",
          marginBottom: "-5px !important",
          marginLeft: "0px !important",
          boxSizing: "border-box",
          overflow: "hidden",
        },
        "& .MuiPickersInputBase-sectionContent": {
          fontSize: "12px",
          color: "#344054",
        },
        "& .MuiPickersInputBase-input": {
          minWidth: 0,
          width: "100%",
          fontSize: "12px",
          padding: 0,
          height: "30px",
          boxSizing: "border-box",
        },
        "& .MuiInputAdornment-root": { margin: 0, padding: 0 },
        "& .MuiIconButton-root": {
          width: "24px",
          height: "24px",
          padding: "2px",
          margin: 0,
        },
        "& .MuiSvgIcon-root": { fontSize: "16px" },
        "& .Mui-disabled": { WebkitTextFillColor: "#24364d" },
        "& .MuiPickersOutlinedInput-notchedOutline": {
          borderColor: "#B7C7D7 !important",
        },
        "& .MuiPickersInputBase-root:hover .MuiPickersOutlinedInput-notchedOutline":
          { borderColor: "#B7C7D7 !important" },
        "& .MuiPickersInputBase-root.Mui-focused .MuiPickersOutlinedInput-notchedOutline":
          { borderColor: "#B7C7D7 !important", borderWidth: "1px" },
        "& .MuiPickersInputBase-root.Mui-error .MuiPickersOutlinedInput-notchedOutline":
          { borderColor: "#B7C7D7 !important" },
        "& .MuiPickersInputBase-root.Mui-error:hover .MuiPickersOutlinedInput-notchedOutline":
          { borderColor: "#B7C7D7 !important" },
        "& .MuiPickersInputBase-root.Mui-error.Mui-focused .MuiPickersOutlinedInput-notchedOutline":
          { borderColor: "#B7C7D7 !important" },
      }}
    />
  </LocalizationProvider>
);

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
  const [branchOptions, setBranchOptions] = useState<LookupOption[]>([]);

  const [branchMode, setBranchMode] = useState("All Branch"); // rdgBranch
  const [branch, setBranch] = useState<LookupOption | null>(null); // lkpBranch

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
          toast.error(data.message || "Failed to load the lookups");
          return;
        }
        if (cancelled) return;

        const branches: LookupOption[] = (
          data.branches as { brId: string; brName: string }[]
        ).map((b) => ({
          value: b.brId,
          label: b.brName,
          id: b.brId,
          name: b.brName,
        }));

        setBranchOptions(branches);
        setBranch(branches[0] ?? null);
      } catch {
        if (!cancelled) toast.error("Failed to load the lookups");
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
      toast.warning("Please select a 'Branch'", { toastId: "rc-branch" });
      document.getElementById("lkpBranch")?.focus();
      return null;
    }

    if (isPeriod) {
      if (!valid(fromDate)) {
        toast.warning("Please select 'From Date'", { toastId: "rc-from" });
        document.getElementById("dtpFromDate")?.focus();
        return null;
      }
      if (!valid(toDate)) {
        toast.warning("Please select 'To Date'", { toastId: "rc-to" });
        document.getElementById("dtpToDate")?.focus();
        return null;
      }
      if (dayjs(fromDate, DATE_FORMAT).isAfter(dayjs(toDate, DATE_FORMAT))) {
        toast.warning("'To Date' should be greater than 'From Date'", {
          toastId: "rc-range",
        });
        document.getElementById("dtpToDate")?.focus();
        return null;
      }
    } else if (!valid(fromDate)) {
      toast.warning("Please Select 'As on Date'", { toastId: "rc-date" });
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
      toast.error(message);
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
        toast.error(data.message || "Could not prepare the report");
        return;
      }

      setPreview({ report: data.report, fileBase: data.fileBase, request });
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
      printReceivablesReport(preview.report);
    } catch {
      toast.error("Could not open the print view");
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
      const blob = asPdf ? buildReceivablesPdf(report) : await fetchExcel(request);
      if (!blob) return; // the error is already shown

      const kind = asPdf ? "pdf" : "xlsx";
      const saved = await saveFile(blob, `${fileBase}.${kind}`, kind);
      if (saved) {
        setPreview(null); // cancelled "Save as": the preview stays
        toast.success(asPdf ? "PDF file downloaded" : "Excel file downloaded");
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

  const previewHtml = useMemo(
    () =>
      preview
        ? // 40px left / 20px right margin for the preview only
          buildHtml(preview.report).replace(
            "</head>",
            "<style>body{padding-left:40px;padding-right:20px}</style></head>",
          )
        : "",
    [preview],
  );

  const handleClose = () => {
    setBranchMode("All Branch");
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
    <div className="flex min-h-screen w-full items-start justify-center bg-white px-4 py-4">
      <div className="min-h-fit w-205 max-w-full bg-white p-0">
        <main className="w-full overflow-hidden border border-gray-400 bg-white">
          <header className="flex h-7.5 items-center justify-start bg-[#9fdfbc]">
            <h1 className="m-0 ml-3.5 text-[17px] font-semibold text-[#24364d]">
              Receivables
            </h1>
          </header>

          <section className="px-3.5 pb-6 pt-3">
            <div className="grid grid-cols-[168px_1fr] items-start gap-x-4 gap-y-3">
              {/* Branch */}
              <RadioPanel id="rdgBranch">
                <CustomRadio
                  name="rdgBranch"
                  value="One Branch"
                  label="One Branch"
                  checked={branchMode === "One Branch"}
                  onChange={() => setBranchMode("One Branch")}
                />
                <CustomRadio
                  name="rdgBranch"
                  value="All Branch"
                  label="All Branch"
                  checked={branchMode === "All Branch"}
                  onChange={() => setBranchMode("All Branch")}
                />
              </RadioPanel>
              <div className="pt-3">
                {branchMode === "One Branch" && (
                  <div className="w-62.5">
                    <Select<LookupOption, false>
                      inputId="lkpBranch"
                      instanceId="lkpBranch"
                      options={branchOptions}
                      value={branch}
                      onChange={setBranch}
                      {...selectProps}
                      classNames={lookupBoxClassNames}
                      components={branchComponents}
                    />
                  </div>
                )}
              </div>

              {/* Date mode */}
              <RadioPanel id="rdgDate">
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
              <div
                className={`flex items-start gap-2 ${isPeriod ? "pt-9.5" : "pt-1.75"}`}
              >
                <AppDatePicker
                  id="dtpFromDate"
                  label={isPeriod ? "From Date" : "As On Date"}
                  value={fromDate}
                  onChange={setFromDate}
                />
                {isPeriod && (
                  <AppDatePicker
                    id="dtpToDate"
                    label="To Date"
                    value={toDate}
                    onChange={setToDate}
                  />
                )}
              </div>

              {/* Post status */}
              <FieldLabel>Post Status :</FieldLabel>
              <div className="w-35">
                <Select
                  inputId="lkpPostStatus"
                  instanceId="lkpPostStatus"
                  options={postStatusOptions}
                  value={postStatus}
                  onChange={setPostStatus}
                  {...selectProps}
                />
              </div>

              {/* Print 0 balance */}
              <FieldLabel>Print 0 Balance :</FieldLabel>
              <div className="w-25">
                <Select
                  inputId="lkpPrint0Balance"
                  instanceId="lkpPrint0Balance"
                  options={yesNoOptions}
                  value={printZeroBalance}
                  onChange={setPrintZeroBalance}
                  {...selectProps}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 flex justify-center gap-3">
              <button
                id="btnPrint"
                type="button"
                onClick={handlePrint}
                disabled={printing}
                title="Alt+P"
                className="btn-style disabled:cursor-not-allowed disabled:opacity-40"
              >
                <u>P</u>rint
              </button>
              <button
                id="btnClose"
                type="button"
                onClick={handleClose}
                title="Alt+C"
                className="btn-style"
              >
                <u>C</u>lose
              </button>
            </div>
          </section>
        </main>
      </div>

      {/* Print preview */}
      {preview && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/40 p-4">
          <div className="flex h-[90vh] w-full max-w-250 flex-col overflow-hidden border border-gray-400 bg-white shadow-xl">
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
                <button
                  id="btnPreviewCancel"
                  type="button"
                  onClick={() => setPreview(null)}
                  disabled={printing}
                  className="btn-style focus-visible:ring-2 focus-visible:ring-[#64d96e] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <u>C</u>lose
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
      )}
    </div>
  );
};

export default RptReceivablesPage;
