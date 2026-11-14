import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

import Select, {
  components,
  type OptionProps,
  type StylesConfig,
} from "react-select";

import {
  handleKeyboardAction,
  focusElement,
} from "../../../hooks/useMatchKeyboard";

import useMatching from "../../../hooks/useMatching";
import { getSession } from "../../../utils/session"; // adjust path if needed
import MatchHeader from "./MatchHeader";
import MatchTable from "./MatchTable";
import MatchFooter from "./MatchFooter";

import type {
  ReceiptRow,
  TableField,
  SelectOption,
  DocumentOption,
  MatchingComponentsRef,
} from "./types";
import SelectDropdownIndicator from "../../common/SelectDropdownIndicator";
import CommonTableSelect, { type TableSelectOption } from "../../common/CommonTableSelect";

interface Props {
  branch: string;
  setBranch: React.Dispatch<React.SetStateAction<string>>;
  type: string;
  setDocType: React.Dispatch<React.SetStateAction<string>>;
  receiptNo: string;
  setReceiptNo: React.Dispatch<React.SetStateAction<string>>;
  receiptDate: string;
  setReceiptDate: React.Dispatch<React.SetStateAction<string>>;
  customerId: string;
  setCustomerId: React.Dispatch<React.SetStateAction<string>>;
  customerName: string;
  setCustomerName: React.Dispatch<React.SetStateAction<string>>;
  divisionId: string;
  setDivisionId: React.Dispatch<React.SetStateAction<string>>;
  rows: ReceiptRow[];
  handleRowChange: (
    rowIndex: number,
    field: keyof ReceiptRow,
    value: string | number | boolean,
  ) => void;
  onSave: () => void;
  clearForm: () => void;
  onSearch: (data?: any[]) => void;
  branchOptions: SelectOption[];
  customerOptions: SelectOption[];
  customerNameOptions: SelectOption[];
  divisionOptions: SelectOption[];
  documentOptions: SelectOption[];
  documentAmount: number;
  totalMatchAmount: number;
  balance: number;
}

interface ResponsiveSelectProps {
  id: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  next: () => void;
  selectRef: React.RefObject<HTMLDivElement | null>;
  reverseDropdown?: boolean;
  columnHeaders?: [string, string];
  disabled?: boolean;
  documentMode?: boolean;
  getMenuWidth: () => number;
}

const ResponsiveSelect = ({
  id,
  value,
  options,
  onChange,
  next,
  selectRef,
  reverseDropdown = false,
  columnHeaders,
  disabled = false,
  documentMode = false,
  getMenuWidth,
}: ResponsiveSelectProps) => {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [selectWidth, setSelectWidth] = useState("100%");
  const [menuWidth, setMenuWidth] = useState(() => getMenuWidth());

  React.useEffect(() => {
    const element = wrapperRef.current;
    if (!element) return;

    const updateWidth = () => {
      const width = element.getBoundingClientRect().width;
      if (width > 0) setSelectWidth(`${width}px`);
    };

    updateWidth();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(updateWidth);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const columns = React.useMemo(() => {
    if (documentMode) {
      return [
        { key: "docTypeNo", label: "Document No.", width: "150px" },
        { key: "date", label: "Date", width: "105px" },
        { key: "brId", label: "Br. ID", width: "60px" },
        { key: "debit", label: "Debit", width: "100px", align: "right" as const },
        { key: "credit", label: "Credit", width: "1fr", align: "right" as const },
      ];
    }
    if (columnHeaders) {
      return reverseDropdown
        ? [
          { key: "value", label: columnHeaders[0], width: "1fr" },
          { key: "label", label: columnHeaders[1], width: "140px" },
        ]
        : [
          { key: "value", label: columnHeaders[0], width: "140px" },
          { key: "label", label: columnHeaders[1], width: "1fr" },
        ];
    }
    return [{ key: "value", label: "", width: "1fr" }];
  }, [documentMode, columnHeaders, reverseDropdown]);

  const selected = options.find((option) => option.value === value) ?? null;

  return (
    <div
      id={id}
      ref={(element) => {
        wrapperRef.current = element;
        (selectRef as React.MutableRefObject<HTMLDivElement | null>).current =
          element;
      }}
      tabIndex={-1}
      onFocus={(event) => {
        if (event.target !== event.currentTarget) return;
        wrapperRef.current?.querySelector<HTMLInputElement>("input")?.focus();
      }}
      onKeyDown={(event) => {
        if (event.defaultPrevented) return;
        handleKeyboardAction(event, { onEnter: next });
      }}
      style={
        {
          "--select-width": selectWidth,
          width: "100%",
          outline: "none",
        } as React.CSSProperties
      }
    >
      <CommonTableSelect
        inputId={`${id}-input`}
        value={selected as TableSelectOption | null}
        options={options as TableSelectOption[]}
        columns={columns}
        valueKey={documentMode ? "docTypeNo" : "value"}
        width="100%"
        menuWidth={`${menuWidth}px`}
        controlHeight={30}
        controlFontSize="14px"
        headerFontSize="13px"
        borderColor="#9fdfbc"
        hoverBorderColor="#9fdfbc"
        menuZIndex={9999}
        isDisabled={disabled}
        isSearchable={!disabled}
        onMenuOpen={() => setMenuWidth(getMenuWidth())}
        onChange={(option) => onChange(option?.value ?? "")}
      />
    </div>
  );
};

const TABLE_FIELD_ORDER: TableField[] = [
  "brId",
  "date",
  "docNo",
  "description",
  "docAmount",
  "debit",
  "credit",
  "match",
  "matchAmount",
];

// MatchTable stores the Document Amount ref under "docAmt"
const refKey = (field: TableField) =>
  field === "docAmount" ? "docAmt" : field;

const MatchingComponents = forwardRef<MatchingComponentsRef, Props>(
  (props, ref) => {
    const {
      branch,
      setBranch,
      type,
      setDocType,
      receiptNo,
      setReceiptNo,
      receiptDate,
      setReceiptDate,
      customerId,
      setCustomerId,
      customerName,
      setCustomerName,
      divisionId,
      setDivisionId,
      rows,
      handleRowChange,
      onSave,
      clearForm,
      onSearch,
      branchOptions,
      customerOptions,
      customerNameOptions,
      documentOptions,
      documentAmount,
      totalMatchAmount,
      balance,
    } = props;

    /* =====================================================
     REFS
     ===================================================== */

    const customerIdRef = useRef<HTMLDivElement | null>(null);
    const customerNameRef = useRef<HTMLDivElement | null>(null);
    const divisionRef = useRef<HTMLDivElement | null>(null);
    const creditDocumentRef = useRef<HTMLDivElement | null>(null);
    const documentNoRef = useRef<HTMLDivElement | null>(null);
    const dateRef = useRef<HTMLInputElement | null>(null);
    const noteRef = useRef<HTMLInputElement | null>(null);
    const tableRefs = useRef<Record<string, HTMLElement | null>>({});
    const actionRefs = useRef<(HTMLButtonElement | null)[]>([]);

    /* =====================================================
     MATCHING API
     ===================================================== */

    const { divisionOptionsLocal, divisionLoading, getDiv, getMatchAccounts } =
      useMatching();

    const [documentNoOptions, setDocumentNoOptions] = useState<
      DocumentOption[]
    >([]);

    const resetResults = useCallback(() => {
      setDocumentNoOptions([]);
      onSearch([]); // MatchPage clears searchResults, receiptNo and the table rows
    }, [onSearch]);

    const canSearch = type.trim() !== "" && customerId.trim() !== "";

    useEffect(() => {
      setDocumentNoOptions([]);
      onSearch([]); // MatchPage clears searchResults, receiptNo and the table rows
    }, [customerId, type, divisionId]); // eslint-disable-line react-hooks/exhaustive-deps

    /* =====================================================
     FOCUS HELPERS
     (order matters: focusNote must be defined before
      focusNextTableCell, which depends on it)
     ===================================================== */

    const focusCustomerId = useCallback(() => {
      requestAnimationFrame(() => {
        customerIdRef.current?.focus();
      });
    }, []);

    const focusNote = useCallback(() => {
      requestAnimationFrame(() => {
        noteRef.current?.focus();
      });
    }, []);

    const focusSave = useCallback(() => {
      requestAnimationFrame(() => {
        actionRefs.current[0]?.focus();
      });
    }, []);

    const focusTableField = useCallback(
      (rowIndex: number, field: TableField) => {
        // MatchTable uses "docAmt" for the Document Amount input ref.
        const refField = field === "docAmount" ? "docAmt" : field;
        const element =
          tableRefs.current[`${rowIndex}-${field}`] ??
          tableRefs.current[`${rowIndex}-${refField}`];

        if (element) {
          focusElement(element);
        }
      },
      [],
    );

    // Find the next usable cell, starting at (startRow, startField).
    // Skips filler rows and disabled cells; if nothing is left, go to Note.
    const focusNextTableCell = useCallback(
      (startRow: number, startField: number) => {
        for (let r = startRow; r < rows.length; r++) {
          if (!rows[r].raw) continue; // blank filler row

          for (
            let f = r === startRow ? startField : 0;
            f < TABLE_FIELD_ORDER.length;
            f++
          ) {
            const element = tableRefs.current[
              `${r}-${refKey(TABLE_FIELD_ORDER[f])}`
            ] as HTMLInputElement | null | undefined;

            if (element && !element.disabled) {
              focusElement(element);
              return;
            }
          }
        }

        focusNote();
      },
      [rows, focusNote],
    );

    /* =====================================================
     EXPOSE METHODS TO THE PARENT
     ===================================================== */

    useImperativeHandle(
      ref,
      () => ({
        focusCustomerId,
        focusTableField,
        focusNote,
        focusSave,
      }),
      [focusCustomerId, focusTableField, focusNote, focusSave],
    );

    /* =====================================================
     TABLE KEYBOARD NAVIGATION
     ===================================================== */

    const handleTableEscape = useCallback(() => {
      focusNote();
    }, [focusNote]);

    const handleTableEnter = useCallback(
      (rowIndex: number, field: TableField) => {
        focusNextTableCell(rowIndex, TABLE_FIELD_ORDER.indexOf(field) + 1);
      },
      [focusNextTableCell],
    );

    const handleTableKeyDown = (
      event: React.KeyboardEvent,
      rowIndex: number,
      field: TableField,
    ) => {
      handleKeyboardAction(event, {
        onEnter: () => handleTableEnter(rowIndex, field),
        onEscape: handleTableEscape,
      });
    };

    /* =====================================================
     CUSTOMER ID → CUSTOMER NAME
     ===================================================== */

    const handleCustomerIdChange = useCallback(
      async (id: string) => {
        resetResults();
        setCustomerId(id);
        const customer = customerOptions.find((option) => option.value === id);
        setCustomerName(customer?.label ?? "");
        await getDiv(id);
      },
      [resetResults, customerOptions, setCustomerId, setCustomerName, getDiv],
    );

    const handleCustomerNameChange = useCallback(
      async (name: string) => {
        resetResults();
        setCustomerName(name);

        const customer = customerNameOptions.find(
          (option) => option.value === name,
        );

        const accountId = customer?.label ?? "";
        setCustomerId(accountId);
        await getDiv(accountId);
      },
      [
        resetResults,
        customerNameOptions,
        setCustomerId,
        setCustomerName,
        getDiv,
      ],
    );

    /* =====================================================
     SEARCH
     ===================================================== */

    const handleSearch = useCallback(async () => {
      if (!customerId.trim()) {
        console.warn("Please select 'Customer'");
        return;
      }

      // Company, year and user are also sent as x- headers by apiFetch.
      // The year is passed in the body too, read from the login session.
      const data = await getMatchAccounts({
        // strDocType: type,
        strCSAccountID: customerId,
        strDivID: divisionId,
        year: getSession().pstrYear,
      });

      const searchResults: any[] = Array.isArray(data) ? data : [];
      onSearch(searchResults);

      const options: DocumentOption[] = searchResults
        .filter((item: any) => item.fdocno && String(item.fdocno).trim() !== "")
        .map((item: any) => ({
          value: String(item.fdocno ?? ""), // unchanged: used for selection
          label: String(item.fdocno ?? ""),
          brId: String(item.fbrid ?? ""),
          date: String(item.fdate ?? ""),
          docType: String(item.fdoctype ?? ""),
          docNo: String(item.fdocno ?? ""),
          // display text, e.g. "BR RH-26000003"; falls back to fdocno when null
          docTypeNo:
            String(item.fdoctypeno ?? "").trim() || String(item.fdocno ?? ""),
          debit: String(item.fdebit ?? "0.00"),
          credit: String(item.fcredit ?? "0.00"),
          description: String(item.fdescription ?? ""),
        }));

      setDocumentNoOptions(options);
    }, [type, customerId, divisionId, getMatchAccounts, onSearch]);

    /* =====================================================
     SELECT STYLES
     ===================================================== */

    const selectStyles: StylesConfig<SelectOption, false> = {
      control: (base, state) => ({
        ...base,
        minHeight: "30px",
        height: "30px",
        borderRadius: "4px",
        border: "1px solid #9fdfbc",
        boxShadow: "none",
        fontSize: "14px",
        outline: "none",
        backgroundColor: "#ffffff",

        "&:hover": {
          borderColor: "#9fdfbc",
        },

        ...(state.isFocused && {
          borderColor: "#9fdfbc",
          boxShadow: "0 0 0 1px #9fdfbc",
        }),
      }),

      valueContainer: (base) => ({
        ...base,
        height: "30px",
        padding: "0 8px",
      }),

      indicatorsContainer: (base) => ({
        ...base,
        height: "30px",
      }),

      dropdownIndicator: (base) => ({
        ...base,
        padding: "4px",
      }),

      clearIndicator: (base) => ({
        ...base,
        padding: "4px",
      }),

      menu: (base) => ({
        ...base,
        zIndex: 9999,
        fontSize: "14px",
        width: "min(520px, calc(100vw - 24px))",
        minWidth: "min(360px, calc(100vw - 24px))",
        maxWidth: "calc(100vw - 24px)",
        left: 0,
      }),

      menuList: (base) => ({
        ...base,
        padding: 0,
        maxWidth: "100%",
        overflowX: "hidden",
      }),

      option: (base, state) => ({
        ...base,
        fontSize: "14px",
        padding: "6px 8px",
        backgroundColor: state.isFocused ? "#EEF8F3" : "#ffffff",
        color: "#222",
        cursor: "pointer",
      }),
    };

    /* Customer ID dropdown: from the left edge of the Account ID box to the
       right edge of the Account Name box (measured when the menu opens). */
    const customerIdStyles: StylesConfig<SelectOption, false> = {
      ...selectStyles,
      menu: (base) => {
        const idBox = customerIdRef.current?.getBoundingClientRect();
        const nameBox = customerNameRef.current?.getBoundingClientRect();

        const width =
          idBox && nameBox ? Math.max(nameBox.right - idBox.left, 360) : 685;

        return {
          ...base,
          zIndex: 9999,
          fontSize: "14px",
          width,
          minWidth: width,
          maxWidth: "calc(100vw - 24px)",
          left: 0,
        };
      },
    };


    const ID_COLUMN_WIDTH = 140;

    const renderSelect = (
      id: string,
      value: string,
      options: SelectOption[],
      onChange: (value: string) => void,
      next: () => void,
      selectRef: React.RefObject<HTMLDivElement | null>,
      reverseDropdown = false,
      columnHeaders?: [string, string],
      _customStyles?: StylesConfig<SelectOption, false>,
      disabled = false,
      documentMode = false,
      _swapColumns = false,
    ) => {
      const getMenuWidth = () => {
        if (id === "lkpCustomerID") {
          const idBox = customerIdRef.current?.getBoundingClientRect();
          const nameBox = customerNameRef.current?.getBoundingClientRect();
          return idBox && nameBox ? Math.max(nameBox.right - idBox.left, 360) : 685;
        }
        if (id === "lkpCustomerName") return 534 + ID_COLUMN_WIDTH;
        return documentMode ? 520 : 360;
      };

      return (
        <ResponsiveSelect
          id={id}
          value={value}
          options={options}
          onChange={onChange}
          next={next}
          selectRef={selectRef}
          reverseDropdown={reverseDropdown}
          columnHeaders={columnHeaders}
          disabled={disabled}
          documentMode={documentMode}
          getMenuWidth={getMenuWidth}
        />
      );
    };

    /* =====================================================
     FOOTER ACTIONS
     ===================================================== */

    const buttons = ["Save", "Clear"];

    const [activeButton, setActiveButton] = useState(0);

    const focusActionButton = useCallback((index: number) => {
      const button = actionRefs.current[index];

      if (!button) return;

      setActiveButton(index);

      requestAnimationFrame(() => {
        button.focus();
      });
    }, []);

    const executeAction = useCallback(
      (index: number) => {
        switch (index) {
          case 0:
            onSave();
            break;

          case 1:
            clearForm();
            break;

          default:
            break;
        }
      },
      [onSave, clearForm],
    );

    const handleActionKeyDown = (
      event: React.KeyboardEvent<HTMLButtonElement>,
    ) => {
      switch (event.key) {
        case "ArrowRight":
        case "ArrowDown": {
          event.preventDefault();

          focusActionButton(
            activeButton < buttons.length - 1 ? activeButton + 1 : 0,
          );

          break;
        }

        case "ArrowLeft":
        case "ArrowUp": {
          event.preventDefault();

          focusActionButton(
            activeButton > 0 ? activeButton - 1 : buttons.length - 1,
          );

          break;
        }

        case "Enter": {
          event.preventDefault();

          executeAction(activeButton);

          break;
        }
      }
    };

    /* =====================================================
     RENDER
     ===================================================== */

    return (
      <div className="w-full border border-[#9aa4ad] bg-white font-sans text-[13px] text-slate-700">
        <MatchHeader
          branch={branch}
          setBranch={setBranch}
          type={type}
          setDocType={setDocType}
          receiptNo={receiptNo}
          setReceiptNo={setReceiptNo}
          receiptDate={receiptDate}
          setReceiptDate={setReceiptDate}
          customerId={customerId}
          setCustomerId={setCustomerId}
          customerName={customerName}
          setCustomerName={setCustomerName}
          divisionId={divisionId}
          setDivisionId={setDivisionId}
          branchOptions={branchOptions}
          customerOptions={customerOptions}
          customerNameOptions={customerNameOptions}
          divisionOptions={divisionOptionsLocal}
          documentOptions={documentOptions}
          documentNoOptions={documentNoOptions}
          documentAmount={documentAmount}
          totalMatchAmount={totalMatchAmount}
          balance={balance}
          customerIdRef={customerIdRef}
          customerNameRef={customerNameRef}
          divisionRef={divisionRef}
          creditDocumentRef={creditDocumentRef}
          documentNoRef={documentNoRef}
          dateRef={dateRef}
          divisionLoading={divisionLoading}
          handleCustomerIdChange={handleCustomerIdChange}
          handleCustomerNameChange={handleCustomerNameChange}
          handleSearch={handleSearch}
          onDateEnter={() => focusNextTableCell(0, 0)}
          renderSelect={renderSelect}
          handleKeyboardAction={handleKeyboardAction}
          canSearch={canSearch}
        />

        <MatchTable
          rows={rows}
          handleRowChange={handleRowChange}
          tableRefs={tableRefs}
          handleTableKeyDown={handleTableKeyDown}
        />

        <MatchFooter
          noteRef={noteRef}
          focusSave={focusSave}
          documentAmount={documentAmount}
          totalMatchAmount={totalMatchAmount}
          balance={balance}
          buttons={buttons}
          actionRefs={actionRefs}
          setActiveButton={setActiveButton}
          handleActionKeyDown={handleActionKeyDown}
          executeAction={executeAction}
        />
      </div>
    );
  },
);

MatchingComponents.displayName = "MatchingComponents";

export default MatchingComponents;
