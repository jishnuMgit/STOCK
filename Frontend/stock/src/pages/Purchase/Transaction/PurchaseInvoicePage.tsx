import React, { useCallback, useMemo, useState } from "react";
import PurchaseForm from "../../../components/Transaction/PurchaseInvoice/PurchaseInvoiceForm";
import PurchaseTable from "../../../components/Transaction/PurchaseInvoice/PurchaseInvoiceTable";
import PurchaseFooter from "../../../components/Transaction/PurchaseInvoice/PurchaseInvoiceFooter";
import {
  usePurchaseInvoice,
  emptyHeader,
  emptyRow,
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
  const { fetchInvoice, saveInvoice, deleteInvoice, loading } =
    usePurchaseInvoice();

  const [header, setHeader] = useState<PurchaseHeader>(emptyHeader);
  const [rows, setRows] = useState<PurchaseRow[]>(createRows);
  const [mode, setMode] = useState<"S" | "M">("S");
  const [message, setMessage] = useState("");

  const rate = num(header.currencyRate) || 1;

  const totals = useMemo(
    () => ({
      supplierTotal: rows.reduce((t, r) => t + num(r.sTotalPrice), 0),
      finalTotal: rows.reduce((t, r) => t + num(r.totalCost), 0),
      qty: rows.reduce((t, r) => t + num(r.qty), 0),
    }),
    [rows],
  );

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

  const handleClear = useCallback(() => {
    setHeader(emptyHeader());
    setRows(createRows());
    setMode("S");
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
      setMode("M");
    } else {
      setMode("S");
    }
  }, [fetchInvoice, header.brId, header.docNo]);

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
