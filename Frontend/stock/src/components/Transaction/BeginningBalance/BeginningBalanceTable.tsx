import React, { useState } from "react";
import { Play } from "lucide-react";
import Select, { type StylesConfig } from "react-select";

// ============================================================
// TYPES
// ============================================================

type Option = {
  value: string;
  label: string;
};

type BeginningBalanceRow = {
  accountId: Option | null;
  accountName: Option | null;
  ccId: Option | null;
  debit: string;
  credit: string;
};

// ============================================================
// CONSTANTS
// ============================================================

const ROW_COUNT = 13;

// ============================================================
// OPTIONS
// ============================================================

const accountIdOptions: Option[] = [];

const accountNameOptions: Option[] = [];

const ccIdOptions: Option[] = [];

// ============================================================
// CREATE ROW
// ============================================================

const createRow = (): BeginningBalanceRow => ({
  accountId: null,
  accountName: null,
  ccId: null,
  debit: "",
  credit: "",
});

const createRows = (): BeginningBalanceRow[] =>
  Array.from(
    { length: ROW_COUNT },
    createRow,
  );

// ============================================================
// SELECT STYLES
// ============================================================

const selectStyles: StylesConfig<Option, false> = {
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

// ============================================================
// NUMBER INPUT
// ============================================================

const numberInputClass =
  "h-[30px] w-full border-0 bg-transparent px-2 text-right text-[11px] text-[#202020] outline-none focus:bg-blue-50";

// ============================================================
// TABLE
// ============================================================

const BeginningBalanceTable: React.FC = () => {
  const [rows, setRows] =
    useState<BeginningBalanceRow[]>(
      createRows,
    );

  const [activeRow, setActiveRow] =
    useState(0);

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
  // NUMBER CHANGE
  // ==========================================================

  const handleNumberChange = (
    index: number,
    field: "debit" | "credit",
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

  // ==========================================================
  // RENDER NUMBER
  // ==========================================================

  const renderNumberInput = (
    index: number,
    field: "debit" | "credit",
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
        h-[436px]
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

            <col style={{ width: "125px" }} />

            {/* Account Name */}

            <col style={{ width: "485px" }} />

            {/* CC ID */}

            <col style={{ width: "68px" }} />

            {/* Debit */}

            <col style={{ width: "100px" }} />

            {/* Credit */}

            <col style={{ width: "100px" }} />
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
                  className="
                    h-[30px]
                    border
                    border-[#bdebd4]
                    p-0
                  "
                >
                  <Select<Option, false>
                    inputId={`txtAccountID-${index}`}
                    instanceId={`account-id-${index}`}
                    options={accountIdOptions}
                    value={row.accountId}
                    onChange={(option) => {
                      updateRow(
                        index,
                        "accountId",
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
                  />
                </td>

                {/* ==================================================
                    ACCOUNT NAME
                ================================================== */}

                <td
                  className="
                    h-[30px]
                    border
                    border-[#bdebd4]
                    p-0
                  "
                >
                  <Select<Option, false>
                    inputId={`txtAccountName-${index}`}
                    instanceId={`account-name-${index}`}
                    options={accountNameOptions}
                    value={row.accountName}
                    onChange={(option) => {
                      updateRow(
                        index,
                        "accountName",
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
                  />
                </td>

                {/* ==================================================
                    CC ID
                ================================================== */}

                <td
                  className="
                    h-[30px]
                    border
                    border-[#bdebd4]
                    p-0
                  "
                >
                  <Select<Option, false>
                    inputId={`txtCCID-${index}`}
                    instanceId={`cc-id-${index}`}
                    options={ccIdOptions}
                    value={row.ccId}
                    onChange={(option) => {
                      updateRow(
                        index,
                        "ccId",
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
                  />
                </td>

                {/* ==================================================
                    DEBIT
                ================================================== */}

                <td
                  className="
                    h-[30px]
                    border
                    border-[#bdebd4]
                    p-0
                  "
                >
                  {renderNumberInput(
                    index,
                    "debit",
                    "txtDebit",
                    "Debit",
                  )}
                </td>

                {/* ==================================================
                    CREDIT
                ================================================== */}

                <td
                  className="
                    h-[30px]
                    border
                    border-[#bdebd4]
                    p-0
                  "
                >
                  {renderNumberInput(
                    index,
                    "credit",
                    "txtCredit",
                    "Credit",
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

export default BeginningBalanceTable;