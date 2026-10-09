import { useCallback, useState } from "react";

// ============================================================
// TYPES
// ============================================================

// Tree node used by COAListPage
export interface CoaNode {
  id: string; // = accountId (unique)
  name: string;
  accountId: string;
  level: number; // account level 1..4 (from the DB)
  children?: CoaNode[];
  color?: string;
  bold?: boolean;
}

// Backend row: GET /chart-of-accounts
interface CoaApiRow {
  accountId: string | null;
  accountName: string | null;
  accountGroupId: string | null;
  accountLevel: number | string | null;
}

// GET /chart-of-accounts/:accountId
export interface CoaDetail {
  accountId: string;
  accountName: string;
  accountNameA: string;
  groupOrHead: string; // G | H | P
  accountLevel: number | null;
  accountTypeId: string;
  haveCC: boolean;
  accountGroupId: string;
  accountGroupName: string;
  accountGroupLevel: number | null;
}

// POST / PUT body
export interface CoaPayload {
  accountGroupId?: string;
  accountId?: string; // Manual id (or the new id on modify)
  autoId?: boolean; // true = server generates the id (POST only)
  accountName: string;
  accountNameA?: string;
  haveCC?: boolean;
  groupOrHead?: string;
  menuName?: string;
}

const API_URL = import.meta.env.VITE_API_URL;
const BASE = "/coa"; // ADJUST to the path you mount the router on

// ============================================================
// HELPERS
// ============================================================

// Same colours the old static tree used, by account level
const levelStyle = (level: number): Pick<CoaNode, "color" | "bold"> => {
  if (level === 1) return { color: "text-green-600", bold: true };
  if (level === 2) return { color: "text-blue-600", bold: true };
  if (level === 3) return { color: "text-fuchsia-600", bold: true };
  return {};
};

// Flat rows (id + parent id) -> nested tree. Keeps backend order.
const buildTree = (rows: CoaApiRow[]): CoaNode[] => {
  const nodes = new Map<string, CoaNode>();

  rows.forEach((r) => {
    if (!r.accountId) return;
    const level = Number(r.accountLevel) || 1;
    nodes.set(r.accountId, {
      id: r.accountId,
      accountId: r.accountId,
      name: r.accountName ?? "",
      level,
      children: [],
      ...levelStyle(level),
    });
  });

  const roots: CoaNode[] = [];

  rows.forEach((r) => {
    if (!r.accountId) return;
    const node = nodes.get(r.accountId)!;
    const parent = r.accountGroupId ? nodes.get(r.accountGroupId) : undefined;

    if (parent && parent !== node) parent.children!.push(node);
    else roots.push(node);
  });

  return roots;
};

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

// ============================================================
// HOOK
// ============================================================

export const useCoa = () => {
  const [tree, setTree] = useState<CoaNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // List page: loads the whole tree
  const fetchTree = useCallback(async (): Promise<CoaNode[] | null> => {
    try {
      setLoading(true);
      setError("");
      const result = await apiRequest<{ data: CoaApiRow[] }>("GET", BASE);
      const built = buildTree(result.data ?? []);
      setTree(built);
      return built;
    } catch (err: unknown) {
      console.error("COA tree error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to fetch chart of accounts",
      );
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // ------------------------------------------------------------
  // Single-record calls. These THROW on failure (and don't touch the
  // shared `error` state) so the popup can show its own message.
  // ------------------------------------------------------------

  const fetchAccount = useCallback(
    async (accountId: string): Promise<CoaDetail> => {
      const result = await apiRequest<{ data: CoaDetail }>(
        "GET",
        `${BASE}/${encodeURIComponent(accountId)}`,
      );
      return result.data;
    },
    [],
  );

  const fetchNextAccountId = useCallback(
    async (
      accountGroupId: string,
      accountGroupLevel: number,
    ): Promise<string> => {
      const params = new URLSearchParams({
        accountGroupId,
        accountGroupLevel: String(accountGroupLevel),
      });
      const result = await apiRequest<{ data: { nextAccountId: string } }>(
        "GET",
        `${BASE}/next-id?${params}`,
      );
      return result.data.nextAccountId;
    },
    [],
  );

  const saveAccount = useCallback(
    async (payload: CoaPayload): Promise<string> => {
      const result = await apiRequest<{ data: { accountId: string } }>(
        "POST",
        BASE,
        payload,
      );
      return result.data.accountId;
    },
    [],
  );

  const updateAccount = useCallback(
    async (oldAccountId: string, payload: CoaPayload): Promise<string> => {
      const result = await apiRequest<{ data: { accountId: string } }>(
        "PUT",
        `${BASE}/${encodeURIComponent(oldAccountId)}`,
        payload,
      );
      return result.data.accountId;
    },
    [],
  );

  const deleteAccount = useCallback(
    async (accountId: string): Promise<void> => {
      await apiRequest("DELETE", `${BASE}/${encodeURIComponent(accountId)}`);
    },
    [],
  );

  return {
    tree,
    fetchTree,
    fetchAccount,
    fetchNextAccountId,
    saveAccount,
    updateAccount,
    deleteAccount,
    loading,
    error,
  };
};
