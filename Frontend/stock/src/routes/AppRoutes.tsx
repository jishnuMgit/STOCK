import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import SetDocumentNo from "../pages/Settings/SetDocumentNoPage";
import ProtectedRoute from "./ProtectedRoutes";
import SetBranchInfo from "../pages/Settings/SetBranchInfoPage";
import PublicRoute from "./PublicRoute";
import CustomerList from "../pages/Finance/Setup/CustomerListPage";
import ChartOfAccountList from "../pages/Finance/Setup/COAListPage";
import UserLogin from "../pages/Security/UserLogin/UserLoginPage";
import SetChartOfAccount from "../pages/Settings/SetChartOfAccountPage";
import UserPermission from "../pages/Security/UserPermissionMenu/UserPermissionMenuPage";
import BeginningStockPage from "../pages/Purchase/Transaction/BeginningStockPage";
import UserPermissionBranchPage from "../pages/Security/UserPermissionBranch/UserPermissionBranchPage";
import SetPostingAccountPage from "../pages/Settings/SetPostingAccountPage";
import PurchaseInvoicePage from "../pages/Purchase/Transaction/PurchaseInvoicePage";
import PurchaseExpense from "../components/Transaction/PurchaseInvoice/PurchaseInvoiceExpense";
import SalesInvoice from "../pages/Sales/Transaction/SalesInvoice";
import StockTransfer from "../pages/Sales/Transaction/stock/StockTransfer";
import BeginningBalance from "../pages/Finance/Transaction/BeginningBalance/BeginningBalance";
import ItemGroupPage from "../pages/Purchase/Setup/ItemGroupPage";
import CompanyPage from "../pages/Administration/CompanyPage";

const Login = lazy(() => import("../pages/Auth/LoginPage"));
const ReceiptPage = lazy(
  () => import("../pages/Finance/Transaction/Receipt/ReceiptPage"),
);
const Journalpage = lazy(
  () => import("../pages/Finance/Transaction/Journal/Journalpage"),
);
const Matching = lazy(
  () => import("../pages/Finance/Transaction/Matching/Matching"),
);
const UnMatch = lazy(
  () => import("../pages/Finance/Transaction/Unmatch/UnMatch"),
);

// Finance - Setup
const CustomerPage = lazy(() => import("../pages/Finance/Setup/CustomerPage"));

// Purchase - Setup
const ItemPage = lazy(() => import("../pages/Purchase/Setup/ItemPage"));

// Settings
const SetCompanyInfo = lazy(
  () => import("../pages/Settings/SetCompanyInfoPage"),
);

// Finance - Reports
const StatementOfAccountMain = lazy(
  () =>
    import("../pages/Finance/Report/StatementOfAccount/StatementOfAccountMain"),
);

const PageLoader = () => (
  <div className="flex h-full min-h-75 items-center justify-center text-[13px] text-slate-600">
    Loading...
  </div>
);

const AppRoutes = () => {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Public */}
        <Route element={<PublicRoute />}>
          <Route path="/login" element={<Login />} />
        </Route>

        {/* Protected */}
        <Route element={<ProtectedRoute />}>
          {/* <Route
            path="/"
            element={<Navigate to="/Finance/Transaction/Receipt" replace />}
          /> */}

          {/* Finance - Transactions */}
          <Route
            path="/Finance/Transaction/Receipt"
            element={<ReceiptPage />}
          />
          <Route
            path="/Finance/Transaction/journal"
            element={<Journalpage />}
          />
          <Route
            path="/Finance/Transaction/Transaction-matching"
            element={<Matching />}
          />
          <Route
            path="/Finance/Transaction/Transaction-unmatching"
            element={<UnMatch />}
          />
          <Route
            path="/Finance/Transaction/BeginningBalance"
            element={<BeginningBalance />}
          />

          {/* Finance - Setup */}
          <Route
            path="/Finance/Setup/CustomerPage"
            element={<CustomerList />}
          />
          <Route
            path="/Finance/Setup/Add/Customer"
            element={<CustomerPage />}
          />
          <Route
            path="/Finance/Setup/ChartOfAccountList"
            element={<ChartOfAccountList />}
          />

          {/* Finance - Report */}
          <Route
            path="/Finance/Setup/rptSOA"
            element={<StatementOfAccountMain />}
          />

{/* Sales - TRANSACTION */}

<Route
path="/Sales/Transaction/SalesInvoicePage"
element={<SalesInvoice/>}
/>


<Route
path="/Sales/Transaction/StockTransferPage"
element={<StockTransfer/>}
/>









          {/* =================================================
              PURCHASE - TRANSACTION
          ================================================= */}

          <Route
            path="/Purchase/Transaction/PurchaseInvoicePage"
            element={<PurchaseInvoicePage />}
          />

          <Route
            path="/Purchase/Transaction/BeginningStockPage"
            element={<BeginningStockPage />}
          />

          {/* =================================================
              PURCHASE - SETUP
          ================================================= */}

          {/* ================= ITEM ================= */}

          <Route path="/Purchase/Setup/ItemPage" element={<ItemPage />} />

          <Route  path="/Purchase/Setup/ItemGroupPage"element={<ItemGroupPage/>} />

          {/* =================================================
              SETTINGS
          ================================================= */}

          {/* ================= COMPANY INFO ================= */}

          <Route path="/Settings/SetCompanyInfo" element={<SetCompanyInfo />} />

          <Route path="/Settings/SetBranchInfo" element={<SetBranchInfo />} />

          <Route
          path="/Settings/SetChartOfAccount"
          element={<SetChartOfAccount />}
          />
          {/* the screen's earlier address - kept so old bookmarks still open it */}
          <Route
            path="/Settings/ChartOfAccountSettings"
            element={<Navigate to="/Settings/SetChartOfAccount" replace />}
          />
          <Route
            path="/Settings/SetPostingAccount"
            element={<SetPostingAccountPage />}
          />

          {/* ================= DOCUMENT NUMBER ================= */}

          <Route path="/Settings/SetDocumentNo" element={<SetDocumentNo />} />
          

          {/* =================================================
              FINANCE - REPORTS
          ================================================= */}

          {/* ================= STATEMENT OF ACCOUNT ================= */}

          <Route
            path="/Finance/Reports/rptSOA"
            element={<StatementOfAccountMain />}
          />
        </Route>

        {/*========================================================
                      SECURITY
        ===========================================================*/}

        {/*====================User Login==========================*/}
        <Route path="/Security/UserLogin" element={<UserLogin />} />

        <Route
          path="/Security/UserPermissionMenu"
          element={<UserPermission />}
        />

        <Route
          path="/Security/UserPermissionBranch"
          element={<UserPermissionBranchPage />}
        />

        <Route path="/dev/PurchaseExpense" element={<PurchaseExpense />} />

        <Route path="/Administration/CompanyPage" element={<CompanyPage/>}/>
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;
