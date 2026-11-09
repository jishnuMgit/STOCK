import React, { useMemo } from "react";
import Select, { type StylesConfig } from "react-select";
import type {
  ParamLookup,
  SalesHeader,
  SalesTotals,
  SalesUserInfo,
} from "../../../hooks/useSalesInvoice"; // adjust path to your hook

// ============================================================
// TYPES
// ============================================================

type Option = {
  value: string;
  label: string;
};

type SalesInvoiceFooterProps = {
  header: SalesHeader;
  totals: SalesTotals;
  sums: { qty: number; disc: number; vat: number; total: number };
  discTypes: ParamLookup[];
  mode: "S" | "M";
  posted: boolean;
  busy: boolean;
  userInfo: SalesUserInfo | null;

  onNoteChange: (note: string) => void;
  onDiscTypeChange: (type: "A" | "P") => void;
  onDiscPerChange: (value: string) => void;
  onDiscAmtChange: (value: string) => void;
  onDiscCommit: () => void;

  onSave: () => void;
  onDelete: () => void;
  onPrint: () => void;
  onPost: () => void;
  onClear: () => void;
};

// ============================================================
// FALLBACK OPTIONS (used until the lookup is loaded)
// ============================================================

const fallbackDiscountTypes: Option[] = [
  { value: "A", label: "A" },
  { value: "P", label: "P" },
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
  "h-[30px] border border-[#cbd5e1] rounded-[4px] bg-white px-2 text-[14px] text-[#202020] outline-none focus:border-blue-400 focus:bg-blue-50";

const readOnlyInputClass = `${inputClass} bg-[#f8fafc]`;

const btnClass = "btn-style disabled:cursor-not-allowed disabled:opacity-50";

const fmt = (v: number, d = 2) => v.toFixed(d);

// ============================================================
// SALES INVOICE FOOTER
// ============================================================

const SalesInvoiceFooter: React.FC<SalesInvoiceFooterProps> = ({
  header,
  totals,
  sums,
  discTypes,
  mode,
  posted,
  busy,
  userInfo,
  onNoteChange,
  onDiscTypeChange,
  onDiscPerChange,
  onDiscAmtChange,
  onDiscCommit,
  onSave,
  onDelete,
  onPrint,
  onPost,
  onClear,
}) => {
  const discountTypeOptions = useMemo<Option[]>(
    () =>
      discTypes.length > 0
        ? discTypes.map((d) => ({ value: d.id, label: d.id }))
        : fallbackDiscountTypes,
    [discTypes],
  );

  const discountTypeValue =
    discountTypeOptions.find((o) => o.value === header.discType) ?? null;

  // only the field that matches the discount type can be typed in
  const isPercent = header.discType === "P";

  // accept digits and one decimal point only
  const numeric = (value: string, set: (v: string) => void) => {
    if (value === "" || /^\d*\.?\d*$/.test(value)) set(value);
  };

  const userText = userInfo
    ? [
        userInfo.savedBy &&
          `Saved By : ${userInfo.savedBy} ${userInfo.savedAt}`.trim(),
        userInfo.modifiedBy &&
          `Last Modified By : ${userInfo.modifiedBy} ${userInfo.modifiedAt}`.trim(),
        userInfo.postOrder > 0 && `Txn. # : ${userInfo.postOrder}`,
        posted && "POSTED",
      ]
        .filter(Boolean)
        .join("   |   ")
    : "";

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
          className="mr-[7px] whitespace-nowrap text-[14px] text-[#202020]"
        >
          Discount Type :
        </label>

        {/* React Select */}

        <div className="w-[85px]">
          <Select<Option, false>
            inputId="lkpDiscountType"
            instanceId="lkpDiscountType"
            options={discountTypeOptions}
            value={discountTypeValue}
            onChange={(option) =>
              option && onDiscTypeChange(option.value === "P" ? "P" : "A")
            }
            styles={selectStyles}
            isClearable={false}
            isSearchable={false}
            isDisabled={posted}
            menuPosition="fixed"
            menuPortalTarget={
              typeof document !== "undefined" ? document.body : undefined
            }
          />
        </div>

        {/* Discount % */}

        <input
          id="txtDiscount"
          type="text"
          inputMode="decimal"
          autoComplete="off"
          aria-label="Discount percent"
          readOnly={posted || !isPercent}
          value={header.discPer}
          onChange={(e) => numeric(e.target.value, onDiscPerChange)}
          onBlur={onDiscCommit}
          className={`${isPercent && !posted ? inputClass : readOnlyInputClass} ml-[9px] w-[65px] text-right`}
        />

        {/* Discount amount */}

        <input
          id="txtDiscountAmount"
          type="text"
          inputMode="decimal"
          autoComplete="off"
          aria-label="Discount amount"
          readOnly={posted || isPercent}
          value={header.discAmt}
          onChange={(e) => numeric(e.target.value, onDiscAmtChange)}
          onBlur={onDiscCommit}
          className={`${!isPercent && !posted ? inputClass : readOnlyInputClass} ml-[9px] w-[65px] text-right`}
        />
      </div>

      {/* ======================================================
          TOTAL
      ====================================================== */}

      <div className="absolute left-[668px] top-[8px] flex h-[30px] items-center">
        <label className="mr-[7px] whitespace-nowrap text-[14px] text-[#202020]">
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
          readOnly
          value={fmt(sums.qty, 3)}
          className={`${readOnlyInputClass} ml-[5px] w-[65px] text-right`}
        />
      </div>

      {/* ======================================================
          EXTRA TOTAL VALUES (discount / VAT / total price)
      ====================================================== */}

      <div className="absolute right-[10px] top-[8px] flex h-[30px] items-center gap-[5px]">
        <input
          id="txtTotalValue1"
          type="text"
          readOnly
          value={fmt(sums.disc, 3)}
          className={`${readOnlyInputClass} w-[70px] text-right`}
        />

        <input
          id="txtTotalValue2"
          type="text"
          readOnly
          value={fmt(sums.vat, 3)}
          className={`${readOnlyInputClass} w-[70px] text-right`}
        />

        <input
          id="txtTotalValue3"
          type="text"
          readOnly
          value={fmt(sums.total, 3)}
          className={`${readOnlyInputClass} w-[90px] text-right`}
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
            className="w-[110px] whitespace-nowrap text-right text-[14px] text-[#202020]"
          >
            Total Amt. :
          </label>

          <input
            id="txtTotalAmt"
            type="text"
            readOnly
            value={fmt(totals.netDocAmtWoVAT)}
            className={`${readOnlyInputClass} ml-[7px] w-[125px] text-right`}
          />
        </div>

        {/* VAT AMOUNT */}

        <div className="mb-[6px] flex h-[30px] items-center">
          <label
            htmlFor="txtVATAmt"
            className="w-[110px] whitespace-nowrap text-right text-[14px] text-[#202020]"
          >
            VAT Amt. ({header.vatPer}%) :
          </label>

          <input
            id="txtVATAmt"
            type="text"
            readOnly
            value={fmt(totals.vatAmt)}
            className={`${readOnlyInputClass} ml-[7px] w-[125px] text-right`}
          />
        </div>

        {/* NET AMOUNT */}

        <div className="mb-[6px] flex h-[30px] items-center">
          <label
            htmlFor="txtNetAmt"
            className="w-[110px] whitespace-nowrap text-right text-[14px] text-[#202020]"
          >
            Net Amt. :
          </label>

          <input
            id="txtNetAmt"
            type="text"
            readOnly
            value={fmt(totals.netDocAmt)}
            className={`${readOnlyInputClass} ml-[7px] w-[125px] text-right`}
          />
        </div>

        {/* PAID AMOUNT (credit invoice: nothing paid at invoicing) */}

        <div className="flex h-[30px] items-center">
          <label
            htmlFor="txtPaidAmt"
            className="w-[110px] whitespace-nowrap text-right text-[14px] text-[#202020]"
          >
            Paid Amt. :
          </label>

          <input
            id="txtPaidAmt"
            type="text"
            readOnly
            value="0.00"
            className={`${readOnlyInputClass} ml-[7px] w-[125px] text-right`}
          />
        </div>
      </div>

      {/* ======================================================
          NOTE
      ====================================================== */}

      <div className="absolute left-[7px] top-[43px] flex h-[30px] items-center">
        <label
          htmlFor="txtNote"
          className="mr-[15px] whitespace-nowrap text-[14px] text-[#202020]"
        >
          Note :
        </label>

        <input
          id="txtNote"
          type="text"
          maxLength={100}
          autoComplete="off"
          disabled={posted}
          value={header.note}
          onChange={(e) => onNoteChange(e.target.value)}
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
          className={btnClass}
          disabled={busy || posted}
          onClick={onSave}
        >
          {mode === "M" ? (
            <>
              <u>M</u>odify
            </>
          ) : (
            <>
              <u>S</u>ave
            </>
          )}
        </button>

        <button
          id="btnDelete"
          type="button"
          className={btnClass}
          disabled={busy || posted || mode !== "M"}
          onClick={onDelete}
        >
          <u>D</u>elete
        </button>

        <button
          id="btnPrint"
          type="button"
          className={btnClass}
          disabled={busy || mode !== "M"}
          onClick={onPrint}
        >
          <u>P</u>rint
        </button>

        {/* <button
          id="btnPost"
          type="button"
          className={btnClass}
          disabled={busy || posted || mode !== "M"}
          onClick={onPost}
        >
          <u>P</u>ost
        </button> */}

        <button
          id="btnClear"
          type="button"
          className={btnClass}
          disabled={busy}
          onClick={onClear}
        >
          <u>C</u>lear
        </button>
      </div>

      {/* ======================================================
          USER INFO (VB lblUserInfo)
      ====================================================== */}

      {userText && (
        <div className="absolute bottom-[2px] left-[7px] text-[11px] text-slate-500">
          {userText}
        </div>
      )}
    </footer>
  );
};

export default SalesInvoiceFooter;
