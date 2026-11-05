import React from "react";
import type { MatchEnquiryRow } from "../../../hooks/useMatchEnquiry";

interface MatchTableProps {
  rows: MatchEnquiryRow[];
}

const MIN_ROWS = 11;
// the columns of the table: Parent/Child, Br. ID, Date, Document No., Description, Debit, Credit, Match Date
const COLUMNS = 8;
const th = "border border-[#bce8d2] font-semibold px-1 py-1.25";
const td = "border border-[#bce8d2] px-2 text-[13px] text-slate-700";
const fmt = (n: number) => (n ? n.toFixed(2) : "");

const MatchEnquiryTable: React.FC<MatchTableProps> = ({ rows }) => {
  const fillerCount = Math.max(0, MIN_ROWS - rows.length);

  return (
    <div className="mx-6.75 border border-[#bce8d2] max-[900px]:mx-2">
      <table id="tblMatch" className="w-full table-fixed border-collapse">
        <thead className="bg-[#e8f8ef]">
          <tr>
            <th className={`${th} w-[10%] text-left`}>Parent/Child</th>
            <th className={`${th} w-[6%] text-left`}>Br. ID</th>
            <th className={`${th} w-[10%] text-left`}>Date</th>
            <th className={`${th} w-[12%] text-left`}>Document No.</th>
            <th className={`${th} w-auto text-left`}>Description</th>
            <th className={`${th} w-[10%] text-right`}>Debit</th>
            <th className={`${th} w-[10%] text-right`}>Credit</th>
            <th className={`${th} w-[12%] text-left`}>Match Date</th>
          </tr>
        </thead>

        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="h-6.75">
              <td className={td}>{row.pc}</td>
              <td className={td}>{row.brId}</td>
              <td className={td}>{row.date}</td>
              <td className={`${td} truncate`}>{row.docNo}</td>
              <td className={`${td} truncate`} title={row.description}>
                {row.description}
              </td>
              <td className={`${td} text-right`}>{fmt(row.debit)}</td>
              <td className={`${td} text-right`}>{fmt(row.credit)}</td>
              <td className={td}>{row.effectiveDate}</td>
            </tr>
          ))}

          {Array.from({ length: fillerCount }).map((_, i) => (
            <tr key={`filler-${i}`} className="h-6.75">
              {Array.from({ length: COLUMNS }).map((__, c) => (
                <td key={c} className="border border-[#bce8d2]" />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default MatchEnquiryTable;
