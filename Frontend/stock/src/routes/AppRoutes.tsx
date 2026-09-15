import React, { lazy, Suspense } from "react";
import {
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

/* =========================================================
   LAZY LOAD PAGES
========================================================= */

const Receipt = lazy(
  () =>
    import(
      "../pages/Transaction/Receipt/Receipt"
    )
);

const Journalpage = lazy(
  () =>
    import(
      "../pages/Transaction/Journal/Journalpage"
    )
);

const Matching = lazy(
  () =>
    import(
      "../pages/Transaction/Matching/Matching"
    )
);

const UnMatch = lazy(
  () =>
    import(
      "../pages/Transaction/Unmatch/UnMatch"
    )
);

const StatementOfAccountMain=lazy(()=>import(
  "../pages/Reports/StatementOfAccount/StatementOfAccountMain1"
))

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
            DEFAULT
        ================================================= */}

        <Route
          path="/"
          element={
            <Navigate
              to="/Transaction/receipt"
              replace
            />
          }
        />
        

        {/* =================================================
            TRANSACTION
        ================================================= */}

        <Route
          path="/Transaction/receipt"
          element={<Receipt />}
        />
         {/* <Route
          path="/Transaction/receipt/save"
          element={<ModifyReceipt />}
        /> */}

        <Route
          path="/Transaction/journal"
          element={<Journalpage />}
        />

        <Route
          path="/Transaction/Transaction-matching"
          element={<Matching />}
        />

        <Route
          path="/Transaction/debit-note"
          element={
            <div>
              Debit Note Page
            </div>
          }
        />

        <Route
          path="/Transaction/Transaction-unmatching"
          element={<UnMatch />}
        />



        {/*=====================================
                         REPORTS
        ========================================*/}

        <Route
        path="/reports/soa"
        element={<StatementOfAccountMain/>}
        />

      </Routes>
    </Suspense>
  );
};

export default AppRoutes;