import React, { useState } from "react";
import Select, { type StylesConfig } from "react-select";

// ============================================================
// TYPES
// ============================================================

type Option = {
  value: string;
  label: string;
};

type SalesInvoiceRow = {
  itemId: Option | null;
  itemName: Option | null;
  unit: Option | null;
  qty: string;
  unitPrice: string;
  discountAmount: string;
  vatAmount: string;
  totalPrice: string;
};

// ============================================================
// CONSTANTS
// ============================================================

const ROW_COUNT = 11;

// ============================================================
// OPTIONS
// ============================================================

const itemOptions: Option[] = [];

const unitOptions: Option[] = [];

// ============================================================
// CREATE ROW
// ============================================================

const createRow = (): SalesInvoiceRow => ({
  itemId: null,
  itemName: null,
  unit: null,
  qty: "",
  unitPrice: "",
  discountAmount: "",
  vatAmount: "",
  totalPrice: "",
});

const createRows = (): SalesInvoiceRow[] =>
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

    backgroundColor: state.isFocused
      ? "#eff6ff"
      : "transparent",

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
// NUMBER INPUT STYLE
// ============================================================

const numberInputClass =
  "number-no-spinner h-[20px] w-full min-w-0 border-0 bg-transparent px-1 text-right text-[11px] outline-none focus:bg-blue-50";

// ============================================================
// TABLE
// ============================================================

const SalesInvoiceTable: React.FC = () => {
  const [rows, setRows] =
    useState<SalesInvoiceRow[]>(createRows);

  const [activeRow, setActiveRow] = useState(0);

  // ==========================================================
  // UPDATE ROW
  // ==========================================================

  const updateRow = <K extends keyof SalesInvoiceRow>(
    index: number,
    field: K,
    value: SalesInvoiceRow[K],
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

  // ==========================================================
  // PRICE / NUMBER CHANGE
  // ==========================================================

  const handleNumberChange = (
    index: number,
    field:
      | "qty"
      | "unitPrice"
      | "discountAmount"
      | "vatAmount"
      | "totalPrice",
    value: string,
  ) => {
    // Allow empty value while typing
    if (value === "") {
      updateRow(index, field, value);
      return;
    }

    // Allow only numbers and decimal point
    if (!/^\d*\.?\d*$/.test(value)) {
      return;
    }

    updateRow(index, field, value);
  };

  // ==========================================================
  // FORMAT NUMBER
  // ==========================================================

  const formatNumber = (value: string): string => {
    if (value.trim() === "") {
      return "";
    }

    const number = Number(value);

    if (!Number.isFinite(number)) {
      return "";
    }

    return number.toFixed(2);
  };

  // ==========================================================
  // NUMBER INPUT
  // ==========================================================

  const renderNumberInput = (
    index: number,
    field:
      | "qty"
      | "unitPrice"
      | "discountAmount"
      | "vatAmount"
      | "totalPrice",
    id: string,
    label: string,
  ) => {
    return (
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
        onChange={(event) => {
          handleNumberChange(
            index,
            field,
            event.target.value,
          );
        }}
        onBlur={() => {
          const value = rows[index][field];

          if (value !== "") {
            updateRow(
              index,
              field,
              formatNumber(value),
            );
          }
        }}
        className={numberInputClass}
      />
    );
  };

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <section
      id="sales-invoice-table"
      className="mx-[11px] mb-0 mt-6 flex h-[370px] min-h-0 flex-col overflow-hidden border-b-0 border border-[#dce5ef]"
    >
      <div className="customer-table-scroll min-h-0 flex-1 overflow-auto">
        <table className="w-full min-w-[900px] table-fixed border-collapse text-[11px]">
          {/* ==================================================
              COLUMN WIDTHS
          ================================================== */}

          <colgroup>
            {/* Row indicator */}
            <col style={{ width: "14px" }} />

            {/* Sl */}
            <col style={{ width: "28px" }} />

            {/* Item ID */}
            <col style={{ width: "158px" }} />

            {/* Item Name */}
            <col style={{ width: "auto" }} />

            {/* Unit */}
            <col style={{ width: "56px" }} />

            {/* Qty */}
            <col style={{ width: "58px" }} />

            {/* Unit Price */}
            <col style={{ width: "85px" }} />

            {/* U.Disc Amt */}
            <col style={{ width: "90px" }} />

            {/* VAT Amt */}
            <col style={{ width: "90px" }} />

            {/* Total Price */}
            <col style={{ width: "90px" }} />
          </colgroup>

          {/* ==================================================
              HEADER
          ================================================== */}

          <thead>
            <tr className="h-[30px]">
              {/* Empty row selector column */}

              <th
                className="
                  sticky
                  top-0
                  z-20
                  border
                  border-[#dce5ef]
                  bg-[#f1f6fc]
                  p-0
                "
              />

              {/* Sl */}

              <th
                className="
                  sticky
                  top-0
                  z-20
                  h-[30px]
                  whitespace-nowrap
                  border
                  border-[#dce5ef]
                  bg-[#f1f6fc]
                  px-1
                  py-0
                  text-left
                  align-middle
                  font-semibold
                  text-[#202a36]
                "
              >
                Sl.
              </th>

              {/* Item ID */}

              <th
                className="
                  sticky
                  top-0
                  z-20
                  h-[30px]
                  whitespace-nowrap
                  border
                  border-[#dce5ef]
                  bg-[#f1f6fc]
                  px-1
                  py-0
                  text-left
                  align-middle
                  font-semibold
                  text-[#202a36]
                "
              >
                Item ID
              </th>

              {/* Item Name */}

              <th
                className="
                  sticky
                  top-0
                  z-20
                  h-[30px]
                  whitespace-nowrap
                  border
                  border-[#dce5ef]
                  bg-[#f1f6fc]
                  px-1
                  py-0
                  text-left
                  align-middle
                  font-semibold
                  text-[#202a36]
                "
              >
                Item Name
              </th>

              {/* Unit */}

              <th
                className="
                  sticky
                  top-0
                  z-20
                  h-[30px]
                  whitespace-nowrap
                  border
                  border-[#dce5ef]
                  bg-[#f1f6fc]
                  px-1
                  py-0
                  text-center
                  align-middle
                  font-semibold
                  text-[#202a36]
                "
              >
                Unit
              </th>

              {/* Qty */}

              <th
                className="
                  sticky
                  top-0
                  z-20
                  h-[30px]
                  whitespace-nowrap
                  border
                  border-[#dce5ef]
                  bg-[#f1f6fc]
                  px-1
                  py-0
                  text-right
                  align-middle
                  font-semibold
                  text-[#202a36]
                "
              >
                Qty.
              </th>

              {/* Unit Price */}

              <th
                className="
                  sticky
                  top-0
                  z-20
                  h-[30px]
                  whitespace-nowrap
                  border
                  border-[#dce5ef]
                  bg-[#f1f6fc]
                  px-1
                  py-0
                  text-right
                  align-middle
                  font-semibold
                  text-[#202a36]
                "
              >
                Unit Price
              </th>

              {/* U.Disc Amt */}

              <th
                className="
                  sticky
                  top-0
                  z-20
                  h-[30px]
                  whitespace-nowrap
                  border
                  border-[#dce5ef]
                  bg-[#f1f6fc]
                  px-1
                  py-0
                  text-right
                  align-middle
                  font-semibold
                  text-[#202a36]
                "
              >
                U.Disc Amt.
              </th>

              {/* VAT Amt */}

              <th
                className="
                  sticky
                  top-0
                  z-20
                  h-[30px]
                  whitespace-nowrap
                  border
                  border-[#dce5ef]
                  bg-[#f1f6fc]
                  px-1
                  py-0
                  text-right
                  align-middle
                  font-semibold
                  text-[#202a36]
                "
              >
                VAT Amt.
              </th>

              {/* Total Price */}

              <th
                className="
                  sticky
                  top-0
                  z-20
                  h-[30px]
                  whitespace-nowrap
                  border
                  border-[#dce5ef]
                  bg-[#f1f6fc]
                  px-1
                  py-0
                  text-right
                  align-middle
                  font-semibold
                  text-[#202a36]
                "
              >
                Total Price
              </th>
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
                onFocusCapture={() =>
                  setActiveRow(index)
                }
                className={`
                  h-[30px]
                  ${
                    activeRow === index
                      ? "bg-[#f4f8fd]"
                      : "bg-white"
                  }
                  hover:bg-blue-50
                `}
              >
                {/* ==================================================
                    ACTIVE ROW INDICATOR
                ================================================== */}

                <td
                  className="
                    h-[23px]
                    border
                    border-[#dce5ef]
                    p-0
                    text-center
                    text-[9px]
                    text-[#263449]
                  "
                  aria-label={
                    activeRow === index
                      ? "Active row"
                      : undefined
                  }
                >
                  {activeRow === index ? "▾" : ""}
                </td>

                {/* ==================================================
                    SL NO
                ================================================== */}

                <td
                  className="
                    h-[23px]
                    border
                    border-[#dce5ef]
                    p-0
                    text-center
                  "
                >
                  {index + 1}
                </td>

                {/* ==================================================
                    ITEM ID
                ================================================== */}

                <td
                  className="
                    h-[23px]
                    border
                    border-[#dce5ef]
                    p-0
                  "
                >
                  <Select<Option, false>
                    inputId={`lkpItemID-${index}`}
                    instanceId={`item-id-${index}`}
                    options={itemOptions}
                    value={row.itemId}
                    onChange={(option) => {
                      updateRow(
                        index,
                        "itemId",
                        option,
                      );

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

                {/* ==================================================
                    ITEM NAME
                ================================================== */}

                <td
                  className="
                    h-[23px]
                    border
                    border-[#dce5ef]
                    p-0
                  "
                >
                  <Select<Option, false>
                    inputId={`lkpItemName-${index}`}
                    instanceId={`item-name-${index}`}
                    options={itemOptions}
                    value={row.itemName}
                    onChange={(option) => {
                      updateRow(
                        index,
                        "itemName",
                        option,
                      );

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

                {/* ==================================================
                    UNIT
                ================================================== */}

                <td
                  className="
                    h-[23px]
                    border
                    border-[#dce5ef]
                    p-0
                  "
                >
                  <Select<Option, false>
                    inputId={`txtUnit-${index}`}
                    instanceId={`unit-${index}`}
                    options={unitOptions}
                    value={row.unit}
                    onChange={(option) => {
                      updateRow(
                        index,
                        "unit",
                        option,
                      );

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
                    className="w-full"
                  />
                </td>

                {/* ==================================================
                    QUANTITY
                ================================================== */}

                <td
                  className="
                    h-[23px]
                    border
                    border-[#dce5ef]
                    p-0
                  "
                >
                  {renderNumberInput(
                    index,
                    "qty",
                    "txtQty",
                    "Quantity",
                  )}
                </td>

                {/* ==================================================
                    UNIT PRICE
                ================================================== */}

                <td
                  className="
                    h-[23px]
                    border
                    border-[#dce5ef]
                    p-0
                  "
                >
                  {renderNumberInput(
                    index,
                    "unitPrice",
                    "txtUnitPrice",
                    "Unit price",
                  )}
                </td>

                {/* ==================================================
                    DISCOUNT
                ================================================== */}

                <td
                  className="
                    h-[23px]
                    border
                    border-[#dce5ef]
                    p-0
                  "
                >
                  {renderNumberInput(
                    index,
                    "discountAmount",
                    "txtUDiscAmt",
                    "Unit discount amount",
                  )}
                </td>

                {/* ==================================================
                    VAT
                ================================================== */}

                <td
                  className="
                    h-[23px]
                    border
                    border-[#dce5ef]
                    p-0
                  "
                >
                  {renderNumberInput(
                    index,
                    "vatAmount",
                    "txtVATAmt",
                    "VAT amount",
                  )}
                </td>

                {/* ==================================================
                    TOTAL PRICE
                ================================================== */}

                <td
                  className="
                    h-[23px]
                    border
                    border-[#dce5ef]
                    p-0
                  "
                >
                  {renderNumberInput(
                    index,
                    "totalPrice",
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