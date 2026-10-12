import  { Play } from "lucide-react";
import React, { useState } from "react";

type CountryRow = {
  key: number;
  id: string;
  country: string;
  countryAr: string;
  position: string;
};

const MIN_ROWS = 13;

const initialData: Omit<CountryRow, "key">[] = [
  { id: "SA", country: "SAUDI ARABIA", countryAr: "المملكة العربية السعودية", position: "1" },
  { id: "BH", country: "BAHRAIN", countryAr: "البحرين", position: "2" },
  { id: "IN", country: "INDIA", countryAr: "", position: "3" },
  { id: "US", country: "USA", countryAr: "", position: "4" },
  { id: "EG", country: "EGYPT", countryAr: "", position: "5" },
  { id: "EM", country: "UAE", countryAr: "", position: "6" },
  { id: "KU", country: "KUWAIT", countryAr: "", position: "7" },
  { id: "UK", country: "UNITED KINGDOM", countryAr: "", position: "8" },
  { id: "EP", country: "EUROPIAN GROUP", countryAr: "", position: "9" },
];

let keyCounter = 0;
const nextKey = () => ++keyCounter;

const emptyRow = (): CountryRow => ({
  key: nextKey(),
  id: "",
  country: "",
  countryAr: "",
  position: "",
});

const isEmptyRow = (row: CountryRow) =>
  !row.id && !row.country && !row.countryAr && !row.position;

/** keeps at least one empty row at the end and at least MIN_ROWS rows in total */
const padRows = (rows: CountryRow[]): CountryRow[] => {
  const result = [...rows];
  if (result.length === 0 || !isEmptyRow(result[result.length - 1])) {
    result.push(emptyRow());
  }
  while (result.length < MIN_ROWS) result.push(emptyRow());
  return result;
};

const buildInitialRows = (): CountryRow[] =>
  padRows(initialData.map((row) => ({ key: nextKey(), ...row })));

const cellInputClass =
  "h-[30px] w-full bg-transparent px-2 text-[14px] text-[#24364d] outline-none focus:bg-white ";

type CustomerSupplierCountryPageProps = {
  onClose?: () => void;
};

const CustomerSupplierCountryPage: React.FC<CustomerSupplierCountryPageProps> = ({ onClose }) => {
  const [rows, setRows] = useState<CountryRow[]>(buildInitialRows);
  const [selectedKey, setSelectedKey] = useState<number | null>(
    () => rows[0]?.key ?? null,
  );
  const [showFind, setShowFind] = useState(false);
  const [query, setQuery] = useState("");

  const updateCell = (
    key: number,
    field: "id" | "country" | "countryAr" | "position",
    value: string,
  ) => {
    setRows((prev) =>
      padRows(prev.map((row) => (row.key === key ? { ...row, [field]: value } : row))),
    );
  };

  const handleSave = () => {
    const data = rows
      .filter((row) => !isEmptyRow(row))
      .map(({ id, country, countryAr, position }) => ({
        id,
        country,
        countryAr,
        position: position ? Number(position) : null,
      }));
    console.log(data);
  };

  const handleFind = () => {
    setShowFind((prev) => !prev);
    setQuery("");
  };

  const handleCancel = () => {
    const fresh = buildInitialRows();
    setRows(fresh);
    setSelectedKey(fresh[0]?.key ?? null);
    setShowFind(false);
    setQuery("");
  };

  const handleClose = () => {
    onClose?.();
  };

  const search = query.trim().toLowerCase();
  const visibleRows = search
    ? rows.filter(
        (row) =>
          row.id.toLowerCase().includes(search) ||
          row.country.toLowerCase().includes(search) ||
          row.countryAr.includes(query.trim()),
      )
    : rows;

  return (
    <div className="flex min-h-full w-full items-center justify-center bg-white px-4 py-4">
      <div className="min-h-fit w-205 max-w-full bg-white p-0">
        <main className="w-full overflow-hidden border border-[#d5dce2] bg-white">
          <div
          className="
            flex
            h-7.5
            items-center
            border-b
            border-slate-300
            bg-[#a3dfc0]
          "
        >

          <span
            className="
              px-3
              text-[17px]
              font-semibold
              text-slate-700
            "
          >
                          Customer/Supplier Country

          </span>

        </div>

          <section className="px-3.5 pb-6 pt-6">
            {/* {showFind && (
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-[30px] w-[168px] items-center border border-[#e0e5ea] bg-[#fafbfc] px-3 text-[12px] text-[#405066]">
                  Find :
                </div>
                <input
                  id="txtFind"
                  type="text"
                  autoFocus
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="ID or country"
                  className="h-[30px] w-[250px] rounded-[4px] border border-[#cfd7df] bg-white px-2 text-[12px] text-[#24364d] outline-none focus:border-[#91a7b9]"
                />
              </div>
            )} */}

            {/* Grid */}
            <div className="h-109 overflow-auto border customer-table-scroll border-[#cfd7df] bg-white">
              <table className="w-full table-fixed border-collapse text-[12px] text-[#24364d] customer-table-scroll">
                <colgroup>
                  <col className="w-5.5" />
                  <col className="w-17.5" />
                  <col />
                  <col />
                  <col className="w-22" />
                </colgroup>
                <thead className="sticky top-0 z-10">
                  <tr className="bg-[#fafbfc] text-[#405066]">
                    <th className="h-7.5 border border-[#e0e5ea]" />
                    <th className="h-7.5 border border-[#e0e5ea] px-2 text-left font-semibold">
                      ID
                    </th>
                    <th className="h-7.5 border border-[#e0e5ea] px-2 text-left font-semibold">
                      Country
                    </th>
                    <th className="h-7.5 border border-[#e0e5ea] px-2 text-right font-semibold">
                      Country(Arabic)
                    </th>
                    <th className="h-7.5 border border-[#e0e5ea] px-2 text-right font-semibold">
                      Position No.
                    </th>
                  </tr>
                </thead>
                <tbody className="">
                  {visibleRows.map((row) => {
                    const selected = row.key === selectedKey;
                    return (
                      <tr
                        key={row.key}
                        onClick={() => setSelectedKey(row.key)}
                        className={selected ? "bg-[#f2faf5]" : "bg-white"}
                      >
                        <td className="h-7.5 border border-[#e0e5ea] bg-[#fafbfc] text-center text-[8px] text-[#405066]">
                          {selected ? <Play size={10}/> : ""}
                        </td>
                        <td
                          className={`border border-[#e0e5ea] p-0 ${selected ? "bg-[#e7f7ed]" : ""}`}
                        >
                          <input
                            aria-label="ID"
                            value={row.id}
                            onFocus={() => setSelectedKey(row.key)}
                            onChange={(event) =>
                              updateCell(row.key, "id", event.target.value)
                            }
                            className={cellInputClass}
                          />
                        </td>
                        <td className="border border-[#e0e5ea] p-0">
                          <input
                            aria-label="Country"
                            value={row.country}
                            onFocus={() => setSelectedKey(row.key)}
                            onChange={(event) =>
                              updateCell(row.key, "country", event.target.value)
                            }
                            className={cellInputClass}
                          />
                        </td>
                        <td className="border border-[#e0e5ea] p-0">
                          <input
                            aria-label="Country (Arabic)"
                            dir="rtl"
                            value={row.countryAr}
                            onFocus={() => setSelectedKey(row.key)}
                            onChange={(event) =>
                              updateCell(row.key, "countryAr", event.target.value)
                            }
                            className={`${cellInputClass} text-right`}
                          />
                        </td>
                        <td className="border border-[#e0e5ea] p-0">
                          <input
                            aria-label="Position"
                            type="number"
                            min="0"
                            value={row.position}
                            onFocus={() => setSelectedKey(row.key)}
                            onChange={(event) =>
                              updateCell(row.key, "position", event.target.value)
                            }
                            className={`${cellInputClass} text-right [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Actions */}
            <div className="mt-6 flex justify-center gap-3">
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
                <u>S</u>earch
              </button>
              <button
                id="btnCancel"
                type="button"
                onClick={handleCancel}
                className="btn-style"
              >
                <u>C</u>ancel
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

export default CustomerSupplierCountryPage;