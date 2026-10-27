import { useCallback, useState } from "react";
import { apiFetch } from "../utils/session";

export interface SelectOption {
  value: string;
  label: string;
}

export interface MatchAccountRow {
  [key: string]: unknown;
}

interface GetMatchAccountsParams {
  strDocType: string;
  strCSAccountID: string;
  strDivID: string;
  year: string | number;
}

export interface GetDocumentsToMatchParams {
  customerAccountId: string;
  docNo: string;
  brId: string;
  docType: string;
  divId: string;
  year: string | number;
  matchAccountSlNo: number;
  matchAccountSlNoSub: number;
  debit: number;
  credit: number;
  matchDocAmt: number;
}

export interface SaveMatchPayload {
  strMode: string;
  year: string | number;
  brId: string;
  docType: string;
  docNo: string;
  intDocNo: number;
  docDate: string;
  efDate: string; // YYYY-MM-DD
  divId: string;
  totalAmount: number;
  data: Record<string, unknown>[];
  match: Record<string, unknown>[];
}

const API = import.meta.env.VITE_API_URL;

const postJson = async (url: string, body: unknown) => {
  const response = await apiFetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const result = await response.json().catch(() => null);

  if (!response.ok || !result?.success) {
    throw new Error(result?.message || `HTTP Error: ${response.status}`);
  }
  return result;
};

const useMatching = () => {
  const [divisionOptionsLocal, setDivisionOptionsLocal] = useState<
    SelectOption[]
  >([]);
  const [divisionLoading, setDivisionLoading] = useState(false);
  const [matchAccounts, setMatchAccounts] = useState<MatchAccountRow[]>([]);
  const [matchAccountsLoading, setMatchAccountsLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  /* ---------- GET DIVISION ---------- */
  const getDiv = useCallback(
    async (strCSAccountID: string): Promise<SelectOption[]> => {
      setDivisionOptionsLocal([]);
      if (!strCSAccountID?.trim()) return [];

      setDivisionLoading(true);
      try {
        const result = await postJson(`${API}/Receipt/getDivID`, {
          accountId: strCSAccountID,
        });

        if (!Array.isArray(result?.data)) return [];

        const options: SelectOption[] = result.data
          .map((d: any) => ({
            value: String(d.fdivid ?? d.fDivID ?? ""),
            label: String(
              d.fdivname ?? d.fDivName ?? d.fdivid ?? d.fDivID ?? "",
            ),
          }))
          .filter((o: SelectOption) => o.value.trim() !== "");

        setDivisionOptionsLocal(options);
        return options;
      } catch (error) {
        console.error("Get Customer Division Error:", error);
        setDivisionOptionsLocal([]);
        return [];
      } finally {
        setDivisionLoading(false);
      }
    },
    [],
  );

  /* ---------- GET MATCH ACCOUNTS (GetTL) ---------- */
  const getMatchAccounts = useCallback(
    async (params: GetMatchAccountsParams): Promise<MatchAccountRow[]> => {
      setMatchAccountsLoading(true);
      try {
        const result = await postJson(`${API}/Match/getMatchAccounts`, params);
        const data: MatchAccountRow[] = Array.isArray(result?.data)
          ? result.data
          : [];
        setMatchAccounts(data);
        return data;
      } catch (error) {
        console.error("Get Match Accounts Error:", error);
        setMatchAccounts([]);
        throw error;
      } finally {
        setMatchAccountsLoading(false);
      }
    },
    [],
  );

  /* ---------- GET DOCUMENTS TO MATCH (match grid) ---------- */
  const getDocumentsToMatch = useCallback(
    async (params: GetDocumentsToMatchParams): Promise<MatchAccountRow[]> => {
      const result = await postJson(`${API}/Match/getDocumentsToMatch`, params);

      // matchService's return shape isn't known to me - accept common keys.
      const rows =
        result.data ?? result.rows ?? result.documents ?? result.result ?? [];
      return Array.isArray(rows) ? rows : [];
    },
    [],
  );

  /* ---------- GET MATCH DATE ---------- */
  const getMatchDate = useCallback(
    async (params: {
      year: string | number;
      brId: string;
      docType: string;
      docNo: string;
    }): Promise<string | null> => {
      try {
        const result = await postJson(`${API}/Match/getMatchDate`, params);
        return result.date ?? null;
      } catch (error) {
        console.error("Get Match Date Error:", error);
        return null;
      }
    },
    [],
  );

  /* ---------- SAVE MATCH ---------- */
  const saveMatch = useCallback(async (payload: SaveMatchPayload) => {
    setSaving(true);
    try {
      return await postJson(`${API}/Match/saveMatch`, payload);
    } finally {
      setSaving(false);
    }
  }, []);

  const clearMatchingData = useCallback(() => {
    setDivisionOptionsLocal([]);
    setMatchAccounts([]);
  }, []);

  return {
    divisionOptionsLocal,
    divisionLoading,
    matchAccounts,
    matchAccountsLoading,
    saving,
    getDiv,
    getMatchAccounts,
    getDocumentsToMatch,
    getMatchDate,
    saveMatch,
    clearMatchingData,
  };
};

export default useMatching;
