import React, { useEffect, useMemo, useRef, useState } from "react";
import Select from "react-select";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { toast } from "react-toastify";

import ReportPreview from "../../../components/common/ReportPreview";
import { buildStockPdf } from "../../../components/Sales/Report/RptStock/RptStockPdf";
import {
  buildHtml,
  printStockReport,
  type PrintReport,
} from "../../../components/Sales/Report/RptStock/RptStockPrintReport";
import {
  filterPairOption,
  makePairComponents,
  makePairDividedMenuStyles,
  type PairOption,
} from "../../../components/PairSelect/pairSelectParts";
import {
  BranchDividedMenuList,
  BranchDividedOption,
  branchMenuStyles,
  filterLabelOrValue,
} from "../../../components/BranchSelect/branchSelectParts";
import { useAdvanceAfterSelect } from "../../../hooks/useAdvanceAfterSelect";
import { useAltShortcuts } from "../../../hooks/useAltShortcuts";
import { useGridCellFocus } from "../../../hooks/useGridCellFocus";
import { useInitialFocus } from "../../../hooks/useInitialFocus";
import { usePairMenuHang } from "../../../hooks/usePairMenuHang";

dayjs.extend(customParseFormat);

// ============================================================
// STOCK REPORT (Sales > Report > Stock; the old rptStock form)
// The boxes follow the old form: One Branch / All Branch, One Item / One Item Group / All Item,
// Post Status, Detailed / Summary, the period and "Order by Txn. No.". Print asks the server
// for the report (the server checks everything again) and shows the Print Preview.
// ============================================================

const api = import.meta.env.VITE_API_URL;

type Option = { value: string; label: string };

type ItemOption = PairOption;

type RadioOptionProps = {
  name: string;
  value: string;
  label: string;
  checked: boolean;
  onChange: () => void;
};

const DATE_FORMAT = "DD-MM-YYYY";
const TODAY = dayjs().format(DATE_FORMAT);

// the old Post Status list, in its order (index = what the server takes)
const postStatusOptions: Option[] = [
  { value: "0", label: "Non Posted" },
  { value: "1", label: "Posted" },
  { value: "2", label: "All" },
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
  menuList: () => "!p-0 !max-h-[240px]",
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

// the boxes that are typed in (the item / group / branch lists are long)
const searchProps = { ...selectProps, isSearchable: true };

// the highlighted row of the pair / branch lists: this page's light green, not react-select's blue
const optionColors = ({
  isFocused,
  isSelected,
}: {
  isFocused: boolean;
  isSelected: boolean;
}) =>
  `!cursor-pointer !text-[#24364d] ${
    isSelected ? "!bg-[#e7f7ed]" : isFocused ? "!bg-[#f2faf5]" : "!bg-white"
  }`;

// The ID | Name lists (the same two-column lists as the Item ID / Item Name boxes of
// Beginning Stock, shared in components/PairSelect): the ID box opens "ID | Name", the Name
// box opens "Name | ID", both with a divider, both searchable on either column; picking from
// one fills the other. Created once, outside the page component.
const itemIdComponents = makePairComponents("Item ID", "Item Name", false, true);
const itemNameComponents = makePairComponents("Item ID", "Item Name", true, true);
const groupIdComponents = makePairComponents("Group ID", "Group Name", false, true);
const groupNameComponents = makePairComponents("Group ID", "Group Name", true, true);

// how far a Name box's list hangs past the box (its ID column)
const NAME_MENU_HANG = 120;

// the pair boxes: the look of the other boxes, but the open list is the pair list's own
// (its menu, rows and header come from the components and the divided styles)
const pairProps = {
  ...searchProps,
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
    option: optionColors,
  },
  filterOption: filterPairOption,
};

// the Branch box: the same "Branch | ID" list as the Branch boxes of the other screens
// (grey header, a divider, the ID of every branch next to its name; searchable on either)
const branchProps = {
  ...searchProps,
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
    option: optionColors,
  },
  styles: branchMenuStyles,
  components: { Option: BranchDividedOption, MenuList: BranchDividedMenuList },
  filterOption: filterLabelOrValue,
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

const RadioPanel: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = "" }) => (
  <div className={`border border-[#e0e5ea] bg-white px-3.5 py-3 ${className}`}>
    <div className="flex flex-col gap-3">{children}</div>
  </div>
);

const FieldLabel: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = "" }) => (
  <div
    className={`flex h-[30px] items-center border border-[#e0e5ea] bg-[#fafbfc] px-3 text-[12px] text-[#405066] ${className}`}
  >
    {children}
  </div>
);

type AppDatePickerProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  // Enter in the box
  onEnter?: () => void;
  disabled?: boolean;
};

const AppDatePicker: React.FC<AppDatePickerProps> = ({
  id,
  label,
  value,
  onChange,
  onEnter,
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
          onKeyDown: (event: React.KeyboardEvent) => {
            if (event.key === "Enter" && onEnter) {
              event.preventDefault();
              onEnter();
            }
          },
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

// dd-mm-yyyy (what the date boxes hold) -> yyyy-mm-dd (what the server takes)
const toSqlDate = (value: string) => {
  const d = dayjs(value, DATE_FORMAT, true);

  return d.isValid() ? d.format("YYYY-MM-DD") : "";
};

const focusId = (id: string) => document.getElementById(id)?.focus();

const RptStockPage: React.FC = () => {
  // the box the cursor is in is outlined
  const { cellFocusClass } = useGridCellFocus();
  // after a dropdown pick (or Enter on a closed one) the cursor goes on
  const { advanceAfterPick, advanceOnEnter } = useAdvanceAfterSelect();

  // the boxes - the state names are the element ids (and the keys the server takes)
  const [rdgBranch, setRdgBranch] = useState(0); // 0 One Branch, 1 All Branch
  const [lkpBranch, setLkpBranch] = useState("");
  const [rdgItem, setRdgItem] = useState(0); // 0 One Item, 1 One Item Group, 2 All Item
  const [lkpItemID, setLkpItemID] = useState("");
  const [lkpItemGroupID, setLkpItemGroupID] = useState("");
  const [lkpPostStatus, setLkpPostStatus] = useState("2"); // All, as the old form
  const [rdgDetOrSum, setRdgDetOrSum] = useState(0); // 0 Detailed, 1 Summary
  const [dtpFromDate, setDtpFromDate] = useState(TODAY);
  const [dtpToDate, setDtpToDate] = useState(TODAY);
  const [chkTxnNo, setChkTxnNo] = useState(false);

  // the lists (the old FillCombos)
  const [branchOptions, setBranchOptions] = useState<Option[]>([]);
  const [defaultBranch, setDefaultBranch] = useState("");
  const [itemRows, setItemRows] = useState<
    { lkpItemID: string; txtItemName: string }[]
  >([]);
  const [groupRows, setGroupRows] = useState<
    { lkpItemGroupID: string; txtItemGroupName: string }[]
  >([]);
  const [listsLoaded, setListsLoaded] = useState(false);

  const [printing, setPrinting] = useState(false);

  // an ID list covers the ID box AND the Name box next to it (measured when it opens)
  const { hang: itemIdHang, measure: measureItemIdHang } = usePairMenuHang();
  const { hang: groupIdHang, measure: measureGroupIdHang } = usePairMenuHang();

  // the Print Preview (after Print): the report, and what it was made for (the Excel file
  // is made for the same choice)
  const [preview, setPreview] = useState<{
    report: PrintReport;
    body: Record<string, unknown>;
    fileBase: string;
  } | null>(null);

  const rootRef = useRef<HTMLDivElement | null>(null);

  // ----------------------------------------------------------
  // LOAD THE LISTS
  // ----------------------------------------------------------

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch(`${api}/RptStock/lookups`, {
          credentials: "include",
        });
        const result = await response.json();

        if (!response.ok || !result.success) {
          toast.error(result.message || "Failed to load the Stock report lists");
          return;
        }

        setBranchOptions(
          (result.branches || []).map(
            (row: { lkpBranch: string; txtBranchName: string }) => ({
              value: row.lkpBranch,
              label: row.txtBranchName,
            }),
          ),
        );
        setItemRows(result.items || []);
        setGroupRows(result.groups || []);

        // the user's default branch is chosen when the page opens
        const branch = String(result.lkpDefaultBranch ?? "");

        setDefaultBranch(branch);
        setLkpBranch(branch);
      } catch (error: unknown) {
        console.error("rptStock lookups error:", error);
        toast.error("Cannot connect to the Stock report API.");
      } finally {
        setListsLoaded(true);
      }
    };

    load();
  }, []);

  // the item boxes: ID | Name, and Name | ID (one item, two boxes)
  const itemIdOptions = useMemo<ItemOption[]>(
    () =>
      itemRows.map((row) => ({
        value: row.lkpItemID,
        label: row.lkpItemID,
        id: row.lkpItemID,
        name: row.txtItemName,
      })),
    [itemRows],
  );

  const itemNameOptions = useMemo<ItemOption[]>(
    () =>
      [...itemRows]
        .sort((a, b) => a.txtItemName.localeCompare(b.txtItemName))
        .map((row) => ({
          value: row.lkpItemID,
          label: row.txtItemName,
          id: row.lkpItemID,
          name: row.txtItemName,
        })),
    [itemRows],
  );

  const groupIdOptions = useMemo<ItemOption[]>(
    () =>
      groupRows.map((row) => ({
        value: row.lkpItemGroupID,
        label: row.lkpItemGroupID,
        id: row.lkpItemGroupID,
        name: row.txtItemGroupName,
      })),
    [groupRows],
  );

  const groupNameOptions = useMemo<ItemOption[]>(
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

  // the cursor starts on the first box that is not filled: Branch, else Item ID
  useInitialFocus(listsLoaded, lkpBranch ? "lkpItemID" : "lkpBranch");

  // ----------------------------------------------------------
  // THE RADIO GROUPS
  // ----------------------------------------------------------

  // the old rdgItem_SelectedIndexChanged: the boxes are cleared and the cursor goes to the
  // box that is for the new choice
  const handleItemMode = (mode: number) => {
    setRdgItem(mode);
    setLkpItemID("");
    setLkpItemGroupID("");

    if (mode === 0) window.setTimeout(() => focusId("lkpItemID"), 0);
    if (mode === 1) window.setTimeout(() => focusId("lkpItemGroupID"), 0);
  };

  // the old rdgBranch_SelectedIndexChanged
  const handleBranchMode = (mode: number) => {
    setRdgBranch(mode);

    if (mode === 0) window.setTimeout(() => focusId("lkpBranch"), 0);
  };

  // ----------------------------------------------------------
  // CLEAR
  // ----------------------------------------------------------

  const handleClear = () => {
    setRdgBranch(0);
    setLkpBranch(defaultBranch);
    setRdgItem(0);
    setLkpItemID("");
    setLkpItemGroupID("");
    setLkpPostStatus("2");
    setRdgDetOrSum(0);
    setDtpFromDate(TODAY);
    setDtpToDate(TODAY);
    setChkTxnNo(false);

    window.setTimeout(() => focusId(defaultBranch ? "lkpItemID" : "lkpBranch"), 0);
  };

  // ----------------------------------------------------------
  // PRINT: the old ValidateMe (the server checks the same again), then the Print Preview
  // ----------------------------------------------------------

  const requestBody = () => ({
    rdgBranch,
    lkpBranch,
    rdgItem,
    lkpItemID,
    lkpItemGroupID,
    lkpPostStatus: Number(lkpPostStatus),
    rdgDetOrSum,
    dtpFromDate: toSqlDate(dtpFromDate),
    dtpToDate: toSqlDate(dtpToDate),
    chkTxnNo,
  });

  const handlePrint = async () => {
    if (printing || preview) return;

    if (rdgBranch === 0 && !lkpBranch) {
      toast.warning("Please select 'Branch'");
      focusId("lkpBranch");
      return;
    }

    if (rdgItem === 0 && !lkpItemID) {
      toast.warning("Please select 'Item ID'");
      focusId("lkpItemID");
      return;
    }

    if (rdgItem === 1 && !lkpItemGroupID) {
      toast.warning("Please select 'Item Group'");
      focusId("lkpItemGroupID");
      return;
    }

    if (!dtpFromDate || !toSqlDate(dtpFromDate)) {
      toast.warning("Please enter 'From Date'");
      focusId("dtpFromDate");
      return;
    }

    if (!dtpToDate || !toSqlDate(dtpToDate)) {
      toast.warning("Please enter 'To Date'");
      focusId("dtpToDate");
      return;
    }

    if (toSqlDate(dtpFromDate) > toSqlDate(dtpToDate)) {
      toast.warning("'To Date' should be greater than 'From Date'");
      focusId("dtpToDate");
      return;
    }

    const body = requestBody();

    setPrinting(true);

    try {
      const response = await fetch(`${api}/RptStock/print`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        toast.error(result.message || "The Stock report could not be made.");
        if (result.field) focusId(result.field);
        return;
      }

      setPreview({ report: result.report, body, fileBase: result.fileBase });
    } catch (error: unknown) {
      console.error("rptStock print error:", error);
      toast.error("Cannot connect to the Stock report API.");
    } finally {
      setPrinting(false);
    }
  };

  // the Excel file of the Print Preview, made by the server (null after an error)
  const fetchExcel = async (): Promise<Blob | null> => {
    if (!preview) return null;

    const response = await fetch(`${api}/RptStock/excel`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(preview.body),
    });

    // an error comes back as JSON, the file as a blob
    if (!response.ok) {
      let message = "Could not create the Excel file";

      try {
        const result = await response.json();
        message = result.message || message;
      } catch {
        message =
          response.status === 404
            ? "Excel is not available: the RptStock/excel route was not found (404)"
            : `Could not create the Excel file (error ${response.status})`;
      }

      toast.error(message);
      return null;
    }

    return response.blob();
  };

  // Alt+P prints, Alt+C clears. Off while the Print Preview is open: it has its own.
  useAltShortcuts(
    preview
      ? {}
      : {
          p: handlePrint,
          c: handleClear,
        },
  );

  // ----------------------------------------------------------
  // KEYS: Enter goes on to the next box (the radio groups are left out, as the old form
  // had them last); Enter on a button presses it
  // ----------------------------------------------------------

  const handlePageKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key !== "Enter" || event.defaultPrevented) return;

    const target = event.target as HTMLElement;

    if (target.tagName === "BUTTON") {
      event.preventDefault();
      target.click();
      return;
    }

    event.preventDefault();

    const boxes = Array.from(
      (rootRef.current ?? document).querySelectorAll<HTMLElement>(
        'input:not([disabled]):not([type="radio"]):not([type="hidden"]):not([tabindex="-1"]), button:not([disabled]):not([tabindex="-1"])',
      ),
    ).filter((element) => element.offsetParent !== null);

    const position = boxes.indexOf(target);

    if (position > -1 && position < boxes.length - 1) {
      boxes[position + 1].focus();
    }
  };

  const oneBranchOnly = rdgBranch !== 0;
  const oneItemDisabled = rdgItem !== 0;
  const groupDisabled = rdgItem !== 1;

  const find = (list: ItemOption[], value: string) =>
    list.find((option) => option.value === value) ?? null;

  // one "ID | Name" pair of boxes (an item, a group, or one end of the range): the ID box and
  // the Name box show the same choice; the ID list covers both boxes, the Name list hangs
  // past its box
  const renderPair = (pair: {
    idBox: string;
    nameBox: string;
    idOptions: ItemOption[];
    nameOptions: ItemOption[];
    value: string;
    onPick: (value: string) => void;
    disabled: boolean;
    idComponents: typeof itemIdComponents;
    nameComponents: typeof itemNameComponents;
    hang: number;
    onMeasure: () => void;
    noOptionsMessage: string;
  }) => (
    <div className="grid grid-cols-[135px_1fr]">
      <div
        className={cellFocusClass}
        onKeyDown={(event) => advanceOnEnter(event, [pair.nameBox])}
      >
        <Select<ItemOption, false>
          inputId={pair.idBox}
          instanceId={pair.idBox}
          name={pair.idBox}
          options={pair.idOptions}
          value={find(pair.idOptions, pair.value)}
          onChange={(option) => {
            pair.onPick(option?.value ?? "");
            if (option) advanceAfterPick(pair.idBox, [pair.nameBox]);
          }}
          isDisabled={pair.disabled}
          components={pair.idComponents}
          styles={makePairDividedMenuStyles(pair.hang)}
          onMenuOpen={pair.onMeasure}
          noOptionsMessage={() => pair.noOptionsMessage}
          {...pairProps}
        />
      </div>
      <div
        className={`-ml-px ${cellFocusClass}`}
        onKeyDown={(event) => advanceOnEnter(event)}
      >
        <Select<ItemOption, false>
          inputId={pair.nameBox}
          instanceId={pair.nameBox}
          name={pair.nameBox}
          options={pair.nameOptions}
          value={find(pair.nameOptions, pair.value)}
          onChange={(option) => {
            pair.onPick(option?.value ?? "");
            if (option) advanceAfterPick(pair.nameBox);
          }}
          isDisabled={pair.disabled}
          components={pair.nameComponents}
          styles={makePairDividedMenuStyles(NAME_MENU_HANG)}
          noOptionsMessage={() => pair.noOptionsMessage}
          {...pairProps}
        />
      </div>
    </div>
  );

  return (
    <>
      <div
        ref={rootRef}
        onKeyDown={handlePageKeyDown}
        className="flex min-h-screen w-full items-start justify-center bg-white px-4 py-4"
      >
        <div className="min-h-fit w-205 max-w-full bg-white p-0">
          <main className="w-full overflow-hidden border border-[#d5dce2] bg-white">
            <header className="flex h-7.5 items-center justify-start bg-[#9fdfbc]">
              <h1 className="m-0 ml-3.5 text-[17px] font-semibold text-[#24364d]">
                Stock
              </h1>
            </header>

            <section className="px-3.5 pb-6 pt-3">
              <div className="grid grid-cols-[168px_1fr] gap-x-4 gap-y-3">
                {/* Branch */}
                <RadioPanel>
                  <CustomRadio
                    name="rdgBranch"
                    value="0"
                    label="One Branch"
                    checked={rdgBranch === 0}
                    onChange={() => handleBranchMode(0)}
                  />
                  <CustomRadio
                    name="rdgBranch"
                    value="1"
                    label="All Branches"
                    checked={rdgBranch === 1}
                    onChange={() => handleBranchMode(1)}
                  />
                </RadioPanel>
                <div className="pt-3">
                  <div
                    className={`w-[250px] ${cellFocusClass}`}
                    onKeyDown={(event) => advanceOnEnter(event)}
                  >
                    <Select<Option, false>
                      inputId="lkpBranch"
                      instanceId="lkpBranch"
                      name="lkpBranch"
                      options={branchOptions}
                      value={
                        branchOptions.find((o) => o.value === lkpBranch) ?? null
                      }
                      onChange={(option) => {
                        setLkpBranch(option?.value ?? "");

                        // a branch chosen: on to the Item boxes
                        if (option) advanceAfterPick("lkpBranch");
                      }}
                      isDisabled={oneBranchOnly}
                      noOptionsMessage={() => "No Branch Found"}
                      {...branchProps}
                    />
                  </div>
                </div>

                {/* Item */}
                <RadioPanel>
                  <CustomRadio
                    name="rdgItem"
                    value="0"
                    label="One Item"
                    checked={rdgItem === 0}
                    onChange={() => handleItemMode(0)}
                  />
                  <CustomRadio
                    name="rdgItem"
                    value="1"
                    label="One Item Group"
                    checked={rdgItem === 1}
                    onChange={() => handleItemMode(1)}
                  />
                  <CustomRadio
                    name="rdgItem"
                    value="2"
                    label="All Item"
                    checked={rdgItem === 2}
                    onChange={() => handleItemMode(2)}
                  />
                </RadioPanel>
                <div className="flex flex-col gap-3 pt-3">
                  {/* One Item */}
                  {renderPair({
                    idBox: "lkpItemID",
                    nameBox: "lkpItemName",
                    idOptions: itemIdOptions,
                    nameOptions: itemNameOptions,
                    value: lkpItemID,
                    onPick: setLkpItemID,
                    disabled: oneItemDisabled,
                    idComponents: itemIdComponents,
                    nameComponents: itemNameComponents,
                    hang: itemIdHang,
                    onMeasure: () => measureItemIdHang("lkpItemID", "lkpItemName"),
                    noOptionsMessage: "No Item Found",
                  })}

                  {/* One Item Group */}
                  {renderPair({
                    idBox: "lkpItemGroupID",
                    nameBox: "lkpItemGroupName",
                    idOptions: groupIdOptions,
                    nameOptions: groupNameOptions,
                    value: lkpItemGroupID,
                    onPick: setLkpItemGroupID,
                    disabled: groupDisabled,
                    idComponents: groupIdComponents,
                    nameComponents: groupNameComponents,
                    hang: groupIdHang,
                    onMeasure: () => measureGroupIdHang("lkpItemGroupID", "lkpItemGroupName"),
                    noOptionsMessage: "No Item Group Found",
                  })}
                </div>

                {/* Post status */}
                <FieldLabel>Post Status :</FieldLabel>
                <div className="flex items-center justify-between">
                  <div
                    className={`w-[107px] ${cellFocusClass}`}
                    onKeyDown={(event) => {
                      // Enter on a closed Post Status box goes on to the From Date
                      if (event.key === "Enter" && !event.defaultPrevented) {
                        event.preventDefault();
                        focusId("dtpFromDate");
                      }
                    }}
                  >
                    <Select<Option, false>
                      inputId="lkpPostStatus"
                      instanceId="lkpPostStatus"
                      name="lkpPostStatus"
                      options={postStatusOptions}
                      value={
                        postStatusOptions.find((o) => o.value === lkpPostStatus) ??
                        null
                      }
                      onChange={(option) => {
                        setLkpPostStatus(option?.value ?? "2");

                        // a status chosen: on to the From Date
                        window.setTimeout(() => focusId("dtpFromDate"), 0);
                      }}
                      {...selectProps}
                    />
                  </div>
                  <label
                    htmlFor="chkTxnNo"
                    className={`flex h-[26px] cursor-pointer items-center gap-2 border border-[#e0e5ea] bg-white px-2 text-[12px] text-[#405066] select-none ${cellFocusClass} ${
                      rdgDetOrSum === 0 ? "" : "opacity-50"
                    }`}
                  >
                    <input
                      id="chkTxnNo"
                      name="chkTxnNo"
                      type="checkbox"
                      checked={chkTxnNo}
                      disabled={rdgDetOrSum !== 0}
                      onChange={(event) => setChkTxnNo(event.target.checked)}
                      className="h-4 w-4 accent-[#64d96e]"
                    />
                    Order by Posting.No.
                  </label>
                </div>

                {/* Detailed / Summary and period */}
                <RadioPanel>
                  <CustomRadio
                    name="rdgDetOrSum"
                    value="0"
                    label="Detailed"
                    checked={rdgDetOrSum === 0}
                    onChange={() => setRdgDetOrSum(0)}
                  />
                  <CustomRadio
                    name="rdgDetOrSum"
                    value="1"
                    label="Summary"
                    checked={rdgDetOrSum === 1}
                    onChange={() => setRdgDetOrSum(1)}
                  />
                </RadioPanel>
                <div className="flex items-start gap-2">
                  <FieldLabel className="w-[168px]">Period :</FieldLabel>
                  <AppDatePicker
                    id="dtpFromDate"
                    label="From Date"
                    value={dtpFromDate}
                    onChange={setDtpFromDate}
                    onEnter={() => focusId("dtpToDate")}
                  />
                  <AppDatePicker
                    id="dtpToDate"
                    label="To Date"
                    value={dtpToDate}
                    onChange={setDtpToDate}
                    onEnter={() => focusId("btnPrint")}
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="mt-6 flex justify-center gap-3">
                <button
                  id="btnPrint"
                  name="btnPrint"
                  type="button"
                  onClick={handlePrint}
                  disabled={printing}
                  className="btn-style disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <u>P</u>rint
                </button>
                <button
                  id="btnClear"
                  name="btnClear"
                  type="button"
                  onClick={handleClear}
                  className="btn-style"
                >
                  <u>C</u>lear
                </button>
              </div>
            </section>
          </main>
        </div>
      </div>

      {/* the Print Preview (after Print) */}
      {preview && (
        <ReportPreview
          html={buildHtml(preview.report)}
          fileBase={preview.fileBase}
          onPrint={() => printStockReport(preview.report)}
          buildPdf={() => buildStockPdf(preview.report)}
          fetchExcel={fetchExcel}
          onClose={() => setPreview(null)}
        />
      )}
    </>
  );
};

export default RptStockPage;
