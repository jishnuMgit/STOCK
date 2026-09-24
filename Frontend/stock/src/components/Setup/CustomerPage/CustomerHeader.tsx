import React from "react";
import Select, {
  components,
  type SingleValue,
  type StylesConfig,
} from "react-select";

// ============================================================
// TYPES
// ============================================================

interface SelectOption {
  value: string;
  label: string;
}

interface CustomerHeaderProps {
  txtCustomerID: string;
  setTxtCustomerID: React.Dispatch<
    React.SetStateAction<string>
  >;

  optNewCustomerID: string;
  setOptNewCustomerID: React.Dispatch<
    React.SetStateAction<string>
  >;

  lkpParentAccountID: string;
  setLkpParentAccountID: React.Dispatch<
    React.SetStateAction<string>
  >;

  lkpParentAccountName: string;
  setLkpParentAccountName: React.Dispatch<
    React.SetStateAction<string>
  >;

  lkpHaveDivision: string;
  setLkpHaveDivision: React.Dispatch<
    React.SetStateAction<string>
  >;

  lkpBusinessType: string;
  setLkpBusinessType: React.Dispatch<
    React.SetStateAction<string>
  >;
}

// ============================================================
// OPTIONS
// ============================================================

const parentAccountOptions: SelectOption[] = [
  {
    value: "1103001",
    label: "1103001",
  },
  {
    value: "1103002",
    label: "1103002",
  },
  {
    value: "1103003",
    label: "1103003",
  },
];

const parentAccountNameOptions: SelectOption[] = [
  {
    value: "CLIENTS RECEIVABLES",
    label: "CLIENTS RECEIVABLES",
  },
  {
    value: "CUSTOMER RECEIVABLES",
    label: "CUSTOMER RECEIVABLES",
  },
];

const haveDivisionOptions: SelectOption[] = [
  {
    value: "Yes",
    label: "Yes",
  },
  {
    value: "No",
    label: "No",
  },
];

const businessTypeOptions: SelectOption[] = [
  {
    value: "B2B",
    label: "B2B",
  },
  {
    value: "B2C",
    label: "B2C",
  },
];

// ============================================================
// SELECT STYLES
// ============================================================

const selectStyles: StylesConfig<SelectOption, false> = {
  control: (base, state) => ({
    ...base,

    minHeight: "28px",
    height: "28px",

    borderRadius: "3px",

    borderColor: state.isFocused
      ? "#64748b"
      : "#aeb7c2",

    boxShadow: "none",

    fontSize: "12px",

    backgroundColor: "#ffffff",

    cursor: "pointer",

    "&:hover": {
      borderColor: "#94a3b8",
    },
  }),

  valueContainer: (base) => ({
    ...base,

    height: "28px",

    padding: "0 8px",
  }),

  input: (base) => ({
    ...base,

    margin: 0,
    padding: 0,

    fontSize: "12px",
  }),

  singleValue: (base) => ({
    ...base,

    color: "#334155",

    fontSize: "12px",
  }),

  placeholder: (base) => ({
    ...base,

    color: "#64748b",

    fontSize: "12px",
  }),

  indicatorsContainer: (base) => ({
    ...base,

    height: "28px",
  }),

  dropdownIndicator: (base) => ({
    ...base,

    padding: "4px 6px",

    color: "#475569",
  }),

  indicatorSeparator: () => ({
    display: "none",
  }),

  menu: (base) => ({
    ...base,

    zIndex: 9999,

    fontSize: "12px",
  }),

  menuList: (base) => ({
    ...base,

    padding: "2px 0",
  }),

  option: (base, state) => ({
    ...base,

    padding: "6px 9px",

    fontSize: "12px",

    backgroundColor: state.isSelected
      ? "#dbeafe"
      : state.isFocused
      ? "#eff6ff"
      : "#ffffff",

    color: "#334155",

    cursor: "pointer",
  }),
};

// ============================================================
// CUSTOM DROPDOWN INDICATOR
// ============================================================

const CustomDropdownIndicator = (props: any) => {
  return (
    <components.DropdownIndicator {...props}>
      <span className="text-[9px] text-slate-500">
        ▼
      </span>
    </components.DropdownIndicator>
  );
};

// ============================================================
// COMPONENT
// ============================================================

const CustomerHeader: React.FC<CustomerHeaderProps> = ({
  txtCustomerID,
  setTxtCustomerID,

  optNewCustomerID,
  setOptNewCustomerID,

  lkpParentAccountID,
  setLkpParentAccountID,

  lkpParentAccountName,
  setLkpParentAccountName,

  lkpHaveDivision,
  setLkpHaveDivision,

  lkpBusinessType,
  setLkpBusinessType,
}) => {
  // ==========================================================
  // HELPER
  // ==========================================================

  const getOption = (
    options: SelectOption[],
    value: string
  ): SelectOption | null => {
    return (
      options.find(
        (item) => item.value === value
      ) ?? null
    );
  };

  // ==========================================================
  // INPUT STYLE
  // ==========================================================

  const inputClass = `
    h-[28px]
    w-full
    rounded-[3px]
    border
    border-slate-400
    bg-white
    px-2
    text-[12px]
    text-slate-700
    outline-none
    focus:border-blue-500
    focus:ring-1
    focus:ring-blue-200
  `;

  // ==========================================================
  // JSX
  // ==========================================================

  return (
    <>
      {/* ======================================================
          TITLE
      ====================================================== */}

      <div
        className="
          flex
          h-[32px]
          items-center
          justify-start

          
          border-b
          border-slate-300
          bg-[#a3dfc0]
        "
      >
        <h1
          className="
            text-[17px]
            ml-1.25
            font-semibold
            text-slate-700
          "
        >
          Customer
        </h1>
      </div>

      {/* ======================================================
          HEADER CONTROLS
      ====================================================== */}

   

<div
  className="
    border-b
    border-slate-200
    px-3
    py-3
    sm:px-5
    lg:px-6
  "
>
  <div
    className="
      grid
      grid-cols-1
      gap-3
      sm:grid-cols-2
      lg:grid-cols-[130px_100px_minmax(0,1fr)_80px_150px]
      lg:items-end
      lg:gap-4
    "
  >

    {/* ==================================================
        NEW CUSTOMER ID
    ================================================== */}

    <div className="w-full">
      <label
        htmlFor="optNewCustomerID_Auto"
        className="
          mb-1
          block
          text-[11px]
          text-slate-600
        "
      >
        New Customer ID
      </label>

      <div
        className="
          flex
          h-[28px]
          items-center
          gap-3
          rounded-[3px]
          border
          border-slate-200
          px-2
        "
      >
        {/* AUTO */}

        <label
          htmlFor="optNewCustomerID_Auto"
          className="
            flex
            cursor-pointer
            items-center
            gap-1
            whitespace-nowrap
          "
        >
          <input
            id="optNewCustomerID_Auto"
            name="optNewCustomerID"
            type="radio"
            value="Auto"
            checked={optNewCustomerID === "Auto"}
            onChange={(e) =>
              setOptNewCustomerID(e.target.value)
            }
            className="
              h-[13px]
              w-[13px]
              accent-blue-600
            "
          />

          <span className="text-[12px]">
            Auto
          </span>
        </label>

        {/* MANUAL */}

        <label
          htmlFor="optNewCustomerID_Manual"
          className="
            flex
            cursor-pointer
            items-center
            gap-1
            whitespace-nowrap
          "
        >
          <input
            id="optNewCustomerID_Manual"
            name="optNewCustomerID"
            type="radio"
            value="Manual"
            checked={optNewCustomerID === "Manual"}
            onChange={(e) =>
              setOptNewCustomerID(e.target.value)
            }
            className="
              h-[13px]
              w-[13px]
              accent-blue-600
            "
          />

          <span className="text-[12px]">
            Manual
          </span>
        </label>
      </div>
    </div>

    {/* ==================================================
        CUSTOMER ID
    ================================================== */}

    <div className="w-full">
      <label
        htmlFor="txtCustomerID"
        className="
          mb-1
          block
          text-[11px]
          text-slate-600
        "
      >
        Customer ID
      </label>

      <input
        id="txtCustomerID"
        name="txtCustomerID"
        type="text"
        value={txtCustomerID}
        onChange={(e) =>
          setTxtCustomerID(e.target.value)
        }
        className={inputClass}
      />
    </div>

    {/* ==================================================
        PARENT ACCOUNT
    ================================================== */}
<div
  className="
    grid
    grid-cols-[20%_minmax(0,1fr)]
    items-end
    gap-[10px]
    sm:col-span-2
    lg:col-span-1
  "
>

      {/* PARENT ACCOUNT ID */}

     <div className="w-full">
        <label
          htmlFor="lkpParentAccountID"
          className="
            mb-1
            block
            whitespace-nowrap
            text-[11px]
            text-slate-600
          "
        >
          Parent Account ID
        </label>

        <Select
          inputId="lkpParentAccountID"
          instanceId="lkpParentAccountID"
          name="lkpParentAccountID"
          options={parentAccountOptions}
          value={getOption(
            parentAccountOptions,
            lkpParentAccountID
          )}
          onChange={(
            option: SingleValue<SelectOption>
          ) =>
            setLkpParentAccountID(
              option?.value ?? ""
            )
          }
          styles={selectStyles}
          components={{
            DropdownIndicator:
              CustomDropdownIndicator,
          }}
          isSearchable={false}
          menuPortalTarget={document.body}
          menuPosition="fixed"
        />
      </div>

      {/* PARENT ACCOUNT NAME */}

      <div className="w-full">
        <label
          htmlFor="lkpParentAccountName"
          className="
            mb-1
            block
            whitespace-nowrap
            text-[11px]
            text-slate-600
          "
        >
          Parent Account Name
        </label>

        <Select
          inputId="lkpParentAccountName"
          instanceId="lkpParentAccountName"
          name="lkpParentAccountName"
          options={parentAccountNameOptions}
          value={getOption(
            parentAccountNameOptions,
            lkpParentAccountName
          )}
          onChange={(
            option: SingleValue<SelectOption>
          ) =>
            setLkpParentAccountName(
              option?.value ?? ""
            )
          }
          styles={selectStyles}
          components={{
            DropdownIndicator:
              CustomDropdownIndicator,
          }}
          isSearchable={false}
          menuPortalTarget={document.body}
          menuPosition="fixed"
        />
      </div>

    </div>

    {/* ==================================================
        HAVE DIVISION
    ================================================== */}

    <div className="w-[100%]">
      <label
        htmlFor="lkpHaveDivision"
        className="
          mb-1
          block
          whitespace-nowrap
          text-[11px]
          text-slate-600
        "
      >
        Have Division
      </label>

      <Select
        inputId="lkpHaveDivision"
        instanceId="lkpHaveDivision"
        name="lkpHaveDivision"
        options={haveDivisionOptions}
        value={getOption(
          haveDivisionOptions,
          lkpHaveDivision
        )}
        onChange={(
          option: SingleValue<SelectOption>
        ) =>
          setLkpHaveDivision(
            option?.value ?? ""
          )
        }
        styles={selectStyles}
        components={{
          DropdownIndicator:
            CustomDropdownIndicator,
        }}
        isSearchable={false}
        menuPortalTarget={document.body}
        menuPosition="fixed"
      />
    </div>

    {/* ==================================================
        BUSINESS TYPE
    ================================================== */}

    <div className="w-[50%]">
      <label
        htmlFor="lkpBusinessType"
        className="
          mb-1
          block
          whitespace-nowrap
          text-[11px]
          text-slate-600
        "
      >
        Business Type
      </label>

      <Select
        inputId="lkpBusinessType"
        instanceId="lkpBusinessType"
        name="lkpBusinessType"
        options={businessTypeOptions}
        value={getOption(
          businessTypeOptions,
          lkpBusinessType
        )}
        onChange={(
          option: SingleValue<SelectOption>
        ) =>
          setLkpBusinessType(
            option?.value ?? ""
          )
        }
        styles={selectStyles}
        components={{
          DropdownIndicator:
            CustomDropdownIndicator,
        }}
        isSearchable={false}
        menuPortalTarget={document.body}
        menuPosition="fixed"
      />
    </div>

  </div>
</div>
    </>
  );
};

export default CustomerHeader;