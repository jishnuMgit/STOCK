import React, { useEffect, useRef, useState } from "react";
import Select from "react-select";
import { toast } from "react-toastify";
import {
  branchMenuStyles,
  filterLabelOrValue,
  makeNameIdMenuComponents,
} from "../../components/BranchSelect/branchSelectParts";
import { useAltShortcuts } from "../../hooks/useAltShortcuts";
import { useAdvanceAfterSelect } from "../../hooks/useAdvanceAfterSelect";
import { useConfirm, DELETE_CONFIRM_MESSAGE } from "../../hooks/useConfirm";

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
      !min-h-[26px] !h-[26px] !rounded-none !border-0 !shadow-none !text-[12px]
      !bg-transparent
      ${isFocused ? "!bg-white !ring-1 !ring-inset !ring-[#91a7b9]" : ""}
    `,
    valueContainer: () => "!h-[26px] !py-0 !px-[8px] !overflow-hidden",
    singleValue: () => "!m-0 !text-[12px] !text-[#24364d]",
    placeholder: () => "!m-0 !text-[12px] !text-[#7a8794]",
    input: () => "!m-0 !p-0 !text-[12px] !text-[#24364d]",
    indicatorsContainer: () => "!h-[26px]",
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
      !cursor-pointer !px-[6px] !py-[5px] !text-[12px] !text-[#24364d]
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
  const { confirm, confirmDialog } = useConfirm();
  const { advanceAfterPick, advanceOnEnter } = useAdvanceAfterSelect();

  // bumped after a Save so the years are loaded again
  const [reloadKey, setReloadKey] = useState(0);

  // only the answer of the latest request may fill the grid
  const loadRequest = useRef(0);

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
          toast.error("getYear: no PstrCoID in localStorage");
          return;
        }

        const response = await fetch(
          `${api}/AdministrationYear/getYear?PstrCoID=${PstrCoID}`,
          { credentials: "include" },
        );

        const result = await response.json();

        if (requestNo !== loadRequest.current) return;

        if (!response.ok || !result.success) {
          toast.error(result.message || "Failed to load the Years");
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
        setSelectedKey(padded[0]?.key ?? null);
      } catch (error: unknown) {
        if (requestNo !== loadRequest.current) return;

        console.error("getYear error:", error);
        toast.error("Failed to load the Years");
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
      toast.info("There Is No Item For Saving");
      return;
    }

    for (const row of filled) {
      const index = rows.indexOf(row);

      if (!row.lkpBranch) {
        toast.info("Please select 'Branch'");
        focusField(`lkpBranch-${index}`);
        return;
      }

      if (!row.txtYear.trim()) {
        toast.info("Please enter 'Year'");
        focusField(`txtYear-${index}`);
        return;
      }

      if (!/^\d{4}$/.test(row.txtYear.trim())) {
        toast.info("The 'Year' must have 4 digits");
        focusField(`txtYear-${index}`);
        return;
      }
    }

    const seen = new Set<string>();

    for (const row of filled) {
      const index = rows.indexOf(row);
      const key = `${row.lkpBranch}|${Number(row.txtYear)}`;

      if (seen.has(key)) {
        toast.info(
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
      toast.info("There is no data to save");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(`${api}/AdministrationYear/saveYear`, {
        method: "POST",
        credentials: "include", // the server checks the session and the user type
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          PstrCoID: localStorage.getItem("PstrCoID"),
          PstrYear: localStorage.getItem("PstrYear"),
          rows: filled.map((row) => ({
            lkpBranch: row.lkpBranch,
            txtYear: row.txtYear.trim(),
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
      console.error("saveYear error:", error);
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

    const shouldDelete = await confirm(DELETE_CONFIRM_MESSAGE, "Delete");

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
        toast.error(result.message || "Not Deleted,try again");
        focusField(result.field);
        return;
      }

      toast.success(result.message);

      // the server no longer has this year
      setSavedKeys((previous) =>
        previous.filter((key) => key !== `${originalBranch}|${Number(originalYear)}`),
      );

      setRows((previous) =>
        padRows(previous.filter((item) => item.key !== row.key)),
      );
    } catch (error: unknown) {
      console.error("deleteYear error:", error);
      toast.error("Not Deleted,try again");
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

  // Alt+S Save, Alt+C Clear
  useAltShortcuts({
    s: handleSave,
    c: handleClear,
  });

  return (
    <div className="flex min-h-full w-full items-start justify-center bg-white px-4 py-4">
      <div className="min-h-fit w-150 max-w-full bg-white p-0">
        <main className="w-full overflow-hidden border border-[#d5dce2] bg-white">
          <header className="flex h-7.5 items-center justify-start bg-[#9fdfbc]">
            <h1 className="m-0 ml-3.5 text-[17px] font-semibold text-[#24364d]">
              Year
            </h1>
          </header>

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
                  <tr className="bg-[#EDF9F2] text-[#405066]">
                    <th className="h-[28px] border border-[#BFE8D0]" />
                    <th className="h-[28px] border border-[#BFE8D0] px-2 text-left font-normal">
                      Branch
                    </th>
                    <th className="h-[28px] border border-[#BFE8D0] px-2 text-right font-normal">
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
                        <td className="h-[26px] border border-[#BFE8D0] bg-[#fafbfc] text-center text-[10px] text-[#405066]">
                          {selected ? "▶" : ""}
                        </td>
                        <td
                          className={`border border-[#BFE8D0] p-0 ${
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
                          className={`border border-[#BFE8D0] p-0 ${changed ? "bg-[#fff6d6]" : ""}`}
                        >
                          <div className="flex h-[26px] items-center">
                            <input
                              id={`txtYear-${index}`}
                              name="txtYear"
                              aria-label="Year"
                              inputMode="numeric"
                              maxLength={4}
                              value={row.txtYear}
                              onFocus={() => setSelectedKey(row.key)}
                              onChange={(event) =>
                                updateCell(
                                  row.key,
                                  "txtYear",
                                  event.target.value.replace(/\D/g, "").slice(0, 4),
                                )
                              }
                              onKeyDown={(event) => handleYearKeyDown(event, index)}
                              className="h-[26px] min-w-0 flex-1 bg-transparent px-2 text-right text-[12px] text-[#24364d] outline-none focus:bg-white"
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

export default YearPage;
