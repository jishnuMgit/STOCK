import React, { useState } from "react";
import Select from "react-select";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import dayjs from "dayjs";

// ============================================================
// TYPES
// ============================================================

type Option = {
  value: string;
  label: string;
};

type Account = {
  id: string;
  name: string;
};

// type AccountSelection = {
//   id: Option | null;
//   name: Option | null;
// };

type RadioOptionProps = {
  name: string;
  value: string;
  label: string;
  checked: boolean;
  onChange: () => void;
};

// ============================================================
// OPTIONS
// ============================================================

const branchOptions: Option[] = [
  { value: "OFFICE", label: "OFFICE" },
  { value: "BRANCH 1", label: "BRANCH 1" },
  { value: "BRANCH 2", label: "BRANCH 2" },
];

// Single source of truth for account IDs and names.
const accounts: Account[] = [
  { id: "1001", name: "AL RAJHI TRADING COMPANY" },
  { id: "1002", name: "SAUDI AIRLINES" },
  { id: "1003", name: "AL FARAJ COMPANY" },
  { id: "1007", name: "E. A. JUFFALI & BROS H.O." },
  { id: "1010", name: "AL HOKAIR GROUP" },
];

const accountIdOptions: Option[] = accounts.map((account) => ({
  value: account.id,
  label: account.id,
}));

const accountNameOptions: Option[] = accounts.map((account) => ({
  value: account.id,
  label: account.name,
}));

const costCenterOptions: Option[] = [
  { value: "ALL", label: "All C.C." },
  { value: "CC001", label: "CC001" },
  { value: "CC002", label: "CC002" },
  { value: "CC003", label: "CC003" },
];

const yearOptions: Option[] = [
  { value: "2026", label: "2026" },
  { value: "2025", label: "2025" },
  { value: "2024", label: "2024" },
];

const monthOptions: Option[] = [
  { value: "01", label: "January" },
  { value: "02", label: "February" },
  { value: "03", label: "March" },
  { value: "04", label: "April" },
  { value: "05", label: "May" },
  { value: "06", label: "June" },
  { value: "07", label: "July" },
  { value: "08", label: "August" },
  { value: "09", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
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

const DATE_FORMAT = "DD-MM-YYYY";

// ============================================================
// ACCOUNT HELPERS
// ============================================================

const getAccountIdOption = (
  id: string | undefined,
): Option | null =>
  accountIdOptions.find((option) => option.value === id) ?? null;

const getAccountNameOption = (
  id: string | undefined,
): Option | null =>
  accountNameOptions.find((option) => option.value === id) ?? null;

// const createAccountSelection = (
//   id: string,
// ): AccountSelection => ({
//   id: getAccountIdOption(id),
//   name: getAccountNameOption(id),
// });

// ============================================================
// REACT SELECT STYLES
// ============================================================

const selectClassNames = {
  control: ({ isFocused }: { isFocused: boolean }) => `
    !min-h-[30px] !h-[30px] !rounded-[4px]
    !border !border-[#cfd7df] !bg-white
    !shadow-none !text-[14px]
    hover:!border-[#b7c2cd]
    ${isFocused ? "!border-[#9eacb9] !shadow-none" : ""}
  `,

  valueContainer: () => `
    !h-[28px] !py-0 !px-[8px] !overflow-hidden
  `,

  singleValue: () => `
    !m-0 !text-[14px] !text-[#24364d]
  `,

  placeholder: () => `
    !m-0 !text-[14px] !text-[#7a8794]
  `,

  input: () => `
    !m-0 !p-0 !text-[14px] !text-[#24364d]
  `,

  indicatorsContainer: () => `!h-[28px]`,

  dropdownIndicator: () => `
    !p-[4px] !text-[#5d6b7a]
  `,

  indicatorSeparator: () => `!hidden`,

  clearIndicator: () => `
    !p-[4px] !text-[#8b96a3]
  `,

  menu: () => `
    !mt-[1px] !rounded-none !border !border-[#cfd7df]
    !z-[999999] !shadow-[0_3px_8px_rgba(0,0,0,0.12)]
  `,

  menuList: () => `!p-0 !max-h-[180px]`,

  option: ({
    isFocused,
    isSelected,
  }: {
    isFocused: boolean;
    isSelected: boolean;
  }) => `
    !cursor-pointer !px-[8px] !py-[6px]
    !text-[14px] !text-[#24364d]
    ${
      isSelected
        ? "!bg-[#e7f7ed]"
        : isFocused
          ? "!bg-[#f2faf5]"
          : "!bg-white"
    }
  `,
};

// ============================================================
// DATE PICKER
// ============================================================

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
      value={
        value && dayjs(value, DATE_FORMAT, true).isValid()
          ? dayjs(value, DATE_FORMAT)
          : null
      }
      onChange={(newValue) => {
        onChange(
          newValue?.isValid()
            ? newValue.format(DATE_FORMAT)
            : "",
        );
      }}
      format={DATE_FORMAT}
      disabled={disabled}
      slotProps={{
        textField: {
          id,
          slotProps: {
            htmlInput: { "aria-label": label },
          },
        },
        openPickerButton: {
          sx: { padding: "2px", margin: 0 },
        },
        inputAdornment: {
          sx: { margin: 0, padding: 0 },
        },
      }}
      sx={{
        width: "140px",

        "& .MuiPickersTextField-root": {
          width: "120px",
        },

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

        "& .MuiInputAdornment-root": {
          margin: 0,
          padding: 0,
        },

        "& .MuiIconButton-root": {
          width: "24px",
          height: "24px",
          padding: "2px",
          margin: 0,
        },

        "& .MuiSvgIcon-root": {
          fontSize: "16px",
        },

        "& .Mui-disabled": {
          WebkitTextFillColor: "#24364d",
        },

        "& .MuiPickersOutlinedInput-notchedOutline": {
          borderColor: "#B7C7D7 !important",
        },

        "& .MuiPickersInputBase-root:hover .MuiPickersOutlinedInput-notchedOutline":
          {
            borderColor: "#B7C7D7 !important",
          },

        "& .MuiPickersInputBase-root.Mui-focused .MuiPickersOutlinedInput-notchedOutline":
          {
            borderColor: "#B7C7D7 !important",
            borderWidth: "1px",
          },

        "& .MuiPickersInputBase-root.Mui-error .MuiPickersOutlinedInput-notchedOutline":
          {
            borderColor: "#B7C7D7 !important",
          },

        "& .MuiPickersInputBase-root.Mui-error:hover .MuiPickersOutlinedInput-notchedOutline":
          {
            borderColor: "#B7C7D7 !important",
          },

        "& .MuiPickersInputBase-root.Mui-error.Mui-focused .MuiPickersOutlinedInput-notchedOutline":
          {
            borderColor: "#B7C7D7 !important",
          },
      }}
    />
  </LocalizationProvider>
);

// ============================================================
// CUSTOM RADIO
// ============================================================

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
      className={`
        flex h-4.5 w-4.5 shrink-0 items-center justify-center
        rounded-full border bg-white
        ${checked ? "border-[#4dcc68]" : "border-[#c5ced8]"}
      `}
    >
      <span
        className={`
          h-2.5 w-2.5 rounded-full bg-[#4dcc68]
          ${checked ? "opacity-100" : "opacity-0"}
        `}
      />
    </span>

    <span className="text-[14px] font-normal text-[#24364d]">
      {label}
    </span>
  </label>
);

// ============================================================
// RADIO PANEL
// ============================================================

const RadioPanel: React.FC<{
  children: React.ReactNode;
  title?: string;
  className?: string;
}> = ({ children, title, className = "" }) => (
  <div
    className={`
      relative border border-[#d7dee5] bg-white
      ${className}
    `}
  >
    {title && (
      <div
        className="
          absolute left-1/2 -top-2.5 -translate-x-1/2
          whitespace-nowrap bg-white px-2
          text-[14px] text-[#24364d]
        "
      >
        {title}
      </div>
    )}

    {children}
  </div>
);

// ============================================================
// FIELD LABEL
// ============================================================

const FieldLabel: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => (
  <div
    className="
      flex h-7.5 items-center justify-end
      border border-[#d7dee5] bg-[#fafbfc]
      pr-2 text-[14px] text-[#24364d]
    "
  >
    {children}
  </div>
);

// ============================================================
// MAIN COMPONENT
// ============================================================

const GeneralLedger: React.FC = () => {
  // ----------------------------------------------------------
  // RADIO STATES
  // ----------------------------------------------------------

  const [branchMode, setBranchMode] = useState("One Branch");
  const [accountMode, setAccountMode] = useState("One Account");
  const [opMode, setOpMode] = useState("With OP");
  const [entryMode, setEntryMode] = useState("All");

  // ----------------------------------------------------------
  // BRANCH
  // ----------------------------------------------------------

  const [branch, setBranch] = useState<Option | null>(
    branchOptions[0],
  );

  // ----------------------------------------------------------
  // ACCOUNT SELECTION
  //
  // One Account:
  //   accountId + accountName
  //
  // Range Account:
  //   accountId + accountName = FROM account
  //   rangeAccountId + rangeAccountName = TO account
  //
  // All Accounts:
  //   No account selection is required.
  // ----------------------------------------------------------

  const [accountId, setAccountId] = useState<Option | null>(
    getAccountIdOption("1001"),
  );

  const [accountName, setAccountName] = useState<Option | null>(
    getAccountNameOption("1001"),
  );

  const [rangeAccountId, setRangeAccountId] =
    useState<Option | null>(getAccountIdOption("1007"));

  const [rangeAccountName, setRangeAccountName] =
    useState<Option | null>(getAccountNameOption("1007"));

  // ----------------------------------------------------------
  // OTHER FILTERS
  // ----------------------------------------------------------

  const [costCenter, setCostCenter] = useState<Option | null>(
    costCenterOptions[0],
  );

  const [fromYear, setFromYear] = useState<Option | null>(
    yearOptions[0],
  );

  const [fromMonth, setFromMonth] = useState<Option | null>(
    monthOptions[0],
  );

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [postStatus, setPostStatus] = useState<Option | null>(
    postStatusOptions[0],
  );

  const [printZeroBalance, setPrintZeroBalance] =
    useState<Option | null>(printZeroOptions[0]);

  // ----------------------------------------------------------
  // SHARED SELECT PROPS
  // ----------------------------------------------------------

  const selectProps = {
    isSearchable: true,
    isClearable: false,
    placeholder: "",
    classNames: selectClassNames,
    menuPosition: "fixed" as const,
    menuPortalTarget:
      typeof document !== "undefined"
        ? document.body
        : undefined,
  };

  // ----------------------------------------------------------
  // ACCOUNT HANDLERS
  //
  // Both dropdowns store the same account ID as their value.
  // Only the displayed label is different.
  // ----------------------------------------------------------

  const handleAccountIdChange = (selected: Option | null) => {
    setAccountId(selected);
    setAccountName(
      selected ? getAccountNameOption(selected.value) : null,
    );
  };

  const handleAccountNameChange = (selected: Option | null) => {
    setAccountName(selected);
    setAccountId(
      selected ? getAccountIdOption(selected.value) : null,
    );
  };

  const handleRangeAccountIdChange = (
    selected: Option | null,
  ) => {
    setRangeAccountId(selected);
    setRangeAccountName(
      selected ? getAccountNameOption(selected.value) : null,
    );
  };

  // const handleRangeAccountNameChange = (
  //   selected: Option | null,
  // ) => {
  //   setRangeAccountName(selected);
  //   setRangeAccountId(
  //     selected ? getAccountIdOption(selected.value) : null,
  //   );
  // };

  // ----------------------------------------------------------
  // ACCOUNT MODE CHANGE
  // ----------------------------------------------------------

  const handleAccountModeChange = (mode: string) => {
    setAccountMode(mode);

    // Set sensible defaults when switching modes.
    if (mode === "One Account") {
      handleAccountIdChange(getAccountIdOption("1001"));
    }

    if (mode === "Range Account") {
      handleAccountIdChange(getAccountIdOption("1001"));
      handleRangeAccountIdChange(getAccountIdOption("1007"));
    }
  };

  // ----------------------------------------------------------
  // CLEAR
  // ----------------------------------------------------------

  const handleClear = () => {
    setBranchMode("One Branch");
    setAccountMode("One Account");
    setOpMode("With OP");
    setEntryMode("All");

    setBranch(branchOptions[0]);

    setAccountId(getAccountIdOption("1001"));
    setAccountName(getAccountNameOption("1001"));

    setRangeAccountId(getAccountIdOption("1007"));
    setRangeAccountName(getAccountNameOption("1007"));

    setCostCenter(costCenterOptions[0]);
    setFromYear(yearOptions[0]);
    setFromMonth(monthOptions[0]);

    setFromDate("");
    setToDate("");

    setPostStatus(postStatusOptions[0]);
    setPrintZeroBalance(printZeroOptions[0]);
  };

  // ----------------------------------------------------------
  // PRINT / FILTER
  // ----------------------------------------------------------

  const handlePrint = () => {
    const filters = {
      branchMode,
      branch: branch?.value ?? null,

      accountMode,

      // Only include the selected accounts for the active mode.
      accountId:
        accountMode !== "All Accounts"
          ? accountId?.value ?? null
          : null,

      accountName:
        accountMode !== "All Accounts"
          ? accountName?.label ?? null
          : null,

      rangeAccountId:
        accountMode === "Range Account"
          ? rangeAccountId?.value ?? null
          : null,

      rangeAccountName:
        accountMode === "Range Account"
          ? rangeAccountName?.label ?? null
          : null,

      costCenter: costCenter?.value ?? null,
      fromYear: fromYear?.value ?? null,
      fromMonth: fromMonth?.value ?? null,
      fromDate,
      toDate,
      postStatus: postStatus?.value ?? null,
      printZeroBalance: printZeroBalance?.value ?? null,
      opMode,
      entryMode,
    };

    // Validate account range before generating the report.
    if (accountMode === "Range Account") {
      if (!accountId || !rangeAccountId) {
        alert("Please select both From Account and To Account.");
        return;
      }

      if (
        Number(accountId.value) > Number(rangeAccountId.value)
      ) {
        alert("From Account ID cannot be greater than To Account ID.");
        return;
      }
    }

    console.log("General Ledger Filters:", filters);

    // Connect your report generation / print API here.
  };

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="flex min-h-full w-full items-start justify-center bg-white px-4 py-4">
      <div className="max-w-220 min-w-220 overflow-hidden border border-gray-400 bg-white">
        {/* TITLE */}

        <header className="flex h-7.5 items-center justify-start bg-[#9fdfbc]">
          <h1 className="m-0 ml-3.5 text-[17px] font-semibold text-[#24364d]">
            General Ledger
          </h1>
        </header>

        {/* FORM */}

        <div className="px-4 pb-3.5 pt-3">
          {/* TOP ROW */}

          <div className="grid grid-cols-[200px_250px_220px] items-start justify-between gap-4.5">
            {/* BRANCH MODE */}

            <RadioPanel className="h-25 px-4 py-3.5">
              <div className="flex flex-col gap-3.5">
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

            {/* BRANCH SELECT */}

            <div className="w-62.5 pt-2 -ml-10">
              <Select<Option, false>
                inputId="lkpBranch"
                instanceId="lkpBranch"
                options={branchOptions}
                value={branch}
                onChange={setBranch}
                {...selectProps}
              />
            </div>

            {/* OPENING BALANCE */}

            <RadioPanel className="h-25 px-4 py-3.5 w-[80%] ml-[20%]">
              <div className="flex flex-col gap-3.5">
                <CustomRadio
                  name="opMode"
                  value="With OP"
                  label="With OP"
                  checked={opMode === "With OP"}
                  onChange={() => setOpMode("With OP")}
                />

                <CustomRadio
                  name="opMode"
                  value="Without OP"
                  label="Without OP"
                  checked={opMode === "Without OP"}
                  onChange={() => setOpMode("Without OP")}
                />
              </div>
            </RadioPanel>
          </div>

          {/* ACCOUNT SECTION */}

        <div className="mt-3 grid grid-cols-[200px_120px_minmax(0,1fr)] gap-4.5">
  {/* ACCOUNT MODE */}

  <RadioPanel className="h-32.5 px-4 py-3.5">
    <div className="flex flex-col gap-3">
      <CustomRadio
        name="accountMode"
        value="One Account"
        label="One Account"
        checked={accountMode === "One Account"}
        onChange={() => handleAccountModeChange("One Account")}
      />

      <CustomRadio
        name="accountMode"
        value="Range Account"
        label="Range Account"
        checked={accountMode === "Range Account"}
        onChange={() => handleAccountModeChange("Range Account")}
      />

      <CustomRadio
        name="accountMode"
        value="All Accounts"
        label="All Account"
        checked={accountMode === "All Accounts"}
        onChange={() => handleAccountModeChange("All Accounts")}
      />
    </div>
  </RadioPanel>

  {/* ACCOUNT IDs */}

  <div className="flex w-30 flex-col gap-2.5 pt-3">
    {accountMode === "One Account" && (
      <Select<Option, false>
        inputId="lkpAccountID"
        instanceId="lkpAccountID"
        options={accountIdOptions}
        value={accountId}
        onChange={handleAccountIdChange}
        {...selectProps}
      />
    )}

    {accountMode === "Range Account" && (
      <div className="mt-8">
       

    

        {/* TO ACCOUNT ID */}

        <Select<Option, false>
          inputId="lkpToAccountID"
          instanceId="lkpToAccountID"
          options={accountIdOptions}
          value={rangeAccountId}
          onChange={handleRangeAccountIdChange}
          {...selectProps}
        />
      </div>
    )}
  </div>

  {/* ACCOUNT NAMES */}

  <div className="flex min-w-0 w-[102%] flex-col gap-2.5 pt-3 -ml-2.5">
    {accountMode === "One Account" && (
      <Select<Option, false>
        inputId="lkpAccountName"
        instanceId="lkpAccountName"
        options={accountNameOptions}
        value={accountName}
        onChange={handleAccountNameChange}
        {...selectProps}
      />
    )}

    {accountMode === "Range Account" && (
      <div className="w-30 mt-8">
        {/* FROM ACCOUNT NAME */}

       

        {/* TO ACCOUNT NAME */}
  <Select<Option, false>
          inputId="lkpToAccountID"
          instanceId="lkpToAccountID"
          options={accountIdOptions}
          value={rangeAccountId}
          onChange={handleRangeAccountIdChange}
          {...selectProps}
        />
       
      </div>
    )}
  </div>
</div>

          {/* LOWER FILTERS */}

          <div className="mt-3 grid grid-cols-[240px_1fr_220px] gap-4.5">
            {/* LEFT FILTERS */}

            <div className="col-span-2 grid grid-cols-[200px_250px_1fr] items-center gap-x-4.5 gap-y-2">
              {/* COST CENTER */}

              <FieldLabel>Cost Center :</FieldLabel>

              <div className="w-37.5">
                <Select<Option, false>
                  inputId="lkpCostCenter"
                  instanceId="lkpCostCenter"
                  options={costCenterOptions}
                  value={costCenter}
                  onChange={setCostCenter}
                  {...selectProps}
                />
              </div>

              <div />

              {/* PERIOD */}

              <FieldLabel>Period :</FieldLabel>

              <div className="flex gap-2">
                <div className="col-span-2 flex gap-2">
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

              <div />

              {/* POST STATUS */}

              <FieldLabel>Post Status :</FieldLabel>

              <div className="w-37.5">
                <Select<Option, false>
                  inputId="lkpPostStatus"
                  instanceId="lkpPostStatus"
                  options={postStatusOptions}
                  value={postStatus}
                  onChange={setPostStatus}
                  {...selectProps}
                />
              </div>

              <div />

              {/* PRINT ZERO BALANCE */}

              <FieldLabel>Print 0 Balance :</FieldLabel>

              <div className="w-25">
                <Select<Option, false>
                  inputId="lkpPrint0Balance"
                  instanceId="lkpPrint0Balance"
                  options={printZeroOptions}
                  value={printZeroBalance}
                  onChange={setPrintZeroBalance}
                  {...selectProps}
                />
              </div>

              <div />
            </div>

            {/* ENTRY TYPE */}

            <RadioPanel className="h-36.25 px-4 py-3.5">
              <div className="flex flex-col gap-3.5">
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
          </div>

          {/* BUTTONS */}

          <div className="mt-4 flex justify-center gap-7">
            <button
              type="button"
              onClick={handlePrint}
              className="
                h-10 w-31.25 rounded-sm border border-[#91abc0]
                bg-linear-to-b from-white to-[#e6edf2]
                text-[16px] text-[#009b2e]
                shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]
                hover:to-[#dfe7ed]
              "
            >
              <u>P</u>rint
            </button>

            <button
              type="button"
              onClick={handleClear}
              className="
                h-10 w-31.25 rounded-sm border border-[#91abc0]
                bg-linear-to-b from-white to-[#e6edf2]
                text-[16px] text-[#009b2e]
                shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]
                hover:to-[#dfe7ed]
              "
            >
              <u>C</u>lear
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GeneralLedger;