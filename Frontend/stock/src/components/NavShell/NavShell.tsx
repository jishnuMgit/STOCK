import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

import TopNav from "../TopNav/TopNav"; 
import SideNav from "../../pages/nav/SideNav";
import { useMenuTree } from "../../hooks/useMenuTree";
import { getMenuRoute } from "../../config/menuConfig";
import type { MenuNode } from "../../types/menu";

interface Section {
  parent: MenuNode; // main menu, e.g. Finance
  node: MenuNode; // clicked submenu, e.g. Transaction
}

export default function NavShell({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { menuTree, loading, error } = useMenuTree();

  const [section, setSection] = useState<Section | null>(null);

  // returns true if navigation actually happened
  const handleNavigate = (node: MenuNode): boolean => {
    const route = getMenuRoute(node);

    if (!route) {
      toast.info(`"${node.fmenucaption}" isn't available yet`);
      return false;
    }

    navigate(route);
    return true;
  };

  return (
    <div className="app-shell">
      <TopNav
        menuTree={menuTree}
        loading={loading}
        error={error}
        activePath={pathname}
        activeSectionId={section?.node.fmenuid}
        onSelectSection={(parent, node) => setSection({ parent, node })}
        onNavigateLeaf={(node) => {
          // leaf picked from the top bar -> no sidebar needed
          if (handleNavigate(node)) setSection(null);
        }}
      />

      <div className="app-shell-body">
        {section && (
          <SideNav
            key={section.node.fmenuid} // remount => resets search + manual open/close
            parent={section.parent}
            root={section.node}
            activePath={pathname}
            onNavigate={handleNavigate}
            onClose={() => setSection(null)}
          />
        )}

        <main className="app-shell-main">{children}</main>
      </div>
    </div>
  );
}
