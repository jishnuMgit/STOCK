import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "react-toastify";

import SalesInvoiceHeader from "../../../components/Transaction/SalesInvoice/SalesInvoiceHeader";
import SalesInvoiceTable from "../../../components/Transaction/SalesInvoice/SalesInvoiceTable";
import SalesInvoiceFooter from "../../../components/Transaction/SalesInvoice/SalesInvoiceFooter";
import useSalesInvoice, {
  emptyHeader,
  emptyRow,
  type SalesHeader,
  type SalesRow,
  type SalesTotals,
  type SalesUserInfo,
} from "../../../hooks/useSalesInvoice";
import { getSession } from "../../../utils/session";

// ============================================================
// HELPERS
// ============================================================

const ROW_COUNT = 11;

const n = (v: unknown): number => {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
};

/* blank grid row (the hook's emptyRow shows 0.00 in every cell) */
const newRow = (): SalesRow => ({
  ...emptyRow(),
  unitPrice: "",
  itemDiscAmt: "",
  netUnitPrice: "",
  totalPrice: "",
  itemVatAmt: "",
  totalPriceV: "",
  totItemDiscAmt: "",
  unitCost: "",
  totalCost: "",
});

/* keep at least ROW_COUNT rows and always one blank row at the end */
const padRows = (rows: SalesRow[]): SalesRow[] => {
  const next = [...rows];
  while (next.length < ROW_COUNT || next[next.length - 1].itemId) {
    next.push(newRow());
  }
  return next;
};

const zeroTotals: SalesTotals = {
  docAmt: 0,
  discPer: 0,
  discAmt: 0,
  netDocAmtWoVAT: 0,
  vatAmt: 0,
  netDocAmt: 0,
};

const yearOf = (isoDate: string) => isoDate.slice(0, 4);

/* VB used the login year (objCommon.Year). Fall back to the invoice date's
   year if the session has none. */
const yearFor = (isoDate: string) => getSession().pstrYear || yearOf(isoDate);

/* VB: objDate.GregToHijri(date, "dd/MM/yyyy") */
const toHijri = (isoDate: string): string => {
  const d = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(d.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura-nu-latn", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("day")}/${get("month")}/${get("year")}`;
};

/* only the inputs matter: a recalc result is applied to a row only if the
   user has not changed these while the request was running */
const sameInputs = (a: SalesRow, b: SalesRow) =>
  a.itemId === b.itemId &&
  a.qty === b.qty &&
  a.unitPrice === b.unitPrice &&
  a.itemDiscAmt === b.itemDiscAmt;

const showError = (err: unknown, fallback: string) =>
  toast.error(err instanceof Error ? err.message : fallback);

// ============================================================
// PAGE
// ============================================================

const SalesInvoice: React.FC = () => {
  const {
    branchOptions,
    branch,
    setBranch,
    branchLoading,
    branchError,
    lookups,
    getLookups,
    getNextDocNo,
    calcTotals,
    fetchInvoice,
    saveInvoice,
    deleteInvoice,
    postInvoice,
    error,
  } = useSalesInvoice();

  const [header, setHeader] = useState<SalesHeader>(emptyHeader);
  const [rows, setRows] = useState<SalesRow[]>(() => padRows([]));
  const [totals, setTotals] = useState<SalesTotals>(zeroTotals);
  const [mode, setMode] = useState<"S" | "M">("S");
  const [originalSlNos, setOriginalSlNos] = useState<number[]>([]);
  const [posted, setPosted] = useState(false);
  const [userInfo, setUserInfo] = useState<SalesUserInfo | null>(null);
  const [busy, setBusy] = useState(false);

  // latest values for async handlers (synced after render, not during it)
  const headerRef = useRef(header);
  const rowsRef = useRef(rows);
  useLayoutEffect(() => {
    headerRef.current = header;
    rowsRef.current = rows;
  }, [header, rows]);

  const recalcId = useRef(0);
  const lastDocNo = useRef("");

  // errors raised inside the hook (e.g. loading an invoice)
  useEffect(() => {
    if (error) toast.error(error, { toastId: error });
  }, [error]);

  // ==========================================================
  // RESET / NEXT DOC NO
  // ==========================================================

  const resetForm = useCallback((brId: string, docNo = ""): SalesHeader => {
    const fresh: SalesHeader = {
      ...emptyHeader(),
      brId,
      docNo,
      vatPer: headerRef.current.vatPer,
    };
    setHeader(fresh);
    setRows(padRows([]));
    setTotals(zeroTotals);
    setMode("S");
    setOriginalSlNos([]);
    setPosted(false);
    setUserInfo(null);
    return fresh;
  }, []);

  const loadNextDocNo = useCallback(
    async (brId: string, date: string) => {
      try {
        const { docNo } = await getNextDocNo(yearFor(date), brId);
        lastDocNo.current = docNo;
        setHeader((h) => ({ ...h, docNo }));
      } catch (err) {
        showError(err, "Failed to get the next invoice no.");
      }
    },
    [getNextDocNo],
  );

  // branch selected / changed -> fresh form, lookups, next invoice no.
  const branchId = branch?.value ?? "";
  useEffect(() => {
    if (!branchId) return;
    let cancelled = false;

    (async () => {
      const fresh = resetForm(branchId);
      try {
        await getLookups(branchId);
      } catch (err) {
        if (!cancelled) showError(err, "Failed to load lookups");
      }
      if (!cancelled) await loadNextDocNo(branchId, fresh.date);
    })();

    return () => {
      cancelled = true;
    };
  }, [branchId, getLookups, loadNextDocNo, resetForm]);

  // ==========================================================
  // RECALCULATE (server-side totals)
  // ==========================================================

  const recalc = useCallback(
    async (sent: SalesRow[], h: SalesHeader) => {
      if (!sent.some((r) => r.itemId)) {
        setTotals(zeroTotals);
        return;
      }

      const id = ++recalcId.current;
      try {
        const result = await calcTotals(
          sent,
          h.vatPer,
          h.discType,
          h.discPer,
          h.discAmt,
        );
        if (id !== recalcId.current) return; // a newer request is running

        setRows((current) =>
          current.map((r, i) => {
            const before = sent[i];
            const after = result.rows[i];
            if (!before || !after || !sameInputs(r, before)) return r;
            return {
              ...r,
              netUnitPrice: after.netUnitPrice,
              totalPrice: after.totalPrice,
              itemVatAmt: after.itemVatAmt,
              totalPriceV: after.totalPriceV,
              totItemDiscAmt: after.totItemDiscAmt,
              totalCost: after.totalCost,
            };
          }),
        );
        setTotals(result.totals);

        // the field the user is not typing in is the calculated one
        setHeader((cur) =>
          cur.discType === "P"
            ? { ...cur, discAmt: result.totals.discAmt.toFixed(2) }
            : { ...cur, discPer: result.totals.discPer.toFixed(2) },
        );
      } catch (err) {
        showError(err, "Failed to calculate totals");
      }
    },
    [calcTotals],
  );

  // ==========================================================
  // HANDLERS: header
  // ==========================================================

  const handleHeaderChange = (patch: Partial<SalesHeader>) =>
    setHeader((h) => ({ ...h, ...patch }));

  const handleCustomerSelect = (id: string) => {
    const c = lookups.customers.find((x) => x.id === id);
    if (!c) return;
    handleHeaderChange({
      customerId: c.id,
      customerName: c.name,
      address: c.address,
      phone: c.phone,
    });
  };

  const loadInvoice = async (
    brId: string,
    date: string,
    docNo: string,
  ): Promise<boolean> => {
    const r = await fetchInvoice(yearFor(date), brId, docNo);
    if (!r) return false;

    setHeader({ ...r.header, brId });
    setRows(padRows(r.rows));
    setTotals({
      docAmt: r.rows.reduce((s, x) => s + n(x.totalPriceV), 0),
      ...r.totals,
    });
    setMode("M");
    setOriginalSlNos(r.originalSlNos);
    setPosted(r.posted);
    setUserInfo(r.userInfo);
    lastDocNo.current = docNo;
    return true;
  };

  // VB txtDocNo_Leave: load the invoice when the number is changed
  const handleDocNoBlur = async () => {
    const h = headerRef.current;
    const docNo = h.docNo.trim();
    if (!h.brId || !docNo || docNo === lastDocNo.current) return;

    lastDocNo.current = docNo;
    setBusy(true);
    try {
      const found = await loadInvoice(h.brId, h.date, docNo);
      if (!found) resetForm(h.brId, docNo); // new invoice with a typed number
    } finally {
      setBusy(false);
    }
  };

  // ==========================================================
  // HANDLERS: grid
  // ==========================================================

  const handleRowsChange = (next: SalesRow[], doRecalc: boolean) => {
    const padded = padRows(next);
    setRows(padded);
    if (doRecalc) recalc(next, headerRef.current);
  };

  // ==========================================================
  // HANDLERS: discount
  // ==========================================================

  const handleDiscTypeChange = (discType: "A" | "P") => {
    const h = { ...headerRef.current, discType, discPer: "0", discAmt: "0" };
    setHeader(h);
    recalc(rowsRef.current, h);
  };

  const handleDiscCommit = () => recalc(rowsRef.current, headerRef.current);

  // ==========================================================
  // HANDLERS: buttons
  // ==========================================================

  const handleClear = async () => {
    const fresh = resetForm(headerRef.current.brId);
    if (fresh.brId) await loadNextDocNo(fresh.brId, fresh.date);
  };

  const handleSave = async () => {
    if (busy) return;
    const h = headerRef.current;
    const year = yearFor(h.date);

    setBusy(true);

    try {
      await saveInvoice({
        mode,
        year,
        header: { ...h, dateH: toHijri(h.date) },
        rows: rowsRef.current.map((r) =>
          r.itemId ? { ...r, priceLevel: r.priceLevel || h.custPriceLevel } : r,
        ),
        originalSlNos,
      });
    } catch (err) {
      showError(err, "Not saved, try again");
      setBusy(false);
      return;
    }

    // VB posts automatically after a successful save
    try {
      await postInvoice(year, h.brId, h.docNo);
      toast.success(
        mode === "S"
          ? "Sales Invoice saved and posted"
          : "Sales Invoice modified and posted",
      );
      const fresh = resetForm(h.brId);
      await loadNextDocNo(fresh.brId, fresh.date);
    } catch (err) {
      // saved but not posted: reload it so the user can fix and post
      await loadInvoice(h.brId, h.date, h.docNo);
      toast.error(
        `Saved, but not posted: ${
          err instanceof Error ? err.message : "try again"
        }`,
      );
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (busy || mode !== "M") return;
    if (!window.confirm("Do you want to delete?")) return;

    const h = headerRef.current;
    setBusy(true);
    try {
      await deleteInvoice(yearFor(h.date), h.brId, h.docNo);
      toast.success("Deleted");
      const fresh = resetForm(h.brId);
      await loadNextDocNo(fresh.brId, fresh.date);
    } catch (err) {
      showError(err, "Not deleted, try again");
    } finally {
      setBusy(false);
    }
  };

  const handlePost = async () => {
    if (busy || mode !== "M") return;
    const h = headerRef.current;

    setBusy(true);
    try {
      await postInvoice(yearFor(h.date), h.brId, h.docNo);
      await loadInvoice(h.brId, h.date, h.docNo);
      toast.success("Sales Invoice posted");
    } catch (err) {
      showError(err, "Not posted, try again");
    } finally {
      setBusy(false);
    }
  };

  const handlePrint = () => toast.info("Print is not available yet");

  // ==========================================================
  // FOOTER SUMS (VB grid footer)
  // ==========================================================

  const sums = useMemo(
    () => ({
      qty: rows.reduce((s, r) => s + n(r.qty), 0),
      disc: rows.reduce((s, r) => s + n(r.totItemDiscAmt), 0),
      vat: rows.reduce((s, r) => s + n(r.itemVatAmt), 0),
      total: rows.reduce((s, r) => s + n(r.totalPriceV), 0),
    }),
    [rows],
  );

  return (
    <div className="flex h-full w-full justify-center overflow-auto bg-gray-100">
      <main className="h-fit w-full min-w-300 max-w-300 border border-gray-400 mt-5 mb-5 bg-white text-[#202020]">
        <div className="flex w-full flex-col mb-2">
          {/* Header */}
          <SalesInvoiceHeader
            branchOptions={branchOptions}
            branch={branch}
            onBranchChange={setBranch}
            branchLoading={branchLoading}
            branchError={branchError}
            header={header}
            onHeaderChange={handleHeaderChange}
            customers={lookups.customers}
            priceLevels={lookups.priceLevels}
            onCustomerSelect={handleCustomerSelect}
            onDocNoBlur={handleDocNoBlur}
            readOnly={posted}
          />

          {/* Table */}
          <SalesInvoiceTable
            rows={rows}
            items={lookups.items}
            defaultPriceLevel={header.custPriceLevel}
            readOnly={posted}
            onRowsChange={handleRowsChange}
          />

          {/* Footer */}
          <SalesInvoiceFooter
            header={header}
            totals={totals}
            sums={sums}
            discTypes={lookups.discTypes}
            mode={mode}
            posted={posted}
            busy={busy}
            userInfo={userInfo}
            onNoteChange={(note) => handleHeaderChange({ note })}
            onDiscTypeChange={handleDiscTypeChange}
            onDiscPerChange={(discPer) => handleHeaderChange({ discPer })}
            onDiscAmtChange={(discAmt) => handleHeaderChange({ discAmt })}
            onDiscCommit={handleDiscCommit}
            onSave={handleSave}
            onDelete={handleDelete}
            onPrint={handlePrint}
            onPost={handlePost}
            onClear={handleClear}
          />
        </div>
      </main>
    </div>
  );
};

export default SalesInvoice;
