import { Plus } from "lucide-react";
import React, { useEffect, useState } from "react";
import Select, { type StylesConfig } from "react-select";
import type { PurchaseHeader } from "../../../hooks/Purchase/Transaction/usePurchaseInvoice";
import type { MiscSupplierData } from "./PurchaseInoviceMiscsup";
import PurchaseInoviceMiscsup from "./PurchaseInoviceMiscsup";
import { createPortal } from "react-dom";
import PurchaseExpense from "./PurchaseInvoiceExpense";

type Option = { value: string; label: string };

const makeOptions = (values: string[]): Option[] =>
  values.map((value) => ({ value, label: value }));

/* Fallback options until the lookup endpoints exist.
   Supplier ID and Supplier Name share the same value (the account id),
   like fAccountID did in the VB. */
const defaultBranchOptions = makeOptions(["OFFICE"]);
const invoiceTypeOptions = makeOptions(["C"]);
const defaultSupplierIdOptions: Option[] = [
  { value: "1030101", label: "1030101" },
];
const defaultSupplierNameOptions: Option[] = [
  { value: "1030101", label: "AlSulaijer Hamad" },
];
const miscSupplierOptions = makeOptions(["No", "Yes"]);
const defaultCurrencyOptions = makeOptions(["SAR"]);

const pick = (options: Option[], value: string): Option | null =>
  options.find((o) => o.value === value) ?? null;

/* =========================================================
   LABEL STYLE
========================================================= */

const labelClass = "shrink-0 whitespace-nowrap text-[14px] text-[#263449]";

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

interface Props {
  header: PurchaseHeader;
  onChange: <K extends keyof PurchaseHeader>(
    field: K,
    value: PurchaseHeader[K],
  ) => void;
  onDocNoBlur: () => void;
  totalSupplierAmt: number;
  lookups?: {
    branches?: Option[];
    supplierIds?: Option[];
    supplierNames?: Option[];
    currencies?: Option[];
  };
  onMiscSupplierSave?: (data: MiscSupplierData) => void;
  onCalcUnitCost?: () => void;
}

const PurchaseForm: React.FC<Props> = ({
  header,
  onChange,
  onDocNoBlur,
  totalSupplierAmt,
  lookups,
  onMiscSupplierSave,
  onCalcUnitCost,
}) => {
  const [miscOpen, setMiscOpen] = useState(false);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const branchOptions = lookups?.branches ?? defaultBranchOptions;
  const supplierOptions = lookups?.supplierIds ?? defaultSupplierIdOptions;
  const supplierNameOptions =
    lookups?.supplierNames ?? defaultSupplierNameOptions;
  const currencyOptions = lookups?.currencies ?? defaultCurrencyOptions;

  /* Supplier ID and Supplier Name are one account: set both together */
  const handleSupplierChange = (accountId: string) => {
    const name =
      supplierNameOptions.find((o) => o.value === accountId)?.label ?? "";
    onChange("supplierId", accountId);
    onChange("supplierName", name);
  };

  useEffect(() => {
    if (!expenseOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExpenseOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [expenseOpen]);

  return (
    <section className="grid grid-cols-1 items-start gap-x-4 gap-y-3 px-[14px] pb-2 pt-[14px] xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,2.15fr)]">
      {/* ==================================================
          GROUP 1
          Branch, P.O. No., Misc. Sup., Currency
      ================================================== */}
      <div id="purchase-left-group" className="flex min-w-0 flex-col gap-[8px]">
        {/* Branch */}
        <div className="flex min-w-0 items-center gap-2">
          <label htmlFor="lkpBranch" className={`${labelClass} w-[72px]`}>
            Branch
          </label>
          <div className="min-w-0 flex-1">
            <Select<Option, false>
              inputId="lkpBranch"
              options={branchOptions}
              value={pick(branchOptions, header.brId)}
              onChange={(o) => onChange("brId", o?.value ?? "")}
              styles={branchSelectStyles}
              isClearable={false}
              isSearchable={false}
            />
          </div>
        </div>

        {/* P.O. No. */}
        <div className="flex min-w-0 items-center gap-2">
          <label htmlFor="txtPONo" className={`${labelClass} w-[72px]`}>
            P.O. No.
          </label>
          <input
            id="txtPONo"
            value={header.poNo}
            onChange={(e) => onChange("poNo", e.target.value)}
            className="input-style min-w-0 flex-1"
          />
        </div>

        {/* Misc. Supplier (UI only, not saved yet) */}
        <div className="flex min-w-0 items-center gap-2">
          <label htmlFor="lkpMiscSup" className={`${labelClass} w-[72px]`}>
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
          <label htmlFor="lkpCurrency" className={`${labelClass} w-[72px]`}>
            Currency
          </label>
          <div className="min-w-0 w-[50%]">
            <Select<Option, false>
              inputId="lkpCurrency"
              options={currencyOptions}
              value={pick(currencyOptions, header.currency)}
              onChange={(o) => onChange("currency", o?.value ?? "")}
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
        className="ml-3 flex w-[90%] min-w-0 flex-col gap-[8px]"
      >
        {/* Entry No. */}
        <div className="flex min-w-0 items-center gap-3">
          <label htmlFor="txtDocNo" className={`${labelClass} w-[92px]`}>
            Entry No.
          </label>
          <input
            id="txtDocNo"
            value={header.docNo}
            onChange={(e) => onChange("docNo", e.target.value)}
            onBlur={onDocNoBlur}
            className="input-style min-w-0 flex-1"
          />
        </div>

        {/* Supplier ID */}
        <div className="flex min-w-0 items-center gap-3">
          <label htmlFor="lkpSupplierID" className={`${labelClass} w-[92px]`}>
            Supplier
          </label>
          <div className="min-w-0 flex-1">
            <Select<Option, false>
              inputId="lkpSupplierID"
              options={supplierOptions}
              value={pick(supplierOptions, header.supplierId)}
              onChange={(o) => handleSupplierChange(o?.value ?? "")}
              styles={supplierIdSelectStyles}
              isClearable={false}
              isSearchable
            />
          </div>
        </div>

        {/* Misc. Supplier ID (UI only) */}
        <div className="flex min-w-0 items-center gap-3">
          <label htmlFor="lkpMiscSupID" className={`${labelClass} w-[92px]`}>
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
          <label htmlFor="txtCurrencyRate" className={`${labelClass} w-[92px]`}>
            Currency Rate
          </label>
          <input
            id="txtCurrencyRate"
            inputMode="decimal"
            value={header.currencyRate}
            onChange={(e) => {
              const v = e.target.value;
              if (v === "" || /^\d*\.?\d*$/.test(v))
                onChange("currencyRate", v);
            }}
            className="input-style min-w-0 flex-1 text-right"
          />
        </div>

        {/* Purchase Expense */}
        <div className="flex justify-end">
          <button
            id="btnPurchaseExpense"
            type="button"
            onClick={() => setExpenseOpen(true)}
            className="h-[30px] w-[120px] whitespace-nowrap cursor-pointer rounded-[4px] border border-[#cbd1d9] bg-gradient-to-b from-white to-[#e8e8e8] px-[10px] text-[11px] text-[#222] hover:bg-slate-100"
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
        id="purchase-right-group"
        className="flex min-w-0 flex-col gap-[8px]"
      >
        {/* Invoice Type and Date */}
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <label htmlFor="lkpType" className={`${labelClass} w-[76px]`}>
              Type
            </label>
            <div className="min-w-0 w-[35%]">
              <Select<Option, false>
                inputId="lkpType"
                options={invoiceTypeOptions}
                value={pick(invoiceTypeOptions, header.invoiceType)}
                onChange={(o) => onChange("invoiceType", o?.value ?? "")}
                styles={invoiceTypeSelectStyles}
                isClearable={false}
                isSearchable={false}
              />
            </div>
          </div>

          <div className="ml-auto flex min-w-0 items-center justify-end gap-2">
            <label htmlFor="dtpDate" className={`${labelClass} w-[36px]`}>
              Date
            </label>
            <input
              id="dtpDate"
              type="date"
              value={header.date}
              onChange={(e) => onChange("date", e.target.value)}
              className="input-style"
              style={{ width: "140px" }}
            />
          </div>
        </div>

        {/* Supplier Name */}
        <div className="min-w-0">
          <Select<Option, false>
            inputId="lkpSupplierName"
            options={supplierNameOptions}
            value={pick(supplierNameOptions, header.supplierId)}
            onChange={(o) => handleSupplierChange(o?.value ?? "")}
            styles={supplierNameSelectStyles}
            isClearable={false}
            isSearchable
          />
        </div>

        {/* Misc. Supplier Name (UI only) */}
        <div className="flex min-w-0 items-center gap-2">
          <div className="min-w-0 flex-1">
            <Select<Option, false>
              inputId="lkpMiscSupName"
              options={[]}
              placeholder=""
              styles={miscSupplierNameSelectStyles}
              isClearable={false}
              isSearchable={false}
            />
          </div>
          <button
            id="btnAddMiscSupplier"
            type="button"
            aria-label="Add miscellaneous supplier"
            onClick={() => setMiscOpen(true)}
            className="flex h-[30px] w-[30px] cursor-pointer shrink-0 items-center justify-center rounded-full bg-[#28a745] text-[20px] font-bold leading-none text-white hover:bg-green-700"
          >
            <Plus />
          </button>
        </div>

        {/* Supplier Invoice No. and Date */}
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <label
              htmlFor="txtSupInvoiceNo"
              className="shrink-0 whitespace-nowrap text-[14px] text-[#263449]"
            >
              Sup. Invoice No.
            </label>
            <input
              id="txtSupInvoiceNo"
              value={header.piNo}
              onChange={(e) => onChange("piNo", e.target.value)}
              className="input-style min-w-0 flex-1"
            />
          </div>

          {/* UI only: the backend has no column for this yet */}
          <div className="flex min-w-0 items-center gap-2">
            <label
              htmlFor="dtpSupInvoiceDate"
              className="shrink-0 whitespace-nowrap text-[14px] text-[#263449]"
            >
              Sup. Invoice Date
            </label>
            <input
              id="dtpSupInvoiceDate"
              type="date"
              className="input-style min-w-0 flex-1"
            />
          </div>
        </div>

        {/* Calculate Unit Cost and Supplier Amount */}
        <div className="flex justify-between gap-2">
          <button
            id="btnCalculateUnitCost"
            type="button"
            onClick={onCalcUnitCost}
            className="ml-25 h-[30px] w-[120px] cursor-pointer whitespace-nowrap rounded-[4px] border border-[#cbd1d9] bg-gradient-to-b from-white to-[#e8e8e8] px-[10px] text-[11px] text-[#222] hover:bg-slate-100"
          >
            Calculate Unit Cost
          </button>

          <div className="flex min-w-0 items-center justify-end gap-2">
            <label
              htmlFor="txtSupAmount"
              className="shrink-0 whitespace-nowrap text-[14px] text-[#263449]"
            >
              Sup. Amount
            </label>
            <input
              id="txtSupAmount"
              value={totalSupplierAmt.toFixed(2)}
              readOnly
              className="input-style min-w-0 max-w-[140px] text-right"
            />
          </div>
        </div>
      </div>
      <PurchaseInoviceMiscsup
        open={miscOpen}
        onClose={() => setMiscOpen(false)}
        onSave={onMiscSupplierSave}
      />

      {expenseOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[9000] flex items-center justify-center bg-black/40"
            onMouseDown={(e) => {
              // click on the dark backdrop closes; clicks inside do not
              if (e.target === e.currentTarget) setExpenseOpen(false);
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              className="max-h-[95vh] w-[1200px] max-w-[95vw] overflow-auto border border-slate-400 bg-white shadow-xl"
            >
              <PurchaseExpense onClose={() => setExpenseOpen(false)} />
            </div>
          </div>,
          document.body,
        )}
    </section>
  );
};

export default PurchaseForm;
