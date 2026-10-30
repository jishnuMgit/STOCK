import React from "react";
import { useGridCellFocus } from "../../../hooks/useGridCellFocus";
import {type DocRow ,formatAmount } from "./StockDocumentPostShared";


const MIN_ROWS = 16;

type StockDocumentPostTableProps = {
  rows: DocRow[];
  // the Doc. No. of the ticked rows
  selectedIds: Set<string>;
  activeId: string | null;
  onToggleRow: (id: string) => void;
  onActivateRow: (id: string) => void;
};

const cell = "h-[26px] border border-[#B7ECD0] px-2";

const StockDocumentPostTable: React.FC<StockDocumentPostTableProps> = ({
  rows,
  selectedIds,
  activeId,
  onToggleRow,
  onActivateRow,
}) => {
  const emptyCount = Math.max(0, MIN_ROWS - rows.length);

  // the cell the cursor is in gets the green outline (as in the other grids)
  const { cellFocusClass } = useGridCellFocus();

  return (
    <div className="h-111.75 overflow-auto border border-[#cfd7df] bg-white">
      <table className="w-full table-fixed border-collapse border-[#B7ECD0] text-[12px] text-[#24364d]">
        <colgroup>
          <col className="w-5.5" />
          <col className="w-15" />
          <col className="w-50" />
          <col className="w-45]" />
          <col />
          <col className="w-47.5" />
        </colgroup>
        <thead className="sticky top-0 z-0">
          <tr className="bg-[#EEFBF4] text-[#405066]">
            <th className="h-7 border border-[#B7ECD0]" />
            <th className="h-7 border border-[#B7ECD0] px-2 text-left font-semibold">
              Select
            </th>
            <th className="h-7 border border-[#B7ECD0] px-2 text-left font-semibold">
              Doc. No.
            </th>
            <th className="h-7 border border-[#B7ECD0] px-2 text-left font-semibold">
              Date
            </th>
            <th className="h-7 border border-[#B7ECD0] px-2 text-left font-semibold">
              Account ID
            </th>
            <th className="h-7 border border-[#B7ECD0] px-2 text-right font-semibold">
              Doc. Amt.
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const active = row.txtDocNo === activeId;
            const checked = selectedIds.has(row.txtDocNo);
            return (
              <tr
                key={row.txtDocNo}
                onClick={() => onActivateRow(row.txtDocNo)}
                className={
                  checked ? "bg-[#e7f7ed]" : active ? "bg-[#f2faf5]" : "bg-white"
                }
              >
                <td className="h-6.5 border border-[#B7ECD0] bg-[#fafbfc] text-center text-[8px] text-[#405066]">
                  {active ? "▶" : ""}
                </td>
                <td className={`h-6.5 border border-[#B7ECD0] text-center ${cellFocusClass}`}>
                  <input
                    type="checkbox"
                    aria-label={`Select ${row.txtDocNo}`}
                    checked={checked}
                    onChange={() => onToggleRow(row.txtDocNo)}
                    onClick={(event) => event.stopPropagation()}
                    className="h-4 w-4 align-middle accent-[#64d96e]"
                  />
                </td>
                <td className={cell}>{row.txtDocNo}</td>
                <td className={cell}>{row.txtDate}</td>
                <td className={cell}>{row.txtAccountID}</td>
                <td className={`${cell} text-right`}>
                  {formatAmount(row.txtDocAmt)}
                </td>
              </tr>
            );
          })}

          {/* empty filler rows */}
          {Array.from({ length: emptyCount }).map((_, index) => (
            <tr key={`empty-${index}`} className="bg-white">
              <td className="h-6.5 border border-[#B7ECD0] bg-[#fafbfc]" />
              <td className="h-6.5 border border-[#B7ECD0] text-center">
                <input
                  type="checkbox"
                  disabled
                  aria-hidden="true"
                  tabIndex={-1}
                  className="h-4 w-4 align-middle opacity-50"
                />
              </td>
              <td className={cell} />
              <td className={cell} />
              <td className={cell} />
              <td className={cell} />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default StockDocumentPostTable;