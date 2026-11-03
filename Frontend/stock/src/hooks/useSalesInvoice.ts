import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../utils/session";

// ============================================================
// TYPES
// ============================================================

export interface SelectOption {
  value: string;
  label: string;
}

// kept so existing imports of `Option` (e.g. in the header) still work
export type Option = SelectOption;

interface BranchRow {
  fbrid: string;
  fbrname: string;
}

// ============================================================
// API
// ============================================================

const API = import.meta.env.VITE_API_URL;

// TODO: change "Branch" to the path where you mounted the branch router,
// e.g. app.use("/api/Branch", branchRoutes)
const BRANCH_API = `${API}/Branch`;

const getJson = async (url: string, signal?: AbortSignal) => {
  const response = await apiFetch(url, {
    method: "GET",
    signal,
  });

  const result = await response.json().catch(() => null);

  if (!response.ok || !result?.success) {
    throw new Error(result?.message || `HTTP Error: ${response.status}`);
  }
  return result;
};

// ============================================================
// HOOK
// ============================================================

const useSalesInvoice = () => {
  const [branchOptions, setBranchOptions] = useState<SelectOption[]>([]);
  const [branch, setBranch] = useState<SelectOption | null>(null);
  const [branchLoading, setBranchLoading] = useState(false);
  const [branchError, setBranchError] = useState<string | null>(null);

  /* ---------- GET BRANCHES + DEFAULT BRANCH ---------- */
  const getBranches = useCallback(
    async (signal?: AbortSignal): Promise<SelectOption[]> => {
      setBranchOptions([]);
      setBranchError(null);
      setBranchLoading(true);

      try {
        const [listResult, defResult] = await Promise.all([
          getJson(`${BRANCH_API}/`, signal),
          // a failing default lookup should not break the list
          getJson(`${BRANCH_API}/default`, signal).catch(() => null),
        ]);

        if (!Array.isArray(listResult?.data)) return [];

        const options: SelectOption[] = listResult.data
          .map((b: BranchRow) => ({
            value: String(b.fbrid ?? ""),
            label: String(b.fbrname ?? b.fbrid ?? ""),
          }))
          .filter((o: SelectOption) => o.value.trim() !== "");

        setBranchOptions(options);

        // default can come back as id or name, so match either
        const def = String(defResult?.data ?? "").trim();
        setBranch(
          options.find((o) => o.value === def || o.label === def) ??
            options[0] ??
            null,
        );

        return options;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return [];
        }
        console.error("Get Branches Error:", error);
        setBranchOptions([]);
        setBranchError(
          error instanceof Error ? error.message : "Failed to load branches",
        );
        return [];
      } finally {
        setBranchLoading(false);
      }
    },
    [],
  );

  /* ---------- LOAD ON MOUNT ---------- */
  useEffect(() => {
    const controller = new AbortController();
    getBranches(controller.signal);
    return () => controller.abort();
  }, [getBranches]);

  return {
    branchOptions,
    branch,
    setBranch,
    branchLoading,
    branchError,
    getBranches,
  };
};

export default useSalesInvoice;
