import React from "react";
import { formatAmount } from "./StockDocumentPostShared";
import ActionButton from "../../common/ActionButton";

type StockDocumentPostFooterProps = {
  selectedCount: number;
  selectedTotal: number;
  onPost: () => void;
  postDisabled?: boolean;
};

const StockDocumentPostFooter: React.FC<StockDocumentPostFooterProps> = ({
  selectedCount,
  selectedTotal,
  onPost,
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
        className="h-7.5 w-[190px] rounded border border-gray-300 bg-white px-2 text-right text-[14px] text-[#344054] outline-none"
      />
    </div>

    {/* Actions */}
    <div className="-mb-3 flex justify-center gap-3">
      <ActionButton
        id="btnPost"
        label="Post"
        underlineIndex={4}
        onClick={onPost}
        disabled={postDisabled}
      />
    </div>
  </div>
);

export default StockDocumentPostFooter;