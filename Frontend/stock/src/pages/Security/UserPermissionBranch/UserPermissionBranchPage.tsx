import { ChevronDown, ChevronRight } from "lucide-react";
import React, { useEffect, useState } from "react";
import Select, { type SingleValue, type StylesConfig } from "react-select";
import { toast } from "react-toastify";
import { useEnterAsTab } from "../../../hooks/useEnterAsTab";
import { useAltShortcuts } from "../../../hooks/useAltShortcuts";
import { useButtonPermissions } from "../../../hooks/useButtonPermissions";

const API_URL = `${import.meta.env.VITE_API_URL}/user-permission-branch`;
const USER_LIST_API_URL = `${import.meta.env.VITE_API_URL}/user-permission/users/list`;

// ============================================================
// TYPES
// ============================================================

interface SelectOption {
  value: string;
  label: string;
}

interface BranchNode {
  lkpBranch: string;
  txtBranchName: string;
  checked: boolean;
}

interface CompanyNode {
  lkpCoID: string;
  txtCoName: string;
  checked: boolean;
  children: BranchNode[];
}

interface PermissionInput {
  lkpCoID: string;
  lkpBranch: string;
}

interface ApiResponse {
  success: boolean;
  message?: string;
  data?: CompanyNode[];
}

// ============================================================
// BUTTON CLASS
// ============================================================

const buttonClass = "btn-style";

// ============================================================
// USER ID SELECT STYLE
// Same box look/placeholder as Set Company Info's Company
// select (companySelectStyles there).
// ============================================================

const userIdSelectStyles: StylesConfig<SelectOption, false> = {
  control: (base, state) => ({
    ...base,
    minHeight: "30px",
    height: "30px",
    border: "1px solid #d1d5db",
    borderRadius: "4px",
    boxShadow: "none",
    backgroundColor: state.isFocused ? "#eefbf4" : "#ffffff",
    fontSize: "11px",
    cursor: "pointer",

    "&:hover": {
      borderColor: "#9fdfbc",
    },
  }),

  valueContainer: (base) => ({
    ...base,
    height: "23px",
    minHeight: "23px",
    padding: "0 6px",
  }),

  singleValue: (base) => ({
    ...base,
    margin: 0,
    color: "#374151",
    fontSize: "11px",
  }),

  placeholder: (base) => ({
    ...base,
    margin: 0,
    color: "#808080",
    fontSize: "11px",
  }),

  input: (base) => ({
    ...base,
    margin: 0,
    padding: 0,
    fontSize: "11px",
    color: "#374151",
  }),

  indicatorsContainer: (base) => ({
    ...base,
    height: "23px",
  }),

  dropdownIndicator: (base) => ({
    ...base,
    color: "#aeb8c2",
    padding: "4px",

    "&:hover": {
      color: "#808080",
    },
  }),

  indicatorSeparator: () => ({
    display: "none",
  }),

  clearIndicator: (base) => ({
    ...base,
    color: "#aeb8c2",
    padding: "4px",

    "&:hover": {
      color: "#808080",
    },
  }),

  menu: (base) => ({
    ...base,
    fontSize: "12px",
    zIndex: 9999,
    marginTop: "2px",
    borderRadius: "4px",
    overflow: "hidden",
  }),

  menuList: (base) => ({
    ...base,
    padding: "3px 0",
    maxHeight: "260px", // ~8 rows visible - always leaves at least one row scrolled off so the thumb stays visible
    overflowY: "scroll", // always show the scrollbar track, even when everything fits
  }),

  option: (base, state) => ({
    ...base,
    fontSize: "12px",
    cursor: "pointer",

    backgroundColor:
      state.isSelected || state.isFocused ? "#eefbf4" : "#ffffff",

    color: "#344054",
    padding: "7px 10px",

    "&:active": {
      backgroundColor: "#dff5e9",
    },
  }),
};

// ============================================================
// CLEAR / FLATTEN HELPERS
// ============================================================

function clearTree(nodes: CompanyNode[]): CompanyNode[] {
  return nodes.map((company) => ({
    ...company,
    checked: false,
    children: company.children.map((branch) => ({
      ...branch,
      checked: false,
    })),
  }));
}

function flattenChecked(nodes: CompanyNode[]): PermissionInput[] {
  const result: PermissionInput[] = [];

  nodes.forEach((company) => {
    company.children.forEach((branch) => {
      if (branch.checked) {
        result.push({ lkpCoID: company.lkpCoID, lkpBranch: branch.lkpBranch });
      }
    });
  });

  return result;
}

// ============================================================
// MAIN COMPONENT
// ============================================================

// dbo.tblmenu fmenuid for the User Permission - Co. & Branch page.
const MENU_ID = "9303";

const UserPermissionBranchPage: React.FC = () => {
  const perms = useButtonPermissions(MENU_ID);
  const handleEnterAsTab = useEnterAsTab();

  const [lkpUserID, setLkpUserID] = useState<string>("");
  const [userIdOptions, setUserIdOptions] = useState<SelectOption[]>([]);
  const [loadingUserIdOptions, setLoadingUserIdOptions] = useState(true);

  const [permissionData, setPermissionData] = useState<CompanyNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Independent expand/collapse state for each company
  const [expandedCompanies, setExpandedCompanies] = useState<
    Record<string, boolean>
  >({});

  // ==========================================================
  // LOAD USER ID LIST (lkpUserID dropdown)
  // GET /api/user-permission/users/list
  // ==========================================================

  useEffect(() => {
    const loadUserIdList = async () => {
      const PstrCoID = localStorage.getItem("PstrCoID");

      if (!PstrCoID) {
        setLoadingUserIdOptions(false);
        return;
      }

      try {
        const response = await fetch(
          `${USER_LIST_API_URL}?PstrCoID=${encodeURIComponent(PstrCoID)}`
        );

        const result: { success: boolean; data?: { lkpUserID: string }[] } =
          await response.json();

        if (response.ok && result.success) {
          setUserIdOptions(
            (result.data || []).map((row) => ({
              value: row.lkpUserID,
              label: row.lkpUserID,
            }))
          );
        }
      } catch (err) {
        console.error("Load user ID list failed:", err);
      } finally {
        setLoadingUserIdOptions(false);
      }
    };

    loadUserIdList();
  }, []);

  // ==========================================================
  // LOAD COMPANY / BRANCH PERMISSIONS
  //
  // With a user picked: GET /api/user-permission-branch/:lkpUserID
  //   -> the tree with that user's real grants checked.
  // With no user picked yet (id is blank, e.g. on page load):
  //   GET /api/user-permission-branch/structure
  //   -> the same tree shape, everything unchecked, so the
  //      page shows companies/branches immediately instead of
  //      a blank "select a user" box.
  // ==========================================================

  const loadPermissions = async (id: string) => {
    const PstrCoID = localStorage.getItem("PstrCoID");

    if (!PstrCoID) {
      setPermissionData([]);
      toast.error("Company ID not found. Please log in again.");
      return;
    }

    setLoading(true);

    try {
      const url = id.trim()
        ? `${API_URL}/${encodeURIComponent(id.trim())}?PstrCoID=${encodeURIComponent(PstrCoID)}`
        : `${API_URL}/structure?PstrCoID=${encodeURIComponent(PstrCoID)}`;

      const response = await fetch(url);

      const result: ApiResponse = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to load permissions.");
      }

      const tree = result.data || [];

      setPermissionData(tree);

      // Expand every company by default.
      setExpandedCompanies(
        Object.fromEntries(tree.map((company) => [company.lkpCoID, true]))
      );
    } catch (err) {
      console.error("Load user-permission-branch failed:", err);
      setPermissionData([]);

      toast.error(
        err instanceof Error ? err.message : "Failed to load permissions."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadPermissions(lkpUserID);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lkpUserID]);

  // ==========================================================
  // EXPAND / COLLAPSE INDIVIDUAL COMPANY
  // ==========================================================

  const toggleExpanded = (lkpCoID: string) => {
    setExpandedCompanies((previous) => ({
      ...previous,
      [lkpCoID]: !previous[lkpCoID],
    }));
  };

  // ==========================================================
  // COMPANY CHECKBOX - check/uncheck it and every branch
  // ==========================================================

  const toggleCompany = (lkpCoID: string, checked: boolean) => {
    setPermissionData((previous) =>
      previous.map((company) =>
        company.lkpCoID !== lkpCoID
          ? company
          : {
              ...company,
              checked,
              children: company.children.map((branch) => ({
                ...branch,
                checked,
              })),
            }
      )
    );
  };

  // ==========================================================
  // BRANCH CHECKBOX - company is checked only when every
  // branch under it is checked
  // ==========================================================

  const toggleBranch = (lkpCoID: string, lkpBranch: string, checked: boolean) => {
    setPermissionData((previous) =>
      previous.map((company) => {
        if (company.lkpCoID !== lkpCoID) return company;

        const updatedChildren = company.children.map((branch) =>
          branch.lkpBranch === lkpBranch ? { ...branch, checked } : branch
        );

        return {
          ...company,
          checked: updatedChildren.some((branch) => branch.checked),
          children: updatedChildren,
        };
      })
    );
  };

  // ==========================================================
  // SAVE
  // PUT /api/user-permission-branch/:lkpUserID
  // ==========================================================

  const handleSave = async () => {
    if (!perms.save) {
      toast.error("You do not have permission to Save.");
      return;
    }

    if (!lkpUserID.trim()) {
      toast.warning("Please select a user ID.");
      return;
    }

    const PstrCoID = localStorage.getItem("PstrCoID");
    const PstrYear = localStorage.getItem("PstrYear");
    const PstrUserID = localStorage.getItem("PstrUserID");

    if (!PstrCoID || !PstrYear || !PstrUserID) {
      toast.error("Company ID / Year / User ID not found. Please log in again.");
      return;
    }

    setSaving(true);

    try {
      const permissions = flattenChecked(permissionData);

      const response = await fetch(
        `${API_URL}/${encodeURIComponent(lkpUserID.trim())}`,
        {
          method: "PUT",
          credentials: "include", // the server checks the session, idle and rights
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ PstrCoID, PstrYear, PstrUserID, permissions }),
        }
      );

      const result: ApiResponse = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to save permissions.");
      }

      toast.success(result.message || "Permission saved successfully.");
    } catch (err) {
      console.error("Save user-permission-branch failed:", err);

      toast.error(
        err instanceof Error ? err.message : "Failed to save permissions."
      );
    } finally {
      setSaving(false);
    }
  };

  // ==========================================================
  // DELETE
  // DELETE /api/user-permission-branch/:lkpUserID
  // ==========================================================

  const handleDelete = async () => {
    if (!perms.delete) {
      toast.error("You do not have permission to Delete.");
      return;
    }

    if (!lkpUserID.trim()) {
      toast.warning("Please select a user ID.");
      return;
    }

    const PstrCoID = localStorage.getItem("PstrCoID");
    const PstrYear = localStorage.getItem("PstrYear");
    const PstrUserID = localStorage.getItem("PstrUserID");

    if (!PstrCoID || !PstrYear || !PstrUserID) {
      toast.error("Company ID / Year / User ID not found. Please log in again.");
      return;
    }

    if (!window.confirm(`Delete all company/branch rights for ${lkpUserID}?`)) {
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(
        `${API_URL}/${encodeURIComponent(lkpUserID.trim())}`,
        {
          method: "DELETE",
          credentials: "include", // the server checks the session, idle and rights
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ PstrCoID, PstrYear, PstrUserID }),
        }
      );

      const result: ApiResponse = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to delete permissions.");
      }

      setPermissionData((previous) => clearTree(previous));

      toast.success(result.message || "Permissions deleted successfully.");
    } catch (err) {
      console.error("Delete user-permission-branch failed:", err);

      toast.error(
        err instanceof Error ? err.message : "Failed to delete permissions."
      );
    } finally {
      setSaving(false);
    }
  };

  // ==========================================================
  // CLEAR
  // ==========================================================

  const handleClear = () => {
    setPermissionData((previous) => clearTree(previous));
  };

  // ==========================================================
  // KEYBOARD SHORTCUTS
  // Alt+S -> Save, Alt+D -> Delete, Alt+C -> Clear (matches
  // the underlined accelerator letters on the buttons).
  // ==========================================================

  useAltShortcuts({
    s: handleSave,
    d: handleDelete,
    c: handleClear,
  });

  // ==========================================================
  // UI
  // ==========================================================

  return (
    <div
      className="flex min-h-screen w-full items-center justify-center bg-white"
      onKeyDown={handleEnterAsTab}
    >
      <div className="flex w-[calc(100%-32px)] max-w-[30%] min-w-100 flex-col border border-slate-400 bg-white text-[12px] text-gray-700 shadow-sm">
        {/* TITLE */}
        <header className="flex h-[28px] w-full shrink-0 items-center bg-[#a7dfc0]">
          <h1 className="ml-[5px] text-[17px] font-semibold text-[#374151]">
            User Permission - Branch
          </h1>
        </header>

        {/* FORM */}
        <div className="p-[12px] m-[12px]">

        {/* USER SELECT */}
        <section className="mb-[8px] flex shrink-0 items-center gap-2">
          <label
            htmlFor="lkpUserID"
            className="w-[84px] shrink-0 pr-3 text-right text-[14px] text-gray-600"
          >
            User ID :
          </label>

          <div className="w-[50%] min-w-50 max-w-[calc(100%-92px)]">
            <Select<SelectOption, false>
              inputId="lkpUserID"
              name="lkpUserID"
              options={userIdOptions}
              value={
                userIdOptions.find((option) => option.value === lkpUserID) ||
                null
              }
              onChange={(option: SingleValue<SelectOption>) =>
                setLkpUserID(option?.value || "")
              }
              styles={userIdSelectStyles}
              classNamePrefix="userIdSelect"
              isSearchable
              isClearable={false}
              isLoading={loadingUserIdOptions}
              placeholder={loadingUserIdOptions ? "Loading..." : "Select"}
              noOptionsMessage={() => "No User Found"}
            />
          </div>
        </section>

        {/* PERMISSION TREE */}
        <main
          className="flex min-h-0 flex-1 flex-col"
          id="trlBranches"
        >
          <div className="min-h-65 flex-1 overflow-auto border border-[#b8f0d0]">
            <table className="w-full table-fixed border-collapse">
              <colgroup>
                <col />
              </colgroup>

              <thead>
                <tr className="h-[30px] bg-[#eef9f3]">
                  <th className="border-b border-[#b8f0d0] px-2.75 text-left text-[14px] font-normal text-gray-600">
                    Branches
                  </th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td className="h-16 text-center text-slate-500">
                      Loading permissions...
                    </td>
                  </tr>
                ) : permissionData.length === 0 ? (
                  <tr>
                    <td className="h-16 text-center text-slate-500">
                      No companies found.
                    </td>
                  </tr>
                ) : (
                  permissionData.map((company) => (
                    <React.Fragment key={company.lkpCoID}>
                      {/* LEVEL 1: COMPANY */}
                      <tr className="h-7.25">
                        <td className="border-b border-[#b8f0d0] p-0">
                          <div className="flex h-7 items-center gap-2.25 pl-4 pr-2.5">
                            <button
                              type="button"
                              aria-label={
                                expandedCompanies[company.lkpCoID]
                                  ? `Collapse ${company.txtCoName}`
                                  : `Expand ${company.txtCoName}`
                              }
                              aria-expanded={!!expandedCompanies[company.lkpCoID]}
                              onClick={() => toggleExpanded(company.lkpCoID)}
                              className="flex h-5 w-5 shrink-0 items-center justify-center text-[12px] text-slate-600"
                            >
                              {expandedCompanies[company.lkpCoID] ? (
                                <ChevronDown color="green" />
                              ) : (
                                <ChevronRight color="green" />
                              )}
                            </button>

                            <input
                              id={`chk${company.lkpCoID}`}
                              name={`chk${company.lkpCoID}`}
                              type="checkbox"
                              checked={company.checked}
                              onChange={(event) =>
                                toggleCompany(
                                  company.lkpCoID,
                                  event.target.checked
                                )
                              }
                              className="h-4.25 w-4.25 shrink-0 cursor-pointer accent-[#69d875]"
                            />

                            <label
                              htmlFor={`chk${company.lkpCoID}`}
                              className="flex-1 cursor-pointer text-[15px]"
                            >
                              {company.txtCoName}
                            </label>
                          </div>
                        </td>
                      </tr>

                      {/* LEVEL 2: BRANCHES */}
                      {expandedCompanies[company.lkpCoID] &&
                        company.children.map((branch) => (
                          <tr key={branch.lkpBranch} className="h-7.25">
                            <td className="border-b border-[#b8f0d0] p-0">
                              <div className="ml-15 flex h-7 items-center gap-2.25 border-l border-[#b8f0d0] pl-1.5">
                                <input
                                  id={`chk${company.lkpCoID}_${branch.lkpBranch}`}
                                  name={`chk${company.lkpCoID}_${branch.lkpBranch}`}
                                  type="checkbox"
                                  checked={branch.checked}
                                  onChange={(event) =>
                                    toggleBranch(
                                      company.lkpCoID,
                                      branch.lkpBranch,
                                      event.target.checked
                                    )
                                  }
                                  className="h-4.25 w-4.25 shrink-0 cursor-pointer accent-[#69d875]"
                                />

                                <label
                                  htmlFor={`chk${company.lkpCoID}_${branch.lkpBranch}`}
                                  className="flex-1 cursor-pointer text-[15px]"
                                >
                                  {branch.txtBranchName}
                                </label>
                              </div>
                            </td>
                          </tr>
                        ))}
                    </React.Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </main>

        {/* ACTION BUTTONS */}
        <footer className="mt-[14px] shrink-0">
          <div className="flex flex-wrap items-center justify-center gap-3">
            {/* SAVE */}
            <button
              id="btnSave"
              name="btnSave"
              type="button"
              onClick={handleSave}
              disabled={saving || loading || !perms.save}
              className={`${buttonClass} disabled:cursor-not-allowed disabled:opacity-40`}
            >
              <span className="underline underline-offset-2">S</span>ave
            </button>

            {/* DELETE */}
            <button
              id="btnDelete"
              name="btnDelete"
              type="button"
              onClick={handleDelete}
              disabled={saving || loading || !perms.delete}
              className={`${buttonClass} disabled:cursor-not-allowed disabled:opacity-40`}
            >
              <span className="underline underline-offset-2">D</span>elete
            </button>

            {/* CLEAR */}
            <button
              id="btnClear"
              name="btnClear"
              type="button"
              onClick={handleClear}
              disabled={saving || loading}
              className={buttonClass}
            >
              <span className="underline underline-offset-2">C</span>lear
            </button>
          </div>
        </footer>

        </div>
      </div>
    </div>
  );
};

export default UserPermissionBranchPage;
