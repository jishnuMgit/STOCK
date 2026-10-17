import React, { useState } from "react";

type BranchRow = {
  key: number;
  id: string;
  branch: string;
  position: string;
};

const MIN_ROWS = 12;

/* Replace with data from your API */
const initialData: Omit<BranchRow, "key">[] = [
  { id: "01", branch: "WAREHOUSE RIYADH", position: "1" },
  { id: "11", branch: "OFFICE", position: "5" },
];

let keyCounter = 0;
const nextKey = () => ++keyCounter;

const emptyRow = (): BranchRow => ({
  key: nextKey(),
  id: "",
  branch: "",
  position: "",
});

const isEmptyRow = (row: BranchRow) =>
  !row.id && !row.branch && !row.position;

/** keeps one empty row at the end and at least MIN_ROWS rows in total */
const padRows = (rows: BranchRow[]): BranchRow[] => {
  const result = [...rows];
  if (result.length === 0 || !isEmptyRow(result[result.length - 1])) {
    result.push(emptyRow());
  }
  while (result.length < MIN_ROWS) result.push(emptyRow());
  return result;
};

const buildInitialRows = (): BranchRow[] =>
  padRows(initialData.map((row) => ({ key: nextKey(), ...row })));

const cellInputClass =
  "h-[26px] w-full bg-transparent px-2 text-[12px] text-[#24364d] outline-none focus:bg-white ";

type BranchPageProps = {
  companyName?: string;
  onClose?: () => void;
};

const BranchPage: React.FC<BranchPageProps> = ({
  companyName = "GREEN SPECTRA",
  onClose,
}) => {
  const [rows, setRows] = useState<BranchRow[]>(buildInitialRows);
  const [selectedKey, setSelectedKey] = useState<number | null>(
    () => rows[0]?.key ?? null,
  );
  const [showFind, setShowFind] = useState(false);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");

  const updateCell = (
    key: number,
    field: "id" | "branch" | "position",
    value: string,
  ) => {
    setError("");
    setRows((prev) =>
      padRows(
        prev.map((row) => (row.key === key ? { ...row, [field]: value } : row)),
      ),
    );
  };

  const handleSave = () => {
    const filled = rows.filter((row) => !isEmptyRow(row));

    const incomplete = filled.findIndex((row) => !row.id.trim() || !row.branch.trim());
    if (incomplete !== -1) {
      setError("Every branch needs an ID and a branch name.");
      return;
    }
    const ids = filled.map((row) => row.id.trim().toLowerCase());
    if (new Set(ids).size !== ids.length) {
      setError("Branch IDs must be unique.");
      return;
    }

    setError("");
    console.log({
      company: companyName,
      branches: filled.map((row) => ({
        id: row.id.trim(),
        branch: row.branch.trim(),
        position: row.position ? Number(row.position) : null,
      })),
    });
  };

  const handleFind = () => {
    setShowFind((prev) => !prev);
    setQuery("");
  };

  const handleClose = () => {
    const fresh = buildInitialRows();
    setRows(fresh);
    setSelectedKey(fresh[0]?.key ?? null);
    setShowFind(false);
    setQuery("");
    setError("");
    onClose?.();
  };

  const search = query.trim().toLowerCase();
  const visibleRows = search
    ? rows.filter(
        (row) =>
          row.id.toLowerCase().includes(search) ||
          row.branch.toLowerCase().includes(search),
      )
    : rows;

  return (
    <div className="flex min-h-screen w-full items-start justify-center bg-white px-4 py-4">
      <div className="min-h-fit w-150 max-w-full bg-white p-0">
        <main className="w-full overflow-hidden border border-[#d5dce2] bg-white">
          <header className="flex h-7.5 items-center justify-start bg-[#9fdfbc]">
            <h1 className="m-0 ml-3.5 text-[17px] font-semibold text-[#24364d]">
              Branch
            </h1>
          </header>

          <section className="px-3.5 pb-6 pt-3">
            {/* Company (read-only) */}
            <div className="flex items-center gap-3">
              <div className="flex h-[30px] w-[110px] items-center justify-end border border-[#BFE8D0] bg-[#fafbfc] pr-3 text-[12px] text-[#405066]">
                Company :
              </div>
              <input
                id="txtCompany"
                type="text"
                readOnly
                value={companyName}
                className="h-[30px] w-[320px] max-w-full rounded-[4px] border border-[#cfd7df] bg-[#f6f8fa] px-2 text-[13px] text-[#24364d] outline-none"
              />
            </div>

            {showFind && (
              <div className="mt-3 flex items-center gap-3">
                <div className="flex h-[30px] w-[110px] items-center justify-end border border-[#BFE8D0] bg-[#fafbfc] pr-3 text-[12px] text-[#405066]">
                  Find :
                </div>
                <input
                  id="txtFind"
                  type="text"
                  autoFocus
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="ID or branch"
                  className="h-[30px] w-[250px] rounded-[4px] border border-[#cfd7df] bg-white px-2 text-[12px] text-[#24364d] outline-none focus:border-[#91a7b9]"
                />
              </div>
            )}

            {/* Grid */}
            <div className="mt-3 h-[355px] overflow-auto border border-[#BFE8D0] bg-white">
              <table className="w-full table-fixed border-collapse text-[12px] text-[#24364d]">
                <colgroup>
                  <col className="w-[22px]" />
                  <col className="w-[70px]" />
                  <col />
                  <col className="w-[110px]" />
                </colgroup>
                <thead className="sticky top-0 z-10">
                  <tr className="bg-[#EDF9F2] text-[#405066]">
                    <th className="h-[28px] border border-[#BFE8D0]" />
                    <th className="h-[28px] border border-[#BFE8D0] px-2 text-left font-normal">
                      ID
                    </th>
                    <th className="h-[28px] border border-[#BFE8D0] px-2 text-left font-normal">
                      Branch
                    </th>
                    <th className="h-[28px] border border-[#BFE8D0] px-2 text-right font-normal">
                      Position No.
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
                        <td className="h-[26px] border border-[#BFE8D0] bg-[#fafbfc] text-center text-[8px] text-[#405066]">
                          {selected ? "▶" : ""}
                        </td>
                        <td
                          className={`border border-[#BFE8D0] p-0 ${selected ? "bg-[#F2FAF5]" : ""}`}
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
                        <td className="border border-[#BFE8D0] p-0">
                          <input
                            aria-label="Branch"
                            value={row.branch}
                            onFocus={() => setSelectedKey(row.key)}
                            onChange={(event) =>
                              updateCell(
                                row.key,
                                "branch",
                                event.target.value.toUpperCase(),
                              )
                            }
                            className={cellInputClass}
                          />
                        </td>
                        <td className="border border-[#BFE8D0] p-0">
                          <input
                            aria-label="Position No."
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

            {error && (
              <p role="alert" className="mt-2 text-[12px] text-[#c0392b]">
                {error}
              </p>
            )}

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

export default BranchPage;