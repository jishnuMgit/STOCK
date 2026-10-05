import React from "react";
import Select, { type StylesConfig } from "react-select";

// ============================================================
// TYPES
// ============================================================

type Option = {
  value: string;
  label: string;
};

// ============================================================
// OPTIONS
// ============================================================

const discountTypeOptions: Option[] = [
  {
    value: "A",
    label: "A",
  },
];

// ============================================================
// SELECT STYLE
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
    fontSize: 15,

    "&:hover": {
      borderColor: "#94a3b8",
    },
  }),

  valueContainer: (base) => ({
    ...base,
    height: 30,
    minHeight: 30,
    padding: "0 7px",
    overflow: "hidden",
  }),

  singleValue: (base) => ({
    ...base,
    color: "#202020",
    fontSize: 15,
    margin: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  }),

  placeholder: (base) => ({
    ...base,
    color: "#64748b",
    fontSize: 15,
    margin: 0,
  }),

  input: (base) => ({
    ...base,
    margin: 0,
    padding: 0,
    fontSize: 15,
  }),

  indicatorsContainer: (base) => ({
    ...base,
    height: 30,
  }),

  dropdownIndicator: (base) => ({
    ...base,
    padding: "0 4px",
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
    fontSize: 15,
    marginTop: 1,
  }),

  menuList: (base) => ({
    ...base,
    padding: 0,
    maxHeight: 180,
  }),

  option: (base, state) => ({
    ...base,
    padding: "6px 9px",
    fontSize: 15,
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
  "h-[30px] border border-[#cbd5e1] bg-white px-2 text-[15px] text-[#202020] outline-none focus:border-blue-400 focus:bg-blue-50";

// ============================================================
// BUTTON STYLE
// ============================================================


// ============================================================
// SALES INVOICE FOOTER
// ============================================================

const SalesInvoiceFooter: React.FC = () => {
  return (
    <footer
      id="sales-invoice-footer"
      className="relative h-[184px] w-full shrink-0 overflow-hidden bg-white"
    >
      {/* ======================================================
          DISCOUNT SECTION
      ====================================================== */}

      <div className="absolute left-[7px] top-[8px] flex h-[30px] items-center">
        <label
          htmlFor="lkpDiscountType"
          className="mr-[7px] whitespace-nowrap text-[15px] text-[#202020]"
        >
          Discount Type :
        </label>

        {/* React Select */}

        <div className="w-[85px]">
          <Select<Option, false>
            inputId="lkpDiscountType"
            instanceId="lkpDiscountType"
            options={discountTypeOptions}
            defaultValue={discountTypeOptions[0]}
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

        <input
          id="txtDiscount"
          type="text"
          defaultValue="0.00"
          className={`${inputClass} ml-[9px] w-[65px] text-right`}
        />

        <input
          id="txtDiscountAmount"
          type="text"
          defaultValue="0.00"
          className={`${inputClass} ml-[9px] w-[65px] text-right`}
        />
      </div>

      {/* ======================================================
          TOTAL
      ====================================================== */}

      <div className="absolute left-[440px] top-[8px] flex h-[30px] items-center">
        <label
          className="mr-[7px] whitespace-nowrap text-[15px] text-[#202020]"
        >
          Total
        </label>

        <input
          id="txtTotalLabel"
          type="text"
          value="Total"
          readOnly
          className="
            h-[30px]
            w-[56px]
            border
            border-[#cbd5e1]
            bg-white
            px-1
            text-center
            text-[11px]
            text-[#202020]
            outline-none
          "
        />

        <input
          id="txtTotal"
          type="text"
          defaultValue="0.000"
          className={`${inputClass} ml-[5px] w-[65px] text-right`}
        />
      </div>

      {/* ======================================================
          EXTRA TOTAL VALUES
      ====================================================== */}

      <div className="absolute right-[10px] top-[8px] flex h-[30px] items-center gap-[5px]">
        <input
          id="txtTotalValue1"
          type="text"
          defaultValue="0.000"
          className={`${inputClass} w-[80px] text-right`}
        />

        <input
          id="txtTotalValue2"
          type="text"
          defaultValue="0.000"
          className={`${inputClass} w-[80px] text-right`}
        />

        <input
          id="txtTotalValue3"
          type="text"
          defaultValue="0.000"
          className={`${inputClass} w-[100px] text-right`}
        />
      </div>

      {/* ======================================================
          RIGHT SIDE AMOUNTS
      ====================================================== */}

      <div className="absolute right-[5px] top-[43px] w-[245px]">
        {/* TOTAL AMOUNT */}

        <div className="mb-[6px] flex h-[30px] items-center">
          <label
            htmlFor="txtTotalAmt"
            className="w-[110px] whitespace-nowrap text-right text-[15px] text-[#202020]"
          >
            Total Amt. :
          </label>

          <input
            id="txtTotalAmt"
            type="text"
            defaultValue="0.00"
            className={`${inputClass} ml-[7px] w-[125px] text-right`}
          />
        </div>

        {/* VAT AMOUNT */}

        <div className="mb-[6px] flex h-[30px] items-center">
          <label
            htmlFor="txtVATAmt"
            className="w-[110px] whitespace-nowrap text-right text-[15px] text-[#202020]"
          >
            VAT Amt. :
          </label>

          <input
            id="txtVATAmt"
            type="text"
            defaultValue="0.00"
            className={`${inputClass} ml-[7px] w-[125px] text-right`}
          />
        </div>

        {/* NET AMOUNT */}

        <div className="mb-[6px] flex h-[30px] items-center">
          <label
            htmlFor="txtNetAmt"
            className="w-[110px] whitespace-nowrap text-right text-[15px] text-[#202020]"
          >
            Net Amt. :
          </label>

          <input
            id="txtNetAmt"
            type="text"
            defaultValue="0.00"
            className={`${inputClass} ml-[7px] w-[125px] text-right`}
          />
        </div>

        {/* PAID AMOUNT */}

        <div className="flex h-[30px] items-center">
          <label
            htmlFor="txtPaidAmt"
            className="w-[110px] whitespace-nowrap text-right text-[15px] text-[#202020]"
          >
            Paid Amt. :
          </label>

          <input
            id="txtPaidAmt"
            type="text"
            defaultValue="0.00"
            className={`${inputClass} ml-[7px] w-[125px] text-right`}
          />
        </div>
      </div>

      {/* ======================================================
          NOTE
      ====================================================== */}

      <div className="absolute left-[7px] top-[43px] flex h-[30px] items-center">
        <label
          htmlFor="txtNone"
          className="mr-[15px] whitespace-nowrap text-[15px] text-[#202020]"
        >
          Note :
        </label>

        <input
          id="txtNone"
          type="text"
          autoComplete="off"
          className={`${inputClass} h-[30px] w-[600px]`}
        />
      </div>

      {/* ======================================================
          ACTION BUTTONS
      ====================================================== */}

      <div className="absolute bottom-[23px] left-[234px] flex gap-[11px]">
        <button
          id="btnSave"
          type="button"
          className='btn-style'
        >
          <u>S</u>ave
        </button>

        <button
          id="btnDelete"
          type="button"
          className='btn-style'
        >
          <u>D</u>elete
        </button>

        <button
          id="btnPrint"
          type="button"
          className='btn-style'
        >
          <u>P</u>rint
        </button>

        <button
          id="btnPost"
          type="button"
          className='btn-style'
        >
          <u>Post</u>
        </button>

        <button
          id="btnClear"
          type="button"
          className='btn-style'
        >
          <u>C</u>lear
        </button>
      </div>
    </footer>
  );
};

export default SalesInvoiceFooter;