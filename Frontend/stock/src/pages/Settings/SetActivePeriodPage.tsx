import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { useEnterAsTab } from "../../hooks/useEnterAsTab";
import { useAltShortcuts } from "../../hooks/useAltShortcuts";
import { useButtonPermissions } from "../../hooks/useButtonPermissions";

// dbo.tblmenu fmenuid of the Set Active Period page
const MENU_ID = "9103";

// ============================================================
// TYPES
// ============================================================

// One row = one branch the logged-in user has a right to. The branch is fixed
// (the old form never let a branch be changed); only the dates are edited.
// The dates are yyyy-mm-dd, as the <input type="date"> and the server use.
type ActivePeriodRow = {
  txtBranchID: string;
  txtBranchName: string;
  dtpFromDate: string;
  dtpToDate: string;
};

// a date box inside a grid cell: no border, transparent, like the text columns
// of the other grids
const dateInputClass =
  "h-[32px] w-full min-w-0 border-0 bg-transparent px-[11px] py-0 text-left text-[13px] text-[#374151] outline-none focus:bg-[#f1f8ff]";

// ============================================================
// COMPONENT
// ============================================================

const SetActivePeriodPage: React.FC = () => {
  const handleEnterAsTab = useEnterAsTab();
  const perms = useButtonPermissions(MENU_ID);

  const [rows, setRows] = useState<ActivePeriodRow[]>([]);
  const [selectedRow, setSelectedRow] = useState<number>(0);
  const [saving, setSaving] = useState(false);

  // bumped by Clear / a save so the page loads again from the database
  const [reloadKey, setReloadKey] = useState(0);

  // ============================================================
  // LOAD THE BRANCHES WITH THEIR ACTIVE PERIOD
  // ============================================================

  useEffect(() => {
    const loadPage = async () => {
      try {
        const PstrCoID = localStorage.getItem("PstrCoID");

        if (!PstrCoID) {
          toast.error("getActivePeriodList: no PstrCoID in localStorage");
          return;
        }

        // needs the login: only the branches that user has a right to come back
        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/ActivePeriod/getActivePeriodList?PstrCoID=${PstrCoID}`,
          { credentials: "include" },
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
          toast.error(`getActivePeriodList failed: ${result.message}`);
          return;
        }

        setRows(
          (result.data || []).map(
            (row: {
              txtBranchID: string;
              txtBranchName: string | null;
              dtpFromDate: string | null;
              dtpToDate: string | null;
            }) => ({
              txtBranchID: row.txtBranchID,
              txtBranchName: row.txtBranchName ?? row.txtBranchID,
              dtpFromDate: row.dtpFromDate ?? "",
              dtpToDate: row.dtpToDate ?? "",
            }),
          ),
        );

        // the cursor goes to the first From Date
        requestAnimationFrame(() => {
          const input = document.getElementById(
            "dtpFromDate-0",
          ) as HTMLInputElement | null;

          input?.focus();
          setSelectedRow(0);
        });
      } catch (error) {
        console.error("loadActivePeriodPage error:", error);
        toast.error(
          `Set Active Period load error: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    };

    loadPage();
  }, [reloadKey]);

  // ============================================================
  // UPDATE ONE CELL
  // ============================================================

  const updateRow = (index: number, changes: Partial<ActivePeriodRow>) => {
    setRows((previousRows) =>
      previousRows.map((row, rowIndex) =>
        rowIndex === index ? { ...row, ...changes } : row,
      ),
    );
  };

  // ============================================================
  // MODIFY
  //
  // The branches already exist, so the one button only ever Modifies. The
  // rules are the old form's ValidateMe, checked here for a quick answer and
  // again by the server (which is the one that counts): every branch needs a
  // From Date and a To Date, and From may not be later than To. Checked when
  // you press Modify - so both dates can be changed in any order.
  // ============================================================

  const handleSave = async () => {
    if (saving) return;

    if (!perms.modify) {
      toast.error("You do not have permission to Modify.");
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

    for (const [index, row] of rows.entries()) {
      if (row.dtpFromDate === "") {
        toast.warning("Please input 'From Date'");
        document.getElementById(`dtpFromDate-${index}`)?.focus();
        return;
      }

      if (row.dtpToDate === "") {
        toast.warning("Please input 'To Date'");
        document.getElementById(`dtpToDate-${index}`)?.focus();
        return;
      }

      // yyyy-mm-dd text compares in date order
      if (row.dtpFromDate > row.dtpToDate) {
        toast.warning("'From Date' should be less than or equal to 'To Date'");
        document.getElementById(`dtpFromDate-${index}`)?.focus();
        return;
      }
    }

    setSaving(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/ActivePeriod/saveActivePeriod`,
        {
          method: "POST",
          credentials: "include", // the server checks the session and the rights
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            PstrCoID,
            PstrYear,
            rows: rows.map((row, index) => ({
              txtGridRow: index, // where the row sits in the grid (for the focus)
              txtBranchID: row.txtBranchID,
              dtpFromDate: row.dtpFromDate,
              dtpToDate: row.dtpToDate,
            })),
          }),
        },
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        toast.error(result.message || "Not modified, try again.");

        // the backend names the box that failed - same name as the element id
        if (result.field) {
          document.getElementById(result.field)?.focus();
        }

        return;
      }

      toast.success(result.message || "Active period modified successfully.");

      // load the page again - the rows now carry what was saved
      setReloadKey((key) => key + 1);
    } catch (error) {
      console.error("saveActivePeriod error:", error);
      toast.error("Cannot connect to Active Period API.");
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

  // Alt+M -> Modify, Alt+C -> Clear (the underlined letters on the buttons)
  useAltShortcuts({
    m: handleSave,
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
            Set Active Period
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
                  <col className="w-[40%]" />
                  <col />
                  <col />
                </colgroup>

                <thead>
                  <tr>
                    <th className="sticky top-0 z-20 h-[34px] border border-[#bfe8d0] bg-[#edf9f2] p-0" />

                    <th className="sticky top-0 z-20 h-[34px] border border-l-0 border-[#bfe8d0] bg-[#edf9f2] px-[11px] py-0 text-left text-[14px] font-normal text-gray-600">
                      Branch
                    </th>

                    <th className="sticky top-0 z-20 h-[34px] border border-l-0 border-[#bfe8d0] bg-[#edf9f2] px-[11px] py-0 text-left text-[14px] font-normal text-gray-600">
                      From Date
                    </th>

                    <th className="sticky top-0 z-20 h-[34px] border border-l-0 border-[#bfe8d0] bg-[#edf9f2] px-[11px] py-0 text-left text-[14px] font-normal text-gray-600">
                      To Date
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {rows.map((row, index) => (
                    <tr
                      key={row.txtBranchID}
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

                      {/* BRANCH - the branch of this row (fixed text, the name) */}

                      <td className="h-[34px] border border-l-0 border-[#bfe8d0] bg-white p-0 align-middle">
                        <input
                          id={`txtBranchName-${index}`}
                          name="txtBranchName"
                          type="text"
                          value={row.txtBranchName}
                          readOnly
                          tabIndex={-1}
                          className="h-[32px] w-full min-w-0 border-0 bg-transparent px-[11px] py-0 text-left text-[13px] text-[#374151] outline-none"
                        />
                      </td>

                      {/* FROM DATE */}

                      <td className="h-[34px] border border-l-0 border-[#bfe8d0] bg-white p-0 align-middle">
                        <input
                          id={`dtpFromDate-${index}`}
                          name="dtpFromDate"
                          type="date"
                          value={row.dtpFromDate}
                          onFocus={() => setSelectedRow(index)}
                          onChange={(event) =>
                            updateRow(index, { dtpFromDate: event.target.value })
                          }
                          className={dateInputClass}
                        />
                      </td>

                      {/* TO DATE */}

                      <td className="h-[34px] border border-l-0 border-[#bfe8d0] bg-white p-0 align-middle">
                        <input
                          id={`dtpToDate-${index}`}
                          name="dtpToDate"
                          type="date"
                          value={row.dtpToDate}
                          onFocus={() => setSelectedRow(index)}
                          onChange={(event) =>
                            updateRow(index, { dtpToDate: event.target.value })
                          }
                          className={dateInputClass}
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
              id="btnModify"
              name="btnModify"
              type="button"
              onClick={handleSave}
              disabled={!perms.modify || saving}
              className="btn-style disabled:cursor-not-allowed disabled:opacity-40"
            >
              <span className="underline underline-offset-2">M</span>odify
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

export default SetActivePeriodPage;
