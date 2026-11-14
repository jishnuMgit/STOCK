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
import { getSession } from "../../../utils/session";
import type {
  MatchReversalRow,
  GetMatchAccountsParams,
} from "../../../hooks/useMatchReversal";
import MatchHeader from "./MatchReversalHeader";
import MatchTable from "./MatchReversalTable";
import MatchFooter from "./MatchReversalFooter";
import type {
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

  rows: MatchReversalRow[];
  toggleSelect: (rowIndex: number, value: boolean) => void;
  onDocumentSelect: (brId: string, docNo: string) => void;
  getMatchAccounts: (
    params: GetMatchAccountsParams,
  ) => Promise<Record<string, any>[]>;

  onSave: () => void;
  clearForm: () => void;
  onSearch: (data?: any[]) => void;
  gstrCoID?: string;
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

const MatchReversalComponents = forwardRef<MatchingComponentsRef, Props>(
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
      toggleSelect,
      onDocumentSelect,
      getMatchAccounts,
      onSave,
      clearForm,
      onSearch,
      gstrCoID = import.meta.env.VITE_CO_ID ?? "",
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

    const { divisionOptionsLocal, divisionLoading, getDiv } = useMatching();

    const [documentNoOptions, setDocumentNoOptions] = useState<
      DocumentOption[]
    >([]);

    const resetResults = useCallback(() => {
      setDocumentNoOptions([]);
      onSearch([]); // parent clears searchResults, receiptNo and the table rows
    }, [onSearch]);

    const hasDivisions = divisionOptionsLocal.length > 0;

    // a division is mandatory only when the customer has divisions
    const canSearch =
      customerId.trim() !== "" &&
      !divisionLoading &&
      (!hasDivisions || divisionId.trim() !== "");

    useEffect(() => {
      setDocumentNoOptions([]);
      onSearch([]);
    }, [customerId, divisionId]); // eslint-disable-line react-hooks/exhaustive-deps

    /* =====================================================
     TABLE FIELD ORDER
     (the only keyboard-navigable cell is the Un-Match checkbox)
     ===================================================== */

    const tableFieldOrder = ["select"] as TableField[];

    /* =====================================================
     FOCUS HELPERS
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
        const currentIndex = tableFieldOrder.indexOf(field);

        // Next field in the current row.
        if (currentIndex < tableFieldOrder.length - 1) {
          focusTableField(rowIndex, tableFieldOrder[currentIndex + 1]);
          return;
        }

        // First field in the next row.
        const nextRow = rowIndex + 1;

        if (nextRow < rows.length) {
          focusTableField(nextRow, tableFieldOrder[0]);
          return;
        }

        // Last cell → Note.
        focusNote();
      },
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [rows.length, focusTableField, focusNote],
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
        setDivisionId(""); // NEW

        const customer = customerOptions.find((option) => option.value === id);
        setCustomerName(customer?.label ?? "");

        await getDiv(id);
      },
      [
        resetResults,
        customerOptions,
        setCustomerId,
        setCustomerName,
        setDivisionId, // NEW
        getDiv,
      ],
    );

    /* =====================================================
     CUSTOMER NAME → CUSTOMER ID
     ===================================================== */

    const handleCustomerNameChange = useCallback(
      async (name: string) => {
        resetResults();
        setCustomerName(name);
        setDivisionId(""); // NEW

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
        setDivisionId, // NEW
        getDiv,
      ],
    );

    /* =====================================================
     DOCUMENT NO. → LOAD MATCHED LINES (GetTL)
     ===================================================== */

    const handleDocNoChange = useCallback(
      (docNo: string) => {
        setReceiptNo(docNo);

        const option = documentNoOptions.find((o) => o.value === docNo);

        if (option && docNo) {
          onDocumentSelect(option.brId, docNo);
        }
      },
      [documentNoOptions, setReceiptNo, onDocumentSelect],
    );

    /* =====================================================
 REVERSE MATCH → untick every row (mark all as un-matched)
 ===================================================== */

    const handleReverseMatch = useCallback(() => {
      rows.forEach((row, index) => {
        if (!row.select) toggleSelect(index, true);
      });
      focusSave(); // move to the Reverse (save) button
    }, [rows, toggleSelect, focusSave]);

    /* =====================================================
     SEARCH
     ===================================================== */

    const handleSearch = useCallback(async () => {
      if (!customerId.trim()) {
        console.warn("Please select 'Customer'");
        return;
      }

      // a division is mandatory only when the customer has divisions
      if (divisionLoading) return;
      if (hasDivisions && !divisionId.trim()) {
        console.warn("Please select 'Division'");
        return;
      }

      try {
        const data = await getMatchAccounts({
          strDocType: type,
          strCSAccountID: customerId,
          strDivID: divisionId,
          year: getSession().pstrYear,
        });

        const searchResults: any[] = Array.isArray(data) ? data : [];
        onSearch(searchResults);

        const options: DocumentOption[] = searchResults
          .filter(
            (item: any) => item.fdocno && String(item.fdocno).trim() !== "",
          )
          .map((item: any) => ({
            value: String(item.fdocno ?? ""),
            label: String(item.fdocno ?? ""),
            brId: String(item.fbrid ?? ""),
            date: String(item.fdate ?? ""),
            docType: String(item.fdoctype ?? ""),
            docNo: String(item.fdocno ?? ""),
            docTypeNo:
              String(item.fdoctypeno ?? "").trim() || String(item.fdocno ?? ""),
            debit: String(item.fdebit ?? "0.00"),
            credit: String(item.fcredit ?? "0.00"),
            description: String(item.fdescription ?? ""),
          }));

        setDocumentNoOptions(options);
      } catch (error) {
        alert(
          error instanceof Error
            ? error.message
            : "Failed to load matched documents",
        );
      }
    }, [
      type,
      customerId,
      divisionId,
      hasDivisions,
      divisionLoading,
      gstrCoID,
      getMatchAccounts,
      onSearch,
    ]);

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
        if (id === "lkpDivision") {
          return Math.round(divisionRef.current?.getBoundingClientRect().width ?? 300);
        }
        return documentMode ? 530 : 360;
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
          canSearch={canSearch}
          divisionLoading={divisionLoading}
          handleCustomerIdChange={handleCustomerIdChange}
          handleCustomerNameChange={handleCustomerNameChange}
          handleDocNoChange={handleDocNoChange}
          handleSearch={handleSearch}
          renderSelect={renderSelect}
          handleKeyboardAction={handleKeyboardAction}
        />

        <MatchTable
          rows={rows}
          toggleSelect={toggleSelect}
          onReverseMatch={handleReverseMatch}
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

MatchReversalComponents.displayName = "MatchReversalComponents";

export default MatchReversalComponents;
