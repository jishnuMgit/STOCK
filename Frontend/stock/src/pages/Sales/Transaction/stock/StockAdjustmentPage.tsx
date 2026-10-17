import { Play } from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import Select, {
  type SingleValue,
  type StylesConfig,
} from "react-select";
import { useLocation, useNavigate } from "react-router-dom";
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
import { useConfirm } from "../../../../hooks/useConfirm";
import { useButtonPermissions } from "../../../../hooks/useButtonPermissions";
import {
  BranchDividedMenuList,
  BranchDividedOption,
  branchMenuStyles,
  filterLabelOrValue,
} from "../../../../components/BranchSelect/branchSelectParts";
import selectComponents from "../../../../components/sharecomponents/selectComponents";

// ============================================================
// STOCK ADJUSTMENT (the old frmADJ)
//
// Corrects the stock of the Branch: each line either takes stock out (Qty. Out:
// damaged, lost ...) or puts stock in (Qty. In: found, surplus ...), never both.
// The Unit Cost is the branch's current cost (not typed) and the Total Cost of a
// line is (Qty. In - Qty. Out) x Unit Cost. The Entry No. is made by the server
// from the branch's ADJ setting. Out of Stock is only a warning (as in the old
// form); Post moves the stock and writes the two finance lines.
//
// Names follow the rule: state = element id/name = payload key = response key
// (lkpBranch, txtDocNo, dtpDate, txtNote, lkpItemID, txtQtyIn, txtQtyOut ...).
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
  txtQtyIn: string;
  txtQtyOut: string;
  txtUnitCost: string;
  // what the branch has of the item (for the Out of Stock warning)
  txtStock: number | null;
  // the Sl.# the line had when it was loaded (null for a new line)
  txtOriginalSlNo: number | null;
}

// an item of the branch, as the server gives it
interface ItemRecord {
  lkpItemID: string;
  txtItemName: string;
  txtUnit: string;
}

// one saved adjustment in the Search list
interface FindRecord {
  txtDocNo: string;
  dtpDate: string | null;
  txtNote: string | null;
  txtTotalCost: string;
  chkPosted: boolean;
}

// dbo.tblmenu fmenuid of the Stock Adjustment page
const MENU_ID = "020104";

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
// The same two-column list as the Item boxes of Stock Transfer (shared in
// components/PairSelect/pairSelectParts.tsx): the Item ID box opens "Item ID |
// Item Name", the Item Name box opens "Item Name | Item ID", both with a divider,
// both searchable on either column, and picking from one fills the other.
// ============================================================

const itemIdComponents = makePairComponents("Item ID", "Item Name", false, true);
// The Item Name box's list hangs 210px past the box: that is its Item ID column,
// wide enough for a whole ID on one line.
const NAME_LIST_HANG = 210;
const itemNameComponents = makePairComponents(
  "Item ID",
  "Item Name",
  true,
  true,
  NAME_LIST_HANG,
);
const itemNameMenuStyles = makePairDividedMenuStyles(NAME_LIST_HANG);

// ============================================================
// TABLE SELECT STYLES (the boxes inside the grid)
// ============================================================

const tableSelectStyles: StylesConfig<SelectOption, false> = {
  control: (base) => ({
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

  indicatorSeparator: () => ({
    display: "none",
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
  Array.from({ length: 15 }, (_, index) => ({
    id: index + 1,
    txtSlNo: index + 1,
    lkpItemID: null,
    lkpItemName: null,
    txtUnit: "",
    txtQtyIn: "",
    txtQtyOut: "",
    txtUnitCost: "",
    txtStock: null,
    txtOriginalSlNo: null,
  }));

// ============================================================
// COMPONENT
// ============================================================

const StockAdjustmentPage: React.FC = () => {
  // the Branch box: only the branches the user has a right to, with the user's
  // default branch selected when the page opens
  const [branchOptions, setBranchOptions] = useState<SelectOption[]>([]);
  const [lkpDefaultBranch, setLkpDefaultBranch] = useState<SelectOption | null>(null);
  const [lkpBranch, setLkpBranch] = useState<SelectOption | null>(null);

  // the Entry No. and its settings (from the branch's ADJ setting)
  const [txtDocNo, setTxtDocNo] = useState("");
  const [txtNextDocNo, setTxtNextDocNo] = useState("");
  // the Entry No. whose document was last loaded (or made by the page): leaving
  // the Entry No. box WITHOUT changing it must not load again - that would empty
  // the page
  const loadedDocNoRef = useRef("");
  const [chkStrictSerial, setChkStrictSerial] = useState(false);

  const [dtpDate, setDtpDate] = useState(todayLocal);
  const [txtNote, setTxtNote] = useState("");
  const [rows, setRows] = useState<StockRow[]>(createInitialRows);
  const [activeRow, setActiveRow] = useState(0);

  const perms = useButtonPermissions(MENU_ID);
  const navigate = useNavigate();
  const location = useLocation();
  const { confirm, confirmDialog } = useConfirm();

  // coming back from the print page: the adjustment that was printed is shown again
  const returnedState = (location.state ?? null) as {
    lkpBranch?: string;
    txtDocNo?: string;
  } | null;
  const returnedBranchID = returnedState?.lkpBranch ?? "";
  const returnedDocNo = useRef(returnedState?.txtDocNo ?? "");

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

  // the grid's scroll bar narrows its columns; the totals row below gets the same
  // amount as padding so its boxes end where the grid's columns end
  const gridScroll = useScrollbarWidth<HTMLDivElement>();

  // the Search list (the old Find): the saved adjustments of the branch
  const [chkFindOpen, setChkFindOpen] = useState(false);
  const [findRows, setFindRows] = useState<FindRecord[]>([]);
  const [txtFindFilter, setTxtFindFilter] = useState("");

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
  // LOAD THE BRANCHES once
  // ----------------------------------------------------------

  useEffect(() => {
    const loadBranches = async () => {
      try {
        const PstrCoID = localStorage.getItem("PstrCoID");

        if (!PstrCoID) {
          toast.error("getBranchList: no PstrCoID in localStorage");
          return;
        }

        const response = await fetch(
          `${api}/StockAdjustment/getBranchList?PstrCoID=${PstrCoID}`,
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
          options.find((option) => option.value === result.lkpDefaultBranch) ?? null;

        const returned =
          options.find((option) => option.value === returnedBranchID) ?? null;

        setBranchOptions(options);
        setLkpDefaultBranch(initial);
        setLkpBranch(returned ?? initial);
      } catch (error) {
        console.error("loadBranches (stock adjustment) error:", error);
        toast.error(
          `Stock Adjustment load error: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    };

    loadBranches();
  }, []);

  // ----------------------------------------------------------
  // THE DOCUMENT STATE, emptied (the old ClearMe): the grid, the note and the
  // saved-by line; the button says Save again
  // ----------------------------------------------------------

  const resetDocument = () => {
    setRows(createInitialRows());
    setActiveRow(0);
    setTxtNote("");
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
        `${api}/StockAdjustment/getNextDocNo?PstrCoID=${PstrCoID}&PstrYear=${PstrYear}&lkpBranch=${encodeURIComponent(branchValue)}`,
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
      toast.error("Cannot connect to Stock Adjustment API.");
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
  ) => {
    try {
      const PstrCoID = localStorage.getItem("PstrCoID");
      const PstrYear = localStorage.getItem("PstrYear");

      if (!PstrCoID || !PstrYear || docNo.trim() === "") return;

      loadedDocNoRef.current = docNo.trim();

      const response = await fetch(
        `${api}/StockAdjustment/getStockAdjustment?PstrCoID=${PstrCoID}&PstrYear=${PstrYear}&lkpBranch=${encodeURIComponent(branchValue)}&txtDocNo=${encodeURIComponent(docNo.trim())}`,
        { credentials: "include" },
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        toast.error(result.message || "Failed to load the Stock Adjustment");
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

      // a quantity of 0 is shown empty: a line has Qty. In OR Qty. Out
      const showQty = (value: string) =>
        Number(value) !== 0 ? Number(value).toFixed(3) : "";

      const savedRows: StockRow[] = (result.data || []).map(
        (
          line: {
            txtSlNo: number;
            lkpItemID: string;
            txtUnit: string | null;
            txtQtyIn: string;
            txtQtyOut: string;
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
            txtQtyIn: showQty(line.txtQtyIn),
            txtQtyOut: showQty(line.txtQtyOut),
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
        toast.info("This Stock Adjustment is posted: it is locked.");
      }
    } catch (error) {
      console.error("getStockAdjustment error:", error);
      toast.error(
        `Stock Adjustment load error: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  };

  // ----------------------------------------------------------
  // THE BRANCH CHANGED: its items, its next Entry No., an empty document (or,
  // coming back from the print page, the adjustment that was printed)
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
          `${api}/StockAdjustment/getItemList?PstrCoID=${PstrCoID}&lkpBranch=${encodeURIComponent(lkpBranch.value)}`,
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
          }) => ({
            lkpItemID: row.lkpItemID,
            txtItemName: row.txtItemName ?? row.lkpItemID,
            txtUnit: row.txtUnit ?? "",
          }),
        );

        setItems(loadedItems);
        resetDocument();

        if (returnedDocNo.current !== "") {
          const docNo = returnedDocNo.current;

          returnedDocNo.current = "";
          setTxtDocNo(docNo);
          await loadDocument(lkpBranch.value, docNo, loadedItems);
        } else {
          await loadNextDocNo(lkpBranch.value);
        }
      } catch (error) {
        console.error("loadBranch (stock adjustment) error:", error);
        toast.error(
          `Stock Adjustment load error: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    };

    loadBranch();

    return () => {
      cancelled = true;
    };
  }, [lkpBranch]);

  // ----------------------------------------------------------
  // THE STOCK AND COST OF AN ITEM (the old GetItemStock / GetUnitCost): the
  // Unit Cost of the row is filled from it. An item with no stock is accepted
  // (it may be adjusted IN); only a Qty. Out above the stock is warned about.
  // ----------------------------------------------------------

  const lookUpItem = async (itemId: string): Promise<{ stock: number; unitCost: number } | null> => {
    try {
      const PstrCoID = localStorage.getItem("PstrCoID");
      const PstrYear = localStorage.getItem("PstrYear");

      if (!PstrCoID || !PstrYear || !lkpBranch) return null;

      const response = await fetch(
        `${api}/StockAdjustment/getItemStock?PstrCoID=${PstrCoID}&PstrYear=${PstrYear}&lkpBranch=${encodeURIComponent(lkpBranch.value)}&lkpItemID=${encodeURIComponent(itemId)}&txtDocNo=${encodeURIComponent(txtDocNo.trim())}`,
        { credentials: "include" },
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        toast.error(result.message || "Failed to load the stock of the item");
        return null;
      }

      return { stock: Number(result.txtStock), unitCost: Number(result.txtUnitCost) };
    } catch (error) {
      console.error("getItemStock error:", error);
      toast.error("Cannot connect to Stock Adjustment API.");
      return null;
    }
  };

  const fetchItemStock = async (rowId: number, itemId: string) => {
    const found = await lookUpItem(itemId);

    if (!found) return;

    setRows((previous) =>
      previous.map((row) =>
        row.id === rowId
          ? { ...row, txtStock: found.stock, txtUnitCost: found.unitCost.toFixed(4) }
          : row,
      ),
    );
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

        // the unit comes from the item; clearing the item clears the whole row,
        // as the old form's ClearRow
        if (field === "lkpItemID" || field === "lkpItemName") {
          const selected = value as SelectOption | null;
          const item = selected
            ? items.find((entry) => entry.lkpItemID === selected.value)
            : undefined;

          updated.txtUnit = item?.txtUnit ?? "";
          updated.txtStock = null;

          if (!selected) {
            updated.txtQtyIn = "";
            updated.txtQtyOut = "";
            updated.txtUnitCost = "";
          }
        }

        return updated;
      }),
    );
  };

  // an item was chosen in a row: the stock and the cost of it are looked up
  const pickItem = (
    rowIndex: number,
    field: "lkpItemID" | "lkpItemName",
    option: SelectOption | null,
  ) => {
    const duplicate =
      option !== null &&
      rows.some(
        (row, index) => index !== rowIndex && row.lkpItemID?.value === option.value,
      );

    // the old "Item already exists !": the row is cleared
    if (duplicate) {
      toast.warning("Item already exists !");
      updateRow(rowIndex, "lkpItemID", null);
      return;
    }

    updateRow(rowIndex, field, option);

    if (option) {
      fetchItemStock(rows[rowIndex].id, option.value);

      // Enter / Tab / click picked it: on to Qty. In
      advanceAfterPick(`lkpItemID-${rowIndex}`, [`lkpItemName-${rowIndex}`]);
    }
  };

  // ----------------------------------------------------------
  // QUANTITIES
  // ----------------------------------------------------------

  const updateQty = (
    rowIndex: number,
    field: "txtQtyIn" | "txtQtyOut",
    value: string,
  ) => {
    updateRow(rowIndex, field, value);
  };

  // on leaving Qty. In: 3 decimals
  const showQtyIn = (rowIndex: number, value: string) => {
    if (value === "" || Number.isNaN(Number(value))) return;

    updateRow(rowIndex, "txtQtyIn", Number(value).toFixed(3));
  };

  // on leaving Qty. Out: 3 decimals, and the old "Out Of Stock" warning (only a
  // warning - the server checks again at Post)
  const showQtyOut = async (rowIndex: number, value: string) => {
    if (value === "" || Number.isNaN(Number(value))) return;

    const qty = Number(value);
    const row = rows[rowIndex];

    updateRow(rowIndex, "txtQtyOut", qty.toFixed(3));

    if (qty <= 0 || !row.lkpItemID) return;

    let stock = row.txtStock;

    // a saved row has not been looked up yet
    if (stock === null) {
      const found = await lookUpItem(row.lkpItemID.value);

      stock = found ? found.stock : null;

      if (found) {
        setRows((previous) =>
          previous.map((entry) =>
            entry.id === row.id ? { ...entry, txtStock: found.stock } : entry,
          ),
        );
      }
    }

    if (stock !== null && qty > stock) {
      toast.warning("Out Of Stock");
    }
  };

  // ----------------------------------------------------------
  // AMOUNT CALCULATIONS: (Qty. In - Qty. Out) x Unit Cost, so a line that takes
  // stock out is negative
  // ----------------------------------------------------------

  const getTotalCost = (row: StockRow) => {
    const qtyIn = Number(row.txtQtyIn) || 0;
    const qtyOut = Number(row.txtQtyOut) || 0;
    const cost = Number(row.txtUnitCost) || 0;

    return (qtyIn - qtyOut) * cost;
  };

  const total = useMemo(
    () => rows.reduce((sum, row) => sum + getTotalCost(row), 0),
    [rows],
  );

  const totalQtyIn = useMemo(
    () => rows.reduce((sum, row) => sum + (Number(row.txtQtyIn) || 0), 0),
    [rows],
  );

  const totalQtyOut = useMemo(
    () => rows.reduce((sum, row) => sum + (Number(row.txtQtyOut) || 0), 0),
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
        txtQtyIn: "",
        txtQtyOut: "",
        txtUnitCost: "",
        txtStock: null,
        txtOriginalSlNo: null,
      },
    ]);
  };

  // ----------------------------------------------------------
  // CLEAR (the old cmdCancel): the page is emptied and the next Entry No. shown
  // ----------------------------------------------------------

  const clearForm = () => {
    resetDocument();
    setDtpDate(todayLocal());

    if (lkpBranch) {
      loadNextDocNo(lkpBranch.value);
    } else {
      setLkpBranch(lkpDefaultBranch);
    }
  };

  // ----------------------------------------------------------
  // KEYBOARD NAVIGATION: Enter in Qty. In goes to Qty. Out, Enter in Qty. Out
  // goes to the next row's Item ID (a new row after the last one)
  // ----------------------------------------------------------

  const handleQtyInKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>,
    rowIndex: number,
  ) => {
    if (event.key !== "Enter") return;

    event.preventDefault();
    document.getElementById(`txtQtyOut-${rowIndex}`)?.focus();
  };

  const handleQtyOutKeyDown = (
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
      toast.warning("This Stock Adjustment is already posted and cannot be modified.");
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

    for (const [position, { row, index }] of filledRows.entries()) {
      const qtyIn = Number(row.txtQtyIn) || 0;
      const qtyOut = Number(row.txtQtyOut) || 0;

      // the old ValidateGrid: either Qty. Out or Qty. In
      if (qtyIn !== 0 && qtyOut !== 0) {
        toast.warning(
          `Sl.# : ${position + 1} - Please input either 'Qty. Out' or 'Qty. In'`,
        );
        document.getElementById(`txtQtyOut-${index}`)?.focus();
        return;
      }

      if (qtyIn === 0 && qtyOut === 0) {
        toast.warning(`Sl.# : ${position + 1} - Please enter 'Qty. In' or 'Qty. Out'`);
        document.getElementById(`txtQtyIn-${index}`)?.focus();
        return;
      }
    }

    setSaving(true);

    try {
      const response = await fetch(`${api}/StockAdjustment/saveStockAdjustment`, {
        method: "POST",
        credentials: "include", // the server checks the session and the rights
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          PstrCoID,
          PstrYear,
          lkpBranch: lkpBranch.value,
          txtDocNo: txtDocNo.trim(),
          dtpDate,
          txtNote,
          chkSaved,
          rows: filledRows.map(({ row, index }) => ({
            txtGridRow: index, // where the row sits in the grid (for the focus)
            lkpItemID: (row.lkpItemID as SelectOption).value,
            txtQtyIn: row.txtQtyIn,
            txtQtyOut: row.txtQtyOut,
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

      // as the old form: the page is emptied and the next Entry No. shown
      resetDocument();
      setDtpDate(todayLocal());
      await loadNextDocNo(lkpBranch.value);
    } catch (error) {
      console.error("saveStockAdjustment error:", error);
      toast.error("Cannot connect to Stock Adjustment API.");
    } finally {
      setSaving(false);
    }
  };

  // ----------------------------------------------------------
  // DELETE
  //
  // The whole adjustment (the old cmdDelete): it needs the Delete right, there
  // must be a saved adjustment, a posted one is locked, and the old question
  // comes first. The server checks the same again.
  // ----------------------------------------------------------

  const handleDelete = async () => {
    if (saving) return;

    if (!chkSaved) {
      toast.warning("There is no Stock Adjustment to delete.");
      return;
    }

    if (chkPosted) {
      toast.warning("This Stock Adjustment is already posted and cannot be deleted.");
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

    const shouldDelete = await confirm("Do you want delete ?");

    if (!shouldDelete) {
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(`${api}/StockAdjustment/deleteStockAdjustment`, {
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
        toast.error(result.message || "Not Deleted,Try again");

        if (result.field) {
          document.getElementById(result.field)?.focus();
        }

        return;
      }

      toast.success(result.message || "Deleted");

      // as the old form: the page is emptied and the next Entry No. shown
      resetDocument();
      setDtpDate(todayLocal());
      await loadNextDocNo(lkpBranch.value);
    } catch (error) {
      console.error("deleteStockAdjustment error:", error);
      toast.error("Cannot connect to Stock Adjustment API.");
    } finally {
      setSaving(false);
    }
  };

  // ----------------------------------------------------------
  // POST
  //
  // The saved Stock Adjustment goes into the stock (the old cmdPost): the stock
  // moves, the two finance lines are written and the page locks. It needs the
  // Post right, a saved adjustment that is not posted yet, and the old question
  // first. The server checks the same again, and also that the branch has its
  // posting accounts, enough POSTED stock for a line taking stock out, and a
  // unit cost for every line.
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
      toast.warning("Stock Adjustment not found");
      return;
    }

    if (chkPosted) {
      toast.warning("This Stock Adjustment is already posted.");
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

    const shouldPost = await confirm("Do you want to post ?.");

    if (!shouldPost) {
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(`${api}/StockAdjustment/postStockAdjustment`, {
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
        toast.error(result.message || "Stock Adjustment Not Posted");

        // the backend names the box that failed - same name as the element id
        if (result.field) {
          document.getElementById(result.field)?.focus();
        }

        return;
      }

      toast.success(result.message || "Stock Adjustment Posted");

      // as the old form: the page is emptied and the next Entry No. shown
      resetDocument();
      setDtpDate(todayLocal());
      await loadNextDocNo(lkpBranch.value);
    } catch (error) {
      console.error("postStockAdjustment error:", error);
      toast.error("Cannot connect to Stock Adjustment API.");
    } finally {
      setSaving(false);
    }
  };

  // ----------------------------------------------------------
  // PRINT
  //
  // The saved Stock Adjustment is printed (the old cmdPrint): it needs the Print
  // right and there must be a saved adjustment. The print page asks the server
  // for the data itself and opens the browser's print window.
  // ----------------------------------------------------------

  const handlePrint = () => {
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
      toast.warning("Stock Adjustment not found");
      return;
    }

    if (!perms.print) {
      toast.error("You do not have permission to Print.");
      return;
    }

    navigate("/Sales/Transaction/StockAdjustment/Print", {
      state: { lkpBranch: lkpBranch.value, txtDocNo: txtDocNo.trim() },
    });
  };

  // ----------------------------------------------------------
  // SEARCH (the old Find button): the saved adjustments of the branch in the
  // login year, newest first; picking one loads it as if its Entry No. had been
  // typed
  // ----------------------------------------------------------

  const handleSearch = async () => {
    if (saving) return;

    if (!lkpBranch) {
      toast.warning("Please select 'Branch'");
      document.getElementById("lkpBranch")?.focus();
      return;
    }

    const PstrCoID = localStorage.getItem("PstrCoID");
    const PstrYear = localStorage.getItem("PstrYear");

    if (!PstrCoID || !PstrYear) {
      toast.error("Company ID / Year not found. Please log in again.");
      return;
    }

    try {
      const response = await fetch(
        `${api}/StockAdjustment/getFindList?PstrCoID=${PstrCoID}&PstrYear=${PstrYear}&lkpBranch=${encodeURIComponent(lkpBranch.value)}`,
        { credentials: "include" },
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        toast.error(result.message || "Failed to load the Stock Adjustment list");
        return;
      }

      setFindRows(result.data || []);
      setTxtFindFilter("");
      setChkFindOpen(true);
    } catch (error) {
      console.error("getFindList error:", error);
      toast.error("Cannot connect to Stock Adjustment API.");
    }
  };

  const pickFound = (found: FindRecord) => {
    setChkFindOpen(false);

    if (!lkpBranch) return;

    setTxtDocNo(found.txtDocNo);
    loadDocument(lkpBranch.value, found.txtDocNo);
    document.getElementById("dtpDate")?.focus();
  };

  const visibleFindRows = findRows.filter((found) => {
    const filter = txtFindFilter.trim().toLowerCase();

    if (filter === "") return true;

    return (
      found.txtDocNo.toLowerCase().includes(filter) ||
      (found.txtNote ?? "").toLowerCase().includes(filter) ||
      (found.dtpDate ?? "").includes(filter)
    );
  });

  // Esc closes the Search list
  useEffect(() => {
    if (!chkFindOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setChkFindOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);

    return () => window.removeEventListener("keydown", onKeyDown);
  }, [chkFindOpen]);

  // Alt+S -> Save (new), Alt+M -> Modify (saved), Alt+E -> Search, Alt+D ->
  // Delete, Alt+P -> Print, Alt+T -> Post (the old Ctrl+T), Alt+C -> Clear
  useAltShortcuts({
    s: () => {
      if (!chkSaved) handleSave();
    },
    m: () => {
      if (chkSaved) handleSave();
    },
    e: handleSearch,
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
    } else if (action === "Search") {
      handleSearch();
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
    <main className="mt-5 flex h-fit min-h-[700px] w-full max-w-300 flex-col overflow-hidden border border-gray-400 bg-white text-[12px] text-slate-700">

      {/* TITLE BAR */}
      <div className="flex h-[28px] w-full shrink-0 items-center bg-[#a7dfc0]">
        <h1 className="ml-[5px] text-[17px] font-semibold text-[#374151]">
          Stock Adjustment
        </h1>
      </div>

      {/* FORM BODY */}
      <div className="m-[12px] flex min-h-0 flex-1 flex-col px-[12px] pb-[12px] pt-0">

      {/* HEADER FORM: Branch, Entry No., Date */}
      <section className="mb-[12px] flex h-[30px] bg-white shrink-0 items-center justify-between gap-4">

        {/* Branch */}
        <div className="flex min-w-0 items-center gap-1">
          <label htmlFor="lkpBranch" className="w-[92px] shrink-0 text-right text-[14px] text-gray-600">
            Branch :
          </label>

          <div className="w-[220px] max-w-full">
            <Select<SelectOption, false>
              inputId="lkpBranch"
              name="lkpBranch"
              options={branchOptions}
              value={lkpBranch}
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
            disabled={chkPosted}
            className="input-style w-[142px]"
          />
        </div>
      </section>

      {/* STOCK TABLE */}
<main className="customer-table-scroll flex min-h-0 flex-1 flex-col bg-white">
  <div
    ref={gridScroll.ref}
    className="customer-table-scroll min-h-0 flex-1 overflow-auto border border-[#bfe8d0]"
  >
    <table className="customer-table-scroll w-full min-w-[900px] table-fixed border-collapse border border-[#bfe8d0]">
            <colgroup>
              <col style={{ width: "17px" }} />
              <col style={{ width: "43px" }} />
              <col style={{ width: "19%" }} />
              <col style={{ width: "33%" }} />
              <col style={{ width: "6.5%" }} />
              <col style={{ width: "8.5%" }} />
              <col style={{ width: "8.5%" }} />
              <col style={{ width: "9.5%" }} />
              <col style={{ width: "10.5%" }} />
            </colgroup>

            <thead className="sticky top-0 z-10 bg-[#edf9f2]">
              <tr className="h-[30px] text-left text-[14px] text-gray-600">
                <th className="border border-[#bfe8d0] px-1 font-normal"></th>
                <th className="border border-[#bfe8d0] px-1 text-center font-normal">Sl.</th>
                <th className="border border-[#bfe8d0] px-2 font-normal">Item ID</th>
                <th className="border border-[#bfe8d0] px-2 font-normal">Item Name</th>
                <th className="border border-[#bfe8d0] px-2 font-normal">Unit</th>
                <th className="border border-[#bfe8d0] px-2 text-right font-normal">Qty. In</th>
                <th className="border border-[#bfe8d0] px-2 text-right font-normal">Qty. Out</th>
                <th className="border border-[#bfe8d0] px-2 text-right font-normal">Unit Cost</th>
                <th className="border border-[#bfe8d0] px-2 text-right font-normal">Total Cost</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((row, index) => (
                <tr
                  key={row.id}
                  onClick={() => setActiveRow(index)}
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
                  <td className="border border-[#bfe8d0] p-0"
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
                      isClearable
                      isDisabled={chkPosted}
                      placeholder=""
                      menuPortalTarget={document.body}
                      menuPosition="fixed"
                      menuPlacement="auto"
                      menuShouldScrollIntoView
                    />
                  </td>

                  {/* ITEM NAME */}
                  <td className="border border-[#bfe8d0] p-0"
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
                      styles={
                        {
                          ...tableSelectStyles,
                          ...itemNameMenuStyles,
                        } as StylesConfig<SelectOption, false>
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

                  {/* QTY. IN */}
                  <td className="border border-[#bfe8d0] p-0">
                    <input
                      id={`txtQtyIn-${index}`}
                      name="txtQtyIn"
                      type="number"
                      min="0"
                      step="0.001"
                      value={row.txtQtyIn}
                      readOnly={chkPosted}
                      onChange={(event) => updateQty(index, "txtQtyIn", event.target.value)}
                      onBlur={(event) => showQtyIn(index, event.target.value)}
                      onKeyDown={(event) => handleQtyInKeyDown(event, index)}
                      className="number-no-spinner h-[26px] w-full bg-transparent px-2 text-right outline-none focus:bg-[#f1f8ff]"
                    />
                  </td>

                  {/* QTY. OUT */}
                  <td className="border border-[#bfe8d0] p-0">
                    <input
                      id={`txtQtyOut-${index}`}
                      name="txtQtyOut"
                      type="number"
                      min="0"
                      step="0.001"
                      value={row.txtQtyOut}
                      readOnly={chkPosted}
                      onChange={(event) => updateQty(index, "txtQtyOut", event.target.value)}
                      onBlur={(event) => showQtyOut(index, event.target.value)}
                      onKeyDown={(event) => handleQtyOutKeyDown(event, index)}
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

                  {/* TOTAL COST: (Qty. In - Qty. Out) x Unit Cost */}
                  <td className="border border-[#bfe8d0] p-0">
                    <input
                      id={`txtTotalCost-${index}`}
                      name="txtTotalCost"
                      value={
                        row.txtQtyIn !== "" || row.txtQtyOut !== "" || row.txtUnitCost !== ""
                          ? formatAmount(getTotalCost(row))
                          : ""
                      }
                      readOnly
                      className="h-[26px] w-full bg-transparent px-2 text-right outline-none"
                    />
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
              <col style={{ width: "19%" }} />
              <col style={{ width: "33%" }} />
              <col style={{ width: "6.5%" }} />
              <col style={{ width: "8.5%" }} />
              <col style={{ width: "8.5%" }} />
              <col style={{ width: "9.5%" }} />
              <col style={{ width: "10.5%" }} />
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

                {/* TOTAL QTY. IN (under the Qty. In column) */}
                <td className="p-0">
                  <input
                    id="txtTotalQtyIn"
                    name="txtTotalQtyIn"
                    value={formatQty(totalQtyIn)}
                    readOnly
                    className="input-style w-full min-w-0 text-right"
                  />
                </td>

                {/* TOTAL QTY. OUT (under the Qty. Out column) */}
                <td className="p-0">
                  <input
                    id="txtTotalQtyOut"
                    name="txtTotalQtyOut"
                    value={formatQty(totalQtyOut)}
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

      {/* the "Do you want delete ?" question */}
      {confirmDialog}

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
        {["Save", "Search", "Delete", "Print", "Post", "Clear"].map((action) => {
          const isSave = action === "Save";
          const isSearch = action === "Search";
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
                  : action === "Search"
                    ? !lkpBranch || saving
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
              {isSearch ? (
                <>
                  S
                  <span className="underline underline-offset-2">e</span>
                  arch
                </>
              ) : (
                <>
                  <span className="underline underline-offset-2">
                    {label.charAt(0)}
                  </span>
                  {label.slice(1)}
                </>
              )}
            </button>
          );
        })}
      </footer>

      </div>

      {/* THE SEARCH LIST (the old Find): click a row, or press Enter on it */}
      {chkFindOpen && (
        <div
          className="fixed inset-0 z-[100000] flex items-start justify-center bg-black/30 pt-[80px]"
          onClick={() => setChkFindOpen(false)}
        >
          <div
            role="dialog"
            aria-label="Search Stock Adjustment"
            className="w-[640px] max-w-[95vw] border border-gray-400 bg-white shadow-lg"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex h-[28px] items-center justify-between bg-[#a7dfc0] pl-[8px] pr-[6px]">
              <h2 className="text-[15px] font-semibold text-[#374151]">
                Stock Adjustment - Search
              </h2>

              <button
                type="button"
                aria-label="Close"
                onClick={() => setChkFindOpen(false)}
                className="px-[6px] text-[16px] leading-none text-[#374151]"
              >
                ×
              </button>
            </div>

            <div className="p-[10px]">
              <input
                id="txtFindFilter"
                name="txtFindFilter"
                autoFocus
                value={txtFindFilter}
                onChange={(event) => setTxtFindFilter(event.target.value)}
                placeholder="Type to filter by Entry No., Date or Note"
                className="input-style mb-[8px] w-full"
              />

              <div className="max-h-[360px] overflow-auto border border-[#bfe8d0]">
                <table className="w-full table-fixed border-collapse text-[13px]">
                  <colgroup>
                    <col style={{ width: "26%" }} />
                    <col style={{ width: "17%" }} />
                    <col />
                    <col style={{ width: "17%" }} />
                    <col style={{ width: "12%" }} />
                  </colgroup>

                  <thead className="sticky top-0 bg-[#edf9f2] text-gray-600">
                    <tr className="h-[28px]">
                      <th className="border border-[#bfe8d0] px-2 text-left font-normal">Entry No.</th>
                      <th className="border border-[#bfe8d0] px-2 text-left font-normal">Date</th>
                      <th className="border border-[#bfe8d0] px-2 text-left font-normal">Note</th>
                      <th className="border border-[#bfe8d0] px-2 text-right font-normal">Total Cost</th>
                      <th className="border border-[#bfe8d0] px-2 text-center font-normal">Posted</th>
                    </tr>
                  </thead>

                  <tbody>
                    {visibleFindRows.map((found) => (
                      <tr
                        key={found.txtDocNo}
                        tabIndex={0}
                        onClick={() => pickFound(found)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") pickFound(found);
                        }}
                        className="h-[28px] cursor-pointer hover:bg-[#eefbf4] focus:bg-[#eefbf4] focus:outline-none"
                      >
                        <td className="border border-[#bfe8d0] px-2">{found.txtDocNo}</td>
                        <td className="border border-[#bfe8d0] px-2">
                          {found.dtpDate ? found.dtpDate.split("-").reverse().join("/") : ""}
                        </td>
                        <td className="truncate border border-[#bfe8d0] px-2">{found.txtNote ?? ""}</td>
                        <td className="border border-[#bfe8d0] px-2 text-right">
                          {formatAmount(Number(found.txtTotalCost))}
                        </td>
                        <td className="border border-[#bfe8d0] px-2 text-center">
                          {found.chkPosted ? "Yes" : ""}
                        </td>
                      </tr>
                    ))}

                    {visibleFindRows.length === 0 && (
                      <tr className="h-[40px]">
                        <td
                          colSpan={5}
                          className="border border-[#bfe8d0] px-2 text-center text-gray-500"
                        >
                          No Stock Adjustment found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
    </div>
  );
};

export default StockAdjustmentPage;
