import React, { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";

import CustomLinkedPairSelect, {
  type PairSelectOption,
} from "../../../components/sharecomponents/CustomLinkedPairSelect";
import Header from "../../../components/sharecomponents/Header";
import { useButtonPermissions } from "../../../hooks/useButtonPermissions";
import { useConfirmModal } from "../../../hooks/useConfirmModal";
import { useDeleteToast } from "../../../hooks/useDeleteToast";
import { useEnterAsTab } from "../../../hooks/useEnterAsTab";
import { useGridCellFocus } from "../../../hooks/useGridCellFocus";
import { apiFetch } from "../../../utils/session";

/* =========================================================
   CUSTOMER DIVISION (Finance > Setup > Customer Division)
   The port of the old frmCustomerDivision:
     - the customer is chosen (only customers that have divisions are listed)
     - the grid shows that customer's divisions; a blank row is always at the end
     - Save sends only what changed: new divisionRows, changed divisionRows and removed divisionRows, in one transaction
     - a division that transactions already use cannot be deleted, and its ID cannot be changed
========================================================= */

type Column = "txtDivisionID" | "txtDivisionName" | "txtDivisionName_AR";

type DivisionRow = {
  key: number;
  txtDivisionID: string;
  txtDivisionName: string;
  txtDivisionName_AR: string; // Arabic name
  // the division id it had when it was loaded (null for a row typed on the page and not saved yet) - tells a
  // changed row from a new row
  txtOriginalDivisionID: string | null;
};

type LoadedDivision = {
  txtDivisionID: string;
  txtDivisionName: string | null;
  txtDivisionName_AR: string | null;
};

const CUSTOMER_DIVISION_API = `${import.meta.env.VITE_API_URL}/CustomerDivision`;

const MENU_ID = "110207"; // tblmenu: mnuCustomerDivision

// the lengths of the columns (tblcustdivision) and the message when a longer value is typed or pasted
const COLUMN_LIMITS: Record<Column, { max: number; message: string }> = {
  txtDivisionID: { max: 8, message: "Division ID can be 8 characters at most" },
  txtDivisionName: { max: 60, message: "Division Name can be 60 characters at most" },
  txtDivisionName_AR: {
    max: 60,
    message: "Division Name (Arabic) can be 60 characters at most",
  },
};
const MIN_ROWS = 16; // at least this many rows are always on the screen (filled ones + blanks)

let rowKeyCounter = 0;
const nextRowKey = () => ++rowKeyCounter;

const emptyDivisionRow = (): DivisionRow => ({
  key: nextRowKey(),
  txtDivisionID: "",
  txtDivisionName: "",
  txtDivisionName_AR: "",
  txtOriginalDivisionID: null,
});

const isEmptyDivisionRow = (row: DivisionRow) =>
  !row.txtDivisionID && !row.txtDivisionName && !row.txtDivisionName_AR;

/** keeps one empty "new" row at the end and at least MIN_ROWS rows in total */
const padDivisionRows = (divisionRows: DivisionRow[]): DivisionRow[] => {
  const result = [...divisionRows];
  if (result.length === 0 || !isEmptyDivisionRow(result[result.length - 1])) {
    result.push(emptyDivisionRow());
  }
  while (result.length < MIN_ROWS) result.push(emptyDivisionRow());
  return result;
};

/* slim green scrollbar (Chrome, Edge, Safari) */
const niceScrollbar = [
  "[&::-webkit-scrollbar]:h-2.5",
  "[&::-webkit-scrollbar]:w-2.5",
  "[&::-webkit-scrollbar-track]:bg-[#f2f8f4]",
  "[&::-webkit-scrollbar-thumb]:rounded-full",
  "[&::-webkit-scrollbar-thumb]:border-2",
  "[&::-webkit-scrollbar-thumb]:border-solid",
  "[&::-webkit-scrollbar-thumb]:border-[#f2f8f4]",
  "[&::-webkit-scrollbar-thumb]:bg-[#9fdfbc]",
  "[&::-webkit-scrollbar-thumb:hover]:bg-[#64d96e]",
  "[&::-webkit-scrollbar-thumb:active]:bg-[#4cc45a]",
  "[&::-webkit-scrollbar-corner]:bg-[#f2f8f4]",
].join(" ");

const cellInputClass =
  "h-[26px] w-full bg-transparent px-2 text-[12px] text-[#24364d] outline-none focus:bg-[#f1f8ff]";

const thClass =
  "h-[28px] border border-[#B7ECD0] bg-[#EEFBF4] px-2 font-semibold text-[#405066]";

type CustomerDivisionPageProps = {
  onClose?: () => void;
};

const CustomerDivisionPage: React.FC<CustomerDivisionPageProps> = ({
  onClose,
}) => {
  const handleEnterAsTab = useEnterAsTab();
  const perms = useButtonPermissions(MENU_ID);
  const { confirm, dialog } = useConfirmModal();
  const { notDeleted } = useDeleteToast("Customer Division");
  // the cell the cursor is in is outlined (a typed-in box has its text selected)
  const { cellFocusClass, selectOnFocus } = useGridCellFocus();

  const [lkpCsAccountID, setLkpCsAccountID] = useState<string | null>(null); // lkpCsAccountID / lkpCsAccountName

  // the customers that have divisions (Customer ID and Customer Name boxes), from the Customer Division controller
  const [lkpCsAccountOptions, setLkpCsAccountOptions] = useState<PairSelectOption[]>([]);

  const [divisionRows, setDivisionRows] = useState<DivisionRow[]>(() => padDivisionRows([]));
  const [selectedRowKey, setSelectedRowKey] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // the saved values by division id (to see which rows were changed)
  const [loadedDivisions, setLoadedDivisions] = useState<Record<string, { name: string; nameAR: string }>>({});

  // saved divisions that transactions already use (true) or not (false)
  const [usedDivisionIDs, setUsedDivisionIDs] = useState<Record<string, boolean>>({});

  /* ------------------------------------------------ THE CUSTOMERS */

  useEffect(() => {
    const getCustomerDivisionLookups = async () => {
      try {
        const response = await apiFetch(`${CUSTOMER_DIVISION_API}/getLookups`);
        const result = await response.json();

        if (!response.ok || !result.success) {
          toast.error(result.message || "Failed to load the Customers");
          return;
        }

        setLkpCsAccountOptions(
          (result.customers || []).map(
            (row: { lkpCsAccountID: string; lkpCsAccountName: string }) => ({
              value: row.lkpCsAccountID,
              firstLabel: row.lkpCsAccountID,
              secondLabel: row.lkpCsAccountName,
            }),
          ),
        );
      } catch (error: unknown) {
        console.error("customerDivision lookups error:", error);
        toast.error("Cannot connect to the Customer Division CUSTOMER_DIVISION_API.");
      }
    };

    void getCustomerDivisionLookups();
  }, []);

  /* ------------------------------------- THE DIVISIONS OF A CUSTOMER */

  const showDivisionRows = (list: LoadedDivision[]) => {
    const loadedMap: Record<string, { name: string; nameAR: string }> = {};

    const fresh = padDivisionRows(
      list.map((division) => {
        loadedMap[division.txtDivisionID] = {
          name: division.txtDivisionName ?? "",
          nameAR: division.txtDivisionName_AR ?? "",
        };
        return {
          key: nextRowKey(),
          txtDivisionID: division.txtDivisionID,
          txtDivisionName: division.txtDivisionName ?? "",
          txtDivisionName_AR: division.txtDivisionName_AR ?? "",
          txtOriginalDivisionID: division.txtDivisionID,
        };
      }),
    );

    setDivisionRows(fresh);
    setLoadedDivisions(loadedMap);
    setUsedDivisionIDs({});

    // the cursor goes to the first empty row (after the last saved division), ready for a new one
    const firstEmpty = fresh.find((row) => isEmptyDivisionRow(row));
    setSelectedRowKey(firstEmpty?.key ?? null);
  };

  const getCustomerDivisions = useCallback(async (customerId: string | null) => {
    if (!customerId) {
      showDivisionRows([]);
      return;
    }

    try {
      const response = await apiFetch(`${CUSTOMER_DIVISION_API}/getDivisions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lkpCsAccountID: customerId }),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        toast.error(result.message || "Failed to load the divisions");
        return;
      }

      showDivisionRows(result.divisions || []);
    } catch (error: unknown) {
      console.error("customerDivision divisions error:", error);
      toast.error("Cannot connect to the Customer Division CUSTOMER_DIVISION_API.");
    }
  }, []);

  const selectCustomer = (customerId: string | null) => {
    setLkpCsAccountID(customerId);
    void getCustomerDivisions(customerId);
  };

  /* ------------------------------------------------------- HELPERS */

  const indexOfRowKey = (key: number) => divisionRows.findIndex((row) => row.key === key);

  const focusCell = (column: Column, index: number) => {
    if (index < 0) return;

    requestAnimationFrame(() => {
      const input = document.getElementById(`${column}-${index}`) as HTMLInputElement | null;

      if (input) {
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
      }
    });
  };

  // ARE TRANSACTIONS USING THIS SAVED DIVISION? (the old HaveTrans)
  const haveDivisionTrans = async (id: string): Promise<boolean> => {
    if (!lkpCsAccountID) return false;
    if (usedDivisionIDs[id] !== undefined) return usedDivisionIDs[id];

    try {
      const response = await apiFetch(`${CUSTOMER_DIVISION_API}/used`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lkpCsAccountID, txtDivisionID: id }),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        toast.error(result.message || "Could not check the transactions");
        return true; // when in doubt, do not allow the change
      }

      setUsedDivisionIDs((previous) => ({ ...previous, [id]: !!result.used }));
      return !!result.used;
    } catch {
      toast.error("Could not check the transactions.");
      return true;
    }
  };

  // MAY THIS CELL OF A SAVED DIVISION BE EDITED?
  //  - any change of a saved division needs the Modify right
  //  - the ID itself is refused when transactions already use it
  // A row typed on the page and not saved yet can always be edited.
  const isEditBlocked = (row: DivisionRow, column: Column): boolean => {
    if (row.txtOriginalDivisionID === null) return false;

    if (!perms.modify) {
      toast.warning("You don't have the permission to modify", { toastId: "cd-modify-denied" });
      return true;
    }

    if (column === "txtDivisionID" && usedDivisionIDs[row.txtOriginalDivisionID] === true) {
      toast.warning(
        "You can't modify the 'Division ID'. Some transactions already entered with this 'Division'",
        { toastId: "cd-modify-used" },
      );
      return true;
    }

    return false;
  };

  const updateDivisionCell = (key: number, column: Column, value: string) => {
    const row = divisionRows.find((r) => r.key === key);
    if (!row || isEditBlocked(row, column)) return;

    // a longer value (typed or pasted) is cut at the limit, with a message - not silently
    const limit = COLUMN_LIMITS[column];
    if (value.length > limit.max) {
      toast.warning(limit.message, { toastId: `cd-length-${column}` });
      value = value.slice(0, limit.max);
    }

    setDivisionRows((previous) =>
      padDivisionRows(previous.map((r) => (r.key === key ? { ...r, [column]: value } : r))),
    );
  };

  // LEAVING THE ID / NAME BOX (the old grdvCustDivision_ValidateRow): a value already in the grid is refused and the box goes
  // back to what it was
  const handleCellBlur = (key: number, column: "txtDivisionID" | "txtDivisionName") => {
    const row = divisionRows.find((r) => r.key === key);
    if (!row) return;

    const value = row[column].trim();
    const original =
      row.txtOriginalDivisionID === null
        ? ""
        : column === "txtDivisionID"
          ? row.txtOriginalDivisionID
          : (loadedDivisions[row.txtOriginalDivisionID]?.name ?? "");

    // an emptied box of a saved division goes back to what it was
    if (value === "") {
      if (row.txtOriginalDivisionID !== null) {
        setDivisionRows((previous) =>
          padDivisionRows(previous.map((r) => (r.key === key ? { ...r, [column]: original } : r))),
        );
      }
      return;
    }

    const alreadyThere = divisionRows.some(
      (other) => other.key !== key && other[column].trim().toLowerCase() === value.toLowerCase(),
    );

    if (alreadyThere) {
      toast.warning(
        column === "txtDivisionID" ? "'Division ID' already exists" : "'Division Name' already exists",
        { toastId: "cd-duplicate" },
      );
      setDivisionRows((previous) =>
        padDivisionRows(previous.map((r) => (r.key === key ? { ...r, [column]: original } : r))),
      );
      focusCell(column, indexOfRowKey(key));
    }
  };

  /* ------------------------------------------------- DELETE A ROW
     (the old Delete key on the grid): Ctrl+Delete, or the x button on the selected row.
     A row typed and not saved just leaves the grid. A saved division goes from the database at once, after the Delete
     right, the "used by transactions?" check and the question. */

  const deleteDivisionRow = async (key: number) => {
    const row = divisionRows.find((r) => r.key === key);
    if (!row || isEmptyDivisionRow(row)) return;

    const original = row.txtOriginalDivisionID;

    if (original !== null) {
      if (!perms.delete) {
        toast.warning("You don't have the permission to delete", { toastId: "cd-delete-denied" });
        return;
      }

      if (await haveDivisionTrans(original)) {
        toast.warning(
          "You can't delete. Some transactions already entered with this 'Division'",
          { toastId: "cd-delete-used" },
        );
        return;
      }

      const shouldDelete = await confirm({
        title: "Customer Division",
        message: "Do you want to delete ?",
      });
      if (!shouldDelete) return;

      try {
        const response = await apiFetch(`${CUSTOMER_DIVISION_API}/save`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lkpCsAccountID, inserted: [], updated: [], deleted: [original] }),
        });
        const result = await response.json();

        if (!response.ok || !result.success) {
          notDeleted(result.message);
          return;
        }

        // (no message for a deleted division: the row just leaves the grid)
      } catch {
        notDeleted();
        return;
      }
    }

    const index = indexOfRowKey(key);
    setDivisionRows((previous) => padDivisionRows(previous.filter((r) => r.key !== key)));
    focusCell("txtDivisionID", index);
  };

  /* ------------------------------------------------------- KEYBOARD */

  const focusSaveButton = () => document.getElementById("btnSave")?.focus();

  const handleCellKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>,
    index: number,
    key: number,
    column: Column,
  ) => {
    // Enter on an EMPTY id, and Escape, go to Save
    if (
      (event.key === "Enter" && column === "txtDivisionID" && event.currentTarget.value.trim() === "") ||
      event.key === "Escape"
    ) {
      event.preventDefault();
      focusSaveButton();
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      focusCell(column, index + 1);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      focusCell(column, index - 1);
      return;
    }

    if (event.key === "Delete" && event.ctrlKey) {
      event.preventDefault();
      void deleteDivisionRow(key);
    }
  };

  // Enter on a BUTTON presses it. Enter anywhere else moves on to the next box, as on the other pages.
  const handlePageKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    const target = event.target as HTMLElement;

    if (event.key === "Enter" && target.tagName === "BUTTON") {
      event.preventDefault();
      target.click();
      return;
    }

    handleEnterAsTab(event);
  };

  /* ------------------------------------------ SAVE / MODIFY (sends only what changed) */

  const handleSave = async () => {
    if (!lkpCsAccountID) {
      toast.warning("Please select 'Customer'");
      document.getElementById("lkpCsAccountID")?.focus();
      return;
    }

    const inserted: { txtDivisionID: string; txtDivisionName: string; txtDivisionName_AR: string }[] = [];
    const updated: {
      txtOriginalDivisionID: string;
      txtDivisionID: string;
      txtDivisionName: string;
      txtDivisionName_AR: string;
    }[] = [];

    for (let i = 0; i < divisionRows.length; i++) {
      const row = divisionRows[i];
      if (isEmptyDivisionRow(row)) continue;

      const id = row.txtDivisionID.trim();
      const name = row.txtDivisionName.trim();
      const nameAR = row.txtDivisionName_AR.trim();

      // the Arabic name is optional (as in the old form)
      if (id === "" || name === "") {
        toast.warning("Division ID and Division Name are both required");
        focusCell(id === "" ? "txtDivisionID" : "txtDivisionName", i);
        return;
      }

      const tooLong = (["txtDivisionID", "txtDivisionName", "txtDivisionName_AR"] as Column[]).find(
        (column) => row[column].trim().length > COLUMN_LIMITS[column].max,
      );
      if (tooLong) {
        toast.warning(COLUMN_LIMITS[tooLong].message);
        focusCell(tooLong, i);
        return;
      }

      if (row.txtOriginalDivisionID === null) {
        inserted.push({ txtDivisionID: id, txtDivisionName: name, txtDivisionName_AR: nameAR });
        continue;
      }

      const before = loadedDivisions[row.txtOriginalDivisionID];
      const changed =
        id !== row.txtOriginalDivisionID ||
        name !== (before?.name ?? "") ||
        nameAR !== (before?.nameAR ?? "");

      if (changed) {
        updated.push({
          txtOriginalDivisionID: row.txtOriginalDivisionID,
          txtDivisionID: id,
          txtDivisionName: name,
          txtDivisionName_AR: nameAR,
        });
      }
    }

    if (inserted.length === 0 && updated.length === 0) {
      toast.info("Nothing to save", { toastId: "cd-nothing" });
      return;
    }

    setIsSaving(true);
    try {
      const response = await apiFetch(`${CUSTOMER_DIVISION_API}/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lkpCsAccountID, inserted, updated, deleted: [] }),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        toast.error(result.message || "Not saved, try again");
        return;
      }

      toast.success("Customer Division saved successfully");
      await getCustomerDivisions(lkpCsAccountID);
    } catch {
      toast.error("Not saved, try again");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => selectCustomer(lkpCsAccountID);

  const handleClose = () => {
    selectCustomer(null);
    onClose?.();
  };

  // a row of the grid that can be deleted: filled
  const canDeleteDivisionRow = (row: DivisionRow) => !isEmptyDivisionRow(row);

  /* ---------------------------------------- KEYBOARD SHORTCUTS (page wide)
     Alt+S   Save
     Alt+N   Cancel
     Alt+C   Close
     Ctrl+Delete   delete the selected row (also when the cursor is not in a box; in a box the box does it)
     No dependency array on purpose: the listener is attached again after every render, so it always sees the latest
     rows / rights / handlers. */

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.altKey && !event.ctrlKey && !event.metaKey) {
        if (event.code === "KeyS") {
          event.preventDefault();
          if (!isSaving && (perms.save || perms.modify)) void handleSave();
          return;
        }

        if (event.code === "KeyN") {
          event.preventDefault();
          handleCancel();
          return;
        }

        if (event.code === "KeyC") {
          event.preventDefault();
          handleClose();
          return;
        }
      }

      if (
        event.ctrlKey &&
        event.key === "Delete" &&
        !(event.target instanceof HTMLInputElement) &&
        selectedRowKey !== null
      ) {
        event.preventDefault();
        void deleteDivisionRow(selectedRowKey);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  return (
    <>
      <div
        onKeyDown={handlePageKeyDown}
        className="flex min-h-full w-full items-start justify-center bg-white px-4 py-4"
      >
        <div className="min-h-fit w-225 max-w-full bg-white p-0">
          <main className="w-full overflow-hidden border border-gray-400 bg-white">
            <Header Name="Customer Division" />
            <section className="px-3.5 pb-3 pt-3">
              {/* Customer */}
              <div className="flex items-center gap-2">
                <label
                  htmlFor="lkpCsAccountID"
                  className="w-17.5 shrink-0 text-right text-[12px] "
                >
                  Customer :
                </label>
                <div className="min-w-0 flex-1">
                  <CustomLinkedPairSelect
                    firstInputId="lkpCsAccountID"
                    secondInputId="lkpCsAccountName"
                    options={lkpCsAccountOptions}
                    firstValue={lkpCsAccountID}
                    secondValue={lkpCsAccountID}
                    firstHeader="Customer ID"
                    secondHeader="Customer Name"
                    firstWidth={120}
                    secondWidth={400}
                    gap={4}
                    headerFontSize="12px"
                    placeholder="Select"
                    onChange={(option) => selectCustomer(option?.value ?? null)}
                  />
                </div>
              </div>

              {/* Grid: header stays on top, rows scroll */}
              <div
                className={`mt-3 max-h-[min(520px,calc(100vh-260px))] overflow-auto border border-[#B7ECD0] bg-white ${niceScrollbar}`}
              >
                <table className="w-full table-fixed border-collapse text-[12px] text-[#24364d]">
                  <colgroup>
                    <col className="w-5.5" />
                    <col className="w-32.5" />
                    <col />
                    <col />
                    <col className="w-7" />
                  </colgroup>
                  <thead className="sticky top-0 z-10 bg-[#EEFBF4]">
                    <tr className="bg-[#EEFBF4]">
                      <th className={thClass} />
                      <th className={`${thClass} text-left`}>Division ID</th>
                      <th className={`${thClass} text-left`}>Division Name</th>
                      <th className={`${thClass} text-right`}>Division Name (Arabic)</th>
                      <th className={thClass} />
                    </tr>
                  </thead>
                  <tbody>
                    {divisionRows.map((row, index) => {
                      const selected = row.key === selectedRowKey;
                      const isNewRow = isEmptyDivisionRow(row) && divisionRows.find(isEmptyDivisionRow)?.key === row.key;
                      return (
                        <tr
                          key={row.key}
                          onClick={() => setSelectedRowKey(row.key)}
                          className="bg-white"
                        >
                          <td className="h-6.5 border border-[#B7ECD0] bg-[#fafbfc] text-center text-[10px] text-[#405066]">
                            {selected ? "▶" : isNewRow ? "*" : ""}
                          </td>
                          <td
                            className={`border border-[#B7ECD0] p-0 ${cellFocusClass} ${selected ? "bg-[#e7f7ed]" : ""}`}
                          >
                            <input
                              id={`txtDivisionID-${index}`}
                              name="txtDivisionID"
                              aria-label="Division ID"
                              autoComplete="off"
                              value={row.txtDivisionID}
                              onFocus={(event) => {
                                selectOnFocus(event);
                                setSelectedRowKey(row.key);
                                // find out early whether transactions use it
                                if (row.txtOriginalDivisionID !== null) {
                                  void haveDivisionTrans(row.txtOriginalDivisionID);
                                }
                              }}
                              onBlur={() => handleCellBlur(row.key, "txtDivisionID")}
                              onChange={(event) =>
                                updateDivisionCell(row.key, "txtDivisionID", event.target.value.toUpperCase())
                              }
                              onKeyDown={(event) =>
                                handleCellKeyDown(event, index, row.key, "txtDivisionID")
                              }
                              className={cellInputClass}
                            />
                          </td>
                          <td className={`border border-[#B7ECD0] p-0 ${cellFocusClass}`}>
                            <input
                              id={`txtDivisionName-${index}`}
                              name="txtDivisionName"
                              aria-label="Division Name"
                              autoComplete="off"
                              value={row.txtDivisionName}
                              onFocus={(event) => {
                                selectOnFocus(event);
                                setSelectedRowKey(row.key);
                              }}
                              onBlur={() => handleCellBlur(row.key, "txtDivisionName")}
                              onChange={(event) =>
                                updateDivisionCell(row.key, "txtDivisionName", event.target.value)
                              }
                              onKeyDown={(event) =>
                                handleCellKeyDown(event, index, row.key, "txtDivisionName")
                              }
                              className={cellInputClass}
                            />
                          </td>
                          <td className={`border border-[#B7ECD0] p-0 ${cellFocusClass}`}>
                            <input
                              id={`txtDivisionName_AR-${index}`}
                              name="txtDivisionName_AR"
                              aria-label="Division Name (Arabic)"
                              dir="rtl"
                              autoComplete="off"
                              value={row.txtDivisionName_AR}
                              onFocus={(event) => {
                                selectOnFocus(event);
                                setSelectedRowKey(row.key);
                              }}
                              onChange={(event) =>
                                updateDivisionCell(row.key, "txtDivisionName_AR", event.target.value)
                              }
                              onKeyDown={(event) =>
                                handleCellKeyDown(event, index, row.key, "txtDivisionName_AR")
                              }
                              className={`${cellInputClass} text-right`}
                            />
                          </td>
                          <td className="border border-[#B7ECD0] bg-white p-0 text-center">
                            {selected && canDeleteDivisionRow(row) && (
                              <button
                                type="button"
                                tabIndex={-1}
                                title="Delete row (Ctrl+Delete)"
                                onClick={() => void deleteDivisionRow(row.key)}
                                className="text-[12px] leading-none text-gray-400 hover:text-red-600"
                              >
                                ✕
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Actions */}
              <div className="mt-5 flex justify-center gap-3">
                <button
                  id="btnSave"
                  name="btnSave"
                  type="button"
                  onClick={() => void handleSave()}
                  title="Alt+S"
                  disabled={isSaving || !(perms.save || perms.modify)}
                  className="btn-style disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <u>S</u>ave
                </button>
                <button
                  id="btnCancel"
                  name="btnCancel"
                  type="button"
                  onClick={handleCancel}
                  title="Alt+N"
                  className="btn-style"
                >
                  Ca<u>n</u>cel
                </button>
                <button
                  id="btnClose"
                  name="btnClose"
                  type="button"
                  onClick={handleClose}
                  title="Alt+C"
                  className="btn-style"
                >
                  <u>C</u>lose
                </button>
              </div>
            </section>
          </main>
        </div>
      </div>

      {/* the "Do you want to delete ?" question - outside the root div: the page's Enter handling must not take the Enter of
          the Yes / No buttons */}
      {dialog}
    </>
  );
};

export default CustomerDivisionPage;
