import React, { useState } from "react";
import Select from "react-select";

type Option = { value: string; label: string };

type Company = { id: string; name: string };

const MIN_ROWS = 9;

/* Replace these with data from your API */
const companies: Company[] = [{ id: "1", name: "GREEN SPECTRA" }];

const currentYear = new Date().getFullYear();
const yearOptions: Option[] = Array.from({ length: 6 }, (_, index) => {
  const value = String(currentYear - index);
  return { value, label: value };
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
  <div className="flex h-[30px] items-center justify-end  bg-[#fafbfc] pr-3 text-[12px] text-[#405066]">
    {children}
  </div>
);

type ChangeLoginYearProps = {
  title?: string; // window title, defaults to the selected company name
  onSelect?: (company: Company, year: string) => void;
  onClose?: () => void;
};

const ChangeLoginYear: React.FC<ChangeLoginYearProps> = ({
  title,
  onSelect,
  onClose,
}) => {
  const [selectedId, setSelectedId] = useState<string | null>(
    companies[0]?.id ?? null,
  );
  const [year, setYear] = useState<Option | null>(
    yearOptions.find((o) => o.value === String(currentYear)) ?? yearOptions[0],
  ); // lkpYear

  const selectedCompany = companies.find((c) => c.id === selectedId) ?? null;
  const emptyCount = Math.max(0, MIN_ROWS - companies.length);

  const handleOk = () => {
    if (!selectedCompany || !year) return;
    console.log({ company: selectedCompany, year: year.value });
    onSelect?.(selectedCompany, year.value);
  };

  const handleClose = () => {
    setSelectedId(companies[0]?.id ?? null);
    onClose?.();
  };

  // arrow keys move the selection, Enter confirms
  const handleGridKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const index = companies.findIndex((c) => c.id === selectedId);
    if (event.key === "ArrowDown" && index < companies.length - 1) {
      event.preventDefault();
      setSelectedId(companies[index + 1].id);
    } else if (event.key === "ArrowUp" && index > 0) {
      event.preventDefault();
      setSelectedId(companies[index - 1].id);
    } else if (event.key === "Enter") {
      event.preventDefault();
      handleOk();
    }
  };

  return (
    <div className="flex min-h-full w-full items-start justify-center bg-white px-4 py-4">
      <div className="min-h-fit w-125 max-w-full bg-white p-0">
        <main className="w-full overflow-hidden border border-gray-400 bg-white">
          <header className="flex h-7.5 items-center justify-start bg-[#9fdfbc]">
            <h1 className="m-0 ml-3.5 text-[17px] font-semibold text-[#24364d]">
              {title ?? selectedCompany?.name ?? "Select Company"}
            </h1>
          </header>

          <section className="px-3.5 pb-6 pt-3">
            {/* Company grid */}
            <div
              tabIndex={0}
              onKeyDown={handleGridKeyDown}
              className="h-[250px] overflow-auto border border-[#B7ECD0] bg-white outline-none focus:border-[#91a7b9]"
            >
              <table className="w-full table-fixed border-collapse text-[12px] text-[#24364d]">
                <colgroup>
                  <col className="w-[22px]" />
                  <col />
                </colgroup>
                <thead className="sticky top-0 z-10">
                  <tr className="bg-[#E7F7ED] text-[#405066]">
                    <th className="h-[28px] border border-[#B7ECD0]" />
                    <th className="h-[28px] border border-[#B7ECD0] px-2 text-left font-normal">
                      Company Name
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {companies.map((company) => {
                    const active = company.id === selectedId;
                    return (
                      <tr
                        key={company.id}
                        onClick={() => setSelectedId(company.id)}
                        onDoubleClick={handleOk}
                        className={`cursor-pointer ${active ? "bg-white" : "bg-white"}`}
                      >
                        <td className="h-[28px] border border-[#B7ECD0] bg-[#fafbfc] text-center text-[8px] text-[#405066]">
                          {active ? "▶" : ""}
                        </td>
                        <td className="h-[28px] border border-[#B7ECD0] px-2">
                          {company.name}
                        </td>
                      </tr>
                    );
                  })}

                  {/* empty filler rows */}
                  {Array.from({ length: emptyCount }).map((_, index) => (
                    <tr key={`empty-${index}`} className="bg-white">
                      <td className="h-[28px] border border-[#B7ECD0] bg-[#fafbfc]" />
                      <td className="h-[28px] border border-[#B7ECD0]" />
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Year + actions */}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <FieldLabel>Year :</FieldLabel>
                <div className="w-[110px]">
                  <Select
                    inputId="lkpYear"
                    instanceId="lkpYear"
                    options={yearOptions}
                    value={year}
                    onChange={setYear}
                    {...selectProps}
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  id="btnOK"
                  type="button"
                  onClick={handleOk}
                  disabled={!selectedCompany}
                  className="btn-style disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <u>O</u>K
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
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};

export default ChangeLoginYear;