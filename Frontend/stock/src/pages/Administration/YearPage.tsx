import React, { useEffect, useRef, useState } from "react";
import Select from "react-select";
import { X } from "lucide-react";
import {
  branchMenuStyles,
  filterLabelOrValue,
  makeNameIdMenuComponents,
} from "../../components/BranchSelect/branchSelectParts";
import { useCtrlShortcuts } from "../../hooks/useCtrlShortcuts";
import { useAdvanceAfterSelect } from "../../hooks/useAdvanceAfterSelect";
import { useConfirmModal } from "../../hooks/useConfirmModal";
import { deleteSuccessMessage } from "../../hooks/useDeleteToast";
import { useMessageModal } from "../../hooks/useMessageModal";
import TransactionActions from "../../components/common/TransactionActions";
import { useGridCellFocus } from "../../hooks/useGridCellFocus";
import { tryGetServerDate } from "../../utils/serverDate";
import Header from "../../components/common/Header";

// ============================================================
// YEAR (Administration > Year, the old frmYear)
// ============================================================

const api = import.meta.env.VITE_API_URL;

const MIN_ROWS = 16;

type Option = { value: string; label: string };

type YearRow = {
  key: number;
  lkpBranch: string;
  txtYear: string;
  // the row came from the server (an open year)
  chkSaved: boolean;
  // what the server has (to find the changed rows)
  original: { lkpBranch: string; txtYear: string } | null;
};

/* react-select styled to sit inside a grid cell (no border, fills the cell) */
const cellSelectProps = {
  isSearchable: true,
  isClearable: false,
  placeholder: "",
  menuPosition: "fixed" as const,
  menuPortalTarget: typeof document !== "undefined" ? document.body : undefined,
  classNames: {
    control: ({ isFocused }: { isFocused: boolean }) => `
      !min-h-[34px] !h-[34px] !rounded-none !border-0 !shadow-none !text-[13px]
      !bg-transparent
      ${isFocused ? "!bg-white !ring-1 !ring-inset !ring-[#91a7b9]" : ""}
    `,
    valueContainer: () => "!h-[34px] !py-0 !pl-[2px] !pr-[8px] !overflow-hidden",
    singleValue: () => "!m-0 !text-[13px] !text-[#24364d]",
    placeholder: () => "!m-0 !text-[13px] !text-[#7a8794]",
    input: () => "!m-0 !p-0 !text-[13px] !text-[#24364d]",
    indicatorsContainer: () => "!h-[34px]",
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
      !cursor-pointer !px-[6px] !py-[5px] !text-[14px] !text-[#24364d]
      ${isSelected ? "!bg-[#F2FAF5]" : isFocused ? "!bg-[#f2faf5]" : "!bg-white"}
    `,
  },
};

// the Year column of the grid (px)
const YEAR_COLUMN_WIDTH = 110;

// the Branch list with the divider: "Branch | ID". The divider sits at the
// Branch cell's right edge and the ID column is exactly over the Year column
// (its 8px side padding is part of the 110px).
const branchComponents = makeNameIdMenuComponents(
  "Branch",
  true,
  YEAR_COLUMN_WIDTH - 8
);

// the menu = the Branch cell + the Year column
const yearMenuStyles: typeof branchMenuStyles = {
  ...branchMenuStyles,
  menu: (base) => ({
    ...base,
    width: `calc(100% + ${YEAR_COLUMN_WIDTH}px)`,
    zIndex: 99999,
    fontSize: "13px",
  }),
};

let keyCounter = 0;
const nextKey = () => ++keyCounter;

const emptyRow = (): YearRow => ({
  key: nextKey(),
  lkpBranch: "",
  txtYear: "",
  chkSaved: false,
  original: null,
});

const isEmptyRow = (row: YearRow) => !row.lkpBranch && !row.txtYear;

/** keeps one empty "new" row at the end and at least MIN_ROWS rows in total */
const padRows = (rows: YearRow[]): YearRow[] => {
  const result = [...rows];
  if (result.length === 0 || !isEmptyRow(result[result.length - 1])) {
    result.push(emptyRow());
  }
  while (result.length < MIN_ROWS) result.push(emptyRow());
  return result;
};

// a new row with something typed, or a saved row whose branch / year changed
const isChanged = (row: YearRow) =>
  row.chkSaved
    ? row.original !== null &&
      (row.lkpBranch !== row.original.lkpBranch ||
        row.txtYear.trim() !== row.original.txtYear)
    : !isEmptyRow(row);

const focusField = (field?: string) => {
  if (!field) return;

  const element =
    document.getElementById(field) ??
    document.querySelector<HTMLElement>(`[name="${field}"]`);

  element?.focus();
};

const YearPage: React.FC = () => {
  const [branchOptions, setBranchOptions] = useState<Option[]>([]);
  const [rows, setRows] = useState<YearRow[]>(() => padRows([]));
  // the open years the server has now (to find what really changed)
  const [savedKeys, setSavedKeys] = useState<string[]>([]);
  const [selectedKey, setSelectedKey] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  // the common themed question window and the standard delete messages
  const { confirm, dialog } = useConfirmModal();
  // the messages (warnings, errors, saved ...) are the common message window, as on the Payment screen - not a toast
  const { notify, dialog: messageDialog } = useMessageModal("Year");
  // the cell the cursor is in is outlined (a typed-in box has its text selected)
  const { cellFocusClass, selectOnFocus } = useGridCellFocus();
  const { advanceAfterPick, advanceOnEnter } = useAdvanceAfterSelect();

  // bumped after a Save so the years are loaded again
  const [reloadKey, setReloadKey] = useState(0);

  // only the answer of the latest request may fill the grid
  const loadRequest = useRef(0);

  // the row the cursor goes to after a load (set by the load, done once the rows
  // are drawn)
  const focusRowRef = useRef<number | null>(null);

  useEffect(() => {
    if (focusRowRef.current === null) return;

    const rowIndex = focusRowRef.current;
    focusRowRef.current = null;
    document.getElementById(`lkpBranch-${rowIndex}`)?.focus();
  }, [rows]);

  const branchName = (lkpBranch: string) =>
    branchOptions.find((option) => option.value === lkpBranch)?.label ??
    lkpBranch;

  // ----------------------------------------------------------
  // LOAD: the company's branches and the open years
  // ----------------------------------------------------------

  useEffect(() => {
    const requestNo = ++loadRequest.current;

    const loadYears = async () => {
      try {
        const PstrCoID = localStorage.getItem("PstrCoID");

        if (!PstrCoID) {
          notify.error("getYear: no PstrCoID in localStorage");
          return;
        }

        const response = await fetch(
          `${api}/AdministrationYear/getYear?PstrCoID=${PstrCoID}`,
          { credentials: "include" },
        );

        const result = await response.json();

        if (requestNo !== loadRequest.current) return;

        if (!response.ok || !result.success) {
          notify.error(result.message || "Failed to load the Years");
          return;
        }

        setBranchOptions(
          (result.branches || []).map(
            (row: { lkpBranch: string; txtBranchName: string }) => ({
              value: row.lkpBranch,
              label: row.txtBranchName,
            }),
          ),
        );

        const loaded: YearRow[] = (result.data || []).map(
          (row: { lkpBranch: string; txtYear: number | string }) => {
            const txtYear = String(row.txtYear);

            return {
              key: nextKey(),
              lkpBranch: row.lkpBranch,
              txtYear,
              chkSaved: true,
              original: { lkpBranch: row.lkpBranch, txtYear },
            };
          },
        );

        const padded = padRows(loaded);

        setRows(padded);
        setSavedKeys(
          loaded.map((row) => `${row.lkpBranch}|${Number(row.txtYear)}`),
        );

        // the cursor goes to the first empty row (after the last saved one), ready for
        // a new entry
        const firstEmptyRow = loaded.length;

        setSelectedKey(padded[firstEmptyRow]?.key ?? padded[0]?.key ?? null);

        // (done by the effect below, once the rows are on the screen)
        focusRowRef.current = firstEmptyRow;
      } catch (error: unknown) {
        if (requestNo !== loadRequest.current) return;

        console.error("getYear error:", error);
        notify.error("Failed to load the Years");
      }
    };

    loadYears();
  }, [reloadKey]);

  // ----------------------------------------------------------
  // EDIT
  // ----------------------------------------------------------

  const updateCell = (
    key: number,
    field: "lkpBranch" | "txtYear",
    value: string,
  ) => {
    setRows((previous) =>
      padRows(
        previous.map((row) => (row.key === key ? { ...row, [field]: value } : row)),
      ),
    );
  };

  // Enter in the Year goes on to the Branch of the next row
  const handleYearKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>,
    index: number,
  ) => {
    if (event.key !== "Enter") return;

    event.preventDefault();
    document.getElementById(`lkpBranch-${index + 1}`)?.focus();
  };

  // ----------------------------------------------------------
  // SAVE / MODIFY (the old cmdSave_Click): the server checks everything again,
  // and that the user is the administrator
  // ----------------------------------------------------------

  const handleSave = async () => {
    if (saving) return;

    const filled = rows.filter((row) => !isEmptyRow(row));

    // the old ValidateGrid: the grid cannot be saved empty
    if (filled.length === 0) {
      notify.info("There Is No Item For Saving");
      return;
    }

    for (const row of filled) {
      const index = rows.indexOf(row);

      if (!row.lkpBranch) {
        notify.info("Please select 'Branch'");
        focusField(`lkpBranch-${index}`);
        return;
      }

      if (!row.txtYear.trim()) {
        notify.info("Please enter 'Year'");
        focusField(`txtYear-${index}`);
        return;
      }

      if (!/^\d{4}$/.test(row.txtYear.trim())) {
        notify.info("The 'Year' must have 4 digits");
        focusField(`txtYear-${index}`);
        return;
      }
    }

    const seen = new Set<string>();

    for (const row of filled) {
      const index = rows.indexOf(row);
      const key = `${row.lkpBranch}|${Number(row.txtYear)}`;

      if (seen.has(key)) {
        notify.info(
          `The Year ${Number(row.txtYear)} is already entered for the Branch ${branchName(row.lkpBranch)}`,
        );
        focusField(`txtYear-${index}`);
        return;
      }

      seen.add(key);
    }

    // nothing is different from what the server has
    const current = new Set(savedKeys);

    if (
      seen.size === current.size &&
      [...seen].every((key) => current.has(key))
    ) {
      notify.info("There is no data to save");
      return;
    }

    setSaving(true);

    try {
      // the time of the save: the database server's clock (the common /datetime/server-date), written on every row
      const dtpServerDate = await tryGetServerDate();

      const response = await fetch(`${api}/AdministrationYear/saveYear`, {
        method: "POST",
        credentials: "include", // the server checks the session and the user type
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          PstrCoID: localStorage.getItem("PstrCoID"),
          PstrYear: localStorage.getItem("PstrYear"),
          dtpServerDate,
          rows: filled.map((row) => ({
            lkpBranch: row.lkpBranch,
            txtYear: row.txtYear.trim(),
          })),
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        notify.error(result.message || "Not Saved,try again");
        focusField(result.field);
        return;
      }

      notify.success(result.message);

      setReloadKey((previous) => previous + 1);
    } catch (error: unknown) {
      console.error("saveYear error:", error);
      notify.error("Not Saved,try again");
    } finally {
      setSaving(false);
    }
  };

  // ----------------------------------------------------------
  // DELETE (the X of a row). A row only typed on the page just goes. A saved row
  // asks "Do you want to delete?" and, on Delete, is deleted in the database at
  // once; the other rows keep what has been typed in them.
  // ----------------------------------------------------------

  const handleDeleteRow = async (row: YearRow) => {
    if (saving) return;

    if (!row.chkSaved) {
      setRows((previous) =>
        padRows(previous.filter((item) => item.key !== row.key)),
      );
      return;
    }

    // the year as it was loaded (it may have been edited since)
    const originalBranch = row.original?.lkpBranch ?? row.lkpBranch;
    const originalYear = row.original?.txtYear ?? row.txtYear;

    const shouldDelete = await confirm({
      title: "Year",
      message: "Do you want to Delete?",
      confirmLabel: "Delete",
      cancelLabel: "Cancel",
    });

    if (!shouldDelete) return;

    setSaving(true);

    try {
      const response = await fetch(`${api}/AdministrationYear/deleteYear`, {
        method: "POST",
        credentials: "include", // the server checks the session and the user type
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          PstrCoID: localStorage.getItem("PstrCoID"),
          PstrYear: localStorage.getItem("PstrYear"),
          lkpBranch: originalBranch,
          txtYear: originalYear,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        notify.error(result.message || "Not deleted, try again");
        focusField(result.field);
        return;
      }

      // the common message of a delete (hooks/useDeleteToast.ts, the same on every screen)
      notify.success(deleteSuccessMessage("Year"));

      // the server no longer has this year
      setSavedKeys((previous) =>
        previous.filter((key) => key !== `${originalBranch}|${Number(originalYear)}`),
      );

      setRows((previous) =>
        padRows(previous.filter((item) => item.key !== row.key)),
      );
    } catch (error: unknown) {
      console.error("deleteYear error:", error);
      notify.error("Not deleted, try again");
    } finally {
      setSaving(false);
    }
  };

  // Clear: back to what is saved - the typed rows and the changes are dropped,
  // and the open years are loaded again
  const handleClear = () => {
    if (saving) return;

    setReloadKey((previous) => previous + 1);
  };

  // The key of the Payment screen: Ctrl+S Save
  useCtrlShortcuts({ s: handleSave });

  return (
    <div className="flex min-h-full w-full items-start justify-center bg-white px-4 py-4">
      <div className="min-h-fit w-150 max-w-full bg-white p-0">
        <main className="w-full overflow-hidden border border-[#d5dce2] bg-white">
          <Header Name="Year" />

          <section className="px-3.5 pb-6 pt-3">
            {/* Grid */}
            <div className="h-[470px] overflow-auto border border-[#BFE8D0] bg-white">
              <table className="w-full table-fixed border-collapse text-[12px] text-[#24364d]">
                <colgroup>
                  <col className="w-[22px]" />
                  <col />
                  <col className="w-[110px]" />
                </colgroup>
                <thead className="sticky top-0 z-10">
                  <tr className="bg-[#EDF9F2] text-[14px] text-gray-600">
                    <th className="h-[34px] border border-[#BFE8D0]" />
                    <th className="h-[34px] border border-[#BFE8D0] pl-[2px] pr-2 text-left font-normal">
                      Branch
                    </th>
                    <th className="h-[34px] border border-[#BFE8D0] px-2 text-right font-normal">
                      Year
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => {
                    const selected = row.key === selectedKey;
                    const changed = isChanged(row) && row.chkSaved;
                    const showDelete =
                      selected && (row.chkSaved || !isEmptyRow(row));
                    const value =
                      branchOptions.find((option) => option.value === row.lkpBranch) ??
                      (row.lkpBranch
                        ? { value: row.lkpBranch, label: row.lkpBranch }
                        : null);

                    return (
                      <tr
                        key={row.key}
                        onClick={() => setSelectedKey(row.key)}
                        className={selected ? "bg-[#f2faf5]" : "bg-white"}
                      >
                        <td className="h-[34px] border border-[#BFE8D0] bg-[#fafbfc] text-center text-[10px] text-[#405066]">
                          {selected ? "▶" : ""}
                        </td>
                        <td
                          className={`border border-[#BFE8D0] p-0 ${cellFocusClass} ${
                            changed ? "bg-[#fff6d6]" : selected ? "bg-[#F2FAF5]" : ""
                          }`}
                          onKeyDown={(event) => advanceOnEnter(event)}
                        >
                          <Select<Option, false>
                            inputId={`lkpBranch-${index}`}
                            instanceId={`lkpBranch-${index}`}
                            name="lkpBranch"
                            aria-label="Branch"
                            options={branchOptions}
                            value={value}
                            onFocus={() => setSelectedKey(row.key)}
                            onChange={(option) => {
                              updateCell(row.key, "lkpBranch", option?.value ?? "");
                              if (option) advanceAfterPick(`lkpBranch-${index}`);
                            }}
                            {...cellSelectProps}
                            components={branchComponents}
                            styles={yearMenuStyles}
                            filterOption={filterLabelOrValue}
                            noOptionsMessage={() => "No Branch Found"}
                          />
                        </td>
                        <td
                          className={`border border-[#BFE8D0] p-0 ${cellFocusClass} ${changed ? "bg-[#fff6d6]" : ""}`}
                        >
                          <div className="flex h-[34px] items-center">
                            <input
                              id={`txtYear-${index}`}
                              name="txtYear"
                              aria-label="Year"
                              inputMode="numeric"
                              maxLength={4}
                              value={row.txtYear}
                              onFocus={(event) => {
                              selectOnFocus(event);
                              setSelectedKey(row.key);
                            }}
                              onChange={(event) =>
                                updateCell(
                                  row.key,
                                  "txtYear",
                                  event.target.value.replace(/\D/g, "").slice(0, 4),
                                )
                              }
                              onKeyDown={(event) => handleYearKeyDown(event, index)}
                              className="h-[34px] min-w-0 flex-1 bg-transparent px-2 text-right text-[13px] text-[#24364d] outline-none focus:bg-white"
                            />
                            {/* the slot is always there so the years do not move when the x shows */}
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
                                  aria-label={`Delete year ${row.txtYear || "row"}`}
                                  className="inline-flex items-center justify-center text-slate-400 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-30"
                                >
                                  <X size={12} />
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
            <TransactionActions
              className="mt-5 flex justify-center gap-3"
              actions={[
                { id: "btnSave", label: "Save", underlineIndex: 0, onClick: handleSave, disabled: saving },
                { id: "btnClear", label: "Clear", onClick: handleClear, disabled: saving },
              ]}
            />
          </section>
        </main>
      </div>

      {dialog}
      {messageDialog}
    </div>
  );
};

export default YearPage;
