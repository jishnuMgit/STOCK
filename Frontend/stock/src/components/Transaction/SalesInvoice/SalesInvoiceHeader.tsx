import React, {
  useRef,
  useState,
} from "react";

import Select, {
  type StylesConfig,
} from "react-select";

import dayjs from "dayjs";

import customParseFormat from "dayjs/plugin/customParseFormat";

import {
  AdapterDayjs,
} from "@mui/x-date-pickers/AdapterDayjs";

import {
  DatePicker,
} from "@mui/x-date-pickers/DatePicker";

import {
  LocalizationProvider,
} from "@mui/x-date-pickers/LocalizationProvider";

dayjs.extend(customParseFormat);

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

const customerIdOptions: Option[] = [
  {
    value: "11010011",
    label: "11010011",
  },
];

const customerNameOptions: Option[] = [
  {
    value: "CASH CUSTOMER",
    label: "CASH CUSTOMER",
  },
];

// ============================================================
// SELECT STYLES
// ============================================================

const selectStyles: StylesConfig<Option, false> = {
  control: (base, state) => ({
    ...base,

    minHeight: 30,
    height: 30,

    width: "100%",

    border: "1px solid #cbd5e1",

    borderRadius: 4,

    boxShadow: "none",

    backgroundColor: state.isFocused
      ? "#eff6ff"
      : "#ffffff",

    cursor: "pointer",

    fontSize: 11,

    "&:hover": {
      borderColor: "#94a3b8",
    },
  }),

  valueContainer: (base) => ({
    ...base,

    height: 21,

    minHeight: 21,

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

    height: 20,
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

    zIndex: 999999,
  }),

  menu: (base) => ({
    ...base,

    zIndex: 999999,

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

    backgroundColor:
      state.isSelected
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
  "h-[30px] border border-[#cbd5e1] rounded-[4px] bg-white px-1 text-[11px] text-[#202020] outline-none focus:border-blue-400 focus:bg-blue-50";

// ============================================================
// COMPONENT
// ============================================================

const SalesInvoiceHeader: React.FC = () => {

  // ==========================================================
  // BRANCH
  // ==========================================================

  const [branch, setBranch] =
    useState<Option | null>(
      branchOptions[0],
    );

  // ==========================================================
  // CUSTOMER ID
  // ==========================================================

  const [customerId, setCustomerId] =
    useState<Option | null>(
      customerIdOptions[0],
    );

  // ==========================================================
  // CUSTOMER NAME
  // ==========================================================

  const [customerName, setCustomerName] =
    useState<Option | null>(
      customerNameOptions[0],
    );

  // ==========================================================
  // DATE
  // ==========================================================

  const [dtpDate, setDtpDate] =
    useState<string>(
      dayjs().format("DD-MM-YYYY"),
    );

  // ==========================================================
  // REFS
  // ==========================================================

  const dateRef =
    useRef<HTMLInputElement | null>(null);

  const receivedFromRef =
    useRef<HTMLInputElement | null>(null);

  // ==========================================================
  // ENTER KEY HANDLER
  // ==========================================================

  const handleInputKeyDown = (
    event: React.KeyboardEvent,
    next?: () => void,
  ) => {
    if (event.key === "Enter") {
      event.preventDefault();

      next?.();
    }
  };

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="w-full shrink-0">

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
            px-6
            text-[17px]
            font-semibold
            text-slate-700
          "
        >
          Sales Invoice
        </span>
      </div>

      {/* ======================================================
          HEADER AREA
      ====================================================== */}

      <div className="h-[100px] w-full px-[12px] pt-[12px] mb-3">

        <div className="grid h-full grid-cols-[56%_44%]">

          {/* ==================================================
              LEFT SIDE
          ================================================== */}

          <div className="pr-[15px]">

            {/* -----------------------------------------------
                BRANCH
            ------------------------------------------------ */}

            <div className="mb-[10px] flex h-[30px] items-center gap-2">

              <label
                className="
                  w-[80px]
                  shrink-0
                  text-right
                  text-[14px]
                  text-[#202020]
                  whitespace-nowrap
                "
              >
                Branch :
              </label>

              <div className="w-[220px]">

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

            {/* -----------------------------------------------
                CUSTOMER
            ------------------------------------------------ */}

            <div className="mb-[15px] flex h-[30px] items-center gap-2">

              <label
                className="
                  w-[80px]
                  shrink-0
                  text-right
                  text-[14px]
                  text-[#202020]
                  whitespace-nowrap
                "
              >
                Customer :
              </label>

              {/* Customer ID */}

              <div className="w-[100px]">

                <Select<Option, false>
                  inputId="lkpCustomerID"
                  instanceId="lkpCustomerID"
                  options={customerIdOptions}
                  value={customerId}
                  onChange={setCustomerId}
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

              {/* Customer Name */}

              <div className="ml-[3px] w-[365px]">

                <Select<Option, false>
                  inputId="lkpCustomerName"
                  instanceId="lkpCustomerName"
                  options={customerNameOptions}
                  value={customerName}
                  onChange={setCustomerName}
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

            {/* -----------------------------------------------
                SQ NO
            ------------------------------------------------ */}

            <div className="flex h-[22px] items-center gap-2">

              <label
                className="
                  w-[80px]
                  shrink-0
                  text-right
                  text-[14px]
                  text-[#202020]
                  whitespace-nowrap
                "
              >
                SQ. No :
              </label>

              <input
                id="txtSQNo"
                type="text"
                autoComplete="off"
                className={`${inputClass} w-[220px]`}
              />

            </div>

          </div>

          {/* ==================================================
              RIGHT SIDE
          ================================================== */}

          <div className="right-side ml-auto w-fit pl-[4px]">

            {/* -----------------------------------------------
                INVOICE NO + DATE
            ------------------------------------------------ */}

            <div className="mb-[10px] flex h-[30px] items-center">

              <label
                className="
                  w-[90px]
                  shrink-0
                  whitespace-nowrap
                  text-right
                  text-[14px]
                  text-[#202020]
                "
              >
                Invoice No. :
              </label>

              <input
                id="txtDocNo"
                type="text"
                defaultValue="OC3"
                autoComplete="off"
                className={`${inputClass} ml-[7px] w-[160px]`}
              />

              <label
                className="
                  ml-[15px]
                  mr-[5px]
                  shrink-0
                  whitespace-nowrap
                  text-[14px]
                  text-[#202020]
                "
              >
                Date :
              </label>

              {/* ==================================================
                  DATE PICKER
              ================================================== */}

             <div className="">
               <LocalizationProvider
                dateAdapter={AdapterDayjs}
              >

                <DatePicker
                  value={
                    dtpDate
                      ? dayjs(
                          dtpDate,
                          "DD-MM-YYYY",
                        )
                      : null
                  }

                  onChange={(newValue) => {

                    if (
                      newValue?.isValid()
                    ) {
                      setDtpDate(
                        newValue.format(
                          "DD-MM-YYYY",
                        ),
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

                      onKeyDown: (
                        event,
                      ) =>
                        handleInputKeyDown(
                          event,
                          () =>
                            receivedFromRef.current?.focus(),
                        ),
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

                    "& .MuiPickersTextField-root":
                      {
                        width: "120px",
                      },

                    "& .MuiPickersInputBase-root":
                      {
                        width: "140px",

                        height: "30px",

                        minHeight: "30px",

                        boxSizing:
                          "border-box",

                        borderRadius: "4px",

                        backgroundColor:
                          "#ffffff",

                        fontSize: "12px",

                        padding: 0,

                        overflow:
                          "hidden",
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

                        overflow:
                          "hidden",
                      },

                    "& .MuiPickersInputBase-sectionContent":
                      {
                        fontSize: "12px",

                        color:
                          "#344054",
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

                    "& .MuiInputAdornment-root":
                      {
                        margin: 0,

                        padding: 0,
                      },

                    "& .MuiIconButton-root":
                      {
                        width: "24px",

                        height: "24px",

                        padding: "2px",

                        margin: 0,
                      },

                    "& .MuiSvgIcon-root":
                      {
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

            {/* -----------------------------------------------
                REFERENCE
            ------------------------------------------------ */}

            <div className="mb-[10px] flex h-[30px] items-center">

              <label
                className="
                  w-[90px]
                  shrink-0
                  whitespace-nowrap
                  text-right
                  text-[14px]
                  text-[#202020]
                "
              >
                Reference :
              </label>

              <input
                id="txtReference"
                type="text"
                autoComplete="off"
                className={`${inputClass} ml-[7px] w-[360px]`}
              />

            </div>

            {/* -----------------------------------------------
                STOCK + BRANCH STOCK BUTTON
            ------------------------------------------------ */}

            <div className="flex h-[30px] items-center">

              <button
                id="BranchStockbtn"
                type="button"
                className="
                  ml-[13px]
                  h-[30px]
                  w-[105px]
                  border
                  border-[#cbd5e1]
                  bg-[#eeeeee]
                  px-2
                  text-[12px]
                  text-[#202020]
                  shadow-sm
                  hover:bg-[#e5e5e5]
                "
              >
                Stock
              </button>

              <label
                className="
                  w-[90px]
                  shrink-0
                  whitespace-nowrap
                  text-right
                  text-[14px]
                  text-[#202020]
                "
              >
                Stock :
              </label>

              <input
                id="txtStock"
                type="text"
                value="0"
                readOnly
                className={`${inputClass} ml-[7px] w-[76px] text-center`}
              />

            </div>

          </div>

        </div>

      </div>

    </div>
  );
};

export default SalesInvoiceHeader;