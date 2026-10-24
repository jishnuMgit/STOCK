import { Play, X } from "lucide-react";
import React, { useState } from "react";
import Select, {
  components,
  type DropdownIndicatorProps,
  type FormatOptionLabelMeta,
  type MenuListProps,
  type StylesConfig,
} from "react-select";
import { RxTriangleDown } from "react-icons/rx";
import type { PurchaseRow } from "../../../hooks/Purchase/Transaction/usePurchaseInvoice";
import { useConfirmModal } from "../../../hooks/useConfirmModal";

type Option = {
  value: string; // item id
  label: string; // what the control shows (the id or the name)
  name: string; // item name, used for the menu text and for searching
  unit?: string; // item's unit, filled in when the item is picked
};

/* FC columns removed: Unit Price is typed, Total Price is calculated */
const columns = [
  { name: "Line", width: "38px", id: "txtSlNo" },
  { name: "Item ID", width: "158px", id: "lkpItemID" },
  { name: "Item Name", width: "auto", id: "lkpItemName" },
  { name: "Unit", width: "56px", id: "txtUnit" },
  { name: "Qty.", width: "58px", id: "txtQtyIn" },
  { name: "Unit Price", width: "85px", id: "txtUnitPrice" },
  { name: "Total Price", width: "90px", id: "txtTotPrice" },
  { name: "Unit Cost", width: "80px", id: "txtUnitCost" },
  { name: "Total Cost", width: "80px", id: "txtTotCost" },
];

const numericColumns = [
  "Qty.",
  "Unit Price",
  "Total Price",
  "Unit Cost",
  "Total Cost",
];

type PriceField = "unitPrice" | "totalPrice" | "unitCost" | "totalCost";

/* custom arrow for the item dropdowns */
const DropdownIndicator = (props: DropdownIndicatorProps<Option, false>) => (
  <components.DropdownIndicator {...props}>
    <RxTriangleDown size={16} />
  </components.DropdownIndicator>
);

// must match the Item ID column width in `columns` (158px)
const ID_COL_WIDTH = 158;

// width of the first column in the Item Name dropdown
const NAME_COL_WIDTH = 300;

// font size of the dropdown menu (header row + options)
const MENU_FONT_SIZE = 14;

type MenuVariant = "id" | "name";

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
  id: {
    firstTitle: "Item ID",
    secondTitle: "Item Name",
    firstWidth: ID_COL_WIDTH,
    first: (o) => o.value,
    second: (o) => o.name,
  },
  name: {
    firstTitle: "Item Name",
    secondTitle: "Item ID",
    firstWidth: NAME_COL_WIDTH,
    first: (o) => o.name,
    second: (o) => o.value,
  },
};

/* gray header row at the top of the dropdown menu (sticky while scrolling) */
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

const idSelectComponents = {
  DropdownIndicator,
  IndicatorSeparator: () => null,
  MenuList: createMenuList("id"),
};

const nameSelectComponents = {
  DropdownIndicator,
  IndicatorSeparator: () => null,
  MenuList: createMenuList("name"),
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

const formatIdLabel = createFormatLabel("id");
const formatNameLabel = createFormatLabel("name");

/* typing searches both the item id and the item name */
const filterItem = (option: { data: Option }, input: string): boolean => {
  const text = input.trim().toLowerCase();
  if (!text) return true;
  return (
    option.data.value.toLowerCase().includes(text) ||
    option.data.name.toLowerCase().includes(text)
  );
};

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
    fontSize: MENU_FONT_SIZE,
    marginTop: 1,
    width: 542,
    minWidth: 542,
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

const nameSelectStyles: StylesConfig<Option, false> = selectStyles;

const numberInputClass =
  "number-no-spinner h-[20px] w-full min-w-0 border-0 bg-transparent px-1 text-right outline-none focus:bg-blue-50";

/* cell that holds an input: outlined while the cursor is inside it */
const editCellClass =
  "h-[30px] border border-[#dce5ef] p-0 focus-within:outline-2 focus-within:-outline-offset-2 focus-within:outline-green-600";

interface Props {
  rows: PurchaseRow[];
  onRowChange: (index: number, patch: Partial<PurchaseRow>) => void;
  onRowDelete: (index: number) => void;
  disabled?: boolean; // posted invoice: no deleting
  lookups?: {
    itemIds?: Option[];
    itemNames?: Option[];
  };
}

const PurchaseTable: React.FC<Props> = ({
  rows,
  onRowChange,
  onRowDelete,
  disabled = false,
  lookups,
}) => {
  const [activeRow, setActiveRow] = useState(0);
  const { confirm, dialog } = useConfirmModal();

  // which item dropdown (if any) currently has its menu open,
  // e.g. "id-0" / "name-0"
  const [openMenuKey, setOpenMenuKey] = useState<string | null>(null);

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

  // Format quantity to three decimal places when leaving the field.
  const formatQty = (value: string): string => {
    if (value.trim() === "") return "";

    const number = Number(value);

    return Number.isFinite(number) ? number.toFixed(3) : "";
  };

  // Item ID and Item Name are the same field (fItemID), as in the VB grid.
  const handleItemChange = (index: number, option: Option | null) => {
    onRowChange(index, {
      itemId: option?.value ?? "",
      unit: option?.unit ?? "",
    });
    setActiveRow(index);
  };

  // Enter in an item dropdown: if the menu is closed and an item is already
  // selected, go to that row's Qty. (When the menu is open, Enter just
  // selects the highlighted option.)
  const handleItemKeyDown = (
    event: React.KeyboardEvent<HTMLDivElement>,
    index: number,
    menuKey: string,
  ) => {
    if (event.key !== "Enter") return;
    if (openMenuKey === menuKey) return; // let react-select pick the option
    if (!rows[index].itemId) return; // nothing selected yet

    event.preventDefault();
    document.getElementById(`txtQty-${index}`)?.focus();
  };

  // Ask first, then remove the row and put the cursor back on its Item ID.
  const handleDeleteClick = async (index: number) => {
    const ok = await confirm({
      title: "Purchase Invoice",
      message: `Do you want to delete Line ${index + 1} ?`,
    });
    if (!ok) return;

    onRowDelete(index);
    document.getElementById(`lkpItemID-${index}`)?.focus();
  };

  // Only Unit Price is typed by the user; the other price columns
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
      onKeyDown={(event) => {
        if (editable && event.key === "Enter") {
          event.preventDefault();
          document.getElementById(`lkpItemID-${index + 1}`)?.focus();
        }
      }}
      className={`${numberInputClass} ${editable ? "" : "bg-slate-100"}`}
    />
  );

  return (
    <>
      <section
        id="purchase-table"
        className="mx-3 mb-1 flex min-h-0 max-h-[393px] flex-1 flex-col overflow-hidden border border-b-0 border-[#dce5ef]"
      >
        <div className="customer-table-scroll min-h-0 max-h-fit flex-1 overflow-auto">
          <table className="w-full min-w-[928px] table-fixed border-collapse text-[11px]">
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

              {/* Delete button */}
              <col style={{ width: "28px" }} />
            </colgroup>

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

                <th className="sticky top-0 z-20 border border-[#dce5ef] bg-[#f1f6fc] p-0" />
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
                  <td className={editCellClass}>
                    <Select<Option, false>
                      inputId={`lkpItemID-${index}`}
                      instanceId={`item-id-${index}`}
                      options={itemIdOptions}
                      value={
                        itemIdOptions.find((o) => o.value === row.itemId) ??
                        null
                      }
                      onChange={(option) => handleItemChange(index, option)}
                      formatOptionLabel={formatIdLabel}
                      filterOption={filterItem}
                      styles={selectStyles}
                      components={idSelectComponents}
                      isClearable={false}
                      isSearchable
                      menuPosition="fixed"
                      menuPortalTarget={portalTarget}
                      placeholder=""
                      className="w-full"
                      onMenuOpen={() => setOpenMenuKey(`id-${index}`)}
                      onMenuClose={() =>
                        setOpenMenuKey((prev) =>
                          prev === `id-${index}` ? null : prev,
                        )
                      }
                      onKeyDown={(event) =>
                        handleItemKeyDown(event, index, `id-${index}`)
                      }
                    />
                  </td>

                  {/* Item Name (same itemId) */}
                  <td className={editCellClass}>
                    <Select<Option, false>
                      inputId={`lkpItemName-${index}`}
                      instanceId={`item-name-${index}`}
                      options={itemNameOptions}
                      value={
                        itemNameOptions.find((o) => o.value === row.itemId) ??
                        null
                      }
                      onChange={(option) => handleItemChange(index, option)}
                      formatOptionLabel={formatNameLabel}
                      filterOption={filterItem}
                      styles={nameSelectStyles}
                      components={nameSelectComponents}
                      isClearable={false}
                      isSearchable
                      menuPosition="fixed"
                      menuPortalTarget={portalTarget}
                      placeholder=""
                      className="w-full"
                      onMenuOpen={() => setOpenMenuKey(`name-${index}`)}
                      onMenuClose={() =>
                        setOpenMenuKey((prev) =>
                          prev === `name-${index}` ? null : prev,
                        )
                      }
                      onKeyDown={(event) =>
                        handleItemKeyDown(event, index, `name-${index}`)
                      }
                    />
                  </td>

                  {/* Unit: read-only, comes from the item. Enter -> Qty */}
                  <td className={editCellClass}>
                    <input
                      id={`txtUnit-${index}`}
                      aria-label={`Unit row ${index + 1}`}
                      type="text"
                      readOnly
                      value={row.unit}
                      onFocus={() => setActiveRow(index)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          document.getElementById(`txtQty-${index}`)?.focus();
                        }
                      }}
                      className="h-[20px] w-full min-w-0 border-0 bg-slate-100 px-1 outline-none focus:bg-blue-50"
                    />
                  </td>

                  {/* Quantity (3 decimals) */}
                  <td className={editCellClass}>
                    <input
                      id={`txtQty-${index}`}
                      aria-label={`Quantity row ${index + 1}`}
                      type="text"
                      inputMode="decimal"
                      autoComplete="off"
                      value={row.qty}
                      onFocus={(event) => {
                        setActiveRow(index);
                        event.currentTarget.select();
                      }}
                      onChange={(event) => {
                        const value = event.target.value;

                        // digits with at most 3 decimal places
                        if (value === "" || /^\d*\.?\d{0,3}$/.test(value)) {
                          onRowChange(index, { qty: value });
                        }
                      }}
                      onBlur={() =>
                        onRowChange(index, { qty: formatQty(rows[index].qty) })
                      }
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          document
                            .getElementById(`txtUnitPriceInput-${index}`)
                            ?.focus();
                        }
                      }}
                      className={numberInputClass}
                    />
                  </td>

                  {/* Unit Price (editable) */}
                  <td className={editCellClass}>
                    {renderPriceInput(
                      index,
                      "unitPrice",
                      "txtUnitPriceInput",
                      "Unit price",
                      true,
                    )}
                  </td>

                  {/* Total Price (calculated) */}
                  <td className={editCellClass}>
                    {renderPriceInput(
                      index,
                      "totalPrice",
                      "txtTotalPrice",
                      "Total price",
                    )}
                  </td>

                  {/* Unit Cost (calculated) */}
                  <td className={editCellClass}>
                    {renderPriceInput(
                      index,
                      "unitCost",
                      "txtUnitCost",
                      "Unit cost",
                    )}
                  </td>

                  {/* Total Cost (calculated) */}
                  <td className={editCellClass}>
                    {renderPriceInput(
                      index,
                      "totalCost",
                      "txtTotalCost",
                      "Total cost",
                    )}
                  </td>

                  {/* Delete: only for rows that have an item */}
                  <td className="h-[30px] border border-[#dce5ef] p-0 text-center">
                    {row.itemId && !disabled && (
                      <button
                        type="button"
                        tabIndex={-1}
                        aria-label={`Delete item, row ${index + 1}`}
                        title="Delete item"
                        onClick={() => handleDeleteClick(index)}
                        className="inline-flex h-[20px] w-[20px] cursor-pointer items-center justify-center rounded-sm text-slate-500 hover:bg-red-100 hover:text-red-600"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {dialog}
    </>
  );
};

export default PurchaseTable;
