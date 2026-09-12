import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";

import Journalpage from "./pages/Transaction/Journal/Journalpage";
import Receipt from "./pages/Transaction/Receipt/Receipt";
// import CustomSelectTable from "./pages/CustomSelectTable";

import SideNav from "./pages/nav/SideNav";

import "./App.css";

/* =========================================================
   LAYOUT
========================================================= */

function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="app-layout">

      <SideNav
        activePath={location.pathname}
        onNavigate={navigate}
      />

      <main className="app-content">
        <Routes>

          <Route
            path="/"
            element={
              <Navigate
                to="/receipt"
                replace
              />
            }
          />

          <Route
            path="/receipt"
            element={<Receipt />}
          />

          

          <Route
            path="/journal"
            element={<Journalpage />}
          />

        </Routes>
      </main>

    </div>
  );
}
/* =========================================================
   APP
========================================================= */

function App() {
  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  );
}

export default App;