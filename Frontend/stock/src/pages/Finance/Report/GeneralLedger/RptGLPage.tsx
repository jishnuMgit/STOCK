import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import dayjs from "dayjs";
import React, { useState } from "react";
import Select from "react-select";

// ============================================================
// TYPES
// ============================================================

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

// ============================================================
// OPTIONS
// ============================================================

const branchOptions: Option[] = [
  { value: "OFFICE", label: "OFFICE" },
  { value: "BRANCH 1", label: "BRANCH 1" },
  { value: "BRANCH 2", label: "BRANCH 2" },
];

const accountIdOptions: Option[] = [
  { value: "1001", label: "1001" },
  { value: "1002", label: "1002" },
  { value: "1003", label: "1003" },
  { value: "1007", label: "1007" },
  { value: "1010", label: "1010" },
];

const accountNameOptions: Option[] = [
  {
    value: "1001",
    label: "AL RAJHI TRADING COMPANY",
  },
  {
    value: "1002",
    label: "SAUDI AIRLINES",
  },
  {
    value: "1003",
    label: "AL FARAJ COMPANY",
  },
  {
    value: "1007",
    label: "E. A. JUFFALI & BROS H.O.",
  },
  {
    value: "1010",
    label: "AL HOKAIR GROUP",
  },
];

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

// ============================================================
// REACT SELECT STYLES
// ============================================================

const selectClassNames = {
  control: ({
    isFocused,
  }: {
    isFocused: boolean;
  }) => `
    !min-h-[30px]
    !h-[30px]
    !rounded-[4px]
    !border
    !border-[#cfd7df]
    !bg-white
    !shadow-none
    !text-[14px]
    hover:!border-[#b7c2cd]
    ${
      isFocused
        ? "!border-[#9eacb9] !shadow-none"
        : ""
    }
  `,

  valueContainer: () => `
    !h-[28px]
    !py-0
    !px-[8px]
    !overflow-hidden
  `,

  singleValue: () => `
    !m-0
    !text-[14px]
    !text-[#24364d]
  `,

  placeholder: () => `
    !m-0
    !text-[14px]
    !text-[#7a8794]
  `,

  input: () => `
    !m-0
    !p-0
    !text-[14px]
    !text-[#24364d]
  `,

  indicatorsContainer: () => `
    !h-[28px]
  `,

  dropdownIndicator: () => `
    !p-[4px]
    !text-[#5d6b7a]
  `,

  indicatorSeparator: () => `
    !hidden
  `,

  clearIndicator: () => `
    !p-[4px]
    !text-[#8b96a3]
  `,

  menu: () => `
    !mt-[1px]
    !rounded-none
    !border
    !border-[#cfd7df]
    !z-[999999]
    !shadow-[0_3px_8px_rgba(0,0,0,0.12)]
  `,

  menuList: () => `
    !p-0
    !max-h-[180px]
  `,

  option: ({
    isFocused,
    isSelected,
  }: {
    isFocused: boolean;
    isSelected: boolean;
  }) => `
    !cursor-pointer
    !px-[8px]
    !py-[6px]
    !text-[14px]
    !text-[#24364d]
    ${
      isSelected
        ? "!bg-[#e7f7ed]"
        : isFocused
          ? "!bg-[#f2faf5]"
          : "!bg-white"
    }
  `,
};
const DATE_FORMAT = "DD-MM-YYYY";
const DEFAULT_DATE = "07-07-2026"

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

// ============================================================
// CUSTOM RADIO
// ============================================================

const CustomRadio: React.FC<
  RadioOptionProps
> = ({
  name,
  value,
  label,
  checked,
  onChange,
}) => {
  return (
    <label
      className="
        flex
        cursor-pointer
        items-center
        gap-2.5
        whitespace-nowrap
        select-none
      "
    >
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
          flex
          h-4.5
          w-4.5
          shrink-0
          items-center
          justify-center
          rounded-full
          border
          bg-white
          ${
            checked
              ? "border-[#4dcc68]"
              : "border-[#c5ced8]"
          }
        `}
      >
        <span
          className={`
            h-2.5
            w-2.5
            rounded-full
            bg-[#4dcc68]
            ${
              checked
                ? "opacity-100"
                : "opacity-0"
            }
          `}
        />
      </span>

      <span
        className="
          text-[14px]
          font-normal
          text-[#24364d]
        "
      >
        {label}
      </span>
    </label>
  );
};

// ============================================================
// RADIO PANEL
// ============================================================

const RadioPanel: React.FC<{
  children: React.ReactNode;
  title?: string;
  className?: string;
}> = ({
  children,
  title,
  className = "",
}) => {
  return (
    <div
      className={`
        relative
        border
        border-[#d7dee5]
        bg-white
        ${className}
      `}
    >
      {title && (
        <div
          className="
            absolute
            left-1/2
            -top-2.5
            -translate-x-1/2
            whitespace-nowrap
            bg-white
            px-2
            text-[14px]
            text-[#24364d]
          "
        >
          {title}
        </div>
      )}

      {children}
    </div>
  );
};

// ============================================================
// FIELD LABEL
// ============================================================

const FieldLabel: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  return (
    <div
      className="
        flex
        h-7.5
        items-center
        justify-end
        border
        border-[#d7dee5]
        bg-[#fafbfc]
        pr-2
        text-[14px]
        text-[#24364d]
      "
    >
      {children}
    </div>
  );
};

// ============================================================
// MAIN COMPONENT
// ============================================================

const GeneralLedger: React.FC = () => {
  // ==========================================================
  // RADIO STATES
  // ==========================================================

  const [branchMode, setBranchMode] =
    useState("One Branch");

  const [accountMode, setAccountMode] =
    useState("One Account");

  const [opMode, setOpMode] =
    useState("With OP");

  const [entryMode, setEntryMode] =
    useState("All");

  // ==========================================================
  // SELECT STATES
  // ==========================================================

  const [branch, setBranch] =
    useState<Option | null>(
      branchOptions[0],
    );

  const [accountId, setAccountId] =
    useState<Option | null>(
      accountIdOptions[0],
    );

  const [accountName, setAccountName] =
    useState<Option | null>(
      accountNameOptions[0],
    );

  const [
    rangeAccountId,
    setRangeAccountId,
  ] = useState<Option | null>(
    accountIdOptions[0],
  );

  const [
    rangeAccountName,
    setRangeAccountName,
  ] = useState<Option | null>(
    accountNameOptions[0],
  );

  const [costCenter, setCostCenter] =
    useState<Option | null>(
      costCenterOptions[0],
    );

  const [fromYear, setFromYear] =
    useState<Option | null>(
      yearOptions[0],
    );

  const [fromMonth, setFromMonth] =
    useState<Option | null>(
      monthOptions[0],
    );
      const [fromDate, setFromDate] =
        useState("");
    
      const [toDate, setToDate] =
        useState("");

  const [postStatus, setPostStatus] =
    useState<Option | null>(
      postStatusOptions[0],
    );

  const [
    printZeroBalance,
    setPrintZeroBalance,
  ] = useState<Option | null>(
    printZeroOptions[0],
  );

  // ==========================================================
  // COMMON SELECT PROPS
  // ==========================================================

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

  // ==========================================================
  // CLEAR
  // ==========================================================

  const handleClear = () => {
    setBranchMode("One Branch");
    setAccountMode("One Account");
    setOpMode("With OP");
    setEntryMode("All");

    setBranch(branchOptions[0]);

    setAccountId(
      accountIdOptions[0],
    );

    setAccountName(
      accountNameOptions[0],
    );

    setRangeAccountId(
      accountIdOptions[0],
    );

    setRangeAccountName(
      accountNameOptions[0],
    );

    setCostCenter(
      costCenterOptions[0],
    );

    setFromYear(
      yearOptions[0],
    );

    setFromMonth(
      monthOptions[0],
    );

    setPostStatus(
      postStatusOptions[0],
    );

    setPrintZeroBalance(
      printZeroOptions[0],
    );
  };

  // ==========================================================
  // PRINT
  // ==========================================================

  const handlePrint = () => {
    console.log({
      branchMode,
      branch,
      accountMode,
      accountId,
      accountName,
      rangeAccountId,
      rangeAccountName,
      costCenter,
      fromYear,
      fromMonth,
      postStatus,
      printZeroBalance,
      opMode,
      entryMode,
    });
  };

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div
      className="
        flex
        min-h-screen
        w-full
        items-start
        justify-center
        bg-white
        px-4
        py-4
      "
    >
      {/* ====================================================
          MAIN CONTAINER
      ==================================================== */}

      <div
        className="
          max-w-205
          min-w-205
         
          overflow-hidden
          border
          border-gray-400
          bg-white
        "
      >
        {/* ==================================================
            TITLE
        ================================================== */}

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
            General Ledger
          </h1>
        </header>

        {/* ==================================================
            FORM
        ================================================== */}

        <div
          className="
            px-4
            pb-3.5
            pt-3
          "
        >
          {/* =================================================
              TOP ROW
          ================================================= */}

          <div
            className="
              grid
              grid-cols-[200px_250px_220px]
              items-start
              justify-between
              gap-4.5
            "
          >
            {/* =================================================
                BRANCH
            ================================================= */}

            <RadioPanel
              className="
                h-25
                px-4
                py-3.5
              "
            >
              <div
                className="
                  flex
                  flex-col
                  gap-3.5
                "
              >
                <CustomRadio
                  name="branchMode"
                  value="One Branch"
                  label="One Branch"
                  checked={
                    branchMode ===
                    "One Branch"
                  }
                  onChange={() =>
                    setBranchMode(
                      "One Branch",
                    )
                  }
                />

                <CustomRadio
                  name="branchMode"
                  value="All Branches"
                  label="All Branches"
                  checked={
                    branchMode ===
                    "All Branches"
                  }
                  onChange={() =>
                    setBranchMode(
                      "All Branches",
                    )
                  }
                />
              </div>
            </RadioPanel>

            {/* BRANCH SELECT */}

            <div className="w-62.5 pt-3.75 -ml-10">
              <Select
                inputId="lkpBranch"
                instanceId="lkpBranch"
                options={branchOptions}
                value={branch}
                onChange={setBranch}
                {...selectProps}
              />
            </div>

            {/* OP */}

            <RadioPanel
              className="
                h-25
                px-4
                py-3.5
              "
            >
              <div
                className="
                  flex
                  flex-col
                  gap-3.5
                "
              >
                <CustomRadio
                  name="opMode"
                  value="With OP"
                  label="With OP"
                  checked={
                    opMode === "With OP"
                  }
                  onChange={() =>
                    setOpMode("With OP")
                  }
                />

                <CustomRadio
                  name="opMode"
                  value="Without OP"
                  label="Without OP"
                  checked={
                    opMode ===
                    "Without OP"
                  }
                  onChange={() =>
                    setOpMode(
                      "Without OP",
                    )
                  }
                />
              </div>
            </RadioPanel>
          </div>

          {/* =================================================
              ACCOUNT SECTION
          ================================================= */}

         <div
  className="
    mt-[12px]
    grid
    grid-cols-[200px_120px_minmax(0,1fr)]
    gap-[18px]
  "
>
  {/* ACCOUNT RADIO */}

  <RadioPanel
    className="
      h-[130px]
      px-[16px]
      py-[14px]
    "
  >
    <div
      className="
        flex
        flex-col
        gap-[12px]
      "
    >
      <CustomRadio
        name="accountMode"
        value="One Account"
        label="One Account"
        checked={
          accountMode === "One Account"
        }
        onChange={() =>
          setAccountMode("One Account")
        }
      />

      <CustomRadio
        name="accountMode"
        value="Range Account"
        label="Range Customer"
        checked={
          accountMode === "Range Account"
        }
        onChange={() =>
          setAccountMode("Range Account")
        }
      />

      <CustomRadio
        name="accountMode"
        value="All Accounts"
        label="All Customers"
        checked={
          accountMode === "All Accounts"
        }
        onChange={() =>
          setAccountMode("All Accounts")
        }
      />
    </div>
  </RadioPanel>

  {/* ========================================================
      ACCOUNT ID
  ======================================================== */}

  <div
    className="
      flex
      w-[120px]
      flex-col
      gap-2.5
      pt-2.5
    "
  >
    <div className="w-[120px]">
      <Select
        inputId="lkpAccountID"
        instanceId="lkpAccountID"
        options={accountIdOptions}
        value={accountId}
        onChange={setAccountId}
        {...selectProps}
      />
    </div>

    <div className="w-[120px]">
      <Select
        inputId="lkpRangeAccountID"
        instanceId="lkpRangeAccountID"
        options={accountIdOptions}
        value={rangeAccountId}
        onChange={setRangeAccountId}
        {...selectProps}
      />
    </div>
  </div>

  {/* ========================================================
      ACCOUNT NAME - TAKES REMAINING SPACE
  ======================================================== */}

  <div
    className="
      min-w-0
      w-full
      flex
      flex-col
      gap-2.5
      pt-2.5
    "
  >
    <div className="w-full min-w-0">
      <Select
        inputId="lkpAccountName"
        instanceId="lkpAccountName"
        options={accountNameOptions}
        value={accountName}
        onChange={setAccountName}
        {...selectProps}
      />
    </div>

    <div className="w-full min-w-0">
      <Select
        inputId="lkpRangeAccountName"
        instanceId="lkpRangeAccountName"
        options={accountNameOptions}
        value={rangeAccountName}
        onChange={setRangeAccountName}
        {...selectProps}
      />
    </div>
  </div>
</div>

          {/* =================================================
              LOWER CONTENT
          ================================================= */}

          <div
            className="
              mt-3
              grid
              grid-cols-[240px_1fr_220px]
              gap-4.5
            "
          >
            {/* ===============================================
                LEFT FILTERS
            =============================================== */}

            <div
              className="
                col-span-2
                grid
                grid-cols-[200px_250px_1fr]
                items-center
                gap-x-4.5
                gap-y-2
              "
            >
              {/* COST CENTER */}

              <FieldLabel>
                Cost Center :
              </FieldLabel>

              <div className=" w-37.5">
                <Select
                  inputId="lkpCostCenter"
                  instanceId="lkpCostCenter"
                  options={
                    costCenterOptions
                  }
                  value={costCenter}
                  onChange={
                    setCostCenter
                  }
                  {...selectProps}
                />
              </div>

              <div />

              {/* PERIOD */}

              <FieldLabel>
                Period :
              </FieldLabel>

              <div
                className="
                  flex
                  gap-2
                "
              >
              
               <div className="  col-span-2
                  flex
                  gap-[8px]">
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

              <FieldLabel>
                Post Status :
              </FieldLabel>

              <div className=" w-37.5">
                <Select
                  inputId="lkpPostStatus"
                  instanceId="lkpPostStatus"
                  options={
                    postStatusOptions
                  }
                  value={
                    postStatus
                  }
                  onChange={
                    setPostStatus
                  }
                  {...selectProps}
                />
              </div>

              <div />

              {/* PRINT ZERO */}

              <FieldLabel>
                Print 0 Balance :
              </FieldLabel>

              <div className=" w-25">
                <Select
                  inputId="lkpPrint0Balance"
                  instanceId="lkpPrint0Balance"
                  options={
                    printZeroOptions
                  }
                  value={
                    printZeroBalance
                  }
                  onChange={
                    setPrintZeroBalance
                  }
                  {...selectProps}
                />
              </div>

              <div />
            </div>

            {/* ===============================================
                ENTRY TYPE
            =============================================== */}

            <RadioPanel
              className="
                h-36.25
                px-4
                py-3.5
              "
            >
              <div
                className="
                  flex
                  flex-col
                  gap-3.5
                "
              >
                <CustomRadio
                  name="entryMode"
                  value="Manual"
                  label="Manual Entries"
                  checked={
                    entryMode ===
                    "Manual"
                  }
                  onChange={() =>
                    setEntryMode(
                      "Manual",
                    )
                  }
                />

                <CustomRadio
                  name="entryMode"
                  value="Generated"
                  label="Generated Entries"
                  checked={
                    entryMode ===
                    "Generated"
                  }
                  onChange={() =>
                    setEntryMode(
                      "Generated",
                    )
                  }
                />

                <CustomRadio
                  name="entryMode"
                  value="All"
                  label="All"
                  checked={
                    entryMode === "All"
                  }
                  onChange={() =>
                    setEntryMode("All")
                  }
                />
              </div>
            </RadioPanel>
          </div>

          {/* =================================================
              BUTTONS
          ================================================= */}

          <div
            className="
              mt-4
              flex
              justify-center
              gap-7
            "
          >
            <button
              type="button"
              onClick={handlePrint}
              className="
                h-10
                w-31.25
                rounded-sm
                border
                border-[#91abc0]
                bg-linear-to-b
                from-white
                to-[#e6edf2]
                text-[16px]
                text-[#009b2e]
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
                h-10
                w-31.25
                rounded-sm
                border
                border-[#91abc0]
                bg-linear-to-b
                from-white
                to-[#e6edf2]
                text-[16px]
                text-[#009b2e]
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