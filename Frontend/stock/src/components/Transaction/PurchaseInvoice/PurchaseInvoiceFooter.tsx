import React from "react";

const PurchaseFooter: React.FC = () => {
  const buttons = ["Save", "Delete", "Print", "Post", "Clear"];

  return (
    <footer className="shrink-0 px-3 pb-3 pt-1">
      {/* Note and three numeric inputs */}
      <div
        id="purchase-footer-fields"
        className="grid w-full min-w-[859px] grid-cols-[14px_38px_158px_minmax(120px,1fr)_56px_58px_85px_90px_80px_80px_80px] items-center pt-2"
      >
        {/* Note */}
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
            className="h-[26px] min-w-0 flex-1 rounded-[3px] border border-[#d5dce5] bg-white px-2 text-[14px] text-[#263449] outline-none focus:border-blue-400"
          />
        </div>

        {/* Total: label in Unit column, input aligned with Qty */}
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
            defaultValue="0.000"
            readOnly
            aria-label="Total"
            className="h-[39px] w-full min-w-0 rounded-[2px] border border-[#d5dce5] bg-white px-1 text-right text-[11px] text-[#263449] outline-none"
          />
        </div>

        {/* Supplier Total: aligned with S.Total Price */}
        <div
          id="purchase-supplier-total-group"
          className="col-[8/9] min-w-0 px-[1px]"
        >
          <input
            id="purchaseSupplierTotal"
            type="text"
            defaultValue="0.0000"
            readOnly
            aria-label="Supplier total price"
            className="h-[30px] w-full min-w-0 rounded-[2px] border border-[#d5dce5] bg-white px-1 text-right text-[11px] text-[#263449] outline-none"
          />
        </div>

        {/* Final Total: aligned with Total Cost */}
        <div
          id="purchase-final-total-group"
          className="col-[11/12] min-w-0 px-[1px]"
        >
          <input
            id="purchaseFinalTotal"
            type="text"
            defaultValue="0.0000"
            readOnly
            aria-label="Final total"
            className="h-[30px] w-full min-w-0 rounded-[2px] border border-[#d5dce5] bg-white px-1 text-right text-[11px] text-[#263449] outline-none"
          />
        </div>
      </div>

      {/* Action buttons */}
      <div
        id="purchase-footer-actions"
        className="mt-[9px] mb-[5px] flex flex-wrap justify-center gap-[12px]"
      >
        {buttons.map((button) => (
          <button
            key={button}
            id={`btn${button}`}
            type="button"
            className="btn-style"
          >
            <span className="underline decoration-green-600 decoration-[1px] underline-offset-2">
              {button.charAt(0)}
            </span>
            {button.slice(1)}
          </button>
        ))}
      </div>
    </footer>
  );
};

export default PurchaseFooter;