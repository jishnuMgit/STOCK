import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { usePurchaseInvoice } from "../../../hooks/Purchase/Transaction/usePurchaseInvoice";

export interface MiscSupplierData {
  miscSupId: string;
  miscSupName: string;
  vatNo: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved?: (data: MiscSupplierData) => void;
}

const inputClassmiscName = "w-[300px] input-style";
const inputClassvat = "w-[220px] input-style";
const buttonClass = "btn-style";

const PurchaseInoviceMiscsup: React.FC<Props> = ({
  open,
  onClose,
  onSaved,
}) => {
  const { fetchNextCashSupplierId, saveCashSupplier } = usePurchaseInvoice();

  const [miscSupId, setMiscSupId] = useState("");
  const [miscSupName, setMiscSupName] = useState("");
  const [vatNo, setVatNo] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const nameInputRef = useRef<HTMLInputElement>(null);
  const vatInputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  /* Each time the popup opens: reset, load the next ID, focus the name */
  useEffect(() => {
    if (!open) return;
    setMiscSupId("");
    setMiscSupName("");
    setVatNo("");
    setError("");
    nameInputRef.current?.focus();

    let cancelled = false;
    fetchNextCashSupplierId()
      .then((id) => {
        if (!cancelled) setMiscSupId(id);
      })
      .catch((err: unknown) => {
        if (!cancelled)
          setError(err instanceof Error ? err.message : "Failed to get ID");
      });

    return () => {
      cancelled = true;
    };
  }, [open, fetchNextCashSupplierId]);

  /* Esc closes the popup */
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const handleSave = async () => {
    if (saving) return;

    if (!miscSupId.trim()) {
      setError("Please input 'Cash Supplier ID'");
      return;
    }
    if (!miscSupName.trim()) {
      setError("Please input 'Cash Supplier Name'");
      return;
    }
    if (vatNo.trim() && vatNo.trim().length < 15) {
      setError("'VAT No.' Should be 15 digits width");
      return;
    }

    const data: MiscSupplierData = {
      miscSupId: miscSupId.trim(),
      miscSupName: miscSupName.trim().toUpperCase(),
      vatNo: vatNo.trim(),
    };

    try {
      setSaving(true);
      setError("");
      await saveCashSupplier({
        mode: "S",
        cashSupplierId: data.miscSupId,
        cashSupplierName: data.miscSupName,
        vatNo: data.vatNo,
      });
      onSaved?.(data);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Not saved, try again");
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40"
      onMouseDown={(e) => {
        // click on the dark backdrop closes; clicks inside the box do not
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="miscSupTitle"
        className="w-[500px] overflow-hidden border border-slate-400 bg-white text-[12px] text-slate-800 shadow-xl"
      >
        {/* TITLE */}
        <div className="relative flex h-[30px] w-full shrink-0 items-center border-b border-slate-300 bg-[#a5e0c3]">
          <h1
            id="miscSupTitle"
            className="ml-[20px] text-[17px] font-semibold text-slate-700"
          >
            Misc. Supplier
          </h1>

          <button
            id="btnMiscClose"
            type="button"
            title="Close"
            aria-label="Close"
            onClick={onClose}
            className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white text-slate-500 shadow hover:bg-slate-100 hover:text-red-500 focus:outline-none"
          >
            <X size={15} strokeWidth={2} />
          </button>
        </div>

        {/* FORM */}
        <div className="px-[25px] py-[22px]">
          {/* Supplier ID (auto, read-only) */}
          <div className="mb-[12px] flex items-center">
            <label
              htmlFor="txtMiscSupID"
              className="w-[125px] shrink-0 text-right text-[13px] text-slate-700"
            >
              Supplier ID :
            </label>

            <input
              id="txtMiscSupID"
              type="text"
              value={miscSupId}
              readOnly
              tabIndex={-1}
              className="input-style ml-[10px] w-[110px] bg-slate-100"
            />
          </div>

          {/* Supplier Name */}
          <div className="mb-[12px] flex items-center">
            <label
              htmlFor="txtMiscSupName"
              className="w-[125px] shrink-0 text-right text-[13px] text-slate-700"
            >
              Supplier Name :
            </label>

            <input
              ref={nameInputRef}
              id="txtMiscSupName"
              type="text"
              value={miscSupName}
              maxLength={100}
              onChange={(e) => setMiscSupName(e.target.value.toUpperCase())}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  vatInputRef.current?.focus();
                }
              }}
              autoComplete="off"
              className={`${inputClassmiscName} ml-[10px]`}
            />
          </div>

          {/* VAT No */}
          <div className="flex items-center">
            <label
              htmlFor="txtVatNo"
              className="w-[125px] shrink-0 text-right text-[13px] text-slate-700"
            >
              VAT No. :
            </label>

            <input
              ref={vatInputRef}
              id="txtVatNo"
              type="text"
              value={vatNo}
              maxLength={15}
              onChange={(e) => setVatNo(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void handleSave();
                }
              }}
              autoComplete="off"
              className={`${inputClassvat} ml-[10px]`}
            />
          </div>

          {error && (
            <p className="mt-[10px] pl-[135px] text-[12px] text-red-600">
              {error}
            </p>
          )}
        </div>

        {/* BUTTONS */}
        <div className="flex justify-center gap-[6px] border-slate-300 bg-white px-[25px] py-[12px]">
          <button
            id="btnMiscSave"
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className={`${buttonClass} disabled:opacity-60`}
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default PurchaseInoviceMiscsup;
