import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

import Select from "react-select";

import {
  handleKeyboardAction,
  focusElement,
} from "../../../hooks/useMatchKeyboard";
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

  setType: React.Dispatch<
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

  onSearch: () => void;

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
        setType,

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

      const selectStyles = {
        control: (base: any) => ({
          ...base,

          minHeight: "29px",

          height: "29px",

          borderRadius: "3px",

          borderColor:
            "#b7c7d7",

          boxShadow: "none",

          fontSize: "13px",

          backgroundColor:
            "#ffffff",
        }),

        valueContainer: (
          base: any
        ) => ({
          ...base,

          height: "29px",

          padding: "0 8px",
        }),

        indicatorsContainer: (
          base: any
        ) => ({
          ...base,

          height: "29px",
        }),

        dropdownIndicator: (
          base: any
        ) => ({
          ...base,

          padding: "4px",
        }),

        clearIndicator: (
          base: any
        ) => ({
          ...base,

          padding: "4px",
        }),

        menu: (base: any) => ({
          ...base,

          zIndex: 100,

          fontSize: "13px",
        }),

        option: (base: any) => ({
          ...base,

          fontSize: "13px",

          padding: "6px 8px",
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
         SELECT HELPER
      ===================================================== */

      const renderSelect = (
        id: string,
        value: string,
        options: SelectOption[],
        onChange: (
          value: string
        ) => void,
        next: () => void,
        selectRef: React.RefObject<
          HTMLDivElement | null
        >
      ) => {
        const selected =
          options.find(
            (option) =>
              option.value === value
          ) ?? null;

        return (
          <div
            id={id}
            ref={selectRef}
            tabIndex={0}
            onKeyDown={(event) =>
              handleKeyboardAction(
                event,
                {
                  onEnter: next,
                }
              )
            }
          >
            <Select
              value={selected}
              options={options}
              styles={selectStyles}
              isSearchable
              onChange={(option) =>
                onChange(
                  option?.value ?? ""
                )
              }
            />
          </div>
        );
      };

      /* =====================================================
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
        "Save",
        "Delete",
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
              h-[35px]
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
              px-[27px]
              pt-[9px]
              pb-[7px]
            "
          >

            {/* ===============================================
                HEADER ROW 1
            =============================================== */}

            <div
              className="
                grid
                grid-cols-[68px_174px_430px_1fr]
                items-center
                gap-x-2.75
                mb-1.25
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
                setCustomerId,
                () =>
                  customerNameRef.current?.focus(),
                customerIdRef
              )}

              {/* CUSTOMER NAME */}

              {renderSelect(
                "lkpCustomerName",
                customerName,
                customerNameOptions,
                setCustomerName,
                () =>
                  divisionRef.current?.focus(),
                customerNameRef
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
                  Doc. Amt. :
                </label>

                <div
                  id="txtDocumentAmount"
                  className="
                    flex
                    h-[29px]
                    w-[115px]
                    shrink-0
                    items-center
                    justify-end
                    rounded-[2px]
                    border
                    border-[#aebdca]
                    bg-white
                    px-[8px]
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
                grid-cols-[68px_250px_125px_140px_75px_1fr]
                items-center
                gap-x-[9px]
                mb-[5px]
              "
            >

              {/* DIVISION */}

              <label className="text-right">
                Division :
              </label>

              {renderSelect(
                "lkpDivision",
                divisionId,
                divisionOptions,
                setDivisionId,
                () =>
                  creditDocumentRef.current?.focus(),
                divisionRef
              )}

              {/* CREDIT DOCUMENT */}

              <label className="whitespace-nowrap text-right">
                Doc Type :
              </label>

              {renderSelect(
                "lkpCreditDocument",
                type,
                [
                  {
                    value: "BR",
                    label: "BR",
                  },
                  {
                    value: "CR",
                    label: "CR",
                  },
                ],
                setType,
                () =>
                  documentNoRef.current?.focus(),
                creditDocumentRef
              )}

              {/* SEARCH */}

              <button
                id="Searchbtn"
                type="button"
                className="
                  h-[29px]
                  rounded-[3px]
                  border
                  border-[#b7c7d7]
                  bg-gradient-to-b
                  from-white
                  to-[#e7eef5]
                  px-[14px]
                  text-[13px]
                  text-slate-700
                  hover:from-white
                  hover:to-[#dce8f1]
                  focus:border-[#20884e]
                  focus:outline-none
                  focus:ring-0
                "
                onClick={onSearch}
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
                  gap-[8px]
                "
              >
                <label className="whitespace-nowrap">
                  Match Amt. :
                </label>

                <div
                  id="txtMatchAmt"
                  className="
                    flex
                    h-[29px]
                    w-[115px]
                    shrink-0
                    items-center
                    justify-end
                    rounded-[2px]
                    border
                    border-[#aebdca]
                    bg-white
                    px-[8px]
                    text-[13px]
                    text-[#00a83b]
                  "
                >
                  {totalMatchAmount.toFixed(
                    2
                  )}
                </div>

                <span className="text-[#00a83b]">
                  Dr.
                </span>
              </div>
            </div>

            {/* ===============================================
                HEADER ROW 3
            =============================================== */}

            <div
              className="
                grid
                grid-cols-[68px_252px_120px_140px_1fr_235px]
                items-center
                gap-x-[10px]
              "
            >

              {/* DOCUMENT NO */}

              <label className="text-right">
                Doc. No. :
              </label>

              {renderSelect(
                "lkpDocumentNo.",
                receiptNo,
                documentOptions,
                setReceiptNo,
                () =>
                  dateRef.current?.focus(),
                documentNoRef
              )}

              {/* MATCH APPLY DATE */}

             <label className="whitespace-nowrap text-right">
  Match Apply Date :
</label>

                 <LocalizationProvider
                          dateAdapter={AdapterDayjs}
                        >
                          <DatePicker
                            value={
                              receiptDate
                                ? dayjs(
                                    receiptDate,
                                    "DD/MM/YYYY",
                                    true
                                  )
                                : null
                            }
                            onChange={(newValue) => {
                              if (newValue?.isValid()) {
                                setReceiptDate(
                                  newValue.format(
                                    "DD/MM/YYYY"
                                  )
                                );
                              } else {
                                setReceiptDate("");
                              }
                            }}
                            format="DD/MM/YYYY"
                            inputRef={dateRef}
                            slotProps={{
                              textField: {
                                id: "dtpDate",
              
                            //     onKeyDown: (event) =>
                            //       handleActionKeyDown(
                            //         event,
                            //         () =>
                            //           receivedFromRef.current?.focus()
                            //       ),
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
    width: "150px",
  },

  "& .MuiPickersInputBase-root": {
    width: "150px",
    height: "28px",
    minHeight: "28px",
    boxSizing: "border-box",
    borderRadius: "4px",
    backgroundColor: "#ffffff",
    fontSize: "12px",
    padding: 0,
    overflow: "hidden",
  },

  "& .MuiPickersInputBase-sectionContainer": {
    minWidth: 0,
    padding: "0 0 0 8px",
    overflow: "hidden",
  },

  "& .MuiPickersInputBase-input": {
    minWidth: 0,
    width: "100%",
    fontSize: "12px",
    padding: 0,
    height: "28px",
    boxSizing: "border-box",
  },

  "& .MuiInputAdornment-root": {
    margin: 0,
    padding: 0,
  },

  "& .MuiIconButton-root": {
    width: "24px",
    height: "24px",
    padding: "2px",
    margin: 0,
  },

  "& .MuiSvgIcon-root": {
    fontSize: "16px",
  },

  /* BORDER */
  "& .MuiPickersOutlinedInput-notchedOutline": {
    borderColor: "#B7C7D7 !important",
  },

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

  "& .MuiPickersInputBase-root.Mui-error:hover .MuiPickersOutlinedInput-notchedOutline": {
    borderColor: "#B7C7D7 !important",
  },

  "& .MuiPickersInputBase-root.Mui-error.Mui-focused .MuiPickersOutlinedInput-notchedOutline": {
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
                  gap-[8px]
                "
              >
                <label className="whitespace-nowrap">
                  Balance Amt. :
                </label>

                <div
                  id="txtBalanceAmount"
                  className="
                    flex
                    h-[29px]
                    w-[115px]
                    shrink-0
                    items-center
                    justify-end
                    rounded-[2px]
                    border
                    border-[#aebdca]
                    bg-white
                    px-[8px]
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
              mx-[27px]
              border
              border-[#bce8d2]
            "
          >
            <table
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
                      py-[5px]
                      font-normal
                    "
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
                      py-[5px]
                      font-normal
                    "
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
                      py-[5px]
                      font-normal
                    "
                  >
                     Doc. No.
                  </th>

                  <th
                    className="
                      w-auto
                      text-left
                      border
                      border-[#bce8d2]
                      px-1
                      py-[5px]
                      font-normal
                    "
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
                      py-[5px]
                      font-normal
                    "
                  >
                    Doc. Amt.
                  </th>

                  <th
                    className="
                      w-[10%]
                      text-right
                      border
                      border-[#bce8d2]
                      px-1
                      py-[5px]
                      font-normal
                    "
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
                      py-[5px]
                      font-normal
                    "
                  >
                    Credit
                  </th>

                  <th
                    className="
                      w-[6%]
                      border
                    

                      border-[#bce8d2]
                      px-1
                      py-[5px]
                      font-normal
                    "
                  >
                    Match
                  </th>

                  <th
                    className="
                      w-[10%]
                      border
                      border-[#bce8d2]
                      px-1
                      py-[5px]
                      font-normal
                      text-right

                    "
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
                      className="h-[27px]"
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
                            h-[15px]
                            w-[15px]
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
              px-[27px]
              pt-[10px]
            "
          >

            {/* NOTE */}

            <div
              className="
                flex
                flex-1
                items-center
                gap-[14px]
              "
            >
              <label>
                Note :
              </label>

              <input
                id="txtNote"
                ref={noteRef}
                className="
                  h-[26px]
                  w-[528px]
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
                
                gap-[7px]
              "
            >
             <div className="flex items-center gap-2  ">
                 <div
                className="
                  flex
                  h-[26px]
                  w-[74px]
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
                  h-[26px]
                  w-[96px]
                  items-center
                  justify-end
                  border
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
                  h-[26px]
                  w-[96px]
                  ml-[8px]
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
                  ml-[55px]
                  h-[26px]
                  w-[110px]
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
    mr-[-17px]
    flex
    items-center
    justify-end
    gap-[8px]
    px-[43px]
    pt-[8px]
  "
>
  <label>
    Difference :
  </label>

  <div
    className="
      flex
      h-[25px]
      w-[110px]
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
              gap-[13px]
              pt-[9px]
              pb-[18px]
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
                    h-[40px]
                    min-w-[108px]
                    rounded-[4px]
                    border-l
                    border-r
                    border-b
                    border-[#9db8d4]
                    border-t-0
                    bg-gradient-to-b
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
                      bg-gradient-to-b
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