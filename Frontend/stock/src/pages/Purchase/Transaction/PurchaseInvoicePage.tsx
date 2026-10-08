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
  type PurchaseHeader,
  type PurchaseRow,
} from "../../../hooks/Purchase/Transaction/usePurchaseInvoice";

const ROW_COUNT = 12;
const createRows = () => Array.from({ length: ROW_COUNT }, emptyRow);

// TODO: replace with the login year you already keep after /login (PstrYear)
const YEAR = String(new Date().getFullYear());

const num = (v: string) => (Number.isFinite(Number(v)) ? Number(v) : 0);

/* Recalculate one row (VB: CalcSupplierPrice + CalcUnitCost, without expense/discount) */
const recalcRow = (row: PurchaseRow, rate: number): PurchaseRow => {
  const qty = num(row.qty);
  const unitPrice = Number((num(row.sUnitPrice) * rate).toFixed(2));
  return {
    ...row,
    unitPrice: unitPrice.toFixed(2),
    sTotalPrice: (qty * num(row.sUnitPrice)).toFixed(2),
    unitCost: unitPrice.toFixed(2),
    totalCost: (qty * unitPrice).toFixed(2),
  };
};

const PurchaseInvoicePage: React.FC = () => {
  const {
    fetchInvoice,
    saveInvoice,
    deleteInvoice,
    calcUnitCost,
    fetchCashSuppliers,
    loading,
  } = usePurchaseInvoice();

  const [header, setHeader] = useState<PurchaseHeader>(emptyHeader);
  const [rows, setRows] = useState<PurchaseRow[]>(createRows);
  const [mode, setMode] = useState<"S" | "M">("S");
  const [message, setMessage] = useState("");

  // Misc. supplier lookup + the Yes/No switch
  const [miscSuppliers, setMiscSuppliers] = useState<CashSupplier[]>([]);
  const [miscMode, setMiscMode] = useState("No");

  // TODO: wire these to the Purchase Expense total (txtTotExp)
  // and a discount field (txtDiscAmt)
  const totalExpense = 0;
  const discAmt = 0;

  const rate = num(header.currencyRate) || 1;

  const totals = useMemo(
    () => ({
      supplierTotal: rows.reduce((t, r) => t + num(r.sTotalPrice), 0),
      finalTotal: rows.reduce((t, r) => t + num(r.totalCost), 0),
      qty: rows.reduce((t, r) => t + num(r.qty), 0),
    }),
    [rows],
  );

  /* VB: GetCashSupplier -> fills the Misc. Sup. combos */
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
      setHeader((prev) => ({ ...prev, [field]: value }));

      // currency rate change re-prices every row (VB: txtCurrencyRate_Leave)
      if (field === "currencyRate") {
        const r = num(String(value)) || 1;
        setRows((prev) => prev.map((row) => recalcRow(row, r)));
      }
    },
    [],
  );

  const handleRowChange = useCallback(
    (index: number, patch: Partial<PurchaseRow>) => {
      setRows((prev) =>
        prev.map((row, i) =>
          i === index ? recalcRow({ ...row, ...patch }, rate) : row,
        ),
      );
    },
    [rate],
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

  const handleClear = useCallback(() => {
    setHeader(emptyHeader());
    setRows(createRows());
    setMode("S");
    setMiscMode("No");
    setMessage("");
  }, []);

  /* Load an existing invoice when the Entry No. field is left */
  const handleDocNoBlur = useCallback(async () => {
    if (!header.brId || !header.docNo) return;

    const found = await fetchInvoice(YEAR, header.brId, header.docNo);

    if (found) {
      setHeader(found.header);
      setRows([
        ...found.rows,
        ...Array.from(
          { length: Math.max(ROW_COUNT - found.rows.length, 0) },
          emptyRow,
        ),
      ]);
      setMiscMode("No");
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
      setMiscMode("No");
    }
    setMode("S");
  }, [fetchInvoice, header.brId, header.docNo, mode]);

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
      await saveInvoice({ mode, year: YEAR, header, rows });
      window.alert(mode === "S" ? "Saved" : "Modified");
      handleClear();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Not saved, try again");
    }
  }, [mode, header, rows, saveInvoice, handleClear]);

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
        totalSupplierAmt={totals.supplierTotal}
        onCalcUnitCost={handleCalcUnitCost}
        miscSuppliers={miscSuppliers}
        miscMode={miscMode}
        onMiscModeChange={setMiscMode}
        onMiscSupplierSaved={handleMiscSupplierSaved}
      />

      <PurchaseTable rows={rows} onRowChange={handleRowChange} />

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
