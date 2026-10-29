import React, { useEffect, useMemo, useState } from "react";
import Select from "react-select";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { toast } from "react-toastify";
import RadioGroup from "../../../../components/common/RadioGroup";
import ReportPreview from "../../../../components/common/ReportPreview";
import { buildStockAgeingPdf } from "../../../../components/Purchase/Report/RptStockAgeing/RptStockAgeingPdf";
import {
  buildHtml,
  printStockAgeingReport,
  type PrintReport,
} from "../../../../components/Purchase/Report/RptStockAgeing/RptStockAgeingPrintReport";
import { useEnterAsTab } from "../../../../hooks/useEnterAsTab";
import { useAltShortcuts } from "../../../../hooks/useAltShortcuts";
import { useCtrlShortcuts } from "../../../../hooks/useCtrlShortcuts";
import { useGridCellFocus } from "../../../../hooks/useGridCellFocus";
import { useAdvanceAfterSelect } from "../../../../hooks/useAdvanceAfterSelect";
import { useInitialFocus } from "../../../../hooks/useInitialFocus";
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

dayjs.extend(customParseFormat);

type Option = { value: string; label: string };

const DATE_FORMAT = "DD-MM-YYYY";

const api = import.meta.env.VITE_API_URL;

/* Replace these with data from your API */
// the Post Status and its codes - the same as the other reports: 0 All, 1 Posted, 2 Non Posted
const postStatusOptions: Option[] = [
  { value: "0", label: "All" },
  { value: "1", label: "Posted" },
  { value: "2", label: "Non Posted" },
];
// Print 0 Balance: Yes prints the items whose balance is 0 too
const yesNoOptions: Option[] = [
  { value: "1", label: "Yes" },
  { value: "0", label: "No" },
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
    ${isFocused ? "!border-green-600" : "!border-[#cfd7df]"}
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

// The Item boxes: the "ID | Name" lists of the other screens - the Item ID box opens "Item ID | Item Name",
// the Item Name box opens "Item Name | Item ID", both searchable on either column, and picking from one fills
// the other. Created once, outside the page.
const itemIdComponents = makePairComponents("Item ID", "Item Name", false, true);
const itemNameComponents = makePairComponents("Item ID", "Item Name", true, true);

// how far the Item Name list hangs past its box (its Item ID column): an Item ID can be long
const ITEM_NAME_MENU_HANG = 200;

// how far the lists of the Item Range boxes hang past their box
const RANGE_MENU_HANG = 210;

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

const FieldLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex h-[30px] items-center border border-[#e0e5ea] bg-[#fafbfc] px-3 text-[14px] text-[#405066]">
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
          { borderColor: "#16a34a !important", borderWidth: "1px" }, // green-600, as the cell outline
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

type RptStockAgeingPageProps = {
  onClose?: () => void;
};

const RptStockAgeingPage: React.FC<RptStockAgeingPageProps> = ({ onClose }) => {
  // Enter moves on like Tab; the box the cursor is in is outlined; after a pick from a list the cursor
  // goes on
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

  // the ageing modes the company has set up (tblageingperiod): Days and/or Month, Days first
  const [ageingModeOptions, setAgeingModeOptions] = useState<Option[]>([]);
  const [lkpAgeingMode, setLkpAgeingMode] = useState<Option | null>(null); // lkpAgeingMode

  useEffect(() => {
    const loadLookups = async () => {
      try {
        const response = await fetch(`${api}/RptStockAgeing/lookups`, {
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
        setItemRows(result.items || []);

        const modes: Option[] = (result.ageingModes || []).map(
          (row: { lkpAgeingMode: string }) => ({
            value: row.lkpAgeingMode,
            label: row.lkpAgeingMode,
          }),
        );

        setAgeingModeOptions(modes);
        setLkpAgeingMode(modes[0] ?? null);
      } catch (error: unknown) {
        console.error("rptStockAgeing lookups error:", error);
        toast.error("Cannot connect to the Stock Ageing API.");
      }
    };

    loadLookups().finally(() => setLookupsLoaded(true));
  }, []);

  const [rdgItem, setRdgItem] = useState("All Item"); // rdgItem: the old form starts on All Item
  // one item: the Item ID box and the Item Name box show the same choice
  const [lkpItemID, setLkpItemID] = useState(""); // lkpItemID / lkpItemName
  const [lkpFromItem, setLkpFromItem] = useState(""); // Item Range: From Item
  const [lkpToItem, setLkpToItem] = useState(""); // Item Range: To Item

  // the items of every branch, one row per branch and item
  const [itemRows, setItemRows] = useState<
    { lkpBranch: string; lkpItemID: string; txtItemName: string }[]
  >([]);
  const { hang: itemIdHang, measure: measureItemIdHang } = usePairMenuHang();

  // the items of the chosen branch (One Branch), or every item once (All Branch)
  const branchItems = useMemo(() => {
    const rows =
      rdgBranch === "One Branch" && lkpBranch
        ? itemRows.filter((row) => row.lkpBranch === lkpBranch.value)
        : itemRows;

    const seen = new Set<string>();

    return rows.filter((row) => {
      if (seen.has(row.lkpItemID)) return false;
      seen.add(row.lkpItemID);
      return true;
    });
  }, [itemRows, rdgBranch, lkpBranch]);

  // a chosen item that the new branch does not have is cleared
  useEffect(() => {
    const has = (id: string) => branchItems.some((row) => row.lkpItemID === id);

    if (lkpItemID && !has(lkpItemID)) setLkpItemID("");
    if (lkpFromItem && !has(lkpFromItem)) setLkpFromItem("");
    if (lkpToItem && !has(lkpToItem)) setLkpToItem("");
  }, [branchItems, lkpItemID, lkpFromItem, lkpToItem]);

  // the item boxes: ID | Name, and Name | ID (one item, two boxes)
  const itemIdOptions = useMemo<PairOption[]>(
    () =>
      branchItems.map((row) => ({
        value: row.lkpItemID,
        label: row.lkpItemID,
        id: row.lkpItemID,
        name: row.txtItemName,
      })),
    [branchItems],
  );

  const itemNameOptions = useMemo<PairOption[]>(
    () =>
      [...branchItems]
        .sort((a, b) => a.txtItemName.localeCompare(b.txtItemName))
        .map((row) => ({
          value: row.lkpItemID,
          label: row.txtItemName,
          id: row.lkpItemID,
          name: row.txtItemName,
        })),
    [branchItems],
  );

  // the date the stock is aged as on (starts as today)
  const [dtpAsOnDate, setDtpAsOnDate] = useState(dayjs().format(DATE_FORMAT)); // dtpAsOnDate
  const [lkpPostStatus, setLkpPostStatus] = useState<Option | null>(
    postStatusOptions[1],
  ); // lkpPostStatus
  const [lkpPrint0Balance, setLkpPrint0Balance] = useState<Option | null>(
    yesNoOptions[0],
  ); // lkpPrint0Balance

  // the Print Preview: the report the server sent, the name of the file, and what it was made from
  // (the Excel file is made from the same values)
  const [preview, setPreview] = useState<{
    report: PrintReport;
    fileBase: string;
    params: Record<string, unknown>;
  } | null>(null);
  const [printing, setPrinting] = useState(false);

  // what the server takes: the element ids of the page, the radios as their codes
  const buildStockAgeingParams = () => ({
    rdgBranch: rdgBranch === "One Branch" ? 0 : 1,
    lkpBranch: rdgBranch === "One Branch" ? (lkpBranch?.value ?? "") : "",
    rdgItem: { "One Item": 0, "Range Item": 1, "All Item": 2 }[rdgItem] ?? 2,
    lkpItemID: rdgItem === "One Item" ? lkpItemID : "",
    lkpFromItem: rdgItem === "Range Item" ? lkpFromItem : "",
    lkpToItem: rdgItem === "Range Item" ? lkpToItem : "",
    dtpAsOnDate: dayjs(dtpAsOnDate, DATE_FORMAT, true).isValid()
      ? dayjs(dtpAsOnDate, DATE_FORMAT).format("YYYY-MM-DD")
      : "",
    lkpAgeingMode: lkpAgeingMode?.value ?? "",
    lkpPostStatus: Number(lkpPostStatus?.value ?? "0"),
    lkpPrint0Balance: Number(lkpPrint0Balance?.value ?? "1"),
    PstrYear: localStorage.getItem("PstrYear") ?? "",
  });

  // Print (the old cmdPrint): the checks of the old form, then the server sends the report and the Print
  // Preview opens (Print = the browser's print window, Download = Excel / PDF)
  const handlePrint = async () => {
    if (printing || preview) return;

    const warn = (message: string, id: string) => {
      toast.warning(message);
      document.getElementById(id)?.focus();
    };

    const params = buildStockAgeingParams();

    if (params.rdgBranch === 0 && !params.lkpBranch) {
      return warn("Please select 'Branch'", "lkpBranch");
    }

    if (params.rdgItem === 0 && !params.lkpItemID) {
      return warn("Please select 'Item ID'", "lkpItemID");
    }

    if (params.rdgItem === 1 && !params.lkpFromItem) {
      return warn("Please select 'Item ID From'", "lkpFromItem");
    }

    if (params.rdgItem === 1 && !params.lkpToItem) {
      return warn("Please select 'Item ID To'", "lkpToItem");
    }

    if (!params.dtpAsOnDate) {
      return warn("Please enter 'As On Date'", "dtpAsOnDate");
    }

    if (!params.lkpAgeingMode) {
      return warn("Please select 'Ageing Mode'", "lkpAgeingMode");
    }

    setPrinting(true);

    try {
      const response = await fetch(`${api}/RptStockAgeing/print`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        toast.warning(result.message || "The Stock Ageing report could not be printed.");
        if (result.field) document.getElementById(result.field)?.focus();
        return;
      }

      setPreview({ report: result.report, fileBase: result.fileBase, params });
    } catch (error: unknown) {
      console.error("rptStockAgeing print error:", error);
      toast.error("Cannot connect to the Stock Ageing API.");
    } finally {
      setPrinting(false);
    }
  };

  // the Excel file of the Print Preview, made by the server (null after an error)
  const fetchExcel = async (): Promise<Blob | null> => {
    if (!preview) return null;

    const response = await fetch(`${api}/RptStockAgeing/excel`, {
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
    setRdgItem("All Item");
    setLkpItemID("");
    setLkpFromItem("");
    setLkpToItem("");
    setDtpAsOnDate(dayjs().format(DATE_FORMAT));
    setLkpAgeingMode(ageingModeOptions[0] ?? null);
    setLkpPostStatus(postStatusOptions[1]);
    setLkpPrint0Balance(yesNoOptions[0]);
    onClose?.();
  };

  // the cursor starts on the Branch box
  useInitialFocus(lookupsLoaded, "lkpBranch");

  // Alt+P -> Print, Alt+C -> Close (the underlined letters on the buttons)
  useAltShortcuts({
    p: handlePrint,
    c: handleClose,
  });

  // Ctrl+P -> Print (the old forms' Ctrl+P). With the Print Preview open it prints the report that is shown.
  useCtrlShortcuts({
    p: () => (preview ? printStockAgeingReport(preview.report) : handlePrint()),
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
              Stock Ageing
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
              </div>

              {/* Item */}
              <RadioGroup
                className={cellFocusClass}
                name="rdgItem"
                value={rdgItem}
                options={[
                  { value: "One Item", label: "One Item" },
                  { value: "Range Item", label: "Range Item" },
                  { value: "All Item", label: "All Item" },
                ]}
                onChange={setRdgItem}
              />
              <div className="pt-3">
                {rdgItem === "One Item" && (
                  <div className="grid grid-cols-[190px_1fr]">
                    <div
                      className={cellFocusClass}
                      onKeyDown={(event) => advanceOnEnter(event, ["lkpItemName"])}
                    >
                      <Select<PairOption, false>
                        inputId="lkpItemID"
                        instanceId="lkpItemID"
                        name="lkpItemID"
                        options={itemIdOptions}
                        value={itemIdOptions.find((o) => o.value === lkpItemID) ?? null}
                        onChange={(option) => {
                          setLkpItemID(option?.value ?? "");
                          if (option) advanceAfterPick("lkpItemID", ["lkpItemName"]);
                        }}
                        components={itemIdComponents}
                        styles={makePairDividedMenuStyles(itemIdHang)}
                        onMenuOpen={() => measureItemIdHang("lkpItemID", "lkpItemName")}
                        noOptionsMessage={() => "No Item Found"}
                        {...pairProps}
                      />
                    </div>
                    <div
                      className={`-ml-px ${cellFocusClass}`}
                      style={{ marginRight: ITEM_NAME_MENU_HANG }}
                      onKeyDown={(event) => advanceOnEnter(event)}
                    >
                      <Select<PairOption, false>
                        inputId="lkpItemName"
                        instanceId="lkpItemName"
                        name="lkpItemName"
                        options={itemNameOptions}
                        value={itemNameOptions.find((o) => o.value === lkpItemID) ?? null}
                        onChange={(option) => {
                          setLkpItemID(option?.value ?? "");
                          if (option) advanceAfterPick("lkpItemName");
                        }}
                        components={itemNameComponents}
                        styles={makePairDividedMenuStyles(ITEM_NAME_MENU_HANG)}
                        noOptionsMessage={() => "No Item Found"}
                        {...pairProps}
                      />
                    </div>
                  </div>
                )}
                {rdgItem === "Range Item" && (
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-[190px] ${cellFocusClass}`}
                      onKeyDown={(event) => advanceOnEnter(event)}
                    >
                      <Select<PairOption, false>
                        inputId="lkpFromItem"
                        instanceId="lkpFromItem"
                        name="lkpFromItem"
                        options={itemIdOptions}
                        value={itemIdOptions.find((o) => o.value === lkpFromItem) ?? null}
                        onChange={(option) => {
                          setLkpFromItem(option?.value ?? "");
                          if (option) advanceAfterPick("lkpFromItem");
                        }}
                        aria-label="From Item"
                        components={itemIdComponents}
                        styles={makePairDividedMenuStyles(RANGE_MENU_HANG)}
                        noOptionsMessage={() => "No Item Found"}
                        {...pairProps}
                      />
                    </div>
                    <span className="text-[14px] text-[#405066]">to</span>
                    <div
                      className={`w-[190px] ${cellFocusClass}`}
                      onKeyDown={(event) => advanceOnEnter(event)}
                    >
                      <Select<PairOption, false>
                        inputId="lkpToItem"
                        instanceId="lkpToItem"
                        name="lkpToItem"
                        options={itemIdOptions}
                        value={itemIdOptions.find((o) => o.value === lkpToItem) ?? null}
                        onChange={(option) => {
                          setLkpToItem(option?.value ?? "");
                          if (option) advanceAfterPick("lkpToItem");
                        }}
                        aria-label="To Item"
                        components={itemIdComponents}
                        styles={makePairDividedMenuStyles(RANGE_MENU_HANG)}
                        noOptionsMessage={() => "No Item Found"}
                        {...pairProps}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* As on date */}
              <FieldLabel>As On Date :</FieldLabel>
              <div className={`w-[140px] ${cellFocusClass}`}>
                <AppDatePicker
                  id="dtpAsOnDate"
                  label="As On Date"
                  value={dtpAsOnDate}
                  onChange={setDtpAsOnDate}
                />
              </div>

              {/* Ageing mode */}
              <FieldLabel>Ageing Mode :</FieldLabel>
              <div
                className={`w-[140px] ${cellFocusClass}`}
                onKeyDown={(event) => advanceOnEnter(event)}
              >
                <Select
                  inputId="lkpAgeingMode"
                  instanceId="lkpAgeingMode"
                  options={ageingModeOptions}
                  value={lkpAgeingMode}
                  onChange={(option) => {
                    setLkpAgeingMode(option);
                    if (option) advanceAfterPick("lkpAgeingMode");
                  }}
                  noOptionsMessage={() => "No Ageing Period Set"}
                  {...selectProps}
                />
              </div>

              {/* Post status */}
              <FieldLabel>Post Status :</FieldLabel>
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

              {/* Print 0 balance */}
              <FieldLabel>Print 0 Balance :</FieldLabel>
              <div
                className={`w-[140px] ${cellFocusClass}`}
                onKeyDown={(event) => advanceOnEnter(event)}
              >
                <Select
                  inputId="lkpPrint0Balance"
                  instanceId="lkpPrint0Balance"
                  options={yesNoOptions}
                  value={lkpPrint0Balance}
                  onChange={(option) => {
                    setLkpPrint0Balance(option);
                    if (option) advanceAfterPick("lkpPrint0Balance");
                  }}
                  {...selectProps}
                />
              </div>

              {/* Actions */}
              <div />
              <div className="flex gap-3">
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
          </section>
        </main>
      </div>

      {/* the Print Preview (after Print) */}
      {preview && (
        <ReportPreview
          html={buildHtml(preview.report)}
          fileBase={preview.fileBase}
          onPrint={() => printStockAgeingReport(preview.report)}
          buildPdf={() => buildStockAgeingPdf(preview.report)}
          fetchExcel={fetchExcel}
          onClose={() => setPreview(null)}
        />
      )}
    </div>
  );
};

export default RptStockAgeingPage;