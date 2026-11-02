import { useCallback, useState } from "react";
import { apiFetch } from "../utils/session";

/* =====================================================
   TYPES
===================================================== */

export interface SelectOption {
  value: string;
  label: string;
}

/** One enquiry line, normalised from sp_pagematchenquiry. */
export interface MatchEnquiryRow {
  id: number;
  pc: "P" | "C" | ""; // P = Parent, C = Child
  brId: string;
  docType: string;
  docNo: string;
  date: string; // dd/MM/yyyy
  accountId: string;
  description: string;
  slNo: number;
  debit: number;
  credit: number;
  effectiveDate: string; // dd/MM/yyyy (fmatchapplydate)
}

export interface GetMatchEnquiryParams {
  year: string | number;
  brId: string;
  docType: string;
  docNo: string;
}

export interface GetMatchAccountsParams {
  strDocType: string;
  strCSAccountID: string;
  strDivID: string;
  year: string | number;
}

// matched-documents list lives in the Match Reversal controller (mode 'GM')
const MATCHED_DOCS_API = `${import.meta.env.VITE_API_URL}/MatchReversal`;

/* =====================================================
   HELPERS
===================================================== */

const API = `${import.meta.env.VITE_API_URL}/MatchEnquiry`;

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

const normaliseRow = (r: any, index: number): MatchEnquiryRow => {
  const pc = String(r.fpc ?? r.fPC ?? "").toUpperCase();

  return {
    id: index + 1,
    pc: pc === "P" || pc === "C" ? pc : "",
    brId: String(r.fbrid ?? r.fBrID ?? ""),
    docType: String(r.fdoctype ?? r.fDocType ?? ""),
    docNo: String(r.fdocno ?? r.fDocNo ?? ""),
    date: formatDate(r.fdate ?? r.fDate),
    accountId: String(r.faccountid ?? r.fAccountID ?? ""),
    description: String(r.fdescription ?? r.fDescription ?? ""),
    slNo: toNum(r.fslno ?? r.fSlNo),
    debit: toNum(r.fdebit ?? r.fDebit),
    credit: toNum(r.fcredit ?? r.fCredit),
    effectiveDate: formatDate(r.fmatchapplydate ?? r.fMatchApplyDate),
  };
};

/* =====================================================
   HOOK
===================================================== */

const useMatchEnquiry = () => {
  const [docTypeOptions, setDocTypeOptions] = useState<SelectOption[]>([]);
  const [rows, setRows] = useState<MatchEnquiryRow[]>([]);
  const [loading, setLoading] = useState(false);

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
      console.error("Get Match Enquiry Lookups Error:", error);
      setDocTypeOptions([]);
      return [];
    }
  }, []);

  /* ---------- GET MATCH ENQUIRY (Refresh button) ---------- */
  const getMatchEnquiry = useCallback(
    async (params: GetMatchEnquiryParams): Promise<MatchEnquiryRow[]> => {
      setLoading(true);
      try {
        const result = await postJson(`${API}/getMatchEnquiry`, params);

        const data: MatchEnquiryRow[] = Array.isArray(result?.data)
          ? result.data.map(normaliseRow)
          : [];

        setRows(data);
        return data;
      } catch (error) {
        console.error("Get Match Enquiry Error:", error);
        setRows([]);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  /* ---------- MATCHED DOCUMENTS (Document No. dropdown) ---------- */
  const getMatchAccounts = useCallback(
    async (params: GetMatchAccountsParams): Promise<Record<string, any>[]> => {
      const result = await postJson(
        `${MATCHED_DOCS_API}/getMatchAccounts`,
        params,
      );
      return Array.isArray(result?.data) ? result.data : [];
    },
    [],
  );

  const clearRows = useCallback(() => setRows([]), []);

  return {
    docTypeOptions,
    rows,
    loading,
    getLookups,
    getMatchEnquiry,
    getMatchAccounts,
    clearRows,
  };
};

export default useMatchEnquiry;
