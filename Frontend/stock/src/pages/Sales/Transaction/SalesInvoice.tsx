import React from "react";

import SalesInvoiceHeader from "../../../components/Transaction/SalesInvoice/SalesInvoiceHeader";
import SalesInvoiceTable from "../../../components/Transaction/SalesInvoice/SalesInvoiceTable";
import SalesInvoiceFooter from "../../../components/Transaction/SalesInvoice/SalesInvoiceFooter";

const SalesInvoice: React.FC = () => {
  return (
    <div className="flex h-screen  w-full justify-center overflow-hidden bg-gray-100">
  <main className="h-fit border border-gray-400 w-full min-w-[1000px] max-w-[1200px] overflow-hidden bg-white text-[#202020]">
    <div className="flex h-full w-full flex-col">

      {/* Header */}
      <SalesInvoiceHeader />

      {/* Table */}
      <SalesInvoiceTable />

      {/* Footer */}
      <SalesInvoiceFooter />

    </div>
  </main>
</div>
   
  );
};

export default SalesInvoice;