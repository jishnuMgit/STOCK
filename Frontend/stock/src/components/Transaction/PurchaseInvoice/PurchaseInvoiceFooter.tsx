import React from "react";

interface Props {
  note: string;
  onNoteChange: (v: string) => void;
  totals: { supplierTotal: number; finalTotal: number; qty: number };
  isModify: boolean;
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
  busy,
  onSave,
  onDelete,
  onPrint,
  onPost,
  onClear,
}) => {
  const buttons = [
    { label: isModify ? "Modify" : "Save", onClick: onSave },
    { label: "Delete", onClick: onDelete },
    { label: "Print", onClick: onPrint },
    { label: "Post", onClick: onPost },
    { label: "Clear", onClick: onClear },
  ];

  return (
    <footer className="shrink-0 px-3 pb-3 pt-1">
      {/* Same column widths and min-width as the table, so totals line up */}
      <div
        id="purchase-footer-fields"
        className="grid w-full min-w-[900px] grid-cols-[14px_38px_158px_minmax(120px,1fr)_56px_58px_85px_90px_80px_80px_80px] items-center pt-2"
      >
        {/* Note: spans indicator, Sl.No., Item ID, Item Name */}
        <div
          id="purchase-note-group"
          className="col-[1/5] flex min-w-0 items-center gap-2 pr-3"
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
            className="input-style min-w-0 flex-1"
          />
        </div>

        {/* Total: label sits in the Unit column, input under Qty */}
        <div
          id="purchase-total-group"
          className="col-[5/7] grid min-w-0 grid-cols-[minmax(0,1fr)_58px] items-center gap-0"
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

        {/* Supplier Total: under S.Total Price */}
        <div
          id="purchase-supplier-total-group"
          className="col-[8/9] min-w-0 px-[1px]"
        >
          <input
            id="purchaseSupplierTotal"
            type="text"
            value={totals.supplierTotal.toFixed(4)}
            readOnly
            aria-label="Supplier total price"
            className="input-style w-full min-w-0 text-right"
          />
        </div>

        {/* Final Total: under Total Cost */}
        <div
          id="purchase-final-total-group"
          className="col-[11/12] min-w-0 px-[1px]"
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

      {/* Action buttons */}
      <div
        id="purchase-footer-actions"
        className="mt-[9px] mb-[5px] flex flex-wrap justify-center gap-[12px]"
      >
        {buttons.map(({ label, onClick }) => (
          <button
            key={label}
            id={`btn${label}`}
            type="button"
            disabled={busy}
            onClick={onClick}
            className="btn-style"
          >
            <span className="underline decoration-green-600 decoration-[1px] underline-offset-2">
              {label.charAt(0)}
            </span>
            {label.slice(1)}
          </button>
        ))}
      </div>
    </footer>
  );
};

export default PurchaseFooter;
