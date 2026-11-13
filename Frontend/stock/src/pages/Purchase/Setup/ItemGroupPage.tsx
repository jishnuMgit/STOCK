import React, { useEffect, useState } from "react";
import Select, {
  components,
  type MenuListProps,
  type OptionProps,
  type StylesConfig,
} from "react-select";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import CloseButton from "../../../components/common/CloseButton";
import { useEnterAsTab } from "../../../hooks/useEnterAsTab";
import { useAltShortcuts } from "../../../hooks/useAltShortcuts";
import { useButtonPermissions } from "../../../hooks/useButtonPermissions";
import { useConfirmModal } from "../../../hooks/useConfirmModal";
import { useDeleteToast } from "../../../hooks/useDeleteToast";
import { useInitialFocus } from "../../../hooks/useInitialFocus";
import selectComponents, {
  SELECT_FONT_FAMILY,
} from "../../../components/sharecomponents/selectComponents";
import Header from "../../../components/common/Header";

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

// The select box looks like the text boxes of this page (the .input-style class): 30px, #d7dee7 border,
// 4px radius, mint background when focused, the same 14px text and colour.
const selectStyles: StylesConfig<Option, false> = {
  container: (base) => ({
    ...base,
    fontFamily: SELECT_FONT_FAMILY,
  }),

  control: (base, state) => ({
    ...base,
    minHeight: "30px",
    height: "30px",
    width: "100%",
    border: "1px solid #d7dee7",
    borderRadius: "4px",
    boxShadow: "none",
    backgroundColor: state.isFocused ? "#eefbf4" : "#ffffff",
    fontSize: "14px",
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
    color: "#334155",
    fontSize: "14px",
  }),

  placeholder: (base) => ({
    ...base,
    margin: 0,
    color: "#808080",
    fontSize: "14px",
  }),

  input: (base) => ({
    ...base,
    margin: 0,
    padding: 0,
    fontSize: "14px",
    color: "#334155",
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
    fontFamily: SELECT_FONT_FAMILY,
    fontSize: 14,
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
    fontSize: 14,
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
// STOCK / NON-STOCK LIST
// The same list as the Branch list of the reports: the name first (as wide as the box), the ID in a column that hangs out
// past the right edge of the box, a header line on top. The box shows the name (fpname); lkpFSN keeps the ID (fpid).
// ============================================================

const SN_COLS = "grid grid-cols-[1fr_55px]";

const SnMenuList = (props: MenuListProps<Option, false>) => (
  <components.MenuList {...props}>
    <div
      className={`${SN_COLS} sticky top-0 z-[1] border-b border-[#cfd7df] bg-[#f5f6fa] text-[14px] font-semibold text-[#24364d]`}
    >
      <div className="border-r border-[#cfd7df] px-[8px] py-[7px]">Type</div>
      <div className="px-[8px] py-[7px]">ID</div>
    </div>
    {props.children}
  </components.MenuList>
);

const SnOption = (props: OptionProps<Option, false>) => (
  <components.Option {...props}>
    <div className={SN_COLS}>
      <div className="truncate border-r border-[#cfd7df] px-[8px] py-[6px]">
        {props.data.label}
      </div>
      <div className="truncate px-[8px] py-[6px]">{props.data.value}</div>
    </div>
  </components.Option>
);

const snSelectComponents = {
  ...selectComponents,
  MenuList: SnMenuList,
  Option: SnOption,
};

const snSelectStyles: StylesConfig<Option, false> = {
  ...selectStyles,

  // the box's width plus the ID column that hangs out past its right edge
  menu: (base) => ({
    ...base,
    zIndex: 9999,
    fontFamily: SELECT_FONT_FAMILY,
    fontSize: 14,
    marginTop: 1,
    width: "calc(100% + 55px)",
  }),

  option: (base, state) => ({
    ...base,
    padding: 0,
    fontSize: 14,
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
  const navigate = useNavigate();
  const handleEnterAsTab = useEnterAsTab();
  const perms = useButtonPermissions(MENU_ID);
  // the common themed question window (the same as on the other screens)
  const { confirm, dialog } = useConfirmModal();
  // the standard message of a delete that failed
  const { notDeleted } = useDeleteToast("Item Group");
  // where the cursor starts: the Item Group ID box
  useInitialFocus(true, "txtItemGroupID");

  const [txtItemGroupID, setTxtItemGroupID] = useState("");
  const [txtItemGroupName, setTxtItemGroupName] = useState("");
  const [lkpFSN, setLkpFSN] = useState(""); // Stock / Non-stock: the id that is saved (tblitemgroup.fsn)

  // Stock / Non-stock list (tblstockparam, IGTP): the box shows the name, lkpFSN keeps the id
  const [snOptions, setSnOptions] = useState<Option[]>([]);

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
  // LOAD STOCK / NON-STOCK (lkpFSN dropdown)
  // ==========================================================

  useEffect(() => {
    const loadItemGroupTypes = async () => {
      try {
        const PstrCoID = localStorage.getItem("PstrCoID");

        if (!PstrCoID) {
          toast.error("getItemGroupTypeList: no PstrCoID in localStorage");
          return;
        }

        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/ItemGroup/getItemGroupTypeList?PstrCoID=${PstrCoID}`,
        );
        const result = await response.json();

        if (!response.ok || !result.success) {
          toast.error(result.message || "Failed to load Stock / Non-stock");
          return;
        }

        setSnOptions(
          (result.data || []).map(
            (type: { lkpFSN: string; lkpFSNName: string }) => ({
              value: type.lkpFSN,
              label: type.lkpFSNName,
            }),
          ),
        );
      } catch (error) {
        console.error("getItemGroupTypeList error:", error);
        toast.error("Cannot connect to Item Group API.");
      }
    };

    loadItemGroupTypes();
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

  const findItemGroup = async (itemGroupId: string): Promise<boolean> => {
    if (!itemGroupId.trim()) {
      return false;
    }

    const PstrCoID = localStorage.getItem("PstrCoID");

    if (!PstrCoID) {
      toast.error("Company ID not found. Please log in again.");
      return false;
    }

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/ItemGroup/getItemGroup?PstrCoID=${PstrCoID}&txtItemGroupID=${encodeURIComponent(itemGroupId.trim())}`,
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        setHasSavedItemGroup(false);
        return false;
      }

      setHasSavedItemGroup(true);
      setTxtItemGroupName(result.data.txtItemGroupName || "");
      setLkpFSN(result.data.lkpFSN || "");
      setLkpVATSlab(result.data.lkpVATSlab || "");
      setTxtVATPer(Number(result.data.txtVATPer ?? 0).toFixed(2));
      return true;
    } catch (error) {
      console.error("getItemGroup error:", error);
      toast.error("Cannot connect to Item Group API.");
      return false;
    }
  };

  // ==========================================================
  // SEARCH (the Search button, Alt+E)
  //
  // Loads the Item Group of the typed Item Group ID: its name, Stock / Non-stock
  // and VAT Slab fill in, and the button flips to Modify. (Leaving the ID box
  // does the same quietly; here a miss says so.)
  // ==========================================================

  const handleSearch = async () => {
    if (!txtItemGroupID.trim()) {
      toast.warning("Enter an Item Group ID to search");
      document.getElementById("txtItemGroupID")?.focus();
      return;
    }

    const found = await findItemGroup(txtItemGroupID);

    if (!found) {
      toast.info("Item Group not found", { toastId: "ig-not-found" });
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
      { id: "lkpFSN", value: lkpFSN, message: "Please select 'Stock / Non-stock'" },
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
            lkpFSN,
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

    const shouldDelete = await confirm({
      title: "Item Group",
      message: "Do you want to delete ?",
    });

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
        notDeleted(result.message);
        return;
      }

      // (no message for a deleted item group)
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
    setLkpFSN("");
    setLkpVATSlab("");
    setTxtVATPer("0.00");
  };

  // Alt+S -> Save (new group), Alt+M -> Modify (existing group), Alt+E -> Search,
  // Alt+D -> Delete, Alt+C -> Clear (the underlined letters on the buttons)
  useAltShortcuts({
    s: () => {
      if (!hasSavedItemGroup) handleSave();
    },
    m: () => {
      if (hasSavedItemGroup) handleSave();
    },
    e: handleSearch,
    d: handleDelete,
    c: handleClear,
  });

  return (
    <>
      <div
        onKeyDown={handleEnterAsTab}
        className="flex min-h-screen w-full items-center justify-center bg-white"
      >
        {/* no overflow-hidden: the VAT Slab list must stay visible */}
        <div className="w-[720px] max-w-full border border-slate-400 bg-white shadow-sm">

          {/* ====================================================
            TITLE
        ==================================================== */}

          <Header Name="Item Group" />

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
                  maxLength={12}
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

            {/* STOCK / NON-STOCK */}

            <div className="mb-[8px] grid grid-cols-[195px_1fr] items-center">
              <label
                htmlFor="lkpFSN"
                className="relative pr-3 text-right text-[14px] text-gray-600"
              >
                <span className="absolute right-[15px] -top-0.5 h-[4px] w-[4px] text-red-500">*</span>
                Stock / Non-stock :
              </label>

              <div className="w-[30%]">
                <Select<Option, false>
                  components={snSelectComponents}
                  inputId="lkpFSN"
                  instanceId="lkpFSN"
                  name="lkpFSN"
                  options={snOptions}
                  value={snOptions.find((option) => option.value === lkpFSN) || null}
                  onChange={(option) => setLkpFSN(option?.value ?? "")}
                  styles={snSelectStyles}
                  isClearable={false}
                  isSearchable={false}
                  placeholder="Select..."
                  menuPosition="fixed"
                  menuPortalTarget={
                    typeof document !== "undefined" ? document.body : undefined
                  }
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
                  components={selectComponents}
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
                id="btnSearch"
                name="btnSearch"
                type="button"
                onClick={handleSearch}
                title="Alt+E"
                className="btn-style"
              >
                S<span className="underline underline-offset-2">e</span>arch
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

      </div>

      {/* the "Do you want to delete ?" question - outside the root div: the page's
        Enter-as-Tab must not take the Enter of the Yes / No buttons */}
      {dialog}
    </>
  );
};

export default ItemGroupPage;
