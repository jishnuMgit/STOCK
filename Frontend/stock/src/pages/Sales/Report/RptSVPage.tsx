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
const groupIdOptions: Option[] = [
  { value: "G1", label: "G1" },
  { value: "G2", label: "G2" },
];
const groupNameOptions: Option[] = [
  { value: "G1", label: "Group One" },
  { value: "G2", label: "Group Two" },
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

const RptStockValuePage: React.FC = () => {
  const [branchMode, setBranchMode] = useState("One Branch"); // optOneBranch
  const [branch, setBranch] = useState<Option | null>(null); // lkpOneBranch

  const [groupMode, setGroupMode] = useState("All Item Groups"); // optOneItemGroup
  const [groupId, setGroupId] = useState<Option | null>(null); // lkpItemGroupID
  const [groupName, setGroupName] = useState<Option | null>(null); // lkpItemGroupName

  const [asOnDate, setAsOnDate] = useState(""); // dtpAsOnDate
  const [postStatus, setPostStatus] = useState<Option | null>(
    postStatusOptions[1],
  ); // lkpPostStatus

  const handleClear = () => {
    setBranchMode("One Branch");
    setBranch(null);
    setGroupMode("All Item Groups");
    setGroupId(null);
    setGroupName(null);
    setAsOnDate("");
    setPostStatus(postStatusOptions[1]);
  };

  const handlePrint = () => {
    console.log({
      branchMode,
      branch,
      groupMode,
      groupId,
      groupName,
      asOnDate,
      postStatus,
    });
  };

  const groupDisabled = groupMode !== "One Item Group";

  return (
    <div className="flex min-h-screen w-full items-start justify-center bg-white px-4 py-4">
      <div className="min-h-fit w-205 max-w-full bg-white p-0">
        <main className="w-full overflow-hidden border border-[#d5dce2] bg-white">
          <header className="flex h-7.5 items-center justify-start bg-[#9fdfbc]">
            <h1 className="m-0 ml-3.5 text-[17px] font-semibold text-[#24364d]">
              Stock Value
            </h1>
          </header>

          <section className="px-3.5 pb-6 pt-3">
            <div className="grid grid-cols-[168px_1fr] gap-x-4 gap-y-3">
              {/* Branch */}
              <RadioPanel>
                <CustomRadio
                  name="optOneBranch"
                  value="One Branch"
                  label="One Branch"
                  checked={branchMode === "One Branch"}
                  onChange={() => setBranchMode("One Branch")}
                />
                <CustomRadio
                  name="optOneBranch"
                  value="All Branches"
                  label="All Branches"
                  checked={branchMode === "All Branches"}
                  onChange={() => setBranchMode("All Branches")}
                />
              </RadioPanel>
              <div className="pt-3">
                <div className="w-62.5">
                  <Select
                    inputId="lkpOneBranch"
                    instanceId="lkpOneBranch"
                    options={branchOptions}
                    value={branch}
                    onChange={setBranch}
                    isDisabled={branchMode !== "One Branch"}
                    {...selectProps}
                  />
                </div>
              </div>

              {/* Item group */}
              <RadioPanel>
                <CustomRadio
                  name="optOneItemGroup"
                  value="One Item Group"
                  label="One Item Group"
                  checked={groupMode === "One Item Group"}
                  onChange={() => setGroupMode("One Item Group")}
                />
                <CustomRadio
                  name="optOneItemGroup"
                  value="All Item Groups"
                  label="All Item Groups"
                  checked={groupMode === "All Item Groups"}
                  onChange={() => setGroupMode("All Item Groups")}
                />
              </RadioPanel>
              <div className="pt-3">
                <div className="grid grid-cols-[135px_1fr] gap-2">
                  <Select
                    inputId="lkpItemGroupID"
                    instanceId="lkpItemGroupID"
                    options={groupIdOptions}
                    value={groupId}
                    onChange={setGroupId}
                    isDisabled={groupDisabled}
                    {...selectProps}
                  />
                  <Select
                    inputId="lkpItemGroupName"
                    instanceId="lkpItemGroupName"
                    options={groupNameOptions}
                    value={groupName}
                    onChange={setGroupName}
                    isDisabled={groupDisabled}
                    {...selectProps}
                  />
                </div>
              </div>

              {/* As on date */}
              <FieldLabel>As On Date :</FieldLabel>
              <div>
                <AppDatePicker
                  id="dtpAsOnDate"
                  label="As On Date"
                  value={asOnDate}
                  onChange={setAsOnDate}
                />
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
            </div>

            {/* Actions */}
            <div className="mt-6 flex justify-center gap-3">
              <button
                id="btnPrint"
                type="button"
                onClick={handlePrint}
                className="btn-style"
              >
                <u>P</u>rint
              </button>
              <button
                id="btnClear"
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
  );
};

export default RptStockValuePage;