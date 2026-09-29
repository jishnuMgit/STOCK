
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
  onToggle: (menuId: string, checked: boolean) => void;
}

// ============================================================
// HELPERS
// ============================================================

function isChecked(node: PermissionNode): boolean {
  const buttons = String(node.fuserbuttons ?? "0").trim();
  return buttons !== "" && buttons !== "0";
}

// Return the button permissions when a menu is checked.
function getCheckedButtons(node: PermissionNode): string {
  const buttons = String(node.fmenubuttons ?? "").trim();

  return buttons !== "" && buttons !== "0" ? buttons : "S";
}

// Normalize API response into a nested tree.
function normalizeTree(data: unknown): PermissionNode[] {
  if (!Array.isArray(data)) {
    return [];
  }

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
// CHECK / UNCHECK A NODE AND ALL ITS DESCENDANTS
// ============================================================

function setSubtreeChecked(
  node: PermissionNode,
  checked: boolean
): PermissionNode {
  return {
    ...node,
    fuserbuttons: checked ? getCheckedButtons(node) : "0",
    children: node.children.map((child) =>
      setSubtreeChecked(child, checked)
    ),
  };
}

// Find a node and apply the selection to its entire subtree.
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
      children: updateSubtree(node.children, menuId, checked),
    };
  });
}

// ============================================================
// SYNCHRONIZE PARENT CHECKBOXES
//
// If every child is checked, check the parent.
// If even one child is unchecked, uncheck the parent.
// The same rule applies recursively to every ancestor.
// ============================================================

function syncParentChecks(
  nodes: PermissionNode[]
): PermissionNode[] {
  return nodes.map((node) => {
    // First synchronize the descendants.
    const children = syncParentChecks(node.children);

    // A leaf keeps its own checkbox state.
    if (children.length === 0) {
      return {
        ...node,
        children,
      };
    }

    // A parent is checked only when all its children are checked.
    const allChildrenChecked = children.every(isChecked);

    return {
      ...node,
      children,
      fuserbuttons: allChildrenChecked
        ? getCheckedButtons(node)
        : "0",
    };
  });
}

// ============================================================
// FLATTEN SELECTED PERMISSIONS FOR THE API
// ============================================================

function flattenSelected(
  nodes: PermissionNode[],
  result: PermissionInput[] = []
): PermissionInput[] {
  nodes.forEach((node) => {
    if (isChecked(node)) {
      result.push({
        menuId: node.fmenuid,
        buttons: String(node.fuserbuttons),
      });
    }

    flattenSelected(node.children, result);
  });

  return result;
}

// ============================================================
// CLEAR ALL CHECKBOXES
// ============================================================

function clearTree(nodes: PermissionNode[]): PermissionNode[] {
  return nodes.map((node) => ({
    ...node,
    fuserbuttons: "0",
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
  onToggle,
}: MenuRowProps) {
  const hasChildren = node.children.length > 0;
  const isExpanded = expanded.has(node.fmenuid);

  return (
    <>
      <div
        role="row"
        className="grid min-h-[24px] grid-cols-[23px_minmax(250px,1fr)] border-b border-[#b8ebd0]"
      >
        {/* Left gutter */}
        <div
          role="gridcell"
          className="border-r border-[#b8ebd0]"
        />

        {/* Menu cell */}
        <div
          role="gridcell"
          className="flex min-h-[23px] min-w-0 items-center gap-[5px] py-[2px] pr-2"
          style={{
            paddingLeft: `${8 + depth * 26}px`,
          }}
        >
          {/* Expand / collapse */}
          {hasChildren ? (
            <button
              type="button"
              aria-label={
                isExpanded ? "Collapse menu" : "Expand menu"
              }
              aria-expanded={isExpanded}
              onClick={() => onExpand(node.fmenuid)}
              className="flex h-[18px] w-[13px] shrink-0 items-center justify-center border-0 bg-transparent p-0 text-[#7891a9] focus-visible:outline-2 focus-visible:outline-blue-400"
            >
              <span
                className={`inline-block text-[18px] leading-none transition-transform duration-100 ${
                  isExpanded ? "rotate-90" : "rotate-0"
                }`}
              >
                ›
              </span>
            </button>
          ) : (
            <span className="w-[13px] shrink-0" />
          )}

          {/* Permission checkbox */}
          <input
            type="checkbox"
            checked={isChecked(node)}
            onChange={(event) =>
              onToggle(node.fmenuid, event.target.checked)
            }
            aria-label={`Permission for ${
              node.fmenuname ?? node.fmenucaption
            }`}
            className="h-[14px] w-[14px] shrink-0 cursor-pointer accent-[#66ce70] focus-visible:outline-2 focus-visible:outline-blue-400"
          />

          {/* Menu caption */}
          <span className="min-w-0 break-words text-[12px] leading-[18px] text-gray-700">
            {node.fmenucaption || node.fmenuname}
          </span>
        </div>
      </div>

      {/* Child menus */}
      {hasChildren &&
        isExpanded &&
        node.children.map((child) => (
          <MenuRow
            key={child.fmenuid}
            node={child}
            depth={depth + 1}
            expanded={expanded}
            onExpand={onExpand}
            onToggle={onToggle}
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
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);

  // ==========================================================
  // GET PERMISSIONS
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

      // Normalize the returned tree and synchronize parent states.
      const tree = syncParentChecks(normalizeTree(result.data));

      setMenuTree(tree);

      // Expand the first level by default.
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
  // CHECKBOX HANDLER
  //
  // 1. Toggle the selected node and all descendants.
  // 2. Recalculate every parent and ancestor.
  // ==========================================================

  const handleToggle = (
    menuId: string,
    checked: boolean
  ) => {
    setMenuTree((previous) => {
      const updated = updateSubtree(previous, menuId, checked);

      return syncParentChecks(updated);
    });

    setMessage("");
    setError(false);
  };

  // ==========================================================
  // SAVE PERMISSIONS
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
  // DELETE PERMISSIONS
  // DELETE /api/user-permission/:userId
  // ==========================================================

  const handleDelete = async () => {
    if (!userId.trim()) {
      setMessage("Please enter a user ID.");
      setError(true);
      return;
    }

    if (!window.confirm(`Delete all permissions for ${userId}?`)) {
      return;
    }

    setSaving(true);
    setMessage("");
    setError(false);

    try {
      const response = await fetch(
        `${API_URL}/${encodeURIComponent(userId.trim())}`,
        {
          method: "DELETE",
        }
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
  // CLEAR CHECKBOXES WITHOUT SAVING
  // ==========================================================

  const handleClear = () => {
    setMenuTree((previous) => clearTree(previous));
    setMessage("");
    setError(false);
  };

  // ==========================================================
  // USER INPUT
  // ==========================================================

  const handleUserSubmit = (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    void loadPermissions(userId);
  };

  // ==========================================================
  // UI
  // ==========================================================

  return (
    <div className="flex justify-center">
      <main className="mb-10 min-h-fit w-[50%] border border-slate-400 bg-white pb-5 font-[Arial,Helvetica,sans-serif] text-[12px] text-gray-700 max-[900px]:w-[95%]">
        {/* Title */}
        <div className="flex h-[36px] items-center border-b border-slate-300 bg-[#a3dfc0]">
          <span className="px-6 text-[17px] font-semibold text-slate-700">
            User Permission - Menu
          </span>
        </div>

        {/* User ID */}
        <form
          onSubmit={handleUserSubmit}
          className="flex min-h-[55px] flex-wrap items-center gap-[15px] px-4 pb-2 pt-[13px]"
        >
          <label
            htmlFor="permission-user-id"
            className="shrink-0 rounded-[4px] px-1 py-[5px] text-[14px] text-gray-800 shadow-sm"
          >
            User ID :
          </label>

          <input
            id="permission-user-id"
            value={userId}
            onChange={(event) => setUserId(event.target.value)}
            list="permission-user-options"
            autoComplete="off"
            className="h-[26px] w-[min(340px,55%)] rounded-[2px] border border-slate-300 bg-white px-[10px] py-[3px] text-[12px] text-gray-800 outline-none focus:border-blue-400"
          />

          <datalist id="permission-user-options">
            <option
              value={localStorage.getItem("pstrUSerID") || "ADMIN"}
            />
          </datalist>

          <button
            type="submit"
            disabled={loading || saving}
            className="h-[26px] rounded-[3px] border border-[#a9c5dd] bg-[#edf3f8] px-3 text-gray-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Load
          </button>
        </form>

        {/* Status message */}
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

        {/* Permission table */}
        <section
          role="grid"
          aria-label="Menu permissions"
          className="mx-[17px] w-[calc(100%-34px)] overflow-x-auto border border-[#b8ebd0]"
        >
          {/* Table header */}
          <div
            role="row"
            className="grid h-[24px] grid-cols-[23px_minmax(250px,1fr)] border-b border-[#b8ebd0] bg-[#effbf5]"
          >
            <div
              role="columnheader"
              className="border-r border-[#b8ebd0]"
            />

            <div
              role="columnheader"
              className="px-[7px] py-1 text-gray-700"
            >
              Menu
            </div>
          </div>

          {/* Table body */}
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
                onToggle={handleToggle}
              />
            ))
          )}
        </section>

        {/* Action buttons */}
        <footer className="flex items-center justify-center gap-[13px] px-3 pt-[10px] max-[600px]:gap-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || loading}
            className="h-10 w-[108px] rounded-[4px] border border-[#9eb8d2] bg-gradient-to-b from-white to-[#e5edf4] text-[14px] text-green-700 shadow-sm hover:from-[#f8fbff] hover:to-[#d9e7f3] disabled:cursor-not-allowed disabled:opacity-60 max-[600px]:max-w-[108px] max-[600px]:flex-1"
          >
            <span className="underline underline-offset-2">
              {saving ? "Saving..." : "Save"}
            </span>
          </button>

          <button
            type="button"
            onClick={handleDelete}
            disabled={saving || loading}
            className="h-10 w-[108px] rounded-[4px] border border-[#9eb8d2] bg-gradient-to-b from-white to-[#e5edf4] text-[14px] text-green-700 shadow-sm hover:from-[#f8fbff] hover:to-[#d9e7f3] disabled:cursor-not-allowed disabled:opacity-60 max-[600px]:max-w-[108px] max-[600px]:flex-1"
          >
            <span className="underline underline-offset-2">
              Delete
            </span>
          </button>

          <button
            type="button"
            onClick={handleClear}
            disabled={saving || loading}
            className="h-10 w-[108px] rounded-[4px] border border-[#9eb8d2] bg-gradient-to-b from-white to-[#e5edf4] text-[14px] text-green-700 shadow-sm hover:from-[#f8fbff] hover:to-[#d9e7f3] disabled:cursor-not-allowed disabled:opacity-60 max-[600px]:max-w-[108px] max-[600px]:flex-1"
          >
            <span className="underline underline-offset-2">
              Clear
            </span>
          </button>
        </footer>
      </main>
    </div>
  );
};

export default UserPermission;