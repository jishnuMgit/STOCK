import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { useEnterAsTab } from "../../../hooks/useEnterAsTab";
import { useAltShortcuts } from "../../../hooks/useAltShortcuts";
import { useButtonPermissions } from "../../../hooks/useButtonPermissions";

// ============================================================
// TYPES
// ============================================================

type StaffRow = {
  txtStaffID: string;
  txtStaffName: string;
  chkIsPurchase: boolean;
  chkIsSales: boolean;
  // the staff id it had when it was loaded (null for a row typed on the page
  // and not saved yet) - the server uses it to tell a change from a new row
  txtOriginalStaffID: string | null;
};

const blankRow = (): StaffRow => ({
  txtStaffID: "",
  txtStaffName: "",
  chkIsPurchase: false,
  chkIsSales: false,
  txtOriginalStaffID: null,
});

// at least this many rows are always on the screen (filled ones + blanks)
const MIN_ROW_COUNT = 10;

// dbo.tblmenu fmenuid for the Staff page (fmenucaption = "Staff").
const MENU_ID = "010204";

// ============================================================
// COMPONENT
// ============================================================

const StaffPage: React.FC = () => {
  const handleEnterAsTab = useEnterAsTab();
  const perms = useButtonPermissions(MENU_ID);

  const [rows, setRows] = useState<StaffRow[]>([]);
  const [selectedRow, setSelectedRow] = useState<number>(0);
  const [saving, setSaving] = useState(false);

  // Saved staff that transactions already use (true) or not (false) - asked
  // from the server when a saved staff id is entered, so changing the id can
  // be refused at once, like the old EditValueChanging / HaveTrans check.
  const [usedStaff, setUsedStaff] = useState<Record<string, boolean>>({});

  // The staff names as loaded (by staff id) - a box that is emptied or that
  // repeats another one goes back to what it was.
  const [loadedNames, setLoadedNames] = useState<Record<string, string>>({});

  // bumped after a save / clear so the staff load again from the database
  const [reloadKey, setReloadKey] = useState(0);

  // ============================================================
  // LOAD STAFF (the company's staff, by id)
  // ============================================================

  useEffect(() => {
    const loadStaff = async () => {
      try {
        const PstrCoID = localStorage.getItem("PstrCoID");

        if (!PstrCoID) {
          toast.error("getStaffList: no PstrCoID in localStorage");
          return;
        }

        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/Staff/getStaffList?PstrCoID=${PstrCoID}`,
        );

        if (!response.ok) {
          throw new Error(`HTTP Error: ${response.status}`);
        }

        const result = await response.json();

        if (!result.success) {
          console.error("getStaffList failed:", result.message);
          toast.error(`getStaffList failed: ${result.message}`);
          return;
        }

        const loadedRows: StaffRow[] = (result.data || []).map(
          (staff: {
            txtStaffID: string;
            txtStaffName: string;
            chkIsPurchase: boolean;
            chkIsSales: boolean;
          }) => ({
            txtStaffID: staff.txtStaffID,
            txtStaffName: staff.txtStaffName ?? "",
            chkIsPurchase: !!staff.chkIsPurchase,
            chkIsSales: !!staff.chkIsSales,
            txtOriginalStaffID: staff.txtStaffID,
          }),
        );

        setRows(loadedRows);
        setUsedStaff({});
        setLoadedNames(
          Object.fromEntries(
            loadedRows.map((row) => [row.txtOriginalStaffID as string, row.txtStaffName]),
          ),
        );

        // the cursor goes to the first empty row, ready for a new staff member
        requestAnimationFrame(() => {
          const input = document.getElementById(
            `txtStaffID-${loadedRows.length}`,
          ) as HTMLInputElement | null;

          input?.focus();
          setSelectedRow(loadedRows.length);
        });
      } catch (error) {
        console.error("getStaffList error:", error);
        toast.error(
          `getStaffList error: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    };

    loadStaff();
  }, [reloadKey]);

  // ============================================================
  // ROWS ON THE SCREEN
  // The loaded rows, then blank rows to type new staff into
  // (always at least MIN_ROW_COUNT rows, and 3 blank ones at the end).
  // ============================================================

  const displayRows: StaffRow[] = Array.from(
    { length: Math.max(MIN_ROW_COUNT, rows.length + 3) },
    (_, index) => rows[index] ?? blankRow(),
  );

  // ============================================================
  // UPDATE ONE CELL
  // ============================================================

  const updateRow = (index: number, changes: Partial<StaffRow>) => {
    setRows((previousRows) => {
      const updatedRows = [...previousRows];

      while (updatedRows.length <= index) {
        updatedRows.push(blankRow());
      }

      updatedRows[index] = { ...updatedRows[index], ...changes };

      return updatedRows;
    });
  };

  // ============================================================
  // FOCUS A BOX (id of the column + row, e.g. txtStaffID-3)
  // ============================================================

  const focusCell = (column: string, index: number) => {
    if (index < 0 || index >= displayRows.length) {
      return;
    }

    requestAnimationFrame(() => {
      const input = document.getElementById(
        `${column}-${index}`,
      ) as HTMLInputElement | null;

      if (input) {
        input.focus();

        if (input.type === "text") {
          const length = input.value.length;
          input.setSelectionRange(length, length);
        }

        setSelectedRow(index);
      }
    });
  };

  // ============================================================
  // "IS THIS STAFF MEMBER ALREADY USED?" (the old HaveTrans)
  // Asked once per saved staff id, when its row is entered. A failed call is
  // ignored here: the server checks again when Modify is pressed.
  // ============================================================

  const checkStaffUsed = async (txtOriginalStaffID: string) => {
    if (usedStaff[txtOriginalStaffID] !== undefined) {
      return;
    }

    const PstrCoID = localStorage.getItem("PstrCoID");

    if (!PstrCoID) {
      return;
    }

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/Staff/haveStaffTrans?PstrCoID=${PstrCoID}&txtOriginalStaffID=${encodeURIComponent(txtOriginalStaffID)}`,
      );

      const result = await response.json();

      if (response.ok && result.success) {
        setUsedStaff((previous) => ({
          ...previous,
          [txtOriginalStaffID]: result.data === true,
        }));
      }
    } catch (error) {
      console.error("haveStaffTrans error:", error);
    }
  };

  // ============================================================
  // MAY THIS SAVED STAFF MEMBER BE EDITED? (the old txtStaffID_KeyDown /
  // txtStaffName_KeyDown and txtStaffID_EditValueChanging)
  //  - any change needs the Modify right
  //  - the staff ID itself is refused when transactions already use it
  // A row typed on the page and not saved yet can always be edited.
  // ============================================================

  const isEditBlocked = (index: number, column: string): boolean => {
    const row = displayRows[index];

    if (row.txtOriginalStaffID === null) {
      return false;
    }

    if (!perms.modify) {
      toast.warning("You don't have the permission to modify", {
        toastId: "staff-modify-denied",
      });
      return true;
    }

    if (
      column === "txtStaffID" &&
      usedStaff[row.txtOriginalStaffID] === true
    ) {
      toast.warning(
        `You can't Modify. Transactions already entered with this Staff '${row.txtOriginalStaffID}'`,
        { toastId: "staff-modify-used" },
      );
      return true;
    }

    return false;
  };

  // ============================================================
  // LEAVING A BOX (the old grdvStaff_ValidateRow)
  //  - an emptied box of a saved staff member goes back to what it was
  //  - an id or a name that is already in the grid: "Staff ID already exists"
  //    / "Staff Name already exists" and the box goes back to what it was
  // ============================================================

  const handleStaffBlur = (
    index: number,
    column: "txtStaffID" | "txtStaffName",
  ) => {
    const row = displayRows[index];
    const value = row[column].trim();

    // what the box held when the row was loaded (nothing for a new row)
    const original =
      row.txtOriginalStaffID === null
        ? ""
        : column === "txtStaffID"
          ? row.txtOriginalStaffID
          : (loadedNames[row.txtOriginalStaffID] ?? "");

    if (value === "") {
      if (original !== "" && row.txtOriginalStaffID !== null) {
        updateRow(index, { [column]: original });
      }

      return;
    }

    const alreadyThere = displayRows.some(
      (other, otherIndex) =>
        otherIndex !== index &&
        other[column].trim().toLowerCase() === value.toLowerCase(),
    );

    if (alreadyThere) {
      toast.warning(
        column === "txtStaffID"
          ? "Staff ID already exists"
          : "Staff Name already exists",
        { toastId: `staff-duplicate-${column}` },
      );
      updateRow(index, { [column]: original });
      focusCell(column, index);
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

    focusCell("txtStaffID", index);
  };

  // ============================================================
  // KEYBOARD (the old grdvStaff_KeyDown)
  //  Enter on an EMPTY staff id goes to Save, Escape goes to Save
  //  Up / Down arrow   the same column, previous / next row
  //  Insert            inserts a row
  //  Enter otherwise   the next box (Enter-as-Tab)
  //  anything that would change a saved staff member: see isEditBlocked
  // ============================================================

  const hasSavedStaff = rows.some((row) => row.txtOriginalStaffID !== null);

  const focusSaveButton = () => {
    document.getElementById(hasSavedStaff ? "btnModify" : "btnSave")?.focus();
  };

  const handleCellKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>,
    index: number,
    column: "txtStaffID" | "txtStaffName",
  ) => {
    if (
      event.key === "Enter" &&
      column === "txtStaffID" &&
      event.currentTarget.value.trim() === ""
    ) {
      event.preventDefault();
      focusSaveButton();
      return;
    }

    if (event.key === "Escape") {
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

    if (event.key === "Insert") {
      event.preventDefault();
      insertRow(index);
      return;
    }

    // a key that would type into / erase from a saved staff member
    const changesText =
      (event.key.length === 1 &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey) ||
      event.key === "Backspace" ||
      event.key === "Delete";

    if (changesText && isEditBlocked(index, column)) {
      event.preventDefault();
    }
  };

  // ============================================================
  // SAVE / MODIFY
  //
  // The one button: Save the first time, Modify once the company has staff
  // (the old form switched its button text between "Save" and "Modify").
  // ============================================================

  const actionWord = hasSavedStaff ? "Modify" : "Save";
  const canSaveOrModify = hasSavedStaff ? perms.modify : perms.save;

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

    // rows with an id or a name in them, in grid order (blank rows are skipped)
    const filledRows = displayRows
      .map((row, index) => ({ row, index }))
      .filter(
        ({ row }) =>
          row.txtStaffID.trim() !== "" || row.txtStaffName.trim() !== "",
      );

    if (filledRows.length === 0) {
      toast.warning("There is no information for saving.");
      document.getElementById("txtStaffID-0")?.focus();
      return;
    }

    // a staff member needs an id AND a name; neither may be entered twice
    // (A and a count as the same) - the first problem stops the save
    const seenIds = new Set<string>();
    const seenNames = new Set<string>();

    for (const { row, index } of filledRows) {
      if (row.txtStaffID.trim() === "") {
        toast.warning("Please input 'Staff ID'");
        document.getElementById(`txtStaffID-${index}`)?.focus();
        return;
      }

      if (row.txtStaffName.trim() === "") {
        toast.warning("Please input 'Staff Name'");
        document.getElementById(`txtStaffName-${index}`)?.focus();
        return;
      }

      const idKey = row.txtStaffID.trim().toLowerCase();
      const nameKey = row.txtStaffName.trim().toLowerCase();

      if (seenIds.has(idKey)) {
        toast.warning("Staff ID already exists");
        document.getElementById(`txtStaffID-${index}`)?.focus();
        return;
      }

      if (seenNames.has(nameKey)) {
        toast.warning("Staff Name already exists");
        document.getElementById(`txtStaffName-${index}`)?.focus();
        return;
      }

      seenIds.add(idKey);
      seenNames.add(nameKey);
    }

    setSaving(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/Staff/saveStaff`,
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
              txtStaffID: row.txtStaffID.trim(),
              txtStaffName: row.txtStaffName.trim(),
              chkIsPurchase: row.chkIsPurchase,
              chkIsSales: row.chkIsSales,
              txtOriginalStaffID: row.txtOriginalStaffID,
            })),
          }),
        },
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        toast.error(
          result.message ||
            (hasSavedStaff ? "Not modified, try again." : "Not saved, try again."),
        );

        // the backend names the box that failed - same name as the element id
        if (result.field) {
          document.getElementById(result.field)?.focus();
        }

        return;
      }

      toast.success(
        result.message ||
          (hasSavedStaff
            ? "Staff modified successfully."
            : "Staff saved successfully."),
      );

      // load the staff again - they now carry their saved ids
      setReloadKey((key) => key + 1);
    } catch (error) {
      console.error("saveStaff error:", error);
      toast.error("Cannot connect to Staff API.");
    } finally {
      setSaving(false);
    }
  };

  // ============================================================
  // CLEAR - back to what is saved
  // ============================================================

  const handleClear = () => {
    setSelectedRow(0);
    setReloadKey((key) => key + 1);
  };

  // Alt+S -> Save (no staff yet), Alt+M -> Modify (staff saved),
  // Alt+C -> Clear (the underlined letters on the buttons)
  useAltShortcuts({
    s: () => {
      if (!hasSavedStaff) handleSave();
    },
    m: () => {
      if (hasSavedStaff) handleSave();
    },
    c: handleClear,
  });

  // Enter on a BUTTON presses it (the old form's behaviour: Enter on an empty
  // staff id goes to Save, and Enter there saves). Enter anywhere else moves on
  // to the next box, as on the other pages.
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

  const cellInputClass =
    "h-[32px] w-full min-w-0 border-0 bg-transparent px-[11px] py-0 text-left text-[13px] text-[#374151] outline-none focus:bg-[#f1f8ff]";

  const headerCellClass =
    "sticky top-0 z-20 h-[34px] border border-l-0 border-[#bfe8d0] bg-[#edf9f2] px-[11px] py-0 text-[14px] font-normal text-gray-600";

  return (
    <div
      onKeyDown={handlePageKeyDown}
      className="flex min-h-screen w-full items-center justify-center bg-white"
    >
      <div className="w-full max-w-[640px] border border-slate-400 bg-white shadow-sm">
        {/* ====================================================
            TITLE
        ==================================================== */}

        <div className="flex h-[28px] w-full items-center bg-[#a7dfc0]">
          <h1 className="ml-[5px] text-[17px] font-semibold text-[#374151]">
            Staff
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
                  <col className="w-[96px]" />
                  <col />
                  <col className="w-[96px]" />
                  <col className="w-[96px]" />
                </colgroup>

                <thead>
                  <tr>
                    <th className="sticky top-0 z-20 h-[34px] border border-[#bfe8d0] bg-[#edf9f2] p-0" />

                    <th className={`${headerCellClass} text-left`}>ID</th>
                    <th className={`${headerCellClass} text-left`}>Staff</th>
                    <th className={`${headerCellClass} text-center`}>Purchase</th>
                    <th className={`${headerCellClass} text-center`}>Sales</th>
                  </tr>
                </thead>

                <tbody>
                  {displayRows.map((row, index) => (
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

                      {/* STAFF ID */}

                      <td className="h-[34px] border border-l-0 border-[#bfe8d0] bg-white p-0 align-middle">
                        <input
                          id={`txtStaffID-${index}`}
                          name="txtStaffID"
                          type="text"
                          value={row.txtStaffID}
                          maxLength={4}
                          autoComplete="off"
                          onFocus={() => {
                            setSelectedRow(index);

                            if (row.txtOriginalStaffID !== null) {
                              checkStaffUsed(row.txtOriginalStaffID);
                            }
                          }}
                          onBlur={() => handleStaffBlur(index, "txtStaffID")}
                          onChange={(event) =>
                            updateRow(index, { txtStaffID: event.target.value })
                          }
                          onPaste={(event) => {
                            if (isEditBlocked(index, "txtStaffID")) {
                              event.preventDefault();
                            }
                          }}
                          onKeyDown={(event) =>
                            handleCellKeyDown(event, index, "txtStaffID")
                          }
                          className={cellInputClass}
                        />
                      </td>

                      {/* STAFF NAME */}

                      <td className="h-[34px] border border-l-0 border-[#bfe8d0] bg-white p-0 align-middle">
                        <input
                          id={`txtStaffName-${index}`}
                          name="txtStaffName"
                          type="text"
                          value={row.txtStaffName}
                          maxLength={50}
                          autoComplete="off"
                          onFocus={() => setSelectedRow(index)}
                          onBlur={() => handleStaffBlur(index, "txtStaffName")}
                          onChange={(event) =>
                            updateRow(index, { txtStaffName: event.target.value })
                          }
                          onPaste={(event) => {
                            if (isEditBlocked(index, "txtStaffName")) {
                              event.preventDefault();
                            }
                          }}
                          onKeyDown={(event) =>
                            handleCellKeyDown(event, index, "txtStaffName")
                          }
                          className={cellInputClass}
                        />
                      </td>

                      {/* PURCHASE */}

                      <td className="h-[34px] border border-l-0 border-[#bfe8d0] bg-white p-0 text-center align-middle">
                        <input
                          id={`chkIsPurchase-${index}`}
                          name="chkIsPurchase"
                          type="checkbox"
                          checked={row.chkIsPurchase}
                          onFocus={() => setSelectedRow(index)}
                          onChange={(event) => {
                            if (isEditBlocked(index, "chkIsPurchase")) {
                              return;
                            }

                            updateRow(index, {
                              chkIsPurchase: event.target.checked,
                            });
                          }}
                          className="h-[16px] w-[16px] cursor-pointer accent-green-600"
                        />
                      </td>

                      {/* SALES */}

                      <td className="h-[34px] border border-l-0 border-[#bfe8d0] bg-white p-0 text-center align-middle">
                        <input
                          id={`chkIsSales-${index}`}
                          name="chkIsSales"
                          type="checkbox"
                          checked={row.chkIsSales}
                          onFocus={() => setSelectedRow(index)}
                          onChange={(event) => {
                            if (isEditBlocked(index, "chkIsSales")) {
                              return;
                            }

                            updateRow(index, {
                              chkIsSales: event.target.checked,
                            });
                          }}
                          className="h-[16px] w-[16px] cursor-pointer accent-green-600"
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
              id={hasSavedStaff ? "btnModify" : "btnSave"}
              name={hasSavedStaff ? "btnModify" : "btnSave"}
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
    </div>
  );
};

export default StaffPage;
