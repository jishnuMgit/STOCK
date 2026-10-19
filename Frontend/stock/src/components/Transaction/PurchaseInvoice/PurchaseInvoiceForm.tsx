import { Plus } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import Select, {
  components,
  type DropdownIndicatorProps,
  type FormatOptionLabelMeta,
  type MenuListProps,
  type StylesConfig,
} from "react-select";
import { RxTriangleDown } from "react-icons/rx";
import type {
  CashSupplier,
  PurchaseHeader,
  PurchaseExpenseRow,
} from "../../../hooks/Purchase/Transaction/usePurchaseInvoice";
import type { MiscSupplierData } from "./PurchaseInoviceMiscsup";
import PurchaseInoviceMiscsup from "./PurchaseInoviceMiscsup";
import { createPortal } from "react-dom";
import PurchaseExpense from "./PurchaseInvoiceExpense";

type Option = { value: string; label: string; name?: string };

const makeOptions = (values: string[]): Option[] =>
  values.map((value) => ({ value, label: value }));

/* Fallback options until the lookup endpoints load. */
const defaultBranchOptions = makeOptions(["OFFICE"]);
const defaultInvoiceTypeOptions: Option[] = [
  { value: "C", label: "C" },
  { value: "R", label: "R" },
];
const defaultSupplierIdOptions: Option[] = [];
const defaultSupplierNameOptions: Option[] = [];
const miscSupplierOptions = makeOptions(["No", "Yes"]);
const defaultCurrencyOptions = makeOptions(["SAR"]);

const pick = (options: Option[], value: string): Option | null =>
  options.find((o) => o.value === value) ?? null;

/* custom arrow used by every dropdown on this form */
const DropdownIndicator = (props: DropdownIndicatorProps<Option, false>) => (
  <components.DropdownIndicator {...props}>
    <RxTriangleDown size={18} />
  </components.DropdownIndicator>
);

const selectComponents = {
  DropdownIndicator,
  IndicatorSeparator: () => null,
};

/* =========================================================
   LABEL STYLE
========================================================= */

const labelClass = "shrink-0 whitespace-nowrap text-[14px] text-[#263449]";

/* =========================================================
   BASE SELECT STYLES
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
    backgroundColor: state.isDisabled ? "#f1f5f9" : "#fff",
    cursor: state.isDisabled ? "not-allowed" : "pointer",
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
========================================================= */

// 1. Branch
const branchSelectStyles: StylesConfig<Option, false> = {
  ...baseSelectStyles,
  control: (base, state) => ({
    ...baseSelectStyles.control!(base, state),
    height: 30,
    minHeight: 30,
    borderRadius: 4,
    borderColor: "#d7dee7",
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
   TWO-COLUMN LOOKUP MENU (same look as the item table dropdown)
========================================================= */

const MENU_FONT_SIZE = 14;
const ID_COL_WIDTH = 140;
const NAME_COL_WIDTH = 300;

type MenuVariant = "supplierId" | "supplierName" | "miscId" | "miscName";

const menuLayout: Record<
  MenuVariant,
  {
    firstTitle: string;
    secondTitle: string;
    firstWidth: number;
    first: (o: Option) => string;
    second: (o: Option) => string;
  }
> = {
  supplierId: {
    firstTitle: "Supplier ID",
    secondTitle: "Supplier Name",
    firstWidth: ID_COL_WIDTH,
    first: (o) => o.value,
    second: (o) => o.name ?? o.label,
  },
  supplierName: {
    firstTitle: "Supplier Name",
    secondTitle: "Supplier ID",
    firstWidth: NAME_COL_WIDTH,
    first: (o) => o.name ?? o.label,
    second: (o) => o.value,
  },
  miscId: {
    firstTitle: "Misc. Sup. ID",
    secondTitle: "Misc. Sup. Name",
    firstWidth: ID_COL_WIDTH,
    first: (o) => o.value,
    second: (o) => o.name ?? o.label,
  },
  miscName: {
    firstTitle: "Misc. Sup. Name",
    secondTitle: "Misc. Sup. ID",
    firstWidth: NAME_COL_WIDTH,
    first: (o) => o.name ?? o.label,
    second: (o) => o.value,
  },
};

/* gray sticky header row at the top of the menu */
const createMenuList = (variant: MenuVariant) => {
  const layout = menuLayout[variant];

  const MenuList = (props: MenuListProps<Option, false>) => (
    <components.MenuList {...props}>
      <div
        style={{
          display: "flex",
          position: "sticky",
          top: 0,
          zIndex: 1,
          background: "#eeeeee",
          borderBottom: "1px solid #cfcfcf",
          fontWeight: 600,
          fontSize: MENU_FONT_SIZE,
          color: "#202a36",
        }}
      >
        <div
          style={{
            width: layout.firstWidth,
            flexShrink: 0,
            boxSizing: "border-box",
            padding: "5px 8px",
            borderRight: "1px solid #cfcfcf",
          }}
        >
          {layout.firstTitle}
        </div>
        <div style={{ flex: 1, padding: "5px 8px" }}>{layout.secondTitle}</div>
      </div>
      {props.children}
    </components.MenuList>
  );

  return MenuList;
};

/* menu rows show two columns; the control shows only its own label */
const createFormatLabel =
  (variant: MenuVariant) =>
  (option: Option, meta: FormatOptionLabelMeta<Option>) => {
    if (meta.context !== "menu") return option.label;

    const layout = menuLayout[variant];

    return (
      <div style={{ display: "flex" }}>
        <div
          style={{
            width: layout.firstWidth,
            flexShrink: 0,
            boxSizing: "border-box",
            padding: "6px 8px",
            borderRight: "1px solid #e3e8ef",
          }}
        >
          {layout.first(option)}
        </div>
        <div style={{ flex: 1, padding: "6px 8px" }}>
          {layout.second(option)}
        </div>
      </div>
    );
  };

/* typing searches both the id and the name */
const filterLookup = (option: { data: Option }, input: string): boolean => {
  const text = input.trim().toLowerCase();
  if (!text) return true;
  return (
    option.data.value.toLowerCase().includes(text) ||
    (option.data.name ?? option.data.label).toLowerCase().includes(text)
  );
};

const lookupMenuStyles: StylesConfig<Option, false> = {
  menuPortal: (base) => ({ ...base, zIndex: 9999 }),
  menu: (base) => ({
    ...base,
    zIndex: 9999,
    fontSize: MENU_FONT_SIZE,
    marginTop: 1,
    width: 480,
    minWidth: 480,
    border: "none",
    borderRadius: 0,
    boxShadow: "0 0 0 1px #cfcfcf, 0 4px 10px rgba(0,0,0,0.15)",
  }),
  menuList: (base) => ({ ...base, padding: 0, maxHeight: 260 }),
  option: (base, state) => ({
    ...base,
    padding: 0,
    fontSize: MENU_FONT_SIZE,
    color: "#263449",
    backgroundColor: state.isSelected
      ? "#cdeedd"
      : state.isFocused
        ? "#e6f6ee"
        : "#fff",
    cursor: "pointer",
  }),
};

const supplierIdStyles = { ...supplierIdSelectStyles, ...lookupMenuStyles };
const supplierNameStyles = { ...supplierNameSelectStyles, ...lookupMenuStyles };
const miscIdStyles = { ...miscSupplierIdSelectStyles, ...lookupMenuStyles };
const miscNameStyles = { ...miscSupplierNameSelectStyles, ...lookupMenuStyles };

const supplierIdComponents = {
  ...selectComponents,
  MenuList: createMenuList("supplierId"),
};
const supplierNameComponents = {
  ...selectComponents,
  MenuList: createMenuList("supplierName"),
};
const miscIdComponents = {
  ...selectComponents,
  MenuList: createMenuList("miscId"),
};
const miscNameComponents = {
  ...selectComponents,
  MenuList: createMenuList("miscName"),
};

const formatSupplierId = createFormatLabel("supplierId");
const formatSupplierName = createFormatLabel("supplierName");
const formatMiscId = createFormatLabel("miscId");
const formatMiscName = createFormatLabel("miscName");

const FIELD_ORDER = [
  "txtDocNo",
  "lkpBranch",
  "lkpType",
  "dtpDate",
  "txtPONo",
  "lkpSupplierID",
  "lkpSupplierName",
  "lkpMiscSup",
  "lkpMiscSupID",
  "lkpMiscSupName",
  "lkpCurrency",
  "txtCurrencyRate",
  "txtSupInvoiceNo",
  "dtpSupInvoiceDate",
];

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
    invoiceTypes?: Option[]; // C / R from dbo.getpurchasestockparam
    supplierIds?: Option[];
    supplierNames?: Option[];
    currencies?: Option[];
  };
  miscSuppliers?: CashSupplier[];
  miscMode: string; // "Yes" | "No"
  onMiscModeChange: (mode: string) => void;
  onMiscSupplierSaved?: (data: MiscSupplierData) => void | Promise<void>;
  onCalcUnitCost?: () => void;
  expenseRows: PurchaseExpenseRow[];
  onExpenseSave: (rows: PurchaseExpenseRow[]) => void;
}

const PurchaseForm: React.FC<Props> = ({
  header,
  onChange,
  onDocNoBlur,
  totalSupplierAmt,
  lookups,
  miscSuppliers = [],
  miscMode,
  onMiscModeChange,
  onMiscSupplierSaved,
  onCalcUnitCost,
  expenseRows,
  onExpenseSave,
}) => {
  const [miscOpen, setMiscOpen] = useState(false);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const branchOptions = lookups?.branches ?? defaultBranchOptions;
  const invoiceTypeOptions = lookups?.invoiceTypes ?? defaultInvoiceTypeOptions;
  const supplierOptions = lookups?.supplierIds ?? defaultSupplierIdOptions;
  const supplierNameOptions =
    lookups?.supplierNames ?? defaultSupplierNameOptions;
  const currencyOptions = lookups?.currencies ?? defaultCurrencyOptions;

  const isMisc = miscMode === "Yes";

  /* Cash invoice: the supplier account is fixed (the branch's cash purchase
     account), so Supplier ID / Name are locked, like the VB form. */
  // const isCash = header.invoiceType === "C";

  /* Misc. ID and Misc. Name come from the same records (cash suppliers) */
  const miscIdOptions: Option[] = miscSuppliers.map((m) => ({
    value: m.id,
    label: m.id,
    name: m.name,
  }));
  const miscNameOptions: Option[] = miscSuppliers.map((m) => ({
    value: m.id,
    label: m.name,
    name: m.name,
  }));

  /* menus render in document.body so the form never clips them */
  const portalTarget =
    typeof document !== "undefined" ? document.body : undefined;

  const docNoRef = useRef<HTMLInputElement>(null);

  /* cursor starts in Entry No. when the page loads */
  useEffect(() => {
    docNoRef.current?.focus();
  }, []);

  /* Enter / Tab -> next field, Shift+Enter / Shift+Tab -> previous field */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    if (e.defaultPrevented) return;
    if (e.key !== "Enter" && e.key !== "Tab") return;

    const target = e.target as HTMLElement;
    if (!e.currentTarget.contains(target) || target.tagName !== "INPUT") return;

    const index = FIELD_ORDER.indexOf(target.id);
    if (index === -1) return;

    const step = e.shiftKey ? -1 : 1;

    for (let i = index + step; i >= 0 && i < FIELD_ORDER.length; i += step) {
      const el = document.getElementById(
        FIELD_ORDER[i],
      ) as HTMLInputElement | null;

      if (el && !el.disabled) {
        e.preventDefault();
        el.focus();
        if (el.type === "text") el.select();
        return;
      }
    }

    // after the last field, Enter jumps into the item table below the form
    if (e.key === "Enter" && !e.shiftKey) {
      const next =
        e.currentTarget.nextElementSibling?.querySelector<HTMLElement>(
          "input:not([disabled])",
        );
      if (next) {
        e.preventDefault();
        next.focus();
      }
    }
  };

  /* Supplier ID and Supplier Name are one account: set both together */
  const handleSupplierChange = (accountId: string) => {
    const name =
      supplierNameOptions.find((o) => o.value === accountId)?.label ?? "";
    onChange("supplierId", accountId);
    onChange("supplierName", name);
  };

  /* Misc. ID and Misc. Name are one record: set both plus the VAT no. */
  const handleMiscChange = (id: string) => {
    const m = miscSuppliers.find((x) => x.id === id);
    onChange("miscSupId", id);
    onChange("supplierName", m?.name ?? "");
    onChange("vatNo", m?.vatNo ?? "");
  };

  const handleMiscModeChange = (mode: string) => {
    onMiscModeChange(mode);
    if (mode !== "Yes" && header.miscSupId) handleMiscChange("");
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
    <section
      onKeyDown={handleKeyDown}
      className="grid grid-cols-1 items-start gap-x-4 gap-y-3 px-3.5 pb-2 pt-3.5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,2.15fr)]"
    >
      {/* ==================================================
          GROUP 1
          Branch, P.O. No., Misc. Sup., Currency
      ================================================== */}
      <div id="purchase-left-group" className="flex min-w-0 flex-col gap-2">
        {/* Branch */}
        <div className="flex min-w-0 items-center gap-2">
          <label htmlFor="lkpBranch" className={`${labelClass} w-18`}>
            Branch
          </label>
          <div className="min-w-0 flex-1">
            <Select<Option, false>
              inputId="lkpBranch"
              options={branchOptions}
              value={pick(branchOptions, header.brId)}
              onChange={(o) => onChange("brId", o?.value ?? "")}
              styles={branchSelectStyles}
              components={selectComponents}
              isClearable={false}
              isSearchable={false}
            />
          </div>
        </div>

        {/* P.O. No. */}
        <div className="flex min-w-0 items-center gap-2">
          <label htmlFor="txtPONo" className={`${labelClass} w-18`}>
            P.O. No.
          </label>
          <input
            id="txtPONo"
            value={header.poNo}
            onChange={(e) => onChange("poNo", e.target.value)}
            className="input-style min-w-0 flex-1"
          />
        </div>

        {/* Misc. Supplier Yes / No */}
        <div className="flex min-w-0 items-center gap-2">
          <label htmlFor="lkpMiscSup" className={`${labelClass} w-18`}>
            Misc. Sup.
          </label>
          <div className="min-w-0 w-[50%]">
            <Select<Option, false>
              inputId="lkpMiscSup"
              options={miscSupplierOptions}
              value={pick(miscSupplierOptions, miscMode)}
              onChange={(o) => handleMiscModeChange(o?.value ?? "No")}
              styles={miscSupplierSelectStyles}
              components={selectComponents}
              isClearable={false}
              isSearchable={false}
            />
          </div>
        </div>

        {/* Currency */}
        <div className="flex min-w-0 items-center gap-2">
          <label htmlFor="lkpCurrency" className={`${labelClass} w-18`}>
            Currency
          </label>
          <div className="min-w-0 w-[50%]">
            <Select<Option, false>
              inputId="lkpCurrency"
              options={currencyOptions}
              value={pick(currencyOptions, header.currency)}
              onChange={(o) => onChange("currency", o?.value ?? "")}
              styles={currencySelectStyles}
              components={selectComponents}
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
        className="ml-3 flex w-[90%] min-w-0 flex-col gap-2"
      >
        {/* Entry No. */}
        <div className="flex min-w-0 items-center gap-3">
          <label htmlFor="txtDocNo" className={`${labelClass} w-23`}>
            Entry No.
          </label>
          <input
            id="txtDocNo"
            ref={docNoRef}
            value={header.docNo}
            onChange={(e) => onChange("docNo", e.target.value)}
            onBlur={onDocNoBlur}
            className="input-style min-w-0 flex-1"
          />
        </div>

        {/* Supplier ID */}
        <div className="flex min-w-0 items-center gap-3">
          <label htmlFor="lkpSupplierID" className={`${labelClass} w-23`}>
            Supplier
          </label>
          <div className="min-w-0 flex-1">
            <Select<Option, false>
              inputId="lkpSupplierID"
              options={supplierOptions}
              value={pick(supplierOptions, header.supplierId)}
              onChange={(o) => handleSupplierChange(o?.value ?? "")}
              // isDisabled={isCash}
              styles={supplierIdStyles}
              components={supplierIdComponents}
              formatOptionLabel={formatSupplierId}
              filterOption={filterLookup}
              menuPosition="fixed"
              menuPortalTarget={portalTarget}
              isClearable={false}
              isSearchable
            />
          </div>
        </div>

        {/* Misc. Supplier ID */}
        <div className="flex min-w-0 items-center gap-3">
          <label htmlFor="lkpMiscSupID" className={`${labelClass} w-23`}>
            Misc. Sup.
          </label>
          <div className="min-w-0 flex-1">
            <Select<Option, false>
              inputId="lkpMiscSupID"
              options={miscIdOptions}
              value={pick(miscIdOptions, header.miscSupId)}
              onChange={(o) => handleMiscChange(o?.value ?? "")}
              isDisabled={!isMisc}
              placeholder=""
              styles={miscIdStyles}
              components={miscIdComponents}
              formatOptionLabel={formatMiscId}
              filterOption={filterLookup}
              menuPosition="fixed"
              menuPortalTarget={portalTarget}
              isClearable={false}
              isSearchable
            />
          </div>
        </div>

        {/* Currency Rate */}
        <div className="flex min-w-0 items-center gap-3">
          <label htmlFor="txtCurrencyRate" className={`${labelClass} w-23`}>
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
            className="h-7.5 w-30 whitespace-nowrap cursor-pointer rounded-sm border border-[#cbd1d9] bg-linear-to-b from-white to-[#e8e8e8] px-2.5 text-[11px] text-[#222] hover:bg-slate-100"
          >
            Purchase Expense
          </button>
        </div>
      </div>

      {/* ==================================================
          GROUP 3
          Remaining fields and action buttons
      ================================================== */}
      <div id="purchase-right-group" className="flex min-w-0 flex-col gap-2">
        {/* Invoice Type and Date */}
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <label htmlFor="lkpType" className={`${labelClass} w-19`}>
              Type
            </label>
            <div className="min-w-0 w-[55%]">
              <Select<Option, false>
                inputId="lkpType"
                options={invoiceTypeOptions}
                value={pick(invoiceTypeOptions, header.invoiceType)}
                onChange={(o) => onChange("invoiceType", o?.value ?? "")}
                styles={invoiceTypeSelectStyles}
                components={selectComponents}
                isClearable={false}
                isSearchable={false}
              />
            </div>
          </div>

          <div className="ml-auto flex min-w-0 items-center justify-end gap-2">
            <label htmlFor="dtpDate" className={`${labelClass} w-9`}>
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
            // isDisabled={isCash}
            styles={supplierNameStyles}
            components={supplierNameComponents}
            formatOptionLabel={formatSupplierName}
            filterOption={filterLookup}
            menuPosition="fixed"
            menuPortalTarget={portalTarget}
            isClearable={false}
            isSearchable
          />
        </div>

        {/* Misc. Supplier Name + Add */}
        <div className="flex min-w-0 items-center gap-2">
          <div className="min-w-0 flex-1">
            <Select<Option, false>
              inputId="lkpMiscSupName"
              options={miscNameOptions}
              value={pick(miscNameOptions, header.miscSupId)}
              onChange={(o) => handleMiscChange(o?.value ?? "")}
              isDisabled={!isMisc}
              placeholder=""
              styles={miscNameStyles}
              components={miscNameComponents}
              formatOptionLabel={formatMiscName}
              filterOption={filterLookup}
              menuPosition="fixed"
              menuPortalTarget={portalTarget}
              isClearable={false}
              isSearchable
            />
          </div>
          <button
            id="btnAddMiscSupplier"
            type="button"
            aria-label="Add miscellaneous supplier"
            onClick={() => setMiscOpen(true)}
            className="flex h-7.5 w-7.5 cursor-pointer shrink-0 items-center justify-center rounded-full bg-[#28a745] text-[20px] font-bold leading-none text-white hover:bg-green-700"
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
            className="ml-25 h-7.5 w-30 cursor-pointer whitespace-nowrap rounded-sm border border-[#cbd1d9] bg-linear-to-b from-white to-[#e8e8e8] px-2.5 text-[11px] text-[#222] hover:bg-slate-100"
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
              className="input-style min-w-0 max-w-35 text-right"
            />
          </div>
        </div>
      </div>

      <PurchaseInoviceMiscsup
        open={miscOpen}
        onClose={() => setMiscOpen(false)}
        onSaved={(data) => {
          onMiscModeChange("Yes"); // switch to misc mode so the new one shows
          void onMiscSupplierSaved?.(data);
        }}
      />

      {expenseOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-9000 flex items-center justify-center bg-black/40"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setExpenseOpen(false);
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              className="max-h-[95vh] w-300 max-w-[95vw] overflow-auto border border-slate-400 bg-white shadow-xl"
            >
              <PurchaseExpense
                initialRows={expenseRows}
                onSave={(rows) => {
                  onExpenseSave(rows);
                  setExpenseOpen(false);
                }}
                onClose={() => setExpenseOpen(false)}
              />
            </div>
          </div>,
          document.body,
        )}
    </section>
  );
};

export default PurchaseForm;
