import React, { useMemo, useState } from "react";
import Select, { type StylesConfig } from "react-select";
import selectComponents from "../../sharecomponents/selectComponents";
import type { ItemLookup, SalesRow } from "../../../hooks/useSalesInvoice"; // adjust path to your hook

// ============================================================
// TYPES
// ============================================================

type Option = {
  value: string;
  label: string;
};

type EditableNumberField = "qty" | "unitPrice" | "itemDiscAmt";

type SalesInvoiceTableProps = {
  rows: SalesRow[];
  items: ItemLookup[];
  defaultPriceLevel: string; // customer price level, copied to new rows
  readOnly: boolean; // posted invoice
  /** recalc = true asks the page to recalculate totals on the server */
  onRowsChange: (rows: SalesRow[], recalc: boolean) => void;
};

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
    fontSize: 13,

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
    fontSize: 11,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  }),

  placeholder: (base) => ({
    ...base,
    margin: 0,
    color: "#64748b",
    fontSize: 11,
  }),

  input: (base) => ({
    ...base,
    margin: 0,
    padding: 0,
    color: "#263449",
    fontSize: 13,
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
// INPUT STYLES
// ============================================================

const numberInputClass =
  "number-no-spinner h-[20px] w-full min-w-0 border-0 bg-transparent px-1 text-right text-[14px] outline-none focus:bg-blue-50";

const calculatedInputClass =
  "number-no-spinner h-[20px] w-full min-w-0 border-0 bg-[#f8fafc] px-1 text-right text-[14px] outline-none";

const textInputClass =
  "h-[20px] w-full min-w-0 border-0 bg-transparent px-1 text-[14px] outline-none focus:bg-blue-50";

const thClass =
  "sticky top-0 z-20 h-7.5 whitespace-nowrap border border-[#dce5ef] bg-[#f1f6fc] px-1 py-0 align-middle font-semibold text-[#202a36]";

const tdClass = "h-5.75 border border-[#dce5ef] p-0";

// ============================================================
// TABLE
// ============================================================

const SalesInvoiceTable: React.FC<SalesInvoiceTableProps> = ({
  rows,
  items,
  defaultPriceLevel,
  readOnly,
  onRowsChange,
}) => {
  const [activeRow, setActiveRow] = useState(0);

  // ==========================================================
  // ITEM OPTIONS
  // ==========================================================

  const itemIdOptions = useMemo<Option[]>(
    () => items.map((i) => ({ value: i.id, label: i.id })),
    [items],
  );

  const itemNameOptions = useMemo<Option[]>(
    () => items.map((i) => ({ value: i.id, label: i.name })),
    [items],
  );

  const itemById = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);

  const idValue = (itemId: string): Option | null =>
    itemId ? { value: itemId, label: itemId } : null;

  const nameValue = (itemId: string): Option | null =>
    itemId
      ? { value: itemId, label: itemById.get(itemId)?.name || itemId }
      : null;

  // ==========================================================
  // UPDATE ROW
  // ==========================================================

  const patchRow = (index: number, patch: Partial<SalesRow>): SalesRow[] =>
    rows.map((row, rowIndex) =>
      rowIndex === index ? { ...row, ...patch } : row,
    );

  // ==========================================================
  // ITEM SELECTED (both Item ID and Item Name combos)
  // Fills the unit from the item list (VB: GetUnit)
  // ==========================================================

  const handleItemSelect = (index: number, option: Option | null) => {
    if (!option) return;

    onRowsChange(
      patchRow(index, {
        itemId: option.value,
        unit: itemById.get(option.value)?.unit ?? "",
        priceLevel: rows[index].priceLevel || defaultPriceLevel,
      }),
      true,
    );
    setActiveRow(index);
  };

  // ==========================================================
  // TEXT / NUMBER CHANGE
  // ==========================================================

  const handleUnitChange = (index: number, value: string) => {
    onRowsChange(patchRow(index, { unit: value }), false);
  };

  const handleNumberChange = (
    index: number,
    field: EditableNumberField,
    value: string,
  ) => {
    if (value !== "" && !/^\d*\.?\d*$/.test(value)) {
      return;
    }

    onRowsChange(patchRow(index, { [field]: value }), false);
  };

  const formatNumber = (value: string): string => {
    if (value.trim() === "") {
      return "";
    }

    const number = Number(value);

    return Number.isFinite(number) ? number.toFixed(2) : "";
  };

  // format on blur, then ask the server to recalculate
  const handleNumberBlur = (index: number, field: EditableNumberField) => {
    const value = rows[index][field];

    const next =
      field === "qty" || value === ""
        ? rows
        : patchRow(index, { [field]: formatNumber(value) });

    onRowsChange(next, true);
  };

  // ==========================================================
  // F5 = delete row (same as VB)
  // ==========================================================

  const handleRowKeyDown = (
    event: React.KeyboardEvent<HTMLTableRowElement>,
    index: number,
  ) => {
    if (event.key !== "F5") return;

    event.preventDefault(); // stop the browser refresh

    if (readOnly || !rows[index].itemId) return;

    onRowsChange(
      rows.filter((_, rowIndex) => rowIndex !== index),
      true,
    );
  };

  // ==========================================================
  // INPUTS
  // ==========================================================

  const renderNumberInput = (
    index: number,
    field: EditableNumberField,
    id: string,
    label: string,
  ) => (
    <input
      id={`${id}-${index}`}
      aria-label={`${label}, row ${index + 1}`}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      readOnly={readOnly}
      value={rows[index][field]}
      onFocus={(event) => {
        setActiveRow(index);
        event.currentTarget.select();
      }}
      onChange={(event) => handleNumberChange(index, field, event.target.value)}
      onBlur={() => handleNumberBlur(index, field)}
      className={numberInputClass}
    />
  );

  const renderCalculatedInput = (
    index: number,
    value: string,
    id: string,
    label: string,
  ) => (
    <input
      id={`${id}-${index}`}
      aria-label={`${label}, row ${index + 1}`}
      type="text"
      readOnly
      tabIndex={-1}
      value={value}
      className={calculatedInputClass}
    />
  );

  const menuPortalTarget =
    typeof document !== "undefined" ? document.body : undefined;

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <section
      id="sales-invoice-table"
      className="
        mx-2.75
        mb-0
        mt-6
        flex
        h-fit
        min-h-0
        flex-col
        overflow-hidden
        border
        border-[#dce5ef]
      "
    >
      <div className="customer-table-scroll min-h-0 max-h-85 flex-1 overflow-auto">
        <table
          className="
            w-full
            min-w-225
            table-fixed
            border-collapse
            text-[11px]
          "
        >
          {/* ==================================================
              COLUMN WIDTHS
          ================================================== */}

          <colgroup>
            <col style={{ width: "14px" }} />
            <col style={{ width: "28px" }} />
            <col style={{ width: "200px" }} />
            <col style={{ width: "auto" }} />
            <col style={{ width: "56px" }} />
            <col style={{ width: "58px" }} />
            <col style={{ width: "75px" }} />
            <col style={{ width: "70px" }} />
            <col style={{ width: "70px" }} />
            <col style={{ width: "90px" }} />
          </colgroup>

          {/* ==================================================
              HEADER
          ================================================== */}

          <thead>
            <tr className="h-7.5">
              <th className="sticky top-0 z-20 border border-[#dce5ef] bg-[#f1f6fc] p-0" />
              <th className={`${thClass} text-left`}>Sl.</th>
              <th className={`${thClass} text-left`}>Item ID</th>
              <th className={`${thClass} text-left`}>Item Name</th>
              <th className={`${thClass} text-center`}>Unit</th>
              <th className={`${thClass} text-right`}>Qty.</th>
              <th className={`${thClass} text-right`}>Unit Price</th>
              <th className={`${thClass} text-right`}>U.Disc Amt.</th>
              <th className={`${thClass} text-right`}>VAT Amt.</th>
              <th className={`${thClass} text-right`}>Total Price</th>
            </tr>
          </thead>

          {/* ==================================================
              BODY
          ================================================== */}

          <tbody>
            {rows.map((row, index) => (
              <tr
                key={index}
                onClick={() => setActiveRow(index)}
                onFocusCapture={() => setActiveRow(index)}
                onKeyDown={(event) => handleRowKeyDown(event, index)}
                className={`
                  h-7.5
                  ${activeRow === index ? "bg-[#f4f8fd]" : "bg-white"}
                  hover:bg-blue-50
                `}
              >
                {/* ACTIVE ROW INDICATOR */}

                <td
                  className={`${tdClass} text-center text-[9px] text-[#263449]`}
                  aria-label={activeRow === index ? "Active row" : undefined}
                >
                  {activeRow === index ? "▾" : ""}
                </td>

                {/* SL NO */}

                <td className={`${tdClass} text-center`}>{index + 1}</td>

                {/* ITEM ID */}

                <td className={tdClass}>
                  <Select<Option, false>
                    inputId={`lkpItemID-${index}`}
                    instanceId={`item-id-${index}`}
                    options={itemIdOptions}
                    components={selectComponents}
                    value={idValue(row.itemId)}
                    onChange={(option) => handleItemSelect(index, option)}
                    styles={selectStyles}
                    isClearable={false}
                    isSearchable
                    isDisabled={readOnly}
                    menuPosition="fixed"
                    menuPortalTarget={menuPortalTarget}
                    placeholder=""
                    className="w-full"
                  />
                </td>

                {/* ITEM NAME */}

                <td className={tdClass}>
                  <Select<Option, false>
                    inputId={`lkpItemName-${index}`}
                    instanceId={`item-name-${index}`}
                    options={itemNameOptions}
                    components={selectComponents}
                    value={nameValue(row.itemId)}
                    onChange={(option) => handleItemSelect(index, option)}
                    styles={selectStyles}
                    isClearable={false}
                    isSearchable
                    isDisabled={readOnly}
                    menuPosition="fixed"
                    menuPortalTarget={menuPortalTarget}
                    placeholder=""
                    className="w-full"
                  />
                </td>

                {/* UNIT */}

                <td className={tdClass}>
                  <input
                    id={`txtUnit-${index}`}
                    aria-label={`Unit, row ${index + 1}`}
                    type="text"
                    autoComplete="off"
                    readOnly={readOnly}
                    value={row.unit}
                    onFocus={() => setActiveRow(index)}
                    onChange={(event) =>
                      handleUnitChange(index, event.target.value)
                    }
                    className={textInputClass}
                  />
                </td>

                {/* QUANTITY */}

                <td className={tdClass}>
                  {renderNumberInput(index, "qty", "txtQty", "Quantity")}
                </td>

                {/* UNIT PRICE */}

                <td className={tdClass}>
                  {renderNumberInput(
                    index,
                    "unitPrice",
                    "txtUnitPrice",
                    "Unit price",
                  )}
                </td>

                {/* UNIT DISCOUNT */}

                <td className={tdClass}>
                  {renderNumberInput(
                    index,
                    "itemDiscAmt",
                    "txtUDiscAmt",
                    "Unit discount amount",
                  )}
                </td>

                {/* VAT (calculated) */}

                <td className={tdClass}>
                  {renderCalculatedInput(
                    index,
                    row.itemVatAmt,
                    "txtVATAmt",
                    "VAT amount",
                  )}
                </td>

                {/* TOTAL PRICE incl. VAT (calculated) */}

                <td className={tdClass}>
                  {renderCalculatedInput(
                    index,
                    row.totalPriceV,
                    "txtTotalPrice",
                    "Total price",
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default SalesInvoiceTable;
