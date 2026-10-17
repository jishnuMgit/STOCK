import React, { useState } from "react";
import Select from "react-select";
import selectComponents from "../../components/sharecomponents/selectComponents";
type Option = { value: string; label: string };

type AgeingRange = { from: string; to: string };

type AgeingMode = "DAYS" | "MONTH";

/* Replace these with data from your API */
const moduleOptions: Option[] = [
  { value: "FINANCE", label: "Finance" },
  { value: "INVENTORY", label: "Inventory" },
  { value: "SALES", label: "Sales" },
];

const ageingModeOptions: Option[] = [
  { value: "DAYS", label: "Days" },
  { value: "MONTH", label: "Month" },
];


/* Default ranges for each mode. A "To" of 0 on the last row means "and above". */
const defaultRanges = (): Record<AgeingMode, AgeingRange[]> => ({
  DAYS: [
    { from: "0", to: "30" },
    { from: "31", to: "60" },
    { from: "61", to: "90" },
    { from: "91", to: "120" },
    { from: "121", to: "180" },
    { from: "181", to: "0" },
  ],
  MONTH: [
    { from: "0", to: "3" },
    { from: "3", to: "6" },
    { from: "6", to: "9" },
    { from: "9", to: "12" },
    { from: "12", to: "24" },
    { from: "24", to: "0" },
  ],
});

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
    ${isFocused ? "!border-[#B7ECD0]" : "!border-[#fffff]"}
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
    "!mt-[1px] !rounded-none !border !border-[#B7ECD0] !z-[999999] !shadow-md",
  menuList: () => "!p-0 !max-h-[180px]",
  option: ({
    isFocused,
    isSelected,
  }: {
    isFocused: boolean;
    isSelected: boolean;
  }) => `
    !cursor-pointer !px-[6px] !py-[5px] !text-[13px] !text-[#24364d]
    ${isSelected ? "!bg-[#e7f7ed]" : isFocused ? "!bg-[#f2faf5]" : "!bg-white"}
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
  <div className="flex h-7.5 items-center justify-end  bg-[#fafbfc]  text-[14px] text-[#405066]">
    {children}
  </div>
);

const cellInputClass =
  "h-[28px] w-full bg-transparent px-2 text-right text-[14px] text-[#24364d] outline-none focus:bg-white [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";

type SetReceivableAgeingPeriodProps = {
  onClose?: () => void;
};

const SetReceivableAgeingPeriod: React.FC<SetReceivableAgeingPeriodProps> = ({
  onClose,
}) => {
  const [moduleName, setModuleName] = useState<Option | null>(
    moduleOptions[0],
  ); // lkpModule
  const [ageingMode, setAgeingMode] = useState<Option | null>(
    ageingModeOptions[0],
  ); // lkpAgeingMode

  // each mode keeps its own ranges so switching does not lose edits
  const [ranges, setRanges] = useState(defaultRanges);
  const [activeRow, setActiveRow] = useState(0);
  const [error, setError] = useState("");

  const mode = (ageingMode?.value ?? "DAYS") as AgeingMode;
  const unit = mode === "DAYS" ? "Days" : "Month";
  const rows = ranges[mode];

  const updateCell = (index: number, field: "from" | "to", value: string) => {
    // digits only
    if (!/^\d*$/.test(value)) return;
    setError("");
    setRanges((prev) => ({
      ...prev,
      [mode]: prev[mode].map((row, i) =>
        i === index ? { ...row, [field]: value } : row,
      ),
    }));
  };

  const validate = (): string => {
    for (let i = 0; i < rows.length; i += 1) {
      const from = parseInt(rows[i].from, 10);
      const to = parseInt(rows[i].to, 10);
      if (Number.isNaN(from) || Number.isNaN(to)) {
        return `Row ${i + 1}: enter both From and To.`;
      }
      const isLast = i === rows.length - 1;
      if (!(isLast && to === 0) && to < from) {
        return `Row ${i + 1}: To ${unit} must not be less than From ${unit}.`;
      }
    }
    return "";
  };

  const handleSave = () => {
    const message = validate();
    setError(message);
    if (message) return;
    console.log({
      module: moduleName,
      ageingMode: mode,
      periods: rows.map((row) => ({
        from: parseInt(row.from, 10),
        to: parseInt(row.to, 10),
      })),
    });
  };

  const handleClose = () => {
    setModuleName(moduleOptions[0]);
    setAgeingMode(ageingModeOptions[0]);
    setRanges(defaultRanges());
    setActiveRow(0);
    setError("");
    onClose?.();
  };

  return (
    <div className="flex min-h-full w-full items-start justify-center bg-white px-4 py-4">
      <div className="min-h-fit w-120 min-w-120 max-w-full bg-white p-0">
        <main className="w-full overflow-hidden border border-gray-400 bg-white">
          <header className="flex h-7.5 items-center justify-start bg-[#9fdfbc]">
            <h1 className="m-0 ml-3.5 text-[17px] font-semibold text-[#24364d]">
              Set Receivable  Ageing Period
            </h1>
          </header>

          <section className="px-3.5 pb-6 pt-3">
            {/* Filters */}
            <div className="grid grid-cols-[100px_1fr] items-center gap-x-4 gap-y-3">
              <FieldLabel>Module :</FieldLabel>
              <div className="w-62.5">
                <Select
                  inputId="lkpModule"
                  instanceId="lkpModule"
                  options={moduleOptions}
                  components={selectComponents}
                  value={moduleName}
                  onChange={setModuleName}
                  {...selectProps}
                />
              </div>

              <FieldLabel>Ageing Mode :</FieldLabel>
              <div className="w-35">
                <Select
                  inputId="lkpAgeingMode"
                  instanceId="lkpAgeingMode"
                  options={ageingModeOptions}
                  components={selectComponents}
                  value={ageingMode}
                  onChange={(option) => {
                    setAgeingMode(option);
                    setActiveRow(0);
                    setError("");
                  }}
                  {...selectProps}
                />
              </div>
            </div>

            {/* Grid */}
            <div className="mt-3 h-51.25 overflow-auto border border-[#B7ECD0] bg-white">
              <table className="w-full table-fixed border-collapse text-[14px] text-[#24364d]">
                <colgroup>
                  <col className="w-5.5" />
                  <col />
                  <col />
                </colgroup>
                <thead className="sticky top-0 z-0">
                  <tr className="bg-[#EEFBF4] text-[#405066]">
                    <th className="h-7 border border-[#B7ECD0]" />
                    <th className="h-7 border border-[#B7ECD0] px-2 text-right font-semibold">
                      From {unit}
                    </th>
                    <th className="h-7 border border-[#B7ECD0] px-2 text-right font-semibold">
                      To {unit}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => {
                    const active = index === activeRow;
                    return (
                      <tr
                        key={index}
                        onClick={() => setActiveRow(index)}
                        className={active ? "bg-[#f2faf5]" : "bg-white"}
                      >
                        <td className="h-[28px] border border-[#B7ECD0] bg-[#fafbfc] text-center text-[8px] text-[#405066]">
                          {active ? "▶" : ""}
                        </td>
                        <td className="border border-[#B7ECD0] p-0">
                          <input
                            aria-label={`From ${unit}, row ${index + 1}`}
                            inputMode="numeric"
                            value={row.from}
                            onFocus={() => setActiveRow(index)}
                            onChange={(event) =>
                              updateCell(index, "from", event.target.value)
                            }
                            className={cellInputClass}
                          />
                        </td>
                        <td className="border border-[#B7ECD0] p-0">
                          <input
                            aria-label={`To ${unit}, row ${index + 1}`}
                            inputMode="numeric"
                            value={row.to}
                            onFocus={() => setActiveRow(index)}
                            onChange={(event) =>
                              updateCell(index, "to", event.target.value)
                            }
                            className={cellInputClass}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {error && (
              <p role="alert" className="mt-2 text-[14px] text-[#c0392b]">
                {error}
              </p>
            )}

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

export default SetReceivableAgeingPeriod;