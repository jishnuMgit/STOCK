import React, { useEffect, useState } from "react";
import { useGridCellFocus } from "../../../hooks/useGridCellFocus";
import { type PriceRow, formatMoney, round2 } from "./SalesPriceListShared";

type PriceCellProps = {
  index: number;
  value: number;
  label: string;
  changed: boolean;
  locked: boolean;
  onCommit: (value: number) => void;
};

/** Editable price box: shows 2 decimals, selects on focus, commits on blur / Enter
 *  (Enter goes on to the price of the next row). Locked = read only, and Tab skips it. */
const PriceCell: React.FC<PriceCellProps> = ({
  index,
  value,
  label,
  changed,
  locked,
  onCommit,
}) => {
  const [text, setText] = useState(value.toFixed(2));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setText(value.toFixed(2));
  }, [value, focused]);

  return (
    <input
      id={`txtUnitPrice-${index}`}
      name="txtUnitPrice"
      aria-label={label}
      inputMode="decimal"
      value={text}
      readOnly={locked}
      tabIndex={locked ? -1 : 0}
      onFocus={(event) => {
        setFocused(true);
        event.target.select();
      }}
      onChange={(event) => setText(event.target.value)}
      onBlur={() => {
        setFocused(false);
        const parsed = parseFloat(text);
        onCommit(Number.isFinite(parsed) && parsed >= 0 ? round2(parsed) : value);
      }}
      onKeyDown={(event) => {
        if (event.key !== "Enter") return;

        event.preventDefault();
        event.currentTarget.blur();
        document.getElementById(`txtUnitPrice-${index + 1}`)?.focus();
      }}
      className={`h-7.5 w-full px-2 text-right text-[12px] text-[#24364d] outline-none focus:bg-white ${
        locked ? "bg-[#f6f8fa]" : changed ? "bg-[#fff6d6]" : "bg-[#eef8ff]"
      }`}
    />
  );
};

type SalesPriceListTableProps = {
  rows: PriceRow[];
  activeId: string | null;
  // the price column can be typed in only after "Apply to Unit Price" is ticked
  locked: boolean;
  onActivateRow: (lkpItemID: string) => void;
  onPriceChange: (lkpItemID: string, value: number) => void;
};

const cell = "h-[30px] border border-[#B7ECD0] bg-[#f6f8fa] px-2";

const SalesPriceListTable: React.FC<SalesPriceListTableProps> = ({
  rows,
  activeId,
  locked,
  onActivateRow,
  onPriceChange,
}) => {
  // the cell the cursor is in is outlined
  const { cellFocusClass } = useGridCellFocus();

  return (
    <div className="h-105 overflow-auto border border-[#cfd7df] bg-white">
      <table className="w-full table-fixed border-collapse text-[12px] text-[#24364d]">
        <colgroup>
          <col className="w-5.5" />
          <col className="w-47.5" />
          <col />
          <col className="w-20" />
          <col className="w-32.5" />
          <col className="w-37.5" />
        </colgroup>
        <thead className="sticky top-0 z-0">
          <tr className="bg-[#EEFBF4] text-[#405066]">
            <th className="h-7 border border-[#B7ECD0]" />
            <th className="h-7 border border-[#B7ECD0] px-2 text-left font-semibold">
              Item ID
            </th>
            <th className="h-7 border border-[#B7ECD0] px-2 text-left font-semibold">
              Item Name
            </th>
            <th className="h-7 border border-[#B7ECD0] px-2 text-left font-semibold">
              Unit
            </th>
            <th className="h-7 border border-[#B7ECD0] px-2 text-right font-semibold">
              Unit Cost
            </th>
            <th className="h-7 border border-[#B7ECD0] px-2 text-right font-semibold">
              Unit Price
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td
                colSpan={6}
                className="h-15 border border-[#B7ECD0] text-center text-[12px] text-[#7a8794]"
              >
                No items to show
              </td>
            </tr>
          )}
          {rows.map((row, index) => {
            const active = row.lkpItemID === activeId;
            const changed = row.txtUnitPrice !== row.txtOriginalUnitPrice;
            return (
              <tr key={row.lkpItemID} onClick={() => onActivateRow(row.lkpItemID)}>
                <td className="h-7.5 border border-[#B7ECD0] bg-[#fafbfc] text-center text-[8px] text-[#405066]">
                  {active ? "▶" : ""}
                </td>
                <td className={cell}>{row.lkpItemID}</td>
                <td className={`${cell} truncate`} title={row.txtItemName}>
                  {row.txtItemName}
                </td>
                <td className={cell}>{row.txtUnit}</td>
                <td className={`${cell} text-right`}>
                  {formatMoney(row.txtUnitCost, 4)}
                </td>
                <td className={`border border-[#B7ECD0] p-0 ${cellFocusClass}`}>
                  <PriceCell
                    index={index}
                    value={row.txtUnitPrice}
                    label={`Unit price for ${row.lkpItemID}`}
                    changed={changed}
                    locked={locked}
                    onCommit={(value) => onPriceChange(row.lkpItemID, value)}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default SalesPriceListTable;
