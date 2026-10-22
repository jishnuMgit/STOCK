import React, {
  useEffect,
  useRef,
  useState,
} from "react";

import { toast } from "react-toastify";

import {
  BranchDividedMenuList,
  BranchDividedOption,
  branchMenuStyles,
  filterLabelOrValue,
} from "../../BranchSelect/branchSelectParts";
import selectComponents from "../../sharecomponents/selectComponents";

import Select, {
  type StylesConfig,
} from "react-select";

import dayjs from "dayjs";

import {
  LocalizationProvider,
} from "@mui/x-date-pickers/LocalizationProvider";

import {
  DatePicker,
} from "@mui/x-date-pickers/DatePicker";

import {
  AdapterDayjs,
} from "@mui/x-date-pickers/AdapterDayjs";

// ============================================================
// TYPES
// ============================================================

type Option = {
  value: string;
  label: string;
};

const api = import.meta.env.VITE_API_URL;

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
    fontSize: 13,

    "&:hover": {
      borderColor: "#94a3b8",
    },
  }),

  valueContainer: (base) => ({
    ...base,
    height: 30,
    minHeight: 30,
    padding: "0 7px",
    overflow: "hidden",
  }),

  singleValue: (base) => ({
    ...base,
    color: "#202020",
    fontSize: 13,
    margin: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  }),

  placeholder: (base) => ({
    ...base,
    color: "#64748b",
    fontSize: 13,
    margin: 0,
  }),

  input: (base) => ({
    ...base,
    margin: 0,
    padding: 0,
    fontSize: 13,
  }),

  indicatorsContainer: (base) => ({
    ...base,
    height: 30,
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
    fontSize: 13,
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
    fontSize: 13,
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

// const inputClass = "input-style";

// ============================================================
// HEADER
// ============================================================

const BeginningBalanceHeader: React.FC = () => {
  // ==========================================================
  // BRANCH: the branches the user has a right to, the user's default one
  // selected (the same list the Beginning Stock screen loads)
  // ==========================================================

  const [branchOptions, setBranchOptions] =
    useState<Option[]>([]);

  const [lkpBranch, setLkpBranch] =
    useState<Option | null>(null);

  useEffect(() => {
    const loadBranches = async () => {
      try {
        const PstrCoID =
          localStorage.getItem("PstrCoID");

        if (!PstrCoID) {
          toast.error(
            "getBranchList: no PstrCoID in localStorage",
          );
          return;
        }

        // needs the login: the branches depend on WHO is logged in
        const response = await fetch(
          `${api}/BeginningBalance/getBranchList?PstrCoID=${PstrCoID}`,
          { credentials: "include" },
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
          toast.error(
            result.message ||
              "Failed to load the Branches",
          );
          return;
        }

        const options: Option[] = (
          result.data || []
        ).map(
          (row: {
            lkpBranch: string;
            txtBranchName: string;
          }) => ({
            value: row.lkpBranch,
            label: row.txtBranchName,
          }),
        );

        setBranchOptions(options);

        setLkpBranch(
          options.find(
            (option) =>
              option.value ===
              result.lkpDefaultBranch,
          ) ?? null,
        );
      } catch (error: unknown) {
        console.error(
          "getBranchList error:",
          error,
        );
        toast.error(
          "Failed to load the Branches",
        );
      }
    };

    loadBranches();
  }, []);

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

      if (next) {
        next();
      }
    }
  };

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <header className="w-full shrink-0">

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
            px-4.5
            text-[17px]
            font-semibold
            text-slate-700
          "
        >
          Beginning Balance
        </span>
      </div>

      {/* ======================================================
          HEADER FORM
      ====================================================== */}

      <div className="h-18.75 w-full px-5 pt-5.5">
        <div className="relative h-full w-full">

          {/* ==================================================
              BRANCH
          ================================================== */}

          <div className="absolute left-0 top-0 flex h-7.5 items-center">

            <label
              className="
                w-12.75
                shrink-0
                whitespace-nowrap
                text-right
                text-[14px]
                text-[#202020]
              "
            >
              Branch :
            </label>

            <div className="ml-2 w-58.75">

              <Select<Option, false>
                inputId="lkpBranch"
                instanceId="lkpBranch"
                options={branchOptions}
                value={lkpBranch}
                onChange={setLkpBranch}
                styles={{
                  ...selectStyles,
                  ...branchMenuStyles,
                }}
                components={{
                  ...selectComponents,
                  Option: BranchDividedOption,
                  MenuList: BranchDividedMenuList,
                }}
                filterOption={filterLabelOrValue}
                isClearable={false}
                isSearchable
                menuPlacement="auto"
                placeholder="Select Branch"
                noOptionsMessage={() =>
                  "No Branch Found"
                }
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
              DATE
          ================================================== */}

          <div className="absolute right-0 top-0 flex h-7.5 items-center">

            <div className="flex items-center gap-2 -mr-2">

              <label
                className="
                  whitespace-nowrap
                  text-right
                  text-[14px]
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

                        overflow:
                          "hidden",
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

        </div>
      </div>
    </header>
  );
};

export default BeginningBalanceHeader;