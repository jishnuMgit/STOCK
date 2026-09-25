import { lazy, Suspense } from "react";
import {
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import SetDocumentNo from "../pages/Settings/SetDocumentNoPage";
import ProtectedRoute from "./ProtectedRoutes";

/* =========================================================
   LAZY LOAD PAGES
========================================================= */

// =========================================================
// AUTH
// =========================================================

const Login = lazy(
  () => import("../pages/Auth/LoginPage"),
);


// =========================================================
// FINANCE - TRANSACTIONS
// =========================================================

const ReceiptPage = lazy(
  () =>
    import(
      "../pages/Finance/Transaction/Receipt/ReceiptPage"
    ),
);

const Journalpage = lazy(
  () =>
    import(
      "../pages/Finance/Transaction/Journal/Journalpage"
    ),
);

const Matching = lazy(
  () =>
    import(
      "../pages/Finance/Transaction/Matching/Matching"
    ),
);

const UnMatch = lazy(
  () =>
    import(
      "../pages/Finance/Transaction/Unmatch/UnMatch"
    ),
);


// =========================================================
// FINANCE - SETUP
// =========================================================

const CustomerPage = lazy(
  () =>
    import(
      "../pages/Finance/Setup/CustomerPage"
    ),
);


// =========================================================
// PURCHASE - SETUP
// =========================================================

const ItemPage = lazy(
  () =>
    import(
      "../pages/Purchase/Setup/ItemPage"
    ),
);


// =========================================================
// SETTINGS
// =========================================================

const SetCompanyInfo = lazy(
  () =>
    import(
      "../pages/Settings/SetCompanyInfoPage"
    ),
);


// =========================================================
// FINANCE - REPORTS
// =========================================================

const StatementOfAccountMain = lazy(
  () =>
    import(
      "../pages/Finance/Report/StatementOfAccount/StatementOfAccountMain"
    ),
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

        {/* ================= AUTH ================= */}

        <Route
          path="/login"
          element={<Login />}
        />


        {/* =================================================
            PROTECTED ROUTES
        ================================================= */}

        <Route
          element={<ProtectedRoute />}
        >

          {/* =================================================
              DEFAULT
          ================================================= */}

          <Route
            path="/"
            element={
              <Navigate
                to="/Finance/Transaction/Receipt"
                replace
              />
            }
          />


          {/* =================================================
              FINANCE - TRANSACTIONS
          ================================================= */}

          {/* ================= RECEIPT ================= */}

          <Route
            path="/Finance/Transaction/Receipt"
            element={<ReceiptPage />}
          />


          {/* ================= JOURNAL ================= */}

          <Route
            path="/Finance/Transaction/journal"
            element={<Journalpage />}
          />


          {/* ================= MATCHING ================= */}

          <Route
            path="/Finance/Transaction/Transaction-matching"
            element={<Matching />}
          />


          {/* ================= UNMATCHING ================= */}

          <Route
            path="/Finance/Transaction/Transaction-unmatching"
            element={<UnMatch />}
          />


          {/* =================================================
              FINANCE - SETUP
          ================================================= */}

          {/* ================= CUSTOMER ================= */}

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