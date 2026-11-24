import React, {
  useEffect,
  useRef,
  useState,
} from "react";
import { filterLabelOrValue } from "../../BranchSelect/branchSelectParts";
import CommonTableSelect from "../../common/CommonTableSelect";

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
import Header from "../../common/Header";
import { useMessageModal } from "../../../hooks/useMessageModal";

// ============================================================
// TYPES
// ============================================================

type Option = {
  value: string;
  label: string;
};

const api = import.meta.env.VITE_API_URL;

// ============================================================
// INPUT STYLE
// ============================================================

// const inputClass = "input-style";

// ============================================================
// HEADER
// ============================================================

type Props = {
  lkpBranch: Option | null;
  onBranchChange: (option: Option | null) => void;
  // yyyy-mm-dd
  dtpDate: string;
  onDateChange: (value: string) => void;
  // a posted balance is locked: its date cannot be changed
  disabled: boolean;
  // the branch list and the default branch have been loaded (found or not)
  onBranchesLoaded?: () => void;
};

const BeginningBalanceHeader: React.FC<Props> = ({
  lkpBranch,
  onBranchChange,
  dtpDate,
  onDateChange,
  disabled,
  onBranchesLoaded,
}) => {
  const { notify, dialog: messageDialog } = useMessageModal();
  // ==========================================================
  // BRANCH: the branches the user has a right to, the user's default one
  // selected (the same list the Beginning Stock screen loads)
  // ==========================================================

  const [branchOptions, setBranchOptions] =
    useState<Option[]>([]);

  useEffect(() => {
    const loadBranches = async () => {
      try {
        const PstrCoID =
          localStorage.getItem("PstrCoID");

        if (!PstrCoID) {
          notify.error(
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
          notify.error(
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

        onBranchChange(
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
        notify.error(
          "Failed to load the Branches",
        );
      } finally {
        onBranchesLoaded?.();
      }
    };

    loadBranches();
  }, [onBranchChange, onBranchesLoaded]);

  // ==========================================================
  // DATE: only a day of the login year (the old SetDate)
  // ==========================================================

  const loginYear =
    localStorage.getItem("PstrYear") ?? "";

  const minDate = /^\d{4}$/.test(loginYear)
    ? dayjs(`${loginYear}-01-01`)
    : undefined;

  const maxDate = /^\d{4}$/.test(loginYear)
    ? dayjs(`${loginYear}-12-31`)
    : undefined;

  // ==========================================================
  // REFS
  // ==========================================================

  const dateRef =
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
      {messageDialog}

      {/* ======================================================
          TITLE
      ====================================================== */}

      <Header Name="Beginning Balance" />

      {/* ======================================================
          HEADER FORM
      ====================================================== */}

      <div className="h-18.75 w-full px-5 pt-5.5">
        <div className="relative h-full w-full">

          {/* ==================================================
              BRANCH
          ================================================== */}

          <div className="absolute left-4 top-0 flex h-7.5 items-center gap-2">

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
              Branch :
            </label>

            <div
              className="w-62.5"
              onKeyDown={(event) => {
                // Enter on a closed Branch box that has a value goes on to Date
                if (event.key === "Enter" && !event.defaultPrevented && lkpBranch) {
                  event.preventDefault();
                  document.getElementById("dtpDate")?.focus();
                }
              }}
            >

              <CommonTableSelect
                inputId="lkpBranch"
                options={branchOptions}
                value={lkpBranch}
                onChange={(option) => {
                  onBranchChange(option);

                  // a branch chosen: on to Date
                  if (option) {
                    window.setTimeout(() => document.getElementById("dtpDate")?.focus(), 0);
                  }
                }}
                columns={[
                  { key: "label", label: "Branch" },
                  { key: "value", label: "ID", width: "50px" },
                ]}
                placeholder="Select Branch"
                width="250px"
                menuWidth="300px"
                controlFontSize="14px"
                headerFontSize="12px"
                borderColor="#d7dee7"
                hoverBorderColor="#9fdfbc"
                filterOption={filterLabelOrValue}
                noOptionsMessage={() => "No Branch Found"}
                menuZIndex={99999}
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
                        "YYYY-MM-DD",
                      )
                      : null
                  }

                  onChange={(newValue) => {
                    if (
                      newValue?.isValid()
                    ) {
                      onDateChange(
                        newValue.format(
                          "YYYY-MM-DD",
                        ),
                      );
                    } else {
                      onDateChange("");
                    }
                  }}

                  format="DD-MM-YYYY"

                  minDate={minDate}

                  maxDate={maxDate}

                  disabled={disabled}

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
                            document
                              .getElementById(
                                "lkpAccountID-0",
                              )
                              ?.focus(),
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