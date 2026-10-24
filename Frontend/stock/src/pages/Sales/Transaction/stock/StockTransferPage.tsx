import { Play } from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import Select, {
  type SingleValue,
  type StylesConfig,
} from "react-select";
import { toast } from "react-toastify";
import {
  makePairComponents,
  filterPairOption,
  makePairDividedMenuStyles,
} from "../../../../components/PairSelect/pairSelectParts";
import { useScrollbarWidth } from "../../../../hooks/useScrollbarWidth";
import { useAdvanceAfterSelect } from "../../../../hooks/useAdvanceAfterSelect";
import { usePairMenuHang } from "../../../../hooks/usePairMenuHang";
import { useAltShortcuts } from "../../../../hooks/useAltShortcuts";
import { useInitialFocus } from "../../../../hooks/useInitialFocus";
import { useGridCellFocus } from "../../../../hooks/useGridCellFocus";
import { useDeleteToast } from "../../../../hooks/useDeleteToast";
import { useConfirmModal } from "../../../../hooks/useConfirmModal";
import ReportPreview from "../../../../components/common/ReportPreview";
import { buildStockTransferPdf } from "../../../../components/Transaction/StockTransfer/StockTransferPdf";
import {
  buildHtml,
  printStockTransferReport,
  type PrintReport,
} from "../../../../components/Transaction/StockTransfer/StockTransferPrintReport";
import { useButtonPermissions } from "../../../../hooks/useButtonPermissions";
import {
  BranchDividedMenuList,
  BranchDividedOption,
  branchMenuStyles,
  filterLabelOrValue,
} from "../../../../components/BranchSelect/branchSelectParts";
import selectComponents from "../../../../components/sharecomponents/selectComponents";

// ============================================================
// STOCK TRANSFER (the old frmST)
//
// Moves stock from the Branch (From) to the Transfer To branch. One transfer is
// saved as two sets of rows - the OUT rows in the From branch and the IN rows in
// the To branch - under one Entry No. (made by the server from the branch's ST
// setting). The Qty can't be more than the From branch has in stock, and the
// Unit Cost is the branch's current cost. Posting is not on this page yet.
//
// Names follow the rule: state = element id/name = payload key = response key
// (lkpBranch, txtDocNo, lkpToBranch, dtpDate, txtNote, lkpItemID, txtQty ...).
// ============================================================

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
  txtPacking: string;
  txtQty: string;
  txtUnitCost: string;
  // what the From branch has of the item (for the Out of Stock warning)
  txtStock: number | null;
  // the Sl.# the line had when it was loaded (null for a new line)
  txtOriginalSlNo: number | null;
}

// an item of the branch, as the server gives it
interface ItemRecord {
  lkpItemID: string;
  txtItemName: string;
  txtUnit: string;
  txtPacking: string;
}

// dbo.tblmenu fmenuid of the Stock Transfer page
const MENU_ID = "020103";

// the title of the question windows
const SCREEN_TITLE = "Stock Transfer";

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
// The Item Name box's list reaches the right edge of the Qty. column: the part past
// the Item Name box is its Item ID column, measured when the list opens (see
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
    txtPacking: "",
    txtQty: "",
    txtUnitCost: "",
    txtStock: null,
    txtOriginalSlNo: null,
  }));

// ============================================================
// COMPONENT
// ============================================================

const StockTransferPage: React.FC = () => {
  // the Branch (From) box: only the branches the user has a right to, with the
  // user's default branch selected when the page opens
  const [branchOptions, setBranchOptions] = useState<SelectOption[]>([]);
  const [lkpDefaultBranch, setLkpDefaultBranch] = useState<SelectOption | null>(null);
  const [lkpBranch, setLkpBranch] = useState<SelectOption | null>(null);

  // the Transfer To box: every branch of the company
  const [toBranchOptions, setToBranchOptions] = useState<SelectOption[]>([]);
  const [lkpToBranch, setLkpToBranch] = useState<SelectOption | null>(null);

  // the Entry No. and its settings (from the branch's ST setting)
  const [txtDocNo, setTxtDocNo] = useState("");
  const [txtNextDocNo, setTxtNextDocNo] = useState("");
  // the Entry No. whose document was last loaded (or made by the page): leaving
  // the Entry No. box WITHOUT changing it must not load again - that would empty
  // the page
  const loadedDocNoRef = useRef("");
  const [chkStrictSerial, setChkStrictSerial] = useState(false);

  const [dtpDate, setDtpDate] = useState(todayLocal);
  const [txtNote, setTxtNote] = useState("");
  const [txtStock, setTxtStock] = useState("");
  const [rows, setRows] = useState<StockRow[]>(createInitialRows);
  // the branch list and the default branch have been loaded (the cursor can start)
  const [branchesLoaded, setBranchesLoaded] = useState(false);
  const [activeRow, setActiveRow] = useState(0);

  const perms = useButtonPermissions(MENU_ID);
  // the common themed question window (the same as the Purchase Invoice screen)
  const { confirm, dialog: confirmDialog } = useConfirmModal();

  // the Print Preview (after Print): the report the server sent, and the branch and
  // Entry No. it was made for (the Excel file is made for the same ones)
  const [preview, setPreview] = useState<{
    report: PrintReport;
    lkpBranch: string;
    txtDocNo: string;
    fileBase: string;
  } | null>(null);

  // the items of the chosen branch (not blocked for it)
  const [items, setItems] = useState<ItemRecord[]>([]);

  // the saved document of the Entry No.
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
  // the cell the cursor is in is outlined; a typed-in box has its text selected
  const { cellFocusClass, selectOnFocus } = useGridCellFocus();
  // the standard messages of a delete (the same on every screen)
  const { deleted, notDeleted } = useDeleteToast(SCREEN_TITLE);
  // ... and the Item Name list covers the columns up to Qty.
  const { hang: nameMenuHang, measure: measureNameMenuHang } = usePairMenuHang(210);

  // the grid's scroll bar narrows its columns; the totals row below gets the same
  // amount as padding so its boxes end where the grid's columns end
  const gridScroll = useScrollbarWidth<HTMLDivElement>();

  const api = import.meta.env.VITE_API_URL;

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
  // LOAD THE BRANCHES (From and To) once
  // ----------------------------------------------------------

  useEffect(() => {
    const loadBranches = async () => {
      try {
        const PstrCoID = localStorage.getItem("PstrCoID");

        if (!PstrCoID) {
          toast.error("getBranchList: no PstrCoID in localStorage");
          return;
        }

        const [fromResponse, toResponse] = await Promise.all([
          fetch(`${api}/StockTransfer/getBranchList?PstrCoID=${PstrCoID}`, {
            credentials: "include",
          }),
          fetch(`${api}/StockTransfer/getToBranchList?PstrCoID=${PstrCoID}`, {
            credentials: "include",
          }),
        ]);

        const fromResult = await fromResponse.json();
        const toResult = await toResponse.json();

        if (!fromResponse.ok || !fromResult.success) {
          toast.error(`getBranchList failed: ${fromResult.message}`);
          return;
        }

        if (!toResponse.ok || !toResult.success) {
          toast.error(`getToBranchList failed: ${toResult.message}`);
          return;
        }

        const options: SelectOption[] = (fromResult.data || []).map(
          (row: { lkpBranch: string; txtBranchName: string }) => ({
            value: row.lkpBranch,
            label: row.txtBranchName,
          }),
        );

        const toOptions: SelectOption[] = (toResult.data || []).map(
          (row: { lkpToBranch: string; txtToBranchName: string }) => ({
            value: row.lkpToBranch,
            label: row.txtToBranchName,
          }),
        );

        const initial =
          options.find((option) => option.value === fromResult.lkpDefaultBranch) ??
          null;

        setBranchOptions(options);
        setToBranchOptions(toOptions);
        setLkpDefaultBranch(initial);
        setLkpBranch(initial);
      } catch (error) {
        console.error("loadBranches (stock transfer) error:", error);
        toast.error(
          `Stock Transfer load error: ${error instanceof Error ? error.message : String(error)}`,
        );
      } finally {
        setBranchesLoaded(true);
      }
    };

    loadBranches();
  }, []);

  // where the cursor starts: Entry No. when a branch is already chosen (the user's
  // default branch), else the Branch box
  useInitialFocus(branchesLoaded, lkpBranch ? "txtDocNo" : "lkpBranch");

  // ----------------------------------------------------------
  // THE DOCUMENT STATE, emptied (the old ClearMe): the grid, the To branch, the
  // note and the saved-by line; the button says Save again
  // ----------------------------------------------------------

  const resetDocument = () => {
    setRows(createInitialRows());
    setActiveRow(0);
    setLkpToBranch(null);
    setTxtNote("");
    setTxtStock("");
    setTxtUserInfo("");
    setChkSaved(false);
    setChkPosted(false);
  };

  // ----------------------------------------------------------
  // THE NEXT ENTRY NO. of the branch (the old GetNextDocNo)
  // ----------------------------------------------------------

  const loadNextDocNo = async (branchValue: string) => {
    try {
      const PstrCoID = localStorage.getItem("PstrCoID");
      const PstrYear = localStorage.getItem("PstrYear");

      if (!PstrCoID || !PstrYear) return;

      const response = await fetch(
        `${api}/StockTransfer/getNextDocNo?PstrCoID=${PstrCoID}&PstrYear=${PstrYear}&lkpBranch=${encodeURIComponent(branchValue)}`,
        { credentials: "include" },
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        setTxtDocNo("");
        setTxtNextDocNo("");
        toast.error(result.message || "The next Entry No. could not be made");
        return;
      }

      setTxtDocNo(result.txtDocNo);
      setTxtNextDocNo(result.txtDocNo);
      loadedDocNoRef.current = result.txtDocNo;
      setChkStrictSerial(Boolean(result.chkStrictSerial));
    } catch (error) {
      console.error("getNextDocNo error:", error);
      toast.error("Cannot connect to Stock Transfer API.");
    }
  };

  // ----------------------------------------------------------
  // THE SAVED DOCUMENT of an Entry No. (the old txtDocNo_Leave): a saved one
  // fills the page and the button says Modify; none leaves the page ready to Save
  // ----------------------------------------------------------

  const loadDocument = async (
    branchValue: string,
    docNo: string,
    loadedItems: ItemRecord[] = items,
    toOptions: SelectOption[] = toBranchOptions,
  ) => {
    try {
      const PstrCoID = localStorage.getItem("PstrCoID");
      const PstrYear = localStorage.getItem("PstrYear");

      if (!PstrCoID || !PstrYear || docNo.trim() === "") return;

      loadedDocNoRef.current = docNo.trim();

      const response = await fetch(
        `${api}/StockTransfer/getStockTransfer?PstrCoID=${PstrCoID}&PstrYear=${PstrYear}&lkpBranch=${encodeURIComponent(branchValue)}&txtDocNo=${encodeURIComponent(docNo.trim())}`,
        { credentials: "include" },
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        toast.error(result.message || "Failed to load the Stock Transfer");
        return;
      }

      if (!result.chkSaved) {
        // a number with no document: ready to Save (the old "Strictly Serial" warning)
        resetDocument();

        if (chkStrictSerial && docNo.trim() !== txtNextDocNo) {
          toast.warning("Entry No. should be Strictly Serial.");
        }

        return;
      }

      const savedRows: StockRow[] = (result.data || []).map(
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
            txtPacking: item?.txtPacking ?? "",
            txtQty: Number(line.txtQty).toFixed(3),
            txtUnitCost: Number(line.txtUnitCost).toFixed(4),
            txtStock: null,
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

      setRows([...savedRows, ...blankRows]);
      setActiveRow(0);
      setChkSaved(true);
      setChkPosted(Boolean(result.chkPosted));
      setDtpDate(result.header?.dtpDate || todayLocal());
      setTxtNote(result.header?.txtNote ?? "");
      setLkpToBranch(
        toOptions.find((option) => option.value === result.header?.lkpToBranch) ??
          null,
      );

      // "Saved By : X date / Last Modified By : Y date", as the old form showed
      const header = result.header;
      let info = "";

      if (header?.txtSavedBy) {
        info = `Saved By : ${header.txtSavedBy} ${header.txtSavedOn ?? ""}`;
      }

      if (header?.txtModifiedBy) {
        info += `\nLast Modified By : ${header.txtModifiedBy} ${header.txtModifiedOn ?? ""}`;
      }

      setTxtUserInfo(info);

      if (result.chkPosted) {
        toast.info("This Stock Transfer is posted: it is locked.");
      }
    } catch (error) {
      console.error("getStockTransfer error:", error);
      toast.error(
        `Stock Transfer load error: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  };

  // ----------------------------------------------------------
  // THE BRANCH CHANGED: its items, its next Entry No., an empty document (or,
  // coming back from the print page, the transfer that was printed)
  // ----------------------------------------------------------

  useEffect(() => {
    if (!lkpBranch) {
      setItems([]);
      resetDocument();
      setTxtDocNo("");
      setTxtNextDocNo("");
      return;
    }

    let cancelled = false;

    const loadBranch = async () => {
      try {
        const PstrCoID = localStorage.getItem("PstrCoID");

        if (!PstrCoID) return;

        const response = await fetch(
          `${api}/StockTransfer/getItemList?PstrCoID=${PstrCoID}&lkpBranch=${encodeURIComponent(lkpBranch.value)}`,
          { credentials: "include" },
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
          toast.error(`getItemList failed: ${result.message}`);
          return;
        }

        if (cancelled) return;

        const loadedItems: ItemRecord[] = (result.data || []).map(
          (row: {
            lkpItemID: string;
            txtItemName: string | null;
            txtUnit: string | null;
            txtPacking: string | null;
          }) => ({
            lkpItemID: row.lkpItemID,
            txtItemName: row.txtItemName ?? row.lkpItemID,
            txtUnit: row.txtUnit ?? "",
            txtPacking: row.txtPacking === null ? "" : String(Number(row.txtPacking)),
          }),
        );

        setItems(loadedItems);
        resetDocument();
        await loadNextDocNo(lkpBranch.value);
      } catch (error) {
        console.error("loadBranch (stock transfer) error:", error);
        toast.error(
          `Stock Transfer load error: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    };

    loadBranch();

    return () => {
      cancelled = true;
    };
  }, [lkpBranch]);

  // ----------------------------------------------------------
  // THE STOCK AND COST OF A CHOSEN ITEM (the old GetItemStock / GetUnitCost):
  // the Stock box shows it, the Unit Cost of the row is filled, and an item with
  // no stock gets the old "Out Of Stock" warning (the item stays in the row)
  // ----------------------------------------------------------

  const fetchItemStock = async (rowId: number, itemId: string, rowIndex: number) => {
    try {
      const PstrCoID = localStorage.getItem("PstrCoID");
      const PstrYear = localStorage.getItem("PstrYear");

      if (!PstrCoID || !PstrYear || !lkpBranch) return;

      const response = await fetch(
        `${api}/StockTransfer/getItemStock?PstrCoID=${PstrCoID}&PstrYear=${PstrYear}&lkpBranch=${encodeURIComponent(lkpBranch.value)}&lkpItemID=${encodeURIComponent(itemId)}&txtDocNo=${encodeURIComponent(txtDocNo.trim())}`,
        { credentials: "include" },
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        toast.error(result.message || "Failed to load the stock of the item");
        return;
      }

      const stock = Number(result.txtStock);

      setTxtStock(stock.toLocaleString("en-US", { maximumFractionDigits: 3 }));

      // no stock: only a warning - the item stays in the row and the transfer can still be
      // saved (it cannot be posted without the stock). The message is shown HERE, once - not
      // inside setRows, which React may run twice.
      if (stock <= 0) {
        toast.warning(`Out Of Stock for the Item  : ${itemId} - this branch has no stock of it`);
      }

      setRows((previous) =>
        previous.map((row) =>
          row.id === rowId
            ? {
                ...row,
                txtStock: stock,
                txtUnitCost: Number(result.txtUnitCost).toFixed(4),
              }
            : row,
        ),
      );

      // the item has stock (Enter / Tab / click picked it): on to Qty.
      if (stock > 0) {
        advanceAfterPick(`lkpItemID-${rowIndex}`, [`lkpItemName-${rowIndex}`]);
      }
    } catch (error) {
      console.error("getItemStock error:", error);
      toast.error("Cannot connect to Stock Transfer API.");
    }
  };

  // ----------------------------------------------------------
  // THE STOCK OF THE ROW YOU ARE ON: clicking a row, or its Item ID / Item Name /
  // Qty. box, shows that row's item stock in the Stock box. A row already
  // looked up uses what it has; a saved row (loaded from the server) is looked
  // up now - its Unit Cost is left as saved.
  // ----------------------------------------------------------

  const showRowStock = async (rowIndex: number) => {
    const row = rows[rowIndex];

    if (!row || !row.lkpItemID) {
      setTxtStock("");
      return;
    }

    const format = (value: number) =>
      value.toLocaleString("en-US", { maximumFractionDigits: 3 });

    if (row.txtStock !== null) {
      setTxtStock(format(row.txtStock));
      return;
    }

    try {
      const PstrCoID = localStorage.getItem("PstrCoID");
      const PstrYear = localStorage.getItem("PstrYear");

      if (!PstrCoID || !PstrYear || !lkpBranch) return;

      const response = await fetch(
        `${api}/StockTransfer/getItemStock?PstrCoID=${PstrCoID}&PstrYear=${PstrYear}&lkpBranch=${encodeURIComponent(lkpBranch.value)}&lkpItemID=${encodeURIComponent(row.lkpItemID.value)}&txtDocNo=${encodeURIComponent(txtDocNo.trim())}`,
        { credentials: "include" },
      );

      const result = await response.json();

      if (!response.ok || !result.success) return;

      const stock = Number(result.txtStock);

      setTxtStock(format(stock));
      setRows((previous) =>
        previous.map((entry) =>
          entry.id === row.id ? { ...entry, txtStock: stock } : entry,
        ),
      );
    } catch (error) {
      console.error("showRowStock error:", error);
    }
  };

  // ----------------------------------------------------------
  // UPDATE ROW
  // ----------------------------------------------------------

  const updateRow = (
    rowIndex: number,
    field: keyof StockRow,
    value: string | number | SelectOption | null,
  ) => {
    setRows((previous) =>
      previous.map((row, index) => {
        if (index !== rowIndex) return row;

        const updated = { ...row, [field]: value } as StockRow;

        // Keep Item ID and Item Name synchronized.
        if (field === "lkpItemID") {
          const selected = value as SelectOption | null;

          updated.lkpItemName = selected
            ? itemNameOptions.find((option) => option.value === selected.value) ??
              null
            : null;
        }

        if (field === "lkpItemName") {
          const selected = value as SelectOption | null;

          updated.lkpItemID = selected
            ? itemOptions.find((option) => option.value === selected.value) ?? null
            : null;
        }

        // the unit and packing come from the item; clearing the item clears the
        // whole row, as the old form's ClearRow
        if (field === "lkpItemID" || field === "lkpItemName") {
          const selected = value as SelectOption | null;
          const item = selected
            ? items.find((entry) => entry.lkpItemID === selected.value)
            : undefined;

          updated.txtUnit = item?.txtUnit ?? "";
          updated.txtPacking = item?.txtPacking ?? "";
          updated.txtStock = null;

          if (!selected) {
            updated.txtQty = "";
            updated.txtUnitCost = "";
          }
        }

        return updated;
      }),
    );
  };

  // an item was chosen in a row: the stock and the cost of it are looked up
  const pickItem = (rowIndex: number, field: "lkpItemID" | "lkpItemName", option: SelectOption | null) => {
    updateRow(rowIndex, field, option);

    if (option) {
      fetchItemStock(rows[rowIndex].id, option.value, rowIndex);
    } else {
      setTxtStock("");
    }
  };

  // ----------------------------------------------------------
  // QUANTITY
  // ----------------------------------------------------------

  const updateQty = (rowIndex: number, value: string) => {
    updateRow(rowIndex, "txtQty", value);
  };

  // on leaving the box: 3 decimals, and the old "Out Of Stock" warning (only a warning:
  // the transfer can still be saved)
  const showQty = (rowIndex: number, value: string) => {
    if (value === "" || Number.isNaN(Number(value))) return;

    const qty = Number(value);
    const stock = rows[rowIndex].txtStock;

    updateRow(rowIndex, "txtQty", qty.toFixed(3));

    if (stock !== null && qty > stock) {
      toast.warning(`Out Of Stock for the Item  : ${rows[rowIndex].lkpItemID?.value ?? ""}`);
    }
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

  const totalQty = useMemo(
    () => rows.reduce((sum, row) => sum + (Number(row.txtQty) || 0), 0),
    [rows],
  );

  // Qty = 3 decimals, Unit Cost and Total Cost = 4 decimals (the columns)
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
        id: previous.length ? Math.max(...previous.map((row) => row.id)) + 1 : 1,
        txtSlNo: previous.length + 1,
        lkpItemID: null,
        lkpItemName: null,
        txtUnit: "",
        txtPacking: "",
        txtQty: "",
        txtUnitCost: "",
        txtStock: null,
        txtOriginalSlNo: null,
      },
    ]);
  };

  // ----------------------------------------------------------
  // CANCEL (the old cmdCancel): the page is emptied and the next Entry No. shown
  // ----------------------------------------------------------

  const clearForm = () => {
    resetDocument();
    setDtpDate(todayLocal());

    if (lkpBranch) {
      loadNextDocNo(lkpBranch.value);
    } else {
      setLkpBranch(lkpDefaultBranch);
    }

    // the cursor goes where it started: Entry No. when a branch is chosen, else Branch
    window.setTimeout(
      () =>
        document
          .getElementById(lkpBranch || lkpDefaultBranch ? "txtDocNo" : "lkpBranch")
          ?.focus(),
      0,
    );
  };

  // ----------------------------------------------------------
  // KEYBOARD NAVIGATION
  // ----------------------------------------------------------

  const handleQtyKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>,
    rowIndex: number,
  ) => {
    if (event.key !== "Enter") return;

    event.preventDefault();

    if (rowIndex < rows.length - 1) {
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
  // The one button: Save for a new Entry No., Modify once it has a document. The
  // rules are the old form's (checked here for a quick answer and again by the
  // server, which is the one that counts).
  // ----------------------------------------------------------

  const actionWord = chkSaved ? "Modify" : "Save";
  const canSaveOrModify = chkSaved ? perms.modify : perms.save;

  const handleSave = async () => {
    if (saving) return;

    if (chkPosted) {
      toast.warning("This Stock Transfer is already posted and cannot be modified.");
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
      toast.warning("Please select 'Branch'");
      document.getElementById("lkpBranch")?.focus();
      return;
    }

    if (txtDocNo.trim() === "") {
      toast.warning("Please enter 'Entry No'");
      document.getElementById("txtDocNo")?.focus();
      return;
    }

    if (!lkpToBranch) {
      toast.warning("Please select 'Branch To'");
      document.getElementById("lkpToBranch")?.focus();
      return;
    }

    if (lkpToBranch.value === lkpBranch.value) {
      toast.warning("You can't transfer to the same branch");
      document.getElementById("lkpToBranch")?.focus();
      return;
    }

    if (!dtpDate) {
      toast.warning("Please enter 'Date'");
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
        toast.warning("Item already exits !");
        document.getElementById(`lkpItemID-${index}`)?.focus();
        return;
      }

      seenItems.add(itemId.toLowerCase());

      if ((Number(row.txtQty) || 0) <= 0) {
        toast.warning(` Sl.# : ${position + 1} - Qty. can't be less than or equal to 0.`);
        document.getElementById(`txtQty-${index}`)?.focus();
        return;
      }
    }

    setSaving(true);

    try {
      const response = await fetch(`${api}/StockTransfer/saveStockTransfer`, {
        method: "POST",
        credentials: "include", // the server checks the session and the rights
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          PstrCoID,
          PstrYear,
          lkpBranch: lkpBranch.value,
          txtDocNo: txtDocNo.trim(),
          lkpToBranch: lkpToBranch.value,
          dtpDate,
          txtNote,
          chkSaved,
          rows: filledRows.map(({ row, index }) => ({
            txtGridRow: index, // where the row sits in the grid (for the focus)
            lkpItemID: (row.lkpItemID as SelectOption).value,
            txtQty: row.txtQty,
            txtUnitCost: row.txtUnitCost,
            txtOriginalSlNo: row.txtOriginalSlNo,
          })),
        }),
      });

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

      toast.success(result.message || (chkSaved ? "Modified" : "Saved"));

      // a line without enough stock does not stop the save: it is saved, and each such item
      // gets the "Out Of Stock" warning (it cannot be posted without the stock)
      for (const warning of (result.warnings ?? []) as string[]) {
        toast.warning(warning);
      }

      // as the old form: the page is emptied and the next Entry No. shown
      resetDocument();
      setDtpDate(todayLocal());
      await loadNextDocNo(lkpBranch.value);
    } catch (error) {
      console.error("saveStockTransfer error:", error);
      toast.error("Cannot connect to Stock Transfer API.");
    } finally {
      setSaving(false);
    }
  };

  // ----------------------------------------------------------
  // DELETE
  //
  // The whole transfer (the old cmdDelete): it needs the Delete right, there must
  // be a saved transfer, a posted one is locked, and the old question comes
  // first. The server checks the same again.
  // ----------------------------------------------------------

  const handleDelete = async () => {
    if (saving) return;

    if (!chkSaved) {
      toast.warning("There is no Stock Transfer to delete.");
      return;
    }

    if (chkPosted) {
      toast.warning("This Stock Transfer is already posted and cannot be deleted.");
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
      toast.warning("Please select 'Branch'");
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
      const response = await fetch(`${api}/StockTransfer/deleteStockTransfer`, {
        method: "DELETE",
        credentials: "include", // the server checks the session and the rights
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          PstrCoID,
          PstrYear,
          lkpBranch: lkpBranch.value,
          txtDocNo: txtDocNo.trim(),
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        notDeleted(result.message);

        if (result.field) {
          document.getElementById(result.field)?.focus();
        }

        return;
      }

      deleted();

      // as the old form: the page is emptied and the next Entry No. shown
      resetDocument();
      setDtpDate(todayLocal());
      await loadNextDocNo(lkpBranch.value);
    } catch (error) {
      console.error("deleteStockTransfer error:", error);
      toast.error("Cannot connect to Stock Transfer API.");
    } finally {
      setSaving(false);
    }
  };

  // ----------------------------------------------------------
  // POST
  //
  // The saved Stock Transfer goes into the stock (the old cmdPost): the From
  // branch's stock goes down, the To branch's up, and the page locks. It needs
  // the Post right, a saved transfer that is not posted yet, and the old
  // question first. The server checks the same again, and also that the From
  // branch has enough POSTED stock and a unit cost for every line.
  // ----------------------------------------------------------

  const handlePost = async () => {
    if (saving) return;

    if (!lkpBranch) {
      toast.warning("Please select 'Branch'");
      document.getElementById("lkpBranch")?.focus();
      return;
    }

    if (txtDocNo.trim() === "") {
      toast.warning("Please enter 'Entry No'");
      document.getElementById("txtDocNo")?.focus();
      return;
    }

    if (!chkSaved) {
      toast.warning("Stock Transfer not found");
      return;
    }

    if (chkPosted) {
      toast.warning("This Stock Transfer is already posted.");
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

    const shouldPost = await confirm({
      title: SCREEN_TITLE,
      message: "Do you want to post ?",
    });

    if (!shouldPost) {
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(`${api}/StockTransfer/postStockTransfer`, {
        method: "POST",
        credentials: "include", // the server checks the session and the rights
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          PstrCoID,
          PstrYear,
          lkpBranch: lkpBranch.value,
          txtDocNo: txtDocNo.trim(),
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        toast.error(result.message || "Stock Transfer Not Posted");

        // the backend names the box that failed - same name as the element id
        if (result.field) {
          document.getElementById(result.field)?.focus();
        }

        return;
      }

      toast.success(result.message || "Stock Transfer Posted");

      // as the old form: the page is emptied and the next Entry No. shown
      resetDocument();
      setDtpDate(todayLocal());
      await loadNextDocNo(lkpBranch.value);
    } catch (error) {
      console.error("postStockTransfer error:", error);
      toast.error("Cannot connect to Stock Transfer API.");
    } finally {
      setSaving(false);
    }
  };

  // ----------------------------------------------------------
  // PRINT
  //
  // The saved Stock Transfer is printed (the old cmdPrint): it needs the Print
  // right and there must be a saved transfer. The server sends the report and the
  // Print Preview opens (Print = the browser's print window, Download = Excel / PDF).
  // ----------------------------------------------------------

  // the body of the Print and Excel requests: the branch and the Entry No.
  const printBody = (branch: string, docNo: string) =>
    JSON.stringify({
      PstrCoID: localStorage.getItem("PstrCoID"),
      PstrYear: localStorage.getItem("PstrYear"),
      lkpBranch: branch,
      txtDocNo: docNo,
    });

  const handlePrint = async () => {
    if (saving || preview) return;

    if (!lkpBranch) {
      toast.warning("Please select 'Branch'");
      document.getElementById("lkpBranch")?.focus();
      return;
    }

    if (txtDocNo.trim() === "") {
      toast.warning("Please enter 'Entry No'");
      document.getElementById("txtDocNo")?.focus();
      return;
    }

    if (!chkSaved) {
      toast.warning("Stock Transfer not found");
      return;
    }

    if (!perms.print) {
      toast.error("You do not have permission to Print.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(`${api}/StockTransfer/printStockTransfer`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: printBody(lkpBranch.value, txtDocNo.trim()),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        toast.error(result.message || "The Stock Transfer could not be printed.");
        return;
      }

      // a name that is never the name of a file that is still open
      const now = new Date();
      const pad = (value: number) => String(value).padStart(2, "0");
      const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;

      setPreview({
        report: { ...result.header, rows: result.data || [] },
        lkpBranch: lkpBranch.value,
        txtDocNo: txtDocNo.trim(),
        fileBase: `StockTransfer_${txtDocNo.trim().replace(/[^A-Za-z0-9_-]/g, "_")}_${stamp}`,
      });
    } catch (error) {
      console.error("printStockTransfer error:", error);
      toast.error("Cannot connect to Stock Transfer API.");
    } finally {
      setSaving(false);
    }
  };

  // the Excel file of the Print Preview, made by the server (null after an error)
  const fetchExcel = async (): Promise<Blob | null> => {
    if (!preview) return null;

    const response = await fetch(`${api}/StockTransfer/downloadStockTransferExcel`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: printBody(preview.lkpBranch, preview.txtDocNo),
    });

    // an error comes back as JSON, the file as a blob
    if (!response.ok) {
      let message = "Could not create the Excel file";

      try {
        const result = await response.json();
        message = result.message || message;
      } catch {
        message =
          response.status === 404
            ? "Excel is not available: the downloadStockTransferExcel route was not found (404)"
            : `Could not create the Excel file (error ${response.status})`;
      }

      toast.error(message);
      return null;
    }

    return response.blob();
  };

  // ----------------------------------------------------------
  // DELETE A ROW (the x of a row): asks first. A line that is saved goes from the
  // database at once, with "Stock Transfer deleted successfully" (the last saved line takes the whole
  // transfer with it); a line that was never saved only leaves the grid. The cursor
  // goes back to the row's Item ID.
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
        const response = await fetch(`${api}/StockTransfer/deleteStockTransferLine`, {
          method: "DELETE",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            PstrCoID: localStorage.getItem("PstrCoID"),
            PstrYear: localStorage.getItem("PstrYear"),
            lkpBranch: lkpBranch.value,
            txtDocNo: txtDocNo.trim(),
            txtSlNo: row.txtOriginalSlNo,
          }),
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          notDeleted(result.message);
          return;
        }

        deleted();

        // the last line took the whole transfer with it: the page starts again
        if (result.chkDocumentDeleted) {
          clearForm();
          return;
        }
      } catch (error) {
        console.error("deleteStockTransferLine error:", error);
        toast.error("Cannot connect to Stock Transfer API.");
        return;
      } finally {
        setSaving(false);
      }
    }

    // (a line that was never saved just leaves the grid: nothing in the database to delete,
    // so there is no message)

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
          txtPacking: "",
          txtQty: "",
          txtUnitCost: "",
          txtStock: null,
          txtOriginalSlNo: null,
        });
      }

      // Sl.# is the line's place in the grid
      return kept.map((entry, rowIndex) => ({ ...entry, txtSlNo: rowIndex + 1 }));
    });

    setActiveRow(index);
    setTxtStock("");

    // after the grid has been drawn again
    window.setTimeout(() => document.getElementById(`lkpItemID-${index}`)?.focus(), 0);
  };

  // Alt+S -> Save (new), Alt+M -> Modify (saved), Alt+D -> Delete, Alt+P -> Print,
  // Alt+T -> Post (the old Ctrl+T), Alt+C -> Cancel. Off while the Print Preview is
  // open: it has its own Alt+P, Alt+D and Alt+C.
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
    if (action === "Cancel" || action === "Clear") {
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
    <div className="flex min-h-full w-full justify-center bg-gray-100 px-3 pb-5">
    <main className="mt-5 flex h-fit w-full max-w-300 flex-col overflow-hidden border border-gray-400 bg-white text-[12px] text-slate-700">

      {/* TITLE BAR */}
      <div className="flex h-[28px] w-full shrink-0 items-center bg-[#a7dfc0]">
        <h1 className="ml-[5px] text-[17px] font-semibold text-[#374151]">
          Stock Transfer
        </h1>
      </div>

      {/* FORM BODY */}
      <div className="m-[12px] flex min-h-0 flex-1 flex-col px-[12px] pb-[12px] pt-0">

      {/* HEADER FORM, row 1: Branch, Entry No., Date */}
      <section className="mb-[10px] flex h-[30px] bg-white shrink-0 items-center justify-between gap-4">

        {/* Branch (From) */}
        <div className="flex min-w-0 items-center gap-1">
          <label htmlFor="lkpBranch" className="w-[92px] shrink-0 text-right text-[14px] text-gray-600">
            Branch :
          </label>

          <div className="w-[220px] max-w-full" onKeyDown={(event) => advanceOnEnter(event)}>
            <Select<SelectOption, false>
              inputId="lkpBranch"
              name="lkpBranch"
              options={branchOptions}
              value={lkpBranch}
              onChange={(option: SingleValue<SelectOption>) => {
                setLkpBranch(option);

                // a branch chosen: on to Entry No.
                if (option) {
                  window.setTimeout(
                    () => document.getElementById("txtDocNo")?.focus(),
                    0,
                  );
                }
              }}
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
              menuPortalTarget={document.body}
              menuPosition="fixed"
              menuPlacement="auto"
            />
          </div>
        </div>

        {/* Entry No. */}
        <div className="flex shrink-0 items-center gap-3">
          <label htmlFor="txtDocNo" className="text-[14px] text-gray-600">
            Entry No. :
          </label>

          <input
            id="txtDocNo"
            name="txtDocNo"
            value={txtDocNo}
            maxLength={14}
            onChange={(event) => setTxtDocNo(event.target.value)}
            onBlur={() => {
              if (
                lkpBranch &&
                txtDocNo.trim() !== "" &&
                txtDocNo.trim() !== loadedDocNoRef.current
              ) {
                loadDocument(lkpBranch.value, txtDocNo);
              }
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                (event.target as HTMLInputElement).blur();
                document.getElementById("dtpDate")?.focus();
              }
            }}
            className="input-style w-[150px]"
          />
        </div>

        {/* Date */}
        <div className="flex shrink-0 items-center gap-3">
          <label htmlFor="dtpDate" className="text-[14px] text-gray-600">
            Date :
          </label>

          <input
            id="dtpDate"
            name="dtpDate"
            type="date"
            value={dtpDate}
            onChange={(event) => setDtpDate(event.target.value)}
            onKeyDown={(event) => {
              // Enter goes on to Transfer To (a date box does not move on by itself)
              if (event.key === "Enter") {
                event.preventDefault();
                document.getElementById("lkpToBranch")?.focus();
              }
            }}
            disabled={chkPosted}
            className="input-style w-[142px]"
          />
        </div>
      </section>

      {/* HEADER FORM, row 2: Transfer To, Stock */}
      <section className="mb-[12px] flex h-[30px] bg-white shrink-0 items-center justify-between gap-4">

        {/* Transfer To */}
        <div className="flex min-w-0 items-center gap-1">
          <label htmlFor="lkpToBranch" className="w-[92px] shrink-0 text-right text-[14px] text-gray-600">
            Transfer To :
          </label>

          <div className="w-[220px] max-w-full" onKeyDown={(event) => advanceOnEnter(event)}>
            <Select<SelectOption, false>
              inputId="lkpToBranch"
              name="lkpToBranch"
              options={toBranchOptions}
              value={lkpToBranch}
              onChange={(option: SingleValue<SelectOption>) => {
                setLkpToBranch(option);

                // a branch chosen: on to the first Item ID
                if (option) advanceAfterPick("lkpToBranch");
              }}
              isDisabled={chkPosted}
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
              menuPortalTarget={document.body}
              menuPosition="fixed"
              menuPlacement="auto"
            />
          </div>
        </div>

        {/* Stock of the item you are on */}
        <div className="flex shrink-0 items-center gap-3">
          <span className="text-[14px] text-gray-600">Stock :</span>

          {/* a label, not a box: the stock of the item you are on - in the place of
              the Date box above (same width, the text starts where the date starts) */}
          <span
            id="txtStock"
            className="w-[142px] pl-[9px] text-left text-[14px] text-[#334155]"
          >
            {txtStock}
          </span>
        </div>
      </section>

      {/* STOCK TABLE */}
<main className="customer-table-scroll flex shrink-0 flex-col bg-white">
  <div
    ref={gridScroll.ref}
    // 11 rows show (the heading and 11 rows of 30px); a 12th row brings the scroll bar
    className="customer-table-scroll h-[363px] shrink-0 overflow-auto border border-[#bfe8d0]"
  >
    <table className="customer-table-scroll w-full min-w-[900px] table-fixed border-collapse border border-[#bfe8d0]">
            <colgroup>
              <col style={{ width: "17px" }} />
              <col style={{ width: "43px" }} />
              <col style={{ width: "21%" }} />
              <col style={{ width: "37%" }} />
              <col style={{ width: "6.2%" }} />
              <col style={{ width: "6.9%" }} />
              <col style={{ width: "8.9%" }} />
              <col style={{ width: "11.6%" }} />
              <col style={{ width: "14.2%" }} />
            </colgroup>

            <thead className="sticky top-0 z-10 bg-[#edf9f2]">
              <tr className="h-[30px] text-left text-[14px] text-gray-600">
                <th className="border border-[#bfe8d0] px-1 font-normal"></th>
                <th className="border border-[#bfe8d0] px-1 text-center font-normal">Line</th>
                <th className="border border-[#bfe8d0] px-2 font-normal">Item ID</th>
                <th className="border border-[#bfe8d0] px-2 font-normal">Item Name</th>
                <th className="border border-[#bfe8d0] px-2 font-normal">Unit</th>
                <th className="border border-[#bfe8d0] px-2 text-right font-normal">Packing</th>
                <th className="border border-[#bfe8d0] px-2 text-right font-normal">Qty.</th>
                <th className="border border-[#bfe8d0] px-2 text-right font-normal">Unit Cost</th>
                <th className="border border-[#bfe8d0] px-2 text-right font-normal">Total Cost</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((row, index) => (
                <tr
                  key={row.id}
                  onClick={() => {
                    setActiveRow(index);
                    showRowStock(index);
                  }}
                  className={`h-[30px] text-[14px] ${
                    activeRow === index ? "bg-[#f8fcfa]" : "bg-white"
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
                      onChange={(option: SingleValue<SelectOption>) =>
                        pickItem(index, "lkpItemID", option)
                      }
                      onFocus={() => showRowStock(index)}
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
                      onChange={(option: SingleValue<SelectOption>) =>
                        pickItem(index, "lkpItemName", option)
                      }
                      onFocus={() => showRowStock(index)}
                      styles={
                        {
                          ...tableSelectStyles,
                          ...makePairDividedMenuStyles(nameMenuHang),
                        } as StylesConfig<SelectOption, false>
                      }
                      onMenuOpen={() =>
                        measureNameMenuHang(`lkpItemName-${index}`, `txtQty-${index}`)
                      }
                      components={itemNameComponents}
                      filterOption={filterPairOption}
                      noOptionsMessage={() => "No Item Found"}
                      isSearchable
                      isClearable={false}
                      isDisabled={chkPosted}
                      placeholder=""
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
                      className="h-[26px] w-full bg-transparent px-2 outline-none"
                    />
                  </td>

                  {/* PACKING */}
                  <td className="border border-[#bfe8d0] p-0">
                    <input
                      id={`txtPacking-${index}`}
                      name="txtPacking"
                      value={row.txtPacking}
                      readOnly
                      className="h-[26px] w-full bg-transparent px-2 text-right outline-none"
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
                      onChange={(event) => updateQty(index, event.target.value)}
                      onFocus={(event) => {
                        showRowStock(index);
                        selectOnFocus(event);
                      }}
                      onBlur={(event) => showQty(index, event.target.value)}
                      onKeyDown={(event) => handleQtyKeyDown(event, index)}
                      className="number-no-spinner h-[26px] w-full bg-transparent px-2 text-right outline-none focus:bg-[#f1f8ff]"
                    />
                  </td>

                  {/* UNIT COST (the branch's cost - not typed) */}
                  <td className="border border-[#bfe8d0] p-0">
                    <input
                      id={`txtUnitCost-${index}`}
                      name="txtUnitCost"
                      value={row.txtUnitCost}
                      readOnly
                      className="h-[26px] w-full bg-transparent px-2 text-right outline-none"
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
          above, so the totals sit exactly under their columns */}
      <section className="shrink-0 bg-white">
        <div
          className="border border-transparent"
          style={{ paddingRight: gridScroll.width }}
        >
          <table className="w-full min-w-[900px] table-fixed border-collapse border border-transparent">
            <colgroup>
              <col style={{ width: "17px" }} />
              <col style={{ width: "43px" }} />
              <col style={{ width: "21%" }} />
              <col style={{ width: "37%" }} />
              <col style={{ width: "6.2%" }} />
              <col style={{ width: "6.2%" }} />
              <col style={{ width: "8.9%" }} />
              <col style={{ width: "11.6%" }} />
              <col style={{ width: "14.2%" }} />
            </colgroup>

            <tbody>
              <tr className="h-[60px]">
                {/* NOTE (under the first four columns: up to the end of Item Name) */}
                <td colSpan={4} className="p-0">
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

                {/* nothing under Unit */}
                <td className="p-0" />

                {/* TOTAL LABEL (under the Packing column) */}
                <td className="p-0 px-[4px]">
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
          onPrint={() => printStockTransferReport(preview.report)}
          buildPdf={() => buildStockTransferPdf(preview.report)}
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
                    : action === "Print"
                      ? !chkSaved || !perms.print || saving
                      : action === "Post"
                        ? !chkSaved || chkPosted || !perms.post || saving
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

export default StockTransferPage;
