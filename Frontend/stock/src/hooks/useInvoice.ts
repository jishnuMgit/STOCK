import { useCallback, useState } from "react";

/* =========================================================
   TYPES
========================================================= */

export type InvoiceHeader = {
  brId: string;
  docNo: string;
  date: string; // yyyy-mm-dd
  customerId: string;
  customerName: string;
  reference: string;
  invoiceTo: string;
  note: string;
};

export type InvoiceRow = {
  description: string;
  amountExclVat: string;
  vatPercent: string;
  vatAmt: string;
  amountInclVat: string;
};

export type CustomerLookup = { id: string; name: string };
export type BranchLookup = { id: string; name: string };

export type LoadedInvoice = {
  header: InvoiceHeader;
  rows: InvoiceRow[];
  savedBy?: string;
};

export type SaveInvoicePayload = {
  mode: "S" | "M";
  year: string;
  header: InvoiceHeader;
  rows: InvoiceRow[];
};

export const DEFAULT_VAT = "15.00";

const today = () => new Date().toISOString().slice(0, 10);

export const emptyHeader = (): InvoiceHeader => ({
  brId: "",
  docNo: "",
  date: today(),
  customerId: "",
  customerName: "",
  reference: "",
  invoiceTo: "",
  note: "",
});

export const emptyRow = (): InvoiceRow => ({
  description: "",
  amountExclVat: "",
  vatPercent: DEFAULT_VAT,
  vatAmt: "",
  amountInclVat: "",
});

/* =========================================================
   HOOK
   TODO: replace each "notImplemented" with your real API call
   (same way usePurchaseInvoice does it).
========================================================= */

const notImplemented = (name: string): never => {
  throw new Error(`useInvoice.${name} is not connected to the API yet`);
};

export const useInvoice = () => {
  const [loading, setLoading] = useState(false);

  const wrap = useCallback(async <T>(fn: () => Promise<T>): Promise<T> => {
    setLoading(true);
    try {
      return await fn();
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchBranches = useCallback(
    async (): Promise<BranchLookup[]> => notImplemented("fetchBranches"),
    [],
  );

  const fetchDefaultBranch = useCallback(
    async (): Promise<string> => notImplemented("fetchDefaultBranch"),
    [],
  );

  const fetchNextDocNo = useCallback(
    async (_year: string, _brId: string): Promise<string> =>
      notImplemented("fetchNextDocNo"),
    [],
  );

  const fetchCustomers = useCallback(
    async (_coId: string): Promise<CustomerLookup[]> =>
      notImplemented("fetchCustomers"),
    [],
  );

  /* returns null when the invoice does not exist (new entry) */
  const fetchInvoice = useCallback(
    async (
      _year: string,
      _brId: string,
      _docNo: string,
    ): Promise<LoadedInvoice | null> => notImplemented("fetchInvoice"),
    [],
  );

  const saveInvoice = useCallback(
    (payload: SaveInvoicePayload) =>
      wrap(async () => notImplemented(`saveInvoice(${payload.mode})`)),
    [wrap],
  );

  const deleteInvoice = useCallback(
    (_year: string, _brId: string, _docNo: string) =>
      wrap(async () => notImplemented("deleteInvoice")),
    [wrap],
  );

  return {
    fetchBranches,
    fetchDefaultBranch,
    fetchNextDocNo,
    fetchCustomers,
    fetchInvoice,
    saveInvoice,
    deleteInvoice,
    loading,
  };
};
