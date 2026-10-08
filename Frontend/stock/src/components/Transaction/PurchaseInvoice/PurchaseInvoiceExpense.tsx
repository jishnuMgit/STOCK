import React, { useState } from "react";
import Select, { type StylesConfig } from "react-select";
import { Play, X } from "lucide-react";

// ============================================================
// TYPES
// ============================================================

type Option = {
  value: string;
  label: string;
};

type PurchaseExpenseRow = {
  accountId: Option | null;
  accountName: Option | null;
  ccid: Option | null;
  currency: Option | null;
  currencyRate: string;
  amount: string;
  amountSAR: string;
  description: string;
};

// ============================================================
// CONSTANTS
// ============================================================

const ROW_COUNT = 12;

const accountOptions: Option[] = [];
const ccidOptions: Option[] = [];
const currencyOptions: Option[] = [];

// ============================================================
// CREATE ROW
// ============================================================

const createRow = (): PurchaseExpenseRow => ({
  accountId: null,
  accountName: null,
  ccid: null,
  currency: null,
  currencyRate: "",
  amount: "",
  amountSAR: "",
  description: "",
});

const createRows = (): PurchaseExpenseRow[] =>
  Array.from({ length: ROW_COUNT }, createRow);

// ============================================================
// SELECT STYLES
// ============================================================

const selectStyles: StylesConfig<Option, false> = {
  control: (base, state) => ({
    ...base,
    minHeight: 20,
    height: 20,
    width: "100%",
    border: "none",
    borderRadius: 0,
    boxShadow: "none",
    backgroundColor: state.isFocused ? "#eff6ff" : "transparent",
    cursor: "pointer",
    fontSize: 11,

    "&:hover": {
      border: "none",
    },
  }),

  valueContainer: (base) => ({
    ...base,
    minHeight: 20,
    height: 20,
    padding: "0 4px",
    overflow: "hidden",
  }),

  singleValue: (base) => ({
    ...base,
    color: "#263449",
    margin: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  }),

  placeholder: (base) => ({
    ...base,
    margin: 0,
    color: "#64748b",
  }),

  input: (base) => ({
    ...base,
    margin: 0,
    padding: 0,
    color: "#263449",
  }),

  indicatorsContainer: (base) => ({
    ...base,
    height: 20,
  }),

  dropdownIndicator: (base) => ({
    ...base,
    padding: "0 1px",
    color: "#677385",

    "&:hover": {
      color: "#334155",
    },
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
    padding: "5px 8px",
    fontSize: 11,
    color: "#263449",

    backgroundColor: state.isSelected
      ? "#dbeafe"
      : state.isFocused
        ? "#eff6ff"
        : "#fff",

    cursor: "pointer",
  }),
};

// ============================================================
// INPUT CLASS
// ============================================================

const inputClass =
  "h-[20px] w-full min-w-0 border-0 bg-transparent px-1 outline-none focus:bg-blue-50";

interface PurchaseExpenseProps {
  /** When set, the page is shown inside a popup and gets a close icon. */
  onClose?: () => void;
}

const PurchaseExpense: React.FC<PurchaseExpenseProps> = ({ onClose }) => {
  const [rows, setRows] = useState<PurchaseExpenseRow[]>(createRows);

  const [activeRow, setActiveRow] = useState(0);

  // ----------------------------------------------------------
  // UPDATE ROW
  // ----------------------------------------------------------

  const updateRow = <K extends keyof PurchaseExpenseRow>(
    index: number,
    field: K,
    value: PurchaseExpenseRow[K],
  ) => {
    setRows((previousRows) =>
      previousRows.map((row, rowIndex) =>
        rowIndex === index
          ? {
              ...row,
              [field]: value,
            }
          : row,
      ),
    );
  };

  // ----------------------------------------------------------
  // NUMBER CHANGE
  // ----------------------------------------------------------

  const handleNumberChange = (
    index: number,
    field: "currencyRate" | "amount" | "amountSAR",
    value: string,
  ) => {
    if (value !== "" && !/^\d*\.?\d*$/.test(value)) {
      return;
    }

    updateRow(index, field, value);
  };

  // ----------------------------------------------------------
  // FORMAT NUMBER
  // ----------------------------------------------------------

  const formatNumber = (value: string, decimals = 2) => {
    if (value.trim() === "") {
      return "";
    }

    const number = Number(value);

    if (!Number.isFinite(number)) {
      return "";
    }

    return number.toFixed(decimals);
  };

  // ----------------------------------------------------------
  // TOTAL
  // ----------------------------------------------------------

  const total = rows.reduce(
    (sum, row) => sum + (Number(row.amountSAR) || 0),
    0,
  );

  // ----------------------------------------------------------
  // TOTAL DISPLAY
  // ----------------------------------------------------------

  const totalDisplay = total.toFixed(2);

  // ----------------------------------------------------------
  // SELECT COMPONENT
  // ----------------------------------------------------------

  const renderSelect = (
    index: number,
    inputId: string,
    value: Option | null,
    options: Option[],
    onChange: (option: Option | null) => void,
    searchable = true,
  ) => (
    <Select<Option, false>
      inputId={`${inputId}-${index}`}
      instanceId={`${inputId}-${index}`}
      options={options}
      value={value}
      onChange={onChange}
      styles={selectStyles}
      isClearable={false}
      isSearchable={searchable}
      menuPosition="fixed"
      menuPortalTarget={
        typeof document !== "undefined" ? document.body : undefined
      }
      placeholder=""
      className="w-full"
    />
  );

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div
      className={
        onClose
          ? "w-full bg-white"
          : "flex min-h-screen w-full items-center justify-center bg-slate-100"
      }
    >
      <div className="flex w-full max-w-[1200px] flex-col overflow-hidden border border-slate-400 bg-white text-[12px] text-slate-800">
        <div className="flex w-full max-w-[1200px] flex-col overflow-hidden border border-slate-400 bg-white text-[12px] text-slate-800">
          <section className="flex min-h-0 w-full flex-col bg-white -mb-3">
            <div className="relative flex h-[30px] w-full shrink-0 items-center border-b border-slate-300 bg-[#a5e0c3]">
              <h1 className="ml-[20px] text-[17px] font-semibold text-slate-700">
                Purchase Expense
              </h1>

              {onClose && (
                <button
                  id="btnCloseExpense"
                  type="button"
                  title="Close"
                  aria-label="Close"
                  onClick={onClose}
                  className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white text-slate-500 shadow hover:bg-slate-100 hover:text-red-500 focus:outline-none"
                >
                  <X size={15} strokeWidth={2} />
                </button>
              )}
            </div>

            <div
              id="purchase-expense-table"
              className="mx-0 flex min-h-0 flex-1 flex-col overflow-hidden border-b-0 border border-[#dce5ef]"
            >
              <div className="customer-table-scroll min-h-0 flex-1 overflow-auto">
                <table className="w-full min-w-[1050px] table-fixed border-collapse text-[12px]">
                  {/* ------------------------------------------------
                COLUMN WIDTHS
            ------------------------------------------------ */}

                  <colgroup>
                    {/* <col style={{ width: "38px" }} />

              <col style={{ width: "150px" }} />

              <col style={{ width: "370px" }} />

              <col style={{ width: "60px" }} />

              <col style={{ width: "72px" }} />

              <col style={{ width: "100px" }} />

              <col style={{ width: "95px" }} /> */}

                    {/* <col style={{ width: "105px" }} /> */}

                    {/* <col style={{ width: "110px" }} /> */}
                  </colgroup>

                  {/* =================================================
                HEADER
            ================================================= */}

                  <thead>
                    <tr className="h-[32px]">
                      {/* Row indicator */}

                      <th
                        className="
                    sticky top-0 z-20
                    border border-[#dce5ef]
                    bg-[#f1f6fc]
                    p-0
                    w-[20px]
                  "
                      />

                      {/* Sl */}

                      <th
                        className="
                    sticky top-0 z-20
                    h-[32px]
                    whitespace-nowrap
                    border border-[#dce5ef]
                    bg-[#f1f6fc]
                    px-1 py-0
                    text-left
                    font-semibold
                    text-[#202a36]
                    w-[30px]
                  "
                      >
                        Sl.
                      </th>

                      {/* Account ID */}

                      <th
                        className="
                    sticky top-0 z-20
                    h-[32px]
                    whitespace-nowrap
                    border border-[#dce5ef]
                    bg-[#f1f6fc]
                    px-2 py-0
                    text-left
                    font-semibold
                    text-[#202a36]
                    w-[130px]
                  "
                        id="lkpAccountID"
                      >
                        Account ID
                      </th>

                      {/* Account Name */}

                      <th
                        className="
                    sticky top-0 z-20
                    h-[32px]
                    whitespace-nowrap
                    border border-[#dce5ef]
                    bg-[#f1f6fc]
                    px-2 py-0
                    text-left
                    font-semibold
                    text-[#202a36]
                    w-[350px]
                  "
                        id="lkpAccountName"
                      >
                        Account Name
                      </th>

                      {/* CCID */}

                      <th
                        className="
                    sticky top-0 z-20
                    h-[32px]
                    whitespace-nowrap
                    border border-[#dce5ef]
                    bg-[#f1f6fc]
                    px-1 py-0
                    text-center
                    font-semibold
                    text-[#202a36]
                    w-[60px]
                  "
                        id="lkpCCID"
                      >
                        CC.ID
                      </th>

                      {/* Currency */}

                      <th
                        className="
                    sticky top-0 z-20
                    h-[32px]
                    whitespace-nowrap
                    border border-[#dce5ef]
                    bg-[#f1f6fc]
                    px-1 py-0
                    text-left
                    font-semibold
                    text-[#202a36]
                    w-[100px]
                  "
                        id="lkpCurrency"
                      >
                        Currency
                      </th>

                      {/* Currency Rate */}

                      <th
                        className="
                    sticky top-0 z-20
                    h-[32px]
                    whitespace-nowrap
                    border border-[#dce5ef]
                    bg-[#f1f6fc]
                    px-1 py-0
                    text-left
                    font-semibold
                    text-[#202a36]
                    w-[100px]
                  "
                        id="lkpCurrencyRate"
                      >
                        Currency Rate
                      </th>

                      {/* Amount */}

                      <th
                        className="
                    sticky top-0 z-20
                    h-[32px]
                    whitespace-nowrap
                    border border-[#dce5ef]
                    bg-[#f1f6fc]
                    px-1 py-0
                    text-right
                    font-semibold
                    w-[100px]
                    text-[#202a36]
                  "
                        id="txtAmt"
                      >
                        Amount
                      </th>

                      {/* Amount SAR */}

                      <th
                        className="
                    sticky top-0 z-20
                    h-[32px]
                    whitespace-nowrap
                    border border-[#dce5ef]
                    bg-[#f1f6fc]
                    px-1 py-0
                    text-right
                    font-semibold
                    text-[#202a36]
                    w-[100px]
                  "
                        id="txtAmtSAR"
                      >
                        Amount SAR
                      </th>

                      {/* Description */}

                      <th
                        className="
                    sticky top-0 z-20
                    h-[32px]
                    whitespace-nowrap
                    border border-[#dce5ef]
                    bg-[#f1f6fc]
                    px-1 py-0
                    text-left
                    font-semibold
                    text-[#202a36]
                  "
                        id="txtDescription"
                      >
                        Description
                      </th>
                    </tr>
                  </thead>

                  {/* =================================================
                BODY
            ================================================= */}

                  <tbody>
                    {rows.map((row, index) => (
                      <tr
                        key={index}
                        onClick={() => setActiveRow(index)}
                        onFocusCapture={() => setActiveRow(index)}
                        className={`
                    h-[32px]
                    ${activeRow === index ? "bg-[#f4f8fd]" : "bg-white"}
                    hover:bg-blue-50
                  `}
                      >
                        {/* ------------------------------------------
                      ACTIVE ROW INDICATOR
                  ------------------------------------------ */}

                        <td
                          className="
                      h-[32px]
                      border border-[#dce5ef]
                      p-0
                      text-center
                    "
                        >
                          {activeRow === index ? <Play size={9} /> : null}
                        </td>

                        {/* ------------------------------------------
                      SL
                  ------------------------------------------ */}

                        <td
                          className="
                      h-[32px]
                      border border-[#dce5ef]
                      p-0
                      text-center
                      text-[11px]
                    "
                        >
                          {index + 1}
                        </td>

                        {/* ------------------------------------------
                      ACCOUNT ID
                  ------------------------------------------ */}

                        <td
                          className="
                      h-[32px]
                      border border-[#dce5ef]
                      p-0
                    "
                        >
                          {renderSelect(
                            index,
                            "lkpAccountID",
                            row.accountId,
                            accountOptions,
                            (option) => {
                              updateRow(index, "accountId", option);
                              setActiveRow(index);
                            },
                          )}
                        </td>

                        {/* ------------------------------------------
                      ACCOUNT NAME
                  ------------------------------------------ */}

                        <td
                          className="
                      h-[32px]
                      border border-[#dce5ef]
                      p-0
                    "
                        >
                          {renderSelect(
                            index,
                            "lkpAccountName",
                            row.accountName,
                            accountOptions,
                            (option) => {
                              updateRow(index, "accountName", option);
                              setActiveRow(index);
                            },
                          )}
                        </td>

                        {/* ------------------------------------------
                      CCID
                  ------------------------------------------ */}

                        <td
                          className="
                      h-[32px]
                      border border-[#dce5ef]
                      p-0
                    "
                        >
                          {renderSelect(
                            index,
                            "lkpCCID",
                            row.ccid,
                            ccidOptions,
                            (option) => {
                              updateRow(index, "ccid", option);
                              setActiveRow(index);
                            },
                            false,
                          )}
                        </td>

                        {/* ------------------------------------------
                      CURRENCY
                  ------------------------------------------ */}

                        <td
                          className="
                      h-[32px]
                      border border-[#dce5ef]
                      p-0
                    "
                        >
                          {renderSelect(
                            index,
                            "lkpCurrency",
                            row.currency,
                            currencyOptions,
                            (option) => {
                              updateRow(index, "currency", option);
                              setActiveRow(index);
                            },
                            false,
                          )}
                        </td>

                        {/* ------------------------------------------
                      CURRENCY RATE
                  ------------------------------------------ */}

                        <td
                          className="
                      h-[32px]
                      border border-[#dce5ef]
                      p-0
                    "
                        >
                          <input
                            id={`lkpCurrencyRate-${index}`}
                            type="text"
                            inputMode="decimal"
                            autoComplete="off"
                            value={row.currencyRate}
                            onFocus={() => {
                              setActiveRow(index);
                            }}
                            onChange={(event) =>
                              handleNumberChange(
                                index,
                                "currencyRate",
                                event.target.value,
                              )
                            }
                            onBlur={() =>
                              updateRow(
                                index,
                                "currencyRate",
                                formatNumber(row.currencyRate, 4),
                              )
                            }
                            className={`${inputClass} text-right`}
                          />
                        </td>

                        {/* ------------------------------------------
                      AMOUNT
                  ------------------------------------------ */}

                        <td className="h-[32px] border border-[#dce5ef] p-0">
                          <input
                            id={`txtAmount-${index}`}
                            type="text"
                            inputMode="decimal"
                            autoComplete="off"
                            value={row.amount}
                            onFocus={() => {
                              setActiveRow(index);
                            }}
                            onChange={(event) =>
                              handleNumberChange(
                                index,
                                "amount",
                                event.target.value,
                              )
                            }
                            onBlur={() =>
                              updateRow(
                                index,
                                "amount",
                                formatNumber(row.amount, 2),
                              )
                            }
                            className={`${inputClass} text-right`}
                          />
                        </td>

                        {/* ------------------------------------------
                      AMOUNT SAR
                  ------------------------------------------ */}

                        <td
                          className="
                      h-[32px]
                      border border-[#dce5ef]
                      p-0
                    "
                        >
                          <input
                            id={`txtAmountSAR-${index}`}
                            type="text"
                            inputMode="decimal"
                            autoComplete="off"
                            value={row.amountSAR}
                            onFocus={() => {
                              setActiveRow(index);
                            }}
                            onChange={(event) =>
                              handleNumberChange(
                                index,
                                "amountSAR",
                                event.target.value,
                              )
                            }
                            onBlur={() =>
                              updateRow(
                                index,
                                "amountSAR",
                                formatNumber(row.amountSAR, 2),
                              )
                            }
                            className={`${inputClass} text-right`}
                          />
                        </td>

                        {/* ------------------------------------------
                      DESCRIPTION
                  ------------------------------------------ */}

                        <td
                          className="
                      h-[32px]
                      border border-[#dce5ef]
                      p-0
                    "
                        >
                          <input
                            id={`txtDescription-${index}`}
                            type="text"
                            autoComplete="off"
                            value={row.description}
                            onFocus={() => setActiveRow(index)}
                            onChange={(event) =>
                              updateRow(
                                index,
                                "description",
                                event.target.value,
                              )
                            }
                            className={inputClass}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ======================================================
          BOTTOM FORM
      ====================================================== */}

            <div className="relative h-[77px] shrink-0 bg-white">
              <button
                id="btnClear"
                type="button"
                onClick={() => setRows(createRows())}
                className="
            absolute
            left-[486px]
            top-[17px]
         btn-style
          "
              >
                <span className="underline">C</span>lear
              </button>

              {/* ----------------------------------------------------
            TOTAL LABEL
        ---------------------------------------------------- */}

              <div
                className="
            absolute
            left-[690px]
            top-[17px]
            flex
            h-[32px]
            w-[90px]
            items-center
            justify-center
            border
            border-[#d6d6d6]
            bg-white
            text-[14px]
            text-[#333]
          "
              >
                Total
              </div>

              {/* ----------------------------------------------------
            TOTAL VALUE
        ---------------------------------------------------- */}

              <div
                id="txtTotal"
                className="
            absolute
            left-[790px]
            top-[17px]
            flex
            h-[32px]
            w-[90px]
            items-center
            justify-end
            border
            border-[#d6d6d6]
            bg-white
            px-2
            text-[14px]
            text-[#333]
          "
              >
                {totalDisplay}
              </div>

              {/* ----------------------------------------------------
            AMOUNT SAR TOTAL
        ---------------------------------------------------- */}

              <div
                id="txtTotalSAR"
                className="
            absolute
            left-[890px]
            top-[17px]
            flex
            h-[32px]
            w-[106px]
            items-center
            justify-end
            border
            border-[#d6d6d6]
            bg-white
            px-2
            text-[14px]
            text-[#333]
          "
              >
                0.00
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PurchaseExpense;
