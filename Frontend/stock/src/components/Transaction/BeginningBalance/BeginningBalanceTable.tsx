import React, { useMemo, useState } from "react";
import { Play } from "lucide-react";
import Select, {
  components,
  type DropdownIndicatorProps,
  type MenuListProps,
  type OptionProps,
  type StylesConfig,
} from "react-select";

import {
  filterPairOption,
} from "../../PairSelect/pairSelectParts";
import { accountDropdownStyles } from "../Receipt/save/ReactSelectStyles";
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
    fontSize: 12,

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
    fontSize: 12,
    margin: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  }),

  placeholder: (base) => ({
    ...base,
    color: "#64748b",
    fontSize: 12,
    margin: 0,
  }),

  input: (base) => ({
    ...base,
    margin: 0,
    padding: 0,
    fontSize: 12,
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
    fontSize: 12,
    marginTop: 1,
  }),

  menuList: (base) => ({
    ...base,
    padding: 0,
    maxHeight: 180,
  }),

  option: (base, state) => ({
    ...base,
    // no side padding: the cells of the list have their own 5px (makePairComponents, last argument)
    padding: "5px 0",
    fontSize: 12,
    color: "#202020",
    cursor: "pointer",

    backgroundColor: state.isSelected
      ? "#dbeafe"
      : state.isFocused
        ? "#eff6ff"
        : "#ffffff",
  }),
};

// The lists are the Receipt screen's Account ID / Account Name lists (components/Transaction/Receipt/save): 663 px wide, a grey
// header "ID | Name", rows of 30 px with a thin line between the two columns (ID 105 px, Name 558 px). The Account ID list is "ID |
// Name", the Account Name list "Name | ID".
const ACCOUNT_LIST_ROW_TITLE = (data: AccountOption) => `${data.id ?? data.value} - ${data.name ?? data.label}`;

const AccountListOption = ({
  displayMode,
  ...props
}: OptionProps<AccountOption, false> & { displayMode: "id" | "name" }) => (
  <components.Option {...props}>
    <div className="account-dropdown-row" title={ACCOUNT_LIST_ROW_TITLE(props.data)}>
      {displayMode === "id" ? (
        <>
          <div className="account-dropdown-id">{props.data.id ?? props.data.value}</div>
          <div className="account-dropdown-name">{props.data.name ?? props.data.label}</div>
        </>
      ) : (
        <>
          <div className="account-dropdown-name">{props.data.name ?? props.data.label}</div>
          <div className="account-dropdown-id">{props.data.id ?? props.data.value}</div>
        </>
      )}
    </div>
  </components.Option>
);

const AccountListMenuList = ({
  displayMode,
  idHeader = "Account ID",
  nameHeader = "Account Name",
  ...props
}: MenuListProps<AccountOption, false> & {
  displayMode: "id" | "name";
  idHeader?: string;
  nameHeader?: string;
}) => {
  const HEADER_HEIGHT = 30;
  const optionsMaxHeight = Math.max(Math.min(375, (props.maxHeight ?? 405) - HEADER_HEIGHT), 81);

  return (
    <components.MenuList {...props}>
      <div className="account-dropdown-header">
        {displayMode === "id" ? (
          <>
            <div className="account-dropdown-header-id">{idHeader}</div>
            <div className="account-dropdown-header-name">{nameHeader}</div>
          </>
        ) : (
          <>
            <div className="account-dropdown-header-name">{nameHeader}</div>
            <div className="account-dropdown-header-id">{idHeader}</div>
          </>
        )}
      </div>

      <div className="account-dropdown-options" style={{ maxHeight: optionsMaxHeight }}>
        {props.children}
      </div>
    </components.MenuList>
  );
};

// The arrow of the Receipt grid: a small grey ▼, shown only on the row the cursor is on, or in the cell it is in (the cell hides it otherwise)
const AccountListIndicator = (props: DropdownIndicatorProps<AccountOption, false>) => (
  <components.DropdownIndicator {...props}>
    <span className="item-list-arrow block translate-y-px text-[8px] leading-2 text-[#999999]">▼</span>
  </components.DropdownIndicator>
);

const accountIdComponents = {
  DropdownIndicator: AccountListIndicator,
  Option: (props: OptionProps<AccountOption, false>) => <AccountListOption {...props} displayMode="id" />,
  MenuList: (props: MenuListProps<AccountOption, false>) => <AccountListMenuList {...props} displayMode="id" />,
};
const accountNameComponents = {
  DropdownIndicator: AccountListIndicator,
  Option: (props: OptionProps<AccountOption, false>) => <AccountListOption {...props} displayMode="name" />,
  MenuList: (props: MenuListProps<AccountOption, false>) => <AccountListMenuList {...props} displayMode="name" />,
};


// The lists have the Receipt screen's look (colours, borders, 30 px rows, scroll bar), but their columns follow the grid: the first
// column is exactly as wide as the cell the list opens from (so the Name values of the Account ID list start where the Item Name
// column starts), and the second column is the rest.
//   Account ID list:   ID (the Account ID cell)   | Name (the rest, 663 px in all)
//   Account Name list: Name (the Account Name cell) | ID (a 150 px column that hangs out past the cell)
const ACCOUNT_LIST_TOTAL = 663;
const ACCOUNT_LIST_HANG_ID = 150;

// the Receipt style of a column, with the width of this screen
const withColumnWidth = (style: any, width: number) => ({
  ...style,
  flex: `0 0 ${width}px`,
  width: `${width}px`,
  minWidth: `${width}px`,
  maxWidth: `${width}px`,
});

const makeAccountListStyles = (firstWidth: number, secondWidth: number, idFirst: boolean) => {
  const total = firstWidth + secondWidth;
  const idWidth = idFirst ? firstWidth : secondWidth;
  const nameWidth = idFirst ? secondWidth : firstWidth;

  return {
    ...selectStyles,
    menu: (base: any) => withColumnWidth({ ...accountDropdownStyles.menu(base), flex: undefined }, total),
    menuPortal: accountDropdownStyles.menuPortal,
    menuList: (base: any) => {
      const list = accountDropdownStyles.menuList(base) as any;
      return {
        ...withColumnWidth(list, total),
        "& .account-dropdown-header": withColumnWidth(list["& .account-dropdown-header"], total),
        "& .account-dropdown-header-id": withColumnWidth(list["& .account-dropdown-header-id"], idWidth),
        "& .account-dropdown-header-name": withColumnWidth(list["& .account-dropdown-header-name"], nameWidth),
        "& .account-dropdown-options": withColumnWidth(list["& .account-dropdown-options"], total),
        "& .account-dropdown-row": withColumnWidth(list["& .account-dropdown-row"], total),
        "& .account-dropdown-row .account-dropdown-id": withColumnWidth(
          list["& .account-dropdown-row .account-dropdown-id"],
          idWidth,
        ),
        "& .account-dropdown-row .account-dropdown-name": withColumnWidth(
          list["& .account-dropdown-row .account-dropdown-name"],
          nameWidth,
        ),
      };
    },
    option: (base: any, state: any) => {
      const option = accountDropdownStyles.option(base, state) as any;
      return {
        ...withColumnWidth(option, total),
        "& .account-dropdown-row": withColumnWidth(option["& .account-dropdown-row"], total),
        "& .account-dropdown-id": withColumnWidth(option["& .account-dropdown-id"], idWidth),
        "& .account-dropdown-name": withColumnWidth(option["& .account-dropdown-name"], nameWidth),
      };
    },
  } as StylesConfig<AccountOption, false>;
};

// the C.C. list: the same Receipt look, "C.C. ID | C.C. Name" (the C.C. ID box is narrow, so the ID column is at least 100 px)
const CC_LIST_TOTAL = 420;
const CC_LIST_MIN_ID = 100;
const ccComponents = {
  DropdownIndicator: AccountListIndicator,
  Option: (props: OptionProps<AccountOption, false>) => <AccountListOption {...props} displayMode="id" />,
  MenuList: (props: MenuListProps<AccountOption, false>) => (
    <AccountListMenuList {...props} displayMode="id" idHeader="C.C. ID" nameHeader="C.C. Name" />
  ),
};

// ============================================================
// NUMBER INPUT
// ============================================================

const numberInputClass =
  "h-[30px] w-full border-0 bg-transparent px-2 text-right text-[12px] text-[#202020] outline-none focus:bg-blue-50";

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

  // the first column of an Account list is as wide as the cell it opens from (measured when the list opens)
  const [idCellWidth, setIdCellWidth] = useState(105);
  const [nameCellWidth, setNameCellWidth] = useState(380);
  const [ccCellWidth, setCcCellWidth] = useState(68);
  const ccListStyles = useMemo(() => {
    const idWidth = Math.max(ccCellWidth, CC_LIST_MIN_ID);
    return makeAccountListStyles(idWidth, CC_LIST_TOTAL - idWidth, true);
  }, [ccCellWidth]);
  const accountIdListStyles = useMemo(
    () => makeAccountListStyles(idCellWidth, Math.max(ACCOUNT_LIST_TOTAL - idCellWidth, 300), true),
    [idCellWidth],
  );
  const accountNameListStyles = useMemo(
    () => makeAccountListStyles(nameCellWidth, ACCOUNT_LIST_HANG_ID, false),
    [nameCellWidth],
  );
  const measureCell = (inputId: string, set: (width: number) => void) => {
    const cell = document.getElementById(inputId)?.closest("td");
    if (cell) set(Math.round(cell.getBoundingClientRect().width));
  };

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
        h-[376px]
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
            text-[12px]
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
            <tr className="h-7">

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
                  font-medium
                  text-[#344054]
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
                  font-medium
                  text-[#344054]
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
                  font-medium
                  text-[#344054]
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
                  font-medium
                  text-[#344054]
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
                  font-medium
                  text-[#344054]
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
                  h-7
                  ${
                    activeRow === index
                      ? "bg-[#f9fffc]"
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
                    h-7
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
                    h-7 border border-[#bdebd4] p-0 ${cellFocusClass} ${activeRow === index ? "" : "[&:not(:focus-within)_.item-list-arrow]:hidden"}
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
                      styles={accountIdListStyles}
                      onMenuOpen={() =>
                        measureCell(`lkpAccountID-${index}`, setIdCellWidth)
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
                    h-7 border border-[#bdebd4] p-0 ${cellFocusClass} ${activeRow === index ? "" : "[&:not(:focus-within)_.item-list-arrow]:hidden"}
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
                      styles={accountNameListStyles}
                      onMenuOpen={() =>
                        measureCell(`lkpAccountName-${index}`, setNameCellWidth)
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
                    h-7 border border-[#bdebd4] p-0 ${cellFocusClass} ${activeRow === index ? "" : "[&:not(:focus-within)_.item-list-arrow]:hidden"}
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
                      styles={ccListStyles}
                      onMenuOpen={() =>
                        measureCell(`lkpCCID-${index}`, setCcCellWidth)
                      }
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
                    h-7 border border-[#bdebd4] p-0 ${cellFocusClass}
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
                    h-7 border border-[#bdebd4] p-0 ${cellFocusClass}
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