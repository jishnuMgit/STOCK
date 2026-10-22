import React, { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { useAltShortcuts } from "../../hooks/useAltShortcuts";
import { useConfirm, DELETE_CONFIRM_MESSAGE } from "../../hooks/useConfirm";

// ============================================================
// BRANCH (Administration > Branch, the old frmBranch)

// (txtCompany, txtBrID, txtBrName, txtPositionNo, txtFind ...).
// ============================================================

const api = import.meta.env.VITE_API_URL;

const MIN_ROWS = 12;
const MAX_ID_LENGTH = 3;
const MAX_NAME_LENGTH = 40;

type BranchRow = {
  key: number;
  txtBrID: string;
  txtBrName: string;
  txtPositionNo: string;
  // the row came from the server: a change of it is an update
  chkSaved: boolean;
  // what the server has (to find the changed rows, and the row itself)
  original: {
    txtBrID: string;
    txtBrName: string;
    txtPositionNo: string;
  } | null;
};

let keyCounter = 0;
const nextKey = () => ++keyCounter;

const emptyRow = (): BranchRow => ({
  key: nextKey(),
  txtBrID: "",
  txtBrName: "",
  txtPositionNo: "",
  chkSaved: false,
  original: null,
});

const isEmptyRow = (row: BranchRow) =>
  !row.txtBrID && !row.txtBrName && !row.txtPositionNo;

/** keeps one empty row at the end and at least MIN_ROWS rows in total */
const padRows = (rows: BranchRow[]): BranchRow[] => {
  const result = [...rows];
  if (result.length === 0 || !isEmptyRow(result[result.length - 1])) {
    result.push(emptyRow());
  }
  while (result.length < MIN_ROWS) result.push(emptyRow());
  return result;
};

// a new row with something typed, or a saved row whose name / position changed
const isChanged = (row: BranchRow) =>
  row.chkSaved
    ? row.original !== null &&
      (row.txtBrName.trim() !== row.original.txtBrName ||
        row.txtPositionNo.trim() !== row.original.txtPositionNo)
    : !isEmptyRow(row);

type Field = "txtBrID" | "txtBrName" | "txtPositionNo";

const cellInputClass =
  "h-[26px] w-full bg-transparent px-2 text-[12px] text-[#24364d] outline-none focus:bg-white ";

const focusField = (field?: string) => {
  if (!field) return;

  const element =
    document.getElementById(field) ??
    document.querySelector<HTMLElement>(`[name="${field}"]`);

  element?.focus();
};

const BranchPage: React.FC = () => {
  const [txtCompany, setTxtCompany] = useState("");
  const [rows, setRows] = useState<BranchRow[]>(() => padRows([]));
  const [selectedKey, setSelectedKey] = useState<number | null>(null);
  const [chkFindOpen, setChkFindOpen] = useState(false);
  const [txtFind, setTxtFind] = useState("");
  const [saving, setSaving] = useState(false);
  const { confirm, confirmDialog } = useConfirm();

  // bumped after a Save / Modify so the branches are loaded again
  const [reloadKey, setReloadKey] = useState(0);

  // only the answer of the latest request may fill the grid
  const loadRequest = useRef(0);

  // ----------------------------------------------------------
  // LOAD: the company name and its branches
  // ----------------------------------------------------------

  useEffect(() => {
    const requestNo = ++loadRequest.current;

    const loadBranches = async () => {
      try {
        const PstrCoID = localStorage.getItem("PstrCoID");

        if (!PstrCoID) {
          toast.error("getBranch: no PstrCoID in localStorage");
          return;
        }

        const response = await fetch(
          `${api}/AdministrationBranch/getBranch?PstrCoID=${PstrCoID}`,
          { credentials: "include" },
        );

        const result = await response.json();

        if (requestNo !== loadRequest.current) return;

        if (!response.ok || !result.success) {
          toast.error(result.message || "Failed to load the Branches");
          return;
        }

        setTxtCompany(result.header?.txtCompany ?? "");

        const loaded: BranchRow[] = (result.data || []).map(
          (row: {
            txtBrID: string;
            txtBrName: string | null;
            txtPositionNo: number | string | null;
          }) => {
            const txtBrName = row.txtBrName ?? "";
            const txtPositionNo =
              row.txtPositionNo === null || row.txtPositionNo === undefined
                ? ""
                : String(row.txtPositionNo);

            return {
              key: nextKey(),
              txtBrID: row.txtBrID,
              txtBrName,
              txtPositionNo,
              chkSaved: true,
              original: {
                txtBrID: row.txtBrID,
                txtBrName,
                txtPositionNo,
              },
            };
          },
        );

        const padded = padRows(loaded);

        setRows(padded);
        setSelectedKey(padded[0]?.key ?? null);
      } catch (error: unknown) {
        if (requestNo !== loadRequest.current) return;

        console.error("getBranch error:", error);
        toast.error("Failed to load the Branches");
      }
    };

    loadBranches();
  }, [reloadKey]);

  // ----------------------------------------------------------
  // EDIT
  // ----------------------------------------------------------

  const updateCell = (key: number, field: Field, value: string) => {
    setRows((previous) =>
      padRows(
        previous.map((row) => (row.key === key ? { ...row, [field]: value } : row)),
      ),
    );
  };

  // Enter goes on to the next cell of the row, then to the next row
  const handleCellKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>,
    index: number,
    field: Field,
  ) => {
    if (event.key !== "Enter") return;

    event.preventDefault();

    const order: Field[] = ["txtBrID", "txtBrName", "txtPositionNo"];
    let nextIndex = index;
    let nextField = order[order.indexOf(field) + 1];

    if (!nextField) {
      nextIndex = index + 1;
      nextField = "txtBrID";
    }

    document.getElementById(`${nextField}-${nextIndex}`)?.focus();
  };

  const changedRows = rows.filter(isChanged);

  // something to send: a new row or a changed row (the button itself is always
  // on, as in the old form; with nothing to send it says so)
  const hasChanges = changedRows.length > 0;

  // ----------------------------------------------------------
  // SAVE (the old cmdSave_Click): the server checks everything again, and that
  // the user is the administrator.
  // ----------------------------------------------------------

  const handleSave = async () => {
    if (saving) return;

    const filled = rows.filter((row) => !isEmptyRow(row));

    // the old grdvBranch_ValidateRow, on every row
    for (const row of filled) {
      const index = rows.indexOf(row);

      if (!row.txtBrID.trim()) {
        toast.info("Please enter the 'Branch ID'");
        focusField(`txtBrID-${index}`);
        return;
      }

      if (!row.txtBrName.trim()) {
        toast.info(`Please enter the 'Branch' name of '${row.txtBrID.trim()}'`);
        focusField(`txtBrName-${index}`);
        return;
      }
    }

    const seenIDs = new Set<string>();
    const seenNames = new Set<string>();

    for (const row of filled) {
      const index = rows.indexOf(row);
      const idKey = row.txtBrID.trim().toLowerCase();
      const nameKey = row.txtBrName.trim().toLowerCase();

      if (seenIDs.has(idKey)) {
        toast.info("'Branch ID' already exists");
        focusField(`txtBrID-${index}`);
        return;
      }

      if (seenNames.has(nameKey)) {
        toast.info("'Branch Name' already exists");
        focusField(`txtBrName-${index}`);
        return;
      }

      seenIDs.add(idKey);
      seenNames.add(nameKey);
    }

    if (!hasChanges) {
      toast.info("There is no data to save");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(`${api}/AdministrationBranch/saveBranch`, {
        method: "POST",
        credentials: "include", // the server checks the session and the user type
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          PstrCoID: localStorage.getItem("PstrCoID"),
          PstrYear: localStorage.getItem("PstrYear"),
          rows: changedRows.map((row) => ({
            txtBrID: row.txtBrID.trim(),
            txtBrName: row.txtBrName.trim(),
            txtPositionNo: row.txtPositionNo.trim(),
            chkSaved: row.chkSaved,
          })),
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        toast.error(result.message || "Not Saved,try again");
        focusField(result.field);
        return;
      }

      toast.success(result.message);

      setReloadKey((previous) => previous + 1);
    } catch (error: unknown) {
      console.error("saveBranch error:", error);
      toast.error("Not Saved,try again");
    } finally {
      setSaving(false);
    }
  };

  // ----------------------------------------------------------
  // DELETE (the X of a row). A row only typed on the page just goes. A saved row
  // asks "Do you want to delete?" and, on Delete, is deleted in the database at
  // once; the other rows keep what has been typed in them.
  // ----------------------------------------------------------

  const handleDeleteRow = async (row: BranchRow) => {
    if (saving) return;

    if (!row.chkSaved) {
      setRows((previous) =>
        padRows(previous.filter((item) => item.key !== row.key)),
      );
      return;
    }

    const shouldDelete = await confirm(DELETE_CONFIRM_MESSAGE, "Delete");

    if (!shouldDelete) return;

    setSaving(true);

    try {
      // the same endpoint as Save, with nothing but this branch to delete
      const response = await fetch(`${api}/AdministrationBranch/saveBranch`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          PstrCoID: localStorage.getItem("PstrCoID"),
          PstrYear: localStorage.getItem("PstrYear"),
          rows: [],
          deletedRows: [{ txtBrID: row.txtBrID }],
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        toast.error(result.message || "Not Deleted,try again");
        return;
      }

      toast.success(result.message);

      setRows((previous) =>
        padRows(previous.filter((item) => item.key !== row.key)),
      );
    } catch (error: unknown) {
      console.error("deleteBranch error:", error);
      toast.error("Not Deleted,try again");
    } finally {
      setSaving(false);
    }
  };

  // ----------------------------------------------------------
  // FIND / CLEAR
  // ----------------------------------------------------------

  const handleFind = () => {
    setChkFindOpen((previous) => !previous);
    setTxtFind("");
  };

  // Clear: back to what is saved - the typed rows and the changes are dropped,
  // and the branches are loaded again
  const handleClear = () => {
    if (saving) return;

    setChkFindOpen(false);
    setTxtFind("");
    setReloadKey((previous) => previous + 1);
  };

  // Alt+S Save, Alt+F Find, Alt+C Clear
  useAltShortcuts({
    s: handleSave,
    f: handleFind,
    c: handleClear,
  });

  const search = txtFind.trim().toLowerCase();

  // the row keeps its place in the full list (its element ids carry that number)
  const visibleRows = rows
    .map((row, index) => ({ row, index }))
    .filter(
      ({ row }) =>
        !search ||
        row.txtBrID.toLowerCase().includes(search) ||
        row.txtBrName.toLowerCase().includes(search),
    );

  return (
    <div className="flex min-h-screen w-full items-start justify-center bg-white px-4 py-4">
      <div className="min-h-fit w-150 max-w-full bg-white p-0">
        <main className="w-full overflow-hidden border border-[#d5dce2] bg-white">
          <header className="flex h-7.5 items-center justify-start bg-[#9fdfbc]">
            <h1 className="m-0 ml-3.5 text-[17px] font-semibold text-[#24364d]">
              Branch
            </h1>
          </header>

          <section className="px-3.5 pb-6 pt-3">
            {/* Company (the logged-in company, read-only) */}
            {/* <div className="flex items-center gap-3"> */}
              {/* <div className="flex h-[30px] w-[110px] items-center justify-end border border-[#BFE8D0] bg-[#fafbfc] pr-3 text-[12px] text-[#405066]">
                Company :
              </div> */}
              {/* <input
                id="txtCompany"
                name="txtCompany"
                type="text"
                readOnly
                tabIndex={-1}
                value={txtCompany}
                className="h-[30px] w-[320px] max-w-full rounded-[4px] border border-[#cfd7df] bg-[#f6f8fa] px-2 text-[13px] text-[#24364d] outline-none"
              />
            </div> */}

            {chkFindOpen && (
              <div className="mt-3 flex items-center gap-3">
                <div className="flex h-[30px] w-[110px] items-center justify-end border border-[#BFE8D0] bg-[#fafbfc] pr-3 text-[12px] text-[#405066]">
                  Find :
                </div>
                <input
                  id="txtFind"
                  name="txtFind"
                  type="text"
                  autoFocus
                  value={txtFind}
                  onChange={(event) => setTxtFind(event.target.value)}
                  placeholder="ID or branch"
                  className="h-[30px] w-[250px] rounded-[4px] border border-[#cfd7df] bg-white px-2 text-[12px] text-[#24364d] outline-none focus:border-[#91a7b9]"
                />
              </div>
            )}

            {/* Grid */}
            <div className="mt-3 h-[355px] overflow-auto border border-[#BFE8D0] bg-white">
              <table className="w-full table-fixed border-collapse text-[12px] text-[#24364d]">
                <colgroup>
                  <col className="w-[22px]" />
                  <col className="w-[70px]" />
                  <col />
                  <col className="w-[110px]" />
                </colgroup>
                <thead className="sticky top-0 z-10">
                  <tr className="bg-[#EDF9F2] text-[#405066]">
                    <th className="h-[28px] border border-[#BFE8D0]" />
                    <th className="h-[28px] border border-[#BFE8D0] px-2 text-left font-normal">
                      ID
                    </th>
                    <th className="h-[28px] border border-[#BFE8D0] px-2 text-left font-normal">
                      Branch
                    </th>
                    <th className="h-[28px] border border-[#BFE8D0] px-2 text-right font-normal">
                      Position No.
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map(({ row, index }) => {
                    const selected = row.key === selectedKey;
                    const changed = isChanged(row) && row.chkSaved;
                    const showDelete =
                      selected && (row.chkSaved || !isEmptyRow(row));

                    return (
                      <tr
                        key={row.key}
                        onClick={() => setSelectedKey(row.key)}
                        className={selected ? "bg-[#f2faf5]" : "bg-white"}
                      >
                        <td className="h-[26px] border border-[#BFE8D0] bg-[#fafbfc] text-center text-[8px] text-[#405066]">
                          {selected ? "▶" : ""}
                        </td>
                        <td
                          className={`border border-[#BFE8D0] p-0 ${
                            changed ? "bg-[#fff6d6]" : selected ? "bg-[#F2FAF5]" : ""
                          }`}
                        >
                          <input
                            id={`txtBrID-${index}`}
                            name="txtBrID"
                            aria-label="ID"
                            maxLength={MAX_ID_LENGTH}
                            readOnly={row.chkSaved}
                            value={row.txtBrID}
                            onFocus={() => setSelectedKey(row.key)}
                            onChange={(event) =>
                              updateCell(row.key, "txtBrID", event.target.value)
                            }
                            onKeyDown={(event) =>
                              handleCellKeyDown(event, index, "txtBrID")
                            }
                            className={`${cellInputClass} ${row.chkSaved ? "cursor-default" : ""}`}
                          />
                        </td>
                        <td
                          className={`border border-[#BFE8D0] p-0 ${changed ? "bg-[#fff6d6]" : ""}`}
                        >
                          <input
                            id={`txtBrName-${index}`}
                            name="txtBrName"
                            aria-label="Branch"
                            maxLength={MAX_NAME_LENGTH}
                            value={row.txtBrName}
                            onFocus={() => setSelectedKey(row.key)}
                            onChange={(event) =>
                              updateCell(
                                row.key,
                                "txtBrName",
                                event.target.value,
                              )
                            }
                            onKeyDown={(event) =>
                              handleCellKeyDown(event, index, "txtBrName")
                            }
                            className={cellInputClass}
                          />
                        </td>
                        <td
                          className={`border border-[#BFE8D0] p-0 ${changed ? "bg-[#fff6d6]" : ""}`}
                        >
                          <div className="flex h-[26px] items-center">
                            <input
                              id={`txtPositionNo-${index}`}
                              name="txtPositionNo"
                              aria-label="Position No."
                              inputMode="numeric"
                              value={row.txtPositionNo}
                              onFocus={() => setSelectedKey(row.key)}
                              onChange={(event) =>
                                updateCell(
                                  row.key,
                                  "txtPositionNo",
                                  event.target.value.replace(/\D/g, "").slice(0, 5),
                                )
                              }
                              onKeyDown={(event) =>
                                handleCellKeyDown(event, index, "txtPositionNo")
                              }
                              className="h-[26px] min-w-0 flex-1 bg-transparent px-2 text-right text-[12px] text-[#24364d] outline-none focus:bg-white"
                            />
                            {/* the slot is always there so the numbers do not move when the x shows */}
                            <span className="flex w-6 shrink-0 items-center justify-center">
                              {showDelete && (
                                <button
                                  id={`btnDeleteRow-${index}`}
                                  name="btnDeleteRow"
                                  type="button"
                                  tabIndex={-1}
                                  title="Delete row"
                                  onClick={() => handleDeleteRow(row)}
                                  disabled={saving}
                                  aria-label={`Delete branch ${row.txtBrID || "row"}`}
                                  className="text-[12px] leading-none text-gray-400 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30"
                                >
                                  ✕
                                </button>
                              )}
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Actions: one Save does it all (new rows, changes, deleted rows) */}
            <div className="mt-5 flex justify-center gap-3">
              <button
                id="btnSave"
                name="btnSave"
                type="button"
                onClick={handleSave}
                disabled={saving}
                title="Alt+S"
                className="btn-style disabled:cursor-not-allowed disabled:opacity-60"
              >
                <u>S</u>ave
              </button>
              <button
                id="btnFind"
                name="btnFind"
                type="button"
                onClick={handleFind}
                title="Alt+F"
                className="btn-style"
              >
                <u>F</u>ind
              </button>
              <button
                id="btnClear"
                name="btnClear"
                type="button"
                onClick={handleClear}
                disabled={saving}
                title="Alt+C"
                className="btn-style disabled:cursor-not-allowed disabled:opacity-60"
              >
                <u>C</u>lear
              </button>
            </div>
          </section>
        </main>
      </div>

      {confirmDialog}
    </div>
  );
};

export default BranchPage;
