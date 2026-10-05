import React, { useState } from "react";
import Select, { type StylesConfig } from "react-select";

type Option = {
  value: string;
  label: string;
};

// ============================================================
// OPTIONS
// ============================================================

const branchOptions: Option[] = [
  {
    value: "OFFICE",
    label: "OFFICE",
  },
];

const customerIdOptions: Option[] = [
  {
    value: "11010011",
    label: "11010011",
  },
];

const customerNameOptions: Option[] = [
  {
    value: "CASH CUSTOMER",
    label: "CASH CUSTOMER",
  },
];

// ============================================================
// SELECT STYLES
// ============================================================

const selectStyles: StylesConfig<Option, false> = {
  control: (base, state) => ({
    ...base,
    minHeight: 30,
    height: 30,
    width: "100%",
    border: "1px solid #cbd5e1",
    borderRadius: 2,
    boxShadow: "none",
    backgroundColor: state.isFocused ? "#eff6ff" : "#ffffff",
    cursor: "pointer",
    fontSize: 11,

    "&:hover": {
      borderColor: "#94a3b8",
    },
  }),

  valueContainer: (base) => ({
    ...base,
    height: 21,
    minHeight: 21,
    padding: "0 5px",
    overflow: "hidden",
  }),

  singleValue: (base) => ({
    ...base,
    color: "#202020",
    fontSize: 11,
    margin: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  }),

  placeholder: (base) => ({
    ...base,
    color: "#64748b",
    fontSize: 11,
    margin: 0,
  }),

  input: (base) => ({
    ...base,
    margin: 0,
    padding: 0,
    fontSize: 11,
  }),

  indicatorsContainer: (base) => ({
    ...base,
    height: 20,
  }),

  dropdownIndicator: (base) => ({
    ...base,
    padding: "0 2px",
    color: "#64748b",
  }),

  indicatorSeparator: () => ({
    display: "none",
  }),

  menuPortal: (base) => ({
    ...base,
    zIndex: 9999,
  }),

  menu: (base) => ({
    ...base,
    zIndex: 9999,
    fontSize: 11,
    marginTop: 1,
  }),

  menuList: (base) => ({
    ...base,
    padding: 0,
    maxHeight: 180,
  }),

  option: (base, state) => ({
    ...base,
    padding: "5px 7px",
    fontSize: 11,
    color: "#202020",
    cursor: "pointer",

    backgroundColor: state.isSelected
      ? "#dbeafe"
      : state.isFocused
        ? "#eff6ff"
        : "#ffffff",
  }),
};

// ============================================================
// INPUT STYLE
// ============================================================

const inputClass =
  "h-[30px] border border-[#cbd5e1] bg-white px-1 text-[11px] text-[#202020] outline-none focus:border-blue-400 focus:bg-blue-50";

// ============================================================
// COMPONENT
// ============================================================

const SalesInvoiceHeader: React.FC = () => {
  const [branch, setBranch] = useState<Option | null>(
    branchOptions[0],
  );

  const [customerId, setCustomerId] =
    useState<Option | null>(customerIdOptions[0]);

  const [customerName, setCustomerName] =
    useState<Option | null>(customerNameOptions[0]);

  return (
    <div className="w-full shrink-0">
      {/* ======================================================
          TITLE
      ====================================================== */}

     

        <div
          className="
            flex
            h-[36px]
            items-center
            border-b
            border-slate-300
            bg-[#a3dfc0]
          "
        >

          <span
            className="
              px-6
              text-[17px]
              font-semibold
              text-slate-700
            "
          >
 Sales Invoice
          </span>

        </div>

      {/* ======================================================
          HEADER AREA
      ====================================================== */}

      <div className="h-[100px] w-full px-[11px] pt-[7px]">
        <div className="grid h-full grid-cols-[56%_44%]">
          {/* ==================================================
              LEFT SIDE
          ================================================== */}

  <div className="pr-[15px]">
  {/* -----------------------------------------------
      BRANCH
  ------------------------------------------------ */}

  <div className="mb-[10px] flex h-[30px] items-center gap-5">
    <label className="w-[80px] shrink-0 text-right text-[15px] text-[#202020] whitespace-nowrap">
      Branch :
    </label>

    <div className="w-[220px]">
      <Select<Option, false>
        inputId="lkpBranch"
        instanceId="lkpBranch"
        options={branchOptions}
        value={branch}
        onChange={setBranch}
        styles={selectStyles}
        isClearable={false}
        isSearchable={false}
        menuPosition="fixed"
        menuPortalTarget={
          typeof document !== "undefined"
            ? document.body
            : undefined
        }
      />
    </div>
  </div>

  {/* -----------------------------------------------
      CUSTOMER
  ------------------------------------------------ */}

  <div className="mb-[15px] flex h-[30px] items-center gap-5">
    <label className="w-[80px] shrink-0 text-right text-[15px] text-[#202020] whitespace-nowrap">
      Customer :
    </label>

    {/* Customer ID */}
    <div className="w-[100px]">
      <Select<Option, false>
        inputId="lkpCustomerID"
        instanceId="lkpCustomerID"
        options={customerIdOptions}
        value={customerId}
        onChange={setCustomerId}
        styles={selectStyles}
        isClearable={false}
        isSearchable={false}
        menuPosition="fixed"
        menuPortalTarget={
          typeof document !== "undefined"
            ? document.body
            : undefined
        }
      />
    </div>

    {/* Customer Name */}
    <div className="ml-[3px] w-[365px]">
      <Select<Option, false>
        inputId="lkpCustomerName"
        instanceId="lkpCustomerName"
        options={customerNameOptions}
        value={customerName}
        onChange={setCustomerName}
        styles={selectStyles}
        isClearable={false}
        isSearchable={false}
        menuPosition="fixed"
        menuPortalTarget={
          typeof document !== "undefined"
            ? document.body
            : undefined
        }
      />
    </div>
  </div>

  {/* -----------------------------------------------
      SQ NO
  ------------------------------------------------ */}

  <div className="flex h-[22px]  items-center gap-5">
    <label className="w-[80px] shrink-0 text-right text-[15px] text-[#202020] whitespace-nowrap">
      SQ. No :
    </label>

    <input
      id="txtSQNo"
      type="text"
      autoComplete="off"
      className={`${inputClass} w-[220px] `}
    />
  </div>
</div>
          {/* ==================================================
              RIGHT SIDE
          ================================================== */}

         <div className="pl-[4px]">
  {/* -----------------------------------------------
      INVOICE NO + DATE
  ------------------------------------------------ */}

  <div className="mb-[10px] flex h-[30px] items-center">
    <label className="w-[90px] shrink-0 text-right text-[15px] text-[#202020] whitespace-nowrap">
      Invoice No. :
    </label>

    <input
      id="txtInvoiceNo"
      type="text"
      defaultValue="OC3"
      autoComplete="off"
      className={`${inputClass} ml-[7px] w-[150px]`}
    />

    <label className="ml-[50px] mr-[3px] shrink-0 text-[15px] text-[#202020] whitespace-nowrap">
      Date :
    </label>

    <input
      id="dtpDate"
      type="date"
      defaultValue="2026-04-07"
      className={`${inputClass} w-[104px]`}
    />
  </div>

  {/* -----------------------------------------------
      REFERENCE
  ------------------------------------------------ */}

  <div className="mb-[10px] flex h-[30px] items-center">
    <label className="w-[90px] shrink-0 text-right text-[15px] text-[#202020] whitespace-nowrap">
      Reference :
    </label>

    <input
      id="txtReference"
      type="text"
      autoComplete="off"
      className={`${inputClass} ml-[7px] w-[348px]`}
    />
  </div>

  {/* -----------------------------------------------
      STOCK + BRANCH STOCK BUTTON
  ------------------------------------------------ */}

  <div className="flex h-[30px] items-center">
    <label className="w-[90px] shrink-0 text-right text-[15px] text-[#202020] whitespace-nowrap">
      Stock :
    </label>

    <input
      id="txtStock"
      type="text"
      value="0"
      readOnly
      className={`${inputClass} ml-[7px] w-[76px] text-center`}
    />

    <button
      id="BranchStockbtn"
      type="button"
      className="ml-[13px] h-[30px] w-[155px] border border-[#cbd5e1] bg-[#eeeeee] px-2 text-[12px] text-[#202020] shadow-sm hover:bg-[#e5e5e5]"
    >
      Branches Stock
    </button>
  </div>
</div>
        </div>
      </div>
    </div>
  );
};

export default SalesInvoiceHeader;