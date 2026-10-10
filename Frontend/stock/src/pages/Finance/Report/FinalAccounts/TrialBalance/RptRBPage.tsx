import React, { useState } from "react";
import Select from "react-select";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";

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
  onChange: () => void;
};

const DATE_FORMAT = "DD-MM-YYYY";
const DEFAULT_DATE = "07-07-2026";

const branchOptions: Option[] = [
  { value: "OFFICE", label: "OFFICE" },
  { value: "BRANCH 1", label: "BRANCH 1" },
  { value: "BRANCH 2", label: "BRANCH 2" },
];

const postStatusOptions: Option[] = [
  { value: "ALL", label: "All" },
  { value: "POSTED", label: "Posted" },
  { value: "UNPOSTED", label: "Unposted" },
];

const yesNoOptions: Option[] = [
  { value: "YES", label: "Yes" },
  { value: "NO", label: "No" },
];

const selectClassNames = {
  control: ({ isFocused }: { isFocused: boolean }) => `
    !min-h-[25px] !h-[30px] !rounded-[4px] !border !bg-white
    !shadow-none !text-[13px] hover:!border-[#aab8c5]
  
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
  <div className={`border border-[#e0e5ea] bg-white ${className}`}>
    {children}
  </div>
);

const FieldLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex h-6.5 items-center justify-end border border-[#e0e5ea] bg-[#fafbfc] pr-2 text-[12px] text-[#405066]">
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

const RptTBPage: React.FC = () => {
  const [branchMode, setBranchMode] = useState("One Branch");
  const [branch, setBranch] = useState<Option | null>(branchOptions[0]);

  const [dateMode, setDateMode] = useState("For A Period");
  const [asOnDate, setAsOnDate] = useState(DEFAULT_DATE);
  const [fromDate, setFromDate] = useState(DEFAULT_DATE);
  const [toDate, setToDate] = useState(DEFAULT_DATE);

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

  const handleClear = () => {
    setBranchMode("One Branch");
    setBranch(branchOptions[0]);
    setDateMode("For A Period");
    setAsOnDate(DEFAULT_DATE);
    setFromDate(DEFAULT_DATE);
    setToDate(DEFAULT_DATE);
    setAccountLevel("4");
    setPostStatus(postStatusOptions[0]);
    setPrintZeroBalance(yesNoOptions[1]);
    setPrintAccountGroup(yesNoOptions[0]);
    setEntryMode("All");
  };

  const handlePrint = () => {
    console.log({
      branchMode,
      branch,
      dateMode,
      asOnDate,
      fromDate,
      toDate,
      accountLevel,
      postStatus,
      printZeroBalance,
      printAccountGroup,
      entryMode,
    });
  };

  return (
    <div className="flex min-h-full  w-full items-start justify-center bg-white px-4 py-4">
      <div className="min-h-fit max-w-205 min-w-205 bg-white p-0">
        <main className="w-full overflow-hidden border border-gray-400 bg-white">
          <header className="flex h-7.5 items-center justify-start bg-[#9fdfbc] pl-3 text-[18px] font-semibold text-slate-700">
            Trial Balance
          </header>

          <section className="relative min-h-99.25 px-3.5 pb-5 pt-2.25">
            {/* Branch selection */}
            <div className="grid grid-cols-[168px_220px] items-start gap-3">
              <RadioPanel className="relative mt-0 h-21 px-3.5 py-3">
                <div className="flex flex-col gap-3">
                  <CustomRadio
                    name="branchMode"
                    value="One Branch"
                    label="One Branch"
                    checked={branchMode === "One Branch"}
                    onChange={() => setBranchMode("One Branch")}
                  />
                  <CustomRadio
                    name="branchMode"
                    value="All Branches"
                    label="All Branches"
                    checked={branchMode === "All Branches"}
                    onChange={() => setBranchMode("All Branches")}
                  />
                </div>
              </RadioPanel>

              <div className="relative mt-3 w-62.5 ">
                <Select
                  inputId="lkpBranch"
                  instanceId="lkpBranch"
                  options={branchOptions}
                  value={branch}
                  onChange={setBranch}
                  {...selectProps}
                />
              </div>
            </div>

            {/* Date mode and report filters */}
            <div className="mt-2.5 grid grid-cols-[168px_1fr] items-start gap-4">
              <RadioPanel className="relative h-20.5 px-3.5 py-3">
                <div className="flex flex-col gap-3">
                  <CustomRadio
                    name="dateMode"
                    value="As On Date"
                    label="As On Date"
                    checked={dateMode === "As On Date"}
                    onChange={() => setDateMode("As On Date")}
                  />
                  <CustomRadio
                    name="dateMode"
                    value="For A Period"
                    label="For A Period"
                    checked={dateMode === "For A Period"}
                    onChange={() => setDateMode("For A Period")}
                  />
                </div>
              </RadioPanel>

              <div className="pt-3">
                <div className="relative flex items-center gap-2">
                  <AppDatePicker
                    id="dtpAsOnDate"
                    label="As On Date"
                    value={asOnDate}
                    onChange={setAsOnDate}
                    disabled={dateMode !== "As On Date"}
                  />
                </div>

                <div className="relative mt-1.75 flex items-center gap-2">
                  <AppDatePicker
                    id="dtpFromDate"
                    label="From Date"
                    value={fromDate}
                    onChange={setFromDate}
                    disabled={dateMode !== "For A Period"}
                  />
                  <AppDatePicker
                    id="dtpToDate"
                    label="To Date"
                    value={toDate}
                    onChange={setToDate}
                    disabled={dateMode !== "For A Period"}
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
                value={accountLevel}
                onChange={(event) => setAccountLevel(event.target.value)}
                className="h-6.5 w-10 justify-self-start border border-[#cfd7df] bg-white px-2 text-[12px] text-[#24364d] outline-none focus:border-[#91a7b9]"
              />

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

              <FieldLabel>Print 0 Balance :</FieldLabel>
              <div className="w-21">
                <Select
                  inputId="lkpPrint0Balance"
                  instanceId="lkpPrint0Balance"
                  options={yesNoOptions}
                  value={printZeroBalance}
                  onChange={setPrintZeroBalance}
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
                  onChange={setPrintAccountGroup}
                  {...selectProps}
                />
              </div>
            </div>

            {/* Entry type */}
            <RadioPanel className="absolute right-3.5 top-51.25 h-28.75 w-45.75 px-3.5 py-3.25 max-[700px]:static max-[700px]:mt-3.5">
              <div className="flex flex-col gap-3">
                <CustomRadio
                  name="entryMode"
                  value="Manual"
                  label="Manual Entries"
                  checked={entryMode === "Manual"}
                  onChange={() => setEntryMode("Manual")}
                />
                <CustomRadio
                  name="entryMode"
                  value="Generated"
                  label="Generated Entries"
                  checked={entryMode === "Generated"}
                  onChange={() => setEntryMode("Generated")}
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

export default RptTBPage;