
import React, { useState } from "react";
import Select from "react-select";
import selectComponents from "../../components/sharecomponents/selectComponents";

type Option = {
  value: string;
  label: string;
};

type StatusValue = "Open" | "Close";

type BranchStatus = {
  branch: string;
  status: StatusValue;
  userId: string;
  userDate: string;
};

const MIN_ROWS = 8;

const currentYear = new Date().getFullYear();

const yearOptions: Option[] = Array.from(
  { length: 6 },
  (_, index) => {
    const value = String(currentYear - index);
    return { value, label: value };
  }
);

const statusOptions: Option[] = [
  { value: "Open", label: "Open" },
  { value: "Close", label: "Close" },
];

const loadBranchStatuses = (): BranchStatus[] => [
  {
    branch: "WAREHOUSE RIYADH",
    status: "Open",
    userId: "ADMIN",
    userDate: "29-12-2025",
  },
  {
    branch: "OFFICE",
    status: "Open",
    userId: "ADMIN",
    userDate: "29-12-2025",
  },
];

const todayText = () => {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");

  return `${dd}-${mm}-${d.getFullYear()}`;
};

const selectClassNames = {
  control: ({
    isFocused,
    isDisabled,
  }: {
    isFocused: boolean;
    isDisabled: boolean;
  }) => `
    !min-h-[25px] !h-[30px] !rounded-[4px] !border
    !shadow-none !text-[13px]
    hover:!border-[#aab8c5]
    ${isDisabled ? "!bg-[#f6f8fa]" : "!bg-white"}
    ${isFocused ? "!border-[#91a7b9]" : "!border-[#cfd7df]"}
  `,

  valueContainer: () =>
    "!h-[23px] !py-0 !px-[5px] !overflow-hidden",

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
    !cursor-pointer !px-[6px] !py-[5px]
    !text-[13px] !text-[#24364d]
    ${
      isSelected
        ? "!bg-[#e7f7ed]"
        : isFocused
          ? "!bg-[#f2faf5]"
          : "!bg-white"
    }
  `,
};
const TableselectClassNames = {
  control: ({
    isFocused,
    isDisabled,
  }: {
    isFocused: boolean;
    isDisabled: boolean;
  }) => `
    !min-h-[25px] !h-[30px] !rounded-[4px] !border-none
    !shadow-none !text-[13px]
    hover:!border-[#aab8c5]
    ${isDisabled ? "!bg-[#f6f8fa]" : "!bg-white"}
    ${isFocused ? "!border-[#91a7b9]" : "!border-[#cfd7df]"}
  `,

  valueContainer: () =>
    "!h-[23px] !py-0 !px-[5px] !overflow-hidden",

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
    !cursor-pointer !px-[6px] !py-[5px]
    !text-[13px] !text-[#24364d]
    ${
      isSelected
        ? "!bg-[#e7f7ed]"
        : isFocused
          ? "!bg-[#f2faf5]"
          : "!bg-white"
    }
  `,
};

const selectProps = {
  isSearchable: false,
  isClearable: false,
  placeholder: "",
  classNames: selectClassNames,
  menuPosition: "fixed" as const,
  menuPortalTarget:
    typeof document !== "undefined" ? document.body : undefined,
  styles: {
    menuPortal: (base: object) => ({
      ...base,
      zIndex: 999999,
    }),
  },
};

const TableselectProps = {
  isSearchable: false,
  isClearable: false,
  placeholder: "",
  classNames: TableselectClassNames,
  menuPosition: "fixed" as const,
  menuPortalTarget:
    typeof document !== "undefined" ? document.body : undefined,
  styles: {
    menuPortal: (base: object) => ({
      ...base,
      zIndex: 999999,
    }),
  },
};
const FieldLabel: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => (
  <div className="flex h-7.5 items-center justify-end bg-[#fafbfc] pr-3 text-[14px] text-[#405066]">
    {children}
  </div>
);

const cell = "h-[28px] border border-[#B7ECD0] px-2";

type YearCloseStatusPageProps = {
  currentUser?: string;
  onClose?: () => void;
};

const YearCloseStatusPage: React.FC<YearCloseStatusPageProps> = ({
  currentUser = "ADMIN",
  onClose,
}) => {
  const [year, setYear] = useState<Option | null>(
    yearOptions.find((o) => o.value === String(currentYear)) ??
      yearOptions[0]
  );

  const [savedRows, setSavedRows] =
    useState<BranchStatus[]>(loadBranchStatuses);

  const [rows, setRows] =
    useState<BranchStatus[]>(loadBranchStatuses);

  const [activeIndex, setActiveIndex] = useState(0);

  const emptyCount = Math.max(0, MIN_ROWS - rows.length);

  const changedRows = rows.filter(
    (row, index) => row.status !== savedRows[index]?.status
  );

  const handleYearChange = (option: Option | null) => {
    setYear(option);

    // Load the statuses for the selected year.
    // Replace this with your year-specific API call.
    const fresh = loadBranchStatuses();

    setSavedRows(fresh);
    setRows(fresh);
    setActiveIndex(0);
  };

  const handleStatusChange = (
    index: number,
    status: StatusValue
  ) => {
    setRows((prev) =>
      prev.map((row, i) => {
        if (i !== index) return row;

        const original = savedRows[index];

        // Restore the original user and date if the
        // status is changed back to its saved value.
        if (original && status === original.status) {
          return { ...original };
        }

        return {
          ...row,
          status,
          userId: currentUser,
          userDate: todayText(),
        };
      })
    );
  };

  const handleSave = () => {
    const changes = rows
      .map((row, index) => ({ row, index }))
      .filter(
        ({ row, index }) =>
          row.status !== savedRows[index]?.status
      )
      .map(({ row }) => ({
        branch: row.branch,
        status: row.status,
        userId: row.userId,
        userDate: row.userDate,
      }));

    console.log({
      year: year?.value,
      statuses: changes,
    });

    // Call your save API here.
    // After a successful API call, update saved rows.
    setSavedRows(rows.map((row) => ({ ...row })));
  };

  const handleCancel = () => {
    setRows(savedRows.map((row) => ({ ...row })));
  };

  const handleClose = () => {
    const fresh = loadBranchStatuses();

    setSavedRows(fresh);
    setRows(fresh);

    setYear(
      yearOptions.find(
        (o) => o.value === String(currentYear)
      ) ?? yearOptions[0]
    );

    setActiveIndex(0);
    onClose?.();
  };

  return (
    <div className="flex min-h-screen w-full items-start justify-center bg-white px-4 py-4">
      <div className="min-h-fit w-205 max-w-full bg-white p-0">
        <main className="w-full overflow-hidden border border-[#d5dce2] bg-white">
          {/* Header */}
          <header className="flex h-7.5 items-center justify-start bg-[#9fdfbc]">
            <h1 className="m-0 ml-3.5 text-[17px] font-semibold text-[#24364d]">
              Year Close Status
            </h1>
          </header>

          <section className="px-3.5 pb-6 pt-3">
            {/* Year */}
            <div className="flex items-center gap-3">
              <FieldLabel>Year :</FieldLabel>

              <div className="w-35">
                <Select<Option, false>
                  inputId="lkpYear"
                  instanceId="lkpYear"
                  components={selectComponents}
                  options={yearOptions}
                  value={year}
                  onChange={handleYearChange}
                  {...selectProps}
                />
              </div>
            </div>

            {/* Branch Status Grid */}
            <div className="mt-3 h-65.4 overflow-auto border border-[#B7ECD0] bg-white">
              <table className="w-full table-fixed border-collapse text-[12px] text-[#24364d]">
                <colgroup>
                  <col className="w-5.5" />
                  <col className="w-57.5" />
                  <col className="w-35" />
                  <col className="w-50" />
                  <col />
                </colgroup>

                <thead className="sticky top-0 z-0">
                  <tr className="bg-[#EEFBF4] text-[#405066]">
                    <th className="h-7 border border-[#B7ECD0]" />

                    <th className="h-7 border border-[#B7ECD0] px-2 text-left font-normal">
                      Branch
                    </th>

                    <th className="h-7 border border-[#B7ECD0] px-2 text-left font-normal">
                      Status
                    </th>

                    <th className="h-7 border border-[#B7ECD0] px-2 text-left font-normal">
                      User ID
                    </th>

                    <th className="h-7 border border-[#B7ECD0] px-2 text-left font-normal">
                      User Date
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {rows.map((row, index) => {
                    const active = index === activeIndex;

                    const changed =
                      row.status !== savedRows[index]?.status;

                    return (
                      <tr
                        key={row.branch}
                        onClick={() => setActiveIndex(index)}
                        className={
                          active ? "bg-white" : "bg-white"
                        }
                      >
                        {/* Active row indicator */}
                        <td className="h-7 border border-[#B7ECD0] bg-[#fafbfc] text-center text-[8px] text-[#405066]">
                          {active ? "▶" : ""}
                        </td>

                        {/* Branch */}
                        <td
                          className={`${cell} ${
                            active ? "bg-white" : ""
                          }`}
                        >
                          {row.branch}
                        </td>

                        {/* Status - React Select */}
                        <td
                          className={`border border-[#B7ECD0] p-0 ${
                            changed ? "bg-[#f2faf5]" : ""
                          }`}
                          onClick={(event) =>
                            event.stopPropagation()
                          }
                        >
                          <Select<Option, false>
                            aria-label={`Status for ${row.branch}`}
                            inputId={`status-${index}`}
                            instanceId={`status-${index}`}
                            components={selectComponents}
                            options={statusOptions}
                            value={
                              statusOptions.find(
                                (option) =>
                                  option.value === row.status
                              ) ?? null
                            }
                            onFocus={() =>
                              setActiveIndex(index)
                            }
                            onChange={(option) => {
                              if (option) {
                                handleStatusChange(
                                  index,
                                  option.value as StatusValue
                                );
                              }
                            }}
                            {...TableselectProps}
                            
                          />
                        </td>

                        {/* User ID */}
                        <td className={cell}>
                          {row.userId}
                        </td>

                        {/* User Date */}
                        <td className={cell}>
                          {row.userDate}
                        </td>
                      </tr>
                    );
                  })}

                  {/* Empty filler rows */}
                  {Array.from(
                    { length: emptyCount },
                    (_, index) => (
                      <tr
                        key={`empty-${index}`}
                        className="bg-white"
                      >
                        <td className="h-7 border border-[#B7ECD0] bg-[#fafbfc]" />
                        <td className={cell} />
                        <td className={cell} />
                        <td className={cell} />
                        <td className={cell} />
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>

            {/* Actions */}
            <div className="mt-5 flex justify-center gap-3">
              <button
                id="btnSave"
                type="button"
                onClick={handleSave}
                disabled={changedRows.length === 0}
                className="btn-style disabled:cursor-not-allowed disabled:opacity-60"
              >
                <u>S</u>ave
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

export default YearCloseStatusPage;
