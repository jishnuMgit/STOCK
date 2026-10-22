import { useCallback, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL;

const CASH_SUPPLIER_BASE = "/purchase-invoice/cash-supplier";

// TODO: match the path where you mounted the supplier routes
const SUPPLIER_LOOKUP_BASE = "/supplier";

const ITEM_BASE = "/item/items";

/* ---------- UI shapes ---------- */

export interface Branch {
  id: string;
  name: string;
}

export interface Item {
  id: string;
  name: string;
  branchId: string;
  unit: string;
  packing: string;
  itemGroupId: string;
  inactive: boolean;
}

export interface SupplierLookup {
  id: string;
  name: string;
}

export interface InvoiceTypeOption {
  value: string; // "C" cash / "R" credit
  label: string;
  name: string; // CASH / CREDIT
}

interface ItemApi {
  itemID: string;
  itemName: string | null;
  branchID: string | null;
  unit: string | null;
  packing: string | number | null;
  itemGroupID: string | null;
  inactive: number | boolean | null;
}

export interface PurchaseHeader {
  brId: string;
  docNo: string;
  invoiceType: string; // "C" cash / "R" credit
  date: string; // yyyy-mm-dd
  poNo: string;
  supplierId: string;
  supplierName: string;
  vatNo: string;
  miscSupId: string; // UI only
  currency: string;
  currencyRate: string;
  piNo: string; // supplier invoice no.
  note: string;
  discAmt: string; // no input on screen yet, kept so modify doesn't wipe it
  vatAmt: string; // no input on screen yet, kept so modify doesn't wipe it
}

/* FC columns are gone: the new sp_pagepi has only unit price / total price */
export interface PurchaseRow {
  itemId: string;
  unit: string;
  qty: string;
  unitPrice: string; // typed by the user
  totalPrice: string; // qty * unitPrice
  unitCost: string;
  totalCost: string;
}

export interface PurchaseExpenseRow {
  accountId: string;
  ccid: string;
  currency: string;
  currencyRate: string;
  amount: string; // FC amount
  amountSAR: string; // SAR amount
  description: string;
}

export const emptyExpenseRow = (): PurchaseExpenseRow => ({
  accountId: "",
  ccid: "",
  currency: "",
  currencyRate: "",
  amount: "",
  amountSAR: "",
  description: "",
});

export const createExpenseRows = (count = 12): PurchaseExpenseRow[] =>
  Array.from({ length: count }, emptyExpenseRow);

/* pad saved rows up to the grid size so the popup always shows 12 rows */
export const padExpenseRows = (
  rows: PurchaseExpenseRow[],
  count = 12,
): PurchaseExpenseRow[] => [
  ...rows,
  ...Array.from({ length: Math.max(count - rows.length, 0) }, emptyExpenseRow),
];

export interface CashSupplier {
  id: string;
  name: string;
  vatNo: string;
}

export const emptyRow = (): PurchaseRow => ({
  itemId: "",
  unit: "",
  qty: "",
  unitPrice: "0.00",
  totalPrice: "0.00",
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
  vatNo: "",
  miscSupId: "",
  currency: "SAR",
  currencyRate: "1.0000",
  piNo: "",
  note: "",
  discAmt: "0",
  vatAmt: "0",
});

export interface ExpenseAccount {
  id: string;
  name: string;
}

export interface CostCenter {
  id: string;
  name: string;
}

export interface ExpenseLookups {
  accounts: ExpenseAccount[];
  costCenters: CostCenter[];
  currencies: string[];
}

interface ExpenseLookupsApi {
  accounts: { fAccountID: string; fAccountName: string | null }[];
  costCenters: { fCCID: string; fCCName: string | null }[];
  currencies: { fCurrency: string }[];
}

/* saved expense row from GET /purchase-invoice/expense (sp_frmpiexp 'G') */
interface ExpenseDetailApi {
  fSlNo: number;
  fAccountID: string | null;
  fCCID: string | null;
  fCurrency: string | null;
  fCurrencyRate: string | number | null;
  fCreditFC: string | number | null;
  fCredit: string | number | null;
  fDescription: string | null;
}

interface CurrencyApi {
  currency?: string | null;
  fCurrency?: string | null;
  fcurrency?: string | null;
}
/* ---------- API shapes (columns come from tblstocktrans) ---------- */

interface InvoiceHeaderApi {
  finvoicetype: string | null;
  fdate: string | null;
  fpino: string | null;
  fvatno: string | null;
  faccountid: string | null;
  faccountname: string | null;
  fpono: string | null;
  fcurrency: string | null;
  fcurrencyrate: string | number | null;
  fnote: string | null;
  fdiscamt: string | number | null;
  fvatamt: string | number | null;
  fpost: boolean | null;
}

interface InvoiceLineApi {
  fslno: number;
  fitemid: string | null;
  funit: string | null;
  fqtyin: string | number | null;
  funitprice: string | number | null;
  ftotalprice: string | number | null;
  funitcost: string | number | null;
  ftotalcost: string | number | null;
}

interface InvoiceTypeApi {
  fptype: string;
  fpid: string;
  fpname: string | null;
  forderby: number | null;
}

interface CashSupplierApi {
  fcashsupplierid: string;
  fcashsuppliername: string | null;
  fvatno: string | null;
}

interface SupplierLookupApi {
  supplierID: string;
  supplierName: string | null;
}

export interface SavePayload {
  mode: "S" | "M";
  year: string;
  header: PurchaseHeader;
  rows: PurchaseRow[];
  originalSlNos: number[];
  expenses: PurchaseExpenseRow[];
}

export interface SaveCashSupplierPayload {
  mode: "S" | "M";
  cashSupplierId: string;
  cashSupplierName: string;
  vatNo: string;
}

const n = (v: unknown): number => {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
};
const s = (v: unknown): string => (v == null ? "" : String(v));
const fixed = (v: unknown, d: number) => n(v).toFixed(d);

/* ---------- shared request helper ---------- */

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

  /* ======================================================
     PURCHASE INVOICE
  ====================================================== */

  const fetchDefaultBranch = useCallback(async (): Promise<string> => {
    const result = await apiRequest<{ data: string }>("GET", "/branch/default");
    return s(result.data);
  }, []);

  const fetchNextDocNo = useCallback(
    async (year: string, brId: string): Promise<string> => {
      const params = new URLSearchParams({ year, brId });
      const result = await apiRequest<{ data: { docNo: string } }>(
        "GET",
        `/purchase-invoice/next-doc-no?${params}`,
      );
      return s(result.data.docNo);
    },
    [],
  );

  const fetchBranches = useCallback(async (): Promise<Branch[]> => {
    const result = await apiRequest<{
      data: { fbrid: string; fbrname: string | null }[];
    }>("GET", "/branch");
    return result.data.map((b) => ({ id: b.fbrid, name: s(b.fbrname) }));
  }, []);

  /* invoice types C / R  (dbo.getpurchasestockparam) */
  const TYPE_NAMES: Record<string, string> = { C: "CASH", R: "CREDIT" };

  const fetchInvoiceTypes = useCallback(async (): Promise<
    InvoiceTypeOption[]
  > => {
    const result = await apiRequest<{ data: InvoiceTypeApi[] }>(
      "GET",
      "/purchase-invoice/invoice-types",
    );
    return result.data.map((t) => ({
      value: s(t.fpid),
      label: s(t.fpid),
      // use the name from the database; fall back to CASH / CREDIT
      name: s(t.fpname) || TYPE_NAMES[s(t.fpid)] || s(t.fpid),
    }));
  }, []);

  /* cash purchase account of a branch (dbo.getcashpurchaseaccountid) */
  const fetchCashPurchaseAccount = useCallback(
    async (brId: string): Promise<string> => {
      const params = new URLSearchParams({ brId });
      const result = await apiRequest<{ data: { accountId: string } }>(
        "GET",
        `/purchase-invoice/cash-purchase-account?${params}`,
      );
      return s(result.data.accountId);
    },
    [],
  );

  const fetchItems = useCallback(
    async (coId: string, brId: string): Promise<Item[]> => {
      const params = new URLSearchParams({ PstrCoID: coId, PstrBrID: brId });
      const result = await apiRequest<{ data: ItemApi[] }>(
        "GET",
        `${ITEM_BASE}?${params}`,
      );
      return result.data.map((r) => ({
        id: s(r.itemID),
        name: s(r.itemName),
        branchId: s(r.branchID),
        unit: s(r.unit),
        packing: s(r.packing),
        itemGroupId: s(r.itemGroupID),
        inactive: Boolean(r.inactive),
      }));
    },
    [],
  );

  const fetchSuppliers = useCallback(
    async (
      coId: string,
      sortBy: "by-id" | "by-name",
    ): Promise<SupplierLookup[]> => {
      const params = new URLSearchParams({ PstrCoID: coId });
      const result = await apiRequest<{ data: SupplierLookupApi[] }>(
        "GET",
        `${SUPPLIER_LOOKUP_BASE}/${sortBy}?${params}`,
      );
      return result.data.map((r) => ({
        id: s(r.supplierID),
        name: s(r.supplierName),
      }));
    },
    [],
  );

  const fetchExpenseLookups = useCallback(async (): Promise<ExpenseLookups> => {
    const result = await apiRequest<{ data: ExpenseLookupsApi }>(
      "GET",
      "/purchase-invoice/expense/lookups",
    );
    return {
      accounts: result.data.accounts.map((a) => ({
        id: s(a.fAccountID),
        name: s(a.fAccountName),
      })),
      costCenters: result.data.costCenters.map((c) => ({
        id: s(c.fCCID),
        name: s(c.fCCName),
      })),
      currencies: result.data.currencies.map((c) => s(c.fCurrency)),
    };
  }, []);

  /* saved purchase expense rows (sp_frmpiexp mode 'G') */
  const fetchExpenseDetail = useCallback(
    async (
      year: string,
      brId: string,
      docNo: string,
    ): Promise<PurchaseExpenseRow[]> => {
      const params = new URLSearchParams({ year, brId, docNo });
      const result = await apiRequest<{ data: ExpenseDetailApi[] }>(
        "GET",
        `/purchase-invoice/expense?${params}`,
      );
      return result.data.map((e) => ({
        accountId: s(e.fAccountID),
        ccid: s(e.fCCID),
        currency: "",
        currencyRate: "",
        amount: "",
        amountSAR: fixed(e.fCredit, 2),
        description: s(e.fDescription),
      }));
    },
    [],
  );

  const fetchCurrencies = useCallback(async (): Promise<string[]> => {
    const result = await apiRequest<{ currencies: CurrencyApi[] }>(
      "GET",
      "/Currency",
    );
    return result.currencies
      .map((c) => s(c.currency ?? c.fCurrency ?? c.fcurrency))
      .filter(Boolean);
  }, []);

  /* Returns null when not found (new document) or on error (see `error`). */
  const fetchInvoice = useCallback(
    async (
      year: string,
      brId: string,
      docNo: string,
    ): Promise<{
      header: PurchaseHeader;
      rows: PurchaseRow[];
      originalSlNos: number[];
      expenses: PurchaseExpenseRow[];
      posted: boolean;
    } | null> => {
      try {
        setLoading(true);
        setError("");

        const params = new URLSearchParams({ year, brId, docNo });
        const result = await apiRequest<{
          data: { header: InvoiceHeaderApi; lines: InvoiceLineApi[] };
        }>("GET", `/purchase-invoice?${params}`);

        const h = result.data.header;

        // a failure loading expenses must not block loading the invoice
        let expenses: PurchaseExpenseRow[] = [];
        try {
          expenses = await fetchExpenseDetail(year, brId, docNo);
        } catch {
          expenses = [];
        }

        return {
          header: {
            brId,
            docNo,
            invoiceType: s(h.finvoicetype) || "C",
            date: h.fdate ? new Date(h.fdate).toISOString().slice(0, 10) : "",
            poNo: s(h.fpono),
            supplierId: s(h.faccountid),
            supplierName: s(h.faccountname),
            vatNo: s(h.fvatno),
            miscSupId: "",
            currency: s(h.fcurrency) || "SAR",
            currencyRate: n(h.fcurrencyrate)
              ? fixed(h.fcurrencyrate, 4)
              : "1.0000",
            piNo: s(h.fpino),
            note: s(h.fnote),
            discAmt: s(h.fdiscamt) || "0",
            vatAmt: s(h.fvatamt) || "0",
          },
          rows: result.data.lines.map((l) => ({
            itemId: s(l.fitemid),
            unit: s(l.funit),
            qty: s(l.fqtyin),
            unitPrice: fixed(l.funitprice, 2),
            totalPrice: fixed(l.ftotalprice, 2),
            unitCost: fixed(l.funitcost, 2),
            totalCost: fixed(l.ftotalcost, 2),
          })),
          originalSlNos: result.data.lines.map((l) => l.fslno),
          expenses,
          posted: Boolean(h.fpost),
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
    [fetchExpenseDetail],
  );

  const saveInvoice = useCallback(
    async ({
      mode,
      year,
      header,
      rows,
      originalSlNos,
      expenses,
    }: SavePayload): Promise<void> => {
      const rate = n(header.currencyRate) || 1;

      const lines = rows
        .filter((r) => r.itemId)
        .map((r, idx) => ({
          slNo: idx + 1,
          itemId: r.itemId,
          unit: r.unit,
          qtyIn: n(r.qty),
          unitPrice: n(r.unitPrice),
          totalPrice: Number((n(r.qty) * n(r.unitPrice) * rate).toFixed(2)),
          unitCost: n(r.unitCost),
          totalCost: n(r.totalCost),
        }));

      /* field names match the backend PIExpLine:
         creditFC = foreign-currency amount, credit = SAR amount */
      const expenseLines = expenses
        .filter((e) => e.accountId)
        .map((e, idx) => ({
          slNo: idx + 1,
          accountId: e.accountId,
          ccId: e.ccid,
          currency: e.currency,
          currencyRate: n(e.currencyRate),
          creditFC: n(e.amount),
          credit: n(e.amountSAR),
          description: e.description,
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
        vatNo: header.vatNo,
        supplierId: header.supplierId,
        supplierName: header.supplierName,
        currency: header.currency,
        currencyRate: rate,
        note: header.note,
        discAmt: n(header.discAmt),
        vatAmt: n(header.vatAmt),
        menuName: "frmPI",
        lines,
        expenses: expenseLines,
        originalSlNos: mode === "M" ? originalSlNos : undefined,
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

  const postInvoice = useCallback(
    async (year: string, brId: string, docNo: string): Promise<void> => {
      await apiRequest("POST", "/purchase-invoice/post", { year, brId, docNo });
    },
    [],
  );

  const calcUnitCost = useCallback(
    async (
      rows: PurchaseRow[],
      totalExpense: number,
      discAmt: number,
      rate = 1,
    ): Promise<PurchaseRow[]> => {
      const lines = rows.map((r) => ({
        itemId: r.itemId,
        qtyIn: n(r.qty),
        unitPrice: n(r.unitPrice) * rate,
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

  /* ======================================================
     CASH (MISC.) SUPPLIER
  ====================================================== */

  const fetchCashSuppliers = useCallback(async (): Promise<CashSupplier[]> => {
    const result = await apiRequest<{ data: CashSupplierApi[] }>(
      "GET",
      CASH_SUPPLIER_BASE,
    );
    return result.data.map((r) => ({
      id: r.fcashsupplierid,
      name: s(r.fcashsuppliername),
      vatNo: s(r.fvatno),
    }));
  }, []);

  const fetchNextCashSupplierId = useCallback(async (): Promise<string> => {
    const result = await apiRequest<{ data: { id: string } }>(
      "GET",
      `${CASH_SUPPLIER_BASE}/next-id`,
    );
    return s(result.data.id);
  }, []);

  const saveCashSupplier = useCallback(
    async (payload: SaveCashSupplierPayload): Promise<void> => {
      await apiRequest("POST", CASH_SUPPLIER_BASE, payload);
    },
    [],
  );

  const deleteCashSupplier = useCallback(async (id: string): Promise<void> => {
    await apiRequest(
      "DELETE",
      `${CASH_SUPPLIER_BASE}/${encodeURIComponent(id)}`,
    );
  }, []);

  return {
    fetchDefaultBranch,
    fetchNextDocNo,
    fetchBranches,
    fetchInvoiceTypes,
    fetchCashPurchaseAccount,
    fetchInvoice,
    saveInvoice,
    deleteInvoice,
    postInvoice,
    calcUnitCost,
    fetchCashSuppliers,
    fetchNextCashSupplierId,
    saveCashSupplier,
    deleteCashSupplier,
    fetchItems,
    fetchSuppliers,
    fetchExpenseLookups,
    fetchExpenseDetail,
    fetchCurrencies,
    loading,
    error,
  };
};
