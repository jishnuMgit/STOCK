import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import SetDocumentNo from "../pages/Settings/SetDocumentNoPage";
import ProtectedRoute from "./ProtectedRoutes";

/* =========================================================
   LAZY LOAD PAGES
========================================================= */

const ReceiptPage = lazy(
  () => import("../pages/Transaction/Receipt/ReceiptPage"),
);

const Journalpage = lazy(
  () => import("../pages/Transaction/Journal/Journalpage"),
);

const Matching = lazy(() => import("../pages/Transaction/Matching/Matching"));

const UnMatch = lazy(() => import("../pages/Transaction/Unmatch/UnMatch"));

const Login = lazy(() => import("../pages/Auth/LoginPage"));

const StatementOfAccountMain = lazy(
  () => import("../pages/Reports/StatementOfAccount/StatementOfAccountMain"),
);

const SetCompanyInfo = lazy(
  () => import("../pages/Settings/SetCompanyInfoPage"),
);

/* =========================================================
   PAGE LOADER
========================================================= */

const PageLoader = () => {
  return (
    <div
      className="
        flex
        h-full
        min-h-75
        items-center
        justify-center
        text-[13px]
        text-slate-600
      "
    >
      Loading...
    </div>
  );
};

/* =========================================================
   APP ROUTES
========================================================= */

const AppRoutes = () => {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* =================================================
            PUBLIC ROUTES
        ================================================= */}

        <Route path="/login" element={<Login />} />

        {/* =================================================
            PROTECTED ROUTES
        ================================================= */}

        <Route element={<ProtectedRoute />}>
          {/* =================================================
              DEFAULT
          ================================================= */}

          <Route
            path="/"
            element={<Navigate to="/Transaction/receipt" replace />}
          />

          {/* =================================================
              TRANSACTION
          ================================================= */}

          <Route path="/Transaction/Receipt" element={<ReceiptPage />} />

          {/*
          <Route
            path="/Transaction/receipt/save"
            element={<ModifyReceipt />}
          />
          */}

          <Route path="/Transaction/journal" element={<Journalpage />} />

          <Route
            path="/Transaction/Transaction-matching"
            element={<Matching />}
          />

          <Route
            path="/Transaction/debit-note"
            element={<div>Debit Note Page</div>}
          />

          <Route
            path="/Transaction/Transaction-unmatching"
            element={<UnMatch />}
          />

          {/* =================================================
              SETTINGS
          ================================================= */}

          <Route path="/Settings/SetCompanyInfo" element={<SetCompanyInfo />} />

          <Route path="/Settings/SetDocumentNo" element={<SetDocumentNo />} />

          {/* =================================================
              REPORTS
          ================================================= */}

          <Route path="/reports/soa" element={<StatementOfAccountMain />} />
        </Route>
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;
