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
import SalesInvoice from "../pages/Sales/Transaction/SalesInvoicePage";
import StockTransfer from "../pages/Sales/Transaction/stock/StockTransferPage";
import BeginningBalance from "../pages/Finance/Transaction/BeginningBalance/BeginningBalance";
import ItemGroupPage from "../pages/Purchase/Setup/ItemGroupPage";
import CompanyPage from "../pages/Administration/CompanyPage";
import ActivePeriodPage from "../pages/Settings/ActivePeriodPage";
import StockAdjustmentPage from "../pages/Sales/Transaction/stock/StockAdjustmentPage";
import SetDefaultBranch from "../pages/Settings/SetDefaultBranchPage";
import SetActivePeriod from "../pages/Settings/SetActivePeriodPage";

import ItemEnquiryPage from "../pages/Sales/Setup/ItemEnquiryPage";
import UnitPage from "../pages/Purchase/Setup/UnitPage";
import StaffPage from "../pages/Purchase/Setup/StaffPage";
import UserAudit from "../pages/Security/UserAudit/UserAuditPage";
import UserTransactionAudit from "../pages/Security/UserTransactionAudit/UserTransactionAuditPage";
import StockDocumentPost from "../pages/Sales/Transaction/stock/StockDocumentPostPage";
import StockDocumentPostCancel from "../pages/Sales/Transaction/stock/StockDocumentPostCancel";
import StockDocumentRePost from "../pages/Sales/Transaction/stock/StockDocumentRePost";
import RptGLPage from "../pages/Finance/Report/GeneralLedger/RptGLPage";
import MatchingPage from "../pages/Finance/Transaction/Match/MatchPage";
import UnMatchPage from "../pages/Finance/Transaction/MatchReversal/MatchReversalPage";
import CostCenterPage from "../pages/Finance/Setup/CostCenterPage";
import MatchEnquiryPage from "../pages/Finance/Transaction/MatchEnquiry/MatchEnquiryPage";
import RptTBPage from "../pages/Finance/Report/FinalAccounts/TrialBalance/RptRBPage";
import RptStockPage from "../pages/Sales/Report/RptStockPage";
import RptStockValuePage from "../pages/Sales/Report/RptSVPage";

const Login = lazy(() => import("../pages/Auth/LoginPage"));
const ReceiptPage = lazy(
  () => import("../pages/Finance/Transaction/Receipt/ReceiptPage"),
);
const Journalpage = lazy(
  () => import("../pages/Finance/Transaction/Journal/Journalpage"),
);
const Matching = lazy(
  () => import("../pages/Finance/Transaction/Match/MatchPage"),
);
const UnMatch = lazy(
  () => import("../pages/Finance/Transaction/MatchReversal/MatchReversalPage"),
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
const RptSOAPage = lazy(
  () =>
    import("../pages/Finance/Report/A-R_and_A-P/StatementOfAccount/RptSOAPage"),
);

const PageLoader = () => (
  <div className="flex h-full min-h-75 items-center justify-center text-[13px] text-slate-600">
    Loading...
  </div>
);

// Shown at "/" - replace with your real home/dashboard later
const Home = () => <div className="p-4 text-[13px] text-slate-600" />;

const AppRoutes = () => {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Public */}
        <Route element={<PublicRoute />}>
          <Route path="/login" element={<Login />} />
        </Route>

        {/* Protected - everything below requires login */}
        <Route element={<ProtectedRoute />}>
          {/* Home */}
          <Route path="/" element={<Home />} />

          {/* ================= FINANCE - TRANSACTION ================= */}
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

          {/* ================= FINANCE - SETUP ================= */}
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
          <Route
          path="/Finance/Setup/CostCenter"
          element={<CostCenterPage/>}
          />

          {/* ================= FINANCE - REPORTS ================= */}
  
          <Route
            path="/Finance/Reports/rptSOA"
            element={<RptSOAPage />}
          />
          <Route
          path="/Finance/Reports/rptGL"
          element={<RptGLPage/>}/>

          <Route
          path="/Finance/Reports/rptTB"
          element={<RptTBPage/>}
          />
          {/* ================= SALES - TRANSACTION ================= */}
          <Route
            path="/Sales/Transaction/SalesInvoicePage"
            element={<SalesInvoice />}
          />
          <Route
          path="/Sales/Transaction/StockAdjustment"
          element={<StockAdjustmentPage/>}
          />
          <Route
            path="/Sales/Transaction/StockTransferPage"
            element={<StockTransfer />}
          />

          <Route path="/Sales/Transaction/StockDocumentPost" element={<StockDocumentPost/>}/>
          <Route path="/Sales/Transaction/StockDocumentRePost" element={<StockDocumentRePost/>}/>
          {/* ================= SALES - SETUP ================= */}


        <Route
        path="/Sales/Setup/ItemEnquiry"
        element={<ItemEnquiryPage/>}
        />


  {/* ================= SALES - REPORT ================= */}
        <Route
        path="/Sales/Report/RptStock"
        element={<RptStockPage/>}
        />
        <Route
        path="/Sales/Reports/StockValue"
        element={<RptStockValuePage/>}
        />

          {/* ================= PURCHASE - TRANSACTION ================= */}
          <Route
            path="/Purchase/Transaction/PurchaseInvoicePage"
            element={<PurchaseInvoicePage />}
          />
          <Route
            path="/Purchase/Transaction/BeginningStockPage"
            element={<BeginningStockPage />}
          />
          <Route
          path="/Purchase/Setup/UnitPage"
          element={<UnitPage/>}
          />
          <Route
          path="/Purchase/Setup/StaffPage"
          element={<StaffPage/>}
          />

          {/* ================= PURCHASE - SETUP ================= */}
          <Route path="/Purchase/Setup/ItemPage" element={<ItemPage />} />
          <Route
            path="/Purchase/Setup/ItemGroupPage"
            element={<ItemGroupPage />}
          />

          {/* ================= SETTINGS ================= */}
          <Route path="/Settings/SetCompanyInfo" element={<SetCompanyInfo />} />
          <Route path="/Settings/SetBranchInfo" element={<SetBranchInfo />} />
          <Route
            path="/Settings/SetChartOfAccount"
            element={<SetChartOfAccount />}
          />
          <Route 
          path="/Setting/SetDefaultBranch"
          element={<SetDefaultBranch/>}
          />
          <Route
            path="/Setting/SetActivePeriod"
            element={<SetActivePeriod />}
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
          <Route
          path="/Setting/SetActivePeriod"
          element={<ActivePeriodPage/>}
          />

          {/* ================= DOCUMENT NUMBER ================= */}

          <Route path="/Settings/SetDocumentNo" element={<SetDocumentNo />} />

          {/* ================= SECURITY ================= */}
          <Route path="/Security/UserLogin" element={<UserLogin />} />
          <Route
            path="/Security/UserPermissionMenu"
            element={<UserPermission />}
          />
          <Route
            path="/Security/UserPermissionBranch"
            element={<UserPermissionBranchPage />}
          />
          <Route path="/Security/UserAudit" element={<UserAudit/>}/>
          <Route path="/Security/UserTransactionAudit" element={<UserTransactionAudit/>}/>

          {/* ================= ADMINISTRATION ================= */}
          <Route path="/Administration/CompanyPage" element={<CompanyPage />} />





          {/* ================= DEV ================= */}
          <Route path="/dev/PurchaseExpense" element={<PurchaseExpense />} />

         <Route path="/dev/StockDocumentPostCancel" element={<StockDocumentPostCancel/>}/>

         <Route path="/dev/matchpage" element={<MatchingPage/>}/>
  
        <Route path="/dev/unmatchpage" element={<UnMatchPage/>}/>
        <Route path="/dev/MatchEnquiryPage" element={<MatchEnquiryPage/>}/>


          {/* Unknown URL -> back to "/" ("/" has its own element, so no loop) */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;
