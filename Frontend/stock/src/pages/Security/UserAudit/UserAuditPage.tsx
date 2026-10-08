import React, { useRef, useState } from "react";

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

// ============================================================
// OPTIONS
// ============================================================

const userOptions: Option[] = [
  {
    value: "ADMIN",
    label: "ADMIN",
  },
  {
    value: "USER",
    label: "USER",
  },
];

const actionOptions: Option[] = [
  {
    value: "LOGIN",
    label: "LOGIN",
  },
  {
    value: "CREATE",
    label: "CREATE",
  },
  {
    value: "UPDATE",
    label: "UPDATE",
  },
  {
    value: "DELETE",
    label: "DELETE",
  },
];

// ============================================================
// SELECT STYLES
// ============================================================

const selectStyles: StylesConfig<Option, false> = {
  control: (base, state) => ({
    ...base,

    minHeight: "30px",
    height: "30px",

    border: "1px solid #cbd5e1",

    borderRadius: "4px",

    boxShadow: "none",

    backgroundColor: "#ffffff",

    fontSize: "12px",

    cursor: "pointer",

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

    height: "24px",

    padding: "0 7px",

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

    color: "#64748b",

    fontSize: "12px",

    margin: 0,
  }),

  input: (base) => ({
    ...base,

    margin: 0,

    padding: 0,

    fontSize: "12px",
  }),

  indicatorsContainer: (base) => ({
    ...base,

    height: "24px",
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

    borderRadius: "4px",

    boxShadow:
      "0 3px 8px rgba(0,0,0,0.15)",
  }),

  menuList: (base) => ({
    ...base,

    padding: 0,

    maxHeight: "150px",
  }),

  option: (base, state) => ({
    ...base,

    padding: "5px 7px",

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
      backgroundColor: "#dff1e7",
    },
  }),
};

// ============================================================
// DATE PICKER STYLES
// ============================================================

const datePickerSx = {
  width: "129px",

  "& .MuiPickersTextField-root": {
    width: "129px",
  },

  "& .MuiPickersInputBase-root": {
    width: "129px",
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
    paddingLeft: "7px !important",
    paddingRight: "0px !important",
    marginBottom: "-5px !important",
    marginLeft: "0px !important",
    boxSizing: "border-box",
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
    width: "22px",
    height: "22px",
    padding: "1px",
    margin: 0,
  },

  "& .MuiSvgIcon-root": {
    fontSize: "15px",
  },

  "& .MuiPickersOutlinedInput-notchedOutline": {
    borderColor: "#cbd5e1 !important",
  },

  "& .MuiPickersInputBase-root:hover .MuiPickersOutlinedInput-notchedOutline":
    {
      borderColor: "#94a3b8 !important",
    },

  "& .MuiPickersInputBase-root.Mui-focused .MuiPickersOutlinedInput-notchedOutline":
    {
      borderColor: "#94a3b8 !important",
      borderWidth: "1px",
    },

  "& .MuiPickersInputBase-root.Mui-error .MuiPickersOutlinedInput-notchedOutline":
    {
      borderColor: "#cbd5e1 !important",
    },

  "& .MuiPickersInputBase-root.Mui-error:hover .MuiPickersOutlinedInput-notchedOutline":
    {
      borderColor: "#cbd5e1 !important",
    },

  "& .MuiPickersInputBase-root.Mui-error.Mui-focused .MuiPickersOutlinedInput-notchedOutline":
    {
      borderColor: "#cbd5e1 !important",
    },
};

// ============================================================
// COMPONENT
// ============================================================

const UserAudit: React.FC = () => {
  // ==========================================================
  // USER
  // ==========================================================

  const [user, setUser] =
    useState<Option | null>(null);

  // ==========================================================
  // ACTION
  // ==========================================================

  const [action, setAction] =
    useState<Option | null>(null);

  // ==========================================================
  // FROM DATE
  // ==========================================================

  const [dtpFromDate, setDtpFromDate] =
    useState<string>("");

  // ==========================================================
  // TO DATE
  // ==========================================================

  const [dtpToDate, setDtpToDate] =
    useState<string>("");

  // ==========================================================
  // REFS
  // ==========================================================

  const fromDateRef =
    useRef<HTMLInputElement | null>(null);

  const toDateRef =
    useRef<HTMLInputElement | null>(null);

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div
      className="
        min-h-full
        w-full
        flex
        items-center
        justify-center
        bg-white
      "
    >

      <div
        className="
          w-[380px]
          border
          border-[#707070]
          bg-white
        "
      >

        {/* ====================================================
            TITLE
        ==================================================== */}

          <div  className="  flex h-[36px]  items-center  border-b  border-slate-300  bg-[#a3dfc0]   " >
        <span className="  px-3   text-[17px]  font-semibold text-slate-700  " > User Audit </span> </div>


        {/* ====================================================
            FORM
        ==================================================== */}

        <div
          className="  px-[12px] pt-[12px] pb-[12px]  " >

          {/* ==================================================
              USER ID
          ================================================== */}

          <div
            className="
              flex
              h-[30px]
              items-center
              mb-[7px]
            "
          >

            <label
              className="
                w-[65px]
                shrink-0
                text-[14px]
                text-[#344054]
              "
            >
              User ID :
            </label>

            <div className="w-[294px]">

              <Select<Option, false>
                inputId="lkpUserID"
                instanceId="lkpUserID"
                options={userOptions}
                value={user}
                onChange={setUser}
                styles={selectStyles}
                isClearable={false}
                isSearchable={false}
                placeholder=""
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
              ACTION
          ================================================== */}

          <div
            className="
              flex
              h-[30px]
              items-center
              mb-[7px]
            "
          >

            <label
              className="
                w-[65px]
                shrink-0
                text-[14px]
                text-[#344054]
              "
            >
              Action :
            </label>

            <div className="w-[129px]">

              <Select<Option, false>
                inputId="lkpAction"
                instanceId="lkpAction"
                options={actionOptions}
                value={action}
                onChange={setAction}
                styles={selectStyles}
                isClearable={false}
                isSearchable={false}
                placeholder=""
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
              PERIOD
          ================================================== */}

          <div
            className="
              flex
              h-[30px]
              items-center
            "
          >

            <label
              className="
                w-[65px]
                shrink-0
                text-[14px]
                text-[#344054]
              "
            >
              Period :
            </label>

            {/* ================================================
                FROM DATE
            ================================================= */}

            <LocalizationProvider
              dateAdapter={AdapterDayjs}
            >

              <DatePicker
                value={
                  dtpFromDate
                    ? dayjs(
                        dtpFromDate,
                        "DD-MM-YYYY",
                      )
                    : null
                }

                onChange={(newValue) => {
                  if (
                    newValue?.isValid()
                  ) {
                    setDtpFromDate(
                      newValue.format(
                        "DD-MM-YYYY",
                      ),
                    );
                  } else {
                    setDtpFromDate("");
                  }
                }}

                format="DD-MM-YYYY"

                inputRef={fromDateRef}

                slotProps={{
                  textField: {
                    id: "dtpFromDate",
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

                sx={datePickerSx}
              />

            </LocalizationProvider>

            {/* ================================================
                TO DATE
            ================================================= */}

            <div className="ml-[8px]">

              <LocalizationProvider
                dateAdapter={AdapterDayjs}
              >

                <DatePicker
                  value={
                    dtpToDate
                      ? dayjs(
                          dtpToDate,
                          "DD-MM-YYYY",
                        )
                      : null
                  }

                  onChange={(newValue) => {
                    if (
                      newValue?.isValid()
                    ) {
                      setDtpToDate(
                        newValue.format(
                          "DD-MM-YYYY",
                        ),
                      );
                    } else {
                      setDtpToDate("");
                    }
                  }}

                  format="DD-MM-YYYY"

                  inputRef={toDateRef}

                  slotProps={{
                    textField: {
                      id: "dtpToDate",
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

                  sx={datePickerSx}
                />

              </LocalizationProvider>

            </div>

          </div>

          {/* ==================================================
              BUTTONS
          ================================================== */}

          <div
            className="
              flex
              justify-center
              gap-[13px]
              mt-[8px]
            "
          >

            {/* PRINT */}

            <button
              type="button"
              className="
                btn-style
                h-[40px]
                w-[107px]
              "
            >
              <u>P</u>rint
            </button>

            {/* CLEAR */}

            <button
              type="button"
              className="
                btn-style
                h-[40px]
                w-[107px]
              "
            >
              <u>C</u>lear
            </button>

          </div>

        </div>

      </div>

    </div>
  );
};

export default UserAudit;