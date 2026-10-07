import React from "react";


import StockAdjustmentHeader from "../../../../components/Transaction/StockAdjustment/StockAdjustmentHeader";
import StockAdjustmentTable from "../../../../components/Transaction/StockAdjustment/StockAdjustmentTable";
import StockAdjustmentAction from "../../../../components/Transaction/StockAdjustment/StockAdjustmentAction";

const StockTransferPage: React.FC = () => {
  return (
    <div className="flex h-screen w-full justify-center overflow-hidden bg-[#F1F5F9]">
      <main className="h-fit w-full min-w-250 max-w-277.5 overflow-hidden bg-white border border-gray-400 text-[#202020]">
        <div className="flex h-fit w-full flex-col">
          <StockAdjustmentHeader />

          <StockAdjustmentTable />

          <StockAdjustmentAction />
        </div>
      </main>
    </div>
  );
};

export default StockTransferPage;