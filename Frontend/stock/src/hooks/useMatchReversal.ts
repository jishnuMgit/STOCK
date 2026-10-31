import { useCallback, useState } from "react";
import { apiFetch } from "../utils/session";

/* =====================================================
   TYPES
===================================================== */

export interface SelectOption {
  value: string;  
  label: string;
}

/** One matched line, normalised from the SP (GetTL) result. */
export interface MatchReversalRow {
  id: number;
  select: boolean; // "Un-Match" checkbox
  slNo: number;
  slNoSub: number;
  csAccountId: string;
  date: string; // dd/MM/yyyy
  description: string;
  docAmount: number;
  debit: number;
  credit: number;
}

export interface GetMatchedTransactionsParams {
  year: string | number;
  brId: string;
  docType: string;
  docNo: string;
  divId?: string;
}

export interface UnmatchPayload {
  year: string | number;
  brId: string;
  docType: string;
  docNo: string;
  divId?: string;
  rows: MatchReversalRow[]; // all rows; only select === true are sent
}

/* =====================================================
   HELPERS
===================================================== */

const API = `${import.meta.env.VITE_API_URL}/MatchReversal`;

const toNum = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

// "2025-04-01T00:00:00.000Z" -> "01/04/2025" (string slice, no timezone shift)
const formatDate = (v: unknown): string => {
  if (v === null || v === undefined) return "";
  const s = String(v);
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : s;
};

const request = async (url: string, init?: RequestInit) => {
  const response = await apiFetch(url, init);
  const result = await response.json().catch(() => null);

  if (!response.ok || !result?.success) {
    throw new Error(result?.message || `HTTP Error: ${response.status}`);
  }
  return result;
};

const postJson = (url: string, body: unknown) =>
  request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

const normaliseRow = (r: any, index: number): MatchReversalRow => ({
  id: index + 1,
  select: false,
  slNo: toNum(r.fslno ?? r.fSlNo),
  slNoSub: toNum(r.fslnosub ?? r.fSlNoSub),
  csAccountId: String(r.fcsaccountid ?? r.fCSAccountID ?? ""),
  date: formatDate(r.fdate ?? r.fDate),
  description: String(r.fdescription ?? r.fDescription ?? ""),
  docAmount: toNum(r.fdocamt ?? r.fDocAmt),
  debit: toNum(r.fdebit ?? r.fDebit),
  credit: toNum(r.fcredit ?? r.fCredit),
});

/* =====================================================
   HOOK
===================================================== */

const useMatchReversal = () => {
  const [docTypeOptions, setDocTypeOptions] = useState<SelectOption[]>([]);
  const [rows, setRows] = useState<MatchReversalRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  /* ---------- LOOKUPS (document types) ---------- */
  const getLookups = useCallback(async (): Promise<SelectOption[]> => {
    try {
      const result = await request(`${API}/getLookups`);

      const options: SelectOption[] = Array.isArray(result?.DocType)
        ? result.DocType.map((d: any) => ({
            value: String(d.fdoctype ?? ""),
            label: String(d.fdocname ?? ""),
          }))
        : [];

      setDocTypeOptions(options);
      return options;
    } catch (error) {
      console.error("Get Match Reversal Lookups Error:", error);
      setDocTypeOptions([]);
      return [];
    }
  }, []);

  /* ---------- GET MATCHED TRANSACTIONS (GetTL) ---------- */
  const getMatchedTransactions = useCallback(
    async (
      params: GetMatchedTransactionsParams,
    ): Promise<MatchReversalRow[]> => {
      setLoading(true);
      try {
        const result = await postJson(`${API}/getMatchedTransactions`, params);

        const data: MatchReversalRow[] = Array.isArray(result?.data)
          ? result.data.map(normaliseRow)
          : [];

        setRows(data);
        return data;
      } catch (error) {
        console.error("Get Matched Transactions Error:", error);
        setRows([]);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  /* ---------- TICK / UNTICK "Un-Match" CHECKBOX ---------- */
  const toggleSelect = useCallback((rowIndex: number, value: boolean) => {
    setRows((prev) =>
      prev.map((row, index) =>
        index === rowIndex ? { ...row, select: value } : row,
      ),
    );
  }, []);

  /* ---------- UN-MATCH ---------- */
  const unmatch = useCallback(async (payload: UnmatchPayload) => {
    setSaving(true);
    try {
      const { rows: gridRows, ...header } = payload;

      return await postJson(`${API}/unmatch`, {
        ...header,
        data: gridRows.map((r) => ({
          fSelect: r.select,
          fSlNo: r.slNo,
          fSlNoSub: r.slNoSub,
          fCSAccountID: r.csAccountId,
        })),
      });
    } finally {
      setSaving(false);
    }
  }, []);

  const clearRows = useCallback(() => setRows([]), []);

  return {
    docTypeOptions,
    rows,
    loading,
    saving,
    getLookups,
    getMatchedTransactions,
    toggleSelect,
    unmatch,
    clearRows,
  };
};

export default useMatchReversal;
