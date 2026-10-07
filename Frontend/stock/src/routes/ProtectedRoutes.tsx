import { useEffect } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { hasStoredUser, clearStoredUser } from "../utils/authStorage";

const ProtectedRoute = () => {
  const location = useLocation();
  const { loading, isAuthenticated } = useAuth();
  const stored = hasStoredUser();

  // Cookie expired/invalid but localStorage still there -> clear it
  useEffect(() => {
    if (!loading && stored && !isAuthenticated) clearStoredUser();
  }, [loading, stored, isAuthenticated]);

  if (!stored) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-slate-600">
        Checking authentication...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
