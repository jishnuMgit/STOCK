import { useState } from "react";

const API_URL = import.meta.env.VITE_API_URL;

export const useLogout = () => {
  const [loading, setLoading] = useState(false);

  const logout = async (): Promise<boolean> => {
    try {
      setLoading(true);

      const response = await fetch(`${API_URL}/auth/logout`, {
        method: "POST",
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Logout failed");
      }

      // Remove frontend-only data
      localStorage.removeItem("userId");
      localStorage.removeItem("companyId");
      localStorage.removeItem("year");
      localStorage.removeItem("userType");

      return true;
    } catch (error) {
      console.error("Logout error:", error);

      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    logout,
    loading,
  };
};
