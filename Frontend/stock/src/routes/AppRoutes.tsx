import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import SetDocumentNo from "../pages/Settings/SetDocumentNoPage";
import ProtectedRoute from "./ProtectedRoutes";
import SetBranchInfo from "../pages/Settings/SetBranchInfoPage";
import PublicRoute from "./PublicRoute";
import CustomerList from "../pages/Finance/Setup/CustomerListPage";
import ChartOfAccountList from "../pages/Finance/Setup/COAListPage";
import UserLogin from "../pages/Security/UserLogin/UserLogin";
import COASettings from "../pages/Settings/COASettingPage";
import UserPermission from "../pages/Security/UserPermission/UserPermissionPage";
import BeginningStockPage from "../pages/Purchase/Transaction/BeginningStockPage";
import UserPermissionCoBranchPage from "../pages/Security/UserPermissionCoBranch/UserPermissionCoBranchPage";
import SetPostingAccountPage from "../pages/Settings/SetPostingAccountPage";

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

           {/* =================================================
              PURCHASE - TRANSACTION
          ================================================= */}
          <Route
          path="/Purchase/Transaction/BeginningStockPage"
          element={<BeginningStockPage/>}
          />


          {/* =================================================
              PURCHASE - SETUP
          ================================================= */}

          {/* ================= ITEM ================= */}

          <Route
            path="/Purchase/Setup/ItemPage"
            element={<ItemPage />}
          />


          {/* =================================================
              SETTINGS
          ================================================= */}

          {/* ================= COMPANY INFO ================= */}

          <Route
            path="/Settings/SetCompanyInfo"
            element={<SetCompanyInfo />}
          />

          <Route path="/Settings/SetBranchInfo"
          element={<SetBranchInfo/>}/>

          <Route
          path="/Settings/ChartOfAccountSetting"
          element={<COASettings/>}
          />
          <Route
          path="/Settings/SetPostingAccount"
          element={<SetPostingAccountPage/>}
          />

          {/* ================= DOCUMENT NUMBER ================= */}

          <Route
            path="/Settings/SetDocumentNo"
            element={<SetDocumentNo />}
          />


          {/* =================================================
              FINANCE - REPORTS
          ================================================= */}

          {/* ================= STATEMENT OF ACCOUNT ================= */}

         <Route path="/Finance/Reports/rptSOA" element={<StatementOfAccountMain />} />
        </Route>



        {/*========================================================
                      SECURITY
        ===========================================================*/}

        {/*====================User Login==========================*/}
       <Route path="/Security/UserLogin"
       element={<UserLogin/>}
       />

<Route
path="/Security/UserPermissionMenu"
element={<UserPermission/>}
/>

<Route
path="/Security/UserPermissionCoBranch"
element={<UserPermissionCoBranchPage/>}
/>



      </Routes>
    </Suspense>
  );
};

export default AppRoutes;
