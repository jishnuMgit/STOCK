import React, { useEffect, useState } from "react";
import Select, {
  components,
  type SingleValue,
  type StylesConfig,
} from "react-select";
import { toast } from "react-toastify";

// ============================================================
// TYPES
// ============================================================

interface SelectOption {
  value: string;
  label: string;
}

interface DocumentRow {
  id: number;
  lkpDocument: string;

  lkpMode: string;
  txtDocPrefix: string;
  txtStartSeqNo: string;

  chkStrictSerial: boolean;

  lkpResetNo: string;
  chkPrintAfterSave: boolean;
  txtPositionNo: number;
}

// ============================================================
// CUSTOM SELECT STYLES
// ============================================================

const selectStyles: StylesConfig<SelectOption, false> = {
  control: (base, state) => ({
    ...base,
    minHeight: "28px",
    height: "28px",
    borderRadius: "4px",
    borderColor: state.isFocused ? "#3b82f6" : "#cbd5e1",
    boxShadow: "none",
    fontSize: "13px",
    backgroundColor: "#ffffff",
    cursor: "pointer",

    "&:hover": {
      borderColor: "#94a3b8",
    },
  }),

  valueContainer: (base) => ({
    ...base,
    height: "28px",
    padding: "0 8px",
  }),

  input: (base) => ({
    ...base,
    margin: 0,
    padding: 0,
    fontSize: "13px",
  }),

  singleValue: (base) => ({
    ...base,
    color: "#475569",
    fontSize: "13px",
  }),

  placeholder: (base) => ({
    ...base,
    color: "#64748b",
    fontSize: "13px",
  }),

  indicatorsContainer: (base) => ({
    ...base,
    height: "28px",
  }),

  dropdownIndicator: (base) => ({
    ...base,
    padding: "4px 7px",
    color: "#64748b",
  }),

  indicatorSeparator: () => ({
    display: "none",
  }),

  menu: (base) => ({
    ...base,
    zIndex: 9999,
    fontSize: "13px",
  }),

  menuList: (base) => ({
    ...base,
    padding: "3px 0",
  }),

  option: (base, state) => ({
    ...base,
    minHeight: "30px",
    padding: "6px 10px",
    fontSize: "13px",

    backgroundColor: state.isSelected
      ? "#dbeafe"
      : state.isFocused
      ? "#eff6ff"
      : "#ffffff",

    color: "#475569",
    cursor: "pointer",
  }),
};

// ============================================================
// TABLE SELECT STYLES
// ============================================================

const tableSelectStyles: StylesConfig<SelectOption, false> = {
  ...selectStyles,

  control: (base) => ({
    ...base,
    minHeight: "32px",
    height: "36px",
    width: "100%",
    border: "none",
    borderRadius: 0,
    boxShadow: "none",
    backgroundColor: "transparent",
    fontSize: "13px",
    cursor: "pointer",
    "&:hover": {
      border: "none",
    },
  }),

  valueContainer: (base) => ({
    ...base,
    height: "26px",
    minWidth: 0,
    padding: "0 3px",
    overflow: "hidden",
  }),

  singleValue: (base) => ({
    ...base,
    color: "#475569",
    fontSize: "11px",
    maxWidth: "100%",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  }),

  indicatorsContainer: (base) => ({
    ...base,
    height: "26px",
    flexShrink: 0,
  }),

  dropdownIndicator: (base) => ({
    ...base,
    padding: "2px 3px",
  }),

  indicatorSeparator: () => ({
    display: "none",
  }),

  menu: (base) => ({
    ...base,
    zIndex: 9999,
    fontSize: "11px",
  }),

  option: (base, state) => ({
    ...base,
    minHeight: "26px",
    padding: "5px 6px",
    fontSize: "11px",
    backgroundColor: state.isSelected
      ? "#dbeafe"
      : state.isFocused
      ? "#eff6ff"
      : "#ffffff",
    color: "#475569",
  }),
};
// ============================================================
// OPTIONS
// ============================================================

const modeOptions: SelectOption[] = [
  { value: "Auto", label: "Auto" },
  { value: "Manual", label: "Manual" },
];

const resetOptions: SelectOption[] = [
  { value: "Never", label: "Never" },
  { value: "Yearly", label: "Yearly" },
  { value: "Monthly", label: "Monthly" },
];


// ============================================================
// CUSTOM DROPDOWN INDICATOR
// ============================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomDropdownIndicator = (props: any) => {
  return (
    <components.DropdownIndicator {...props}>
      <span className="text-[11px] text-slate-500">
        ▼
      </span>
    </components.DropdownIndicator>
  );
};

// ============================================================
// COMPONENT
// ============================================================

const SetDocumentNo: React.FC = () => {
  // ==========================================================
  // HEADER STATES
  // ==========================================================

  const [lkpYear, setLkpYear] =
    useState<string>(
      () => localStorage.getItem("year") || ""
    );

  const [yearOptions, setYearOptions] =
    useState<SelectOption[]>([]);

  const [lkpBranch, setLkpBranch] =
    useState<string>(
      () => localStorage.getItem("branchId") || ""
    );

  const [branchOptions, setBranchOptions] =
    useState<SelectOption[]>([]);

  const [lkpModule, setLkpModule] =
    useState<string>("");

  const [moduleOptions, setModuleOptions] =
    useState<SelectOption[]>([]);

  /* =======================================================
     LOAD YEAR LIST (lkpYear dropdown)
  ======================================================= */

  useEffect(() => {
    const loadYearList = async () => {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/DocumentNo/getYearList`
        );

        if (!response.ok) {
          throw new Error(`HTTP Error: ${response.status}`);
        }

        const result = await response.json();

        if (!result.success) {
          console.error("getYearList failed:", result.message);
          return;
        }

        const options: SelectOption[] = (result.data || []).map(
          (row: { fyear: number }) => ({
            value: String(row.fyear),
            label: String(row.fyear),
          })
        );

        setYearOptions(options);
      } catch (error) {
        console.error("getYearList error:", error);
      }
    };

    loadYearList();
  }, []);

  /* =======================================================
     LOAD BRANCH LIST (lkpBranch dropdown)
  ======================================================= */

  useEffect(() => {
    const loadBranchList = async () => {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/DocumentNo/getBranchList`
        );

        if (!response.ok) {
          throw new Error(`HTTP Error: ${response.status}`);
        }

        const result = await response.json();

        if (!result.success) {
          console.error("getBranchList failed:", result.message);
          return;
        }

        const options: SelectOption[] = (result.data || []).map(
          (row: { fbrid: string; fbrname: string }) => ({
            value: row.fbrid,
            label: row.fbrname,
          })
        );

        setBranchOptions(options);
      } catch (error) {
        console.error("getBranchList error:", error);
      }
    };

    loadBranchList();
  }, []);

  /* =======================================================
     LOAD MODULE LIST (lkpModule dropdown)
  ======================================================= */

  useEffect(() => {
    const loadModuleList = async () => {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/DocumentNo/getModuleList`
        );

        if (!response.ok) {
          throw new Error(`HTTP Error: ${response.status}`);
        }

        const result = await response.json();

        if (!result.success) {
          console.error("getModuleList failed:", result.message);
          return;
        }

        const options: SelectOption[] = (result.data || []).map(
          (row: { fmoduleid: string; fmodulename: string }) => ({
            value: row.fmoduleid,
            label: row.fmodulename,
          })
        );

        setModuleOptions(options);
      } catch (error) {
        console.error("getModuleList error:", error);
      }
    };

    loadModuleList();
  }, []);

  // ==========================================================
  // TABLE STATES
  // ==========================================================

  const [rows, setRows] = useState<DocumentRow[]>([]);

  const [documentOptions, setDocumentOptions] =
    useState<SelectOption[]>([]);

  /* =======================================================
     LOAD DOCUMENT LIST (per Module) + existing saved rules
     (per Year/Branch/Module) — merged into the grid rows
  ======================================================= */

  useEffect(() => {
    if (!lkpModule) {
      setDocumentOptions([]);
      setRows([]);
      return;
    }

    const loadDocumentGrid = async () => {
      try {
        const docListResponse = await fetch(
          `${import.meta.env.VITE_API_URL}/DocumentNo/getDocumentList?lkpModule=${lkpModule}`
        );

        if (!docListResponse.ok) {
          throw new Error(`HTTP Error: ${docListResponse.status}`);
        }

        const docListResult = await docListResponse.json();

        if (!docListResult.success) {
          console.error("getDocumentList failed:", docListResult.message);
          return;
        }

        const documentRows: {
          fdoctype: string;
          fdocname: string;
        }[] = docListResult.data || [];

        setDocumentOptions(
          documentRows.map((doc) => ({
            value: doc.fdoctype,
            label: doc.fdocname,
          }))
        );

        let existingRows: Record<string, any> = {};

        if (lkpYear && lkpBranch) {
          const docNoResponse = await fetch(
            `${import.meta.env.VITE_API_URL}/DocumentNo/getDocumentNoList?lkpYear=${lkpYear}&lkpBranch=${lkpBranch}&lkpModule=${lkpModule}`
          );

          if (docNoResponse.ok) {
            const docNoResult = await docNoResponse.json();

            if (docNoResult.success) {
              existingRows = (docNoResult.data || []).reduce(
                (accumulator: Record<string, any>, row: any) => {
                  accumulator[row.fdoctype] = row;
                  return accumulator;
                },
                {}
              );
            }
          }
        }

        setRows(
          documentRows.map((doc, index) => {
            const existing = existingRows[doc.fdoctype];

            return {
              id: index + 1,
              lkpDocument: doc.fdoctype,
              lkpMode: existing?.fseqnoincrementmode || "Auto",
              txtDocPrefix: existing?.fdocnoprefix || "",
              txtStartSeqNo: existing?.fstartseqno || "",
              chkStrictSerial: existing?.fstrictserialseqno ?? false,
              lkpResetNo: existing?.fseqnoresetmode || "Never",
              chkPrintAfterSave:
                existing?.fprintaftersave === 1 ||
                existing?.fprintaftersave === true,
              txtPositionNo: index + 1,
            };
          })
        );
      } catch (error) {
        console.error("loadDocumentGrid error:", error);
      }
    };

    loadDocumentGrid();
  }, [lkpYear, lkpBranch, lkpModule]);

  // ==========================================================
  // BUTTON STATE
  // ==========================================================

  const [
    CopyToNextYearbtn,
    setCopyToNextYearbtn,
  ] = useState<boolean>(false);

  // ==========================================================
  // UPDATE ROW
  // ==========================================================

  const handleRowChange = <
    K extends keyof DocumentRow
  >(
    id: number,
    field: K,
    value: DocumentRow[K]
  ) => {
    setRows((previousRows) =>
      previousRows.map((row) =>
        row.id === id
          ? {
              ...row,
              [field]: value,
            }
          : row
      )
    );
  };

  // ==========================================================
  // SAVE
  // ==========================================================

  const handleSave = async () => {
    if (!lkpYear || !lkpBranch || !lkpModule) {
      toast.warning("Year, Branch and Module are required.");
      return;
    }

    const validRows = rows.filter(
      (row) => row.txtDocPrefix.trim() !== "" || row.txtStartSeqNo.trim() !== ""
    );

    if (validRows.length === 0) {
      toast.warning("There is no information for saving.");
      return;
    }

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/DocumentNo/saveDocumentNo`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lkpYear,
            lkpBranch,
            lkpModule,
            rows: validRows.map((row) => ({
              docType: row.lkpDocument,
              docNoPrefix: row.txtDocPrefix || null,
              startSeqNo: row.txtStartSeqNo || null,
              strictSerialSeqNo: row.chkStrictSerial,
              seqNoIncrementMode: row.lkpMode || null,
              seqNoResetMode: row.lkpResetNo || null,
              printAfterSave: row.chkPrintAfterSave ? 1 : 0,
              positionNo: row.txtPositionNo,
            })),
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        toast.error(result.message || "Document numbering could not be saved.");
        return;
      }

      toast.success(result.message || "Document numbering saved successfully.");
    } catch (error) {
      console.error("saveDocumentNo error:", error);
      toast.error("Cannot connect to Document No API.");
    }
  };

  // ==========================================================
  // CLEAR
  // ==========================================================

  const handleClear = () => {
    setLkpYear("");
    setLkpBranch("");
    setLkpModule("");
    setRows([]);

    setCopyToNextYearbtn(false);
  };

  // ==========================================================
  // GET OPTION
  // ==========================================================

  const getOption = (
    options: SelectOption[],
    value: string
  ): SelectOption | null => {
    return (
      options.find(
        (item) => item.value === value
      ) ?? null
    );
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
        flex-col
        items-center
        justify-center
        bg-white
        p-1
        text-[13px]
        text-slate-700
      "
    >

      {/* =====================================================
          MAIN CONTAINER
      ====================================================== */}

      <div
        className="
          mx-auto
          w-full
          border
          border-slate-300
          bg-white
          shadow-sm

          sm:w-[70%]
          lg:w-[75%]
          xl:w-[65%]
          md:w-[100%]
        "
      >

        {/* =====================================================
            TITLE
        ====================================================== */}

        <div
          className="
            flex
            h-[30px]
            items-center
            border-b
            border-slate-300
            bg-[#a3dfc0]
          "
        >
          <h1
            className="
              ml-1.5
              text-[17px]
              font-semibold
              text-slate-700
            "
          >
            Set Document No.
          </h1>
        </div>

        {/* =====================================================
            HEADER
        ====================================================== */}

        <div
          className="
            grid
            grid-cols-1
            gap-3
            border-b
            border-slate-200
            px-3
            py-3

            sm:grid-cols-2
            sm:px-5

            lg:grid-cols-[200px_1fr_1fr]
            lg:items-center
            lg:gap-4
            lg:px-10
          "
        >

          {/* ===================================================
              YEAR
          ==================================================== */}

          <div className="flex w-full items-center gap-2">

            <label
              htmlFor="lkpYear"
              className="
                w-[40px]
                shrink-0
                text-right
                font-semibold
              "
            >
              Year :
            </label>

            <div className="w-[108px] shrink-0">

              <Select
                inputId="lkpYear"
                instanceId="lkpYear"
                name="lkpYear"
                options={yearOptions}
                value={getOption(
                  yearOptions,
                  lkpYear
                )}
                onChange={(
                  option: SingleValue<SelectOption>
                ) =>
                  setLkpYear(
                    option?.value ?? ""
                  )
                }
                styles={selectStyles}
                components={{
                  DropdownIndicator:
                    CustomDropdownIndicator,
                }}
                isSearchable={false}
                menuPlacement="auto"
              />

            </div>

          </div>

          {/* ===================================================
              BRANCH
          ==================================================== */}

          <div
            className="
              flex
              w-full
              items-center
              gap-2
              sm:justify-center
            "
          >

            <label
              htmlFor="lkpBranch"
              className="
                shrink-0
                font-semibold
              "
            >
              Branch :
            </label>

            <div
              className="
                w-full
                sm:w-[180px]
                lg:w-[212px]
              "
            >

              <Select
                inputId="lkpBranch"
                instanceId="lkpBranch"
                name="lkpBranch"
                options={branchOptions}
                value={getOption(
                  branchOptions,
                  lkpBranch
                )}
                onChange={(
                  option: SingleValue<SelectOption>
                ) =>
                  setLkpBranch(
                    option?.value ?? ""
                  )
                }
                styles={selectStyles}
                components={{
                  DropdownIndicator:
                    CustomDropdownIndicator,
                }}
                isSearchable={false}
                menuPlacement="auto"
              />

            </div>

          </div>

          {/* ===================================================
              MODULE
          ==================================================== */}

          <div
            className="
              flex
              w-full
              items-center
              gap-2
              sm:justify-center
            "
          >

            <label
              htmlFor="lkpModule"
              className="
                shrink-0
                font-semibold
              "
            >
              Module :
            </label>

            <div
              className="
                w-full
                sm:w-[120px]
                lg:w-[150px]
              "
            >

              <Select
                inputId="lkpModule"
                instanceId="lkpModule"
                name="lkpModule"
                options={moduleOptions}
                value={getOption(
                  moduleOptions,
                  lkpModule
                )}
                onChange={(
                  option: SingleValue<SelectOption>
                ) =>
                  setLkpModule(
                    option?.value ?? ""
                  )
                }
                styles={selectStyles}
                components={{
                  DropdownIndicator:
                    CustomDropdownIndicator,
                }}
                isSearchable={false}
                menuPlacement="auto"
              />

            </div>

          </div>

        </div>

       
        <div
          className="
            px-2
            sm:px-5
            lg:px-10
          "
        >

          <div
            className="
              w-full
              overflow-x-auto
              overflow-y-visible
              border-l
              border-r
              border-b
              border-slate-200
            "
          >

            <table
              className="
                w-full
                min-w-[150px]
                max-w-[100%]
                table-fixed
                border-collapse
              "
            >

              {/* =================================================
                  TABLE HEADER
              ================================================== */}

              <thead>

                <tr
                  className="
                    h-9
                    bg-slate-50
                    text-left
                    text-[13px]
                    font-semibold
                    text-slate-600
                  "
                >

                  {/* ARROW */}

                  {/* <th
                    className="
                      w-[20px]
                      border-r
                      border-slate-200
                    "
                  >
                  </th> */}

                  {/* DOCUMENT */}

                  <th
                    className="
                      w-[50px]
                      border-r
                      border-slate-200
                      px-1
                      font-semibold
                    "
                  >
                    Document
                  </th>

                  {/* PREFIX */}

                  <th
                    className="
                      w-[25px]
                      border-r
                      border-slate-200
                      px-1
                      font-semibold
                    "
                  >
                    Prefix
                  </th>

                  {/* START SEQ */}

                  <th
                    className="
                      w-[25px]
                      border-r
                      border-slate-200
                      px-1
                      whitespace-nowrap
                      font-semibold
                    "
                  >
                    Start Seq. No.
                  </th>

                  {/* STRICT SERIAL */}

                  <th
                    className="
                      w-[25px]
                      border-r
                      border-slate-200
                      px-1
                      text-center
                      font-semibold
                    "
                  >
                    Strict Serial
                  </th>

                  {/* MODE */}

                  <th
                    className="
                      w-[25px]
                      border-r
                      border-slate-200
                      px-1
                      font-semibold
                    "
                  >
                    + Mode
                  </th>

                  {/* RESET */}

                  <th
                    className="
                      w-[25px]
                      border-r
                      border-slate-200
                      px-1
                      font-semibold
                    "
                  >
                    Reset No.
                  </th>

                  {/* PRINT */}

                  <th
                    className="
                      w-[30px]
                      border-r
                      border-slate-200
                      px-1
                      text-center
                      whitespace-nowrap
                      font-semibold
                    "
                  >
                    Print After Save
                  </th>

                  {/* POSITION */}

                  <th
                    className="
                      w-[30px]
                      px-1
                      text-center
                      whitespace-nowrap
                      font-semibold
                    "
                  >
                    Position No.
                  </th>

                </tr>

              </thead>

              {/* =================================================
                  TABLE BODY
              ================================================== */}

              <tbody>

                {rows.map((row, index) => (

                  <tr
                    key={row.id}
                    className={`
                      h-[34px]
                      ${
                        index === 0
                          ? "bg-[#edf4fc]"
                          : "bg-white"
                      }
                      hover:bg-slate-50
                    `}
                  >

                    {/* =================================================
                        ARROW
                    ================================================= */}

                    {/* <td
                      className="
                        border-r
                        border-t
                        border-slate-200
                        text-center
                      "
                    >
                    </td> */}

                    {/* =================================================
                        DOCUMENT
                    ================================================= */}

                    <td
                      className="
                        border-r
                        border-t
                        border-slate-200
                        p-0
                      "
                    >

                      <Select
                        inputId={`lkpDocument_${row.id}`}
                        instanceId={`lkpDocument_${row.id}`}
                        name="lkpDocument"
                        options={documentOptions}
                        value={getOption(
                          documentOptions,
                          row.lkpDocument
                        )}
                        onChange={(
                          option: SingleValue<SelectOption>
                        ) =>
                          handleRowChange(
                            row.id,
                            "lkpDocument",
                            option?.value ?? ""
                          )
                        }
                        styles={tableSelectStyles}
                        components={{
                          DropdownIndicator:
                            CustomDropdownIndicator,
                        }}
                        isSearchable={false}
                        menuPortalTarget={
                          document.body
                        }
                        menuPosition="fixed"
                      />

                    </td>

                    {/* =================================================
                        PREFIX
                    ================================================= */}

                    <td
                      className="
                        border-r
                        border-t
                        border-slate-200
                        px-1
                      "
                    >

                      <input
                        id={`txtDocPrefix_${row.id}`}
                        name="txtDocPrefix"
                        type="text"
                        value={row.txtDocPrefix}
                        onChange={(e) =>
                          handleRowChange(
                            row.id,
                            "txtDocPrefix",
                            e.target.value
                          )
                        }
                        className="
                          w-full
                          bg-transparent
                          text-left
                          text-[13px]
                          text-slate-600
                          outline-none
                        "
                      />

                    </td>

                    {/* =================================================
                        START SEQ NO
                    ================================================= */}

                    <td
                      className="
                        border-r
                        border-t
                        border-slate-200
                        px-1
                      "
                    >

                      <input
                        id={`txtStartSeqNo_${row.id}`}
                        name="txtStartSeqNo"
                        type="text"
                        value={row.txtStartSeqNo}
                        onChange={(e) =>
                          handleRowChange(
                            row.id,
                            "txtStartSeqNo",
                            e.target.value
                          )
                        }
                        className="
                          w-full
                          bg-transparent
                          text-center
                          text-[13px]
                          text-slate-600
                          outline-none
                        "
                      />

                    </td>

                    {/* =================================================
                        STRICT SERIAL
                    ================================================= */}

                    <td
                      className="
                        border-r
                        border-t
                        border-slate-200
                        text-center
                      "
                    >

                      <input
                        id={`chkStrictSerial_${row.id}`}
                        name="chkStrictSerial"
                        type="checkbox"
                        checked={
                          row.chkStrictSerial
                        }
                        onChange={(e) =>
                          handleRowChange(
                            row.id,
                            "chkStrictSerial",
                            e.target.checked
                          )
                        }
                        className="
                          h-[16px]
                          w-[16px]
                          cursor-pointer
                          accent-blue-600
                        "
                      />

                    </td>

                    {/* =================================================
                        + MODE
                    ================================================= */}

                    <td
                      className="
                        border-r
                        border-t
                        border-slate-200
                        p-0
                      "
                    >

                      <Select
                        inputId={`lkpMode_${row.id}`}
                        instanceId={`lkpMode_${row.id}`}
                        name="lkpMode"
                        options={modeOptions}
                        value={getOption(
                          modeOptions,
                          row.lkpMode
                        )}
                        onChange={(
                          option: SingleValue<SelectOption>
                        ) =>
                          handleRowChange(
                            row.id,
                            "lkpMode",
                            option?.value ?? ""
                          )
                        }
                        styles={tableSelectStyles}
                        components={{
                          DropdownIndicator:
                            CustomDropdownIndicator,
                        }}
                        isSearchable={false}
                        menuPortalTarget={
                          document.body
                        }
                        menuPosition="fixed"
                      />

                    </td>

                    {/* =================================================
                        RESET NO
                    ================================================= */}

                    <td
                      className="
                        border-r
                        border-t
                        border-slate-200
                        p-0
                      "
                    >

                      <Select
                        inputId={`lkpResetNo_${row.id}`}
                        instanceId={`lkpResetNo_${row.id}`}
                        name="lkpResetNo"
                        options={resetOptions}
                        value={getOption(
                          resetOptions,
                          row.lkpResetNo
                        )}
                        onChange={(
                          option: SingleValue<SelectOption>
                        ) =>
                          handleRowChange(
                            row.id,
                            "lkpResetNo",
                            option?.value ?? ""
                          )
                        }
                        styles={tableSelectStyles}
                        components={{
                          DropdownIndicator:
                            CustomDropdownIndicator,
                        }}
                        isSearchable={false}
                        menuPortalTarget={
                          document.body
                        }
                        menuPosition="fixed"
                      />

                    </td>

                    {/* =================================================
                        PRINT AFTER SAVE
                    ================================================= */}

                    <td
                      className="
                        border-r
                        border-t
                        border-slate-200
                        text-center
                      "
                    >

                      <input
                        id={`chkPrintAfterSave_${row.id}`}
                        name="chkPrintAfterSave"
                        type="checkbox"
                        checked={
                          row.chkPrintAfterSave
                        }
                        onChange={(e) =>
                          handleRowChange(
                            row.id,
                            "chkPrintAfterSave",
                            e.target.checked
                          )
                        }
                        className="
                          h-[16px]
                          w-[16px]
                          cursor-pointer
                          accent-blue-600
                        "
                      />

                    </td>

                    {/* =================================================
                        POSITION NO
                    ================================================= */}

                    <td
                      className="
                        border-t
                        border-slate-200
                        px-1
                        text-center
                      "
                    >

                      <input
                        id={`txtPositionNo_${row.id}`}
                        name="txtPositionNo"
                        type="number"
                        value={row.txtPositionNo}
                        onChange={(e) =>
                          handleRowChange(
                            row.id,
                            "txtPositionNo",
                            Number(
                              e.target.value
                            )
                          )
                        }
                        className="
                          w-full
                          bg-transparent
                          text-right
                          text-[13px]
                          text-slate-600
                          outline-none
                        "
                      />

                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>

        </div>

        {/* =====================================================
            BUTTONS
        ====================================================== */}

        <div
          className="
            flex
            flex-col
            items-center
            justify-center
            gap-3
            px-3
            pb-3
            pt-8

            sm:flex-row
            sm:gap-4
            sm:px-5

            lg:px-10
            lg:pt-12
          "
        >

          {/* =================================================
              SAVE
          ================================================== */}

          <button
            id="Save"
            name="Save"
            type="button"
            onClick={handleSave}
            className="
              h-[47px]
              w-[125px]
              rounded
              border
              border-slate-400
              bg-gradient-to-b
              from-white
              to-slate-100
              text-[18px]
              text-green-600
              shadow-sm
              hover:bg-slate-50
            "
          >
            Save
          </button>

          {/* =================================================
              CLEAR
          ================================================== */}

          <button
            id="Clear"
            name="Clear"
            type="button"
            onClick={handleClear}
            className="
              h-[47px]
              w-[125px]
              rounded
              border
              border-slate-400
              bg-gradient-to-b
              from-white
              to-slate-100
              text-[18px]
              text-green-600
              shadow-sm
              hover:bg-slate-50
            "
          >
            Clear
          </button>

          {/* =================================================
              COPY TO NEXT YEAR
          ================================================== */}

          <button
            id="CopyToNextYearbtn"
            name="CopyToNextYearbtn"
            type="button"
            onClick={() =>
              setCopyToNextYearbtn(
                !CopyToNextYearbtn
              )
            }
            className="
              h-[47px]
              w-[225px]
              rounded
              border
              border-slate-400
              bg-gradient-to-b
              from-white
              to-slate-100
              text-[18px]
              text-green-600
              shadow-sm
              hover:bg-slate-50
            "
          >
            Copy To Next Year
          </button>

        </div>

      </div>

    </div>
  );
};

export default SetDocumentNo;