
import { Play } from "lucide-react";
import React, { useState } from "react";
import Select, { type StylesConfig } from "react-select";

type Option = {
  value: string;
  label: string;
};

type PurchaseRow = {
  itemId: Option | null;
  itemName: Option | null;
  unit: string;
  qty: string;
  sUnitPrice: string;
  sTotalPrice: string;
  unitPrice: string;
  unitCost: string;
  totalCost: string;
};

const ROW_COUNT = 12;

const columns = [
  { name: "Sl.No.", width: "38px" },
  { name: "Item ID", width: "158px" },
  { name: "Item Name", width: "auto" },
  { name: "Unit", width: "56px" },
  { name: "Qty", width: "58px" },
  { name: "S.Unit Price", width: "85px" },
  { name: "S.Total Price", width: "90px" },
  { name: "Unit Price", width: "80px" },
  { name: "Unit Cost", width: "80px" },
  { name: "Total Cost", width: "80px" },
];

const itemOptions: Option[] = [];
const unitOptions: Option[] = [];

const createRow = (): PurchaseRow => ({
  itemId: null,
  itemName: null,
  unit: "",
  qty: "",
  sUnitPrice: "0.00",
  sTotalPrice: "0.00",
  unitPrice: "0.00",
  unitCost: "0.00",
  totalCost: "0.00",
});

const createRows = (): PurchaseRow[] =>
  Array.from({ length: ROW_COUNT }, createRow);

const priceFields = [
  { key: "sUnitPrice", id: "txtSUnitPrice", label: "Supplier unit price" },
  { key: "sTotalPrice", id: "txtSTotalPrice", label: "Supplier total price" },
  { key: "unitPrice", id: "txtUnitPrice", label: "Unit price" },
  { key: "unitCost", id: "txtUnitCost", label: "Unit cost" },
  { key: "totalCost", id: "txtTotalCost", label: "Total cost" },
] as const;

type PriceField = (typeof priceFields)[number]["key"];

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
const PurchaseTable: React.FC = () => {
  const [rows, setRows] = useState<PurchaseRow[]>(createRows);
  const [activeRow, setActiveRow] = useState(0);

  const updateRow = <K extends keyof PurchaseRow>(
    index: number,
    field: K,
    value: PurchaseRow[K],
  ) => {
    setRows((previousRows) =>
      previousRows.map((row, rowIndex) =>
        rowIndex === index
          ? { ...row, [field]: value }
          : row,
      ),
    );
  };

  // Format prices to two decimal places when leaving the field.
  const formatPrice = (value: string): string => {
    if (value.trim() === "") return "0.00";

    const number = Number(value);

    if (!Number.isFinite(number)) return "0.00";

    return number.toFixed(2);
  };

  const handlePriceChange = (
    index: number,
    field: PriceField,
    value: string,
  ) => {
    // Allow a decimal point while the user is typing.
    if (value !== "" && !/^\d*\.?\d*$/.test(value)) {
      return;
    }

    updateRow(index, field, value);
  };

  const renderPriceInput = (
    index: number,
    field: PriceField,
    id: string,
    label: string,
  ) => (
    <input
      id={`${id}-${index}`}
      aria-label={`${label}, row ${index + 1}`}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      value={rows[index][field]}
      onFocus={(event) => {
        setActiveRow(index);
        event.currentTarget.select();
      }}
      onChange={(event) =>
        handlePriceChange(index, field, event.target.value)
      }
      onBlur={() =>
        updateRow(index, field, formatPrice(rows[index][field]))
      }
      className={numberInputClass}
    />
  );

  return (
    <section
      id="purchase-table"
      className="mx-3 mb-1 flex min-h-0 max-h-[393px] flex-1 flex-col overflow-hidden border-b-0 border border-[#dce5ef]"
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
              />
            ))}
          </colgroup>

          {/* Sticky header */}
          <thead>
            <tr className="h-[30px]">
              <th className="sticky top-0 z-20 border border-[#dce5ef] bg-[#f1f6fc] p-0" />

              {columns.map((column) => {
  const isNumericColumn = [
    "Qty",
    "S.Unit Price",
    "S.Total Price",
    "Unit Price",
    "Unit Cost",
    "Total Cost",
  ].includes(column.name);

  return (
    <th
      key={column.name}
      className={`sticky top-0 z-20 h-[30px] whitespace-nowrap border border-[#dce5ef] bg-[#f1f6fc] px-1 py-0 align-middle font-semibold text-[#202a36] ${
        isNumericColumn ? "text-right" : "text-left"
      }`}
    >
      {column.name}
    </th>
  );
})}
            </tr>
          </thead>

          <tbody>
            {rows.map((row, index) => (
              <tr
                key={index}
                onClick={() => setActiveRow(index)}
                onFocusCapture={() => setActiveRow(index)}
                className={`h-[30px] ${
                  activeRow === index
                    ? "bg-[#f4f8fd]"
                    : "bg-white"
                } hover:bg-blue-50`}
              >
                {/* Active row indicator */}
                <td
                  className="h-[30px] border border-[#dce5ef] p-0 text-center text-[9px] text-[#263449]"
                  aria-label={
                    activeRow === index ? "Active row" : undefined
                  }
                >
                  {activeRow === index ? <Play size={10} /> : ""}
                </td>

                {/* Serial number */}
                <td className="h-[30px] border border-[#dce5ef] p-0 text-center">
                  {index + 1}
                </td>

                {/* Item ID - React Select on every row */}
                <td className="h-[30px] border border-[#dce5ef] p-0">
                  <Select<Option, false>
                    inputId={`lkpItemID-${index}`}
                    instanceId={`item-id-${index}`}
                    options={itemOptions}
                    value={row.itemId}
                    onChange={(option) => {
                      updateRow(index, "itemId", option);
                      setActiveRow(index);
                    }}
                    styles={selectStyles}
                    isClearable={false}
                    isSearchable
                    menuPosition="fixed"
                    menuPortalTarget={
                      typeof document !== "undefined"
                        ? document.body
                        : undefined
                    }
                    placeholder=""
                    className="w-full"
                  />
                </td>

                {/* Item Name - React Select on every row */}
                <td className="h-[30px] border border-[#dce5ef] p-0">
                  <Select<Option, false>
                    inputId={`lkpItemName-${index}`}
                    instanceId={`item-name-${index}`}
                    options={itemOptions}
                    value={row.itemName}
                    onChange={(option) => {
                      updateRow(index, "itemName", option);
                      setActiveRow(index);
                    }}
                    styles={selectStyles}
                    isClearable={false}
                    isSearchable
                    menuPosition="fixed"
                    menuPortalTarget={
                      typeof document !== "undefined"
                        ? document.body
                        : undefined
                    }
                    placeholder=""
                    className="w-full"
                  />
                </td>

                {/* Unit */}
                <td className="h-[30px] border border-[#dce5ef] p-0">
                  <Select<Option, false>
                    inputId={`txtUnit-${index}`}
                    instanceId={`unit-${index}`}
                    options={unitOptions}
                    value={
                      unitOptions.find(
                        (option) => option.value === row.unit,
                      ) ?? null
                    }
                    onChange={(option) => {
                      updateRow(index, "unit", option?.value ?? "");
                      setActiveRow(index);
                    }}
                    styles={selectStyles}
                    isClearable={false}
                    isSearchable={false}
                    menuPosition="fixed"
                    menuPortalTarget={
                      typeof document !== "undefined"
                        ? document.body
                        : undefined
                    }
                    placeholder=""
                  />
                </td>

                {/* Quantity */}
                <td className="h-[30px] border border-[#dce5ef] p-0 ">
                  <input
                    id={`txtQty-${index}`}
                    aria-label={`Quantity row ${index + 1}`}
                    type="number"
                    min="0"
                    step="any"
                    value={row.qty}
                    onFocus={() => setActiveRow(index)}
                    onChange={(event) =>
                      updateRow(index, "qty", event.target.value)
                    }
                    className={numberInputClass}
                  />
                </td>

                {/* S.Unit Price */}
                <td className="h-[30px] border border-[#dce5ef] p-0">
                  {renderPriceInput(
                    index,
                    "sUnitPrice",
                    "txtSUnitPrice",
                    "Supplier unit price",
                  )}
                </td>

                {/* S.Total Price */}
                <td className="h-[30px] border border-[#dce5ef] p-0">
                  {renderPriceInput(
                    index,
                    "sTotalPrice",
                    "txtSTotalPrice",
                    "Supplier total price",
                  )}
                </td>

                {/* Unit Price */}
                <td className="h-[30px] border border-[#dce5ef] p-0">
                  {renderPriceInput(
                    index,
                    "unitPrice",
                    "txtUnitPrice",
                    "Unit price",
                  )}
                </td>

                {/* Unit Cost */}
                <td className="h-[30px] border border-[#dce5ef] p-0">
                  {renderPriceInput(
                    index,
                    "unitCost",
                    "txtUnitCost",
                    "Unit cost",
                  )}
                </td>

                {/* Total Cost */}
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