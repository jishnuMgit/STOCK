import { Play, X } from "lucide-react";
import React, { useState } from "react";
import type { InvoiceRow } from "../../../../hooks/useInvoice";
import { useConfirmModal } from "../../../../hooks/useConfirmModal";

/* Sl No is the row number; VAT Amt and Incl. VAT are calculated */
const columns = [
  { name: "Sl No", width: "48px", id: "txtSlNo" },
  { name: "Description", width: "auto", id: "txtDescription" },
  { name: "Inv. Amt. Excl. VAT", width: "120px", id: "txtAmtExcl" },
  { name: "VAT %", width: "70px", id: "txtVatPercent" },
  { name: "VAT Amt.", width: "110px", id: "txtVatAmt" },
  { name: "Inv. Amt. Incl. VAT", width: "120px", id: "txtAmtIncl" },
];

const numericColumns = [
  "Inv. Amt. Excl. VAT",
  "VAT %",
  "VAT Amt.",
  "Inv. Amt. Incl. VAT",
];

type AmountField = "amountExclVat" | "vatPercent" | "vatAmt" | "amountInclVat";

const numberInputClass =
  "number-no-spinner h-[20px] w-full min-w-0 border-0 bg-transparent px-1 text-right outline-none focus:bg-blue-50";

/* cell that holds an input: outlined while the cursor is inside it */
const editCellClass =
  "h-[30px] border border-[#dce5ef] p-0 focus-within:outline-2 focus-within:-outline-offset-2 focus-within:outline-green-600";

interface Props {
  rows: InvoiceRow[];
  onRowChange: (index: number, patch: Partial<InvoiceRow>) => void;
  onRowDelete: (index: number) => void;
  /* called when a line is finished, so the page can add a blank row */
  onRowEntered?: (index: number) => void;
  disabled?: boolean;
}

const InvoiceTable: React.FC<Props> = ({
  rows,
  onRowChange,
  onRowDelete,
  onRowEntered,
  disabled = false,
}) => {
  const [activeRow, setActiveRow] = useState(0);
  const { confirm, dialog } = useConfirmModal();

  // Format money to two decimal places when leaving the field.
  const formatAmount = (value: string): string => {
    if (value.trim() === "") return "";
    const number = Number(value);
    return Number.isFinite(number) ? number.toFixed(2) : "";
  };

  const isEntered = (r: InvoiceRow) =>
    r.description.trim() !== "" || r.amountExclVat.trim() !== "";

  const hasContent = (index: number) => isEntered(rows[index]);

  // Ask first, then remove the line and put the cursor back on its description.
  const handleDeleteClick = async (index: number) => {
    const ok = await confirm({
      title: "Invoice",
      message: `Do you want to delete Line ${index + 1} ?`,
    });
    if (!ok) return;

    onRowDelete(index);
    document.getElementById(`txtDescription-${index}`)?.focus();
  };

  // Enter on the last field of a line: make sure a next row exists, then go to it.
  const goToNextRow = (index: number) => {
    onRowEntered?.(index);
    setTimeout(
      () => document.getElementById(`txtDescription-${index + 1}`)?.focus(),
      0,
    );
  };

  // Excl. VAT and VAT % are typed; the other two columns are calculated.
  const renderAmountInput = (
    index: number,
    field: AmountField,
    id: string,
    label: string,
    editable = false,
    onEnter?: () => void,
  ) => (
    <input
      id={`${id}-${index}`}
      aria-label={`${label}, row ${index + 1}`}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      readOnly={!editable}
      tabIndex={editable ? 0 : -1}
      value={rows[index][field]}
      onFocus={(event) => {
        setActiveRow(index);
        if (editable) event.currentTarget.select();
      }}
      onChange={(event) => {
        const value = event.target.value;

        // Allow a decimal point while the user is typing.
        if (editable && (value === "" || /^\d*\.?\d{0,2}$/.test(value))) {
          onRowChange(index, { [field]: value });
        }
      }}
      onBlur={() => {
        if (editable) {
          onRowChange(index, { [field]: formatAmount(rows[index][field]) });
        }
      }}
      onKeyDown={(event) => {
        if (editable && event.key === "Enter") {
          event.preventDefault();
          onEnter?.();
        }
      }}
      className={`${numberInputClass} ${editable ? "" : "bg-slate-100"}`}
    />
  );

  return (
    <>
      <section
        id="invoice-table"
        className="mx-3 mb-1 flex min-h-0 max-h-[393px] flex-1 flex-col overflow-hidden border border-b-0 border-[#dce5ef]"
      >
        <div className="customer-table-scroll min-h-0 max-h-fit flex-1 overflow-auto">
          <table className="w-full min-w-[928px] table-fixed border-collapse text-[11px]">
            <colgroup>
              {/* Dynamic row indicator */}
              <col style={{ width: "14px" }} />

              {columns.map((column) => (
                <col
                  key={column.name}
                  style={{ width: column.width }}
                  id={column.id}
                />
              ))}

              {/* Delete button */}
              <col style={{ width: "28px" }} />
            </colgroup>

            <thead>
              <tr className="h-[30px]">
                <th className="sticky top-0 z-20 border border-[#dce5ef] bg-[#f1f6fc] p-0" />

                {columns.map((column) => (
                  <th
                    key={column.name}
                    className={`sticky top-0 z-20 h-[30px] border border-[#dce5ef] bg-[#f1f6fc] px-1 py-0 align-middle font-semibold leading-[13px] text-[#202a36] ${
                      numericColumns.includes(column.name)
                        ? "text-right"
                        : "text-left"
                    }`}
                  >
                    {column.name}
                  </th>
                ))}

                <th className="sticky top-0 z-20 border border-[#dce5ef] bg-[#f1f6fc] p-0" />
              </tr>
            </thead>

            <tbody>
              {rows.map((row, index) => (
                <tr
                  key={index}
                  onClick={() => setActiveRow(index)}
                  onFocusCapture={() => setActiveRow(index)}
                  className={`h-[30px] ${
                    activeRow === index ? "bg-[#f4f8fd]" : "bg-white"
                  } hover:bg-blue-50`}
                >
                  {/* Active row indicator */}
                  <td
                    className="h-[30px] border border-[#dce5ef] p-0 text-center text-[9px] text-[#263449]"
                    aria-label={activeRow === index ? "Active row" : undefined}
                  >
                    {activeRow === index ? <Play size={10} /> : ""}
                  </td>

                  {/* Sl No */}
                  <td className="h-[30px] border border-[#dce5ef] p-0 text-center">
                    {index + 1}
                  </td>

                  {/* Description. Enter -> Excl. VAT, Shift+Enter -> new line */}
                  <td className={editCellClass}>
                    <textarea
                      id={`txtDescription-${index}`}
                      aria-label={`Description row ${index + 1}`}
                      rows={1}
                      value={row.description}
                      readOnly={disabled}
                      onFocus={() => setActiveRow(index)}
                      onChange={(event) =>
                        onRowChange(index, { description: event.target.value })
                      }
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && !event.shiftKey) {
                          event.preventDefault();
                          document
                            .getElementById(`txtAmtExcl-${index}`)
                            ?.focus();
                        }
                      }}
                      className="block h-[28px] w-full min-w-0 resize-none border-0 bg-transparent px-1 py-[6px] leading-4 outline-none focus:bg-blue-50"
                    />
                  </td>

                  {/* Inv. Amt. Excl. VAT (editable) */}
                  <td className={editCellClass}>
                    {renderAmountInput(
                      index,
                      "amountExclVat",
                      "txtAmtExcl",
                      "Amount excluding VAT",
                      !disabled,
                      () =>
                        document
                          .getElementById(`txtVatPercent-${index}`)
                          ?.focus(),
                    )}
                  </td>

                  {/* VAT % (editable). Enter -> next line */}
                  <td className={editCellClass}>
                    {renderAmountInput(
                      index,
                      "vatPercent",
                      "txtVatPercent",
                      "VAT percent",
                      !disabled,
                      () => goToNextRow(index),
                    )}
                  </td>

                  {/* VAT Amt. (calculated) */}
                  <td className={editCellClass}>
                    {renderAmountInput(
                      index,
                      "vatAmt",
                      "txtVatAmt",
                      "VAT amount",
                    )}
                  </td>

                  {/* Inv. Amt. Incl. VAT (calculated) */}
                  <td className={editCellClass}>
                    {renderAmountInput(
                      index,
                      "amountInclVat",
                      "txtAmtIncl",
                      "Amount including VAT",
                    )}
                  </td>

                  {/* Delete: only for lines that have content */}
                  <td className="h-[30px] border border-[#dce5ef] p-0 text-center">
                    {hasContent(index) && !disabled && (
                      <button
                        type="button"
                        tabIndex={-1}
                        aria-label={`Delete line, row ${index + 1}`}
                        title="Delete line"
                        onClick={() => handleDeleteClick(index)}
                        className="inline-flex h-[20px] w-[20px] cursor-pointer items-center justify-center rounded-sm text-slate-500 hover:bg-red-100 hover:text-red-600"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {dialog}
    </>
  );
};

export default InvoiceTable;
