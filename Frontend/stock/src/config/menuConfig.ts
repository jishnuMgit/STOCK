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
     - Transaction-matching / Transaction-unmatching
       (mnuFinDocPost / mnuFinDocUnPost are Document
       Post/UnPost, a different feature)
========================================================= */

export const menuRouteMap: Record<string, string> = {
  /* =========================================================
     PURCHASE
  ========================================================= */
  /* =========================================================
     PURCHASE - TRANSACTION
  ========================================================= */


  mnuPurchaseInvoice: "/Purchase/Transaction/PurchaseInvoicePage",

  mnuBeginningStock:"/Purchase/Transaction/BeginningStockPage",





    /* =========================================================
     PURCHASE - SETUP
  ========================================================= */



  mnuItem: "/Purchase/Setup/ItemPage",
  mnuItemGroup: "/Purchase/Setup/ItemGroupPage",
  mnuUnit:"/Purchase/Setup/UnitPage",
  mnuStaff:"/Purchase/Setup/StaffPage",


    /* =========================================================
     PURCHASE - REPORTS
  ========================================================= */






/*============================================================
Sales-TRANSACTION
=============================================================*/

  mnuSalesInvoice: "/Sales/Transaction/SalesInvoicePage",


  mnuStockAdjustment:"/Sales/Transaction/StockAdjustment",

  mnuStockTransfer: "/Sales/Transaction/StockTransferPage",
  mnuStkDocumentPost:"/Sales/Transaction/StockDocumentPost",
  mnuStkDocumentRePost:"/Sales/Transaction/StockDocumentRePost",


/*============================================================
Sales-SETUP
=============================================================*/

  mnuItemEnquiry:"/Sales/Setup/ItemEnquiry",



  /* =========================================================
     FINANCE 
  ========================================================= */
  /* =========================================================
     FINANCE - TRANSACTION
  ========================================================= */

  mnuReceipt: "/Finance/Transaction/Receipt",
  mnuBeginningBalance: "/Finance/Transaction/BeginningBalance",
  mnuJournal: "/Finance/Transaction/journal",

  /* =========================================================
     FINANCE - SETUP
  ========================================================= */

  mnuCustomer: "/Finance/Setup/CustomerPage",
  mnuChartOfAccount:"/Finance/Setup/ChartOfAccountList",
  mnuCostCenter:"/Finance/Setup/CostCenter",

  /* =========================================================
     FINANCE - REPORTS
  ========================================================= */
 // FINANCE - REPORTS - A/R & A/P

  mnuRptSOA: "/Finance/Reports/rptSOA",

  // FINANCE - REPORTS - GENERAL LEDGER
  
  mnuRptGL:"/Finance/Reports/rptGL",


  // FINANCE - REPORTS - FINAL ACCOUNTS

  mnuRptTB:"/Finance/Reports/rptTB",



  /* =========================================================
     SETTINGS
  ========================================================= */

   mnuSetDocumentNo: "/Settings/SetDocumentNo",
   mnuSetBranchInfo:"/Settings/SetBranchInfo",
   mnuSetCompanyInfo: "/Settings/SetCompanyInfo",
   mnuSetChartOfAccount: "/Settings/SetChartOfAccount",
   mnuSetStockPostingAccount:"/Settings/SetPostingAccount",
   mnuSetActivePeriod:"/Setting/SetActivePeriod",
   mnuSetDefaultBranch:"/Setting/SetDefaultBranch",

  /* =========================================================
     SECURITY
  ========================================================= */

  mnuUserLogin:"/Security/UserLogin",
  mnuUserPermissionMenu:"/Security/UserPermissionMenu",
  mnuUserPermissionBranch:"/Security/UserPermissionBranch",
  mnuRptUserAudit:"/Security/UserAudit",
  mnuRptUserTransactionAudit:"/Security/UserTransactionAudit",

  /* =========================================================
     ADMINISTRATION
  ========================================================= */



mnuAdministration: "/Administration",
mnuCompany: "/Administration/CompanyPage",
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
  children: [
    {
      fmenuid: "9901",
      fmenuname: "mnuCompany",
      fmenucaption: "Company",
      fmenubuttons: "0",
      children: [],
    },
  ],
};

/* Rpt Statement of Account (synthetic node)
   Hardcoded in the frontend, injected as a child of
   Finance > Report (fmenuid "1103").
   "110399" is outside the real 1103xx id space (110301–110315). */
// export const RPT_STATEMENT_OF_ACCOUNT_NODE: MenuNode = {
//   fmenuid: "110399",
//   fmenuname: "mnuRptStatementOfAccount",
//   fmenucaption: "Rpt Statement of Account",
//   fmenubuttons: "OA",
//   children: [],
// };

/* Returns a new tree with `child` added under the node whose
   fmenuid is `parentId`. Does nothing if it's already there. */
export function injectChild(
  nodes: MenuNode[],
  parentId: string,
  child: MenuNode,
): MenuNode[] {
  return nodes.map((node) => {
    if (node.fmenuid === parentId) {
      const exists = node.children.some((c) => c.fmenuid === child.fmenuid);
      return exists
        ? node
        : { ...node, children: [...node.children, child] };
    }
    return { ...node, children: injectChild(node.children, parentId, child) };
  });
}

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
