import React from "react";
import type { MatchReversalRow } from "../../../hooks/useMatchReversal";
import type { TableField } from "./types";

interface MatchTableProps {
  rows: MatchReversalRow[];
  toggleSelect: (rowIndex: number, value: boolean) => void;
  tableRefs: React.MutableRefObject<Record<string, HTMLElement | null>>;
  handleTableKeyDown: (
    event: React.KeyboardEvent,
    rowIndex: number,
    field: TableField,
  ) => void;
}

const MIN_ROWS = 11;
const th = "border border-[#bce8d2] font-semibold px-1 py-1.25";
const td = "border border-[#bce8d2] px-2 text-[13px] text-slate-700";
const fmt = (n: number) => (n ? n.toFixed(2) : "");

const MatchTable: React.FC<MatchTableProps> = ({
  rows,
  toggleSelect,
  tableRefs,
  handleTableKeyDown,
}) => {
  const fillerCount = Math.max(0, MIN_ROWS - rows.length);

  return (
    <div className="mx-6.75 border border-[#bce8d2] max-[900px]:mx-2">
      <table id="tblMatch" className="w-full table-fixed border-collapse">
        <thead className="bg-[#e8f8ef]">
          <tr>
            <th className={`${th} w-[8%] text-center`}>Un-Match</th>
            <th className={`${th} w-[7%] text-left`}>Sl. No.</th>
            <th className={`${th} w-[12%] text-left`}>Account ID</th>
            <th className={`${th} w-[10%] text-left`}>Date</th>
            <th className={`${th} w-auto text-left`}>Description</th>
            <th className={`${th} w-[11%] text-right`}>Document Amt.</th>
            <th className={`${th} w-[10%] text-right`}>Debit</th>
            <th className={`${th} w-[10%] text-right`}>Credit</th>
          </tr>
        </thead>

        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={row.id} className="h-6.75">
              <td className="border border-[#bce8d2] p-0 text-center">
                <input
                  type="checkbox"
                  ref={(el) => {
                    tableRefs.current[`${rowIndex}-select`] = el;
                  }}
                  checked={row.select}
                  onChange={(e) => toggleSelect(rowIndex, e.target.checked)}
                  onKeyDown={(e) =>
                    handleTableKeyDown(e, rowIndex, "select" as TableField)
                  }
                  className="h-3.75 w-3.75 accent-[#72c99a]"
                />
              </td>
              <td className={td}>
                {row.slNo}
                {row.slNoSub ? `.${row.slNoSub}` : ""}
              </td>
              <td className={`${td} truncate`}>{row.csAccountId}</td>
              <td className={td}>{row.date}</td>
              <td className={`${td} truncate`} title={row.description}>
                {row.description}
              </td>
              <td className={`${td} text-right`}>{fmt(row.docAmount)}</td>
              <td className={`${td} text-right`}>{fmt(row.debit)}</td>
              <td className={`${td} text-right`}>{fmt(row.credit)}</td>
            </tr>
          ))}

          {Array.from({ length: fillerCount }).map((_, i) => (
            <tr key={`filler-${i}`} className="h-6.75">
              {Array.from({ length: 8 }).map((__, c) => (
                <td key={c} className="border border-[#bce8d2]" />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default MatchTable;
