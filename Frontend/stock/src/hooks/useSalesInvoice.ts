import { useCallback, useEffect, useState } from "react";
import { apiFetch, getSession } from "../utils/session";

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

/* ---------- lookups ---------- */

export interface CustomerLookup {
  id: string;
  name: string;
  creditLimit: number;
  address: string;
  phone: string;
}

export interface ParamLookup {
  id: string; // fPID
  name: string; // fPName
}

export interface ItemLookup {
  id: string;
  name: string;
  unit: string;
}

export interface SalesLookups {
  customers: CustomerLookup[];
  discTypes: ParamLookup[];
  priceLevels: ParamLookup[];
  items: ItemLookup[];
}

/* customers, discount types and price levels come from /sales-invoice/lookups */
interface LookupsApi {
  customers: {
    fAccountID: string;
    fAccountName: string | null;
    fCreditLimit: string | number | null;
    fAddress1: string | null;
    fPhone: string | null;
  }[];
  discTypes: { fPID: string; fPName: string | null }[];
  priceLevels: { fPID: string; fPName: string | null }[];
}

/* items come from the shared /item/items endpoint (same as purchase invoice) */
interface ItemApi {
  itemID: string;
  itemName: string | null;
  branchID: string | null;
  unit: string | null;
  inactive: number | boolean | null;
}

/* ---------- invoice (UI shapes, inputs are strings) ---------- */

export interface SalesHeader {
  brId: string;
  docNo: string;
  invoiceType: string;
  date: string; // yyyy-mm-dd
  dateH: string; // hijri, computed by the UI
  customerId: string;
  customerName: string;
  address: string;
  phone: string;
  customerRef: string;
  custPriceLevel: string;
  note: string;
  discType: "A" | "P";
  discPer: string;
  discAmt: string;
  vatPer: string;
}

export interface SalesRow {
  itemId: string;
  unit: string;
  priceLevel: string;
  qty: string;
  unitPrice: string;
  itemDiscAmt: string; // per-unit discount
  netUnitPrice: string;
  totalPrice: string; // excl. VAT
  itemVatAmt: string;
  totalPriceV: string; // incl. VAT
  totItemDiscAmt: string;
  unitCost: string;
  totalCost: string;
  dnNo: string;
}

export interface DeliveryNoteRow {
  slNo: number;
  dnNo: string;
  checked: boolean;
}

export interface SalesTotals {
  docAmt: number;
  discPer: number;
  discAmt: number;
  netDocAmtWoVAT: number;
  vatAmt: number;
  netDocAmt: number;
}

export interface SalesUserInfo {
  savedBy: string;
  savedAt: string;
  modifiedBy: string;
  modifiedAt: string;
  postOrder: number;
}

interface InvoiceHeaderApi {
  fdate: string | null;
  fdate_h: string | null;
  faccountid: string | null;
  faccountname: string | null;
  faddress1: string | null;
  fphone: string | null;
  fcustomerref: string | null;
  fpricelevel: string | null;
  fnote: string | null;
  fdisctype: string | null;
  fdiscper: string | number | null;
  fdiscamt: string | number | null;
  fnetdocamtwovat: string | number | null;
  fvatper: string | number | null;
  fvatamt: string | number | null;
  fnetdocamt: string | number | null;
  fpostorder: string | number | null;
  fpost: boolean | null;
  fcuserid: string | null;
  fcuserdate: string | null;
  fmuserid: string | null;
  fmuserdate: string | null;
}

interface InvoiceLineApi {
  fslno: number;
  fitemid: string | null;
  funit: string | null;
  fpricelevel: string | null;
  fqtyout: string | number | null;
  funitprice: string | number | null;
  fnetunitprice: string | number | null;
  fitemdiscamt: string | number | null;
  fitemvatamt: string | number | null;
  ftotalprice: string | number | null;
  ftotalpricev: string | number | null;
  funitcost: string | number | null;
  ftotalcost: string | number | null;
  ftotitemdiscamt: string | number | null;
  fdnno: string | null;
}

interface CalcApi {
  rows: {
    totItemDiscAmt: number;
    netUnitPrice: number;
    totalPrice: number;
    itemVatAmt: number;
    totalPriceV: number;
    totalCost: number;
  }[];
  docAmt: number;
  discPer: number;
  discAmt: number;
  netDocAmtWoVAT: number;
  vatAmt: number;
  netDocAmt: number;
}

export interface SavePayload {
  mode: "S" | "M";
  year: string;
  header: SalesHeader;
  rows: SalesRow[];
  originalSlNos: number[];
  /** omit to leave existing DN links untouched; [] clears them */
  deliveryNotes?: DeliveryNoteRow[];
}

// ============================================================
// DEFAULTS
// ============================================================

/* TODO: replace with the company VAT % from the server (VB GetCoVATPer) */
const DEFAULT_VAT_PER = "15";

export const emptyRow = (): SalesRow => ({
  itemId: "",
  unit: "",
  priceLevel: "",
  qty: "",
  unitPrice: "0.00",
  itemDiscAmt: "0.00",
  netUnitPrice: "0.00",
  totalPrice: "0.00",
  itemVatAmt: "0.00",
  totalPriceV: "0.00",
  totItemDiscAmt: "0.00",
  unitCost: "0.0000",
  totalCost: "0.0000",
  dnNo: "",
});

export const emptyHeader = (): SalesHeader => ({
  brId: "",
  docNo: "",
  invoiceType: "R",
  date: new Date().toISOString().slice(0, 10),
  dateH: "",
  customerId: "",
  customerName: "",
  address: "",
  phone: "",
  customerRef: "",
  custPriceLevel: "",
  note: "",
  discType: "A",
  discPer: "0",
  discAmt: "0",
  vatPer: DEFAULT_VAT_PER,
});

// ============================================================
// HELPERS
// ============================================================

const n = (v: unknown): number => {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
};
const s = (v: unknown): string => (v == null ? "" : String(v));
const fixed = (v: unknown, d: number) => n(v).toFixed(d);

const API = import.meta.env.VITE_API_URL;

// TODO: change if you mounted the sales invoice router somewhere else,
// e.g. app.use("/api/sales-invoice", salesInvoiceRoutes)
const SALES_INVOICE_API = `${API}/sales-invoice`;

// TODO: change "Branch" to the path where you mounted the branch router
const BRANCH_API = `${API}/Branch`;

// shared item list, the same endpoint the purchase invoice uses
const ITEM_API = `${API}/item/items`;

const request = async <T = { success: true }>(
  method: "GET" | "POST" | "DELETE",
  url: string,
  body?: unknown,
  signal?: AbortSignal,
): Promise<T> => {
  const response = await apiFetch(url, {
    method,
    headers:
      body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal,
  });

  const result = await response.json().catch(() => null);

  if (!response.ok || !result?.success) {
    throw new Error(result?.message || `HTTP Error: ${response.status}`);
  }
  return result as T;
};

const getJson = (url: string, signal?: AbortSignal) =>
  request<any>("GET", url, undefined, signal);

/* rows that have an item; the server numbers them 1..n in this order */
const filled = (rows: SalesRow[]) => rows.filter((r) => r.itemId);

const toApiLines = (rows: SalesRow[]) =>
  filled(rows).map((r, idx) => ({
    slNo: idx + 1,
    itemId: r.itemId,
    unit: r.unit,
    priceLevel: r.priceLevel,
    qtyOut: n(r.qty),
    unitPrice: n(r.unitPrice),
    itemDiscAmt: n(r.itemDiscAmt),
    unitCost: n(r.unitCost),
    dnNo: r.dnNo || undefined,
  }));

// ============================================================
// HOOK
// ============================================================

const useSalesInvoice = () => {
  /* ---------- branch state ---------- */
  const [branchOptions, setBranchOptions] = useState<SelectOption[]>([]);
  const [branch, setBranch] = useState<SelectOption | null>(null);
  const [branchLoading, setBranchLoading] = useState(false);
  const [branchError, setBranchError] = useState<string | null>(null);

  /* ---------- invoice state ---------- */
  const [lookups, setLookups] = useState<SalesLookups>({
    customers: [],
    discTypes: [],
    priceLevels: [],
    items: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  /* ======================================================
     BRANCHES + DEFAULT BRANCH
  ====================================================== */
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
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          return [];
        }
        console.error("Get Branches Error:", err);
        setBranchOptions([]);
        setBranchError(
          err instanceof Error ? err.message : "Failed to load branches",
        );
        return [];
      } finally {
        setBranchLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    const controller = new AbortController();
    getBranches(controller.signal);
    return () => controller.abort();
  }, [getBranches]);

  /* ======================================================
     LOOKUPS
     - customers, discount types, price levels: /sales-invoice/lookups
     - items: shared /item/items (same as purchase invoice)
     Items depend on the branch, so call again when it changes.
     The company id comes from the session (localStorage).
  ====================================================== */
  const getLookups = useCallback(
    async (brId: string): Promise<SalesLookups> => {
      const { pstrCoID } = getSession();

      const params = new URLSearchParams({ brId });
      const itemParams = new URLSearchParams({
        PstrCoID: pstrCoID,
        PstrBrID: brId,
      });

      const [result, itemsResult] = await Promise.all([
        request<{ data: LookupsApi }>(
          "GET",
          `${SALES_INVOICE_API}/lookups?${params}`,
        ),
        request<{ data: ItemApi[] }>("GET", `${ITEM_API}?${itemParams}`),
      ]);

      const data: SalesLookups = {
        customers: result.data.customers.map((c) => ({
          id: s(c.fAccountID),
          name: s(c.fAccountName),
          creditLimit: n(c.fCreditLimit),
          address: s(c.fAddress1),
          phone: s(c.fPhone),
        })),
        discTypes: result.data.discTypes.map((d) => ({
          id: s(d.fPID),
          name: s(d.fPName),
        })),
        priceLevels: result.data.priceLevels.map((p) => ({
          id: s(p.fPID),
          name: s(p.fPName),
        })),
        items: itemsResult.data
          // the old query skipped hidden items and only used this branch
          .filter((i) => !i.inactive && (!i.branchID || i.branchID === brId))
          .map((i) => ({
            id: s(i.itemID),
            name: s(i.itemName),
            unit: s(i.unit),
          })),
      };

      setLookups(data);
      return data;
    },
    [],
  );

  /* ======================================================
     NEXT INVOICE NO.
  ====================================================== */
  const getNextDocNo = useCallback(
    async (
      year: string,
      brId: string,
    ): Promise<{ docNo: string; docNoLen: number }> => {
      const params = new URLSearchParams({ year, brId });
      const result = await request<{
        data: { docNo: string; docNoLen: number };
      }>("GET", `${SALES_INVOICE_API}/next-doc-no?${params}`);
      return {
        docNo: s(result.data.docNo),
        docNoLen: n(result.data.docNoLen),
      };
    },
    [],
  );

  /* ======================================================
     CALCULATE TOTALS (server-side port of CalcTotalPriceInclVAT)
     Returns the rows with recalculated amounts + the totals.
     Empty rows (no item) are passed through unchanged, so the
     returned rows line up one-to-one with the rows sent.
  ====================================================== */
  const calcTotals = useCallback(
    async (
      rows: SalesRow[],
      vatPer: string,
      discType: "A" | "P",
      discPer: string,
      discAmt: string,
    ): Promise<{ rows: SalesRow[]; totals: SalesTotals }> => {
      const result = await request<{ data: CalcApi }>(
        "POST",
        `${SALES_INVOICE_API}/calc`,
        {
          lines: toApiLines(rows),
          vatPer: n(vatPer),
          discType,
          discPer: n(discPer),
          discAmt: n(discAmt),
        },
      );

      // server returns one result per row that has an item, in order
      let k = 0;
      const updated = rows.map((r) => {
        if (!r.itemId) return r;
        const c = result.data.rows[k++];
        if (!c) return r;
        return {
          ...r,
          netUnitPrice: fixed(c.netUnitPrice, 2),
          totalPrice: fixed(c.totalPrice, 2),
          itemVatAmt: fixed(c.itemVatAmt, 2),
          totalPriceV: fixed(c.totalPriceV, 2),
          totItemDiscAmt: fixed(c.totItemDiscAmt, 2),
          totalCost: fixed(c.totalCost, 4),
        };
      });

      return {
        rows: updated,
        totals: {
          docAmt: n(result.data.docAmt),
          discPer: n(result.data.discPer),
          discAmt: n(result.data.discAmt),
          netDocAmtWoVAT: n(result.data.netDocAmtWoVAT),
          vatAmt: n(result.data.vatAmt),
          netDocAmt: n(result.data.netDocAmt),
        },
      };
    },
    [],
  );

  /* ======================================================
     LOAD INVOICE
     Returns null when not found (new document) or on error (see `error`).
  ====================================================== */
  const fetchInvoice = useCallback(
    async (
      year: string,
      brId: string,
      docNo: string,
    ): Promise<{
      header: SalesHeader;
      rows: SalesRow[];
      originalSlNos: number[];
      deliveryNotes: DeliveryNoteRow[];
      totals: Omit<SalesTotals, "docAmt">;
      userInfo: SalesUserInfo;
      posted: boolean;
    } | null> => {
      try {
        setLoading(true);
        setError("");

        const params = new URLSearchParams({ year, brId, docNo });
        const result = await request<{
          data: {
            header: InvoiceHeaderApi;
            lines: InvoiceLineApi[];
            deliveryNotes: DeliveryNoteRow[];
          };
        }>("GET", `${SALES_INVOICE_API}?${params}`);

        const h = result.data.header;

        return {
          header: {
            brId,
            docNo,
            invoiceType: "R",
            // the server sends a plain 'YYYY-MM-DD' string (no timezone shift)
            date: s(h.fdate).slice(0, 10),
            dateH: s(h.fdate_h),
            customerId: s(h.faccountid),
            customerName: s(h.faccountname),
            address: s(h.faddress1),
            phone: s(h.fphone),
            customerRef: s(h.fcustomerref),
            custPriceLevel: s(h.fpricelevel),
            note: s(h.fnote),
            discType: h.fdisctype === "P" ? "P" : "A",
            discPer: s(h.fdiscper) || "0",
            discAmt: s(h.fdiscamt) || "0",
            vatPer: s(h.fvatper) || DEFAULT_VAT_PER,
          },
          rows: result.data.lines.map((l) => ({
            itemId: s(l.fitemid),
            unit: s(l.funit),
            priceLevel: s(l.fpricelevel),
            qty: s(l.fqtyout),
            unitPrice: fixed(l.funitprice, 2),
            itemDiscAmt: fixed(l.fitemdiscamt, 2),
            netUnitPrice: fixed(l.fnetunitprice, 2),
            totalPrice: fixed(l.ftotalprice, 2),
            itemVatAmt: fixed(l.fitemvatamt, 2),
            totalPriceV: fixed(l.ftotalpricev, 2),
            totItemDiscAmt: fixed(l.ftotitemdiscamt, 2),
            unitCost: fixed(l.funitcost, 4),
            totalCost: fixed(l.ftotalcost, 4),
            dnNo: s(l.fdnno),
          })),
          originalSlNos: result.data.lines.map((l) => l.fslno),
          deliveryNotes: result.data.deliveryNotes ?? [],
          totals: {
            discPer: n(h.fdiscper),
            discAmt: n(h.fdiscamt),
            netDocAmtWoVAT: n(h.fnetdocamtwovat),
            vatAmt: n(h.fvatamt),
            netDocAmt: n(h.fnetdocamt),
          },
          userInfo: {
            savedBy: s(h.fcuserid),
            savedAt: s(h.fcuserdate),
            modifiedBy: s(h.fmuserid),
            modifiedAt: s(h.fmuserdate),
            postOrder: n(h.fpostorder),
          },
          posted: Boolean(h.fpost),
        };
      } catch (err: unknown) {
        // 404 just means "new document", not a real error
        const msg = err instanceof Error ? err.message : "Failed to fetch";
        if (msg !== "Sales Invoice not found") setError(msg);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  /* ======================================================
     SAVE (new or modify). Throws on failure so the screen can show the
     message. Returns the totals the server calculated.
  ====================================================== */
  const saveInvoice = useCallback(
    async ({
      mode,
      year,
      header,
      rows,
      originalSlNos,
      deliveryNotes,
    }: SavePayload): Promise<SalesTotals | null> => {
      const result = await request<{
        data: {
          docNo: string;
          totals: {
            docAmt: number;
            discAmt: number;
            netDocAmtWoVAT: number;
            vatAmt: number;
            netDocAmt: number;
          };
        };
      }>("POST", SALES_INVOICE_API, {
        mode,
        year,
        brId: header.brId,
        docNo: header.docNo,
        invoiceType: header.invoiceType,
        date: header.date,
        dateH: header.dateH,
        customerId: header.customerId,
        customerName: header.customerName,
        address: header.address,
        phone: header.phone,
        customerRef: header.customerRef,
        custPriceLevel: header.custPriceLevel,
        note: header.note,
        discType: header.discType,
        discPer: n(header.discPer),
        discAmt: n(header.discAmt),
        vatPer: n(header.vatPer),
        menuName: "frmSIR",
        lines: toApiLines(rows),
        originalSlNos: mode === "M" ? originalSlNos : undefined,
        deliveryNotes: deliveryNotes?.map((d, i) => ({
          slNo: i + 1,
          dnNo: d.dnNo,
          checked: d.checked,
        })),
      });

      const t = result.data.totals;
      return t
        ? {
            docAmt: n(t.docAmt),
            discPer: n(header.discPer),
            discAmt: n(t.discAmt),
            netDocAmtWoVAT: n(t.netDocAmtWoVAT),
            vatAmt: n(t.vatAmt),
            netDocAmt: n(t.netDocAmt),
          }
        : null;
    },
    [],
  );

  /* ======================================================
     DELETE / POST
  ====================================================== */
  const deleteInvoice = useCallback(
    async (year: string, brId: string, docNo: string): Promise<void> => {
      const params = new URLSearchParams({ year, brId, docNo });
      await request("DELETE", `${SALES_INVOICE_API}?${params}`);
    },
    [],
  );

  const postInvoice = useCallback(
    async (year: string, brId: string, docNo: string): Promise<void> => {
      await request("POST", `${SALES_INVOICE_API}/post`, {
        year,
        brId,
        docNo,
      });
    },
    [],
  );

  return {
    // branch
    branchOptions,
    branch,
    setBranch,
    branchLoading,
    branchError,
    getBranches,
    // lookups
    lookups,
    getLookups,
    // invoice
    getNextDocNo,
    calcTotals,
    fetchInvoice,
    saveInvoice,
    deleteInvoice,
    postInvoice,
    loading,
    error,
  };
};

export default useSalesInvoice;
