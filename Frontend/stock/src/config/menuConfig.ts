import React from "react";
import {
  Folder,
  ShoppingCart,
  TrendingUp,
  Wallet,
  Settings,
  Wrench,
  Lock,
  ShieldCheck,
} from "lucide-react";
import type { MenuNode } from "../types/menu";

/* =========================================================
   ROUTE MAP

   Keyed by fmenuname (the stable, non-localized column),
   confirmed against the real GET /api/menu response.

   Only entries listed here are clickable — anything else
   renders as a disabled row ("isn't available yet"), since
   tblmenu covers far more modules than currently have pages
   built. Fill this in as pages ship.

   Still unresolved (no obvious counterpart in the real data,
   not guessed):
     - SetCompanyInfo  (no "Company Info" row exists at all)
     - Transaction-matching / Transaction-unmatching
       (mnuFinDocPost / mnuFinDocUnPost are Document
       Post/UnPost, a different feature)
========================================================= */

export const menuRouteMap: Record<string, string> = {
  // Finance (fmenuid 11)
  mnuReceipt: "/Transaction/Receipt",
  mnuJournal: "/Transaction/journal",
  mnuCustomer: "/Transaction/CustomerPage",
  mnuRptSOA: "/reports/soa",

  // Setting (fmenuid 91)
  mnuSetDocumentNo: "/Settings/SetDocumentNo",

  mnuAdministration: "/Administration",
};

/* =========================================================
   ADMINISTRATION (synthetic node)

   Not a row in tblmenu — injected into the tree at render
   time in SideNav, only when the logged-in user's userType
   is "AU". Defined here, next to the route/icon maps, so
   there's one place that owns everything about this entry.

   fmenuid "99" is out of tblmenu's real id space (real
   top-level ids are 2 digits starting at "01"), chosen so
   it can never collide with a real menu row.
========================================================= */

export const ADMINISTRATION_NODE: MenuNode = {
  fmenuid: "99",
  fmenuname: "mnuAdministration",
  fmenucaption: "Administration",
  fmenubuttons: "0",
  children: [],
};

/* =========================================================
   ICON MAP

   Only applied at depth 0 (top-level categories). Keyed by
   fmenuname, matched against the real top-level rows seen
   so far: Purchase (01), Sales (02), Finance (11),
   Setting (91), Utility (92), Security (93). Falls back to
   a generic folder icon for anything not listed — add an
   entry here the first time a new top-level category shows
   up in a menu response.
========================================================= */

const topLevelIconMap: Record<string, React.ReactNode> = {
  mnuPurchase: React.createElement(ShoppingCart, { size: 18 }),
  mnuSales: React.createElement(TrendingUp, { size: 18 }),
  mnuFinance: React.createElement(Wallet, { size: 18 }),
  mnu91Setting: React.createElement(Settings, { size: 18 }),
  mnuTools: React.createElement(Wrench, { size: 18 }), // caption: "Utility"
  mnuSecurity: React.createElement(Lock, { size: 18 }),
  mnuAdministration: React.createElement(ShieldCheck, { size: 18 }),
};

const defaultTopLevelIcon = React.createElement(Folder, { size: 18 });

export function getMenuIcon(node: MenuNode, depth: number): React.ReactNode {
  if (depth !== 0) {
    return null;
  }

  return topLevelIconMap[node.fmenuname] ?? defaultTopLevelIcon;
}

export function getMenuRoute(node: MenuNode): string | undefined {
  return menuRouteMap[node.fmenuname];
}
