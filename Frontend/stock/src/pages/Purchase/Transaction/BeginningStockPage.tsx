
import { Play } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import Select, {
  type SingleValue,
  type StylesConfig,
} from "react-select";
import { toast } from "react-toastify";
import {
  makePairComponents,
  filterPairOption,
  makePairDividedMenuStyles,
} from "../../../components/PairSelect/pairSelectParts";
import { useScrollbarWidth } from "../../../hooks/useScrollbarWidth";
import { useAdvanceAfterSelect } from "../../../hooks/useAdvanceAfterSelect";
import { usePairMenuHang } from "../../../hooks/usePairMenuHang";
import { useAltShortcuts } from "../../../hooks/useAltShortcuts";
import { useConfirmModal } from "../../../hooks/useConfirmModal";
import { useGridCellFocus } from "../../../hooks/useGridCellFocus";
import { useInitialFocus } from "../../../hooks/useInitialFocus";
import ReportPreview from "../../../components/common/ReportPreview";
import { buildBeginningStockPdf } from "../../../components/Transaction/BeginningStock/BeginningStockPdf";
import {
  buildHtml,
  printBeginningStockReport,
  type PrintReport,
} from "../../../components/Transaction/BeginningStock/BeginningStockPrintReport";
import { useDeleteToast } from "../../../hooks/useDeleteToast";
import { useButtonPermissions } from "../../../hooks/useButtonPermissions";
import {
  BranchDividedMenuList,
  BranchDividedOption,
  branchMenuStyles,
  filterLabelOrValue,
} from "../../../components/BranchSelect/branchSelectParts";
import selectComponents from "../../../components/sharecomponents/selectComponents";

interface SelectOption {
  value: string;
  label: string;
  // only on the Item ID / Item Name boxes: their open list shows both columns
  // and the search matches either
  id?: string;
  name?: string;
}

interface StockRow {
  id: number;
  txtSlNo: number;
  lkpItemID: SelectOption | null;
  lkpItemName: SelectOption | null;
  txtUnit: string;
  txtQty: string;
  txtUnitCost: string;
  // the Sl.# the line had when it was loaded (null for a new line)
  txtOriginalSlNo: number | null;
}

// an item of the branch, as the server gives it
interface ItemRecord {
  lkpItemID: string;
  txtItemName: string;
  txtUnit: string;
}

// dbo.tblmenu fmenuid of the Beginning Stock page
const MENU_ID = "010104";

// the title of the question windows
const SCREEN_TITLE = "Beginning Stock";

// today as yyyy-mm-dd, in the user's own time
const todayLocal = () => new Date().toLocaleDateString("en-CA");

// ============================================================
// BRANCH SELECT STYLE
// The project's Branch box (as on Set Document No / Set Branch Info): 30px, light
// border, mint when focused, the filled arrow, and a "Branch | ID" list.
// ============================================================

const branchSelectStyles: StylesConfig<SelectOption, false> = {
  control: (base, state) => ({
    ...base,
    minHeight: "30px",
    height: "30px",
    border: "1px solid #d1d5db",
    borderRadius: "4px",
    boxShadow: "none",
    backgroundColor: state.isFocused ? "#eefbf4" : "#ffffff",
    fontSize: "11px",
    cursor: "pointer",

    "&:hover": {
      borderColor: "#9fdfbc",
    },
  }),

  valueContainer: (base) => ({
    ...base,
    height: "23px",
    minHeight: "23px",
    padding: "0 6px",
  }),

  singleValue: (base) => ({
    ...base,
    margin: 0,
    color: "#374151",
    fontSize: "11px",
  }),

  placeholder: (base) => ({
    ...base,
    margin: 0,
    color: "#808080",
    fontSize: "11px",
  }),

  input: (base) => ({
    ...base,
    margin: 0,
    padding: 0,
    fontSize: "11px",
    color: "#374151",
  }),

  indicatorsContainer: (base) => ({
    ...base,
    height: "23px",
  }),

  dropdownIndicator: (base) => ({
    ...base,
    padding: "4px 7px",
    color: "#64748b",
  }),

  indicatorSeparator: () => ({
    display: "none",
  }),

  menuPortal: (base) => ({
    ...base,
    zIndex: 99999,
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

  // the wide menu and the flush "Branch | ID" header
  ...branchMenuStyles,
};

// ============================================================
// ITEM ID | ITEM NAME LISTS
// The same two-column list as the Supplier boxes on the Item page (shared in
// components/PairSelect/pairSelectParts.tsx): the Item ID box opens "Item ID |
// Item Name", the Item Name box opens "Item Name | Item ID", both with a divider,
// both searchable on either column, and picking from one fills the other.
// ============================================================

const itemIdComponents = makePairComponents("Item ID", "Item Name", false, true);
// The Item Name box's list reaches the right edge of the Unit Cost column: the part
// past the Item Name box is its Item ID column, measured when the list opens (see
// usePairMenuHang), so it is wide enough for a whole ID on one line.
const itemNameComponents = makePairComponents("Item ID", "Item Name", true, true);

// ============================================================
// REACT SELECT STYLES
// ============================================================

const selectStyles = {
  control: (
    base: any,
    state: any
  ) => ({
    ...base,

    minHeight: "30px",
    height: "30px",

    borderColor: "#99a1af",

    borderRadius: "4px",

    boxShadow: "none",

    fontSize: "14px",

    backgroundColor: "#ffffff",

    cursor: "text",

    "&:hover": {
      borderColor: "#20884e",
    },

    ...(state.isFocused && {
      borderColor: "#20884e",
      boxShadow: "none",
      outline: "none",
    }),
  }),

  valueContainer: (base: any) => ({
    ...base,
    height: "30px",
    padding: "0 8px",
    overflow: "hidden",
  }),

  singleValue: (base: any) => ({
    ...base,
    color: "#344054",
    fontSize: "14px",
    margin: 0,
  }),

  placeholder: (base: any) => ({
    ...base,
    color: "#8b96a3",
    fontSize: "14px",
    margin: 0,
  }),

  input: (base: any) => ({
    ...base,
    margin: 0,
    padding: 0,
    fontSize: "14px",
    color: "#344054",
  }),

  indicatorsContainer: (base: any) => ({
    ...base,
    height: "28px",
  }),

  dropdownIndicator: (base: any) => ({
    ...base,
    color: "#aeb8c2",
    padding: "4px",

    "&:hover": {
      color: "#808080",
    },
  }),

  indicatorSeparator: () => ({
    display: "none",
  }),

  clearIndicator: (base: any) => ({
    ...base,
    color: "#aeb8c2",
    padding: "4px",

    "&:hover": {
      color: "#808080",
    },
  }),

  // ==========================================================
  // MENU
  // ==========================================================

  menu: (base: any) => ({
    ...base,

    fontSize: "14px",

    zIndex: 999999,

    marginTop: "2px",

    borderRadius: "3px",

    overflow: "hidden",

    boxShadow:
      "0 4px 12px rgba(0,0,0,0.12)",
  }),

  // ==========================================================
  // MENU PORTAL
  // ==========================================================

  menuPortal: (base: any) => ({
    ...base,

    zIndex: 999999,
  }),

  menuList: (base: any) => ({
    ...base,

    padding: "3px 0",

    maxHeight: "200px",

    overflowY: "auto",
  }),

  option: (
    base: any,
    state: any
  ) => ({
    ...base,

    fontSize: "12px",

    cursor: "pointer",

    backgroundColor:
      state.isSelected
        ? "#eefbf4"
        : state.isFocused
          ? "#eefbf4"
          : "#ffffff",

    color: "#344054",

    padding: "7px 10px",

    "&:active": {
      backgroundColor: "#dff5e9",
    },
  }),
};

// ============================================================
// TABLE SELECT STYLES
// ============================================================

const tableSelectStyles: StylesConfig<SelectOption, false> = {
  ...selectStyles,
//@ts-ignore
  control: (base, state) => ({
    ...base,
    minHeight: "26px",
    height: "26px",
    border: "none",
    borderRadius: "0",
    boxShadow: "none",
    outline: "none",
    backgroundColor: "transparent",
    fontSize: "13px",
    cursor: "pointer",

    "&:hover": {
      border: "none",
    },
  }),

  valueContainer: (base) => ({
    ...base,
    padding: "0 5px",
    height: "26px",
  }),

  singleValue: (base) => ({
    ...base,
    margin: 0,
    fontSize: "13px",
    color: "#374151",
  }),

  placeholder: (base) => ({
    ...base,
    margin: 0,
    fontSize: "13px",
    color: "#94a3b8",
  }),

  input: (base) => ({
    ...base,
    margin: 0,
    padding: 0,
    fontSize: "13px",
  }),

  indicatorsContainer: (base) => ({
    ...base,
    height: "26px",
  }),

  dropdownIndicator: (base) => ({
    ...base,
    padding: "3px",
    color: "#64748b",
  }),

  clearIndicator: (base) => ({
    ...base,
    padding: "3px",
    color: "#94a3b8",
  }),

  menu: (base) => ({
    ...base,
    zIndex: 99999,
    fontSize: "13px",
    marginTop: "1px",
  }),

  menuList: (base) => ({
    ...base,
    maxHeight: "180px",
    overflowY: "auto",
  }),

  menuPortal: (base) => ({
    ...base,
    zIndex: 99999,
  }),

  option: (base, state) => ({
    ...base,
    padding: "7px 8px",
    fontSize: "13px",
    color: "#374151",
    cursor: "pointer",
    backgroundColor: state.isSelected
      ? "#dbeafe"
      : state.isFocused
        ? "#eff6ff"
        : "#ffffff",
  }),
};

// ============================================================
// INITIAL ROWS
// ============================================================

const createInitialRows = (): StockRow[] =>
  Array.from({ length: 11 }, (_, index) => ({
    id: index + 1,
    txtSlNo: index + 1,
    lkpItemID: null,
    lkpItemName: null,
    txtUnit: "",
    txtQty: "",
    txtUnitCost: "",
    txtOriginalSlNo: null,
  }));

// ============================================================
// COMPONENT
// ============================================================

const BeginningStockPage: React.FC = () => {
  // The Branch box: only the branches the logged-in user has a right to
  // (dbo.userbranches), with the user's own default branch (dbo.getuserdefbranch,
  // from Set Default Branch) selected when the page opens.
  const [branchOptions, setBranchOptions] = useState<SelectOption[]>([]);
  const [lkpDefaultBranch, setLkpDefaultBranch] = useState<SelectOption | null>(null);
  const [lkpBranch, setLkpBranch] = useState<SelectOption | null>(null);

  const [dtpDate, setDtpDate] = useState(todayLocal);
  const [txtNote, setTxtNote] = useState("");
  const [rows, setRows] = useState<StockRow[]>(createInitialRows);
  const [activeRow, setActiveRow] = useState(0);//@ts-ignore
  const [message, setMessage] = useState("");

  const perms = useButtonPermissions(MENU_ID);
  // the branch list and the default branch have been loaded (the cursor can start)
  const [branchesLoaded, setBranchesLoaded] = useState(false);

  // the Print Preview (after Print): the report the server sent, and the branch it was
  // made for (the Excel file is made for the same one)
  const [preview, setPreview] = useState<{
    report: PrintReport;
    lkpBranch: string;
    fileBase: string;
  } | null>(null);
  // the common themed question window (the same as the Purchase Invoice screen)
  const { confirm, dialog: confirmDialog } = useConfirmModal();
  // the cell the cursor is in is outlined; a typed-in box has its text selected
  const { cellFocusClass, selectOnFocus } = useGridCellFocus();
  // the standard messages of a delete: "Beginning Stock deleted successfully"
  const { notDeleted } = useDeleteToast(SCREEN_TITLE);

  // the items of the chosen branch (not blocked for it)
  const [items, setItems] = useState<ItemRecord[]>([]);

  // the saved Beginning Stock of the chosen branch
  //   chkSaved  = there is one (the button says Modify)
  //   chkPosted = it is posted: the page is locked, nothing can be changed
  const [chkSaved, setChkSaved] = useState(false);
  const [chkPosted, setChkPosted] = useState(false);
  const [txtUserInfo, setTxtUserInfo] = useState("");

  const [saving, setSaving] = useState(false);

  // the Item ID list covers the Item ID box AND the Item Name box next to it
  const { hang: idMenuHang, measure: measureIdMenuHang } = usePairMenuHang();

  // Enter / Tab / click on a dropdown goes on to the next box of the row
  const { advanceAfterPick, advanceOnEnter } = useAdvanceAfterSelect();
  // ... and the Item Name list covers the columns up to Unit Cost
  const { hang: nameMenuHang, measure: measureNameMenuHang } = usePairMenuHang(210);

  // the grid's scroll bar narrows its columns; the totals row below gets the same
  // amount as padding so its boxes end where the grid's columns end
  const gridScroll = useScrollbarWidth<HTMLDivElement>();

  // bumped by Clear / after a save so the document is loaded again
  const [reloadKey, setReloadKey] = useState(0);
  // counts the documents loaded: after each one is drawn the cursor goes to the first
  // empty Item ID (see the effect below)
  const [docLoadTick, setDocLoadTick] = useState(0);

  // the two item boxes: Item ID shows the ID, Item Name shows the name; both
  // carry the item's ID as their value, so choosing one fills the other
  const itemOptions: SelectOption[] = items.map((item) => ({
    value: item.lkpItemID,
    label: item.lkpItemID,
    id: item.lkpItemID,
    name: item.txtItemName,
  }));

  const itemNameOptions: SelectOption[] = items.map((item) => ({
    value: item.lkpItemID,
    label: item.txtItemName,
    id: item.lkpItemID,
    name: item.txtItemName,
  }));

  // ----------------------------------------------------------
  // LOAD THE BRANCHES AND THE DEFAULT BRANCH
  // ----------------------------------------------------------

  useEffect(() => {
    const loadBranches = async () => {
      try {
        const PstrCoID = localStorage.getItem("PstrCoID");

        if (!PstrCoID) {
          toast.error("getBranchList: no PstrCoID in localStorage");
          return;
        }

        // needs the login: the branches depend on WHO is logged in
        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/BeginningStock/getBranchList?PstrCoID=${PstrCoID}`,
          { credentials: "include" },
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
          toast.error(`getBranchList failed: ${result.message}`);
          return;
        }

        const options: SelectOption[] = (result.data || []).map(
          (row: { lkpBranch: string; txtBranchName: string }) => ({
            value: row.lkpBranch,
            label: row.txtBranchName,
          }),
        );

        const initial =
          options.find((option) => option.value === result.lkpDefaultBranch) ??
          null;

        setBranchOptions(options);
        setLkpDefaultBranch(initial);
        setLkpBranch(initial);
      } catch (error) {
        console.error("getBranchList error:", error);
        toast.error(
          `Beginning Stock load error: ${error instanceof Error ? error.message : String(error)}`,
        );
      } finally {
        setBranchesLoaded(true);
      }
    };

    loadBranches();
  }, []);

  // where the cursor starts: the Branch box when no branch is chosen. With a branch
  // chosen (the user's default branch) the loaded document decides: see the effect after
  // the load - the first empty Item ID, or the Branch box when the document is posted.
  useInitialFocus(branchesLoaded && !lkpBranch, "lkpBranch");

  // ----------------------------------------------------------
  // THE BRANCH CHANGED (or Clear): load its items and its saved Beginning Stock
  // ----------------------------------------------------------

  useEffect(() => {
    if (!lkpBranch) {
      setItems([]);
      setRows(createInitialRows());
      setChkSaved(false);
      setChkPosted(false);
      setTxtUserInfo("");
      setTxtNote("");
      return;
    }

    let cancelled = false;

    const loadDocument = async () => {
      try {
        const PstrCoID = localStorage.getItem("PstrCoID");
        const PstrYear = localStorage.getItem("PstrYear");

        if (!PstrCoID || !PstrYear) {
          toast.error("Company ID / Year not found. Please log in again.");
          return;
        }

        const api = import.meta.env.VITE_API_URL;
        const query = `PstrCoID=${PstrCoID}&PstrYear=${PstrYear}&lkpBranch=${encodeURIComponent(lkpBranch.value)}`;

        const [itemResponse, documentResponse] = await Promise.all([
          fetch(`${api}/BeginningStock/getItemList?${query}`, { credentials: "include" }),
          fetch(`${api}/BeginningStock/getBeginningStock?${query}`, { credentials: "include" }),
        ]);

        const itemResult = await itemResponse.json();
        const documentResult = await documentResponse.json();

        if (!itemResponse.ok || !itemResult.success) {
          toast.error(`getItemList failed: ${itemResult.message}`);
          return;
        }

        if (!documentResponse.ok || !documentResult.success) {
          toast.error(`getBeginningStock failed: ${documentResult.message}`);
          return;
        }

        if (cancelled) return;

        const loadedItems: ItemRecord[] = (itemResult.data || []).map(
          (row: { lkpItemID: string; txtItemName: string | null; txtUnit: string | null }) => ({
            lkpItemID: row.lkpItemID,
            txtItemName: row.txtItemName ?? row.lkpItemID,
            txtUnit: row.txtUnit ?? "",
          }),
        );

        // the saved lines, then blank rows up to the usual 15
        const savedRows: StockRow[] = (documentResult.data || []).map(
          (
            line: {
              txtSlNo: number;
              lkpItemID: string;
              txtUnit: string | null;
              txtQty: string;
              txtUnitCost: string;
            },
            index: number,
          ) => {
            const item = loadedItems.find((entry) => entry.lkpItemID === line.lkpItemID);

            return {
              id: index + 1,
              txtSlNo: index + 1,
              lkpItemID: {
                value: line.lkpItemID,
                label: line.lkpItemID,
                id: line.lkpItemID,
                name: item?.txtItemName ?? line.lkpItemID,
              },
              lkpItemName: {
                value: line.lkpItemID,
                label: item?.txtItemName ?? line.lkpItemID,
                id: line.lkpItemID,
                name: item?.txtItemName ?? line.lkpItemID,
              },
              txtUnit: line.txtUnit ?? item?.txtUnit ?? "",
              txtQty: Number(line.txtQty).toFixed(3),
              txtUnitCost: Number(line.txtUnitCost).toFixed(4),
              txtOriginalSlNo: Number(line.txtSlNo),
            };
          },
        );

        const blankRows = createInitialRows()
          .slice(savedRows.length)
          .map((row, index) => ({
            ...row,
            id: savedRows.length + index + 1,
            txtSlNo: savedRows.length + index + 1,
          }));

        setItems(loadedItems);
        setRows([...savedRows, ...blankRows]);
        setActiveRow(0);
        setChkSaved(Boolean(documentResult.chkSaved));
        setChkPosted(Boolean(documentResult.chkPosted));
        setDtpDate(documentResult.header?.dtpDate || todayLocal());
        setTxtNote(documentResult.header?.txtNote ?? "");

        // "Saved By : X date / Last Modified By : Y date", as the old form showed
        const header = documentResult.header;
        let info = "";

        if (header?.txtSavedBy) {
          info = `Saved By : ${header.txtSavedBy} ${header.txtSavedOn ?? ""}`;
        }

        if (header?.txtModifiedBy) {
          info += `\nLast Modified By : ${header.txtModifiedBy} ${header.txtModifiedOn ?? ""}`;
        }

        setTxtUserInfo(info);

        if (documentResult.chkPosted) {
          toast.info("This Beginning Stock is posted: it is locked.");
        }

        // the document is loaded: once it is drawn the cursor goes to the first empty Item ID
        setDocLoadTick((tick) => tick + 1);
      } catch (error) {
        console.error("loadBeginningStock error:", error);
        toast.error(
          `Beginning Stock load error: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    };

    loadDocument();

    return () => {
      cancelled = true;
    };
  }, [lkpBranch, reloadKey]);

  // after a document has been loaded and drawn: a document that is not posted gets the
  // cursor on the Item ID of its first empty row (after the saved lines, ready for the
  // next one); a posted document is locked, so the cursor goes to the Branch box
  useEffect(() => {
    if (docLoadTick === 0) return;

    if (chkPosted) {
      document.getElementById("lkpBranch")?.focus();
      return;
    }

    const firstEmpty = rows.findIndex((row) => !row.lkpItemID);
    const target = firstEmpty === -1 ? rows.length - 1 : firstEmpty;

    document.getElementById(`lkpItemID-${target}`)?.focus();
    setActiveRow(target);
    // only when a document has just been loaded
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docLoadTick]);

  // ----------------------------------------------------------
  // UPDATE ROW
  // ----------------------------------------------------------

  const updateRow = (
    rowIndex: number,
    field: keyof StockRow,
    value: string | SelectOption | null,
  ) => {
    setRows((previous) =>
      previous.map((row, index) => {
        if (index !== rowIndex) return row;

        const updated = { ...row, [field]: value };

        // Keep Item ID and Item Name synchronized.
        if (field === "lkpItemID") {
          const selected = value as SelectOption | null;

          updated.lkpItemName = selected
            ? itemNameOptions.find(
                (option) => option.value === selected.value,
              ) ?? null
            : null;
        }

        if (field === "lkpItemName") {
          const selected = value as SelectOption | null;

          updated.lkpItemID = selected
            ? itemOptions.find(
                (option) => option.value === selected.value,
              ) ?? null
            : null;
        }

        // the unit comes from the item; clearing the item clears the whole row
        // (unit, quantity, unit cost - and so the total), as the old form's ClearRow
        if (field === "lkpItemID" || field === "lkpItemName") {
          const selected = value as SelectOption | null;

          updated.txtUnit = selected
            ? items.find((item) => item.lkpItemID === selected.value)?.txtUnit ?? ""
            : "";

          if (!selected) {
            updated.txtQty = "";
            updated.txtUnitCost = "";
          }
        }

        return updated;
      }),
    );
  };

  // ----------------------------------------------------------
  // UPDATE TEXT FIELDS
  // ----------------------------------------------------------

  const updateTextField = (
    rowIndex: number,
    field: "txtQty" | "txtUnitCost",
    value: string,
  ) => {
    updateRow(rowIndex, field, value);
  };

  // on leaving the box: Qty shows 3 decimals, Unit Cost 4 (1 -> 1.000 / 12.0000)
  const showDecimals = (
    rowIndex: number,
    field: "txtQty" | "txtUnitCost",
    value: string,
  ) => {
    if (value === "" || Number.isNaN(Number(value))) return;

    updateRow(rowIndex, field, Number(value).toFixed(field === "txtQty" ? 3 : 4));
  };

  // ----------------------------------------------------------
  // AMOUNT CALCULATIONS
  // ----------------------------------------------------------

  const getTotalCost = (row: StockRow) => {
    const qty = Number(row.txtQty) || 0;
    const cost = Number(row.txtUnitCost) || 0;

    return qty * cost;
  };

  const total = useMemo(
    () => rows.reduce((sum, row) => sum + getTotalCost(row), 0),
    [rows],
  );

  // Qty = 3 decimals, Unit Cost and Total Cost = 4 decimals (the columns)
  const totalQty = useMemo(
    () => rows.reduce((sum, row) => sum + (Number(row.txtQty) || 0), 0),
    [rows],
  );

  const formatQty = (quantity: number) =>
    quantity.toLocaleString("en-US", {
      minimumFractionDigits: 3,
      maximumFractionDigits: 3,
    });

  const formatAmount = (amount: number) =>
    amount.toLocaleString("en-US", {
      minimumFractionDigits: 4,
      maximumFractionDigits: 4,
    });

  // ----------------------------------------------------------
  // ADD ROW
  // ----------------------------------------------------------

  const addRow = () => {
    setRows((previous) => [
      ...previous,
      {
        id: previous.length
          ? Math.max(...previous.map((row) => row.id)) + 1
          : 1,
        txtSlNo: previous.length + 1,
        lkpItemID: null,
        lkpItemName: null,
        txtUnit: "",
        txtQty: "",
        txtUnitCost: "",
        txtOriginalSlNo: null,
      },
    ]);
  };

  // ----------------------------------------------------------
  // CLEAR FORM
  // ----------------------------------------------------------

  // as the old Cancel: the grid is emptied and the branch's saved Beginning Stock
  // is loaded again (a branch with none is simply left empty)
  const clearForm = () => {
    setTxtNote("");
    setMessage("");

    if (lkpBranch) {
      setReloadKey((key) => key + 1);
    } else {
      setLkpBranch(lkpDefaultBranch);
      setDtpDate(todayLocal());
      setRows(createInitialRows());
      setActiveRow(0);
    }

    // with a branch the reloaded document puts the cursor on its first empty Item ID;
    // without one it goes to the Branch box
    if (!lkpBranch && !lkpDefaultBranch) {
      window.setTimeout(() => document.getElementById("lkpBranch")?.focus(), 0);
    }
  };

  // ----------------------------------------------------------
  // KEYBOARD NAVIGATION
  // ----------------------------------------------------------

  const handleTableKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>,
    rowIndex: number,
    field: "txtUnit" | "txtQty" | "txtUnitCost",
  ) => {
    if (event.key !== "Enter") return;

    event.preventDefault();

    if (field === "txtUnit") {
      document.getElementById(`txtQty-${rowIndex}`)?.focus();
    } else if (field === "txtQty") {
      document.getElementById(`txtUnitCost-${rowIndex}`)?.focus();
    } else if (rowIndex < rows.length - 1) {
      // on to the next row's Item ID (the Sl.# box is only a number, not a stop)
      setActiveRow(rowIndex + 1);
      document.getElementById(`lkpItemID-${rowIndex + 1}`)?.focus();
    } else {
      addRow();

      window.setTimeout(() => {
        document.getElementById(`lkpItemID-${rowIndex + 1}`)?.focus();
      }, 0);
    }
  };

  // ----------------------------------------------------------
  // SAVE / MODIFY
  //
  // The one button: Save while the branch has no Beginning Stock, Modify once
  // it has one. The rules are the old form's (checked here for a quick answer
  // and again by the server, which is the one that counts): a branch, a date,
  // at least one line, no item twice, and not both Qty and Unit Cost at 0.
  // A posted Beginning Stock is locked.
  // ----------------------------------------------------------

  const actionWord = chkSaved ? "Modify" : "Save";
  const canSaveOrModify = chkSaved ? perms.modify : perms.save;

  const handleSave = async () => {
    if (saving) return;

    if (chkPosted) {
      toast.warning("This Beginning Stock is already posted and cannot be modified.");
      return;
    }

    if (!canSaveOrModify) {
      toast.error(`You do not have permission to ${actionWord}.`);
      return;
    }

    const PstrCoID = localStorage.getItem("PstrCoID");
    const PstrYear = localStorage.getItem("PstrYear");

    if (!PstrCoID || !PstrYear) {
      toast.error("Company ID / Year not found. Please log in again.");
      return;
    }

    if (!lkpBranch) {
      toast.warning("Please select a 'Branch'");
      document.getElementById("lkpBranch")?.focus();
      return;
    }

    if (!dtpDate) {
      toast.warning("Please select 'Date'");
      document.getElementById("dtpDate")?.focus();
      return;
    }

    // the rows that have an item, in grid order (blank rows are skipped)
    const filledRows = rows
      .map((row, index) => ({ row, index }))
      .filter(({ row }) => row.lkpItemID !== null);

    if (filledRows.length === 0) {
      toast.warning("There is no information for saving.");
      document.getElementById("lkpItemID-0")?.focus();
      return;
    }

    const seenItems = new Set<string>();

    for (const [position, { row, index }] of filledRows.entries()) {
      const itemId = (row.lkpItemID as SelectOption).value;

      if (seenItems.has(itemId.toLowerCase())) {
        toast.warning("Item already exists !");
        document.getElementById(`lkpItemID-${index}`)?.focus();
        return;
      }

      seenItems.add(itemId.toLowerCase());

      if ((Number(row.txtQty) || 0) <= 0 && (Number(row.txtUnitCost) || 0) <= 0) {
        toast.warning(
          ` Sl.# : ${position + 1} - Not Both Qty and UnitCost less than or equal to 0.`,
        );
        document.getElementById(`txtQty-${index}`)?.focus();
        return;
      }
    }

    setSaving(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/BeginningStock/saveBeginningStock`,
        {
          method: "POST",
          credentials: "include", // the server checks the session and the rights
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            PstrCoID,
            PstrYear,
            lkpBranch: lkpBranch.value,
            dtpDate,
            txtNote,
            rows: filledRows.map(({ row, index }) => ({
              txtGridRow: index, // where the row sits in the grid (for the focus)
              lkpItemID: (row.lkpItemID as SelectOption).value,
              txtQty: row.txtQty,
              txtUnitCost: row.txtUnitCost,
              txtOriginalSlNo: row.txtOriginalSlNo,
            })),
          }),
        },
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        toast.error(
          result.message ||
            (chkSaved ? "Not Modified,Try again" : "Not Saved,Try again"),
        );

        // the backend names the box that failed - same name as the element id
        if (result.field) {
          document.getElementById(result.field)?.focus();
        }

        return;
      }

      toast.success(
        result.message ||
          (chkSaved ? "Modified" : "Saved"),
      );

      // load the document again - the lines now carry their saved Sl.#
      setReloadKey((key) => key + 1);
    } catch (error) {
      console.error("saveBeginningStock error:", error);
      toast.error("Cannot connect to Beginning Stock API.");
    } finally {
      setSaving(false);
    }
  };

  // ----------------------------------------------------------
  // DELETE
  //
  // The whole Beginning Stock of the branch (the old cmdDelete): it needs the
  // Delete right, there must be one saved, a posted one is locked, and the old
  // question comes first. The server checks the same again.
  // ----------------------------------------------------------

  const handleDelete = async () => {
    if (saving) return;

    if (!chkSaved) {
      toast.warning("There is no Beginning Stock to delete.");
      return;
    }

    if (chkPosted) {
      toast.warning("This Beginning Stock is already posted and cannot be deleted.");
      return;
    }

    if (!perms.delete) {
      toast.error("You do not have permission to Delete.");
      return;
    }

    const PstrCoID = localStorage.getItem("PstrCoID");
    const PstrYear = localStorage.getItem("PstrYear");

    if (!PstrCoID || !PstrYear) {
      toast.error("Company ID / Year not found. Please log in again.");
      return;
    }

    if (!lkpBranch) {
      toast.warning("Please select a 'Branch'");
      document.getElementById("lkpBranch")?.focus();
      return;
    }

    const shouldDelete = await confirm({
      title: SCREEN_TITLE,
      message: "Do you want to delete ?",
    });

    if (!shouldDelete) {
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/BeginningStock/deleteBeginningStock`,
        {
          method: "DELETE",
          credentials: "include", // the server checks the session and the rights
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            PstrCoID,
            PstrYear,
            lkpBranch: lkpBranch.value,
          }),
        },
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        notDeleted(result.message);

        if (result.field) {
          document.getElementById(result.field)?.focus();
        }

        return;
      }

      // (no message for a deleted document: the page just loads the branch again)

      // load the branch again - the document is gone
      setReloadKey((key) => key + 1);
    } catch (error) {
      console.error("deleteBeginningStock error:", error);
      toast.error("Cannot connect to Beginning Stock API.");
    } finally {
      setSaving(false);
    }
  };

  // ----------------------------------------------------------
  // POST
  //
  // The saved Beginning Stock goes into the stock (the old cmdPost): it needs the
  // Post right, there must be one saved, and it must not be posted already. Once
  // posted the page is locked. The server checks the same again.
  // ----------------------------------------------------------

  const handlePost = async () => {
    if (saving) return;

    if (!chkSaved) {
      toast.warning("Beginning Stock not found");
      return;
    }

    if (chkPosted) {
      toast.warning("This Beginning Stock is already posted.");
      return;
    }

    if (!perms.post) {
      toast.error("You do not have permission to Post.");
      return;
    }

    const PstrCoID = localStorage.getItem("PstrCoID");
    const PstrYear = localStorage.getItem("PstrYear");

    if (!PstrCoID || !PstrYear) {
      toast.error("Company ID / Year not found. Please log in again.");
      return;
    }

    if (!lkpBranch) {
      toast.warning("Please select a 'Branch'");
      document.getElementById("lkpBranch")?.focus();
      return;
    }

    const shouldPost = await confirm({
      title: SCREEN_TITLE,
      message: "Do you want to post ?",
    });

    if (!shouldPost) {
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/BeginningStock/postBeginningStock`,
        {
          method: "POST",
          credentials: "include", // the server checks the session and the rights
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            PstrCoID,
            PstrYear,
            lkpBranch: lkpBranch.value,
          }),
        },
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        toast.error(result.message || "Beginning Stock Not Posted");

        if (result.field) {
          document.getElementById(result.field)?.focus();
        }

        return;
      }

      toast.success(result.message || "Beginning Stock Posted");

      // load the branch again - it is posted now, so the page locks
      setReloadKey((key) => key + 1);
    } catch (error) {
      console.error("postBeginningStock error:", error);
      toast.error("Cannot connect to Beginning Stock API.");
    } finally {
      setSaving(false);
    }
  };

  // ----------------------------------------------------------
  // PRINT
  //
  // The saved Beginning Stock is printed (the old cmdPrint): it needs the Print
  // right and there must be one saved. The print page asks the server for the
  // data itself and opens the browser's print window; a posted one can be
  // printed too. The server checks the right again.
  // ----------------------------------------------------------

  // the body of the Print and Excel requests: the branch
  const printBody = (branch: string) =>
    JSON.stringify({
      PstrCoID: localStorage.getItem("PstrCoID"),
      PstrYear: localStorage.getItem("PstrYear"),
      lkpBranch: branch,
    });

  const handlePrint = async () => {
    if (saving || preview) return;

    if (!chkSaved) {
      toast.warning("Beginning Stock not found");
      return;
    }

    if (!perms.print) {
      toast.error("You do not have permission to Print.");
      return;
    }

    if (!lkpBranch) {
      toast.warning("Please select a 'Branch'");
      document.getElementById("lkpBranch")?.focus();
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/BeginningStock/printBeginningStock`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: printBody(lkpBranch.value),
        },
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        toast.error(result.message || "The Beginning Stock could not be printed.");
        return;
      }

      // a name that is never the name of a file that is still open
      const now = new Date();
      const pad = (value: number) => String(value).padStart(2, "0");
      const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;

      setPreview({
        report: { ...result.header, rows: result.data || [] },
        lkpBranch: lkpBranch.value,
        fileBase: `BeginningStock_${lkpBranch.value.replace(/[^A-Za-z0-9_-]/g, "_")}_${stamp}`,
      });
    } catch (error) {
      console.error("printBeginningStock error:", error);
      toast.error("Cannot connect to Beginning Stock API.");
    } finally {
      setSaving(false);
    }
  };

  // the Excel file of the Print Preview, made by the server (null after an error)
  const fetchExcel = async (): Promise<Blob | null> => {
    if (!preview) return null;

    const response = await fetch(
      `${import.meta.env.VITE_API_URL}/BeginningStock/downloadBeginningStockExcel`,
      {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: printBody(preview.lkpBranch),
      },
    );

    // an error comes back as JSON, the file as a blob
    if (!response.ok) {
      let message = "Could not create the Excel file";

      try {
        const result = await response.json();
        message = result.message || message;
      } catch {
        message =
          response.status === 404
            ? "Excel is not available: the downloadBeginningStockExcel route was not found (404)"
            : `Could not create the Excel file (error ${response.status})`;
      }

      toast.error(message);
      return null;
    }

    return response.blob();
  };

  // ----------------------------------------------------------
  // DELETE A ROW (the x of a row): asks first. A line that is saved goes from the
  // database at once, with "Beginning Stock deleted successfully" (the last saved line
  // takes the whole Beginning Stock with it); a line that was never saved only leaves
  // the grid. The cursor goes back to the row's Item ID.
  // ----------------------------------------------------------

  const handleRemoveRow = async (index: number) => {
    if (saving || chkPosted) return;

    const row = rows[index];
    if (!row) return;

    // the line is in the database: it has the Sl.# it was loaded with
    const savedLine = chkSaved && row.txtOriginalSlNo !== null;

    const shouldRemove = await confirm({
      title: SCREEN_TITLE,
      message: `Do you want to delete Line ${index + 1} ?`,
    });

    if (!shouldRemove) return;

    if (savedLine) {
      if (!lkpBranch) return;

      setSaving(true);

      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/BeginningStock/deleteBeginningStockLine`,
          {
            method: "DELETE",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              PstrCoID: localStorage.getItem("PstrCoID"),
              PstrYear: localStorage.getItem("PstrYear"),
              lkpBranch: lkpBranch.value,
              txtSlNo: row.txtOriginalSlNo,
            }),
          },
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
          notDeleted(result.message);
          return;
        }

        // (no message for a deleted line: the line just leaves the grid)

        // the last line took the whole Beginning Stock with it: the page starts again
        if (result.chkDocumentDeleted) {
          setReloadKey((key) => key + 1);
          return;
        }
      } catch (error) {
        console.error("deleteBeginningStockLine error:", error);
        toast.error("Cannot connect to Beginning Stock API.");
        return;
      } finally {
        setSaving(false);
      }
    }

    setRows((previous) => {
      const kept = previous.filter((_, rowIndex) => rowIndex !== index);

      // the grid keeps its length, with empty rows at the end
      let nextId = previous.length ? Math.max(...previous.map((entry) => entry.id)) + 1 : 1;
      const minRows = createInitialRows().length;

      while (kept.length < minRows) {
        kept.push({
          id: nextId++,
          txtSlNo: 0,
          lkpItemID: null,
          lkpItemName: null,
          txtUnit: "",
          txtQty: "",
          txtUnitCost: "",
          txtOriginalSlNo: null,
        });
      }

      // Sl.# is the line's place in the grid
      return kept.map((entry, rowIndex) => ({ ...entry, txtSlNo: rowIndex + 1 }));
    });

    setActiveRow(index);

    // after the grid has been drawn again
    window.setTimeout(() => document.getElementById(`lkpItemID-${index}`)?.focus(), 0);
  };

  // Alt+S -> Save (nothing saved yet), Alt+M -> Modify (saved), Alt+D -> Delete,
  // Alt+P -> Print, Alt+T -> Post (the old Ctrl+T), Alt+C -> Clear. Off while the
  // Print Preview is open: it has its own Alt+P, Alt+D and Alt+C.
  useAltShortcuts(preview ? {} : {
    s: () => {
      if (!chkSaved) handleSave();
    },
    m: () => {
      if (chkSaved) handleSave();
    },
    d: handleDelete,
    p: handlePrint,
    t: handlePost,
    c: clearForm,
  });

  // ----------------------------------------------------------
  // ACTION BUTTONS
  // ----------------------------------------------------------

  const handleAction = (action: string) => {
    if (action === "Clear") {
      clearForm();
      return;
    }

    if (action === "Save") {
      handleSave();
    } else if (action === "Delete") {
      handleDelete();
    } else if (action === "Print") {
      handlePrint();
    } else if (action === "Post") {
      handlePost();
    }
  };

  // ==========================================================
  // JSX
  // ==========================================================

  return (
    // the frame: up to 1200px wide, centred on the light-gray page, 20px from the
    // top. No minimum width (like the Purchase Invoice page): with the side menu
    // open it shrinks to the space it has instead of spilling out under the menu.
    <div className="flex min-h-full w-full justify-center bg-gray-100 px-3 pb-5">
    <main className="mt-5 flex h-fit w-full max-w-300 flex-col overflow-hidden border border-gray-400 bg-white text-[12px] text-slate-700">

      {/* TITLE BAR */}
      <div className="flex h-[28px] w-full shrink-0 items-center bg-[#a7dfc0]">
        <h1 className="ml-[5px] text-[17px] font-semibold text-[#374151]">
          Beginning Stock
        </h1>
      </div>

      {/* FORM BODY - 12px round it, but nothing extra above the Branch row (as
          the Sales Invoice page: the Branch box is ~12px under the title bar) */}
      <div className="m-[12px] flex min-h-0 flex-1 flex-col px-[12px] pb-[12px] pt-0">

      {/* HEADER FORM */}
      <section className="mb-[12px] flex h-[30px] bg-white shrink-0 items-center justify-between gap-4">

        {/* Branch */}
        <div className="flex min-w-0 items-center gap-1 ">
          <label
            htmlFor="lkpBranch"
            className="shrink-0 text-[14px] text-gray-600"
          >
            Branch :
          </label>

          <div className="w-[250px] max-w-full" onKeyDown={(event) => advanceOnEnter(event)}>
            <Select<SelectOption, false>
              inputId="lkpBranch"
              name="lkpBranch"
              options={branchOptions}
              value={lkpBranch}
              // a branch chosen: its document loads, and the cursor goes to the
              // first empty Item ID (see the effect after the load)
              onChange={(option: SingleValue<SelectOption>) => setLkpBranch(option)}
              styles={branchSelectStyles}
              components={{
                ...selectComponents,
                Option: BranchDividedOption,
                MenuList: BranchDividedMenuList,
              }}
              filterOption={filterLabelOrValue}
              noOptionsMessage={() => "No Branch Found"}
              isSearchable
              placeholder="Select Branch"

              // Portal is also enabled for the header dropdown.
              menuPortalTarget={document.body}
              menuPosition="fixed"
              menuPlacement="auto"
            />
          </div>
        </div>

        {/* Date */}
        <div className="flex shrink-0 items-center gap-3">
          <label
            htmlFor="dtpDate"
            className="text-[14px] text-gray-600"
          >
            Date :
          </label>

          <input
            id="dtpDate"
            name="dtpDate"
            type="date"
            value={dtpDate}
            onChange={(event) => setDtpDate(event.target.value)}
            onKeyDown={(event) => {
              // Enter goes on to the first Item ID (a date box does not move on by itself)
              if (event.key === "Enter") {
                event.preventDefault();
                document.getElementById("lkpItemID-0")?.focus();
              }
            }}
            disabled={chkPosted}
            className="input-style w-[142px]"
          />
        </div>
      </section>

      {/* STOCK TABLE */}
<main className="customer-table-scroll flex min-h-0 flex-1 flex-col bg-white">
  <div
    ref={gridScroll.ref}
    // 11 rows show (the heading and 11 rows of 30px); a 12th row brings the scroll bar
    className="customer-table-scroll h-[363px] shrink-0 overflow-auto border border-[#bfe8d0]"
  >
    <table className="customer-table-scroll w-full min-w-[900px] table-fixed border-collapse border border-[#bfe8d0]">
            <colgroup>
              <col style={{ width: "17px" }} />
              <col style={{ width: "43px" }} />
              <col style={{ width: "22%" }} />
              <col style={{ width: "40.5%" }} />
              <col style={{ width: "6%" }} />
              <col style={{ width: "9.5%" }} />
              <col style={{ width: "10.5%" }} />
              <col style={{ width: "11.5%" }} />
            </colgroup>

            <thead className="sticky top-0 z-10 bg-[#edf9f2]">
              <tr className="h-[30px] text-left text-[14px] text-gray-600">
                <th className="border border-[#bfe8d0] px-1 font-normal">
                  
                </th>
                <th className="border border-[#bfe8d0] px-1 text-center font-normal">
                  Line
                </th>
                <th className="border border-[#bfe8d0] px-2 font-normal">
                  Item ID
                </th>
                <th className="border border-[#bfe8d0] px-2 font-normal">
                  Item Name
                </th>
                <th className="border border-[#bfe8d0] px-2 font-normal">
                  Unit
                </th>
                <th className="border border-[#bfe8d0] px-2 text-right font-normal">
                  Qty.
                </th>
                <th className="border border-[#bfe8d0] px-2 text-right font-normal">
                  Unit Cost
                </th>
                <th className="border border-[#bfe8d0] px-2 text-right font-normal">
                  Total Cost
                </th>
              </tr>
            </thead>

            <tbody>
              {rows.map((row, index) => (
                <tr
                  key={row.id}
                  onClick={() => setActiveRow(index)}
                  className={`h-[30px] text-[14px] ${
                    activeRow === index
                      ? "bg-[#f8fcfa]"
                      : "bg-white"
                  }`}
                >
                  {/* ROW SELECTOR */}
                  <td className="border border-[#bfe8d0] px-1 text-center">
                    {activeRow === index && (
                      <span className="text-[10px] text-slate-700">
                        <Play size={10} />
                      </span>
                    )}
                  </td>

                  {/* SERIAL NUMBER */}
                  <td className="border border-[#bfe8d0] p-0">
                    <input
                      id={`txtSlNo-${index}`}
                      name="txtSlNo"
                      aria-label={`Serial number row ${index + 1}`}
                      value={row.txtSlNo}
                      readOnly
                      onKeyDown={(event) => {
                        // Enter on the Sl.# goes on to the Item ID of the row (Tab does too)
                        if (event.key === "Enter") {
                          event.preventDefault();
                          document.getElementById(`lkpItemID-${index}`)?.focus();
                        }
                      }}
                      className="h-[26px] w-full bg-transparent px-1 text-center outline-none"
                    />
                  </td>

                  {/* ITEM ID */}
                  <td className={`border border-[#bfe8d0] p-0 ${cellFocusClass}`}
                    onKeyDown={(event) => advanceOnEnter(event, [`lkpItemName-${index}`])}
                  >
                    <Select<SelectOption, false>
                      inputId={`lkpItemID-${index}`}
                      name="lkpItemID"
                      options={itemOptions}
                      value={row.lkpItemID}
                      onChange={(option: SingleValue<SelectOption>) => {
                        updateRow(index, "lkpItemID", option);
                        if (option) advanceAfterPick(`lkpItemID-${index}`, [`lkpItemName-${index}`]);
                      }}
                      styles={
                        {
                          ...tableSelectStyles,
                          ...makePairDividedMenuStyles(idMenuHang),
                        } as StylesConfig<SelectOption, false>
                      }
                      onMenuOpen={() =>
                        measureIdMenuHang(`lkpItemID-${index}`, `lkpItemName-${index}`)
                      }
                      components={itemIdComponents}
                      filterOption={filterPairOption}
                      noOptionsMessage={() => "No Item Found"}
                      isSearchable
                      isClearable={false}
                      isDisabled={chkPosted}
                      placeholder=""

                      // FIX: render outside the scrollable table.
                      menuPortalTarget={document.body}
                      menuPosition="fixed"
                      menuPlacement="auto"
                      menuShouldScrollIntoView
                    />
                  </td>

                  {/* ITEM NAME */}
                  <td className={`border border-[#bfe8d0] p-0 ${cellFocusClass}`}
                    onKeyDown={(event) => advanceOnEnter(event)}
                  >
                    <Select<SelectOption, false>
                      inputId={`lkpItemName-${index}`}
                      name="lkpItemName"
                      options={itemNameOptions}
                      value={row.lkpItemName}
                      onChange={(option: SingleValue<SelectOption>) => {
                        updateRow(index, "lkpItemName", option);
                        if (option) advanceAfterPick(`lkpItemName-${index}`);
                      }}
                      styles={
                        {
                          ...tableSelectStyles,
                          ...makePairDividedMenuStyles(nameMenuHang),
                        } as StylesConfig<SelectOption, false>
                      }
                      onMenuOpen={() =>
                        measureNameMenuHang(`lkpItemName-${index}`, `txtUnitCost-${index}`)
                      }
                      components={itemNameComponents}
                      filterOption={filterPairOption}
                      noOptionsMessage={() => "No Item Found"}
                      isSearchable
                      isClearable={false}
                      isDisabled={chkPosted}
                      placeholder=""

                      // FIX: render outside the scrollable table.
                      menuPortalTarget={document.body}
                      menuPosition="fixed"
                      menuPlacement="auto"
                      menuShouldScrollIntoView
                    />
                  </td>

                  {/* UNIT */}
                  <td className="border border-[#bfe8d0] p-0">
                    <input
                      id={`txtUnit-${index}`}
                      name="txtUnit"
                      value={row.txtUnit}
                      readOnly
                      onKeyDown={(event) =>
                        handleTableKeyDown(event, index, "txtUnit")
                      }
                      className="h-[26px] w-full bg-transparent px-2 outline-none focus:bg-[#f1f8ff]"
                    />
                  </td>

                  {/* QUANTITY */}
                  <td className={`border border-[#bfe8d0] p-0 ${cellFocusClass}`}>
                    <input
                      id={`txtQty-${index}`}
                      name="txtQty"
                      type="number"
                      min="0"
                      step="0.001"
                      value={row.txtQty}
                      readOnly={chkPosted}
                      onChange={(event) =>
                        updateTextField(index, "txtQty", event.target.value)
                      }
                      onFocus={selectOnFocus}
                      onBlur={(event) =>
                        showDecimals(index, "txtQty", event.target.value)
                      }
                      onKeyDown={(event) =>
                        handleTableKeyDown(event, index, "txtQty")
                      }
                      className="number-no-spinner h-[26px] w-full bg-transparent px-2 text-right outline-none focus:bg-[#f1f8ff]"
                    />
                  </td>

                  {/* UNIT COST */}
                  <td className={`border border-[#bfe8d0] p-0 ${cellFocusClass}`}>
                    <input
                      id={`txtUnitCost-${index}`}
                      name="txtUnitCost"
                      type="number"
                      min="0"
                      step="0.0001"
                      value={row.txtUnitCost}
                      readOnly={chkPosted}
                      onChange={(event) =>
                        updateTextField(
                          index,
                          "txtUnitCost",
                          event.target.value,
                        )
                      }
                      onFocus={selectOnFocus}
                      onBlur={(event) =>
                        showDecimals(index, "txtUnitCost", event.target.value)
                      }
                      onKeyDown={(event) =>
                        handleTableKeyDown(event, index, "txtUnitCost")
                      }
                      className="number-no-spinner h-[26px] w-full bg-transparent px-2 text-right outline-none focus:bg-[#f1f8ff]"
                    />
                  </td>

                  {/* TOTAL COST (with the x of the row after it) */}
                  <td className="border border-[#bfe8d0] p-0">
                    <div className="flex items-center">
                      <input
                        id={`txtTotalCost-${index}`}
                        name="txtTotalCost"
                        value={
                          row.txtQty !== "" || row.txtUnitCost !== ""
                            ? formatAmount(getTotalCost(row))
                            : ""
                        }
                        readOnly
                        className="h-[26px] min-w-0 flex-1 bg-transparent px-2 text-right outline-none"
                      />

                      {/* the slot is always there so the amounts do not move when the x shows */}
                      <span className="flex w-6 shrink-0 items-center justify-center">
                        {row.lkpItemID && !chkPosted && (
                          <button
                            id={`btnRemoveRow-${index}`}
                            name="btnRemoveRow"
                            type="button"
                            tabIndex={-1}
                            title="Remove row"
                            aria-label={`Remove row ${index + 1}`}
                            onClick={() => handleRemoveRow(index)}
                            className="text-[12px] leading-none text-gray-400 hover:text-red-600"
                          >
                            ✕
                          </button>
                        )}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      {/* BOTTOM FORM: a one-row table with the SAME column widths as the grid
          above, so the total quantity sits exactly under the Qty. column and the
          total cost exactly under the Total Cost column */}
      <section className="shrink-0 bg-white">
        <div
          className="border border-transparent"
          style={{ paddingRight: gridScroll.width }}
        >
          <table className="w-full min-w-[900px] table-fixed border-collapse border border-transparent">
            <colgroup>
              <col style={{ width: "17px" }} />
              <col style={{ width: "43px" }} />
              <col style={{ width: "22%" }} />
              <col style={{ width: "40.5%" }} />
              <col style={{ width: "6%" }} />
              <col style={{ width: "9.5%" }} />
              <col style={{ width: "10.5%" }} />
              <col style={{ width: "11.5%" }} />
            </colgroup>

            <tbody>
              <tr className="h-[60px]">
                {/* NOTE (under the first four columns) */}
                <td colSpan={4} className="p-0 pr-3">
                  <div className="flex items-center gap-3">
                    <label
                      htmlFor="txtNote"
                      className="w-[32px] shrink-0 text-[14px] text-gray-600"
                    >
                      Note
                    </label>

                    <input
                      id="txtNote"
                      name="txtNote"
                      value={txtNote}
                      maxLength={100}
                      readOnly={chkPosted}
                      onChange={(event) => setTxtNote(event.target.value)}
                      className="input-style w-full min-w-0"
                    />
                  </div>
                </td>

                {/* TOTAL LABEL (under the Unit column) */}
                <td className="p-0 pr-[4px]">
                  <div className="flex h-[30px] w-full items-center justify-center rounded border border-[#d7dee7] bg-white text-[14px] text-gray-600">
                    Total
                  </div>
                </td>

                {/* TOTAL QUANTITY (under the Qty. column) */}
                <td className="p-0">
                  <input
                    id="txtTotalQty"
                    name="txtTotalQty"
                    value={formatQty(totalQty)}
                    readOnly
                    className="input-style w-full min-w-0 text-right"
                  />
                </td>

                {/* nothing under Unit Cost */}
                <td className="p-0" />

                {/* TOTAL COST (under the Total Cost column) */}
                <td className="p-0">
                  <input
                    id="txtTotalCost"
                    name="txtTotalCost"
                    value={formatAmount(total)}
                    readOnly
                    className="input-style w-full min-w-0 text-right"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* the "Do you want to delete ?" question */}
      {confirmDialog}

      {/* the Print Preview (after Print) */}
      {preview && (
        <ReportPreview
          html={buildHtml(preview.report)}
          fileBase={preview.fileBase}
          onPrint={() => printBeginningStockReport(preview.report)}
          buildPdf={() => buildBeginningStockPdf(preview.report)}
          fetchExcel={fetchExcel}
          onClose={() => setPreview(null)}
        />
      )}

      {/* SAVED BY / LAST MODIFIED BY */}
      {txtUserInfo !== "" && (
        <table className="self-end border-collapse text-left text-[12px] text-gray-500">
          <tbody>
            {/* one row per line ("Saved By : ..." / "Last Modified By : ..."), in
                three columns - label, colon, text - so the colons line up */}
            {txtUserInfo.split("\n").map((line) => {
              const [label, ...rest] = line.split(" : ");

              return (
                <tr key={label}>
                  <td className="whitespace-nowrap pr-[4px]">{label}</td>
                  <td className="pr-[4px]">:</td>
                  <td className="whitespace-nowrap">{rest.join(" : ")}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {/* ACTION BUTTONS */}
      <footer className="mt-[14px] flex shrink-0 flex-wrap items-center justify-center gap-3">
        {["Save", "Delete", "Print", "Post", "Clear"].map((action) => {
          const isSave = action === "Save";
          const label = isSave ? actionWord : action;

          return (
            <button
              key={action}
              id={isSave ? (chkSaved ? "btnModify" : "btnSave") : `btn${action}`}
              name={isSave ? (chkSaved ? "btnModify" : "btnSave") : `btn${action}`}
              type="button"
              onClick={() => handleAction(action)}
              disabled={
                isSave
                  ? !canSaveOrModify || saving || chkPosted
                  : action === "Delete"
                    ? !chkSaved || chkPosted || !perms.delete || saving
                    : action === "Post"
                      ? !chkSaved || chkPosted || !perms.post || saving
                      : action === "Print"
                        ? !chkSaved || !perms.print || saving
                        : false
              }
              className="btn-style disabled:cursor-not-allowed disabled:opacity-40"
            >
              <span className="underline underline-offset-2">
                {label.charAt(0)}
              </span>
              {label.slice(1)}
            </button>
          );
        })}
      </footer>

      </div>
    </main>
    </div>
  );
};

export default BeginningStockPage;