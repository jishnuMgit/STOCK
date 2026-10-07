import React, { useRef, useState } from "react";
import Select, { type StylesConfig } from "react-select";

import dayjs from "dayjs";

import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";

// ============================================================
// TYPES
// ============================================================

type Option = {
  value: string;
  label: string;
};

// ============================================================
// OPTIONS
// ============================================================

const branchOptions: Option[] = [
  {
    value: "OFFICE",
    label: "OFFICE",
  },
];

const transferToOptions: Option[] = [
  {
    value: "",
    label: "",
  },
];

const entryNoOptions: Option[] = [
  {
    value: "01",
    label: "01",
  },
];

// ============================================================
// SELECT STYLES
// ============================================================

const selectStyles: StylesConfig<Option, false> = {
  control: (base, state) => ({
    ...base,

    minHeight: 28,
    height: 28,
    width: "250px",

    border: "1px solid #cbd5e1",
    borderRadius: 4,

    boxShadow: "none",

    backgroundColor: state.isFocused
      ? "#eff6ff"
      : "#ffffff",

    cursor: "pointer",

    fontSize: 15,

    "&:hover": {
      borderColor: "#94a3b8",
    },
  }),

  valueContainer: (base) => ({
    ...base,

    height: 28,
    minHeight: 28,

    padding: "0 6px",

    overflow: "hidden",
  }),

  singleValue: (base) => ({
    ...base,

    color: "#202020",

    fontSize: 15,

    margin: 0,

    overflow: "hidden",

    textOverflow: "ellipsis",

    whiteSpace: "nowrap",
  }),

  placeholder: (base) => ({
    ...base,

    color: "#64748b",

    fontSize: 15,

    margin: 0,
  }),

  input: (base) => ({
    ...base,

    margin: 0,

    padding: 0,

    fontSize: 15,
  }),

  indicatorsContainer: (base) => ({
    ...base,

    height: 28,
  }),

  dropdownIndicator: (base) => ({
    ...base,

    padding: "0 3px",

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

    fontSize: 15,

    marginTop: 1,
  }),

  menuList: (base) => ({
    ...base,

    padding: 0,

    maxHeight: 180,
  }),

  option: (base, state) => ({
    ...base,

    padding: "6px 8px",

    fontSize: 15,

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
// INPUT STYLE
// ============================================================

const inputClass =
  "px-2 input-style";

// ============================================================
// HEADER
// ============================================================

const StockTransferHeader: React.FC = () => {
  // ==========================================================
  // BRANCH
  // ==========================================================

  const [branch, setBranch] =
    useState<Option | null>(
      branchOptions[0]
    );

  // ==========================================================
  // TRANSFER TO
  // ==========================================================

  const [transferTo, setTransferTo] =
    useState<Option | null>(
      transferToOptions[0]
    );

  // ==========================================================
  // ENTRY NO
  // ==========================================================

  const [entryNo, setEntryNo] =
    useState<Option | null>(
      entryNoOptions[0]
    );

  // ==========================================================
  // DATE
  // ==========================================================

  const [dtpDate, setDtpDate] =
    useState<string>(
      dayjs().format("DD-MM-YYYY")
    );

  // ==========================================================
  // DATE REF
  // ==========================================================

  const dateRef =
    useRef<HTMLInputElement | null>(null);

  // ==========================================================
  // STOCK REF
  // ==========================================================

  const stockRef =
    useRef<HTMLInputElement | null>(null);

  // ==========================================================
  // DATE KEYBOARD
  // ==========================================================

  const handleDateKeyDown = (
    event: React.KeyboardEvent
  ) => {
    if (event.key === "Enter") {
      event.preventDefault();

      stockRef.current?.focus();
    }
  };

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <header className="w-full shrink-0">

      {/* ======================================================
          HEADER FORM
      ====================================================== */}

      <div className="mt-2 h-[83px] w-full px-[16px] pt-3">
        <div className="relative h-full w-full">

          {/* ==================================================
              BRANCH
          ================================================== */}

          <div className="absolute left-0 top-0 flex h-[28px] items-center">
            <label
              className="
                w-[80px]
                shrink-0
                whitespace-nowrap
                text-right
                text-[14px]
                text-[#202020]
              "
            >
              Branch :
            </label>

            <div className="ml-[7px] w-[220px]">
              <Select<Option, false>
                inputId="lkpBranch"
                instanceId="lkpBranch"
                options={branchOptions}
                value={branch}
                onChange={setBranch}
                styles={selectStyles}
                isClearable={false}
                isSearchable={false}
                menuPosition="fixed"
                menuPortalTarget={
                  typeof document !== "undefined"
                    ? document.body
                    : undefined
                }
              />
            </div>
          </div>

          {/* ==================================================
              ENTRY NO
          ================================================== */}

          <div className="absolute left-[425px] top-0 flex h-[28px] items-center">
            <label
              className="
                w-[82px]
                shrink-0
                whitespace-nowrap
                text-right
                text-[14px]
                text-[#202020]
              "
            >
              Entry No. :
            </label>

            <div className="ml-[7px] w-[145px]">
             
              <input type="text" className="input-style w-40"  id="txtEntryNo"
                 />
            </div>
          </div>

          {/* ==================================================
              DATE
          ================================================== */}

          <div className="absolute right-0 top-0 flex h-[28px] items-center">
            <div className="-mr-2 flex items-center gap-2">

              <label
                className="
                  whitespace-nowrap
                  text-right
                  text-[14px]
                  text-[#202020]
                "
              >
                Date :
              </label>

              <LocalizationProvider
                dateAdapter={AdapterDayjs}
              >
                <DatePicker
                  value={
                    dtpDate
                      ? dayjs(
                          dtpDate,
                          "DD-MM-YYYY"
                        )
                      : null
                  }

                  onChange={(newValue) => {
                    if (
                      newValue &&
                      newValue.isValid()
                    ) {
                      setDtpDate(
                        newValue.format(
                          "DD-MM-YYYY"
                        )
                      );
                    } else {
                      setDtpDate("");
                    }
                  }}

                  format="DD-MM-YYYY"

                  inputRef={dateRef}

                  slotProps={{
                    textField: {
                      id: "dtpDate",

                      onKeyDown:
                        handleDateKeyDown,
                    },

                    openPickerButton: {
                      sx: {
                        padding: "2px",
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

                  sx={{
                    width: "140px",

                    "& .MuiPickersTextField-root": {
                      width: "120px",
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

                    "& .MuiPickersInputBase-sectionsContainer":
                      {
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

                    "& .MuiPickersInputBase-sectionContent":
                      {
                        fontSize: "12px",
                        color: "#344054",
                      },

                    "& .MuiPickersInputBase-input":
                      {
                        minWidth: 0,
                        width: "100%",
                        fontSize: "12px",
                        padding: 0,
                        height: "30px",
                        boxSizing:
                          "border-box",
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

                    "& .MuiPickersOutlinedInput-notchedOutline":
                      {
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
                  }}
                />
              </LocalizationProvider>
            </div>
          </div>

          {/* ==================================================
              TRANSFER TO
          ================================================== */}

          <div className="absolute left-0 top-[38px] flex h-[28px] items-center">
            <label
              className="
                w-[80px]
                shrink-0
                whitespace-nowrap
                text-right
                text-[14px]
                text-[#202020]
              "
            >
              Transfer To :
            </label>

            <div className="ml-[7px] w-[220px]">
              <Select<Option, false>
                inputId="lkpTransferTo"
                instanceId="lkpTransferTo"
                options={transferToOptions}
                value={transferTo}
                onChange={setTransferTo}
                styles={selectStyles}
                isClearable={false}
                isSearchable={false}
                menuPosition="fixed"
                menuPortalTarget={
                  typeof document !== "undefined"
                    ? document.body
                    : undefined
                }
              />
            </div>
          </div>

          {/* ==================================================
              STOCK
          ================================================== */}

          <div className="absolute left-[43%] top-[38px] flex h-[28px] items-center">
            <label
              className="
                mr-[7px]
                whitespace-nowrap
                text-[14px]
                text-[#202020]
              "
            >
              Stock :
            </label>

            <input
              ref={stockRef}
              id="txtStock"
              type="text"
              defaultValue=""
              autoComplete="off"
              className={`${inputClass} w-[86px]`}
            />
          </div>

        </div>
      </div>
    </header>
  );
};

export default StockTransferHeader;