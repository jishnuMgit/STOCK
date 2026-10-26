import React, { useMemo, useState } from "react";
import { Play } from "lucide-react";
import Select, { type StylesConfig } from "react-select";

import {
  filterPairOption,
  makePairComponents,
  makePairDividedMenuStyles,
} from "../../PairSelect/pairSelectParts";
import { usePairMenuHang } from "../../../hooks/usePairMenuHang";
import { useAdvanceAfterSelect } from "../../../hooks/useAdvanceAfterSelect";
import { useGridCellFocus } from "../../../hooks/useGridCellFocus";
import {
  isEmptyRow,
  padRows,
  type AccountOption,
  type BeginningBalanceRow,
} from "./BeginningBalanceShared";

// ============================================================
// PROPS: the page owns the rows (and the lists); the grid edits them
// ============================================================

type Props = {
  rows: BeginningBalanceRow[];
  setRows: React.Dispatch<React.SetStateAction<BeginningBalanceRow[]>>;
  accountsByID: AccountOption[];
  accountsByName: AccountOption[];
  costCenters: AccountOption[];
  // a posted balance is locked
  disabled: boolean;
  // the x of a row: takes the line out of the grid (it is gone from the database
  // when the balance is saved)
  onRemoveRow: (index: number) => void;
};

// ============================================================
// SELECT STYLES
// ============================================================

const selectStyles: StylesConfig<AccountOption, false> = {
  control: (base, state) => ({
    ...base,
    minHeight: 25,
    height: 25,
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
    height: 25,
    minHeight: 25,
    padding: "0 5px",
    overflow: "hidden",
  }),

  singleValue: (base) => ({
    ...base,
    color: "#202020",
    fontSize: 11,
    margin: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  }),

  placeholder: (base) => ({
    ...base,
    color: "#64748b",
    fontSize: 11,
    margin: 0,
  }),

  input: (base) => ({
    ...base,
    margin: 0,
    padding: 0,
    fontSize: 11,
  }),

  indicatorsContainer: (base) => ({
    ...base,
    height: 25,
  }),

  dropdownIndicator: (base) => ({
    ...base,
    padding: "0 2px",
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
    padding: "5px 7px",
    fontSize: 11,
    color: "#202020",
    cursor: "pointer",

    backgroundColor: state.isSelected
      ? "#dbeafe"
      : state.isFocused
        ? "#eff6ff"
        : "#ffffff",
  }),
};

// ID | Name lists with the divider, the same as the Item ID / Item Name boxes of
// Beginning Stock (components/PairSelect): the Account ID list covers the ID box
// AND the Name box next to it; the Account Name list is exactly as wide as its box
// with the Account ID after it, out to the Debit column (both measured when the
// list opens, see usePairMenuHang)
const accountIdComponents = makePairComponents("Account ID", "Account Name", false, true);
const accountNameComponents = makePairComponents("Account ID", "Account Name", true, true);

// the C.C. ID box is narrow: its list hangs a fixed 200px past it
const CC_MENU_HANG = 200;
const ccComponents = makePairComponents("C.C. ID", "C.C. Name", false, true, CC_MENU_HANG);
const ccStyles = {
  ...selectStyles,
  ...makePairDividedMenuStyles(CC_MENU_HANG),
} as StylesConfig<AccountOption, false>;

// ============================================================
// NUMBER INPUT
// ============================================================

const numberInputClass =
  "h-[30px] w-full border-0 bg-transparent px-2 text-right text-[11px] text-[#202020] outline-none focus:bg-blue-50";

// ============================================================
// TABLE
// ============================================================

const BeginningBalanceTable: React.FC<Props> = ({
  rows,
  setRows,
  accountsByID,
  accountsByName,
  costCenters,
  disabled,
  onRemoveRow,
}) => {
  const [activeRow, setActiveRow] =
    useState(0);

  // the cell the cursor is in is outlined
  const { cellFocusClass } = useGridCellFocus();

  // Enter / Tab / click on a dropdown goes on to the next box of the row
  const { advanceAfterPick, advanceOnEnter } =
    useAdvanceAfterSelect();

  // the Account ID list covers the ID box AND the Name box next to it ...
  const {
    hang: idMenuHang,
    measure: measureIdMenuHang,
  } = usePairMenuHang();

  // ... and the Account Name list reaches the right edge of the Debit column
  const {
    hang: nameMenuHang,
    measure: measureNameMenuHang,
  } = usePairMenuHang(170);

  // the option of an account / cost center, by its ID (the value of the row)
  const accountIdByCode = useMemo(
    () =>
      new Map(
        accountsByID.map((option) => [
          option.value,
          option,
        ]),
      ),
    [accountsByID],
  );

  const accountNameByCode = useMemo(
    () =>
      new Map(
        accountsByName.map((option) => [
          option.value,
          option,
        ]),
      ),
    [accountsByName],
  );

  const costCenterByCode = useMemo(
    () =>
      new Map(
        costCenters.map((option) => [
          option.value,
          option,
        ]),
      ),
    [costCenters],
  );

  // ==========================================================
  // UPDATE ROW
  // ==========================================================

  const updateRow = <
    K extends keyof BeginningBalanceRow,
  >(
    index: number,
    field: K,
    value: BeginningBalanceRow[K],
  ) => {
    setRows((previousRows) =>
      padRows(
        previousRows.map((row, rowIndex) =>
          rowIndex === index
            ? {
                ...row,
                [field]: value,
              }
            : row,
        ),
      ),
    );
  };

  // ==========================================================
  // ACCOUNT CHANGE: the Account ID and the Account Name boxes are one account.
  // The cost center is only for an account that needs one.
  // ==========================================================

  const handleAccountChange = (
    index: number,
    option: AccountOption | null,
  ) => {
    if (!option) return;

    setRows((previousRows) =>
      padRows(
        previousRows.map((row, rowIndex) =>
          rowIndex === index
            ? {
                ...row,
                lkpAccountID: option.value,
                lkpCCID: option.chkHaveCC
                  ? row.lkpCCID
                  : "",
              }
            : row,
        ),
      ),
    );

    setActiveRow(index);
  };

  // ==========================================================
  // NUMBER CHANGE
  // ==========================================================

  const handleNumberChange = (
    index: number,
    field: "txtDebit" | "txtCredit",
    value: string,
  ) => {
    if (value === "") {
      updateRow(index, field, value);
      return;
    }

    if (!/^\d*\.?\d*$/.test(value)) {
      return;
    }

    updateRow(index, field, value);
  };

  // an amount is shown with two decimals once you leave the box (1000.5 -> 1000.50)
  const handleNumberBlur = (
    index: number,
    field: "txtDebit" | "txtCredit",
    value: string,
  ) => {
    if (value === "") return;

    const number = Number(value);

    if (Number.isFinite(number)) {
      updateRow(index, field, number.toFixed(2));
    }
  };

  // Enter: Debit goes on to Credit, Credit to the Account ID of the next row
  const handleNumberKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>,
    index: number,
    field: "txtDebit" | "txtCredit",
  ) => {
    if (event.key !== "Enter") return;

    event.preventDefault();

    document
      .getElementById(
        field === "txtDebit"
          ? `txtCredit-${index}`
          : `lkpAccountID-${index + 1}`,
      )
      ?.focus();
  };

  // ==========================================================
  // RENDER NUMBER
  // ==========================================================

  const renderNumberInput = (
    index: number,
    field: "txtDebit" | "txtCredit",
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
        readOnly={disabled}
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
        onBlur={(event) =>
          handleNumberBlur(
            index,
            field,
            event.target.value,
          )
        }
        onKeyDown={(event) =>
          handleNumberKeyDown(event, index, field)
        }
        className={numberInputClass}
      />
    );
  };

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <section
      id="beginning-balance-table"
      className="
        mx-[16px]
        flex
        h-[438px]
        min-h-0
        flex-col
        overflow-hidden
        border
        border-[#bdebd4]
      "
    >
      <div className="min-h-0 flex-1 overflow-auto">

        <table
          className="
            w-full
            min-w-[850px]
            table-fixed
            border-collapse
            text-[11px]
          "
        >

          {/* ==================================================
              COLUMN WIDTHS
          ================================================== */}

          <colgroup>
            {/* Active row */}

            <col style={{ width: "15px" }} />

            {/* Account ID */}

            <col style={{ width: "105px" }} />

            {/* Account Name */}

            <col style={{ width: "auto" }} />

            {/* CC ID */}

            <col style={{ width: "68px" }} />

            {/* Debit */}

            <col style={{ width: "130px" }} />

            {/* Credit (and the x of the row) */}

            <col style={{ width: "154px" }} />
          </colgroup>

          {/* ==================================================
              HEADER
          ================================================== */}

          <thead>
            <tr className="h-[30px]">

              {/* Empty selector */}

              <th
                className="
                  sticky
                  top-0
                  z-20
                  border
                  border-[#bdebd4]
                  bg-[#effcf5]
                  p-0
                "
              />

              {/* Account ID */}

              <th
                className="
                  sticky
                  top-0
                  z-20
                  border
                  border-[#bdebd4]
                  bg-[#effcf5]
                  px-2
                  py-0
                  text-left
                  font-semibold
                  text-[#30435b]
                "
              >
                Account ID
              </th>

              {/* Account Name */}

              <th
                className="
                  sticky
                  top-0
                  z-20
                  border
                  border-[#bdebd4]
                  bg-[#effcf5]
                  px-2
                  py-0
                  text-left
                  font-semibold
                  text-[#30435b]
                "
              >
                Account Name
              </th>

              {/* CC ID */}

              <th
                className="
                  sticky
                  top-0
                  z-20
                  border
                  border-[#bdebd4]
                  bg-[#effcf5]
                  px-2
                  py-0
                  text-center
                  font-semibold
                  text-[#30435b]
                "
              >
                C.C. ID
              </th>

              {/* Debit */}

              <th
                className="
                  sticky
                  top-0
                  z-20
                  border
                  border-[#bdebd4]
                  bg-[#effcf5]
                  px-2
                  py-0
                  text-center
                  font-semibold
                  text-[#30435b]
                "
              >
                Debit
              </th>

              {/* Credit */}

              <th
                className="
                  sticky
                  top-0
                  z-20
                  border
                  border-[#bdebd4]
                  bg-[#effcf5]
                  px-2
                  py-0
                  text-center
                  font-semibold
                  text-[#30435b]
                "
              >
                Credit
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
                onClick={() =>
                  setActiveRow(index)
                }
                onFocusCapture={() =>
                  setActiveRow(index)
                }
                className={`
                  h-[30px]
                  ${
                    activeRow === index
                      ? "bg-[#f8fcfa]"
                      : "bg-white"
                  }
                  hover:bg-[#f1faf6]
                `}
              >

                {/* ==================================================
                    ACTIVE ROW
                ================================================== */}

                <td
                  className="
                    h-[30px]
                    border
                    border-[#bdebd4]
                    p-0
                    text-center
                  "
                >
                  {activeRow === index ? (
                    <Play
                      size={7}
                      strokeWidth={2}
                      className="mx-auto"
                    />
                  ) : null}
                </td>

                {/* ==================================================
                    ACCOUNT ID
                ================================================== */}

                <td
                  className={`
                    h-[30px] border border-[#bdebd4] p-0 ${cellFocusClass}
                  `}
                >
                  <div
                    onKeyDown={(event) =>
                      advanceOnEnter(event, [
                        `lkpAccountName-${index}`,
                      ])
                    }
                  >
                    <Select<AccountOption, false>
                      inputId={`lkpAccountID-${index}`}
                      instanceId={`lkpAccountID-${index}`}
                      name="lkpAccountID"
                      aria-label="Account ID"
                      options={accountsByID}
                      value={
                        accountIdByCode.get(
                          row.lkpAccountID,
                        ) ?? null
                      }
                      onChange={(option) => {
                        handleAccountChange(
                          index,
                          option,
                        );

                        if (option) {
                          advanceAfterPick(
                            `lkpAccountID-${index}`,
                            [`lkpAccountName-${index}`],
                          );
                        }
                      }}
                      styles={
                        {
                          ...selectStyles,
                          ...makePairDividedMenuStyles(
                            idMenuHang,
                          ),
                        } as StylesConfig<AccountOption, false>
                      }
                      onMenuOpen={() =>
                        measureIdMenuHang(
                          `lkpAccountID-${index}`,
                          `lkpAccountName-${index}`,
                        )
                      }
                      components={accountIdComponents}
                      filterOption={filterPairOption}
                      noOptionsMessage={() =>
                        "No Account Found"
                      }
                      isClearable={false}
                      isDisabled={disabled}
                      isSearchable
                      menuPosition="fixed"
                      menuPlacement="auto"
                      menuPortalTarget={
                        typeof document !== "undefined"
                          ? document.body
                          : undefined
                      }
                      placeholder=""
                    />
                  </div>
                </td>

                {/* ==================================================
                    ACCOUNT NAME
                ================================================== */}

                <td
                  className={`
                    h-[30px] border border-[#bdebd4] p-0 ${cellFocusClass}
                  `}
                >
                  <div
                    onKeyDown={(event) =>
                      advanceOnEnter(event)
                    }
                  >
                    <Select<AccountOption, false>
                      inputId={`lkpAccountName-${index}`}
                      instanceId={`lkpAccountName-${index}`}
                      name="lkpAccountName"
                      aria-label="Account Name"
                      options={accountsByName}
                      value={
                        accountNameByCode.get(
                          row.lkpAccountID,
                        ) ?? null
                      }
                      onChange={(option) => {
                        handleAccountChange(
                          index,
                          option,
                        );

                        if (option) {
                          advanceAfterPick(
                            `lkpAccountName-${index}`,
                          );
                        }
                      }}
                      styles={
                        {
                          ...selectStyles,
                          ...makePairDividedMenuStyles(
                            nameMenuHang,
                          ),
                        } as StylesConfig<AccountOption, false>
                      }
                      onMenuOpen={() =>
                        measureNameMenuHang(
                          `lkpAccountName-${index}`,
                          `txtDebit-${index}`,
                        )
                      }
                      components={accountNameComponents}
                      filterOption={filterPairOption}
                      noOptionsMessage={() =>
                        "No Account Found"
                      }
                      isClearable={false}
                      isDisabled={disabled}
                      isSearchable
                      menuPosition="fixed"
                      menuPlacement="auto"
                      menuPortalTarget={
                        typeof document !== "undefined"
                          ? document.body
                          : undefined
                      }
                      placeholder=""
                    />
                  </div>
                </td>

                {/* ==================================================
                    CC ID
                ================================================== */}

                <td
                  className={`
                    h-[30px] border border-[#bdebd4] p-0 ${cellFocusClass}
                  `}
                >
                  <div
                    onKeyDown={(event) =>
                      advanceOnEnter(event)
                    }
                  >
                    <Select<AccountOption, false>
                      inputId={`lkpCCID-${index}`}
                      instanceId={`lkpCCID-${index}`}
                      name="lkpCCID"
                      aria-label="C.C. ID"
                      options={costCenters}
                      value={
                        costCenterByCode.get(
                          row.lkpCCID,
                        ) ?? null
                      }
                      onChange={(option) => {
                        updateRow(
                          index,
                          "lkpCCID",
                          option?.value ?? "",
                        );

                        setActiveRow(index);

                        if (option) {
                          advanceAfterPick(
                            `lkpCCID-${index}`,
                          );
                        }
                      }}
                      isDisabled={
                        disabled ||
                        !accountIdByCode.get(
                          row.lkpAccountID,
                        )?.chkHaveCC
                      }
                      styles={ccStyles}
                      components={ccComponents}
                      filterOption={filterPairOption}
                      noOptionsMessage={() =>
                        "No Cost Center Found"
                      }
                      isClearable={false}
                      isSearchable
                      menuPosition="fixed"
                      menuPlacement="auto"
                      menuPortalTarget={
                        typeof document !== "undefined"
                          ? document.body
                          : undefined
                      }
                      placeholder=""
                    />
                  </div>
                </td>

                {/* ==================================================
                    DEBIT
                ================================================== */}

                <td
                  className={`
                    h-[30px] border border-[#bdebd4] p-0 ${cellFocusClass}
                  `}
                >
                  {renderNumberInput(
                    index,
                    "txtDebit",
                    "txtDebit",
                    "Debit",
                  )}
                </td>

                {/* ==================================================
                    CREDIT
                ================================================== */}

                <td
                  className={`
                    h-[30px] border border-[#bdebd4] p-0 ${cellFocusClass}
                  `}
                >
                  <div className="flex items-center">
                    <div className="min-w-0 flex-1">
                      {renderNumberInput(
                        index,
                        "txtCredit",
                        "txtCredit",
                        "Credit",
                      )}
                    </div>

                    {/* the slot is always there so the amounts do not move when the x shows */}
                    <span className="flex w-6 shrink-0 items-center justify-center">
                      {activeRow === index &&
                        !disabled &&
                        !isEmptyRow(row) && (
                          <button
                            id={`btnRemoveRow-${index}`}
                            name="btnRemoveRow"
                            type="button"
                            tabIndex={-1}
                            title="Remove row"
                            aria-label={`Remove row ${index + 1}`}
                            onClick={() =>
                              onRemoveRow(index)
                            }
                            className="text-[12px] leading-none text-gray-400 hover:text-red-600"
                          >
                            ✕
                          </button>
                        )}
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default BeginningBalanceTable;