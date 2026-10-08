import React from "react";

import type {
  StockRow,
} from "../../../pages/Sales/Setup/ItemEnquiryPage";

// ============================================================
// PROPS
// ============================================================

interface ItemEnquiryTableProps {
  rows: StockRow[];

  selectedRow: number;

  setSelectedRow: React.Dispatch<
    React.SetStateAction<number>
  >;

  updateRow: <K extends keyof StockRow>(
    index: number,
    field: K,
    value: StockRow[K],
  ) => void;
}

// ============================================================
// COMPONENT
// ============================================================

const ItemEnquiryTable: React.FC<
  ItemEnquiryTableProps
> = ({
  rows,
  selectedRow,
  setSelectedRow,
  updateRow,
}) => {
  // ==========================================================
  // FOCUS CELL
  // ==========================================================

  const focusCell = (
    rowIndex: number,
    field: string,
  ) => {
    requestAnimationFrame(() => {
      const input = document.getElementById(
        `itemEnquiry-${field}-${rowIndex}`,
      ) as HTMLInputElement | null;

      if (input) {
        input.focus();

        const length = input.value.length;

        input.setSelectionRange(
          length,
          length,
        );
      }

      setSelectedRow(rowIndex);
    });
  };

  // ==========================================================
  // KEYBOARD NAVIGATION
  // ==========================================================

  const handleCellKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>,
    rowIndex: number,
    fieldIndex: number,
  ) => {
    if (event.key === "Enter") {
      event.preventDefault();

      // Move to next cell in the same row
      if (fieldIndex < 4) {
        const fields = [
          "branch",
          "stock",
          "prevUnitCost",
          "unitCost",
          "salesPrice",
        ];

        focusCell(
          rowIndex,
          fields[fieldIndex + 1],
        );

        return;
      }

      // Last cell -> next row
      if (rowIndex < rows.length - 1) {
        focusCell(
          rowIndex + 1,
          "branch",
        );

        return;
      }
    }

    // ========================================================
    // ARROW DOWN
    // ========================================================

    if (event.key === "ArrowDown") {
      event.preventDefault();

      if (rowIndex < rows.length - 1) {
        focusCell(
          rowIndex + 1,
          getFieldName(fieldIndex),
        );
      }

      return;
    }

    // ========================================================
    // ARROW UP
    // ========================================================

    if (event.key === "ArrowUp") {
      event.preventDefault();

      if (rowIndex > 0) {
        focusCell(
          rowIndex - 1,
          getFieldName(fieldIndex),
        );
      }

      return;
    }
  };

  // ==========================================================
  // FIELD NAME
  // ==========================================================

  const getFieldName = (
    fieldIndex: number,
  ) => {
    const fields = [
      "branch",
      "stock",
      "prevUnitCost",
      "unitCost",
      "salesPrice",
    ];

    return fields[fieldIndex];
  };

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div
      className="
        mx-[24px]
        mt-[2px]
        
        h-[277px]
        overflow-hidden
        border
        border-[#dce5ef]
      "
    >
      {/* ======================================================
          SCROLL
      ====================================================== */}

      <div
        className="
          h-full
          overflow-y-auto
          overflow-x-hidden
          scrollbar-thin
          scrollbar-thumb-[#9ad9b7]
          scrollbar-track-[#f5faf7]
        "
      >
        <table
          className="
            w-full
            min-w-[700px]
            table-fixed
            border-collapse
            text-[13px]
          "
        >
          {/* ==================================================
              COLUMN WIDTHS
          ================================================== */}

          <colgroup>
            {/* Indicator */}
            <col
              style={{
                width: "2%",
              }}
            />

            {/* Branch */}
            <col
              style={{
                width: "auto",
              }}
            />

            {/* Stock */}
            <col
              style={{
                width: "16%",
              }}
            />

            {/* Previous Unit Cost */}
            <col
              style={{
                width: "16%",
              }}
            />

            {/* Unit Cost */}
            <col
              style={{
                width: "16%",
              }}
            />

            {/* Sales Price */}
            <col
              style={{
                width: "16%",
              }}
            />
          </colgroup>

          {/* ==================================================
              HEADER
          ================================================== */}

          <thead>
            <tr className="h-[39px]">
              {/* Indicator */}

              <th
                className="
                  sticky
                  top-0
                  z-20
                  h-[39px]
                  border
                  border-[#bfe8d0]
                  bg-[#edf9f2]
                  p-0
                "
              />

              {/* Branch */}

              <th
                className="
                  sticky
                  top-0
                  z-20
                  h-[39px]
                  border
                  border-[#bfe8d0]
                  bg-[#edf9f2]
                  px-[12px]
                  py-0
                  text-left
                  align-middle
                  text-[14px]
                  font-normal
                  text-[#374151]
                "
                id="txtBranch"
              >
                Branch
              </th>

              {/* Stock */}

              <th
                className="
                  sticky
                  top-0
                  z-20
                  h-[39px]
                  border
                  border-[#bfe8d0]
                  bg-[#edf9f2]
                  px-[8px]
                  py-0
                  text-center
                  align-middle
                  text-[14px]
                  font-normal
                  text-[#374151]
                "
                id="txtStock"
              >
                Stock
              </th>

              {/* Previous Unit Cost */}

              <th
                className="
                  sticky
                  top-0
                  z-20
                  h-[39px]
                  border
                  border-[#bfe8d0]
                  bg-[#edf9f2]
                  px-[8px]
                  py-0
                  text-center
                  align-middle
                  text-[14px]
                  font-normal
                  text-[#374151]
                "
                id="txtPrevUnitCost"
              >
                Prev. Unit Cost
              </th>

              {/* Unit Cost */}

              <th
                className="
                  sticky
                  top-0
                  z-20
                  h-[39px]
                  border
                  border-[#bfe8d0]
                  bg-[#edf9f2]
                  px-[8px]
                  py-0
                  text-center
                  align-middle
                  text-[14px]
                  font-normal
                  text-[#374151]
                "
                id="txtUnitCost"
              >
                Unit Cost
              </th>

              {/* Sales Price */}

              <th
                className="
                  sticky
                  top-0
                  z-20
                  h-[39px]
                  border
                  border-[#bfe8d0]
                  bg-[#edf9f2]
                  px-[8px]
                  py-0
                  text-center
                  align-middle
                  text-[14px]
                  font-normal
                  text-[#374151]
                "
                id="txtSalesPrice"
              >
                Sales Price
              </th>
            </tr>
          </thead>

          {/* ==================================================
              BODY
          ================================================== */}

          <tbody>
            {rows.map((row, index) => (
              <tr
                key={index}
                className={`
                  h-[39px]
                  outline-none
                  ${
                    selectedRow === index
                      ? "bg-white"
                      : "bg-white"
                  }
                  hover:bg-white
                `}
                onClick={() =>
                  setSelectedRow(index)
                }
              >
                {/* ============================================
                    INDICATOR
                ============================================ */}

                <td
                  className="
                    h-[39px]
                    border
                    border-[#bfe8d0]
                    p-0
                    text-center
                    align-middle
                  "
                >
                  {selectedRow === index && (
                    <span className="text-[9px] text-[#222]">
                      ▶
                    </span>
                  )}
                </td>

                {/* ============================================
                    BRANCH
                ============================================ */}

                <td
                  className="
                    h-[39px]
                    border
                    border-[#bfe8d0]
                    p-0
                    align-middle
                  "
                >
                  <input
                    id={`itemEnquiry-branch-${index}`}
                    type="text"
                    value={String(
                      row.branch ?? "",
                    )}
                    autoComplete="off"
                    onFocus={() =>
                      setSelectedRow(index)
                    }
                    onChange={(event) =>
                      updateRow(
                        index,
                        "branch",
                        event.target.value,
                      )
                    }
                    onKeyDown={(event) =>
                      handleCellKeyDown(
                        event,
                        index,
                        0,
                      )
                    }
                    className="
                      h-[38px]
                      w-full
                      border-0
                      bg-transparent
                      px-[10px]
                      py-0
                      text-[13px]
                      text-[#481111]
                      outline-none
                      focus:bg-[#f1f8ff]
                    "
                  />
                </td>

                {/* ============================================
                    STOCK
                ============================================ */}

                <td
                  className="
                    h-[39px]
                    border
                    border-[#bfe8d0]
                    p-0
                    align-middle
                  "
                >
                  <input
                    id={`itemEnquiry-stock-${index}`}
                    type="text"
                    value={String(
                      row.stock ?? "",
                    )}
                    autoComplete="off"
                    onFocus={() =>
                      setSelectedRow(index)
                    }
                    onChange={(event) =>
                      updateRow(
                        index,
                        "stock",
                        event.target.value,
                      )
                    }
                    onKeyDown={(event) =>
                      handleCellKeyDown(
                        event,
                        index,
                        1,
                      )
                    }
                    className="
                      h-[38px]
                      w-full
                      border-0
                      bg-transparent
                      px-[8px]
                      py-0
                      text-center
                      text-[13px]
                      text-[#481111]
                      outline-none
                      focus:bg-[#f1f8ff]
                    "
                  />
                </td>

                {/* ============================================
                    PREVIOUS UNIT COST
                ============================================ */}

                <td
                  className="
                    h-[39px]
                    border
                    border-[#bfe8d0]
                    p-0
                    align-middle
                  "
                >
                  <input
                    id={`itemEnquiry-prevUnitCost-${index}`}
                    type="text"
                    value={String(
                      row.prevUnitCost ?? "",
                    )}
                    autoComplete="off"
                    onFocus={() =>
                      setSelectedRow(index)
                    }
                    onChange={(event) =>
                      updateRow(
                        index,
                        "prevUnitCost",
                        event.target.value,
                      )
                    }
                    onKeyDown={(event) =>
                      handleCellKeyDown(
                        event,
                        index,
                        2,
                      )
                    }
                    className="
                      h-[38px]
                      w-full
                      border-0
                      bg-transparent
                      px-[8px]
                      py-0
                      text-center
                      text-[13px]
                      text-[#481111]
                      outline-none
                      focus:bg-[#f1f8ff]
                    "
                  />
                </td>

                {/* ============================================
                    UNIT COST
                ============================================ */}

                <td
                  className="
                    h-[39px]
                    border
                    border-[#bfe8d0]
                    p-0
                    align-middle
                  "
                >
                  <input
                    id={`itemEnquiry-unitCost-${index}`}
                    type="text"
                    value={String(
                      row.unitCost ?? "",
                    )}
                    autoComplete="off"
                    onFocus={() =>
                      setSelectedRow(index)
                    }
                    onChange={(event) =>
                      updateRow(
                        index,
                        "unitCost",
                        event.target.value,
                      )
                    }
                    onKeyDown={(event) =>
                      handleCellKeyDown(
                        event,
                        index,
                        3,
                      )
                    }
                    className="
                      h-[38px]
                      w-full
                      border-0
                      bg-transparent
                      px-[8px]
                      py-0
                      text-center
                      text-[13px]
                      text-[#481111]
                      outline-none
                      focus:bg-[#f1f8ff]
                    "
                  />
                </td>

                {/* ============================================
                    SALES PRICE
                ============================================ */}

                <td
                  className="
                    h-[39px]
                    border
                    border-[#bfe8d0]
                    p-0
                    align-middle
                  "
                >
                  <input
                    id={`itemEnquiry-salesPrice-${index}`}
                    type="text"
                    value={String(
                      row.salesPrice ?? "",
                    )}
                    autoComplete="off"
                    onFocus={() =>
                      setSelectedRow(index)
                    }
                    onChange={(event) =>
                      updateRow(
                        index,
                        "salesPrice",
                        event.target.value,
                      )
                    }
                    onKeyDown={(event) =>
                      handleCellKeyDown(
                        event,
                        index,
                        4,
                      )
                    }
                    className="
                      h-[38px]
                      w-full
                      border-0
                      bg-transparent
                      px-[8px]
                      py-0
                      text-center
                      text-[13px]
                      text-[#481111]
                      outline-none
                      focus:bg-[#f1f8ff]
                    "
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ItemEnquiryTable;