import React, { useEffect, useMemo, useState } from "react";
import Select from "react-select";
import RadioGroup from "../../../../components/common/RadioGroup";
import { useEnterAsTab } from "../../../../hooks/useEnterAsTab";
import { useAltShortcuts } from "../../../../hooks/useAltShortcuts";
import { useGridCellFocus } from "../../../../hooks/useGridCellFocus";
import { useAdvanceAfterSelect } from "../../../../hooks/useAdvanceAfterSelect";
import { useInitialFocus } from "../../../../hooks/useInitialFocus";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { toast } from "react-toastify";
import {
  BranchDividedMenuList,
  BranchDividedOption,
  branchMenuStyles,
  filterLabelOrValue,
} from "../../../../components/BranchSelect/branchSelectParts";
import {
  filterPairOption,
  makePairComponents,
  makePairDividedMenuStyles,
  type PairOption,
} from "../../../../components/PairSelect/pairSelectParts";
import { usePairMenuHang } from "../../../../hooks/usePairMenuHang";
import ReportPreview from "../../../../components/common/ReportPreview";
import { buildStockValuationPdf } from "../../../../components/Purchase/Report/RptStockValuation/RptStockValuationPdf";
import {
  buildHtml,
  printStockValuationReport,
  type PrintReport,
} from "../../../../components/Purchase/Report/RptStockValuation/RptStockValuationPrintReport";
dayjs.extend(customParseFormat);

type Option = { value: string; label: string };

const DATE_FORMAT = "DD-MM-YYYY";

/* Replace these with data from your API */
const api = import.meta.env.VITE_API_URL;

// the Post Status and its codes - the same as the Stock report: 0 All, 1 Posted, 2 Non Posted
const postStatusOptions: Option[] = [
  { value: "0", label: "All" },
  { value: "1", label: "Posted" },
  { value: "2", label: "Non Posted" },
];

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
// The Branch box: the "Branch | ID" list of the other screens, searchable on either column.
const branchProps = {
  ...selectProps,
  isSearchable: true,
  classNames: {
    control: selectClassNames.control,
    valueContainer: selectClassNames.valueContainer,
    singleValue: selectClassNames.singleValue,
    placeholder: selectClassNames.placeholder,
    input: selectClassNames.input,
    indicatorsContainer: selectClassNames.indicatorsContainer,
    dropdownIndicator: selectClassNames.dropdownIndicator,
    indicatorSeparator: selectClassNames.indicatorSeparator,
    clearIndicator: selectClassNames.clearIndicator,
    option: selectClassNames.option,
  },
  styles: branchMenuStyles,
  components: { Option: BranchDividedOption, MenuList: BranchDividedMenuList },
  filterOption: filterLabelOrValue,
};
// The Item Group boxes: the "ID | Name" lists of Beginning Stock - the Group ID box opens
// "Group ID | Group Name", the Group Name box opens "Group Name | Group ID", both searchable on
// either column, and picking from one fills the other. Created once, outside the page.
const groupIdComponents = makePairComponents("Group ID", "Group Name", false, true);
const groupNameComponents = makePairComponents("Group ID", "Group Name", true, true);

// how far the Group Name list hangs past its box (its Group ID column)
const NAME_MENU_HANG = 120;

// the look of the other boxes, but the open list is the pair list's own
const pairProps = {
  ...selectProps,
  isSearchable: true,
  classNames: {
    control: selectClassNames.control,
    valueContainer: selectClassNames.valueContainer,
    singleValue: selectClassNames.singleValue,
    placeholder: selectClassNames.placeholder,
    input: selectClassNames.input,
    indicatorsContainer: selectClassNames.indicatorsContainer,
    dropdownIndicator: selectClassNames.dropdownIndicator,
    indicatorSeparator: selectClassNames.indicatorSeparator,
    clearIndicator: selectClassNames.clearIndicator,
    option: ({ isFocused, isSelected }: { isFocused: boolean; isSelected: boolean }) =>
      `!cursor-pointer !text-[#24364d] ${
        isSelected ? "!bg-[#e7f7ed]" : isFocused ? "!bg-[#f2faf5]" : "!bg-white"
      }`,
  },
  filterOption: filterPairOption,
};

const FieldLabel: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = "" }) => (
  <div
    className={`flex h-[30px] items-center border border-[#e0e5ea] bg-[#fafbfc] px-3 text-[14px] text-[#405066] ${className}`}
  >
    {children}
  </div>
);

type AppDatePickerProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
};

const AppDatePicker: React.FC<AppDatePickerProps> = ({
  id,
  label,
  value,
  onChange,
}) => (
  <LocalizationProvider dateAdapter={AdapterDayjs}>
    <DatePicker
      value={value ? dayjs(value, DATE_FORMAT) : null}
      onChange={(newValue) => {
        onChange(newValue?.isValid() ? newValue.format(DATE_FORMAT) : "");
      }}
      format={DATE_FORMAT}
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
          fontSize: "14px",
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
          fontSize: "14px",
          color: "#344054",
        },
        "& .MuiPickersInputBase-input": {
          minWidth: 0,
          width: "100%",
          fontSize: "14px",
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
        // blank look (no "DD-MM-YYYY" hint) while empty and not focused
        ...(!value && {
          "&:not(:focus-within) .MuiPickersInputBase-sectionsContainer *": {
            color: "transparent",
          },
        }),
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

type RptStockValuationPageProps = {
  onClose?: () => void;
};

const RptStockValuationPage: React.FC<RptStockValuationPageProps> = ({ onClose }) => {
  // Enter moves on like Tab; the box the cursor is in is outlined; after a pick from a list the
  // cursor goes on
  const handleEnterAsTab = useEnterAsTab();
  const { cellFocusClass } = useGridCellFocus();
  const { advanceAfterPick, advanceOnEnter } = useAdvanceAfterSelect();

  // the lookups have been asked for (found or not): the cursor can start
  const [lookupsLoaded, setLookupsLoaded] = useState(false);

  const [rdgBranch, setRdgBranch] = useState("One Branch"); // rdgBranch
  const [lkpBranch, setLkpBranch] = useState<Option | null>(null); // lkpBranch

  // the branches the logged-in user has a right to, and the user's default branch
  const [branchOptions, setBranchOptions] = useState<Option[]>([]);
  const [defaultBranch, setDefaultBranch] = useState<Option | null>(null);

  // Selected Branch: the ticked branches (their ids)
  const [chkBranch, setChkBranch] = useState<string[]>([]); // chkBranch

  // the item groups of the company
  const [groupRows, setGroupRows] = useState<
    { lkpItemGroupID: string; txtItemGroupName: string }[]
  >([]);

  // the Group ID list covers the Group ID box AND the Group Name box next to it (measured when it opens)
  const { hang: groupIdHang, measure: measureGroupIdHang } = usePairMenuHang();

  useEffect(() => {
    const loadLookups = async () => {
      try {
        const response = await fetch(`${api}/RptStockValuation/lookups`, {
          credentials: "include",
        });
        const result = await response.json();

        if (!response.ok || !result.success) {
          toast.error(result.message || "Failed to load the Branches");
          return;
        }

        const options: Option[] = (result.branches || []).map(
          (row: { lkpBranch: string; txtBranchName: string }) => ({
            value: row.lkpBranch,
            label: row.txtBranchName,
          }),
        );

        const initial =
          options.find((option) => option.value === result.lkpDefaultBranch) ?? null;

        setBranchOptions(options);
        setDefaultBranch(initial);
        setLkpBranch(initial);
        setGroupRows(result.groups || []);
      } catch (error: unknown) {
        console.error("rptStockValuation lookups error:", error);
        toast.error("Cannot connect to the Stock Valuation API.");
      }
    };

    loadLookups().finally(() => setLookupsLoaded(true));
  }, []);

  const handleBranchTick = (branchId: string, checked: boolean) => {
    setChkBranch((current) =>
      checked ? [...current, branchId] : current.filter((id) => id !== branchId),
    );
  }; // lkpBranch

  const [rdgItemGroup, setRdgItemGroup] = useState("One Item Group"); // rdgItemGroup
  // one item group: the Group ID box and the Group Name box show the same choice
  const [lkpOneItemGroupID, setLkpOneItemGroupID] = useState(""); // lkpOneItemGroupID / lkpOneItemGroupName

  // Posted is what the old form starts with
  const [lkpPostStatus, setLkpPostStatus] = useState<Option | null>(
    postStatusOptions[1],
  ); // lkpPostStatus

  // the date the stock is shown as on (starts as today)
  const [dtpAsOnDate, setDtpAsOnDate] = useState(dayjs().format(DATE_FORMAT)); // dtpAsOnDate

  // the Print Preview: the report the server sent, the name of the file, and what it was made from
  // (the Excel file is made from the same values)
  const [preview, setPreview] = useState<{
    report: PrintReport;
    fileBase: string;
    params: Record<string, unknown>;
  } | null>(null);
  const [printing, setPrinting] = useState(false);

  // the group boxes: ID | Name, and Name | ID (one group, two boxes)
  const groupIdOptions = useMemo<PairOption[]>(
    () =>
      groupRows.map((row) => ({
        value: row.lkpItemGroupID,
        label: row.lkpItemGroupID,
        id: row.lkpItemGroupID,
        name: row.txtItemGroupName,
      })),
    [groupRows],
  );

  const groupNameOptions = useMemo<PairOption[]>(
    () =>
      [...groupRows]
        .sort((a, b) => a.txtItemGroupName.localeCompare(b.txtItemGroupName))
        .map((row) => ({
          value: row.lkpItemGroupID,
          label: row.txtItemGroupName,
          id: row.lkpItemGroupID,
          name: row.txtItemGroupName,
        })),
    [groupRows],
  );

  // what the server takes: the element ids of the page, the radios as their codes
  const buildStockValuationParams = () => ({
    rdgBranch: ({ "One Branch": 0, "Selected Branch": 1, "All Branch": 2 } as Record<string, number>)[
      rdgBranch
    ],
    lkpBranch: rdgBranch === "One Branch" ? (lkpBranch?.value ?? "") : "",
    chkBranch: rdgBranch === "Selected Branch" ? chkBranch : [],
    rdgItemGroup: rdgItemGroup === "One Item Group" ? 0 : 1,
    lkpOneItemGroupID: rdgItemGroup === "One Item Group" ? lkpOneItemGroupID : "",
    lkpPostStatus: Number(lkpPostStatus?.value ?? "1"),
    dtpAsOnDate: dayjs(dtpAsOnDate, DATE_FORMAT, true).isValid()
      ? dayjs(dtpAsOnDate, DATE_FORMAT).format("YYYY-MM-DD")
      : "",
    PstrYear: localStorage.getItem("PstrYear") ?? "",
  });

  // Print (the old cmdPrint): the checks of the old form, then the server sends the report and
  // the Print Preview opens (Print = the browser's print window, Download = Excel / PDF)
  const handlePrint = async () => {
    if (printing || preview) return;

    const warn = (message: string, id: string) => {
      toast.warning(message);

      // a box, or (Selected Branch) the first tick box of the list
      const element = document.getElementById(id);
      (element?.querySelector("input") ?? element)?.focus();
    };

    const params = buildStockValuationParams();

    if (params.rdgBranch === 0 && !params.lkpBranch) {
      return warn("Please select 'Branch'", "lkpBranch");
    }

    if (params.rdgBranch === 1 && params.chkBranch.length === 0) {
      return warn("Please select atleast one 'Branch'", "chkBranchList");
    }

    if (params.rdgItemGroup === 0 && !params.lkpOneItemGroupID) {
      return warn("Please select 'Item Group ID'", "lkpOneItemGroupID");
    }

    if (!params.dtpAsOnDate) {
      return warn("Please enter 'Date'", "dtpAsOnDate");
    }

    setPrinting(true);

    try {
      const response = await fetch(`${api}/RptStockValuation/print`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        toast.warning(result.message || "The Stock Valuation report could not be printed.");
        if (result.field) document.getElementById(result.field)?.focus();
        return;
      }

      setPreview({ report: result.report, fileBase: result.fileBase, params });
    } catch (error: unknown) {
      console.error("rptStockValuation print error:", error);
      toast.error("Cannot connect to the Stock Valuation API.");
    } finally {
      setPrinting(false);
    }
  };

  // the Excel file of the Print Preview, made by the server (null after an error)
  const fetchExcel = async (): Promise<Blob | null> => {
    if (!preview) return null;

    const response = await fetch(`${api}/RptStockValuation/excel`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(preview.params),
    });

    // an error comes back as JSON, the file as a blob
    if (!response.ok) {
      let message = "Could not create the Excel file";

      try {
        const result = await response.json();
        message = result.message || message;
      } catch {
        message = `Could not create the Excel file (error ${response.status})`;
      }

      toast.error(message);
      return null;
    }

    return response.blob();
  };

  const handleClose = () => {
    setRdgBranch("One Branch");
    setLkpBranch(defaultBranch);
    setChkBranch([]);
    setRdgItemGroup("One Item Group");
    setLkpOneItemGroupID("");
    setLkpPostStatus(postStatusOptions[1]);
    setDtpAsOnDate(dayjs().format(DATE_FORMAT));
    onClose?.();
  };

  // the cursor starts on the Branch box
  useInitialFocus(lookupsLoaded, "lkpBranch");

  // Alt+P -> Print, Alt+C -> Close (the underlined letters on the buttons)
  useAltShortcuts({
    p: handlePrint,
    c: handleClose,
  });

  return (
    <div
      onKeyDown={handleEnterAsTab}
      className="flex min-h-full w-full items-start justify-center bg-white px-4 py-4"
    >
      <div className="min-h-fit w-205 max-w-full bg-white p-0">
        <main className="w-full overflow-hidden border border-gray-400 bg-white">
          <header className="flex h-7.5 items-center justify-start bg-[#9fdfbc]">
            <h1 className="m-0 ml-3.5 text-[17px] font-semibold text-[#24364d]">
              Stock Valuation
            </h1>
          </header>

          <section className="px-3.5 pb-6 pt-3">
            <div className="grid grid-cols-[168px_1fr] items-start gap-x-4 gap-y-3">
              {/* Branch */}
              <RadioGroup
                className={cellFocusClass}
                name="rdgBranch"
                value={rdgBranch}
                options={[
                  { value: "One Branch", label: "One Branch" },
                  { value: "Selected Branch", label: "Selected Branch" },
                  { value: "All Branch", label: "All Branch" },
                ]}
                onChange={setRdgBranch}
              />
              <div className="pt-3">
                <div
                  className={`w-[250px] ${cellFocusClass}`}
                  onKeyDown={(event) => advanceOnEnter(event)}
                >
                  <Select
                    inputId="lkpBranch"
                    instanceId="lkpBranch"
                    options={branchOptions}
                    value={lkpBranch}
                    onChange={(option) => {
                      setLkpBranch(option);
                      if (option) advanceAfterPick("lkpBranch");
                    }}
                    isDisabled={rdgBranch !== "One Branch"}
                    noOptionsMessage={() => "No Branch Found"}
                    {...branchProps}
                  />
                </div>

                {rdgBranch === "Selected Branch" && (
                  <div
                    id="chkBranchList"
                    // 5 branches show; more of them scroll inside the list, so the page below does not move
                    className={`customer-table-scroll mt-3 flex max-h-[136px] w-[250px] flex-col gap-1 overflow-y-auto border border-[#e0e5ea] p-2 ${cellFocusClass}`}
                  >
                    {branchOptions.map((option) => (
                      <label
                        key={option.value}
                        className="flex items-center gap-2 text-[13px] text-[#35445a]"
                      >
                        <input
                          id={`chkBranch_${option.value}`}
                          name="chkBranch"
                          type="checkbox"
                          checked={chkBranch.includes(option.value)}
                          onChange={(event) =>
                            handleBranchTick(option.value, event.target.checked)
                          }
                        />
                        {option.label}
                      </label>
                    ))}
                  </div>
                )}
                </div>
              

              {/* Item */}
              <RadioGroup
                className={cellFocusClass}
                name="rdgItemGroup"
                value={rdgItemGroup}
                options={[
                  { value: "One Item Group", label: "One Item Group" },
                  { value: "All Item Group", label: "All Item Group" },
                ]}
                onChange={setRdgItemGroup}
              />
              <div className="pt-3">
                {rdgItemGroup === "One Item Group" && (
                  <div className="grid grid-cols-[135px_1fr]">
                    <div
                      className={cellFocusClass}
                      onKeyDown={(event) => advanceOnEnter(event, ["lkpOneItemGroupName"])}
                    >
                      <Select<PairOption, false>
                        inputId="lkpOneItemGroupID"
                        instanceId="lkpOneItemGroupID"
                        name="lkpOneItemGroupID"
                        options={groupIdOptions}
                        value={groupIdOptions.find((o) => o.value === lkpOneItemGroupID) ?? null}
                        onChange={(option) => {
                          setLkpOneItemGroupID(option?.value ?? "");
                          if (option) advanceAfterPick("lkpOneItemGroupID", ["lkpOneItemGroupName"]);
                        }}
                        components={groupIdComponents}
                        styles={makePairDividedMenuStyles(groupIdHang)}
                        onMenuOpen={() =>
                          measureGroupIdHang("lkpOneItemGroupID", "lkpOneItemGroupName")
                        }
                        noOptionsMessage={() => "No Item Group Found"}
                        {...pairProps}
                      />
                    </div>
                    <div
                      className={`-ml-px ${cellFocusClass}`}
                      style={{ marginRight: NAME_MENU_HANG }}
                      onKeyDown={(event) => advanceOnEnter(event)}
                    >
                      <Select<PairOption, false>
                        inputId="lkpOneItemGroupName"
                        instanceId="lkpOneItemGroupName"
                        name="lkpOneItemGroupName"
                        options={groupNameOptions}
                        value={groupNameOptions.find((o) => o.value === lkpOneItemGroupID) ?? null}
                        onChange={(option) => {
                          setLkpOneItemGroupID(option?.value ?? "");
                          if (option) advanceAfterPick("lkpOneItemGroupName");
                        }}
                        components={groupNameComponents}
                        styles={makePairDividedMenuStyles(NAME_MENU_HANG)}
                        noOptionsMessage={() => "No Item Group Found"}
                        {...pairProps}
                      />
                    </div>
                  </div>
                )}
              </div>
              <FieldLabel>As On Date :</FieldLabel>
              <div className="flex items-center justify-between gap-4">
                <div className={`w-[140px] ${cellFocusClass}`}>
                  <AppDatePicker
                    id="dtpAsOnDate"
                    label="As On Date"
                    value={dtpAsOnDate}
                    onChange={setDtpAsOnDate}
                  />
                </div>
              </div>

              {/* Post status */}
              <FieldLabel>Post Status :</FieldLabel>
              <div className="flex items-center justify-between gap-4">
                <div
                  className={`w-[140px] ${cellFocusClass}`}
                  onKeyDown={(event) => advanceOnEnter(event)}
                >
                  <Select
                    inputId="lkpPostStatus"
                    instanceId="lkpPostStatus"
                    options={postStatusOptions}
                    value={lkpPostStatus}
                    onChange={(option) => {
                      setLkpPostStatus(option);
                      if (option) advanceAfterPick("lkpPostStatus");
                    }}
                    {...selectProps}
                  />
                </div>
             
                 
              </div>

           
            


              {/* Period and actions */}
              <div className="flex flex-col gap-5">
                <div className="flex items-center gap-2">
                  
                 
                </div>
                <div className="flex gap-3 pl-[88px]">
                  <button
                    id="btnPrint"
                    type="button"
                    onClick={handlePrint}
                    className="btn-style"
                  >
                    <u>P</u>rint
                  </button>
                  <button
                    id="btnClose"
                    type="button"
                    onClick={handleClose}
                    className="btn-style"
                  >
                    <u>C</u>lose
                  </button>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>

      {/* the Print Preview (after Print) */}
      {preview && (
        <ReportPreview
          html={buildHtml(preview.report)}
          fileBase={preview.fileBase}
          onPrint={() => printStockValuationReport(preview.report)}
          buildPdf={() => buildStockValuationPdf(preview.report)}
          fetchExcel={fetchExcel}
          onClose={() => setPreview(null)}
        />
      )}
    </div>
  );
};

export default RptStockValuationPage;