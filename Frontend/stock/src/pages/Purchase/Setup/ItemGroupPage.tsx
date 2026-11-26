import React, { useEffect, useState } from "react";
import { useEnterAsTab } from "../../../hooks/useEnterAsTab";
import { useCtrlShortcuts } from "../../../hooks/useCtrlShortcuts";
import { useButtonPermissions } from "../../../hooks/useButtonPermissions";
import { useConfirmModal } from "../../../hooks/useConfirmModal";
import { deleteSuccessMessage } from "../../../hooks/useDeleteToast";
import { useMessageModal } from "../../../hooks/useMessageModal";
import TransactionActions from "../../../components/common/TransactionActions";
import { useInitialFocus } from "../../../hooks/useInitialFocus";
import CommonTableSelect from "../../../components/common/CommonTableSelect";
import Header from "../../../components/common/Header";
import { tryGetServerDate } from "../../../utils/serverDate";

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
// STOCK / NON-STOCK LIST
// The same list as the Branch list of the reports: the name first (as wide as the box), the ID in a 70 px column that hangs out
// past the right edge of the box, a header line on top. The box shows the name (fpname); lkpFSN keeps the ID (fpid).
// ============================================================

const SN_COLUMNS = [
  { key: "label", label: "Type", width: "1fr" },
  { key: "value", label: "ID", width: "70px", align: "right" as const },
];

// the VAT slab list: the names only
const VAT_SLAB_COLUMNS = [{ key: "label", label: "VAT Slab" }];

// ============================================================
// ITEM GROUP
// ============================================================


// dbo.tblmenu fmenuid for the Item Group page (fmenucaption = "Item Group").
const MENU_ID = "010202";

const ItemGroupPage: React.FC = () => {
  const handleEnterAsTab = useEnterAsTab();
  const perms = useButtonPermissions(MENU_ID);
  // the common themed question window (the same as on the other screens)
  const { confirm, dialog } = useConfirmModal();
  // the standard message of a delete that failed
  // the messages (warnings, errors, saved ...) are the common message window, as on the Payment screen - not a toast
  const { notify, dialog: messageDialog } = useMessageModal("Item Group");
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
          notify.error("getVATSlabList: no PstrCoID in localStorage");
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
          notify.error(`getVATSlabList failed: ${result.message}`);
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
        notify.error(
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
          notify.error("getItemGroupTypeList: no PstrCoID in localStorage");
          return;
        }

        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/ItemGroup/getItemGroupTypeList?PstrCoID=${PstrCoID}`,
        );
        const result = await response.json();

        if (!response.ok || !result.success) {
          notify.error(result.message || "Failed to load Stock / Non-stock");
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
        notify.error("Cannot connect to Item Group API.");
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
      notify.error("Company ID not found. Please log in again.");
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
      notify.error("Cannot connect to Item Group API.");
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
      notify.warning("Enter an Item Group ID to search");
      document.getElementById("txtItemGroupID")?.focus();
      return;
    }

    const found = await findItemGroup(txtItemGroupID);

    if (!found) {
      notify.info("Item Group not found");
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
      notify.error(`You do not have permission to ${actionWord}.`);
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
      notify.warning(missing.message);
      document.getElementById(missing.id)?.focus();
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
      // the time of the save: the database server's clock (the common /datetime/server-date), written on the row(s)
      const dtpServerDate = await tryGetServerDate();

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
            dtpServerDate,
            txtItemGroupID,
            txtItemGroupName,
            lkpFSN,
            lkpVATSlab,
          }),
        },
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        notify.error(
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

      notify.success(
        result.message ||
        (hasSavedItemGroup
          ? "Item group modified successfully."
          : "Item group saved successfully."),
      );

      // load the group again: it now exists, so the button flips to Modify
      findItemGroup(txtItemGroupID);
    } catch (error) {
      console.error("saveItemGroup error:", error);
      notify.error("Cannot connect to Item Group API.");
    }
  };

  // ==========================================================
  // DELETE
  // ==========================================================

  const handleDelete = async () => {
    if (!perms.delete) {
      notify.error("You do not have permission to Delete.");
      return;
    }

    if (!txtItemGroupID.trim()) {
      notify.warning("Please input 'Item Group ID'");
      document.getElementById("txtItemGroupID")?.focus();
      return;
    }

    const shouldDelete = await confirm({
      title: "Item Group",
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
        notify.error(result.message || "Not deleted, try again");
        return;
      }

      // the common message of a delete (hooks/useDeleteToast.ts, the same on every screen), then the page is emptied
      notify.success(deleteSuccessMessage("Item Group"));
      handleClear();
    } catch (error) {
      console.error("deleteItemGroup error:", error);
      notify.error("Cannot connect to Item Group API.");
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

  // The keys of the Payment screen: Ctrl+S Save / Modify, Ctrl+F Search, Ctrl+D Delete
  useCtrlShortcuts({
    s: handleSave,
    f: handleSearch,
    d: handleDelete,
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
                <CommonTableSelect
                  listLook="receipt"
                  inputId="lkpFSN"
                  options={snOptions}
                  value={snOptions.find((option) => option.value === lkpFSN) || null}
                  onChange={(option) => setLkpFSN(option?.value ?? "")}
                  columns={SN_COLUMNS}
                  width="100%"
                  menuWidth="calc(100% + 70px)"
                  isSearchable={false}
                  placeholder=""
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
                <CommonTableSelect
                  listLook="receipt"
                  inputId="lkpVATSlab"
                  options={vatSlabOptions}
                  value={
                    vatSlabOptions.find(
                      (option) => option.value === lkpVATSlab,
                    ) || null
                  }
                  onChange={(option) => handleVATSlabChange(option as Option | null)}
                  columns={VAT_SLAB_COLUMNS}
                  showHeader={false}
                  width="100%"
                  menuWidth="100%"
                  isSearchable={false}
                  placeholder=""
                  menuPortalTarget={
                    typeof document !== "undefined" ? document.body : undefined
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

            <div className="-mb-3">
              <TransactionActions
                className="mt-[14px] flex justify-center gap-3"
                actions={[
                  {
                    id: hasSavedItemGroup ? "btnModify" : "btnSave",
                    label: actionWord,
                    underlineIndex: 0,
                    onClick: handleSave,
                    disabled: !canSaveOrModify,
                  },
                  { id: "btnSearch", label: "Search", underlineIndex: 0, onClick: handleSearch },
                  {
                    id: "btnDelete",
                    label: "Delete",
                    underlineIndex: 0,
                    onClick: handleDelete,
                    disabled: !perms.delete,
                  },
                  { id: "btnClear", label: "Clear", onClick: handleClear },
                ]}
              />
            </div>
          </div>
        </div>

      </div>

      {/* the "Do you want to delete ?" question - outside the root div: the page's
        Enter-as-Tab must not take the Enter of the Yes / No buttons */}
      {dialog}
      {messageDialog}
    </>
  );
};

export default ItemGroupPage;
