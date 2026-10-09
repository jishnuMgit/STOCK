import React, { useEffect, useRef, useState } from "react";
import Select, { type StylesConfig } from "react-select";
import { toast } from "react-toastify";
import { useEnterAsTab } from "../../hooks/useEnterAsTab";
import { useAltShortcuts } from "../../hooks/useAltShortcuts";
import { useButtonPermissions } from "../../hooks/useButtonPermissions";
import {
  filterLabelOrValue,
  makeNameIdMenuComponents,
  branchMenuStyles,
} from "../../components/BranchSelect/branchSelectParts";

// dbo.tblmenu fmenuid of the Set Default Branch page
const MENU_ID = "9101";

// ============================================================
// TYPES
// ============================================================

type Option = {
  value: string;
  label: string;
};

// One row = one user. The grid lists EVERY user the server gives (the user ID
// ADMIN gets everyone, anyone else gets only themselves), each with the
// default branch saved for them - empty when they have none yet.
type DefaultBranchRow = {
  txtUserID: string;
  lkpDefaultBranch: string;
  // the branch saved for this user when the page was loaded ("" = none) - the
  // save compares with it to tell a new default, a change and a removal apart
  lkpOriginalDefaultBranch: string;
};

// ============================================================
// SELECT STYLE
// The dropdown sits inside a grid cell: no border, transparent, like the
// text columns of the other grids.
// ============================================================

const gridSelectStyles: StylesConfig<Option, false> = {
  control: (base) => ({
    ...base,
    minHeight: "32px",
    height: "32px",
    width: "100%",
    border: "none",
    borderRadius: "0px",
    boxShadow: "none",
    backgroundColor: "transparent",
    fontSize: "13px",
    cursor: "pointer",
  }),

  valueContainer: (base) => ({
    ...base,
    height: "32px",
    padding: "0 11px",
  }),

  singleValue: (base) => ({
    ...base,
    margin: 0,
    fontSize: "13px",
    color: "#374151",
  }),

  placeholder: (base) => ({
    ...base,
    margin: 0,
    fontSize: "13px",
    color: "#94a3b8",
  }),

  input: (base) => ({
    ...base,
    margin: 0,
    padding: 0,
    fontSize: "13px",
  }),

  indicatorsContainer: (base) => ({
    ...base,
    height: "32px",
  }),

  indicatorSeparator: () => ({
    display: "none",
  }),

  dropdownIndicator: (base) => ({
    ...base,
    padding: "4px",
    color: "#64748b",
  }),

  clearIndicator: (base) => ({
    ...base,
    padding: "4px",
    color: "#94a3b8",
  }),

  menuPortal: (base) => ({
    ...base,
    zIndex: 9999,
  }),

  menu: (base) => ({
    ...base,
    zIndex: 9999,
    fontSize: "13px",
    marginTop: "1px",
  }),

  option: (base, state) => ({
    ...base,
    padding: "6px 10px",
    fontSize: "13px",
    color: "#374151",
    cursor: "pointer",
    backgroundColor: state.isSelected
      ? "#dbeafe"
      : state.isFocused
        ? "#eff6ff"
        : "#ffffff",
  }),
};

// The open Branch list: "Branch | ID" with a divider between the columns -
// the same list the Branch dropdown has on the other pages. Created once,
// outside the page component, so react-select doesn't remount the menu.
const branchComponents = makeNameIdMenuComponents("Branch", true);

const branchSelectStyles: StylesConfig<Option, false> = {
  ...gridSelectStyles,
  ...branchMenuStyles,
};

// ============================================================
// COMPONENT
// ============================================================

const SetDefaultBranchPage: React.FC = () => {
  const handleEnterAsTab = useEnterAsTab();
  const perms = useButtonPermissions(MENU_ID);

  const [rows, setRows] = useState<DefaultBranchRow[]>([]);
  const [selectedRow, setSelectedRow] = useState<number>(0);

  // The Default Branch dropdown of a row: ONLY the branches that row's user has
  // a right to (the old IsUserBrRight check), by user ID.
  const [branchOptionsByUser, setBranchOptionsByUser] = useState<
    Record<string, Option[]>
  >({});

  const [saving, setSaving] = useState(false);

  // is a Default Branch list open right now? (Enter then picks the highlighted
  // branch AND moves on, as Tab does)
  const menuOpenRef = useRef(false);

  // bumped by Clear / a save so the page loads again from the database
  const [reloadKey, setReloadKey] = useState(0);

  // ============================================================
  // LOAD THE BRANCHES A USER MAY USE (the Default Branch dropdown)
  // Loaded when the page opens for the users that already have a default
  // (so the branch name shows), and for the others when their dropdown is
  // entered.
  // ============================================================

  const loadBranchesForUser = async (txtUserID: string, force = false) => {
    if (!txtUserID || (!force && branchOptionsByUser[txtUserID])) {
      return;
    }

    try {
      const PstrCoID = localStorage.getItem("PstrCoID");

      if (!PstrCoID) {
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/DefaultBranch/getBranchList?PstrCoID=${PstrCoID}&txtUserID=${encodeURIComponent(txtUserID)}`,
        { credentials: "include" },
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        toast.error(`getBranchList failed: ${result.message}`);
        return;
      }

      setBranchOptionsByUser((previous) => ({
        ...previous,
        [txtUserID]: (result.data || []).map(
          (branch: { lkpBranch: string; txtBranchName: string }) => ({
            value: branch.lkpBranch,
            label: branch.txtBranchName,
          }),
        ),
      }));
    } catch (error) {
      console.error("getBranchList error:", error);
      toast.error(
        `getBranchList error: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  };

  // ============================================================
  // LOAD USERS + DEFAULT BRANCHES
  // ============================================================

  useEffect(() => {
    const loadPage = async () => {
      try {
        const PstrCoID = localStorage.getItem("PstrCoID");

        if (!PstrCoID) {
          toast.error("getUserList: no PstrCoID in localStorage");
          return;
        }

        const api = import.meta.env.VITE_API_URL;

        // both calls need the login: what is returned depends on WHO is logged in
        const [userResponse, rowResponse] = await Promise.all([
          fetch(`${api}/DefaultBranch/getUserList?PstrCoID=${PstrCoID}`, {
            credentials: "include",
          }),
          fetch(`${api}/DefaultBranch/getDefaultBranchList?PstrCoID=${PstrCoID}`, {
            credentials: "include",
          }),
        ]);

        const userResult = await userResponse.json();
        const rowResult = await rowResponse.json();

        if (!userResponse.ok || !userResult.success) {
          toast.error(`getUserList failed: ${userResult.message}`);
          return;
        }

        if (!rowResponse.ok || !rowResult.success) {
          toast.error(`getDefaultBranchList failed: ${rowResult.message}`);
          return;
        }

        // the branch saved for each user (a user without one is simply not here)
        const savedBranchOf = new Map<string, string>(
          (rowResult.data || []).map(
            (row: { txtUserID: string; lkpDefaultBranch: string | null }) => [
              row.txtUserID.toLowerCase(),
              row.lkpDefaultBranch ?? "",
            ],
          ),
        );

        // one row per user
        const userIDs: string[] = (userResult.data || []).map(
          (user: { txtUserID: string }) => user.txtUserID,
        );

        // a saved default whose user is not in the list (e.g. a user that was
        // removed) still shows, so nothing saved disappears from the screen
        for (const row of rowResult.data || []) {
          if (
            !userIDs.some(
              (id) => id.toLowerCase() === row.txtUserID.toLowerCase(),
            )
          ) {
            userIDs.push(row.txtUserID);
          }
        }

        const loadedRows: DefaultBranchRow[] = userIDs.map((txtUserID) => {
          const saved = savedBranchOf.get(txtUserID.toLowerCase()) ?? "";

          return {
            txtUserID,
            lkpDefaultBranch: saved,
            lkpOriginalDefaultBranch: saved,
          };
        });

        setRows(loadedRows);

        // the branches of the users that already have a default (so the branch
        // names show); the others load when their dropdown is entered
        setBranchOptionsByUser({});

        loadedRows
          .filter((row) => row.lkpOriginalDefaultBranch !== "")
          .forEach((row) => {
            loadBranchesForUser(row.txtUserID, true);
          });

        // the cursor goes to the first Default Branch box
        requestAnimationFrame(() => {
          const input = document.getElementById(
            "lkpDefaultBranch-0",
          ) as HTMLInputElement | null;

          input?.focus();
          setSelectedRow(0);
        });
      } catch (error) {
        console.error("loadDefaultBranchPage error:", error);
        toast.error(
          `Set Default Branch load error: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    };

    loadPage();
    // only when the page is loaded again, not on every change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reloadKey]);

  // ============================================================
  // UPDATE ONE CELL
  // ============================================================

  const updateRow = (index: number, changes: Partial<DefaultBranchRow>) => {
    setRows((previousRows) =>
      previousRows.map((row, rowIndex) =>
        rowIndex === index ? { ...row, ...changes } : row,
      ),
    );
  };

  const hasSavedRows = rows.some((row) => row.lkpOriginalDefaultBranch !== "");

  // ============================================================
  // SAVE / MODIFY
  //
  // The one button: Save while no default branch is saved, Modify once there
  // is (the old form switched its button text). The server compares every row
  // with what is saved: a new branch is added, another branch changes it, an
  // emptied box removes it. The user comes from the login (session).
  // ============================================================

  const actionWord = hasSavedRows ? "Modify" : "Save";
  const canSaveOrModify = hasSavedRows ? perms.modify : perms.save;

  const handleSave = async () => {
    if (saving) return;

    if (!canSaveOrModify) {
      toast.error(`You do not have permission to ${actionWord}.`);
      return;
    }

    const PstrCoID = localStorage.getItem("PstrCoID");
    const PstrYear = localStorage.getItem("PstrYear");

    if (!PstrCoID || !PstrYear) {
      toast.error("Company ID / Year not found. Please log in again.");
      return;
    }

    if (rows.length === 0) {
      toast.warning("There is no information for saving.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/DefaultBranch/saveDefaultBranch`,
        {
          method: "POST",
          credentials: "include", // the server checks the session and the rights
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            PstrCoID,
            PstrYear,
            rows: rows.map((row, index) => ({
              txtGridRow: index, // where the row sits in the grid (for the focus)
              txtUserID: row.txtUserID,
              lkpDefaultBranch: row.lkpDefaultBranch,
            })),
          }),
        },
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        toast.error(
          result.message ||
            (hasSavedRows ? "Not modified, try again." : "Not saved, try again."),
        );

        // the backend names the box that failed - same name as the element id
        if (result.field) {
          document.getElementById(result.field)?.focus();
        }

        return;
      }

      toast.success(
        result.message ||
          (hasSavedRows
            ? "Default branch modified successfully."
            : "Default branch saved successfully."),
      );

      // load the page again - the rows now carry what was saved
      setReloadKey((key) => key + 1);
    } catch (error) {
      console.error("saveDefaultBranch error:", error);
      toast.error("Cannot connect to Default Branch API.");
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

  // Alt+S -> Save (nothing saved yet), Alt+M -> Modify (something saved),
  // Alt+C -> Clear (the underlined letters on the buttons)
  useAltShortcuts({
    s: () => {
      if (!hasSavedRows) handleSave();
    },
    m: () => {
      if (hasSavedRows) handleSave();
    },
    c: handleClear,
  });

  // The old form's behaviour: Enter on a BUTTON presses it. Enter anywhere
  // else moves on to the next box, as on the other pages.
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
      <div className="w-full max-w-[640px] border border-slate-400 bg-white shadow-sm">
        {/* ====================================================
            TITLE
        ==================================================== */}

        <div className="flex h-[28px] w-full items-center bg-[#a7dfc0]">
          <h1 className="ml-[5px] text-[17px] font-semibold text-[#374151]">
            Set Default Branch
          </h1>
        </div>

        {/* ====================================================
            FORM
        ==================================================== */}

        <div className="p-[12px] m-[12px]">
          {/* TABLE AREA */}

          <div className="h-[446px] overflow-hidden border border-[#bfe8d0]">
            <div className="h-full overflow-y-auto overflow-x-hidden">
              <table className="w-full table-fixed border-collapse text-[12px]">
                <colgroup>
                  <col className="w-[38px]" />
                  <col className="w-[50%]" />
                  <col />
                </colgroup>

                <thead>
                  <tr>
                    <th className="sticky top-0 z-20 h-[34px] border border-[#bfe8d0] bg-[#edf9f2] p-0" />

                    <th className="sticky top-0 z-20 h-[34px] border border-l-0 border-[#bfe8d0] bg-[#edf9f2] px-[11px] py-0 text-left text-[14px] font-normal text-gray-600">
                      User ID
                    </th>

                    <th className="sticky top-0 z-20 h-[34px] border border-l-0 border-[#bfe8d0] bg-[#edf9f2] px-[11px] py-0 text-left text-[14px] font-normal text-gray-600">
                      Default Branch
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {rows.map((row, index) => (
                    <tr
                      key={row.txtUserID}
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

                      {/* USER ID - the user of this row (fixed text) */}

                      <td className="h-[34px] border border-l-0 border-[#bfe8d0] bg-white p-0 align-middle">
                        <input
                          id={`txtUserID-${index}`}
                          name="txtUserID"
                          type="text"
                          value={row.txtUserID}
                          readOnly
                          tabIndex={-1}
                          className="h-[32px] w-full min-w-0 border-0 bg-transparent px-[11px] py-0 text-left text-[13px] text-[#374151] outline-none"
                        />
                      </td>

                      {/* DEFAULT BRANCH - only the branches this row's user has a
                          right to; no clear (x) button, a branch is only changed to another one */}

                      <td className="h-[34px] border border-l-0 border-[#bfe8d0] bg-white p-0 align-middle">
                        <Select<Option, false>
                          inputId={`lkpDefaultBranch-${index}`}
                          instanceId={`lkpDefaultBranch-${index}`}
                          name="lkpDefaultBranch"
                          options={branchOptionsByUser[row.txtUserID] ?? []}
                          value={
                            (branchOptionsByUser[row.txtUserID] ?? []).find(
                              (option) => option.value === row.lkpDefaultBranch,
                            ) ||
                            (row.lkpDefaultBranch
                              ? {
                                  value: row.lkpDefaultBranch,
                                  label: row.lkpDefaultBranch,
                                }
                              : null)
                          }
                          onChange={(option) =>
                            updateRow(index, {
                              lkpDefaultBranch: option?.value ?? "",
                            })
                          }
                          onFocus={() => {
                            setSelectedRow(index);
                            loadBranchesForUser(row.txtUserID);
                          }}
                          onMenuOpen={() => {
                            menuOpenRef.current = true;
                          }}
                          onMenuClose={() => {
                            menuOpenRef.current = false;
                          }}
                          onKeyDown={(event) => {
                            // Enter with the list open: react-select picks the
                            // highlighted branch and stays here - then go on to
                            // the next row's Default Branch (or the buttons),
                            // like Tab. With nothing to pick, the page's
                            // Enter-as-Tab has already moved on, so do nothing.
                            if (event.key !== "Enter" || !menuOpenRef.current) {
                              return;
                            }

                            const here = `lkpDefaultBranch-${index}`;

                            setTimeout(() => {
                              if (document.activeElement?.id !== here) return;

                              const next =
                                document.getElementById(`lkpDefaultBranch-${index + 1}`) ??
                                document.getElementById(hasSavedRows ? "btnModify" : "btnSave");

                              if (next && !(next as HTMLButtonElement).disabled) {
                                next.focus();
                              } else {
                                document.getElementById("btnClear")?.focus();
                              }
                            }, 0);
                          }}
                          styles={branchSelectStyles}
                          components={branchComponents}
                          filterOption={filterLabelOrValue}
                          isClearable={false}
                          isSearchable
                          placeholder=""
                          noOptionsMessage={() => "This user has no Branch Permissions."}
                          menuPortalTarget={document.body}
                          menuPosition="fixed"
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
              id={hasSavedRows ? "btnModify" : "btnSave"}
              name={hasSavedRows ? "btnModify" : "btnSave"}
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

export default SetDefaultBranchPage;
