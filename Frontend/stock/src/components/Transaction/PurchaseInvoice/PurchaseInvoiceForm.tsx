
import { Plus } from "lucide-react";
import React from "react";
import Select, { type StylesConfig } from "react-select";

type Option = {
  value: string;
  label: string;
};

/* =========================================================
   OPTIONS
========================================================= */

const makeOptions = (values: string[]): Option[] =>
  values.map((value) => ({
    value,
    label: value,
  }));

const branchOptions = makeOptions(["OFFICE"]);
const invoiceTypeOptions = makeOptions(["C"]);
const supplierOptions = makeOptions(["1030101"]);
const supplierNameOptions = makeOptions(["AlSulaijer Hamad"]);
const miscSupplierOptions = makeOptions(["No", "Yes"]);
const currencyOptions = makeOptions(["SAR"]);

/* =========================================================
   INPUT AND LABEL STYLES
========================================================= */

const inputClass =
  "h-[30px] w-full min-w-0 rounded-[4px] border border-[#d5dce5] bg-white px-2 text-[12px] text-[#263449] outline-none focus:border-blue-400";

const labelClass =
  "shrink-0 whitespace-nowrap text-[14px] text-[#263449]";

/* =========================================================
   BASE SELECT STYLES
   Each dropdown below has its own StylesConfig.
========================================================= */

const baseSelectStyles: StylesConfig<Option, false> = {
  control: (base, state) => ({
    ...base,
    height: 30,
    minHeight: 30,
    width: "100%",
    borderRadius: 4,
    borderColor: state.isFocused ? "#80bdff" : "#d5dce5",
    boxShadow: "none",
    backgroundColor: "#fff",
    cursor: "pointer",
    fontSize: 12,
    "&:hover": {
      borderColor: "#aebdce",
    },
  }),

  valueContainer: (base) => ({
    ...base,
    height: 25,
    minWidth: 0,
    padding: "0 8px",
    overflow: "hidden",
  }),

  singleValue: (base) => ({
    ...base,
    color: "#263449",
    margin: 0,
  }),

  placeholder: (base) => ({
    ...base,
    color: "#64748b",
    margin: 0,
  }),

  input: (base) => ({
    ...base,
    margin: 0,
    padding: 0,
    color: "#263449",
  }),

  indicatorsContainer: (base) => ({
    ...base,
    height: 25,
  }),

  dropdownIndicator: (base) => ({
    ...base,
    padding: "0 6px",
    color: "#64748b",
    "&:hover": {
      color: "#334155",
    },
  }),

  indicatorSeparator: () => ({
    display: "none",
  }),

  clearIndicator: (base) => ({
    ...base,
    padding: 3,
  }),

  menu: (base) => ({
    ...base,
    zIndex: 100,
    fontSize: 12,
    borderRadius: 4,
    marginTop: 2,
  }),

  menuList: (base) => ({
    ...base,
    padding: 2,
    maxHeight: 200,
  }),

  option: (base, state) => ({
    ...base,
    padding: "6px 8px",
    cursor: "pointer",
    fontSize: 12,
    color: "#263449",
    backgroundColor: state.isSelected
      ? "#dbeafe"
      : state.isFocused
        ? "#eff6ff"
        : "#fff",
    "&:active": {
      backgroundColor: "#dbeafe",
    },
  }),
};

/* =========================================================
   INDIVIDUAL SELECT STYLES
   Change any one of these without affecting the others.
========================================================= */

// 1. Branch
const branchSelectStyles: StylesConfig<Option, false> = {
  ...baseSelectStyles,
  control: (base, state) => ({
    ...baseSelectStyles.control!(base, state),
    height: 30,
    minHeight: 30,
    borderRadius: 4,
  }),
};

// 2. Invoice Type
const invoiceTypeSelectStyles: StylesConfig<Option, false> = {
  ...baseSelectStyles,
  control: (base, state) => ({
    ...baseSelectStyles.control!(base, state),
    height: 30,
    minHeight: 30,
    fontSize: 14,
  }),
};

// 3. Supplier ID
const supplierIdSelectStyles: StylesConfig<Option, false> = {
  ...baseSelectStyles,
  control: (base, state) => ({
    ...baseSelectStyles.control!(base, state),
    height: 30,
    minHeight: 30,
    borderRadius: 4,
  }),
};

// 4. Supplier Name
const supplierNameSelectStyles: StylesConfig<Option, false> = {
  ...baseSelectStyles,
  control: (base, state) => ({
    ...baseSelectStyles.control!(base, state),
    height: 30,
    minHeight: 30,
    fontSize: 14,
  }),
};

// 5. Miscellaneous Supplier
const miscSupplierSelectStyles: StylesConfig<Option, false> = {
  ...baseSelectStyles,
  control: (base, state) => ({
    ...baseSelectStyles.control!(base, state),
    height: 30,
    minHeight: 30,
  }),
};

// 6. Miscellaneous Supplier ID
const miscSupplierIdSelectStyles: StylesConfig<Option, false> = {
  ...baseSelectStyles,
  control: (base, state) => ({
    ...baseSelectStyles.control!(base, state),
    height: 30,
    minHeight: 30,
  }),
};

// 7. Miscellaneous Supplier Name
const miscSupplierNameSelectStyles: StylesConfig<Option, false> = {
  ...baseSelectStyles,
  control: (base, state) => ({
    ...baseSelectStyles.control!(base, state),
    height: 30,
    minHeight: 30,
  }),
};

// 8. Currency
const currencySelectStyles: StylesConfig<Option, false> = {
  ...baseSelectStyles,
  control: (base, state) => ({
    ...baseSelectStyles.control!(base, state),
    height: 30,
    minHeight: 30,
  }),
};

/* =========================================================
   PURCHASE FORM
========================================================= */


const PurchaseForm: React.FC = () => {
  return (
    <section className="grid grid-cols-1 items-start gap-x-4 gap-y-3 px-[14px] pb-2 pt-[14px] xl:grid-cols-[1fr_1fr_2.15fr]">

      {/* ==================================================
          GROUP 1
          Branch, P.O. No., Misc. Sup., Currency
      ================================================== */}
      <div
        id="purchase-left-group"
        className="flex min-w-0 flex-col gap-[8px]"
      >
        {/* Branch */}
        <div className="flex min-w-0 items-center gap-2">
          <label
            htmlFor="lkpBranch"
            className={`${labelClass} w-[54px]`}
          >
            Branch
          </label>

          <div className="min-w-0 flex-1">
            <Select<Option, false>
              inputId="lkpBranch"
              options={branchOptions}
              defaultValue={branchOptions[0]}
              styles={branchSelectStyles}
              isClearable={false}
              isSearchable={false}
            />
          </div>
        </div>

        {/* P.O. Number */}
        <div className="flex min-w-0 items-center gap-2">
          <label
            htmlFor="txtPONo"
            className={`${labelClass} w-[54px]`}
          >
            P.O. No.
          </label>

          <input
            id="txtPONo"
            className={inputClass}
          />
        </div>

        {/* Miscellaneous Supplier */}
        <div className="flex min-w-0 items-center gap-2">
          <label
            htmlFor="lkpMiscSup"
            className={`${labelClass} w-[54px]`}
          >
            Misc. Sup.
          </label>

          <div className="min-w-0 w-[50%]">
            <Select<Option, false>
              inputId="lkpMiscSup"
              options={miscSupplierOptions}
              defaultValue={miscSupplierOptions[0]}
              styles={miscSupplierSelectStyles}
              isClearable={false}
              isSearchable={false}
            />
          </div>
        </div>

        {/* Currency */}
        <div className="flex min-w-0 items-center gap-2">
          <label
            htmlFor="lkpCurrency"
            className={`${labelClass} w-[54px]`}
          >
            Currency
          </label>

          <div className="min-w-0 w-[50%]">
            <Select<Option, false>
              inputId="lkpCurrency"
              options={currencyOptions}
              defaultValue={currencyOptions[0]}
              styles={currencySelectStyles}
              isClearable={false}
              isSearchable={false}
            />
          </div>
        </div>
      </div>

      {/* ==================================================
          GROUP 2
          Entry No., Supplier ID, Misc. Sup. ID, Currency Rate
      ================================================== */}
    <div
  id="purchase-middle-group"
  className="flex w-[90%] min-w-0 flex-col gap-[8px] ml-3"
>
  {/* Entry Number */}
  <div className="flex min-w-0 items-center gap-3">
    <label
      htmlFor="txtDocNo"
      className={`${labelClass} w-[74px]`}
    >
      Entry No.
    </label>

    <input
      id="txtDocNo"
      defaultValue="0283"
      className={inputClass}
    />
  </div>

  {/* Supplier ID */}
  <div className="flex min-w-0 items-center gap-3">
    <label
      htmlFor="lkpSupplierID"
      className={`${labelClass} w-[74px]`}
    >
      Supplier
    </label>

    <div className="min-w-0 flex-1">
      <Select<Option, false>
        inputId="lkpSupplierID"
        options={supplierOptions}
        defaultValue={supplierOptions[0]}
        styles={supplierIdSelectStyles}
        isClearable={false}
        isSearchable={false}
      />
    </div>
  </div>

  {/* Miscellaneous Supplier ID */}
  <div className="flex min-w-0 items-center gap-3">
    <label
      htmlFor="lkpMiscSupID"
      className={`${labelClass} w-[74px]`}
    >
      Misc. Sup.
    </label>

    <div className="min-w-0 flex-1">
      <Select<Option, false>
        inputId="lkpMiscSupID"
        options={[]}
        placeholder=""
        styles={miscSupplierIdSelectStyles}
        isClearable={false}
        isSearchable={false}
      />
    </div>
  </div>

  {/* Currency Rate */}
  <div className="flex min-w-0 items-center gap-3">
    <label
      htmlFor="txtCurrencyRate"
      className={`${labelClass} w-[74px]`}
    >
      Currency Rate
    </label>

    <input
      id="txtCurrencyRate"
      defaultValue="3.00000"
      className={`${inputClass} flex-1 text-right`}
    />
  </div>

  {/* Purchase Expense Button */}
  <div className="flex justify-end ">
    <button
      id="btnPurchaseExpense"
      type="button"
      className="h-[30px] w-[120px] whitespace-nowrap rounded-[4px] border border-[#cbd1d9] bg-gradient-to-b from-white to-[#e8e8e8] px-[10px] text-[11px] text-[#222] hover:bg-slate-100"
    >
      Purchase Expense
    </button>
  </div>
</div>

      {/* ==================================================
          GROUP 3
          Remaining fields and action buttons
      ================================================== */}
      <div
        id="purchase-right-group "
        className="flex min-w-0 flex-col gap-[8px] "
      >
        {/* Invoice Type and Date */}
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <label
              htmlFor="lkpType"
              className={`${labelClass} w-[76px]`}
            >
              Invoice Type
            </label>

            <div className="min-w-0 w-[35%]">
              <Select<Option, false>
                inputId="lkpType"
                options={invoiceTypeOptions}
                defaultValue={invoiceTypeOptions[0]}
                styles={invoiceTypeSelectStyles}
                isClearable={false}
                isSearchable={false}
              />
            </div>
          </div>

          <div
  className="ml-auto flex min-w-0 items-center justify-end gap-2"
>
  <label
    htmlFor="dtpDate"
    className={`${labelClass} w-[28px]`}
  >
    Date
  </label>

  <input
    id="dtpDate"
    defaultValue="29/08/2026"
    className={inputClass}
    style={{ width: "50%" }}
  />
</div>
        </div>

        {/* Supplier Name */}
        <div className="min-w-0 ">
          <Select<Option, false>
            inputId="lkpSupplierName"
            options={supplierNameOptions}
            defaultValue={supplierNameOptions[0]}
            styles={supplierNameSelectStyles}
            isClearable={false}
            isSearchable={false}
          />
        </div>

        {/* Miscellaneous Supplier Name */}
        <div className="flex min-w-0 items-center gap-2">
          <div className="min-w-0 flex-1">
            <Select<Option, false>
              inputId="lkpMiscSupName"
              options={supplierNameOptions}
              defaultValue={supplierNameOptions[0]}
              styles={miscSupplierNameSelectStyles}
              isClearable={false}
              isSearchable={false}
            />
          </div>

          <button
            id="btnAddMiscSupplier"
            type="button"
            aria-label="Add miscellaneous supplier"
            className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-[#28a745] text-[20px] font-bold leading-none text-white hover:bg-green-700"
          >
            <Plus />
          </button>
        </div>

        {/* Supplier Invoice Number and Date */}
        <div className="grid min-w-0 grid-cols-2 gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <label
              htmlFor="txtSupInvoiceNo"
              className="shrink-0 whitespace-nowrap text-[12px] text-[#263449]"
            >
              Sup. Invoice No.
            </label>

            <input
              id="txtSupInvoiceNo"
              defaultValue="001SUINV00646"
              className={inputClass}
            />
          </div>

          <div className="flex min-w-0 items-center gap-2">
            <label
              htmlFor="dtpSupInvoiceDate"
              className="shrink-0 whitespace-nowrap text-[12px] text-[#263449]"
            >
              Sup. Invoice Date
            </label>

            <input
              id="dtpSupInvoiceDate"
              defaultValue="09/08/2026"
              className={inputClass}
            />
          </div>
        </div>

        {/* Action Buttons and Supplier Amount */}
        <div className=" flex justify-between  gap-2">
          

          <button
            id="btnCalculateUnitCost"
            type="button"
            className="h-[30px] whitespace-nowrap rounded-[4px] w-[120px]  ml-25 border border-[#cbd1d9] bg-gradient-to-b from-white to-[#e8e8e8] px-[10px] text-[11px] text-[#222] hover:bg-slate-100"
          >
            Calculate Unit Cost
          </button>

          <div className="flex min-w-0 items-center justify-end gap-2">
            <label
              htmlFor="txtSupAmount"
              className="shrink-0 whitespace-nowrap text-[12px] text-[#263449]"
            >
              Sup. Amount
            </label>

            <input
              id="txtSupAmount"
              defaultValue="0.00"
              className={`${inputClass} max-w-[140px] text-right`}
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default PurchaseForm;
