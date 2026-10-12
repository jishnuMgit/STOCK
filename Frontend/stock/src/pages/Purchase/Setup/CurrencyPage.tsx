import  { Play } from "lucide-react";
import React, { useState } from "react";

type CurrencyRow = {
  key: number;
  currency: string;
};

const MIN_ROWS = 9;

/* Replace with data from your API */
const initialData = ["AED", "RMB", "SAR", "USD"];

let keyCounter = 0;
const nextKey = () => ++keyCounter;

const emptyRow = (): CurrencyRow => ({ key: nextKey(), currency: "" });

/** keeps at least one empty row at the end and at least MIN_ROWS rows in total */
const padRows = (rows: CurrencyRow[]): CurrencyRow[] => {
  const result = [...rows];
  if (result.length === 0 || result[result.length - 1].currency !== "") {
    result.push(emptyRow());
  }
  while (result.length < MIN_ROWS) result.push(emptyRow());
  return result;
};

const buildInitialRows = (): CurrencyRow[] =>
  padRows(initialData.map((currency) => ({ key: nextKey(), currency })));

type CurrencyPageProps = {
  onClose?: () => void;
};

const CurrencyPage: React.FC<CurrencyPageProps> = ({ onClose }) => {
  const [rows, setRows] = useState<CurrencyRow[]>(buildInitialRows);
  const [selectedKey, setSelectedKey] = useState<number | null>(
    () => rows[0]?.key ?? null,
  );
  const [showFind, setShowFind] = useState(false);
  const [query, setQuery] = useState("");

  const updateCell = (key: number, value: string) => {
    setRows((prev) =>
      padRows(
        prev.map((row) =>
          row.key === key ? { ...row, currency: value.toUpperCase() } : row,
        ),
      ),
    );
  };

  const handleSave = () => {
    const data = rows
      .filter((row) => row.currency.trim() !== "")
      .map((row) => row.currency.trim());
    console.log(data);
  };

  const handleFind = () => {
    setShowFind((prev) => !prev);
    setQuery("");
  };

  const handleClose = () => {
    setShowFind(false);
    setQuery("");
    onClose?.();
  };

  const search = query.trim().toLowerCase();
  const visibleRows = search
    ? rows.filter((row) => row.currency.toLowerCase().includes(search))
    : rows;

  return (
    <div className="flex min-h-full w-full items-center justify-center bg-white px-4 py-4">
      <div className="min-h-fit w-100 max-w-full bg-white p-0">
        <main className="w-full overflow-hidden border border-gray-400 bg-white">
          <header className="flex h-7.5 items-center justify-start bg-[#9fdfbc]">
            <h1 className="m-0 ml-3.5 text-[17px] font-semibold text-[#24364d]">
              Currency
            </h1>
          </header>

          <section className="px-3.5 pb-6 pt-3">
            

            {/* Grid */}
            <div className="h-78 overflow-auto border border-[#cfd7df] bg-white">
              <table className="w-full table-fixed border-collapse text-[12px] text-[#24364d]">
                <colgroup>
                  <col className="w-5.5" />
                  <col />
                </colgroup>
                <thead className="sticky top-0 z-10">
                  <tr className="bg-[#fafbfc] text-[#405066]">
                    <th className="h-7.5 border border-[#BFE8D0]" />
                    <th className="h-7.5 border border-[#BFE8D0] bg-[#EDF9F2] px-2 text-left font-semibold">
                      Currency
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map((row) => {
                    const selected = row.key === selectedKey;
                    return (
                      <tr
                        key={row.key}
                        onClick={() => setSelectedKey(row.key)}
                        className={selected ? "bg-[#f2faf5]" : "bg-white"}
                      >
                        <td className="h-[30px] border border-[#BFE8D0] bg-[#fafbfc] text-center text-[8px] text-[#405066]">
                          {selected ? <Play size={10}/> : ""}
                        </td>
                        <td
                          className={`border border-[#BFE8D0] p-0 ${selected ? "" : ""}`}
                        >
                          <input
                            aria-label="Currency"
                            value={row.currency}
                            onFocus={() => setSelectedKey(row.key)}
                            onChange={(event) =>
                              updateCell(row.key, event.target.value)
                            }
                            className="h-[30px] w-full bg-transparent  px-2 text-[14px] text-[#24364d] outline-none "
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Actions */}
            <div className="mt-5 flex justify-center gap-3">
              <button
                id="btnSave"
                type="button"
                onClick={handleSave}
                className="btn-style"
              >
                <u>S</u>ave
              </button>
              <button
                id="btnFind"
                type="button"
                onClick={handleFind}
                className="btn-style"
              >
                <u>F</u>ind
              </button>
              <button
                id="btnClose"
                type="button"
                onClick={handleClose}
                className="btn-style"
              >
                <u>C</u>lose
              </button>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};

export default CurrencyPage;