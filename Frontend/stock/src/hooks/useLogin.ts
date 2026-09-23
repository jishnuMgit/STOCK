import { useState } from "react";

interface LoginData {
  companyId: string;
  year: string;
  userId: string;
  password: string;
  language?: string;
  changePassword?: boolean;
  newPassword?: string;
  confirmPassword?: string;
}

interface LoginResponse {
  success: boolean;
  message: string;
  user?: {
    userId: string;
    companyId: string;
    year: string;
    language?: string | null;
    isCompanyUser?: boolean;
  };
  data?: {
    userId: string;
    companyId: string;
    year: string;
    language?: string;
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
        body: JSON.stringify(loginData),
      });

      const data: LoginResponse = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Login failed");
      }

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
