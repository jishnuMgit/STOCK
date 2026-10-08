import React from "react";

import BeginningBalanceHeader from "../../../../components/Transaction/BeginningBalance/BeginningBalanceHeader";
import BeginningBalanceTable from "../../../../components/Transaction/BeginningBalance/BeginningBalanceTable";
import BeginningBalanceFooter from "../../../../components/Transaction/BeginningBalance/BeginningBalanceFooter";

const BeginningBalance: React.FC = () => {
  return (
    <div className="flex h-full w-full justify-center overflow-hidden bg-[#eeeeee]">
      <main className="h-fit w-full min-w-[950px] max-w-[1010px] mt-5 overflow-hidden bg-white border border-gray-400 pb-3 text-[#202020]">
        <div className="flex h-full w-full flex-col">
          <BeginningBalanceHeader />

          <BeginningBalanceTable />

          <BeginningBalanceFooter />
        </div>
      </main>
    </div>
  );
};

export default BeginningBalance;