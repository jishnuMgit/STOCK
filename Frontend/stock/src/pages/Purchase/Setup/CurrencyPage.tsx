import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { useEnterAsTab } from "../../../hooks/useEnterAsTab";
import { useButtonPermissions } from "../../../hooks/useButtonPermissions";

// ============================================================
// TYPES
// ============================================================

type CurrencyRow = {
  txtCurrency: string;
  // the currency it had when it was loaded (null for a row typed on the
  // page and not saved yet) - tells a changed row from a new row
  txtOriginalCurrency: string | null;
};

const blankRow = (): CurrencyRow => ({
  txtCurrency: "",
  txtOriginalCurrency: null,
});

const API = `${import.meta.env.VITE_API_URL}/Currency`;

// at least this many rows are always on the screen (filled ones + blanks)
const MIN_ROW_COUNT = 9;

// TODO: dbo.tblmenu fmenuid of the "Currency" page
const MENU_ID = "110205";

// ============================================================
// WHO IS LOGGED IN (company / year / user sent to the API)
// ============================================================

const getAppSession = (): { coId: string; year: string; userId: string } => {
  try {
    return {
      coId: String(localStorage.getItem("PstrCoID") ?? ""),
      year: String(localStorage.getItem("PstrYear") ?? ""),
      userId: String(localStorage.getItem("PstrUserID") ?? ""),
    };
  } catch {
    return { coId: "", year: "", userId: "" };
  }
};

// ============================================================
// COMPONENT
// ============================================================

type CurrencyPageProps = {
  onClose?: () => void;
};

const CurrencyPage: React.FC<CurrencyPageProps> = ({ onClose }) => {

console.log(onClose)
  const handleEnterAsTab = useEnterAsTab();
  const perms = useButtonPermissions(MENU_ID);

  const { coId, year, userId } = getAppSession();

  const [rows, setRows] = useState<CurrencyRow[]>([]);
  const [selectedRow, setSelectedRow] = useState<number>(0);
  const [saving, setSaving] = useState(false);

  // currencies removed from the grid (applied when Save / Modify is pressed)
  const [deletedIds, setDeletedIds] = useState<string[]>([]);

  // saved currencies that transactions already use (true) or not (false)
  const [usedIds, setUsedIds] = useState<Record<string, boolean>>({});

  // bumped after a save / load so the grid loads again from the database
  const [reloadKey, setReloadKey] = useState(0);

  // Find box
  const [findOpen, setFindOpen] = useState(false);
  const [findText, setFindText] = useState("");

  // ============================================================
  // LOAD CURRENCIES
  // ============================================================

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch(`${API}?coId=${encodeURIComponent(coId)}`);
        const data = await res.json();

        if (!res.ok || !data.success) {
          toast.error(data.message || "Failed to load currencies");
          return;
        }
        if (cancelled) return;

        const list = data.currencies as { fCurrency: string }[];

        setRows(
          list.map((c) => ({
            txtCurrency: c.fCurrency,
            txtOriginalCurrency: c.fCurrency,
          })),
        );
        setDeletedIds([]);
        setUsedIds({});
      } catch {
        if (!cancelled) toast.error("Failed to load currencies");
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [reloadKey, coId]);

  // ============================================================
  // ROWS ON THE SCREEN
  // The loaded rows, then blank rows to type new currencies into
  // (always at least MIN_ROW_COUNT rows, and 3 blank ones at the end).
  // ============================================================

  const displayRows: CurrencyRow[] = Array.from(
    { length: Math.max(MIN_ROW_COUNT, rows.length + 3) },
    (_, index) => rows[index] ?? blankRow(),
  );

  const updateRow = (index: number, changes: Partial<CurrencyRow>) => {
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
  // FOCUS A BOX (id of the row, e.g. txtCurrency-3)
  // ============================================================

  const focusCell = (index: number) => {
    if (index < 0) return;

    requestAnimationFrame(() => {
      const input = document.getElementById(
        `txtCurrency-${index}`,
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
  // ARE TRANSACTIONS USING THIS SAVED CURRENCY? (the old HaveTrans)
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
  // MAY THIS SAVED CURRENCY BE EDITED? (the old txtCurrency_KeyDown and
  // txtCurrency_EditValueChanging)
  //  - any change needs the Modify right
  //  - refused when transactions already use it
  // A row typed on the page and not saved yet can always be edited.
  // ============================================================

  const isEditBlocked = (index: number): boolean => {
    const row = displayRows[index];

    if (row.txtOriginalCurrency === null) {
      return false;
    }

    if (!perms.modify) {
      toast.warning("You don't have the permission to modify", {
        toastId: "cur-modify-denied",
      });
      return true;
    }

    if (usedIds[row.txtOriginalCurrency] === true) {
      toast.warning(
        "You can't Modify. Transactions already entered with this Currency",
        { toastId: "cur-modify-used" },
      );
      return true;
    }

    return false;
  };

  // ============================================================
  // LEAVING A BOX (the old grdvCurrency_ValidateRow)
  //  - an emptied box of a saved currency goes back to what it was
  //  - a currency already in the grid: "Currency already exists" and the
  //    box goes back to what it was
  // ============================================================

  const handleBlur = (index: number) => {
    const row = displayRows[index];
    const value = row.txtCurrency.trim();
    const original = row.txtOriginalCurrency ?? "";

    if (value === "") {
      if (row.txtOriginalCurrency !== null) {
        updateRow(index, { txtCurrency: original });
      }
      return;
    }

    const alreadyThere = displayRows.some(
      (other, otherIndex) =>
        otherIndex !== index &&
        other.txtCurrency.trim().toLowerCase() === value.toLowerCase(),
    );

    if (alreadyThere) {
      toast.warning("Currency already exists", { toastId: "cur-duplicate" });
      updateRow(index, { txtCurrency: original });
      focusCell(index);
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

    if (!row) return; // a blank row on the screen

    const original = row.txtOriginalCurrency;

    if (original !== null) {
      if (!perms.delete) {
        toast.warning("You don't have the permission to delete", {
          toastId: "cur-delete-denied",
        });
        return;
      }

      if (await isUsed(original)) {
        toast.warning(
          "You can't delete. Transactions already entered with this Currency",
          { toastId: "cur-delete-used" },
        );
        return;
      }

      setDeletedIds((previous) => [...previous, original]);
    }

    setRows((previousRows) => previousRows.filter((_, i) => i !== index));
    focusCell(index);
  };

  // ============================================================
  // KEYBOARD (the old grdvCurrency_KeyDown)
  //  Enter on an EMPTY box goes to Save, Escape goes to Save
  //  Up / Down arrow   previous / next row
  //  Ctrl+Delete       deletes the row
  // ============================================================

  const hasSaved =
    rows.some((row) => row.txtOriginalCurrency !== null) ||
    deletedIds.length > 0;

  const focusSaveButton = () => {
    document.getElementById(hasSaved ? "btnModify" : "btnSave")?.focus();
  };
  const handleClear = () => {
    setSelectedRow(0);
    setReloadKey((key) => key + 1);
    focusCell(0);
  };
  const handleCellKeyDown = (
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

    if (event.key === "ArrowDown") {
      event.preventDefault();
      focusCell(index + 1);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      focusCell(index - 1);
      return;
    }

    if (event.key === "Delete" && event.ctrlKey) {
      event.preventDefault();
      deleteRow(index);
      return;
    }

    // a key that would type into / erase from a saved currency
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
  // The one button: Save the first time, Modify once there are saved
  // currencies (the old form switched its button text between the two).
  // Sends only what changed: new rows, changed rows and removed rows.
  // ============================================================

  const actionWord = hasSaved ? "Modify" : "Save";
  const canSaveOrModify = hasSaved ? perms.modify : perms.save;

  const reload = () => {
    setSelectedRow(0);
    setReloadKey((key) => key + 1);
    focusCell(0);
  };


  const handleSave = async () => {
    const inserted: { currency: string }[] = [];
    const updated: { originalCurrency: string; currency: string }[] = [];

    for (const row of rows) {
      const currency = row.txtCurrency.trim();

      if (currency === "") continue; // an empty row

      if (row.txtOriginalCurrency === null) {
        inserted.push({ currency });
      } else if (currency !== row.txtOriginalCurrency) {
        updated.push({ originalCurrency: row.txtOriginalCurrency, currency });
      }
    }

    if (
      inserted.length === 0 &&
      updated.length === 0 &&
      deletedIds.length === 0
    ) {
      toast.info("Nothing to save", { toastId: "cur-nothing" });
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
      reload();
    } catch {
      toast.error(hasSaved ? "Not modified, try again" : "Not saved, try again");
    } finally {
      setSaving(false);
    }
  };

  // ============================================================
  // FIND (the old Find button: pick a currency, go to its row)
  // ============================================================

  const findMatches = rows
    .map((row, index) => ({ row, index }))
    .filter(
      ({ row }) =>
        row.txtCurrency.trim() !== "" &&
        row.txtCurrency.toLowerCase().includes(findText.trim().toLowerCase()),
    );

  const openFind = () => {
    setFindText("");
    setFindOpen(true);
  };

  const closeFind = () => {
    setFindOpen(false);
    setFindText("");
    focusCell(selectedRow);
  };

  const pickFound = (index: number) => {
    setFindOpen(false);
    setFindText("");
    focusCell(index);
  };

  // ============================================================
  // KEYBOARD SHORTCUTS (page wide)
  //  Alt+S  Save    (only when nothing is saved yet)
  //  Alt+M  Modify  (only when saved currencies exist)
  //  Alt+F  Find
  //  Alt+C  Close
  //  Ctrl+Delete  delete the selected row (also when focus is not in a box)
  // No dependency array on purpose: the listener is re-attached after every
  // render, so it always sees the latest rows / permissions / handlers.
  // ============================================================

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
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

        if (event.code === "KeyF") {
          event.preventDefault();
          openFind();
          return;
        }

        if (event.code === "KeyC") {
          event.preventDefault();
          handleClear();
          return;
        }
      }

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

  // Enter on a BUTTON presses it. Enter anywhere else moves on to the next
  // box, as on the other pages.
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
    "h-[32px] w-full min-w-0 border-0 bg-transparent px-[11px] py-0 text-left text-[13px] uppercase text-[#374151] outline-none focus:bg-[#f1f8ff]";

  const headerCellClass =
    "sticky top-0 z-20 h-[34px] border border-l-0 border-[#bfe8d0] bg-[#edf9f2] px-[11px] py-0 text-[14px] font-normal text-gray-600";

  return (
    <div
      onKeyDown={handlePageKeyDown}
      className="flex min-h-screen w-full items-center justify-center bg-white"
    >
      <div className="w-full max-w-100 border border-slate-400 bg-white shadow-sm">
        {/* TITLE */}
        <div className="flex h-7 w-full items-center bg-[#a7dfc0]">
          <h1 className="ml-1.25 text-[17px] font-semibold text-[#374151]">
            Currency
          </h1>
        </div>

        {/* FORM */}
        <div className="p-3 m-3">
          <div className="h-76.25 overflow-hidden border border-[#bfe8d0]">
            <div className="h-full overflow-y-auto overflow-x-hidden">
              <table className="w-full table-fixed border-collapse text-[12px]">
                <colgroup>
                  <col className="w-10.5" />
                  <col />
                </colgroup>

                <thead>
                  <tr>
                    <th className="sticky top-0 z-20 h-8.5 border border-[#bfe8d0] bg-[#edf9f2] p-0" />
                    <th className={`${headerCellClass} text-left`}>Currency</th>
                  </tr>
                </thead>

                <tbody>
                  {displayRows.map((row, index) => (
                    <tr
                      key={index}
                      className={`h-8.5 ${
                        selectedRow === index ? "bg-[#f8fcfa]" : "bg-white"
                      }`}
                      onClick={() => setSelectedRow(index)}
                    >
                      {/* SELECTOR COLUMN: arrow + delete-row button */}
                      <td className="h-8.5 border border-[#bfe8d0] bg-white p-0 text-center align-middle">
                        {selectedRow === index && (
                          <span className="inline-flex items-center gap-1.5">
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

                      {/* CURRENCY (max 3, capital letters) */}
                      <td className="h-8.5 border border-l-0 border-[#bfe8d0] bg-white p-0 align-middle">
                        <input
                          id={`txtCurrency-${index}`}
                          name="txtCurrency"
                          type="text"
                          value={row.txtCurrency}
                          maxLength={3}
                          autoComplete="off"
                          autoFocus={index === 0}
                          onFocus={() => {
                            setSelectedRow(index);

                            // find out early whether transactions use it
                            if (row.txtOriginalCurrency !== null) {
                              isUsed(row.txtOriginalCurrency);
                            }
                          }}
                          onBlur={() => handleBlur(index)}
                          onChange={(event) =>
                            updateRow(index, {
                              txtCurrency: event.target.value.toUpperCase(),
                            })
                          }
                          onPaste={(event) => {
                            if (isEditBlocked(index)) {
                              event.preventDefault();
                            }
                          }}
                          onKeyDown={(event) => handleCellKeyDown(event, index)}
                          className={cellInputClass}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* BUTTONS */}
          <div className="mt-3.5 flex justify-center gap-3">
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
              // onClick={openFind}
              title="Alt+F"
              className="btn-style"
            >
              S<span className="underline underline-offset-2">e</span>arch
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

      {/* FIND BOX */}
      {findOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/20 pt-30"
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
          <div className="w-75 border border-slate-400 bg-white shadow-lg">
            <div className="flex h-7 items-center bg-[#a7dfc0] px-2 text-[15px] font-semibold text-[#374151]">
              Find Currency
            </div>

            <div className="p-2.5">
              <input
                autoFocus
                type="text"
                value={findText}
                placeholder="Type a currency"
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

              <div className="mt-2 max-h-55 overflow-y-auto border border-[#bfe8d0]">
                {findMatches.length === 0 ? (
                  <div className="px-2.5 py-2 text-[12px] text-gray-500">
                    No matching currency
                  </div>
                ) : (
                  findMatches.map(({ row, index }) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => pickFound(index)}
                      className="block w-full px-2.5 py-1.5 text-left text-[12px] text-[#374151] hover:bg-[#eefbf4]"
                    >
                      {row.txtCurrency}
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CurrencyPage;
