import { ChevronDown, ChevronRight } from "lucide-react";
import React, { useEffect, useState } from "react";
import Select, { type SingleValue, type StylesConfig } from "react-select";
import { toast } from "react-toastify";
import { useEnterAsTab } from "../../../hooks/useEnterAsTab";
import { useAltShortcuts } from "../../../hooks/useAltShortcuts";
import { useButtonPermissions } from "../../../hooks/useButtonPermissions";

const API_URL = `${import.meta.env.VITE_API_URL}/user-permission-cobranch`;
const USER_LIST_API_URL = `${import.meta.env.VITE_API_URL}/user-permission/users/list`;

// ============================================================
// TYPES
// ============================================================

interface SelectOption {
  value: string;
  label: string;
}

interface BranchNode {
  fbrid: string;
  fbrname: string;
  checked: boolean;
}

interface CompanyNode {
  fcoid: string;
  fconame: string;
  checked: boolean;
  children: BranchNode[];
}

interface PermissionInput {
  fcoid: string;
  fbrid: string;
}

interface ApiResponse {
  success: boolean;
  message?: string;
  data?: CompanyNode[];
}

// ============================================================
// BUTTON CLASS
// ============================================================

const buttonClass = `
  min-w-[110px]
  h-[40px]
  rounded-[4px]
  border
  border-[#9db8d4]
  bg-gradient-to-b
  from-[#ffffff]
  to-[#e7eef5]
  px-4
  text-[18px]
  shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]
  transition-colors
  duration-100
  text-transparent
  bg-clip-text
  bg-gradient-to-r
  from-green-800
  to-green-500
  hover:border-[#7f9fbd]
  hover:bg-gradient-to-b
  focus:border-[#20884e]
  focus:outline-none
  focus:ring-0
  hover:text-green-800
`;

// ============================================================
// USER ID SELECT STYLE
// Same box look/placeholder as Set Company Info's Company
// select (companySelectStyles there).
// ============================================================

const userIdSelectStyles: StylesConfig<SelectOption, false> = {
  control: (base) => ({
    ...base,
    minHeight: "28px",
    height: "28px",
    borderColor: "#d7dee7",
    borderRadius: "4px",
    boxShadow: "none",
    fontSize: "12px",
    cursor: "text",

    "&:hover": {
      borderColor: "#9fdfbc",
    },
  }),

  valueContainer: (base) => ({
    ...base,
    height: "28px",
    padding: "0 8px",
  }),

  singleValue: (base) => ({
    ...base,
    color: "#344054",
    fontSize: "12px",
  }),

  placeholder: (base) => ({
    ...base,
    color: "#808080",
    fontSize: "12px",
  }),

  input: (base) => ({
    ...base,
    margin: 0,
    padding: 0,
    fontSize: "12px",
    color: "#344054",
  }),

  indicatorsContainer: (base) => ({
    ...base,
    height: "28px",
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
    maxHeight: "200px",
    overflowY: "auto",
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
        result.push({ fcoid: company.fcoid, fbrid: branch.fbrid });
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

const UserPermissionCoBranchPage: React.FC = () => {
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

        const result: { success: boolean; data?: { fuserid: string }[] } =
          await response.json();

        if (response.ok && result.success) {
          setUserIdOptions(
            (result.data || []).map((row) => ({
              value: row.fuserid,
              label: row.fuserid,
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
  // With a user picked: GET /api/user-permission-cobranch/:lkpUserID
  //   -> the tree with that user's real grants checked.
  // With no user picked yet (id is blank, e.g. on page load):
  //   GET /api/user-permission-cobranch/structure
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
        Object.fromEntries(tree.map((company) => [company.fcoid, true]))
      );
    } catch (err) {
      console.error("Load user-permission-cobranch failed:", err);
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

  const toggleExpanded = (fcoid: string) => {
    setExpandedCompanies((previous) => ({
      ...previous,
      [fcoid]: !previous[fcoid],
    }));
  };

  // ==========================================================
  // COMPANY CHECKBOX - check/uncheck it and every branch
  // ==========================================================

  const toggleCompany = (fcoid: string, checked: boolean) => {
    setPermissionData((previous) =>
      previous.map((company) =>
        company.fcoid !== fcoid
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

  const toggleBranch = (fcoid: string, fbrid: string, checked: boolean) => {
    setPermissionData((previous) =>
      previous.map((company) => {
        if (company.fcoid !== fcoid) return company;

        const updatedChildren = company.children.map((branch) =>
          branch.fbrid === fbrid ? { ...branch, checked } : branch
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
  // PUT /api/user-permission-cobranch/:lkpUserID
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
      console.error("Save user-permission-cobranch failed:", err);

      toast.error(
        err instanceof Error ? err.message : "Failed to save permissions."
      );
    } finally {
      setSaving(false);
    }
  };

  // ==========================================================
  // DELETE
  // DELETE /api/user-permission-cobranch/:lkpUserID
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
      console.error("Delete user-permission-cobranch failed:", err);

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
      className="mt-25 flex items-center justify-center"
      onKeyDown={handleEnterAsTab}
    >
      <div className="mb-10 flex min-h-fit w-[calc(100%-32px)] max-w-[30%] min-w-100 flex-col border border-slate-400 bg-white pb-5 font-[Arial,Helvetica,sans-serif] text-[12px] text-gray-700">
        {/* TITLE */}
        <header className="flex h-9 shrink-0 items-center border-b border-slate-300 bg-[#a3dfc0]">
          <span className="px-5 text-[17px] font-semibold text-slate-700">
            User Permission - Branch
          </span>
        </header>

        {/* USER SELECT */}
        <section className="flex h-16.5 shrink-0 items-center gap-5 px-5.5">
          <label
            htmlFor="lkpUserID"
            className="w-18 shrink-0 text-[16px] text-slate-600"
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
          className="flex min-h-0 flex-1 flex-col px-4.75"
          id="trlBranches"
        >
          <div className="min-h-65 flex-1 overflow-auto border border-[#b8f0d0]">
            <table className="w-full table-fixed border-collapse">
              <colgroup>
                <col />
              </colgroup>

              <thead>
                <tr className="h-7.5 bg-[#ecfaf3]">
                  <th className="border-b border-[#b8f0d0] px-2.75 text-left text-[15px] font-normal text-slate-700">
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
                    <React.Fragment key={company.fcoid}>
                      {/* LEVEL 1: COMPANY */}
                      <tr className="h-7.25">
                        <td className="border-b border-[#b8f0d0] p-0">
                          <div className="flex h-7 items-center gap-2.25 px-2.5">
                            <button
                              type="button"
                              aria-label={
                                expandedCompanies[company.fcoid]
                                  ? `Collapse ${company.fconame}`
                                  : `Expand ${company.fconame}`
                              }
                              aria-expanded={!!expandedCompanies[company.fcoid]}
                              onClick={() => toggleExpanded(company.fcoid)}
                              className="flex h-5 w-5 shrink-0 items-center justify-center text-[12px] text-slate-600"
                            >
                              {expandedCompanies[company.fcoid] ? (
                                <ChevronDown color="green" />
                              ) : (
                                <ChevronRight color="green" />
                              )}
                            </button>

                            <input
                              id={`chk${company.fcoid}`}
                              name={`chk${company.fcoid}`}
                              type="checkbox"
                              checked={company.checked}
                              onChange={(event) =>
                                toggleCompany(
                                  company.fcoid,
                                  event.target.checked
                                )
                              }
                              className="h-4.25 w-4.25 shrink-0 cursor-pointer accent-[#69d875]"
                            />

                            <label
                              htmlFor={`chk${company.fcoid}`}
                              className="flex-1 cursor-pointer text-[15px]"
                            >
                              {company.fconame}
                            </label>
                          </div>
                        </td>
                      </tr>

                      {/* LEVEL 2: BRANCHES */}
                      {expandedCompanies[company.fcoid] &&
                        company.children.map((branch) => (
                          <tr key={branch.fbrid} className="h-7.25">
                            <td className="border-b border-[#b8f0d0] p-0">
                              <div className="ml-10.75 flex h-7 items-center gap-2.25 border-l border-[#b8f0d0] pl-1.5">
                                <input
                                  id={`chk${company.fcoid}_${branch.fbrid}`}
                                  name={`chk${company.fcoid}_${branch.fbrid}`}
                                  type="checkbox"
                                  checked={branch.checked}
                                  onChange={(event) =>
                                    toggleBranch(
                                      company.fcoid,
                                      branch.fbrid,
                                      event.target.checked
                                    )
                                  }
                                  className="h-4.25 w-4.25 shrink-0 cursor-pointer accent-[#69d875]"
                                />

                                <label
                                  htmlFor={`chk${company.fcoid}_${branch.fbrid}`}
                                  className="flex-1 cursor-pointer text-[15px]"
                                >
                                  {branch.fbrname}
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
        <footer className="flex min-h-19.25 -mb-6 shrink-0 flex-col items-center justify-center gap-1 px-4 py-2">
          <div className="flex flex-wrap items-center justify-center gap-3.75">
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
  );
};

export default UserPermissionCoBranchPage;
