import React from "react";

import StockTransferHeader from "../../../../components/Transaction/StockTransfer/StockTransferHeader";
import StockTransferTable from "../../../../components/Transaction/StockTransfer/StockTransferTable";
import StockTransferFooter from "../../../../components/Transaction/StockTransfer/StockTransferFooter";

const StockTransfer: React.FC = () => {
  return (
    <div className="flex h-screen w-full justify-center overflow-hidden bg-[#F1F5F9]">
      <main className="h-fit w-full min-w-[1000px] max-w-[1110px] overflow-hidden bg-white border border-gray-400 text-[#202020]">
        <div className="flex h-fit w-full flex-col">
          <StockTransferHeader />

          <StockTransferTable />

          <StockTransferFooter />
        </div>
      </main>
    </div>
  );
};

export default StockTransfer;