import React, { useState } from "react";
import Select, {
  type SingleValue,
  type StylesConfig,
} from "react-select";

// ============================================================
// TYPES
// ============================================================

type Option = {
  value: string;
  label: string;
};

type UserBranch = {
  userId: string;
  defaultBranch: Option | null;
};

// ============================================================
// OPTIONS
// ============================================================

const branchOptions: Option[] = [
  {
    value: "OFFICE",
    label: "OFFICE",
  },
  {
    value: "WAREHOUSE RIYADH",
    label: "WAREHOUSE RIYADH",
  },
  {
    value: "WAREHOUSE",
    label: "WAREHOUSE",
  },
  {
    value: "RIYADH",
    label: "RIYADH",
  },
  {
    value: "JEDDAH",
    label: "JEDDAH",
  },
];

// ============================================================
// INITIAL DATA
// ============================================================

const initialData: UserBranch[] = [
  {
    userId: "ABDULAZIZ",
    defaultBranch: {
      value: "OFFICE",
      label: "OFFICE",
    },
  },
  {
    userId: "ADMIN",
    defaultBranch: {
      value: "OFFICE",
      label: "OFFICE",
    },
  },
  {
    userId: "AFZAL",
    defaultBranch: {
      value: "WAREHOUSE RIYADH",
      label: "WAREHOUSE RIYADH",
    },
  },
];

// ============================================================
// CONSTANTS
// ============================================================

const ROW_COUNT = 14;

// ============================================================
// REACT SELECT STYLES
// ============================================================

const selectStyles: StylesConfig<Option, false> = {
  control: (base, state) => ({
    ...base,

    minHeight: 28,
    height: 28,

    width: "100%",

    border: "none",
    borderRadius: 0,

    boxShadow: "none",

    backgroundColor: state.isFocused
      ? "#eff6ff"
      : "transparent",

    cursor: "pointer",

    fontSize: 14,

    "&:hover": {
      border: "none",
    },
  }),

  valueContainer: (base) => ({
    ...base,

    minHeight: 28,
    height: 28,

    padding: "0 5px",

    overflow: "hidden",
  }),

  // SELECTED TEXT
  singleValue: (base) => ({
    ...base,

    margin: 0,

    color: "#263449",

    fontSize: 14,

    overflow: "hidden",

    textOverflow: "ellipsis",

    whiteSpace: "nowrap",
  }),

  // PLACEHOLDER
  placeholder: (base) => ({
    ...base,

    margin: 0,

    color: "#64748b",

    fontSize: 14,
  }),

  // SEARCH INPUT
  input: (base) => ({
    ...base,

    margin: 0,

    padding: 0,

    color: "#263449",

    fontSize: 14,
  }),

  indicatorsContainer: (base) => ({
    ...base,

    height: 28,
  }),

  dropdownIndicator: (base) => ({
    ...base,

    padding: "0 3px",

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

    fontSize: 14,

    marginTop: 1,
  }),

  menuList: (base) => ({
    ...base,

    padding: 0,

    maxHeight: 180,
  }),

  // DROPDOWN OPTIONS
  option: (base, state) => ({
    ...base,

    padding: "6px 8px",

    fontSize: 14,

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
// COMPONENT
// ============================================================

const SetDefaultBranch: React.FC = () => {
  const [rows, setRows] =
    useState<UserBranch[]>(initialData);

  const [selectedRow, setSelectedRow] =
    useState<number>(0);

  // ==========================================================
  // UPDATE DEFAULT BRANCH
  // ==========================================================

  const updateBranch = (
    index: number,
    option: SingleValue<Option>,
  ) => {
    setRows((previousRows) =>
      previousRows.map((row, rowIndex) =>
        rowIndex === index
          ? {
              ...row,
              defaultBranch: option,
            }
          : row,
      ),
    );
  };

  // ==========================================================
  // SAVE
  // ==========================================================

  const handleSave = () => {
    console.log("Saved:", rows);

    // Example output:
    //
    // [
    //   {
    //     userId: "ABDULAZIZ",
    //     defaultBranch: {
    //       value: "OFFICE",
    //       label: "OFFICE"
    //     }
    //   }
    // ]
  };

  // ==========================================================
  // SEARCH
  // ==========================================================

  const handleSearch = () => {
    console.log("Search");
  };

  // ==========================================================
  // CLEAR
  // ==========================================================

  const handleClear = () => {
    setRows(
      initialData.map((row) => ({
        ...row,
        defaultBranch: row.defaultBranch
          ? {
              ...row.defaultBranch,
            }
          : null,
      })),
    );

    setSelectedRow(0);
  };

  // ==========================================================
  // KEYBOARD NAVIGATION
  // ==========================================================

  const handleRowKeyDown = (
    event: React.KeyboardEvent<HTMLTableRowElement>,
    rowIndex: number,
  ) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();

      setSelectedRow((current) =>
        Math.min(
          current + 1,
          rows.length - 1,
        ),
      );
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();

      setSelectedRow((current) =>
        Math.max(current - 1, 0),
      );
    }

    if (event.key === "Enter") {
      event.preventDefault();

      setSelectedRow(rowIndex);
    }
  };

  return (
    <div
      className="
        flex
        min-h-screen
        w-full
        items-center
        justify-center
        bg-white
      "
    >
      {/* ======================================================
          MAIN CONTAINER
      ======================================================= */}

      <div
        className="
          w-full
          max-w-[800px]
          border
          border-gray-400
          bg-white
        "
      >

        {/* ====================================================
            HEADING
        ===================================================== */}

        <div className="flex h-[28px] w-full items-center bg-[#a7dfc0]">
          <h1 className="ml-[5px] text-[17px] font-semibold text-[#374151]">
            Set Default Branch
          </h1>
        </div>

        {/* ====================================================
            TABLE
        ===================================================== */}

       <div
  className="
    h-[370px]
    w-full
    overflow-hidden
    px-6
    mx-auto
  "
>
  <div
    className="
      h-full
      w-full
      overflow-y-auto
      overflow-x-hidden
      scrollbar-thin
      scrollbar-thumb-[#9ad9b7]
      scrollbar-track-[#f5faf7]
    "
  >
    <table
      className="
        w-full
        min-w-[600px]
        table-fixed
        border-collapse
        text-[14px]
      "
    >

              {/* ==================================================
                  COLUMN WIDTHS
              =================================================== */}

              <colgroup>

                {/* Row indicator */}

                <col
                  style={{
                    width: "30px",
                  }}
                />

                {/* User ID */}

                <col
                  style={{
                    width: "293px",
                  }}
                />

                {/* Default Branch */}

                <col />

              </colgroup>

              {/* ==================================================
                  TABLE HEADER
              =================================================== */}

              <thead>
                <tr className="h-[30px]">

                  {/* Row indicator */}

                  <th
                    className="
                      sticky
                      top-0
                      z-20
                      h-[30px]
                      border
                      border-[#bfe8d0]
                      bg-[#edf9f2]
                      p-0
                    "
                  />

                  {/* USER ID */}

                  <th
                    className="
                      sticky
                      top-0
                      z-20
                      h-[30px]
                      border
                      border-[#bfe8d0]
                      bg-[#edf9f2]
                      px-[6px]
                      py-0
                      text-left
                      align-middle
                      text-[14px]
                      font-normal
                      text-[#263449]
                      font-semibold
                    "
                  >
                    User ID
                  </th>

                  {/* DEFAULT BRANCH */}

                  <th
                    className="
                      sticky
                      top-0
                      z-20
                      h-[30px]
                      border
                      border-[#bfe8d0]
                      bg-[#edf9f2]
                      px-[5px]
                      py-0
                      text-left
                      align-middle
                      text-[14px]
                      font-normal
                      text-[#263449]
                      font-semibold
                    "
                  >
                    Default Branch
                  </th>

                </tr>
              </thead>

              {/* ==================================================
                  TABLE BODY
              =================================================== */}

              <tbody>

                {rows.map((row, index) => (
                  <tr
                    key={index}
                    tabIndex={0}
                    onClick={() =>
                      setSelectedRow(index)
                    }
                    onFocus={() =>
                      setSelectedRow(index)
                    }
                    onKeyDown={(event) =>
                      handleRowKeyDown(
                        event,
                        index,
                      )
                    }
                    className={`
                      h-[30px]
                      outline-none
                      ${
                        selectedRow === index
                          ? "bg-[#f7fbf8]"
                          : "bg-white"
                      }
                      hover:bg-[#f2faf5]
                    `}
                  >

                    {/* ==================================================
                        ROW INDICATOR
                    =================================================== */}

                    <td
                      className="
                        h-[30px]
                        border
                        border-[#bfe8d0]
                        p-0
                        text-center
                        align-middle
                      "
                    >
                      {selectedRow === index && (
                        <span
                          className="
                            text-[9px]
                            text-[#222]
                          "
                        >
                          ▶
                        </span>
                      )}
                    </td>

                    {/* ==================================================
                        SECOND COLUMN - USER ID
                        NORMAL TEXT
                    =================================================== */}

                    <td
                      className="
                        h-[30px]
                        border
                        border-[#bfe8d0]
                        px-[10px]
                        py-0
                        text-left
                        align-middle
                        text-[14px]
                        uppercase
                        text-[#263449]
                      "
                    >
                      {row.userId}
                    </td>

                    {/* ==================================================
                        THIRD COLUMN - DEFAULT BRANCH
                        REACT SELECT DROPDOWN
                    =================================================== */}

                    <td
                      className="
                        h-[30px]
                        border
                        border-[#bfe8d0]
                        p-0
                        align-middle
                      "
                    >
                      <Select<Option, false>
                        inputId={`lkpDefaultBranch-${index}`}
                        instanceId={`default-branch-${index}`}
                        options={branchOptions}
                        value={row.defaultBranch}
                        onChange={(option) =>
                          updateBranch(
                            index,
                            option,
                          )
                        }
                        onFocus={() =>
                          setSelectedRow(index)
                        }
                        styles={selectStyles}
                        isClearable={false}
                        isSearchable
                        menuPosition="fixed"
                        menuPortalTarget={
                          typeof document !==
                          "undefined"
                            ? document.body
                            : undefined
                        }
                        placeholder=""
                        className="w-full"
                      />
                    </td>

                  </tr>
                ))}

                {/* ==================================================
                    EMPTY ROWS
                =================================================== */}

                {Array.from({
                  length:
                    Math.max(
                      0,
                      ROW_COUNT - rows.length,
                    ),
                }).map((_, index) => (
                  <tr
                    key={`empty-${index}`}
                    className="h-[30px]"
                  >
                    {/* Arrow */}

                    <td
                      className="
                        h-[30px]
                        border
                        border-[#bfe8d0]
                        p-0
                      "
                    />

                    {/* User ID */}

                    <td
                      className="
                        h-[30px]
                        border
                        border-[#bfe8d0]
                        p-0
                      "
                    />

                    {/* Default Branch */}

                    <td
                      className="
                        h-[30px]
                        border
                        border-[#bfe8d0]
                        p-0
                      "
                    />
                  </tr>
                ))}

              </tbody>

            </table>

          </div>
        </div>

        {/* ====================================================
            BOTTOM BUTTONS
        ===================================================== */}

        <div
          className="
            flex
            h-[58px]
            items-center
            justify-center
            gap-[11px]
            pb-6
               mt-3
           
         
          "
        >

          {/* ==================================================
              SAVE
          =================================================== */}

          <button
            type="button"
            onClick={handleSave}
            className="
              h-[36px]
              w-[96px]
              rounded-[4px]
              border
           
              border-[#9eb5ca]
              bg-gradient-to-b
              from-white
              to-[#e6edf4]
              text-[14px]
              font-normal
              text-[#008a35]
              shadow-sm
              hover:from-[#f7fff9]
              hover:to-[#dce9e2]
              active:translate-y-[1px]
            "
          >
            <span className="underline">
              S
            </span>
            ave
          </button>

          {/* ==================================================
              SEARCH
          =================================================== */}

          <button
            type="button"
            onClick={handleSearch}
            className="
              h-[36px]
              w-[110px]
              rounded-[4px]
              border
              border-[#9eb5ca]
              bg-gradient-to-b
              from-white
              to-[#e6edf4]
              text-[14px]
              font-normal
              text-[#008a35]
              shadow-sm
              hover:from-[#f7fff9]
              hover:to-[#dce9e2]
              active:translate-y-[1px]
            "
          >
            <span className="underline">
              S
            </span>
            earch
          </button>

          {/* ==================================================
              CLEAR
          =================================================== */}

          <button
            type="button"
            onClick={handleClear}
            className="
              h-[36px]
              w-[96px]
              rounded-[4px]
              border
              border-[#9eb5ca]
              bg-gradient-to-b
              from-white
              to-[#e6edf4]
              text-[14px]
              font-normal
              text-[#008a35]
              shadow-sm
              hover:from-[#f7fff9]
              hover:to-[#dce9e2]
              active:translate-y-[1px]
            "
          >
            <span className="underline">
              C
            </span>
            lear
          </button>

        </div>

      </div>
    </div>
  );
};

export default SetDefaultBranch;