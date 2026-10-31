import React, {
  forwardRef,
  useCallback,
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
import type { MatchReversalRow } from "../../../hooks/useMatchReversal";
import MatchHeader from "./MatchReversalHeader";
import MatchTable from "./MatchReversalTable";
import MatchFooter from "./MatchReversalFooter";
import type {
  TableField,
  SelectOption,
  DocumentOption,
  MatchingComponentsRef,
} from "./types";

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
  styles: StylesConfig<SelectOption, false>;
  reverseDropdown?: boolean;
  columnHeaders?: [string, string];
  disabled?: boolean;
  documentMode?: boolean;
  swapColumns?: boolean;
  customOption?: React.ComponentType<OptionProps<SelectOption, false>>;
}

const ResponsiveSelect = ({
  id,
  value,
  options,
  onChange,
  next,
  selectRef,
  styles,
  reverseDropdown = false,
  columnHeaders,
  disabled = false,
  documentMode = false,
  swapColumns = false,
  customOption,
}: ResponsiveSelectProps) => {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [selectWidth, setSelectWidth] = useState("100%");

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

  const CustomSingleValue = (selectProps: any) => {
    const data = selectProps.data as SelectOption & Partial<DocumentOption>;

    if (documentMode) {
      return (
        <components.SingleValue {...selectProps}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "52px 105px 140px 75px 85px minmax(0, 1fr)",
              width: "100%",
              minWidth: 0,
              alignItems: "center",
              fontSize: "14px",
            }}
          >
            <span>{data.brId ?? ""}</span>
            <span>{data.date ?? ""}</span>
            <span>{data.docTypeNo ?? data.docNo ?? data.value ?? ""}</span>
            <span style={{ textAlign: "right", paddingRight: "8px" }}>
              {data.debit ?? ""}
            </span>
            <span style={{ textAlign: "right", paddingRight: "8px" }}>
              {data.credit ?? ""}
            </span>
            <span
              style={{
                overflow: "hidden",
                whiteSpace: "nowrap",
                textOverflow: "ellipsis",
              }}
            >
              {data.description ?? ""}
            </span>
          </div>
        </components.SingleValue>
      );
    }

    return (
      <components.SingleValue {...selectProps}>
        {data.value}
      </components.SingleValue>
    );
  };

  const DefaultOption = (optionProps: OptionProps<SelectOption, false>) => {
    const data = optionProps.data as SelectOption & Partial<DocumentOption>;

    if (documentMode) {
      return (
        <components.Option {...optionProps}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "52px 105px 140px 75px 85px minmax(0, 1fr)",
              width: "100%",
              minWidth: 0,
              alignItems: "center",
              fontSize: "12px",
            }}
          >
            <div>{data.brId ?? ""}</div>
            <div>{data.date ?? ""}</div>
            <div>{data.docTypeNo ?? data.docNo ?? data.value ?? ""}</div>
            <div style={{ textAlign: "right", paddingRight: "8px" }}>
              {data.debit ?? ""}
            </div>
            <div style={{ textAlign: "right", paddingRight: "8px" }}>
              {data.credit ?? ""}
            </div>
            <div
              style={{
                overflow: "hidden",
                whiteSpace: "nowrap",
                textOverflow: "ellipsis",
              }}
            >
              {data.description ?? ""}
            </div>
          </div>
        </components.Option>
      );
    }

    if (!columnHeaders) {
      return (
        <components.Option {...optionProps}>
          <div
            style={{
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              width: "100%",
            }}
          >
            {data.value}
          </div>
        </components.Option>
      );
    }

    const firstColumn = swapColumns ? data.label : data.value;
    const secondColumn = swapColumns ? data.value : data.label;
    return (
      <components.Option {...optionProps}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: reverseDropdown
              ? "minmax(0, 1fr) 132px"
              : "140px minmax(0, 1fr)",
            width: "100%",
            minWidth: 0,
            alignItems: "center",
          }}
        >
          <div
            style={{
              minWidth: 0,
              paddingRight: "8px",
              overflow: "hidden",
              whiteSpace: "nowrap",
              textOverflow: "ellipsis",
            }}
          >
            {firstColumn}
          </div>
          <div
            style={{
              minWidth: 0,
              // borderLeft: "1px solid #d5dce3",
              paddingLeft: "10px",
              overflow: "hidden",
              whiteSpace: "nowrap",
              textOverflow: "ellipsis",
            }}
          >
            {secondColumn}
          </div>
        </div>
      </components.Option>
    );
  };

  const CustomMenuList = (menuProps: any) => {
    if (documentMode) {
      const headers = [
        "BrID",
        "Date",
        "Doc. No.",
        "Debit",
        "Credit",
        "Description",
      ];
      return (
        <components.MenuList {...menuProps}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "52px 105px 140px 75px 85px minmax(0, 1fr)",
              width: "100%",
              minWidth: 0,
              alignItems: "center",
              height: "28px",
              boxSizing: "border-box",
              backgroundColor: "#eeeeee",
              borderBottom: "1px solid #c8c8c8",
              color: "#222",
              fontSize: "14px",
            }}
          >
            {headers.map((header, index) => (
              <div
                key={header}
                style={{
                  minWidth: 0,
                  paddingLeft: "6px",
                  paddingRight: "4px",
                  borderLeft: index === 0 ? "none" : "1px solid #c8c8c8",
                  textAlign: index === 3 || index === 4 ? "right" : "left",
                  overflow: "hidden",
                  whiteSpace: "nowrap",
                  textOverflow: "ellipsis",
                }}
              >
                {header}
              </div>
            ))}
          </div>
          {menuProps.children}
        </components.MenuList>
      );
    }

    return (
      <components.MenuList {...menuProps}>
        {columnHeaders && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: reverseDropdown
                ? "minmax(0, 1fr) 140px"
                : "148px minmax(0, 1fr)",
              width: "100%",
              minWidth: 0,
              alignItems: "center",
              height: "28px",
              boxSizing: "border-box",
              backgroundColor: "#eeeeee",
              borderBottom: "1px solid #c8c8c8",
              color: "#222",
              fontSize: "14px",
            }}
          >
            <div
              style={{
                minWidth: 0,
                paddingLeft: "8px",
                paddingRight: "8px",
                overflow: "hidden",
                whiteSpace: "nowrap",
                textOverflow: "ellipsis",
              }}
            >
              {swapColumns ? columnHeaders[1] : columnHeaders[0]}
            </div>
            <div
              style={{
                minWidth: 0,
                borderLeft: "1px solid #c8c8c8",
                paddingLeft: "10px",
                overflow: "hidden",
                whiteSpace: "nowrap",
                textOverflow: "ellipsis",
              }}
            >
              {swapColumns ? columnHeaders[0] : columnHeaders[1]}
            </div>
          </div>
        )}
        {menuProps.children}
      </components.MenuList>
    );
  };

  const selected = options.find((option) => option.value === value) ?? null;
  const OptionComponent = customOption ?? DefaultOption;

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
        // someone called ref.focus() on the wrapper: pass focus to the real input
        if (event.target !== event.currentTarget) return;
        wrapperRef.current?.querySelector<HTMLInputElement>("input")?.focus();
      }}
      onKeyDown={(event) => {
        // react-select already used this Enter to pick an option
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
      <Select<SelectOption, false>
        inputId={`${id}-input`}
        value={selected}
        components={{
          Option: OptionComponent,
          SingleValue: CustomSingleValue,
          IndicatorSeparator: () => null,
          ...(columnHeaders || documentMode
            ? { MenuList: CustomMenuList }
            : {}),
        }}
        options={options}
        styles={styles}
        isSearchable={!disabled}
        isDisabled={disabled}
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

    const { divisionOptionsLocal, divisionLoading, getDiv, getMatchAccounts } =
      useMatching();

    const [documentNoOptions, setDocumentNoOptions] = useState<
      DocumentOption[]
    >([]);

    /* =====================================================
     TABLE FIELD ORDER
     (the only keyboard-navigable cell is the Un-Match checkbox)
  ===================================================== */

    const tableFieldOrder = ["select"] as TableField[];

    const focusCustomerId = useCallback(() => {
      requestAnimationFrame(() => {
        customerIdRef.current?.focus();
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
        setCustomerId(id);

        const customer = customerOptions.find((option) => option.value === id);

        setCustomerName(customer?.label ?? "");

        await getDiv(id);
      },

      [customerOptions, setCustomerId, setCustomerName, getDiv],
    );

    /* =====================================================
     CUSTOMER NAME → CUSTOMER ID
  ===================================================== */

    const handleCustomerNameChange = useCallback(
      async (name: string) => {
        setCustomerName(name);

        const customer = customerNameOptions.find(
          (option) => option.value === name,
        );

        const accountId = customer?.label ?? "";

        setCustomerId(accountId);

        await getDiv(accountId);
      },

      [customerNameOptions, setCustomerId, setCustomerName, getDiv],
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
     SEARCH
  ===================================================== */

    const handleSearch = useCallback(async () => {
      if (!type.trim()) {
        console.warn("Please input 'Document Type'");
        return;
      }

      if (!customerId.trim()) {
        console.warn("Please select 'Customer'");
        return;
      }

      if (!divisionId.trim()) {
        console.warn("Please select 'Division'");
        return;
      }

      const data = await getMatchAccounts({
        strDocType: type,
        strCSAccountID: customerId,
        strDivID: divisionId,
        year: new Date().getFullYear().toString(),
      });

      const searchResults: any[] = Array.isArray(data) ? data : [];
      onSearch(searchResults);

      const options: DocumentOption[] = searchResults
        .filter((item: any) => item.fdocno && String(item.fdocno).trim() !== "")

        .map((item: any) => ({
          value: String(item.fdocno ?? ""),
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
    }, [type, customerId, divisionId, gstrCoID, getMatchAccounts, onSearch]);

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

    /* Customer Name dropdown: the Account Name column ends exactly at the right
       edge of the Account Name select, and the Account ID column (140px) sits
       outside it, so the menu is select width (534px) + 140px. */
    const ID_COLUMN_WIDTH = 140;

    const customerNameStyles: StylesConfig<SelectOption, false> = {
      ...selectStyles,
      menu: (base) => {
        const width = 534 + ID_COLUMN_WIDTH;

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

    /* Division dropdown: exactly as wide as the Division select box */
    const divisionStyles: StylesConfig<SelectOption, false> = {
      ...selectStyles,
      menu: (base) => ({
        ...base,
        zIndex: 9999,
        fontSize: "14px",
        width: "100%",
        minWidth: 0,
        maxWidth: "100%",
        left: 0,
      }),
    };

    /* Document Type dropdown: the ID column is exactly as wide as the select box
       (154px), and the Name column (140px) sits outside it. */
    const DOC_NAME_COLUMN_WIDTH = 140;

    const documentTypeStyles: StylesConfig<SelectOption, false> = {
      ...selectStyles,
      menu: (base) => {
        const width = 154 + DOC_NAME_COLUMN_WIDTH;

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

    /* Document No. dropdown: wider menu so the longer Doc. No. fits */
    const documentNoStyles: StylesConfig<SelectOption, false> = {
      ...selectStyles,
      menu: (base) => ({
        ...base,
        zIndex: 9999,
        fontSize: "14px",
        width: 700,
        minWidth: 700,
        maxWidth: "calc(100vw - 24px)",
        left: 0,
      }),
    };

    /* =====================================================
     SELECT HELPER
  ===================================================== */

    const renderSelect = (
      id: string,
      value: string,
      options: SelectOption[],
      onChange: (value: string) => void,
      next: () => void,
      selectRef: React.RefObject<HTMLDivElement | null>,
      reverseDropdown = false,
      columnHeaders?: [string, string],
      customStyles?: StylesConfig<SelectOption, false>,
      disabled = false,
      documentMode = false,
      swapColumns = false,
    ) => (
      <ResponsiveSelect
        id={id}
        value={value}
        options={options}
        onChange={onChange}
        next={next}
        selectRef={selectRef}
        styles={
          customStyles ??
          (id === "lkpCustomerID"
            ? customerIdStyles
            : id === "lkpCustomerName"
              ? customerNameStyles
              : id === "lkpDivision"
                ? divisionStyles
                : id === "lkpDocType"
                  ? documentTypeStyles
                  : id === "lkpDocNo."
                    ? documentNoStyles
                    : selectStyles)
        }
        reverseDropdown={reverseDropdown}
        columnHeaders={columnHeaders}
        disabled={disabled}
        documentMode={documentMode}
        swapColumns={swapColumns}
      />
    );

    /* =====================================================
     FOOTER ACTIONS
  ===================================================== */

    const buttons = ["Un-Match", "Clear"];

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
          handleDocNoChange={handleDocNoChange}
          handleSearch={handleSearch}
          renderSelect={renderSelect}
          handleKeyboardAction={handleKeyboardAction}
        />

        <MatchTable
          rows={rows}
          toggleSelect={toggleSelect}
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
