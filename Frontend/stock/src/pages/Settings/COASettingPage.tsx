import React, { useMemo, useState } from "react";
import Select, {
  components,
  type MenuListProps,
  type StylesConfig,
} from "react-select";

// ============================================================
// TYPES
// ============================================================

interface AccountSetting {
  id: number;
  parameter: string;
  accountId: string;
  accountName: string;
  groupHead: string;
}

interface DropdownOption {
  value: string;
  label: string;
  secondary?: string;
}

interface ParameterOption {
  parameter: string;
  type: string;
}

interface AccountOption {
  accountId: string;
  accountName: string;
}

// ============================================================
// INITIAL DATA
// ============================================================

const initialData: AccountSetting[] = [
  {
    id: 1,
    parameter: "CASH",
    accountId: "110100",
    accountName: "CASH",
    groupHead: "G",
  },
  {
    id: 2,
    parameter: "BANK",
    accountId: "110200",
    accountName: "BANK",
    groupHead: "G",
  },
  {
    id: 3,
    parameter: "Cash Sales",
    accountId: "110400",
    accountName: "ACE TRAVEL GROUP",
    groupHead: "G",
  },
  {
    id: 4,
    parameter: "Receivable 1",
    accountId: "110301",
    accountName: "CLIENTS RECEIVABLES",
    groupHead: "G",
  },
  {
    id: 5,
    parameter: "Payable (Airline)",
    accountId: "220100",
    accountName: "PROVISIONS",
    groupHead: "G",
  },
  {
    id: 6,
    parameter: "Payable (Tour)",
    accountId: "220200",
    accountName: "EOSB - PROVISIONS",
    groupHead: "G",
  },
  {
    id: 7,
    parameter: "Profit & Loss",
    accountId: "230106",
    accountName: "CURRENT YEAR EARNINGS",
    groupHead: "G",
  },
];

// ============================================================
// PARAMETER OPTIONS
// ============================================================

const parameterOptions: ParameterOption[] = [
  { parameter: "CASH", type: "G" },
  { parameter: "BANK", type: "G" },
  { parameter: "Cash Sales", type: "G" },
  { parameter: "Receivable 1", type: "G" },
  { parameter: "Payable (Airline)", type: "G" },
  { parameter: "Payable (Tour)", type: "G" },
  { parameter: "Profit & Loss", type: "G" },
];

// ============================================================
// ACCOUNT OPTIONS
// Replace this array with your API response when required.
// ============================================================

const accountOptions: AccountOption[] = [
  { accountId: "110100", accountName: "CASH" },
  { accountId: "110200", accountName: "BANK" },
  { accountId: "110400", accountName: "ACE TRAVEL GROUP" },
  { accountId: "110301", accountName: "CLIENTS RECEIVABLES" },
  { accountId: "120201", accountName: "ADVANCE FROM CUSTOMERS" },
  { accountId: "220100", accountName: "PROVISIONS" },
  { accountId: "220200", accountName: "EOSB - PROVISIONS" },
  { accountId: "230106", accountName: "CURRENT YEAR EARNINGS" },
];

// ============================================================
// EMPTY ROW
// ============================================================

const blankRow = (id: number): AccountSetting => ({
  id,
  parameter: "",
  accountId: "",
  accountName: "",
  groupHead: "",
});

// ============================================================
// CUSTOM DROPDOWN HEADER
// secondHeader = null renders a single-column header.
// ============================================================

const createMenuList = (
  firstHeader: string,
  secondHeader: string | null,
  gridColumns: string
) => {
  const CustomMenuList = (
    props: MenuListProps<DropdownOption, false>
  ) => (
    <components.MenuList {...props}>
      <div
        className="
          sticky top-0 z-[2]
          grid h-[27px]
          border-b border-slate-300
          bg-[#eeeeee]
          text-[12px] font-medium text-slate-800
        "
        style={{ gridTemplateColumns: gridColumns }}
      >
        <div
          className={`flex min-w-0 items-center px-[7px] ${
            secondHeader ? "border-r border-slate-300" : ""
          }`}
        >
          {firstHeader}
        </div>

        {secondHeader && (
          <div className="flex min-w-0 items-center px-[7px]">
            {secondHeader}
          </div>
        )}
      </div>

      {props.children}
    </components.MenuList>
  );

  CustomMenuList.displayName = `MenuList-${firstHeader}`;

  return CustomMenuList;
};

const ParameterMenuList = createMenuList(
  "Parameter Name",
  "Type",
  "266px minmax(120px, 1fr)"
);

const AccountIdMenuList = createMenuList(
  "Account ID",
  "Account Name",
  "120px minmax(200px, 1fr)"
);

// Account Name dropdown: name + Account ID shown as a label column
const AccountNameMenuList = createMenuList(
  "Account Name",
  "Account ID",
  "minmax(0, 1fr) 120px"
);

// ============================================================
// REUSABLE REACT SELECT STYLES
// ============================================================

const createSelectStyles = (
  menuWidth: number,
  gridColumns: string
): StylesConfig<DropdownOption, false> => ({
  container: (base) => ({
    ...base,
    width: "100%",
    height: "100%",
    minWidth: 0,
  }),

  control: (base, state) => ({
    ...base,
    minHeight: "30px",
    height: "30px",
    width: "100%",
    border: "none",
    borderRadius: 0,
    boxShadow: "none",
    backgroundColor: "transparent",
    cursor: "text",

    "&:hover": {
      border: "none",
    },

    ...(state.isFocused
      ? { backgroundColor: "transparent" }
      : {}),
  }),

  valueContainer: (base) => ({
    ...base,
    height: "30px",
    minWidth: 0,
    padding: "0 7px",
    overflow: "hidden",
  }),

  input: (base) => ({
    ...base,
    margin: 0,
    padding: 0,
    color: "#334155",
    fontSize: "11px",
  }),

  singleValue: (base) => ({
    ...base,
    margin: 0,
    color: "#334155",
    fontSize: "11px",
    lineHeight: "30px",
  }),

  placeholder: (base) => ({
    ...base,
    margin: 0,
    color: "#94a3b8",
    fontSize: "11px",
  }),

  indicatorsContainer: (base) => ({
    ...base,
    width: "17px",
    height: "30px",
    flexShrink: 0,
  }),

  dropdownIndicator: (base) => ({
    ...base,
    width: "17px",
    height: "30px",
    padding: 0,
    color: "#64748b",

    "&:hover": {
      color: "#334155",
    },
  }),

  indicatorSeparator: () => ({
    display: "none",
  }),

  clearIndicator: (base) => ({
    ...base,
    display: "none",
  }),

  menuPortal: (base) => ({
    ...base,
    zIndex: 99999,
  }),

  menu: (base) => ({
    ...base,
    width: `${menuWidth}px`,
    minWidth: `${menuWidth}px`,
    marginTop: 0,
    border: "1px solid #94a3b8",
    borderRadius: 0,
    boxShadow: "0 5px 12px rgba(0,0,0,0.18)",
    overflow: "hidden",
  }),

  menuList: (base) => ({
    ...base,
    maxHeight: "300px",
    padding: 0,
    overflowX: "hidden",
    overflowY: "auto",
  }),

  option: (base, state) => ({
    ...base,
    display: "grid",
    gridTemplateColumns: gridColumns,
    alignItems: "center",
    minHeight: "27px",
    height: "27px",
    padding: 0,
    backgroundColor: state.isFocused
      ? "#eef9f3"
      : "#ffffff",
    color: "#334155",
    fontSize: "12px",
    cursor: "pointer",

    "&:active": {
      backgroundColor: "#e0f2e9",
    },
  }),
});

// ============================================================
// MAIN COMPONENT
// ============================================================

const COASettings: React.FC = () => {
  const [rows, setRows] = useState<AccountSetting[]>(
    initialData.map((row) => ({ ...row }))
  );

  // ==========================================================
  // OPTIONS FOR REACT SELECT
  // ==========================================================

  const parameterDropdownOptions = useMemo<DropdownOption[]>(
    () =>
      parameterOptions.map((option) => ({
        value: option.parameter,
        label: option.parameter,
        secondary: option.type,
      })),
    []
  );

  const accountIdDropdownOptions = useMemo<DropdownOption[]>(
    () =>
      accountOptions.map((option) => ({
        value: option.accountId,
        label: option.accountId,
        secondary: option.accountName,
      })),
    []
  );

  // secondary keeps the Account ID so selecting a name still
  // fills the Account ID cell, even though it is not displayed.
  const accountNameDropdownOptions = useMemo<DropdownOption[]>(
    () =>
      accountOptions.map((option) => ({
        value: option.accountName,
        label: option.accountName,
        secondary: option.accountId,
      })),
    []
  );

  // ==========================================================
  // SELECT STYLES
  // ==========================================================

  const parameterStyles = useMemo(
     () => createSelectStyles(350, "minmax(-400px, 1fr) 120px"),
    []
  );

  const accountIdStyles = useMemo(
    () =>
      createSelectStyles(
        650,
        "0px minmax(0px, 1fr)"
      ),
    []
  );

  const accountNameStyles = useMemo(
    () => createSelectStyles(650, "minmax(-400px, 1fr) 120px"),
    []
  );

  // ==========================================================
  // UPDATE ONE CELL
  // ==========================================================

  const updateCell = (
    rowIndex: number,
    field: keyof AccountSetting,
    value: string
  ) => {
    setRows((previous) => {
      const next = [...previous];

      while (next.length <= rowIndex) {
        next.push(blankRow(next.length + 1));
      }

      next[rowIndex] = {
        ...next[rowIndex],
        id: rowIndex + 1,
        [field]: value,
      };

      return next;
    });
  };

  // ==========================================================
  // PARAMETER SELECTION
  // ==========================================================

  const handleSelectParameter = (
    rowIndex: number,
    option: DropdownOption | null
  ) => {
    updateCell(
      rowIndex,
      "parameter",
      option?.value ?? ""
    );

    if (option) {
      updateCell(
        rowIndex,
        "groupHead",
        option.secondary ?? ""
      );
    }
  };

  // ==========================================================
  // ACCOUNT ID SELECTION
  // Selecting an account synchronizes its corresponding name.
  // ==========================================================

  const handleSelectAccountId = (
    rowIndex: number,
    option: DropdownOption | null
  ) => {
    updateCell(
      rowIndex,
      "accountId",
      option?.value ?? ""
    );

    if (option) {
      updateCell(
        rowIndex,
        "accountName",
        option.secondary ?? ""
      );
    } else {
      updateCell(rowIndex, "accountName", "");
    }
  };

  // ==========================================================
  // ACCOUNT NAME SELECTION
  // Selecting a name synchronizes its corresponding ID.
  // ==========================================================

  const handleSelectAccountName = (
    rowIndex: number,
    option: DropdownOption | null
  ) => {
    updateCell(
      rowIndex,
      "accountName",
      option?.value ?? ""
    );

    if (option) {
      updateCell(
        rowIndex,
        "accountId",
        option.secondary ?? ""
      );
    } else {
      updateCell(rowIndex, "accountId", "");
    }
  };

  // ==========================================================
  // SAVE
  // Replace console.log with your save API when ready.
  // ==========================================================

  const handleSave = () => {
    const populatedRows = rows.filter(
      (row) =>
        row.parameter.trim() ||
        row.accountId.trim() ||
        row.accountName.trim() ||
        row.groupHead.trim()
    );

    console.log("COA Settings:", populatedRows);
    alert("COA Settings saved locally.");
  };

  // ==========================================================
  // CLEAR
  // ==========================================================

  const handleClear = () => {
    setRows(initialData.map((row) => ({ ...row })));
  };

  // ==========================================================
  // DISPLAY ROWS
  // Three blank rows are available for new entries.
  // No additional entry row is created below the table.
  // ==========================================================

  const displayRows = Array.from(
    {
      length: Math.max(10, rows.length + 3),
    },
    (_, index) => rows[index] ?? blankRow(index + 1)
  );

  // ==========================================================
  // TABLE LAYOUT
  // ==========================================================

  const columns =
    "18px 34px 266px 120px minmax(180px, 1fr) 58px";

  const headerCellClass =
    "flex h-[30px] min-w-0 items-center border-r border-[#c8eadb] px-[7px] text-[12px] font-medium text-slate-600";

  const cellClass =
    "relative h-[30px] min-w-0 border-r border-[#c8eadb] p-0";

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-white p-0 font-sans text-slate-700">
      <div className="w-[1100px] max-w-full border border-slate-400 bg-white">
        {/* TITLE BAR */}

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
Chart Of Account Settings
          </span>

        </div>

        {/* TABLE */}
        {/* Do not add overflow-hidden here: dropdowns must remain visible. */}

        <div className="mx-[25px] mt-0 mb-0 overflow-visible border border-[#b9e8d2]">
          <div className="w-full">
            {/* TABLE HEADINGS */}

            <div
              className="grid border-b border-[#b9e8d2] bg-[#eef9f3]"
              style={{ gridTemplateColumns: columns }}
            >
              <div className="h-[30px] border-r border-[#c8eadb]" />

              <div className={`${headerCellClass} justify-center`}>
                Sl.
              </div>

              <div className={headerCellClass}>
                Parameter
              </div>

              <div className={headerCellClass}>
                Account ID
              </div>

              <div className={headerCellClass}>
                Account Name
              </div>

              <div className="flex h-[30px] min-w-0 items-center px-[5px] text-[12px] font-medium text-slate-600">
                G/P/H
              </div>
            </div>

            {/* TABLE ROWS */}

            {displayRows.map((row, index) => {
              const parameterValue =
                parameterDropdownOptions.find(
                  (option) => option.value === row.parameter
                ) ??
                (row.parameter
                  ? {
                      value: row.parameter,
                      label: row.parameter,
                    }
                  : null);

              const accountIdValue =
                accountIdDropdownOptions.find(
                  (option) => option.value === row.accountId
                ) ??
                (row.accountId
                  ? {
                      value: row.accountId,
                      label: row.accountId,
                      secondary: row.accountName,
                    }
                  : null);

              const accountNameValue =
                accountNameDropdownOptions.find(
                  (option) => option.value === row.accountName
                ) ??
                (row.accountName
                  ? {
                      value: row.accountName,
                      label: row.accountName,
                      secondary: row.accountId,
                    }
                  : null);

              return (
                <div
                  key={`coa-row-${index}`}
                  className="grid border-b border-[#b9e8d2] bg-white text-[11px]"
                  style={{ gridTemplateColumns: columns }}
                >
                  {/* ROW SELECTOR */}

                  <div className="h-[30px] border-r border-[#c8eadb]" />

                  {/* SERIAL NUMBER */}

                  <div className="flex h-[30px] items-center justify-center border-r border-[#c8eadb]">
                    {row.id ? row.id : ""}
                  </div>

                  {/* PARAMETER SELECT */}

                  <div className={cellClass}>
                    <Select<DropdownOption, false>
                      inputId={`lkpParameter-${index}`}
                      aria-label={`Parameter row ${index + 1}`}
                      options={parameterDropdownOptions}
                      value={parameterValue}
                      onChange={(option) =>
                        handleSelectParameter(index, option)
                      }
                      components={{
                        MenuList: ParameterMenuList,
                      }}
                      formatOptionLabel={(option, { context }) =>
                        context === "value" ? (
                          option.label
                        ) : (
                          <div
                            className="grid h-[27px] w-full items-center"
                            style={{
                              gridTemplateColumns:
                                "266px minmax(120px, 1fr)",
                            }}
                          >
                            <span className="flex h-full min-w-0 items-center border-r border-slate-200 px-[7px]">
                              {option.label}
                            </span>

                            <span className="flex h-full min-w-0 items-center px-[7px]">
                              {option.secondary}
                            </span>
                          </div>
                        )
                      }
                      styles={parameterStyles}
                      menuPortalTarget={
                        typeof document !== "undefined"
                          ? document.body
                          : undefined
                      }
                      menuPosition="fixed"
                      menuPlacement="auto"
                      isClearable={false}
                      isSearchable
                      placeholder=""
                      noOptionsMessage={() => "No results found"}
                    />
                  </div>

                  {/* ACCOUNT ID SELECT */}

                  <div className={cellClass}>
                    <Select<DropdownOption, false>
                      inputId={`lkpGAccountID-${index}`}
                      aria-label={`Account ID row ${index + 1}`}
                      options={accountIdDropdownOptions}
                      value={accountIdValue}
                      onChange={(option) =>
                        handleSelectAccountId(index, option)
                      }
                      components={{
                        MenuList: AccountIdMenuList,
                      }}
                      formatOptionLabel={(option, { context }) =>
                        context === "value" ? (
                          option.label
                        ) : (
                          <div
                            className="grid h-[27px] w-full items-center"
                            style={{
                              gridTemplateColumns:
                                "120px minmax(200px, 1fr)",
                            }}
                          >
                            <span className="flex h-full min-w-0 items-center border-r border-slate-200 px-[7px]">
                              {option.label}
                            </span>

                            <span className="flex h-full min-w-0 items-center px-[7px]">
                              {option.secondary}
                            </span>
                          </div>
                        )
                      }
                      styles={accountIdStyles}
                      menuPortalTarget={
                        typeof document !== "undefined"
                          ? document.body
                          : undefined
                      }
                      menuPosition="fixed"
                      menuPlacement="auto"
                      isClearable={false}
                      isSearchable
                      placeholder=""
                      noOptionsMessage={() => "No results found"}
                    />
                  </div>

                  {/* ACCOUNT NAME SELECT */}

                  <div className={cellClass}>
                    <Select<DropdownOption, false>
                      inputId={`lkpGAccountName-${index}`}
                      aria-label={`Account Name row ${index + 1}`}
                      options={accountNameDropdownOptions}
                      value={accountNameValue}
                      onChange={(option) =>
                        handleSelectAccountName(index, option)
                      }
                      components={{
                        MenuList: AccountNameMenuList,
                      }}
                      formatOptionLabel={(option, { context }) =>
                        context === "value" ? (
                          option.label
                        ) : (
                          <div
                            className="grid h-[27px] w-full items-center"
                            style={{
                              gridTemplateColumns:
                                "minmax(0, 1fr) 120px",
                            }}
                          >
                            <span className="flex h-full min-w-0 items-center border-r border-slate-200 px-[7px]">
                              {option.label}
                            </span>

                            <span className="flex h-full min-w-0 items-center px-[7px]">
                              {option.secondary}
                            </span>
                          </div>
                        )
                      }
                      styles={accountNameStyles}
                      menuPortalTarget={
                        typeof document !== "undefined"
                          ? document.body
                          : undefined
                      }
                      menuPosition="fixed"
                      menuPlacement="auto"
                      isClearable={false}
                      isSearchable
                      placeholder=""
                      noOptionsMessage={() => "No results found"}
                    />
                  </div>

                  {/* GROUP / HEAD */}

                  <div className="h-[30px] min-w-0">
                    <input
                      id={`txtGPH-${index}`}
                      aria-label={`Group Head row ${index + 1}`}
                      value={row.groupHead}
                      onChange={(event) =>
                        updateCell(
                          index,
                          "groupHead",
                          event.target.value
                        )
                      }
                      className="
                        h-full w-full min-w-0
                        border-0 bg-transparent
                        px-[7px] text-[11px] text-slate-700
                        outline-none
                        focus:bg-transparent
                      "
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ACTION BUTTONS */}

        <div className="flex min-h-[74px] items-start justify-center gap-[12px] pt-[8px]">
          <button
            id="btnSave"
            type="button"
            onClick={handleSave}
            className="
              h-[40px] w-[107px]
              rounded-[4px] border border-[#9bb7cc]
              bg-gradient-to-b from-white to-[#e2ebf2]
              text-[14px] text-green-700 shadow-sm
              hover:from-[#f4fff7] hover:to-[#d4ebdc]
              focus:outline-none focus:ring-1 focus:ring-green-400
            "
          >
            <span className="underline underline-offset-[3px]">
              S
            </span>ave
          </button>

          <button
            id="btnClear"
            type="button"
            onClick={handleClear}
            className="
              h-[40px] w-[107px]
              rounded-[4px] border border-[#9bb7cc]
              bg-gradient-to-b from-white to-[#e2ebf2]
              text-[14px] text-green-700 shadow-sm
              hover:from-[#f4fff7] hover:to-[#d4ebdc]
              focus:outline-none focus:ring-1 focus:ring-green-400
            "
          >
            <span className="underline underline-offset-[3px]">
              C
            </span>lear
          </button>
        </div>
      </div>
    </div>
  );
};

export default COASettings;