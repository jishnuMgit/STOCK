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
  return (
    <div
      className="
        mx-[24px]
        mt-[2px]
        h-[276px]
        overflow-hidden
        border
        border-[#dce5ef]
      "
    >

      {/* ==================================================
          SCROLL
      =================================================== */}

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
            min-w-[820px]
            table-fixed
            border-collapse
            text-[13px]
          "
        >

          {/* ==================================================
              COLUMN WIDTHS
          =================================================== */}

          <colgroup>

            {/* Indicator */}

            <col
              style={{
                width: "22px",
              }}
            />

            {/* Branch */}

            <col
              style={{
                width: "302px",
              }}
            />

            {/* Stock */}

            <col
              style={{
                width: "115px",
              }}
            />

            {/* Previous Unit Cost */}

            <col
              style={{
                width: "137px",
              }}
            />

            {/* Unit Cost */}

            <col
              style={{
                width: "138px",
              }}
            />

            {/* Sales Price */}

            <col
              style={{
                width: "138px",
              }}
            />

          </colgroup>

          {/* ==================================================
              HEADER
          =================================================== */}

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

              {/* Prev Unit Cost */}

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
          =================================================== */}

          <tbody>

            {rows.map((row, index) => (

              <tr
                key={index}
                tabIndex={0}
                onClick={() =>
                  setSelectedRow(index)
                }
                onFocus={() =>
                  setSelectedRow(index)
                }
                className={`
                  h-[39px]
                  outline-none
                  ${
                    selectedRow === index
                      ? "bg-[#f7fbf8]"
                      : "bg-white"
                  }
                  hover:bg-[#f2faf5]
                `}
              >

                {/* ==================================================
                    INDICATOR
                =================================================== */}

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
                    <span
                      className="
                        text-[9px]
                        text-[#222]
                      "
                    >
                      ▶
                    </span>
                  )}
                </td>

                {/* ==================================================
                    BRANCH
                =================================================== */}

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
                  <span className="text-[13px] text-[#481111]">
                    {row.branch}
                  </span>
                </td>

                {/* ==================================================
                    STOCK
                =================================================== */}

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
                  <span className="text-[13px] text-[#481111]">
                    {row.stock}
                  </span>
                </td>

                {/* ==================================================
                    PREVIOUS UNIT COST
                =================================================== */}

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
                  <span className="text-[13px] text-[#481111]">
                    {row.prevUnitCost}
                  </span>
                </td>

                {/* ==================================================
                    UNIT COST
                =================================================== */}

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
                  <span className="text-[13px] text-[#481111]">
                    {row.unitCost}
                  </span>
                </td>

                {/* ==================================================
                    SALES PRICE
                =================================================== */}

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
                  <span className="text-[13px] text-[#481111]">
                    {row.salesPrice}
                  </span>
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