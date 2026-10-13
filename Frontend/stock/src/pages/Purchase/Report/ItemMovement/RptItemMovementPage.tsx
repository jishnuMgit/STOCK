import React, { useState } from "react";
import Select from "react-select";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";

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

/* Replace these with data from your API */
const branchOptions: Option[] = [
  { value: "OFFICE", label: "OFFICE" },
  { value: "BRANCH 1", label: "BRANCH 1" },
  { value: "BRANCH 2", label: "BRANCH 2" },
];
const itemIdOptions: Option[] = [
  { value: "1001", label: "1001" },
  { value: "1002", label: "1002" },
  { value: "1003", label: "1003" },
];
const itemNameOptions: Option[] = [
  { value: "1001", label: "Item One" },
  { value: "1002", label: "Item Two" },
  { value: "1003", label: "Item Three" },
];
const postStatusOptions: Option[] = [
  { value: "ALL", label: "All" },
  { value: "POSTED", label: "Posted" },
  { value: "UNPOSTED", label: "Unposted" },
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
    className={`flex h-7.5 items-center border border-[#e0e5ea] bg-[#fafbfc] px-3 text-[12px] text-[#405066] ${className}`}
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

type RptItemMovementPageProps = {
  onClose?: () => void;
};

const RptItemMovementPage: React.FC<RptItemMovementPageProps> = ({
  onClose,
}) => {
  const [branchMode, setBranchMode] = useState("One Branch"); // optBranch
  const [branch, setBranch] = useState<Option | null>(branchOptions[0]); // lkpBranch

  const [itemMode, setItemMode] = useState("All Item"); // optItem
  const [itemId, setItemId] = useState<string | null>(null); // lkpItemID / lkpItemName
  const [fromItem, setFromItem] = useState<Option | null>(null); // lkpFromItem
  const [toItem, setToItem] = useState<Option | null>(null); // lkpToItem

  const [postStatus, setPostStatus] = useState<Option | null>(
    postStatusOptions[1],
  ); // lkpPostStatus
  const [movementMode, setMovementMode] = useState("Fast Moving"); // optMovement
  const [fromDate, setFromDate] = useState(""); // dtpFromDate
  const [toDate, setToDate] = useState(""); // dtpToDate
  const [orderBy, setOrderBy] = useState("Qty"); // optOrderBy

  const selectedItemId = itemIdOptions.find((o) => o.value === itemId) ?? null;
  const selectedItemName =
    itemNameOptions.find((o) => o.value === itemId) ?? null;

  const handlePrint = () => {
    console.log({
      branchMode,
      branch: branchMode === "One Branch" ? branch : null,
      itemMode,
      itemId: itemMode === "One Item" ? itemId : null,
      fromItem: itemMode === "Range Item" ? fromItem : null,
      toItem: itemMode === "Range Item" ? toItem : null,
      postStatus,
      movementMode,
      fromDate,
      toDate,
      orderBy,
    });
  };

  const handleClose = () => {
    setBranchMode("One Branch");
    setBranch(branchOptions[0]);
    setItemMode("All Item");
    setItemId(null);
    setFromItem(null);
    setToItem(null);
    setPostStatus(postStatusOptions[1]);
    setMovementMode("Fast Moving");
    setFromDate("");
    setToDate("");
    setOrderBy("Qty");
    onClose?.();
  };

  return (
    <div className="flex min-h-full w-full items-start justify-center bg-white px-4 py-4">
      <div className="min-h-fit w-205 max-w-full bg-white p-0">
        <main className="w-full overflow-hidden border border-gray-400 bg-white">
          <header className="flex h-7.5 items-center justify-start bg-[#9fdfbc]">
            <h1 className="m-0 ml-3.5 text-[17px] font-semibold text-[#24364d]">
              Item Movement
            </h1>
          </header>

          <section className="px-3.5 pb-6 pt-3">
            <div className="grid grid-cols-[168px_1fr] items-start gap-x-4 gap-y-3">
              {/* Branch */}
              <RadioPanel>
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
                <div className="w-62.5">
                  <Select
                    inputId="lkpBranch"
                    instanceId="lkpBranch"
                    options={branchOptions}
                    value={branch}
                    onChange={setBranch}
                    isDisabled={branchMode !== "One Branch"}
                    {...selectProps}
                  />
                </div>
              </div>

              {/* Item */}
              <RadioPanel>
                <CustomRadio
                  name="rdgItem"
                  value="One Item"
                  label="One Item"
                  checked={itemMode === "One Item"}
                  onChange={() => setItemMode("One Item")}
                />
                <CustomRadio
                  name="rdgItem"
                  value="Range Item"
                  label="Range Item"
                  checked={itemMode === "Range Item"}
                  onChange={() => setItemMode("Range Item")}
                />
                <CustomRadio
                  name="rdgItem"
                  value="All Item"
                  label="All Item"
                  checked={itemMode === "All Item"}
                  onChange={() => setItemMode("All Item")}
                />
              </RadioPanel>
              <div className="pt-3">
                {itemMode === "One Item" && (
                  <div className="grid grid-cols-[135px_1fr] gap-2">
                    <Select
                      inputId="lkpItemID"
                      instanceId="lkpItemID"
                      options={itemIdOptions}
                      value={selectedItemId}
                      onChange={(option) => setItemId(option?.value ?? null)}
                      {...selectProps}
                    />
                    <Select
                      inputId="lkpItemName"
                      instanceId="lkpItemName"
                      options={itemNameOptions}
                      value={selectedItemName}
                      onChange={(option) => setItemId(option?.value ?? null)}
                      {...selectProps}
                    />
                  </div>
                )}
                {itemMode === "Range Item" && (
                  <div className="flex items-center gap-2">
                    <div className="w-33.75">
                      <Select
                        inputId="lkpFromItem"
                        instanceId="lkpFromItem"
                        options={itemIdOptions}
                        value={fromItem}
                        onChange={setFromItem}
                        {...selectProps}
                      />
                    </div>
                    <span className="text-[12px] text-[#405066]">to</span>
                    <div className="w-33.75">
                      <Select
                        inputId="lkpToItem"
                        instanceId="lkpToItem"
                        options={itemIdOptions}
                        value={toItem}
                        onChange={setToItem}
                        {...selectProps}
                      />
                    </div>
                  </div>
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

              {/* Movement type */}
              <RadioPanel>
                <CustomRadio
                  name="rdgMovement"
                  value="Fast Moving"
                  label="Fast Moving"
                  checked={movementMode === "Fast Moving"}
                  onChange={() => setMovementMode("Fast Moving")}
                />
                <CustomRadio
                  name="rdgMovement"
                  value="Slow Moving"
                  label="Slow Moving"
                  checked={movementMode === "Slow Moving"}
                  onChange={() => setMovementMode("Slow Moving")}
                />
                <CustomRadio
                  name="rdgMovement"
                  value="Non Moving"
                  label="Non Moving"
                  checked={movementMode === "Non Moving"}
                  onChange={() => setMovementMode("Non Moving")}
                />
              </RadioPanel>

              {/* Period, actions and order by */}
              <div className="flex items-end justify-between gap-4 self-stretch">
                <div className="flex flex-col gap-5 self-start pt-0">
                  <div className="flex items-center gap-2">
                    <FieldLabel className="w-20">Period :</FieldLabel>
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
                  <div className="flex gap-3 pl-22">
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

                <RadioPanel className="w-40 shrink-0">
                  <CustomRadio
                    name="rdgOrderBy"
                    value="Qty"
                    label="Order by Qty."
                    checked={orderBy === "Qty"}
                    onChange={() => setOrderBy("Qty")}
                  />
                  <CustomRadio
                    name="rdgOrderBy"
                    value="Value"
                    label="Order by Value"
                    checked={orderBy === "Value"}
                    onChange={() => setOrderBy("Value")}
                  />
                </RadioPanel>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};

export default RptItemMovementPage;