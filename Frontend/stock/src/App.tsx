import { BrowserRouter, useLocation } from "react-router-dom";

import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import NavShell from "./components/NavShell/NavShell";
import AppRoutes from "./routes/AppRoutes";
import "./App.css";

/* =========================================================
   LAYOUT
========================================================= */

function AppLayout() {
  const location = useLocation();
  const isLogin = location.pathname === "/login";

  return (
    <>
      {isLogin ? (
        <AppRoutes />
      ) : (
        <NavShell>
          <AppRoutes />
        </NavShell>
      )}

      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        pauseOnHover
        draggable
      />
    </>
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
