import React, { useState } from "react";

import type { SelectOption, DocumentOption } from "./types";
import Select, {
  components,
  type FormatOptionLabelMeta,
  type MenuListProps,
  type SelectInstance,
  type StylesConfig,
} from "react-select";
import SelectDropdownIndicator from "../../common/SelectDropdownIndicator";
import { useNavigate } from "react-router-dom";
import CloseButton from "../../common/CloseButton";
import type { TableSelectOption } from "../../common/CommonTableSelect";
import CommonTableSelect from "../../common/CommonTableSelect";

export interface MatchHeaderProps {
  branch: string;
  setBranch: React.Dispatch<React.SetStateAction<string>>;

  type: string;
  setDocType: React.Dispatch<React.SetStateAction<string>>;

  receiptNo: string;
  // setReceiptNo: React.Dispatch<React.SetStateAction<string>>;

  receiptDate: string;
  setReceiptDate: React.Dispatch<React.SetStateAction<string>>;

  customerId: string;
  setCustomerId: React.Dispatch<React.SetStateAction<string>>;

  customerName: string;
  setCustomerName: React.Dispatch<React.SetStateAction<string>>;

  divisionId: string;
  setDivisionId: React.Dispatch<React.SetStateAction<string>>;

  branchOptions: SelectOption[];
  customerOptions: SelectOption[];
  customerNameOptions: SelectOption[];
  divisionOptions: SelectOption[];
  documentOptions: SelectOption[];
  documentNoOptions: DocumentOption[];

  documentAmount: number;
  totalMatchAmount: number;
  balance: number;

  customerIdRef: React.RefObject<HTMLDivElement | null>;
  customerNameRef: React.RefObject<HTMLDivElement | null>;
  divisionRef: React.RefObject<HTMLDivElement | null>;
  creditDocumentRef: React.RefObject<HTMLDivElement | null>;
  documentNoRef: React.RefObject<HTMLDivElement | null>;
  dateRef: React.RefObject<HTMLInputElement | null>;
  canSearch?: boolean;

  handleDocNoChange: (docNo: string) => void;

  divisionLoading: boolean;

  handleCustomerIdChange: (id: string) => void | Promise<void>;
  handleCustomerNameChange: (name: string) => void | Promise<void>;
  handleSearch: () => void | Promise<void>;

  renderSelect: (
    id: string,
    value: string,
    options: SelectOption[],
    onChange: (value: string) => void,
    next: () => void,
    selectRef: React.RefObject<HTMLDivElement | null>,
    reverseDropdown?: boolean,
    columnHeaders?: [string, string],
    customStyles?: StylesConfig<SelectOption, false>,
    disabled?: boolean,
    documentMode?: boolean,
    swapColumns?: boolean,
  ) => React.ReactNode;

  handleKeyboardAction?: (...args: never[]) => void;
}

// ============================================================
// DIVISION SELECT (same as MatchHeader)
// control shows the NAME; menu = [ Div. Name | Div. ID ]
// ============================================================

const ID_COL_WIDTH = 110;

const divName = (o: SelectOption) =>
  (o as SelectOption & { name?: string }).name ?? o.label;

const menuRowBorder = "1px solid #cfcfcf";

type DivisionSelectProps = {
  value: string;
  options: SelectOption[];
  onChange: (id: string) => void;
  next: () => void;
  boxRef: React.RefObject<HTMLDivElement | null>;
  disabled: boolean;
};

const DivisionSelect: React.FC<DivisionSelectProps> = ({
  value,
  options,
  onChange,
  next,
  boxRef,
  disabled,
}) => {
  const selectRef = React.useRef<SelectInstance<TableSelectOption, false>>(null);
  const [boxWidth, setBoxWidth] = useState(300);
  const [menuOpen, setMenuOpen] = useState(false);

  const rows = React.useMemo<TableSelectOption[]>(
    () => options.map((o) => ({ ...o, divName: divName(o) })),
    [options],
  );
  const selected = rows.find((o) => o.value === value) ?? null;

  const filter = (option: { data: TableSelectOption }, input: string) => {
    const text = input.trim().toLowerCase();
    if (!text) return true;
    return (
      option.data.value.toLowerCase().includes(text) ||
      String(option.data.divName).toLowerCase().includes(text)
    );
  };

  return (
    <div
      ref={boxRef}
      tabIndex={-1}
      onFocus={(e) => {
        if (e.target === e.currentTarget) selectRef.current?.focus();
      }}
      className="min-w-0 flex-1 outline-none"
    >
      <CommonTableSelect
        selectRef={selectRef}
        inputId="lkpDivision"
        value={selected}
        options={rows}
        columns={[
          { key: "divName", label: "Div. Name", width: `${boxWidth}px` },
          { key: "value", label: "Div. ID", width: "1fr" },
        ]}
        valueKey="divName"
        placeholder="Select..."
        width="100%"
        menuWidth={`${boxWidth + ID_COL_WIDTH}px`}
        controlHeight={29}
        controlFontSize="14px"
        headerFontSize="13px"
        borderColor="#d7dee7"
        hoverBorderColor="#9fdfbc"
        menuZIndex={9999}
        menuMaxHeight="260px"
        menuPortalTarget={typeof document !== "undefined" ? document.body : undefined}
        filterOption={filter}
        isDisabled={disabled}
        onChange={(option) => {
          if (!option) return;
          onChange(option.value);
          setTimeout(next, 0);
        }}
        onMenuOpen={() => {
          setMenuOpen(true);
          const w = boxRef.current?.getBoundingClientRect().width;
          if (w) setBoxWidth(Math.round(w));
        }}
        onMenuClose={() => setMenuOpen(false)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !menuOpen && value) {
            event.preventDefault();
            next();
          }
        }}
      />
    </div>
  );
};

const MatchReversalHeader: React.FC<MatchHeaderProps> = ({
  customerId,
  customerName,
  divisionId,
  receiptNo,

  setDivisionId,

  customerOptions,
  customerNameOptions,
  divisionOptions,
  documentNoOptions,

  divisionLoading,

  documentAmount,

  customerIdRef,
  customerNameRef,
  divisionRef,
  documentNoRef,
  dateRef,
  canSearch = true,

  handleDocNoChange,

  handleCustomerIdChange,
  handleCustomerNameChange,
  handleSearch,

  renderSelect,
}) => {
  /* loader state for the Search button */
  const [searching, setSearching] = useState(false);

  const runSearch = async () => {
    if (searching) return;

    setSearching(true);
    try {
      await handleSearch();
    } finally {
      setSearching(false);
    }
  };

  const navigate = useNavigate();

  return (
    <>
      {/* TITLE */}
      <div className="flex h-9 items-center border-b border-slate-300 bg-[#a3dfc0] pr-2">
        <span className="px-3 text-[17px] font-semibold text-slate-700">
          Match Reversal
        </span>

        <div className="ml-auto">
          <CloseButton onClose={() => navigate("/")} />
        </div>
      </div>

      {/* HEADER */}
      <div className="px-6.75 pt-6 pb-3">
        {/* HEADER ROW 1 */}
        <div
          className="
            grid
            grid-cols-[100px_154px_520px_1fr]
            items-center
            gap-x-2.5
            mb-1.25
            max-[1200px]:grid-cols-[100px_minmax(154px,1fr)_minmax(300px,1fr)]
            max-[1200px]:gap-x-2
            max-[900px]:grid-cols-1
            max-[900px]:gap-y-1.5
          "
        >
          <label className="text-right text-black font-semibold text-[14px] whitespace-nowrap">
            Customer :
          </label>

          {/* CUSTOMER ID */}
          {renderSelect(
            "lkpCustomerID",
            customerId,
            customerOptions,
            handleCustomerIdChange,
            () => customerNameRef.current?.focus(),
            customerIdRef,
            false,
            ["Account ID", "Account Name"],
          )}

          {/* CUSTOMER NAME */}
          {renderSelect(
            "lkpCustomerName",
            customerName,
            customerNameOptions,
            handleCustomerNameChange,
            () => divisionRef.current?.focus(),
            customerNameRef,
            true,
            ["Account Name", "Account ID"],
          )}

          {/* DOCUMENT AMOUNT */}
          <div className="flex items-center justify-end gap-2">
            <label className="whitespace-nowrap text-black font-semibold text-[14px]">
              Document Amt. :
            </label>

            <div
              id="txtDocAmt"
              className="
                flex
                h-7.25
                w-28.75
                shrink-0
                items-center
                justify-end
                rounded-xs
                border
                border-[#aebdca]
                bg-white
                px-2
                text-[13px]
                text-[#00a83b]
              "
            >
              {documentAmount.toFixed(2)}
            </div>

            <span className="text-[#00a83b]">Cr.</span>
          </div>
        </div>

        {/* HEADER ROW 2
            same columns as Row 1: Division + Search share the
            Customer ID + Customer Name span */}
        <div
          className="
            grid
            grid-cols-[100px_154px_520px_1fr]
            items-center
            gap-x-2.5
            mb-1.25
            max-[1200px]:grid-cols-[100px_minmax(154px,1fr)_minmax(300px,1fr)]
            max-[1200px]:gap-x-2
            max-[900px]:grid-cols-1
            max-[900px]:gap-y-1.5
          "
        >
          {/* DIVISION */}
          <label className="text-right text-black font-semibold text-[14px]">
            Division :
          </label>

          <div className="flex items-center col-span-2 gap-24.5">
            <DivisionSelect
              value={divisionId}
              options={divisionOptions}
              onChange={setDivisionId}
              boxRef={divisionRef}
              disabled={
                !customerId || divisionLoading || divisionOptions.length === 0
              }
              next={() => {
                const btn = document.getElementById(
                  "Searchbtn",
                ) as HTMLButtonElement | null;
                if (btn && !btn.disabled) btn.focus();
                else documentNoRef.current?.focus();
              }}
            />

            {/* SEARCH */}
            <button
              id="Searchbtn"
              type="button"
              aria-busy={searching}
              className={`
                ml-1.5
                flex
                h-7.25
                w-26
                items-center
                justify-center
                rounded-[3px]
                border
                border-[#b7c7d7]
                bg-linear-to-b
                from-white
                to-[#e7eef5]
                px-3.5
                text-[13px]
                text-slate-700
                hover:from-white
                hover:to-[#dce8f1]
                focus:border-[#9fdfbc]
                focus:outline-none
                focus:ring-1
                focus:ring-[#9fdfbc]
                disabled:cursor-not-allowed
                disabled:opacity-50
                disabled:hover:from-white
                disabled:hover:to-[#e7eef5]
                ${searching ? "cursor-wait" : ""}
              `}
              onClick={runSearch}
              onKeyDown={async (event) => {
                if (event.key !== "Enter" || !canSearch) return;
                event.preventDefault();
                await runSearch();
                documentNoRef.current?.focus();
              }}
            >
              {searching ? (
                <span
                  className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-300 border-t-[#00a83b]"
                  role="status"
                  aria-label="Searching"
                />
              ) : (
                "Search"
              )}
            </button>
          </div>
        </div>

        {/* HEADER ROW 3 */}
        <div
          className="
            grid
            grid-cols-[100px_154px_1fr]
            items-center
            gap-x-2.5
            max-[1200px]:grid-cols-[100px_154px_minmax(180px,1fr)]
            max-[1200px]:gap-x-2
            max-[900px]:grid-cols-1
            max-[900px]:gap-y-1.5
          "
        >
          {/* DOCUMENT NO */}
          <label className="text-right whitespace-nowrap text-black font-semibold text-[14px]">
            Document No. :
          </label>

          <div>
            {renderSelect(
              "lkpDocTypeNo.",
              receiptNo,
              documentNoOptions,
              handleDocNoChange,
              () => dateRef.current?.focus(),
              documentNoRef,
              false,
              undefined,
              undefined,
              false,
              true,
            )}
          </div>

          <div />
        </div>
      </div>
    </>
  );
};

export default MatchReversalHeader;
