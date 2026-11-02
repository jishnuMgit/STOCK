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

import { toast } from "react-toastify";

import { handleKeyboardAction } from "../../../hooks/useMatchKeyboard";

import useMatching from "../../../hooks/useMatching";

import type {
  GetMatchAccountsParams,
  MatchEnquiryRow,
} from "../../../hooks/useMatchEnquiry";

import MatchEnquiryHeader from "./MatchEnquiryHeader";
import MatchEnquiryTable from "./MatchEnquiryTable";
import MatchEnquiryFooter from "./MatchEnquiryFooter";

import type {
  TableField,
  SelectOption,
  DocumentOption,
  MatchingComponentsRef,
} from "./types";

interface Props {
  year: string;

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

  rows: MatchEnquiryRow[];

  getMatchAccounts: (
    params: GetMatchAccountsParams,
  ) => Promise<Record<string, any>[]>;

  onDocumentSelect: (brId: string, docNo: string) => void;

  onPrint: () => void;

  clearForm: () => void;

  onSearch: (data?: any[]) => void;

  branchOptions: SelectOption[];
  customerOptions: SelectOption[];
  customerNameOptions: SelectOption[];
  divisionOptions: SelectOption[];
  documentOptions: SelectOption[];

  totalDebit: number;
  totalCredit: number;
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
              gridTemplateColumns:
                "52px 105px 70px 105px 75px 85px minmax(0, 1fr)",
              width: "100%",
              minWidth: 0,
              alignItems: "center",
              fontSize: "12px",
            }}
          >
            <span>{data.brId ?? ""}</span>
            <span>{data.date ?? ""}</span>
            <span>{data.docType ?? ""}</span>
            <span>{data.docNo ?? data.value ?? ""}</span>
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
              gridTemplateColumns:
                "52px 105px 70px 105px 75px 85px minmax(0, 1fr)",
              width: "100%",
              minWidth: 0,
              alignItems: "center",
              fontSize: "12px",
            }}
          >
            <div>{data.brId ?? ""}</div>
            <div>{data.date ?? ""}</div>
            <div>{data.docType ?? ""}</div>
            <div>{data.docNo ?? data.value ?? ""}</div>
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
              borderLeft: "1px solid #d5dce3",
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
        "Doc. Type",
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
              gridTemplateColumns:
                "52px 105px 70px 105px 75px 85px minmax(0, 1fr)",
              width: "100%",
              minWidth: 0,
              alignItems: "center",
              height: "28px",
              boxSizing: "border-box",
              backgroundColor: "#eeeeee",
              borderBottom: "1px solid #c8c8c8",
              color: "#222",
              fontSize: "12px",
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
                  textAlign: index === 4 || index === 5 ? "right" : "left",
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
              fontSize: "13px",
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
      tabIndex={0}
      onKeyDown={(event) => handleKeyboardAction(event, { onEnter: next })}
      style={
        { "--select-width": selectWidth, width: "100%" } as React.CSSProperties
      }
    >
      <Select<SelectOption, false>
        inputId={`${id}-input`}
        value={selected}
        components={{
          Option: OptionComponent,
          SingleValue: CustomSingleValue,
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

const MatchEnquiryComponents = forwardRef<MatchingComponentsRef, Props>(
  (props, ref) => {
    const {
      year,
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
      getMatchAccounts,
      onDocumentSelect,
      onPrint,
      clearForm,
      onSearch,
      branchOptions,
      customerOptions,
      customerNameOptions,
      documentOptions,
      totalDebit,
      totalCredit,
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
    const actionRefs = useRef<(HTMLButtonElement | null)[]>([]);

    /* =====================================================
       DIVISION API
    ===================================================== */

    const { divisionOptionsLocal, divisionLoading, getDiv } = useMatching();

    const [documentNoOptions, setDocumentNoOptions] = useState<
      DocumentOption[]
    >([]);

    /* =====================================================
       FOCUS HELPERS
    ===================================================== */

    const focusCustomerId = useCallback(() => {
      requestAnimationFrame(() => {
        customerIdRef.current?.focus();
      });
    }, []);

    // table is read-only; kept so MatchingComponentsRef still matches
    const focusTableField = useCallback(
      (_rowIndex?: number, _field?: TableField) => {
        /* no editable cells */
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
       SEARCH (fills the Document No. dropdown)
    ===================================================== */

    const handleSearch = useCallback(async () => {
      if (!type.trim()) {
        toast.error("Please input 'Document Type'");
        return;
      }

      if (!customerId.trim()) {
        toast.error("Please select 'Customer'");
        return;
      }

      if (!divisionId.trim()) {
        toast.error("Please select 'Division'");
        return;
      }

      try {
        const data = await getMatchAccounts({
          strDocType: type,
          strCSAccountID: customerId,
          strDivID: divisionId,
          year,
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
            debit: String(item.fdebit ?? "0.00"),
            credit: String(item.fcredit ?? "0.00"),
            description: String(item.fdescription ?? ""),
          }));

        setDocumentNoOptions(options);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Search failed");
      }
    }, [type, customerId, divisionId, year, getMatchAccounts, onSearch]);

    /* =====================================================
       DOCUMENT NO. SELECTED → LOAD ENQUIRY LINES
    ===================================================== */

    const handleDocumentNoChange = useCallback(
      (docNo: string) => {
        setReceiptNo(docNo);

        const option = documentNoOptions.find((o) => o.value === docNo);
        if (option) onDocumentSelect(option.brId, docNo);
      },
      [documentNoOptions, setReceiptNo, onDocumentSelect],
    );

    /* =====================================================
       SELECT STYLES
    ===================================================== */

    const selectStyles: StylesConfig<SelectOption, false> = {
      control: (base) => ({
        ...base,
        minHeight: "29px",
        height: "29px",
        borderRadius: "3px",
        borderColor: "#b7c7d7",
        boxShadow: "none",
        fontSize: "13px",
        backgroundColor: "#ffffff",
      }),

      valueContainer: (base) => ({
        ...base,
        height: "29px",
        padding: "0 8px",
      }),

      indicatorsContainer: (base) => ({
        ...base,
        height: "29px",
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
        fontSize: "13px",
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
        fontSize: "13px",
        padding: "6px 8px",
        backgroundColor: state.isFocused ? "#EEF8F3" : "#ffffff",
        color: "#222",
        cursor: "pointer",
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
        styles={customStyles ?? selectStyles}
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

    const buttons = ["Print", "Clear"];

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
            onPrint();
            break;

          case 1:
            clearForm();
            break;

          default:
            break;
        }
      },
      [onPrint, clearForm],
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
        <MatchEnquiryHeader
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
          customerIdRef={customerIdRef}
          customerNameRef={customerNameRef}
          divisionRef={divisionRef}
          creditDocumentRef={creditDocumentRef}
          documentNoRef={documentNoRef}
          dateRef={dateRef}
          divisionLoading={divisionLoading}
          handleCustomerIdChange={handleCustomerIdChange}
          handleCustomerNameChange={handleCustomerNameChange}
          handleDocumentNoChange={handleDocumentNoChange}
          handleSearch={handleSearch}
          renderSelect={renderSelect}
          handleKeyboardAction={handleKeyboardAction}
        />

        <MatchEnquiryTable rows={rows} />

        <MatchEnquiryFooter
          totalDebit={totalDebit}
          totalCredit={totalCredit}
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

MatchEnquiryComponents.displayName = "MatchEnquiryComponents";

export default MatchEnquiryComponents;
