
import React from "react";
import PurchaseForm from "../../../components/Transaction/PurchaseInvoice/PurchaseForm";
import PurchaseTable from "../../../components/Transaction/PurchaseInvoice/PurchaseTable";
import PurchaseFooter from "../../../components/Transaction/PurchaseInvoice/PurchaseFooter";

const PurchaseInvoicePage: React.FC = () => {
  return (
    <main className="flex h-fit w-full max-w-[1100px]   border border-slate-400 mx-auto flex-col overflow-hidden bg-white text-[12px] text-slate-800">
      {/* Page title */}
      <div className="flex h-[30px] w-full shrink-0 items-center border-b border-slate-300 bg-[#a5e0c3]">
        <h1 className="ml-[15px] text-[17px] font-semibold text-slate-700">
         PurchaseInvoice
        </h1>
      </div>

      {/* Purchase details */}
      <PurchaseForm />

      {/* Item table */}
      <PurchaseTable />

      {/* Note, totals and actions */}
      <PurchaseFooter />
    </main>
  );
};

export default PurchaseInvoicePage;