import React, { useCallback, useEffect, useState } from "react";
import Select, { type SingleValue, type StylesConfig } from "react-select";
import { toast } from "react-toastify";
import { useEnterAsTab } from "../../../hooks/useEnterAsTab";
import { useAltShortcuts } from "../../../hooks/useAltShortcuts";
import { useButtonPermissions } from "../../../hooks/useButtonPermissions";

const API_URL = `${import.meta.env.VITE_API_URL}/user-permission`;

// ============================================================
// TYPES
// ============================================================

interface SelectOption {
  value: string;
  label: string;
}

interface PermissionNode {
  lkpMenuID: string;
  txtMenuName: string | null;
  txtMenuCaption: string;
  txtMenuButtons: string | null;
  lkpUserID: string;
  txtUserButtons: string | number | null;
  lkpParentMenuID: string;
  txtRight: number | string;
  children: PermissionNode[];
}

interface PermissionInput {
  lkpMenuID: string;
  txtUserButtons: string;
}

interface ApiResponse {
  success: boolean;
  message?: string;
  data?: PermissionNode[] | PermissionNode;
}

interface MenuRowProps {
  node: PermissionNode;
  depth: number;
  expanded: Set<string>;
  onExpand: (lkpMenuID: string) => void;
  onToggleMenu: (lkpMenuID: string, checked: boolean) => void;
  onToggleButton: (
    lkpMenuID: string,
    buttonCode: string,
    checked: boolean
  ) => void;
}

// ============================================================
// USER ID SELECT STYLE
// Same box look/placeholder as the Company select on
// Settings/SetCompanyInfo (companySelectStyles there).
// ============================================================

const userIdSelectStyles: StylesConfig<SelectOption, false> = {
  container: (base) => ({
    ...base,
    width: "min(340px, 55%)",
  }),

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
// BUTTON DEFINITIONS
// Order matches the original WinForms implementation.
// ============================================================

const PERMISSION_BUTTONS: Record<string, string> = {
  S: "Save",
  M: "Modify",
  F: "Find",
  D: "Delete",
  P: "Print",
  T: "Post",
  O: "One Branch",
  A: "All Branch",
  N: "Print DN",
  E: "E-Invoice",
};

// ============================================================
// HELPERS
// ============================================================

function getUserButtons(node: PermissionNode): string {
  const value = String(node.txtUserButtons ?? "").trim();

  return value === "0" ? "" : value;
}

function isMenuChecked(node: PermissionNode): boolean {
  return (
    Number(node.txtRight) > 0 ||
    getUserButtons(node).length > 0
  );
}

function isButtonChecked(
  node: PermissionNode,
  buttonCode: string
): boolean {
  return getUserButtons(node).includes(buttonCode);
}

// Only show action checkboxes supported by txtMenuButtons.
function getAvailableButtons(node: PermissionNode): string[] {
  const available = String(node.txtMenuButtons ?? "").trim();

  return Object.keys(PERMISSION_BUTTONS).filter((code) =>
    available.includes(code)
  );
}

// A menu can be expanded if it has child menus or action buttons.
function isExpandable(node: PermissionNode): boolean {
  return (
    node.children.length > 0 ||
    getAvailableButtons(node).length > 0
  );
}

function normalizeTree(data: unknown): PermissionNode[] {
  if (!Array.isArray(data)) return [];

  return data.map((item) => {
    const node = item as Partial<PermissionNode>;

    return {
      lkpMenuID: String(node.lkpMenuID ?? ""),
      txtMenuName: node.txtMenuName ?? null,
      txtMenuCaption: String(node.txtMenuCaption ?? ""),
      txtMenuButtons: node.txtMenuButtons ?? null,
      lkpUserID: String(node.lkpUserID ?? ""),
      txtUserButtons: node.txtUserButtons ?? "0",
      lkpParentMenuID: String(node.lkpParentMenuID ?? ""),
      txtRight: node.txtRight ?? 0,
      children: normalizeTree(node.children),
    };
  });
}

// ============================================================
// UPDATE MENU AND ALL DESCENDANT MENUS
//
// Menu checkbox selection cascades to descendant menus.
// txtUserButtons is populated using each menu's own
// txtMenuButtons definition.
// ============================================================

function setSubtreeChecked(
  node: PermissionNode,
  checked: boolean
): PermissionNode {
  const buttons = checked
    ? getAvailableButtons(node).join("")
    : "";

  return {
    ...node,
    txtUserButtons: buttons || "0",
    txtRight: checked ? 1 : 0,
    children: node.children.map((child) =>
      setSubtreeChecked(child, checked)
    ),
  };
}

function updateSubtree(
  nodes: PermissionNode[],
  lkpMenuID: string,
  checked: boolean
): PermissionNode[] {
  return nodes.map((node) => {
    if (node.lkpMenuID === lkpMenuID) {
      return setSubtreeChecked(node, checked);
    }

    return {
      ...node,
      children: updateSubtree(
        node.children,
        lkpMenuID,
        checked
      ),
    };
  });
}

// ============================================================
// UPDATE ONE ACTION CHECKBOX
//
// Example:
// txtMenuButtons = "SMDPT"
// txtUserButtons = "SMP"
//
// Unchecking Print changes SMP to SM.
// Checking Delete changes SMP to SMPD.
// ============================================================

function updateAction(
  nodes: PermissionNode[],
  lkpMenuID: string,
  buttonCode: string,
  checked: boolean
): PermissionNode[] {
  return nodes.map((node) => {
    if (node.lkpMenuID === lkpMenuID) {
      const available = getAvailableButtons(node);

      // Never add an action that the menu does not support.
      if (!available.includes(buttonCode)) {
        return node;
      }

      let buttons = getUserButtons(node);

      if (checked) {
        if (!buttons.includes(buttonCode)) {
          buttons += buttonCode;
        }
      } else {
        buttons = buttons
          .split("")
          .filter((code) => code !== buttonCode)
          .join("");
      }

      // Keep selected codes in the original WinForms order.
      buttons = available
        .filter((code) => buttons.includes(code))
        .join("");

      return {
        ...node,
        txtUserButtons: buttons || "0",
        txtRight: buttons ? 1 : 0,
      };
    }

    return {
      ...node,
      children: updateAction(
        node.children,
        lkpMenuID,
        buttonCode,
        checked
      ),
    };
  });
}

// ============================================================
// SYNC PARENT MENU CHECKBOXES
//
// Parent menu checkbox is checked when at least one of its
// child menus is checked. This does not change the individual
// action permission strings of those children.
// ============================================================

function syncParentChecks(
  nodes: PermissionNode[]
): PermissionNode[] {
  return nodes.map((node) => {
    const children = syncParentChecks(node.children);

    if (children.length === 0) {
      return { ...node, children };
    }

    const anyChildChecked = children.some(isMenuChecked);

    return {
      ...node,
      children,
      txtRight: anyChildChecked ? 1 : 0,
    };
  });
}

// ============================================================
// FLATTEN PERMISSIONS FOR SAVE API
// ============================================================

function flattenSelected(
  nodes: PermissionNode[],
  result: PermissionInput[] = []
): PermissionInput[] {
  nodes.forEach((node) => {
    const buttons = getUserButtons(node);

    if (isMenuChecked(node) || buttons.length > 0) {
      result.push({
        lkpMenuID: node.lkpMenuID,
        txtUserButtons: buttons || "0",
      });
    }

    flattenSelected(node.children, result);
  });

  return result;
}

// ============================================================
// CLEAR ALL PERMISSIONS
// ============================================================

function clearTree(nodes: PermissionNode[]): PermissionNode[] {
  return nodes.map((node) => ({
    ...node,
    txtUserButtons: "0",
    txtRight: 0,
    children: clearTree(node.children),
  }));
}

// ============================================================
// MENU ROW
// ============================================================

function MenuRow({
  node,
  depth,
  expanded,
  onExpand,
  onToggleMenu,
  onToggleButton,
}: MenuRowProps) {
  const hasChildren = node.children.length > 0;
  const isExpanded = expanded.has(node.lkpMenuID);
  const availableButtons = getAvailableButtons(node);
  const expandable = isExpandable(node);

  const menuLabel =
    node.txtMenuCaption || node.txtMenuName || node.lkpMenuID;

  return (
    <>
      {/* Main menu row */}
      <div
        role="row"
        className="grid min-h-[24px] grid-cols-[23px_minmax(250px,1fr)] border-b border-[#C1F2D7] bg-[#eff7ff]"
      >
        <div
          role="gridcell"
          className="border-r border-[#C1F2D7]"
        />

        <div
          role="gridcell"
          className="flex min-h-[23px] min-w-0 items-center gap-[14px] py-[2px] pr-2"
          style={{
            paddingLeft: `${28 + depth * 36}px`,
          }}
        >
          {expandable ? (
            <button
              type="button"
              aria-label={
                isExpanded ? "Collapse menu" : "Expand menu"
              }
              aria-expanded={isExpanded}
              onClick={() => onExpand(node.lkpMenuID)}
              className="flex h-[18px] w-[13px] shrink-0 items-center justify-center bg-transparent p-0 text-[#7891a9] focus-visible:outline-2 focus-visible:outline-blue-400"
            >
              <span
                className={`inline-block text-[18px] leading-none ${
                  isExpanded ? "rotate-90" : "rotate-0"
                }`}
              >
                ›
              </span>
            </button>
          ) : (
            <span className="w-[13px] shrink-0" />
          )}

          <input
            type="checkbox"
            checked={isMenuChecked(node)}
            onChange={(event) =>
              onToggleMenu(
                node.lkpMenuID,
                event.target.checked
              )
            }
            aria-label={`Permission for ${menuLabel}`}
            className="h-[14px] w-[14px] shrink-0 cursor-pointer accent-emerald-600 focus-visible:outline-2 focus-visible:outline-blue-400"
          />

          <span className="min-w-0 break-words text-[13px] leading-[18px] text-slate-700">
            {menuLabel}
          </span>
        </div>
      </div>

      {/* Action checkbox rows (Save, Modify, Delete, Print, ...) */}
      {isExpanded &&
        availableButtons.map((buttonCode) => (
          <div
            key={`${node.lkpMenuID}-${buttonCode}`}
            role="row"
            className="grid min-h-[24px] grid-cols-[23px_minmax(250px,1fr)] border-b border-[#C1F2D7] bg-[#eff7ff]"
          >
            <div
              role="gridcell"
              className="border-r border-[#C1F2D7]"
            />

            <div
              role="gridcell"
              className="flex min-h-[23px] items-center gap-[14px] py-[2px] pr-2"
              style={{
                paddingLeft: `${28 + (depth + 1) * 36}px`,
              }}
            >
              {/* Align action rows with the menu tree */}
              <span className="w-[13px] shrink-0" />

              <input
                type="checkbox"
                checked={isButtonChecked(node, buttonCode)}
                onChange={(event) =>
                  onToggleButton(
                    node.lkpMenuID,
                    buttonCode,
                    event.target.checked
                  )
                }
                aria-label={`${PERMISSION_BUTTONS[buttonCode]} permission for ${menuLabel}`}
                className="h-[14px] w-[14px] shrink-0 cursor-pointer accent-emerald-600 focus-visible:outline-2 focus-visible:outline-blue-400"
              />

              <span className="min-w-0 break-words text-[13px] leading-[18px] text-slate-700">
                {PERMISSION_BUTTONS[buttonCode]}
              </span>
            </div>
          </div>
        ))}

      {/* Actual child menus */}
      {hasChildren &&
        isExpanded &&
        node.children.map((child) => (
          <MenuRow
            key={child.lkpMenuID}
            node={child}
            depth={depth + 1}
            expanded={expanded}
            onExpand={onExpand}
            onToggleMenu={onToggleMenu}
            onToggleButton={onToggleButton}
          />
        ))}
    </>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

// dbo.tblmenu fmenuid for the User Permission - Menu page.
const MENU_ID = "9302";

const UserPermission: React.FC = () => {
  const perms = useButtonPermissions(MENU_ID);
  const handleEnterAsTab = useEnterAsTab();

  // no user is selected when the page opens
  const [lkpUserID, setLkpUserID] = useState("");

  const [userIdOptions, setUserIdOptions] = useState<SelectOption[]>([]);
  const [loadingUserIdOptions, setLoadingUserIdOptions] = useState(true);

  const [menuTree, setMenuTree] = useState<PermissionNode[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(
    new Set()
  );
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // ==========================================================
  // LOAD PERMISSIONS
  // With a user picked: GET /api/user-permission/:lkpUserID
  // With no user yet:   GET /api/user-permission/structure
  //   (the full menu tree, everything unchecked)
  // ==========================================================

  const loadPermissions = useCallback(async (id: string) => {
    const PstrCoID = localStorage.getItem("PstrCoID");

    if (!PstrCoID) {
      setMenuTree([]);
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

      if (!response.ok || result.success === false) {
        throw new Error(
          result.message || "Failed to load permissions."
        );
      }

      const tree = syncParentChecks(
        normalizeTree(result.data)
      );

      setMenuTree(tree);

      // Expand top-level menus by default.
      setExpanded(
        new Set(
          tree
            .filter((node) => node.children.length > 0)
            .map((node) => node.lkpMenuID)
        )
      );
    } catch (err) {
      console.error("Load permissions failed:", err);
      setMenuTree([]);

      toast.error(
        err instanceof Error
          ? err.message
          : "Failed to load permissions."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPermissions(lkpUserID);
  }, [loadPermissions, lkpUserID]);

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
          `${API_URL}/users/list?PstrCoID=${encodeURIComponent(PstrCoID)}`
        );

        const result: {
          success: boolean;
          data?: { lkpUserID: string }[];
        } = await response.json();

        if (!response.ok || !result.success) {
          return;
        }

        setUserIdOptions(
          (result.data || []).map((row) => ({
            value: row.lkpUserID,
            label: row.lkpUserID,
          }))
        );
      } catch (err) {
        console.error("Load user ID list failed:", err);
      } finally {
        setLoadingUserIdOptions(false);
      }
    };

    loadUserIdList();
  }, []);

  // ==========================================================
  // EXPAND / COLLAPSE
  // ==========================================================

  const handleExpand = (lkpMenuID: string) => {
    setExpanded((previous) => {
      const next = new Set(previous);

      if (next.has(lkpMenuID)) {
        next.delete(lkpMenuID);
      } else {
        next.add(lkpMenuID);
      }

      return next;
    });
  };

  // ==========================================================
  // MENU CHECKBOX
  // ==========================================================

  const handleToggleMenu = (
    lkpMenuID: string,
    checked: boolean
  ) => {
    setMenuTree((previous) => {
      const updated = updateSubtree(
        previous,
        lkpMenuID,
        checked
      );

      return syncParentChecks(updated);
    });
  };

  // ==========================================================
  // ACTION CHECKBOX
  // ==========================================================

  const handleToggleButton = (
    lkpMenuID: string,
    buttonCode: string,
    checked: boolean
  ) => {
    setMenuTree((previous) =>
      syncParentChecks(
        updateAction(
          previous,
          lkpMenuID,
          buttonCode,
          checked
        )
      )
    );
  };

  // ==========================================================
  // SAVE
  // PUT /api/user-permission/:lkpUserID
  // ==========================================================

  const handleSave = async () => {
    if (!perms.save) {
      toast.error("You do not have permission to Save.");
      return;
    }

    if (!lkpUserID.trim()) {
      toast.warning("Please enter a user ID.");
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
      const permissions = flattenSelected(menuTree);

      const response = await fetch(
        `${API_URL}/${encodeURIComponent(lkpUserID.trim())}`,
        {
          method: "PUT",
          credentials: "include", // the server checks the session, idle and rights
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ PstrCoID, PstrYear, PstrUserID, permissions }),
        }
      );

      const result: ApiResponse = await response.json();

      if (!response.ok || result.success === false) {
        throw new Error(
          result.message || "Failed to save permissions."
        );
      }

      toast.success(
        result.message || "Permissions saved successfully."
      );
    } catch (err) {
      console.error("Save permissions failed:", err);

      toast.error(
        err instanceof Error
          ? err.message
          : "Failed to save permissions."
      );
    } finally {
      setSaving(false);
    }
  };

  // ==========================================================
  // DELETE
  // DELETE /api/user-permission/:lkpUserID
  // ==========================================================

  const handleDelete = async () => {
    if (!perms.delete) {
      toast.error("You do not have permission to Delete.");
      return;
    }

    if (!lkpUserID.trim()) {
      toast.warning("Please enter a user ID.");
      return;
    }

    const PstrCoID = localStorage.getItem("PstrCoID");
    const PstrYear = localStorage.getItem("PstrYear");
    const PstrUserID = localStorage.getItem("PstrUserID");

    if (!PstrCoID || !PstrYear || !PstrUserID) {
      toast.error("Company ID / Year / User ID not found. Please log in again.");
      return;
    }

    if (
      !window.confirm(
        `Delete all permissions for ${lkpUserID}?`
      )
    ) {
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

      if (!response.ok || result.success === false) {
        throw new Error(
          result.message || "Failed to delete permissions."
        );
      }

      setMenuTree((previous) => clearTree(previous));

      toast.success(
        result.message || "Permissions deleted successfully."
      );
    } catch (err) {
      console.error("Delete permissions failed:", err);

      toast.error(
        err instanceof Error
          ? err.message
          : "Failed to delete permissions."
      );
    } finally {
      setSaving(false);
    }
  };

  // ==========================================================
  // CLEAR
  // ==========================================================

  const handleClear = () => {
    setMenuTree((previous) => clearTree(previous));
  };

  // ==========================================================
  // KEYBOARD SHORTCUTS
  // Alt+S -> Save, Alt+C -> Clear (matches the underlined
  // accelerator letters on the buttons).
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
      <main className="flex w-[calc(100%-32px)] max-w-[1000px] flex-col border border-slate-400 bg-white text-[12px] text-gray-700 shadow-sm">
        {/* Title */}
        <div className="flex h-[28px] w-full shrink-0 items-center bg-[#a7dfc0]">
          <h1 className="ml-[5px] text-[17px] font-semibold text-[#374151]">
            User Permission - Menu
          </h1>
        </div>

        {/* Form */}
        <div className="p-[12px] m-[12px]">

        {/* User ID */}
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void loadPermissions(lkpUserID);
          }}
          className="mb-[8px] flex shrink-0 flex-wrap items-center gap-[15px]"
        >
          <label
            htmlFor="lkpUserID"
            className="shrink-0 pr-3 text-right text-[14px] text-gray-600"
          >
            User ID :
          </label>

          <Select<SelectOption, false>
            inputId="lkpUserID"
            name="lkpUserID"
            options={userIdOptions}
            value={
              userIdOptions.find((option) => option.value === lkpUserID) || null
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
        </form>

        {/* Menu tree */}
        <section
        id="trlMenu"
          role="grid"
          aria-label="Menu permissions"
          className="flex max-h-[65vh] min-h-[200px] w-full flex-col overflow-auto border border-[#C1F2D7]"
        >
          <div
            role="row"
            className="sticky top-0 z-10 grid h-[30px] shrink-0 grid-cols-[23px_minmax(250px,1fr)] border-b border-[#C1F2D7] bg-[#eef9f3]"
          >
            <div className="border-r border-[#C1F2D7]" />

            <div className="flex items-center px-[7px] text-[14px] text-gray-600">
              Menu
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-[70px] items-center justify-center text-slate-500">
              Loading permissions...
            </div>
          ) : menuTree.length === 0 ? (
            <div className="flex min-h-[70px] items-center justify-center text-slate-500">
              No menu permissions found.
            </div>
          ) : (
            menuTree.map((node) => (
              <MenuRow
                key={node.lkpMenuID}
                node={node}
                depth={0}
                expanded={expanded}
                onExpand={handleExpand}
                onToggleMenu={handleToggleMenu}
                onToggleButton={handleToggleButton}
              />
            ))
          )}
        </section>

        {/* Action buttons */}
        <footer className="mt-[14px] flex shrink-0 justify-center gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || loading || !perms.save}
            className="btn-style disabled:cursor-not-allowed disabled:opacity-40"
          >
            <span className="underline underline-offset-2">S</span>ave
          </button>

          <button
            type="button"
            onClick={handleDelete}
            disabled={saving || loading || !perms.delete}
            className="btn-style disabled:cursor-not-allowed disabled:opacity-40"
          >
            <span className="underline underline-offset-2">D</span>elete
          </button>

          <button
            type="button"
            onClick={handleClear}
            disabled={saving || loading}
            className="btn-style disabled:cursor-not-allowed disabled:opacity-40"
          >
            <span className="underline underline-offset-2">C</span>lear
          </button>
        </footer>

        </div>
      </main>
    </div>
  );
};

export default UserPermission;