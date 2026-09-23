import { useEffect, useState } from "react";

export interface Year {
  fYear: number;
}

interface YearsResponse {
  success: boolean;
  years: Year[];
  message?: string;
}

const API_URL = import.meta.env.VITE_API_URL;

export const useYears = (companyId: string) => {
  const [years, setYears] = useState<Year[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const fetchYears = async () => {
      if (!companyId) {
        if (!cancelled) {
          setYears([]);
          setError("");
          setLoading(false);
        }
        return;
      }

      try {
        setLoading(true);
        setError("");

        const url = `${API_URL}/years?companyId=${encodeURIComponent(companyId)}`;

        const response = await fetch(url);

        const contentType = response.headers.get("content-type");

        if (!contentType?.includes("application/json")) {
          const text = await response.text();
          console.error("Expected JSON but received:", text);
          throw new Error(
            `Server returned ${response.status} ${response.statusText}`,
          );
        }

        const data: YearsResponse = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.message || "Failed to load years");
        }

        if (!cancelled) {
          setYears(data.years);
        }
      } catch (error: unknown) {
        console.error("Fetch years error:", error);
        if (!cancelled) {
          setError(
            error instanceof Error ? error.message : "Failed to load years",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchYears();

    return () => {
      cancelled = true;
    };
  }, [companyId]);

  return {
    years,
    loading,
    error,
  };
};
