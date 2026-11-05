import React, { useCallback, useEffect, useMemo, useState } from "react";
import InvoiceForm from "../../../../components/Sales/Transaction/Invoice/InvoiceForm";
import InvoiceTable from "../../../../components/Sales/Transaction/Invoice/InvoiceTable";
import InvoiceFooter from "../../../../components/Sales/Transaction/Invoice/InvoiceFooter";
import {
  useInvoice,
  emptyHeader,
  emptyRow,
  type InvoiceHeader,
  type InvoiceRow,
  type CustomerLookup,
} from "../../../../hooks/useInvoice";
import { toast } from "react-toastify";
import { useConfirmModal } from "../../../../hooks/useConfirmModal";

const ROW_COUNT = 10;
const createRows = () => Array.from({ length: ROW_COUNT }, emptyRow);

// TODO: replace with the login year you already keep after /login (PstrYear)
const YEAR = String(new Date().getFullYear());

// company is stored in localStorage by useLogin after /login
const getCoId = () => localStorage.getItem("PstrCoID") ?? "";

const num = (v: string) => (Number.isFinite(Number(v)) ? Number(v) : 0);

/* A row is "entered" when it has a description or an amount */
const isEntered = (r: InvoiceRow) =>
  r.description.trim() !== "" || num(r.amountExclVat) !== 0;

/* Recalculate one row: VAT Amt and Incl. VAT follow Excl. VAT and VAT % */
const recalcRow = (row: InvoiceRow): InvoiceRow => {
  const excl = num(row.amountExclVat);
  const vat = (excl * num(row.vatPercent)) / 100;
  return {
    ...row,
    vatAmt: excl ? vat.toFixed(2) : "",
    amountInclVat: excl ? (excl + vat).toFixed(2) : "",
  };
};

const InvoicePage: React.FC = () => {
  const {
    fetchBranches,
    fetchDefaultBranch,
    fetchNextDocNo,
    fetchCustomers,
    fetchInvoice,
    saveInvoice,
    deleteInvoice,
    loading,
  } = useInvoice();

  const { confirm, dialog } = useConfirmModal();

  const [header, setHeader] = useState<InvoiceHeader>(emptyHeader);
  const [rows, setRows] = useState<InvoiceRow[]>(createRows);
  const [mode, setMode] = useState<"S" | "M">("S");
  const [savedBy, setSavedBy] = useState("");
  const [branches, setBranches] = useState<{ value: string; label: string }[]>(
    [],
  );
  const [customers, setCustomers] = useState<CustomerLookup[]>([]);

  const totals = useMemo(
    () => ({
      amountExclVat: rows.reduce((t, r) => t + num(r.amountExclVat), 0),
      vatAmt: rows.reduce((t, r) => t + num(r.vatAmt), 0),
      amountInclVat: rows.reduce((t, r) => t + num(r.amountInclVat), 0),
    }),
    [rows],
  );

  /* ---------- lookups ---------- */

  useEffect(() => {
    fetchBranches()
      .then((list) =>
        setBranches(list.map((b) => ({ value: b.id, label: b.name }))),
      )
      .catch(() => setBranches([]));
  }, [fetchBranches]);

  useEffect(() => {
    const coId = getCoId();
    if (!coId) return;

    let cancelled = false;

    fetchCustomers(coId)
      .then((list) => {
        if (!cancelled) setCustomers(list);
      })
      .catch(() => {
        if (!cancelled) setCustomers([]);
      });

    return () => {
      cancelled = true;
    };
  }, [fetchCustomers]);

  const lookups = useMemo(
    () => ({
      branches: branches.length ? branches : undefined,
      customerIds: customers.map((c) => ({
        value: c.id,
        label: c.id,
        name: c.name,
      })),
      customerNames: customers.map((c) => ({
        value: c.id,
        label: c.name,
        name: c.name,
      })),
    }),
    [branches, customers],
  );

  /* default branch + its next invoice no. (only fetches, sets no state) */
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

  /* ---------- handlers ---------- */

  const handleHeaderChange = useCallback(
    <K extends keyof InvoiceHeader>(field: K, value: InvoiceHeader[K]) => {
      setHeader((prev) => ({ ...prev, [field]: value }));

      // new entry: a different branch has its own invoice no.
      if (field === "brId" && mode === "S" && value) {
        fetchNextDocNo(YEAR, String(value))
          .then((docNo) => setHeader((prev) => ({ ...prev, docNo })))
          .catch(() => undefined);
      }
    },
    [mode, fetchNextDocNo],
  );

  const handleRowChange = useCallback(
    (index: number, patch: Partial<InvoiceRow>) => {
      setRows((prev) =>
        prev.map((row, i) =>
          i === index ? recalcRow({ ...row, ...patch }) : row,
        ),
      );
    },
    [],
  );

  /* remove one entered line; keep the grid at least ROW_COUNT rows long */
  const handleRowDelete = useCallback((index: number) => {
    setRows((prev) => {
      const next = prev.filter((_, i) => i !== index);
      while (next.length < ROW_COUNT) next.push(emptyRow());
      return next;
    });
  }, []);

  /* keep a blank row at the bottom so the user can always keep typing */
  const handleAddRowIfLast = useCallback((index: number) => {
    setRows((prev) =>
      index === prev.length - 1 && isEntered(prev[index])
        ? [...prev, emptyRow()]
        : prev,
    );
  }, []);

  const handleClear = useCallback(async () => {
    setHeader(emptyHeader());
    setRows(createRows());
    setMode("S");
    setSavedBy("");

    const d = await getDefaults();
    if (d) setHeader((prev) => ({ ...prev, brId: d.brId, docNo: d.docNo }));
  }, [getDefaults]);

  /* Load an existing invoice when the Invoice No. field is left */
  const handleDocNoBlur = useCallback(async () => {
    if (!header.brId || !header.docNo) return;

    let found = null;
    try {
      found = await fetchInvoice(YEAR, header.brId, header.docNo);
    } catch {
      found = null;
    }

    if (found) {
      setHeader(found.header);
      setRows([
        ...found.rows,
        ...Array.from(
          { length: Math.max(ROW_COUNT - found.rows.length, 0) },
          emptyRow,
        ),
      ]);
      setSavedBy(found.savedBy ?? "");
      setMode("M");
      return;
    }

    // Not found: if an existing invoice was loaded before, don't keep its data
    if (mode === "M") {
      setHeader({ ...emptyHeader(), brId: header.brId, docNo: header.docNo });
      setRows(createRows());
      setSavedBy("");
    }
    setMode("S");
  }, [fetchInvoice, header.brId, header.docNo, mode]);

  const handleSave = useCallback(async () => {
    if (!header.customerId) {
      toast.warning("Please select a customer", { toastId: "inv-customer" });
      document.getElementById("lkpCustomerID")?.focus();
      return;
    }

    const entered = rows.filter(isEntered);
    if (entered.length === 0) {
      toast.warning("Please enter at least one line", { toastId: "inv-lines" });
      document.getElementById("txtDescription-0")?.focus();
      return;
    }

    try {
      await saveInvoice({ mode, year: YEAR, header, rows: entered });
      toast.success(mode === "S" ? "Saved" : "Modified");
      handleClear();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Not saved, try again");
    }
  }, [header, rows, mode, saveInvoice, handleClear]);

  const handleDelete = useCallback(async () => {
    if (mode !== "M") {
      toast.warning("Load a saved invoice to delete it");
      return;
    }
    const ok = await confirm({
      title: "Invoice",
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
  }, [mode, confirm, deleteInvoice, header.brId, header.docNo, handleClear]);

  return (
    <main className="mx-auto flex h-fit w-full max-w-275 flex-col overflow-hidden border border-slate-400 bg-white text-[12px] text-slate-800">
      <div className="flex h-7.5 w-full shrink-0 items-center border-b border-slate-300 bg-[#a5e0c3]">
        <h1 className="ml-3.75 text-[17px] font-semibold text-slate-700">
          Invoice
        </h1>
      </div>

      <InvoiceForm
        header={header}
        onChange={handleHeaderChange}
        onDocNoBlur={handleDocNoBlur}
        lookups={lookups}
      />

      <InvoiceTable
        rows={rows}
        onRowChange={handleRowChange}
        onRowDelete={handleRowDelete}
        onRowEntered={handleAddRowIfLast}
      />

      <InvoiceFooter
        note={header.note}
        onNoteChange={(v) => handleHeaderChange("note", v)}
        totals={totals}
        savedBy={savedBy}
        isModify={mode === "M"}
        busy={loading}
        onSave={handleSave}
        onDelete={handleDelete}
        onClear={handleClear}
        onPrint={() => window.print()}
      />
      {dialog}
    </main>
  );
};

export default InvoicePage;
