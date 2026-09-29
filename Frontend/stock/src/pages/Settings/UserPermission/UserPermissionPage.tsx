import React, { useCallback, useEffect, useState } from "react";

const API_URL = `${import.meta.env.VITE_API_URL}/user-permission`;

// ============================================================
// TYPES
// ============================================================

interface PermissionNode {
  fmenuid: string;
  fmenuname: string | null;
  fmenucaption: string;
  fmenubuttons: string | null;
  fuserid: string;
  fuserbuttons: string | number | null;
  fparentid: string;
  fright: number | string;
  children: PermissionNode[];
}

interface PermissionInput {
  menuId: string;
  buttons: string;
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
  onExpand: (menuId: string) => void;
  onToggleMenu: (menuId: string, checked: boolean) => void;
  onToggleButton: (
    menuId: string,
    buttonCode: string,
    checked: boolean
  ) => void;
}

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
  const value = String(node.fuserbuttons ?? "").trim();

  return value === "0" ? "" : value;
}

function isMenuChecked(node: PermissionNode): boolean {
  return (
    Number(node.fright) > 0 ||
    getUserButtons(node).length > 0
  );
}

function isButtonChecked(
  node: PermissionNode,
  buttonCode: string
): boolean {
  return getUserButtons(node).includes(buttonCode);
}

// Only show action checkboxes supported by fmenubuttons.
function getAvailableButtons(node: PermissionNode): string[] {
  const available = String(node.fmenubuttons ?? "").trim();

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
      fmenuid: String(node.fmenuid ?? ""),
      fmenuname: node.fmenuname ?? null,
      fmenucaption: String(node.fmenucaption ?? ""),
      fmenubuttons: node.fmenubuttons ?? null,
      fuserid: String(node.fuserid ?? ""),
      fuserbuttons: node.fuserbuttons ?? "0",
      fparentid: String(node.fparentid ?? ""),
      fright: node.fright ?? 0,
      children: normalizeTree(node.children),
    };
  });
}

// ============================================================
// UPDATE MENU AND ALL DESCENDANT MENUS
//
// Menu checkbox selection cascades to descendant menus.
// fuserbuttons is populated using each menu's own
// fmenubuttons definition.
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
    fuserbuttons: buttons || "0",
    fright: checked ? 1 : 0,
    children: node.children.map((child) =>
      setSubtreeChecked(child, checked)
    ),
  };
}

function updateSubtree(
  nodes: PermissionNode[],
  menuId: string,
  checked: boolean
): PermissionNode[] {
  return nodes.map((node) => {
    if (node.fmenuid === menuId) {
      return setSubtreeChecked(node, checked);
    }

    return {
      ...node,
      children: updateSubtree(
        node.children,
        menuId,
        checked
      ),
    };
  });
}

// ============================================================
// UPDATE ONE ACTION CHECKBOX
//
// Example:
// fmenubuttons = "SMDPT"
// fuserbuttons = "SMP"
//
// Unchecking Print changes SMP to SM.
// Checking Delete changes SMP to SMPD.
// ============================================================

function updateAction(
  nodes: PermissionNode[],
  menuId: string,
  buttonCode: string,
  checked: boolean
): PermissionNode[] {
  return nodes.map((node) => {
    if (node.fmenuid === menuId) {
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
        fuserbuttons: buttons || "0",
        fright: buttons ? 1 : 0,
      };
    }

    return {
      ...node,
      children: updateAction(
        node.children,
        menuId,
        buttonCode,
        checked
      ),
    };
  });
}

// ============================================================
// SYNC PARENT MENU CHECKBOXES
//
// Parent menu checkbox is checked when all its child menus
// are checked. This does not change the individual action
// permission strings of those children.
// ============================================================

function syncParentChecks(
  nodes: PermissionNode[]
): PermissionNode[] {
  return nodes.map((node) => {
    const children = syncParentChecks(node.children);

    if (children.length === 0) {
      return { ...node, children };
    }

    const allChildrenChecked = children.every(isMenuChecked);

    return {
      ...node,
      children,
      fright: allChildrenChecked ? 1 : 0,
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
        menuId: node.fmenuid,
        buttons: buttons || "0",
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
    fuserbuttons: "0",
    fright: 0,
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
  const isExpanded = expanded.has(node.fmenuid);
  const availableButtons = getAvailableButtons(node);
  const expandable = isExpandable(node);

  const menuLabel =
    node.fmenucaption || node.fmenuname || node.fmenuid;

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
          className="flex min-h-[23px] min-w-0 items-center gap-[5px] py-[2px] pr-2"
          style={{
            paddingLeft: `${8 + depth * 26}px`,
          }}
        >
          {expandable ? (
            <button
              type="button"
              aria-label={
                isExpanded ? "Collapse menu" : "Expand menu"
              }
              aria-expanded={isExpanded}
              onClick={() => onExpand(node.fmenuid)}
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
                node.fmenuid,
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
            key={`${node.fmenuid}-${buttonCode}`}
            role="row"
            className="grid min-h-[24px] grid-cols-[23px_minmax(250px,1fr)] border-b border-[#C1F2D7] bg-[#eff7ff]"
          >
            <div
              role="gridcell"
              className="border-r border-[#C1F2D7]"
            />

            <div
              role="gridcell"
              className="flex min-h-[23px] items-center gap-[5px] py-[2px] pr-2"
              style={{
                paddingLeft: `${8 + (depth + 1) * 26}px`,
              }}
            >
              {/* Align action rows with the menu tree */}
              <span className="w-[13px] shrink-0" />

              <input
                type="checkbox"
                checked={isButtonChecked(node, buttonCode)}
                onChange={(event) =>
                  onToggleButton(
                    node.fmenuid,
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
            key={child.fmenuid}
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

const UserPermission: React.FC = () => {
  const [userId, setUserId] = useState(
    () => localStorage.getItem("pstrUSerID") || "ADMIN"
  );

  const [menuTree, setMenuTree] = useState<PermissionNode[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(
    new Set()
  );
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);

  // ==========================================================
  // LOAD PERMISSIONS
  // GET /api/user-permission/:userId
  // ==========================================================

  const loadPermissions = useCallback(async (id: string) => {
    if (!id.trim()) {
      setMenuTree([]);
      setMessage("Please enter a user ID.");
      setError(true);
      return;
    }

    setLoading(true);
    setMessage("");
    setError(false);

    try {
      const response = await fetch(
        `${API_URL}/${encodeURIComponent(id.trim())}`
      );

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
            .map((node) => node.fmenuid)
        )
      );
    } catch (err) {
      console.error("Load permissions failed:", err);
      setMenuTree([]);

      setMessage(
        err instanceof Error
          ? err.message
          : "Failed to load permissions."
      );
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPermissions(userId);
  }, [loadPermissions, userId]);

  // ==========================================================
  // EXPAND / COLLAPSE
  // ==========================================================

  const handleExpand = (menuId: string) => {
    setExpanded((previous) => {
      const next = new Set(previous);

      if (next.has(menuId)) {
        next.delete(menuId);
      } else {
        next.add(menuId);
      }

      return next;
    });
  };

  // ==========================================================
  // MENU CHECKBOX
  // ==========================================================

  const handleToggleMenu = (
    menuId: string,
    checked: boolean
  ) => {
    setMenuTree((previous) => {
      const updated = updateSubtree(
        previous,
        menuId,
        checked
      );

      return syncParentChecks(updated);
    });

    setMessage("");
    setError(false);
  };

  // ==========================================================
  // ACTION CHECKBOX
  // ==========================================================

  const handleToggleButton = (
    menuId: string,
    buttonCode: string,
    checked: boolean
  ) => {
    setMenuTree((previous) =>
      syncParentChecks(
        updateAction(
          previous,
          menuId,
          buttonCode,
          checked
        )
      )
    );

    setMessage("");
    setError(false);
  };

  // ==========================================================
  // SAVE
  // PUT /api/user-permission/:userId
  // ==========================================================

  const handleSave = async () => {
    if (!userId.trim()) {
      setMessage("Please enter a user ID.");
      setError(true);
      return;
    }

    setSaving(true);
    setMessage("");
    setError(false);

    try {
      const permissions = flattenSelected(menuTree);

      const response = await fetch(
        `${API_URL}/${encodeURIComponent(userId.trim())}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ permissions }),
        }
      );

      const result: ApiResponse = await response.json();

      if (!response.ok || result.success === false) {
        throw new Error(
          result.message || "Failed to save permissions."
        );
      }

      setMessage(
        result.message || "Permissions saved successfully."
      );
    } catch (err) {
      console.error("Save permissions failed:", err);

      setMessage(
        err instanceof Error
          ? err.message
          : "Failed to save permissions."
      );
      setError(true);
    } finally {
      setSaving(false);
    }
  };

  // ==========================================================
  // DELETE
  // DELETE /api/user-permission/:userId
  // ==========================================================

  const handleDelete = async () => {
    if (!userId.trim()) {
      setMessage("Please enter a user ID.");
      setError(true);
      return;
    }

    if (
      !window.confirm(
        `Delete all permissions for ${userId}?`
      )
    ) {
      return;
    }

    setSaving(true);
    setMessage("");
    setError(false);

    try {
      const response = await fetch(
        `${API_URL}/${encodeURIComponent(userId.trim())}`,
        { method: "DELETE" }
      );

      const result: ApiResponse = await response.json();

      if (!response.ok || result.success === false) {
        throw new Error(
          result.message || "Failed to delete permissions."
        );
      }

      setMenuTree((previous) => clearTree(previous));

      setMessage(
        result.message || "Permissions deleted successfully."
      );
    } catch (err) {
      console.error("Delete permissions failed:", err);

      setMessage(
        err instanceof Error
          ? err.message
          : "Failed to delete permissions."
      );
      setError(true);
    } finally {
      setSaving(false);
    }
  };

  // ==========================================================
  // CLEAR
  // ==========================================================

  const handleClear = () => {
    setMenuTree((previous) => clearTree(previous));
    setMessage("");
    setError(false);
  };

  // ==========================================================
  // UI
  // ==========================================================

  return (
    <div className="flex justify-center">
      <main className="mb-10 flex min-h-fit w-[calc(100%-32px)] max-w-[1200px] flex-col border border-slate-400 bg-white pb-5 font-[Arial,Helvetica,sans-serif] text-[12px] text-gray-700">
        {/* Title */}
        <div className="flex h-[36px] shrink-0 items-center border-b border-slate-300 bg-[#a3dfc0]">
          <span className="px-5 text-[17px] font-semibold text-slate-700">
            User Permission - Menu
          </span>
        </div>

        {/* User ID */}
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void loadPermissions(userId);
          }}
          className="flex min-h-[55px] shrink-0 flex-wrap items-center gap-[15px] px-4 pb-2 pt-[13px]"
        >
          <label
            htmlFor="permission-user-id"
            className="shrink-0 rounded-[4px] px-1 py-[5px] text-[14px] text-gray-800 shadow-sm"
          >
            User ID :
          </label>

          <input
            id="lkpUserID"
            value={userId}
            onChange={(event) => setUserId(event.target.value)}
            autoComplete="off"
            className="h-[26px] w-[min(340px,55%)] rounded-[2px] border border-slate-300 bg-white px-[10px] py-[3px] text-[12px] text-gray-800 outline-none focus:border-blue-400"
          />
        </form>

        {/* Status */}
        {message && (
          <div
            role="status"
            className={`mx-[17px] mb-2 rounded-[3px] border px-[10px] py-[7px] ${
              error
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-green-200 bg-green-50 text-green-800"
            }`}
          >
            {message}
          </div>
        )}

        {/* Menu tree */}
        <section
        id="trlMenu"
          role="grid"
          aria-label="Menu permissions"
          className="mx-[17px] flex max-h-[65vh] min-h-[200px] flex-col overflow-auto border border-[#C1F2D7]"
        >
          <div
            role="row"
            className="sticky top-0 z-10 grid h-[24px] shrink-0 grid-cols-[23px_minmax(250px,1fr)] border-b border-[#C1F2D7] bg-[#eaf5ff]"
          >
            <div className="border-r border-[#C1F2D7]" />

            <div className="px-[7px] py-1 text-gray-700">
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
                key={node.fmenuid}
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
        <footer className="flex shrink-0 items-center justify-center gap-[13px] px-3 pt-[10px] max-[600px]:gap-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || loading}
            className="h-10 w-[108px] rounded-[4px] border border-[#9eb8d2] bg-gradient-to-b from-white to-[#e5edf4] text-[14px] text-green-700 shadow-sm hover:from-[#f8fbff] hover:to-[#d9e7f3] disabled:cursor-not-allowed disabled:opacity-60 max-[600px]:flex-1"
          >
            <span className="underline underline-offset-2">
             S
            </span>ave
          </button>

          <button
            type="button"
            onClick={handleDelete}
            disabled={saving || loading}
            className="h-10 w-[108px] rounded-[4px] border border-[#9eb8d2] bg-gradient-to-b from-white to-[#e5edf4] text-[14px] text-green-700 shadow-sm hover:from-[#f8fbff] hover:to-[#d9e7f3] disabled:cursor-not-allowed disabled:opacity-60 max-[600px]:flex-1"
          >
            <span className="underline underline-offset-2">
              D
            </span>elete
          </button>

          <button
            type="button"
            onClick={handleClear}
            disabled={saving || loading}
            className="h-10 w-[108px] rounded-[4px] border border-[#9eb8d2] bg-gradient-to-b from-white to-[#e5edf4] text-[14px] text-green-700 shadow-sm hover:from-[#f8fbff] hover:to-[#d9e7f3] disabled:cursor-not-allowed disabled:opacity-60 max-[600px]:flex-1"
          >
            <span className="underline underline-offset-2">
              C
            </span>lear
          </button>
        </footer>
      </main>
    </div>
  );
};

export default UserPermission;