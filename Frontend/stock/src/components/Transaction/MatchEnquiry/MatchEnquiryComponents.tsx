import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

import {
  type StylesConfig,
} from "react-select";
import dayjs from "dayjs";
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
import CommonTableSelect, { type TableSelectOption } from "../../common/CommonTableSelect";

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
  swapColumns?: boolean;
  idColumnHang?: number;
  alignToBox?: boolean;
  getMenuWidth?: () => number;
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
  swapColumns = false,
  idColumnHang,
  alignToBox = false,
  getMenuWidth,
}: ResponsiveSelectProps) => {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [boxWidth, setBoxWidth] = useState(0);
  const [menuWidth, setMenuWidth] = useState(0);

  React.useEffect(() => {
    const element = wrapperRef.current;
    if (!element) return;

    const updateWidth = () => {
      const width = element.getBoundingClientRect().width;
      if (width > 0) setBoxWidth(Math.round(width));
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
        { key: "docTypeNo", label: "Document No.", width: "130px" },
        { key: "date", label: "Date", width: "90px" },
        { key: "brId", label: "Br. ID", width: "55px" },
        { key: "debit", label: "Debit", width: "90px", align: "right" as const },
        { key: "credit", label: "Credit", width: "1fr", align: "right" as const },
      ];
    }
    if (!columnHeaders) {
      return [{ key: "value", label: "", width: "1fr" }];
    }

    const firstWidth = alignToBox
      ? `${boxWidth + 11}px`
      : idColumnHang
        ? `${boxWidth}px`
        : reverseDropdown
          ? "1fr"
          : "140px";
    const secondWidth = !alignToBox && !idColumnHang && reverseDropdown
      ? "140px"
      : "1fr";

    // swapColumns: name (label) first, id (value) second; headers are reversed
    return swapColumns
      ? [
        { key: "label", label: columnHeaders[1], width: firstWidth },
        { key: "value", label: columnHeaders[0], width: secondWidth },
      ]
      : [
        { key: "value", label: columnHeaders[0], width: firstWidth },
        { key: "label", label: columnHeaders[1], width: secondWidth },
      ];
  }, [documentMode, columnHeaders, swapColumns, alignToBox, idColumnHang, reverseDropdown, boxWidth]);

  const calcMenuWidth = () => {
    if (getMenuWidth) return getMenuWidth();
    if (documentMode) return 460;
    if (idColumnHang) return boxWidth + idColumnHang;
    return Math.max(boxWidth, 360);
  };

  // the closed box shows one field, the search matches both
  const filter = (option: { data: TableSelectOption }, input: string) => {
    const text = input.trim().toLowerCase();
    if (!text) return true;
    const d = option.data;
    return [d.value, d.label, d.docTypeNo].some((v) =>
      String(v ?? "").toLowerCase().includes(text),
    );
  };

  const selected = options.find((option) => option.value === value) ?? null;

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
      style={{ width: "100%" } as React.CSSProperties}
    >
      <CommonTableSelect
        inputId={`${id}-input`}
        value={selected as TableSelectOption | null}
        options={options as TableSelectOption[]}
        columns={columns}
        valueKey={documentMode ? "docTypeNo" : swapColumns ? "label" : "value"}
        width="100%"
        menuWidth={`${menuWidth || calcMenuWidth()}px`}
        controlHeight={29}
        controlFontSize="13px"
        headerFontSize="13px"
        borderColor="#b7c7d7"
        hoverBorderColor="#b7c7d7"
        menuZIndex={9999}
        filterOption={filter}
        isDisabled={disabled}
        isSearchable={!disabled}
        onMenuOpen={() => setMenuWidth(calcMenuWidth())}
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
        setLkpDivision(""); // NEW

        const customer = customerOptions.find((option) => option.value === id);
        setLkpCsAccountName(customer?.label ?? "");

        await getDivisions(id);
      },
      [
        customerOptions,
        setLkpCsAccountID,
        setLkpCsAccountName,
        setLkpDivision,
        getDivisions,
      ], // NEW dep
    );

    /* =====================================================
       CUSTOMER NAME → CUSTOMER ID
    ===================================================== */

    const handleCustomerNameChange = useCallback(
      async (name: string) => {
        setLkpCsAccountName(name);
        setLkpDivision(""); // NEW

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
        setLkpDivision,
        getDivisions,
      ], // NEW dep
    );

    const hasDivisions = divisionOptions.length > 0;

    /* =====================================================
       DOCUMENT NO. LIST: loaded when a Customer is chosen and, if the
       customer has divisions, a Division is chosen too.
       Replace the whole existing useEffect with this one.
    ===================================================== */

    useEffect(() => {
      // a new Customer / Division invalidates the previous document and lines
      setDocumentNoOptions([]);
      onSearch();

      if (!lkpCsAccountID.trim()) return;

      // wait until the customer's divisions are known
      if (divisionLoading) return;

      // a division is mandatory only when the customer has divisions
      if (hasDivisions && !lkpDivision.trim()) return;

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
                date: item.txtDate
                  ? dayjs(item.txtDate).format("DD/MM/YYYY")
                  : "",
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
    }, [
      lkpCsAccountID,
      lkpDivision,
      hasDivisions,
      divisionLoading,
      getDocumentNos,
      onSearch,
    ]);

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
        reverseDropdown={reverseDropdown}
        columnHeaders={columnHeaders}
        disabled={disabled}
        documentMode={documentMode}
        swapColumns={swapColumns}
        idColumnHang={idColumnHang}
        alignToBox={alignToBox}
        getMenuWidth={
          alignToBox
            ? () => {
              const idBox = customerIdRef.current?.getBoundingClientRect();
              const nameBox = customerNameRef.current?.getBoundingClientRect();
              return idBox && nameBox
                ? Math.max(nameBox.right - idBox.left, 360)
                : 685;
            }
            : undefined
        }
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
