import React, { useEffect, useRef } from "react";
import Select, {
  components,
  type DropdownIndicatorProps,
  type FormatOptionLabelMeta,
  type MenuListProps,
  type StylesConfig,
} from "react-select";
import { RxTriangleDown } from "react-icons/rx";
import type { InvoiceHeader } from "../../../../hooks/useInvoice"

type Option = { value: string; label: string; name?: string };

/* Fallback options until the lookup endpoints load. */
const defaultBranchOptions: Option[] = [{ value: "OFFICE", label: "OFFICE" }];
const defaultCustomerOptions: Option[] = [];

const pick = (options: Option[], value: string): Option | null =>
  options.find((o) => o.value === value) ?? null;

/* custom arrow used by every dropdown on this form */
const DropdownIndicator = (props: DropdownIndicatorProps<Option, false>) => (
  <components.DropdownIndicator {...props}>
    <RxTriangleDown size={18} color="#9d9e9d" />
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
};

/* =========================================================
   TWO-COLUMN LOOKUP MENU (same look as the item table dropdown)
========================================================= */

const MENU_FONT_SIZE = 14;
const NAME_COL_WIDTH = 300;

type MenuVariant = "customerId" | "customerName" | "branch";

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
  customerId: {
    firstTitle: "Customer ID",
    secondTitle: "Customer Name",
    firstWidth: 146,
    first: (o) => o.value,
    second: (o) => o.name ?? o.label,
  },
  customerName: {
    firstTitle: "Customer Name",
    secondTitle: "Customer ID",
    firstWidth: NAME_COL_WIDTH,
    first: (o) => o.name ?? o.label,
    second: (o) => o.value,
  },
  branch: {
    firstTitle: "Branch",
    secondTitle: "ID",
    firstWidth: 150,
    first: (o) => o.label,
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

/* menu that starts at its own select and ends at the right edge of the
   box with the given id (the paired name select) */
const spanMenuStyles = (endBoxId: string): StylesConfig<Option, false> => ({
  ...lookupMenuStyles,
  menuPortal: (base) => {
    const end =
      typeof document !== "undefined"
        ? document.getElementById(endBoxId)
        : null;
    const right = end?.getBoundingClientRect().right;
    return {
      ...base,
      zIndex: 9999,
      width: right ? Math.max(right - Number(base.left), 240) : 480,
    };
  },
  menu: (base, state) => ({
    ...lookupMenuStyles.menu!(base, state),
    width: "100%",
    minWidth: 0,
  }),
});

/* menu exactly as wide as its own select (touches both edges) */
const fullWidthMenuStyles: StylesConfig<Option, false> = {
  ...lookupMenuStyles,
  menu: (base, state) => ({
    ...lookupMenuStyles.menu!(base, state),
    width: "100%",
    minWidth: 0,
  }),
};

/* =========================================================
   INDIVIDUAL SELECT STYLES
========================================================= */

const branchStyles: StylesConfig<Option, false> = {
  ...baseSelectStyles,
  ...lookupMenuStyles,
  menu: (base, state) => ({
    ...lookupMenuStyles.menu!(base, state),
    width: 200,
    minWidth: 200,
  }),
};

// Customer ID: the menu stretches until the right edge of the name box
const customerIdStyles: StylesConfig<Option, false> = {
  ...baseSelectStyles,
  ...spanMenuStyles("customerNameBox"),
};

const customerNameStyles: StylesConfig<Option, false> = {
  ...baseSelectStyles,
  ...fullWidthMenuStyles,
};

const branchComponents = {
  ...selectComponents,
  MenuList: createMenuList("branch"),
};
const customerIdComponents = {
  ...selectComponents,
  MenuList: createMenuList("customerId"),
};
const customerNameComponents = {
  ...selectComponents,
  MenuList: createMenuList("customerName"),
};

const formatBranch = createFormatLabel("branch");
const formatCustomerId = createFormatLabel("customerId");
const formatCustomerName = createFormatLabel("customerName");

/* Enter / Tab walks through the fields in this order */
const FIELD_ORDER = [
  "lkpBranch",
  "txtDocNo",
  "lkpCustomerID",
  "lkpCustomerName",
  "dtpDate",
  "txtReference",
  "txtInvoiceTo",
];

interface Props {
  header: InvoiceHeader;
  onChange: <K extends keyof InvoiceHeader>(
    field: K,
    value: InvoiceHeader[K],
  ) => void;
  onDocNoBlur: () => void;
  lookups?: {
    branches?: Option[];
    customerIds?: Option[];
    customerNames?: Option[];
  };
}

const InvoiceForm: React.FC<Props> = ({
  header,
  onChange,
  onDocNoBlur,
  lookups,
}) => {
  const branchOptions = lookups?.branches ?? defaultBranchOptions;
  const customerIdOptions = lookups?.customerIds ?? defaultCustomerOptions;
  const customerNameOptions = lookups?.customerNames ?? defaultCustomerOptions;

  /* menus render in document.body so the form never clips them */
  const portalTarget =
    typeof document !== "undefined" ? document.body : undefined;

  const docNoRef = useRef<HTMLInputElement>(null);

  /* cursor starts in Invoice No. when the page loads */
  useEffect(() => {
    docNoRef.current?.focus();
  }, []);

  /* focus the next (or previous) enabled field in FIELD_ORDER */
  const focusField = (fromId: string, step: 1 | -1): boolean => {
    const index = FIELD_ORDER.indexOf(fromId);
    for (let i = index + step; i >= 0 && i < FIELD_ORDER.length; i += step) {
      const el = document.getElementById(
        FIELD_ORDER[i],
      ) as HTMLInputElement | null;

      if (el && !el.disabled) {
        el.focus();
        if (el.type === "text") el.select();
        return true;
      }
    }
    return false;
  };

  /* after the last field, Enter jumps into the table below the form */
  const focusTable = (section: HTMLElement) => {
    section.nextElementSibling
      ?.querySelector<HTMLElement>("textarea:not([disabled]), input:not([disabled])")
      ?.focus();
  };

  /* Enter / Tab -> next field, Shift+Enter / Shift+Tab -> previous field */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    if (e.key !== "Enter" && e.key !== "Tab") return;

    const target = e.target as HTMLElement;
    if (!e.currentTarget.contains(target) || target.tagName !== "INPUT") return;
    if (!FIELD_ORDER.includes(target.id)) return;

    const step = e.shiftKey ? -1 : 1;
    const section = e.currentTarget;

    // Enter that just picked an option from an open dropdown:
    // wait one tick so the selection is applied first
    const pickedOption =
      e.key === "Enter" &&
      e.defaultPrevented &&
      target.getAttribute("aria-expanded") === "true";

    if (pickedOption) {
      setTimeout(() => {
        if (!focusField(target.id, step) && step === 1) focusTable(section);
      }, 0);
      return;
    }

    if (e.defaultPrevented) return;

    if (focusField(target.id, step)) {
      e.preventDefault();
      return;
    }

    if (e.key === "Enter" && step === 1) {
      e.preventDefault();
      focusTable(section);
    }
  };

  /* Customer ID and Customer Name are one account: set both together */
  const handleCustomerChange = (accountId: string) => {
    const name =
      customerNameOptions.find((o) => o.value === accountId)?.label ?? "";
    onChange("customerId", accountId);
    onChange("customerName", name);
  };

  return (
    <section
      onKeyDown={handleKeyDown}
      className="grid grid-cols-1 items-start gap-x-0 gap-y-3 px-3.5 pb-2 pt-3.5 xl:grid-cols-[minmax(0,1.9fr)_minmax(0,1fr)]"
    >
      {/* ==================================================
          LEFT GROUP
          Branch, Customer (ID + Name), Reference
      ================================================== */}
      <div id="invoice-left-group" className="flex min-w-0 flex-col gap-2 pr-7">
        {/* Branch */}
        <div className="flex min-w-0 items-center gap-2">
          <label htmlFor="lkpBranch" className={`${labelClass} w-23`}>
            Branch
          </label>
          <div className="min-w-0 w-[50%]">
            <Select<Option, false>
              inputId="lkpBranch"
              options={branchOptions}
              value={pick(branchOptions, header.brId)}
              onChange={(o) => onChange("brId", o?.value ?? "")}
              styles={branchStyles}
              components={branchComponents}
              formatOptionLabel={formatBranch}
              filterOption={filterLookup}
              menuPosition="fixed"
              menuPortalTarget={portalTarget}
              isClearable={false}
              isSearchable
            />
          </div>
        </div>

        {/* Customer ID + Customer Name */}
        <div className="flex min-w-0 items-center gap-2">
          <label htmlFor="lkpCustomerID" className={`${labelClass} w-23`}>
            Customer
          </label>
          <div className="min-w-0 w-[26%] shrink-0">
            <Select<Option, false>
              inputId="lkpCustomerID"
              options={customerIdOptions}
              value={pick(customerIdOptions, header.customerId)}
              onChange={(o) => handleCustomerChange(o?.value ?? "")}
              placeholder=""
              styles={customerIdStyles}
              components={customerIdComponents}
              formatOptionLabel={formatCustomerId}
              filterOption={filterLookup}
              menuPosition="fixed"
              menuPortalTarget={portalTarget}
              isClearable={false}
              isSearchable
            />
          </div>
          <div id="customerNameBox" className="min-w-0 flex-1">
            <Select<Option, false>
              inputId="lkpCustomerName"
              options={customerNameOptions}
              value={pick(customerNameOptions, header.customerId)}
              onChange={(o) => handleCustomerChange(o?.value ?? "")}
              placeholder=""
              styles={customerNameStyles}
              components={customerNameComponents}
              formatOptionLabel={formatCustomerName}
              filterOption={filterLookup}
              menuPosition="fixed"
              menuPortalTarget={portalTarget}
              isClearable={false}
              isSearchable
            />
          </div>
        </div>

        {/* Reference */}
        <div className="flex min-w-0 items-center gap-2">
          <label htmlFor="txtReference" className={`${labelClass} w-23`}>
            Reference
          </label>
          <input
            id="txtReference"
            value={header.reference}
            onChange={(e) => onChange("reference", e.target.value)}
            className="input-style min-w-0 flex-1"
          />
        </div>
      </div>

      {/* ==================================================
          RIGHT GROUP
          Invoice No., Invoice To, Date
      ================================================== */}
      <div id="invoice-right-group" className="flex min-w-0 flex-col gap-2">
        {/* Invoice No. */}
        <div className="flex min-w-0 items-center gap-3">
          <label htmlFor="txtDocNo" className={`${labelClass} w-23`}>
            Invoice No.
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

        {/* Date */}
        <div className="flex min-w-0 items-center gap-3">
          <label htmlFor="dtpDate" className={`${labelClass} w-23`}>
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

        {/* Invoice To */}
        <div className="flex min-w-0 items-center gap-3">
          <label htmlFor="txtInvoiceTo" className={`${labelClass} w-23`}>
            Invoice To
          </label>
          <input
            id="txtInvoiceTo"
            value={header.invoiceTo}
            onChange={(e) => onChange("invoiceTo", e.target.value)}
            className="input-style min-w-0 flex-1"
          />
        </div>
      </div>
    </section>
  );
};

export default InvoiceForm;