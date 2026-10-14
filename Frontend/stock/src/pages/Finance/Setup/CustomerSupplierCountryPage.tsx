import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { useEnterAsTab } from "../../../hooks/useEnterAsTab";
import { useButtonPermissions } from "../../../hooks/useButtonPermissions";

// ============================================================
// TYPES
// ============================================================

type CountryRow = {
  txtCountryID: string;
  txtCountryName: string;
  txtCountryNameA: string; // Arabic name
  txtPositionNo: string;
  // the country id it had when it was loaded (null for a row typed on the
  // page and not saved yet) - tells a changed row from a new row
  txtOriginalCountryID: string | null;
};

type Column =
  | "txtCountryID"
  | "txtCountryName"
  | "txtCountryNameA"
  | "txtPositionNo";

const blankRow = (): CountryRow => ({
  txtCountryID: "",
  txtCountryName: "",
  txtCountryNameA: "",
  txtPositionNo: "",
  txtOriginalCountryID: null,
});

const API = `${import.meta.env.VITE_API_URL}/CustomerSupplierCountry`;

// at least this many rows are always on the screen (filled ones + blanks)
// (the old form used AddGridRows(dt, 20))
const MIN_ROW_COUNT = 20;

// TODO: dbo.tblmenu fmenuid of the "Customer/Supplier Country" page
const MENU_ID = "110206";

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

type CustomerCountryPageProps = {
  onClose?: () => void;
};

const CustomerCountryPage: React.FC<CustomerCountryPageProps> = ({ onClose }) => {
  const handleEnterAsTab = useEnterAsTab();
  const perms = useButtonPermissions(MENU_ID);

  const { coId, year, userId } = getAppSession();

  const [rows, setRows] = useState<CountryRow[]>([]);
  const [selectedRow, setSelectedRow] = useState<number>(0);
  const [saving, setSaving] = useState(false);

  // ids removed from the grid (applied when Save / Modify is pressed)
  const [deletedIds, setDeletedIds] = useState<string[]>([]);

  // the saved values by country id (to see which rows were changed)
  const [loaded, setLoaded] = useState<
    Record<string, { name: string; nameA: string; position: number }>
  >({});

  // saved countries that transactions already use (true) or not (false)
  const [usedIds, setUsedIds] = useState<Record<string, boolean>>({});

  // bumped after a save / cancel so the grid loads again from the database
  const [reloadKey, setReloadKey] = useState(0);

  // Find box
  const [findOpen, setFindOpen] = useState(false);
  const [findText, setFindText] = useState("");

  // ============================================================
  // LOAD COUNTRIES (the company's, by position then id)
  // ============================================================

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch(`${API}?coId=${encodeURIComponent(coId)}`);
        const data = await res.json();

        if (!res.ok || !data.success) {
          toast.error(data.message || "Failed to load countries");
          return;
        }
        if (cancelled) return;

        const list = data.countries as {
          fCountryID: string;
          fCountryName: string | null;
          fCountryName_A: string | null;
          fPositionNo: number | null;
        }[];

        const loadedMap: Record<
          string,
          { name: string; nameA: string; position: number }
        > = {};

        setRows(
          list.map((c) => {
            loadedMap[c.fCountryID] = {
              name: c.fCountryName ?? "",
              nameA: c.fCountryName_A ?? "",
              position: c.fPositionNo ?? 0,
            };
            return {
              txtCountryID: c.fCountryID,
              txtCountryName: c.fCountryName ?? "",
              txtCountryNameA: c.fCountryName_A ?? "",
              txtPositionNo: c.fPositionNo == null ? "" : String(c.fPositionNo),
              txtOriginalCountryID: c.fCountryID,
            };
          }),
        );
        setLoaded(loadedMap);
        setDeletedIds([]);
        setUsedIds({});
      } catch {
        if (!cancelled) toast.error("Failed to load countries");
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [reloadKey, coId]);

  // ============================================================
  // ROWS ON THE SCREEN
  // The loaded rows, then blank rows to type new countries into
  // (always at least MIN_ROW_COUNT rows, and 3 blank ones at the end).
  // ============================================================

  const displayRows: CountryRow[] = Array.from(
    { length: Math.max(MIN_ROW_COUNT, rows.length + 3) },
    (_, index) => rows[index] ?? blankRow(),
  );

  // ============================================================
  // UPDATE ONE CELL
  // ============================================================

  const updateRow = (index: number, changes: Partial<CountryRow>) => {
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
  // FOCUS A BOX (id of the column + row, e.g. txtCountryID-3)
  // ============================================================

  const focusCell = (column: Column, index: number) => {
    if (index < 0) return;

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
  // ARE TRANSACTIONS USING THIS SAVED COUNTRY? (the old HaveTrans)
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
  // MAY THIS SAVED COUNTRY BE EDITED? (the old txtCountryID_KeyDown /
  // txtCountryName_KeyDown and txtCountryID_EditValueChanging)
  //  - any change needs the Modify right
  //  - the ID itself is refused when transactions already use it
  // A row typed on the page and not saved yet can always be edited.
  // ============================================================

  const isEditBlocked = (index: number, column: Column): boolean => {
    const row = displayRows[index];

    if (row.txtOriginalCountryID === null) {
      return false;
    }

    if (!perms.modify) {
      toast.warning("You don't have the permission to modify", {
        toastId: "cn-modify-denied",
      });
      return true;
    }

    if (column === "txtCountryID" && usedIds[row.txtOriginalCountryID] === true) {
      toast.warning(
        "You can't Modify. Transactions already entered with this 'Country'",
        { toastId: "cn-modify-used" },
      );
      return true;
    }

    return false;
  };

  // ============================================================
  // LEAVING THE ID BOX (the old grdvCustCountry_ValidateRow)
  //  - an emptied box of a saved country goes back to what it was
  //  - an id already in the grid: "Country ID already exists" and the
  //    box goes back to what it was
  // ============================================================

  const handleIdBlur = (index: number) => {
    const row = displayRows[index];
    const value = row.txtCountryID.trim();
    const original = row.txtOriginalCountryID ?? "";

    if (value === "") {
      if (row.txtOriginalCountryID !== null) {
        updateRow(index, { txtCountryID: original });
      }
      return;
    }

    const alreadyThere = displayRows.some(
      (other, otherIndex) =>
        otherIndex !== index &&
        other.txtCountryID.trim().toLowerCase() === value.toLowerCase(),
    );

    if (alreadyThere) {
      toast.warning("Country ID already exists", { toastId: "cn-duplicate" });
      updateRow(index, { txtCountryID: original });
      focusCell("txtCountryID", index);
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

    const original = row.txtOriginalCountryID;

    if (original !== null) {
      if (!perms.delete) {
        toast.warning("You don't have the permission to delete", {
          toastId: "cn-delete-denied",
        });
        return;
      }

      if (await isUsed(original)) {
        toast.warning(
          "You can't delete. Some transactions already entered with this 'Country'",
          { toastId: "cn-delete-used" },
        );
        return;
      }

      setDeletedIds((previous) => [...previous, original]);
    }

    setRows((previousRows) => previousRows.filter((_, i) => i !== index));
    focusCell("txtCountryID", index);
  };

  // ============================================================
  // KEYBOARD (the old grdvCustCountry_KeyDown)
  //  Enter on an EMPTY id goes to Save, Escape goes to Save
  //  Up / Down arrow   the same column, previous / next row
  //  Ctrl+Delete       deletes the row
  //  Enter otherwise   the next box (Enter-as-Tab)
  // ============================================================

  const hasSaved =
    rows.some((row) => row.txtOriginalCountryID !== null) ||
    deletedIds.length > 0;

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
      column === "txtCountryID" &&
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

    // a key that would type into / erase from a saved country
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
  // The one button: Save the first time, Modify once there are saved
  // countries (the old form switched its button text between the two).
  // Sends only what changed: new rows, changed rows and removed rows.
  // ============================================================

  const actionWord = hasSaved ? "Modify" : "Save";
  const canSaveOrModify = hasSaved ? perms.modify : perms.save;

  const handleClear = () => {
    setSelectedRow(0);
    setReloadKey((key) => key + 1);
    focusCell("txtCountryID", 0);
  };

  const handleClose = () => {
    if (onClose) onClose();
    else window.history.back();
  };

  const handleSave = async () => {
    const inserted: {
      countryID: string;
      countryName: string;
      countryNameA: string;
      positionNo: number;
    }[] = [];
    const updated: {
      originalCountryID: string;
      countryID: string;
      countryName: string;
      countryNameA: string;
      positionNo: number;
    }[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const id = row.txtCountryID.trim();
      const name = row.txtCountryName.trim();
      const nameA = row.txtCountryNameA.trim();

      if (id === "" && name === "" && nameA === "" && row.txtPositionNo === "") {
        continue; // an empty row
      }

      // the Arabic name is optional (as in the old form)
      if (id === "" || name === "") {
        toast.warning("Country ID and Country name are both required");
        focusCell(id === "" ? "txtCountryID" : "txtCountryName", i);
        return;
      }

      const positionNo = row.txtPositionNo === "" ? 0 : Number(row.txtPositionNo);

      if (row.txtOriginalCountryID === null) {
        inserted.push({ countryID: id, countryName: name, countryNameA: nameA, positionNo });
        continue;
      }

      const before = loaded[row.txtOriginalCountryID];
      const changed =
        id !== row.txtOriginalCountryID ||
        name !== (before?.name ?? "") ||
        nameA !== (before?.nameA ?? "") ||
        positionNo !== (before?.position ?? 0);

      if (changed) {
        updated.push({
          originalCountryID: row.txtOriginalCountryID,
          countryID: id,
          countryName: name,
          countryNameA: nameA,
          positionNo,
        });
      }
    }

    if (
      inserted.length === 0 &&
      updated.length === 0 &&
      deletedIds.length === 0
    ) {
      toast.info("Nothing to save", { toastId: "cn-nothing" });
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
  // FIND (the old Find button: pick a country, go to its row)
  // ============================================================

  const findMatches = rows
    .map((row, index) => ({ row, index }))
    .filter(
      ({ row }) =>
        (row.txtCountryID.trim() !== "" || row.txtCountryName.trim() !== "") &&
        `${row.txtCountryID} ${row.txtCountryName} ${row.txtCountryNameA}`
          .toLowerCase()
          .includes(findText.trim().toLowerCase()),
    );

  const openFind = () => {
    setFindText("");
    setFindOpen(true);
  };

  const closeFind = () => {
    setFindOpen(false);
    setFindText("");
    focusCell("txtCountryID", selectedRow);
  };

  const pickFound = (index: number) => {
    setFindOpen(false);
    setFindText("");
    focusCell("txtCountryID", index);
  };

  // ============================================================
  // KEYBOARD SHORTCUTS (page wide)
  //  Alt+S  Save    (only when nothing is saved yet)
  //  Alt+M  Modify  (only when saved countries exist)
  //  Alt+F  Find
  //  Alt+N  Cancel
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
    "h-[32px] w-full min-w-0 border-0 bg-transparent px-[11px] py-0 text-left text-[13px] text-[#374151] outline-none focus:bg-[#f1f8ff]";

  const headerCellClass =
    "sticky top-0 z-20 h-[34px] border border-l-0 border-[#bfe8d0] bg-[#edf9f2] px-[11px] py-0 text-[14px] font-normal text-gray-600";

  const dataCellClass =
    "h-[34px] border border-l-0 border-[#bfe8d0] bg-white p-0 align-middle";

  return (
    <div
      onKeyDown={handlePageKeyDown}
      className="flex min-h-screen w-full items-center justify-center bg-white"
    >
      <div className="w-full max-w-[760px] border border-slate-400 bg-white shadow-sm">
        {/* TITLE */}
        <div className="flex h-[28px] w-full items-center bg-[#a7dfc0]">
          <h1 className="ml-[5px] text-[17px] font-semibold text-[#374151]">
            Customer/Supplier Country
          </h1>
        </div>

        {/* FORM */}
        <div className="p-[12px] m-[12px]">
          <div className="h-[400px] overflow-hidden border border-[#bfe8d0]">
            <div className="h-full overflow-y-auto overflow-x-hidden">
              <table className="w-full table-fixed border-collapse text-[12px]">
                <colgroup>
                  <col className="w-[42px]" />
                  <col className="w-[80px]" />
                  <col />
                  <col />
                  <col className="w-[110px]" />
                </colgroup>

                <thead>
                  <tr>
                    <th className="sticky top-0 z-20 h-[34px] border border-[#bfe8d0] bg-[#edf9f2] p-0" />
                    <th className={`${headerCellClass} text-left`}>ID</th>
                    <th className={`${headerCellClass} text-left`}>Country</th>
                    <th className={`${headerCellClass} text-right`}>
                      Country(Arabic)
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
                      className={`h-[34px] ${
                        selectedRow === index ? "bg-[#f8fcfa]" : "bg-white"
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

                      {/* COUNTRY ID (max 4) */}
                      <td className={dataCellClass}>
                        <input
                          id={`txtCountryID-${index}`}
                          name="txtCountryID"
                          type="text"
                          value={row.txtCountryID}
                          maxLength={4}
                          autoComplete="off"
                          autoFocus={index === 0}
                          onFocus={() => {
                            setSelectedRow(index);

                            // find out early whether transactions use it
                            if (row.txtOriginalCountryID !== null) {
                              isUsed(row.txtOriginalCountryID);
                            }
                          }}
                          onBlur={() => handleIdBlur(index)}
                          onChange={(event) =>
                            updateRow(index, { txtCountryID: event.target.value })
                          }
                          onPaste={(event) => {
                            if (isEditBlocked(index, "txtCountryID")) {
                              event.preventDefault();
                            }
                          }}
                          onKeyDown={(event) =>
                            handleCellKeyDown(event, index, "txtCountryID")
                          }
                          className={cellInputClass}
                        />
                      </td>

                      {/* COUNTRY NAME (max 50) */}
                      <td className={dataCellClass}>
                        <input
                          id={`txtCountryName-${index}`}
                          name="txtCountryName"
                          type="text"
                          value={row.txtCountryName}
                          maxLength={50}
                          autoComplete="off"
                          onFocus={() => setSelectedRow(index)}
                          onChange={(event) =>
                            updateRow(index, { txtCountryName: event.target.value })
                          }
                          onPaste={(event) => {
                            if (isEditBlocked(index, "txtCountryName")) {
                              event.preventDefault();
                            }
                          }}
                          onKeyDown={(event) =>
                            handleCellKeyDown(event, index, "txtCountryName")
                          }
                          className={cellInputClass}
                        />
                      </td>

                      {/* COUNTRY NAME (ARABIC) (max 50, right to left) */}
                      <td className={dataCellClass}>
                        <input
                          id={`txtCountryNameA-${index}`}
                          name="txtCountryNameA"
                          type="text"
                          dir="rtl"
                          value={row.txtCountryNameA}
                          maxLength={50}
                          autoComplete="off"
                          onFocus={() => setSelectedRow(index)}
                          onChange={(event) =>
                            updateRow(index, { txtCountryNameA: event.target.value })
                          }
                          onPaste={(event) => {
                            if (isEditBlocked(index, "txtCountryNameA")) {
                              event.preventDefault();
                            }
                          }}
                          onKeyDown={(event) =>
                            handleCellKeyDown(event, index, "txtCountryNameA")
                          }
                          className={`${cellInputClass} text-right`}
                        />
                      </td>

                      {/* POSITION # (whole numbers, smallint) */}
                      <td className={dataCellClass}>
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

          {/* BUTTONS */}
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
              title="Alt+N"
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
          <div className="w-[460px] border border-slate-400 bg-white shadow-lg">
            <div className="flex h-[28px] items-center bg-[#a7dfc0] px-[8px] text-[15px] font-semibold text-[#374151]">
              Find Country
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

              <div className="mt-[8px] max-h-[260px] overflow-y-auto border border-[#bfe8d0]">
                {findMatches.length === 0 ? (
                  <div className="px-[10px] py-[8px] text-[12px] text-gray-500">
                    No matching country
                  </div>
                ) : (
                  findMatches.map(({ row, index }) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => pickFound(index)}
                      className="grid w-full grid-cols-[60px_1fr_1fr] gap-2 px-[10px] py-[6px] text-left text-[12px] text-[#374151] hover:bg-[#eefbf4]"
                    >
                      <span>{row.txtCountryID}</span>
                      <span>{row.txtCountryName}</span>
                      <span dir="rtl" className="text-right">
                        {row.txtCountryNameA}
                      </span>
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

export default CustomerCountryPage;
