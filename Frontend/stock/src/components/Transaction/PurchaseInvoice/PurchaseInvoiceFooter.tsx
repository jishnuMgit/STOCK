import React, { useEffect } from "react";
import ActionButton from "../../common/ActionButton";

interface Props {
  note: string;
  onNoteChange: (v: string) => void;
  totals: { supplierTotal: number; finalTotal: number; qty: number };
  isModify: boolean;
  isPosted?: boolean;
  busy: boolean;
  onSave: () => void;
  onDelete: () => void;
  onPrint: () => void;
  onPost: () => void;
  onClear: () => void;
}

const PurchaseFooter: React.FC<Props> = ({
  note,
  onNoteChange,
  totals,
  isModify,
  isPosted = false,
  busy,
  onSave,
  onDelete,
  onPrint,
  onPost,
  onClear,
}) => {
  useEffect(() => {
    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return;

      switch (event.key.toLowerCase()) {
        case "s":
          event.preventDefault();
          event.stopPropagation();
          if (!busy && !isPosted) onSave();
          break;
        case "d":
          event.preventDefault();
          event.stopPropagation();
          if (!busy && !isPosted) onDelete();
          break;
        case "p":
          event.preventDefault();
          event.stopPropagation();
          if (!busy) onPrint();
          break;
        case "t":
          event.preventDefault();
          event.stopPropagation();
          if (!busy && !isPosted && isModify) onPost();
          break;
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [busy, isModify, isPosted, onDelete, onPost, onPrint, onSave]);

  return (
    <footer className="shrink-0 px-3 pb-3 pt-1">
      {/* Same column widths and min-width as the table, so totals line up.
          Columns: indicator, Sl., Item ID, Item Name, Unit, Qty,
                   Unit Price, Total Price, Unit Cost, Total Cost */}
      <div
        id="purchase-footer-fields"
        className="grid w-full min-w-225 grid-cols-[14px_38px_158px_minmax(120px,1fr)_56px_58px_85px_90px_80px_80px] items-center pt-2"
      >
        {/* Note: spans indicator, Sl.No., Item ID, Item Name */}
        <div
          id="purchase-note-group"
          className="col-[1/5] flex min-w-0 items-center gap-2 pr-8"
        >
          <label
            htmlFor="purchase-note"
            className="shrink-0 whitespace-nowrap text-[14px] font-semibold text-[#263449]"
          >
            Note:
          </label>

          <input
            id="purchase-note"
            type="text"
            value={note}
            onChange={(e) => onNoteChange(e.target.value)}
            readOnly={isPosted}
            maxLength={100}
            className="input-style min-w-0 flex-1"
          />
        </div>

        {/* Total: label sits in the Unit column, input under Qty */}
        <div
          id="purchase-total-group"
          className="col-[5/7] grid min-w-0 grid-cols-[minmax(0,1fr)_58px] items-center gap-0 pr-4"
        >
          <label
            htmlFor="purchaseTotal"
            className="whitespace-nowrap pr-1 text-right text-[14px] text-[#263449]"
          >
            Total
          </label>

          <input
            id="purchaseTotal"
            type="text"
            value={totals.qty.toFixed(3)}
            readOnly
            aria-label="Total"
            className="input-style w-full min-w-0 text-right"
          />
        </div>

        {/* Supplier Total: under Total Price */}
        <div
          id="purchase-supplier-total-group"
          className="col-[8/9] min-w-0 px-px pr-5"
        >
          <input
            id="purchaseSupplierTotal"
            type="text"
            value={totals.supplierTotal.toFixed(2)}
            readOnly
            aria-label="Total price"
            className="input-style w-full min-w-0 text-right"
          />
        </div>

        {/* Final Total: under Total Cost */}
        <div
          id="purchase-final-total-group"
          className="col-[10/11] min-w-0 px-px"
        >
          <input
            id="purchaseFinalTotal"
            type="text"
            value={totals.finalTotal.toFixed(4)}
            readOnly
            aria-label="Final total"
            className="input-style w-full min-w-0 text-right"
          />
        </div>
      </div>

      {isPosted && (
        <p className="mt-2 text-center text-[13px] font-semibold text-green-700">
          Posted
        </p>
      )}

      {/* Action buttons */}
      <div
        id="purchase-footer-actions"
        className="mt-[9px] flex flex-wrap justify-center gap-[12px]"
      >
        <ActionButton
          id={isModify ? "btnModify" : "btnSave"}
          label={isModify ? "Modify" : "Save"}
          underlineIndex={0}
          disabled={busy || isPosted}
          onClick={onSave}
        />
        <ActionButton
          id="btnDelete"
          label="Delete"
          underlineIndex={0}
          disabled={busy || isPosted}
          onClick={onDelete}
        />
        <ActionButton
          id="btnPrint"
          label="Print"
          underlineIndex={0}
          disabled={busy}
          onClick={onPrint}
        />
        <ActionButton
          id="btnPost"
          label="Post"
          underlineIndex={0}
          disabled={busy || isPosted || !isModify}
          onClick={onPost}
        />
        <ActionButton
          id="btnClear"
          label="Clear"
          // underlineIndex={0}
          disabled={busy}
          onClick={onClear}
        />
      </div>
    </footer>
  );
};

export default PurchaseFooter;
