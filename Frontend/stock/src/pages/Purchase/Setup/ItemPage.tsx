import React, { useEffect, useState } from "react";
import Select, { type StylesConfig } from "react-select";
import { toast } from "react-toastify";
import { X } from "lucide-react";
import { useEnterAsTab } from "../../../hooks/useEnterAsTab";
import { useAltShortcuts } from "../../../hooks/useAltShortcuts";
import { useButtonPermissions } from "../../../hooks/useButtonPermissions";
import {
  filterLabelOrValue,
  BranchMenuList,
  BranchOption,
  branchMenuStyles,
} from "../../../components/BranchSelect/branchSelectParts";
import {
  makePairComponents,
  filterPairOption,
  pairMenuStyles,
  pairNameMenuStyles,
} from "../../../components/PairSelect/pairSelectParts";

/* =========================================================
   TYPES
========================================================= */

interface BranchRow {
  id: number;
  lkpBranch: string;
  txtItemLocation: string;
  chkInactive: boolean;
  chkAllowSaleBelowCost: boolean;
}

interface SelectOption {
  value: string;
  label: string;
  // Only set on the Item Group / Supplier ID + Name selects, which
  // show both columns in the open list and filter on either.
  id?: string;
  name?: string;
}

/* =========================================================
   ID | NAME DROPDOWN (Item Group, Supplier)

   The helper itself (the two-column "ID | Name" list, the search on
   either column, the menu styles) is shared with other pages - see
   components/PairSelect/pairSelectParts.tsx.
========================================================= */

// Created once (not inside the component) so react-select doesn't
// remount the menu on every render.
const itemGroupIdComponents = makePairComponents(
  "Item Group ID",
  "Item Group Name",
  false
);
const itemGroupNameComponents = makePairComponents(
  "Item Group ID",
  "Item Group Name",
  true
);
const supplierIdComponents = makePairComponents(
  "Supplier ID",
  "Supplier Name",
  false
);
const supplierNameComponents = makePairComponents(
  "Supplier ID",
  "Supplier Name",
  true
);

/* =========================================================
   ITEM PAGE
========================================================= */

// dbo.tblmenu fmenuid for the Item page (fmenucaption = "Item").
const MENU_ID = "010201";

  const ItemPage: React.FC = () => {
  const handleEnterAsTab = useEnterAsTab();
  const perms = useButtonPermissions(MENU_ID);

  /* =========================================================
     FORM STATE
  ========================================================= */

  const [txtItemID, setTxtItemID] = useState("");

  // Does the Item ID already exist? false -> the button says Save (new item),
  // true -> Modify. Set by the load (blur / Search), reset when the ID is typed.
  const [hasSavedItem, setHasSavedItem] = useState(false);
  const [txtItemName, setTxtItemName] = useState("");
  const [txtItemDescription, setTxtItemDescription] = useState("");
  const [lkpUnit, setLkpUnit] = useState("");

  const [txtPacking, setTxtPacking] =
    useState("0");

  const [txtCBM, setTxtCBM] =
    useState("0.0000");

  const [lkpItemGroupID, setLkpItemGroupID] =
    useState("");
  //@ts-ignore
  const [lkpItemGroupName, setLkpItemGroupName] =
    useState("");

  const [lkpSupplierID, setLkpSupplierID] =
    useState("");
  //@ts-ignore
  const [lkpSupplierName, setLkpSupplierName] =
    useState("");

  const [txtSupplierItemID, setTxtSupplierItemID] =
    useState("");

  const [txtReorderLevel, setTxtReorderLevel] =
    useState("0");

  const [txtReorderQty, setTxtReorderQty] =
    useState("0");

  const [chkAllBranches, setChkAllBranches] = useState(false);

  /* =========================================================
     BRANCH TABLE
  ========================================================= */

  const [rows, setRows] = useState<BranchRow[]>([
    {
      id: 1,
      lkpBranch: "",
      txtItemLocation: "",
      chkInactive: false,
      chkAllowSaleBelowCost: false,
    },
    {
      id: 2,
      lkpBranch: "",
      txtItemLocation: "",
      chkInactive: false,
      chkAllowSaleBelowCost: false,
    },
    {
      id: 3,
      lkpBranch: "",
      txtItemLocation: "",
      chkInactive: false,
      chkAllowSaleBelowCost: false,
    },
    {
      id: 4,
      lkpBranch: "",
      txtItemLocation: "",
      chkInactive: false,
      chkAllowSaleBelowCost: false,
    },
    {
      id: 5,
      lkpBranch: "",
      txtItemLocation: "",
      chkInactive: false,
      chkAllowSaleBelowCost: false,
    },
  ]);

  /* =========================================================
     SELECT OPTIONS
  ========================================================= */

  const [unitOptions, setUnitOptions] = useState<SelectOption[]>([]);

  /* =========================================================
     LOAD UNIT LIST (lkpUnit dropdown)
  ========================================================= */

  useEffect(() => {
    const loadUnitList = async () => {
      try {
        const PstrCoID = localStorage.getItem("PstrCoID");

        if (!PstrCoID) {
          toast.error("getUnitList: no PstrCoID in localStorage");
          return;
        }

        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/Item/getUnitList?PstrCoID=${PstrCoID}`
        );

        if (!response.ok) {
          throw new Error(`HTTP Error: ${response.status}`);
        }

        const result = await response.json();

        if (!result.success) {
          console.error("getUnitList failed:", result.message);
          toast.error(`getUnitList failed: ${result.message}`);
          return;
        }

        const options: SelectOption[] = (result.data || []).map(
          (row: { lkpUnit: string }) => ({
            value: row.lkpUnit,
            label: row.lkpUnit,
          })
        );

        setUnitOptions(options);
      } catch (error) {
        console.error("getUnitList error:", error);
        toast.error(`getUnitList error: ${error instanceof Error ? error.message : String(error)}`);
      }
    };

    loadUnitList();
  }, []);

  /* =========================================================
     LOAD ITEM GROUP LIST (lkpItemGroupID dropdown; selecting
     an ID fills lkpItemGroupName automatically)
  ========================================================= */

  const [itemGroupList, setItemGroupList] = useState<
    { lkpItemGroupID: string; txtItemGroupName: string }[]
  >([]);

  useEffect(() => {
    const loadItemGroupList = async () => {
      try {
        const PstrCoID = localStorage.getItem("PstrCoID");

        if (!PstrCoID) {
          toast.error("getItemGroupList: no PstrCoID in localStorage");
          return;
        }

        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/Item/getItemGroupList?PstrCoID=${PstrCoID}`
        );

        if (!response.ok) {
          throw new Error(`HTTP Error: ${response.status}`);
        }

        const result = await response.json();

        if (!result.success) {
          console.error("getItemGroupList failed:", result.message);
          toast.error(`getItemGroupList failed: ${result.message}`);
          return;
        }

        setItemGroupList(result.data || []);
      } catch (error) {
        console.error("getItemGroupList error:", error);
        toast.error(`getItemGroupList error: ${error instanceof Error ? error.message : String(error)}`);
      }
    };

    loadItemGroupList();
  }, []);

  // Both selects use the ID as their value; only the text shown in
  // the box differs (ID in the first box, name in the second).
  const itemGroupIDOptions: SelectOption[] = itemGroupList.map(
    (group) => ({
      value: group.lkpItemGroupID,
      label: group.lkpItemGroupID,
      id: group.lkpItemGroupID,
      name: group.txtItemGroupName,
    })
  );

  const itemGroupNameOptions: SelectOption[] = itemGroupList.map(
    (group) => ({
      value: group.lkpItemGroupID,
      label: group.txtItemGroupName,
      id: group.lkpItemGroupID,
      name: group.txtItemGroupName,
    })
  );

  const selectItemGroup = (itemGroupID: string) => {
    const matchedGroup = itemGroupList.find(
      (group) => group.lkpItemGroupID === itemGroupID
    );

    setLkpItemGroupID(matchedGroup?.lkpItemGroupID || "");
    setLkpItemGroupName(matchedGroup?.txtItemGroupName || "");
  };

  /* =========================================================
     LOAD SUPPLIER LIST (lkpSupplierID dropdown; selecting
     an ID fills lkpSupplierName automatically)
  ========================================================= */

  const [supplierList, setSupplierList] = useState<
    { lkpSupplierID: string; txtSupplierName: string }[]
  >([]);

  useEffect(() => {
    const loadSupplierList = async () => {
      try {
        const PstrCoID = localStorage.getItem("PstrCoID");

        if (!PstrCoID) {
          toast.error("getSupplierList: no PstrCoID in localStorage");
          return;
        }

        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/Item/getSupplierList?PstrCoID=${PstrCoID}`
        );

        if (!response.ok) {
          throw new Error(`HTTP Error: ${response.status}`);
        }

        const result = await response.json();

        if (!result.success) {
          console.error("getSupplierList failed:", result.message);
          toast.error(`getSupplierList failed: ${result.message}`);
          return;
        }

        setSupplierList(result.data || []);
      } catch (error) {
        console.error("getSupplierList error:", error);
        toast.error(`getSupplierList error: ${error instanceof Error ? error.message : String(error)}`);
      }
    };

    loadSupplierList();
  }, []);

  const supplierIDOptions: SelectOption[] = supplierList.map(
    (supplier) => ({
      value: supplier.lkpSupplierID,
      label: supplier.lkpSupplierID,
      id: supplier.lkpSupplierID,
      name: supplier.txtSupplierName,
    })
  );

  const supplierNameOptions: SelectOption[] = supplierList.map(
    (supplier) => ({
      value: supplier.lkpSupplierID,
      label: supplier.txtSupplierName,
      id: supplier.lkpSupplierID,
      name: supplier.txtSupplierName,
    })
  );

  const selectSupplier = (supplierID: string) => {
    const matchedSupplier = supplierList.find(
      (supplier) => supplier.lkpSupplierID === supplierID
    );

    setLkpSupplierID(matchedSupplier?.lkpSupplierID || "");
    setLkpSupplierName(matchedSupplier?.txtSupplierName || "");
  };

  /* =========================================================
     LOAD BRANCH LIST (lkpBranch dropdown, grid rows)
  ========================================================= */

  const [branchOptions, setBranchOptions] = useState<SelectOption[]>([]);

  useEffect(() => {
    const loadBranchList = async () => {
      try {
        const PstrCoID = localStorage.getItem("PstrCoID");
        const PstrUserID = localStorage.getItem("PstrUserID");

        if (!PstrCoID || !PstrUserID) {
          toast.error("getBranchList: no PstrCoID/PstrUserID in localStorage");
          return;
        }

        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/Item/getBranchList?PstrCoID=${PstrCoID}&PstrUserID=${PstrUserID}`
        );

        if (!response.ok) {
          throw new Error(`HTTP Error: ${response.status}`);
        }

        const result = await response.json();

        if (!result.success) {
          console.error("getBranchList failed:", result.message);
          toast.error(`getBranchList failed: ${result.message}`);
          return;
        }

        const options: SelectOption[] = (result.data || []).map(
          (row: { lkpBranch: string; txtBranchName: string }) => ({
            value: row.lkpBranch,
            label: row.txtBranchName,
          })
        );

        setBranchOptions(options);
      } catch (error) {
        console.error("getBranchList error:", error);
        toast.error(`getBranchList error: ${error instanceof Error ? error.message : String(error)}`);
      }
    };

    loadBranchList();
  }, []);

  /* =========================================================
     UPDATE TABLE ROW
  ========================================================= */

  const updateRow = (
    id: number,
    field: keyof BranchRow,
    value: string | boolean,
  ) => {
    setRows((currentRows) =>
      currentRows.map((row) =>
        row.id === id
          ? {
              ...row,
              [field]: value,
            }
          : row,
      ),
    );
  };

  /* =========================================================
     BUTTON HANDLERS
  ========================================================= */

  // The one button: Save for a new Item ID, Modify for an existing one (the
  // old form switched its button text between "&Save" and "&Modify").
  const actionWord = hasSavedItem ? "Modify" : "Save";
  const canSaveOrModify = hasSavedItem ? perms.modify : perms.save;

  const handleSave = async () => {
    if (!canSaveOrModify) {
      toast.error(`You do not have permission to ${actionWord}.`);
      return;
    }

    // the boxes with the red *, in page order - the first empty one stops the
    // save and gets the cursor (the server checks the same list)
    const requiredBoxes: { id: string; value: string; message: string }[] = [
      { id: "txtItemID", value: txtItemID, message: "Please input 'Item ID'" },
      { id: "txtItemName", value: txtItemName, message: "Please input 'Item Name'" },
      { id: "lkpUnit", value: lkpUnit, message: "Please select 'Unit'" },
      { id: "lkpItemGroupID", value: lkpItemGroupID, message: "Please select 'Item Group'" },
      { id: "lkpSupplierID", value: lkpSupplierID, message: "Please select 'Supplier'" },
      { id: "txtSupplierItemID", value: txtSupplierItemID, message: "Please input 'Supplier Item ID'" },
    ];

    const missing = requiredBoxes.find((box) => !box.value.trim());

    if (missing) {
      toast.warning(missing.message);
      document.getElementById(missing.id)?.focus();
      return;
    }

    const validRows = rows.filter((row) => row.lkpBranch);

    if (validRows.length === 0) {
      toast.warning("Please select at least one 'Branch'");
      document.getElementById(`lkpBranch_${rows[0]?.id ?? 1}`)?.focus();
      return;
    }

    const PstrCoID = localStorage.getItem("PstrCoID");
    const PstrUserID = localStorage.getItem("PstrUserID");

    if (!PstrCoID || !PstrUserID) {
      toast.error("Company ID / User ID not found. Please log in again.");
      return;
    }

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/Item/saveItem`,
        {
          method: "POST",
          credentials: "include", // the server checks the session and the rights
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            PstrCoID,
            PstrUserID,
            txtItemID,
            txtItemName,
            txtItemDescription: txtItemDescription || null,
            lkpUnit,
            txtPacking,
            txtCBM,
            lkpItemGroupID,
            lkpSupplierID: lkpSupplierID || null,
            txtSupplierItemID,
            txtReorderLevel,
            txtReorderQty,
            rows: validRows.map((row) => ({
              lkpBranch: row.lkpBranch,
              txtItemLocation: row.txtItemLocation || null,
              chkAllowSaleBelowCost: row.chkAllowSaleBelowCost,
              chkInactive: row.chkInactive,
            })),
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        toast.error(
          result.message ||
            (hasSavedItem ? "Not modified, try again." : "Not saved, try again.")
        );

        // the backend validator names the field that failed - same name as
        // the element id, so the cursor goes straight into it
        if (result.field) {
          document.getElementById(result.field)?.focus();
        }

        return;
      }

      toast.success(
        result.message ||
          (hasSavedItem ? "Item modified successfully." : "Item saved successfully.")
      );

      // load the item again: it now exists, so the button flips to Modify
      findItem(txtItemID, { silent: true });
    } catch (error) {
      console.error("saveItem error:", error);
      toast.error("Cannot connect to Item API.");
    }
  };

  /* =========================================================
     FIND ITEM (mode 'G')

     `silent` is used for the Item ID onBlur auto-load: leaving
     the field with an ID that doesn't exist yet is the normal
     case for a brand-new item, so that path stays quiet (no
     "required"/"not found" toasts, no success toast either).
     The explicit Find button always reports what happened.
  ========================================================= */

  const findItem = async (
    itemId: string,
    options: { silent?: boolean } = {}
  ) => {
    const { silent = false } = options;

    if (!itemId) {
      if (!silent) {
        toast.warning("Item ID is required.");
      }
      return;
    }

    const PstrCoID = localStorage.getItem("PstrCoID");

    if (!PstrCoID) {
      toast.error("Company ID not found. Please log in again.");
      return;
    }

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/Item/getItem?PstrCoID=${PstrCoID}&txtItemID=${itemId}`
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        setHasSavedItem(false);

        if (!silent) {
          toast.error(result.message || "Item not found.");
        }
        return;
      }

      setHasSavedItem(true);

      const header = result.header;

      setTxtItemName(header.txtItemName || "");
      setTxtItemDescription(header.txtItemDescription || "");
      setLkpUnit(header.lkpUnit || "");
      setTxtPacking(String(header.txtPacking ?? "0"));
      setTxtCBM(String(header.txtCBM ?? "0.0000"));

      setLkpItemGroupID(header.lkpItemGroupID || "");
      setLkpItemGroupName(
        itemGroupList.find((group) => group.lkpItemGroupID === header.lkpItemGroupID)
          ?.txtItemGroupName || ""
      );

      setLkpSupplierID(header.lkpSupplierID || "");
      setLkpSupplierName(
        supplierList.find((supplier) => supplier.lkpSupplierID === header.lkpSupplierID)
          ?.txtSupplierName || ""
      );

      setTxtSupplierItemID(header.txtSupplierItemID || "");
      setTxtReorderLevel(String(header.txtReorderLevel ?? "0"));
      setTxtReorderQty(String(header.txtReorderQty ?? "0"));

      const foundRows: BranchRow[] = (result.rows || []).map(
        (row: {
          lkpBranch: string;
          txtItemLocation: string | null;
          chkAllowSaleBelowCost: boolean;
          chkInactive: boolean;
        }, index: number) => ({
          id: index + 1,
          lkpBranch: row.lkpBranch,
          txtItemLocation: row.txtItemLocation || "",
          chkAllowSaleBelowCost: row.chkAllowSaleBelowCost,
          chkInactive: row.chkInactive,
        })
      );

      const blankRowsNeeded = Math.max(0, 5 - foundRows.length);
      const blankRows: BranchRow[] = Array.from(
        { length: blankRowsNeeded },
        (_, index) => ({
          id: foundRows.length + index + 1,
          lkpBranch: "",
          txtItemLocation: "",
          chkInactive: false,
          chkAllowSaleBelowCost: false,
        })
      );

      setRows([...foundRows, ...blankRows]);

      if (!silent) {
        toast.success("Item loaded.");
      }
    } catch (error) {
      console.error("getItem error:", error);
      toast.error("Cannot connect to Item API.");
    }
  };

  const handleFind = () => findItem(txtItemID);

  const handleItemIDBlur = () => findItem(txtItemID, { silent: true });

  const handleDelete = async () => {
    if (!perms.delete) {
      toast.error("You do not have permission to Delete.");
      return;
    }

    if (!txtItemID) {
      toast.warning("Item ID is required.");
      return;
    }

    const shouldDelete = window.confirm(
      "Are you sure you want to delete this item?"
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
        `${import.meta.env.VITE_API_URL}/Item/deleteItem`,
        {
          method: "DELETE",
          credentials: "include", // the server checks the session and the rights
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            PstrCoID,
            PstrYear,
            PstrUserID,
            txtItemID,
            txtItemName,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        toast.error(result.message || "Item could not be deleted.");
        return;
      }

      toast.success(result.message || "Item deleted successfully.");
      handleClear();
    } catch (error) {
      console.error("deleteItem error:", error);
      toast.error("Cannot connect to Item API.");
    }
  };

  const handleDeleteBranchRow = async (row: BranchRow) => {
    if (!perms.delete) {
      toast.error("You do not have permission to Delete.");
      return;
    }

    if (!txtItemID) {
      toast.warning("Item ID is required.");
      return;
    }

    if (!row.lkpBranch) {
      return;
    }

    const shouldDelete = window.confirm(
      "Are you sure you want to delete this branch row?"
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

    const branchName =
      branchOptions.find((option) => option.value === row.lkpBranch)
        ?.label || row.lkpBranch;

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/Item/deleteItemBranchRow`,
        {
          method: "DELETE",
          credentials: "include", // the server checks the session and the rights
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            PstrCoID,
            PstrYear,
            PstrUserID,
            txtItemID,
            txtItemName,
            lkpBranch: row.lkpBranch,
            branchName,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        toast.error(result.message || "Branch row could not be deleted.");
        return;
      }

      toast.success(result.message || "Branch row deleted successfully.");

      updateRow(row.id, "lkpBranch", "");
      updateRow(row.id, "txtItemLocation", "");
      updateRow(row.id, "chkAllowSaleBelowCost", false);
      updateRow(row.id, "chkInactive", false);
    } catch (error) {
      console.error("deleteItemBranchRow error:", error);
      toast.error("Cannot connect to Item API.");
    }
  };

  const handleClear = () => {
    setHasSavedItem(false);
    setTxtItemID("");
    setTxtItemName("");
    setTxtItemDescription("");

    setLkpUnit("");

    setTxtPacking("0");
    setTxtCBM("0.0000");

    setLkpItemGroupID("");
    setLkpItemGroupName("");

    setLkpSupplierID("");
    setLkpSupplierName("");

    setTxtSupplierItemID("");

    setTxtReorderLevel("0");
    setTxtReorderQty("0");

    setChkAllBranches(false);

    setRows((currentRows) =>
      currentRows.map((row) => ({
        ...row,
        lkpBranch: "",
        txtItemLocation: "",
        chkInactive: false,
        chkAllowSaleBelowCost: false,
      })),
    );
  };

  /* =========================================================
     KEYBOARD SHORTCUTS
     Alt+S -> Save, Alt+C -> Clear (matches the underlined
     accelerator letters on the buttons).
  ========================================================= */

  // Alt+S -> Save (new item), Alt+M -> Modify (existing item),
  // Alt+D -> Delete, Alt+C -> Clear
  useAltShortcuts({
    s: () => {
      if (!hasSavedItem) handleSave();
    },
    m: () => {
      if (hasSavedItem) handleSave();
    },
    d: handleDelete,
    c: handleClear,
  });

  /* =========================================================
     COMMON INPUT CLASS
  ========================================================= */

  // the shared form-input look from index.css
  const inputClass = "w-full input-style";

  /* =========================================================
     LABEL CLASS
  ========================================================= */

  const labelClass =
    "relative flex items-center justify-end whitespace-nowrap pr-3 text-right text-[14px] text-gray-600";

  /* =========================================================
     REQUIRED RED DOT
  ========================================================= */

  const requiredDot = (
    <span
      className="
        absolute
        right-[15px]
        -top-0.5
        h-[4px]
        w-[4px]
       text-red-500
        
       
      "
    >*</span>
  );

  /* =========================================================
     REACT SELECT - FORM
  ========================================================= */

  const reactSelectStyles: StylesConfig<
    SelectOption,
    false
  > = {
    control: (provided, state) => ({
      ...provided,
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

    valueContainer: (provided) => ({
      ...provided,
      height: "23px",
      minHeight: "23px",
      padding: "0 6px",
    }),

    input: (provided) => ({
      ...provided,
      margin: "0px",
      padding: "0px",
      fontSize: "11px",
      color: "#374151",
    }),

    singleValue: (provided) => ({
      ...provided,
      margin: 0,
      fontSize: "11px",
      color: "#374151",
    }),

    placeholder: (provided) => ({
      ...provided,
      margin: 0,
      fontSize: "11px",
      color: "#808080",
    }),

    indicatorsContainer: (provided) => ({
      ...provided,
      height: "23px",
    }),

  dropdownIndicator: (provided) => ({
    ...provided,
    padding: "4px 6px",
    color: "#64748b",
    "&:hover": {
      color: "#64748b",
    },
  }),

  clearIndicator: (provided) => ({
    ...provided,
    padding: "4px 6px",
    color: "#64748b",
    "&:hover": {
      color: "#64748b",
    },
  }),

  indicatorSeparator: () => ({
    display: "none",
  }),

  menu: (provided) => ({
    ...provided,
    zIndex: 100,
    fontSize: "14px",
    borderRadius: "4px",
    marginTop: "2px",
  }),

  menuList: (provided) => ({
    ...provided,
    padding: "3px 0",
  }),

  option: (provided, state) => ({
    ...provided,
    fontSize: "14px",
    padding: "7px 8px",
    backgroundColor: state.isSelected
      ? "#dbeafe"
      : state.isFocused
        ? "#eff6ff"
        : "#ffffff",
    color: "#334155",
    cursor: "pointer",
  }),
};

  /* =========================================================
     REACT SELECT - TABLE
  ========================================================= */

  const tableSelectStyles: StylesConfig<
    SelectOption,
    false
  > = {
    ...reactSelectStyles,

    control: (base) => ({
      ...base,
      minHeight: "28px",
      height: "28px",
      width: "100%",
      border: "none",
      borderRadius: "0px",
      boxShadow: "none",
      backgroundColor: "transparent",
      fontSize: "12px",
      cursor: "pointer",

      "&:hover": {
        border: "none",
      },
    }),

    valueContainer: (base) => ({
      ...base,
      height: "28px",
      minWidth: 0,
      padding: "0 8px",
      overflow: "hidden",
    }),

    input: (base) => ({
      ...base,
      margin: 0,
      padding: 0,
      fontSize: "12px",
    }),

    singleValue: (base) => ({
      ...base,
      color: "#334155",
      fontSize: "12px",
      maxWidth: "100%",
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
    }),

    placeholder: (base) => ({
      ...base,
      color: "#64748b",
      fontSize: "12px",
    }),

    indicatorsContainer: (base) => ({
      ...base,
      height: "28px",
      flexShrink: 0,
    }),

    dropdownIndicator: (base) => ({
      ...base,
      padding: "4px",
      color: "#64748b",
    }),

    clearIndicator: (base) => ({
      ...base,
      padding: "4px",
    }),

    indicatorSeparator: () => ({
      display: "none",
    }),

    menu: (base) => ({
      ...base,
      zIndex: 9999,
      fontSize: "12px",
    }),

    menuList: (base) => ({
      ...base,
      padding: "3px 0",
    }),

    option: (base, state) => ({
      ...base,
      minHeight: "30px",
      padding: "6px 8px",
      fontSize: "12px",

      backgroundColor: state.isSelected
        ? "#dbeafe"
        : state.isFocused
          ? "#eff6ff"
          : "#ffffff",

      color: "#475569",
      cursor: "pointer",
    }),
  };

  /* =========================================================
     JSX
  ========================================================= */

  return (
    /*
      IMPORTANT:
      Do not use mx-auto or percentage width here.

      The Item form is kept at a fixed 960px width so
      opening/closing the sidebar does not resize or
      recenter this page.
    */
    <div
      onKeyDown={handleEnterAsTab}
      className="
        min-h-screen
        w-full
        overflow-x-auto
        flex
        justify-center
        items-center
        bg-white
      "
    >

      {/* =====================================================
          FIXED CONTENT WIDTH
      ====================================================== */}

      <div
        className="
          w-[960px]
          min-w-[960px]
          max-w-[960px]
          ml-[4px]
          mt-[0px]
          bg-white
          p-0
        "
      >

        {/* =====================================================
            MAIN CONTAINER
        ====================================================== */}

        {/* no overflow-hidden: the dropdown lists must stay visible */}
        <div
          className="
            w-full
            border
            border-slate-400
            shadow-sm
          "
        >

          {/* ===================================================
              HEADER
          =================================================== */}

          <div className="flex h-[28px] w-full items-center bg-[#a7dfc0]">
            <h1 className="ml-[5px] text-[17px] font-semibold text-[#374151]">
              Item
            </h1>
          </div>

          {/* ===================================================
              FORM
          =================================================== */}

          <div className="p-[12px] m-[12px]">
            {/* =================================================
                ITEM ID
            ================================================= */}

            <div
              className="
                mb-2
                grid
                grid-cols-[130px_minmax(0,1fr)]
                items-center
                gap-2
              "
            >
              <label
                htmlFor="txtItemID"
                className={labelClass}
              >
                {requiredDot}
                Item ID :
              </label>

              <input
                required
                id="txtItemID"
                name="txtItemID"
                type="text"
                value={txtItemID}
                onChange={(e) => {
                  setTxtItemID(e.target.value);
                  setHasSavedItem(false);
                }}
                onBlur={handleItemIDBlur}
                className="w-[225px] input-style"
              />
            </div>

            {/* =================================================
                ITEM NAME
            ================================================= */}

            <div
              className="
                mb-2
                grid
                grid-cols-[130px_minmax(0,1fr)]
                items-center
                gap-2
              "
            >
              <label
                htmlFor="txtItemName"
                className={labelClass}
              >
                {requiredDot}
                Item Name :
              </label>

              <input
                required
                id="txtItemName"
                name="txtItemName"
                type="text"
                value={txtItemName}
                onChange={(e) => setTxtItemName(e.target.value)}
                className="input-style"
              />
            </div>

            {/* =================================================
                DESCRIPTION
            ================================================= */}

            <div
              className="
                mb-2
                grid
                grid-cols-[130px_minmax(0,1fr)]
                items-center
                gap-2
              "
            >
              <label htmlFor="txtItemDescription" className={labelClass}>
                Description :
              </label>

              <input
                id="txtItemDescription"
                name="txtItemDescription"
                type="text"
                value={txtItemDescription}
                onChange={(e) => setTxtItemDescription(e.target.value)}
                className="input-style"
              />
            </div>

            {/* =================================================
                UNIT
            ================================================= */}

            <div
              className="
                mb-2
                grid
                grid-cols-[130px_155px]
                items-center
                gap-2
              "
            >
              <label
                htmlFor="lkpUnit"
                className={labelClass}
              >
                {requiredDot}
                Unit :
              </label>

              <Select
                required
                inputId="lkpUnit"
                name="lkpUnit"
                options={unitOptions}
                value={
                  unitOptions.find((option) => option.value === lkpUnit) || null
                }
                onChange={(option) => setLkpUnit(option?.value || "")}
                styles={reactSelectStyles}
                isClearable
                 
                                />
            </div>

            {/* =================================================
                PACKING + CBM
            ================================================= */}

            <div
              className="
                mb-2
                grid
                grid-cols-[130px_155px_65px_120px]
                items-center
                gap-2
              "
            >
              <label htmlFor="txtPacking" className={labelClass}>
                Packing :
              </label>

              <input
                id="txtPacking"
                name="txtPacking"
                type="text"
                value={txtPacking}
                style={{
                  textAlign: "right",
                }}
                onChange={(e) =>
                  setTxtPacking(e.target.value)
                }
                className="input-style"
              />

              <label htmlFor="txtCBM" className={labelClass}>
                CBM :
              </label>

              <input
                id="txtCBM"
                name="txtCBM"
                
                type="text"
                value={txtCBM}
                style={{
                  textAlign: "right",
                  width:'85%'
                }}
                onChange={(e) =>
                  setTxtCBM(e.target.value)
                }
                className="input-style"
              />
            </div>

            {/* =================================================
                ITEM GROUP
            ================================================= */}

            <div
              className="
                mb-2
                grid
                grid-cols-[130px_155px_minmax(0,1fr)]
                items-center
                gap-2
              "
            >
              <label
                htmlFor="lkpItemGroupID"
                className={labelClass}
              >
                {requiredDot}
                Item Group :
              </label>

              <Select
                required
                inputId="lkpItemGroupID"
                name="lkpItemGroupID"
                options={itemGroupIDOptions}
                value={
                  itemGroupIDOptions.find(
                    (option) => option.value === lkpItemGroupID,
                  ) || null
                }
                onChange={(option) =>
                  selectItemGroup(option?.value || "")
                }
                styles={{ ...reactSelectStyles, ...pairMenuStyles }}
                components={itemGroupIdComponents}
                filterOption={filterPairOption}
                noOptionsMessage={() => "No Item Group Found"}
                menuPortalTarget={document.body}
                menuPosition="fixed"
                isSearchable
                isClearable
              />

              <Select
                inputId="lkpItemGroupName"
                name="lkpItemGroupName"
                options={itemGroupNameOptions}
                value={
                  itemGroupNameOptions.find(
                    (option) => option.value === lkpItemGroupID,
                  ) || null
                }
                onChange={(option) =>
                  selectItemGroup(option?.value || "")
                }
                styles={{ ...reactSelectStyles, ...pairNameMenuStyles }}
                components={itemGroupNameComponents}
                filterOption={filterPairOption}
                noOptionsMessage={() => "No Item Group Found"}
                menuPortalTarget={document.body}
                menuPosition="fixed"
                isSearchable
                isClearable
              />
            </div>

            {/* =================================================
                SUPPLIER
            ================================================= */}

            <div
              className="
                mb-2
                grid
                grid-cols-[130px_155px_minmax(0,1fr)]
                items-center
                gap-2
              "
            >
              <label htmlFor="lkpSupplierID" className={labelClass}>
                {requiredDot}
                Supplier :
              </label>

              <Select
                required
                inputId="lkpSupplierID"
                name="lkpSupplierID"
                options={supplierIDOptions}
                value={
                  supplierIDOptions.find(
                    (option) => option.value === lkpSupplierID,
                  ) || null
                }
                onChange={(option) =>
                  selectSupplier(option?.value || "")
                }
                styles={{ ...reactSelectStyles, ...pairMenuStyles }}
                components={supplierIdComponents}
                filterOption={filterPairOption}
                noOptionsMessage={() => "No Supplier Found"}
                menuPortalTarget={document.body}
                menuPosition="fixed"
                isSearchable
                isClearable
              />

              <Select
                inputId="lkpSupplierName"
                name="lkpSupplierName"
                options={supplierNameOptions}
                value={
                  supplierNameOptions.find(
                    (option) => option.value === lkpSupplierID,
                  ) || null
                }
                onChange={(option) =>
                  selectSupplier(option?.value || "")
                }
                styles={{ ...reactSelectStyles, ...pairNameMenuStyles }}
                components={supplierNameComponents}
                filterOption={filterPairOption}
                noOptionsMessage={() => "No Supplier Found"}
                menuPortalTarget={document.body}
                menuPosition="fixed"
                isSearchable
                isClearable
              />
            </div>

            {/* =================================================
                SUPPLIER ITEM ID
            ================================================= */}

            <div
              className="
                mb-2
                grid
                grid-cols-[130px_minmax(0,1fr)]
                items-center
                gap-2
              "
            >
              <label
                htmlFor="txtSupplierItemID"
                className={labelClass}
              >
                {requiredDot}
                Supplier Item ID :
              </label>

              <input
                id="txtSupplierItemID"
                name="txtSupplierItemID"
                type="text"
                value={txtSupplierItemID}
                onChange={(e) => setTxtSupplierItemID(e.target.value)}
                className="w-[275px] input-style"
              />
            </div>

            {/* =================================================
                REORDER LEVEL
            ================================================= */}

            <div
              className="
                mb-2
                grid
                grid-cols-[130px_155px]
                items-center
                gap-2
              "
            >
              <label htmlFor="txtReorderLevel" className={labelClass}>
                Reorder Level :
              </label>

              <input
                id="txtReorderLevel"
                name="txtReorderLevel"
                type="text"
                value={txtReorderLevel}
                onChange={(e) => setTxtReorderLevel(e.target.value)}
                className="input-style"
              />
            </div>

            {/* =================================================
                REORDER QTY + ALL BRANCHES
            ================================================= */}

            <div
              className="
                mb-3
                grid
                grid-cols-[130px_155px_minmax(0,1fr)]
                items-center
                gap-2
              "
            >
              <label htmlFor="txtReoderQty" className={labelClass}>
                Reorder Qty :
              </label>

              <input
                id="txtReoderQty"
                name="txtReoderQty"
                type="text"
                value={txtReorderQty}
                onChange={(e) => setTxtReorderQty(e.target.value)}
                className="input-style"
              />

              {/* ALL BRANCHES */}

              <div
                className="
                  ml-[35px]
                  flex
                  w-[145px]
                  items-center
                  gap-2
                  border
                  border-gray-300
                  p-1
                  whitespace-nowrap
                "
              >
                <input
                  id="chkAllBranches"
                  name="chkAllBranches"
                  type="checkbox"
                  checked={chkAllBranches}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setChkAllBranches(checked);

                    if (checked) {
                      setRows((currentRows) => {
                        const filledRows: BranchRow[] = branchOptions.map(
                          (branch, index) => ({
                            id: currentRows[index]?.id ?? index + 1,
                            lkpBranch: branch.value,
                            txtItemLocation: "",
                            chkAllowSaleBelowCost: false,
                            chkInactive: false,
                          })
                        );

                        const blankRows: BranchRow[] = currentRows
                          .slice(branchOptions.length)
                          .map((row) => ({
                            ...row,
                            lkpBranch: "",
                            txtItemLocation: "",
                            chkAllowSaleBelowCost: false,
                            chkInactive: false,
                          }));

                        return [...filledRows, ...blankRows];
                      });
                    }
                  }}
                  className="
                    h-[15px]
                    w-[15px]
                    accent-blue-600
                  "
                />

                <label
                  htmlFor="chkAllBranches"
                  className="
                    text-[12px]
                    text-slate-700
                  "
                >
                  All Branches
                </label>
              </div>
            </div>

            {/* =================================================
                BRANCH OPTIONS
            ================================================= */}

            <div className="mt-2">

              <table
                className="
                  w-full
                  table-fixed
                  border-collapse
                  border
                  border-slate-300
                  text-[11px]
                "
              >
                <thead>

                  <tr
                    className="
                      h-[30px]
                      bg-[#eef9f3]
                      text-[14px]
                      text-gray-600
                    "
                  >

                    {/* =========================================
                        BRANCH
                    ========================================== */}

                    <th
                      className="
                        w-[28%]
                        border
                        border-slate-300
                        px-2
                        text-left
                        font-normal
                      "
                    >
                      <span className="relative inline-block">
                        Branch

                        <span className="text-red-500">*</span>
                      </span>
                    </th>

                    {/* =========================================
                        ITEM LOCATION
                    ========================================== */}

                    <th
                      className="
                        w-[32%]
                        border
                        border-slate-300
                        px-2
                        text-left
                        font-normal
                      "
                    >
                      Item Location
                    </th>

                    {/* =========================================
                        ALLOW SALE BELOW COST
                    ========================================== */}

                    <th
                      className="
                        w-[24%]
                        border
                        border-slate-300
                        px-2
                        text-center
                        font-normal
                        whitespace-nowrap
                      "
                    >
                      Allow Sale Below Cost
                    </th>

                    {/* =========================================
                        INACTIVE
                    ========================================== */}

                    <th
                      className="
                        w-[16%]
                        border
                        border-slate-300
                        px-2
                        text-center
                        font-normal
                        whitespace-nowrap
                      "
                    >
                      Inactive
                    </th>
                  </tr>

                </thead>

                <tbody>
                  {rows.map((row) => (

                    <tr
                      key={row.id}
                      className="h-[32px]"
                    >

                      {/* =====================================
                          BRANCH
                      ===================================== */}

                      <td
                        className="
                          border
                          border-slate-300
                          p-0
                        "
                      >
                        <div className="flex h-[32px] items-stretch">
                          <div className="flex-1 overflow-hidden">
                            <Select
                              inputId={`lkpBranch_${row.id}`}
                              name={`lkpBranch_${row.id}`}
                              options={branchOptions}
                              value={
                                branchOptions.find(
                                  (option) =>
                                    option.value ===
                                    row.lkpBranch,
                                ) || null
                              }
                              onChange={(option) =>
                                updateRow(
                                  row.id,
                                  "lkpBranch",
                                  option?.value || "",
                                )
                              }
                              styles={{
                                ...tableSelectStyles,
                                ...branchMenuStyles,
                              }}
                              components={{
                                Option: BranchOption,
                                MenuList: BranchMenuList,
                              }}
                              filterOption={filterLabelOrValue}
                              noOptionsMessage={() => "No Branch Found"}
                              isSearchable
                              minMenuHeight={60}
                              menuPortalTarget={
                                document.body
                              }
                              menuPosition="fixed"
                            />
                          </div>

                          {row.lkpBranch && perms.delete && (
                            <button
                              type="button"
                              onClick={() =>
                                handleDeleteBranchRow(row)
                              }
                              className="
                                h-full
                                w-[20px]
                                self-stretch
                                flex
                                items-center
                                justify-center
                                text-slate-400
                                hover:text-red-500
                              "
                            >
                              <X size={12} />
                            </button>
                          )}
                        </div>
                      </td>

                      {/* =====================================
                          ITEM LOCATION
                      ===================================== */}

                      <td
                        className="
                          border
                          border-slate-300
                          p-0
                        "
                      >
                        <input
                          id={`txtItemLocation_${row.id}`}
                          name={`txtItemLocation_${row.id}`}
                          type="text"
                          value={row.txtItemLocation}
                          onChange={(e) =>
                            updateRow(row.id, "txtItemLocation", e.target.value)
                          }
                          className="h-[27px] w-full border-0 px-2 text-[11px] outline-none"
                        />
                      </td>

                      {/* =====================================
                          ALLOW SALE BELOW COST
                      ===================================== */}

                      <td className="border border-slate-300 text-center">
                        <input
                          id={`chkAllowSaleBelowCost_${row.id}`}
                          name={`chkAllowSaleBelowCost_${row.id}`}
                          type="checkbox"
                          checked={row.chkAllowSaleBelowCost}
                          onChange={(e) =>
                            updateRow(
                              row.id,
                              "chkAllowSaleBelowCost",
                              e.target.checked,
                            )
                          }
                          className="h-[14px] w-[14px] accent-blue-600"
                        />
                      </td>

                      {/* =====================================
                          INACTIVE
                      ===================================== */}

                      <td className="border border-slate-300 text-center">
                        <input
                          id={`chkInactive_${row.id}`}
                          name={`chkInactive_${row.id}`}
                          type="checkbox"
                          checked={
                            row.chkInactive
                          }
                          onChange={(e) =>
                            updateRow(
                              row.id,
                              "chkInactive",
                              e.target.checked,
                            )
                          }
                          className="h-3.5 w-3.5 accent-blue-600"
                        />
                      </td>
                    </tr>

                  ))}

                </tbody>

              </table>

            </div>

          {/* ===================================================
              ACTION BUTTONS
          =================================================== */}

          <div className="mt-[14px] flex justify-center gap-3">

            {/* SAVE */}

            <button
              type="button"
              className="btn-style disabled:cursor-not-allowed disabled:opacity-40"
              onClick={handleSave}
              disabled={!canSaveOrModify}
              id={hasSavedItem ? "Modifybtn" : "Savebtn"}
              name={hasSavedItem ? "Modifybtn" : "Savebtn"}
            >
              <span className="underline underline-offset-2">
                {actionWord.charAt(0)}
              </span>
              {actionWord.slice(1)}
            </button>

            {/* FIND */}

            <button
              type="button"
              className="btn-style"
              onClick={handleFind}
              id="Findbtn"
              name="Findbtn"
            >
              <span className="underline underline-offset-2">S</span>earch
            </button>

            {/* DELETE */}

            <button
              type="button"
              className="btn-style disabled:cursor-not-allowed disabled:opacity-40"
              onClick={handleDelete}
              disabled={!perms.delete}
              id="Deletebtn"
              name="Deletebtn"
            >
              <span className="underline underline-offset-2">D</span>elete
            </button>

            {/* CLEAR */}

            <button
              type="button"
              className="btn-style"
              onClick={handleClear}
              id="Clearbtn"
              name="Clearbtn"
            >
              <span className="underline underline-offset-2">C</span>lear
            </button>

          </div>

          </div>

        </div>

      </div>

    </div>
  );
};

export default ItemPage;
