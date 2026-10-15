import React, { useEffect, useState } from "react";
import { type PriceRow, formatMoney, round2 } from "./SalesPriceListShared";

type PriceCellProps = {
  value: number;
  label: string;
  changed: boolean;
  onCommit: (value: number) => void;
};

/** Editable price box: shows 2 decimals, selects on focus, commits on blur / Enter */
const PriceCell: React.FC<PriceCellProps> = ({
  value,
  label,
  changed,
  onCommit,
}) => {
  const [text, setText] = useState(value.toFixed(2));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setText(value.toFixed(2));
  }, [value, focused]);

  return (
    <input
      aria-label={label}
      inputMode="decimal"
      value={text}
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
        if (event.key === "Enter") event.currentTarget.blur();
      }}
      className={`h-7.5 w-full px-2 text-right text-[12px] text-[#24364d] outline-none focus:bg-white focus:ring-1 focus:ring-inset focus:ring-[#91a7b9] ${
        changed ? "bg-[#fff6d6]" : "bg-[#eef8ff]"
      }`}
    />
  );
};

type SalesPriceListTableProps = {
  rows: PriceRow[];
  activeId: string | null;
  onActivateRow: (id: string) => void;
  onPriceChange: (id: string, value: number) => void;
};

const cell = "h-[30px] border border-[#B7ECD0] bg-[#f6f8fa] px-2";

const SalesPriceListTable: React.FC<SalesPriceListTableProps> = ({
  rows,
  activeId,
  onActivateRow,
  onPriceChange,
}) => (
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
        {rows.map((row) => {
          const active = row.id === activeId;
          const changed = row.unitPrice !== row.basePrice;
          return (
            <tr key={row.id} onClick={() => onActivateRow(row.id)}>
              <td className="h-7.5 border border-[#B7ECD0] bg-[#fafbfc] text-center text-[8px] text-[#405066]">
                {active ? "▶" : ""}
              </td>
              <td className={cell}>{row.itemId}</td>
              <td className={`${cell} truncate`} title={row.itemName}>
                {row.itemName}
              </td>
              <td className={cell}>{row.unit}</td>
              <td className={`${cell} text-right`}>
                {formatMoney(row.unitCost, 4)}
              </td>
              <td className="border border-[#B7ECD0] p-0">
                <PriceCell
                  value={row.unitPrice}
                  label={`Unit price for ${row.itemId}`}
                  changed={changed}
                  onCommit={(value) => onPriceChange(row.id, value)}
                />
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
);

export default SalesPriceListTable;