import { useCallback, useState } from "react";

// same helper the receipt screen uses: it adds the company / year / user headers
// TODO: adjust the path if hooks and utils are not siblings under src
import { apiFetch } from "../utils/session";

const API_URL = import.meta.env.VITE_API_URL;

const JOURNAL_BASE = "/journal";

// TODO: backend endpoint still to be created: GET ?brId&docType -> { data: { docNo } }
const NEXT_DOC_NO_PATH = "/journal/next-doc-no";

// TODO: journal types endpoint - match the path / backend once it is created
// (expected rows: { fpid, fpname }, like /purchase-invoice/invoice-types)
const JOURNAL_TYPES_PATH = "/journal/types";

// accounts + cost centers (dbo.filllookupaccountname / dbo.fillcostcenters, like receipt)
const LOOKUPS_PATH = "/journal/lookups";

const GRID_ROWS = 20;

/* ---------- UI shapes ---------- */

export interface Branch {
    id: string;
    name: string;
}

export interface JournalType {
    value: string; // fpid
    label: string; // fpname
}

/* same shapes JournalTable expects (AccountData / CostCenter) */
export interface JournalAccount {
    fcoid: string;
    faccountid: string;
    faccountgroupid?: string;
    fgph: string;
    fgcs: string;
    faccountname: string;
}

export interface JournalCostCenter {
    fccid: string;
    fccname: string;
    fpositionno: number;
}

export interface JournalLookups {
    accounts: JournalAccount[];
    costCenters: JournalCostCenter[];
}

export interface JournalHeader {
    brId: string;
    docNo: string;
    date: string; // yyyy-mm-dd
    note: string;
}

export interface JournalRow {
    accountId: string;
    ccId: string;
    description: string;
    debit: string;
    credit: string;
}

export const emptyRow = (): JournalRow => ({
    accountId: "",
    ccId: "",
    description: "",
    debit: "0.00",
    credit: "0.00",
});

export const createRows = (count = GRID_ROWS): JournalRow[] =>
    Array.from({ length: count }, emptyRow);

/* pad saved rows up to the grid size */
export const padRows = (rows: JournalRow[], count = GRID_ROWS): JournalRow[] => [
    ...rows,
    ...Array.from({ length: Math.max(count - rows.length, 0) }, emptyRow),
];

export const emptyHeader = (): JournalHeader => ({
    brId: "",
    docNo: "",
    date: new Date().toISOString().slice(0, 10),
    note: "",
});

/* ---------- API shapes ---------- */

interface JournalHeaderApi {
    fdate: string | null; // 'YYYY-MM-DD'
    fnote: string | null;
    fpost: boolean | number | null;
    fsuserid: string | null;
    fsuserdate: string | null;
    fmuserid: string | null;
    fmuserdate: string | null;
}

interface JournalLineApi {
    fslno: number;
    faccountid: string | null;
    fccid: string | null;
    fdebit: string | number | null;
    fcredit: string | number | null;
    fdescription: string | null;
}

interface JournalTypeApi {
    fpid: string;
    fpname: string | null;
}

interface LookupsApi {
    accounts: Record<string, unknown>[];
    costCenters: Record<string, unknown>[];
}

export interface SaveJournalPayload {
    mode: "S" | "M";
    header: JournalHeader;
    rows: JournalRow[];
}

const n = (v: unknown): number => {
    const x = Number(v);
    return Number.isFinite(x) ? x : 0;
};
const s = (v: unknown): string => (v == null ? "" : String(v));
const fixed = (v: unknown, d: number) => n(v).toFixed(d);

/* ---------- shared request helper ---------- */

const apiRequest = async <T>(
    method: "GET" | "POST" | "PUT" | "DELETE",
    path: string,
    body?: unknown,
): Promise<T> => {
    const response = await apiFetch(`${API_URL}${path}`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
    });

    /* a missing route returns an HTML page, so don't crash on response.json() */
    let result: any = null;

    try {
        result = await response.json();
    } catch {
        throw new Error(`Request failed (${response.status}) - ${method} ${path}`);
    }

    if (!response.ok || !result.success) {
        throw new Error(result?.message || "Request failed");
    }

    return result as T;
};

export const useJournal = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    /* ---------- branch calls (same as purchase invoice) ---------- */

    const fetchDefaultBranch = useCallback(async (): Promise<string> => {
        const result = await apiRequest<{ data: string }>("GET", "/branch/default");
        return s(result.data);
    }, []);

    const fetchBranches = useCallback(async (): Promise<Branch[]> => {
        const result = await apiRequest<{
            data: { fbrid: string; fbrname: string | null }[];
        }>("GET", "/branch");
        return result.data.map((b) => ({ id: b.fbrid, name: s(b.fbrname) }));
    }, []);

    /* journal types (like fetchInvoiceTypes in usePurchaseInvoice) */
    const fetchJournalTypes = useCallback(async (): Promise<JournalType[]> => {
        const result = await apiRequest<{ data: JournalTypeApi[] }>(
            "GET",
            JOURNAL_TYPES_PATH,
        );
        return result.data.map((t) => ({
            value: s(t.fpid),
            label: s(t.fpname) || s(t.fpid),
        }));
    }, []);

    /* next journal number for a branch (doc type JB is fixed on the server) */
    const fetchNextDocNo = useCallback(
        async (brId: string): Promise<string> => {
            const params = new URLSearchParams({ brId });
            const result = await apiRequest<{ data: { docNo: string } }>(
                "GET",
                `${NEXT_DOC_NO_PATH}?${params}`,
            );
            return s(result.data.docNo);
        },
        [],
    );

    /* ---------- lookups: accounts + cost centers ---------- */

    const fetchLookups = useCallback(async (): Promise<JournalLookups> => {
        const result = await apiRequest<{ data: LookupsApi }>("GET", LOOKUPS_PATH);
        return {
            accounts: result.data.accounts.map((a) => ({
                fcoid: s(a.fcoid),
                faccountid: s(a.faccountid),
                faccountgroupid: s(a.faccountgroupid),
                fgph: s(a.fgph),
                fgcs: s(a.fgcs),
                faccountname: s(a.faccountname),
            })),
            costCenters: result.data.costCenters.map((c, index) => ({
                fccid: s(c.fccid),
                fccname: s(c.fccname),
                fpositionno: n(c.fpositionno) || index + 1,
            })),
        };
    }, []);

    /* ---------- journal ---------- */

    /* Returns null when not found (new document) or on error (see `error`). */
    const fetchJournal = useCallback(
        async (
            brId: string,
            docNo: string,
        ): Promise<{
            header: JournalHeader;
            rows: JournalRow[];
            posted: boolean;
            savedBy: string;
            modifiedBy: string;
        } | null> => {
            try {
                setLoading(true);
                setError("");

                const params = new URLSearchParams({
                    lkpBranch: brId,
                    txtDocNo: docNo,
                });
                const result = await apiRequest<{
                    header: JournalHeaderApi | null;
                    lines: JournalLineApi[];
                }>("GET", `${JOURNAL_BASE}?${params}`);

                const h = result.header;

                // no header = new document
                if (!h) return null;

                return {
                    header: {
                        brId,
                        docNo,
                        date: s(h.fdate).slice(0, 10),
                        note: s(h.fnote),
                    },
                    rows: result.lines.map((l) => ({
                        accountId: s(l.faccountid),
                        ccId: s(l.fccid),
                        description: s(l.fdescription),
                        debit: fixed(l.fdebit, 2),
                        credit: fixed(l.fcredit, 2),
                    })),
                    posted: Boolean(h.fpost),
                    savedBy: h.fsuserid ? `${s(h.fsuserid)} ${s(h.fsuserdate)}` : "",
                    modifiedBy: h.fmuserid ? `${s(h.fmuserid)} ${s(h.fmuserdate)}` : "",
                };
            } catch (err: unknown) {
                setError(err instanceof Error ? err.message : "Failed to fetch");
                return null;
            } finally {
                setLoading(false);
            }
        },
        [],
    );

    /* S = POST (new), M = PUT (modify) */
    const saveJournal = useCallback(
        async ({ mode, header, rows }: SaveJournalPayload): Promise<void> => {
            const payload = {
                lkpBranch: header.brId,
                txtDocNo: header.docNo,
                dtpDate: header.date,
                strNote: header.note,
                rows: rows
                    .filter((r) => r.accountId)
                    .map((r, idx) => ({
                        txtslNo: idx + 1,
                        lkpAccountID: r.accountId,
                        lkpCCID: r.ccId,
                        txtDescription: r.description,
                        txtDebit: n(r.debit),
                        txtCredit: n(r.credit),
                    })),
            };

            await apiRequest(mode === "S" ? "POST" : "PUT", JOURNAL_BASE, payload);
        },
        [],
    );

    const deleteJournal = useCallback(
        async (brId: string, docNo: string): Promise<void> => {
            const params = new URLSearchParams({ lkpBranch: brId, txtDocNo: docNo });
            await apiRequest("DELETE", `${JOURNAL_BASE}?${params}`);
        },
        [],
    );

    return {
        fetchDefaultBranch,
        fetchBranches,
        fetchJournalTypes,
        fetchNextDocNo,
        fetchLookups,
        fetchJournal,
        saveJournal,
        deleteJournal,
        loading,
        error,
    };
};