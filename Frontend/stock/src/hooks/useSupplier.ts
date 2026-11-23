// src/hooks/useSupplier.ts
import { useCallback, useState } from "react";
import type {
    ParentAccount,
    Country,
    Staff,
    Branch,
    CustomerDetail,
} from "./useCustomer";

// Same shapes as customer; only the names differ
export type { ParentAccount, Country, Staff, Branch };

// Shape used by the frontend (SupplierList page)
export interface Supplier {
    lkpSupplierID: string;
    lkpSupplierName: string;
    lkpHaveDivision: boolean;
    lkpBranch: string;
    lkpGlAccountID: string;
    lkpGlAccountName: string;
}

// Full supplier record: GET /suppliers/:csAccountId (response)
// and POST / PUT body. Keys match the backend SP_PARAM_MAP.
export type SupplierDetail = CustomerDetail;

// Shape returned by backend: GET /suppliers
interface SupplierApiRow {
    csAccountId: string | null;
    csAccountName: string | null;
    cs: string | null;
    brId: string | null;
    haveDivision: boolean | null;
    gAccountId: string | null;
    gAccountName: string | null;
}

interface SupplierListResponse {
    success: boolean;
    message?: string;
    count?: number;
    data?: SupplierApiRow[];
}

const API_URL = import.meta.env.VITE_API_URL;
const BASE = "/suppliers"; // confirm: matches app.use("/api/suppliers", ...) in the backend

const mapSupplier = (r: SupplierApiRow): Supplier => ({
    lkpSupplierID: r.csAccountId ?? "",
    lkpSupplierName: r.csAccountName ?? "",
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

export const useSupplier = () => {
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [parentAccounts, setParentAccounts] = useState<ParentAccount[]>([]);
    const [countries, setCountries] = useState<Country[]>([]);
    const [staffs, setStaffs] = useState<Staff[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);

    const fetchSuppliers = useCallback(async (): Promise<Supplier[] | null> => {
        try {
            setLoading(true);
            setError("");

            const result = await apiGet<SupplierListResponse>(BASE);
            const list = (result.data ?? []).map(mapSupplier);
            setSuppliers(list);
            return list;
        } catch (err: unknown) {
            console.error("Supplier list error:", err);
            setError(
                err instanceof Error ? err.message : "Failed to fetch supplier list",
            );
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchNextSupplierId = useCallback(
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
                    `${BASE}/next-id?${params}`,
                );
                return result.data.nextAccountId;
            } catch (err: unknown) {
                console.error("Next supplier ID error:", err);
                setError(
                    err instanceof Error ? err.message : "Failed to generate supplier ID",
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
                `${BASE}/parent-accounts`,
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
            const result = await apiGet<{ data: Country[] }>(`${BASE}/countries`);
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
            const result = await apiGet<{ data: Staff[] }>(`${BASE}/staffs`);
            const list = result.data ?? [];
            setStaffs(list);
            return list;
        } catch (err: unknown) {
            console.error("Staffs error:", err);
            setError(err instanceof Error ? err.message : "Failed to fetch staffs");
            return null;
        }
    }, []);

    const fetchBranches = useCallback(async (): Promise<Branch[] | null> => {
        try {
            setError("");
            const result = await apiGet<{
                data: { fbrid: string; fbrname: string | null }[];
            }>("/branch");
            const list = (result.data ?? []).map((b) => ({
                brId: b.fbrid,
                brName: b.fbrname ?? "",
            }));
            setBranches(list);
            return list;
        } catch (err: unknown) {
            console.error("Branches error:", err);
            setError(err instanceof Error ? err.message : "Failed to fetch branches");
            return null;
        }
    }, []);

    // Single-record calls: these THROW so the calling component shows its own message.

    const fetchSupplier = useCallback(
        async (csAccountId: string): Promise<SupplierDetail> => {
            const result = await apiGet<{ data: SupplierDetail }>(
                `${BASE}/${encodeURIComponent(csAccountId)}`,
            );
            return result.data;
        },
        [],
    );

    const saveSupplier = useCallback(
        async (payload: SupplierDetail): Promise<void> => {
            await apiRequest("POST", BASE, payload);
        },
        [],
    );

    const updateSupplier = useCallback(
        async (oldCsAccountId: string, payload: SupplierDetail): Promise<void> => {
            await apiRequest(
                "PUT",
                `${BASE}/${encodeURIComponent(oldCsAccountId)}`,
                payload,
            );
        },
        [],
    );

    const deleteSupplier = useCallback(
        async (csAccountId: string): Promise<void> => {
            await apiRequest("DELETE", `${BASE}/${encodeURIComponent(csAccountId)}`);
        },
        [],
    );

    return {
        suppliers,
        fetchSuppliers,
        fetchNextSupplierId,
        parentAccounts,
        fetchParentAccounts,
        countries,
        fetchCountries,
        staffs,
        fetchStaffs,
        branches,
        fetchBranches,
        fetchSupplier,
        saveSupplier,
        updateSupplier,
        deleteSupplier,
        loading,
        error,
    };
};