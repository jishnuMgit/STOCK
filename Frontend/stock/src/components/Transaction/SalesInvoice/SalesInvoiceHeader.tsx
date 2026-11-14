import React, { useEffect, useMemo } from "react";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import type { SxProps, Theme } from "@mui/material/styles";
import type {
  CustomerLookup,
  Option,
  ParamLookup,
  SalesHeader,

} from "../../../hooks/useSalesInvoice";

import Header from "../../common/Header";
import CommonTableSelect from "../../common/CommonTableSelect";
import CustomLinkedPairSelect, {
  type PairSelectOption,
} from "../../common/CustomLinkedPairSelect";

dayjs.extend(customParseFormat);

// ============================================================
// PROPS
// ============================================================

/* invoice type option: value/label plus the name from the server (fPName) */
type TypeOption = Option & { name?: string };

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
  invoiceTypes?: TypeOption[];
  stock: number;
  onStockClick: () => void;
  readOnly: boolean; // posted invoice
};

const BORDER_COLOR = "#d7dee7";
const BORDER_HOVER_COLOR = "#aebdce";
const BORDER_FOCUS_COLOR = "#9fdfbc";

// fallback names when the server sends no name
const TYPE_NAMES: Record<string, string> = { R: "CREDIT", C: "CASH" };

// this screen is Sales Invoice (Credit), so only R is offered by default
const defaultInvoiceTypes: TypeOption[] = [{ value: "R", label: "R" }];
const branchColumns = [
  { key: "label", label: "Branch" },
  { key: "value", label: "ID", width: "70px", align: "right" as const },
];
const typeColumns = [
  { key: "value", label: "Type", width: "70px" },
  { key: "name", label: "Name" },
];

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
// -> Address -> Phone -> Reference -> first row of the item table
// ============================================================

const FIELD_ORDER = [
  "txtDocNo",
  "lkpType",
  "dtpDate",
  "lkpCustomerID",
  "lkpCustomerName",
  "txtAddress",
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
  stock,
  onStockClick,
  readOnly,
}) => {
  // ==========================================================
  // LOOKUP OPTIONS
  // ==========================================================

  const customerPairOptions = useMemo<PairSelectOption[]>(() => {
    const options = customers.map((customer) => ({
      value: customer.id,
      firstLabel: customer.id,
      secondLabel: customer.name,
    }));

    if (
      header.customerId &&
      !options.some((option) => option.value === header.customerId)
    ) {
      options.push({
        value: header.customerId,
        firstLabel: header.customerId,
        secondLabel: header.customerName || header.customerId,
      });
    }

    return options;
  }, [customers, header.customerId, header.customerName]);


  const invoiceTypeTableOptions = useMemo(
    () =>
      invoiceTypes.map((option) => ({
        ...option,
        name: option.name || TYPE_NAMES[option.value] || option.label,
      })),
    [invoiceTypes],
  );

  const invoiceTypeValue = header.invoiceType
    ? (invoiceTypeTableOptions.find(
      (option) => option.value === header.invoiceType,
    ) ?? {
      value: header.invoiceType,
      label: header.invoiceType,
      name: TYPE_NAMES[header.invoiceType] ?? header.invoiceType,
    })
    : null;

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

      <Header Name="Sales Invoice" />

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
            <CommonTableSelect
              inputId="lkpBranch"
              options={branchOptions}
              value={branch}
              onChange={onBranchChange}
              columns={branchColumns}
              width="220px"
              menuWidth="220px"
              headerFontSize="14px"
              isClearable={false}
              isSearchable={false}
              isLoading={branchLoading}
              isDisabled={readOnly}
              placeholder={branchLoading ? "Loading..." : "Select branch"}
              noOptionsMessage={() => branchError ?? "No branches found"}
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
            <CommonTableSelect
              inputId="lkpType"
              options={invoiceTypeTableOptions}
              value={invoiceTypeValue}
              onChange={(option) =>
                onHeaderChange({ invoiceType: option?.value ?? "" })
              }
              columns={typeColumns}
              width="88px"
              menuWidth="200px"
              headerFontSize="14px"
              isClearable={false}
              isSearchable={false}
              isDisabled={readOnly}
              menuPortalTarget={menuPortalTarget}
            />
          </div>

          {/* Date */}
          <div className="ml-auto flex items-center justify-center">
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
              <CustomLinkedPairSelect
                firstInputId="lkpCustomerID"
                secondInputId="lkpCustomerName"
                options={customerPairOptions}
                firstValue={header.customerId || null}
                secondValue={header.customerId || null}
                firstHeader="Customer ID"
                secondHeader="Customer Name"
                firstWidth={140}
                secondWidth={470}
                gap={4}
                headerFontSize="14px"
                isSearchable
                isDisabled={readOnly}
                menuPortalTarget={menuPortalTarget}
                onChange={(option) => {
                  if (option) onCustomerSelect(option.value);
                }}
              />
            </div>

            {/* ADDRESS */}
            <div className="mb-2.5 flex h-7.5 items-center gap-2">
              <label htmlFor="txtAddress" className={labelClass}>
                Address :
              </label>

              <input
                id="txtAddress"
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
                inputMode="numeric"
                maxLength={50}
                autoComplete="off"
                disabled={readOnly}
                value={header.phone}
                onChange={(e) =>
                  onHeaderChange({ phone: e.target.value.replace(/\D/g, "") })
                }
                onPaste={(e) => {
                  e.preventDefault();
                  const digits = e.clipboardData
                    .getData("text")
                    .replace(/\D/g, "");
                  const el = e.currentTarget;
                  const start = el.selectionStart ?? header.phone.length;
                  const end = el.selectionEnd ?? header.phone.length;
                  const next = (
                    header.phone.slice(0, start) +
                    digits +
                    header.phone.slice(end)
                  ).slice(0, 50);
                  onHeaderChange({ phone: next });
                }}
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
                onClick={onStockClick}
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
                value={String(stock)}
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
