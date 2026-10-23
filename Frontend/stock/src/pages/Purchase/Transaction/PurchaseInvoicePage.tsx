import React, { useCallback, useEffect, useMemo, useState } from "react";
import PurchaseForm from "../../../components/Transaction/PurchaseInvoice/PurchaseInvoiceForm";
import PurchaseTable from "../../../components/Transaction/PurchaseInvoice/PurchaseInvoiceTable";
import PurchaseFooter from "../../../components/Transaction/PurchaseInvoice/PurchaseInvoiceFooter";
import type { MiscSupplierData } from "../../../components/Transaction/PurchaseInvoice/PurchaseInoviceMiscsup";
import {
  usePurchaseInvoice,
  emptyHeader,
  emptyRow,
  createExpenseRows,
  padExpenseRows,
  type PurchaseExpenseRow,
  type CashSupplier,
  type InvoiceTypeOption,
  type PurchaseHeader,
  type PurchaseRow,
  type Item,
  type SupplierLookup,
} from "../../../hooks/Purchase/Transaction/usePurchaseInvoice";
import { toast } from "react-toastify";
import { useConfirmModal } from "../../../hooks/useConfirmModal";

const ROW_COUNT = 12;
const createRows = () => Array.from({ length: ROW_COUNT }, emptyRow);

// TODO: replace with the login year you already keep after /login (PstrYear)
const YEAR = String(new Date().getFullYear());

// company is stored in localStorage by useLogin after /login
const getCoId = () => localStorage.getItem("PstrCoID") ?? "";

const num = (v: string) => (Number.isFinite(Number(v)) ? Number(v) : 0);

const norm = (v: string) => v.trim().toLowerCase();

/* Recalculate one row. No foreign-currency price any more:
   the user types Unit Price, everything else follows from it. */
const recalcRow = (row: PurchaseRow, rate: number): PurchaseRow => {
  const qty = num(row.qty);
  const unitPrice = num(row.unitPrice);
  const total = qty * unitPrice * rate;
  return {
    ...row,
    totalPrice: total.toFixed(2),
    unitCost: (unitPrice * rate).toFixed(2),
    totalCost: total.toFixed(2),
  };
};

const PurchaseInvoicePage: React.FC = () => {
  const {
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
    fetchItems,
    fetchSuppliers,
    fetchCurrencies,
    loading,
  } = usePurchaseInvoice();

  const { confirm, dialog } = useConfirmModal();

  const [header, setHeader] = useState<PurchaseHeader>(emptyHeader);
  const [rows, setRows] = useState<PurchaseRow[]>(createRows);
  const [mode, setMode] = useState<"S" | "M">("S");
  const [originalSlNos, setOriginalSlNos] = useState<number[]>([]);
  const [message, setMessage] = useState("");
  const [posted, setPosted] = useState(false);
  const [posting, setPosting] = useState(false);
  const [branches, setBranches] = useState<{ value: string; label: string }[]>(
    [],
  );

  console.log("rows", rows);
  const [invoiceTypes, setInvoiceTypes] = useState<InvoiceTypeOption[]>([]);
  const [currencies, setCurrencies] = useState<string[]>([]);

  // Misc. supplier lookup + the Yes/No switch.
  // Default type is Cash (C), where the supplier name comes from Misc. Sup.
  const [miscSuppliers, setMiscSuppliers] = useState<CashSupplier[]>([]);
  const [miscMode, setMiscMode] = useState("No");
  const [items, setItems] = useState<Item[]>([]);

  const [suppliersById, setSuppliersById] = useState<SupplierLookup[]>([]);
  const [suppliersByName, setSuppliersByName] = useState<SupplierLookup[]>([]);
  const [expenseRows, setExpenseRows] =
    useState<PurchaseExpenseRow[]>(createExpenseRows);

  const totalExpense = useMemo(
    () => expenseRows.reduce((t, r) => t + num(r.amountSAR), 0),
    [expenseRows],
  );
  const discAmt = num(header.discAmt);

  const totals = useMemo(
    () => ({
      supplierTotal: rows.reduce((t, r) => t + num(r.totalPrice), 0),
      finalTotal: rows.reduce((t, r) => t + num(r.totalCost), 0),
      qty: rows.reduce((t, r) => t + num(r.qty), 0),
    }),
    [rows],
  );

  /* Sup. Amount = gross total - discount (same as VB txtSupplierAmt) */
  const supplierAmount = totals.supplierTotal - discAmt;

  useEffect(() => {
    fetchBranches()
      .then((list) =>
        setBranches(list.map((b) => ({ value: b.id, label: b.name }))),
      )
      .catch(() => setBranches([]));
  }, [fetchBranches]);

  useEffect(() => {
    fetchCurrencies()
      .then(setCurrencies)
      .catch(() => setCurrencies([]));
  }, [fetchCurrencies]);

  /* invoice types (C / R) from dbo.getpurchasestockparam */
  useEffect(() => {
    fetchInvoiceTypes()
      .then(setInvoiceTypes)
      .catch(() => setInvoiceTypes([]));
  }, [fetchInvoiceTypes]);

  /* default branch + its next entry no. (only fetches, sets no state) */
  const getDefaults = useCallback(async () => {
    try {
      const brId = await fetchDefaultBranch();
      if (!brId) return null;

      let docNo = "";
      try {
        docNo = await fetchNextDocNo(YEAR, brId);
      } catch {
        docNo = "";
      }

      return { brId, docNo };
    } catch {
      return null;
    }
  }, [fetchDefaultBranch, fetchNextDocNo]);

  useEffect(() => {
    let cancelled = false;

    getDefaults().then((d) => {
      if (d && !cancelled) {
        setHeader((prev) => ({ ...prev, brId: d.brId, docNo: d.docNo }));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [getDefaults]);

  /* Cash invoice: supplier account is the branch's cash purchase account
     (VB: GetCashPurchaseAccountID). The server also resolves it on save. */
  useEffect(() => {
    if (header.invoiceType !== "C" || !header.brId) return;

    let cancelled = false;

    fetchCashPurchaseAccount(header.brId)
      .then((accountId) => {
        if (!cancelled && accountId) {
          setHeader((prev) => ({ ...prev, supplierId: accountId }));
        }
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [fetchCashPurchaseAccount, header.invoiceType, header.brId]);

  /* items of the selected branch */
  useEffect(() => {
    const coId = getCoId();

    if (!coId || !header.brId) {
      setItems([]);
      return;
    }

    let cancelled = false;

    fetchItems(coId, header.brId)
      .then((list) => {
        if (!cancelled) setItems(list);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      });

    return () => {
      cancelled = true;
    };
  }, [fetchItems, header.brId]);

  const itemLookups = useMemo(
    () => ({
      itemIds: items.map((i) => ({
        value: i.id,
        label: i.id,
        name: i.name,
        unit: i.unit,
      })),
      itemNames: items.map((i) => ({
        value: i.id,
        label: i.name,
        name: i.name,
        unit: i.unit,
      })),
    }),
    [items],
  );

  /* suppliers for the Supplier ID / Supplier Name dropdowns */
  useEffect(() => {
    const coId = getCoId();
    if (!coId) return;

    let cancelled = false;

    fetchSuppliers(coId, "by-id")
      .then((list) => {
        if (!cancelled) setSuppliersById(list);
      })
      .catch(() => {
        if (!cancelled) setSuppliersById([]);
      });

    fetchSuppliers(coId, "by-name")
      .then((list) => {
        if (!cancelled) setSuppliersByName(list);
      })
      .catch(() => {
        if (!cancelled) setSuppliersByName([]);
      });

    return () => {
      cancelled = true;
    };
  }, [fetchSuppliers]);

  const lookups = useMemo(
    () => ({
      branches: branches.length ? branches : undefined,
      invoiceTypes: invoiceTypes.length ? invoiceTypes : undefined,
      currencies: currencies.length
        ? currencies.map((c) => ({ value: c, label: c }))
        : undefined,
      supplierIds: suppliersById.map((x) => ({
        value: x.id,
        label: x.id,
        name: x.name,
      })),
      supplierNames: suppliersByName.map((x) => ({
        value: x.id,
        label: x.name,
        name: x.name,
      })),
    }),
    [branches, invoiceTypes, currencies, suppliersById, suppliersByName],
  );

  const loadMiscSuppliers = useCallback(async () => {
    try {
      setMiscSuppliers(await fetchCashSuppliers());
    } catch {
      setMiscSuppliers([]);
    }
  }, [fetchCashSuppliers]);

  useEffect(() => {
    void loadMiscSuppliers();
  }, [loadMiscSuppliers]);

  /* The GET returns no supplier name, so when it is empty take it from the
     supplier lookup by ID. Defined before the handlers that use it. */
  const resolveSupplierName = useCallback(
    (h: PurchaseHeader) =>
      h.supplierName?.trim() ||
      suppliersById.find((s) => s.id === h.supplierId)?.name ||
      "",
    [suppliersById],
  );

  const handleHeaderChange = useCallback(
    <K extends keyof PurchaseHeader>(field: K, value: PurchaseHeader[K]) => {
      setHeader((prev) => {
        const next = { ...prev, [field]: value };

        // switching Cash <-> Credit: the supplier starts again
        // (cash account is filled by the effect above)
        if (field === "invoiceType") {
          next.supplierId = "";
          next.supplierName = "";
          next.miscSupId = "";
          next.vatNo = "";
        }
        return next;
      });

      if (field === "invoiceType") {
        setMiscMode("No");
      }

      if (field === "currencyRate") {
        const rate = num(String(value)) || 1;
        setRows((prev) => prev.map((r) => (r.itemId ? recalcRow(r, rate) : r)));
      }

      // new entry: a different branch has its own entry no.
      if (field === "brId" && mode === "S" && value) {
        fetchNextDocNo(YEAR, String(value))
          .then((docNo) => setHeader((prev) => ({ ...prev, docNo })))
          .catch(() => undefined);
      }
    },
    [mode, fetchNextDocNo],
  );

  const currencyRate = num(header.currencyRate) || 1;

  const handleRowChange = useCallback(
    (index: number, patch: Partial<PurchaseRow>) => {
      setRows((prev) =>
        prev.map((row, i) =>
          i === index ? recalcRow({ ...row, ...patch }, currencyRate) : row,
        ),
      );
    },
    [currencyRate],
  );

  /* remove one entered item; keep the grid at least ROW_COUNT rows long */
  const handleRowDelete = useCallback(
    (index: number) => {
      if (posted) {
        toast.warning("Posted Purchase Invoice cannot be modified");
        return;
      }
      setRows((prev) => {
        const next = prev.filter((_, i) => i !== index);
        while (next.length < ROW_COUNT) next.push(emptyRow());
        return next;
      });
    },
    [posted],
  );

  /* VB cmdAdd_Click: refresh the combos, then select the saved supplier */
  const handleMiscSupplierSaved = useCallback(
    async (d: MiscSupplierData) => {
      await loadMiscSuppliers();
      handleHeaderChange("miscSupId", d.miscSupId);
      handleHeaderChange("supplierName", d.miscSupName);
      handleHeaderChange("vatNo", d.vatNo);
    },
    [loadMiscSuppliers, handleHeaderChange],
  );

  const handleClear = useCallback(async () => {
    setHeader(emptyHeader());
    setRows(createRows());
    setMode("S");
    setOriginalSlNos([]);
    setMiscMode("No");
    setMessage("");
    setPosted(false);
    setExpenseRows(createExpenseRows());

    const d = await getDefaults();
    if (d) setHeader((prev) => ({ ...prev, brId: d.brId, docNo: d.docNo }));
  }, [getDefaults]);

  /* Load an existing invoice when the Entry No. field is left */
  const handleDocNoBlur = useCallback(async () => {
    if (!header.brId || !header.docNo) return;

    const found = await fetchInvoice(YEAR, header.brId, header.docNo);

    if (found) {
      // cash invoice: show the saved name in the Misc. Sup. boxes
      const misc = found.header.miscSupId
        ? miscSuppliers.find((m) => m.id === found.header.miscSupId)
        : undefined;

      setHeader({
        ...found.header,
        supplierName: resolveSupplierName(found.header),
        miscSupId: misc?.id ?? "",
      });
      setRows([
        ...found.rows,
        ...Array.from(
          { length: Math.max(ROW_COUNT - found.rows.length, 0) },
          emptyRow,
        ),
      ]);
      setOriginalSlNos(found.originalSlNos);
      const hRate = num(found.header.currencyRate) || 1;
      setExpenseRows(
        padExpenseRows(
          found.expenses.map((e) => ({
            ...e,
            currency: found.header.currency,
            currencyRate: hRate.toFixed(4),
            amount: e.amountSAR ? (num(e.amountSAR) / hRate).toFixed(4) : "",
          })),
        ),
      );
      setMiscMode(misc ? "Yes" : "No");
      setPosted(found.posted);
      setMode("M");
      return;
    }

    // Not found: if an existing invoice was loaded before, don't keep its data
    if (mode === "M") {
      setHeader({
        ...emptyHeader(),
        brId: header.brId,
        docNo: header.docNo,
      });
      setRows(createRows());
      setOriginalSlNos([]);
      setExpenseRows(createExpenseRows());
      setMiscMode("No");
    }
    setPosted(false);
    setMode("S");
  }, [
    fetchInvoice,
    header.brId,
    header.docNo,
    mode,
    miscSuppliers,
    resolveSupplierName,
  ]);

  /* VB: cmdCalcUnitcost_Click -> CalcUnitCost (calculated on the server) */
  const handleCalcUnitCost = useCallback(async () => {
    try {
      const updated = await calcUnitCost(
        rows,
        totalExpense,
        discAmt,
        currencyRate,
      );
      setRows(updated);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to calculate unit cost",
      );
    }
  }, [calcUnitCost, rows, totalExpense, discAmt, currencyRate]);

  const handleSave = useCallback(async () => {
    if (posted) {
      toast.warning("Posted Purchase Invoice cannot be modified");
      return;
    }
    if (miscMode === "Yes" && !header.miscSupId) {
      toast.warning("Please select a 'Misc. Sup.' or change it to 'No'", {
        toastId: "misc-sup-warning", // prevents duplicate toasts
      });
      document.getElementById("lkpMiscSupID")?.focus();
      return;
    }
    try {
      setMessage("");
      await saveInvoice({
        mode,
        year: YEAR,
        header: { ...header, supplierName: resolveSupplierName(header) },
        rows,
        originalSlNos,
        expenses: expenseRows,
      });
      toast.success(mode === "S" ? "Saved" : "Modified");
      handleClear();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Not saved, try again");
    }
  }, [
    posted,
    miscMode,
    mode,
    header,
    rows,
    originalSlNos,
    expenseRows,
    saveInvoice,
    handleClear,
    resolveSupplierName,
  ]);

  const handleDelete = useCallback(async () => {
    if (posted) {
      toast.warning("Posted Purchase Invoice cannot be deleted");
      return;
    }
    const ok = await confirm({
      title: "Purchase Invoice",
      message: "Do you want to delete ?",
    });
    if (!ok) return;
    try {
      await deleteInvoice(YEAR, header.brId, header.docNo);
      toast.success("Deleted");
      handleClear();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Not deleted, try again",
      );
    }
  }, [posted, confirm, deleteInvoice, header.brId, header.docNo, handleClear]);

  /* Post: only an already-saved (loaded) invoice can be posted */
  const handlePost = useCallback(async () => {
    if (mode !== "M") {
      toast.warning("Please save the invoice before posting");
      return;
    }
    if (posted) {
      toast.warning("Purchase Invoice is already posted");
      return;
    }
    const ok = await confirm({
      title: "Purchase Invoice",
      message: "Do you want to post ?",
    });
    if (!ok) return;

    try {
      setPosting(true);
      await postInvoice(YEAR, header.brId, header.docNo);
      toast.success("Posted");
      handleClear();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Not posted, try again");
    } finally {
      setPosting(false);
    }
  }, [
    mode,
    posted,
    confirm,
    postInvoice,
    header.brId,
    header.docNo,
    handleClear,
  ]);

  return (
    <main className="mx-auto flex h-fit w-full max-w-275 flex-col overflow-hidden border border-slate-400 bg-white text-[12px] text-slate-800">
      <div className="flex h-7.5 w-full shrink-0 items-center border-b border-slate-300 bg-[#a5e0c3]">
        <h1 className="ml-3.75 text-[17px] font-semibold text-slate-700">
          Purchase Invoice
        </h1>
      </div>

      <PurchaseForm
        header={header}
        onChange={handleHeaderChange}
        onDocNoBlur={handleDocNoBlur}
        totalSupplierAmt={supplierAmount}
        onCalcUnitCost={handleCalcUnitCost}
        lookups={lookups}
        miscSuppliers={miscSuppliers}
        miscMode={miscMode}
        onMiscModeChange={setMiscMode}
        onMiscSupplierSaved={handleMiscSupplierSaved}
        expenseRows={expenseRows}
        onExpenseSave={setExpenseRows}
      />

      <PurchaseTable
        rows={rows}
        onRowChange={handleRowChange}
        onRowDelete={handleRowDelete}
        disabled={posted}
        lookups={itemLookups}
      />
      <PurchaseFooter
        note={header.note}
        onNoteChange={(v) => handleHeaderChange("note", v)}
        totals={totals}
        isModify={mode === "M"}
        isPosted={posted}
        busy={loading || posting}
        onSave={handleSave}
        onDelete={handleDelete}
        onClear={handleClear}
        onPrint={() => window.print()}
        onPost={handlePost}
      />
      {message && <p className="px-3 pb-2 text-red-600">{message}</p>}
      {dialog}
    </main>
  );
};

export default PurchaseInvoicePage;
