import {
  BrowserRouter,
  useLocation,
  useNavigate,
} from "react-router-dom";

import SideNav from "./pages/nav/SideNav";

import AppRoutes from "./routes/AppRoutes";
import {ToastContainer} from 'react-toastify'
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

      <SideNav
        activePath={location.pathname}
        onNavigate={navigate}
      />

      {/* =================================================
          PAGE CONTENT
      ================================================= */}

      <main className="app-content">
        <AppRoutes />
      </main>

      <ToastContainer/>

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