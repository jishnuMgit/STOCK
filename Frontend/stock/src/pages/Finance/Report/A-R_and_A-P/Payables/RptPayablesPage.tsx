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
const TODAY = dayjs().format(DATE_FORMAT);

/* Replace with data from your API */
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

// const CustomCheckbox: React.FC<{
//   id: string;
//   label: string;
//   checked: boolean;
//   onChange: (checked: boolean) => void;
// }> = ({ id, label, checked, onChange }) => (
//   <label
//     htmlFor={id}
//     className="flex h-7.5 cursor-pointer items-center gap-2 text-[14px] text-[#405066] select-none"
//   >
//     <input
//       id={id}
//       type="checkbox"
//       checked={checked}
//       onChange={(event) => onChange(event.target.checked)}
//       className="h-4 w-4 accent-[#64d96e]"
//     />
//     {label}
//   </label>
// );

const RadioPanel: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = "" }) => (
  <div className={`border border-[#e0e5ea] bg-white px-3.5 py-3 ${className}`}>
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

type RptPayablesPageProps = {
  onClose?: () => void;
};

const RptPayablesPage: React.FC<RptPayablesPageProps> = ({ onClose }) => {
  const [branchMode, setBranchMode] = useState("All Branch"); // optBranch
  const [branch, setBranch] = useState<Option | null>(branchOptions[0]); // lkpBranch
  const [accountName, setAccountName] = useState(false); // chkAccountName

  const [dateMode, setDateMode] = useState("For A Period"); // optDate
  const [fromDate, setFromDate] = useState(TODAY); // dtpFromDate (also used as the As On Date)
  const [toDate, setToDate] = useState(TODAY); // dtpToDate

  const [postStatus, setPostStatus] = useState<Option | null>(
    postStatusOptions[0],
  ); // lkpPostStatus
  const [printZeroBalance, setPrintZeroBalance] = useState<Option | null>(
    yesNoOptions[0],
  ); // lkpPrint0Balance

  const isPeriod = dateMode === "For A Period";

  const handlePrint = () => {
    console.log({
      branchMode,
      branch: branchMode === "One Branch" ? branch : null,
      accountName,
      dateMode,
      fromDate,
      toDate: isPeriod ? toDate : null,
      postStatus,
      printZeroBalance,
    });
  };

  const handleClose = () => {
    setBranchMode("All Branch");
    setBranch(branchOptions[0]);
    setAccountName(false);
    setDateMode("For A Period");
    setFromDate(TODAY);
    setToDate(TODAY);
    setPostStatus(postStatusOptions[0]);
    setPrintZeroBalance(yesNoOptions[0]);
    onClose?.();
  };

  return (
    <div className="flex min-h-screen w-full items-start justify-center bg-white px-4 py-4">
      <div className="min-h-fit w-205 max-w-full bg-white p-0">
        <main className="w-full overflow-hidden border border-gray-400 bg-white">
          <header className="flex h-7.5 items-center justify-start bg-[#9fdfbc]">
            <h1 className="m-0 ml-3.5 text-[17px] font-semibold text-[#24364d]">
              Payables
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
              <div className="flex items-start justify-between pt-3">
                {branchMode === "One Branch" ? (
                  <div className="w-62.5">
                    <Select
                      inputId="lkpBranch"
                      instanceId="lkpBranch"
                      options={branchOptions}
                      value={branch}
                      onChange={setBranch}
                      {...selectProps}
                    />
                  </div>
                ) : (
                  <div />
                )}
                {/* <CustomCheckbox
                  id="chkAccountName"
                  label="Account Name"
                  checked={accountName}
                  onChange={setAccountName}
                /> */}
              </div>

              {/* Date mode */}
              <RadioPanel>
                <CustomRadio
                  name="rdgDateFrom"
                  value="As On Date"
                  label="As On Date"
                  checked={dateMode === "As On Date"}
                  onChange={() => setDateMode("As On Date")}
                />
                <CustomRadio
                  name="dtpDateTo"
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

              {/* Actions */}
              <div />
              
            </div>
            <div className="flex gap-3  justify-center ">
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
          </section>
        </main>
      </div>
    </div>
  );
};

export default RptPayablesPage;