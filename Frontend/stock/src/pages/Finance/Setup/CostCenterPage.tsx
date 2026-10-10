import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { useEnterAsTab } from "../../../hooks/useEnterAsTab";
import { useButtonPermissions } from "../../../hooks/useButtonPermissions";

// ============================================================
// TYPES
// ============================================================

type CostCenterRow = {
  txtCCID: string;
  txtCCName: string;
  txtPositionNo: string;
  // the cost center id it had when it was loaded (null for a row typed on the
  // page and not saved yet) - tells a changed row from a new row
  txtOriginalCCID: string | null;
};

type Column = "txtCCID" | "txtCCName" | "txtPositionNo";

const blankRow = (): CostCenterRow => ({
  txtCCID: "",
  txtCCName: "",
  txtPositionNo: "",
  txtOriginalCCID: null,
});

const API = `${import.meta.env.VITE_API_URL}/CostCenter`;

// at least this many rows are always on the screen (filled ones + blanks)
const MIN_ROW_COUNT = 10;

// TODO: dbo.tblmenu fmenuid of the "Cost Center" page
const MENU_ID = "110204";

// ============================================================
// WHO IS LOGGED IN (company / year / user sent to the API)
// TODO: replace the body with your real source (context, store, etc.)
// ============================================================

const getAppSession = (): { coId: string; year: string; userId: string } => {
  try {
    const PstrCoID = localStorage.getItem("PstrCoID") ?? "{}";
    const PstrYear = localStorage.getItem("PstrYear") ?? "{}";
    const PstrUserID = localStorage.getItem("PstrUserID") ?? "{}";
    return {
      coId: String(PstrCoID),
      year: String(PstrYear),
      userId: String(PstrUserID),
    };
  } catch {
    return { coId: "", year: "", userId: "" };
  }
};

// ============================================================
// COMPONENT
// ============================================================

const CostCenterPage: React.FC = () => {
  const handleEnterAsTab = useEnterAsTab();
  const perms = useButtonPermissions(MENU_ID);

  const { coId, year, userId } = getAppSession();

  const [rows, setRows] = useState<CostCenterRow[]>([]);
  const [selectedRow, setSelectedRow] = useState<number>(0);
  const [saving, setSaving] = useState(false);

  // ids removed from the grid (applied when Save / Modify is pressed)
  const [deletedIds, setDeletedIds] = useState<string[]>([]);

  // the saved values by cost center id (to see which rows were changed)
  const [loaded, setLoaded] = useState<
    Record<string, { name: string; position: number }>
  >({});

  // saved cost centers that transactions already use (true) or not (false)
  const [usedIds, setUsedIds] = useState<Record<string, boolean>>({});

  // bumped after a save / clear so the grid loads again from the database
  const [reloadKey, setReloadKey] = useState(0);

  // Find box
  // const [findOpen, setFindOpen] = useState(false);
  // const [findText, setFindText] = useState("");

  // ============================================================
  // LOAD COST CENTERS (the company's, by position then id)
  // ============================================================

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch(`${API}?coId=${encodeURIComponent(coId)}`);
        const data = await res.json();

        if (!res.ok || !data.success) {
          toast.error(data.message || "Failed to load cost centers");
          return;
        }
        if (cancelled) return;

        const list = data.costCenters as {
          fCCID: string;
          fCCName: string;
          fPositionNo: number | null;
        }[];

        const loadedMap: Record<string, { name: string; position: number }> = {};

        setRows(
          list.map((c) => {
            loadedMap[c.fCCID] = {
              name: c.fCCName ?? "",
              position: c.fPositionNo ?? 0,
            };
            return {
              txtCCID: c.fCCID,
              txtCCName: c.fCCName ?? "",
              txtPositionNo: c.fPositionNo == null ? "" : String(c.fPositionNo),
              txtOriginalCCID: c.fCCID,
            };
          }),
        );
        setLoaded(loadedMap);
        setDeletedIds([]);
        setUsedIds({});
      } catch {
        if (!cancelled) toast.error("Failed to load cost centers");
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [reloadKey, coId]);

  // ============================================================
  // ROWS ON THE SCREEN
  // The loaded rows, then blank rows to type new cost centers into
  // (always at least MIN_ROW_COUNT rows, and 3 blank ones at the end).
  // ============================================================

  const displayRows: CostCenterRow[] = Array.from(
    { length: Math.max(MIN_ROW_COUNT, rows.length + 3) },
    (_, index) => rows[index] ?? blankRow(),
  );

  // ============================================================
  // UPDATE ONE CELL
  // ============================================================

  const updateRow = (index: number, changes: Partial<CostCenterRow>) => {
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
  // FOCUS A BOX (id of the column + row, e.g. txtCCID-3)
  // ============================================================

  const focusCell = (column: Column, index: number) => {
    if (index < 0) {
      return;
    }

    requestAnimationFrame(() => {
      const input = document.getElementById(
        `${column}-${index}`,
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
  // ARE TRANSACTIONS USING THIS SAVED COST CENTER? (the old HaveTrans)
  // ============================================================

  const isUsed = async (id: string): Promise<boolean> => {
    if (usedIds[id] !== undefined) {
      return usedIds[id];
    }

    try {
      const res = await fetch(
        `${API}/used/${encodeURIComponent(id)}?coId=${encodeURIComponent(coId)}`,
      );
      const data = await res.json();

      if (!res.ok || !data.success) {
        toast.error(data.message || "Could not check the transactions");
        return true; // when in doubt, do not allow the change
      }

      setUsedIds((previous) => ({ ...previous, [id]: !!data.used }));
      return !!data.used;
    } catch {
      toast.error("Could not check the transactions.");
      return true;
    }
  };

  // ============================================================
  // MAY THIS SAVED COST CENTER BE EDITED? (the old txtCCID_KeyDown /
  // txtCCName_KeyDown and txtCCID_EditValueChanging)
  //  - any change needs the Modify right
  //  - the ID itself is refused when transactions already use it
  // A row typed on the page and not saved yet can always be edited.
  // ============================================================

  const isEditBlocked = (index: number, column: Column): boolean => {
    const row = displayRows[index];

    if (row.txtOriginalCCID === null) {
      return false;
    }

    if (!perms.modify) {
      toast.warning("You don't have the permission to modify", {
        toastId: "cc-modify-denied",
      });
      return true;
    }

    if (column === "txtCCID" && usedIds[row.txtOriginalCCID] === true) {
      toast.warning(
        "You can't Modify. Some transactions already entered with this 'Cost Center'",
        { toastId: "cc-modify-used" },
      );
      return true;
    }

    return false;
  };

  // ============================================================
  // LEAVING A BOX (the old grdvCostCenter_ValidateRow)
  //  - an emptied box of a saved cost center goes back to what it was
  //  - an id or a name already in the grid: "... already exists" and the
  //    box goes back to what it was
  // ============================================================

  const handleBlur = (index: number, column: "txtCCID" | "txtCCName") => {
    const row = displayRows[index];
    const value = row[column].trim();

    // what the box held when the row was loaded (nothing for a new row)
    const original =
      row.txtOriginalCCID === null
        ? ""
        : column === "txtCCID"
          ? row.txtOriginalCCID
          : (loaded[row.txtOriginalCCID]?.name ?? "");

    if (value === "") {
      if (original !== "" && row.txtOriginalCCID !== null) {
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
        column === "txtCCID"
          ? "'Cost Center ID' already exists"
          : "'Cost Center Name' already exists",
        { toastId: `cc-duplicate-${column}` },
      );
      updateRow(index, { [column]: original });
      focusCell(column, index);
    }
  };

  // ============================================================
  // DELETE A ROW (the old Delete key on the grid)
  // Here: Ctrl+Delete, or the x button on the selected row.
  // The row leaves the grid now; the database changes when Save / Modify
  // is pressed.
  // ============================================================

  const deleteRow = async (index: number) => {
    const row = rows[index];

    if (!row) {
      return; // a blank row on the screen
    }

    const original = row.txtOriginalCCID;

    if (original !== null) {
      if (!perms.delete) {
        toast.warning("You don't have the permission to delete", {
          toastId: "cc-delete-denied",
        });
        return;
      }

      if (await isUsed(original)) {
        toast.warning(
          "You can't delete. Some transactions already entered with this 'Cost Center'",
          { toastId: "cc-delete-used" },
        );
        return;
      }

      setDeletedIds((previous) => [...previous, original]);
    }

    setRows((previousRows) => previousRows.filter((_, i) => i !== index));
    focusCell("txtCCID", index);
  };

  // ============================================================
  // KEYBOARD (the old grdvCostCenter_KeyDown)
  //  Enter on an EMPTY id goes to Save, Escape goes to Save
  //  Up / Down arrow   the same column, previous / next row
  //  Ctrl+Delete       deletes the row
  //  Enter otherwise   the next box (Enter-as-Tab)
  //  anything that would change a saved cost center: see isEditBlocked
  // ============================================================

  const hasSaved =
    rows.some((row) => row.txtOriginalCCID !== null) || deletedIds.length > 0;

  const focusSaveButton = () => {
    document.getElementById(hasSaved ? "btnModify" : "btnSave")?.focus();
  };

  const handleCellKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>,
    index: number,
    column: Column,
  ) => {
    if (
      event.key === "Enter" &&
      column === "txtCCID" &&
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

    if (event.key === "Delete" && event.ctrlKey) {
      event.preventDefault();
      deleteRow(index);
      return;
    }

    // a key that would type into / erase from a saved cost center
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
  // The one button: Save the first time, Modify once there are saved cost
  // centers (the old form switched its button text between the two).
  // Sends only what changed: new rows, changed rows and removed rows.
  // ============================================================

  const actionWord = hasSaved ? "Modify" : "Save";
  const canSaveOrModify = hasSaved ? perms.modify : perms.save;

  const handleClear = () => {
    setSelectedRow(0);
    setReloadKey((key) => key + 1);
    focusCell("txtCCID", 0);
  };

  const handleSave = async () => {
    const inserted: { ccID: string; ccName: string; positionNo: number }[] = [];
    const updated: {
      originalCCID: string;
      ccID: string;
      ccName: string;
      positionNo: number;
    }[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const id = row.txtCCID.trim();
      const name = row.txtCCName.trim();

      if (id === "" && name === "") {
        continue; // an empty row
      }

      if (id === "" || name === "") {
        toast.warning("Cost Center ID and Cost Center Name are both required");
        focusCell(id === "" ? "txtCCID" : "txtCCName", i);
        return;
      }

      const positionNo = row.txtPositionNo === "" ? 0 : Number(row.txtPositionNo);

      if (row.txtOriginalCCID === null) {
        inserted.push({ ccID: id, ccName: name, positionNo });
        continue;
      }

      const before = loaded[row.txtOriginalCCID];
      const changed =
        id !== row.txtOriginalCCID ||
        name !== (before?.name ?? "") ||
        positionNo !== (before?.position ?? 0);

      if (changed) {
        updated.push({
          originalCCID: row.txtOriginalCCID,
          ccID: id,
          ccName: name,
          positionNo,
        });
      }
    }

    if (
      inserted.length === 0 &&
      updated.length === 0 &&
      deletedIds.length === 0
    ) {
      toast.info("Nothing to save", { toastId: "cc-nothing" });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          coId,
          year,
          userId,
          inserted,
          updated,
          deleted: deletedIds,
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        toast.error(
          data.message ||
          (hasSaved ? "Not modified, try again" : "Not saved, try again"),
        );
        return;
      }

      toast.success(hasSaved ? "Modified" : "Saved");
      handleClear();
    } catch {
      toast.error(hasSaved ? "Not modified, try again" : "Not saved, try again");
    } finally {
      setSaving(false);
    }
  };

  // ============================================================
  // FIND (the old Find button: pick a cost center, go to its row)
  // ============================================================

  // const findMatches = rows
  //   .map((row, index) => ({ row, index }))
  //   .filter(
  //     ({ row }) =>
  //       (row.txtCCID.trim() !== "" || row.txtCCName.trim() !== "") &&
  //       `${row.txtCCID} ${row.txtCCName}`
  //         .toLowerCase()
  //         .includes(findText.trim().toLowerCase()),
  //   );

  // const openFind = () => {
  //   setFindText("");
  //   setFindOpen(true);
  // };

  // const closeFind = () => {
  //   setFindOpen(false);
  //   setFindText("");
  //   focusCell("txtCCName", selectedRow);
  // };

  // const pickFound = (index: number) => {
  //   setFindOpen(false);
  //   setFindText("");
  //   focusCell("txtCCName", index);
  // };

  // ============================================================
  // KEYBOARD SHORTCUTS (page wide)
  //  Alt+S  Save    (only when nothing is saved yet)
  //  Alt+M  Modify  (only when saved cost centers exist)
  //  Alt+C  Clear
  //  Ctrl+Delete  delete the selected row (also works when focus is not in a box)
  // The listener is added once; the ref always holds the latest handlers,
  // so it never uses old rows / permissions.
  // ============================================================

  // No dependency array on purpose: the listener is re-attached after every
  // render, so it always sees the latest rows / permissions / handlers
  // (and no ref is read or written during render).
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      // Alt + letter (event.code also works on Mac, where Option+S types "ß")
      if (event.altKey && !event.ctrlKey && !event.metaKey) {
        if (event.code === "KeyS" || event.code === "KeyM") {
          event.preventDefault();

          const wantsModify = event.code === "KeyM";

          // Alt+S only when nothing is saved, Alt+M only when saved ones exist
          if (wantsModify !== hasSaved) return;
          if (!canSaveOrModify || saving) return;

          handleSave();
          return;
        }

        if (event.code === "KeyC") {
          event.preventDefault();
          handleClear();
          return;
        }

        // Alt+F -> Find (turn on together with the Find code above)
        // if (event.code === "KeyF") {
        //   event.preventDefault();
        //   openFind();
        //   return;
        // }
      }

      // Ctrl + Delete when focus is NOT in a box (inside a box the cell
      // handler already does it, so skip it here to avoid deleting twice)
      if (
        event.ctrlKey &&
        event.key === "Delete" &&
        !(event.target instanceof HTMLInputElement)
      ) {
        event.preventDefault();
        deleteRow(selectedRow);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  // Enter on a BUTTON presses it (the old form's behaviour: Enter on an empty
  // id goes to Save, and Enter there saves). Enter anywhere else moves on to
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
            Cost Center
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
                  <col className="w-[42px]" />
                  <col className="w-[100px]" />
                  <col />
                  <col className="w-[110px]" />
                </colgroup>

                <thead>
                  <tr>
                    <th className="sticky top-0 z-20 h-[34px] border border-[#bfe8d0] bg-[#edf9f2] p-0" />

                    <th className={`${headerCellClass} text-left`}>ID</th>
                    <th className={`${headerCellClass} text-left`}>
                      Cost Center
                    </th>
                    <th className={`${headerCellClass} text-right`}>
                      Position No.
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {displayRows.map((row, index) => (
                    <tr
                      key={index}
                      className={`h-[34px] ${selectedRow === index ? "bg-[#f8fcfa]" : "bg-white"
                        }`}
                      onClick={() => setSelectedRow(index)}
                    >
                      {/* SELECTOR COLUMN: arrow + delete-row button */}

                      <td className="h-[34px] border border-[#bfe8d0] bg-white p-0 text-center align-middle">
                        {selectedRow === index && (
                          <span className="inline-flex items-center gap-[6px]">
                            <span className="text-[9px] text-[#222]">▶</span>
                            {rows[index] && (
                              <button
                                type="button"
                                tabIndex={-1}
                                title="Delete row (Ctrl+Delete)"
                                onClick={() => deleteRow(index)}
                                className="text-[12px] leading-none text-gray-400 hover:text-red-600"
                              >
                                ✕
                              </button>
                            )}
                          </span>
                        )}
                      </td>

                      {/* COST CENTER ID */}

                      <td className="h-[34px] border border-l-0 border-[#bfe8d0] bg-white p-0 align-middle">
                        <input
                          id={`txtCCID-${index}`}
                          name="txtCCID"
                          type="text"
                          value={row.txtCCID}
                          maxLength={8}
                          autoComplete="off"
                          autoFocus={index === 0}
                          onFocus={() => {
                            setSelectedRow(index);

                            // find out early whether transactions use it
                            if (row.txtOriginalCCID !== null) {
                              isUsed(row.txtOriginalCCID);
                            }
                          }}
                          onBlur={() => handleBlur(index, "txtCCID")}
                          onChange={(event) =>
                            updateRow(index, { txtCCID: event.target.value })
                          }
                          onPaste={(event) => {
                            if (isEditBlocked(index, "txtCCID")) {
                              event.preventDefault();
                            }
                          }}
                          onKeyDown={(event) =>
                            handleCellKeyDown(event, index, "txtCCID")
                          }
                          className={cellInputClass}
                        />
                      </td>

                      {/* COST CENTER NAME */}

                      <td className="h-[34px] border border-l-0 border-[#bfe8d0] bg-white p-0 align-middle">
                        <input
                          id={`txtCCName-${index}`}
                          name="txtCCName"
                          type="text"
                          value={row.txtCCName}
                          maxLength={20}
                          autoComplete="off"
                          onFocus={() => setSelectedRow(index)}
                          onBlur={() => handleBlur(index, "txtCCName")}
                          onChange={(event) =>
                            updateRow(index, { txtCCName: event.target.value })
                          }
                          onPaste={(event) => {
                            if (isEditBlocked(index, "txtCCName")) {
                              event.preventDefault();
                            }
                          }}
                          onKeyDown={(event) =>
                            handleCellKeyDown(event, index, "txtCCName")
                          }
                          className={cellInputClass}
                        />
                      </td>

                      {/* POSITION NO. (whole numbers, smallint) */}

                      <td className="h-[34px] border border-l-0 border-[#bfe8d0] bg-white p-0 align-middle">
                        <input
                          id={`txtPositionNo-${index}`}
                          name="txtPositionNo"
                          type="text"
                          inputMode="numeric"
                          value={row.txtPositionNo}
                          maxLength={5}
                          autoComplete="off"
                          onFocus={() => setSelectedRow(index)}
                          onChange={(event) => {
                            const digits = event.target.value
                              .replace(/\D/g, "")
                              .slice(0, 5);

                            updateRow(index, {
                              txtPositionNo:
                                digits !== "" && Number(digits) > 32767
                                  ? "32767"
                                  : digits,
                            });
                          }}
                          onPaste={(event) => {
                            if (isEditBlocked(index, "txtPositionNo")) {
                              event.preventDefault();
                            }
                          }}
                          onKeyDown={(event) =>
                            handleCellKeyDown(event, index, "txtPositionNo")
                          }
                          className={`${cellInputClass} text-right`}
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
              id={hasSaved ? "btnModify" : "btnSave"}
              name={hasSaved ? "btnModify" : "btnSave"}
              type="button"
              onClick={handleSave}
              disabled={!canSaveOrModify || saving}
              title={hasSaved ? "Alt+M" : "Alt+S"}
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
              title="Alt+F"
              className="btn-style"
            >
              <span className="underline underline-offset-2">S</span>earch
            </button>

            <button
              id="btnClear"
              name="btnClear"
              type="button"
              onClick={handleClear}
              title="Alt+C"
              className="btn-style"
            >
              <span className="underline underline-offset-2">C</span>lear
            </button>
          </div>
        </div>
      </div>

      {/* ====================================================
          FIND BOX
      ==================================================== */}
      {/* 
      {findOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/20 pt-[120px]"
          onClick={(event) => {
            if (event.target === event.currentTarget) closeFind();
          }}
          onKeyDown={(event) => {
            // keep Enter / Escape inside the box (not the page's Enter-as-Tab)
            event.stopPropagation();
            if (event.key === "Escape") {
              event.preventDefault();
              closeFind();
            }
          }}
        >
          <div className="w-[420px] border border-slate-400 bg-white shadow-lg">
            <div className="flex h-[28px] items-center bg-[#a7dfc0] px-[8px] text-[15px] font-semibold text-[#374151]">
              Find Cost Center
            </div>

            <div className="p-[10px]">
              <input
                autoFocus
                type="text"
                value={findText}
                placeholder="Type an ID or a name"
                autoComplete="off"
                onChange={(event) => setFindText(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    if (findMatches[0]) pickFound(findMatches[0].index);
                  }
                }}
                className="input-style w-full"
              />

              <div className="mt-[8px] max-h-[220px] overflow-y-auto border border-[#bfe8d0]">
                {findMatches.length === 0 ? (
                  <div className="px-[10px] py-[8px] text-[12px] text-gray-500">
                    No matching cost center
                  </div>
                ) : (
                  findMatches.map(({ row, index }) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => pickFound(index)}
                      className="grid w-full grid-cols-[90px_1fr] px-[10px] py-[6px] text-left text-[12px] text-[#374151] hover:bg-[#eefbf4]"
                    >
                      <span>{row.txtCCID}</span>
                      <span>{row.txtCCName}</span>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )} */}
    </div>
  );
};

export default CostCenterPage;
