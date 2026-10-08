import React, { useEffect, useState } from "react";
import Select, { type StylesConfig } from "react-select";
import { toast } from "react-toastify";
import { useEnterAsTab } from "../../../hooks/useEnterAsTab";
import { useAltShortcuts } from "../../../hooks/useAltShortcuts";
import { useButtonPermissions } from "../../../hooks/useButtonPermissions";
import { useConfirm } from "../../../hooks/useConfirm";

// ============================================================
// TYPES
// ============================================================

type Option = {
  value: string;
  label: string;
  // the percentage the slab carries (tblvatslab.fvatper) - shown in the VAT % box
  txtVATPer?: string;
};

// ============================================================
// SELECT STYLES
// ============================================================

// Same select box as the Item page / Company page: 30px, #d1d5db border,
// 4px radius, mint background when focused, 11px text.
const selectStyles: StylesConfig<Option, false> = {
  control: (base, state) => ({
    ...base,
    minHeight: "30px",
    height: "30px",
    width: "100%",
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
    padding: "4px",
    color: "#64748b",
  }),

  indicatorSeparator: () => ({
    display: "none",
  }),

  menuPortal: (base) => ({
    ...base,
    zIndex: 9999,
  }),

  menu: (base) => ({
    ...base,
    zIndex: 9999,
    fontSize: 13,
    marginTop: 1,
  }),

  menuList: (base) => ({
    ...base,
    padding: 0,
    maxHeight: 180,
  }),

  option: (base, state) => ({
    ...base,
    padding: "6px 8px",
    fontSize: 13,
    color: "#202020",
    cursor: "pointer",

    backgroundColor: state.isSelected
      ? "#dbeafe"
      : state.isFocused
        ? "#eff6ff"
        : "#ffffff",
  }),
};

// ============================================================
// ITEM GROUP
// ============================================================

// dbo.tblmenu fmenuid for the Item Group page (fmenucaption = "Item Group").
const MENU_ID = "010202";

const ItemGroupPage: React.FC = () => {
  const handleEnterAsTab = useEnterAsTab();
  const perms = useButtonPermissions(MENU_ID);
  const { confirm, confirmDialog } = useConfirm();

  const [txtItemGroupID, setTxtItemGroupID] = useState("");
  const [txtItemGroupName, setTxtItemGroupName] = useState("");

  // Does the Item Group ID already exist? false -> the button says Save
  // (new group), true -> Modify. Set by the load (leaving the ID box),
  // reset when the ID is typed.
  const [hasSavedItemGroup, setHasSavedItemGroup] = useState(false);

  // the company's VAT slabs, loaded from tblvatslab (S / Z / NT ...)
  const [vatSlabOptions, setVatSlabOptions] = useState<Option[]>([]);

  const [lkpVATSlab, setLkpVATSlab] = useState("");

  const [txtVATPer, setTxtVATPer] = useState("0.00");

  // ==========================================================
  // LOAD VAT SLABS (lkpVATSlab dropdown)
  // ==========================================================

  useEffect(() => {
    const loadVATSlabs = async () => {
      try {
        const PstrCoID = localStorage.getItem("PstrCoID");

        if (!PstrCoID) {
          toast.error("getVATSlabList: no PstrCoID in localStorage");
          return;
        }

        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/ItemGroup/getVATSlabList?PstrCoID=${PstrCoID}`,
        );

        if (!response.ok) {
          throw new Error(`HTTP Error: ${response.status}`);
        }

        const result = await response.json();

        if (!result.success) {
          console.error("getVATSlabList failed:", result.message);
          toast.error(`getVATSlabList failed: ${result.message}`);
          return;
        }

        setVatSlabOptions(
          (result.data || []).map(
            (slab: { lkpVATSlab: string; txtVATPer: string }) => ({
              value: slab.lkpVATSlab,
              label: slab.lkpVATSlab,
              txtVATPer: slab.txtVATPer,
            }),
          ),
        );
      } catch (error) {
        console.error("getVATSlabList error:", error);
        toast.error(
          `getVATSlabList error: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    };

    loadVATSlabs();
  }, []);

  // ==========================================================
  // VAT SLAB CHANGE
  // ==========================================================

  const handleVATSlabChange = (
    option: Option | null,
  ) => {
    setLkpVATSlab(option?.value ?? "");

    // the percentage comes with the slab
    setTxtVATPer(Number(option?.txtVATPer ?? 0).toFixed(2));
  };

  // ==========================================================
  // FIND ITEM GROUP (mode 'G1')
  //
  // Runs when the Item Group ID box is left. An ID that doesn't exist
  // yet is the normal case for a new group, so a miss stays quiet.
  // ==========================================================

  const findItemGroup = async (itemGroupId: string) => {
    if (!itemGroupId.trim()) {
      return;
    }

    const PstrCoID = localStorage.getItem("PstrCoID");

    if (!PstrCoID) {
      toast.error("Company ID not found. Please log in again.");
      return;
    }

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/ItemGroup/getItemGroup?PstrCoID=${PstrCoID}&txtItemGroupID=${encodeURIComponent(itemGroupId.trim())}`,
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        setHasSavedItemGroup(false);
        return;
      }

      setHasSavedItemGroup(true);
      setTxtItemGroupName(result.data.txtItemGroupName || "");
      setLkpVATSlab(result.data.lkpVATSlab || "");
      setTxtVATPer(Number(result.data.txtVATPer ?? 0).toFixed(2));
    } catch (error) {
      console.error("getItemGroup error:", error);
      toast.error("Cannot connect to Item Group API.");
    }
  };

  // ==========================================================
  // SAVE / MODIFY
  //
  // The one button: Save for a new Item Group ID, Modify for one that
  // already exists (the old form switched its button text between
  // "&Save" and "&Modify").
  // ==========================================================

  const actionWord = hasSavedItemGroup ? "Modify" : "Save";
  const canSaveOrModify = hasSavedItemGroup ? perms.modify : perms.save;

  const handleSave = async () => {
    if (!canSaveOrModify) {
      toast.error(`You do not have permission to ${actionWord}.`);
      return;
    }

    // the boxes with the red *, in page order - the first empty one stops the
    // save and gets the cursor (the server checks the same list)
    const requiredBoxes: { id: string; value: string; message: string }[] = [
      { id: "txtItemGroupID", value: txtItemGroupID, message: "Please input 'Item Group ID'" },
      { id: "txtItemGroupName", value: txtItemGroupName, message: "Please input 'Item Group Name'" },
      { id: "lkpVATSlab", value: lkpVATSlab, message: "Please select 'VAT Slab'" },
    ];

    const missing = requiredBoxes.find((box) => !box.value.trim());

    if (missing) {
      toast.warning(missing.message);
      document.getElementById(missing.id)?.focus();
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
        `${import.meta.env.VITE_API_URL}/ItemGroup/saveItemGroup`,
        {
          method: "POST",
          credentials: "include", // the server checks the session and the rights
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            PstrCoID,
            PstrYear,
            PstrUserID,
            txtItemGroupID,
            txtItemGroupName,
            lkpVATSlab,
          }),
        },
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        toast.error(
          result.message ||
            (hasSavedItemGroup
              ? "Not modified, try again."
              : "Not saved, try again."),
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
          (hasSavedItemGroup
            ? "Item group modified successfully."
            : "Item group saved successfully."),
      );

      // load the group again: it now exists, so the button flips to Modify
      findItemGroup(txtItemGroupID);
    } catch (error) {
      console.error("saveItemGroup error:", error);
      toast.error("Cannot connect to Item Group API.");
    }
  };

  // ==========================================================
  // DELETE
  // ==========================================================

  const handleDelete = async () => {
    if (!perms.delete) {
      toast.error("You do not have permission to Delete.");
      return;
    }

    if (!txtItemGroupID.trim()) {
      toast.warning("Please input 'Item Group ID'");
      document.getElementById("txtItemGroupID")?.focus();
      return;
    }

    const shouldDelete = await confirm(
      "Are you sure you want to delete this item group?",
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
        `${import.meta.env.VITE_API_URL}/ItemGroup/deleteItemGroup`,
        {
          method: "DELETE",
          credentials: "include", // the server checks the session and the rights
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            PstrCoID,
            PstrYear,
            PstrUserID,
            txtItemGroupID,
          }),
        },
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        toast.error(result.message || "Item group could not be deleted.");
        return;
      }

      toast.success(result.message || "Item group deleted successfully.");
      handleClear();
    } catch (error) {
      console.error("deleteItemGroup error:", error);
      toast.error("Cannot connect to Item Group API.");
    }
  };

  // ==========================================================
  // CLEAR
  // ==========================================================

  const handleClear = () => {
    setHasSavedItemGroup(false);
    setTxtItemGroupID("");
    setTxtItemGroupName("");
    setLkpVATSlab("");
    setTxtVATPer("0.00");
  };

  // Alt+S -> Save (new group), Alt+M -> Modify (existing group),
  // Alt+D -> Delete, Alt+C -> Clear (the underlined letters on the buttons)
  useAltShortcuts({
    s: () => {
      if (!hasSavedItemGroup) handleSave();
    },
    m: () => {
      if (hasSavedItemGroup) handleSave();
    },
    d: handleDelete,
    c: handleClear,
  });

  return (
    <div
      onKeyDown={handleEnterAsTab}
      className="flex min-h-screen w-full items-center justify-center bg-white"
    >
      {/* no overflow-hidden: the VAT Slab list must stay visible */}
      <div className="w-[720px] max-w-full border border-slate-400 bg-white shadow-sm">

        {/* ====================================================
            TITLE
        ==================================================== */}

        <div className="flex h-[28px] w-full items-center bg-[#a7dfc0]">
          <h1 className="ml-[5px] text-[17px] font-semibold text-[#374151]">
            Item Group
          </h1>
        </div>

        {/* ====================================================
            FORM
        ==================================================== */}

        <div className="p-[12px] m-[12px]">

          {/* ITEM GROUP ID */}

          <div className="mb-[8px] grid grid-cols-[195px_1fr] items-center">
            <label
              htmlFor="txtItemGroupID"
              className="relative pr-3 text-right text-[14px] text-gray-600"
            >
              <span className="absolute right-[15px] -top-0.5 h-[4px] w-[4px] text-red-500">*</span>
              Item Group ID :
            </label>

            <div className="relative">
              <input
                id="txtItemGroupID"
                name="txtItemGroupID"
                type="text"
                autoComplete="off"
                maxLength={8}
                aria-required="true"
                value={txtItemGroupID}
                onChange={(e) => {
                  setTxtItemGroupID(e.target.value);
                  setHasSavedItemGroup(false);
                }}
                onBlur={() => findItemGroup(txtItemGroupID)}
                className="w-[30%] input-style"
              />
            </div>
          </div>

          {/* ITEM GROUP NAME */}

          <div className="mb-[8px] grid grid-cols-[195px_1fr] items-center">
            <label
              htmlFor="txtItemGroupName"
              className="relative pr-3 text-right text-[14px] text-gray-600"
            >
              <span className="absolute right-[15px] -top-0.5 h-[4px] w-[4px] text-red-500">*</span>
              Item Group Name :
            </label>

            <div className="relative">
              <input
                id="txtItemGroupName"
                name="txtItemGroupName"
                type="text"
                autoComplete="off"
                maxLength={60}
                aria-required="true"
                value={txtItemGroupName}
                onChange={(e) => setTxtItemGroupName(e.target.value)}
                className="w-full input-style"
              />
            </div>
          </div>

          {/* VAT SLAB */}

          <div className="mb-[8px] grid grid-cols-[195px_1fr] items-center">
            <label
              htmlFor="lkpVATSlab"
              className="relative pr-3 text-right text-[14px] text-gray-600"
            >
              <span className="absolute right-[15px] -top-0.5 h-[4px] w-[4px] text-red-500">*</span>
              VAT Slab :
            </label>

            <div className="w-[30%]">
              <Select<Option, false>
                inputId="lkpVATSlab"
                instanceId="lkpVATSlab"
                name="lkpVATSlab"
                options={vatSlabOptions}
                value={
                  vatSlabOptions.find(
                    (option) => option.value === lkpVATSlab,
                  ) || null
                }
                onChange={handleVATSlabChange}
                styles={selectStyles}
                isClearable={false}
                isSearchable={false}
                placeholder="Select..."
                menuPosition="fixed"
                menuPortalTarget={
                  typeof document !== "undefined"
                    ? document.body
                    : undefined
                }
              />
            </div>
          </div>

          {/* VAT % (follows the slab) */}

          <div className="mb-[8px] grid grid-cols-[195px_1fr] items-center">
            <label
              htmlFor="txtVATPer"
              className="relative pr-3 text-right text-[14px] text-gray-600"
            >
              <span className="absolute right-[15px] -top-0.5 h-[4px] w-[4px] text-red-500">*</span>
              VAT % :
            </label>

            <div className="relative">
              <input
                id="txtVATPer"
                name="txtVATPer"
                type="text"
                inputMode="decimal"
                value={txtVATPer}
                readOnly
                tabIndex={-1}
                className="w-[30%] input-style text-right"
              />
            </div>
          </div>

          {/* ==================================================
              BUTTONS
          ================================================== */}

          <div className="mt-[14px] flex justify-center gap-3">
            <button
              id={hasSavedItemGroup ? "btnModify" : "btnSave"}
              name={hasSavedItemGroup ? "btnModify" : "btnSave"}
              type="button"
              onClick={handleSave}
              disabled={!canSaveOrModify}
              className="btn-style disabled:cursor-not-allowed disabled:opacity-40"
            >
              <span className="underline underline-offset-2">
                {actionWord.charAt(0)}
              </span>
              {actionWord.slice(1)}
            </button>

            <button
              id="btnDelete"
              name="btnDelete"
              type="button"
              onClick={handleDelete}
              disabled={!perms.delete}
              className="btn-style disabled:cursor-not-allowed disabled:opacity-40"
            >
              <span className="underline underline-offset-2">D</span>elete
            </button>

            <button
              id="btnClear"
              name="btnClear"
              type="button"
              onClick={handleClear}
              className="btn-style"
            >
              <span className="underline underline-offset-2">C</span>lear
            </button>
          </div>
        </div>
      </div>

      {confirmDialog}
    </div>
  );
};

export default ItemGroupPage;
