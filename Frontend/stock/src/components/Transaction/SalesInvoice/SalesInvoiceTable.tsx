import React, { useEffect, useMemo, useState } from "react";
import { Play, X } from "lucide-react";
import {
  components,
  type FormatOptionLabelMeta,
  type MenuListProps,
  type StylesConfig,
} from "react-select";
import selectComponents from "../../sharecomponents/selectComponents";
import type { ItemLookup, SalesRow } from "../../../hooks/useSalesInvoice"; // adjust path to your hook
import { useConfirmModal } from "../../../hooks/useConfirmModal"; // adjust path
import SingleSelect, {
  SingleSelectMenuColumns,
} from "../../common/SingleSelect";

// ============================================================
// TYPES
// ============================================================

type Option = {
  value: string; // item id
  label: string; // what the control shows (the id or the name)
  name: string; // item name, used for the menu text and for searching
};

type EditableNumberField = "qty" | "unitPrice" | "itemDiscAmt";

type SalesInvoiceTableProps = {
  rows: SalesRow[];
  items: ItemLookup[];
  defaultPriceLevel: string;
  readOnly: boolean;
  onRowsChange: (rows: SalesRow[], recalc: boolean) => void;
  /** item id of the active row ("" when the row is empty) */
  onActiveItemChange: (itemId: string) => void;
};

// ============================================================
// ITEM LOOKUP MENU (two columns, gray header row)
// same look as the purchase invoice table
// ============================================================

// must match the Item ID column width in <colgroup> (200px)
const ID_COL_WIDTH = 200;

// font size of the dropdown menu (header row + options)
const MENU_FONT_SIZE = 14;

type MenuVariant = "id" | "name";

const menuLayout: Record<
  MenuVariant,
  {
    firstTitle: string;
    secondTitle: string;
    first: (o: Option) => string;
    second: (o: Option) => string;
  }
> = {
  id: {
    firstTitle: "Item ID",
    secondTitle: "Item Name",
    first: (o) => o.value,
    second: (o) => o.name,
  },
  name: {
    firstTitle: "Item Name",
    secondTitle: "Item ID",
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
        <SingleSelectMenuColumns>
          <div
            style={{
              minWidth: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              boxSizing: "border-box",
              padding: "5px 8px",
              borderRight: "1px solid #cfcfcf",
            }}
          >
            {layout.firstTitle}
          </div>
          <div
            style={{
              minWidth: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              boxSizing: "border-box",
              padding: "5px 8px",
            }}
          >
            {layout.secondTitle}
          </div>
        </SingleSelectMenuColumns>
      </div>
      {props.children}
    </components.MenuList>
  );

  return MenuList;
};

const idSelectComponents = {
  ...selectComponents,
  MenuList: createMenuList("id"),
};

const nameSelectComponents = {
  ...selectComponents,
  MenuList: createMenuList("name"),
};

/* menu rows show two columns; the control shows only its own label */
const createFormatLabel =
  (variant: MenuVariant) =>
  (option: Option, meta: FormatOptionLabelMeta<Option>) => {
    if (meta.context !== "menu") return option.label;

    const layout = menuLayout[variant];

    return (
      <SingleSelectMenuColumns>
        <div
          style={{
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            boxSizing: "border-box",
            padding: "6px 8px",
            borderRight: "1px solid #e3e8ef",
          }}
        >
          {layout.first(option)}
        </div>
        <div
          style={{
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            boxSizing: "border-box",
            padding: "6px 8px",
          }}
        >
          {layout.second(option)}
        </div>
      </SingleSelectMenuColumns>
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
    fontSize: MENU_FONT_SIZE,
    marginTop: 1,
    width: 665,
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

const tdClass = "h-7.5 border border-[#dce5ef] p-0";

/* cell that holds an input: outlined while the cursor is inside it */
const editCellClass =
  "h-7.5 border border-[#dce5ef] p-0 focus-within:outline-2 focus-within:-outline-offset-2 focus-within:outline-green-600";

// ============================================================
// TABLE
// ============================================================

const SalesInvoiceTable: React.FC<SalesInvoiceTableProps> = ({
  rows,
  items,
  defaultPriceLevel,
  readOnly,
  onRowsChange,
  onActiveItemChange,
}) => {
  const [activeRow, setActiveRow] = useState(0);
  const { confirm, dialog } = useConfirmModal();

  // which item dropdown (if any) currently has its menu open,
  // e.g. "id-0" / "name-0"
  const [openMenuKey, setOpenMenuKey] = useState<string | null>(null);

  // report the item of the active row (VB: stock shown when a grid row is clicked)
  const activeItemId = rows[activeRow]?.itemId ?? "";
  useEffect(() => {
    onActiveItemChange(activeItemId);
  }, [activeItemId, onActiveItemChange]);

  // ==========================================================
  // ITEM OPTIONS
  // ==========================================================

  const itemIdOptions = useMemo<Option[]>(
    () => items.map((i) => ({ value: i.id, label: i.id, name: i.name })),
    [items],
  );

  const itemNameOptions = useMemo<Option[]>(
    () => items.map((i) => ({ value: i.id, label: i.name, name: i.name })),
    [items],
  );

  const itemById = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);

  // selected values (fall back to the saved id if the item is not in the list)
  const idValue = (itemId: string): Option | null =>
    itemId
      ? {
          value: itemId,
          label: itemId,
          name: itemById.get(itemId)?.name ?? "",
        }
      : null;

  const nameValue = (itemId: string): Option | null => {
    if (!itemId) return null;
    const name = itemById.get(itemId)?.name || itemId;
    return { value: itemId, label: name, name };
  };

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
  // ENTER KEY NAVIGATION
  //   Item ID / Item Name -> Qty -> Unit Price -> U.Disc Amt.
  //   -> Item ID of the next row
  //   Unit -> Qty
  // ==========================================================

  const focusById = (id: string) => {
    const el = document.getElementById(id) as HTMLInputElement | null;
    if (!el) return;
    el.focus();
    if (el.type === "text" && !el.readOnly) el.select();
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
    focusById(`txtQty-${index}`);
  };

  const handleEnterTo =
    (nextId: string) => (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      focusById(nextId);
    };

  // ==========================================================
  // DELETE ROW (X button and F5)
  // Ask first, then remove the row and put the cursor back on its Item ID.
  // ==========================================================

  const handleDeleteRow = async (index: number) => {
    if (readOnly || !rows[index].itemId) return;

    const ok = await confirm({
      title: "Sales Invoice",
      message: `Do you want to delete Line ${index + 1} ?`,
    });
    if (!ok) return;

    onRowsChange(
      rows.filter((_, rowIndex) => rowIndex !== index),
      true,
    );
    setTimeout(() => focusById(`lkpItemID-${index}`), 0);
  };

  const handleRowKeyDown = (
    event: React.KeyboardEvent<HTMLTableRowElement>,
    index: number,
  ) => {
    if (event.key !== "F5") return;

    event.preventDefault(); // stop the browser refresh
    handleDeleteRow(index);
  };

  // ==========================================================
  // INPUTS
  // ==========================================================

  const renderNumberInput = (
    index: number,
    field: EditableNumberField,
    id: string,
    label: string,
    nextId: string,
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
      onKeyDown={handleEnterTo(nextId)}
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
    <>
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
              <col style={{ width: "38px" }} />
              <col style={{ width: `${ID_COL_WIDTH}px` }} />
              <col style={{ width: "auto" }} />
              <col style={{ width: "56px" }} />
              <col style={{ width: "58px" }} />
              <col style={{ width: "75px" }} />
              <col style={{ width: "70px" }} />
              <col style={{ width: "70px" }} />
              <col style={{ width: "90px" }} />
              {/* Delete button */}
              <col style={{ width: "28px" }} />
            </colgroup>

            {/* ==================================================
                HEADER
            ================================================== */}

            <thead>
              <tr className="h-7.5">
                <th className="sticky top-0 z-20 border border-[#dce5ef] bg-[#f1f6fc] p-0" />
                <th className={`${thClass} text-left`}>Line</th>
                <th className={`${thClass} text-left`}>Item ID</th>
                <th className={`${thClass} text-left`}>Item Name</th>
                <th className={`${thClass} text-left`}>Unit</th>
                <th className={`${thClass} text-right`}>Qty.</th>
                <th className={`${thClass} text-right`}>Unit Price</th>
                <th className={`${thClass} text-right`}>U.Disc Amt.</th>
                <th className={`${thClass} text-right`}>VAT Amt.</th>
                <th className={`${thClass} text-right`}>Total Price</th>
                <th className="sticky top-0 z-20 border border-[#dce5ef] bg-[#f1f6fc] p-0" />
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
                    {activeRow === index ? <Play size={10} /> : ""}
                  </td>

                  {/* LINE NO */}

                  <td className={`${tdClass} text-center`}>{index + 1}</td>

                  {/* ITEM ID */}

                  <td className={editCellClass}>
                    <SingleSelect<Option>
                      mode="item"
                      menuColumnWidths={["200px", "1fr"]}
                      selectProps={{
                        inputId: `lkpItemID-${index}`,
                        instanceId: `item-id-${index}`,
                        options: itemIdOptions,
                        value: idValue(row.itemId),
                        onChange: (option) => handleItemSelect(index, option),
                        formatOptionLabel: formatIdLabel,
                        filterOption: filterItem,
                        styles: selectStyles,
                        components: idSelectComponents,
                        isClearable: false,
                        isSearchable: true,
                        isDisabled: readOnly,
                        menuPosition: "fixed",
                        menuPortalTarget,
                        placeholder: "",
                        className: "w-full",
                        onMenuOpen: () => setOpenMenuKey(`id-${index}`),
                        onMenuClose: () =>
                          setOpenMenuKey((prev) =>
                            prev === `id-${index}` ? null : prev,
                          ),
                        onKeyDown: (event) =>
                          handleItemKeyDown(event, index, `id-${index}`),
                      }}
                    />
                  </td>

                  {/* ITEM NAME */}

                  <td className={editCellClass}>
                    <SingleSelect<Option>
                      mode="item"
                      menuColumnWidths={["1fr", "185px"]}
                      selectProps={{
                        inputId: `lkpItemName-${index}`,
                        instanceId: `item-name-${index}`,
                        options: itemNameOptions,
                        value: nameValue(row.itemId),
                        onChange: (option) => handleItemSelect(index, option),
                        formatOptionLabel: formatNameLabel,
                        filterOption: filterItem,
                        styles: selectStyles,
                        components: nameSelectComponents,
                        isClearable: false,
                        isSearchable: true,
                        isDisabled: readOnly,
                        menuPosition: "fixed",
                        menuPortalTarget,
                        placeholder: "",
                        className: "w-full",
                        onMenuOpen: () => setOpenMenuKey(`name-${index}`),
                        onMenuClose: () =>
                          setOpenMenuKey((prev) =>
                            prev === `name-${index}` ? null : prev,
                          ),
                        onKeyDown: (event) =>
                          handleItemKeyDown(event, index, `name-${index}`),
                      }}
                    />
                  </td>

                  {/* UNIT: Enter -> Qty */}

                  <td className={editCellClass}>
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
                      onKeyDown={handleEnterTo(`txtQty-${index}`)}
                      className={textInputClass}
                    />
                  </td>

                  {/* QUANTITY: Enter -> Unit Price */}

                  <td className={editCellClass}>
                    {renderNumberInput(
                      index,
                      "qty",
                      "txtQty",
                      "Quantity",
                      `txtUnitPrice-${index}`,
                    )}
                  </td>

                  {/* UNIT PRICE: Enter -> U.Disc Amt. */}

                  <td className={editCellClass}>
                    {renderNumberInput(
                      index,
                      "unitPrice",
                      "txtUnitPrice",
                      "Unit price",
                      `txtUDiscAmt-${index}`,
                    )}
                  </td>

                  {/* UNIT DISCOUNT: Enter -> next row Item ID */}

                  <td className={editCellClass}>
                    {renderNumberInput(
                      index,
                      "itemDiscAmt",
                      "txtUDiscAmt",
                      "Unit discount amount",
                      `lkpItemID-${index + 1}`,
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

                  {/* DELETE: only for rows that have an item */}

                  <td className={`${tdClass} text-center`}>
                    {row.itemId && !readOnly && (
                      <button
                        type="button"
                        tabIndex={-1}
                        aria-label={`Delete item, row ${index + 1}`}
                        title="Delete item"
                        onClick={() => handleDeleteRow(index)}
                        className="inline-flex h-5 w-5 cursor-pointer items-center justify-center rounded-sm text-slate-500 hover:bg-red-100 hover:text-red-600"
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

export default SalesInvoiceTable;
