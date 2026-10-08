import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { X } from "lucide-react";
import { useEnterAsTab } from "../../../hooks/useEnterAsTab";
import { useAltShortcuts } from "../../../hooks/useAltShortcuts";
import { useButtonPermissions } from "../../../hooks/useButtonPermissions";
import { useConfirm } from "../../../hooks/useConfirm";

// ============================================================
// TYPES
// ============================================================

type UnitRow = {
  txtUnit: string;
  // the name the unit had when it was loaded (null for a row typed on the
  // page and not saved yet) - the server uses it to tell a rename from a
  // new unit
  txtOriginalUnit: string | null;
};

const blankRow = (): UnitRow => ({ txtUnit: "", txtOriginalUnit: null });

// at least this many rows are always on the screen (filled ones + blanks)
const MIN_ROW_COUNT = 10;

// dbo.tblmenu fmenuid for the Unit page (fmenucaption = "Unit").
const MENU_ID = "010203";

// ============================================================
// COMPONENT
// ============================================================

const UnitPage: React.FC = () => {
  const handleEnterAsTab = useEnterAsTab();
  const perms = useButtonPermissions(MENU_ID);
  const { confirm, confirmDialog } = useConfirm();

  // Only Admin Users (userType "AU") may delete a saved unit - the red X, the
  // keys (Ctrl+D / Alt+D / Ctrl+Delete) and the server all follow this, even
  // for a Restricted User who was given the Delete right.
  const isAdminUser = localStorage.getItem("userType") === "AU";

  const [rows, setRows] = useState<UnitRow[]>([]);

  // Saved units the user took off the grid with the X. They stay in the
  // database until Modify is pressed (then the server deletes them together
  // with the other changes) - like the old form, where DeleteRow only
  // removed the row from the grid and Save applied it.
  const [deletedRows, setDeletedRows] = useState<{ txtOriginalUnit: string }[]>([]);
  const [selectedRow, setSelectedRow] = useState<number>(0);
  const [saving, setSaving] = useState(false);

  // Saved units that transactions already use (true) or not (false) - asked
  // from the server when a saved row is entered, so editing it can be refused
  // at once, like the old EditValueChanging / HaveTrans check.
  const [usedUnits, setUsedUnits] = useState<Record<string, boolean>>({});

  // bumped after a save / clear so the units load again from the database
  const [reloadKey, setReloadKey] = useState(0);

  // ============================================================
  // LOAD UNITS (the company's units, A to Z)
  // ============================================================

  useEffect(() => {
    const loadUnits = async () => {
      try {
        const PstrCoID = localStorage.getItem("PstrCoID");

        if (!PstrCoID) {
          toast.error("getUnitList: no PstrCoID in localStorage");
          return;
        }

        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/Unit/getUnitList?PstrCoID=${PstrCoID}`,
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

        setRows(
          (result.data || []).map((unit: { txtUnit: string }) => ({
            txtUnit: unit.txtUnit,
            txtOriginalUnit: unit.txtUnit,
          })),
        );

        // what is on the screen is what is saved again
        setDeletedRows([]);
        setUsedUnits({});

        // the cursor goes to the first empty row, ready for a new unit
        const firstEmptyRow = (result.data || []).length;

        requestAnimationFrame(() => {
          const input = document.getElementById(
            `txtUnit-${firstEmptyRow}`,
          ) as HTMLInputElement | null;

          input?.focus();
          setSelectedRow(firstEmptyRow);
        });
      } catch (error) {
        console.error("getUnitList error:", error);
        toast.error(
          `getUnitList error: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    };

    loadUnits();
  }, [reloadKey]);

  // ============================================================
  // ROWS ON THE SCREEN
  // The loaded rows, then blank rows to type new units into
  // (always at least MIN_ROW_COUNT rows, and 3 blank ones at the end).
  // ============================================================

  const displayRows: UnitRow[] = Array.from(
    { length: Math.max(MIN_ROW_COUNT, rows.length + 3) },
    (_, index) => rows[index] ?? blankRow(),
  );

  // ============================================================
  // UPDATE UNIT
  // ============================================================

  const updateUnit = (index: number, value: string) => {
    setRows((previousRows) => {
      const updatedRows = [...previousRows];

      while (updatedRows.length <= index) {
        updatedRows.push(blankRow());
      }

      updatedRows[index] = { ...updatedRows[index], txtUnit: value };

      return updatedRows;
    });
  };

  // ============================================================
  // FOCUS ROW
  // ============================================================

  const focusRow = (index: number) => {
    if (index < 0 || index >= displayRows.length) {
      return;
    }

    requestAnimationFrame(() => {
      const input = document.getElementById(
        `txtUnit-${index}`,
      ) as HTMLInputElement | null;

      if (input) {
        input.focus();

        const length = input.value.length;
        input.setSelectionRange(length, length);

        setSelectedRow(index);
      }
    });
  };

  // ============================================================
  // "HAS A TRANSACTION USED THIS UNIT?" (the old HaveTrans)
  // Asked once per saved unit, when its row is entered. A failed call is
  // ignored here: the server checks again when Modify is pressed.
  // ============================================================

  const checkUnitUsed = async (txtOriginalUnit: string) => {
    if (usedUnits[txtOriginalUnit] !== undefined) {
      return;
    }

    const PstrCoID = localStorage.getItem("PstrCoID");

    if (!PstrCoID) {
      return;
    }

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/Unit/haveUnitTrans?PstrCoID=${PstrCoID}&txtOriginalUnit=${encodeURIComponent(txtOriginalUnit)}`,
      );

      const result = await response.json();

      if (response.ok && result.success) {
        setUsedUnits((previous) => ({
          ...previous,
          [txtOriginalUnit]: result.data === true,
        }));
      }
    } catch (error) {
      console.error("haveUnitTrans error:", error);
    }
  };

  // ============================================================
  // MAY THIS SAVED UNIT BE EDITED? (the old txtUnit_KeyDown and
  // txtUnit_EditValueChanging)
  //  - needs the Modify right
  //  - refused when transactions already use the unit
  // A row typed on the page and not saved yet can always be edited.
  // ============================================================

  const isEditBlocked = (index: number): boolean => {
    const row = displayRows[index];

    if (row.txtOriginalUnit === null) {
      return false;
    }

    if (!perms.modify) {
      toast.warning("You don't have the permission to modify", {
        toastId: "unit-modify-denied",
      });
      return true;
    }

    if (usedUnits[row.txtOriginalUnit] === true) {
      toast.warning(
        `You can't Modify. Transactions already entered with this Unit '${row.txtOriginalUnit}'`,
        { toastId: "unit-modify-used" },
      );
      return true;
    }

    return false;
  };

  // ============================================================
  // LEAVING A ROW (the old grdvUnit_ValidateRow)
  //  - an emptied saved unit goes back to its name
  //  - a unit that is already in the grid: "Unit already exists" and the row
  //    goes back to what it was
  // ============================================================

  const handleUnitBlur = (index: number) => {
    const row = displayRows[index];
    const txtUnit = row.txtUnit.trim();

    if (txtUnit === "") {
      if (row.txtOriginalUnit !== null) {
        updateUnit(index, row.txtOriginalUnit);
      }

      return;
    }

    const alreadyThere = displayRows.some(
      (other, otherIndex) =>
        otherIndex !== index &&
        other.txtUnit.trim().toLowerCase() === txtUnit.toLowerCase(),
    );

    if (alreadyThere) {
      toast.warning("Unit already exists", { toastId: "unit-duplicate" });
      updateUnit(index, row.txtOriginalUnit ?? "");
      focusRow(index);
    }
  };

  // ============================================================
  // INSERT ROW (the old Insert key / "Insert Row" menu)
  // ============================================================

  const insertRow = (index: number) => {
    setRows((previousRows) => {
      const updatedRows = [...previousRows];

      while (updatedRows.length < index) {
        updatedRows.push(blankRow());
      }

      updatedRows.splice(index, 0, blankRow());

      return updatedRows;
    });

    focusRow(index);
  };

  // ============================================================
  // KEYBOARD (the old grdvUnit_KeyDown)
  //  Enter / Down arrow  next row - but Enter on an EMPTY box goes to Save
  //  Escape              goes to Save
  //  Up arrow            previous row
  //  Insert              inserts a row
  //  Ctrl+Delete         deletes the row (the old Delete key)
  //  anything that would change a saved unit: see isEditBlocked
  // ============================================================

  const focusSaveButton = () => {
    document.getElementById(hasSavedUnits ? "btnModify" : "btnSave")?.focus();
  };

  const handleUnitKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>,
    index: number,
  ) => {
    if (event.key === "Enter" && event.currentTarget.value.trim() === "") {
      event.preventDefault();
      focusSaveButton();
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      focusSaveButton();
      return;
    }

    if (event.key === "Enter" || event.key === "ArrowDown") {
      event.preventDefault();
      focusRow(index + 1);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      focusRow(index - 1);
      return;
    }

    if (event.key === "Insert") {
      event.preventDefault();
      insertRow(index);
      return;
    }

    if (event.key === "Delete" && event.ctrlKey) {
      event.preventDefault();
      handleDeleteRow(index);
      return;
    }

    // a key that would type into / erase from a saved unit
    const changesText =
      (event.key.length === 1 &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey) ||
      event.key === "Backspace" ||
      event.key === "Delete";

    if (changesText && isEditBlocked(index)) {
      event.preventDefault();
    }
  };

  // ============================================================
  // SAVE / MODIFY
  //
  // The one button: Save the first time, Modify once the company has units
  // (the old form switched its button text between "Save" and "Modify").
  // It also deletes the units that were taken off the grid with the X.
  // ============================================================

  // a unit just removed from the grid is still a saved unit until Modify
  const hasSavedUnits =
    rows.some((row) => row.txtOriginalUnit !== null) || deletedRows.length > 0;
  const actionWord = hasSavedUnits ? "Modify" : "Save";
  const canSaveOrModify = hasSavedUnits ? perms.modify : perms.save;

  const handleSave = async () => {
    if (saving) return;

    if (!canSaveOrModify) {
      toast.error(`You do not have permission to ${actionWord}.`);
      return;
    }

    const PstrCoID = localStorage.getItem("PstrCoID");
    const PstrYear = localStorage.getItem("PstrYear");
    const PstrUserID = localStorage.getItem("PstrUserID");

    if (!PstrCoID || !PstrYear || !PstrUserID) {
      toast.error("Company ID / Year / User ID not found. Please log in again.");
      return;
    }

    // rows with something in them, in grid order (blank rows are skipped)
    const filledRows = displayRows
      .map((row, index) => ({ row, index }))
      .filter(({ row }) => row.txtUnit.trim() !== "");

    // a unit removed from the grid is something to save too
    if (filledRows.length === 0 && deletedRows.length === 0) {
      toast.warning("There is no information for saving.");
      document.getElementById("txtUnit-0")?.focus();
      return;
    }

    // the same unit twice (A and a count as the same) stops the save
    const seen = new Set<string>();

    for (const { row, index } of filledRows) {
      const key = row.txtUnit.trim().toLowerCase();

      if (seen.has(key)) {
        toast.warning("Unit already exists");
        document.getElementById(`txtUnit-${index}`)?.focus();
        return;
      }

      seen.add(key);
    }

    setSaving(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/Unit/saveUnit`,
        {
          method: "POST",
          credentials: "include", // the server checks the session and the rights
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            PstrCoID,
            PstrYear,
            PstrUserID,
            rows: filledRows.map(({ row, index }) => ({
              txtGridRow: index, // where the row sits in the grid (for the focus)
              txtUnit: row.txtUnit.trim(),
              txtOriginalUnit: row.txtOriginalUnit,
            })),
            deletedRows,
          }),
        },
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        toast.error(
          result.message ||
            (hasSavedUnits ? "Not modified, try again." : "Not saved, try again."),
        );

        // the backend names the box that failed - same name as the element id
        if (result.field) {
          document.getElementById(result.field)?.focus();
        }

        return;
      }

      toast.success(
        result.message ||
          (hasSavedUnits
            ? "Unit modified successfully."
            : "Unit saved successfully."),
      );

      // load the units again - they now carry their saved names
      setReloadKey((key) => key + 1);
    } catch (error) {
      console.error("saveUnit error:", error);
      toast.error("Cannot connect to Unit API.");
    } finally {
      setSaving(false);
    }
  };

  // ============================================================
  // DELETE ROW (the X or Ctrl+D / Alt+D / Ctrl+Delete - Admin Users only)
  //
  // Deleting only takes the row off the grid. A saved unit is deleted from the
  // database when Modify is pressed. Before the row goes: the Delete right
  // (the old CanDeleteGrid), the "used by transactions?" check (the old
  // HaveTrans) and an "Are you sure...?" question.
  // ============================================================

  const handleDeleteRow = async (index: number) => {
    const row = displayRows[index];

    // a row typed on the page and not saved yet just leaves the grid
    if (row.txtOriginalUnit === null) {
      setRows((previousRows) =>
        previousRows.filter((_, rowIndex) => rowIndex !== index),
      );
      return;
    }

    if (!isAdminUser) {
      toast.error("Only an Admin User can delete units.", {
        toastId: "unit-delete-admin-only",
      });
      return;
    }

    if (!perms.delete) {
      toast.error("You do not have permission to Delete.");
      return;
    }

    const PstrCoID = localStorage.getItem("PstrCoID");

    if (!PstrCoID) {
      toast.error("Company ID not found. Please log in again.");
      return;
    }

    // a unit that transactions already use cannot be deleted
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/Unit/haveUnitTrans?PstrCoID=${PstrCoID}&txtOriginalUnit=${encodeURIComponent(row.txtOriginalUnit)}`,
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        toast.error(result.message || "Could not check the unit.");
        return;
      }

      if (result.data === true) {
        toast.info(
          `You can't delete. Transactions already entered with this Unit '${row.txtOriginalUnit}'`,
        );
        return;
      }
    } catch (error) {
      console.error("haveUnitTrans error:", error);
      toast.error("Cannot connect to Unit API.");
      return;
    }

    const shouldDelete = await confirm(
      "Are you sure you want to delete this unit?",
    );

    if (!shouldDelete) {
      return;
    }

    // off the grid now, out of the database when Modify is pressed
    setDeletedRows((previousRows) => [
      ...previousRows,
      { txtOriginalUnit: row.txtOriginalUnit as string },
    ]);

    setRows((previousRows) =>
      previousRows.filter((_, rowIndex) => rowIndex !== index),
    );

    toast.success(`'${row.txtOriginalUnit}' removed. Click ${actionWord} to delete it.`);
  };

  // ============================================================
  // CLEAR - back to what is saved
  // ============================================================

  const handleClear = () => {
    setDeletedRows([]);
    setSelectedRow(0);
    setReloadKey((key) => key + 1);
  };

  // Alt+S -> Save (no units yet), Alt+M -> Modify (units saved),
  // Alt+D -> Delete the row the cursor is on (same as the X),
  // Alt+C -> Clear (the underlined letters on the buttons)
  useAltShortcuts({
    s: () => {
      if (!hasSavedUnits) handleSave();
    },
    m: () => {
      if (hasSavedUnits) handleSave();
    },
    d: () => {
      handleDeleteRow(selectedRow);
    },
    c: handleClear,
  });

  // Ctrl+D -> Delete the row the cursor is on. Window level, like the Alt
  // keys, so it works wherever the focus is; preventDefault stops the
  // browser's own "bookmark this page" for Ctrl+D.
  useEffect(() => {
    const handleCtrlD = (event: KeyboardEvent) => {
      if (event.ctrlKey && !event.altKey && event.key.toLowerCase() === "d") {
        event.preventDefault();
        handleDeleteRow(selectedRow);
      }
    };

    window.addEventListener("keydown", handleCtrlD);

    return () => {
      window.removeEventListener("keydown", handleCtrlD);
    };
  });

  // Enter on a BUTTON presses it (the old form's behaviour: Enter on an empty
  // unit goes to Save, and Enter there saves). Enter anywhere else moves on to
  // the next box, as on the other pages.
  const handlePageKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    const target = event.target as HTMLElement;

    if (event.key === "Enter" && target.tagName === "BUTTON") {
      event.preventDefault();
      target.click();
      return;
    }

    handleEnterAsTab(event);
  };

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div
      onKeyDown={handlePageKeyDown}
      className="flex min-h-screen w-full items-center justify-center bg-white"
    >
      <div className="w-full max-w-[530px] border border-slate-400 bg-white shadow-sm">
        {/* ====================================================
            TITLE
        ==================================================== */}

        <div className="flex h-[28px] w-full items-center bg-[#a7dfc0]">
          <h1 className="ml-[5px] text-[17px] font-semibold text-[#374151]">
            Unit
          </h1>
        </div>

        {/* ====================================================
            FORM
        ==================================================== */}

        <div className="p-[12px] m-[12px]">
          {/* TABLE AREA */}

          <div className="h-[305px] overflow-hidden border border-[#bfe8d0]">
            <div className="h-full overflow-y-auto overflow-x-hidden">
              <table className="w-full table-fixed border-collapse text-[12px]">
                <colgroup>
                  <col className="w-[38px]" />
                  <col />
                </colgroup>

                <thead>
                  <tr>
                    <th className="sticky top-0 z-20 h-[34px] border border-[#bfe8d0] bg-[#edf9f2] p-0" />

                    <th className="sticky top-0 z-20 h-[34px] border border-l-0 border-[#bfe8d0] bg-[#edf9f2] px-[11px] py-0 text-left text-[14px] font-normal text-gray-600">
                      Unit
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {displayRows.map((row, index) => {

                    // the X shows on a row that has a unit in it (Admin Users only):
                    // a typed (unsaved) row can always go, a saved one needs the
                    // Delete right
                    const showDelete =
                      isAdminUser &&
                      row.txtUnit.trim() !== "" &&
                      (row.txtOriginalUnit === null || perms.delete);

                    return (
                      <tr
                        key={index}
                        className={`h-[34px] ${
                          selectedRow === index ? "bg-[#f8fcfa]" : "bg-white"
                        }`}
                        onClick={() => setSelectedRow(index)}
                      >
                        {/* SELECTOR COLUMN */}

                        <td className="h-[34px] w-[38px] border border-[#bfe8d0] bg-white p-0 text-center align-middle">
                          {selectedRow === index && (
                            <span className="text-[9px] text-[#222]">▶</span>
                          )}
                        </td>

                        {/* UNIT COLUMN */}

                    <td
                      className="
                        h-[34px]
                        border
                        border-l-0
                        border-[#bfe8d0]
                        bg-white
                        p-0
                        align-middle
                      "
                    >
                      <input
                        ref={
                          index === 0
                            ? firstInputRef
                            : undefined
                        }
                        id={`txtUnit-${index}`}
                        type="text"
                        value={row.unit}
                        autoComplete="off"
                        onFocus={() =>
                          setSelectedRow(index)
                        }
                        onChange={(event) =>
                          updateUnit(
                            index,
                            event.target.value
                          )
                        }
                        onKeyDown={(event) =>
                          handleUnitKeyDown(
                            event,
                            index
                          )
                        }
                        className="
                          h-[32px]
                          w-full
                          border-0
                          bg-transparent
                          px-[11px]
                          py-0
                          text-left
                          text-[13px]
                          text-[#374151]
                          outline-none
                          focus:bg-[#f1f8ff]
                        "
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

          {/* ====================================================
              BUTTONS
          ==================================================== */}

          <div className="mt-[14px] flex justify-center gap-3">
            <button
              id={hasSavedUnits ? "btnModify" : "btnSave"}
              name={hasSavedUnits ? "btnModify" : "btnSave"}
              type="button"
              onClick={handleSave}
              disabled={!canSaveOrModify || saving}
              className="btn-style disabled:cursor-not-allowed disabled:opacity-40"
            >
              <span className="underline underline-offset-2">
                {actionWord.charAt(0)}
              </span>
              {actionWord.slice(1)}
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

export default UnitPage;
