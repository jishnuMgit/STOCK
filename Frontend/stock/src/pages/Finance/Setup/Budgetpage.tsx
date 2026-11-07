import React, { useState } from "react";
import Select from "react-select";
import dayjs from "dayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import selectComponents from "../../../components/common/selectComponents";

/* =====================================================================
   FILE MAP
   1. Types, constants and sample data
   2. Shared building blocks (Combo, NumberCell, ScrollGrid ...)
   3. Parts : BudgetHeader (year, head type, branch), BudgetGrid
              (account lines, months, row totals, column totals),
              BudgetFooter (Copy, Save ... Close, Saved By)
   4. BudgetPage : owns the state and renders the parts
   ===================================================================== */

/* ---------------------------------------------------------------------
   1. TYPES, CONSTANTS AND SAMPLE DATA
   --------------------------------------------------------------------- */
type Option = { value: string; label: string };

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const MIN_ROWS = 14;

/* Replace these with data from your API */
const headTypeOptions: Option[] = [
  { value: "REVENUE", label: "Revenue" },
  { value: "EXPENSE", label: "Expense" },
];
const branchOptions: Option[] = [
  { value: "JEDDAH", label: "JEDDAH" },
  { value: "RIYADH", label: "RIYADH" },
];

type Account = { id: string; name: string };

const accountsByHeadType: Record<string, Account[]> = {
  REVENUE: [
    { id: "3101001", name: "TICKET COMMISSION EARNED" },
    { id: "3101003", name: "HOTEL SERVICE  CHARGE" },
    { id: "3102002", name: "INCENTIVE FROM GDS" },
    { id: "3106001", name: "DISCOUNT PAID" },
  ],
  EXPENSE: [
    { id: "4103024", name: "OFFICE RENT" },
    { id: "4103031", name: "PTT - TELEPHONE and INTERNET" },
    { id: "4103015", name: "UTILITY EXPENSES" },
    { id: "4103033", name: "STATIONERY" },
    { id: "4103017", name: "INSURANCE CHARGES" },
    { id: "4103002", name: "AUDIT FEES" },
    { id: "4103011", name: "COMPUTER MAINTENANCE" },
    { id: "4103010", name: "CAR RUNNING COST" },
    { id: "4103014", name: "COURRIER EXPENSES" },
    { id: "4103023", name: "OFFICE CLEANING CHARGES" },
    { id: "4103034", name: "SUBSCRIPTION" },
    { id: "4103036", name: "SOFTWARE DEVELOPMENT" },
    { id: "4103022", name: "MARKETING EXPENSES" },
  ],
};

type BudgetRow = {
  key: number;
  accountId: string | null;
  months: string[]; // 12 values, "" when empty
};

type SavedBudget = {
  lines: { accountId: string; months: number[] }[];
  savedBy: string;
};

const flat = (amount: number) => Array<number>(12).fill(amount);

/* Sample saved budgets. Replace with an API call that uses the year,
   head type and branch. */
const sampleBudgets: Record<string, SavedBudget> = {
  REVENUE: {
    savedBy: "ADMIN 16/06/2026 14:25:00",
    lines: [
      {
        accountId: "3101001",
        months: [68000, 59500, 89250, 56865, 51000, 62385, 68000, 59500, 59500, 59500, 61625, 61625],
      },
      { accountId: "3101003", months: flat(38500) },
      { accountId: "3102002", months: flat(25000) },
      { accountId: "3106001", months: flat(3000) },
    ],
  },
  EXPENSE: {
    savedBy: "ADMIN 12/06/2026 13:40:00",
    lines: [
      { accountId: "4103024", months: flat(14583) },
      { accountId: "4103031", months: flat(4100) },
      { accountId: "4103015", months: flat(100) },
      { accountId: "4103033", months: flat(1000) },
      { accountId: "4103017", months: flat(600) },
      { accountId: "4103002", months: flat(3500) },
      { accountId: "4103011", months: flat(1000) },
      { accountId: "4103010", months: flat(1600) },
      { accountId: "4103014", months: flat(75) },
      { accountId: "4103023", months: flat(1375) },
      { accountId: "4103034", months: flat(1766) },
      { accountId: "4103036", months: flat(1500) },
      { accountId: "4103022", months: flat(1700) },
    ],
  },
};

let keyCounter = 0;
const nextKey = () => ++keyCounter;

const emptyRow = (): BudgetRow => ({
  key: nextKey(),
  accountId: null,
  months: Array<string>(12).fill(""),
});

const isEmptyRow = (row: BudgetRow) =>
  !row.accountId && row.months.every((m) => m === "");

/** keeps one empty row at the end and at least MIN_ROWS rows in total */
const padRows = (rows: BudgetRow[]): BudgetRow[] => {
  const result = [...rows];
  if (result.length === 0 || !isEmptyRow(result[result.length - 1])) {
    result.push(emptyRow());
  }
  while (result.length < MIN_ROWS) result.push(emptyRow());
  return result;
};

const buildRows = (headType: string | null): BudgetRow[] =>
  padRows(
    (headType ? sampleBudgets[headType]?.lines ?? [] : []).map((line) => ({
      key: nextKey(),
      accountId: line.accountId,
      months: line.months.map(String),
    })),
  );

const toNumber = (value: string) => {
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatAmount = (value: number) =>
  value.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

const rowTotal = (row: BudgetRow) =>
  row.months.reduce((total, m) => total + toNumber(m), 0);

/* ---------------------------------------------------------------------
   2. SHARED BUILDING BLOCKS
   --------------------------------------------------------------------- */
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
    "!mt-[1px] !rounded-none !border !border-[#cfd7df] !z-[999999] !shadow-md ",
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

/* select that fills a grid cell (no border) */
const cellSelectProps = {
  ...selectProps,
  classNames: {
    ...selectClassNames,
    control: ({ isFocused }: { isFocused: boolean }) => `
      !min-h-[26px] !h-[26px] !rounded-none !border-0 !shadow-none !text-[12px]
      !bg-transparent
      ${isFocused ? "!bg-white !ring-1 !ring-inset !ring-[#91a7b9]" : ""}
    `,
    valueContainer: () => "!h-[26px] !py-0 !px-[8px] !overflow-hidden",
    singleValue: () => "!m-0 !text-[12px] !text-[#24364d]",
    indicatorsContainer: () => "!h-[26px]",
    option: ({
      isFocused,
      isSelected,
    }: {
      isFocused: boolean;
      isSelected: boolean;
    }) => `
      !cursor-pointer !px-[6px] !py-[4px] !text-[12px] !text-[#24364d]
      ${isSelected ? "!bg-[#e7f7ed]" : isFocused ? "!bg-[#f2faf5]" : "!bg-white"}
    `,
  },
};

/* slim green scrollbar (Chrome, Edge, Safari) */
const niceScrollbar = [
  "[&::-webkit-scrollbar]:h-2.5",
  "[&::-webkit-scrollbar]:w-2.5",
  "[&::-webkit-scrollbar-track]:bg-[#f2f8f4]",
  "[&::-webkit-scrollbar-thumb]:rounded-full",
  "[&::-webkit-scrollbar-thumb]:border-2",
  "[&::-webkit-scrollbar-thumb]:border-solid",
  "[&::-webkit-scrollbar-thumb]:border-[#f2f8f4]",
  "[&::-webkit-scrollbar-thumb]:bg-[#9fdfbc]",
  "[&::-webkit-scrollbar-thumb:hover]:bg-[#64d96e]",
  "[&::-webkit-scrollbar-thumb:active]:bg-[#4cc45a]",
  "[&::-webkit-scrollbar-corner]:bg-[#f2f8f4]",
].join(" ");

/** label + control on one line */
const LabeledCombo: React.FC<{
  id: string;
  label: string;
  options: Option[];
  value: string | null;
  onChange: (value: string | null) => void;
  className?: string;
}> = ({ id, label, options, value, onChange, className = "" }) => (
  <div className="flex min-w-0 items-center gap-2">
    <label
      htmlFor={id}
      className="shrink-0 whitespace-nowrap text-right text-[12px] text-[#405066]"
    >
      {label}
    </label>
    <div className={`min-w-0 ${className}`}>
      <Select
        inputId={id}
        instanceId={id}
        components={selectComponents}
        options={options}
        value={options.find((o) => o.value === value) ?? null}
        onChange={(option) => onChange(option?.value ?? null)}
        {...selectProps}
      />
    </div>
  </div>
);

/** amount cell: raw text while editing, 1,234 style when you leave it */
const NumberCell: React.FC<{
  label: string;
  value: string;
  onFocus: () => void;
  onChange: (value: string) => void;
}> = ({ label, value, onFocus, onChange }) => {
  const [focused, setFocused] = useState(false);
  const shown =
    focused || value === "" ? value : formatAmount(toNumber(value));

  return (
    <input
      aria-label={label}
      inputMode="decimal"
      value={shown}
      onFocus={(event) => {
        setFocused(true);
        onFocus();
        event.target.select();
      }}
      onBlur={() => setFocused(false)}
      onChange={(event) => {
        if (/^\d*\.?\d{0,2}$/.test(event.target.value)) onChange(event.target.value);
      }}
      className="h-6.5 w-full bg-transparent px-2 text-right text-[12px] text-[#24364d] outline-none focus:bg-white focus:ring-1 focus:ring-inset focus:ring-[#91a7b9]"
    />
  );
};

/* ----- ScrollGrid: header fixed, rows scroll with the bar beside them,
        totals fixed under the rows, horizontal bar along the bottom ----- */
type GridColumn<R> = {
  id: string;
  header: string;
  width?: string; // tailwind width class; omit for the one flexible column
  align?: "left" | "right" | "center";
  cellClass?: string; // default "p-0" (editor fills the cell)
  render: (row: R, index: number) => React.ReactNode;
  total?: boolean; // shows a totals box under this column
};

const SCROLLBAR_GUTTER = "w-[10px]"; // same as the 10px bar in niceScrollbar

const alignClass = {
  left: "text-left",
  right: "text-right",
  center: "text-center",
};

const thClass =
  "h-[28px] border border-[#B7ECD0] bg-[#fafbfc] px-2 font-normal text-[#405066]";

const gridTableClass =
  "w-full table-fixed border-collapse text-[12px] text-[#24364d]";

function ScrollGrid<R>({
  columns,
  rows,
  getKey,
  activeKey,
  onActivate,
  totals,
  rowsHeightClass,
  minWidthClass,
}: {
  columns: GridColumn<R>[];
  rows: R[];
  getKey: (row: R) => number;
  activeKey: number | null;
  onActivate: (key: number) => void;
  totals: Record<string, number>;
  rowsHeightClass: string;
  minWidthClass: string;
}) {
  const cols = (gutter: boolean) => (
    <colgroup>
      <col className="w-5" />
      {columns.map((c) => (
        <col key={c.id} className={c.width} />
      ))}
      {gutter && <col className={SCROLLBAR_GUTTER} />}
    </colgroup>
  );

  return (
    /* horizontal scrollbar: at the bottom of the whole grid */
    <div
      className={`overflow-x-auto border border-[#B7ECD0] bg-white ${niceScrollbar}`}
    >
      <div className={minWidthClass}>
        {/* header (fixed) */}
        <table className={gridTableClass}>
          {cols(true)}
          <thead>
            <tr>
              <th className={thClass} />
              {columns.map((c) => (
                <th
                  key={c.id}
                  className={`${thClass} ${alignClass[c.align ?? "left"]}`}
                >
                  {c.header}
                </th>
              ))}
              <th className={`${thClass} p-0`} />
            </tr>
          </thead>
        </table>

        {/* rows (vertical scrollbar sits beside them) */}
        <div
          className={`${rowsHeightClass} overflow-x-hidden overflow-y-scroll bg-white ${niceScrollbar}`}
        >
          <table className={gridTableClass}>
            {cols(false)}
            <tbody>
              {rows.map((row, index) => {
                const key = getKey(row);
                const active = key === activeKey;
                return (
                  <tr
                    key={key}
                    onClick={() => onActivate(key)}
                    className="bg-white"
                  >
                    <td className="h-6.5 border border-[#B7ECD0] bg-[#fafbfc] text-center text-[8px] text-[#405066]">
                      {active ? "▶" : ""}
                    </td>
                    {columns.map((c) => (
                      <td
                        key={c.id}
                        className={`h-6.5 border border-[#B7ECD0] ${c.cellClass ?? "p-0"}`}
                      >
                        {c.render(row, index)}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* totals (fixed under the rows) */}
        <table className={gridTableClass}>
          {cols(true)}
          <tfoot>
            <tr>
              <td className="border border-[#B7ECD0] bg-[#eef1f4]" />
              {columns.map((c) =>
                c.total ? (
                  <td
                    key={c.id}
                    className="border border-[#B7ECD0] bg-[#eef1f4] p-0.75"
                  >
                    <input
                      id={`txtTotal-${c.id}`}
                      readOnly
                      tabIndex={-1}
                      aria-label={`Total ${c.header}`}
                      value={formatAmount(totals[c.id] ?? 0)}
                      className="h-7.5 w-[105%] -ml-0.5 rounded-[3px] border border-[#cfd7df] bg-white px-2 text-right text-[12px] text-[#24364d] outline-none"
                    />
                  </td>
                ) : (
                  <td
                    key={c.id}
                    className="border border-[#B7ECD0] bg-[#eef1f4]"
                  />
                ),
              )}
              <td className="border border-[#B7ECD0] bg-[#eef1f4] p-0" />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------
   3. PARTS
   --------------------------------------------------------------------- */

/* 3a. Header: year, budget head type, branch */
const BudgetHeader: React.FC<{
  year: string;
  onYearChange: (value: string) => void;
  headType: string | null;
  onHeadTypeChange: (value: string | null) => void;
  branch: string | null;
  onBranchChange: (value: string | null) => void;
}> = ({
  year,
  onYearChange,
  headType,
  onHeadTypeChange,
  branch,
  onBranchChange,
}) => (
  <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2.5">
    
<div className="flex items-center gap-2">
  <label
    htmlFor="txtYear"
    className="shrink-0 text-right text-[12px] text-[#405066]"
  >
    Year :
  </label>

  <LocalizationProvider dateAdapter={AdapterDayjs}>
    <DatePicker
      views={["year"]}
      openTo="year"
      format="YYYY"
      value={year ? dayjs(`${year}-01-01`) : null}
      onChange={(value) =>
        onYearChange(value?.isValid() ? value.format("YYYY") : "")
      }
      slotProps={{
        textField: {
          id: "txtYear",
          size: "small",
          sx: {
            width: "82px",

            "& .MuiPickersInputBase-root": {
              height: "30px !important",
              minHeight: "30px !important",
              fontSize: "12px",
            },

            "& .MuiPickersOutlinedInput-root": {
              height: "30px !important",
              minHeight: "30px !important",
            },

            "& .MuiPickersInputBase-sectionsContainer": {
              padding: "0 4px",
            },

            "& .MuiPickersSectionList-root": {
              padding: "0 !important",
              fontSize: "12px",
            },

            "& .MuiInputBase-input": {
              padding: "3px 4px !important",
              fontSize: "12px",
            },

            "& .MuiInputAdornment-root": {
              marginLeft: "0px",
            },

            "& .MuiIconButton-root": {
              width: "20px",
              height: "20px",
              padding: "2px",
            },

            "& .MuiSvgIcon-root": {
              fontSize: "15px",
            },
          },
        },
      }}
    />
  </LocalizationProvider>
</div>


    <LabeledCombo
      id="lkpBudgetHeadType"
      label="Budget Head Type :"
      options={headTypeOptions}
      value={headType}
      onChange={onHeadTypeChange}
      className="w-55"
    />

    <LabeledCombo
      id="lkpBranch"
      label="Branch :"
      options={branchOptions}
      value={branch}
      onChange={onBranchChange}
      className="w-55"
    />
  </div>
);

/* 3b. Grid: account id, account name, 12 months, row total, column totals */
const BudgetGrid: React.FC<{
  rows: BudgetRow[];
  headType: string | null;
  activeKey: number | null;
  onActivate: (key: number) => void;
  onAccountChange: (key: number, accountId: string | null) => void;
  onMonthChange: (key: number, month: number, value: string) => void;
}> = ({
  rows,
  headType,
  activeKey,
  onActivate,
  onAccountChange,
  onMonthChange,
}) => {
  const accounts = headType ? accountsByHeadType[headType] ?? [] : [];
  const nameOf = (id: string | null) =>
    accounts.find((a) => a.id === id)?.name ?? "";

  const columns: GridColumn<BudgetRow>[] = [
    {
      id: "accountId",
      header: "Account ID",
      width: "w-[120px]",
      render: (row) => {
        // an account already used in another line is not offered again
        const options = accounts
          .filter(
            (a) =>
              a.id === row.accountId ||
              !rows.some((r) => r.key !== row.key && r.accountId === a.id),
          )
          .map((a): Option => ({ value: a.id, label: `${a.id}  ${a.name}` }));
        return (
          <Select
            inputId={`lkpAccount-${row.key}`}
            instanceId={`lkpAccount-${row.key}`}
            aria-label="Account ID"
              components={selectComponents}
            options={options}
            value={
              row.accountId
                ? { value: row.accountId, label: row.accountId }
                : null
            }
            onFocus={() => onActivate(row.key)}
            onChange={(option) => onAccountChange(row.key, option?.value ?? null)}
            {...cellSelectProps}
          />
        );
      },
    },
    {
      id: "accountName",
      header: "Account Name",
      cellClass: "px-2",
      render: (row) => nameOf(row.accountId),
    },
    ...MONTHS.map(
      (month, index): GridColumn<BudgetRow> => ({
        id: `m${index}`,
        header: month,
        width: "w-[78px]",
        align: "right",
        total: true,
        render: (row) => (
          <NumberCell
            label={`${month} amount`}
            value={row.months[index]}
            onFocus={() => onActivate(row.key)}
            onChange={(value) => onMonthChange(row.key, index, value)}
          />
        ),
      }),
    ),
    {
      id: "total",
      header: "Total",
      width: "w-[80px]",
      align: "right",
      total: true,
      cellClass: "bg-[#eef1f4] px-2 text-right",
      render: (row) => (isEmptyRow(row) ? "" : formatAmount(rowTotal(row))),
    },
  ];

  const totals: Record<string, number> = {};
  MONTHS.forEach((_, index) => {
    totals[`m${index}`] = rows.reduce(
      (total, row) => total + toNumber(row.months[index]),
      0,
    );
  });
  totals.total = rows.reduce((total, row) => total + rowTotal(row), 0);

  return (
    <ScrollGrid
      columns={columns}
      rows={rows}
      getKey={(row) => row.key}
      activeKey={activeKey}
      onActivate={onActivate}
      totals={totals}
      rowsHeightClass="max-h-[min(440px,calc(100vh-300px))]"
      minWidthClass="min-w-[1400px]"
    />
  );
};

/* 3c. Footer: Copy on the left, the main buttons in the middle,
       "Saved By" on the right */
const BudgetFooter: React.FC<{
  savedBy: string;
  onCopy: () => void;
  onSave: () => void;
  onDelete: () => void;
  onPrint: () => void;
  onCancel: () => void;
  onClose: () => void;
}> = ({ savedBy, onCopy, onSave, onDelete, onPrint, onCancel, onClose }) => (
  <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
    <button id="btnCopy" type="button" onClick={onCopy} className="btn-style">
      Copy
    </button>

    <div className="flex flex-wrap justify-center gap-2">
      <button id="btnSave" type="button" onClick={onSave} className="btn-style">
        <u>S</u>ave
      </button>
      <button
        id="btnDelete"
        type="button"
        onClick={onDelete}
        className="btn-style"
      >
        <u>D</u>elete
      </button>
      <button
        id="btnPrint"
        type="button"
        onClick={onPrint}
        className="btn-style"
      >
        <u>P</u>rint
      </button>
      <button
        id="btnCancel"
        type="button"
        onClick={onCancel}
        className="btn-style"
      >
        <u>C</u>ancel
      </button>
      <button
        id="btnClose"
        type="button"
        onClick={onClose}
        className="btn-style"
      >
        Cl<u>o</u>se
      </button>
    </div>

    <span className="min-w-50 text-right text-[12px] text-[#7a8794]">
      {savedBy ? `Saved By : ${savedBy}` : ""}
    </span>
  </div>
);

/* ---------------------------------------------------------------------
   4. MAIN PAGE : owns the state and renders the parts
   --------------------------------------------------------------------- */
type BudgetPageProps = {
  /** user id written into "Saved By" after a save */
  currentUser?: string;
  onCopy?: () => void;
  onPrint?: () => void;
  onClose?: () => void;
};

const BudgetPage: React.FC<BudgetPageProps> = ({
  currentUser = "ADMIN",
  onCopy,
  onPrint,
  onClose,
}) => {
  const [year, setYear] = useState(String(new Date().getFullYear())); // txtYear
  const [headType, setHeadType] = useState<string | null>("REVENUE"); // lkpBudgetHeadType
  const [branch, setBranch] = useState<string | null>("JEDDAH"); // lkpBranch

  const [rows, setRows] = useState<BudgetRow[]>(() => buildRows("REVENUE"));
  const [activeKey, setActiveKey] = useState<number | null>(null);
  const [savedBy, setSavedBy] = useState(
    () => sampleBudgets.REVENUE?.savedBy ?? "",
  );
  const [error, setError] = useState("");

  /* Loads the saved budget of the chosen head type. Replace with an API call
     that also uses the year and the branch. */
  const reload = (nextHeadType: string | null) => {
    const fresh = buildRows(nextHeadType);
    setRows(fresh);
    setActiveKey(fresh[0]?.key ?? null);
    setSavedBy(nextHeadType ? sampleBudgets[nextHeadType]?.savedBy ?? "" : "");
    setError("");
  };

  const handleHeadTypeChange = (value: string | null) => {
    setHeadType(value);
    reload(value);
  };

  const updateRow = (key: number, patch: (row: BudgetRow) => BudgetRow) =>
    setRows((prev) =>
      padRows(prev.map((row) => (row.key === key ? patch(row) : row))),
    );

  const handleSave = () => {
    if (year.length !== 4 || !headType || !branch) {
      setError("Enter the year and select the budget head type and branch.");
      return;
    }
    const lines = rows.filter((row) => !isEmptyRow(row));
    if (lines.length === 0) {
      setError("Add at least one account line.");
      return;
    }
    if (lines.some((row) => !row.accountId)) {
      setError("Every line needs an account.");
      return;
    }
    setError("");
    console.log({
      year: Number(year),
      headType,
      branch,
      lines: lines.map((row) => ({
        accountId: row.accountId,
        months: row.months.map(toNumber),
        total: rowTotal(row),
      })),
    });
    setSavedBy(`${currentUser} ${dayjs().format("DD/MM/YYYY HH:mm:ss")}`);
  };

  // Delete removes the highlighted account line
  const handleDelete = () => {
    if (activeKey === null) return;
    setRows((prev) => padRows(prev.filter((row) => row.key !== activeKey)));
    setActiveKey(null);
  };

  const handlePrint = () => {
    console.log("print budget", { year, headType, branch });
    onPrint?.();
  };

  const handleCopy = () => {
    console.log("copy budget", { year, headType, branch });
    onCopy?.();
  };

  // Cancel throws away the changes and reloads the saved budget
  const handleCancel = () => reload(headType);

  const handleClose = () => {
    setYear(String(new Date().getFullYear()));
    setHeadType("REVENUE");
    setBranch("JEDDAH");
    reload("REVENUE");
    onClose?.();
  };

  return (
    <div className="flex min-h-screen w-full items-start justify-center bg-white px-4 py-4">
      <div className="min-h-fit w-full max-w-362.5 bg-white p-0">
        <main className="w-full overflow-hidden border border-gray-400 bg-white">
          <header className="flex h-7.5 items-center justify-start bg-[#9fdfbc]">
            <h1 className="m-0 ml-3.5 text-[17px] font-semibold text-[#24364d]">
              Budget
            </h1>
          </header>

          <section className="flex flex-col gap-3 px-3.5 pb-6 pt-3">
            <BudgetHeader
              year={year}
              onYearChange={(value) => {
                setYear(value);
                setError("");
              }}
              headType={headType}
              onHeadTypeChange={handleHeadTypeChange}
              branch={branch}
              onBranchChange={(value) => {
                setBranch(value);
                reload(headType);
              }}
            />

            <BudgetGrid
              rows={rows}
              headType={headType}
              activeKey={activeKey}
              onActivate={setActiveKey}
              onAccountChange={(key, accountId) => {
                setError("");
                updateRow(key, (row) => ({ ...row, accountId }));
              }}
              onMonthChange={(key, month, value) => {
                setError("");
                updateRow(key, (row) => ({
                  ...row,
                  months: row.months.map((m, i) => (i === month ? value : m)),
                }));
              }}
            />

            {error && (
              <p role="alert" className="m-0 text-[12px] text-[#c0392b]">
                {error}
              </p>
            )}

            <BudgetFooter
              savedBy={savedBy}
              onCopy={handleCopy}
              onSave={handleSave}
              onDelete={handleDelete}
              onPrint={handlePrint}
              onCancel={handleCancel}
              onClose={handleClose}
            />
          </section>
        </main>
      </div>
    </div>
  );
};

export default BudgetPage;