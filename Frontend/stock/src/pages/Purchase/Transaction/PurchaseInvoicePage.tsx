import React, { useCallback, useEffect, useMemo, useState } from "react";
import PurchaseForm from "../../../components/Transaction/PurchaseInvoice/PurchaseInvoiceForm";
import PurchaseTable from "../../../components/Transaction/PurchaseInvoice/PurchaseInvoiceTable";
import PurchaseFooter from "../../../components/Transaction/PurchaseInvoice/PurchaseInvoiceFooter";
import type { MiscSupplierData } from "../../../components/Transaction/PurchaseInvoice/PurchaseInoviceMiscsup";
import {
  usePurchaseInvoice,
  emptyHeader,
  emptyRow,
  type CashSupplier,
  type InvoiceTypeOption,
  type PurchaseHeader,
  type PurchaseRow,
  type Item,
  type SupplierLookup,
} from "../../../hooks/Purchase/Transaction/usePurchaseInvoice";

const ROW_COUNT = 12;
const createRows = () => Array.from({ length: ROW_COUNT }, emptyRow);

// TODO: replace with the login year you already keep after /login (PstrYear)
const YEAR = String(new Date().getFullYear());

// company is stored in localStorage by useLogin after /login
const getCoId = () => localStorage.getItem("PstrCoID") ?? "";

const num = (v: string) => (Number.isFinite(Number(v)) ? Number(v) : 0);

/* Recalculate one row. No foreign-currency price any more:
   the user types Unit Price, everything else follows from it. */
const recalcRow = (row: PurchaseRow): PurchaseRow => {
  const qty = num(row.qty);
  const unitPrice = num(row.unitPrice);
  return {
    ...row,
    totalPrice: (qty * unitPrice).toFixed(2),
    unitCost: unitPrice.toFixed(2),
    totalCost: (qty * unitPrice).toFixed(2),
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
    calcUnitCost,
    fetchCashSuppliers,
    fetchItems,
    fetchSuppliers,
    loading,
  } = usePurchaseInvoice();

  const [header, setHeader] = useState<PurchaseHeader>(emptyHeader);
  const [rows, setRows] = useState<PurchaseRow[]>(createRows);
  const [mode, setMode] = useState<"S" | "M">("S");
  const [originalSlNos, setOriginalSlNos] = useState<number[]>([]);
  const [message, setMessage] = useState("");
  const [branches, setBranches] = useState<{ value: string; label: string }[]>(
    [],
  );
  const [invoiceTypes, setInvoiceTypes] = useState<InvoiceTypeOption[]>([]);

  // Misc. supplier lookup + the Yes/No switch.
  // Default type is Cash (C), where the supplier name comes from Misc. Sup.
  const [miscSuppliers, setMiscSuppliers] = useState<CashSupplier[]>([]);
  const [miscMode, setMiscMode] = useState("Yes");
  const [items, setItems] = useState<Item[]>([]);

  const [suppliersById, setSuppliersById] = useState<SupplierLookup[]>([]);
  const [suppliersByName, setSuppliersByName] = useState<SupplierLookup[]>([]);

  // TODO: wire this to the Purchase Expense total (txtTotExp)
  const totalExpense = 0;
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
      itemIds: items.map((i) => ({ value: i.id, label: i.id, name: i.name })),
      itemNames: items.map((i) => ({
        value: i.id,
        label: i.name,
        name: i.name,
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
    [branches, invoiceTypes, suppliersById, suppliersByName],
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
        setMiscMode(value === "C" ? "Yes" : "No");
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

  const handleRowChange = useCallback(
    (index: number, patch: Partial<PurchaseRow>) => {
      setRows((prev) =>
        prev.map((row, i) =>
          i === index ? recalcRow({ ...row, ...patch }) : row,
        ),
      );
    },
    [],
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
    setMiscMode("Yes"); // default type is Cash
    setMessage("");

    const d = await getDefaults();
    if (d) setHeader((prev) => ({ ...prev, brId: d.brId, docNo: d.docNo }));
  }, [getDefaults]);

  /* Load an existing invoice when the Entry No. field is left */
  const handleDocNoBlur = useCallback(async () => {
    if (!header.brId || !header.docNo) return;

    const found = await fetchInvoice(YEAR, header.brId, header.docNo);

    if (found) {
      // cash invoice: show the saved name in the Misc. Sup. boxes
      const misc =
        found.header.invoiceType === "C"
          ? miscSuppliers.find((m) => m.name === found.header.supplierName)
          : undefined;

      setHeader({ ...found.header, miscSupId: misc?.id ?? "" });
      setRows([
        ...found.rows,
        ...Array.from(
          { length: Math.max(ROW_COUNT - found.rows.length, 0) },
          emptyRow,
        ),
      ]);
      setOriginalSlNos(found.originalSlNos);
      setMiscMode(found.header.invoiceType === "C" ? "Yes" : "No");
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
      setMiscMode("Yes");
    }
    setMode("S");
  }, [fetchInvoice, header.brId, header.docNo, mode, miscSuppliers]);

  /* VB: cmdCalcUnitcost_Click -> CalcUnitCost (calculated on the server) */
  const handleCalcUnitCost = useCallback(async () => {
    try {
      const updated = await calcUnitCost(rows, totalExpense, discAmt);
      setRows(updated);
    } catch (err) {
      window.alert(
        err instanceof Error ? err.message : "Failed to calculate unit cost",
      );
    }
  }, [calcUnitCost, rows, totalExpense, discAmt]);

  const handleSave = useCallback(async () => {
    try {
      setMessage("");
      await saveInvoice({ mode, year: YEAR, header, rows, originalSlNos });
      window.alert(mode === "S" ? "Saved" : "Modified");
      handleClear();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Not saved, try again");
    }
  }, [mode, header, rows, originalSlNos, saveInvoice, handleClear]);

  const handleDelete = useCallback(async () => {
    if (!window.confirm("Do you want to delete ?")) return;
    try {
      await deleteInvoice(YEAR, header.brId, header.docNo);
      window.alert("Deleted");
      handleClear();
    } catch (err) {
      window.alert(
        err instanceof Error ? err.message : "Not deleted, try again",
      );
    }
  }, [deleteInvoice, header.brId, header.docNo, handleClear]);

  return (
    <main className="mx-auto flex h-fit w-full max-w-[1100px] flex-col overflow-hidden border border-slate-400 bg-white text-[12px] text-slate-800">
      <div className="flex h-[30px] w-full shrink-0 items-center border-b border-slate-300 bg-[#a5e0c3]">
        <h1 className="ml-[15px] text-[17px] font-semibold text-slate-700">
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
      />

      <PurchaseTable
        rows={rows}
        onRowChange={handleRowChange}
        lookups={itemLookups}
      />

      <PurchaseFooter
        note={header.note}
        onNoteChange={(v) => handleHeaderChange("note", v)}
        totals={totals}
        isModify={mode === "M"}
        busy={loading}
        onSave={handleSave}
        onDelete={handleDelete}
        onClear={handleClear}
        onPrint={() => window.print()}
        onPost={() => undefined /* post endpoint not built yet */}
      />
      {message && <p className="px-3 pb-2 text-red-600">{message}</p>}
    </main>
  );
};

export default PurchaseInvoicePage;
