import { useCallback, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL;

/* ---------- UI shapes ---------- */

export interface PurchaseHeader {
  brId: string;
  docNo: string;
  invoiceType: string; // "C" cash / "R" credit
  date: string; // yyyy-mm-dd
  poNo: string;
  supplierId: string;
  supplierName: string;
  currency: string;
  currencyRate: string;
  piNo: string; // supplier invoice no.
  note: string;
}

export interface PurchaseRow {
  itemId: string;
  unit: string;
  qty: string;
  sUnitPrice: string; // fUnitPrice_FC
  sTotalPrice: string; // fTotalPrice_FC
  unitPrice: string; // fUnitPrice
  unitCost: string;
  totalCost: string;
}

export const emptyRow = (): PurchaseRow => ({
  itemId: "",
  unit: "",
  qty: "",
  sUnitPrice: "0.00",
  sTotalPrice: "0.00",
  unitPrice: "0.00",
  unitCost: "0.00",
  totalCost: "0.00",
});

export const emptyHeader = (): PurchaseHeader => ({
  brId: "",
  docNo: "",
  invoiceType: "C",
  date: new Date().toISOString().slice(0, 10),
  poNo: "",
  supplierId: "",
  supplierName: "",
  currency: "SAR",
  currencyRate: "1",
  piNo: "",
  note: "",
});

/* ---------- API shapes ---------- */

interface InvoiceHeaderApi {
  fsupplierid: string | null;
  fsuppliername: string | null;
  fcurrency: string | null;
  fcurrencyrate: string | number | null;
  fdate: string | null;
  fpino: string | null;
  fpono: string | null;
  finvoicetype: string | null;
  fnote: string | null;
}

interface InvoiceLineApi {
  fslno: number;
  fitemid: string | null;
  funit: string | null;
  fqtyin: string | number | null;
  funitprice_fc: string | number | null;
  funitprice: string | number | null;
  ftotalprice: string | number | null;
  ftotalprice_fc: string | number | null;
  funitcost: string | number | null;
  ftotalcost: string | number | null;
}

export interface SavePayload {
  mode: "S" | "M";
  year: string;
  header: PurchaseHeader;
  rows: PurchaseRow[];
}

const n = (v: unknown): number => {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
};
const s = (v: unknown): string => (v == null ? "" : String(v));
const fixed = (v: unknown, d: number) => n(v).toFixed(d);

/* ---------- shared request helper (same as useCustomer) ---------- */

const apiRequest = async <T>(
  method: "GET" | "POST" | "DELETE",
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

export const usePurchaseInvoice = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  /* Throws on failure so the page can show its own message. */
  const fetchInvoice = useCallback(
    async (
      year: string,
      brId: string,
      docNo: string,
    ): Promise<{ header: PurchaseHeader; rows: PurchaseRow[] } | null> => {
      try {
        setLoading(true);
        setError("");

        const params = new URLSearchParams({ year, brId, docNo });
        const result = await apiRequest<{
          data: { header: InvoiceHeaderApi; lines: InvoiceLineApi[] };
        }>("GET", `/purchase-invoice?${params}`);

        const h = result.data.header;

        return {
          header: {
            brId,
            docNo,
            invoiceType: s(h.finvoicetype) || "C",
            date: h.fdate ? new Date(h.fdate).toISOString().slice(0, 10) : "",
            poNo: s(h.fpono),
            supplierId: s(h.fsupplierid),
            supplierName: s(h.fsuppliername),
            currency: s(h.fcurrency) || "SAR",
            currencyRate: s(h.fcurrencyrate) || "1",
            piNo: s(h.fpino),
            note: s(h.fnote),
          },
          rows: result.data.lines.map((l) => ({
            itemId: s(l.fitemid),
            unit: s(l.funit),
            qty: s(l.fqtyin),
            sUnitPrice: fixed(l.funitprice_fc, 2),
            sTotalPrice: fixed(l.ftotalprice_fc, 2),
            unitPrice: fixed(l.funitprice, 2),
            unitCost: fixed(l.funitcost, 2),
            totalCost: fixed(l.ftotalcost, 2),
          })),
        };
      } catch (err: unknown) {
        // 404 just means "new document", not a real error
        const msg = err instanceof Error ? err.message : "Failed to fetch";
        if (msg !== "Purchase Invoice not found") setError(msg);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const saveInvoice = useCallback(
    async ({ mode, year, header, rows }: SavePayload): Promise<void> => {
      const rate = n(header.currencyRate) || 1;

      const lines = rows
        .map((r, i) => ({ r, slNo: i + 1 }))
        .filter(({ r }) => r.itemId)
        .map(({ r, slNo }, idx) => ({
          slNo: idx + 1 || slNo,
          itemId: r.itemId,
          unit: r.unit,
          qtyIn: n(r.qty),
          unitPriceFC: n(r.sUnitPrice),
          unitPrice: n(r.unitPrice),
          totalPrice: Number((n(r.qty) * n(r.unitPrice)).toFixed(2)),
          totalPriceFC: n(r.sTotalPrice),
          unitCost: n(r.unitCost),
          totalCost: n(r.totalCost),
        }));

      await apiRequest("POST", "/purchase-invoice", {
        mode,
        year,
        brId: header.brId,
        docNo: header.docNo,
        invoiceType: header.invoiceType,
        piNo: header.piNo,
        poNo: header.poNo,
        date: header.date,
        supplierId: header.supplierId,
        supplierName: header.supplierName,
        currency: header.currency,
        currencyRate: rate,
        note: header.note,
        menuName: "frmPI",
        lines,
      });
    },
    [],
  );

  const deleteInvoice = useCallback(
    async (year: string, brId: string, docNo: string): Promise<void> => {
      const params = new URLSearchParams({ year, brId, docNo });
      await apiRequest("DELETE", `/purchase-invoice?${params}`);
    },
    [],
  );

  const calcUnitCost = useCallback(
    async (
      rows: PurchaseRow[],
      totalExpense: number,
      discAmt: number,
    ): Promise<PurchaseRow[]> => {
      const lines = rows.map((r) => ({
        itemId: r.itemId,
        qtyIn: n(r.qty),
        unitPrice: n(r.unitPrice),
      }));

      const result = await apiRequest<{
        data: { lines: { unitCost: number; totalCost: number }[] };
      }>("POST", "/purchase-invoice/calc-unit-cost", {
        lines,
        totalExpense,
        discAmt,
      });

      return rows.map((r, i) =>
        r.itemId
          ? {
              ...r,
              unitCost: fixed(result.data.lines[i]?.unitCost, 4),
              totalCost: fixed(result.data.lines[i]?.totalCost, 4),
            }
          : r,
      );
    },
    [],
  );

  return {
    fetchInvoice,
    saveInvoice,
    deleteInvoice,
    calcUnitCost,
    loading,
    error,
  };
};
