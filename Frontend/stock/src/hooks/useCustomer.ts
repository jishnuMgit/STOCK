import { useCallback, useState } from "react";

// Shape used by the frontend (CustomerList page)
export interface Customer {
  lkpCustomerID: string;
  lkpCustomerName: string;
  lkpHaveDivision: boolean;
  lkpBranch: string;
  lkpGlAccountID: string;
  lkpGlAccountName: string;
}

export interface ParentAccount {
  accountId: string;
  accountName: string;
}

// Shape returned by backend: GET /customers
interface CustomerApiRow {
  csAccountId: string | null;
  csAccountName: string | null;
  cs: string | null;
  brId: string | null;
  haveDivision: boolean | null;
  gAccountId: string | null;
  gAccountName: string | null;
}

interface CustomerListResponse {
  success: boolean;
  message?: string;
  count?: number;
  data?: CustomerApiRow[];
}

const API_URL = import.meta.env.VITE_API_URL;

// Backend row -> frontend row (null-safe so search never breaks)
const mapCustomer = (r: CustomerApiRow): Customer => ({
  lkpCustomerID: r.csAccountId ?? "",
  lkpCustomerName: r.csAccountName ?? "",
  lkpHaveDivision: !!r.haveDivision,
  lkpBranch: r.brId ?? "",
  lkpGlAccountID: r.gAccountId ?? "",
  lkpGlAccountName: r.gAccountName ?? "",
});

// Shared GET helper for the new calls
const apiGet = async <T>(path: string): Promise<T> => {
  const response = await fetch(`${API_URL}${path}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });

  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.message || "Request failed");
  }

  return result as T;
};

export const useCustomer = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [parentAccounts, setParentAccounts] = useState<ParentAccount[]>([]);

  const fetchCustomers = useCallback(async (): Promise<Customer[] | null> => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(`${API_URL}/customer`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        // Sends the HTTP-only session cookie
        credentials: "include",
      });

      const result: CustomerListResponse = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to fetch customer list");
      }

      const list = (result.data ?? []).map(mapCustomer);
      setCustomers(list);

      return list;
    } catch (err: unknown) {
      console.error("Customer list error:", err);

      setError(
        err instanceof Error ? err.message : "Failed to fetch customer list",
      );

      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchNextCustomerId = useCallback(
    async (
      accountTypeId: string,
      accountLevel: number,
    ): Promise<string | null> => {
      try {
        setError("");
        const params = new URLSearchParams({
          accountTypeId,
          accountLevel: String(accountLevel),
        });

        const result = await apiGet<{ data: { nextAccountId: string } }>(
          `/customer/next-id?${params}`,
        );
        return result.data.nextAccountId;
      } catch (err: unknown) {
        console.error("Next customer ID error:", err);
        setError(
          err instanceof Error ? err.message : "Failed to generate customer ID",
        );
        return null;
      }
    },
    [],
  );

  const fetchParentAccounts = useCallback(async (): Promise<
    ParentAccount[] | null
  > => {
    try {
      setError("");
      const result = await apiGet<{ data: ParentAccount[] }>(
        "/customer/parent-accounts",
      );
      const list = result.data ?? [];
      setParentAccounts(list);
      return list;
    } catch (err: unknown) {
      console.error("Parent accounts error:", err);
      setError(
        err instanceof Error ? err.message : "Failed to fetch parent accounts",
      );
      return null;
    }
  }, []);

  return {
    customers,
    fetchCustomers,
    fetchNextCustomerId,
    parentAccounts,
    fetchParentAccounts,
    loading,
    error,
  };
};
