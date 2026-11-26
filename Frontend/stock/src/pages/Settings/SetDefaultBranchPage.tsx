import React, { useEffect, useRef, useState } from "react";
import Header from "../../components/common/Header";
import CommonTableSelect, {
  type TableSelectOption,
} from "../../components/common/CommonTableSelect";
import { useEnterAsTab } from "../../hooks/useEnterAsTab";
import { useCtrlShortcuts } from "../../hooks/useCtrlShortcuts";
import { useGridCellFocus } from "../../hooks/useGridCellFocus";
import { useButtonPermissions } from "../../hooks/useButtonPermissions";
import { tryGetServerDate } from "../../utils/serverDate";
import { useMessageModal } from "../../hooks/useMessageModal";
import TransactionActions from "../../components/common/TransactionActions";
import { filterLabelOrValue } from "../../components/BranchSelect/branchSelectParts";

// dbo.tblmenu fmenuid of the Set Default Branch page
const MENU_ID = "9101";

// ============================================================
// TYPES
// ============================================================

type Option = TableSelectOption;

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

// The open Branch list: "Branch | ID", as on the other screens
const BRANCH_COLUMNS = [
  { key: "label", label: "Branch", width: "1fr" },
  { key: "value", label: "ID", width: "70px", align: "right" as const },
];

// ============================================================
// COMPONENT
// ============================================================

const SetDefaultBranchPage: React.FC = () => {
  const handleEnterAsTab = useEnterAsTab();
  const perms = useButtonPermissions(MENU_ID);
  // the messages (warnings, errors, saved ...) are the common message window, as on the Payment screen - not a toast
  const { notify, dialog: messageDialog } = useMessageModal("Set Default Branch");
  // the cell the cursor is in is outlined
  const { cellFocusClass } = useGridCellFocus();

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
        notify.error(`getBranchList failed: ${result.message}`);
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
      notify.error(
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
          notify.error("getUserList: no PstrCoID in localStorage");
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
          notify.error(`getUserList failed: ${userResult.message}`);
          return;
        }

        if (!rowResponse.ok || !rowResult.success) {
          notify.error(`getDefaultBranchList failed: ${rowResult.message}`);
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
        notify.error(
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
  // SAVE
  //
  // The one button, always "Save" (the old form switched it to "Modify" once a
  // default branch was saved; here it stays Save). The server compares every row
  // with what is saved: a new branch is added, another branch changes it, an
  // emptied box removes it. The user comes from the login (session).
  // ============================================================

  const actionWord = "Save";
  const canSaveOrModify = hasSavedRows ? perms.modify : perms.save;

  const handleSave = async () => {
    if (saving) return;

    if (!canSaveOrModify) {
      notify.error(`You do not have permission to ${actionWord}.`);
      return;
    }

    const PstrCoID = localStorage.getItem("PstrCoID");
    const PstrYear = localStorage.getItem("PstrYear");

    if (!PstrCoID || !PstrYear) {
      notify.error("Company ID / Year not found. Please log in again.");
      return;
    }

    if (rows.length === 0) {
      notify.warning("There is no information for saving.");
      return;
    }

    setSaving(true);

    try {
      // the time of the save: the database server's clock (the common /datetime/server-date), written on every row
      const dtpServerDate = await tryGetServerDate();

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/DefaultBranch/saveDefaultBranch`,
        {
          method: "POST",
          credentials: "include", // the server checks the session and the rights
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            PstrCoID,
            PstrYear,
            dtpServerDate,
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
        notify.error(result.message || "Not saved, try again.");

        // the backend names the box that failed - same name as the element id
        if (result.field) {
          document.getElementById(result.field)?.focus();
        }

        return;
      }

      notify.success(result.message || "Default branch saved successfully");

      // load the page again - the rows now carry what was saved
      setReloadKey((key) => key + 1);
    } catch (error) {
      console.error("saveDefaultBranch error:", error);
      notify.error("Cannot connect to Default Branch API.");
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

  // The key of the Payment screen: Ctrl+S Save
  useCtrlShortcuts({
    s: handleSave,
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
      {messageDialog}
      <div className="w-full max-w-[640px] border border-slate-400 bg-white shadow-sm">
        <Header Name="Set Default Branch" />

        {/* ====================================================
            FORM
        ==================================================== */}

        <div className="p-3">
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

                    <th className="sticky pl-[2px] top-0 z-20 h-[34px] border border-l-0 border-[#bfe8d0] bg-[#edf9f2] pr-[11px] py-0 text-left text-[14px] font-normal text-gray-600">
                      User ID
                    </th>

                    <th className="sticky pl-[2px] top-0 z-20 h-[34px] border border-l-0 border-[#bfe8d0] bg-[#edf9f2] pr-[11px] py-0 text-left text-[14px] font-normal text-gray-600">
                      Default Branch
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {rows.map((row, index) => (
                    <tr
                      key={row.txtUserID}
                      className={`h-[34px] ${selectedRow === index ? "bg-[#f8fcfa]" : "bg-white"
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
                          className="h-[32px] w-full min-w-0 border-0 bg-transparent pl-[2px] pr-[11px] py-0 text-left text-[13px] text-[#374151] outline-none"
                        />
                      </td>

                      {/* DEFAULT BRANCH - only the branches this row's user has a
                          right to; no clear (x) button, a branch is only changed to another one */}

                      <td className={`h-[34px] border border-l-0 border-[#bfe8d0] bg-white p-0 align-middle ${cellFocusClass}`}>
                        {/* onFocus bubbles from the select's input: marks the row
                            and loads this user's branches */}
                        <div
                          onFocus={() => {
                            setSelectedRow(index);
                            loadBranchesForUser(row.txtUserID);
                          }}
                        >
                          <CommonTableSelect
                            inputId={`lkpDefaultBranch-${index}`}
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
                                  document.getElementById("btnSave");

                                if (next && !(next as HTMLButtonElement).disabled) {
                                  next.focus();
                                } else {
                                  document.getElementById("btnClear")?.focus();
                                }
                              }, 0);
                            }}
                            columns={BRANCH_COLUMNS}
                            width="100%"
                            menuWidth="calc(100% + 70px)"
                            controlHeight={32}
                            borderColor="transparent"
                            hoverBorderColor="transparent"
                            filterOption={filterLabelOrValue}
                            isClearable={false}
                            isSearchable
                            placeholder=""
                            noOptionsMessage={() => "This user has no Branch Permissions."}
                            menuPortalTarget={document.body}
                          />
                        </div>
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

          <TransactionActions
            className="mt-[14px] flex justify-center gap-3"
            actions={[
              {
                id: "btnSave",
                label: actionWord,
                underlineIndex: 0,
                onClick: handleSave,
                disabled: !canSaveOrModify || saving,
              },
              { id: "btnClear", label: "Clear", onClick: handleClear },
            ]}
          />
        </div>
      </div>
    </div>
  );
};

export default SetDefaultBranchPage;