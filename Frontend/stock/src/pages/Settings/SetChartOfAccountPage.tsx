import React, { useEffect, useMemo, useState } from "react";
import Header from "../../components/common/Header";
import { X } from "lucide-react";
import { useConfirmModal } from "../../hooks/useConfirmModal";
import { useCtrlShortcuts } from "../../hooks/useCtrlShortcuts";
import { useEnterAsTab } from "../../hooks/useEnterAsTab";
import { useButtonPermissions } from "../../hooks/useButtonPermissions";
import { useGridCellFocus } from "../../hooks/useGridCellFocus";
import { tryGetServerDate } from "../../utils/serverDate";
import { useMessageModal } from "../../hooks/useMessageModal";
import { deleteSuccessMessage } from "../../hooks/useDeleteToast";
import TransactionActions from "../../components/common/TransactionActions";
import { useAdvanceAfterSelect } from "../../hooks/useAdvanceAfterSelect";
import Select, {
  components,
  type MenuListProps,
  type StylesConfig,
} from "react-select";
import selectComponents from "../../components/sharecomponents/selectComponents";

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
          grid h-[30px]
          border-b border-slate-300
          bg-[#eeeeee]
          text-[14px] font-medium text-slate-800
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
    minHeight: "34px",
    height: "34px",
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
    height: "34px",
    minWidth: 0,
    padding: "0 7px 0 2px",
    overflow: "hidden",
  }),

  input: (base) => ({
    ...base,
    margin: 0,
    padding: 0,
    color: "#334155",
    fontSize: "13px",
  }),

  singleValue: (base) => ({
    ...base,
    margin: 0,
    color: "#334155",
    fontSize: "13px",
    lineHeight: "34px",
  }),

  placeholder: (base) => ({
    ...base,
    margin: 0,
    color: "#94a3b8",
    fontSize: "13px",
  }),

  indicatorsContainer: (base) => ({
    ...base,
    width: "17px",
    height: "34px",
    flexShrink: 0,
  }),

  dropdownIndicator: (base) => ({
    ...base,
    // centre the arrow in the 34px row (same line as the text and the X)
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "17px",
    height: "34px",
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
    minHeight: "30px",
    height: "30px",
    padding: 0,
    backgroundColor: state.isFocused
      ? "#eef9f3"
      : "#ffffff",
    color: "#334155",
    fontSize: "14px",
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
  const { confirm, dialog } = useConfirmModal();
  // the messages (warnings, errors, saved ...) are the common message window, as on the Payment screen - not a toast
  const { notify, dialog: messageDialog } = useMessageModal("Set Chart Of Account");
  const handleEnterAsTab = useEnterAsTab();
  // the cell the cursor is in is outlined
  const { cellFocusClass } = useGridCellFocus();
  // after a dropdown pick (or Enter on a closed one) the cursor goes on
  const { advanceAfterPick, advanceOnEnter } = useAdvanceAfterSelect();
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
          notify.error("getChartOfAccount: no PstrCoID in localStorage");
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
          notify.error(result.message || "Failed to load chart of account setting");
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
        notify.error("Failed to load chart of account setting");
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
          notify.error("getParameterList: no PstrCoID in localStorage");
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
          notify.error(result.message || "Failed to load parameter list");
          return;
        }

        setParameterList(result.data || []);
      } catch (error) {
        console.error("getParameterList error:", error);
        notify.error("Failed to load parameter list");
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
          notify.error("getAccountList: no PstrCoID in localStorage");
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
          notify.error(result.message || "Failed to load account list");
          return;
        }

        setAccountList(result.data || []);
      } catch (error) {
        console.error("getAccountList error:", error);
        notify.error("Failed to load account list");
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
  // 30px row per parameter) - so it never needs a scroll bar, however many
  // parameters there are
  const parameterMenuHeight = (parameterList.length + 1) * 30 + 2;

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

  // Widths of the two account lists, measured when one opens: the Account ID list
  // covers the Account ID box AND the Account Name box next to it (to the Name
  // box's right edge); the Account Name list is as wide as its own box.
  const [idMenuWidth, setIdMenuWidth] = useState<number>(850);
  const [nameMenuWidth, setNameMenuWidth] = useState<number>(850);

  const measureAccountMenus = (rowIndex: number) => {
    const boxOf = (inputId: string) =>
      document.getElementById(inputId)?.closest('div[class$="-control"]');

    const idBox = boxOf(`lkpAccountID-${rowIndex}`);
    const nameBox = boxOf(`lkpAccountName-${rowIndex}`);

    if (!idBox || !nameBox) return;

    const idRect = idBox.getBoundingClientRect();
    const nameRect = nameBox.getBoundingClientRect();

    setIdMenuWidth(Math.round(nameRect.right - idRect.left));
    setNameMenuWidth(Math.round(nameRect.width));
  };

  const accountIdStyles = useMemo(
    () =>
      createSelectStyles(
        idMenuWidth,
        "0px minmax(0px, 1fr)"
      ),
    [idMenuWidth]
  );

  const accountNameStyles = useMemo(
    () => createSelectStyles(nameMenuWidth, "minmax(-400px, 1fr) 120px"),
    [nameMenuWidth]
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

    const shouldDelete = await confirm({
      title: "Set Chart Of Account",
      message: "Do you want to Delete?",
      confirmLabel: "Delete",
      cancelLabel: "Cancel",
    });

    if (!shouldDelete) {
      return;
    }

    const PstrCoID = localStorage.getItem("PstrCoID");
    const PstrYear = localStorage.getItem("PstrYear");
    const PstrUserID = localStorage.getItem("PstrUserID");

    if (!PstrCoID || !PstrYear || !PstrUserID) {
      notify.error("Company ID / Year / User ID not found. Please log in again.");
      return;
    }

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/SetChartOfAccount/deleteChartOfAccountRow`,
        {
          method: "DELETE",
          credentials: "include", // the server checks the session and the rights
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
        notify.error(result.message || "Could not delete the account setting. Please try again.");
        return;
      }

      // the common message of a delete (hooks/useDeleteToast.ts, the same on every screen), then the row leaves the grid
      notify.success(deleteSuccessMessage("Set Chart Of Account"));
      setRows((previous) => previous.filter((item) => item !== row));
    } catch (error) {
      console.error("deleteChartOfAccountRow error:", error);
      notify.error("Cannot connect to Set Chart Of Account API.");
    }
  };

  // ==========================================================
  // SAVE
  // Sends the whole grid. The backend works out which rows are new,
  // changed or removed (compared with what is saved) and writes them
  // in one transaction.
  // ==========================================================

  // The one button, always "Save" (the old form switched its text to "Modify" once
  // the company had saved rows; here it stays Save, and the right checked is still
  // Save for a first save, Modify once rows are saved). A row that carries its
  // original keys came from the database.
  const hasSavedRows = rows.some((row) => row.txtOriginalSlNo !== null);
  const actionWord = "Save";
  const canSaveOrModify = hasSavedRows ? perms.modify : perms.save;

  const handleSave = async () => {
    if (saving) return;

    if (!canSaveOrModify) {
      notify.error(`You do not have permission to ${actionWord}.`);
      return;
    }

    const PstrCoID = localStorage.getItem("PstrCoID");
    const PstrYear = localStorage.getItem("PstrYear");
    const PstrUserID = localStorage.getItem("PstrUserID");

    if (!PstrCoID || !PstrYear || !PstrUserID) {
      notify.error("Company ID / Year / User ID not found. Please log in again.");
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
        notify.error(`Row ${rowNo}: select both a Parameter and an Account.`);
        document
          .getElementById(
            row.lkpParameterType.trim()
              ? `lkpAccountID-${rowNo - 1}`
              : `lkpParameterType-${rowNo - 1}`
          )
          ?.focus();
        return;
      }

      const pair = `${row.lkpParameterType}|${row.lkpAccountID}`.toUpperCase();

      if (seen.has(pair)) {
        notify.error(`Row ${rowNo}: Duplicate Entry !`);
        document.getElementById(`lkpAccountID-${rowNo - 1}`)?.focus();
        return;
      }

      seen.add(pair);
    }

    setSaving(true);

    try {
      // the time of the save: the database server's clock (the common /datetime/server-date), written on every row
      const dtpServerDate = await tryGetServerDate();

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/SetChartOfAccount/saveChartOfAccount`,
        {
          method: "POST",
          credentials: "include", // the server checks the session and the rights
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            PstrCoID,
            PstrYear,
            PstrUserID,
            dtpServerDate,
            rows: filledRows.map(({ row, rowNo }, index) => ({
              txtGridRow: rowNo - 1, // where the row sits in the grid (for the focus)
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
        notify.error(
          result.message ||
            "Not saved, try again."
        );

        // the backend validator names the field that failed - same name as
        // the element id, so the cursor goes straight into it
        if (result.field) {
          document.getElementById(result.field)?.focus();
        }

        return;
      }

      notify.success(
        result.message || "Set Chart Of Account saved successfully"
      );

      // load the saved rows again - they now carry their new slno / keys
      setReloadKey((key) => key + 1);
    } catch (error) {
      console.error("saveChartOfAccount error:", error);
      notify.error("Cannot connect to Set Chart Of Account API.");
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

  // The key of the Payment screen: Ctrl+S Save
  useCtrlShortcuts({
    s: handleSave,
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
    "flex h-[34px] min-w-0 items-center border-r border-[#bfe8d0] pl-[2px] pr-[7px] text-[14px] text-gray-600";

  const cellClass =
    `relative h-[34px] min-w-0 border-r border-[#bfe8d0] p-0 ${cellFocusClass}`;

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <>
    <div
      onKeyDown={handleEnterAsTab}
      className="flex min-h-screen w-full items-center justify-center bg-white text-slate-700"
    >
      {/* no overflow-hidden on the card: dropdowns must remain visible */}
      <div className="w-[1350px] max-w-full border border-slate-400 bg-white shadow-sm">
        <Header Name="Set Chart Of Account" />

        {/* FORM */}

        <div className="p-[12px] m-[12px]">

        {/* TABLE */}
        {/* Do not add overflow-hidden here: dropdowns must remain visible. */}

        <div className="overflow-visible border border-[#bfe8d0]">
          <div className="w-full">
            {/* TABLE HEADINGS */}

            <div
              className="grid border-b border-[#bfe8d0] bg-[#edf9f2]"
              style={{ gridTemplateColumns: columns }}
            >
              <div className="h-[34px] border-r border-[#bfe8d0]" />

              <div className={`${headerCellClass} justify-center`}>
                Line
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

              <div className="flex h-[34px] min-w-0 items-center pl-[2px] pr-[5px] text-[14px] text-gray-600">
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
                  className="grid border-b border-[#bfe8d0] bg-white text-[13px]"
                  style={{ gridTemplateColumns: columns }}
                >
                  {/* ROW SELECTOR */}

                  <div className="h-[34px] border-r border-[#bfe8d0]" />

                  {/* SERIAL NUMBER */}

                  <div
                    id={`txtSlNo-${index}`}
                    className="flex h-[34px] items-center justify-center border-r border-[#bfe8d0]"
                  >
                    {index + 1}
                  </div>

                  {/* PARAMETER SELECT */}

                  <div className={`${cellClass} flex items-stretch`}>
                    <div
                      className="h-full min-w-0 flex-1"
                      onKeyDown={(event) => advanceOnEnter(event)}
                    >
                    <Select<DropdownOption, false>
                      inputId={`lkpParameterType-${index}`}
                      name="lkpParameterType"
                      aria-label={`Parameter row ${index + 1}`}
                      options={parameterDropdownOptions}
                      value={parameterValue}
                      onChange={(option) => {
                        handleSelectParameter(index, option);
                        if (option) advanceAfterPick(`lkpParameterType-${index}`);
                      }}
                      components={{
                        ...selectComponents,
                        MenuList: ParameterMenuList,
                      }}
                      formatOptionLabel={(option, { context }) =>
                        context === "value" ? (
                          option.label
                        ) : (
                          <div
                            className="grid h-[30px] w-full items-center"
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
                          relative inline-flex h-full w-5 shrink-0
                          items-center justify-center self-stretch rounded
                          text-slate-400 hover:text-red-500
                          disabled:cursor-not-allowed disabled:opacity-30
                          disabled:hover:text-slate-400
                        "
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>

                  {/* ACCOUNT ID SELECT */}

                  <div
                    className={cellClass}
                    onKeyDown={(event) =>
                      advanceOnEnter(event, [`lkpAccountName-${index}`])
                    }
                  >
                    <Select<DropdownOption, false>
                      inputId={`lkpAccountID-${index}`}
                      name="lkpAccountID"
                      aria-label={`Account ID row ${index + 1}`}
                      options={accountIdDropdownOptions}
                      value={accountIdValue}
                      onChange={(option) => {
                        handleSelectAccount(index, option);
                        // the Account Name box is filled by this pick: skip it
                        if (option) {
                          advanceAfterPick(`lkpAccountID-${index}`, [
                            `lkpAccountName-${index}`,
                          ]);
                        }
                      }}
                      components={{
                        ...selectComponents,
                        MenuList: AccountIdMenuList,
                      }}
                      formatOptionLabel={(option, { context }) =>
                        context === "value" ? (
                          option.label
                        ) : (
                          <div
                            className="grid h-[30px] w-full items-center"
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
                      onMenuOpen={() => measureAccountMenus(index)}
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

                  <div
                    className={cellClass}
                    onKeyDown={(event) => advanceOnEnter(event)}
                  >
                    <Select<DropdownOption, false>
                      inputId={`lkpAccountName-${index}`}
                      name="lkpAccountName"
                      aria-label={`Account Name row ${index + 1}`}
                      options={accountNameDropdownOptions}
                      value={accountNameValue}
                      onChange={(option) => {
                        handleSelectAccount(index, option);
                        if (option) advanceAfterPick(`lkpAccountName-${index}`);
                      }}
                      components={{
                        ...selectComponents,
                        MenuList: AccountNameMenuList,
                      }}
                      formatOptionLabel={(option, { context }) =>
                        context === "value" ? (
                          option.label
                        ) : (
                          <div
                            className="grid h-[30px] w-full items-center"
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
                      onMenuOpen={() => measureAccountMenus(index)}
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

                  <div className="h-[34px] min-w-0">
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
                        pl-[2px] pr-[7px] text-[13px] text-slate-700
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

        </div>

        {/* ACTION BUTTONS - stay at the bottom of the window, so Save is always visible without scrolling */}

        <TransactionActions
          className="sticky bottom-0 z-10 flex justify-center gap-3 bg-white pb-[12px] pt-[2px]"
          actions={[
            {
              id: "btnSave",
              label: actionWord,
              underlineIndex: 0,
              onClick: handleSave,
              disabled: !canSaveOrModify || saving,
            },
            { id: "btnClear", label: "Clear", onClick: handleClear },
          ]}
        />
      </div>
    </div>

    {/* the "Do you want to delete ?" question - outside the root div so the page's
        Enter handling does not take the Enter of the buttons */}
    {dialog}
    {messageDialog}
    </>
  );
};

export default SetChartOfAccount;