import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, ChevronRight, LogOut } from "lucide-react";
import { toast } from "react-toastify";

import "./TopNav.css";
import { useLogout } from "../../hooks/useLogout";
import { getMenuIcon, getMenuRoute } from "../../config/menuConfig";
import { isNodeActive } from "../../utils/menuActive";
import type { MenuNode } from "../../types/menu";

interface TopNavProps {
  menuTree: MenuNode[];
  loading: boolean;
  error?: string | null;
  activePath: string;
  activeSectionId?: string;
  onSelectSection: (parent: MenuNode, node: MenuNode) => void;
  onNavigateLeaf: (node: MenuNode) => void;
}

export default function TopNav({
  menuTree,
  loading,
  error,
  activePath,
  activeSectionId,
  onSelectSection,
  onNavigateLeaf,
}: TopNavProps) {
  const navigate = useNavigate();
  const { logout, loading: logoutLoading } = useLogout();

  const [openId, setOpenId] = useState<string | null>(null);
  const navRef = useRef<HTMLElement>(null);

  /* close dropdown on outside click / Escape */
  useEffect(() => {
    if (!openId) return;

    const onMouseDown = (event: MouseEvent) => {
      if (!navRef.current?.contains(event.target as Node)) setOpenId(null);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenId(null);
    };

    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [openId]);

  const handleTopClick = (node: MenuNode) => {
    if (node.children.length === 0) {
      setOpenId(null);
      onNavigateLeaf(node);
      return;
    }
    setOpenId((current) => (current === node.fmenuid ? null : node.fmenuid));
  };

  const handleChildClick = (parent: MenuNode, child: MenuNode) => {
    setOpenId(null);

    if (child.children.length > 0) {
      onSelectSection(parent, child); // opens the sidebar
    } else {
      onNavigateLeaf(child);
    }
  };

  const handleLogout = async () => {
    const success = await logout();

    if (!success) {
      toast.error("Logout failed");
      return;
    }

    toast.success("Logged out successfully");
    navigate("/login", { replace: true });
  };

  const userId = localStorage.getItem("userID");

  return (
    <header className="top-nav">
      <nav className="top-nav-menu" ref={navRef}>
        {loading && <span className="top-nav-status">Loading menu...</span>}
        {!loading && error && (
          <span className="top-nav-status top-nav-status-error">{error}</span>
        )}

        {!loading &&
          !error &&
          menuTree.map((node) => {
            const hasChildren = node.children.length > 0;
            const isOpen = openId === node.fmenuid;
            const isActive = isNodeActive(node, activePath);

            return (
              <div className="top-nav-item" key={node.fmenuid}>
                <button
                  type="button"
                  className={`top-nav-button ${
                    isActive ? "top-nav-button-active" : ""
                  } ${isOpen ? "top-nav-button-open" : ""}`}
                  onClick={() => handleTopClick(node)}
                  aria-haspopup={hasChildren || undefined}
                  aria-expanded={hasChildren ? isOpen : undefined}
                >
                  <span className="top-nav-icon">{getMenuIcon(node, 0)}</span>
                  <span>{node.fmenucaption}</span>
                  {hasChildren && <ChevronDown size={14} />}
                </button>

                {isOpen && (
                  <div className="top-nav-dropdown" role="menu">
                    {node.children.map((child) => {
                      const childHasChildren = child.children.length > 0;
                      const disabled =
                        !childHasChildren && !getMenuRoute(child);

                      return (
                        <button
                          type="button"
                          role="menuitem"
                          key={child.fmenuid}
                          className={`top-nav-dropdown-item ${
                            isNodeActive(child, activePath)
                              ? "top-nav-dropdown-item-active"
                              : ""
                          } ${
                            activeSectionId === child.fmenuid
                              ? "top-nav-dropdown-item-selected"
                              : ""
                          } ${disabled ? "top-nav-dropdown-item-disabled" : ""}`}
                          onClick={() => handleChildClick(node, child)}
                        >
                          <span>{child.fmenucaption}</span>
                          {childHasChildren && <ChevronRight size={14} />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
      </nav>

      <div className="top-nav-user">
        <div className="user-avatar">
          {(userId ?? "AD").slice(0, 2).toUpperCase()}
        </div>
        <div className="user-info">
          <div className="user-name">{userId ?? "Administrator"}</div>
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
          onClick={handleLogout}
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
}
