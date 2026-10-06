import { Play } from "lucide-react";
import React, { useState } from "react";
import Select, { type StylesConfig } from "react-select";
import type { PurchaseRow } from "../../../hooks/Purchase/Transaction/usePurchaseInvoice";

type Option = {
  value: string; // item id
  label: string;
  unit?: string; // item's unit, filled in when the item is picked
};

const columns = [
  { name: "Sl.", width: "38px", id: "txtSlNo" },
  { name: "Item ID", width: "158px", id: "lkpItemID" },
  { name: "Item Name", width: "auto", id: "lkpItemName" },
  { name: "Unit", width: "56px", id: "txtUnit" },
  { name: "Qty.", width: "58px", id: "txtQtyIn" },
  { name: "S.Unit Price", width: "85px", id: "txtSup_UnitPrice" },
  { name: "S.Total Price", width: "90px", id: "txtSup_TotPrice" },
  { name: "Unit Price", width: "80px", id: "txtUnitPrice" },
  { name: "Unit Cost", width: "80px", id: "txtUnitCost" },
  { name: "Total Cost", width: "80px", id: "txtTotCost" },
];

const numericColumns = [
  "Qty",
  "S.Unit Price",
  "S.Total Price",
  "Unit Price",
  "Unit Cost",
  "Total Cost",
];

type PriceField =
  | "sUnitPrice"
  | "sTotalPrice"
  | "unitPrice"
  | "unitCost"
  | "totalCost";

const EMPTY: Option[] = [];

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

const numberInputClass =
  "number-no-spinner h-[20px] w-full min-w-0 border-0 bg-transparent px-1 text-right outline-none focus:bg-blue-50";

interface Props {
  rows: PurchaseRow[];
  onRowChange: (index: number, patch: Partial<PurchaseRow>) => void;
  lookups?: {
    itemIds?: Option[]; // { value: itemId, label: itemId, unit }
    itemNames?: Option[]; // { value: itemId, label: itemName, unit }
  };
}

const PurchaseTable: React.FC<Props> = ({ rows, onRowChange, lookups }) => {
  const [activeRow, setActiveRow] = useState(0);

  const itemIdOptions = lookups?.itemIds ?? EMPTY;
  const itemNameOptions = lookups?.itemNames ?? EMPTY;

  const portalTarget =
    typeof document !== "undefined" ? document.body : undefined;

  // Format prices to two decimal places when leaving the field.
  const formatPrice = (value: string): string => {
    if (value.trim() === "") return "0.00";

    const number = Number(value);

    return Number.isFinite(number) ? number.toFixed(2) : "0.00";
  };

  // Item ID and Item Name are the same field (fItemID), as in the VB grid.
  const handleItemChange = (index: number, option: Option | null) => {
    onRowChange(index, {
      itemId: option?.value ?? "",
      unit: option?.unit ?? "",
    });
    setActiveRow(index);
  };

  // Only S.Unit Price is typed by the user; the other price columns
  // are calculated by the page.
  const renderPriceInput = (
    index: number,
    field: PriceField,
    id: string,
    label: string,
    editable = false,
  ) => (
    <input
      id={`${id}-${index}`}
      aria-label={`${label}, row ${index + 1}`}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      readOnly={!editable}
      tabIndex={editable ? 0 : -1}
      value={rows[index][field]}
      onFocus={(event) => {
        setActiveRow(index);
        if (editable) event.currentTarget.select();
      }}
      onChange={(event) => {
        const value = event.target.value;

        // Allow a decimal point while the user is typing.
        if (editable && (value === "" || /^\d*\.?\d*$/.test(value))) {
          onRowChange(index, { [field]: value });
        }
      }}
      onBlur={() => {
        if (editable) {
          onRowChange(index, { [field]: formatPrice(rows[index][field]) });
        }
      }}
      className={`${numberInputClass} ${editable ? "" : "bg-slate-100"}`}
    />
  );

  return (
    <section
      id="purchase-table"
      className="mx-3 mb-1 flex min-h-0 max-h-[393px] flex-1 flex-col overflow-hidden border border-b-0 border-[#dce5ef]"
    >
      {/* Header and body share one table to keep columns aligned. */}
      <div className="customer-table-scroll min-h-0 max-h-fit flex-1 overflow-auto">
        <table className="w-full min-w-[900px] table-fixed border-collapse text-[11px]">
          <colgroup>
            {/* Dynamic row indicator */}
            <col style={{ width: "14px" }} />

            {columns.map((column) => (
              <col
                key={column.name}
                style={{ width: column.width }}
                id={column.id}
              />
            ))}
          </colgroup>

          {/* Sticky header */}
          <thead>
            <tr className="h-[30px]">
              <th className="sticky top-0 z-20 border border-[#dce5ef] bg-[#f1f6fc] p-0" />

              {columns.map((column) => (
                <th
                  key={column.name}
                  className={`sticky top-0 z-20 h-[30px] whitespace-nowrap border border-[#dce5ef] bg-[#f1f6fc] px-1 py-0 align-middle font-semibold text-[#202a36] ${
                    numericColumns.includes(column.name)
                      ? "text-right"
                      : "text-left"
                  }`}
                >
                  {column.name}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {rows.map((row, index) => (
              <tr
                key={index}
                onClick={() => setActiveRow(index)}
                onFocusCapture={() => setActiveRow(index)}
                className={`h-[30px] ${
                  activeRow === index ? "bg-[#f4f8fd]" : "bg-white"
                } hover:bg-blue-50`}
              >
                {/* Active row indicator */}
                <td
                  className="h-[30px] border border-[#dce5ef] p-0 text-center text-[9px] text-[#263449]"
                  aria-label={activeRow === index ? "Active row" : undefined}
                >
                  {activeRow === index ? <Play size={10} /> : ""}
                </td>

                {/* Serial number */}
                <td className="h-[30px] border border-[#dce5ef] p-0 text-center">
                  {index + 1}
                </td>

                {/* Item ID */}
                <td className="h-[30px] border border-[#dce5ef] p-0">
                  <Select<Option, false>
                    inputId={`lkpItemID-${index}`}
                    instanceId={`item-id-${index}`}
                    options={itemIdOptions}
                    value={
                      itemIdOptions.find((o) => o.value === row.itemId) ?? null
                    }
                    onChange={(option) => handleItemChange(index, option)}
                    styles={selectStyles}
                    isClearable={false}
                    isSearchable
                    menuPosition="fixed"
                    menuPortalTarget={portalTarget}
                    placeholder=""
                    className="w-full"
                  />
                </td>

                {/* Item Name (same itemId) */}
                <td className="h-[30px] border border-[#dce5ef] p-0">
                  <Select<Option, false>
                    inputId={`lkpItemName-${index}`}
                    instanceId={`item-name-${index}`}
                    options={itemNameOptions}
                    value={
                      itemNameOptions.find((o) => o.value === row.itemId) ??
                      null
                    }
                    onChange={(option) => handleItemChange(index, option)}
                    styles={selectStyles}
                    isClearable={false}
                    isSearchable
                    menuPosition="fixed"
                    menuPortalTarget={portalTarget}
                    placeholder=""
                    className="w-full"
                  />
                </td>

                {/* Unit: read-only, comes from the item */}
                <td className="h-[30px] border border-[#dce5ef] bg-slate-100 px-1">
                  {row.unit}
                </td>

                {/* Quantity */}
                <td className="h-[30px] border border-[#dce5ef] p-0">
                  <input
                    id={`txtQty-${index}`}
                    aria-label={`Quantity row ${index + 1}`}
                    type="number"
                    min="0"
                    step="any"
                    value={row.qty}
                    onFocus={() => setActiveRow(index)}
                    onChange={(event) =>
                      onRowChange(index, { qty: event.target.value })
                    }
                    className={numberInputClass}
                  />
                </td>

                {/* S.Unit Price (editable) */}
                <td className="h-[30px] border border-[#dce5ef] p-0">
                  {renderPriceInput(
                    index,
                    "sUnitPrice",
                    "txtSUnitPrice",
                    "Supplier unit price",
                    true,
                  )}
                </td>

                {/* S.Total Price (calculated) */}
                <td className="h-[30px] border border-[#dce5ef] p-0">
                  {renderPriceInput(
                    index,
                    "sTotalPrice",
                    "txtSTotalPrice",
                    "Supplier total price",
                  )}
                </td>

                {/* Unit Price (calculated) */}
                <td className="h-[30px] border border-[#dce5ef] p-0">
                  {renderPriceInput(
                    index,
                    "unitPrice",
                    "txtUnitPrice",
                    "Unit price",
                  )}
                </td>

                {/* Unit Cost (calculated) */}
                <td className="h-[30px] border border-[#dce5ef] p-0">
                  {renderPriceInput(
                    index,
                    "unitCost",
                    "txtUnitCost",
                    "Unit cost",
                  )}
                </td>

                {/* Total Cost (calculated) */}
                <td className="h-[30px] border border-[#dce5ef] p-0">
                  {renderPriceInput(
                    index,
                    "totalCost",
                    "txtTotalCost",
                    "Total cost",
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

export default PurchaseTable;
