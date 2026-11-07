import React, { useEffect, useMemo } from "react";
import Select, {
  components,
  type FormatOptionLabelMeta,
  type MenuListProps,
  type StylesConfig,
} from "react-select";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import type { SxProps, Theme } from "@mui/material/styles";
import selectComponents from "../../sharecomponents/selectComponents";
import type {
  CustomerLookup,
  Option,
  ParamLookup,
  SalesHeader,
} from "../../../hooks/useSalesInvoice"; // adjust path to your hook
import SelectDropdownIndicator from "../../common/SelectDropdownIndicator";

dayjs.extend(customParseFormat);

// ============================================================
// PROPS
// ============================================================

type SalesInvoiceHeaderProps = {
  branchOptions: Option[];
  branch: Option | null;
  onBranchChange: (option: Option | null) => void;
  branchLoading: boolean;
  branchError: string | null;

  header: SalesHeader;
  onHeaderChange: (patch: Partial<SalesHeader>) => void;
  customers: CustomerLookup[];
  priceLevels: ParamLookup[];
  onCustomerSelect: (customerId: string) => void;
  onDocNoBlur: () => void;
  invoiceTypes?: Option[];
  readOnly: boolean; // posted invoice
};

// ============================================================
// FOCUS COLORS (same as the purchase invoice form)
// ============================================================

const BORDER_COLOR = "#d7dee7";
const BORDER_HOVER_COLOR = "#aebdce";
const BORDER_FOCUS_COLOR = "#9fdfbc";

// ============================================================
// SELECT STYLES
// ============================================================

const selectStyles: StylesConfig<Option, false> = {
  control: (base, state) => ({
    ...base,

    minHeight: 30,
    height: 30,
    width: "100%",
    borderRadius: 4,
    borderColor: state.isFocused ? BORDER_FOCUS_COLOR : BORDER_COLOR,
    boxShadow: "none",
    backgroundColor: state.isDisabled ? "#f1f5f9" : "#ffffff",
    cursor: state.isDisabled ? "not-allowed" : "pointer",
    fontSize: 14,
    "&:hover": {
      borderColor: state.isFocused ? BORDER_FOCUS_COLOR : BORDER_HOVER_COLOR,
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
    fontSize: 14,
    margin: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  }),

  placeholder: (base) => ({
    ...base,

    color: "#64748b",
    fontSize: 14,
    margin: 0,
  }),

  input: (base) => ({
    ...base,

    margin: 0,
    padding: 0,
    fontSize: 14,
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

    zIndex: 999999,
  }),

  menu: (base) => ({
    ...base,

    zIndex: 999999,
    fontSize: 14,
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
    fontSize: 14,
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
// BRANCH LOOKUP MENU (two columns: Branch | ID, gray header row)
// ============================================================

const MENU_FONT_SIZE = 14;
const BRANCH_COL_WIDTH = 150;

const BranchMenuList = (props: MenuListProps<Option, false>) => (
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
          width: BRANCH_COL_WIDTH,
          flexShrink: 0,
          boxSizing: "border-box",
          padding: "5px 8px",
          borderRight: "1px solid #cfcfcf",
        }}
      >
        Branch
      </div>
      <div style={{ flex: 1, padding: "5px 8px" }}>ID</div>
    </div>
    {props.children}
  </components.MenuList>
);

// menu rows show two columns; the control shows only the branch name
const formatBranch = (option: Option, meta: FormatOptionLabelMeta<Option>) => {
  if (meta.context !== "menu") return option.label;

  return (
    <div style={{ display: "flex" }}>
      <div
        style={{
          width: BRANCH_COL_WIDTH,
          flexShrink: 0,
          boxSizing: "border-box",
          padding: "6px 8px",
          borderRight: "1px solid #e3e8ef",
        }}
      >
        {option.label}
      </div>
      <div style={{ flex: 1, padding: "6px 8px" }}>{option.value}</div>
    </div>
  );
};

const branchStyles: StylesConfig<Option, false> = {
  ...selectStyles,
  menu: (base, state) => ({
    ...selectStyles.menu!(base, state),
    width: 220,
    minWidth: 220,
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
    cursor: "pointer",
    backgroundColor: state.isSelected
      ? "#cdeedd"
      : state.isFocused
        ? "#e6f6ee"
        : "#ffffff",
  }),
};

const branchComponents = {
  ...selectComponents,
  DropdownIndicator: SelectDropdownIndicator,
  MenuList: BranchMenuList,
};

// ============================================================
// TYPE LOOKUP MENU (two columns: Type | Name, gray header row)
// ============================================================

const TYPE_COL_WIDTH = 70;

const TYPE_NAMES: Record<string, string> = { R: "CREDIT", C: "CASH" };

// this screen is Sales Invoice (Credit), so only R is offered by default
const defaultInvoiceTypes: Option[] = [{ value: "R", label: "R" }];

const TypeMenuList = (props: MenuListProps<Option, false>) => (
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
          width: TYPE_COL_WIDTH,
          flexShrink: 0,
          boxSizing: "border-box",
          padding: "5px 8px",
          borderRight: "1px solid #cfcfcf",
        }}
      >
        Type
      </div>
      <div style={{ flex: 1, padding: "5px 8px" }}>Name</div>
    </div>
    {props.children}
  </components.MenuList>
);

// menu rows show Type | Name; the control shows only the type letter
const formatType = (option: Option, meta: FormatOptionLabelMeta<Option>) => {
  if (meta.context !== "menu") return option.label;

  return (
    <div style={{ display: "flex" }}>
      <div
        style={{
          width: TYPE_COL_WIDTH,
          flexShrink: 0,
          boxSizing: "border-box",
          padding: "6px 8px",
          borderRight: "1px solid #e3e8ef",
        }}
      >
        {option.value}
      </div>
      <div style={{ flex: 1, padding: "6px 8px" }}>
        {TYPE_NAMES[option.value] ?? option.label}
      </div>
    </div>
  );
};

const typeStyles: StylesConfig<Option, false> = {
  ...branchStyles,
  menu: (base, state) => ({
    ...branchStyles.menu!(base, state),
    width: 200,
    minWidth: 200,
  }),
};

const typeComponents = {
  ...selectComponents,
  MenuList: TypeMenuList,
};

// ============================================================
// CUSTOMER LOOKUP MENUS (same look as the Supplier dropdowns
// in the purchase invoice form)
// ============================================================

const CUSTOMER_ID_COL_WIDTH = 146;
const CUSTOMER_NAME_COL_WIDTH = 300;

/* gray sticky header row at the top of the menu */
const createCustomerMenuList = (
  firstTitle: string,
  secondTitle: string,
  firstWidth: number,
) => {
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
            width: firstWidth,
            flexShrink: 0,
            boxSizing: "border-box",
            padding: "5px 8px",
            borderRight: "1px solid #cfcfcf",
          }}
        >
          {firstTitle}
        </div>
        <div style={{ flex: 1, padding: "5px 8px" }}>{secondTitle}</div>
      </div>
      {props.children}
    </components.MenuList>
  );
  return MenuList;
};

const customerIdMenuComponents = {
  ...selectComponents,
  DropdownIndicator: SelectDropdownIndicator,
  MenuList: createCustomerMenuList(
    "Customer ID",
    "Customer Name",
    CUSTOMER_ID_COL_WIDTH,
  ),
};

const customerNameMenuComponents = {
  ...selectComponents,
  DropdownIndicator: SelectDropdownIndicator,
  MenuList: createCustomerMenuList(
    "Customer Name",
    "Customer ID",
    CUSTOMER_NAME_COL_WIDTH,
  ),
};

/* two-column row renderer; the control itself shows only its own label */
const renderCustomerRow = (
  first: string,
  second: string,
  firstWidth: number,
) => (
  <div style={{ display: "flex" }}>
    <div
      style={{
        width: firstWidth,
        flexShrink: 0,
        boxSizing: "border-box",
        padding: "6px 8px",
        borderRight: "1px solid #e3e8ef",
      }}
    >
      {first}
    </div>
    <div style={{ flex: 1, padding: "6px 8px" }}>{second}</div>
  </div>
);

const lookupMenuStyles: StylesConfig<Option, false> = {
  menuPortal: (base) => ({ ...base, zIndex: 999999 }),
  menu: (base) => ({
    ...base,
    zIndex: 999999,
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
    cursor: "pointer",
    backgroundColor: state.isSelected
      ? "#cdeedd"
      : state.isFocused
        ? "#e6f6ee"
        : "#ffffff",
  }),
};

/* menu starts at its own select and ends at the right edge of the box
   with the given id (the paired name select) */
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
      zIndex: 999999,
      width: right ? Math.max(right - Number(base.left), 240) : 480,
    };
  },
  menu: (base, state) => ({
    ...lookupMenuStyles.menu!(base, state),
    width: "100%",
    minWidth: 0,
  }),
});

/* menu exactly as wide as its own select */
const fullWidthMenuStyles: StylesConfig<Option, false> = {
  ...lookupMenuStyles,
  menu: (base, state) => ({
    ...lookupMenuStyles.menu!(base, state),
    width: "100%",
    minWidth: 0,
  }),
};

const customerIdStyles: StylesConfig<Option, false> = {
  ...selectStyles,
  ...spanMenuStyles("customerNameBox"),
};

const customerNameStyles: StylesConfig<Option, false> = {
  ...selectStyles,
  ...fullWidthMenuStyles,
};

// ============================================================
// INPUT STYLE
// ============================================================

const inputClass =
  "h-[30px] border border-[#d7dee7] rounded-[4px] bg-white px-2 text-[14px] text-[#334155] outline-none hover:border-[#aebdce] focus:border-[#9fdfbc] focus:shadow-[0_0_0_1px_#9fdfbc]";

// ============================================================
// DATE PICKER STYLE
// ============================================================

const datePickerSx: SxProps<Theme> = {
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

  "& .MuiPickersOutlinedInput-notchedOutline": {
    borderColor: `${BORDER_COLOR} !important`,
  },

  "& .MuiPickersInputBase-root:hover .MuiPickersOutlinedInput-notchedOutline": {
    borderColor: `${BORDER_HOVER_COLOR} !important`,
  },

  "& .MuiPickersInputBase-root.Mui-focused .MuiPickersOutlinedInput-notchedOutline":
    {
      borderColor: `${BORDER_FOCUS_COLOR} !important`,
      borderWidth: "1px",
    },

  "& .MuiPickersInputBase-root.Mui-error .MuiPickersOutlinedInput-notchedOutline":
    {
      borderColor: `${BORDER_COLOR} !important`,
    },

  "& .MuiPickersInputBase-root.Mui-error:hover .MuiPickersOutlinedInput-notchedOutline":
    {
      borderColor: `${BORDER_HOVER_COLOR} !important`,
    },

  "& .MuiPickersInputBase-root.Mui-error.Mui-focused .MuiPickersOutlinedInput-notchedOutline":
    {
      borderColor: `${BORDER_FOCUS_COLOR} !important`,
    },
};

const labelClass =
  "w-20 shrink-0 text-right text-[14px] text-[#202020] whitespace-nowrap";

const rightLabelClass =
  "w-22.5 shrink-0 whitespace-nowrap text-right text-[14px] text-[#202020]";

// ============================================================
// ENTER KEY ORDER
// Invoice No -> Type -> Date -> Customer ID -> Customer Name
// -> Invoice To -> Phone -> Reference -> first row of the item table
// ============================================================

const FIELD_ORDER = [
  "txtDocNo",
  "lkpType",
  "dtpDate",
  "lkpCustomerID",
  "lkpCustomerName",
  "txtInvoiceTo",
  "txtPhone",
  "txtReference",
];

// the date picker is made of editable sections, so find the first one
const getFieldElement = (fieldId: string): HTMLElement | null => {
  if (fieldId === "dtpDate") {
    return document.querySelector<HTMLElement>(
      '#dtpDateBox [role="spinbutton"], #dtpDateBox input',
    );
  }
  return document.getElementById(fieldId);
};

/* focus the next (or previous) enabled field in FIELD_ORDER */
const focusField = (fromId: string, step: 1 | -1): boolean => {
  const index = FIELD_ORDER.indexOf(fromId);

  for (let i = index + step; i >= 0 && i < FIELD_ORDER.length; i += step) {
    const el = getFieldElement(FIELD_ORDER[i]) as HTMLInputElement | null;

    if (el && !el.disabled) {
      el.focus();
      if (el.tagName === "INPUT" && el.type === "text" && !el.readOnly) {
        el.select();
      }
      return true;
    }
  }

  return false;
};

/* after the last field, Enter jumps into the first item row */
const focusTable = () => {
  document.getElementById("lkpItemID-0")?.focus();
};

// ============================================================
// COMPONENT
// ============================================================

const SalesInvoiceHeader: React.FC<SalesInvoiceHeaderProps> = ({
  branchOptions,
  branch,
  onBranchChange,
  branchLoading,
  branchError,
  header,
  onHeaderChange,
  customers,
  onCustomerSelect,
  onDocNoBlur,
  invoiceTypes = defaultInvoiceTypes,
  readOnly,
}) => {
  // ==========================================================
  // LOOKUP OPTIONS
  // ==========================================================

  const customerIdOptions = useMemo<Option[]>(
    () => customers.map((c) => ({ value: c.id, label: c.id })),
    [customers],
  );

  const customerNameOptions = useMemo<Option[]>(
    () => customers.map((c) => ({ value: c.id, label: c.name })),
    [customers],
  );

  // selected values (fall back to the saved invoice's customer if it is
  // not in the lookup list)
  const customerIdValue: Option | null = header.customerId
    ? (customerIdOptions.find((o) => o.value === header.customerId) ?? {
        value: header.customerId,
        label: header.customerId,
      })
    : null;

  const customerNameValue: Option | null = header.customerId
    ? (customerNameOptions.find((o) => o.value === header.customerId) ?? {
        value: header.customerId,
        label: header.customerName || header.customerId,
      })
    : null;

  const invoiceTypeValue: Option | null = header.invoiceType
    ? (invoiceTypes.find((o) => o.value === header.invoiceType) ?? {
        value: header.invoiceType,
        label: header.invoiceType,
      })
    : null;

  // ==========================================================
  // CUSTOMER LOOKUP HELPERS
  // ==========================================================

  // id -> name, so the ID dropdown can show the name column too
  const customerNameById = useMemo(
    () => new Map(customers.map((c) => [c.id, c.name])),
    [customers],
  );

  const formatCustomerId = (
    option: Option,
    meta: FormatOptionLabelMeta<Option>,
  ) =>
    meta.context !== "menu"
      ? option.label
      : renderCustomerRow(
          option.value,
          customerNameById.get(option.value) ?? "",
          CUSTOMER_ID_COL_WIDTH,
        );

  const formatCustomerName = (
    option: Option,
    meta: FormatOptionLabelMeta<Option>,
  ) =>
    meta.context !== "menu"
      ? option.label
      : renderCustomerRow(option.label, option.value, CUSTOMER_NAME_COL_WIDTH);

  // typing searches both the id and the name
  const filterCustomer = (option: { data: Option }, input: string): boolean => {
    const text = input.trim().toLowerCase();
    if (!text) return true;
    return (
      option.data.value.toLowerCase().includes(text) ||
      (customerNameById.get(option.data.value) ?? "")
        .toLowerCase()
        .includes(text)
    );
  };

  // ==========================================================
  // INITIAL FOCUS: cursor starts in Invoice No. when the page loads
  // ==========================================================

  useEffect(() => {
    document.getElementById("txtDocNo")?.focus();
  }, []);

  // ==========================================================
  // ENTER KEY: next field, Shift+Enter: previous field
  // ==========================================================

  const handleKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    if (e.key !== "Enter") return;

    const target = e.target as HTMLElement;

    // work out which field the key was pressed in
    let fieldId = target.id;
    if (!FIELD_ORDER.includes(fieldId)) {
      if (target.closest("#dtpDateBox")) {
        fieldId = "dtpDate";
      } else {
        return; // button, branch select, date popup, ...
      }
    }

    const step = e.shiftKey ? -1 : 1;

    // Enter that just picked an option from an open dropdown:
    // wait one tick so the selection is applied before moving on
    const pickedOption =
      e.defaultPrevented && target.getAttribute("aria-expanded") === "true";

    if (pickedOption) {
      setTimeout(() => {
        if (!focusField(fieldId, step) && step === 1) focusTable();
      }, 0);
      return;
    }

    if (e.defaultPrevented) return;

    e.preventDefault();

    if (!focusField(fieldId, step) && step === 1) {
      focusTable();
    }
  };

  const menuPortalTarget =
    typeof document !== "undefined" ? document.body : undefined;

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="w-full shrink-0" onKeyDown={handleKeyDown}>
      {/* ======================================================
          TITLE
      ====================================================== */}

      <div className="flex h-9 items-center border-b border-slate-300 bg-[#a3dfc0]">
        <span className="px-2 text-[17px] font-semibold text-slate-700">
          Sales Invoice
        </span>
      </div>

      {/* ======================================================
          HEADER AREA
      ====================================================== */}

      <div className="w-full px-3 pt-3 mb-3">
        {/* ----------------------------------------------------
            ROW 1: BRANCH + INVOICE NO + TYPE + DATE
        ----------------------------------------------------- */}

        <div className="mb-2.5 flex h-7.5 items-center">
          {/* Branch */}
          <label htmlFor="lkpBranch" className={labelClass}>
            Branch :
          </label>

          <div className="ml-2 w-55">
            <Select<Option, false>
              inputId="lkpBranch"
              instanceId="lkpBranch"
              options={branchOptions}
              value={branch}
              onChange={onBranchChange}
              styles={branchStyles}
              components={branchComponents}
              formatOptionLabel={formatBranch}
              isClearable={false}
              isSearchable={false}
              isLoading={branchLoading}
              isDisabled={readOnly}
              placeholder={branchLoading ? "Loading..." : "Select branch"}
              noOptionsMessage={() => branchError ?? "No branches found"}
              menuPosition="fixed"
              menuPortalTarget={menuPortalTarget}
            />
          </div>

          {/* Invoice No */}
          <label
            htmlFor="txtDocNo"
            className="ml-8 shrink-0 whitespace-nowrap text-right text-[14px] text-[#202020]"
          >
            Invoice No. :
          </label>

          <input
            id="txtDocNo"
            type="text"
            maxLength={15}
            autoComplete="off"
            value={header.docNo}
            onChange={(e) => onHeaderChange({ docNo: e.target.value })}
            onBlur={onDocNoBlur}
            className={`${inputClass} ml-2 w-40`}
          />

          {/* Type */}
          <label
            htmlFor="lkpType"
            className="ml-4 mr-2 shrink-0 whitespace-nowrap text-[14px] text-[#202020]"
          >
            Type :
          </label>

          <div className="w-22">
            <Select<Option, false>
              inputId="lkpType"
              instanceId="lkpType"
              options={invoiceTypes}
              value={invoiceTypeValue}
              onChange={(option) =>
                onHeaderChange({ invoiceType: option?.value ?? "" })
              }
              styles={typeStyles}
              components={typeComponents}
              formatOptionLabel={formatType}
              isClearable={false}
              isSearchable={false}
              isDisabled={readOnly}
              menuPosition="fixed"
              menuPortalTarget={menuPortalTarget}
            />
          </div>

          {/* Date */}
          <label
            htmlFor="dtpDate"
            className="ml-4 mr-2 shrink-0 whitespace-nowrap text-[14px] text-[#202020]"
          >
            Date :
          </label>

          <div id="dtpDateBox">
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DatePicker
                value={header.date ? dayjs(header.date, "YYYY-MM-DD") : null}
                onChange={(newValue) => {
                  if (newValue === null) {
                    onHeaderChange({ date: "" });
                  } else if (newValue.isValid()) {
                    onHeaderChange({ date: newValue.format("YYYY-MM-DD") });
                  }
                  // partially typed dates are ignored until valid
                }}
                format="DD-MM-YYYY"
                disabled={readOnly}
                slotProps={{
                  textField: { id: "dtpDate" },
                  openPickerButton: { sx: { padding: "2px", margin: 0 } },
                  inputAdornment: { sx: { margin: 0, padding: 0 } },
                }}
                sx={datePickerSx}
              />
            </LocalizationProvider>
          </div>
        </div>

        {/* ----------------------------------------------------
            ROWS 2+: CUSTOMER / ADDRESS / PHONE  |  REFERENCE / STOCK
        ----------------------------------------------------- */}

        <div className="grid grid-cols-[56%_44%]">
          {/* ==================================================
              LEFT SIDE
          ================================================== */}

          <div className="pr-3.75">
            {/* CUSTOMER */}
            <div className="mb-2.5 flex h-7.5 items-center gap-2 w-200 min-w-[600]">
              <label className={labelClass}>Customer :</label>

              {/* Customer ID */}
              <div className="w-35">
                <Select<Option, false>
                  inputId="lkpCustomerID"
                  instanceId="lkpCustomerID"
                  options={customerIdOptions}
                  value={customerIdValue}
                  components={customerIdMenuComponents}
                  formatOptionLabel={formatCustomerId}
                  filterOption={filterCustomer}
                  onChange={(option) =>
                    option && onCustomerSelect(option.value)
                  }
                  styles={customerIdStyles}
                  isClearable={false}
                  isSearchable
                  isDisabled={readOnly}
                  placeholder=""
                  menuPosition="fixed"
                  menuPortalTarget={menuPortalTarget}
                />
              </div>

              {/* Customer Name */}
              <div id="customerNameBox" className="-ml-1.25 w-117.5 min-w-75">
                <Select<Option, false>
                  inputId="lkpCustomerName"
                  instanceId="lkpCustomerName"
                  options={customerNameOptions}
                  value={customerNameValue}
                  components={customerNameMenuComponents}
                  formatOptionLabel={formatCustomerName}
                  filterOption={filterCustomer}
                  onChange={(option) =>
                    option && onCustomerSelect(option.value)
                  }
                  styles={customerNameStyles}
                  isClearable={false}
                  isSearchable
                  isDisabled={readOnly}
                  placeholder=""
                  menuPosition="fixed"
                  menuPortalTarget={menuPortalTarget}
                />
              </div>
            </div>

            {/* INVOICE TO */}
            <div className="mb-2.5 flex h-7.5 items-center gap-2">
              <label htmlFor="txtInvoiceTo" className={labelClass}>
                Invoice To :
              </label>

              <input
                id="txtInvoiceTo"
                type="text"
                maxLength={150}
                autoComplete="off"
                disabled={readOnly}
                value={header.address}
                onChange={(e) => onHeaderChange({ address: e.target.value })}
                className={`${inputClass} w-107.5`}
              />
            </div>

            {/* PHONE */}
            <div className="flex h-7.5 items-center gap-2">
              <label htmlFor="txtPhone" className={labelClass}>
                Phone :
              </label>

              <input
                id="txtPhone"
                type="text"
                maxLength={50}
                autoComplete="off"
                disabled={readOnly}
                value={header.phone}
                onChange={(e) => onHeaderChange({ phone: e.target.value })}
                className={`${inputClass} w-55`}
              />
            </div>
          </div>

          {/* ==================================================
              RIGHT SIDE
          ================================================== */}

          <div className="right-side ml-auto w-fit pl-1">
            {/* REFERENCE */}
            <div className="mb-2.5 flex h-7.5 items-center">
              <label htmlFor="txtReference" className={rightLabelClass}>
                Reference :
              </label>

              <input
                id="txtReference"
                type="text"
                maxLength={30}
                autoComplete="off"
                disabled={readOnly}
                value={header.customerRef}
                onChange={(e) =>
                  onHeaderChange({ customerRef: e.target.value })
                }
                className={`${inputClass} ml-1.75 w-90`}
              />
            </div>

            {/* STOCK BUTTON + STOCK */}
            <div className="flex h-7.5 items-center">
              <button
                id="BranchStockbtn"
                type="button"
                className="
                  ml-3.25
                  h-7.5
                  w-26.25
                  border
                  border-[#cbd5e1]
                  bg-[#eeeeee]
                  px-2
                  text-[12px]
                  text-[#202020]
                  shadow-sm
                  hover:bg-[#e5e5e5]
                "
              >
                Stock
              </button>

              <label className={rightLabelClass}>Stock :</label>

              <input
                id="txtStock"
                type="text"
                value="0"
                readOnly
                className={`${inputClass} ml-1.75 w-19 text-center`}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalesInvoiceHeader;
