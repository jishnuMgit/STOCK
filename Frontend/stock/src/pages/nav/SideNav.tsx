import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, X, Search } from "lucide-react";

import "./SideNav.css";
import type { MenuNode } from "../../types/menu";
import {
  filterMenuTree,
  collectIds,
  findAncestorIds,
} from "../../utils/buildMenuTree";
import { getMenuRoute } from "../../config/menuConfig";
import { isNodeActive } from "../../utils/menuActive";

interface SideNavProps {
  parent: MenuNode; // main menu (shown as the small section label)
  root: MenuNode; // clicked submenu (shown as the title)
  activePath: string;
  onNavigate: (node: MenuNode) => void;
  onClose: () => void;
}

export default function SideNav({
  parent,
  root,
  activePath,
  onNavigate,
  onClose,
}: SideNavProps) {
  const [searchText, setSearchText] = useState("");
  const [manuallyOpened, setManuallyOpened] = useState<Set<string>>(
    () => new Set(),
  );
  const [manuallyClosed, setManuallyClosed] = useState<Set<string>>(
    () => new Set(),
  );

  const filteredChildren = useMemo(
    () => filterMenuTree(root.children, searchText),
    [root, searchText],
  );

  const activeAncestorIds = useMemo(
    () =>
      findAncestorIds(
        root.children,
        (node) => getMenuRoute(node) === activePath,
      ),
    [root, activePath],
  );

  const searchOpenIds = useMemo(
    () => (searchText.trim() ? collectIds(filteredChildren) : []),
    [searchText, filteredChildren],
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

  /* depth 1 = direct children of the section title */
  const renderNode = (node: MenuNode, depth: number) => {
    const hasChildren = node.children.length > 0;
    const isOpen = effectiveOpenIds.has(node.fmenuid);
    const isActive = isNodeActive(node, activePath);
    const isDisabled = !hasChildren && !getMenuRoute(node);

    return (
      <div className="menu-group" key={node.fmenuid}>
        <button
          type="button"
          className={`submenu-item ${isActive ? "submenu-item-active" : ""} ${
            isDisabled ? "submenu-item-disabled" : ""
          }`}
          style={{ paddingLeft: 16 + (depth - 1) * 16 }}
          onClick={() =>
            hasChildren ? toggleMenu(node.fmenuid) : onNavigate(node)
          }
        >
          <span className="submenu-line" />
          <span className="submenu-label">{node.fmenucaption}</span>

          {hasChildren && (
            <span className="menu-arrow">
              {isOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
            </span>
          )}
        </button>

        {hasChildren && isOpen && (
          <div className="submenu">
            {node.children.map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <aside className="side-nav">
      <div className="side-nav-header">
        <div className="brand-text">
          <div className="brand-subtitle">{parent.fmenucaption}</div>
          <div className="brand-name">{root.fmenucaption}</div>
        </div>

        <button
          type="button"
          className="collapse-button"
          onClick={onClose}
          title="Close menu"
        >
          <X size={18} />
        </button>
      </div>

      <div className="side-nav-search">
        <Search size={16} />
        <input
          type="text"
          value={searchText}
          onChange={(event) => setSearchText(event.target.value)}
          placeholder={`Search in ${root.fmenucaption}...`}
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
      </div>

      <nav className="side-nav-menu">
        {filteredChildren.map((node) => renderNode(node, 1))}

        {!filteredChildren.length && (
          <div className="menu-status">No menu items</div>
        )}
      </nav>
    </aside>
  );
}
