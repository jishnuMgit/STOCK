import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  LayoutDashboard,
  Receipt,
  FileText,
  Wallet,
  Landmark,
  Users,
  Package,
  BarChart3,
  Settings,
  ChevronDown,
  ChevronRight,
  Menu,
  X,
  LogOut,
  Search,
} from "lucide-react";

import "./SideNav.css";

/* =========================================================
   TYPES
========================================================= */

interface MenuChild {
  label: string;
  path: string;
}

interface MenuItem {
  label: string;
  icon: React.ReactNode;
  path?: string;
  children?: MenuChild[];
}

interface SideNavProps {
  activePath?: string;
  onNavigate?: (path: string) => void;
}

/* =========================================================
   MENU ITEMS
========================================================= */

const menuItems: MenuItem[] = [
  {
    label: "Dashboard",
    icon: <LayoutDashboard size={18} />,
    path: "/dashboard",
  },

  /* =====================================================
     TRANSACTIONS
  ===================================================== */

  {
    label: "Transactions",
    icon: <Receipt size={18} />,
    children: [
      {
        label: "Receipt ",
        path: "/Transaction/Receipt",
      },
       {
        label: "Payment ",
        path: "/Transaction/payment",
      },
      {
        label: "Journal ",
        path: "/Transaction/journal",
      },
      {
        label: "Match ",
        path: "/Transaction/Transaction-match",
      },
      {
        label: "Un-Match ",
        path: "/Transaction/Transaction-Un-match",
      },
      {

        label: "Debit Note",
        path: "/Transaction/debit-note",
      },
      {
        label: "Credit Note",
        path: "/Transaction/credit-note",
      },

       {
        label: "Document Print",
        path: "/Transaction/document-print",
      },
       {
        label: "Document post",
        path: "/Transaction/document-post",
      },
       {
        label: "Document Un-Post",
        path: "/Transaction/document-unpost",
      },
       {
        label: "Bank Reconciliation",
        path: "/Transaction/bank-reconciliation",
      },
       {
        label: "Beginning Balance",
        path: "/Transaction/beginning-balance",
      },


    
    ],
  },

  /* =====================================================
     ACCOUNTS
  ===================================================== */

  {
    label: "Accounts",
    icon: <Wallet size={18} />,
    children: [
      {
        label: "Account Heads",
        path: "/accounts",
      },
      {
        label: "Ledger",
        path: "/ledger",
      },
      {
        label: "Trial Balance",
        path: "/trial-balance",
      },
    ],
  },

  /* =====================================================
     BANKING
  ===================================================== */

  {
    label: "Banking",
    icon: <Landmark size={18} />,
    children: [
      {
        label: "Bank Accounts",
        path: "/bank-accounts",
      },
      {
        label: "Bank Reconciliation",
        path: "/bank-reconciliation",
      },
    ],
  },

  /* =====================================================
     CUSTOMERS
  ===================================================== */

  {
    label: "Customers",
    icon: <Users size={18} />,
    children: [
      {
        label: "Customer",
        path: "/Transaction/CustomerPage",
      },
      {
        label: "Customer Ledger",
        path: "/customer-ledger",
      },
    ],
  },

  /* =====================================================
     INVENTORY
  ===================================================== */

  {
    label: "Inventory",
    icon: <Package size={18} />,
    children: [
      {
        label: "Items",
        path: "/items",
      },
      {
        label: "Stock",
        path: "/stock",
      },
      {
        label: "Stock Ledger",
        path: "/stock-ledger",
      },
    ],
  },

  /* =====================================================
     REPORTS
  ===================================================== */

  {
    label: "Reports",
    icon: <BarChart3 size={18} />,
    children: [
      {
        label: "Statement Of Account",
        path: "/reports/soa",
      },
      {
        label: "General Ledger",
        path: "/general-ledger",
      },
      {
        label: "Profit & Loss",
        path: "/profit-loss",
      },
      {
        label: "Balance Sheet",
        path: "/balance-sheet",
      },
    ],
  },

  /* =====================================================
     DOCUMENTS
  ===================================================== */

  {
    label: "Documents",
    icon: <FileText size={18} />,
    children: [
      {
        label: "Documents",
        path: "/documents",
      },
      {
        label: "Attachments",
        path: "/attachments",
      },
    ],
  },

  /* =====================================================
     SETTINGS
  ===================================================== */

  {
    label: "Settings",
    icon: <Settings size={18} />,
     children: [
      {
        label: "Set Company Info",
        path: "/Settings/SetCompanyInfo",
      },
       {
        label: "Set Document No",
        path: "/Settings/SetDocumentNo",
      }
    ],
  },
];

/* =========================================================
   COMPONENT
========================================================= */

export default function SideNav({
  activePath = "/receipt",
  onNavigate,
}: SideNavProps) {
  const navigate = useNavigate();

  /* =====================================================
     SIDEBAR STATE
  ===================================================== */

  const [collapsed, setCollapsed] =
    useState(false);

  /* =====================================================
     OPEN MENUS

     Transactions is open initially.
  ===================================================== */

  const [openMenus, setOpenMenus] =
    useState<string[]>([
      "Transactions",
    ]);

  /* =====================================================
     SEARCH
  ===================================================== */

  const [searchText, setSearchText] =
    useState("");

  /* =====================================================
     TOGGLE MENU

     OPEN  -> CLOSE
     CLOSE -> OPEN
  ===================================================== */

  const toggleMenu = (label: string) => {
    setOpenMenus((current) => {
      if (current.includes(label)) {
        return current.filter(
          (item) => item !== label
        );
      }

      return [
        ...current,
        label,
      ];
    });
  };

  /* =====================================================
     NAVIGATION
  ===================================================== */

  const handleNavigate = (
    path: string
  ) => {
    if (onNavigate) {
      onNavigate(path);
      return;
    }

    navigate(path);
  };

  /* =====================================================
     CHECK PARENT ACTIVE
  ===================================================== */

  const isParentActive = (
    item: MenuItem
  ) => {
    if (item.path) {
      return item.path === activePath;
    }

    return item.children?.some(
      (child) =>
        child.path === activePath
    );
  };

  /* =====================================================
     FILTER MENU

     Search parent and child names.
  ===================================================== */

  <button
            type="button"
            className="collapse-button collapsed-menu-button cursor-pointer"
            onClick={() =>
              setCollapsed(false)
            }
            title="Expand menu"
          >
            <Menu size={18} />
          </button>
  const filteredMenuItems =
    menuItems.filter((item) => {
      const search =
        searchText
          .trim()
          .toLowerCase();

      if (!search) {
        return true;
      }

      if (
        item.label
          .toLowerCase()
          .includes(search)
      ) {
        return true;
      }

      return item.children?.some(
        (child) =>
          child.label
            .toLowerCase()
            .includes(search)
      );
    });

  /* =====================================================
     AUTO OPEN SEARCH MATCH
  ===================================================== */

  React.useEffect(() => {
    if (!searchText.trim()) {
      return;
    }

    const matchingParents =
      menuItems
        .filter((item) =>
          item.children?.some(
            (child) =>
              child.label
                .toLowerCase()
                .includes(
                  searchText
                    .trim()
                    .toLowerCase()
                )
          )
        )
        .map((item) => item.label);

    if (matchingParents.length) {
      setOpenMenus((current) => [
        ...new Set([
          ...current,
          ...matchingParents,
        ]),
      ]);
    }
  }, [searchText]);

  /* =====================================================
     RENDER
  ===================================================== */

  return (
    <aside
      className={`side-nav ${
        collapsed
          ? "side-nav-collapsed"
          : ""
      }`}
    >
      {/* =================================================
          HEADER
      ================================================= */}

      <div className="side-nav-header">
        <div className="brand">
          <div className="brand-logo">
            A
          </div>

          {!collapsed && (
            <div className="brand-text">
              <div className="brand-name">
                Accounts
              </div>

              <div className="brand-subtitle">
                Finance System
              </div>
            </div>
          )}
        </div>

        {!collapsed && (
          <button
            type="button"
            className="collapse-button"
            onClick={() =>
              setCollapsed(true)
            }
            title="Collapse menu"
          >
            <X size={18} />
          </button>
        )}

        {collapsed && (
          <button
            type="button"
            className="collapse-button collapsed-menu-button cursor-pointer"
            onClick={() =>
              setCollapsed(false)
            }
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
            onChange={(event) =>
              setSearchText(
                event.target.value
              )
            }
            placeholder="Search menu..."
          />

          {searchText && (
            <button
              type="button"
              className="search-clear"
              onClick={() =>
                setSearchText("")
              }
            >
              ×
            </button>
          )}

          {!searchText && (
            <span>⌘ K</span>
          )}
        </div>
      )}

      {/* =================================================
          MENU
      ================================================= */}

      <nav className="side-nav-menu">
        {!collapsed && (
          <div className="menu-section-title">
            MAIN MENU
          </div>
        )}

        {filteredMenuItems.map(
          (item) => {
            const hasChildren =
              !!item.children?.length;

            const isOpen =
              openMenus.includes(
                item.label
              );

            const isActive =
              isParentActive(item);

            return (
              <div
                className="menu-group"
                key={item.label}
              >
                {/* =========================================
                    PARENT ITEM
                ========================================= */}

                <button
                  type="button"
                  className={`menu-item ${
                    isActive
                      ? "menu-item-active"
                      : ""
                  }`}
                  onClick={() => {
                    if (hasChildren) {
                      toggleMenu(
                        item.label
                      );
                    } else if (
                      item.path
                    ) {
                      handleNavigate(
                        item.path
                      );
                    }
                  }}
                  title={
                    collapsed
                      ? item.label
                      : undefined
                  }
                >
                  <span className="menu-icon">
                    {item.icon}
                  </span>

                  {!collapsed && (
                    <>
                      <span className="menu-label">
                        {item.label}
                      </span>

                      {hasChildren && (
                        <span className="menu-arrow">
                          {isOpen ? (
                            <ChevronDown
                              size={15}
                            />
                          ) : (
                            <ChevronRight
                              size={15}
                            />
                          )}
                        </span>
                      )}
                    </>
                  )}
                </button>

                {/* =========================================
                    CHILDREN
                ========================================= */}

                {!collapsed &&
                  hasChildren &&
                  isOpen && (
                    <div className="submenu">
                      {item.children!.map(
                        (child) => {
                          const childActive =
                            activePath ===
                            child.path;

                          return (
                            <button
                              type="button"
                              key={
                                child.path
                              }
                              className={`submenu-item ${
                                childActive
                                  ? "submenu-item-active"
                                  : ""
                              }`}
                              onClick={() =>
                                handleNavigate(
                                  child.path
                                )
                              }
                            >
                              <span className="submenu-line" />

                              <span className="submenu-label">
                                {
                                  child.label
                                }
                              </span>
                            </button>
                          );
                        }
                      )}
                    </div>
                  )}
              </div>
            );
          }
        )}
      </nav>

      {/* =================================================
          FOOTER
      ================================================= */}

      <div className="side-nav-footer">
        {!collapsed && (
          <div className="user-profile">
            <div className="user-avatar">
              AD
            </div>

            <div className="user-info">
              <div className="user-name">
                Administrator
              </div>

              <div className="user-role">
                System User
              </div>
            </div>

            <button
              type="button"
              className="logout-button"
              title="Logout"
              onClick={() => {
                console.log(
                  "Logout clicked"
                );
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
            onClick={() => {
              console.log(
                "Logout clicked"
              );
            }}
          >
            <LogOut size={18} />
          </button>
        )}
      </div>
    </aside>
  );
}