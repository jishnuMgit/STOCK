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
  disabled?: boolean;
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
  disabled = false,
}) => (
  <label className={`flex items-center gap-2.5 whitespace-nowrap select-none ${disabled ? "cursor-not-allowed opacity-45" : "cursor-pointer"}`}>
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
  const [branchMode, setBranchMode] = useState("One Branch"); // optBranch
  const [branch, setBranch] = useState<Option | null>(null); // lkpBranch
  const [groupByMode, setGroupByMode] = useState("By Item"); // rdgGroupBy

  const [itemMode, setItemMode] = useState("One Item"); // optItem
  const [groupMode, setGroupMode] = useState("All Item Group"); // optItemGroup
  const [oneItemId, setOneItemId] = useState<Option | null>(null); // lkpOneItemID
  const [oneItemName, setOneItemName] = useState<Option | null>(null); // lkpOneItemName
  const [fromItem, setFromItem] = useState<Option | null>(null); // Item Range: From Item
  const [toItem, setToItem] = useState<Option | null>(null); // Item Range: To Item
  const [groupId, setGroupId] = useState<Option | null>(null); // lkpOneItemGroupID
  const [groupName, setGroupName] = useState<Option | null>(null); // lkpOneItemGroupName

  const [postStatus, setPostStatus] = useState<Option | null>(
    postStatusOptions[0],
  ); // lkpPostStatus
  const [detSum, setDetSum] = useState("Detailed"); // optDetSum
  const [fromDate, setFromDate] = useState(TODAY); // dtpFromDate
  const [toDate, setToDate] = useState(TODAY); // dtpToDate
  const [orderByTxnNo, setOrderByTxnNo] = useState(false); // chkOrderbyTxnNo

  const handleClear = () => {
    setBranchMode("One Branch");
    setBranch(null);
    setGroupByMode("By Item");
    setItemMode("One Item");
    setGroupMode("One Item Group");
    setOneItemId(null);
    setOneItemName(null);
    setFromItem(null);
    setToItem(null);
    setGroupId(null);
    setGroupName(null);
    setPostStatus(postStatusOptions[0]);
    setDetSum("Detailed");
    setFromDate(TODAY);
    setToDate(TODAY);
    setOrderByTxnNo(false);
  };

  const handlePrint = () => {
    console.log({
      branchMode,
      branch,
      groupByMode,
      itemMode,
      groupMode,
      oneItemId,
      oneItemName,
      fromItem,
      toItem,
      groupId,
      groupName,
      postStatus,
      detSum,
      fromDate,
      toDate,
      orderByTxnNo,
    });
  };

  const itemRadioDisabled = groupByMode !== "By Item";
  const groupRadioDisabled = groupByMode !== "By Group";
  const oneItemDisabled =
    groupByMode !== "By Item" ||
    (itemMode !== "One Item" && itemMode !== "Item Range");
  const groupDisabled = groupByMode !== "By Group" || groupMode !== "One Item Group";

  return (
    <div className="flex min-h-screen w-full items-start justify-center bg-white px-4 py-4">
      <div className="min-h-fit w-240 max-w-full bg-white p-0">
        <main className="w-full overflow-hidden border border-gray-400 bg-white">
           <header
          className="
            flex
            h-7.5
            items-center
            justify-start
          
            bg-[#9fdfbc]
          "
        >
          <h1
            className="
              m-0
                ml-3.5
              text-[17px]
              font-semibold
              text-[#24364d]
            "
          >
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

              {/* By Group / By Item selector */}
              <RadioPanel>
                <CustomRadio
                  name="rdgGroupBy"
                  value="By Item Group"
                  label="By Item Group"
                  checked={groupByMode === "By Group"}
                  onChange={() => setGroupByMode("By Group")}
                />
                <CustomRadio
                  name="rdgGroupBy"
                  value="By Item"
                  label="By Item"
                  checked={groupByMode === "By Item"}
                  onChange={() => setGroupByMode("By Item")}
                />
              </RadioPanel>
              <div aria-hidden="true" />

              {/* Group filters: enabled only when By Group is selected */}
              <RadioPanel className={groupRadioDisabled ? "bg-[#f6f8fa]" : ""}>
                <CustomRadio
                  name="rdgItemGroup"
                  value="One Item Group"
                  label="One Item Group"
                  checked={groupMode === "One Item Group"}
                  onChange={() => setGroupMode("One Item Group")}
                  disabled={groupRadioDisabled}
                />
                <CustomRadio
                  name="rdgItemGroup"
                  value="All Item Group"
                  label="All Item Group"
                  checked={groupMode === "All Item Group"}
                  onChange={() => setGroupMode("All Item Group")}
                  disabled={groupRadioDisabled}
                />
              </RadioPanel>
              <div className="flex flex-col gap-3 pt-3">
                {!groupDisabled &&<div className="grid grid-cols-[190px_1fr] gap-2">
                  <Select
                    inputId="lkpOneItemGroupID"
                    instanceId="lkpOneItemGroupID"
                    options={groupIdOptions}
                    value={groupId}
                    onChange={setGroupId}
                    isDisabled={groupDisabled}
                    {...selectProps}
                  />
                  <Select
                    inputId="lkpOneItemGroupName"
                    instanceId="lkpOneItemGroupName"
                    options={groupNameOptions}
                    value={groupName}
                    onChange={setGroupName}
                    isDisabled={groupDisabled}
                    {...selectProps}
                  />
                </div> }
                
              </div>

              {/* Item filters: enabled only when By Item is selected */}
              <RadioPanel className={itemRadioDisabled ? "bg-[#f6f8fa]" : ""}>
                <CustomRadio
                  name="rdgItem"
                  value="One Item"
                  label="One Item"
                  checked={itemMode === "One Item"}
                  onChange={() => setItemMode("One Item")}
                  disabled={itemRadioDisabled}
                />
                <CustomRadio
                  name="rdgItem"
                  value="Item Range"
                  label="Item Range"
                  checked={itemMode === "Item Range"}
                  onChange={() => setItemMode("Item Range")}
                  disabled={itemRadioDisabled}
                />
                <CustomRadio
                  name="rdgItem"
                  value="All Item"
                  label="All Item"
                  checked={itemMode === "All Item"}
                  onChange={() => setItemMode("All Item")}
                  disabled={itemRadioDisabled}
                />
              </RadioPanel>
              <div className="flex flex-col gap-3 pt-3">
         {itemMode !== "All Item" &&
  (itemMode === "Item Range" ? (
    <div className="grid grid-cols-3 gap-2 w-[85%] mt-6">
      <Select
        inputId="lkpFromItem"
        instanceId="lkpFromItem"
        options={itemIdOptions}
        value={fromItem}
        onChange={setFromItem}
        isDisabled={itemRadioDisabled}
        placeholder="From Item"
        aria-label="From Item"
        {...selectProps}
      />

      <Select
        inputId="lkpToItem"
        instanceId="lkpToItem"
        options={itemIdOptions}
        value={toItem}
        onChange={setToItem}
        isDisabled={itemRadioDisabled}
        placeholder="To Item"
        aria-label="To Item"
        {...selectProps}
      />
    </div>
  ) : (
    <div className="grid grid-cols-[190px_1fr] gap-2">
      <Select
        inputId="lkpOneItemID"
        instanceId="lkpOneItemID"
        options={itemIdOptions}
        value={oneItemId}
        onChange={setOneItemId}
        isDisabled={oneItemDisabled}
        {...selectProps}
      />

      <Select
        inputId="lkpOneItemName"
        instanceId="lkpOneItemName"
        options={itemNameOptions}
        value={oneItemName}
        onChange={setOneItemName}
        isDisabled={oneItemDisabled}
        {...selectProps}
      />
    </div>
  ))}
              </div>

              {/* Post status */}
              <FieldLabel>Post Status :</FieldLabel>
              <div className="flex items-center justify-between">
                <div className="w-[107px]">
                  <Select
                    inputId="lkpPostStatus"
                    instanceId="lkpPostStatus"
                    options={postStatusOptions}
                    value={postStatus}
                    onChange={setPostStatus}
                    {...selectProps}
                  />
                </div>
                <label
                  htmlFor="chkOrderbyTxnNo"
                  className="flex h-[26px] cursor-pointer items-center gap-2 border border-[#e0e5ea] bg-white px-2 text-[12px] text-[#405066] select-none"
                >
                  <input
                    id="chkOrderbyTxnNo"
                    type="checkbox"
                    checked={orderByTxnNo}
                    onChange={(event) => setOrderByTxnNo(event.target.checked)}
                    className="h-4 w-4 accent-[#64d96e]"
                  />
                  Order by Posting No.
                </label>
              </div>

              {/* Detailed / Summary and period */}
              <RadioPanel>
                <CustomRadio
                  name="rdgDetSum"
                  value="Detailed"
                  label="Detailed"
                  checked={detSum === "Detailed"}
                  onChange={() => setDetSum("Detailed")}
                />
                <CustomRadio
                  name="rdgDetSum"
                  value="Summary"
                  label="Summary"
                  checked={detSum === "Summary"}
                  onChange={() => setDetSum("Summary")}
                />
              </RadioPanel>
              <div className="flex items-start gap-2">
                <FieldLabel className="w-[140px]">Period :</FieldLabel>
                <AppDatePicker
                  id="dtpFromDate"
                  label="From Date"
                  value={fromDate}
                  onChange={setFromDate}
                />
                <AppDatePicker
                  id="dtpToDate"
                  label="To Date"
                  value={toDate}
                  onChange={setToDate}
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
