import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { X } from "lucide-react";
import { useConfirm } from "../../hooks/useConfirm";
import { useAltShortcuts } from "../../hooks/useAltShortcuts";
import { useEnterAsTab } from "../../hooks/useEnterAsTab";
import { useButtonPermissions } from "../../hooks/useButtonPermissions";
import Select, {
  components,
  type MenuListProps,
  type StylesConfig,
} from "react-select";

// ============================================================
// TYPES
// ============================================================

// one grid row. The account NAME is not stored - both the ID and the
// Name cells are looked up from lkpAccountID (names can repeat).
interface AccountSetting {
  txtSlNo: number;
  lkpParameterType: string;
  lkpAccountID: string;
  txtGPH: string;
  // the type + slno this row had when it was LOADED (null for a new
  // row) - the backend uses them to know which saved row to update
  txtOriginalSlNo: number | null;
  lkpOriginalParameterType: string | null;
}

interface DropdownOption {
  value: string;
  label: string;
  secondary?: string;
  gph?: string;
}

// one row of GET /SetChartOfAccount/getParameterList
interface ParameterOption {
  lkpParameterName: string;
  lkpParameterType: string;
}

// one row of GET /SetChartOfAccount/getAccountList
interface AccountOption {
  lkpAccountID: string;
  lkpAccountName: string;
  lkpGPH: string;
}

// ============================================================
// EMPTY ROW
// ============================================================

const blankRow = (txtSlNo: number): AccountSetting => ({
  txtSlNo,
  lkpParameterType: "",
  lkpAccountID: "",
  txtGPH: "",
  txtOriginalSlNo: null,
  lkpOriginalParameterType: null,
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
    // centre the arrow in the 30px row (same line as the text and the X)
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
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

  // no fixed maxHeight here (react-select uses its own, up to 300px).
  // Together with minMenuHeight on each Select, the list opens BELOW the
  // row only when the whole list fits there; otherwise it opens ABOVE with
  // the whole list - it is never squeezed into a short scrolling list.
  menuList: (base) => ({
    ...base,
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

// tblmenu: 9110 = mnuSetChartOfAccount ("Set Chart Of Account")
const MENU_ID = "9110";

const SetChartOfAccount: React.FC = () => {
  const [rows, setRows] = useState<AccountSetting[]>([]);

  // bumped by Clear (and after a save) so the saved rows are loaded again
  const [reloadKey, setReloadKey] = useState<number>(0);

  const perms = useButtonPermissions(MENU_ID);
  const { confirm, confirmDialog } = useConfirm();
  const handleEnterAsTab = useEnterAsTab();
  const [saving, setSaving] = useState<boolean>(false);

  const [parameterList, setParameterList] = useState<ParameterOption[]>([]);
  const [accountList, setAccountList] = useState<AccountOption[]>([]);

  // ==========================================================
  // LOAD SAVED ROWS (the grid) - tblfinsetting rows of the
  // logged-in company, via dbo.sp_pagesetchartofaccount mode 'G'.
  // Runs when the page opens and again after Clear.
  // ==========================================================

  useEffect(() => {
    const loadChartOfAccount = async () => {
      try {
        const PstrCoID = localStorage.getItem("PstrCoID");

        if (!PstrCoID) {
          toast.error("getChartOfAccount: no PstrCoID in localStorage");
          return;
        }

        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/SetChartOfAccount/getChartOfAccount?PstrCoID=${PstrCoID}`
        );

        if (!response.ok) {
          throw new Error(`HTTP Error: ${response.status}`);
        }

        const result = await response.json();

        if (!result.success) {
          toast.error(result.message || "Failed to load chart of account setting");
          return;
        }

        setRows(
          (result.data || []).map(
            (row: {
              txtSlNo: number;
              lkpParameterType: string;
              lkpAccountID: string | null;
              txtGPH: string | null;
            }) => ({
              txtSlNo: row.txtSlNo,
              lkpParameterType: row.lkpParameterType,
              lkpAccountID: row.lkpAccountID ?? "",
              txtGPH: row.txtGPH ?? "",
              txtOriginalSlNo: row.txtSlNo,
              lkpOriginalParameterType: row.lkpParameterType,
            })
          )
        );
      } catch (error) {
        console.error("getChartOfAccount error:", error);
        toast.error("Failed to load chart of account setting");
      }
    };

    loadChartOfAccount();
  }, [reloadKey]);

  // ==========================================================
  // LOAD PARAMETER LIST (Parameter dropdown) - from
  // dbo.fillfinsetup for the logged-in company
  // ==========================================================

  useEffect(() => {
    const loadParameterList = async () => {
      try {
        const PstrCoID = localStorage.getItem("PstrCoID");

        if (!PstrCoID) {
          toast.error("getParameterList: no PstrCoID in localStorage");
          return;
        }

        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/SetChartOfAccount/getParameterList?PstrCoID=${PstrCoID}`
        );

        if (!response.ok) {
          throw new Error(`HTTP Error: ${response.status}`);
        }

        const result = await response.json();

        if (!result.success) {
          toast.error(result.message || "Failed to load parameter list");
          return;
        }

        setParameterList(result.data || []);
      } catch (error) {
        console.error("getParameterList error:", error);
        toast.error("Failed to load parameter list");
      }
    };

    loadParameterList();
  }, []);

  // ==========================================================
  // LOAD ACCOUNT LIST (Account ID + Account Name dropdowns) -
  // from dbo.fillfinaccount for the logged-in company
  // ==========================================================

  useEffect(() => {
    const loadAccountList = async () => {
      try {
        const PstrCoID = localStorage.getItem("PstrCoID");

        if (!PstrCoID) {
          toast.error("getAccountList: no PstrCoID in localStorage");
          return;
        }

        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/SetChartOfAccount/getAccountList?PstrCoID=${PstrCoID}`
        );

        if (!response.ok) {
          throw new Error(`HTTP Error: ${response.status}`);
        }

        const result = await response.json();

        if (!result.success) {
          toast.error(result.message || "Failed to load account list");
          return;
        }

        setAccountList(result.data || []);
      } catch (error) {
        console.error("getAccountList error:", error);
        toast.error("Failed to load account list");
      }
    };

    loadAccountList();
  }, []);

  // ==========================================================
  // OPTIONS FOR REACT SELECT
  // ==========================================================

  // value = lkpParameterType (the type that gets saved),
  // label = lkpParameterName (what the user sees),
  // secondary = the type, shown in the "Type" column of the menu
  const parameterDropdownOptions = useMemo<DropdownOption[]>(
    () =>
      parameterList.map((option) => ({
        value: option.lkpParameterType,
        label: option.lkpParameterName,
        secondary: option.lkpParameterType,
      })),
    [parameterList]
  );

  // height of the Parameter list when ALL of it is shown (the header and one
  // 27px row per parameter) - so it never needs a scroll bar, however many
  // parameters there are
  const parameterMenuHeight = (parameterList.length + 1) * 27 + 2;

  // Both account dropdowns save the account ID (value). They only
  // differ in what they show: the ID list shows the ID, the Name
  // list shows the name (sorted by name, like the old form).
  // gph = G / H / P of that account, copied into the G/P/H cell.
  const accountIdDropdownOptions = useMemo<DropdownOption[]>(
    () =>
      accountList.map((option) => ({
        value: option.lkpAccountID,
        label: option.lkpAccountID,
        secondary: option.lkpAccountName,
        gph: option.lkpGPH,
      })),
    [accountList]
  );

  // sorted by account name, like the old form's Account Name list
  const accountNameDropdownOptions = useMemo<DropdownOption[]>(
    () =>
      [...accountList]
        .sort((a, b) => a.lkpAccountName.localeCompare(b.lkpAccountName))
        .map((option) => ({
          value: option.lkpAccountID,
          label: option.lkpAccountName,
          secondary: option.lkpAccountID,
          gph: option.lkpGPH,
        })),
    [accountList]
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
        txtSlNo: rowIndex + 1,
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
      "lkpParameterType",
      option?.value ?? ""
    );
  };

  // ==========================================================
  // ACCOUNT SELECTION (used by BOTH the Account ID and the Account
  // Name dropdown - each option's value is the account ID, so the
  // other cell and the G/P/H cell follow automatically)
  // ==========================================================

  const handleSelectAccount = (
    rowIndex: number,
    option: DropdownOption | null
  ) => {
    updateCell(rowIndex, "lkpAccountID", option?.value ?? "");
    updateCell(rowIndex, "txtGPH", option?.gph ?? "");
  };

  // ==========================================================
  // DELETE ROW (the X button)
  // A row that was never saved just leaves the grid. A saved row asks
  // "Are you sure..." and is then deleted from the database right away
  // (mode D1) - same as Set Document No. The other rows keep any
  // unsaved edits.
  // ==========================================================

  const handleDeleteRow = async (row: AccountSetting) => {
    if (row.txtOriginalSlNo === null || row.lkpOriginalParameterType === null) {
      setRows((previous) => previous.filter((item) => item !== row));
      return;
    }

    const shouldDelete = await confirm(
      "Are you sure you want to delete this account setting?"
    );

    if (!shouldDelete) {
      return;
    }

    const PstrCoID = localStorage.getItem("PstrCoID");
    const PstrYear = localStorage.getItem("PstrYear");
    const PstrUserID = localStorage.getItem("PstrUserID");

    if (!PstrCoID || !PstrYear || !PstrUserID) {
      toast.error("Company ID / Year / User ID not found. Please log in again.");
      return;
    }

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/SetChartOfAccount/deleteChartOfAccountRow`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            PstrCoID,
            PstrYear,
            PstrUserID,
            txtOriginalSlNo: row.txtOriginalSlNo,
            lkpOriginalParameterType: row.lkpOriginalParameterType,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        toast.error(result.message || "Could not delete the account setting. Please try again.");
        return;
      }

      toast.success(result.message || "Account setting deleted successfully.");

      setRows((previous) => previous.filter((item) => item !== row));
    } catch (error) {
      console.error("deleteChartOfAccountRow error:", error);
      toast.error("Cannot connect to Set Chart Of Account API.");
    }
  };

  // ==========================================================
  // SAVE
  // Sends the whole grid. The backend works out which rows are new,
  // changed or removed (compared with what is saved) and writes them
  // in one transaction.
  // ==========================================================

  const handleSave = async () => {
    if (saving) return;

    const PstrCoID = localStorage.getItem("PstrCoID");
    const PstrYear = localStorage.getItem("PstrYear");
    const PstrUserID = localStorage.getItem("PstrUserID");

    if (!PstrCoID || !PstrYear || !PstrUserID) {
      toast.error("Company ID / Year / User ID not found. Please log in again.");
      return;
    }

    // rows with something in them, in grid order (blank rows are skipped)
    const filledRows = rows
      .map((row, index) => ({ row, rowNo: index + 1 }))
      .filter(
        ({ row }) => row.lkpParameterType.trim() || row.lkpAccountID.trim()
      );

    const seen = new Set<string>();

    for (const { row, rowNo } of filledRows) {
      if (!row.lkpParameterType.trim() || !row.lkpAccountID.trim()) {
        toast.error(`Row ${rowNo}: select both a Parameter and an Account.`);
        return;
      }

      const pair = `${row.lkpParameterType}|${row.lkpAccountID}`.toUpperCase();

      if (seen.has(pair)) {
        toast.error(`Row ${rowNo}: Duplicate Entry !`);
        return;
      }

      seen.add(pair);
    }

    setSaving(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/SetChartOfAccount/saveChartOfAccount`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            PstrCoID,
            PstrYear,
            PstrUserID,
            rows: filledRows.map(({ row }, index) => ({
              txtSlNo: index + 1,
              lkpParameterType: row.lkpParameterType,
              lkpAccountID: row.lkpAccountID,
              txtGPH: row.txtGPH,
              txtOriginalSlNo: row.txtOriginalSlNo,
              lkpOriginalParameterType: row.lkpOriginalParameterType,
            })),
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        toast.error(result.message || "Chart of account setting could not be saved.");
        return;
      }

      toast.success(result.message || "Chart of account setting saved successfully.");

      // load the saved rows again - they now carry their new slno / keys
      setReloadKey((key) => key + 1);
    } catch (error) {
      console.error("saveChartOfAccount error:", error);
      toast.error("Cannot connect to Set Chart Of Account API.");
    } finally {
      setSaving(false);
    }
  };

  // ==========================================================
  // CLEAR
  // ==========================================================

  const handleClear = () => {
    setReloadKey((key) => key + 1);
  };

  // Alt+S -> Save, Alt+C -> Clear (the underlined letters on the buttons)
  useAltShortcuts({
    s: handleSave,
    c: handleClear,
  });

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
    <div
      onKeyDown={handleEnterAsTab}
      className="flex min-h-screen w-full items-center justify-center bg-white p-0 font-sans text-slate-700"
    >
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
Set Chart Of Account
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
                  (option) => option.value === row.lkpParameterType
                ) ??
                (row.lkpParameterType
                  ? {
                      value: row.lkpParameterType,
                      label: row.lkpParameterType,
                    }
                  : null);

              // both account cells are looked up from the row's account ID
              const accountIdValue =
                accountIdDropdownOptions.find(
                  (option) => option.value === row.lkpAccountID
                ) ??
                (row.lkpAccountID
                  ? { value: row.lkpAccountID, label: row.lkpAccountID }
                  : null);

              const accountNameValue =
                accountNameDropdownOptions.find(
                  (option) => option.value === row.lkpAccountID
                ) ?? null;

              return (
                <div
                  key={`coa-row-${index}`}
                  className="grid border-b border-[#b9e8d2] bg-white text-[11px]"
                  style={{ gridTemplateColumns: columns }}
                >
                  {/* ROW SELECTOR */}

                  <div className="h-[30px] border-r border-[#c8eadb]" />

                  {/* SERIAL NUMBER */}

                  <div
                    id={`txtSlNo-${index}`}
                    className="flex h-[30px] items-center justify-center border-r border-[#c8eadb]"
                  >
                    {index + 1}
                  </div>

                  {/* PARAMETER SELECT */}

                  <div className={`${cellClass} flex items-stretch`}>
                    <div className="h-full min-w-0 flex-1">
                    <Select<DropdownOption, false>
                      inputId={`lkpParameterType-${index}`}
                      name="lkpParameterType"
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
                      maxMenuHeight={parameterMenuHeight}
                      minMenuHeight={Math.max(320, parameterMenuHeight + 20)}
                      isClearable={false}
                      isSearchable
                      placeholder=""
                      noOptionsMessage={() => "No results found"}
                    />
                    </div>

                    {/* DELETE ROW (X) - inside the cell, after the dropdown arrow */}

                    {index < rows.length && (
                      <button
                        id={`btnDeleteRow-${index}`}
                        name="btnDeleteRow"
                        type="button"
                        tabIndex={-1}
                        onClick={() => handleDeleteRow(rows[index])}
                        disabled={!perms.delete}
                        aria-label={`Delete row ${index + 1}`}
                        className="
                          relative inline-flex h-full w-[27px] shrink-0
                          items-center justify-center self-stretch rounded
                          text-[#999999] hover:text-red-600
                          disabled:cursor-not-allowed disabled:opacity-30
                          disabled:hover:text-[#999999]
                        "
                      >
                        <X size={13} />
                      </button>
                    )}
                  </div>

                  {/* ACCOUNT ID SELECT */}

                  <div className={cellClass}>
                    <Select<DropdownOption, false>
                      inputId={`lkpAccountID-${index}`}
                      name="lkpAccountID"
                      aria-label={`Account ID row ${index + 1}`}
                      options={accountIdDropdownOptions}
                      value={accountIdValue}
                      onChange={(option) =>
                        handleSelectAccount(index, option)
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
                      minMenuHeight={320}
                      isClearable={false}
                      isSearchable
                      placeholder=""
                      noOptionsMessage={() => "No results found"}
                    />
                  </div>

                  {/* ACCOUNT NAME SELECT */}

                  <div className={cellClass}>
                    <Select<DropdownOption, false>
                      inputId={`lkpAccountName-${index}`}
                      name="lkpAccountName"
                      aria-label={`Account Name row ${index + 1}`}
                      options={accountNameDropdownOptions}
                      value={accountNameValue}
                      onChange={(option) =>
                        handleSelectAccount(index, option)
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
                      minMenuHeight={320}
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
                      name="txtGPH"
                      aria-label={`G/P/H row ${index + 1}`}
                      value={row.txtGPH}
                      readOnly
                      tabIndex={-1}
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

        {/* ACTION BUTTONS - stay at the bottom of the window, so Save is always visible without scrolling */}

        <div className="sticky bottom-0 z-10 flex min-h-[74px] items-start justify-center gap-[12px] border-t border-slate-200 bg-white pt-[8px]">
          <button
            id="btnSave"
            name="btnSave"
            type="button"
            onClick={handleSave}
            disabled={!perms.save || saving}
            className="
              h-[40px] w-[107px]
              rounded-[4px] border border-[#9bb7cc]
              bg-gradient-to-b from-white to-[#e2ebf2]
              text-[14px] text-green-700 shadow-sm
              hover:from-[#f4fff7] hover:to-[#d4ebdc]
              focus:outline-none focus:ring-1 focus:ring-green-400
              disabled:cursor-not-allowed disabled:opacity-40
            "
          >
            <span className="underline underline-offset-[3px]">
              S
            </span>ave
          </button>

          <button
            id="btnClear"
            name="btnClear"
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

      {confirmDialog}
    </div>
  );
};

export default SetChartOfAccount;