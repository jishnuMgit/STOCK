
import React from "react";
import PurchaseForm from "../../../components/Transaction/PurchaseInvoice/PurchaseForm";
import PurchaseTable from "../../../components/Transaction/PurchaseInvoice/PurchaseTable";
import PurchaseFooter from "../../../components/Transaction/PurchaseInvoice/PurchaseFooter";

const PurchaseInvoicePage: React.FC = () => {
  return (
    <main className="flex h-screen min-h-[600px] w-full flex-col overflow-hidden bg-white text-[12px] text-slate-800">
      {/* Page title */}
      <header className="flex h-[35px] shrink-0 items-center justify-center border border-emerald-200 bg-emerald-200">
        <h1 className="text-[18px] font-bold text-slate-700">
          Purchase
          <span className="rounded-sm bg-yellow-300 underline decoration-green-600 underline-offset-2">
            I
          </span>
          nvoice
        </h1>
      </header>

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