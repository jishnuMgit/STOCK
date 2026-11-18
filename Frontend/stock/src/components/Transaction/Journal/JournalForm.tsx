import React, { useEffect, useMemo, useState, type Ref } from "react";

import { type SelectInstance } from "react-select";

import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";

import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";

import CommonTableSelect, {
  type TableSelectOption,
} from "../../common/CommonTableSelect";

import "../Receipt/save/commanReceipt.css";

dayjs.extend(customParseFormat);

/* =========================================================
   TYPES
========================================================= */

/* type alias (not interface) so it fits TableSelectOption's index signature */
type SelectOption = {
  value: string;
  label: string;
};

type SelectRef = Ref<SelectInstance<TableSelectOption, false>>;

export interface JournalFormProps {
  branch: string;
  setBranch: (value: string) => void;

  type: string;
  setType: (value: string) => void;

  journalNo: string;
  setJournalNo: (value: string) => void;

  journalDate: string;
  setJournalDate: (value: string) => void;

  branchRef: React.RefObject<SelectInstance<SelectOption, false> | null>;
  typeRef: React.RefObject<SelectInstance<SelectOption, false> | null>;
  journalNoRef: React.RefObject<HTMLInputElement | null>;
  dateRef: React.RefObject<HTMLInputElement | null>;

  /* after Date: move focus to the first Account ID */
  focusFirstAccountId: () => void;

  branchOptions: SelectOption[];
}

interface JournalDocNumberResponse {
  success: boolean;
  data: {
    getnextdocno: string;
  }[];
  message?: string;
}

/* =========================================================
   LOOKUP COLUMNS (same table-style menu as sales / purchase)
========================================================= */

const branchColumns = [
  { key: "label", label: "Branch", width: "250px" },
  { key: "value", label: "ID", width: "50px" },
];

const typeColumns = [
  { key: "label", label: "Name", width: "250px" },
  { key: "value", label: "ID", width: "50px" },
];

/* =========================================================
   SEARCH FILTER (searches both id and name)
========================================================= */

const filterOption = (
  option: { data: SelectOption },
  inputValue: string,
) => {
  const search = inputValue.toLowerCase().trim();

  if (!search) {
    return true;
  }

  return (
    option.data.label.toLowerCase().includes(search) ||
    option.data.value.toLowerCase().includes(search)
  );
};

/* =========================================================
   JOURNAL FORM
========================================================= */

const JournalForm: React.FC<JournalFormProps> = ({
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

  const [openSelect, setOpenSelect] = useState<"branch" | "type" | null>(null);

  const [journalNoLoading, setJournalNoLoading] = useState(false);

  /* =======================================================
     TYPE OPTIONS
  ======================================================= */

  const typeOptions: SelectOption[] = useMemo(
    () => [
      {
        value: "S",
        label: "Standard",
      },
    ],
    [],
  );

  const menuPortalTarget =
    typeof document !== "undefined" ? document.body : undefined;

  /* =======================================================
     GET JOURNAL DOCUMENT NUMBER
  ======================================================= */

  const getJournalDocNumber = async (fbrid: string, typeId: string) => {
    if (!fbrid) {
      setJournalNo("");
      return;
    }

    try {
      setJournalNoLoading(true);

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/getJournalDocNumber`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            fbrid,
            fptype: typeId,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }

      const result = (await response.json()) as JournalDocNumberResponse;

      if (
        result.success &&
        Array.isArray(result.data) &&
        result.data.length > 0
      ) {
        const newJournalNo = result.data[0]?.getnextdocno;

        setJournalNo(newJournalNo || "");
      } else {
        console.error("Journal number was not returned:", result);

        setJournalNo("");
      }
    } catch (error) {
      console.error("Journal Document Number API Error:", error);

      setJournalNo("");
    } finally {
      setJournalNoLoading(false);
    }
  };

  /* =======================================================
     DEFAULT INITIALIZATION
  ======================================================= */

  useEffect(() => {
    const defaultType = type || "S";

    if (!type) {
      setType("S");
    }

    if (branch) {
      getJournalDocNumber(branch, defaultType);
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

    getJournalDocNumber(branch, type || "S");

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branch]);

  /* =======================================================
     TYPE CHANGE
  ======================================================= */

  useEffect(() => {
    if (!branch) {
      return;
    }

    getJournalDocNumber(branch, type || "S");

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  /* =======================================================
     SELECT ENTER HANDLER
  ======================================================= */

  const handleSelectKeyDown = (
    event: React.KeyboardEvent,
    selectName: "branch" | "type",
    focusNext: () => void,
  ) => {
    if (event.key !== "Enter") {
      return;
    }

    /* when the dropdown is open, react-select handles Enter */
    if (openSelect === selectName) {
      return;
    }

    event.preventDefault();

    focusNext();
  };

  /* =======================================================
     INPUT ENTER HANDLER
  ======================================================= */

  const handleInputKeyDown = (
    event: Pick<React.KeyboardEvent, "key" | "preventDefault">,
    focusNext: () => void,
  ) => {
    if (event.key !== "Enter") {
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
    pl-[2px]
    pr-2
    text-xs
    text-slate-700
    outline-none
    focus:border-[#9fdfbc]
    focus:ring-1
    focus:ring-[#9fdfbc]
  `;

  /* =======================================================
     SELECTED VALUES
  ======================================================= */

  const selectedBranch =
    branchOptions.find((option) => option.value === branch) || null;

  const selectedType =
    typeOptions.find((option) => option.value === (type || "S")) || null;

  /* =======================================================
     RETURN
  ======================================================= */

  return (
    <div
      className="
        px-3
        pt-3
        mx-3
        mt-3
        pb-2
      "
    >
      {/* ==================================================
          FORM GRID

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
              text-[14px]
            "
          >
            Branch :
          </label>

          <CommonTableSelect
            selectRef={branchRef as unknown as SelectRef}
            options={branchOptions}
            value={selectedBranch}
            onChange={(option) => {
              const selected = option?.value || "";

              setBranch(selected);

              getJournalDocNumber(selected, type || "S");
            }}
            columns={branchColumns}
            placeholder="Select"
            width="250px"
            menuWidth="310px"
            controlHeight={30}
            borderColor="#99a1af"
            hoverBorderColor="#20884e"
            filterOption={filterOption}
            noOptionsMessage={() => "No Branch Found"}
            menuPortalTarget={menuPortalTarget}
            onKeyDown={(event) =>
              handleSelectKeyDown(event, "branch", () =>
                typeRef.current?.focus(),
              )
            }
            onMenuOpen={() => setOpenSelect("branch")}
            onMenuClose={() => setOpenSelect(null)}
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
              text-[14px]
            "
          >
            Journal No. :
          </label>

          <input
            ref={journalNoRef}
            value={journalNoLoading ? "Loading..." : journalNo}
            readOnly
            onKeyDown={(event) =>
              handleInputKeyDown(event, () => dateRef.current?.focus())
            }
            className={`
              ${inputClass}
              w-35
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
              text-[14px]
            "
          >
            Type :
          </label>

          <CommonTableSelect
            selectRef={typeRef as unknown as SelectRef}
            options={typeOptions}
            value={selectedType}
            onChange={(option) => {
              const selected = option?.value || "S";

              setType(selected);

              if (branch) {
                getJournalDocNumber(branch, selected);
              }
            }}
            columns={typeColumns}
            placeholder="Select"
            width="250px"
            menuWidth="310px"
            controlHeight={30}
            borderColor="#99a1af"
            hoverBorderColor="#20884e"
            filterOption={filterOption}
            noOptionsMessage={() => "No Type Found"}
            menuPortalTarget={menuPortalTarget}
            onKeyDown={(event) =>
              handleSelectKeyDown(event, "type", () =>
                journalNoRef.current?.focus(),
              )
            }
            onMenuOpen={() => setOpenSelect("type")}
            onMenuClose={() => setOpenSelect(null)}
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
              text-[14px]
            "
          >
            Date :
          </label>

          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DatePicker
              value={
                journalDate ? dayjs(journalDate, "DD/MM/YYYY") : null
              }
              onChange={(newValue) => {
                if (newValue?.isValid()) {
                  setJournalDate(newValue.format("DD/MM/YYYY"));
                } else {
                  setJournalDate("");
                }
              }}
              format="DD/MM/YYYY"
              inputRef={dateRef}
              slotProps={{
                textField: {
                  onKeyDown: (event) =>
                    handleInputKeyDown(event, focusFirstAccountId),
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

                "& .MuiPickersInputBase-sectionsContainer": {
                  paddingLeft: "2px !important",
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
                  width: "24px",
                  height: "24px",
                  padding: "2px",
                  margin: 0,
                },

                "& .MuiSvgIcon-root": {
                  fontSize: "16px",
                },

                "& .MuiPickersOutlinedInput-notchedOutline": {
                  borderColor: "#B7C7D7 !important",
                },

                "& .MuiPickersInputBase-root:hover .MuiPickersOutlinedInput-notchedOutline":
                {
                  borderColor: "#B7C7D7 !important",
                },

                "& .MuiPickersInputBase-root.Mui-focused .MuiPickersOutlinedInput-notchedOutline":
                {
                  borderColor: "#B7C7D7 !important",
                  borderWidth: "1px",
                },

                "& .MuiPickersInputBase-root.Mui-error .MuiPickersOutlinedInput-notchedOutline":
                {
                  borderColor: "#B7C7D7 !important",
                },

                "& .MuiPickersInputBase-root.Mui-error:hover .MuiPickersOutlinedInput-notchedOutline":
                {
                  borderColor: "#B7C7D7 !important",
                },

                "& .MuiPickersInputBase-root.Mui-error.Mui-focused .MuiPickersOutlinedInput-notchedOutline":
                {
                  borderColor: "#B7C7D7 !important",
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