import { useEffect, useState } from "react";

export interface Company {
  fCoID: string;
  fCoName: string | null;
  fCoName_AR: string | null;
  fCoName_QR: string | null;
  fCoName_Short: string | null;
  fCoAddress1: string | null;
  fCoAddress2: string | null;
  fCoVATNo: string | null;
  fCoStatus: boolean | null;
  fPositionNo: number | null;
}

interface CompaniesResponse {
  success: boolean;
  companies: Company[];
  message?: string;
}

const API_URL = import.meta.env.VITE_API_URL;

export const useCompanies = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        setLoading(true);
        setError("");

        const url = `${API_URL}/companies`;

        const response = await fetch(url);

        const contentType = response.headers.get("content-type");

        if (!contentType?.includes("application/json")) {
          throw new Error(
            `Server returned ${response.status} ${response.statusText}`,
          );
        }

        const data: CompaniesResponse = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.message || "Failed to load companies");
        }

        setCompanies(data.companies);
      } catch (error: unknown) {
        console.error("Fetch companies error:", error);
        setError(
          error instanceof Error ? error.message : "Failed to load companies",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchCompanies();
  }, []);

  return {
    companies,
    loading,
    error,
  };
};
