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

import { toast } from "react-toastify";

import { handleKeyboardAction } from "../../../hooks/useMatchKeyboard";

import type {
  GetDocumentNosParams,
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
  lkpBranch: string;
  setLkpBranch: React.Dispatch<React.SetStateAction<string>>;

  type: string;
  setLkpDocType: React.Dispatch<React.SetStateAction<string>>;

  lkpDocTypeNo: string;
  setLkpDocTypeNo: React.Dispatch<React.SetStateAction<string>>;

  receiptDate: string;
  setReceiptDate: React.Dispatch<React.SetStateAction<string>>;

  lkpCsAccountID: string;
  setLkpCsAccountID: React.Dispatch<React.SetStateAction<string>>;

  lkpCsAccountName: string;
  setLkpCsAccountName: React.Dispatch<React.SetStateAction<string>>;

  lkpDivision: string;
  setLkpDivision: React.Dispatch<React.SetStateAction<string>>;

  rows: MatchEnquiryRow[];

  getDocumentNos: (
    params: GetDocumentNosParams,
  ) => Promise<Record<string, any>[]>;

  // the divisions of the chosen customer (loaded by the page from the Match Enquiry controller)
  getDivisions: (lkpCsAccountID: string) => Promise<SelectOption[]>;
  divisionLoading: boolean;

  onDocumentSelect: (
    lkpBranch: string,
    lkpDocNo: string,
    lkpDocType: string,
  ) => void;

  onPrint: () => void;

  clearForm: () => void;

  onSearch: (data?: any[]) => void;

  branchOptions: SelectOption[];
  customerOptions: SelectOption[];
  customerNameOptions: SelectOption[];
  divisionOptions: SelectOption[];

  totalDebit: number;
  totalCredit: number;
}

// the Document No. list: Document No. | Date | Br. ID | Debit | Credit (same as the Matching screen)
const DOCUMENT_LIST_COLUMNS = "130px 90px 55px 90px 90px";

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
  // a list like the Branch list of the reports: the first column is as wide as the box, the second (the ID) hangs out
  // past the box's right edge by this many px, with a divider line between the two
  idColumnHang?: number;
  // a list under two boxes (Customer ID + Customer Name): the first column is as wide as this box plus the gap to the
  // next box (11px), so the second column starts exactly under the next box
  alignToBox?: boolean;
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
  idColumnHang,
  alignToBox = false,
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
          {data.docTypeNo ?? data.docNo ?? data.value}
        </components.SingleValue>
      );
    }

    // a list whose first column is the name (swapColumns: the Division) shows that name in the box; the others show the value
    return (
      <components.SingleValue {...selectProps}>
        {swapColumns ? data.label : data.value}
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
              gridTemplateColumns: DOCUMENT_LIST_COLUMNS,
              width: "100%",
              minWidth: 0,
              alignItems: "center",
              fontSize: "12px",
            }}
          >
            <div>{data.docTypeNo ?? data.docNo ?? data.value ?? ""}</div>
            <div>{data.date ?? ""}</div>
            <div>{data.brId ?? ""}</div>
            <div style={{ textAlign: "right", paddingRight: "8px" }}>
              {data.debit ?? ""}
            </div>
            <div style={{ textAlign: "right", paddingRight: "8px" }}>
              {data.credit ?? ""}
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
            // the option has 8px of padding on each side: the grid takes it back so its columns (and the divider line)
            // sit exactly under the columns of the header
            margin: "0 -8px",
            width: "calc(100% + 16px)",
            gridTemplateColumns: reverseDropdown
              ? "minmax(0, 1fr) 132px"
              : alignToBox
                ? "calc(var(--select-width) + 11px) minmax(0, 1fr)"
                : idColumnHang
                  ? `var(--select-width) ${idColumnHang}px`
                  : "140px minmax(0, 1fr)",
            minWidth: 0,
            alignItems: "center",
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
      const headers = ["Document No.", "Date", "Br. ID", "Debit", "Credit"];
      return (
        <components.MenuList {...menuProps}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: DOCUMENT_LIST_COLUMNS,
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
                : alignToBox
                  ? "calc(var(--select-width) + 11px) minmax(0, 1fr)"
                  : idColumnHang
                    ? `var(--select-width) ${idColumnHang}px`
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
          // no divider line between the value and the dropdown arrow
          IndicatorSeparator: () => null,
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
      lkpBranch,
      setLkpBranch,
      setLkpDocType,
      lkpDocTypeNo,
      setLkpDocTypeNo,
      receiptDate,
      setReceiptDate,
      lkpCsAccountID,
      setLkpCsAccountID,
      lkpCsAccountName,
      setLkpCsAccountName,
      lkpDivision,
      setLkpDivision,
      rows,
      getDocumentNos,
      getDivisions,
      divisionLoading,
      divisionOptions,
      onDocumentSelect,
      onPrint,
      clearForm,
      onSearch,
      branchOptions,
      customerOptions,
      customerNameOptions,
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
        setLkpCsAccountID(id);

        const customer = customerOptions.find((option) => option.value === id);

        setLkpCsAccountName(customer?.label ?? "");

        await getDivisions(id);
      },
      [customerOptions, setLkpCsAccountID, setLkpCsAccountName, getDivisions],
    );

    /* =====================================================
       CUSTOMER NAME → CUSTOMER ID
    ===================================================== */

    const handleCustomerNameChange = useCallback(
      async (name: string) => {
        setLkpCsAccountName(name);

        const customer = customerNameOptions.find(
          (option) => option.value === name,
        );

        const accountId = customer?.label ?? "";

        setLkpCsAccountID(accountId);

        await getDivisions(accountId);
      },
      [
        customerNameOptions,
        setLkpCsAccountID,
        setLkpCsAccountName,
        getDivisions,
      ],
    );

    /* =====================================================
       DOCUMENT NO. LIST: loaded when a Customer and a Division are chosen
       (what the Search button did). The screen has no Document Type box: every matched document of the customer
       and division is listed, each with its own type. The same number can be used by two types (a Bank Receipt and
       a Cash Receipt), so the option's value is "lkpBranch|type|number" and its label the number.
    ===================================================== */

    useEffect(() => {
      // a new Customer / Division invalidates the previous document and lines
      setDocumentNoOptions([]);
      onSearch();

      if (!lkpCsAccountID.trim() || !lkpDivision.trim()) return;

      let cancelled = false;

      const loadDocumentNos = async () => {
        try {
          const data = await getDocumentNos({
            lkpCsAccountID,
            lkpDivision,
          });

          if (cancelled) return;

          const found: any[] = Array.isArray(data) ? data : [];

          const options: DocumentOption[] = found
            .filter(
              (item: any) =>
                item.lkpDocNo && String(item.lkpDocNo).trim() !== "",
            )
            .map((item: any) => {
              const brId = String(item.lkpBranch ?? "");
              const docType = String(item.lkpDocType ?? "");
              const docNo = String(item.lkpDocNo ?? "");

              // "BR JD-26000002" (txtDocTypeNo); a document that has none shows its type and number
              const docTypeNo =
                String(item.txtDocTypeNo ?? "").trim() ||
                `${docType} ${docNo}`.trim();

              return {
                value: `${brId}|${docType}|${docNo}`,
                label: docTypeNo,
                brId,
                date: String(item.txtDate ?? ""),
                docType,
                docNo,
                docTypeNo,
                debit: String(item.txtDebit ?? "0.00"),
                credit: String(item.txtCredit ?? "0.00"),
                description: String(item.txtDescription ?? ""),
              };
            });

          setDocumentNoOptions(options);
        } catch (error) {
          if (!cancelled) {
            toast.error(
              error instanceof Error
                ? error.message
                : "Failed to load the document numbers",
            );
          }
        }
      };

      void loadDocumentNos();

      return () => {
        cancelled = true;
      };
    }, [lkpCsAccountID, lkpDivision, getDocumentNos, onSearch]);

    /* =====================================================
       DOCUMENT NO. SELECTED → LOAD ENQUIRY LINES
       (the document's type comes with the document)
    ===================================================== */

    const handleDocumentNoChange = useCallback(
      (docKey: string) => {
        const option = documentNoOptions.find((o) => o.value === docKey);

        if (!option) return;

        setLkpDocTypeNo(docKey);
        setLkpDocType(option.docType);
        onDocumentSelect(option.brId, option.docNo, option.docType);
      },
      [documentNoOptions, setLkpDocTypeNo, setLkpDocType, onDocumentSelect],
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
      idColumnHang?: number,
      alignToBox = false,
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
        idColumnHang={idColumnHang}
        alignToBox={alignToBox}
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
          lkpBranch={lkpBranch}
          setLkpBranch={setLkpBranch}
          lkpDocTypeNo={lkpDocTypeNo}
          setLkpDocTypeNo={setLkpDocTypeNo}
          receiptDate={receiptDate}
          setReceiptDate={setReceiptDate}
          lkpCsAccountID={lkpCsAccountID}
          setLkpCsAccountID={setLkpCsAccountID}
          lkpCsAccountName={lkpCsAccountName}
          setLkpCsAccountName={setLkpCsAccountName}
          lkpDivision={lkpDivision}
          setLkpDivision={setLkpDivision}
          branchOptions={branchOptions}
          customerOptions={customerOptions}
          customerNameOptions={customerNameOptions}
          divisionOptions={divisionOptions}
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
