import React, { useEffect, useRef } from "react";
import { X } from "lucide-react";
import type { BranchStockRow } from "../../../hooks/useSalesInvoice"; // adjust path

type BranchStockModalProps = {
  open: boolean;
  loading: boolean;
  itemId: string;
  rows: BranchStockRow[];
  total: number;
  onClose: () => void;
};

const fmt = (v: number) =>
  v.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  });

const thClass =
  "sticky top-0 z-10 h-7.5 border border-[#dce5ef] bg-[#f1f6fc] px-2 py-0 align-middle text-[14px] font-semibold text-[#202a36]";

const tdClass =
  "h-7.5 border border-[#dce5ef] px-2 py-0 text-[14px] text-[#263449]";

const BranchStockModal: React.FC<BranchStockModalProps> = ({
  open,
  loading,
  itemId,
  rows,
  total,
  onClose,
}) => {
  const closeRef = useRef<HTMLButtonElement>(null);

  // focus the Close button, and let Esc / Enter close the popup
  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/30"
      onMouseDown={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Branch Stock Details"
        className="w-105 border border-slate-400 bg-white shadow-xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Title bar */}
        <div className="flex h-9 items-center justify-between border-b border-slate-300 bg-[#a3dfc0] pl-3 pr-1">
          <span className="text-[16px] font-semibold text-slate-700">
            Branch Stock Details
          </span>
          <button
            type="button"
            tabIndex={-1}
            aria-label="Close"
            onClick={onClose}
            className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-sm text-slate-600 hover:bg-red-100 hover:text-red-600"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-3 pt-3">
          <div className="mb-2 truncate text-[13px] text-slate-600">
            Item : <span className="font-semibold">{itemId}</span>
          </div>

          {/* Grid */}
          <div className="customer-table-scroll h-55 overflow-auto border border-[#dce5ef]">
            <table className="w-full table-fixed border-collapse">
              <colgroup>
                <col />
                <col style={{ width: "110px" }} />
              </colgroup>
              <thead>
                <tr>
                  <th className={`${thClass} text-left`}>Branch</th>
                  <th className={`${thClass} text-right`}>Stock</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td className={tdClass} colSpan={2}>
                      Loading...
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td className={tdClass} colSpan={2}>
                      No stock found
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => (
                    <tr key={r.brId} className="hover:bg-blue-50">
                      <td className={tdClass}>{r.brName}</td>
                      <td className={`${tdClass} text-right`}>
                        {fmt(r.stock)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Total */}
          <div className="mt-2 flex justify-end">
            <input
              type="text"
              readOnly
              tabIndex={-1}
              aria-label="Total stock"
              value={loading ? "" : fmt(total)}
              className="h-7.5 w-28 rounded-[4px] border border-[#d7dee7] bg-[#f8fafc] px-2 text-right text-[14px] text-[#334155] outline-none"
            />
          </div>
        </div>

        {/* Close */}
        <div className="flex justify-center py-3">
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="btn-style"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default BranchStockModal;
