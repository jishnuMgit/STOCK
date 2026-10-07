import React from "react";

import StockTransferHeader from "../../../../components/Transaction/StockTransfer/StockTransferHeader";
import StockTransferTable from "../../../../components/Transaction/StockTransfer/StockTransferTable";
import StockTransferFooter from "../../../../components/Transaction/StockTransfer/StockTransferFooter";

const StockTransfer: React.FC = () => {
  return (
    <div className="flex h-screen w-full justify-center overflow-hidden bg-[#F1F5F9]">
      <main className="h-fit w-full min-w-250 max-w-277.5 overflow-hidden bg-white border border-gray-400 text-[#202020] pb-3 ">
        <div className="flex h-fit w-full flex-col">
          <div
        className="
          flex
          h-[36px]
          items-center
          border-b
          border-slate-300
          bg-[#a3dfc0]
        "
      >
        <span
          className="
            px-6
            text-[17px]
            font-semibold
            text-slate-700
          "
        >
          Stock Transfer
        </span>
      </div>
          <div className=" px-2">
            <StockTransferHeader />
          </div>

          <div className="px-3 mx-auto">
            <StockTransferTable />
          </div>

          <StockTransferFooter />
        </div>
      </main>
    </div>
  );
};

export default StockTransfer;