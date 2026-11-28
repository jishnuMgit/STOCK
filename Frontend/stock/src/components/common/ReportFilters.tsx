import React from "react";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs from "dayjs";

import { useAdvanceAfterSelect } from "../../hooks/useAdvanceAfterSelect";
import CommonTableSelect from "./CommonTableSelect";
import CustomLinkedPairSelect, { type PairSelectOption } from "./CustomLinkedPairSelect";
import { CustomRadio, RadioPanel } from "./ReportFormParts";
import Header from "./Header";

// ============================================================
// THE COMMON TEMPLATE OF THE REPORT FORMS
// One set of parts for the filter rows of the report pages, so every report looks and behaves the same (the design
// standard is the Asset Item List page). A page gives the state, the options and the words; the sizes, the radio
// panel, the boxes, the lists, the spacing and the keyboard behaviour are here.
//
//   <ReportForm title="Item Purchase" onKeyDown={handleEnterAsTab} overlay={the print preview}>
//     <BranchFilter mode={rdgBranch} onModeChange={setRdgBranch} options={branchOptions} value={lkpBranch} onChange={setLkpBranch} />
//     <PairFilter name="Item" mode={rdgItem} onModeChange={...} options={itemPairOptions} value={lkpItemID} onChange={setLkpItemID} />
//     <PeriodFilter from={dtpFromDate} to={dtpToDate} onFromChange={...} onToChange={...} />
//     <ReportPrintRow onPrint={handlePrint} />
//   </ReportForm>
//
// The names of the boxes (the ids the page focuses and the server reports) follow the project's rule: rdgBranch / lkpBranch,
// rdgItem / lkpItemID / lkpItemName, dtpFromDate / dtpToDate, btnPrint.
// ============================================================

// The space between two boxes on the same row: 5 px, everywhere (the two dates of a Period, the ID box and the Name box of a
// pair, the From and To boxes of a range, a box and the tick box beside it). One value, so it is changed in one place.
export const FILTER_GAP = 5;

// ---------- the form: the card, its header, the section and the 14 px between the rows ----------

export const ReportForm: React.FC<{
  title: string;
  onKeyDown?: React.KeyboardEventHandler;
  // what is drawn over the form (the Print Preview)
  overlay?: React.ReactNode;
  // the width of the label column in px: 150 on every page (the radio panels and the labels are 152 px). A page whose radio
  // text is longer (Ageing of Receivables: "One Parent Account") gives more: the column AND every panel / label of the
  // page get that width, so they all end at the same place and the boxes still line up
  labelWidth?: number;
  children: React.ReactNode;
}> = ({ title, onKeyDown, overlay, labelWidth, children }) => (
  <div onKeyDown={onKeyDown} className="min-h-full w-full bg-white p-1 sm:p-2">
    <main className="mx-auto w-full max-w-220 overflow-hidden rounded-[3px] border border-[#91a7bb] bg-white shadow-sm">
      <Header Name={title} />

      <section className="relative px-3.5 pb-3.5 pt-3.5">
        <div
          className="flex flex-col items-start gap-3.5"
          style={
            labelWidth
              ? ({ "--filter-label": `${labelWidth}px`, "--filter-panel": `${labelWidth}px` } as React.CSSProperties)
              : undefined
          }
        >
          {children}
        </div>
      </section>
    </main>

    {overlay}
  </div>
);

// ---------- a row: the radio panel on the left (150 px column, 16 px gap), its box(es) on the right ----------

export const FilterRow: React.FC<{
  panel: React.ReactNode;
  children?: React.ReactNode;
  // extra classes of the row, e.g. "w-full" to let the row (and what is pushed to its right end) use the whole width
  className?: string;
}> = ({ panel, children, className = "" }) => (
  <div className={`grid grid-cols-[var(--filter-label,150px)_minmax(0,1fr)] items-center gap-x-4 ${className}`}>
    {panel}
    <div className="min-w-0 pt-1">{children}</div>
  </div>
);

// ---------- Branch: One Branch / All Branch and the Branch | ID box ----------

type BranchOption = { value: string; label: string };

// the ID column is 70 px: with the 320 px list (250 px box + 70 px) the ID column starts exactly where the box ends, the divider on its edge
const BRANCH_COLUMNS = [
  { key: "label", label: "Branch", width: "1fr" },
  { key: "value", label: "ID", width: "70px", align: "right" as const },
];

const filterLabelOrValue = (
  option: { label: string; value: string },
  input: string,
) => {
  const text = input.trim().toLowerCase();
  return !text || option.label.toLowerCase().includes(text) || option.value.toLowerCase().includes(text);
};

export const BranchFilter: React.FC<{
  mode: string; // "One Branch" | "All Branch" (rdgBranch)
  onModeChange: (mode: string) => void;
  options: BranchOption[];
  value: BranchOption | null; // lkpBranch
  onChange: (option: BranchOption | null) => void;
  // a third choice, "Selected Branch" (the branches ticked in a list), for the reports that have it
  withSelected?: boolean;
  // Selected Branch: the branches ticked (their ids) and what a tick does
  selectedIds?: string[];
  onTick?: (branchId: string, checked: boolean) => void;
  // "All Branch" cannot be chosen (a company with one branch)
  allDisabled?: boolean;
  // something at the right end of the row, always shown (Customer Sales: "Order By Amount")
  aside?: React.ReactNode;
  // the words in the empty Branch box: "Select Branch" unless the page gives others ("" = none)
  placeholder?: string;
}> = ({ mode, onModeChange, options, value, onChange, withSelected = false, selectedIds = [], onTick, allDisabled = false, aside, placeholder = "Select Branch" }) => {
  const { advanceAfterPick, advanceOnEnter } = useAdvanceAfterSelect();

  const content = (
    <>
      {mode === "One Branch" && (
        <div className="w-62.5 max-w-full" onKeyDown={(event) => advanceOnEnter(event)}>
          <CommonTableSelect
            inputId="lkpBranch"
            options={options}
            value={value}
            onChange={(option) => {
              onChange(option);
              if (option) advanceAfterPick("lkpBranch");
            }}
            columns={BRANCH_COLUMNS}
            width="250px"
            menuWidth="320px"
            placeholder={placeholder}
            filterOption={filterLabelOrValue}
            menuPortalTarget={typeof document !== "undefined" ? document.body : undefined}
            noOptionsMessage={() => "No Branch Found"}
          />
        </div>
      )}
      {withSelected && mode === "Selected Branch" && (
        <div
          id="chkBranchList"
          // 5 branches show; more of them scroll inside the list, so the page below does not move
          className="customer-table-scroll flex max-h-34 w-62.5 max-w-full flex-col gap-1 overflow-y-auto rounded-sm border border-gray-300 bg-white p-2"
        >
          {options.map((option) => (
            <label key={option.value} className="flex items-center gap-2 text-[14px] text-[#172b43]">
              <input
                id={`chkBranch_${option.value}`}
                name="chkBranch"
                type="checkbox"
                checked={selectedIds.includes(option.value)}
                onChange={(event) => onTick?.(option.value, event.target.checked)}
                className="h-4 w-4 accent-[#4ade80]"
              />
              {option.label}
            </label>
          ))}
        </div>
      )}
    </>
  );

  return (
    <FilterRow
      panel={
        <RadioPanel id="rdgBranch" className={`${withSelected ? "h-22.5" : "h-17.5"} w-[var(--filter-panel,9.5rem)]`}>
          <CustomRadio
            name="rdgBranch"
            value="One Branch"
            label="One Branch"
            checked={mode === "One Branch"}
            onChange={() => onModeChange("One Branch")}
          />
          {withSelected && (
            <CustomRadio
              name="rdgBranch"
              value="Selected Branch"
              label="Selected Branch"
              checked={mode === "Selected Branch"}
              onChange={() => onModeChange("Selected Branch")}
            />
          )}
          <CustomRadio
            name="rdgBranch"
            value="All Branch"
            label="All Branch"
            checked={mode === "All Branch"}
            disabled={allDisabled}
            onChange={() => onModeChange("All Branch")}
          />
        </RadioPanel>
      }
    >
      {aside ? (
        <div className="flex min-w-0 items-center justify-between gap-4">
          <div className="min-w-0">{content}</div>
          {aside}
        </div>
      ) : (
        content
      )}
    </FilterRow>
  );
};

// ---------- Branch only: a report that is always for one branch ("Branch :" and the box, no One / All radios) ----------

export const BranchOnlyFilter: React.FC<{
  options: BranchOption[];
  value: BranchOption | null; // lkpBranch
  onChange: (option: BranchOption | null) => void;
}> = ({ options, value, onChange }) => {
  const { advanceAfterPick, advanceOnEnter } = useAdvanceAfterSelect();

  return (
    <div className="grid grid-cols-[var(--filter-label,150px)_minmax(0,1fr)] items-center gap-x-4">
      <FilterLabel>Branch :</FilterLabel>

      <div className="w-62.5 max-w-full" onKeyDown={(event) => advanceOnEnter(event)}>
        <CommonTableSelect
          inputId="lkpBranch"
          options={options}
          value={value}
          onChange={(option) => {
            onChange(option);
            if (option) advanceAfterPick("lkpBranch");
          }}
          columns={BRANCH_COLUMNS}
          width="250px"
          menuWidth="320px"
          placeholder="Select Branch"
          filterOption={filterLabelOrValue}
          menuPortalTarget={typeof document !== "undefined" ? document.body : undefined}
          noOptionsMessage={() => "No Branch Found"}
        />
      </div>
    </div>
  );
};

// ---------- one box: Document, Staff type ... (a list of names only) ----------
// name = "Document" gives the radio "One Document / All Document" (rdgDocument), the box lkpDocument, the list header
// "Document" and no placeholder (blank until a document is picked). The box is 250 px, like the Branch box.

export const SingleFilter: React.FC<{
  name: string;
  mode: string; // "One <name>" | "All <name>"
  onModeChange: (mode: string) => void;
  options: BranchOption[];
  value: BranchOption | null;
  onChange: (option: BranchOption | null) => void;
  // the box is always needed (Finance Document List: "Document :"): a label instead of the One / All radios
  required?: boolean;
}> = ({ name, mode, onModeChange, options, value, onChange, required = false }) => {
  const { advanceAfterPick, advanceOnEnter } = useAdvanceAfterSelect();

  const key = name.replace(/\s+/g, "");
  const one = `One ${name}`;
  const all = `All ${name}`;
  const inputId = `lkp${key}`;

  return (
    <FilterRow
      panel={
        required ? (
          <FilterLabel>{name} :</FilterLabel>
        ) : (
          <RadioPanel id={`rdg${key}`} className="h-17.5 w-[var(--filter-panel,9.5rem)]">
            <CustomRadio
              name={`rdg${key}`}
              value={one}
              label={one}
              checked={mode === one}
              onChange={() => onModeChange(one)}
            />
            <CustomRadio
              name={`rdg${key}`}
              value={all}
              label={all}
              checked={mode === all}
              onChange={() => onModeChange(all)}
            />
          </RadioPanel>
        )
      }
    >
      {(required || mode === one) && (
        <div className="w-62.5 max-w-full" onKeyDown={(event) => advanceOnEnter(event)}>
          <CommonTableSelect
            inputId={inputId}
            options={options}
            value={value}
            onChange={(option) => {
              onChange(option);
              if (option) advanceAfterPick(inputId);
            }}
            columns={[{ key: "label", label: name }]}
            width="250px"
            menuWidth="250px"
            // the list shows up to 11 rows (header 35 px + 11 x 32 px) before it gets a scroll bar
            menuMaxHeight="387px"
            placeholder=""
            menuPortalTarget={typeof document !== "undefined" ? document.body : undefined}
            noOptionsMessage={() => `No ${name} Found`}
          />
        </div>
      )}
    </FilterRow>
  );
};

// ---------- an ID and a Name: Supplier, Item, Cost Center, Customer ... ----------
// name = "Supplier" gives the radio "One Supplier / All Supplier" (rdgSupplier), the boxes lkpSupplierID / lkpSupplierName
// and the list headers "Supplier ID" / "Supplier Name". One record, two boxes: picking from either fills both, and both
// search by ID or by name. The value is the ID ("" = nothing chosen).

export const PairFilter: React.FC<{
  name: string;
  mode: string; // "One <name>" | "All <name>"
  onModeChange: (mode: string) => void;
  options: PairSelectOption[]; // { value: id, firstLabel: id, secondLabel: name }
  value: string;
  onChange: (id: string) => void;
  // the ID box is 120 px; a page whose IDs are long (the Item ID) gives more
  firstWidth?: number;
  // a third choice, "Range <name>": two ID boxes, From and To (lkpFrom<name> / lkpTo<name>); the page gives their values
  range?: {
    from: string;
    to: string;
    onFromChange: (id: string) => void;
    onToChange: (id: string) => void;
    // the wording of the third choice: "Range Item" by default, "Item Range" on a page that has always said that
    label?: string;
  };
  // the row is switched off (its radios greyed, no boxes): the page chose something else (By Item Group / By Item)
  disabled?: boolean;
  // the ids of the radio and of the two boxes, when a page's server or checks already use other ones
  ids?: { radio?: string; first?: string; second?: string };
  // the Name box is 450 px; a row that has something at its right end (aside) gives less
  secondWidth?: number;
  // something at the right end of the row (the end of the form), always shown (Item List: "Sales Below Cost")
  aside?: React.ReactNode;
  // the record is always needed (Item History: "Item :"): a label instead of the One / All radios, the boxes always shown
  required?: boolean;
}> = ({ name, mode, onModeChange, options, value, onChange, firstWidth = 120, range, disabled = false, ids, secondWidth = 450, aside, required = false, }) => {
  const { advanceAfterPick, advanceOnEnter } = useAdvanceAfterSelect();

  const one = `One ${name}`;
  const all = `All ${name}`;
  const rangeMode = range?.label ?? `Range ${name}`;

  // the options of the range boxes: the ID (what the box shows) and the name beside it in the list
  const rangeOptions = options.map((o) => ({ value: o.value, label: o.firstLabel, name: o.secondLabel }));
  const rangeColumns = [
    { key: "label", label: `${name} ID`, width: `${Math.max(firstWidth, 140)}px` },
    { key: "name", label: `${name} Name` },
  ];
  // react-select hands the filter { label, value, data }: the search finds the ID or the name
  const rangeFilter = (option: { label: string; data: { name?: string } }, input: string) => {
    const text = input.trim().toLowerCase();
    return !text || option.label.toLowerCase().includes(text) || String(option.data.name ?? "").toLowerCase().includes(text);
  };
  const key = name.replace(/\s+/g, ""); // "Item Group" -> "ItemGroup": the ids have no spaces
  const radioId = ids?.radio ?? `rdg${key}`;
  const firstId = ids?.first ?? `lkp${key}ID`;
  const secondId = ids?.second ?? `lkp${key}Name`;
  const fromId = `lkpFrom${key}`;
  const toId = `lkpTo${key}`;

  // the boxes the radio chooses
  const content = (
    <>
      {!disabled && (required || mode === one) && (
        <div
          className="w-fit max-w-full"
          // Enter on a closed box moves on; from the ID box it skips the Name box
          onKeyDown={(event) =>
            advanceOnEnter(event, (event.target as HTMLElement).id === firstId ? [secondId] : undefined)
          }
        >
          <CustomLinkedPairSelect
            firstInputId={firstId}
            secondInputId={secondId}
            options={options}
            firstValue={value || null}
            secondValue={value || null}
            firstHeader={`${name} ID`}
            secondHeader={`${name} Name`}
            firstWidth={firstWidth}
            secondWidth={secondWidth}
            gap={FILTER_GAP}
            nameDividerAtBoxEnd // the Name list's ID column starts exactly where the Name box ends (no gap)
            menuZIndex={999999}
            menuPortalTarget={typeof document !== "undefined" ? document.body : undefined}
            headerFontSize="12px"
            onChange={(option) => {
              onChange(option?.value ?? "");
              // after a pick the cursor goes on (from the Name box, so from either box it skips the other)
              if (option) advanceAfterPick(secondId);
            }}
          />
        </div>
      )}
      {!disabled && range && mode === rangeMode && (
        <div
          className="flex flex-wrap items-center"
          style={{ gap: FILTER_GAP }}
          onKeyDown={(event) => advanceOnEnter(event)}
        >
          {(
            [
              { id: fromId, label: "From", value: range.from, set: range.onFromChange },
              { id: toId, label: "To", value: range.to, set: range.onToChange },
            ] as const
          ).map((box) => (
            <CommonTableSelect
              key={box.id}
              inputId={box.id}
              options={rangeOptions}
              value={rangeOptions.find((o) => o.value === box.value) ?? null}
              onChange={(option) => {
                box.set(option?.value ?? "");
                if (option) advanceAfterPick(box.id);
              }}
              columns={rangeColumns}
              width={`${firstWidth}px`}
              menuWidth="560px"
              menuMaxHeight="355px"
              placeholder={box.label}
              filterOption={rangeFilter as never}
              menuPortalTarget={typeof document !== "undefined" ? document.body : undefined}
              noOptionsMessage={() => `No ${name} Found`}
            />
          ))}
        </div>
      )}
    </>
  );

  return (
    <FilterRow
      // a row with something at its right end (aside) uses the whole width, so that it really is at the right end
      className={aside ? "w-full" : ""}
      panel={
        required ? (
          <FilterLabel>{name} :</FilterLabel>
        ) : (
          <RadioPanel id={radioId} className={`${range ? "h-22.5" : "h-17.5"} w-[var(--filter-panel,9.5rem)]`}>
            <CustomRadio
              name={radioId}
              value={one}
              label={one}
              checked={mode === one}
              disabled={disabled}
              onChange={() => onModeChange(one)}
            />
            {range && (
              <CustomRadio
                name={radioId}
                value={rangeMode}
                label={rangeMode}
                checked={mode === rangeMode}
                disabled={disabled}
                onChange={() => onModeChange(rangeMode)}
              />
            )}
            <CustomRadio
              name={radioId}
              value={all}
              label={all}
              checked={mode === all}
              disabled={disabled}
              onChange={() => onModeChange(all)}
            />
          </RadioPanel>
        )
      }
    >
      {aside ? (
        <div className="flex min-w-0 items-center justify-between gap-4">
          <div className="min-w-0">{content}</div>
          {aside}
        </div>
      ) : (
        content
      )}
    </FilterRow>
  );
};

// ---------- the date box: the Asset Item List's, 154 px in its cell ----------

const DATE_FORMAT = "DD-MM-YYYY";

export const ReportDatePicker: React.FC<{
  id: string;
  label: string;
  value: string; // DD-MM-YYYY (MM-YYYY with monthOnly), "" = empty
  onChange: (value: string) => void;
  // a month and a year only (Income Summary: "Up to Month")
  monthOnly?: boolean;
}> = ({ id, label, value, onChange, monthOnly = false }) => (
  <LocalizationProvider dateAdapter={AdapterDayjs}>
    <DatePicker
      value={value ? dayjs(value, monthOnly ? "MM-YYYY" : DATE_FORMAT) : null}
      onChange={(newValue) =>
        onChange(newValue?.isValid() ? newValue.format(monthOnly ? "MM-YYYY" : DATE_FORMAT) : "")
      }
      format={monthOnly ? "MM-YYYY" : DATE_FORMAT}
      views={monthOnly ? ["year", "month"] : ["year", "month", "day"]}
      slotProps={{
        textField: { id, slotProps: { htmlInput: { "aria-label": label } } },
        openPickerButton: { sx: { padding: "2px", margin: 0 } },
        inputAdornment: { sx: { margin: 0, padding: 0 } },
      }}
      sx={{
        width: "100%",
        minWidth: 0,
        "& .MuiPickersTextField-root": { width: "100%" },
        "& .MuiPickersInputBase-root": {
          width: "100%",
          height: "28px",
          minHeight: "28px",
          boxSizing: "border-box",
          borderRadius: "4px",
          backgroundColor: "#ffffff",
          fontSize: "14px",
          padding: 0,
          overflow: "hidden",
        },
        "& .MuiPickersInputBase-sectionsContainer": {
          paddingLeft: "8px !important",
          paddingRight: "0px !important",
          marginBottom: "-5px !important",
          marginLeft: "0px !important",
          boxSizing: "border-box",
          overflow: "hidden",
        },
        "& .MuiPickersInputBase-sectionContent": { fontSize: "14px", color: "#344054" },
        "& .MuiPickersInputBase-input": {
          minWidth: 0,
          width: "100%",
          fontSize: "14px",
          padding: 0,
          height: "28px",
          boxSizing: "border-box",
        },
        "& .MuiInputAdornment-root": { margin: 0, padding: 0 },
        "& .MuiIconButton-root": { width: "22px", height: "22px", padding: "2px", margin: 0 },
        "& .MuiSvgIcon-root": { fontSize: "15px" },
        // blank look (no "DD-MM-YYYY" hint) while empty and not focused
        ...(!value && {
          "&:not(:focus-within) .MuiPickersInputBase-sectionsContainer *": { color: "transparent" },
        }),
        "& .MuiPickersOutlinedInput-notchedOutline": { borderColor: "#B7C7D7 !important" },
        "& .MuiPickersInputBase-root:hover .MuiPickersOutlinedInput-notchedOutline": {
          borderColor: "#B7C7D7 !important",
        },
        "& .MuiPickersInputBase-root.Mui-focused .MuiPickersOutlinedInput-notchedOutline": {
          borderColor: "#B7C7D7 !important",
          borderWidth: "1px",
        },
        "& .MuiPickersInputBase-root.Mui-error .MuiPickersOutlinedInput-notchedOutline": {
          borderColor: "#B7C7D7 !important",
        },
      }}
    />
  </LocalizationProvider>
);

// ---------- the label box on the left of a row that has no radio ("Period :", "Post Status :") ----------

export const FilterLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex h-7.5 w-[var(--filter-panel,9.5rem)] items-center rounded-sm border border-gray-300 bg-[#fafbfc] px-1.75 text-[14px] text-[#172b43]">
    {children}
  </div>
);

// ---------- a label and a small box: "Post Status :", "Ageing Mode :", "Print 0 Balance :" ... ----------
// The box is 140 px, a CommonTableSelect of one column; a page can put more in the row (a tick box).

export const LabelSelectFilter: React.FC<{
  label: string; // "Post Status" (shown as "Post Status :")
  id: string; // lkpPostStatus
  options: BranchOption[];
  value: BranchOption | null;
  onChange: (option: BranchOption | null) => void;
  noOptionsMessage?: string;
  // the box is switched off (Ageing Mode while there is no ageing)
  disabled?: boolean;
  // a list of more than one column (General Ledger Cost Center: "ID | Cost Center"): the columns (their keys are fields of
  // the options), the list width and the search; the box is wider too (boxWidth, 140 px by default)
  columns?: { key: string; label: string; width?: string; align?: "left" | "right" | "center" }[];
  menuWidth?: string;
  boxWidth?: number;
  filterOption?: (option: never, input: string) => boolean;
  // extra classes of the row, e.g. "w-full" so that a child with "ml-auto" goes to the right end of the row
  className?: string;
  children?: React.ReactNode;
}> = ({ label, id, options, value, onChange, noOptionsMessage, disabled = false, columns, menuWidth, boxWidth = 140, filterOption, className = "", children }) => {
  const { advanceAfterPick, advanceOnEnter } = useAdvanceAfterSelect();

  return (
    <div className={`grid grid-cols-[var(--filter-label,150px)_minmax(0,1fr)] items-center gap-x-4 ${className}`}>
      <FilterLabel>{label} :</FilterLabel>

      <div
        className="flex min-w-0 flex-wrap items-center"
        style={{ gap: FILTER_GAP }}
        onKeyDown={(event) => advanceOnEnter(event)}
      >
        <div style={{ width: boxWidth }}>
          <CommonTableSelect
            inputId={id}
            options={options}
            value={value}
            onChange={(option) => {
              onChange(option);
              if (option) advanceAfterPick(id);
            }}
            columns={columns ?? [{ key: "label", label }]}
            showHeader={!!columns}
            isDisabled={disabled}
            width={`${boxWidth}px`}
            menuWidth={menuWidth ?? `${boxWidth}px`}
            filterOption={filterOption as never}
            menuPortalTarget={typeof document !== "undefined" ? document.body : undefined}
            noOptionsMessage={noOptionsMessage ? () => noOptionsMessage : undefined}
          />
        </div>
        {children}
      </div>
    </div>
  );
};

// Post Status (lkpPostStatus): All / Posted / Non Posted
export const PostStatusFilter: React.FC<{
  options: BranchOption[];
  value: BranchOption | null;
  onChange: (option: BranchOption | null) => void;
  // extra classes of the row, e.g. "w-full" so that a child with "ml-auto" goes to the right end of the row
  className?: string;
  children?: React.ReactNode;
}> = ({ options, value, onChange, className, children }) => (
  <LabelSelectFilter label="Post Status" id="lkpPostStatus" options={options} value={value} onChange={onChange} className={className}>
    {children}
  </LabelSelectFilter>
);

// ---------- one date: the label and the date box ("As On Date :") ----------

export const DateFilter: React.FC<{
  label: string; // "As On Date"
  id: string; // dtpAsOnDate
  value: string;
  onChange: (value: string) => void;
}> = ({ label, id, value, onChange }) => (
  <div className="grid grid-cols-[var(--filter-label,150px)_minmax(0,1fr)] items-center gap-x-4">
    <FilterLabel>{label} :</FilterLabel>

    <div className="w-38.5">
      <ReportDatePicker id={id} label={label} value={value} onChange={onChange} />
    </div>
  </div>
);

// ---------- Period: the label and the two dates (dtpFromDate / dtpToDate) ----------

export const PeriodFilter: React.FC<{
  from: string;
  to: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
}> = ({ from, to, onFromChange, onToChange }) => (
  <div className="grid grid-cols-[var(--filter-label,150px)_minmax(0,1fr)] items-center gap-x-4">
    <FilterLabel>Period :</FilterLabel>

    <div className="flex min-w-0 flex-wrap items-center" style={{ gap: FILTER_GAP }}>
      <div className="w-38.5">
        <ReportDatePicker id="dtpFromDate" label="From Date" value={from} onChange={onFromChange} />
      </div>
      <div className="w-38.5">
        <ReportDatePicker id="dtpToDate" label="To Date" value={to} onChange={onToChange} />
      </div>
    </div>
  </div>
);

// ---------- the Print button row ----------

export const ReportPrintRow: React.FC<{
  onPrint: () => void;
  disabled?: boolean;
  // more buttons beside Print (Clear)
  children?: React.ReactNode;
  // extra classes of the row, e.g. "w-full" so that a child with "ml-auto" goes to the right end of the row
  className?: string;
}> = ({ onPrint, disabled = false, children, className = "" }) => (
  <div className={`w-full gap-x-4 ${className}`}>
    <div />
    <div className="flex w-full justify-center  items-center gap-1">
      <button
        id="btnPrint"
        type="button"
        onClick={onPrint}
        disabled={disabled}
        title="Alt+P"
        className="btn-style disabled:cursor-not-allowed disabled:opacity-40"
      >
        <u>P</u>rint
      </button>
      {children}
    </div>
  </div>
);
