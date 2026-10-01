
import React from "react";

const PurchaseForm: React.FC = () => {
  const fieldClass =
    "grid min-w-0 grid-cols-[58px_minmax(0,1fr)] items-center gap-1";

  const inputClass =
    "h-[27px] w-full min-w-0 rounded-[4px] border border-slate-300 bg-white px-2 text-[11px] outline-none focus:border-blue-400";

  const labelClass = "whitespace-nowrap text-[11px]";

  const fields = [
    { label: "Branch", value: "OFFICE", id: "(lkpBranch)", type: "select" },
    { label: "Entry No.", value: "029", id: "(txtDocNo)" },
    { label: "Invoice Type", value: "C", id: "(lkpInvoiceType)", type: "select" },
    { label: "Date", value: "29/06/2026", id: "(dtpDate)" },
    { label: "P.O. No.", value: "", id: "(txtPONo)" },
    { label: "Supplier", value: "11010011", id: "(lkpSupplierID)", type: "select" },
    { label: "Supplier Name", value: "", id: "(lkpSupplierName)", type: "select", wide: true },
    { label: "Misc. Sup.", value: "No", id: "(lkpMiscSup)", type: "select" },
    { label: "Misc. Sup.", value: "", id: "(lkpMiscSupID)", type: "select" },
    { label: "Misc. Sup. Name", value: "", id: "(lkpMiscSupName)", type: "select", wide: true },
    { label: "Currency", value: "SAR", id: "(lkpCurrency)", type: "select" },
    { label: "Currency Rate", value: "3.00000", id: "(txtCurrencyRate)" },
    { label: "Sup. Invoice No.", value: "", id: "(txtSupInvoiceNo)" },
    { label: "Sup. Invoice Date", value: "", id: "(dtpSupInvoiceDate)" },
  ];

  return (
    <section className="grid shrink-0 grid-cols-1 gap-x-3 gap-y-1 px-3 py-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4">
      {fields.map((field) => (
        <div
          key={field.id}
          className={`${field.wide ? "lg:col-span-2" : ""} flex min-w-0 flex-col`}
        >
          <div className={fieldClass}>
            <label className={labelClass}>{field.label}</label>

            {field.type === "select" ? (
              <select
                defaultValue={field.value}
                className={`${inputClass} cursor-pointer`}
              >
                {field.value ? (
                  <option value={field.value}>{field.value}</option>
                ) : (
                  <option value=""></option>
                )}
              </select>
            ) : (
              <input
                defaultValue={field.value}
                className={`${inputClass} ${
                  field.id === "(txtCurrencyRate)" ? "text-right" : ""
                }`}
              />
            )}
          </div>

          <span className="min-h-[12px] text-right text-[10px] leading-3 text-slate-600">
            {field.id}
          </span>
        </div>
      ))}

      {/* Action buttons */}
      <div className="flex flex-wrap items-center gap-2 lg:col-span-2">
        <button
          type="button"
          className="h-[27px] rounded border border-slate-300 bg-slate-100 px-3 text-[11px] hover:bg-slate-200"
        >
          Purchase Expense
        </button>

        <button
          type="button"
          className="h-[27px] rounded border border-slate-300 bg-slate-100 px-3 text-[11px] hover:bg-slate-200"
        >
          Calculate Unit Cost
        </button>
      </div>

      <div className={fieldClass}>
        <label className={labelClass}>Sup. Amount</label>
        <input
          defaultValue="0.00"
          className={`${inputClass} text-right`}
        />
      </div>
    </section>
  );
};

export default PurchaseForm;