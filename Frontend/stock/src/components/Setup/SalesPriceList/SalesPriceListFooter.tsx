import React from "react";

type SalesPriceListFooterProps = {
  itemCount: number;
  // Modify needs the button right, a changed price, and no save under way
  canModify: boolean;
  onModify: () => void;
  onFind: () => void;
  onCancel: () => void;
  onClose: () => void;
};

const SalesPriceListFooter: React.FC<SalesPriceListFooterProps> = ({
  itemCount,
  canModify,
  onModify,
  onFind,
  onCancel,
  onClose,
}) => (
  <div>
    {/* Status bar under the grid */}
    <div className="flex items-center justify-between border border-t-0 border-[#cfd7df] bg-[#fafbfc] px-3 py-1.5 text-[12px] text-[#405066]">
      <span>Items : {itemCount}</span>
    </div>

    {/* Actions */}
    <div className="mt-5 flex justify-center gap-3">
      <button
        id="btnModify"
        name="btnModify"
        type="button"
        onClick={onModify}
        disabled={!canModify}
        title="Alt+M"
        className="btn-style disabled:cursor-not-allowed disabled:opacity-60"
      >
        <u>M</u>odify
      </button>
      <button
        id="btnFind"
        name="btnFind"
        type="button"
        onClick={onFind}
        title="Alt+F"
        className="btn-style"
      >
        <u>F</u>ind
      </button>
      <button
        id="btnCancel"
        name="btnCancel"
        type="button"
        onClick={onCancel}
        title="Alt+C"
        className="btn-style"
      >
        <u>C</u>ancel
      </button>
      <button
        id="btnClose"
        name="btnClose"
        type="button"
        onClick={onClose}
        title="Alt+O"
        className="btn-style"
      >
        Cl<u>o</u>se
      </button>
    </div>
  </div>
);

export default SalesPriceListFooter;
