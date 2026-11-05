import React from "react";

interface Props {
  note: string;
  onNoteChange: (v: string) => void;
  totals: { amountExclVat: number; vatAmt: number; amountInclVat: number };
  savedBy?: string;
  isModify: boolean;
  busy: boolean;
  onSave: () => void;
  onDelete: () => void;
  onPrint: () => void;
  onClear: () => void;
}

const InvoiceFooter: React.FC<Props> = ({
  note,
  onNoteChange,
  totals,
  savedBy = "",
  isModify,
  busy,
  onSave,
  onDelete,
  onPrint,
  onClear,
}) => {
  const buttons = [
    { label: isModify ? "Modify" : "Save", onClick: onSave, disabled: false },
    { label: "Delete", onClick: onDelete, disabled: !isModify },
    { label: "Print", onClick: onPrint, disabled: false },
    { label: "Clear", onClick: onClear, disabled: false },
  ];

  return (
    <footer className="shrink-0 px-3 pb-3 pt-1">
      {/* Same column widths and min-width as the table, so totals line up.
          Columns: indicator, Sl No, Description, Excl. VAT, VAT %,
                   VAT Amt., Incl. VAT */}
      <div
        id="invoice-footer-fields"
        className="grid w-full min-w-225 grid-cols-[14px_48px_minmax(200px,1fr)_120px_70px_110px_120px] items-center pt-2"
      >
        {/* Total Excl. VAT: under Inv. Amt. Excl. VAT */}
        <div
          id="invoice-total-excl-group"
          className="col-[4/5] col-start-4 row-start-1 min-w-0 px-px pr-1"
        >
          <input
            id="invoiceTotalExcl"
            type="text"
            value={totals.amountExclVat.toFixed(2)}
            readOnly
            aria-label="Total amount excluding VAT"
            className="input-style w-full min-w-0 text-right"
          />
        </div>

        {/* Total VAT Amt.: under VAT Amt. */}
        <div
          id="invoice-total-vat-group"
          className="col-[6/7] row-start-1 min-w-0 px-px pr-1"
        >
          <input
            id="invoiceTotalVat"
            type="text"
            value={totals.vatAmt.toFixed(2)}
            readOnly
            aria-label="Total VAT amount"
            className="input-style w-full min-w-0 text-right"
          />
        </div>

        {/* Total Incl. VAT: under Inv. Amt. Incl. VAT */}
        <div
          id="invoice-total-incl-group"
          className="col-[7/8] row-start-1 min-w-0 px-px"
        >
          <input
            id="invoiceTotalIncl"
            type="text"
            value={totals.amountInclVat.toFixed(2)}
            readOnly
            aria-label="Total amount including VAT"
            className="input-style w-full min-w-0 text-right"
          />
        </div>

        {/* Note: spans indicator, Sl No, Description */}
        <div
          id="invoice-note-group"
          className="col-[1/4] row-start-2 mt-2 flex min-w-0 items-center gap-2 pr-8"
        >
          <label
            htmlFor="invoice-note"
            className="shrink-0 whitespace-nowrap text-[14px] font-semibold text-[#263449]"
          >
            Note:
          </label>

          <input
            id="invoice-note"
            type="text"
            value={note}
            onChange={(e) => onNoteChange(e.target.value)}
            maxLength={100}
            className="input-style min-w-0 flex-1"
          />
        </div>

        {/* Saved by */}
        {savedBy && (
          <p className="col-[4/8] row-start-2 mt-2 text-right text-[11px] text-slate-500">
            Saved By : {savedBy}
          </p>
        )}
      </div>

      {/* Action buttons */}
      <div
        id="invoice-footer-actions"
        className="mt-[9px] mb-[5px] flex flex-wrap justify-center gap-[12px]"
      >
        {buttons.map(({ label, onClick, disabled }) => (
          <button
            key={label}
            id={`btn${label}`}
            type="button"
            disabled={busy || disabled}
            onClick={onClick}
            className="btn-style"
          >
            <span className="underline decoration-green-600 decoration-1 underline-offset-2">
              {label.charAt(0)}
            </span>
            {label.slice(1)}
          </button>
        ))}
      </div>
    </footer>
  );
};

export default InvoiceFooter;
