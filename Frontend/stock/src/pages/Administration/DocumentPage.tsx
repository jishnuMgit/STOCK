import React, { useState } from "react";
import Select from "react-select";

type Option = { value: string; label: string };

type DocumentRow = {
  key: number;
  id: string;
  document: string;
  toBePost: boolean;
  position: string;
};

const MIN_ROWS = 17;

/* Replace these with data from your API */
const moduleOptions: Option[] = [
  { value: "FINANCE", label: "Finance" },
  { value: "INVENTORY", label: "Inventory" },
  { value: "SALES", label: "Sales" },
];

const documentsByModule: Record<string, Omit<DocumentRow, "key">[]> = {
  FINANCE: [
    { id: "RV", document: "Receipt", toBePost: true, position: "21" },
    { id: "PV", document: "Payment", toBePost: true, position: "22" },
    { id: "JV", document: "Journal", toBePost: true, position: "23" },
    { id: "DN", document: "Debit Note", toBePost: true, position: "24" },
    { id: "CN", document: "Credit Note", toBePost: true, position: "25" },
    { id: "DLN", document: "Delivery Note", toBePost: false, position: "26" },
  ],
  INVENTORY: [],
  SALES: [],
};

let keyCounter = 0;
const nextKey = () => ++keyCounter;

const emptyRow = (): DocumentRow => ({
  key: nextKey(),
  id: "",
  document: "",
  toBePost: false,
  position: "",
});

const isEmptyRow = (row: DocumentRow) =>
  !row.id && !row.document && !row.position && !row.toBePost;

/** keeps one empty "new" row at the end and at least MIN_ROWS rows in total */
const padRows = (rows: DocumentRow[]): DocumentRow[] => {
  const result = [...rows];
  if (result.length === 0 || !isEmptyRow(result[result.length - 1])) {
    result.push(emptyRow());
  }
  while (result.length < MIN_ROWS) result.push(emptyRow());
  return result;
};

const buildRows = (moduleValue: string): DocumentRow[] =>
  padRows(
    (documentsByModule[moduleValue] ?? []).map((row) => ({
      key: nextKey(),
      ...row,
    })),
  );

const selectClassNames = {
  control: ({
    isFocused,
    isDisabled,
  }: {
    isFocused: boolean;
    isDisabled: boolean;
  }) => `
    !min-h-[25px] !h-[30px] !rounded-[4px] !border !shadow-none !text-[13px]
    hover:!border-[#aab8c5]
    ${isDisabled ? "!bg-[#f6f8fa]" : "!bg-white"}
    ${isFocused ? "!border-[#91a7b9]" : "!border-[#cfd7df]"}
  `,
  valueContainer: () => "!h-[23px] !py-0 !px-[5px] !overflow-hidden",
  singleValue: () => "!m-0 !text-[13px] !text-[#24364d]",
  placeholder: () => "!m-0 !text-[13px] !text-[#7a8794]",
  input: () => "!m-0 !p-0 !text-[13px] !text-[#24364d]",
  indicatorsContainer: () => "!h-[23px]",
  dropdownIndicator: () => "!p-[3px] !text-[#657486]",
  indicatorSeparator: () => "!hidden",
  clearIndicator: () => "!p-[3px]",
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
    !cursor-pointer !px-[6px] !py-[5px] !text-[13px] !text-[#24364d]
    ${isSelected ? "!bg-[#F2FAF5]" : isFocused ? "!bg-[#f2faf5]" : "!bg-white"}
  `,
};

const selectProps = {
  isSearchable: false,
  isClearable: false,
  placeholder: "",
  classNames: selectClassNames,
  menuPosition: "fixed" as const,
  menuPortalTarget: typeof document !== "undefined" ? document.body : undefined,
};

const FieldLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex h-7.5 w-27.5 items-center justify-end border border-[#BFE8D0] bg-[#fafbfc] pr-3 text-[14px] text-[#405066]">
    {children}
  </div>
);

const cellInputClass =
  "h-[26px] w-full bg-transparent px-2 text-[12px] text-[#24364d] outline-none focus:bg-white ";

type DocumentPageProps = {
  onClose?: () => void;
};

const DocumentPage: React.FC<DocumentPageProps> = ({ onClose }) => {
  const [moduleName, setModuleName] = useState<Option | null>(moduleOptions[0]); // lkpModule
  const [rows, setRows] = useState<DocumentRow[]>(() =>
    buildRows(moduleOptions[0].value),
  );
  const [selectedKey, setSelectedKey] = useState<number | null>(
    () => rows[0]?.key ?? null,
  );
  const [showFind, setShowFind] = useState(false);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");

  // the first empty row is the "new row" (*) at the end of the data
  const firstEmptyKey = rows.find((row) => isEmptyRow(row))?.key ?? null;

  const loadModule = (option: Option | null) => {
    setModuleName(option);
    const fresh = buildRows(option?.value ?? "");
    setRows(fresh);
    setSelectedKey(fresh[0]?.key ?? null);
    setShowFind(false);
    setQuery("");
    setError("");
  };

  const updateCell = <K extends "id" | "document" | "toBePost" | "position">(
    key: number,
    field: K,
    value: DocumentRow[K],
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

    if (filled.some((row) => !row.id.trim() || !row.document.trim())) {
      setError("Every document needs an ID and a document name.");
      return;
    }
    const ids = filled.map((row) => row.id.trim().toLowerCase());
    if (new Set(ids).size !== ids.length) {
      setError("Document IDs must be unique.");
      return;
    }

    setError("");
    console.log({
      module: moduleName?.value,
      documents: filled.map((row) => ({
        id: row.id.trim(),
        document: row.document.trim(),
        toBePost: row.toBePost,
        position: row.position ? Number(row.position) : null,
      })),
    });
  };

  const handleFind = () => {
    setShowFind((prev) => !prev);
    setQuery("");
  };

  const handleClose = () => {
    loadModule(moduleOptions[0]);
    onClose?.();
  };

  const search = query.trim().toLowerCase();
  const visibleRows = search
    ? rows.filter(
        (row) =>
          row.id.toLowerCase().includes(search) ||
          row.document.toLowerCase().includes(search),
      )
    : rows;

  return (
    <div className="flex min-h-full w-full items-start justify-center bg-white px-4 py-4">
      <div className="min-h-fit w-150 max-w-full bg-white p-0">
        <main className="w-full overflow-hidden border border-gray-400 bg-white">
          <header className="flex h-7.5 items-center justify-start bg-[#9fdfbc]">
            <h1 className="m-0 ml-3.5 text-[17px] font-semibold text-[#24364d]">
              Document
            </h1>
          </header>

          <section className="px-3.5 pb-6 pt-3">
            {/* Module */}
            <div className="flex items-center gap-3">
              <FieldLabel>Module :</FieldLabel>
              <div className="w-50">
                <Select
                  inputId="lkpModule"
                  instanceId="lkpModule"
                  options={moduleOptions}
                  value={moduleName}
                  onChange={loadModule}
                  {...selectProps}
                />
              </div>
            </div>

            {showFind && (
              <div className="mt-3 flex items-center gap-3">
                <FieldLabel>Find :</FieldLabel>
                <input
                  id="txtFind"
                  type="text"
                  autoFocus
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="ID or document"
                  className="h-7.5 w-62.5 rounded-sm border border-[#cfd7df] bg-white px-2 text-[12px] text-[#24364d] outline-none focus:border-[#91a7b9]"
                />
              </div>
            )}

            {/* Grid */}
            <div className="mt-3 h-125 overflow-auto border border-[#BFE8D0] bg-white">
              <table className="w-full table-fixed border-collapse text-[12px] text-[#24364d]">
                <colgroup>
                  <col className="w-5.5" />
                  <col className="w-20" />
                  <col />
                  <col className="w-20.5" />
                  <col className="w-23  " />
                </colgroup>
                <thead className="sticky top-0 z-0">
                  <tr className="bg-[#EDF9F2] text-[#405066]">
                    <th className="h-7 border border-[#BFE8D0]" />
                    <th className="h-7 border border-[#BFE8D0] px-2 text-left font-normal"> ID </th>
                    <th className="h-7 border border-[#BFE8D0] px-2 text-left font-normal">  Document  </th>
                    <th className="h-7 border border-[#BFE8D0] px-2 text-center font-normal">  To Be Post </th>
                    <th className="h-7 border border-[#BFE8D0] px-2 text-right font-normal"> Position No. </th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map((row) => {
                    const selected = row.key === selectedKey;
                    const isNewRow = row.key === firstEmptyKey;
                    return (
                      <tr
                        key={row.key}
                        onClick={() => setSelectedKey(row.key)}
                        className={selected ? "bg-[#f2faf5]" : "bg-white"}
                      >
                        <td className="h-6.5 border border-[#BFE8D0] bg-[#fafbfc] text-center text-[10px] text-[#405066]">
                          {selected ? "▶" : isNewRow ? "" : ""}
                        </td>
                        <td  className={`border border-[#BFE8D0] p-0 ${selected ? "bg-[#F2FAF5]" : ""}`} >
                          <input
                            aria-label="ID"
                            value={row.id}
                            onFocus={() => setSelectedKey(row.key)}
                            onChange={(event) =>
                              updateCell(
                                row.key,
                                "id",
                                event.target.value.toUpperCase(),
                              )
                            }
                            className={cellInputClass}
                          />
                        </td>
                        <td className="border border-[#BFE8D0] p-0">
                          <input
                            aria-label="Document"
                            value={row.document}
                            onFocus={() => setSelectedKey(row.key)}
                            onChange={(event) =>
                              updateCell(row.key, "document", event.target.value)
                            }
                            className={cellInputClass}
                          />
                        </td>
                        <td className="border border-[#BFE8D0] text-center">
                          <input
                            aria-label="To Be Post"
                            type="checkbox"
                            checked={row.toBePost}
                            onFocus={() => setSelectedKey(row.key)}
                            onChange={(event) =>
                              updateCell(row.key, "toBePost", event.target.checked)
                            }
                            className="h-4 w-4 align-middle accent-[#64d96e]"
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

export default DocumentPage;