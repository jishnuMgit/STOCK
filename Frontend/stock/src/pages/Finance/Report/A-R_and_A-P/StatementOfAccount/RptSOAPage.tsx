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
  {
    value: "OFFICE",
    label: "OFFICE",
  },
  {
    value: "BRANCH 1",
    label: "BRANCH 1",
  },
  {
    value: "BRANCH 2",
    label: "BRANCH 2",
  },
];

const customerIdOptions: Option[] = [
  {
    value: "1001",
    label: "1001",
  },
  {
    value: "1002",
    label: "1002",
  },
  {
    value: "1003",
    label: "1003",
  },
  {
    value: "1007",
    label: "1007",
  },
  {
    value: "1010",
    label: "1010",
  },
];

const customerNameOptions: Option[] = [
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

const divisionIdOptions: Option[] = [
  {
    value: "DIV001",
    label: "DIV001",
  },
  {
    value: "DIV002",
    label: "DIV002",
  },
  {
    value: "DIV003",
    label: "DIV003",
  },
];

const divisionNameOptions: Option[] = [
  {
    value: "DIV001",
    label: "Travel",
  },
  {
    value: "DIV002",
    label: "Tours",
  },
  {
    value: "DIV003",
    label: "Corporate",
  },
];

const ageingOptions: Option[] = [
  {
    value: "WITHOUT",
    label: "Without Ageing",
  },
  {
    value: "WITH",
    label: "With Ageing",
  },
];

const ageingModeOptions: Option[] = [
  {
    value: "DAYS",
    label: "Days",
  },
  {
    value: "MONTHS",
    label: "Months",
  },
];

const postStatusOptions: Option[] = [
  {
    value: "ALL",
    label: "All",
  },
  {
    value: "POSTED",
    label: "Posted",
  },
  {
    value: "UNPOSTED",
    label: "Unposted",
  },
];

const printZeroOptions: Option[] = [
  {
    value: "YES",
    label: "Yes",
  },
  {
    value: "NO",
    label: "No",
  },
];

// ============================================================
// REACT SELECT STYLE
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
    ${
      isSelected
        ? "!bg-[#e7f7ed]"
        : isFocused
          ? "!bg-[#f2faf5]"
          : "!bg-white"
    }
    !text-[#24364d]
  `,
};

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
        gap-[10px]
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

      {/* RADIO CIRCLE */}
      <span
        className={`
          flex
          h-[18px]
          w-[18px]
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
        {/* GREEN INNER CIRCLE */}
        <span
          className={`
            h-[10px]
            w-[10px]
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

type RadioPanelProps = {
  title?: string;
  children: React.ReactNode;
  className?: string;
};

const RadioPanel: React.FC<
  RadioPanelProps
> = ({
  title,
  children,
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
            top-[-10px]
            -translate-x-1/2
            bg-white
            px-[8px]
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
const DATE_FORMAT = "DD-MM-YYYY";
const DEFAULT_DATE = "07-07-2026";
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
        h-[30px]
        items-center
        justify-end
        border
        border-[#d7dee5]
        bg-[#fafbfc]
        pr-[8px]
        text-[14px]
        text-[#24364d]
      "
    >
      {children}
    </div>
  );
};


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
// COMPONENT
// ============================================================

const RptSOAPage: React.FC = () => {
  // ==========================================================
  // STATE
  // ==========================================================

  const [branchMode, setBranchMode] =
    useState("All Branches");

  const [reportType, setReportType] =
    useState("Customer");

  const [customerMode, setCustomerMode] =
    useState("One Customer");

  const [divisionMode, setDivisionMode] =
    useState("All Division");

  const [status, setStatus] =
    useState("All");

  const [branch, setBranch] =
    useState<Option | null>(
      branchOptions[0],
    );

  const [customerId, setCustomerId] =
    useState<Option | null>(
      customerIdOptions[3],
    );

  const [customerName, setCustomerName] =
    useState<Option | null>(
      customerNameOptions[3],
    );

  const [rangeCustomerId, setRangeCustomerId] =
    useState<Option | null>(
      customerIdOptions[0],
    );

  const [
    rangeCustomerName,
    setRangeCustomerName,
  ] = useState<Option | null>(
    customerNameOptions[4],
  );

  const [divisionId, setDivisionId] =
    useState<Option | null>(null);

  const [divisionName, setDivisionName] =
    useState<Option | null>(null);

  const [fromDate, setFromDate] =
    useState("");

  const [toDate, setToDate] =
    useState("");

  const [ageing, setAgeing] =
    useState<Option | null>(
      ageingOptions[0],
    );

  const [ageingMode, setAgeingMode] =
    useState<Option | null>(
      ageingModeOptions[0],
    );

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
  // CLEAR
  // ==========================================================

  const handleClear = () => {
    setBranchMode("All Branches");

    setReportType("Customer");

    setCustomerMode(
      "One Customer",
    );

    setDivisionMode(
      "All Division",
    );

    setStatus("All");

    setBranch(
      branchOptions[0],
    );

    setCustomerId(
      customerIdOptions[3],
    );

    setCustomerName(
      customerNameOptions[3],
    );

    setRangeCustomerId(
      customerIdOptions[0],
    );

    setRangeCustomerName(
      customerNameOptions[4],
    );

    setDivisionId(null);

    setDivisionName(null);

    setFromDate("");

    setToDate("");

    setAgeing(
      ageingOptions[0],
    );

    setAgeingMode(
      ageingModeOptions[0],
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
      reportType,
      customerMode,
      customerId,
      customerName,
      rangeCustomerId,
      rangeCustomerName,
      divisionMode,
      divisionId,
      divisionName,
      fromDate,
      toDate,
      ageing,
      ageingMode,
      postStatus,
      printZeroBalance,
      status,
    });
  };

  // ==========================================================
  // SELECT PROPS
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
  // RENDER
  // ==========================================================

  return (
    <div
      className="
        flex
        min-h-full
        w-full
        items-start
        justify-center
        bg-white
        px-4
        py-4
      "
    >
      {/* ====================================================
          MAIN PAGE
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
              h-[30px]
              items-center
              justify-start
              bg-[#9fdfbc]
              pl-[12px]
              text-[18px]
              font-semibold
              text-slate-700
            "
          >
            Statement Of Account
          </header>
        {/* ==================================================
            MAIN FORM
        ================================================== */}

        <div
          className="
            relative
            px-[20px]
            pb-[14px]
            pt-[12px]
          "
        >
          {/* =================================================
              TOP ROW
          ================================================= */}

          <div
            className="
              grid
              grid-cols-[200px_1fr_220px]
              items-start
              gap-[18px]
               
            "
          >
            {/* ===============================================
                BRANCH RADIO
            =============================================== */}

            <RadioPanel
              className="
              
                h-[82px]
                px-[16px]
                py-[12px]
              "
            >
              <div
                className="
               
                  flex
                  flex-col
                  gap-[10px]
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

            {/* ===============================================
                BRANCH SELECT
            =============================================== */}

            <div
              className="
                w-[250px]
                pt-[8px]
              "
            >
              <Select
                inputId="lkpBranch"
                instanceId="lkpBranch"
                options={branchOptions}
                value={branch}
                onChange={setBranch}
                {...selectProps}
              />
            </div>

            {/* ===============================================
                CUSTOMER / SUPPLIER
            =============================================== */}

            <RadioPanel
              className="
                h-[82px]
                px-[16px]
                py-[12px]
              "
            >
              <div
                className="
                  flex
                  flex-col
                  gap-[10px]
                "
              >
                <CustomRadio
                  name="reportType"
                  value="Customer"
                  label="Customer"
                  checked={
                    reportType ===
                    "Customer"
                  }
                  onChange={() =>
                    setReportType(
                      "Customer",
                    )
                  }
                />

                <CustomRadio
                  name="reportType"
                  value="Supplier"
                  label="Supplier"
                  checked={
                    reportType ===
                    "Supplier"
                  }
                  onChange={() =>
                    setReportType(
                      "Supplier",
                    )
                  }
                />
              </div>
            </RadioPanel>
          </div>

          {/* =================================================
              CUSTOMER SECTION
          ================================================= */}

          <div
  className="
    mt-[10px]
    grid
    grid-cols-[200px_120px_minmax(0,1fr)]
    gap-[18px]
  "
>
  {/* ========================================================
      CUSTOMER RADIO
  ======================================================== */}

  <RadioPanel
    className="
      h-[120px]
      px-[16px]
      py-[12px]
    "
  >
    <div
      className="
        flex
        flex-col
        gap-[10px]
      "
    >
      <CustomRadio
        name="customerMode"
        value="One Customer"
        label="One Customer"
        checked={
          customerMode ===
          "One Customer"
        }
        onChange={() =>
          setCustomerMode(
            "One Customer",
          )
        }
      />

      <CustomRadio
        name="customerMode"
        value="Range Customer"
        label="Range Customer"
        checked={
          customerMode ===
          "Range Customer"
        }
        onChange={() =>
          setCustomerMode(
            "Range Customer",
          )
        }
      />

      <CustomRadio
        name="customerMode"
        value="All Customers"
        label="All Customers"
        checked={
          customerMode ===
          "All Customers"
        }
        onChange={() =>
          setCustomerMode(
            "All Customers",
          )
        }
      />
    </div>
  </RadioPanel>

  {/* ========================================================
      CUSTOMER ID
  ======================================================== */}

  <div
    className="
      flex
      w-[120px]
      flex-col
      gap-[10px]
      pt-[12px]
    "
  >
    <div className="w-[120px]">
      <Select
        inputId="lkpOneCustomerID"
        instanceId="lkpOneCustomerID"
        options={customerIdOptions}
        value={customerId}
        onChange={setCustomerId}
        {...selectProps}
      />
    </div>

    <div className="w-[120px]">
      <Select
        inputId="lkpRangeCustomerID"
        instanceId="lkpRangeCustomerID"
        options={customerIdOptions}
        value={rangeCustomerId}
        onChange={setRangeCustomerId}
        {...selectProps}
      />
    </div>
  </div>

  {/* ========================================================
      CUSTOMER NAME - REMAINING SPACE
  ======================================================== */}

  <div
    className="
      min-w-0
      w-full
      flex
      flex-col
      gap-[10px]
      pt-[12px]
    "
  >
    <div className="w-full min-w-0">
      <Select
        inputId="lkpOneCustomerName"
        instanceId="lkpOneCustomerName"
        options={customerNameOptions}
        value={customerName}
        onChange={setCustomerName}
        {...selectProps}
      />
    </div>

    <div className="w-full min-w-0">
      <Select
        inputId="lkpRangeCustomerName"
        instanceId="lkpRangeCustomerName"
        options={customerNameOptions}
        value={rangeCustomerName}
        onChange={setRangeCustomerName}
        {...selectProps}
      />
    </div>
  </div>
</div>
          {/* =================================================
              DIVISION
          ================================================= */}

        <div
  className="
    mt-[10px]
    grid
    grid-cols-[200px_120px_minmax(0,1fr)]
    gap-[18px]
  "
>
  {/* ========================================================
      DIVISION RADIO
  ======================================================== */}

  <RadioPanel
    className="
      h-[82px]
      px-[16px]
      py-[12px]
    "
  >
    <div
      className="
        flex
        flex-col
        gap-[10px]
      "
    >
      <CustomRadio
        name="divisionMode"
        value="One Division"
        label="One Division"
        checked={
          divisionMode ===
          "One Division"
        }
        onChange={() =>
          setDivisionMode(
            "One Division",
          )
        }
      />

      <CustomRadio
        name="divisionMode"
        value="All Division"
        label="All Division"
        checked={
          divisionMode ===
          "All Division"
        }
        onChange={() =>
          setDivisionMode(
            "All Division",
          )
        }
      />
    </div>
  </RadioPanel>

  {/* ========================================================
      DIVISION ID - 120px
  ======================================================== */}

  <div
    className="
      w-[120px]
      pt-[26px]
    "
  >
    <Select
      inputId="lkpOneDivisionID"
      instanceId="lkpOneDivisionID"
      options={divisionIdOptions}
      value={divisionId}
      onChange={setDivisionId}
      {...selectProps}
    />
  </div>

  {/* ========================================================
      DIVISION NAME - REMAINING SPACE
  ======================================================== */}

  <div
    className="
      min-w-0
      w-full
      pt-[26px]
    "
  >
    <Select
      inputId="lkpOneDivisionName"
      instanceId="lkpOneDivisionName"
      options={divisionNameOptions}
      value={divisionName}
      onChange={setDivisionName}
      {...selectProps}
    />
  </div>
</div>

          {/* =================================================
              LOWER SECTION
          ================================================= */}

          <div
            className="
              mt-[10px]
              grid
              grid-cols-[240px_1fr_220px]
              gap-[18px]
            "
          >
            {/* ===============================================
                FILTERS
            =============================================== */}

            <div
              className="
                col-span-2
                grid
                grid-cols-[200px_160px_1fr]
                items-center
                gap-x-[18px]
                gap-y-[8px]
              "
            >
              {/* PERIOD */}

              <FieldLabel>
                Period :
              </FieldLabel>

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

              {/* AGEING */}

              <FieldLabel>
                Ageing :
              </FieldLabel>

              <div className="w-[180px]">
                <Select
                  inputId="lkpAgeing"
                  instanceId="lkpAgeing"
                  options={
                    ageingOptions
                  }
                  value={ageing}
                  onChange={
                    setAgeing
                  }
                  {...selectProps}
                />
              </div>

              <div />

              {/* AGEING MODE */}

              <FieldLabel>
                Ageing Mode :
              </FieldLabel>

              <div className="w-[180px]">
                <Select
                  inputId="lkpAgeingMode"
                  instanceId="lkpAgeingMode"
                  options={
                    ageingModeOptions
                  }
                  value={
                    ageingMode
                  }
                  onChange={
                    setAgeingMode
                  }
                  {...selectProps}
                />
              </div>

              <div />

              {/* POST STATUS */}

              <FieldLabel>
                Post Status :
              </FieldLabel>

              <div className="w-[180px]">
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

              {/* PRINT ZERO BALANCE */}

              <FieldLabel>
                Print 0 Balance :
              </FieldLabel>

              <div className="w-[180px]">
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
                STATUS
            =============================================== */}

            <RadioPanel
              title="Status"
              className="
                h-[90px]
                px-[16px]
                py-[12px]
              "
            >
              <div
                className="
                  flex
                  flex-col
                  gap-[10px]
                "
              >
                <CustomRadio
                  name="status"
                  value="Outstanding"
                  label="Outstanding"
                  checked={
                    status ===
                    "Outstanding"
                  }
                  onChange={() =>
                    setStatus(
                      "Outstanding",
                    )
                  }
                />

                <CustomRadio
                  name="status"
                  value="All"
                  label="All"
                  checked={
                    status === "All"
                  }
                  onChange={() =>
                    setStatus("All")
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
              mt-[16px]
              flex
              justify-center
              gap-[12px]
            "
          >
            {/* PRINT */}

            <button
              type="button"
              onClick={handlePrint}
              className="
                btn-style
              "
            >
              <u>P</u>rint
            </button>

            {/* PDF */}

            <button
              type="button"
              onClick={handlePrint}
              className="
              btn-style
              "
            >
              PDF Export
            </button>

            {/* CLEAR */}

            <button
              type="button"
              onClick={handleClear}
              className="
               btn-style
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

export default RptSOAPage;