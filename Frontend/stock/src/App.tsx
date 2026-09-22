import {
  BrowserRouter,
  useLocation,
  useNavigate,
} from "react-router-dom";

import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import SideNav from "./pages/nav/SideNav";
import AppRoutes from "./routes/AppRoutes";
import "./App.css";

/* =========================================================
   LAYOUT
========================================================= */

function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="app-layout">

      {/* =================================================
          SIDE NAVIGATION
      ================================================= */}

      {location.pathname !== "/login" && (
        <SideNav
          activePath={location.pathname}
          onNavigate={navigate}
        />
      )}

      {/* =================================================
          PAGE CONTENT
      ================================================= */}

      <main className="app-content">
        <AppRoutes />
      </main>

      {/* =================================================
          NOTIFICATIONS
      ================================================= */}

      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        pauseOnHover
        draggable
      />

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