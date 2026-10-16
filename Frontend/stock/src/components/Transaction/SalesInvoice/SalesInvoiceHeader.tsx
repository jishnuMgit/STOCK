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
import selectComponents from "../../sharecomponents/selectComponents";

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

    fontSize: 14,

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

    fontSize: 14,

    margin: 0,

    overflow: "hidden",

    textOverflow: "ellipsis",

    whiteSpace: "nowrap",
  }),

  placeholder: (base) => ({
    ...base,

    color: "#64748b",

    fontSize: 14,

    margin: 0,
  }),

  input: (base) => ({
    ...base,

    margin: 0,

    padding: 0,

    fontSize: 14,
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

    fontSize: 14,

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

    fontSize: 14,

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
  "h-[30px] border border-[#cbd5e1] rounded-[4px] bg-white px-1 text-[14px] text-[#202020] outline-none focus:border-blue-400 focus:bg-blue-50";

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
          h-9
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

      <div className="h-25 w-full px-3 pt-3 mb-3">

        <div className="grid h-full grid-cols-[56%_44%]">

          {/* ==================================================
              LEFT SIDE
          ================================================== */}

          <div className="pr-3.75">

            {/* -----------------------------------------------
                BRANCH
            ------------------------------------------------ */}

            <div className="mb-2.5 flex h-7.5 items-center gap-2">

              <label
                className="
                  w-20
                  shrink-0
                  text-right
                  text-[14px]
                  text-[#202020]
                  whitespace-nowrap
                "
              >
                Branch :
              </label>

              <div className="w-55">

                <Select<Option, false>
                  inputId="lkpBranch"
                  instanceId="lkpBranch"
                  options={branchOptions}
                  value={branch}
                  onChange={setBranch}
                  styles={selectStyles}
                  components={selectComponents}
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

            <div className="mb-3.75 flex h-7.5 items-center gap-2  w-200 min-w-[600]">

              <label
                className="
                  w-20
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

              <div className="w-35">

                <Select<Option, false>
                  inputId="lkpCustomerID"
                  instanceId="lkpCustomerID"
                  options={customerIdOptions}
                  value={customerId}
                  components={selectComponents}
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

              <div className="-ml-1.25 w-117.5 min-w-75">

                <Select<Option, false>
                  inputId="lkpCustomerName"
                  instanceId="lkpCustomerName"
                  options={customerNameOptions}
                  value={customerName}
                  components={selectComponents}
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

            <div className="flex h-5.5 items-center gap-2">

              <label
                className="
                  w-20
                  shrink-0
                  text-right
                  text-[14px]
                  text-[#202020]
                  whitespace-nowrap
                "
              >
                S.Qtn. No :
              </label>

              <input
                id="txtSQtnNo"
                type="text"
                autoComplete="off"
                className={`input-style w-55`}
              />

            </div>

          </div>

          {/* ==================================================
              RIGHT SIDE
          ================================================== */}

          <div className="right-side ml-auto w-fit pl-1">

            {/* -----------------------------------------------
                INVOICE NO + DATE
            ------------------------------------------------ */}

            <div className="mb-2.5 flex h-7.5 items-center">

              <label
                className="
                  w-22.5
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
                className={`input-style ml-1.75 w-40`}
              />

              <label
                className="
                  ml-3.75
                  mr-1.25
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

            <div className="mb-2.5 flex h-7.5 items-center">

              <label
                className="
                  w-22.5
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
                className={`input-style ml-1.75 w-90`}
              />

            </div>

            {/* -----------------------------------------------
                STOCK + BRANCH STOCK BUTTON
            ------------------------------------------------ */}

            <div className="flex h-7.5 items-center">

              <button
                id="BranchStockbtn"
                type="button"
                className="
                  ml-3.25
                  h-7.5
                  w-26.25
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
                  w-22.5
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
                className={`${inputClass} ml-1.75 w-19 text-center`}
              />

            </div>

          </div>

        </div>

      </div>

    </div>
  );
};

export default SalesInvoiceHeader;