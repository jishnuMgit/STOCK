import React from "react";
import {
  Folder,
  ShoppingCart,
  Receipt,
  FileText,
  Wallet,
  Landmark,
  Users,
  Package,
  BarChart3,
  Settings,
} from "lucide-react";
import type { MenuNode } from "../types/menu";

/* =========================================================
   ROUTE MAP

   Keyed by fmenuname (the stable, non-localized column).
   tblmenu currently has 111 rows covering modules that
   mostly aren't built as pages yet, so this map is
   intentionally sparse: only entries listed here are
   clickable, everything else renders as a disabled row.

   Fill this in as pages ship. Left-hand side MUST match
   fmenuname exactly (case-sensitive) as stored in the DB.

   NOTE: I could not confidently map fmenuname values for
   your existing routes (Receipt, Journal, Matching,
   CustomerPage, SetCompanyInfo, SetDocumentNo, reports/soa)
   because the sample rows you shared only covered the
   Purchase branch (mnuPurchaseInvoice, mnuItem, ...), which
   doesn't overlap with those routes. Add those pairs below
   once you confirm the fmenuname for each existing page,
   e.g.:

     mnuReceipt: "/Transaction/Receipt",
     mnuJournal: "/Transaction/journal",
========================================================= */

export const menuRouteMap: Record<string, string> = {
  // mnuPurchaseInvoice: "/purchase/invoice",
  // mnuPurchaseReturn: "/purchase/return",
  // mnuPurchaseOrder: "/purchase/order",
  // mnuBeginningStock: "/purchase/beginning-stock",
  // mnuItem: "/items",
  // mnuItemGroup: "/items/group",
  // mnuUnit: "/items/unit",
};

/* =========================================================
   ICON MAP

   Only applied at depth 0 (top-level categories), matching
   the original design where only the outermost row carries
   an icon. Keyed by fmenuname; falls back to a generic
   folder icon for any top-level category not listed here.

   Add entries as new top-level categories show up in
   tblmenu (fmenuid length === 2).
========================================================= */

const topLevelIconMap: Record<string, React.ReactNode> = {
  mnuPurchase: React.createElement(ShoppingCart, { size: 18 }),
  mnuTransaction: React.createElement(Receipt, { size: 18 }),
  mnuAccounts: React.createElement(Wallet, { size: 18 }),
  mnuBanking: React.createElement(Landmark, { size: 18 }),
  mnuCustomers: React.createElement(Users, { size: 18 }),
  mnuInventory: React.createElement(Package, { size: 18 }),
  mnuReports: React.createElement(BarChart3, { size: 18 }),
  mnuDocuments: React.createElement(FileText, { size: 18 }),
  mnuSettings: React.createElement(Settings, { size: 18 }),
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
