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



import {customerNameSelectStyles,customerIdSelectStyles,docSelectStyles,DivisionSelectStyles,DocumnetNoSelectStyles} from './CustomSelectStyle'

import {
  handleKeyboardAction,
  focusElement,
} from "../../../hooks/useMatchKeyboard";
import useMatching from "../../../hooks/useMatching";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import {
  DatePicker,
} from "@mui/x-date-pickers/DatePicker";

import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";

dayjs.extend(customParseFormat);

/* =========================================================
   TYPES
========================================================= */

export interface ReceiptRow {
  id: number;
  brId: string;
  date: string;
  type: string;
  docNo: string;
  description: string;
  docAmount: number;
  debit: number;
  credit: number;
  match: boolean;
  matchAmount: number;
}

export type TableField =
  | "brId"
  | "date"
  | "docNo"
  | "description"
  | "docAmount"
  | "debit"
  | "credit"
  | "match"
  | "matchAmount";

export interface SelectOption {
  value: string;
  label: string;
}

export interface DocumentOption extends SelectOption {
  brId: string;
  date: string;
  docType: string;
  docNo: string;
  debit: string;
  credit: string;
  description: string;
}

/* =========================================================
   REF
========================================================= */

export interface MatchingComponentsRef {
  focusCustomerId: () => void;

  focusTableField: (
    rowIndex: number,
    field: TableField
  ) => void;

  focusNote: () => void;

  focusSave: () => void;
}

/* =========================================================
   PROPS
========================================================= */

interface Props {
  branch: string;

  setBranch: React.Dispatch<
    React.SetStateAction<string>
  >;

  type: string;

  setDocType: React.Dispatch<
    React.SetStateAction<string>
  >;

  receiptNo: string;

  setReceiptNo: React.Dispatch<
    React.SetStateAction<string>
  >;

  receiptDate: string;

  setReceiptDate: React.Dispatch<
    React.SetStateAction<string>
  >;

  customerId: string;

  setCustomerId: React.Dispatch<
    React.SetStateAction<string>
  >;

  customerName: string;

  setCustomerName: React.Dispatch<
    React.SetStateAction<string>
  >;

  divisionId: string;

  setDivisionId: React.Dispatch<
    React.SetStateAction<string>
  >;

  rows: ReceiptRow[];

  handleRowChange: (
    rowIndex: number,
    field: keyof ReceiptRow,
    value:
      | string
      | number
      | boolean
  ) => void;

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

/* =========================================================
   INDEPENDENT LINKED SELECT
========================================================= */

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
  customOption?: React.ComponentType<
    OptionProps<SelectOption, false>
  >;
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

      if (width > 0) {
        setSelectWidth(`${width}px`);
      }
    };

    updateWidth();

    const resizeObserver = new ResizeObserver(updateWidth);
    resizeObserver.observe(element);

    return () => resizeObserver.disconnect();
  }, []);

  /*
    IMPORTANT:
    React Select normally displays option.label as the selected value.

    We intentionally display option.value instead.

    First customer select:
      value = Account ID
      label = Account Name
      selected display = Account ID

    Second customer select:
      value = Account Name
      label = Account ID
      selected display = Account Name
  */
  const CustomSingleValue = (props: any) => {
    return (
      <components.SingleValue {...props}>
        {documentMode || swapColumns
          ? props.data.label
          : props.data.value}
      </components.SingleValue>
    );
  };

  const CustomOption = (
    props: OptionProps<SelectOption, false>
  ) => {
    const data = props.data as SelectOption & Partial<DocumentOption>;

    if (documentMode) {
      return (
        <components.Option {...props}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "52px 105px 70px 105px 75px 85px minmax(0, 1fr)",
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
            <div style={{ textAlign: "right", paddingRight: "8px" }}>{data.debit ?? ""}</div>
            <div style={{ textAlign: "right", paddingRight: "8px" }}>{data.credit ?? ""}</div>
            <div style={{ overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{data.description ?? ""}</div>
          </div>
        </components.Option>
      );
    }

    if (!columnHeaders) {
      return (
        <components.Option {...props}>
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

    const firstColumn = swapColumns
      ? data.label
      : data.value;

    const secondColumn = swapColumns
      ? data.value
      : data.label;

    return (
      <components.Option {...props}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            width: "100%",
            minWidth: 0,
          }}
        >
          <div
            style={{
              minWidth: 0,
              flex: 1,
              paddingRight: "12px",
              overflow: "hidden",
              whiteSpace: "nowrap",
              textOverflow: "ellipsis",
            }}
          >
            {firstColumn}
          </div>

          <div
            style={{
              flex: "0 0 145px",
              minWidth: "145px",
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


  const CustomOption1 = (
  props: OptionProps<SelectOption, false>
) => {
  const data = props.data as SelectOption;

  const firstColumn = swapColumns
    ? data.label
    : data.value;

  const secondColumn = swapColumns
    ? data.value
    : data.label;

  return (
    <components.Option {...props}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          width: "100%",
          minWidth: 0,
        }}
      >
        {/* First column */}
        <div
          style={{
            minWidth: 0,
            flex: 1,
            paddingRight: "12px",
            overflow: "hidden",
            whiteSpace: "nowrap",
            textOverflow: "ellipsis",
          }}
        >
          {firstColumn}
        </div>

        {/* Second column */}
        <div
          style={{
            flex: "0 0 210px",
            minWidth: "210px",
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
  const CustomMenuList = (props: any) => {
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
        <components.MenuList {...props}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "52px 105px 70px 105px 75px 85px minmax(0, 1fr)",
              width: "100%",
              minWidth: 0,
              alignItems: "center",
              height: "28px",
              boxSizing: "border-box",
              backgroundColor: "#eeeeee",
              borderBottom: "1px solid #c8c8c8",
              color: "#222",
              fontSize: "12px",
              fontWeight: 400,
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
          {props.children}
        </components.MenuList>
      );
    }

    return (
      <components.MenuList {...props}>
        {columnHeaders && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              width: "100%",
              minWidth: 0,
              height: "28px",
              boxSizing: "border-box",
              backgroundColor: "#eeeeee",
              borderBottom: "1px solid #c8c8c8",
              color: "#222",
              fontSize: "13px",
              fontWeight: 400,
            }}
          >
            <div
              style={{
                minWidth: 0,
                flex: 1,
                paddingLeft: "8px",
                paddingRight: "12px",
                overflow: "hidden",
                whiteSpace: "nowrap",
                textOverflow: "ellipsis",
              }}
            >
              {columnHeaders[0]}
            </div>

            <div
              style={{
                flex: "0 0 145px",
                minWidth: "145px",
                borderLeft: "1px solid #c8c8c8",
                paddingLeft: "10px",
                overflow: "hidden",
                whiteSpace: "nowrap",
                textOverflow: "ellipsis",
              }}
            >
              {columnHeaders[1]}
            </div>
          </div>
        )}
        {props.children}
      </components.MenuList>
    );
  };

  const selected =
    options.find((option) => option.value === value) ?? null;

  return (
    <div
      id={id}
      ref={(element) => {
        wrapperRef.current = element;
        selectRef.current = element;
      }}
      tabIndex={0}
      onKeyDown={(event) =>
        handleKeyboardAction(event, {
          onEnter: next,
        })
      }
      style={
        {
          "--select-width": selectWidth,
        } as React.CSSProperties
      }
    >
      <Select<SelectOption, false>
        value={selected}
        components={{
          Option: CustomOption,
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

/* =========================================================
   COMPONENT
========================================================= */




const MatchingComponents =
  forwardRef<
    MatchingComponentsRef,
    Props
  >(
    (
      {
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

        gstrCoID = import.meta.env.VITE_CO_ID ?? "",

        branchOptions,
        customerOptions,
        customerNameOptions,
        divisionOptions,
        documentOptions,

        documentAmount,
        totalMatchAmount,
        balance,
      },
      ref
    ) => {
      /* =====================================================
         REFS
      ===================================================== */

      const customerIdRef =
        useRef<HTMLDivElement | null>(
          null
        );

      const customerNameRef =
        useRef<HTMLDivElement | null>(
          null
        );

      const divisionRef =
        useRef<HTMLDivElement | null>(
          null
        );

      const creditDocumentRef =
        useRef<HTMLDivElement | null>(
          null
        );

      const documentNoRef =
        useRef<HTMLDivElement | null>(
          null
        );

      const dateRef =
        useRef<HTMLInputElement | null>(
          null
        );

      const noteRef =
        useRef<HTMLInputElement | null>(
          null
        );

      const saveRef =
        useRef<HTMLButtonElement | null>(
          null
        );

      const tableRefs =
        useRef<
          Record<
            string,
            HTMLElement | null
          >
        >({});

      /* =====================================================
         COMMON MATCHING API HOOK
      ===================================================== */

      const {
        divisionOptionsLocal,
        divisionLoading,
        getDiv,
        getMatchAccounts,
      } = useMatching();

      const [documentNoOptions, setDocumentNoOptions] =
        useState<DocumentOption[]>([]);

      /* =====================================================
         TABLE FIELD ORDER
      ===================================================== */

      const tableFieldOrder: TableField[] =
        [
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

      /* =====================================================
         SELECT STYLES
      ===================================================== */

      console.log("  display: grid",customerNameOptions,customerOptions)
      const selectStyles: StylesConfig<SelectOption, false> = {
        control: (base: any) => ({
          ...base,
          minHeight: "29px",
          height: "29px",
          // IMPORTANT: no width here; your existing Select width is preserved.
          borderRadius: "3px",
          borderColor: "#b7c7d7",
          boxShadow: "none",
          fontSize: "13px",
          backgroundColor: "#ffffff",
        }),

        valueContainer: (base: any) => ({
          ...base,
          height: "29px",
          padding: "0 8px",
        }),

        indicatorsContainer: (base: any) => ({
          ...base,
          height: "29px",
        }),

        dropdownIndicator: (base: any) => ({
          ...base,
          padding: "4px",
        }),

        clearIndicator: (base: any) => ({
          ...base,
          padding: "4px",
        }),

        menu: (base: any) => ({
          ...base,
          zIndex: 9999,
          fontSize: "13px",

          // Wider than the Select, but constrained to the viewport.
          width: "min(520px, calc(100vw - 24px))",
          minWidth: "min(360px, calc(100vw - 24px))",
          maxWidth: "calc(100vw - 24px)",
          left: 0,
        }),

        menuList: (base: any) => ({
          ...base,
          padding: 0,
          maxWidth: "100%",
          overflowX: "hidden",
        }),

        option: (base: any, state: any) => ({
          ...base,
          fontSize: "13px",
          padding: "6px 8px",
          backgroundColor: state.isFocused ? "#dbeafe" : "#ffffff",
          color: "#222",
          cursor: "pointer",
        }),
      };

      /* =====================================================
         FOCUS CUSTOMER
      ===================================================== */

      const focusCustomerId =
        useCallback(() => {
          requestAnimationFrame(() => {
            customerIdRef.current?.focus();
          });
        }, []);

      /* =====================================================
         FOCUS TABLE
      ===================================================== */

      const focusTableField =
        useCallback(
          (
            rowIndex: number,
            field: TableField
          ) => {
            const key =
              `${rowIndex}-${field}`;

            const element =
              tableRefs.current[key];

            if (!element) {
              return;
            }

            focusElement(element);
          },
          []
        );

      /* =====================================================
         FOCUS NOTE
      ===================================================== */

      const focusNote =
        useCallback(() => {
          requestAnimationFrame(() => {
            noteRef.current?.focus();
          });
        }, []);

      /* =====================================================
         FOCUS SAVE
      ===================================================== */

      const focusSave =
        useCallback(() => {
          requestAnimationFrame(() => {
            saveRef.current?.focus();
          });
        }, []);

      /* =====================================================
         EXPOSE REF
      ===================================================== */

      useImperativeHandle(
        ref,
        () => ({
          focusCustomerId,

          focusTableField,

          focusNote,

          focusSave,
        }),
        [
          focusCustomerId,
          focusTableField,
          focusNote,
          focusSave,
        ]
      );

      /* =====================================================
         ESCAPE FROM TABLE → NOTE
      ===================================================== */

      const handleTableEscape =
        useCallback(() => {
          focusNote();
        }, [focusNote]);

      /* =====================================================
         ENTER TABLE NAVIGATION
      ===================================================== */

      const handleTableEnter =
        useCallback(
          (
            rowIndex: number,
            field: TableField
          ) => {
            const currentIndex =
              tableFieldOrder.indexOf(
                field
              );

            /* ---------------------------------------------
               NEXT CELL
            --------------------------------------------- */

            if (
              currentIndex <
              tableFieldOrder.length - 1
            ) {
              focusTableField(
                rowIndex,
                tableFieldOrder[
                  currentIndex + 1
                ]
              );

              return;
            }

            /* ---------------------------------------------
               NEXT ROW
            --------------------------------------------- */

            const nextRow =
              rowIndex + 1;

            if (
              nextRow <
              rows.length
            ) {
              focusTableField(
                nextRow,
                tableFieldOrder[0]
              );

              return;
            }

            /* ---------------------------------------------
               LAST CELL → NOTE
            --------------------------------------------- */

            focusNote();
          },
          [
            rows.length,
            focusTableField,
            focusNote,
          ]
        );

      /* =====================================================
         LINK CUSTOMER ID <-> CUSTOMER NAME

         IMPORTANT:
         - customerOptions is already sorted by Account ID.
           value = Account ID, label = Account Name
         - customerNameOptions is already sorted by Account Name.
           value = Account Name, label = Account ID

         Do NOT rebuild the second array from customerOptions.
         Both arrays are intentionally kept separate.
      ===================================================== */

      const handleCustomerIdChange = useCallback(
        async (id: string) => {
          setCustomerId(id);

          const customer = customerOptions.find(
            (option) => option.value === id
          );

          setCustomerName(customer?.label ?? "");

          /* First API: get divisions */
          await getDiv(id);
        },
        [
          customerOptions,
          setCustomerId,
          setCustomerName,
          getDiv,
        ]
      );

      const handleCustomerNameChange = useCallback(
        async (name: string) => {
          setCustomerName(name);

          const customer = customerNameOptions.find(
            (option) => option.value === name
          );

          const strCSAccountID =
            customer?.label ?? "";

          setCustomerId(strCSAccountID);

          /* First API: get divisions */
          await getDiv(strCSAccountID);
        },
        [
          customerNameOptions,
          setCustomerId,
          setCustomerName,
          getDiv,
        ]
      );

      /* =====================================================
         SEARCH

         The second API is called only after the required
         Customer + Division + Document Type are available.
      ===================================================== */

      const handleSearch = useCallback(
        async () => {
          if (!type || type.trim() === "") {
            console.warn("Please input 'Document Type'");
            return;
          }

          if (
            !customerId ||
            customerId.trim() === ""
          ) {
            console.warn("Please select 'Customer'");
            return;
          }

          if (
            !divisionId ||
            divisionId.trim() === ""
          ) {
            console.warn("Please select 'Division'");
            return;
          }

          /* Second API: get match accounts */
          const data = await getMatchAccounts({
            strDocType: type,
            strCSAccountID: customerId,
            strDivID: divisionId,
            gstrCoID,
          });


         

          /* Keep parent callback so the existing parent
             can put the returned data into its rows state. */
          onSearch(data);

          const options: DocumentOption[] = data
            .filter(
              (item: any) =>
                item.fdocno &&
                String(item.fdocno).trim() !== ""
            )
            .map((item: any) => ({
              // value = Document No. sent/stored in state
              // label = Description/Name shown in the select
              value: String(item.fdocno ?? ""),
              label: String(
                item.fdocno  ?? ""
              ),
              brId: String(item.fbrid ?? ""),
              date: String(item.fdate ?? ""),
              docType: String(item.fdoctype ?? ""),
              docNo: String(item.fdocno ?? ""),
              debit: String(item.fdebit ?? "0.00"),
              credit: String(item.fcredit ?? "0.00"),
              description: String(item.fdescription ?? ""),
            }));

          setDocumentNoOptions(options);
        },
        [
          type,
          customerId,
          divisionId,
          gstrCoID,
          getMatchAccounts,
          onSearch,
        ]
      );

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
  swapColumns = false
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
);    /* =====================================================
         TABLE KEYBOARD
      ===================================================== */

      const handleTableKeyDown = (
        event: React.KeyboardEvent,
        rowIndex: number,
        field: TableField
      ) => {
        handleKeyboardAction(
          event,
          {
            onEnter: () =>
              handleTableEnter(
                rowIndex,
                field
              ),

            onEscape:
              handleTableEscape,
          }
        );
      };

      /* =====================================================
         ACTION BUTTONS
      ===================================================== */

      const buttons = [
        "Apply",
        
        "Clear",
      ];

      const [
        activeButton,
        setActiveButton,
      ] = useState(0);

      const actionRefs =
        useRef<
          (
            | HTMLButtonElement
            | null
          )[]
        >([]);



 

      /* =====================================================
         FOCUS ACTION BUTTON
      ===================================================== */

      const focusActionButton =
        useCallback(
          (index: number) => {
            const button =
              actionRefs.current[
                index
              ];

            if (!button) {
              return;
            }

            setActiveButton(index);

            requestAnimationFrame(() => {
              button.focus();
            });
          },
          []
        );

      /* =====================================================
         EXECUTE ACTION
      ===================================================== */

      const executeAction =
        useCallback(
          (index: number) => {
            switch (index) {
              case 0:
                onSave();
                break;

              case 1:
                console.log(
                  "Delete clicked"
                );
                break;

              case 2:
                clearForm();
                break;

              default:
                break;
            }
          },
          [
            onSave,
            clearForm,
          ]
        );

      /* =====================================================
         ACTION KEYBOARD
      ===================================================== */

      const handleActionKeyDown =
        (
event: React.KeyboardEvent<HTMLButtonElement>, p0: () => any        ) => {
          switch (event.key) {
            case "ArrowRight":
            case "ArrowDown": {
              event.preventDefault();
              event.stopPropagation();

              const nextIndex =
                activeButton <
                buttons.length - 1
                  ? activeButton + 1
                  : 0;

              focusActionButton(
                nextIndex
              );

              break;
            }

            case "ArrowLeft":
            case "ArrowUp": {
              event.preventDefault();
              event.stopPropagation();

              const previousIndex =
                activeButton > 0
                  ? activeButton - 1
                  : buttons.length - 1;

              focusActionButton(
                previousIndex
              );

              break;
            }

            case "Enter": {
              event.preventDefault();
              event.stopPropagation();

              executeAction(
                activeButton
              );

              break;
            }

            default:
              break;
          }
        };

      /* =====================================================
         INPUT STYLE
      ===================================================== */

      const inputClass = `
        h-[29px]
        w-full
        rounded-[3px]
        border
        border-[#b7c7d7]
        bg-white
        px-2
        text-[13px]
        text-slate-700
        outline-none
        focus:border-[#20884e]
        focus:ring-0
        placeholder:text-slate-400
      `;

      /* =====================================================
         TABLE INPUT STYLE
      ===================================================== */

      const tableInputClass = `
        h-[27px]
        w-full
        border-0
        bg-transparent
        px-2
        text-[13px]
        text-slate-700
        outline-none
        focus:bg-white
        focus:ring-0
      `;

          /* =====================================================
         RETURN
      ===================================================== */

      return (
        <div
          className="
            w-full
            border
            border-[#9aa4ad]
            bg-white
            font-sans
            text-[13px]
            text-slate-700
          "
        >

          {/* =================================================
              TITLE
          ================================================= */}

          <header
            id="03q9ys"
            className="
              flex
              h-8.75
              items-center
              justify-center
              bg-[#9fdfbc]
              text-[21px]
              font-bold
              text-slate-700
            "
          >
            Matching
          </header>

          {/* =================================================
              HEADER
          ================================================= */}

          <div
            className="
              px-6.75
              pt-2.25
              pb-1.75
            "
          >

            {/* ===============================================
                HEADER ROW 1
            =============================================== */}

            <div
              className="
                grid
                grid-cols-[100px_154px_520px_1fr]
                items-center
                gap-x-2.75
                mb-1.25
                max-[1200px]:grid-cols-[100px_minmax(154px,1fr)_minmax(300px,1fr)]
                max-[1200px]:gap-x-2
                max-[900px]:grid-cols-1
                max-[900px]:gap-y-1.5
              "
            >

              <label className="text-right whitespace-nowrap">
                Customer :
              </label>

              {/* CUSTOMER ID */}

              {renderSelect(
                "lkpCustomerID",
                customerId,
                customerOptions,
                handleCustomerIdChange,
                
                () =>
                  customerNameRef.current?.focus(),
                customerIdRef,
                false,
                //@ts-ignore
                ["Account ID", "Account Name"],
                customerIdSelectStyles
              )}

              {/* CUSTOMER NAME */}

              {renderSelect(
                "lkpCustomerName",
                customerName,
                customerNameOptions,
                handleCustomerNameChange,
                () =>
                  divisionRef.current?.focus(),
                customerNameRef,
                true,
                //@ts-ignore
                ["Account Name", "Account ID"],
                customerNameSelectStyles
              )}

              {/* DOCUMENT AMOUNT */}

              <div
                className="
                  flex
                  items-center
                  justify-end
                  gap-2
                "
              >
                <label className="whitespace-nowrap">
                  Document Amt. :
                </label>

                <div
                  id="txtDocumentAmt"
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
                  {documentAmount.toFixed(
                    2
                  )}
                </div>

                <span className="text-[#00a83b]">
                  Cr.
                </span>
              </div>
            </div>

            {/* ===============================================
                HEADER ROW 2
            =============================================== */}

            <div
              className="
                grid
                grid-cols-[100px_300px_145px_140px_75px_1fr]
                items-center
                gap-x-2.25
                mb-1.25
                max-[1200px]:grid-cols-[100px_minmax(180px,1fr)_120px_140px_75px_minmax(220px,1fr)]
                max-[1200px]:gap-x-2
                max-[900px]:grid-cols-1
                max-[900px]:gap-y-1.5
              "
            >

              {/* DIVISION */}

              <label className="text-right">
                Division :
              </label>

              <div className="ml-0.5">
               {renderSelect(
  "lkpDivision",
  divisionId,
  divisionOptionsLocal,
  setDivisionId,
  () =>
    creditDocumentRef.current?.focus(),
  divisionRef,
  true,
  ["Division Name", "Division ID"],
  DivisionSelectStyles,
  !customerId ||
    divisionLoading ||
    divisionOptionsLocal.length === 0,
  false, // documentMode
  true   // swapColumns: show Division Name | Division ID
)}
              </div>

              {/* CREDIT DOCUMENT */}

              <label className="whitespace-nowrap text-right">
                Document Type :
              </label>

             {renderSelect(
  "lkpDocumentType",
  type,
  documentOptions,
  setDocType,
  () =>
    documentNoRef.current?.focus(),
  creditDocumentRef,
   true,
                  ["DocumentType ID", "DocumentType Name"],
                docSelectStyles
)}

              {/* SEARCH */}

              <button
                id="Searchbtn"
                type="button"
                className="
                  h-7.25
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
                  focus:border-[#20884e]
                  focus:outline-none
                  focus:ring-0
                "
                onClick={handleSearch}
                onKeyDown={(event) =>
                  handleKeyboardAction(
                    event,
                    {
                      onEnter: () =>
                        documentNoRef.current?.focus(),
                    }
                  )
                }
              >
                Search
              </button>

              {/* MATCH AMOUNT */}

              <div
                className="
                
                  flex
                  items-center
                  justify-end
                  gap-2
                  
                "
              >
                <label className="whitespace-nowrap">
                  Match Amt. :
                </label>

                <div
                  id="txtMatchAmt"
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
                  {totalMatchAmount.toFixed(
                    2
                  )}
                </div>

                <span className="text-[#00a83b]">
                  Cr.
                </span>
              </div>
            </div>

            {/* ===============================================
                HEADER ROW 3
            =============================================== */}

            <div
              className="
                grid
                grid-cols-[100px_300px_142px_140px_1fr_235px]
                items-center
                gap-x-2.5
                max-[1200px]:grid-cols-[100px_minmax(180px,1fr)_120px_140px_minmax(180px,1fr)]
                max-[1200px]:gap-x-2
                max-[900px]:grid-cols-1
                max-[900px]:gap-y-1.5
              "
            >

              {/* DOCUMENT NO */}

              <label className="text-right whitespace-nowrap">
                Document No. :
              </label>

              <div className="ml-px">
        {renderSelect(
  "lkpDocumentNo.",
  receiptNo,
  documentNoOptions,
  setReceiptNo,
  () => dateRef.current?.focus(),
  documentNoRef,
  false,                  // reverseDropdown
  undefined,              // columnHeaders
  DocumnetNoSelectStyles,   // customStyles
  false,                  // disabled
  true                    // documentMode
)}
              </div>

              {/* MATCH APPLY DATE */}

             <label className="whitespace-nowrap text-right">
  Match Apply Date :
</label>

              <LocalizationProvider dateAdapter={AdapterDayjs}>
  <DatePicker
    value={
      receiptDate
        ? dayjs(receiptDate, "DD-MM-YYYY", true)
        : null
    }
    onChange={(newValue) => {
      if (newValue?.isValid()) {
        setReceiptDate(
          newValue.format("DD-MM-YYYY")
        );
      } else {
        setReceiptDate("");
      }
    }}
    format="DD-MM-YYYY"
    inputRef={dateRef}
    slotProps={{
      textField: {
        id: "dtpDate",
      },

      openPickerButton: {
        sx: {
          padding: "2px",
          margin: 0,
        },
      },

      inputAdornment: {
        sx: {
          margin: 0,
          padding: 0,
        },
      },
    }}
    sx={{
      width: "150px",

      "& .MuiPickersTextField-root": {
        width: "120px",
      },

      /* =========================================
         MAIN INPUT
      ========================================= */
      "& .MuiPickersInputBase-root": {
        width: "140px",
        height: "28px",
        minHeight: "28px",
        boxSizing: "border-box",
        borderRadius: "4px",
        backgroundColor: "#ffffff",
        fontSize: "12px",
        padding: 0,
        overflow: "hidden",
      },

      /* =========================================
         DATE TEXT CONTAINER
         THIS IS THE IMPORTANT PART
      ========================================= */
      "& .MuiPickersInputBase-sectionsContainer": {
        paddingLeft: "10px !important",
        paddingRight: "0px !important",
        marginBottom:"-5px !important",
        marginLeft: "0px !important",
        boxSizing: "border-box",
        overflow: "hidden",
      },

      /* =========================================
         INDIVIDUAL DATE SECTIONS
      ========================================= */
      "& .MuiPickersInputBase-sectionContent": {
        fontSize: "12px",
      },

      /* =========================================
         INPUT
      ========================================= */
      "& .MuiPickersInputBase-input": {
        minWidth: 0,
        width: "100%",
        fontSize: "12px",
        padding: 0,
        height: "28px",
        boxSizing: "border-box",
      },

      /* =========================================
         INPUT ADORNMENT
      ========================================= */
      "& .MuiInputAdornment-root": {
        margin: 0,
        padding: 0,
      },

      /* =========================================
         CALENDAR BUTTON
      ========================================= */
      "& .MuiIconButton-root": {
        width: "24px",
        height: "24px",
        padding: "2px",
        margin: 0,
      },

      "& .MuiSvgIcon-root": {
        fontSize: "16px",
      },

      /* =========================================
         BORDER
      ========================================= */
      "& .MuiPickersOutlinedInput-notchedOutline": {
        borderColor: "#B7C7D7 !important",
      },

      "& .MuiPickersInputBase-root:hover .MuiPickersOutlinedInput-notchedOutline":
        {
          borderColor: "#B7C7D7 !important",
        },

      "& .MuiPickersInputBase-root.Mui-focused .MuiPickersOutlinedInput-notchedOutline":
        {
          borderColor: "#B7C7D7 !important",
          borderWidth: "1px",
        },

      "& .MuiPickersInputBase-root.Mui-error .MuiPickersOutlinedInput-notchedOutline":
        {
          borderColor: "#B7C7D7 !important",
        },

      "& .MuiPickersInputBase-root.Mui-error:hover .MuiPickersOutlinedInput-notchedOutline":
        {
          borderColor: "#B7C7D7 !important",
        },

      "& .MuiPickersInputBase-root.Mui-error.Mui-focused .MuiPickersOutlinedInput-notchedOutline":
        {
          borderColor: "#B7C7D7 !important",
        },
    }}
  />
</LocalizationProvider>

              <div />

              {/* BALANCE */}

              <div
                className="
                  flex
                  items-center
                  justify-end
                  gap-2
                "
              >
                <label className="whitespace-nowrap">
                  Balance Amt. :
                </label>

                <div
                  id="txtBalanceAmt"
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
                    text-[#ff0000]
                  "
                >
                  {balance.toFixed(2)}
                </div>

                <span className="text-[#00a83b]">
                  Cr.
                </span>
              </div>
            </div>
          </div>

          {/* =================================================
              TABLE
          ================================================= */}

          <div
            className="
              mx-6.75
              border
              border-[#bce8d2]
              max-[900px]:mx-2
            "
          >
            <table
            id="tblMatch"
              className="
                w-full
                table-fixed
                border-collapse
              "
            >
              <thead
                className="
                  bg-[#e8f8ef]
                "
              >
                <tr>

                  <th
                    className="
                      w-[5%]
                      border
                      border-[#bce8d2]
                      px-1
                      text-left
                      py-1.25
                      font-normal
                    "
                    id="txtBrID"
                  >
                    Br. ID
                  </th>

                  <th
                    className="
                      w-[10%]
                      text-left
                      border
                      border-[#bce8d2]
                      px-1
                      py-1.25
                      font-normal
                    "
                    id="dtpDate"
                  >
                    Date
                  </th>

                  <th
                    className="
                      w-[12%]
                      text-left
                      border
                      border-[#bce8d2]
                      px-1
                      py-1.25
                      font-normal
                    "
                    id="txtDocumentNo"
                  >
                     Document No.
                  </th>

                  <th
                    className="
                      w-auto
                      text-left
                      border
                      border-[#bce8d2]
                      px-1
                      py-1.25
                      font-normal
                    "
                    id="txtDescription"
                  >
                    Description
                  </th>

                  <th
                    className="
                    text-right
                      w-[10%]
                      border
                      border-[#bce8d2]
                      px-1
                      py-1.25
                      font-normal
                    "
                    id="txtDocumenAmount"
                  >
                    Document Amt.
                  </th>

                  <th
                    className="
                      w-[10%]
                      text-right
                      border
                      border-[#bce8d2]
                      px-1
                      py-1.25
                      font-normal
                    "
                    id="txtDebit"
                  >
                    Debit
                  </th>

                  <th
                    className="
                      w-[10%]
                     text-right

                      border
                      border-[#bce8d2]
                      px-1
                      py-1.25
                      font-normal
                    "
                    id="txtCredit"
                  >
                    Credit
                  </th>

                  <th
                    className="
                      w-[6%]
                      border
                    

                      border-[#bce8d2]
                      px-1
                      py-1.25
                      font-normal
                    "
id="chkMatch"
>
                    Match
                  </th>

                  <th
                    className="
                      w-[10%]
                      border
                      border-[#bce8d2]
                      px-1
                      py-1.25
                      font-normal
                      text-right


                      "
                      id="txtMatchAmt"
                  >
                    Match Amt
                  </th>

                </tr>
              </thead>

              <tbody>
                {rows.map(
                  (
                    row,
                    rowIndex
                  ) => (
                    <tr
                      key={row.id}
                      className="h-6.75"
                    >

                      {/* BR ID */}

                      <td className="border border-[#bce8d2] p-0">
                        <input
                          id={
                            rowIndex === 0
                              ? "txtBrID"
                              : undefined
                          }
                          ref={(element) => {
                            tableRefs.current[
                              `${rowIndex}-brId`
                            ] = element;
                          }}
                          className={
                            tableInputClass
                          }
                          value={
                            row.brId
                          }
                          onChange={(event) =>
                            handleRowChange(
                              rowIndex,
                              "brId",
                              event.target.value
                            )
                          }
                          onKeyDown={(event) =>
                            handleTableKeyDown(
                              event,
                              rowIndex,
                              "brId"
                            )
                          }
                        />
                      </td>

                      {/* DATE */}

                      <td className="border border-[#bce8d2] p-0">
                        <input
                          id={
                            rowIndex === 0
                              ? "dtpDate"
                              : undefined
                          }
                          ref={(element) => {
                            tableRefs.current[
                              `${rowIndex}-date`
                            ] = element;
                          }}
                          className={
                            tableInputClass
                          }
                          value={
                            row.date
                          }
                          onChange={(event) =>
                            handleRowChange(
                              rowIndex,
                              "date",
                              event.target.value
                            )
                          }
                          onKeyDown={(event) =>
                            handleTableKeyDown(
                              event,
                              rowIndex,
                              "date"
                            )
                          }
                        />
                      </td>

                      {/* DOCUMENT NO */}

                      <td className="border border-[#bce8d2] p-0">
                        <input
                          id={
                            rowIndex === 0
                              ? "txtDocumentNo."
                              : undefined
                          }
                          ref={(element) => {
                            tableRefs.current[
                              `${rowIndex}-docNo`
                            ] = element;
                          }}
                          className={
                            tableInputClass
                          }
                          value={
                            row.docNo
                          }
                          onChange={(event) =>
                            handleRowChange(
                              rowIndex,
                              "docNo",
                              event.target.value
                            )
                          }
                          onKeyDown={(event) =>
                            handleTableKeyDown(
                              event,
                              rowIndex,
                              "docNo"
                            )
                          }
                        />
                      </td>

                      {/* DESCRIPTION */}

                      <td className="border border-[#bce8d2] p-0">
                        <input
                          id={
                            rowIndex === 0
                              ? "txtDescription"
                              : undefined
                          }
                          ref={(element) => {
                            tableRefs.current[
                              `${rowIndex}-description`
                            ] = element;
                          }}
                          className={
                            tableInputClass
                          }
                          value={
                            row.description
                          }
                          onChange={(event) =>
                            handleRowChange(
                              rowIndex,
                              "description",
                              event.target.value
                            )
                          }
                          onKeyDown={(event) =>
                            handleTableKeyDown(
                              event,
                              rowIndex,
                              "description"
                            )
                          }
                        />
                      </td>

                      {/* DOCUMENT AMOUNT */}

                      <td className="border border-[#bce8d2] p-0">
                        <input
                          id={
                            rowIndex === 0
                              ? "txtDocumenAmount"
                              : undefined
                          }
                          type="number"
                          ref={(element) => {
                            tableRefs.current[
                              `${rowIndex}-docAmount`
                            ] = element;
                          }}
                          className={`${tableInputClass} text-right`}
                          value={
                            row.docAmount === 0 ? "" : row.docAmount
                          }
                          placeholder="0.00"
                          min="0"
                          step="0.01"
                          onChange={(event) =>
                            handleRowChange(
                              rowIndex,
                              "docAmount",
                              event.target.value === ""
                                ? 0
                                : Number(event.target.value)
                            )
                          }
                          onKeyDown={(event) =>
                            handleTableKeyDown(
                              event,
                              rowIndex,
                              "docAmount"
                            )
                          }
                        />
                      </td>

                      {/* DEBIT */}

                      <td className="border border-[#bce8d2] p-0">
                        <input
                          id={
                            rowIndex === 0
                              ? "txtDebit"
                              : undefined
                          }
                          type="number"
                          ref={(element) => {
                            tableRefs.current[
                              `${rowIndex}-debit`
                            ] = element;
                          }}
                          className={`${tableInputClass} text-right`}
                          value={
                            row.debit === 0 ? "" : row.debit
                          }
                          placeholder="0.00"
                          min="0"
                          step="0.01"
                          onChange={(event) =>
                            handleRowChange(
                              rowIndex,
                              "debit",
                              event.target.value === ""
                                ? 0
                                : Number(event.target.value)
                            )
                          }
                          onKeyDown={(event) =>
                            handleTableKeyDown(
                              event,
                              rowIndex,
                              "debit"
                            )
                          }
                        />
                      </td>

                      {/* CREDIT */}

                      <td className="border border-[#bce8d2] p-0">
                        <input
                          id={
                            rowIndex === 0
                              ? "txtCredit"
                              : undefined
                          }
                          type="number"
                          ref={(element) => {
                            tableRefs.current[
                              `${rowIndex}-credit`
                            ] = element;
                          }}
                          className={`${tableInputClass} text-right`}
                          value={
                            row.credit === 0 ? "" : row.credit
                          }
                          placeholder="0.00"
                          min="0"
                          step="0.01"
                          onChange={(event) =>
                            handleRowChange(
                              rowIndex,
                              "credit",
                              event.target.value === ""
                                ? 0
                                : Number(event.target.value)
                            )
                          }
                          onKeyDown={(event) =>
                            handleTableKeyDown(
                              event,
                              rowIndex,
                              "credit"
                            )
                          }
                        />
                      </td>

                      {/* MATCH */}

                      <td className="border border-[#bce8d2] p-0 text-center">
                        <input
                          id={
                            rowIndex === 0
                              ? "chkMatch"
                              : undefined
                          }
                          type="checkbox"
                          ref={(element) => {
                            tableRefs.current[
                              `${rowIndex}-match`
                            ] = element;
                          }}
                          checked={
                            row.match
                          }
                          onChange={(event) =>
                            handleRowChange(
                              rowIndex,
                              "match",
                              event.target.checked
                            )
                          }
                          onKeyDown={(event) =>
                            handleTableKeyDown(
                              event,
                              rowIndex,
                              "match"
                            )
                          }
                          className="
                            h-3.75
                            w-3.75
                            accent-[#72c99a]
                          "
                        />
                      </td>

                      {/* MATCH AMOUNT */}

                      <td className="border border-[#bce8d2] p-0">
                        <input
                          id={
                            rowIndex === 0
                              ? "txtMatchAmt"
                              : undefined
                          }
                          type="number"
                          ref={(element) => {
                            tableRefs.current[
                              `${rowIndex}-matchAmount`
                            ] = element;
                          }}
                          className={`${tableInputClass} text-right`}
                          value={
                            row.matchAmount === 0 ? "" : row.matchAmount
                          }
                          placeholder="0.00"
                          min="0"
                          step="0.01"
                          onChange={(event) =>
                            handleRowChange(
                              rowIndex,
                              "matchAmount",
                              event.target.value === ""
                                ? 0
                                : Number(event.target.value)
                            )
                          }
                          onKeyDown={(event) =>
                            handleTableKeyDown(
                              event,
                              rowIndex,
                              "matchAmount"
                            )
                          }
                        />
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>

          {/* =================================================
              NOTE + TOTAL
          ================================================= */}

          <div
            className="
              flex
              items-center
              px-6.75
              pt-2.5
              gap-3
              max-[900px]:flex-wrap
              max-[900px]:px-2
            "
          >

            {/* NOTE */}

            <div
              className="
                flex
                flex-1
                items-center
                gap-3.5
                min-w-0
                max-[900px]:w-full
                max-[900px]:flex-none
              "
            >
              <label>
                Note :
              </label>

              <input
                id="txtNote"
                ref={noteRef}
                className="
                  h-6.5
                  w-132
                  max-w-full
                  rounded-[3px]
                  border
                  border-[#b7c7d7]
                  px-2
                  text-[13px]
                  outline-none
                  focus:border-[#20884e]
                  focus:ring-0
                "
                onKeyDown={(event) =>
                  handleKeyboardAction(
                    event,
                    {
                      onEnter:
                        focusSave,
                    }
                  )
                }
              />
            </div>

            {/* TOTALS */}

            <div
              className="
                flex
                items-center
                
                gap-1.75
              "
            >
             <div className="flex items-center gap-2  ">
                 <div
                className="
                mr-1
                  flex
                  h-6.5
                  w-25
                  items-center
                  justify-center
                  border
                  border-[#c8c8c8]
                "
              >
                Total
              </div>

              <div
                className="
                  flex
                  h-6.5
                  w-25
                  items-center
                  justify-end
                  border
                  -ml-0.5
                  border-[#c8c8c8]
                  px-2
                "
              >
                {documentAmount.toFixed(
                  2
                )}
              </div>

              <div
                className="
                  flex
                  h-6.5
                  w-25
                  items-center
                  
                  justify-end
                  border
                  border-[#c8c8c8]
                  px-2
                "
              >
                {totalMatchAmount.toFixed(
                  2
                )}
              </div>
             </div>

              <div
                className="
                  flex
                  ml-14.5
                  h-6.5
                  w-27.5
                  items-center
                  justify-end
                  border
                  border-[#c8c8c8]
                  px-2
                "
              >
                {balance.toFixed(2)}
              </div>
            </div>
          </div>

          {/* =================================================
              DIFFERENCE
          ================================================= */}

<div
  className="
    ml-auto
    -mr-4.25
    flex
    items-center
    justify-end
    gap-2
    px-10.75
    pt-2
    max-[900px]:mr-0
    max-[900px]:px-2
    max-[900px]:w-full
  "
>
  <label>
    Difference :
  </label>

  <div
    className="
      flex
      h-6.25
      w-27.5
      items-center
      justify-end
      border
      border-[#aebdca]
      px-2
      text-[#ff0000]
    "
  >
    {balance.toFixed(2)}
  </div>
</div>
          {/* =================================================
              ACTION BUTTONS
          ================================================= */}

          <div
            className="
              flex
              items-center
              justify-center
              gap-3.25
              pt-2.25
              pb-4.5
              flex-wrap
              px-2
            "
          >
            {buttons.map(
              (
                label,
                index
              ) => (
                <button
                  key={label}
                  id={
                    label ===
                    "Save"
                      ? "btnSave"
                      : label ===
                        "Delete"
                      ? "btnDelete"
                      : "btnClear"
                  }
                  ref={(element) => {
                    actionRefs.current[
                      index
                    ] = element;
                  }}
                  type="button"
                  className="
                    h-10
                    min-w-27
                    rounded-sm
                    border-l
                    border-r
                    border-b
                    border-[#9db8d4]
                    border-t-0
                    bg-linear-to-b
                    from-white
                    to-[#e7eef5]
                    px-4
                    text-[15px]
                    shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]
                    hover:border-[#7f9fbd]
                    hover:from-white
                    hover:to-[#dce8f1]
                    focus:border-[#20884e]
                    focus:from-white
                    focus:to-[#dcefe5]
                    focus:outline-none
                    focus:ring-0
                  "
                  onFocus={() =>
                    setActiveButton(
                      index
                    )
                  }
                  //@ts-ignore
                  onKeyDown={
                    handleActionKeyDown
                  }
                  onClick={() =>
                    executeAction(
                      index
                    )
                  }
                >
                  <span
                    className="
                      bg-linear-to-b
                      from-[#145c34]
                      via-[#20884e]
                      to-[#8fd9ad]
                      bg-clip-text
                      font-medium
                      text-transparent
                    "
                  >
                    <span className="underline decoration-2 underline-offset-1">
                      {label.charAt(
                        0
                      )}
                    </span>

                    {label.slice(
                      1
                    )}
                  </span>
                </button>
              )
            )}
          </div>
        </div>
      );
    }
  );

MatchingComponents.displayName =
  "MatchingComponents";

export default MatchingComponents;