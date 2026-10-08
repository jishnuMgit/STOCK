import React from "react";

import SalesInvoiceHeader from "../../../components/Transaction/SalesInvoice/SalesInvoiceHeader";
import SalesInvoiceTable from "../../../components/Transaction/SalesInvoice/SalesInvoiceTable";
import SalesInvoiceFooter from "../../../components/Transaction/SalesInvoice/SalesInvoiceFooter";

const SalesInvoice: React.FC = () => {
  return (
    <div className="flex h-full  w-full justify-center overflow-hidden bg-gray-100 ">
  <main className="h-fit border border-gray-400 w-full min-w-300 max-w-300 overflow-hidden mt-5 bg-white text-[#202020]">
    <div className="flex h-full w-full flex-col mb-2">

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