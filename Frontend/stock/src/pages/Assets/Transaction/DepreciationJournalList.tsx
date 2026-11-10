
import React, { useState } from "react";
import Header from "../../../components/common/Header";

type JournalRow = {
  id: number;
  branch: string;
  journalNo: string;
  journalDate: string;
  journalAmount: string;
};

const initialRows: JournalRow[] = [
  {
    id: 1,
    branch: "",
    journalNo: "",
    journalDate: "",
    journalAmount: "",
  },
];

const DepreciationJournalListPage: React.FC = () => {
  const [rows] = useState<JournalRow[]>(initialRows);
  const [selectedRow, setSelectedRow] = useState<number>(1);

  const handlePrint = () => {
    const selected = rows.find((row) => row.id === selectedRow);

    console.log("Print Depreciation Journal:", selected);
  };

  const handlePrintDetailed = (row: JournalRow) => {
    console.log("Print Detailed Journal:", row);
  };

  const handlePrintSummary = (row: JournalRow) => {
    console.log("Print Summary Journal:", row);
  };

  const handleClose = () => {
    window.history.back();
  };

  return (
    <div className="min-h-screen w-full bg-white p-1 sm:p-2">

      <main className="mx-auto flex w-full max-w-[900px] flex-col overflow-hidden rounded-[3px] border border-[#91a7bb] bg-white shadow-sm">

        {/* WINDOW HEADER */}

        <Header Name="Depreciation Journal List" />

        <section className="flex min-h-[460px] flex-1 flex-col px-2 pb-3 pt-1.5">

          {/* JOURNAL TABLE */}

          <div className="flex min-h-[350px] flex-1 flex-col border border-[#cbd3df]">

            <div className="w-full flex-1 overflow-auto">

              <table className="w-full min-w-[750px] table-fixed border-collapse">

                <thead className="sticky top-0 z-10 bg-[#f7f8fa]">

                  <tr className="h-[24px]">

                    {/* ROW INDICATOR */}

                    <th className="w-[16px] border-r border-b border-[#cbd3df]" />

                    <th className="w-[26%] border-r border-b border-[#cbd3df] px-1 text-left text-[12px] font-normal text-[#172b43]">
                      Branch
                    </th>

                    <th className="w-[15%] border-r border-b border-[#cbd3df] px-1 text-left text-[12px] font-normal text-[#172b43]">
                      Journal No.
                    </th>

                    <th className="w-[14%] border-r border-b border-[#cbd3df] px-1 text-left text-[12px] font-normal text-[#172b43]">
                      Journal Date
                    </th>

                    <th className="w-[14%] border-r border-b border-[#cbd3df] px-1 text-right text-[12px] font-normal text-[#172b43]">
                      Journal Amt.
                    </th>

                    <th className="w-[14%] border-r border-b border-[#cbd3df] px-1 text-left text-[12px] font-normal text-[#172b43]">
                      Print Detailed
                    </th>

                    <th className="w-[17%] border-b border-[#cbd3df] px-1 text-left text-[12px] font-normal text-[#172b43]">
                      Print Summary
                    </th>

                  </tr>

                </thead>

                <tbody>

                  {rows.map((row) => (

                    <tr
                      key={row.id}
                      onClick={() => setSelectedRow(row.id)}
                      className="h-[26px] bg-white"
                    >

                      {/* ROW SELECTOR */}

                      <td className="border-r border-b border-[#6686ff] bg-[#f5f6f8] text-center text-[10px]">
                        {selectedRow === row.id ? "▶" : ""}
                      </td>

                      {/* BRANCH */}

                      <td
                        className={`border-r border-b border-[#6686ff] px-1 text-[12px] ${
                          selectedRow === row.id
                            ? "bg-[#ffffff]"
                            : ""
                        }`}
                      >
                        {row.branch}
                      </td>

                      {/* JOURNAL NUMBER */}

                      <td className="border-r border-b border-[#6686ff] bg-[#6b96df] px-1 text-[12px] text-[#172b43]">
                        {row.journalNo}
                      </td>

                      {/* JOURNAL DATE */}

                      <td className="border-r border-b border-[#6686ff] px-1 text-[12px]">
                        {row.journalDate}
                      </td>

                      {/* JOURNAL AMOUNT */}

                      <td className="border-r border-b border-[#6686ff] px-1 text-right text-[12px]">
                        {row.journalAmount}
                      </td>

                      {/* PRINT DETAILED */}

                      <td className="border-r border-b border-[#6686ff] px-1 text-[12px]">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePrintDetailed(row);
                          }}
                          className="w-full cursor-pointer text-left text-[#172b43] hover:text-blue-700"
                        >
                          Detailed
                        </button>
                      </td>

                      {/* PRINT SUMMARY */}

                      <td className="border-b border-[#6686ff] px-1 text-[12px]">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePrintSummary(row);
                          }}
                          className="w-full cursor-pointer text-left text-[#172b43] hover:text-blue-700"
                        >
                          Summary
                        </button>
                      </td>

                    </tr>

                  ))}

                </tbody>

              </table>

            </div>

            {/* TABLE BOTTOM AREA */}

            <div className="h-[34px] shrink-0 border-t border-[#cbd3df] bg-[#eeeeF2]" />

          </div>

          {/* BOTTOM BUTTONS */}

          <div className="mt-3 flex justify-center gap-1">

            <button
              type="button"
              onClick={handlePrint}
              className="w-20 btn-style"
            >
              Print
            </button>

            <button
              type="button"
              onClick={handleClose}
              className="w-20 btn-style"
            >
              Close
            </button>

          </div>

        </section>

      </main>

    </div>
  );
};

export default DepreciationJournalListPage;
