import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import SetDocumentNo from "../pages/Settings/SetDocumentNoPage";
import ProtectedRoute from "./ProtectedRoutes";
import SetBranchInfo from "../pages/Settings/SetBranchInfoPage";
import PublicRoute from "./PublicRoute";

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
          <Route
            path="/"
            element={<Navigate to="/Finance/Transaction/Receipt" replace />}
          />

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
            element={<CustomerPage />}
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


          {/* ================= DOCUMENT NUMBER ================= */}

          <Route
            path="/Settings/SetDocumentNo"
            element={<SetDocumentNo />}
          />


          {/* =================================================
              FINANCE - REPORTS
          ================================================= */}

          {/* ================= STATEMENT OF ACCOUNT ================= */}

          <Route
            path="/Finance/Reports/rptStatementoOfAccount"
            element={<StatementOfAccountMain />}
          />
        </Route>
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;
