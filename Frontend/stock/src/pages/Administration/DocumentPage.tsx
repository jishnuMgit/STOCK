import React, { useEffect, useRef, useState } from "react";
import Select from "react-select";
import { toast } from "react-toastify";
import {
  branchMenuStyles,
  filterLabelOrValue,
  makeNameIdMenuComponents,
} from "../../components/BranchSelect/branchSelectParts";
import { useAltShortcuts } from "../../hooks/useAltShortcuts";
import { useConfirmModal } from "../../hooks/useConfirmModal";
import { useDeleteToast } from "../../hooks/useDeleteToast";
import { useGridCellFocus } from "../../hooks/useGridCellFocus";

// ============================================================
// DOCUMENT (Administration > Document, the old frmDocument)

// ============================================================

const api = import.meta.env.VITE_API_URL;

const MIN_ROWS = 14;
const MAX_TYPE_LENGTH = 5;
const MAX_NAME_LENGTH = 40;

type Option = { value: string; label: string };

type DocRow = {
  key: number;
  txtDocType: string;
  txtDocName: string;
  chkToBePost: boolean;
  txtPositionNo: string;
  // the row came from the server: a change of it is an update
  chkSaved: boolean;
  // what the server has (to find the changed rows, and the row itself)
  original: {
    txtDocType: string;
    txtDocName: string;
    chkToBePost: boolean;
    txtPositionNo: string;
  } | null;
};


type Field = "txtDocType" | "txtDocName" | "chkToBePost" | "txtPositionNo";

/* react-select selects: the Module list is "Module | ID" with the divider */
const selectClassNames = {
  control: ({
    isFocused,
    isDisabled,
  }: {
    isFocused: boolean;
    isDisabled: boolean;
  }) => `
    !min-h-[25px] !h-[30px] !rounded-[4px] !border !shadow-none !text-[13px]
    hover:!border-[#aab8c5]
    ${isDisabled ? "!bg-[#f6f8fa]" : "!bg-white"}
    ${isFocused ? "!border-[#91a7b9]" : "!border-[#cfd7df]"}
  `,
  valueContainer: () => "!h-[23px] !py-0 !px-[5px] !overflow-hidden",
  singleValue: () => "!m-0 !text-[13px] !text-[#24364d]",
  placeholder: () => "!m-0 !text-[13px] !text-[#7a8794]",
  input: () => "!m-0 !p-0 !text-[13px] !text-[#24364d]",
  indicatorsContainer: () => "!h-[23px]",
  dropdownIndicator: () => "!p-[3px] !text-[#657486]",
  indicatorSeparator: () => "!hidden",
  menu: () =>
    "!mt-[1px] !rounded-none !border !border-[#cfd7df] !z-[999999] !shadow-md",
  menuList: () => "!p-0 !max-h-[180px]",
  option: ({
    isFocused,
    isSelected,
  }: {
    isFocused: boolean;
    isSelected: boolean;
  }) => `
    !cursor-pointer !px-[6px] !py-[5px] !text-[13px] !text-[#24364d]
    ${isSelected ? "!bg-[#F2FAF5]" : isFocused ? "!bg-[#f2faf5]" : "!bg-white"}
  `,
};

const moduleComponents = makeNameIdMenuComponents("Module", true);

const FieldLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex h-7.5 w-27.5 items-center justify-end border border-[#BFE8D0] bg-[#fafbfc] pr-3 text-[14px] text-[#405066]">
    {children}
  </div>
);

const cellInputClass =
  "h-[26px] w-full bg-transparent px-2 text-[12px] text-[#24364d] outline-none focus:bg-white ";

let keyCounter = 0;
const nextKey = () => ++keyCounter;

const emptyRow = (): DocRow => ({
  key: nextKey(),
  txtDocType: "",
  txtDocName: "",
  chkToBePost: false,
  txtPositionNo: "",
  chkSaved: false,
  original: null,
});

const isEmptyRow = (row: DocRow) =>
  !row.txtDocType && !row.txtDocName && !row.txtPositionNo && !row.chkToBePost;

/** keeps one empty row at the end and at least MIN_ROWS rows in total */
const padRows = (rows: DocRow[]): DocRow[] => {
  const result = [...rows];
  if (result.length === 0 || !isEmptyRow(result[result.length - 1])) {
    result.push(emptyRow());
  }
  while (result.length < MIN_ROWS) result.push(emptyRow());
  return result;
};

// a new row with something typed, or a saved row whose ID, name, To Be Post or
// position changed
const isChanged = (row: DocRow) =>
  row.chkSaved
    ? row.original !== null &&
      (row.txtDocType.trim() !== row.original.txtDocType ||
        row.txtDocName.trim() !== row.original.txtDocName ||
        row.chkToBePost !== row.original.chkToBePost ||
        row.txtPositionNo.trim() !== row.original.txtPositionNo)
    : !isEmptyRow(row);

const focusField = (field?: string) => {
  if (!field) return;

  const element =
    document.getElementById(field) ??
    document.querySelector<HTMLElement>(`[name="${field}"]`);

  element?.focus();
};

const DocumentPage: React.FC = () => {
  const [moduleOptions, setModuleOptions] = useState<Option[]>([]);
  const [lkpModule, setLkpModule] = useState("");
  const [rows, setRows] = useState<DocRow[]>(() => padRows([]));
  const [selectedKey, setSelectedKey] = useState<number | null>(null);
  const [chkFindOpen, setChkFindOpen] = useState(false);
  const [txtFind, setTxtFind] = useState("");
  const [saving, setSaving] = useState(false);
  // the common themed question window and the standard delete messages
  const { confirm, dialog } = useConfirmModal();
  const { deleted, notDeleted } = useDeleteToast("Document");
  // the cell the cursor is in is outlined (a typed-in box has its text selected)
  const { cellFocusClass, selectOnFocus } = useGridCellFocus();

  // bumped by Clear and after a Save so the documents are loaded again
  const [reloadKey, setReloadKey] = useState(0);

  // only the answer of the latest request may fill the grid; what was loaded last
  // (so choosing the module the server already picked does not ask twice)
  const loadRequest = useRef(0);

  // the row the cursor goes to after a load (set by the load, done once the rows
  // are drawn)
  const focusRowRef = useRef<number | null>(null);

  useEffect(() => {
    if (focusRowRef.current === null) return;

    const rowIndex = focusRowRef.current;
    focusRowRef.current = null;
    document.getElementById(`txtDocType-${rowIndex}`)?.focus();
  }, [rows]);
  const lastLoaded = useRef<{ module: string; key: number } | null>(null);

  // ----------------------------------------------------------
  // LOAD: the modules and the documents of the module. With no module chosen yet
  // the server picks the first one (as the old form did) and we take it.
  // ----------------------------------------------------------

  useEffect(() => {
    if (
      lkpModule &&
      lastLoaded.current?.module === lkpModule &&
      lastLoaded.current.key === reloadKey
    ) {
      return;
    }

    const requestNo = ++loadRequest.current;

    const loadDocuments = async () => {
      try {
        const PstrCoID = localStorage.getItem("PstrCoID");

        if (!PstrCoID) {
          toast.error("getDocument: no PstrCoID in localStorage");
          return;
        }

        const params = new URLSearchParams({ PstrCoID });

        if (lkpModule) params.set("lkpModule", lkpModule);

        const response = await fetch(
          `${api}/AdministrationDocument/getDocument?${params.toString()}`,
          { credentials: "include" },
        );

        const result = await response.json();

        if (requestNo !== loadRequest.current) return;

        if (!response.ok || !result.success) {
          toast.error(result.message || "Failed to load the Documents");
          return;
        }

        setModuleOptions(
          (result.modules || []).map(
            (row: { lkpModule: string; txtModuleName: string }) => ({
              value: row.lkpModule,
              label: row.txtModuleName,
            }),
          ),
        );

        const loaded: DocRow[] = (result.data || []).map(
          (row: {
            txtDocType: string;
            txtDocName: string | null;
            chkToBePost: boolean | null;
            txtPositionNo: number | string | null;
          }) => {
            const txtDocName = row.txtDocName ?? "";
            const chkToBePost = row.chkToBePost === true;
            const txtPositionNo =
              row.txtPositionNo === null || row.txtPositionNo === undefined
                ? ""
                : String(row.txtPositionNo);

            return {
              key: nextKey(),
              txtDocType: row.txtDocType,
              txtDocName,
              chkToBePost,
              txtPositionNo,
              chkSaved: true,
              original: {
                txtDocType: row.txtDocType,
                txtDocName,
                chkToBePost,
                txtPositionNo,
              },
            };
          },
        );

        const padded = padRows(loaded);

        lastLoaded.current = { module: result.lkpModule, key: reloadKey };

        setRows(padded);

        // the cursor goes to the first empty row (after the last saved one), ready for
        // a new entry
        const firstEmptyRow = loaded.length;

        setSelectedKey(padded[firstEmptyRow]?.key ?? padded[0]?.key ?? null);

        // (done by the effect below, once the rows are on the screen)
        focusRowRef.current = firstEmptyRow;

        // the server picked the first module
        if (result.lkpModule && result.lkpModule !== lkpModule) {
          setLkpModule(result.lkpModule);
        }
      } catch (error: unknown) {
        if (requestNo !== loadRequest.current) return;

        console.error("getDocument error:", error);
        toast.error("Failed to load the Documents");
      }
    };

    loadDocuments();
  }, [lkpModule, reloadKey]);

  // ----------------------------------------------------------
  // EDIT
  // ----------------------------------------------------------

  const updateCell = <K extends Field>(
    key: number,
    field: K,
    value: DocRow[K],
  ) => {
    setRows((previous) =>
      padRows(
        previous.map((row) => (row.key === key ? { ...row, [field]: value } : row)),
      ),
    );
  };

  // Enter goes on to the next cell of the row, then to the ID of the next row
  const handleCellKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>,
    index: number,
    field: Field,
  ) => {
    if (event.key !== "Enter") return;

    event.preventDefault();

    const order: Field[] = [
      "txtDocType",
      "txtDocName",
      "chkToBePost",
      "txtPositionNo",
    ];
    let nextIndex = index;
    let nextField = order[order.indexOf(field) + 1];

    if (!nextField) {
      nextIndex = index + 1;
      nextField = "txtDocType";
    }

    document.getElementById(`${nextField}-${nextIndex}`)?.focus();
  };

  const changedRows = rows.filter(isChanged);

  // something to send: a new row or a changed row (the button itself is always
  // on, as in the old form; with nothing to send it says so)
  const hasChanges = changedRows.length > 0;

  const moduleValue =
    moduleOptions.find((option) => option.value === lkpModule) ?? null;

  // ----------------------------------------------------------
  // SAVE / MODIFY (the old cmdSave_Click): the server checks everything again,
  // and that the user is the administrator.
  // ----------------------------------------------------------

  const handleSave = async () => {
    if (saving) return;

    // the old ValidateMe
    if (!lkpModule) {
      toast.info("Please select 'Module'");
      focusField("lkpModule");
      return;
    }

    const filled = rows.filter((row) => !isEmptyRow(row));

    for (const row of filled) {
      const index = rows.indexOf(row);

      if (!row.txtDocType.trim()) {
        toast.info("Please enter the 'Document Type'");
        focusField(`txtDocType-${index}`);
        return;
      }

      if (!row.txtDocName.trim()) {
        toast.info(
          `Please enter the 'Document' name of '${row.txtDocType.trim()}'`,
        );
        focusField(`txtDocName-${index}`);
        return;
      }
    }

    const seenTypes = new Set<string>();
    const seenNames = new Set<string>();

    for (const row of filled) {
      const index = rows.indexOf(row);
      const typeKey = row.txtDocType.trim().toLowerCase();
      const nameKey = row.txtDocName.trim().toLowerCase();

      if (seenTypes.has(typeKey)) {
        toast.info("'Document Type' already exists");
        focusField(`txtDocType-${index}`);
        return;
      }

      if (seenNames.has(nameKey)) {
        toast.info("'Document Name' already exists");
        focusField(`txtDocName-${index}`);
        return;
      }

      seenTypes.add(typeKey);
      seenNames.add(nameKey);
    }

    if (!hasChanges) {
      toast.info("There is no data to save");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(`${api}/AdministrationDocument/saveDocument`, {
        method: "POST",
        credentials: "include", // the server checks the session and the user type
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          PstrCoID: localStorage.getItem("PstrCoID"),
          PstrYear: localStorage.getItem("PstrYear"),
          lkpModule,
          rows: changedRows.map((row) => ({
            txtDocType: row.txtDocType.trim(),
            // the ID the saved row had when it was loaded (it may be changed now)
            txtOriginalDocType: row.original?.txtDocType ?? null,
            txtDocName: row.txtDocName.trim(),
            chkToBePost: row.chkToBePost,
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
      console.error("saveDocument error:", error);
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

  const handleDeleteRow = async (row: DocRow) => {
    if (saving) return;

    if (!row.chkSaved) {
      setRows((previous) =>
        padRows(previous.filter((item) => item.key !== row.key)),
      );
      return;
    }

    // the document as it was loaded (its ID may have been edited since)
    const originalType = row.original?.txtDocType ?? row.txtDocType;

    const shouldDelete = await confirm({
      title: "Document",
      message: "Do you want to delete ?",
    });

    if (!shouldDelete) return;

    setSaving(true);

    try {
      // the same endpoint as Save, with nothing but this document to delete
      const response = await fetch(`${api}/AdministrationDocument/saveDocument`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          PstrCoID: localStorage.getItem("PstrCoID"),
          PstrYear: localStorage.getItem("PstrYear"),
          lkpModule,
          rows: [],
          deletedRows: [{ txtDocType: originalType }],
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        notDeleted(result.message);
        return;
      }

      deleted();

      setRows((previous) =>
        padRows(previous.filter((item) => item.key !== row.key)),
      );
    } catch (error: unknown) {
      console.error("deleteDocument error:", error);
      notDeleted();
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
  // and the module's documents are loaded again
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
        row.txtDocType.toLowerCase().includes(search) ||
        row.txtDocName.toLowerCase().includes(search),
    );

  return (
    <div className="flex min-h-full w-full items-start justify-center bg-white px-4 py-4">
      <div className="min-h-fit w-150 max-w-full bg-white p-0">
        <main className="w-full overflow-hidden border border-gray-400 bg-white">
          <header className="flex h-7.5 items-center justify-start bg-[#9fdfbc]">
            <h1 className="m-0 ml-3.5 text-[17px] font-semibold text-[#24364d]">
              Document
            </h1>
          </header>

          <section className="px-3.5 pb-6 pt-3">
            {/* Module */}
            <div className="flex items-center gap-3">
              <FieldLabel>Module :</FieldLabel>
              <div className="w-50">
                <Select<Option, false>
                  inputId="lkpModule"
                  instanceId="lkpModule"
                  name="lkpModule"
                  options={moduleOptions}
                  value={moduleValue}
                  onChange={(option) => {
                    setChkFindOpen(false);
                    setTxtFind("");
                    setLkpModule(option?.value ?? "");
                  }}
                  isSearchable
                  isClearable={false}
                  placeholder=""
                  classNames={selectClassNames}
                  components={moduleComponents}
                  styles={branchMenuStyles}
                  filterOption={filterLabelOrValue}
                  noOptionsMessage={() => "No Module Found"}
                  menuPosition="fixed"
                  menuPortalTarget={document.body}
                />
              </div>
            </div>

            {chkFindOpen && (
              <div className="mt-3 flex items-center gap-3">
                <FieldLabel>Find :</FieldLabel>
                <input
                  id="txtFind"
                  name="txtFind"
                  type="text"
                  autoFocus
                  value={txtFind}
                  onChange={(event) => setTxtFind(event.target.value)}
                  placeholder="ID or document"
                  className="h-7.5 w-62.5 rounded-sm border border-[#cfd7df] bg-white px-2 text-[12px] text-[#24364d] outline-none focus:border-[#91a7b9]"
                />
              </div>
            )}

            {/* Grid */}
            {/* h-[409px] = the 28px header + 14 rows of 27px + 1px (collapsed borders) + the 2px border:
                14 rows show without a scroll bar (MIN_ROWS is 14 too); with more rows the bar appears */}
            <div className="mt-3 h-[409px] overflow-auto border border-[#BFE8D0] bg-white">
              <table className="w-full table-fixed border-collapse text-[12px] text-[#24364d]">
                <colgroup>
                  <col className="w-5.5" />
                  <col className="w-20" />
                  <col />
                  <col className="w-20.5" />
                  <col className="w-27" />
                </colgroup>
                <thead className="sticky top-0 z-10">
                  <tr className="bg-[#EDF9F2] text-[#405066]">
                    <th className="h-7 border border-[#BFE8D0]" />
                    <th className="h-7 border border-[#BFE8D0] px-2 text-left font-normal">
                      ID
                    </th>
                    <th className="h-7 border border-[#BFE8D0] px-2 text-left font-normal">
                      Document
                    </th>
                    <th className="h-7 border border-[#BFE8D0] px-2 text-center font-normal">
                      To Be Post
                    </th>
                    <th className="h-7 border border-[#BFE8D0] px-2 text-right font-normal">
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
                        <td className="h-6.5 border border-[#BFE8D0] bg-[#fafbfc] text-center text-[10px] text-[#405066]">
                          {selected ? "▶" : ""}
                        </td>
                        <td
                          className={`border border-[#BFE8D0] p-0 ${cellFocusClass} ${
                            changed ? "bg-[#fff6d6]" : selected ? "bg-[#F2FAF5]" : ""
                          }`}
                        >
                          <input
                            id={`txtDocType-${index}`}
                            name="txtDocType"
                            aria-label="ID"
                            maxLength={MAX_TYPE_LENGTH}
                            value={row.txtDocType}
                            onFocus={(event) => {
                              selectOnFocus(event);
                              setSelectedKey(row.key);
                            }}
                            onChange={(event) =>
                              updateCell(
                                row.key,
                                "txtDocType",
                                event.target.value.toUpperCase(),
                              )
                            }
                            onKeyDown={(event) =>
                              handleCellKeyDown(event, index, "txtDocType")
                            }
                            className={cellInputClass}
                          />
                        </td>
                        <td
                          className={`border border-[#BFE8D0] p-0 ${cellFocusClass} ${changed ? "bg-[#fff6d6]" : ""}`}
                        >
                          <input
                            id={`txtDocName-${index}`}
                            name="txtDocName"
                            aria-label="Document"
                            maxLength={MAX_NAME_LENGTH}
                            value={row.txtDocName}
                            onFocus={(event) => {
                              selectOnFocus(event);
                              setSelectedKey(row.key);
                            }}
                            onChange={(event) =>
                              updateCell(row.key, "txtDocName", event.target.value)
                            }
                            onKeyDown={(event) =>
                              handleCellKeyDown(event, index, "txtDocName")
                            }
                            className={cellInputClass}
                          />
                        </td>
                        <td
                          className={`border border-[#BFE8D0] ${cellFocusClass} text-center ${changed ? "bg-[#fff6d6]" : ""}`}
                        >
                          <input
                            id={`chkToBePost-${index}`}
                            name="chkToBePost"
                            aria-label="To Be Post"
                            type="checkbox"
                            checked={row.chkToBePost}
                            onFocus={() => setSelectedKey(row.key)}
                            onChange={(event) =>
                              updateCell(row.key, "chkToBePost", event.target.checked)
                            }
                            onKeyDown={(event) =>
                              handleCellKeyDown(event, index, "chkToBePost")
                            }
                            className="h-4 w-4 align-middle accent-[#64d96e]"
                          />
                        </td>
                        <td
                          className={`border border-[#BFE8D0] p-0 ${cellFocusClass} ${changed ? "bg-[#fff6d6]" : ""}`}
                        >
                          <div className="flex h-[26px] items-center">
                            <input
                              id={`txtPositionNo-${index}`}
                              name="txtPositionNo"
                              aria-label="Position No."
                              inputMode="numeric"
                              value={row.txtPositionNo}
                              onFocus={(event) => {
                              selectOnFocus(event);
                              setSelectedKey(row.key);
                            }}
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
                                  aria-label={`Delete document ${row.txtDocType || "row"}`}
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

            {/* Actions: one Save does it all (new rows and changes) */}
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

      {dialog}
    </div>
  );
};

export default DocumentPage;
