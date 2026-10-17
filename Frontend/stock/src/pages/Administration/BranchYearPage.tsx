import React, { useState } from "react";
import Select from "react-select";
import selectComponents from "../../components/sharecomponents/selectComponents";

type Option = { value: string; label: string };

/* react-select styled to sit inside a grid cell (no border, fills the cell) */
const cellSelectProps = {
  isSearchable: false,
  isClearable: false,
  placeholder: "",
  menuPosition: "fixed" as const,
  menuPortalTarget: typeof document !== "undefined" ? document.body : undefined,
  classNames: {
    control: ({ isFocused }: { isFocused: boolean }) => `
      !min-h-[26px] !h-[26px] !rounded-none !border-0 !shadow-none !text-[12px]
      !bg-transparent
      ${isFocused ? "!bg-white !ring-1 !ring-inset !ring-[#91a7b9]" : ""}
    `,
    valueContainer: () => "!h-[26px] !py-0 !px-[8px] !overflow-hidden",
    singleValue: () => "!m-0 !text-[12px] !text-[#24364d]",
    placeholder: () => "!m-0 !text-[12px] !text-[#7a8794]",
    input: () => "!m-0 !p-0 !text-[12px] !text-[#24364d]",
    indicatorsContainer: () => "!h-[26px]",
    dropdownIndicator: () => "!p-[3px] !text-[#657486]",
    indicatorSeparator: () => "!hidden",
    menu: () =>
      "!mt-[1px] !rounded-none !border !border-[#cfd7df] !z-[999999] !shadow-md",
    menuList: () => "!p-0 !max-h-[180px]",
    option: ({
      isFocused,
      isSelected,
    }: {
      isFocused: boolean;
      isSelected: boolean;
    }) => `
      !cursor-pointer !px-[6px] !py-[5px] !text-[12px] !text-[#24364d]
      ${isSelected ? "!bg-[#F2FAF5]" : isFocused ? "!bg-[#f2faf5]" : "!bg-white"}
    `,
  },
};

type YearRow = {
  key: number;
  branch: string;
  year: string;
};

const MIN_ROWS = 16;

/* Replace with data from your API */
const branchOptions: string[] = ["WAREHOUSE RIYADH", "OFFICE"];

const initialData: Omit<YearRow, "key">[] = [
  { branch: "WAREHOUSE RIYADH", year: "2026" },
  { branch: "OFFICE", year: "2026" },
];

let keyCounter = 0;
const nextKey = () => ++keyCounter;

const emptyRow = (): YearRow => ({ key: nextKey(), branch: "", year: "" });

const isEmptyRow = (row: YearRow) => !row.branch && !row.year;

/** keeps one empty "new" row at the end and at least MIN_ROWS rows in total */
const padRows = (rows: YearRow[]): YearRow[] => {
  const result = [...rows];
  if (result.length === 0 || !isEmptyRow(result[result.length - 1])) {
    result.push(emptyRow());
  }
  while (result.length < MIN_ROWS) result.push(emptyRow());
  return result;
};

const buildInitialRows = (): YearRow[] =>
  padRows(initialData.map((row) => ({ key: nextKey(), ...row })));

type BranchYearPageProps = {
  onClose?: () => void;
};

const BranchYearPage: React.FC<BranchYearPageProps> = ({ onClose }) => {
  const [rows, setRows] = useState<YearRow[]>(buildInitialRows);
  const [selectedKey, setSelectedKey] = useState<number | null>(
    () => rows[0]?.key ?? null,
  );
  const [error, setError] = useState("");

  // the first empty row is the "new row" (*) at the end of the data
  const firstEmptyKey = rows.find((row) => isEmptyRow(row))?.key ?? null;

  const updateCell = (key: number, field: "branch" | "year", value: string) => {
    if (field === "year" && !/^\d{0,4}$/.test(value)) return;
    setError("");
    setRows((prev) =>
      padRows(
        prev.map((row) => (row.key === key ? { ...row, [field]: value } : row)),
      ),
    );
  };

  const handleSave = () => {
    const filled = rows.filter((row) => !isEmptyRow(row));

    if (filled.some((row) => !row.branch || row.year.length !== 4)) {
      setError("Every row needs a branch and a 4-digit year.");
      return;
    }
    const branches = filled.map((row) => row.branch);
    if (new Set(branches).size !== branches.length) {
      setError("A branch can appear only once.");
      return;
    }

    setError("");
    console.log(
      filled.map((row) => ({ branch: row.branch, year: Number(row.year) })),
    );
  };

  const handleClose = () => {
    const fresh = buildInitialRows();
    setRows(fresh);
    setSelectedKey(fresh[0]?.key ?? null);
    setError("");
    onClose?.();
  };

  return (
    <div className="flex min-h-full w-full items-start justify-center bg-white px-4 py-4">
      <div className="min-h-fit w-150 max-w-full bg-white p-0">
        <main className="w-full overflow-hidden border border-[#d5dce2] bg-white">
          <header className="flex h-7.5 items-center justify-start bg-[#9fdfbc]">
            <h1 className="m-0 ml-3.5 text-[17px] font-semibold text-[#24364d]">
              Year
            </h1>
          </header>

          <section className="px-3.5 pb-6 pt-3">
            {/* Grid */}
            <div className="h-[470px] overflow-auto border border-[#BFE8D0] bg-white">
              <table className="w-full table-fixed border-collapse text-[12px] text-[#24364d]">
                <colgroup>
                  <col className="w-[22px]" />
                  <col />
                  <col className="w-[110px]" />
                </colgroup>
                <thead className="sticky top-0 z-10">
                  <tr className="bg-[#EDF9F2] text-[#405066]">
                    <th className="h-[28px] border border-[#BFE8D0]" />
                    <th className="h-[28px] border border-[#BFE8D0] px-2 text-left font-normal">
                      Branch
                    </th>
                    <th className="h-[28px] border border-[#BFE8D0] px-2 text-right font-normal">
                      Year
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const selected = row.key === selectedKey;
                    const isNewRow = row.key === firstEmptyKey;
                    // a branch already used in another row is not offered again
                    const available = branchOptions.filter(
                      (option) =>
                        option === row.branch ||
                        !rows.some(
                          (other) => other.key !== row.key && other.branch === option,
                        ),
                    );
                    return (
                      <tr
                        key={row.key}
                        onClick={() => setSelectedKey(row.key)}
                        className={selected ? "bg-[#f2faf5]" : "bg-white"}
                      >
                        <td className="h-[26px] border border-[#BFE8D0] bg-[#fafbfc] text-center text-[10px] text-[#405066]">
                          {selected ? "▶" : isNewRow ? "" : ""}
                        </td>
                        <td
                          className={`border border-[#BFE8D0] p-0 ${selected ? "bg-[#F2FAF5]" : ""}`}
                        >
                          <Select
                            inputId={`lkpBranch-${row.key}`}
                            instanceId={`lkpBranch-${row.key}`}
                            aria-label="Branch"
                            options={available.map(
                              (name): Option => ({ value: name, label: name }),
                            )}
                            value={
                              row.branch
                                ? { value: row.branch, label: row.branch }
                                : null
                            }
                            onFocus={() => setSelectedKey(row.key)}
                            onChange={(option) =>
                              updateCell(row.key, "branch", option?.value ?? "")
                            }
                            {...cellSelectProps}
                            components={selectComponents}
                          />
                        </td>
                        <td className="border border-[#BFE8D0] p-0">
                          <input
                            aria-label="Year"
                            inputMode="numeric"
                            value={row.year}
                            onFocus={() => setSelectedKey(row.key)}
                            onChange={(event) =>
                              updateCell(row.key, "year", event.target.value)
                            }
                            className="h-[26px] w-full bg-transparent px-2 text-right text-[12px] text-[#24364d] outline-none focus:bg-white "
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

export default BranchYearPage;