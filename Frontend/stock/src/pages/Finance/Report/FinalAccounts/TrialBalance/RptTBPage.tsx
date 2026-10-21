import React, { useEffect, useMemo, useState } from "react";
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
import { downloadTrialBalancePdf } from "./downloadTrialBalancePdf";
import { buildHtml, type PrintReport } from "./printTrialBalanceReport";

dayjs.extend(customParseFormat); // needed for dayjs(value, "DD-MM-YYYY")

type Option = {
  value: string;
  label: string;
};

type RadioOptionProps = {
  name: string;
  value: string;
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: () => void;
};

type Branch = { brId: string; brName: string };

const DATE_FORMAT = "DD-MM-YYYY";

const API = `${import.meta.env.VITE_API_URL}/RptTB`;

// Sends the login cookie, and the company / user kept at sign-in as a stopgap
// (the server uses its session first and only falls back to these).
const withLogin = (url: string) => {
  const coId = localStorage.getItem("PstrCoID") ?? "";
  const userId = localStorage.getItem("PstrUserID") ?? "";
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}coId=${encodeURIComponent(coId)}&userId=${encodeURIComponent(userId)}`;
};

const apiFetch = (url: string, init: RequestInit = {}) =>
  fetch(withLogin(url), { credentials: "include", ...init });

const postStatusOptions: Option[] = [
  { value: "ALL", label: "All" },
  { value: "POSTED", label: "Posted" },
  { value: "UNPOSTED", label: "Unposted" },
];

const yesNoOptions: Option[] = [
  { value: "YES", label: "Yes" },
  { value: "NO", label: "No" },
];

// what sp_rpttb expects
const POST_STATUS: Record<string, number> = { ALL: 2, POSTED: 1, UNPOSTED: 0 };
const TRANS_TYPE: Record<string, number> = { All: 2, Generated: 1, Manual: 0 };

const selectClassNames = {
  control: ({
    isFocused,
    isDisabled,
  }: {
    isFocused: boolean;
    isDisabled: boolean;
  }) => `
    !min-h-[25px] !h-[30px] !rounded-[4px] !border !shadow-none !text-[13px]
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
    !cursor-pointer !px-[6px] !py-[5px] !text-[13px] !text-[#24364d]
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

// ---- two-column lookup list (Item ID | Item Name, like the grid lookups) ----
type ItemOption = Option & { id: string; name: string };

const itemListClassNames = (menuWidth: string) => ({
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

// the first column is exactly as wide as the box; the second column hangs
// outside the box to the right
const makeItemMenuList = (
  cols: string,
  first: string,
  second: string,
  headerBg = "bg-[#f5f6fa]", // same header colour for every lookup
) => {
  const ItemMenuList = (props: MenuListProps<ItemOption, false>) => (
    <components.MenuList {...props}>
      <div
        className={`${cols} sticky top-0 z-[1] border-b border-[#cfd7df] ${headerBg} text-[13px] font-semibold text-[#24364d]`}
      >
        <div className="border-r border-[#cfd7df] px-[8px] py-[7px]">
          {first}
        </div>
        <div className="px-[8px] py-[7px]">{second}</div>
      </div>
      {props.children}
    </components.MenuList>
  );
  return ItemMenuList;
};

const makeItemOption = (cols: string, idFirst: boolean) => {
  const ItemOptionRow = (props: OptionProps<ItemOption, false>) => {
    const { id, name } = props.data;
    return (
      <components.Option {...props}>
        <div className={cols}>
          <div className="truncate px-[8px] py-[6px]">{idFirst ? id : name}</div>
          <div className="truncate px-[8px] py-[6px]">{idFirst ? name : id}</div>
        </div>
      </components.Option>
    );
  };
  return ItemOptionRow;
};

// lkpBranch: Branch (= box width) | ID hanging outside to the right
const BRANCH_COLS = "grid grid-cols-[1fr_55px]";
const branchClassNames = itemListClassNames("!w-[calc(100%_+_55px)]");
const branchComponents = {
  MenuList: makeItemMenuList(BRANCH_COLS, "Branch", "ID"),
  Option: makeItemOption(BRANCH_COLS, false),
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
  <div id={id} className={`border border-[#e0e5ea] bg-white ${className}`}>
    {children}
  </div>
);

const FieldLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex h-6.5 items-center justify-end border border-[#e0e5ea] bg-[#fafbfc] pr-2 text-[14px] text-[#405066]">
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
        textField: {
          id,
          slotProps: { htmlInput: { "aria-label": label } },
        },
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
        // keep the same text colour when disabled
        "& .Mui-disabled": { WebkitTextFillColor: "#24364d" },
        // one border colour for every state
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

// ---- Enter moves to the next field (like Tab) ------------------------------
// Branch -> From Date -> To Date -> Account Level -> Post Status
// -> Print 0 Balance -> Print A/C Group -> Print. A disabled field is skipped.
const NAV_ORDER = [
  "lkpBranch",
  "dtpFromDate",
  "dtpToDate",
  "txtAccountLevel",
  "lkpPostStatus",
  "lkpPrint0Balance",
  "lkpPrintACGroup",
  "btnPrint",
] as const;
type NavKey = (typeof NAV_ORDER)[number];

const focusField = (key: NavKey): boolean => {
  // a date picker sits inside a [data-nav] wrapper; the others have an id
  const el =
    document.querySelector<HTMLElement>(`[data-nav="${key}"] input`) ??
    document.getElementById(key);

  if (!el || (el as HTMLInputElement).disabled) return false;
  el.focus();
  return true;
};

const focusNext = (from: NavKey) => {
  for (let i = NAV_ORDER.indexOf(from) + 1; i < NAV_ORDER.length; i++) {
    if (focusField(NAV_ORDER[i])) return;
  }
};

const today = () => dayjs().format(DATE_FORMAT);

const toServerDate = (value: string) => value.replace(/-/g, "/"); // DD-MM-YYYY -> DD/MM/YYYY

const RptTBPage: React.FC = () => {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false); // printing or exporting

  const [branchMode, setBranchMode] = useState("One Branch");
  const [branch, setBranch] = useState<ItemOption | null>(null);

  const [fromDate, setFromDate] = useState(today());
  const [toDate, setToDate] = useState(today());

  const [accountLevel, setAccountLevel] = useState("4");
  const [postStatus, setPostStatus] = useState<Option | null>(
    postStatusOptions[0],
  );
  const [printZeroBalance, setPrintZeroBalance] = useState<Option | null>(
    yesNoOptions[1],
  );
  const [printAccountGroup, setPrintAccountGroup] = useState<Option | null>(
    yesNoOptions[0],
  );
  const [entryMode, setEntryMode] = useState("All");
  const [reportFile, setReportFile] = useState("Excel"); // "Excel" | "PDF"

  // print preview: shown after Print, OK then downloads the chosen file
  const [preview, setPreview] = useState<{
    report: PrintReport;
    request: NonNullable<ReturnType<typeof buildRequest>>;
    asPdf: boolean;
  } | null>(null);

  const branchOptions: ItemOption[] = useMemo(
    () =>
      branches.map((b) => ({
        value: b.brId,
        label: b.brName,
        id: b.brId,
        name: b.brName,
      })),
    [branches],
  );

  // VB ConfigurerdgBranchUserID: a user who has one branch only works with it
  // (assumed rule - the old helper is not in the files)
  const canUseAllBranches = branches.length > 1;

  // Enter on a lookup:
  //  - list closed -> go to the next field
  //  - list open   -> Enter picks the highlighted row, then go to the next field
  const [pendingAdvance, setPendingAdvance] = useState<NavKey | null>(null);

  const advanceOnEnter =
    (key: NavKey) => (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key !== "Enter") return;

      const open =
        (event.target as HTMLElement).getAttribute("aria-expanded") === "true";

      if (!open) {
        event.preventDefault();
        focusNext(key);
        return;
      }

      setPendingAdvance(key);
      setTimeout(() => {
        setPendingAdvance(null); // nothing was picked
      }, 0);
    };

  const advanceAfterPick = () => {
    const key = pendingAdvance;
    if (!key) return; // picked with the mouse: stay
    setPendingAdvance(null);
    setTimeout(() => focusNext(key), 0);
  };

  // ------------------------------------------------------------
  // LOAD THE BRANCHES (VB FillCombos)
  // ------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await apiFetch(`${API}/lookups`);
        const data = await res.json();

        if (!res.ok || !data.success) {
          toast.error(data.message || "Failed to load the branches");
          return;
        }
        if (cancelled) return;

        const list = data.branches as Branch[];
        setBranches(list);
        // the first branch is the default
        setBranch(
          list[0]
            ? {
                value: list[0].brId,
                label: list[0].brName,
                id: list[0].brId,
                name: list[0].brName,
              }
            : null,
        );
      } catch {
        if (!cancelled) toast.error("Failed to load the branches");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleClear = () => {
    setBranchMode("One Branch");
    setBranch(branchOptions[0] ?? null);
    setFromDate(today());
    setToDate(today());
    setAccountLevel("4");
    setPostStatus(postStatusOptions[0]);
    setPrintZeroBalance(yesNoOptions[1]);
    setPrintAccountGroup(yesNoOptions[0]);
    setEntryMode("All");
    setReportFile("Excel");
  };

  // ------------------------------------------------------------
  // VB ValidateMe: returns the request body, or null (and says why)
  // ------------------------------------------------------------
  const buildRequest = () => {
    const oneBranch = branchMode === "One Branch";

    if (oneBranch && !branch) {
      toast.warning("Please select a 'Branch'", { toastId: "tb-branch" });
      document.getElementById("lkpBranch")?.focus();
      return null;
    }

    const from = dayjs(fromDate, DATE_FORMAT, true);
    const to = dayjs(toDate, DATE_FORMAT, true);

    if (!fromDate || !from.isValid()) {
      toast.warning("Please select 'From Date'", { toastId: "tb-from" });
      focusField("dtpFromDate");
      return null;
    }
    if (!toDate || !to.isValid()) {
      toast.warning("Please select 'To Date'", { toastId: "tb-to" });
      focusField("dtpToDate");
      return null;
    }
    if (from.isAfter(to)) {
      toast.warning("'To Date' should be greater than 'From Date'", {
        toastId: "tb-range",
      });
      focusField("dtpToDate");
      return null;
    }

    const level = Number(accountLevel);
    if (accountLevel.trim() === "" || !Number.isInteger(level)) {
      toast.warning("Please input an 'Account Level'", { toastId: "tb-level" });
      document.getElementById("txtAccountLevel")?.focus();
      return null;
    }
    if (level < 1 || level > 4) {
      toast.warning("'Account Level' must be from 1 to 4", {
        toastId: "tb-level",
      });
      document.getElementById("txtAccountLevel")?.focus();
      return null;
    }

    if (!postStatus) {
      toast.warning("Please select 'Post Status'", { toastId: "tb-post" });
      document.getElementById("lkpPostStatus")?.focus();
      return null;
    }
    if (!printZeroBalance) {
      toast.warning("Please select 'Print 0 Balance'", { toastId: "tb-zero" });
      document.getElementById("lkpPrint0Balance")?.focus();
      return null;
    }
    if (!printAccountGroup) {
      toast.warning("Please select 'Print A/c Group'", { toastId: "tb-group" });
      document.getElementById("lkpPrintACGroup")?.focus();
      return null;
    }

    return {
      allBranches: !oneBranch,
      branchId: oneBranch ? branch?.value : "",
      fromDate: toServerDate(fromDate),
      toDate: toServerDate(toDate),
      accountLevel: level,
      postStatus: POST_STATUS[postStatus.value],
      print0Bal: printZeroBalance.value === "YES",
      transType: TRANS_TYPE[entryMode],
      printAcGroup: printAccountGroup.value === "YES",
    };
  };

  // file name: TrialBalance_<from>_<to>.<ext> (dates are DD/MM/YYYY)
  const makeFileName = (
    request: NonNullable<ReturnType<typeof buildRequest>>,
    ext: string,
  ) => {
    const ymd = (d: string) => d.split("/").reverse().join("");
    return `TrialBalance_${ymd(request.fromDate)}_${ymd(request.toDate)}.${ext}`;
  };

  // downloads the .xlsx made by the server
  const downloadExcel = async (
    request: NonNullable<ReturnType<typeof buildRequest>>,
  ) => {
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
        /* keep the default message */
      }
      toast.error(message);
      return;
    }

    const disposition = res.headers.get("Content-Disposition") ?? "";
    const name =
      /filename="?([^";]+)"?/i.exec(disposition)?.[1] ?? "TrialBalance.xlsx";

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  // ------------------------------------------------------------
  // PRINT (VB cmdPrint_Click): gets the report and shows the preview.
  // OK in the preview downloads the "Report File" choice (Excel or PDF).
  // ------------------------------------------------------------
  const handlePrint = async () => {
    if (busy || preview) return;

    const request = buildRequest();
    if (!request) return;

    setBusy(true);
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

      setPreview({
        report: data.report,
        request,
        asPdf: reportFile === "PDF",
      });
    } catch {
      toast.error("Could not prepare the report");
    } finally {
      setBusy(false);
    }
  };

  // OK in the preview
  const handlePreviewOk = async () => {
    if (!preview || busy) return;
    const { report, request, asPdf } = preview;

    setBusy(true);
    try {
      if (asPdf) {
        downloadTrialBalancePdf(report, makeFileName(request, "pdf"));
      } else {
        await downloadExcel(request);
      }
      setPreview(null);
    } catch {
      toast.error(
        asPdf ? "Could not create the PDF file" : "Could not create the Excel file",
      );
    } finally {
      setBusy(false);
    }
  };

  const previewHtml = useMemo(
    () =>
      preview
        ? // 10px left / right margin for the preview only
          buildHtml(preview.report).replace(
            "</head>",
            "<style>body{padding-left:10px;padding-right:10px}</style></head>",
          )
        : "",
    [preview],
  );

  // ------------------------------------------------------------
  // EXCEL button: always the .xlsx, whatever "Report File" says
  // ------------------------------------------------------------
  const handleExcel = async () => {
    if (busy || preview) return;

    const request = buildRequest();
    if (!request) return;

    setBusy(true);
    try {
      await downloadExcel(request);
    } catch {
      toast.error("Could not create the Excel file");
    } finally {
      setBusy(false);
    }
  };

  // Alt+P prints, Alt+E exports, Alt+C clears (Ctrl+P of the old form clashes
  // with the browser). Re-attached every render so it sees the latest state.
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
      } else if (event.code === "KeyE") {
        event.preventDefault();
        handleExcel();
      } else if (event.code === "KeyC") {
        event.preventDefault();
        handleClear();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  return (
    <div className="flex min-h-full  w-full items-start justify-center bg-white px-4 py-4">
      <div className="min-h-fit max-w-205 min-w-205 bg-white p-0">
        <main className="w-full overflow-hidden border border-gray-400 bg-white">
          <header className="flex h-7.5 items-center justify-start bg-[#9fdfbc] pl-3 text-[17px] font-semibold text-slate-700">
            Trial Balance
          </header>

          <section className="relative min-h-89.25 px-3.5 pb-5 pt-2.25">
            {/* Branch selection */}
            <div className="grid grid-cols-[168px_220px] items-start gap-3">
              <RadioPanel className="relative mt-0 h-21 px-3.5 py-3">
                <div className="flex flex-col gap-3">
                  <CustomRadio
                    name="branchMode"
                    value="One Branch"
                    label="One Branch"
                    checked={branchMode === "One Branch"}
                    onChange={() => {
                      setBranchMode("One Branch");
                      setTimeout(
                        () => document.getElementById("lkpBranch")?.focus(),
                        50,
                      );
                    }}
                  />
                  <CustomRadio
                    name="branchMode"
                    value="All Branches"
                    label="All Branches"
                    checked={branchMode === "All Branches"}
                    disabled={!canUseAllBranches}
                    onChange={() => setBranchMode("All Branches")}
                  />
                </div>
              </RadioPanel>

              <div
                className={`relative mt-3 w-62.5 ${branchMode === "One Branch" ? "" : "hidden"}`}
              >
                <Select
                  inputId="lkpBranch"
                  instanceId="lkpBranch"
                  options={branchOptions}
                  value={branch}
                  onChange={(option) => {
                    setBranch(option);
                    advanceAfterPick();
                  }}
                  onKeyDown={advanceOnEnter("lkpBranch")}
                  isDisabled={branchMode !== "One Branch" || loading}
                  {...selectProps}
                  classNames={branchClassNames}
                  components={branchComponents}
                />
              </div>
            </div>

            {/* Report File: what the Print button produces */}
            <RadioPanel id="rdgReportFile" className="absolute right-3.5 top-[calc(1.5625rem)] h-21 w-45.75 px-3.5 py-3 max-[700px]:static max-[700px]:mt-3.5">
              <span className="absolute -top-2.5 left-2.5 bg-white px-1 text-[13px] text-[#405066]">
                Report File
              </span>
              <div className="flex flex-col gap-3">
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
            </RadioPanel>

            {/* Period */}
            <div className="mt-2.5 grid grid-cols-[168px_1fr] items-start gap-4">
              <FieldLabel>Period :</FieldLabel>

              <div className="relative  flex items-center gap-2">
                <div
                  data-nav="dtpFromDate"
                  className="contents"
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      focusNext("dtpFromDate");
                    }
                  }}
                >
                  <AppDatePicker
                    id="dtpFromDate"
                    label="From Date"
                    value={fromDate}
                    onChange={setFromDate}
                  />
                </div>
                <div
                  data-nav="dtpToDate"
                  className="contents"
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      focusNext("dtpToDate");
                    }
                  }}
                >
                  <AppDatePicker
                    id="dtpToDate"
                    label="To Date"
                    value={toDate}
                    onChange={setToDate}
                  />
                </div>
              </div>
            </div>

            {/* Lower filters */}
            <div className="mt-3.75 grid w-111.25 grid-cols-[168px_1fr] items-center gap-x-3.75 gap-y-2">
              <FieldLabel>Account Level :</FieldLabel>
              <input
                id="txtAccountLevel"
                type="number"
                min="1"
                max="4"
                value={accountLevel}
                onChange={(event) => setAccountLevel(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    focusNext("txtAccountLevel");
                  }
                }}
                className="h-6.5 w-10 justify-self-start border border-[#cfd7df] bg-white px-2 text-[14px] text-[#24364d] outline-none focus:border-[#91a7b9]"
              />

              <FieldLabel>Post Status :</FieldLabel>
              <div className="w-35">
                <Select
                  inputId="lkpPostStatus"
                  instanceId="lkpPostStatus"
                  options={postStatusOptions}
                  value={postStatus}
                  onChange={(option) => {
                    setPostStatus(option);
                    advanceAfterPick();
                  }}
                  onKeyDown={advanceOnEnter("lkpPostStatus")}
                  {...selectProps}
                />
              </div>

              <FieldLabel>Print 0 Balance :</FieldLabel>
              <div className="w-21">
                <Select
                  inputId="lkpPrint0Balance"
                  instanceId="lkpPrint0Balance"
                  options={yesNoOptions}
                  value={printZeroBalance}
                  onChange={(option) => {
                    setPrintZeroBalance(option);
                    advanceAfterPick();
                  }}
                  onKeyDown={advanceOnEnter("lkpPrint0Balance")}
                  {...selectProps}
                />
              </div>

              <FieldLabel>Print A/C Group :</FieldLabel>
              <div className="w-21">
                <Select
                  inputId="lkpPrintACGroup"
                  instanceId="lkpPrintACGroup"
                  options={yesNoOptions}
                  value={printAccountGroup}
                  onChange={(option) => {
                    setPrintAccountGroup(option);
                    advanceAfterPick();
                  }}
                  onKeyDown={advanceOnEnter("lkpPrintACGroup")}
                  {...selectProps}
                />
              </div>
            </div>

            {/* Entry type */}
            <RadioPanel className="absolute right-3.5 top-51.25 h-28.75 w-45.75 px-3.5 py-3.25 max-[700px]:static max-[700px]:mt-3.5">
              <div className="flex flex-col gap-3">
                <CustomRadio
                  name="entryMode"
                  value="Generated"
                  label="Generated Entries"
                  checked={entryMode === "Generated"}
                  onChange={() => setEntryMode("Generated")}
                />
                <CustomRadio
                  name="entryMode"
                  value="Manual"
                  label="Manual Entries"
                  checked={entryMode === "Manual"}
                  onChange={() => setEntryMode("Manual")}
                />

                <CustomRadio
                  name="entryMode"
                  value="All"
                  label="All"
                  checked={entryMode === "All"}
                  onChange={() => setEntryMode("All")}
                />
              </div>
            </RadioPanel>

            {/* Actions */}
            <div className="mt-4.5 flex justify-center gap-3 max-[700px]:mt-3.5">
              <button
                id="btnPrint"
                type="button"
                onClick={handlePrint}
                disabled={loading || busy}
                title="Alt+P"
                className="btn-style focus-visible:ring-2 focus-visible:ring-[#64d96e] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <u>P</u>rint
              </button>
              {/* <button
                id="btnExcel"
                type="button"
                onClick={handleExcel}
                disabled={loading || busy}
                title="Alt+E"
                className="btn-style focus-visible:ring-2 focus-visible:ring-[#64d96e] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <u>E</u>xcel
              </button> */}
              <button
                id="btnClear"
                type="button"
                onClick={handleClear}
                title="Alt+C"
                className="btn-style focus-visible:ring-2 focus-visible:ring-[#64d96e]"
              >
                <u>C</u>lear
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

            <footer className="flex shrink-0 items-center justify-center gap-3 border-t border-[#e0e5ea] py-3">
              <button
                id="btnPreviewOk"
                type="button"
                autoFocus
                onClick={handlePreviewOk}
                disabled={busy}
                className="btn-style focus-visible:ring-2 focus-visible:ring-[#64d96e] disabled:cursor-not-allowed disabled:opacity-40"
              >
                OK
              </button>
              <button
                id="btnPreviewCancel"
                type="button"
                onClick={() => setPreview(null)}
                disabled={busy}
                className="btn-style focus-visible:ring-2 focus-visible:ring-[#64d96e] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Cancel
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
};

export default RptTBPage;
