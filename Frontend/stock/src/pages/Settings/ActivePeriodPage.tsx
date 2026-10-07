import { Play } from "lucide-react";
import React, { useState } from "react";

import Select, {
  type StylesConfig,
  type SingleValue,
} from "react-select";

// ============================================================
// TYPES
// ============================================================

type Option = {
  value: string;
  label: string;
};

type ActivePeriodRow = {
  branch: Option | null;
  fromDate: string;
  toDate: string;
};

// ============================================================
// CONSTANTS
// ============================================================

const ROW_COUNT = 10;

// ============================================================
// OPTIONS
// ============================================================

const branchOptions: Option[] = [
  // Add your branches here
  // { value: "001", label: "Main Branch" },
  // { value: "002", label: "Branch 2" },
];

// ============================================================
// CREATE ROW
// ============================================================

const createRow = (): ActivePeriodRow => ({
  branch: null,
  fromDate: "",
  toDate: "",
});

const createRows = (): ActivePeriodRow[] =>
  Array.from({ length: ROW_COUNT }, createRow);

// ============================================================
// SELECT STYLES
// ============================================================

const selectStyles: StylesConfig<Option, false> = {
  control: (base, state) => ({
    ...base,

    minHeight: 30,
    height: 30,
    width: "100%",

    border: "none",
    borderRadius: 0,

    boxShadow: "none",

    backgroundColor: state.isFocused
      ? "#eff6ff"
      : "transparent",

    cursor: "pointer",

    fontSize: 15,

    "&:hover": {
      border: "none",
    },
  }),

  valueContainer: (base) => ({
    ...base,

    height: 30,
    minHeight: 30,

    padding: "0 8px",

    overflow: "hidden",
  }),

  singleValue: (base) => ({
    ...base,

    margin: 0,

    color: "#202020",

    fontSize: 15,

    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  }),

  // ==========================================================
  // SELECT PLACEHOLDER
  // ==========================================================

  placeholder: (base) => ({
    ...base,

    margin: 0,

    color: "#6b7280",

    fontSize: 15,
  }),

  input: (base) => ({
    ...base,

    margin: 0,
    padding: 0,

    color: "#202020",

    fontSize: 15,
  }),

  indicatorsContainer: (base) => ({
    ...base,

    height: 30,
  }),

  dropdownIndicator: (base) => ({
    ...base,

    padding: "0 8px",

    color: "#9E9E9E",

    "&:hover": {
      color: "#6b7280",
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

    marginTop: 1,

    fontSize: 14,
  }),

  menuList: (base) => ({
    ...base,

    padding: 0,

    maxHeight: 180,
  }),

  option: (base, state) => ({
    ...base,

    padding: "6px 8px",

    fontSize: 14,

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
// DATE INPUT STYLE
// ============================================================

const dateInputClass = `
  h-[30px]
  w-full
  border-0
  bg-transparent
  px-2
  text-[15px]
  outline-none
  focus:bg-blue-50
  [&::-webkit-calendar-picker-indicator]:opacity-100
  [&::-webkit-calendar-picker-indicator]:grayscale
  [&::-webkit-calendar-picker-indicator]:brightness-75
  [&::-webkit-calendar-picker-indicator]:cursor-pointer
`;

// ============================================================
// COMPONENT
// ============================================================

const ActivePeriodPage: React.FC = () => {
  const [rows, setRows] =
    useState<ActivePeriodRow[]>(createRows);

  const [activeRow, setActiveRow] = useState(0);

  // ==========================================================
  // UPDATE ROW
  // ==========================================================

  const updateRow = <K extends keyof ActivePeriodRow>(
    index: number,
    field: K,
    value: ActivePeriodRow[K],
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
  // SAVE
  // ==========================================================

  const handleSave = () => {
    console.log("Active Period:", rows);
  };

  // ==========================================================
  // CLEAR
  // ==========================================================

  const handleClear = () => {
    setRows(createRows());
    setActiveRow(0);
  };

  // ==========================================================
  // RENDER
  // ==========================================================

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
      <div
        className="
          min-h-fit
          w-full
          max-w-[800px]
          border
          border-gray-400
          bg-white
        "
      >
        {/* ======================================================
            TITLE
        ====================================================== */}

       <div
          className="
            flex
            h-[36px]
            items-center
            border-b
            border-slate-300
            bg-[#a3dfc0]
          "
        >

          <span
            className="
              px-3
              text-[17px]
              font-semibold
              text-slate-700
            "
          >
            Active Period
          </span>

        </div>

        {/* ======================================================
            TABLE
        ====================================================== */}

        <div className="m-[12px] p-[12px]">

          {/* TABLE SCROLL CONTAINER */}

          <div
            className="
              max-h-[500px]
              overflow-y-auto
              overflow-x-hidden
              border
              border-[#d5e5f7]
            "
          >
            <table
              className="
                w-full
                table-fixed
                border-collapse
              "
            >
              {/* ==================================================
                  COLUMN WIDTHS
              ================================================== */}

              <colgroup>
                <col style={{ width: "30px" }} />

                <col style={{ width: "40%" }} />

                <col style={{ width: "27%" }} />

                <col style={{ width: "27%" }} />
              </colgroup>

              {/* ==================================================
                  HEADER
              ================================================== */}

              <thead>
                <tr className="h-[33px]">

                  {/* Row indicator */}

                  <th
                    className="
                      sticky
                      top-0
                      z-10
                      border
                      border-[#d5e5f7]
                      bg-[#f4f8fc]
                      p-0
                    "
                  />

                  {/* Branch */}

                  <th
                    className="
                      sticky
                      top-0
                      z-10
                      border
                      border-[#d5e5f7]
                      bg-[#f4f8fc]
                      px-[6px]
                      py-0
                      text-left
                      align-middle
                      text-[14px]
                      font-semibold
                      leading-none
                      text-[#4b5563]
                    "
                  >
                    Branch
                  </th>

                  {/* From Date */}

                  <th
                    className="
                      sticky
                      top-0
                      z-10
                      border
                      border-[#d5e5f7]
                      bg-[#f4f8fc]
                      px-[6px]
                      py-0
                      text-left
                      align-middle
                      text-[14px]
                      font-semibold
                      leading-none
                      text-[#4b5563]
                    "
                  >
                    From Date
                  </th>

                  {/* To Date */}

                  <th
                    className="
                      sticky
                      top-0
                      z-10
                      border
                      border-[#d5e5f7]
                      bg-[#f4f8fc]
                      px-[6px]
                      py-0
                      text-left
                      align-middle
                      text-[14px]
                      font-semibold
                      leading-none
                      text-[#4b5563]
                    "
                  >
                    To Date
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
                    className={`
                      h-[32px]
                      ${
                        activeRow === index
                          ? "bg-[#fafcff]"
                          : "bg-white"
                      }
                    `}
                  >
                    {/* ==================================================
                        ROW INDICATOR
                    ================================================== */}

                    <td
                      className="
                        h-[32px]
                        border
                        border-[#d5e5f7]
                        p-0
                        text-center
                        align-middle
                      "
                    >
                      {activeRow === index && (
                        <span
                          className="
                            inline-block
                            leading-none
                            text-black
                          "
                        >
                          <Play
                            size={10}
                            strokeWidth={2}
                          />
                        </span>
                      )}
                    </td>

                    {/* ==================================================
                        BRANCH
                    ================================================== */}

                    <td
                      className="
                        h-[32px]
                        border
                        border-[#d5e5f7]
                        p-0
                      "
                    >
                      <Select<Option, false>
                        inputId={`lkpBranch-${index}`}
                        instanceId={`branch-${index}`}
                        options={branchOptions}
                        value={row.branch}
                        onChange={(
                          option: SingleValue<Option>,
                        ) => {
                          updateRow(
                            index,
                            "branch",
                            option,
                          );

                          setActiveRow(index);
                        }}
                        styles={selectStyles}
                        isClearable={false}
                        isSearchable
                        placeholder=""
                        menuPosition="fixed"
                        menuPortalTarget={
                          typeof document !== "undefined"
                            ? document.body
                            : undefined
                        }
                        className="w-full"
                      />
                    </td>

                    {/* ==================================================
                        FROM DATE
                    ================================================== */}

                    <td
                      className="
                        h-[32px]
                        border
                        border-[#d5e5f7]
                        p-0
                      "
                    >
                      <div className="relative h-[30px] w-full">

                        <input
                          id={`dtpFromDate-${index}`}
                          type={
                            activeRow === index ||
                            row.fromDate !== ""
                              ? "date"
                              : "text"
                          }
                          value={row.fromDate}
                          onFocus={() => {
                            setActiveRow(index);
                          }}
                          onChange={(event) => {
                            updateRow(
                              index,
                              "fromDate",
                              event.target.value,
                            );
                          }}
                          className={`
                            ${dateInputClass}

                            ${
                              row.fromDate !== ""
                                ? "text-[#202020]"
                                : activeRow === index
                                  ? "text-gray-500"
                                  : "text-transparent"
                            }
                          `}
                        />

                        {/* Active empty row placeholder */}

                        {activeRow === index &&
                          row.fromDate === "" && (
                            <span
                              className="
                                pointer-events-none
                                absolute
                                left-[8px]
                                top-1/2
                                -translate-y-1/2
                                text-[15px]
                                text-gray-500
                              "
                            >
                           
                            </span>
                          )}
                      </div>
                    </td>

                    {/* ==================================================
                        TO DATE
                    ================================================== */}

                    <td
                      className="
                        h-[32px]
                        border
                        border-[#d5e5f7]
                        p-0
                      "
                    >
                      <div className="relative h-[30px] w-full">

                        <input
                          id={`dtpToDate-${index}`}
                          type={
                            activeRow === index ||
                            row.toDate !== ""
                              ? "date"
                              : "text"
                          }
                          value={row.toDate}
                          onFocus={() => {
                            setActiveRow(index);
                          }}
                          onChange={(event) => {
                            updateRow(
                              index,
                              "toDate",
                              event.target.value,
                            );
                          }}
                          className={`
                            ${dateInputClass}

                            ${
                              row.toDate !== ""
                                ? "text-[#202020]"
                                : activeRow === index
                                  ? "text-gray-500"
                                  : "text-transparent"
                            }
                          `}
                        />

                        {/* Active empty row placeholder */}

                        {activeRow === index &&
                          row.toDate === "" && (
                            <span
                              className="
                                pointer-events-none
                                absolute
                                left-[8px]
                                top-1/2
                                -translate-y-1/2
                                text-[15px]
                                text-gray-500
                              "
                            >
                             
                            </span>
                          )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
           <div
          className="
            mt-[12px]
          
           
            flex
            justify-center
            gap-[20px]
          "
        >
          <button
            id="btnSave"
            type="button"
            onClick={handleSave}
            className="btn-style"
          >
            <span className="underline underline-offset-[2px]">
              S
            </span>
            ave
          </button>

          <button
            id="btnClear"
            type="button"
            onClick={handleClear}
            className="btn-style"
          >
            <span className="underline underline-offset-[2px]">
              C
            </span>
            lear
          </button>
        </div>
        </div>

        {/* ======================================================
            BUTTONS
        ====================================================== */}

       
      </div>
    </div>
  );
};

export default ActivePeriodPage;