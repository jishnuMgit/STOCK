import React, { useEffect, useMemo, useState } from "react";
import Select, {
  components,
  type DropdownIndicatorProps,
  type FormatOptionLabelMeta,
  type MenuListProps,
  type StylesConfig,
} from "react-select";
import { RxTriangleDown } from "react-icons/rx";
import { Play, X } from "lucide-react";
import {
  usePurchaseInvoice,
  createExpenseRows,
  type ExpenseLookups,
  type PurchaseExpenseRow,
} from "../../../hooks/Purchase/Transaction/usePurchaseInvoice";

// ============================================================
// TYPES
// ============================================================

type Option = {
  value: string;
  label: string;
  name?: string;
};

const emptyLookups: ExpenseLookups = {
  accounts: [],
  costCenters: [],
  currencies: [],
};

const pick = (options: Option[], value: string): Option | null =>
  options.find((o) => o.value === value) ?? null;

/* custom arrow for the dropdowns in this table */
const DropdownIndicator = (props: DropdownIndicatorProps<Option, false>) => (
  <components.DropdownIndicator {...props}>
    <RxTriangleDown size={16} color="#91918e" />
  </components.DropdownIndicator>
);

const selectComponents = {
  DropdownIndicator,
  IndicatorSeparator: () => null,
};

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
// TWO-COLUMN LOOKUP MENU (Account ID / Account Name)
// same look as the dropdowns in the Purchase Invoice item table
// ============================================================

const MENU_FONT_SIZE = 13;
const ID_COL_WIDTH = 130; // = Account ID column width (w-[130px])
const NAME_COL_WIDTH = 350; // = Account Name column width (w-[350px])

type MenuVariant = "accountId" | "accountName";

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
  accountId: {
    firstTitle: "Account ID",
    secondTitle: "Account Name",
    firstWidth: ID_COL_WIDTH,
    first: (o) => o.value,
    second: (o) => o.name ?? o.label,
  },
  accountName: {
    firstTitle: "Account Name",
    secondTitle: "Account ID",
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

/* typing searches both the account id and the account name */
const filterAccount = (option: { data: Option }, input: string): boolean => {
  const text = input.trim().toLowerCase();
  if (!text) return true;
  return (
    option.data.value.toLowerCase().includes(text) ||
    (option.data.name ?? option.data.label).toLowerCase().includes(text)
  );
};

const lookupSelectStyles: StylesConfig<Option, false> = {
  ...selectStyles,
  menu: (base) => ({
    ...base,
    zIndex: 9999,
    fontSize: MENU_FONT_SIZE,
    marginTop: 1,
    width: 520,
    minWidth: 520,
    border: "none",
    borderRadius: 0,
    boxShadow: "0 0 0 1px #cfcfcf, 0 4px 10px rgba(0,0,0,0.15)",
  }),
  menuList: (base) => ({
    ...base,
    padding: 0,
    maxHeight: 260,
  }),
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

const lookupComponents: Record<MenuVariant, typeof selectComponents> = {
  accountId: {
    ...selectComponents,
    MenuList: createMenuList("accountId"),
  } as typeof selectComponents,
  accountName: {
    ...selectComponents,
    MenuList: createMenuList("accountName"),
  } as typeof selectComponents,
};

const lookupFormat: Record<
  MenuVariant,
  (option: Option, meta: FormatOptionLabelMeta<Option>) => React.ReactNode
> = {
  accountId: createFormatLabel("accountId"),
  accountName: createFormatLabel("accountName"),
};

// ============================================================
// INPUT CLASS
// ============================================================

const inputClass =
  "h-[20px] w-full min-w-0 border-0 bg-transparent px-1 outline-none focus:bg-blue-50";

const thBase =
  "sticky top-0 z-20 h-[32px] whitespace-nowrap border border-[#dce5ef] bg-[#f1f6fc] py-0 font-semibold text-[#202a36]";

const tdClass = "h-[32px] border border-[#dce5ef] p-0";

interface PurchaseExpenseProps {
  onClose?: () => void;
  initialRows?: PurchaseExpenseRow[];
  onSave?: (rows: PurchaseExpenseRow[]) => void;
}

const PurchaseExpense: React.FC<PurchaseExpenseProps> = ({
  onClose,
  initialRows,
  onSave,
}) => {
  const { fetchExpenseLookups } = usePurchaseInvoice();

  // popup unmounts on close, so this re-reads the saved rows every time it opens
  const [rows, setRows] = useState<PurchaseExpenseRow[]>(
    () => initialRows ?? createExpenseRows(),
  );
  const [activeRow, setActiveRow] = useState(0);
  const [lookups, setLookups] = useState<ExpenseLookups>(emptyLookups);
  const [lookupError, setLookupError] = useState("");

  // ----------------------------------------------------------
  // LOAD COMBOS ONCE WHEN THE POPUP OPENS (clsPIExp.FillCombos)
  // ----------------------------------------------------------

  useEffect(() => {
    let cancelled = false;

    fetchExpenseLookups()
      .then((data) => {
        if (!cancelled) setLookups(data);
      })
      .catch((err: unknown) => {
        if (!cancelled)
          setLookupError(
            err instanceof Error ? err.message : "Failed to load lookups",
          );
      });

    return () => {
      cancelled = true;
    };
  }, [fetchExpenseLookups]);

  /* Account ID combo (sorted by id) and Account Name combo (sorted by name).
     Both use the account id as the value, so picking one fills the other.
     Both carry the name so the two-column menu and the search can use it. */
  const accountIdOptions = useMemo<Option[]>(
    () =>
      lookups.accounts.map((a) => ({
        value: a.id,
        label: a.id,
        name: a.name,
      })),
    [lookups.accounts],
  );

  const accountNameOptions = useMemo<Option[]>(
    () =>
      [...lookups.accounts]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((a) => ({ value: a.id, label: a.name, name: a.name })),
    [lookups.accounts],
  );

  const ccOptions = useMemo<Option[]>(
    () => lookups.costCenters.map((c) => ({ value: c.id, label: c.id })),
    [lookups.costCenters],
  );

  const currencyOptions = useMemo<Option[]>(
    () => lookups.currencies.map((c) => ({ value: c, label: c })),
    [lookups.currencies],
  );

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
  // NUMBER CHANGE (VB: grdvPIExp_ValidatingEditor)
  //   rate / amount(FC) changed -> amount SAR = rate * FC
  //   amount SAR changed        -> amount(FC) = SAR / rate
  // ----------------------------------------------------------

  const handleNumberChange = (
    index: number,
    field: "currencyRate" | "amount" | "amountSAR",
    value: string,
  ) => {
    if (value !== "" && !/^\d*\.?\d*$/.test(value)) {
      return;
    }

    setRows((previousRows) =>
      previousRows.map((row, rowIndex) => {
        if (rowIndex !== index) return row;

        const next = { ...row, [field]: value };
        const rate = Number(next.currencyRate) || 0;

        if (field === "currencyRate" || field === "amount") {
          if (rate && next.amount !== "") {
            next.amountSAR = (rate * Number(next.amount)).toFixed(2);
          }
        } else if (rate && value !== "") {
          next.amount = (Number(value) / rate).toFixed(4);
        }

        return next;
      }),
    );
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
  // TOTALS (VB footer sums: fCreditFC and fCredit)
  // ----------------------------------------------------------

  const totalFC = rows.reduce((sum, row) => sum + (Number(row.amount) || 0), 0);

  const totalSAR = rows.reduce(
    (sum, row) => sum + (Number(row.amountSAR) || 0),
    0,
  );

  // ----------------------------------------------------------
  // SELECT COMPONENT
  // `variant` switches on the two-column menu (Account ID / Name)
  // ----------------------------------------------------------

  const renderSelect = (
    index: number,
    inputId: string,
    value: string,
    options: Option[],
    onChange: (value: string) => void,
    searchable = true,
    variant?: MenuVariant,
  ) => (
    <Select<Option, false>
      inputId={`${inputId}-${index}`}
      instanceId={`${inputId}-${index}`}
      options={options}
      value={pick(options, value)}
      onChange={(option) => {
        onChange(option?.value ?? "");
        setActiveRow(index);
      }}
      styles={variant ? lookupSelectStyles : selectStyles}
      components={variant ? lookupComponents[variant] : selectComponents}
      formatOptionLabel={variant ? lookupFormat[variant] : undefined}
      filterOption={variant ? filterAccount : undefined}
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
                  <thead>
                    <tr className="h-[32px]">
                      {/* Row indicator */}
                      <th className="sticky top-0 z-20 w-[20px] border border-[#dce5ef] bg-[#f1f6fc] p-0" />

                      {/* Sl */}
                      <th className={`${thBase} w-[30px] px-1 text-left`}>
                        Sl.
                      </th>

                      {/* Account ID */}
                      <th
                        className={`${thBase} w-[130px] px-2 text-left`}
                        id="lkpAccountID"
                      >
                        Account ID
                      </th>

                      {/* Account Name */}
                      <th
                        className={`${thBase} w-[350px] px-2 text-left`}
                        id="lkpAccountName"
                      >
                        Account Name
                      </th>

                      {/* CCID */}
                      <th
                        className={`${thBase} w-[60px] px-1 text-left`}
                        id="lkpCCID"
                      >
                        CC. ID
                      </th>

                      {/* Currency */}
                      <th
                        className={`${thBase} w-[100px] px-1 text-left`}
                        id="lkpCurrency"
                      >
                        Currency
                      </th>

                      {/* Currency Rate */}
                      <th
                        className={`${thBase} w-[100px] px-1 text-left`}
                        id="lkpCurrencyRate"
                      >
                        Currency Rate
                      </th>

                      {/* Amount */}
                      <th
                        className={`${thBase} w-[100px] px-1 text-right`}
                        id="txtAmt"
                      >
                        Amount
                      </th>

                      {/* Amount SAR */}
                      <th
                        className={`${thBase} w-[100px] px-1 text-right`}
                        id="txtAmtSAR"
                      >
                        Amount SAR
                      </th>

                      {/* Description */}
                      <th
                        className={`${thBase} px-1 text-left`}
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
                        className={`h-[32px] ${
                          activeRow === index ? "bg-[#f4f8fd]" : "bg-white"
                        } hover:bg-blue-50`}
                      >
                        {/* ACTIVE ROW INDICATOR */}
                        <td className={`${tdClass} text-center`}>
                          {activeRow === index ? <Play size={9} /> : null}
                        </td>

                        {/* SL */}
                        <td className={`${tdClass} text-center text-[11px]`}>
                          {index + 1}
                        </td>

                        {/* ACCOUNT ID */}
                        <td className={tdClass}>
                          {renderSelect(
                            index,
                            "lkpAccountID",
                            row.accountId,
                            accountIdOptions,
                            (value) => updateRow(index, "accountId", value),
                            true,
                            "accountId",
                          )}
                        </td>

                        {/* ACCOUNT NAME */}
                        <td className={tdClass}>
                          {renderSelect(
                            index,
                            "lkpAccountName",
                            row.accountId,
                            accountNameOptions,
                            (value) => updateRow(index, "accountId", value),
                            true,
                            "accountName",
                          )}
                        </td>

                        {/* CCID */}
                        <td className={tdClass}>
                          {renderSelect(
                            index,
                            "lkpCCID",
                            row.ccid,
                            ccOptions,
                            (value) => updateRow(index, "ccid", value),
                            false,
                          )}
                        </td>

                        {/* CURRENCY */}
                        <td className={tdClass}>
                          {renderSelect(
                            index,
                            "lkpCurrency",
                            row.currency,
                            currencyOptions,
                            (value) => updateRow(index, "currency", value),
                            false,
                          )}
                        </td>

                        {/* CURRENCY RATE */}
                        <td className={tdClass}>
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

                        {/* AMOUNT (FC) */}
                        <td className={tdClass}>
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
                                formatNumber(row.amount, 4),
                              )
                            }
                            className={`${inputClass} text-right`}
                          />
                        </td>

                        {/* AMOUNT SAR */}
                        <td className={tdClass}>
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

                        {/* DESCRIPTION */}
                        <td className={tdClass}>
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

            {lookupError && (
              <p className="px-3 py-1 text-red-600">{lookupError}</p>
            )}

            {/* ======================================================
          BOTTOM FORM
      ====================================================== */}

            <div className="relative h-[77px] shrink-0 bg-white">
              <button
                id="btnSave"
                type="button"
                onClick={() => onSave?.(rows)}
                className="absolute left-[350px] top-[17px] btn-style"
              >
                <span className="underline">S</span>ave
              </button>

              <button
                id="btnClear"
                type="button"
                onClick={() => setRows(createExpenseRows())}
                className="absolute left-[486px] top-[17px] btn-style"
              >
                <span className="underline">C</span>lear
              </button>

              {/* TOTAL LABEL */}
              <div className="absolute left-[690px] top-[17px] flex h-[32px] w-[90px] items-center justify-center border border-[#d6d6d6] bg-white text-[14px] text-[#333]">
                Total
              </div>

              {/* TOTAL VALUE (FC) */}
              <div
                id="txtTotal"
                className="absolute left-[790px] top-[17px] flex h-[32px] w-[90px] items-center justify-end border border-[#d6d6d6] bg-white px-2 text-[14px] text-[#333]"
              >
                {totalFC.toFixed(4)}
              </div>

              {/* AMOUNT SAR TOTAL */}
              <div
                id="txtTotalSAR"
                className="absolute left-[890px] top-[17px] flex h-[32px] w-[106px] items-center justify-end border border-[#d6d6d6] bg-white px-2 text-[14px] text-[#333]"
              >
                {totalSAR.toFixed(2)}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PurchaseExpense;
