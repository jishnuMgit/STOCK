import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  ChevronDown,
  ChevronRight,
  Menu,
  X,
  LogOut,
  Search,
} from "lucide-react";

import "./SideNav.css";
import { useLogout } from "../../hooks/useLogout";
import { useMenus } from "../../hooks/useMenus";
import { toast } from "react-toastify";

import type { MenuNode } from "../../types/menu";
import {
  buildMenuTree,
  filterMenuTree,
  collectIds,
  findAncestorIds,
} from "../../utils/buildMenuTree";
import {
  ADMINISTRATION_NODE,
  getMenuIcon,
  getMenuRoute,
} from "../../config/menuConfig";

/* =========================================================
   TYPES
========================================================= */

interface SideNavProps {
  activePath?: string;
  onNavigate?: (path: string) => void;
}

/* =========================================================
   COMPONENT
========================================================= */

export default function SideNav({
  activePath = "/dashboard",
  onNavigate,
}: SideNavProps) {
  const { logout, loading: logoutLoading } = useLogout();
  const navigate = useNavigate();
  const { menus, loading: menusLoading, error: menusError } = useMenus();

  /* =====================================================
     SIDEBAR STATE
  ===================================================== */

  const [collapsed, setCollapsed] = useState(false);
  const [searchText, setSearchText] = useState("");

  /* =====================================================
     MANUAL OPEN/CLOSE OVERRIDES

     Branches auto-open (active page, search matches) are
     derived below with useMemo, not stored in state — a
     useEffect that calls setState just to mirror other
     state triggers an extra cascading render.

     These two sets hold only the user's own clicks, and
     win over the derived auto-open state either way:
     `manuallyOpened` forces a branch open even if nothing
     else would open it, `manuallyClosed` forces one shut
     even if it would otherwise auto-open (e.g. collapsing
     the active branch, or a search match you don't want
     expanded).
  ===================================================== */

  const [manuallyOpened, setManuallyOpened] = useState<Set<string>>(
    () => new Set(),
  );
  const [manuallyClosed, setManuallyClosed] = useState<Set<string>>(
    () => new Set(),
  );

  /* =====================================================
     BUILD TREE FROM API ROWS

     Settings is a real tblmenu branch (fmenuid "91") and
     needs no special handling — it just comes through with
     everything else. Only "Administration" is injected
     client-side, and only for AU users. Hiding it here is a
     UX nicety only — the route itself (see AdminRoute) is
     what actually blocks non-admins from reaching it
     directly.
  ===================================================== */

  const userType = useMemo(() => localStorage.getItem("userType"), []);

  const menuTree = useMemo(() => {
    const tree = buildMenuTree(menus);

    if (userType === "AU") {
      tree.push(ADMINISTRATION_NODE);
    }

    return tree;
  }, [menus, userType]);

  const filteredTree = useMemo(
    () => filterMenuTree(menuTree, searchText),
    [menuTree, searchText],
  );

  /* =====================================================
     DERIVED AUTO-OPEN IDS

     - Ancestors of whichever node matches activePath, so
       the sidebar opens already showing where you are.
     - Every branch that survived the search filter, so
       matches at deep levels are visible without a click.
  ===================================================== */

  const activeAncestorIds = useMemo(
    () =>
      findAncestorIds(menuTree, (node) => getMenuRoute(node) === activePath),
    [menuTree, activePath],
  );

  const searchOpenIds = useMemo(
    () => (searchText.trim() ? collectIds(filteredTree) : []),
    [searchText, filteredTree],
  );

  const effectiveOpenIds = useMemo(() => {
    const ids = new Set([
      ...activeAncestorIds,
      ...searchOpenIds,
      ...manuallyOpened,
    ]);

    manuallyClosed.forEach((id) => ids.delete(id));

    return ids;
  }, [activeAncestorIds, searchOpenIds, manuallyOpened, manuallyClosed]);

  /* =====================================================
     TOGGLE MENU

     Flips against the CURRENT effective state (which may
     be open only because it auto-opened), recording the
     result as an explicit override.
  ===================================================== */

  const toggleMenu = (id: string) => {
    const isCurrentlyOpen = effectiveOpenIds.has(id);

    if (isCurrentlyOpen) {
      setManuallyClosed((current) => new Set(current).add(id));
      setManuallyOpened((current) => {
        const next = new Set(current);
        next.delete(id);
        return next;
      });
    } else {
      setManuallyOpened((current) => new Set(current).add(id));
      setManuallyClosed((current) => {
        const next = new Set(current);
        next.delete(id);
        return next;
      });
    }
  };

  /* =====================================================
     NAVIGATION
  ===================================================== */

  const handleNavigate = (node: MenuNode) => {
    const route = getMenuRoute(node);

    if (!route) {
      toast.info(`"${node.fmenucaption}" isn't available yet`);
      return;
    }

    if (onNavigate) {
      onNavigate(route);
      return;
    }

    navigate(route);
  };

  /* =====================================================
     CHECK ACTIVE (SELF OR ANY DESCENDANT)
  ===================================================== */

  const isNodeActive = (node: MenuNode): boolean => {
    if (getMenuRoute(node) === activePath) {
      return true;
    }

    return node.children.some(isNodeActive);
  };

  /* =====================================================
     RENDER A SINGLE MENU NODE (RECURSIVE)

     depth 0 -> top-level category, gets an icon
     depth 1+ -> nested rows, indented per depth
  ===================================================== */

  const renderNode = (node: MenuNode, depth: number) => {
    const hasChildren = node.children.length > 0;
    const isOpen = effectiveOpenIds.has(node.fmenuid);
    const isActive = isNodeActive(node);
    const route = getMenuRoute(node);
    const isDisabled = !hasChildren && !route;

    const rowClassName =
      depth === 0
        ? `menu-item ${isActive ? "menu-item-active" : ""}`
        : `submenu-item ${isActive ? "submenu-item-active" : ""} ${
            isDisabled ? "submenu-item-disabled" : ""
          }`;

    return (
      <div className="menu-group" key={node.fmenuid}>
        <button
          type="button"
          className={rowClassName}
          style={depth > 0 ? { paddingLeft: 16 + depth * 16 } : undefined}
          onClick={() => {
            if (hasChildren) {
              toggleMenu(node.fmenuid);
            } else {
              handleNavigate(node);
            }
          }}
          title={collapsed && depth === 0 ? node.fmenucaption : undefined}
        >
          {depth === 0 && (
            <span className="menu-icon">{getMenuIcon(node, depth)}</span>
          )}

          {depth > 0 && <span className="submenu-line" />}

          {(!collapsed || depth > 0) && (
            <>
              <span className={depth === 0 ? "menu-label" : "submenu-label"}>
                {node.fmenucaption}
              </span>

              {hasChildren && !collapsed && (
                <span className="menu-arrow">
                  {isOpen ? (
                    <ChevronDown size={15} />
                  ) : (
                    <ChevronRight size={15} />
                  )}
                </span>
              )}
            </>
          )}
        </button>

        {!collapsed && hasChildren && isOpen && (
          <div className="submenu">
            {node.children.map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  /* =====================================================
     RENDER
  ===================================================== */

  return (
    <aside className={`side-nav ${collapsed ? "side-nav-collapsed" : ""}`}>
      {/* =================================================
          HEADER
      ================================================= */}

      <div className="side-nav-header">
        <div className="brand">
          <div className="brand-logo">A</div>

          {!collapsed && (
            <div className="brand-text">
              <div className="brand-name">Accounts</div>
              <div className="brand-subtitle">Finance System</div>
            </div>
          )}
        </div>

        {!collapsed && (
          <button
            type="button"
            className="collapse-button"
            onClick={() => setCollapsed(true)}
            title="Collapse menu"
          >
            <X size={18} />
          </button>
        )}

        {collapsed && (
          <button
            type="button"
            className="collapse-button collapsed-menu-button cursor-pointer"
            onClick={() => setCollapsed(false)}
            title="Expand menu"
          >
            <Menu size={18} />
          </button>
        )}
      </div>

      {/* =================================================
          SEARCH
      ================================================= */}

      {!collapsed && (
        <div className="side-nav-search">
          <Search size={16} />

          <input
            type="text"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="Search menu..."
          />

          {searchText && (
            <button
              type="button"
              className="search-clear"
              onClick={() => setSearchText("")}
            >
              ×
            </button>
          )}

          {!searchText && <span>⌘ K</span>}
        </div>
      )}

      {/* =================================================
          MENU
      ================================================= */}

      <nav className="side-nav-menu">
        {!collapsed && <div className="menu-section-title">MAIN MENU</div>}

        {menusLoading && !collapsed && (
          <div className="menu-status">Loading menu...</div>
        )}

        {!menusLoading && menusError && !collapsed && (
          <div className="menu-status menu-status-error">{menusError}</div>
        )}

        {!menusLoading &&
          !menusError &&
          filteredTree.map((node) => renderNode(node, 0))}

        {!menusLoading && !menusError && !filteredTree.length && !collapsed && (
          <div className="menu-status">No menu items</div>
        )}
      </nav>

      {/* =================================================
          FOOTER
      ================================================= */}

      <div className="side-nav-footer">
        {!collapsed && (
          <div className="user-profile">
            <div className="user-avatar">
              {(localStorage.getItem("userId") ?? "AD")
                .slice(0, 2)
                .toUpperCase()}
            </div>

            <div className="user-info">
              <div className="user-name">
                {localStorage.getItem("userId") ?? "Administrator"}
              </div>
              <div className="user-role">
                {localStorage.getItem("userType") === "AU"
                  ? "Administrator"
                  : "System User"}
              </div>
            </div>

            <button
              type="button"
              className="logout-button"
              title="Logout"
              disabled={logoutLoading}
              onClick={async () => {
                const success = await logout();

                if (!success) {
                  toast.error("Logout failed");
                  return;
                }

                toast.success("Logged out successfully");
                navigate("/login", { replace: true });
              }}
            >
              <LogOut size={16} />
            </button>
          </div>
        )}

        {collapsed && (
          <button
            type="button"
            className="collapsed-logout"
            title="Logout"
            onClick={async () => {
              const success = await logout();

              if (!success) {
                toast.error("Logout failed");
                return;
              }

              toast.success("Logged out successfully");
              navigate("/login", { replace: true });
            }}
          >
            <LogOut size={18} />
          </button>
        )}
      </div>
    </aside>
  );
}
