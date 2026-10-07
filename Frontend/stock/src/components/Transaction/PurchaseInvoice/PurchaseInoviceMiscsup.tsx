import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export interface MiscSupplierData {
  miscSupId: string;
  miscSupName: string;
  vatNo: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSave?: (data: MiscSupplierData) => void;
}

const inputClassmiscId = "w-[110px] input-style";
const inputClassmiscName = "w-[300px] input-style";
const inputClassvat = "w-[220px] input-style";
const buttonClass = "btn-style";

const PurchaseInoviceMiscsup: React.FC<Props> = ({ open, onClose, onSave }) => {
  const [miscSupId, setMiscSupId] = useState("");
  const [miscSupName, setMiscSupName] = useState("");
  const [vatNo, setVatNo] = useState("");
  const [error, setError] = useState("");

  const firstInputRef = useRef<HTMLInputElement>(null);

  /* Reset the fields and focus the first one each time the popup opens */
  useEffect(() => {
    if (!open) return;
    setMiscSupId("");
    setMiscSupName("");
    setVatNo("");
    setError("");
    firstInputRef.current?.focus();
  }, [open]);

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

  const handleSave = () => {
    if (!miscSupId.trim()) {
      setError("Please enter 'Misc. Sup.ID'");
      return;
    }
    if (!miscSupName.trim()) {
      setError("Please enter 'Misc. Sup.Name'");
      return;
    }

    onSave?.({
      miscSupId: miscSupId.trim(),
      miscSupName: miscSupName.trim(),
      vatNo: vatNo.trim(),
    });
    onClose();
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
        role="dialog"
        aria-modal="true"
        aria-labelledby="miscSupTitle"
        className="w-[500px] overflow-hidden border border-slate-400 bg-white text-[12px] text-slate-800 shadow-xl"
      >
        {/* TITLE */}
        <div className="flex h-[30px] w-full shrink-0 items-center border-b border-slate-300 bg-[#a5e0c3]">
          <h1
            id="miscSupTitle"
            className="ml-[20px] text-[17px] font-semibold text-slate-700"
          >
            Misc. Supplier
          </h1>
        </div>

        {/* FORM */}
        <div className="px-[25px] py-[22px]">
          {/* Misc. Sup.ID */}
          <div className="mb-[12px] flex items-center">
            <label
              htmlFor="txtMiscSupID"
              className="w-[125px] shrink-0 text-right text-[13px] text-slate-700"
            >
              Misc. Sup.ID :
            </label>

            <input
              ref={firstInputRef}
              id="txtMiscSupID"
              type="text"
              value={miscSupId}
              maxLength={12}
              onChange={(e) => setMiscSupId(e.target.value)}
              autoComplete="off"
              className={`${inputClassmiscId} ml-[10px]`}
            />
          </div>

          {/* Misc. Sup.Name */}
          <div className="mb-[12px] flex items-center">
            <label
              htmlFor="txtMiscSupName"
              className="w-[125px] shrink-0 text-right text-[13px] text-slate-700"
            >
              Misc. Sup.Name :
            </label>

            <input
              id="txtMiscSupName"
              type="text"
              value={miscSupName}
              maxLength={100}
              onChange={(e) => setMiscSupName(e.target.value)}
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
              Vat No. :
            </label>

            <input
              id="txtVatNo"
              type="text"
              value={vatNo}
              maxLength={15}
              onChange={(e) => setVatNo(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
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
            onClick={handleSave}
            className={buttonClass}
          >
            Save
          </button>

          <button
            id="btnMiscClose"
            type="button"
            onClick={onClose}
            className={buttonClass}
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default PurchaseInoviceMiscsup;
