
import React from "react";

const PurchaseTable: React.FC = () => {
  const columns = [
    { name: "Sl.No.", width: "38px" },
    { name: "Item ID", width: "158px" },
    { name: "Item Name", width: "auto" },
    { name: "Unit", width: "56px" },
    { name: "Qty", width: "58px" },
    { name: "S.Unit Price", width: "69px" },
    { name: "S.Total Price", width: "76px" },
    { name: "Unit Price", width: "60px" },
    { name: "Unit Cost", width: "71px" },
    { name: "Total Cost", width: "70px" },
  ];

  return (
    <section className="mx-3 mb-1 min-h-0 flex-1 overflow-auto border border-slate-200">
      <table className="h-full w-full min-w-[850px] table-fixed border-collapse text-[11px]">
        <colgroup>
          <col style={{ width: "14px" }} />
          {columns.map((column) => (
            <col key={column.name} style={{ width: column.width }} />
          ))}
        </colgroup>

        <thead className="sticky top-0 z-10 bg-slate-100">
          <tr className="h-[25px]">
            <th className="border border-slate-200"></th>

            {columns.map((column) => (
              <th
                key={column.name}
                className="border border-slate-200 px-1 text-left font-semibold whitespace-nowrap"
              >
                {column.name}

                {column.name === "Item ID" && (
                  <div className="font-normal">(lkpItemID)</div>
                )}

                {column.name === "Item Name" && (
                  <div className="font-normal">(lkpItemName)</div>
                )}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {Array.from({ length: 14 }, (_, index) => (
            <tr key={index} className="h-[24px]">
              <td className="border border-slate-200 text-center">
                {index === 0 ? "▸" : ""}
              </td>

              {columns.map((column) => (
                <td
                  key={column.name}
                  className="border border-slate-200 p-0"
                >
                  {index === 0 && column.name === "Item ID" && (
                    <select
                      aria-label="Item ID"
                      className="h-[22px] w-full bg-white outline-none"
                      defaultValue=""
                    >
                      <option value=""></option>
                    </select>
                  )}

                  {index === 0 && column.name === "Item Name" && (
                    <select
                      aria-label="Item Name"
                      className="h-[22px] w-full bg-white outline-none"
                      defaultValue=""
                    >
                      <option value=""></option>
                    </select>
                  )}

                  {index === 0 &&
                    ["Unit", "Qty", "S.Unit Price", "S.Total Price",
                      "Unit Price", "Unit Cost", "Total Cost"].includes(
                        column.name
                      ) && (
                      <input
                        aria-label={column.name}
                        type="text"
                        className="h-[22px] w-full min-w-0 bg-transparent px-1 outline-none focus:bg-blue-50"
                      />
                    )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
};

export default PurchaseTable;