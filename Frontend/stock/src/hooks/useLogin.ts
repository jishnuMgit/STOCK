import { useState } from "react";

interface LoginData {
  companyId: string;
  txtYear: string;
  txtUserID: string;
  txtPwd: string;
  language?: string;
  changePassword?: boolean;
  newPassword?: string;
  confirmPassword?: string;
}

interface LoginResponse {
  success: boolean;
  message: string;
  data?: {
    txtUserID: string;
    companyId: string;
    txtYear: string;
    userType: string;
    branchId: string;
  };
}

const API_URL = import.meta.env.VITE_API_URL;

export const useLogin = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const login = async (loginData: LoginData): Promise<LoginResponse | null> => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },

        // IMPORTANT:
        // Allows browser to receive/store/send HTTP-only session cookie
        credentials: "include",

        body: JSON.stringify(loginData),
      });

      const data: LoginResponse = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Login failed");
      }

      // Store only what frontend needs for UI.
      // DO NOT store sessionToken or password.
      if (data.data?.txtUserID) {
        localStorage.setItem("PstruserID", data.data.txtUserID);
      }

      if (data.data?.companyId) {
        localStorage.setItem("PstrCoID", data.data.companyId);
      }

      if (data.data?.txtYear) {
        localStorage.setItem("PstrYear", data.data.txtYear);
      }

      if (data.data?.userType) {
        localStorage.setItem("userType", data.data.userType);
      }

      // if (data.data?.branchId) {
      //   localStorage.setItem("branchId", data.data.branchId);
      // }

      return data;
    } catch (error: unknown) {
      console.error("Login error:", error);

      const message = error instanceof Error ? error.message : "Login failed";

      setError(message);

      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    login,
    loading,
    error,
  };
};
