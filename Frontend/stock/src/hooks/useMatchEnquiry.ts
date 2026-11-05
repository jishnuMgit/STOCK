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

// the keys are the element ids of the screen; the year is the logged-in year, the server takes it from the x-year header
export interface GetMatchEnquiryParams {
  lkpBranch: string;
  lkpDocType: string;
  lkpDocNo: string;
}

export interface GetDocumentNosParams {
  lkpCsAccountID: string;
  lkpDivision: string;
}

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

// a line of the enquiry as the server sends it (the keys are the form field names)
const normaliseRow = (r: any, index: number): MatchEnquiryRow => {
  const pc = String(r.txtPC ?? "").toUpperCase();

  return {
    id: index + 1,
    pc: pc === "P" || pc === "C" ? pc : "",
    brId: String(r.lkpBranch ?? ""),
    docType: String(r.lkpDocType ?? ""),
    docNo: String(r.lkpDocNo ?? ""),
    date: formatDate(r.txtDate),
    accountId: String(r.lkpAccountID ?? ""),
    description: String(r.txtDescription ?? ""),
    slNo: toNum(r.txtSlNo),
    debit: toNum(r.txtDebit),
    credit: toNum(r.txtCredit),
    effectiveDate: formatDate(r.txtMatchApplyDate),
  };
};

/* =====================================================
   HOOK
===================================================== */

// a customer as the lookups send it
interface Customer {
  lkpCsAccountID: string;
  lkpCsAccountName: string;
}

const useMatchEnquiry = () => {
  // the Customer boxes: by account id (value = id, label = name) and by account name (value = name, label = id)
  const [customerOptions, setCustomerOptions] = useState<SelectOption[]>([]);
  const [customerNameOptions, setCustomerNameOptions] = useState<SelectOption[]>([]);
  // the Division box: the divisions of the chosen customer (value = id, label = name)
  const [divisionOptions, setDivisionOptions] = useState<SelectOption[]>([]);
  const [divisionLoading, setDivisionLoading] = useState(false);
  const [rows, setRows] = useState<MatchEnquiryRow[]>([]);
  const [loading, setLoading] = useState(false);

  /* ---------- LOOKUPS (the customers) ---------- */
  const getLookups = useCallback(async (): Promise<void> => {
    try {
      const result = await request(`${API}/getLookups`);

      setCustomerOptions(
        Array.isArray(result?.customers)
          ? (result.customers as Customer[])
              .map((c) => ({ value: c.lkpCsAccountID, label: c.lkpCsAccountName }))
              .sort((a, b) =>
                a.value.localeCompare(b.value, undefined, {
                  numeric: true,
                  sensitivity: "base",
                }),
              )
          : [],
      );

      setCustomerNameOptions(
        Array.isArray(result?.customers)
          ? (result.customers as Customer[])
              .map((c) => ({ value: c.lkpCsAccountName, label: c.lkpCsAccountID }))
              .sort((a, b) =>
                a.value.localeCompare(b.value, undefined, {
                  sensitivity: "base",
                }),
              )
          : [],
      );
    } catch (error) {
      console.error("Get Match Enquiry Lookups Error:", error);
      setCustomerOptions([]);
      setCustomerNameOptions([]);
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

  /* ---------- DIVISIONS OF A CUSTOMER (Division box) ---------- */
  const getDivisions = useCallback(
    async (lkpCsAccountID: string): Promise<SelectOption[]> => {
      setDivisionOptions([]);
      if (!lkpCsAccountID?.trim()) return [];

      setDivisionLoading(true);
      try {
        const result = await postJson(`${API}/getDivisions`, { lkpCsAccountID });

        const options: SelectOption[] = Array.isArray(result?.divisions)
          ? result.divisions
              .map((d: any) => ({
                value: String(d.lkpDivision ?? ""),
                label: String(d.txtDivisionName ?? d.lkpDivision ?? ""),
              }))
              .filter((o: SelectOption) => o.value.trim() !== "")
          : [];

        setDivisionOptions(options);
        return options;
      } catch (error) {
        console.error("Get Customer Division Error:", error);
        setDivisionOptions([]);
        return [];
      } finally {
        setDivisionLoading(false);
      }
    },
    [],
  );

  /* ---------- DOCUMENT NO. LIST (the Search button) ---------- */
  const getDocumentNos = useCallback(
    async (params: GetDocumentNosParams): Promise<Record<string, any>[]> => {
      const result = await postJson(`${API}/getDocumentNos`, params);
      return Array.isArray(result?.documents) ? result.documents : [];
    },
    [],
  );

  const clearRows = useCallback(() => setRows([]), []);

  return {
    customerOptions,
    customerNameOptions,
    divisionOptions,
    divisionLoading,
    rows,
    loading,
    getLookups,
    getDivisions,
    getMatchEnquiry,
    getDocumentNos,
    clearRows,
  };
};

export default useMatchEnquiry;
