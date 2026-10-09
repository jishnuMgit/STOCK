
import React from "react";
import type { ReceiptRow, TableField } from "./types";

interface MatchTableProps {
  rows: ReceiptRow[];

  handleRowChange: (
    rowIndex: number,
    field: keyof ReceiptRow,
    value: string | number | boolean
  ) => void;

  tableRefs: React.MutableRefObject<
    Record<string, HTMLElement | null>
  >;

  handleTableKeyDown: (
    event: React.KeyboardEvent,
    rowIndex: number,
    field: TableField
  ) => void;
}

const MatchTable: React.FC<MatchTableProps> = ({
  rows,
  handleRowChange,
  tableRefs,
  handleTableKeyDown,
}) => {
  const tableInputClass = `
    h-[27px]
    w-full
    border-0
    bg-transparent
    px-2
    text-[13px]
    text-slate-700
    outline-none
    focus:bg-white
    focus:ring-0
  `;

  return (
    <div
      className="
        mx-6.75
        border
        border-[#bce8d2]
        max-[900px]:mx-2
      "
    >
      <table
        id="tblMatch"
        className="w-full table-fixed border-collapse"
      >
        <thead className="bg-[#e8f8ef]">
          <tr>
            <th
              id="txtBrID"
              className="w-[5%] text-left border border-[#bce8d2] font-semibold px-1 py-1.25"
            >
              Br. ID
            </th>

            <th
              id="dtpDate"
              className="w-[10%] text-left border border-[#bce8d2] font-semibold px-1 py-1.25"
            >
              Date
            </th>

            <th
              id="txtDocumentNo"
              className="w-[12%] text-left border border-[#bce8d2] font-semibold px-1 py-1.25"
            >
              Document No.
            </th>

            <th
              id="txtDescription"
              className="w-auto text-left border border-[#bce8d2] font-semibold px-1 py-1.25"
            >
              Description
            </th>

            <th
              id="txtDocumenAmount"
              className="text-right w-[10%] border border-[#bce8d2] font-semibold px-1 py-1.25"
            >
              Document Amt.
            </th>

            <th
              id="txtDebit"
              className="w-[10%] text-right border border-[#bce8d2] font-semibold px-1 py-1.25"
            >
              Debit
            </th>

            <th
              id="txtCredit"
              className="w-[10%] text-right border border-[#bce8d2] font-semibold px-1 py-1.25"
            >
              Credit
            </th>

           
          </tr>
        </thead>

        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={row.id} className="h-6.75">
              {/* BR ID */}
              <td className="border border-[#bce8d2] p-0">
                <input
                  id={rowIndex === 0 ? "txtBrID" : undefined}
                  ref={(element) => {
                    tableRefs.current[`${rowIndex}-brId`] =
                      element;
                  }}
                  className={tableInputClass}
                  value={row.brId}
                  onChange={(event) =>
                    handleRowChange(
                      rowIndex,
                      "brId",
                      event.target.value
                    )
                  }
                  onKeyDown={(event) =>
                    handleTableKeyDown(
                      event,
                      rowIndex,
                      "brId"
                    )
                  }
                />
              </td>

              {/* DATE */}
              <td className="border border-[#bce8d2] p-0">
                <input
                  id={rowIndex === 0 ? "dtpDate" : undefined}
                  ref={(element) => {
                    tableRefs.current[`${rowIndex}-date`] =
                      element;
                  }}
                  className={tableInputClass}
                  value={row.date}
                  onChange={(event) =>
                    handleRowChange(
                      rowIndex,
                      "date",
                      event.target.value
                    )
                  }
                  onKeyDown={(event) =>
                    handleTableKeyDown(
                      event,
                      rowIndex,
                      "date"
                    )
                  }
                />
              </td>

              {/* DOCUMENT NO */}
              <td className="border border-[#bce8d2] p-0">
                <input
                  id={rowIndex === 0 ? "txtDocNo." : undefined}
                  ref={(element) => {
                    tableRefs.current[`${rowIndex}-docNo`] =
                      element;
                  }}
                  className={tableInputClass}
                  value={row.docNo}
                  onChange={(event) =>
                    handleRowChange(
                      rowIndex,
                      "docNo",
                      event.target.value
                    )
                  }
                  onKeyDown={(event) =>
                    handleTableKeyDown(
                      event,
                      rowIndex,
                      "docNo"
                    )
                  }
                />
              </td>

              {/* DESCRIPTION */}
              <td className="border border-[#bce8d2] p-0">
                <input
                  id={
                    rowIndex === 0
                      ? "txtDescription"
                      : undefined
                  }
                  ref={(element) => {
                    tableRefs.current[
                      `${rowIndex}-description`
                    ] = element;
                  }}
                  className={tableInputClass}
                  value={row.description}
                  onChange={(event) =>
                    handleRowChange(
                      rowIndex,
                      "description",
                      event.target.value
                    )
                  }
                  onKeyDown={(event) =>
                    handleTableKeyDown(
                      event,
                      rowIndex,
                      "description"
                    )
                  }
                />
              </td>

              {/* DOCUMENT AMOUNT */}
              <td className="border border-[#bce8d2] p-0">
                <input
                  id={
                    rowIndex === 0
                      ? "txtDocumenAmount"
                      : undefined
                  }
                  type="number"
                  ref={(element) => {
                    tableRefs.current[`${rowIndex}-docAmt`] =
                      element;
                  }}
                  className={`${tableInputClass} text-right`}
                  value={row.docAmount === 0 ? "" : row.docAmount}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  onChange={(event) =>
                    handleRowChange(
                      rowIndex,
                      "docAmount",
                      event.target.value === ""
                        ? 0
                        : Number(event.target.value)
                    )
                  }
                  onKeyDown={(event) =>
                    handleTableKeyDown(
                      event,
                      rowIndex,
                      "docAmount"
                    )
                  }
                />
              </td>

              {/* DEBIT */}
              <td className="border border-[#bce8d2] p-0">
                <input
                  id={rowIndex === 0 ? "txtDebit" : undefined}
                  type="number"
                  ref={(element) => {
                    tableRefs.current[`${rowIndex}-debit`] =
                      element;
                  }}
                  className={`${tableInputClass} text-right`}
                  value={row.debit === 0 ? "" : row.debit}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  onChange={(event) =>
                    handleRowChange(
                      rowIndex,
                      "debit",
                      event.target.value === ""
                        ? 0
                        : Number(event.target.value)
                    )
                  }
                  onKeyDown={(event) =>
                    handleTableKeyDown(
                      event,
                      rowIndex,
                      "debit"
                    )
                  }
                />
              </td>

              {/* CREDIT */}
              <td className="border border-[#bce8d2] p-0">
                <input
                  id={rowIndex === 0 ? "txtCredit" : undefined}
                  type="number"
                  ref={(element) => {
                    tableRefs.current[`${rowIndex}-credit`] =
                      element;
                  }}
                  className={`${tableInputClass} text-right`}
                  value={row.credit === 0 ? "" : row.credit}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  onChange={(event) =>
                    handleRowChange(
                      rowIndex,
                      "credit",
                      event.target.value === ""
                        ? 0
                        : Number(event.target.value)
                    )
                  }
                  onKeyDown={(event) =>
                    handleTableKeyDown(
                      event,
                      rowIndex,
                      "credit"
                    )
                  }
                />
              </td>

              {/* MATCH */}
              {/* <td className="border border-[#bce8d2] p-0 text-center">
                <input
                  id={rowIndex === 0 ? "chkMatch" : undefined}
                  type="checkbox"
                  ref={(element) => {
                    tableRefs.current[`${rowIndex}-match`] =
                      element;
                  }}
                  checked={row.match}
                  onChange={(event) =>
                    handleRowChange(
                      rowIndex,
                      "match",
                      event.target.checked
                    )
                  }
                  onKeyDown={(event) =>
                    handleTableKeyDown(
                      event,
                      rowIndex,
                      "match"
                    )
                  }
                  className="
                    h-3.75
                    w-3.75
                    accent-[#72c99a]
                  "
                />
              </td> */}

              {/* MATCH AMOUNT */}
              {/* <td className="border border-[#bce8d2] p-0">
                <input
                  id={
                    rowIndex === 0
                      ? "txtMatchAmt"
                      : undefined
                  }
                  type="number"
                  ref={(element) => {
                    tableRefs.current[
                      `${rowIndex}-matchAmount`
                    ] = element;
                  }}
                  className={`${tableInputClass} text-right`}
                  value={
                    row.matchAmount === 0
                      ? ""
                      : row.matchAmount
                  }
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  onChange={(event) =>
                    handleRowChange(
                      rowIndex,
                      "matchAmount",
                      event.target.value === ""
                        ? 0
                        : Number(event.target.value)
                    )
                  }
                  onKeyDown={(event) =>
                    handleTableKeyDown(
                      event,
                      rowIndex,
                      "matchAmount"
                    )
                  }
                />
              </td> */}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default MatchTable;
