import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { hasStoredUser } from "../utils/authStorage";

const PublicRoute = () => {
  const { loading, isAuthenticated } = useAuth();

  // No localStorage -> show login immediately, don't wait for the API
  if (!hasStoredUser()) {
    return <Outlet />;
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-slate-600">
        Checking authentication...
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

export default PublicRoute;
