import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

const hasStoredUser = () => {
  try {
    const stored = localStorage.getItem("user"); // use your actual key
    return !!stored && !!JSON.parse(stored);
  } catch {
    localStorage.removeItem("user"); // corrupted value
    return false;
  }
};

const ProtectedRoute = () => {
  const location = useLocation();
  const { loading, isAuthenticated } = useAuth(); // hooks must run before any early return

  // No localStorage data -> straight to login, no need to wait for the API
  if (!hasStoredUser()) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-slate-600">
        Checking authentication...
      </div>
    );
  }

  // Cookie expired or invalid -> clear stale localStorage and go to login
  if (!isAuthenticated) {
    localStorage.removeItem("user");
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
