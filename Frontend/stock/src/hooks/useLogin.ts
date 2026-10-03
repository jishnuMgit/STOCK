import { useState } from "react";

interface LoginData {
  pstrCOID: string;
  PstrYear: string;
  PstrUserID: string;
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
    pstrCOID: string;
    PstrYear: string;
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
        localStorage.setItem("PstrUserID", data.data.txtUserID);
      }

      if (data.data?.pstrCOID) {
        localStorage.setItem("PstrCoID", data.data.pstrCOID);
      }

      if (data.data?.PstrYear) {
        localStorage.setItem("PstrYear", data.data.PstrYear);
      }

      if (data.data?.userType) {
        localStorage.setItem("userType", data.data.userType);
      }

      // if (data.data?.branchId) {
      //   localStorage.setItem("branchId", data.data.branchId);
      // }

      return data;
    } catcgit h (error: unknown) {
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
