import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import Select, {
  components,
  type SelectInstance,
  type OptionProps,
} from "react-select";

import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";

import {
  LocalizationProvider,
} from "@mui/x-date-pickers/LocalizationProvider";

import {
  AdapterDayjs,
} from "@mui/x-date-pickers/AdapterDayjs";

import {
  DatePicker,
} from "@mui/x-date-pickers/DatePicker";

import "../Receipt/save/commanReceipt.css";

dayjs.extend(customParseFormat);

/* =========================================================
   TYPES
========================================================= */

export interface JournalFormProps {
  /* =======================================================
     BRANCH
  ======================================================= */

  branch: string;

  setBranch: (
    value: string
  ) => void;

  /* =======================================================
     TYPE
  ======================================================= */

  type: string;

  setType: (
    value: string
  ) => void;

  /* =======================================================
     JOURNAL NUMBER
  ======================================================= */

  journalNo: string;

  setJournalNo: (
    value: string
  ) => void;

  /* =======================================================
     DATE
  ======================================================= */

  journalDate: string;

  setJournalDate: (
    value: string
  ) => void;

  /* =======================================================
     REFS
  ======================================================= */

  branchRef: React.RefObject<
    SelectInstance<
      SelectOption,
      false
    > | null
  >;

  typeRef: React.RefObject<
    SelectInstance<
      SelectOption,
      false
    > | null
  >;

  journalNoRef: React.RefObject<
    HTMLInputElement | null
  >;

  dateRef: React.RefObject<
    HTMLInputElement | null
  >;

  /* =======================================================
     AFTER DATE

     Move focus to first Account ID.
  ======================================================= */

  focusFirstAccountId: () => void;

  /* =======================================================
     BRANCH OPTIONS
  ======================================================= */

  branchOptions: SelectOption[];
}

/* =========================================================
   SELECT OPTION
========================================================= */

interface SelectOption {
  value: string;
  label: string;
}

/* =========================================================
   JOURNAL TYPE
========================================================= */

interface JournalType {
  value: string;
  label: string;
}

/* =========================================================
   API RESPONSE
========================================================= */

interface JournalDocNumberResponse {
  success: boolean;

  data: {
    getnextdocno: string;
  }[];

  message?: string;
}

/* =========================================================
   CUSTOM OPTION
========================================================= */

const CustomOption = (
  props: OptionProps<
    SelectOption,
    false
  >
) => {
  const { data } = props;

  return (
    <components.Option
      {...props}
    >
      <div
        className="
          flex
          w-full
          items-center
          justify-between
          gap-3
        "
      >
        <span
          className="
            truncate
            text-xs
            text-slate-700
          "
        >
          {data.label}
        </span>

        <span
          className="
            shrink-0
            text-[11px]
            text-gray-400
          "
        >
          {data.value}
        </span>
      </div>
    </components.Option>
  );
};

/* =========================================================
   SEARCH FILTER
========================================================= */

const filterOption = (
  option: {
    label: string;
    value: string;
    data: SelectOption;
  },
  inputValue: string
) => {
  const search =
    inputValue
      .toLowerCase()
      .trim();

  if (!search) {
    return true;
  }

  return (
    option.data.label
      .toLowerCase()
      .includes(search) ||
    option.data.value
      .toLowerCase()
      .includes(search)
  );
};

/* =========================================================
   JOURNAL FORM
========================================================= */

const JournalForm: React.FC<
  JournalFormProps
> = ({
  branch,
  setBranch,

  type,
  setType,

  journalNo,
  setJournalNo,

  journalDate,
  setJournalDate,

  branchRef,
  typeRef,

  journalNoRef,
  dateRef,

  focusFirstAccountId,

  branchOptions,
}) => {
  /* =======================================================
     STATE
  ======================================================= */

  const [
    openSelect,
    setOpenSelect,
  ] = useState<
    "branch" | "type" | null
  >(null);

  const [
    journalNoLoading,
    setJournalNoLoading,
  ] = useState(false);

  /* =======================================================
     TYPE OPTIONS
  ======================================================= */

  const typeOptions: JournalType[] =
    useMemo(
      () => [
        {
          value: "S",
          label: "Standard",
        },
      ],
      []
    );

  /* =======================================================
     GET JOURNAL DOCUMENT NUMBER
  ======================================================= */

  const getJournalDocNumber =
    async (
      fbrid: string,
      typeId: string
    ) => {
      if (!fbrid) {
        setJournalNo("");
        return;
      }

      try {
        setJournalNoLoading(
          true
        );

        console.log(
          "Getting Journal Number:",
          {
            fbrid,
            typeId,
          }
        );

        const response =
          await fetch(
            `${import.meta.env.VITE_API_URL}/getJournalDocNumber`,
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify({
                  fbrid,
                  fptype: typeId,
                }),
            }
          );

        if (!response.ok) {
          throw new Error(
            `HTTP Error: ${response.status}`
          );
        }

        const result =
          (await response.json()) as
            JournalDocNumberResponse;

        console.log(
          "Journal Document Number Response:",
          result
        );

        if (
          result.success &&
          Array.isArray(
            result.data
          ) &&
          result.data.length > 0
        ) {
          const newJournalNo =
            result.data[0]
              ?.getnextdocno;

          setJournalNo(
            newJournalNo || ""
          );
        } else {
          console.error(
            "Journal number was not returned:",
            result
          );

          setJournalNo("");
        }
      } catch (error) {
        console.error(
          "Journal Document Number API Error:",
          error
        );

        setJournalNo("");
      } finally {
        setJournalNoLoading(
          false
        );
      }
    };

  /* =======================================================
     DEFAULT INITIALIZATION
  ======================================================= */

  useEffect(() => {
    const defaultType =
      type || "S";

    if (!type) {
      setType("S");
    }

    if (branch) {
      getJournalDocNumber(
        branch,
        defaultType
      );
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* =======================================================
     BRANCH CHANGE
  ======================================================= */

  useEffect(() => {
    if (!branch) {
      setJournalNo("");
      return;
    }

    const currentType =
      type || "S";

    getJournalDocNumber(
      branch,
      currentType
    );

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branch]);

  /* =======================================================
     TYPE CHANGE
  ======================================================= */

  useEffect(() => {
    if (!branch) {
      return;
    }

    const currentType =
      type || "S";

    getJournalDocNumber(
      branch,
      currentType
    );

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  /* =======================================================
     SELECT ENTER HANDLER
  ======================================================= */

  const handleSelectKeyDown = (
    event: React.KeyboardEvent,
    selectName:
      | "branch"
      | "type",
    focusNext: () => void
  ) => {
    if (
      event.key !== "Enter"
    ) {
      return;
    }

    /*
     * When dropdown is open,
     * react-select handles Enter.
     */
    if (
      openSelect ===
      selectName
    ) {
      return;
    }

    event.preventDefault();

    focusNext();
  };

  /* =======================================================
     INPUT ENTER HANDLER
  ======================================================= */

  const handleInputKeyDown = (
    event: Pick<
      React.KeyboardEvent,
      "key" |
      "preventDefault"
    >,
    focusNext: () => void
  ) => {
    if (
      event.key !== "Enter"
    ) {
      return;
    }

    event.preventDefault();

    focusNext();
  };

  /* =======================================================
     COMMON INPUT STYLE
  ======================================================= */

  const inputClass = `
    h-7
    rounded
    border
    border-[#d7dee7]
    bg-white
    px-2
    text-xs
    text-slate-700
    outline-none
    focus:border-[#9fdfbc]
    focus:ring-1
    focus:ring-[#9fdfbc]
  `;

  /* =======================================================
     COMMON SELECT STYLE
  ======================================================= */

  const selectStyles = {
    control: (
      base: any
    ) => ({
      ...base,

      minHeight: "28px",
      height: "28px",

      borderColor:
        "#d7dee7",

      borderRadius:
        "3px",

      boxShadow:
        "none",

      fontSize:
        "12px",

      backgroundColor:
        "#ffffff",

      cursor: "text",

      "&:hover": {
        borderColor:
          "#9fdfbc",
      },

      "&:focus": {
        borderColor:
          "#9fdfbc",
      },
    }),

    valueContainer: (
      base: any
    ) => ({
      ...base,

      height: "28px",

      padding:
        "0 8px",

      overflow:
        "hidden",
    }),

    singleValue: (
      base: any
    ) => ({
      ...base,

      color:
        "#344054",

      fontSize:
        "12px",

      margin: 0,
    }),

    placeholder: (
      base: any
    ) => ({
      ...base,

      color:
        "#8b96a3",

      fontSize:
        "12px",

      margin: 0,
    }),

    input: (
      base: any
    ) => ({
      ...base,

      margin: 0,

      padding: 0,

      fontSize:
        "12px",

      color:
        "#344054",
    }),

    indicatorsContainer: (
      base: any
    ) => ({
      ...base,

      height: "28px",
    }),

    dropdownIndicator: (
      base: any
    ) => ({
      ...base,

      color:
        "#aeb8c2",

      padding:
        "4px",

      "&:hover": {
        color:
          "#808080",
      },
    }),

    indicatorSeparator: () => ({
      display:
        "none",
    }),

    clearIndicator: (
      base: any
    ) => ({
      ...base,

      color:
        "#aeb8c2",

      padding:
        "4px",

      "&:hover": {
        color:
          "#808080",
      },
    }),

    menu: (
      base: any
    ) => ({
      ...base,

      fontSize:
        "12px",

      zIndex: 9999,

      marginTop:
        "2px",

      borderRadius:
        "3px",

      overflow:
        "hidden",

      boxShadow:
        "0 4px 12px rgba(0,0,0,0.12)",
    }),

    menuList: (
      base: any
    ) => ({
      ...base,

      padding:
        "3px 0",

      maxHeight:
        "200px",

      overflowY:
        "auto",
    }),

    option: (
      base: any,
      state: any
    ) => ({
      ...base,

      fontSize:
        "12px",

      cursor:
        "pointer",

      backgroundColor:
        state.isSelected
          ? "#eefbf4"
          : state.isFocused
          ? "#eefbf4"
          : "#ffffff",

      color:
        "#344054",

      padding:
        "7px 10px",

      "&:active": {
        backgroundColor:
          "#dff5e9",
      },
    }),
  };

  /* =======================================================
     SELECTED BRANCH
  ======================================================= */

  const selectedBranch =
    branchOptions.find(
      (option) =>
        option.value ===
        branch
    ) || null;

  /* =======================================================
     SELECTED TYPE
  ======================================================= */

  const selectedType =
    typeOptions.find(
      (option) =>
        option.value ===
        (type || "S")
    ) || null;

  /* =======================================================
     RETURN
  ======================================================= */

  return (
    <div
      className="
        px-3
        pt-2.5
        pb-2
      "
    >
      {/* ==================================================
          FORM GRID

          Same visual arrangement as reference:

          Branch                 Journal No.
          Type                   Date
      ================================================== */}

      <div
        className="
          grid
          grid-cols-[1fr_1fr_1fr]
          gap-x-12
          gap-y-2
        "
      >
        {/* =================================================
            BRANCH
        ================================================= */}

        <div
          className="
            flex
            items-center
            gap-2
          "
        >
          <label
            className="
              w-13.75
              shrink-0
              text-right
              text-xs
              font-normal
              text-slate-700
            "
          >
            Branch :
          </label>

          <Select<
            SelectOption,
            false
          >
            ref={branchRef}

            value={
              selectedBranch
            }

            onKeyDown={(
              event
            ) =>
              handleSelectKeyDown(
                event,
                "branch",
                () =>
                  typeRef.current?.focus()
              )
            }

            onMenuOpen={() =>
              setOpenSelect(
                "branch"
              )
            }

            onMenuClose={() =>
              setOpenSelect(
                null
              )
            }

            onChange={(
              option
            ) => {
              const selected =
                option?.value ||
                "";

              setBranch(
                selected
              );

              getJournalDocNumber(
                selected,
                type || "S"
              );
            }}

            options={
              branchOptions
            }

            placeholder="Select"

            components={{
              Option:
                CustomOption,
            }}

            filterOption={
              filterOption
            }

            styles={{
              ...selectStyles,

              control: (
                base: any
              ) => ({
                ...base,

                width:
                  "250px",

                minHeight:
                  "28px",

                height:
                  "28px",
              }),
            }}

            isSearchable

            isClearable={false}

            noOptionsMessage={() =>
              "No Branch Found"
            }
          />
        </div>

        {/* =================================================
            CENTER EMPTY SPACE
        ================================================= */}

        <div />

        {/* =================================================
            JOURNAL NUMBER
        ================================================= */}

        <div
          className="
            flex
            items-center
            justify-end
            gap-2
          "
        >
          <label
            className="
              whitespace-nowrap
              text-right
              text-xs
              font-normal
              text-slate-700
            "
          >
            Journal No. :
          </label>

          <input
            ref={
              journalNoRef
            }

            value={
              journalNoLoading
                ? "Loading..."
                : journalNo
            }

            readOnly

            onKeyDown={(
              event
            ) =>
              handleInputKeyDown(
                event,
                () =>
                  dateRef.current?.focus()
              )
            }

            className={`
              ${inputClass}
              w-37.5
            `}
          />
        </div>

        {/* =================================================
            TYPE
        ================================================= */}

        <div
          className="
            flex
            items-center
            gap-2
          "
        >
          <label
            className="
              w-13.75
              shrink-0
              text-right
              text-xs
              font-normal
              text-slate-700
            "
          >
            Type :
          </label>

          <Select<
            SelectOption,
            false
          >
            ref={typeRef}

            value={
              selectedType
            }

            onKeyDown={(
              event
            ) =>
              handleSelectKeyDown(
                event,
                "type",
                () =>
                  journalNoRef.current?.focus()
              )
            }

            onMenuOpen={() =>
              setOpenSelect(
                "type"
              )
            }

            onMenuClose={() =>
              setOpenSelect(
                null
              )
            }

            onChange={(
              option
            ) => {
              const selected =
                option?.value ||
                "S";

              setType(
                selected
              );

              if (branch) {
                getJournalDocNumber(
                  branch,
                  selected
                );
              }
            }}

            options={
              typeOptions
            }

            placeholder="Select"

            components={{
              Option:
                CustomOption,
            }}

            filterOption={
              filterOption
            }

            styles={{
              ...selectStyles,

              control: (
                base: any
              ) => ({
                ...base,

                width:
                  "250px",

                minHeight:
                  "28px",

                height:
                  "28px",
              }),
            }}

            isSearchable

            isClearable={false}

            noOptionsMessage={() =>
              "No Type Found"
            }
          />
        </div>

        {/* =================================================
            CENTER EMPTY SPACE
        ================================================= */}

        <div />

        {/* =================================================
            DATE
        ================================================= */}

        <div
          className="
            flex
            items-center
            justify-end
            gap-2
          "
        >
          <label
            className="
              whitespace-nowrap
              text-right
              text-xs
              font-normal
              text-slate-700
            "
          >
            Date :
          </label>

          <LocalizationProvider
            dateAdapter={
              AdapterDayjs
            }
          >
            <DatePicker
              value={
                journalDate
                  ? dayjs(
                      journalDate,
                      "DD/MM/YYYY"
                    )
                  : null
              }

              onChange={(
                newValue
              ) => {
                if (
                  newValue?.isValid()
                ) {
                  setJournalDate(
                    newValue.format(
                      "DD/MM/YYYY"
                    )
                  );
                } else {
                  setJournalDate(
                    ""
                  );
                }
              }}

              format="DD/MM/YYYY"

              inputRef={
                dateRef
              }

              slotProps={{
                textField: {
                  onKeyDown: (
                    event
                  ) =>
                    handleInputKeyDown(
                      event,
                      focusFirstAccountId
                    ),
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

              sx={{
                width:
                  "150px",

                "& .MuiPickersTextField-root":
                  {
                    width:
                      "150px",
                  },

                "& .MuiPickersInputBase-root":
                  {
                    width:
                      "150px",

                    height:
                      "28px",

                    minHeight:
                      "28px",

                    boxSizing:
                      "border-box",

                    borderRadius:
                      "3px",

                    backgroundColor:
                      "#ffffff",

                    fontSize:
                      "12px",

                    padding: 0,

                    overflow:
                      "hidden",
                  },

                "& .MuiPickersInputBase-sectionContainer":
                  {
                    minWidth: 0,

                    padding:
                      "0 0 0 8px",

                    overflow:
                      "hidden",
                  },

                "& .MuiPickersInputBase-input":
                  {
                    minWidth: 0,

                    width:
                      "100%",

                    fontSize:
                      "12px",

                    padding: 0,

                    height:
                      "28px",

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
                    width:
                      "24px",

                    height:
                      "24px",

                    padding:
                      "2px",

                    margin: 0,
                  },

                "& .MuiSvgIcon-root":
                  {
                    fontSize:
                      "16px",
                  },

                "& .MuiPickersOutlinedInput-notchedOutline":
                  {
                    borderColor:
                      "#d7dee7",
                  },

                "& .MuiPickersInputBase-root:hover .MuiPickersOutlinedInput-notchedOutline":
                  {
                    borderColor:
                      "#9fdfbc",
                  },

                "& .MuiPickersInputBase-root.Mui-focused .MuiPickersOutlinedInput-notchedOutline":
                  {
                    borderColor:
                      "#9fdfbc",

                    borderWidth:
                      "1px",
                  },
              }}
            />
          </LocalizationProvider>
        </div>
      </div>
    </div>
  );
};

export default JournalForm;