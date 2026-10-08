import React, { useState } from "react";

import Select, {
  type StylesConfig,
} from "react-select";

import dayjs from "dayjs";

import {
  AdapterDayjs,
} from "@mui/x-date-pickers/AdapterDayjs";

import {
  DatePicker,
} from "@mui/x-date-pickers/DatePicker";

import {
  LocalizationProvider,
} from "@mui/x-date-pickers/LocalizationProvider";

// ============================================================
// TYPES
// ============================================================

type Option = {
  value: string;
  label: string;
};

type TableRow = {
  id: number;
  documentNo: string;
  date: string;
  customerSupplierId: string;
  documentAmount: string;
  selected: boolean;
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
    value: "BRANCH 1",
    label: "BRANCH 1",
  },
  {
    value: "BRANCH 2",
    label: "BRANCH 2",
  },
];

// ============================================================
// SELECT STYLES
// ============================================================

const selectStyles: StylesConfig<
  Option,
  false
> = {
  control: (base, state) => ({
    ...base,

    minHeight: "30px",
    height: "30px",

    width: "250px",

    border: "1px solid #cbd5e1",

    borderRadius: "4px",

    boxShadow: "none",

    backgroundColor: "#ffffff",

    fontSize: "12px",

    cursor: "text",

    "&:hover": {
      borderColor: "#94a3b8",
    },

    ...(state.isFocused && {
      borderColor: "#94a3b8",
      boxShadow: "none",
    }),
  }),

  valueContainer: (base) => ({
    ...base,

    height: "28px",

    padding: "0 8px",

    overflow: "hidden",
  }),

  singleValue: (base) => ({
    ...base,

    color: "#344054",

    fontSize: "12px",

    margin: 0,

    overflow: "hidden",

    textOverflow: "ellipsis",

    whiteSpace: "nowrap",
  }),

  placeholder: (base) => ({
    ...base,

    color: "#8b0000",

    fontSize: "12px",

    margin: 0,
  }),

  input: (base) => ({
    ...base,

    margin: 0,

    padding: 0,

    fontSize: "12px",

    color: "#344054",
  }),

  indicatorsContainer: (base) => ({
    ...base,

    height: "28px",
  }),

  dropdownIndicator: (base) => ({
    ...base,

    padding: "3px",

    color: "#64748b",
  }),

  indicatorSeparator: () => ({
    display: "none",
  }),

  menuPortal: (base) => ({
    ...base,

    zIndex: 999999,
  }),

  menu: (base) => ({
    ...base,

    zIndex: 999999,

    marginTop: "1px",

    fontSize: "12px",

    borderRadius: "0px",

    boxShadow:
      "0 3px 8px rgba(0,0,0,0.15)",
  }),

  menuList: (base) => ({
    ...base,

    padding: 0,

    maxHeight: "180px",

    overflowY: "auto",
  }),

  option: (
    base,
    state,
  ) => ({
    ...base,

    padding:
      "6px 8px",

    fontSize: "12px",

    color: "#344054",

    cursor: "pointer",

    backgroundColor:
      state.isSelected
        ? "#e8f5ee"
        : state.isFocused
          ? "#f0f8f3"
          : "#ffffff",

    "&:active": {
      backgroundColor:
        "#dff1e7",
    },
  }),
};

// ============================================================
// HEADER DATE PICKER STYLE
// ============================================================

const datePickerSx = {
  width: "140px",

  "& .MuiPickersTextField-root": {
    width: "140px",
  },

  "& .MuiPickersInputBase-root": {
    width: "140px",
    height: "30px",
    minHeight: "30px",
    boxSizing: "border-box",
    borderRadius: "4px",
    backgroundColor: "#ffffff",
    fontSize: "12px",
    padding: 0,
    overflow: "hidden",
  },

  "& .MuiPickersInputBase-sectionsContainer": {
    paddingLeft:
      "10px !important",

    paddingRight:
      "0px !important",

    marginBottom:
      "-5px !important",

    marginLeft:
      "0px !important",

    boxSizing:
      "border-box",

    overflow: "hidden",
  },

  "& .MuiPickersInputBase-sectionContent": {
    fontSize: "12px",
    color: "#344054",
  },

  "& .MuiPickersInputBase-input": {
    minWidth: 0,
    width: "100%",
    fontSize: "12px",
    padding: 0,
    height: "30px",
    boxSizing: "border-box",
  },

  "& .MuiInputAdornment-root": {
    margin: 0,
    padding: 0,
  },

  "& .MuiIconButton-root": {
    width: "24px",
    height: "24px",
    padding: "2px",
    margin: 0,
  },

  "& .MuiSvgIcon-root": {
    fontSize: "16px",
  },

  "& .MuiPickersOutlinedInput-notchedOutline": {
    borderColor:
      "#B7C7D7 !important",
  },

  "& .MuiPickersInputBase-root:hover .MuiPickersOutlinedInput-notchedOutline":
    {
      borderColor:
        "#B7C7D7 !important",
    },

  "& .MuiPickersInputBase-root.Mui-focused .MuiPickersOutlinedInput-notchedOutline":
    {
      borderColor:
        "#B7C7D7 !important",

      borderWidth: "1px",
    },

  "& .MuiPickersInputBase-root.Mui-error .MuiPickersOutlinedInput-notchedOutline":
    {
      borderColor:
        "#B7C7D7 !important",
    },

  "& .MuiPickersInputBase-root.Mui-error:hover .MuiPickersOutlinedInput-notchedOutline":
    {
      borderColor:
        "#B7C7D7 !important",
    },

  "& .MuiPickersInputBase-root.Mui-error.Mui-focused .MuiPickersOutlinedInput-notchedOutline":
    {
      borderColor:
        "#B7C7D7 !important",
    },
};

// ============================================================
// TABLE DATE PICKER STYLE
// ============================================================

const tableDatePickerSx = {
  width: "100%",

  "& .MuiPickersTextField-root": {
    width: "100%",
  },

  "& .MuiPickersInputBase-root": {
    width: "100%",

    height: "29px",

    minHeight: "29px",

    boxSizing: "border-box",

    borderRadius: "0px",

    backgroundColor:
      "transparent",

    fontSize: "14px",

    padding: 0,

    overflow: "hidden",
  },

  // ----------------------------------------------------------
  // REMOVE DATE PICKER OUTLINE
  // The table cell itself already provides the border.
  // ----------------------------------------------------------

  "& .MuiPickersOutlinedInput-notchedOutline": {
    border: "0 !important",
  },

  "& .MuiPickersInputBase-root:hover .MuiPickersOutlinedInput-notchedOutline":
    {
      border: "0 !important",
    },

  "& .MuiPickersInputBase-root.Mui-focused .MuiPickersOutlinedInput-notchedOutline":
    {
      border: "0 !important",
    },

  "& .MuiPickersInputBase-root.Mui-error .MuiPickersOutlinedInput-notchedOutline":
    {
      border: "0 !important",
    },

  "& .MuiPickersInputBase-sectionsContainer": {
    height: "29px",

    paddingLeft:
      "8px !important",

    paddingRight:
      "0px !important",

    margin: "0 !important",

    boxSizing:
      "border-box",

    overflow:
      "hidden",

    display: "flex",

    alignItems:
      "center",
  },

  "& .MuiPickersInputBase-sectionContent": {
    fontSize: "14px",

    color: "#344054",
  },

  "& .MuiPickersInputBase-input": {
    minWidth: 0,

    width: "100%",

    fontSize: "14px",

    padding: 0,

    height: "29px",

    boxSizing:
      "border-box",
  },

  "& .MuiInputAdornment-root": {
    margin: 0,

    padding: 0,
  },

  "& .MuiIconButton-root": {
    width: "25px",

    height: "25px",

    padding: "2px",

    margin: 0,
  },

  "& .MuiSvgIcon-root": {
    fontSize: "16px",
  },
};

// ============================================================
// CHECKBOX
// ============================================================

type GreenCheckboxProps = {
  checked: boolean;

  onChange: (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => void;

  id?: string;
};

const GreenCheckbox: React.FC<
  GreenCheckboxProps
> = ({
  checked,
  onChange,
  id,
}) => {
  return (
    <label
      className="
        relative
        inline-flex
        h-[13px]
        w-[13px]
        cursor-pointer
        items-center
        justify-center
      "
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="
          peer
          absolute
          h-[13px]
          w-[13px]
          cursor-pointer
          appearance-none
          rounded-[3px]
          border
          border-[#65d69a]
          bg-white
          outline-none
        "
      />

      <span
        className="
          pointer-events-none
          absolute
          left-0
          top-0
          flex
          h-[13px]
          w-[13px]
          items-center
          justify-center
          rounded-[3px]
          bg-[#65d69a]
          opacity-0
          peer-checked:opacity-100
        "
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 16 16"
          className="
            h-[10px]
            w-[10px]
          "
          fill="none"
        >
          <path
            d="M3 8L6.5 11.5L13 4.5"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </label>
  );
};

// ============================================================
// INITIAL ROWS
// ============================================================

const createInitialRows =
  (): TableRow[] => {
    return Array.from(
      { length: 12 },
      (_, index) => ({
        id: index + 1,

        documentNo: "",

        date: "",

        customerSupplierId:
          "",

        documentAmount: "",

        selected: false,
      }),
    );
  };

// ============================================================
// COMPONENT
// ============================================================

const StockDocumentPost: React.FC =
  () => {
    // ========================================================
    // BRANCH
    // ========================================================

    const [branch, setBranch] =
      useState<Option | null>(
        branchOptions[0],
      );

    // ========================================================
    // HEADER DATE
    // ========================================================

    const [
      dtpAsOnDate,
      setDtpAsOnDate,
    ] = useState<string>("");

    // ========================================================
    // TABLE ROWS
    // ========================================================

    const [rows, setRows] =
      useState<TableRow[]>(
        createInitialRows(),
      );

    // ========================================================
    // ALL SELECTED
    // ========================================================

    const allSelected =
      rows.length > 0 &&
      rows.every(
        (row) =>
          row.selected,
      );

    // ========================================================
    // SELECT ALL
    // ========================================================

    const handleSelectAll = (
      checked: boolean,
    ) => {
      setRows(
        (currentRows) =>
          currentRows.map(
            (row) => ({
              ...row,

              selected:
                checked,
            }),
          ),
      );
    };

    // ========================================================
    // ROW CHECKBOX
    // ========================================================

    const handleRowSelect = (
      id: number,
      checked: boolean,
    ) => {
      setRows(
        (currentRows) =>
          currentRows.map(
            (row) =>
              row.id === id
                ? {
                    ...row,

                    selected:
                      checked,
                  }
                : row,
          ),
      );
    };

    // ========================================================
    // TABLE TEXT INPUT
    // ========================================================

    const handleRowChange = (
      id: number,
      field:
        | "documentNo"
        | "date"
        | "customerSupplierId"
        | "documentAmount",
      value: string,
    ) => {
      setRows(
        (currentRows) =>
          currentRows.map(
            (row) =>
              row.id === id
                ? {
                    ...row,

                    [field]:
                      value,
                  }
                : row,
          ),
      );
    };

    // ========================================================
    // TABLE DATE CHANGE
    // ========================================================

    const handleRowDateChange = (
      id: number,
      value: string,
    ) => {
      setRows(
        (currentRows) =>
          currentRows.map(
            (row) =>
              row.id === id
                ? {
                    ...row,

                    date: value,
                  }
                : row,
          ),
      );
    };

    // ========================================================
    // POST
    // ========================================================

    const handlePost = () => {
      const selectedRows =
        rows.filter(
          (row) =>
            row.selected,
        );

      console.log({
        branch,
        dtpAsOnDate,
        selectedRows,
      });
    };

    // ========================================================
    // CLEAR
    // ========================================================

    const handleClear = () => {
      setBranch(
        branchOptions[0],
      );

      setDtpAsOnDate("");

      setRows(
        createInitialRows(),
      );
    };

    // ========================================================
    // RENDER
    // ========================================================

    return (
      <div
        className="
          flex
          min-h-full
          w-full
          items-center
          justify-center
          bg-white
        "
      >
        <div
          className="
            w-full
            min-w-[900px]
            max-w-[900px]
            border
            border-gray-400
            bg-white
            pb-[12px]
          "
        >

          {/* ==================================================
              TITLE
          ================================================== */}

          <header
            className="
              flex
              h-[36px]
              items-center
              justify-start
              bg-[#9fdfbc]
              pl-[12px]
              text-[18px]
              font-semibold
              text-slate-700
            "
          >
            Stock Document Post
          </header>

          {/* ==================================================
              HEADER
          ================================================== */}

          <div
            className="
              px-[17px]
              pt-[35px]
            "
          >
            <div
              className="
                flex
                w-full
                items-center
              "
            >

              {/* ==============================================
                  BRANCH
              ============================================== */}

              <div
                className="
                  flex
                  h-[30px]
                  items-center
                "
              >
                <label
                  className="
                    mr-[10px]
                    whitespace-nowrap
                    text-right
                    text-[14px]
                  "
                >
                  Branch :
                </label>

                <div
                  className="relative"
                >
                  <Select<
                    Option,
                    false
                  >
                    inputId="lkpBranch"
                    instanceId="lkpBranch"
                    options={
                      branchOptions
                    }
                    value={branch}
                    onChange={
                      setBranch
                    }
                    styles={
                      selectStyles
                    }
                    isClearable={
                      false
                    }
                    isSearchable={
                      true
                    }
                    placeholder=""
                    menuPosition="fixed"
                    menuPortalTarget={
                      typeof document !==
                      "undefined"
                        ? document.body
                        : undefined
                    }
                  />
                </div>
              </div>

              {/* ==============================================
                  AS ON DATE
              ============================================== */}

              <div
                className="
                  ml-auto
                  flex
                  items-center
                "
              >
                <label
                  className="
                    mr-[8px]
                    whitespace-nowrap
                    text-[14px]
                  "
                >
                  As On Date :
                </label>

                <div
                  className="relative"
                >
                  <LocalizationProvider
                    dateAdapter={
                      AdapterDayjs
                    }
                  >
                    <DatePicker
                      value={
                        dtpAsOnDate
                          ? dayjs(
                              dtpAsOnDate,
                              "DD-MM-YYYY",
                            )
                          : null
                      }
                      onChange={(
                        newValue,
                      ) => {
                        if (
                          newValue?.isValid()
                        ) {
                          setDtpAsOnDate(
                            newValue.format(
                              "DD-MM-YYYY",
                            ),
                          );
                        } else {
                          setDtpAsOnDate(
                            "",
                          );
                        }
                      }}
                      format="DD-MM-YYYY"
                      slotProps={{
                        textField: {
                          id: "dtpAsOnDate",
                        },

                        openPickerButton: {
                          sx: {
                            padding:
                              "2px",
                            margin: 0,
                          },
                        },

                        inputAdornment: {
                          sx: {
                            margin: 0,
                            padding: 0,
                          },
                        },
                      }}
                      sx={
                        datePickerSx
                      }
                    />
                  </LocalizationProvider>
                </div>
              </div>
            </div>
          </div>

          {/* ==================================================
              SELECT ALL
          ================================================== */}

          <div
            className="
              px-[57px]
              pt-[12px]
              pb-[9px]
            "
          >
            <GreenCheckbox
              id="chkSelect"
              checked={
                allSelected
              }
              onChange={(
                event,
              ) =>
                handleSelectAll(
                  event.target
                    .checked,
                )
              }
            />
          </div>

          {/* ==================================================
              TABLE
          ================================================== */}

          <div
            className="
              mx-[17px]
              overflow-hidden
              border
              border-[#b9efd1]
            "
          >
            <div
              className="
                max-h-[420px]
                overflow-y-auto
              "
            >
              <table
                className="
                  w-full
                  table-fixed
                  border-collapse
                  text-[14px]
                  text-[#344054]
                "
              >
                <thead>
                  <tr
                    className="
                      h-[30px]
                      bg-[#eefbf4]
                    "
                  >
                    <th
                      className="
                        w-[70px]
                        border
                        border-[#b9efd1]
                        px-1
                        font-normal
                      "
                    >
                      Select
                    </th>

                    <th
                      className="
                        w-[160px]
                        border
                        border-[#b9efd1]
                        px-2
                        text-left
                        font-normal
                      "
                    >
                      Document No.
                    </th>

                    <th
                      className="
                        w-[160px]
                        border
                        border-[#b9efd1]
                        px-2
                        text-left
                        font-normal
                      "
                    >
                      Date
                    </th>

                    <th
                      className="
                        w-[160px]
                        border
                        border-[#b9efd1]
                        px-2
                        text-left
                        font-normal
                      "
                    >
                      Customer/Supplier ID
                    </th>

                    <th
                      className="
                        w-[180px]
                        border
                        border-[#b9efd1]
                        px-2
                        text-right
                        font-normal
                      "
                    >
                      Document Amt.
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {rows.map(
                    (row) => (
                      <tr
                        key={
                          row.id
                        }
                        className="
                          h-[30px]
                        "
                      >

                        {/* ==================================
                            CHECKBOX
                        ================================== */}

                        <td
                          className="
                            border
                            border-[#b9efd1]
                            text-center
                          "
                        >
                          <GreenCheckbox
                            checked={
                              row.selected
                            }
                            onChange={(
                              event,
                            ) =>
                              handleRowSelect(
                                row.id,
                                event
                                  .target
                                  .checked,
                              )
                            }
                          />
                        </td>

                        {/* ==================================
                            DOCUMENT NO
                        ================================== */}

                        <td
                          className="
                            border
                            border-[#b9efd1]
                            p-0
                          "
                        >
                          <input
                            type="text"
                            value={
                              row.documentNo
                            }
                            onChange={(
                              event,
                            ) =>
                              handleRowChange(
                                row.id,
                                "documentNo",
                                event
                                  .target
                                  .value,
                              )
                            }
                            className="
                              h-[29px]
                              w-full
                              border-0
                              bg-transparent
                              px-2
                              text-[14px]
                              text-[#344054]
                              outline-none
                              focus:border-0
                              focus:outline-none
                            "
                          />
                        </td>

                        {/* ==================================
                            DATE PICKER
                        ================================== */}

                        <td
                          className="
                            border
                            border-[#b9efd1]
                            p-0
                          "
                        >
                          <LocalizationProvider
                            dateAdapter={
                              AdapterDayjs
                            }
                          >
                            <DatePicker
                              value={
                                row.date
                                  ? dayjs(
                                      row.date,
                                      "DD-MM-YYYY",
                                    )
                                  : null
                              }

                              onChange={(
                                newValue,
                              ) => {
                                if (
                                  newValue?.isValid()
                                ) {
                                  handleRowDateChange(
                                    row.id,
                                    newValue.format(
                                      "DD-MM-YYYY",
                                    ),
                                  );
                                } else {
                                  handleRowDateChange(
                                    row.id,
                                    "",
                                  );
                                }
                              }}

                              format="DD-MM-YYYY"

                              slotProps={{
                                textField: {
                                  id: `dtpDate-${row.id}`,

                                  variant:
                                    "outlined",

                                  size:
                                    "small",
                                },

                                openPickerButton: {
                                  sx: {
                                    padding:
                                      "2px",
                                    margin: 0,
                                  },
                                },

                                inputAdornment: {
                                  sx: {
                                    margin: 0,
                                    padding: 0,
                                  },
                                },
                              }}

                              sx={
                                tableDatePickerSx
                              }
                            />
                          </LocalizationProvider>
                        </td>

                        {/* ==================================
                            CUSTOMER / SUPPLIER ID
                        ================================== */}

                        <td
                          className="
                            border
                            border-[#b9efd1]
                            p-0
                          "
                        >
                          <input
                            type="text"
                            value={
                              row.customerSupplierId
                            }
                            onChange={(
                              event,
                            ) =>
                              handleRowChange(
                                row.id,
                                "customerSupplierId",
                                event
                                  .target
                                  .value,
                              )
                            }
                            className="
                              h-[29px]
                              w-full
                              border-0
                              bg-transparent
                              px-2
                              text-[14px]
                              text-[#344054]
                              outline-none
                              focus:border-0
                              focus:outline-none
                            "
                          />
                        </td>

                        {/* ==================================
                            DOCUMENT AMOUNT
                        ================================== */}

                        <td
                          className="
                            border
                            border-[#b9efd1]
                            p-0
                          "
                        >
                          <input
                            type="text"
                            value={
                              row.documentAmount
                            }
                            onChange={(
                              event,
                            ) =>
                              handleRowChange(
                                row.id,
                                "documentAmount",
                                event
                                  .target
                                  .value,
                              )
                            }
                            className="
                              h-[29px]
                              w-full
                              border-0
                              bg-transparent
                              px-2
                              text-right
                              text-[14px]
                              text-[#344054]
                              outline-none
                              focus:border-0
                              focus:outline-none
                            "
                          />
                        </td>

                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          </div>

         

          {/* ==================================================
              DOCUMENT AMOUNT INPUT
          ================================================== */}

          <div
            className="
              flex
              justify-end
              px-[18px]
              mt-[-30px]
            "
          >
            <input
              id="txtDocumentAmt"
              type="text"
              className="
                mt-10
                w-[210px]
                input-style
              "
            />
          </div>

          {/* ==================================================
              BUTTONS
          ================================================== */}

          <div
            className="
              flex
              justify-center
              gap-[15px]
              pb-[14px]
            "
          >
            <button
              type="button"
              onClick={
                handlePost
              }
              className="
                btn-style
              "
            >
              <u>P</u>ost
            </button>

            <button
              type="button"
              onClick={
                handleClear
              }
              className="
                btn-style
              "
            >
              <u>C</u>lear
            </button>
          </div>

        </div>
      </div>
    );
  };

export default StockDocumentPost;