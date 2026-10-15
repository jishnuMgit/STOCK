import React from "react";

type SalesPriceListFooterProps = {
  itemCount: number;
  modifiedCount: number;
  onModify: () => void;
  onFind: () => void;
  onCancel: () => void;
  onClose: () => void;
};

const SalesPriceListFooter: React.FC<SalesPriceListFooterProps> = ({
  itemCount,
  modifiedCount,
  onModify,
  onFind,
  onCancel,
  onClose,
}) => (
  <div>
    {/* Status bar under the grid */}
    <div className="flex items-center justify-between border border-t-0 border-[#cfd7df] bg-[#fafbfc] px-3 py-1.5 text-[12px] text-[#405066]">
      <span>Items : {itemCount}</span>
      {/* <span>Modified : {modifiedCount}</span> */}
    </div>

    {/* Actions */}
    <div className="mt-5 flex justify-center gap-3">
      <button
        id="btnModify"
        type="button"
        onClick={onModify}
        disabled={modifiedCount === 0}
        className="btn-style disabled:cursor-not-allowed disabled:opacity-60"
      >
        <u>M</u>odify
      </button>
      <button id="btnFind" type="button" onClick={onFind} className="btn-style">
        <u>F</u>ind
      </button>
      <button
        id="btnCancel"
        type="button"
        onClick={onCancel}
        className="btn-style"
      >
        <u>C</u>ancel
      </button>
      <button id="btnClose" type="button" onClick={onClose} className="btn-style">
        Cl<u>o</u>se
      </button>
    </div>
  </div>
);

export default SalesPriceListFooter;