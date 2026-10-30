import React from "react";
import { formatAmount } from "./StockDocumentPostShared";

type StockDocumentPostFooterProps = {
  selectedCount: number;
  selectedTotal: number;
  onPost: () => void;
  onClose: () => void;
  postDisabled?: boolean;
};

const StockDocumentPostFooter: React.FC<StockDocumentPostFooterProps> = ({
  selectedCount,
  selectedTotal,
  onPost,
  onClose,
  postDisabled = false,
}) => (
  <div>
    {/* Totals bar under the grid */}
    <div className="flex items-center justify-end gap-3  border-t-0 border-[#cfd7df] bg-white  py-1.5">
      
      <input
        id="txtTotal"
        type="text"
        readOnly
        aria-label="Selected total"
        value={selectedCount > 0 ? formatAmount(selectedTotal) : ""}
        className="w-[190px] input-style text-right"
      />
    </div>

    {/* Actions */}
    <div className="mt-0 flex justify-center gap-3">
      <button
        id="btnPost"
        type="button"
        onClick={onPost}
        disabled={postDisabled}
        className="btn-style disabled:cursor-not-allowed disabled:opacity-60"
      >
        <u>P</u>ost
      </button>
      <button
        id="btnClose"
        type="button"
        onClick={onClose}
        className="btn-style"
      >
        <u>C</u>lose
      </button>
    </div>
  </div>
);

export default StockDocumentPostFooter;