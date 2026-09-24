import React, { useState } from "react";
import Select, {
  components,
  type SingleValue,
  type StylesConfig,
} from "react-select";

// ============================================================
// TYPES
// ============================================================

interface SelectOption {
  value: string;
  label: string;
}

interface DocumentRow {
  id: number;
  document: string;

  lkpMode: string;
  txtPrefix: string;
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
    height: "32px",
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
    height: "32px",
    padding: "0 8px",
  }),

  indicatorsContainer: (base) => ({
    ...base,
    height: "32px",
  }),

  dropdownIndicator: (base) => ({
    ...base,
    padding: "3px 5px",
  }),
};

// ============================================================
// OPTIONS
// ============================================================

const yearOptions: SelectOption[] = [
  { value: "2026", label: "2026" },
  { value: "2027", label: "2027" },
  { value: "2028", label: "2028" },
];

const branchOptions: SelectOption[] = [
  { value: "JD", label: "JD" },
  { value: "BR", label: "BR" },
];

const moduleOptions: SelectOption[] = [
  { value: "Purchase", label: "Purchase" },
  { value: "Sales", label: "Sales" },
  { value: "Stock", label: "Stock" },
];

const modeOptions: SelectOption[] = [
  { value: "Auto", label: "Auto" },
  { value: "Manual", label: "Manual" },
];

const resetOptions: SelectOption[] = [
  { value: "Never", label: "Never" },
  { value: "Yearly", label: "Yearly" },
  { value: "Monthly", label: "Monthly" },
];

const documentOptions: SelectOption[] = [
  { value: "Purchase Order", label: "Purchase Order" },
  { value: "Purchase Invoice", label: "Purchase Invoice" },
  { value: "Purchase Return", label: "Purchase Return" },
  { value: "Quotation", label: "Quotation" },
  { value: "Sales Invoice (Cash)", label: "Sales Invoice (Cash)" },
  { value: "Sales Invoice (Credit)", label: "Sales Invoice (Credit)" },
  { value: "Sales Return (Cash)", label: "Sales Return (Cash)" },
  { value: "Sales Return (Credit)", label: "Sales Return (Credit)" },
  { value: "Stock Transfer", label: "Stock Transfer" },
  { value: "Damage", label: "Damage" },
  { value: "Stock Adjustment", label: "Stock Adjustment" },
  { value: "Item Conversion", label: "Item Conversion" },
  { value: "Delivery Note", label: "Delivery Note" },
  { value: "Delivery Note Return", label: "Delivery Note Return" },
];

// ============================================================
// CUSTOM DROPDOWN INDICATOR
// ============================================================

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

  const [lkpYear, setLkpYear] = useState<string>("2026");

  const [lkpBranch, setLkpBranch] = useState<string>("");

  const [lkpModule, setLkpModule] = useState<string>("");

  // ==========================================================
  // TABLE STATES
  // ==========================================================

  const [rows, setRows] = useState<DocumentRow[]>([
    {
      id: 1,
      document: "Purchase Order",
      lkpMode: "Auto",
      txtPrefix: "JD-26",
      txtStartSeqNo: "O",
      chkStrictSerial: true,
      lkpResetNo: "Never",
      chkPrintAfterSave: false,
      txtPositionNo: 1,
    },
    {
      id: 2,
      document: "Purchase Invoice",
      lkpMode: "Auto",
      txtPrefix: "JD-26",
      txtStartSeqNo: "O",
      chkStrictSerial: true,
      lkpResetNo: "Never",
      chkPrintAfterSave: false,
      txtPositionNo: 2,
    },
    {
      id: 3,
      document: "Purchase Return",
      lkpMode: "Auto",
      txtPrefix: "JD-26",
      txtStartSeqNo: "O",
      chkStrictSerial: true,
      lkpResetNo: "Never",
      chkPrintAfterSave: false,
      txtPositionNo: 3,
    },
    {
      id: 4,
      document: "Quotation",
      lkpMode: "Auto",
      txtPrefix: "JD-26",
      txtStartSeqNo: "O",
      chkStrictSerial: true,
      lkpResetNo: "Never",
      chkPrintAfterSave: false,
      txtPositionNo: 4,
    },
    {
      id: 5,
      document: "Sales Invoice (Cash)",
      lkpMode: "Auto",
      txtPrefix: "JD-26",
      txtStartSeqNo: "OC",
      chkStrictSerial: true,
      lkpResetNo: "Never",
      chkPrintAfterSave: false,
      txtPositionNo: 5,
    },
    {
      id: 6,
      document: "Sales Invoice (Credit)",
      lkpMode: "Auto",
      txtPrefix: "JD-26",
      txtStartSeqNo: "OR",
      chkStrictSerial: true,
      lkpResetNo: "Never",
      chkPrintAfterSave: false,
      txtPositionNo: 6,
    },
    {
      id: 7,
      document: "Sales Return (Cash)",
      lkpMode: "Auto",
      txtPrefix: "JD-26",
      txtStartSeqNo: "OH",
      chkStrictSerial: true,
      lkpResetNo: "Never",
      chkPrintAfterSave: false,
      txtPositionNo: 7,
    },
    {
      id: 8,
      document: "Sales Return (Credit)",
      lkpMode: "Auto",
      txtPrefix: "JD-26",
      txtStartSeqNo: "OD",
      chkStrictSerial: true,
      lkpResetNo: "Never",
      chkPrintAfterSave: false,
      txtPositionNo: 8,
    },
    {
      id: 9,
      document: "Stock Transfer",
      lkpMode: "Auto",
      txtPrefix: "JD-26",
      txtStartSeqNo: "O",
      chkStrictSerial: true,
      lkpResetNo: "Never",
      chkPrintAfterSave: false,
      txtPositionNo: 9,
    },
    {
      id: 10,
      document: "Damage",
      lkpMode: "Auto",
      txtPrefix: "JD-26",
      txtStartSeqNo: "O",
      chkStrictSerial: true,
      lkpResetNo: "Never",
      chkPrintAfterSave: false,
      txtPositionNo: 10,
    },
    {
      id: 11,
      document: "Stock Adjustment",
      lkpMode: "Auto",
      txtPrefix: "JD-26",
      txtStartSeqNo: "O",
      chkStrictSerial: true,
      lkpResetNo: "Never",
      chkPrintAfterSave: false,
      txtPositionNo: 11,
    },
    {
      id: 12,
      document: "Item Conversion",
      lkpMode: "Auto",
      txtPrefix: "JD-26",
      txtStartSeqNo: "O",
      chkStrictSerial: true,
      lkpResetNo: "Never",
      chkPrintAfterSave: false,
      txtPositionNo: 12,
    },
    {
      id: 13,
      document: "Delivery Note",
      lkpMode: "Auto",
      txtPrefix: "JD-26",
      txtStartSeqNo: "O",
      chkStrictSerial: true,
      lkpResetNo: "Never",
      chkPrintAfterSave: false,
      txtPositionNo: 13,
    },
    {
      id: 14,
      document: "Delivery Note Return",
      lkpMode: "Auto",
      txtPrefix: "JD-26",
      txtStartSeqNo: "OR",
      chkStrictSerial: true,
      lkpResetNo: "Never",
      chkPrintAfterSave: false,
      txtPositionNo: 14,
    },
  ]);

  // ==========================================================
  // BUTTON STATE
  // ==========================================================

  const [CopyToNextYearbtn, setCopyToNextYearbtn] =
    useState<boolean>(false);

  // ==========================================================
  // UPDATE ROW
  // ==========================================================

  const handleRowChange = <K extends keyof DocumentRow>(
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

  const handleSave = () => {
    const data = {
      lkpYear,
      lkpBranch,
      lkpModule,
      rows,
      CopyToNextYearbtn,
    };

    console.log("SAVE DATA:", data);
  };

  // ==========================================================
  // CLEAR
  // ==========================================================

  const handleClear = () => {
    setLkpYear("2026");
    setLkpBranch("");
    setLkpModule("");

    setRows((previousRows) =>
      previousRows.map((row) => ({
        ...row,
        lkpMode: "Auto",
        chkStrictSerial: true,
        lkpResetNo: "Never",
        chkPrintAfterSave: false,
      }))
    );

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
    <div className="min-h-screen bg-white p-1 text-[13px] text-slate-700  flex
        flex-col
        justify-center
        items-center">

      {/* =====================================================
          MAIN CONTAINER
          80% WIDTH + CENTERED
      ====================================================== */}

      <div className="mx-auto w-[80%] border border-slate-300 bg-white shadow-sm">

        {/* =====================================================
            TITLE
        ====================================================== */}

        <div className="flex h-[30px] items-center border-b border-slate-300 bg-[#a3dfc0]">
          <h1 className="text-[17px] font-semibold text-slate-700 ml-1.25">
            Set Document No.
          </h1>
        </div>

        {/* =====================================================
            HEADER
        ====================================================== */}

        <div className="grid grid-cols-[220px_1fr_1fr] items-center gap-4 border-b border-slate-200 px-10 py-3">

          {/* YEAR */}

          <div className="flex items-center gap-2">

            <label
              htmlFor="lkpYear"
              className="w-[40px] text-right font-semibold"
            >
              Year :
            </label>

            <div className="w-[108px]">

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

          {/* BRANCH */}

          <div className="flex items-center justify-center gap-2">

            <label
              htmlFor="lkpBranch"
              className="font-semibold"
            >
              Branch :
            </label>

            <div className="w-[312px]">

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
                placeholder=""
                menuPlacement="auto"
              />

            </div>

          </div>

          {/* MODULE */}

          <div className="flex items-center justify-center gap-2">

            <label
              htmlFor="lkpModule"
              className="font-semibold"
            >
              Module :
            </label>

            <div className="w-[240px]">

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
                placeholder=""
                menuPlacement="auto"
              />

            </div>

          </div>

        </div>

        {/* =====================================================
            TABLE
        ====================================================== */}

        <div className="px-10">

          <div className="overflow-visible border-l border-r border-b border-slate-200">

            <table className="w-full table-fixed border-collapse">

              <thead>

                <tr className="h-9 bg-slate-50 text-left text-[13px] font-bold text-slate-600">

                  {/* ARROW */}

                  <th className="w-[25px] border-r border-slate-200"></th>

                  {/* DOCUMENT */}

                  <th className="w-[255px] border-r border-slate-200 px-4">
                    Document
                  </th>

                  {/* PREFIX */}

                  <th className="w-[105px] border-r border-slate-200 px-4">
                    Prefix
                  </th>

                  {/* START SEQ */}

                  <th className="w-[115px] border-r border-slate-200 px-4">
                    Start Seq. No.
                  </th>

                  {/* STRICT SERIAL */}

                  <th className="w-[115px] border-r border-slate-200 px-4 text-center">
                    Strict Serial
                  </th>

                  {/* + MODE */}

                  <th className="w-[100px] border-r border-slate-200 px-4">
                    + Mode
                  </th>

                  {/* RESET */}

                  <th className="w-[115px] border-r border-slate-200 px-4">
                    Reset No.
                  </th>

                  {/* PRINT */}

                  <th className="w-[140px] border-r border-slate-200 px-4 text-center">
                    Print After Save
                  </th>

                  {/* POSITION */}

                  <th className="w-[110px] px-4 text-center">
                    Position No.
                  </th>

                </tr>

              </thead>

              <tbody>

                {rows.map((row, index) => (

                  <tr
                    key={row.id}
                    className={`h-[34px] ${
                      index === 0
                        ? "bg-[#edf4fc]"
                        : "bg-white"
                    } hover:bg-slate-50`}
                  >

                    {/* =================================================
                        ARROW
                    ================================================== */}

                    <td className="border-r border-t border-slate-200 text-center">
                    </td>

                    {/* =================================================
                        DOCUMENT
                    ================================================== */}

                    <td className="border-r border-t border-slate-200 p-0">

                      <Select
                        inputId={`lkpDocument_${row.id}`}
                        instanceId={`lkpDocument_${row.id}`}
                        name="lkpDocument"
                        options={documentOptions}
                        value={getOption(
                          documentOptions,
                          row.document
                        )}
                        onChange={(
                          option: SingleValue<SelectOption>
                        ) =>
                          handleRowChange(
                            row.id,
                            "document",
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
                    ================================================== */}

                    <td className="border-r border-t border-slate-200 px-3">

                      <input
                        id={`txtPrefix_${row.id}`}
                        name="txtPrefix"
                        type="text"
                        value={row.txtPrefix}
                        onChange={(e) =>
                          handleRowChange(
                            row.id,
                            "txtPrefix",
                            e.target.value
                          )
                        }
                        className="w-full bg-transparent text-[13px] text-slate-600 outline-none"
                      />

                    </td>

                    {/* =================================================
                        START SEQ NO
                    ================================================== */}

                    <td className="border-r border-t border-slate-200 px-3">

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
                        className="w-full bg-transparent text-[13px] text-slate-600 outline-none"
                      />

                    </td>

                    {/* =================================================
                        STRICT SERIAL
                    ================================================== */}

                    <td className="border-r border-t border-slate-200 text-center">

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
                        className="h-[16px] w-[16px] cursor-pointer accent-blue-600"
                      />

                    </td>

                    {/* =================================================
                        + MODE
                    ================================================== */}

                    <td className="border-r border-t border-slate-200 p-0">

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
                    ================================================== */}

                    <td className="border-r border-t border-slate-200 p-0">

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
                    ================================================== */}

                    <td className="border-r border-t border-slate-200 text-center">

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
                        className="h-[16px] w-[16px] cursor-pointer accent-blue-600"
                      />

                    </td>

                    {/* =================================================
                        POSITION NO
                    ================================================== */}

                    <td className="border-t border-slate-200 px-3 text-center">

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
                        className="w-full bg-transparent text-center text-[13px] text-slate-600 outline-none"
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

        <div className="relative flex items-center justify-center gap-4 px-10 pb-1 pt-12">

          {/* SAVE */}

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

          {/* CLEAR */}

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

          {/* COPY TO NEXT YEAR */}

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
              absolute
              right-10
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