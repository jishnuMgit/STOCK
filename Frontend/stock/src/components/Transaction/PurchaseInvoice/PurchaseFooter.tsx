
import React from "react";

const PurchaseFooter: React.FC = () => {
  const buttons = ["Save", "Delete", "Print", "Post", "Clear"];

  return (
    <footer className="shrink-0 px-3 pb-3 pt-1">
      {/* Note and totals */}
      <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[minmax(180px,1fr)_110px_110px_110px]">
        <div className="flex min-w-0 items-center gap-3">
          <label htmlFor="purchaseNote">Note</label>
          <input
            id="purchaseNote"
            className="h-[26px] min-w-0 flex-1 border border-slate-300 px-2 outline-none focus:border-blue-400"
          />
        </div>

        <div className="flex items-center gap-2 border border-slate-200 p-1">
          <label className="flex-1">
            Total
            <span className="block text-[10px]">(txtTotal)</span>
          </label>
          <input
            defaultValue="0.000"
            className="h-[23px] w-[58px] min-w-0 border border-slate-200 text-right"
          />
        </div>

        <input
          aria-label="Additional total"
          defaultValue="0.0000"
          className="h-[26px] w-full border border-slate-200 px-1 text-right"
        />

        <input
          aria-label="Final total"
          defaultValue="0.0000"
          className="h-[26px] w-full border border-slate-200 px-1 text-right"
        />
      </div>

      {/* Action buttons */}
      <div className="mt-2 flex flex-wrap justify-center gap-3">
        {buttons.map((button) => (
          <button
            key={button}
            type="button"
            className="h-[39px] w-[104px] rounded border border-slate-300 bg-gradient-to-b from-white to-slate-100 text-[14px] text-green-700 shadow-sm hover:border-blue-400 hover:bg-slate-50 focus:outline-none focus:ring-1 focus:ring-blue-400"
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