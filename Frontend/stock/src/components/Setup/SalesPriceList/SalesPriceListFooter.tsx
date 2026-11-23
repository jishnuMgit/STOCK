import React from "react";

import TransactionActions from "../../common/TransactionActions";

type SalesPriceListFooterProps = {
  itemCount: number;
  // Modify needs the button right, a changed price, and no save under way
  canModify: boolean;
  onModify: () => void;
  onFind: () => void;
  onCancel: () => void;
};

const SalesPriceListFooter: React.FC<SalesPriceListFooterProps> = ({
  itemCount,
  canModify,
  onModify,
  onFind,
  onCancel,
}) => (
  <div>
    {/* Status bar under the grid */}
    <div className="flex items-center justify-between border border-t-0 border-[#cfd7df] bg-[#fafbfc] px-3 py-1.5 text-[12px] text-[#405066]">
      <span>Items : {itemCount}</span>
    </div>

    {/* Actions - the same buttons and keys as the Payment screen: Ctrl+S Modify, Ctrl+F Find */}
    <TransactionActions
      className="mt-5 flex flex-wrap items-center justify-center gap-3"
      actions={[
        { id: "btnModify", label: "Modify", underlineIndex: 0, onClick: onModify, disabled: !canModify },
        { id: "btnFind", label: "Find", underlineIndex: 0, onClick: onFind },
        { id: "btnCancel", label: "Cancel", onClick: onCancel },
      ]}
    />
  </div>
);

export default SalesPriceListFooter;
