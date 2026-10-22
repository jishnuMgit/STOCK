import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import React, { useEffect, useMemo, useRef, useState } from "react";
import Select from "react-select";
import { toast } from "react-toastify";
import {
  buildHtml,
  printSoaReport,
  type PrintReport,
} from "./PrintSOAReport";
import { buildSoaPdf } from "./downloadSoaPdf";
import { saveFile } from "./saveFile";
import GridSelect, { type GridOption } from "./GridSelect";

dayjs.extend(customParseFormat);

type Option = {
  value: string;
  label: string;
};

const API = `${import.meta.env.VITE_API_URL}/RptSOA`;

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

// TYPES
type RadioOptionProps = {
  name: string;
  value: string;
  label: string;
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
};

// STATIC OPTIONS
const ageingOptions: Option[] = [
  { value: "WITHOUT", label: "Without Ageing" },
  { value: "WITH", label: "With Ageing" },
];
// values must match tblageingperiod.fageingmode / sp_rptsoa ('Days' | 'Months')
const ageingModeOptions: Option[] = [
  { value: "Days", label: "Days" },
  { value: "Months", label: "Months" },
];
const postStatusOptions: Option[] = [
  { value: "ALL", label: "All" },
  { value: "POSTED", label: "Posted" },
  { value: "UNPOSTED", label: "Unposted" },
];
const printZeroOptions: Option[] = [
  { value: "YES", label: "Yes" },
  { value: "NO", label: "No" },
];

// REACT SELECT STYLE
const selectClassNames = {
  control: ({ isFocused }: { isFocused: boolean }) =>
    `  !min-h-[30px]  !h-[30px]   !rounded-[4px]   !border  !border-[#cfd7df]  !bg-white !shadow-none  !text-[14px]  hover:!border-[#b7c2cd]  ${
      isFocused ? "!border-[#9eacb9] !shadow-none" : ""
    } `,
  valueContainer: () => ` !h-[28px] !py-0 !px-[8px] !overflow-hidden `,
  singleValue: () => ` !m-0  !text-[14px]  !text-[#24364d] `,
  placeholder: () => ` !m-0 !text-[14px] !text-[#7a8794]  `,
  input: () => `!m-0 !p-0 !text-[14px]  !text-[#24364d] `,
  indicatorsContainer: () => `  !h-[28px]`,
  dropdownIndicator: () => ` !p-[4px]  !text-[#5d6b7a] `,
  indicatorSeparator: () => `   !hidden`,
  clearIndicator: () => ` !p-[4px]  !text-[#8b96a3] `,
  menu: () =>
    `   !mt-[1px] !rounded-[4px] !overflow-hidden   !border  !border-[#cfd7df]   !z-[999999]   !shadow-[0_3px_8px_rgba(0,0,0,0.12)] `,
  menuList: () => ` !p-0 !max-h-[180px]  `,
  option: ({ isFocused, isSelected }: { isFocused: boolean; isSelected: boolean }) =>
    `   !cursor-pointer  !px-[8px] !py-[6px] !text-[14px]  ${
      isSelected ? "!bg-[#e7f7ed]" : isFocused ? "!bg-[#f2faf5]" : "!bg-white"
    } !text-[#24364d] `,
};

// CUSTOM RADIO
const CustomRadio: React.FC<RadioOptionProps> = ({ name, value, label, checked, onChange, disabled = false }) => (
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
      onChange={onChange}
      disabled={disabled}
      className="sr-only"
    />
    <span
      className={`flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full border bg-white ${
        checked ? "border-[#4dcc68]" : "border-[#c5ced8]"
      }`}
    >
      <span className={`h-2.5 w-2.5 rounded-full bg-[#4dcc68] ${checked ? "opacity-100" : "opacity-0"}`} />
    </span>
    <span className="text-[14px] font-normal text-[#24364d]">{label}</span>
  </label>
);

// RADIO PANEL
type RadioPanelProps = { title?: string; children: React.ReactNode; className?: string };
const RadioPanel: React.FC<RadioPanelProps> = ({ title, children, className = "" }) => (
  <div className={`relative border border-[#d7dee5] bg-white ${className}`}>
    {title && (
      <div className="absolute left-1/2 -top-2.5 -translate-x-1/2 bg-white px-2 text-[14px] text-[#24364d]">
        {title}
      </div>
    )}
    {children}
  </div>
);

const DATE_FORMAT = "DD-MM-YYYY";

// FIELD LABEL
const FieldLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex h-7.5 items-center justify-end border border-[#d7dee5] bg-[#fafbfc] pr-2 text-[14px] text-[#24364d]">
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

const AppDatePicker: React.FC<AppDatePickerProps> = ({ id, label, value, onChange, disabled = false }) => (
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
        "& .MuiPickersInputBase-root": { width: "140px", height: "30px", minHeight: "30px", boxSizing: "border-box", borderRadius: "4px", backgroundColor: "#ffffff", fontSize: "12px", padding: 0, overflow: "hidden" },
        "& .MuiPickersInputBase-sectionsContainer": { paddingLeft: "10px !important", paddingRight: "0px !important", marginBottom: "-5px !important", marginLeft: "0px !important", boxSizing: "border-box", overflow: "hidden" },
        "& .MuiPickersInputBase-sectionContent": { fontSize: "12px", color: "#344054" },
        "& .MuiPickersInputBase-input": { minWidth: 0, width: "100%", fontSize: "12px", padding: 0, height: "30px", boxSizing: "border-box" },
        "& .MuiInputAdornment-root": { margin: 0, padding: 0 },
        "& .MuiIconButton-root": { width: "24px", height: "24px", padding: "2px", margin: 0 },
        "& .MuiSvgIcon-root": { fontSize: "16px" },
        "& .Mui-disabled": { WebkitTextFillColor: "#24364d" },
        "& .MuiPickersOutlinedInput-notchedOutline": { borderColor: "#B7C7D7 !important" },
        "& .MuiPickersInputBase-root:hover .MuiPickersOutlinedInput-notchedOutline": { borderColor: "#B7C7D7 !important" },
        "& .MuiPickersInputBase-root.Mui-focused .MuiPickersOutlinedInput-notchedOutline": { borderColor: "#B7C7D7 !important", borderWidth: "1px" },
        "& .MuiPickersInputBase-root.Mui-error .MuiPickersOutlinedInput-notchedOutline": { borderColor: "#B7C7D7 !important" },
        "& .MuiPickersInputBase-root.Mui-error:hover .MuiPickersOutlinedInput-notchedOutline": { borderColor: "#B7C7D7 !important" },
        "& .MuiPickersInputBase-root.Mui-error.Mui-focused .MuiPickersOutlinedInput-notchedOutline": { borderColor: "#B7C7D7 !important" },
      }}
    />
  </LocalizationProvider>
);

// ============================================================
// COMPONENT
// ============================================================
type RptSOAPageProps = {
  onClose?: () => void;
};

const RptSOAPage: React.FC<RptSOAPageProps> = () => {
  // radios
  const [branchMode, setBranchMode] = useState<"One Branch" | "All Branches">("All Branches");
  const [reportType, setReportType] = useState<"Customer" | "Supplier">("Customer");
  const [customerMode, setCustomerMode] = useState<
    "One Customer" | "Range Customer" | "All Customers"
  >("One Customer");
  const [divisionMode, setDivisionMode] = useState<"One Division" | "All Division">("All Division");
  const [status, setStatus] = useState<"All" | "Outstanding">("All");

  // lookups
  const [branchOptions, setBranchOptions] = useState<Option[]>([]);
  const [accountIdOptions, setAccountIdOptions] = useState<Option[]>([]);
  const [accountNameOptions, setAccountNameOptions] = useState<Option[]>([]);
  const [divisionIdOptions, setDivisionIdOptions] = useState<Option[]>([]);
  const [divisionNameOptions, setDivisionNameOptions] = useState<Option[]>([]);

  // selections
  const [branch, setBranch] = useState<Option | null>(null);
  const [customerId, setCustomerId] = useState<Option | null>(null); // one account / range FROM
  const [customerName, setCustomerName] = useState<Option | null>(null);
  const [rangeCustomerId, setRangeCustomerId] = useState<Option | null>(null); // range TO
  const [divisionId, setDivisionId] = useState<Option | null>(null);
  const [divisionName, setDivisionName] = useState<Option | null>(null);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [ageing, setAgeing] = useState<Option | null>(ageingOptions[0]);
  const [ageingMode, setAgeingMode] = useState<Option | null>(ageingModeOptions[0]);
  const [postStatus, setPostStatus] = useState<Option | null>(postStatusOptions[0]);
  const [printZeroBalance, setPrintZeroBalance] = useState<Option | null>(printZeroOptions[0]);

  const [printing, setPrinting] = useState(false);

  // rdgReportFile (inside the Print Preview): what Download saves
  const [reportFile, setReportFile] = useState("Excel"); // "Excel" | "PDF"

  // print preview: shown after Print. Print there sends it to the printer,
  // Download saves the "File Format" choice
  const [preview, setPreview] = useState<{
    report: PrintReport;
    fileBase: string;
    payload: Record<string, unknown>;
  } | null>(null);

  const csLabel = reportType === "Supplier" ? "Supplier" : "Customer";
  const hasDivision = customerMode === "One Customer" && divisionIdOptions.length > 0;

  // grid lookups: Branch | ID    and    Customer ID | Customer Name
  const branchGrid = useMemo<GridOption[]>(
    () => branchOptions.map((o) => ({ ...o, cols: [o.label, o.value] })),
    [branchOptions],
  );
  const accountIdGrid = useMemo<GridOption[]>(() => {
    const nameById = new Map(accountNameOptions.map((o) => [o.value, o.label]));
    return accountIdOptions.map((o) => ({
      ...o,
      cols: [o.label, nameById.get(o.value) ?? ""],
    }));
  }, [accountIdOptions, accountNameOptions]);
  const accountNameGrid = useMemo<GridOption[]>(
    () => accountNameOptions.map((o) => ({ ...o, cols: [o.label, o.value] })),
    [accountNameOptions],
  );
  const BRANCH_HEADERS = useMemo(() => ["Branch", "ID"], []);
  const ACCOUNT_HEADERS = useMemo(() => [`${csLabel} ID`, `${csLabel} Name`], [csLabel]);
  const ACCOUNT_NAME_HEADERS = useMemo(() => [`${csLabel} Name`, `${csLabel} ID`], [csLabel]);

  // ------------------------------------------------------------
  // LOAD THE LOOKUPS (VB FillCombos)
  // ------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const [b, a] = await Promise.all([
          apiFetch(`${API}/branches`).then((r) => r.json()),
          apiFetch(`${API}/accounts`).then((r) => r.json()),
        ]);
        if (cancelled) return;

        if (!b.success || !a.success) {
          toast.error(b.message || a.message || "Could not load the lists");
          return;
        }
        setBranchOptions(b.branches);
        setBranch(b.branches[0] ?? null);
        setAccountIdOptions(a.ids);
        setAccountNameOptions(a.names);
      } catch {
        if (!cancelled) toast.error("Could not load the lists");
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const resetDivisions = () => {
    setDivisionIdOptions([]);
    setDivisionNameOptions([]);
    setDivisionId(null);
    setDivisionName(null);
    setDivisionMode("All Division");
  };

  // VB lkpAccountID_EditValueChanged: an account with divisions switches the
  // form to "One Division"; one without keeps "All Division" (locked)
  const loadDivisions = async (accountId: string | null) => {
    resetDivisions();
    if (!accountId) return;
    try {
      const res = await apiFetch(`${API}/divisions/${encodeURIComponent(accountId)}`);
      const data = await res.json();
      if (!data.success) {
        toast.error(data.message || "Could not load the divisions");
        return;
      }
      setDivisionIdOptions(data.ids);
      setDivisionNameOptions(data.names);
      if (data.ids.length > 0) setDivisionMode("One Division");
    } catch {
      toast.error("Could not load the divisions");
    }
  };

  const pickOneAccount = (accountId: string | null) => {
    setCustomerId(accountIdOptions.find((o) => o.value === accountId) ?? null);
    setCustomerName(accountNameOptions.find((o) => o.value === accountId) ?? null);
    loadDivisions(accountId);
  };

  const pickDivision = (divId: string | null) => {
    setDivisionId(divisionIdOptions.find((o) => o.value === divId) ?? null);
    setDivisionName(divisionNameOptions.find((o) => o.value === divId) ?? null);
  };

  const changeCustomerMode = (mode: typeof customerMode) => {
    setCustomerMode(mode);
    setCustomerId(null);
    setCustomerName(null);
    setRangeCustomerId(null);
    resetDivisions();
  };

  const changeReportType = (t: typeof reportType) => {
    setReportType(t);
    changeCustomerMode("One Customer");
  };

  // ------------------------------------------------------------
  // CLEAR
  // ------------------------------------------------------------
  const handleClear = () => {
    setBranchMode("All Branches");
    setReportType("Customer");
    setCustomerMode("One Customer");
    setStatus("All");
    setBranch(branchOptions[0] ?? null);
    setCustomerId(null);
    setCustomerName(null);
    setRangeCustomerId(null);
    resetDivisions();
    setFromDate("");
    setToDate("");
    setAgeing(ageingOptions[0]);
    setAgeingMode(ageingModeOptions[0]);
    setPostStatus(postStatusOptions[0]);
    setPrintZeroBalance(printZeroOptions[0]);
    setReportFile("Excel");
    setPreview(null);
  };

  // ------------------------------------------------------------
  // The criteria sent to the server (the server validates again)
  // ------------------------------------------------------------
  const buildPayload = (): Record<string, unknown> => {
    const withAgeing = ageing?.value === "WITH";
    return {
      branchMode,
      branchId: branch?.value ?? null,
      branchName: branch?.label ?? null,
      reportType,
      accountMode: customerMode,
      accountId: customerMode === "One Customer" ? (customerId?.value ?? null) : null,
      fromAccountId: customerMode === "Range Customer" ? (customerId?.value ?? null) : null,
      toAccountId: customerMode === "Range Customer" ? (rangeCustomerId?.value ?? null) : null,
      divisionMode: hasDivision ? divisionMode : "All Division",
      divisionId: hasDivision ? (divisionId?.value ?? null) : null,
      fromDate,
      toDate,
      ageing: withAgeing,
      ageingMode: withAgeing ? (ageingMode?.value ?? null) : null,
      postStatus: postStatus?.value ?? "ALL",
      print0Balance: printZeroBalance?.value === "YES",
      soaType: status === "Outstanding" ? "Outstanding" : "All",
    };
  };

  // VB ValidateMe (quick messages; the server checks the same things)
  const validate = (): string | null => {
    if (branchMode === "One Branch" && !branch) return "Please select a 'Branch'";

    if (customerMode === "One Customer") {
      if (!customerId) return "Please select an 'Account'";
      if (hasDivision && divisionMode === "One Division" && !divisionId)
        return "Please select 'Division'";
    } else if (customerMode === "Range Customer") {
      if (!customerId) return "Please select 'From Account ID'";
      if (!rangeCustomerId) return "Please select 'To Account ID'";
    }

    if (!fromDate) return "Please select 'From Date'";
    if (!toDate) return "Please select 'To Date'";
    if (dayjs(fromDate, DATE_FORMAT).isAfter(dayjs(toDate, DATE_FORMAT)))
      return "'To Date' should be greater than 'From Date'";

    if (ageing?.value === "WITH" && !ageingMode) return "Please select an 'Ageing Mode'";
    if (!postStatus) return "Please select an 'Option'";
    return null;
  };

  // gets the .xlsx made by the server (null after an error message)
  const fetchExcel = async (payload: Record<string, unknown>): Promise<Blob | null> => {
    const res = await apiFetch(`${API}/excel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    // an error comes back as JSON, the file as a blob
    if (!res.ok) {
      let message = "Could not create the Excel file";
      try {
        const data = await res.json();
        message = data.message || message;
      } catch {
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
  // The criteria go to the server, which returns the report; the Print
  // Preview is then shown (Print = printer, Download = Excel / PDF).
  // ------------------------------------------------------------
  const handlePrint = async () => {
    if (printing || preview) return;

    const problem = validate();
    if (problem) {
      toast.warning(problem, { toastId: "soa-validate" });
      return;
    }

    const payload = buildPayload();
    setPrinting(true);
    try {
      const res = await apiFetch(`${API}/print`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        toast.error(data.message || "Could not prepare the report");
        return;
      }

      setPreview({ report: data.report, fileBase: data.fileBase, payload });
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
      printSoaReport(preview.report);
    } catch {
      toast.error("Could not open the print view");
    }
  };

  // Download in the preview: saves the chosen file ("Save as" window, so the
  // browser does not open it afterwards). A double click must not start two
  // saves (state is not updated yet on the second click, so a ref is used).
  const downloading = useRef(false);

  const handlePreviewOk = async () => {
    if (!preview || printing || downloading.current) return;
    downloading.current = true;
    const { report, fileBase, payload } = preview;
    const asPdf = reportFile === "PDF";

    setPrinting(true);
    try {
      const blob = asPdf ? buildSoaPdf(report) : await fetchExcel(payload);
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

  // Alt+P prints, Alt+C clears, Escape closes the preview. Re-attached every
  // render so it always sees the latest state.
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
        handleClear();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  // SELECT PROPS
  const selectProps = {
    isSearchable: true,
    isClearable: false,
    placeholder: "",
    classNames: selectClassNames,
    menuPosition: "fixed" as const,
    menuPortalTarget: typeof document !== "undefined" ? document.body : undefined,
  };

  return (
    <div className="flex min-h-full w-full items-start justify-center bg-white px-4 py-4">
      {/* MAIN PAGE */}
      <div className="max-w-220 min-w-220 overflow-hidden border border-gray-400 bg-white">
        <header className="flex h-7.5 items-center justify-start bg-[#9fdfbc] pl-3 text-[18px] font-semibold text-slate-700">
          Statement Of Account
        </header>

        <div className="relative px-5 pb-3.5 pt-3">
          {/* TOP ROW */}
          <div className="grid grid-cols-[200px_1fr_220px] items-start gap-4.5">
            <RadioPanel className="h-20.5 px-4 py-3">
              <div className="flex flex-col gap-2.5">
                <CustomRadio name="branchMode" value="One Branch" label="One Branch"
                  checked={branchMode === "One Branch"} onChange={() => setBranchMode("One Branch")} />
                <CustomRadio name="branchMode" value="All Branches" label="All Branches"
                  checked={branchMode === "All Branches"} onChange={() => setBranchMode("All Branches")} />
              </div>
            </RadioPanel>

            {/* BRANCH SELECT (hidden when All Branches, like the VB form) */}
            <div className="w-62.5 pt-2">
              {branchMode === "One Branch" && (
                <GridSelect inputId="lkpBranch" instanceId="lkpBranch"
                  options={branchGrid} value={branch} onChange={setBranch}
                  headers={BRANCH_HEADERS} colTemplate="1fr 70px" extraWidth={70}
                  {...selectProps} />
              )}
            </div>

            <RadioPanel className="h-20.5 px-4 py-3 w-[85%] ml-[15%]">
              <div className="flex flex-col gap-2.5">
                <CustomRadio name="reportType" value="Customer" label="Customer"
                  checked={reportType === "Customer"} onChange={() => changeReportType("Customer")} />
                <CustomRadio name="reportType" value="Supplier" label="Supplier"
                  checked={reportType === "Supplier"} onChange={() => changeReportType("Supplier")} />
              </div>
            </RadioPanel>
          </div>

          {/* CUSTOMER SECTION */}
          <div className="mt-2.5 grid grid-cols-[200px_120px_minmax(0,1fr)] gap-4.5">
            <RadioPanel className="h-30 px-4 py-3">
              <div className="flex flex-col gap-2.5">
                <CustomRadio name="customerMode" value="One Customer" label={`One ${csLabel}`}
                  checked={customerMode === "One Customer"} onChange={() => changeCustomerMode("One Customer")} />
                <CustomRadio name="customerMode" value="Range Customer" label={`Range ${csLabel}`}
                  checked={customerMode === "Range Customer"} onChange={() => changeCustomerMode("Range Customer")} />
                <CustomRadio name="customerMode" value="All Customers" label={`All ${csLabel}s`}
                  checked={customerMode === "All Customers"} onChange={() => changeCustomerMode("All Customers")} />
              </div>
            </RadioPanel>

            {/* ACCOUNT ID */}
            <div className="flex w-30 flex-col gap-2.5 pt-3">
              {customerMode === "One Customer" && (
                <GridSelect inputId="lkpOneCustomerID" instanceId="lkpOneCustomerID"
                  options={accountIdGrid} value={customerId}
                  onChange={(s) => pickOneAccount(s?.value ?? null)}
                  headers={ACCOUNT_HEADERS} colTemplate="140px 1fr" menuWidth={500}
                  {...selectProps} />
              )}
              {customerMode === "Range Customer" && (
                <div className="mt-7">
                  <GridSelect inputId="lkpRangeStartCustomerID" instanceId="lkpRangeStartCustomerID"
                    options={accountIdGrid} value={customerId} onChange={setCustomerId}
                    headers={ACCOUNT_HEADERS} colTemplate="140px 1fr" menuWidth={500}
                    {...selectProps} />
                </div>
              )}
            </div>

            {/* ACCOUNT NAME */}
            <div className="min-w-0 w-full flex flex-col gap-2.5 pt-3">
              {customerMode === "One Customer" && (
                <GridSelect inputId="lkpOneCustomerName" instanceId="lkpOneCustomerName"
                  options={accountNameGrid} value={customerName}
                  onChange={(s) => pickOneAccount(s?.value ?? null)}
                  headers={ACCOUNT_NAME_HEADERS} colTemplate="1fr 140px" extraWidth={140}
                  {...selectProps} />
              )}
              {customerMode === "Range Customer" && (
                <div className="w-30 mt-7">
                  <GridSelect inputId="lkpRangeEndCustomerID" instanceId="lkpRangeEndCustomerID"
                    options={accountIdGrid} value={rangeCustomerId} onChange={setRangeCustomerId}
                    headers={ACCOUNT_HEADERS} colTemplate="140px 1fr" menuWidth={500}
                    {...selectProps} />
                </div>
              )}
            </div>
          </div>

          {/* DIVISION */}
          <div className="mt-2.5 grid grid-cols-[200px_120px_minmax(0,1fr)] gap-4.5">
            <RadioPanel className="h-20.5 px-4 py-3">
              <div className="flex flex-col gap-2.5">
                <CustomRadio name="divisionMode" value="One Division" label="One Division"
                  disabled={!hasDivision}
                  checked={divisionMode === "One Division"} onChange={() => setDivisionMode("One Division")} />
                <CustomRadio name="divisionMode" value="All Division" label="All Division"
                  disabled={!hasDivision}
                  checked={divisionMode === "All Division"}
                  onChange={() => { setDivisionMode("All Division"); setDivisionId(null); setDivisionName(null); }} />
              </div>
            </RadioPanel>

            <div className="w-30 pt-6.5">
              {hasDivision && divisionMode === "One Division" && (
                <Select inputId="lkpOneDivisionID" instanceId="lkpOneDivisionID"
                  options={divisionIdOptions} value={divisionId}
                  onChange={(s) => pickDivision(s?.value ?? null)} {...selectProps} />
              )}
            </div>
            <div className="min-w-0 w-[102%] -ml-2.5 pt-6.5">
              {hasDivision && divisionMode === "One Division" && (
                <Select inputId="lkpOneDivisionName" instanceId="lkpOneDivisionName"
                  options={divisionNameOptions} value={divisionName}
                  onChange={(s) => pickDivision(s?.value ?? null)} {...selectProps} />
              )}
            </div>
          </div>

          {/* LOWER SECTION */}
          <div className="mt-2.5 grid grid-cols-[240px_1fr_220px] gap-4.5">
            <div className="col-span-2 grid grid-cols-[200px_160px_1fr] items-center gap-x-4.5 gap-y-2">
              <FieldLabel>Period :</FieldLabel>
              <div className="col-span-2 flex gap-2">
                <AppDatePicker id="dtpFromDate" label="From Date" value={fromDate} onChange={setFromDate} />
                <AppDatePicker id="dtpToDate" label="To Date" value={toDate} onChange={setToDate} />
              </div>

              <FieldLabel>Ageing :</FieldLabel>
              <div className="w-45">
                <Select inputId="lkpAgeing" instanceId="lkpAgeing" options={ageingOptions}
                  value={ageing} onChange={setAgeing} {...selectProps} />
              </div>
              <div />

              <FieldLabel>Ageing Mode :</FieldLabel>
              <div className="w-45">
                <Select inputId="lkpAgeingMode" instanceId="lkpAgeingMode" options={ageingModeOptions}
                  value={ageingMode} onChange={setAgeingMode}
                  isDisabled={ageing?.value !== "WITH"} {...selectProps} />
              </div>
              <div />

              <FieldLabel>Post Status :</FieldLabel>
              <div className="w-45">
                <Select inputId="lkpPostStatus" instanceId="lkpPostStatus" options={postStatusOptions}
                  value={postStatus} onChange={setPostStatus} {...selectProps} />
              </div>
              <div />

              <FieldLabel>Print 0 Balance :</FieldLabel>
              <div className="w-45">
                <Select inputId="lkpPrint0Balance" instanceId="lkpPrint0Balance" options={printZeroOptions}
                  value={printZeroBalance} onChange={setPrintZeroBalance} {...selectProps} />
              </div>
              <div />
            </div>

            {/* SOA TYPE */}
            <RadioPanel title="SOA Type" className="h-22.5 px-4 py-3 w-[85%] ml-[15%]">
              <div className="flex flex-col gap-2.5">
                <CustomRadio name="rdgOutstandingSOA" value="Outstanding SOA" label="Outstanding SOA"
                  checked={status === "Outstanding"} onChange={() => setStatus("Outstanding")} />
                <CustomRadio name="rdgSOA" value="SOA" label="SOA"
                  checked={status === "All"} onChange={() => setStatus("All")} />
              </div>
            </RadioPanel>
          </div>

          {/* BUTTONS */}
          <div className="mt-4 flex justify-center gap-3">
            <button type="button" onClick={handlePrint} disabled={printing}
              className="btn-style disabled:cursor-not-allowed disabled:opacity-40">
              <u>P</u>rint
            </button>
            <button type="button" onClick={handleClear} disabled={printing}
              className="btn-style disabled:cursor-not-allowed disabled:opacity-40">
              <u>C</u>lear
            </button>
          </div>
        </div>
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
                <button id="btnPreviewPrint" type="button" onClick={handlePreviewPrint}
                  disabled={printing}
                  className="btn-style focus-visible:ring-2 focus-visible:ring-[#64d96e] disabled:cursor-not-allowed disabled:opacity-40">
                  <u>P</u>rint
                </button>
                <button id="btnPreviewOk" type="button" autoFocus onClick={handlePreviewOk}
                  disabled={printing}
                  className="btn-style focus-visible:ring-2 focus-visible:ring-[#64d96e] disabled:cursor-not-allowed disabled:opacity-40">
                  <u>D</u>ownload
                </button>
                <button id="btnPreviewCancel" type="button" onClick={() => setPreview(null)}
                  disabled={printing}
                  className="btn-style focus-visible:ring-2 focus-visible:ring-[#64d96e] disabled:cursor-not-allowed disabled:opacity-40">
                  <u>C</u>lose
                </button>
              </div>

              {/* File Format: what Download saves */}
              <div id="rdgReportFile"
                className="relative flex items-center gap-5 border border-[#e0e5ea] bg-white px-10.5 py-2.5">
                <span className="absolute -top-2.5 left-2.5 bg-white px-1 text-[13px] text-[#405066]">
                  File Format
                </span>
                <CustomRadio name="rdgReportFile" value="Excel" label="Excel"
                  checked={reportFile === "Excel"} onChange={() => setReportFile("Excel")} />
                <CustomRadio name="rdgReportFile" value="PDF" label="PDF"
                  checked={reportFile === "PDF"} onChange={() => setReportFile("PDF")} />
              </div>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
};

export default RptSOAPage;
