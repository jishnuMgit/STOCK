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

export interface Country {
  countryId: string;
  countryName: string;
  countryNameA: string;
  positionNo: number;
}

export interface Staff {
  staffId: string;
  staffName: string;
}

// Full customer record: GET /customer/:csAccountId (response)
// and POST / PUT body. Keys match the backend SP_PARAM_MAP.
export interface CustomerDetail {
  csAccountType?: string | null;
  csAccountTypeDet?: string | null;
  gAccountId?: string | null;
  csAccountId?: string | null;
  accountName?: string | null;
  accountNameA?: string | null;
  legalName?: string | null;
  legalNameA?: string | null;
  vatNo?: string | null;
  vatNoA?: string | null;
  contact?: string | null;
  phone?: string | null;
  email?: string | null;
  transType?: string | null;
  invMethod?: string | null;
  rcnMethod?: string | null;
  businessTypeId?: string | null;
  brId?: string | null;
  creditLimit?: number | null;
  creditDays?: number | null;
  gdsCustomerId?: string | null;
  ctaCardType?: string | null;
  ctaCardNo?: string | null;
  ctaExpiry?: string | null;
  serviceChargePolicy?: boolean | null;
  calcVatOnDomCanXchg?: boolean | null;
  exclFromAgeing?: boolean | null;
  custProfitPer?: number | null;
  buildingNo?: string | null;
  streetName?: string | null;
  district?: string | null;
  city?: string | null;
  countryId?: string | null;
  postalCode?: string | null;
  additionalNo?: string | null;
  crNo?: string | null;
  buildingNoA?: string | null;
  streetNameA?: string | null;
  districtA?: string | null;
  cityA?: string | null;
  countryIdA?: string | null;
  postalCodeA?: string | null;
  additionalNoA?: string | null;
  crNoA?: string | null;
  haveDivision?: boolean | null;
  status?: boolean | null;
  interCompany?: boolean | null;
  doNotRound?: boolean | null;
  shortName?: string | null;
  csAccountCategoryId?: string | null;
}

// Shape returned by backend: GET /customer
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

// Shared request helper (GET / POST / PUT / DELETE)
const apiRequest = async <T>(
  method: "GET" | "POST" | "PUT" | "DELETE",
  path: string,
  body?: unknown,
): Promise<T> => {
  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.message || "Request failed");
  }

  return result as T;
};

const apiGet = <T>(path: string) => apiRequest<T>("GET", path);

export const useCustomer = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [parentAccounts, setParentAccounts] = useState<ParentAccount[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [staffs, setStaffs] = useState<Staff[]>([]);

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

  const fetchCountries = useCallback(async (): Promise<Country[] | null> => {
    try {
      setError("");
      const result = await apiGet<{ data: Country[] }>("/customer/countries");
      const list = result.data ?? [];
      setCountries(list);
      return list;
    } catch (err: unknown) {
      console.error("Countries error:", err);
      setError(
        err instanceof Error ? err.message : "Failed to fetch countries",
      );
      return null;
    }
  }, []);

  const fetchStaffs = useCallback(async (): Promise<Staff[] | null> => {
    try {
      setError("");
      const result = await apiGet<{ data: Staff[] }>("/customer/staffs");
      const list = result.data ?? [];
      setStaffs(list);
      return list;
    } catch (err: unknown) {
      console.error("Staffs error:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch staffs");
      return null;
    }
  }, []);

  // ------------------------------------------------------------
  // Single-record calls. These THROW on failure (and don't touch the
  // shared `error` state, which the list page uses to hide the table)
  // so the calling component can show its own message.
  // ------------------------------------------------------------

  const fetchCustomer = useCallback(
    async (csAccountId: string): Promise<CustomerDetail> => {
      const result = await apiGet<{ data: CustomerDetail }>(
        `/customer/${encodeURIComponent(csAccountId)}`,
      );
      return result.data;
    },
    [],
  );

  const saveCustomer = useCallback(
    async (payload: CustomerDetail): Promise<void> => {
      await apiRequest("POST", "/customer", payload);
    },
    [],
  );

  const updateCustomer = useCallback(
    async (oldCsAccountId: string, payload: CustomerDetail): Promise<void> => {
      await apiRequest(
        "PUT",
        `/customer/${encodeURIComponent(oldCsAccountId)}`,
        payload,
      );
    },
    [],
  );

  const deleteCustomer = useCallback(
    async (csAccountId: string): Promise<void> => {
      await apiRequest(
        "DELETE",
        `/customer/${encodeURIComponent(csAccountId)}`,
      );
    },
    [],
  );

  return {
    customers,
    fetchCustomers,
    fetchNextCustomerId,
    parentAccounts,
    fetchParentAccounts,
    countries,
    fetchCountries,
    staffs,
    fetchStaffs,
    fetchCustomer,
    saveCustomer,
    updateCustomer,
    deleteCustomer,
    loading,
    error,
  };
};
