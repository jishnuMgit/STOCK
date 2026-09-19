import React, {
  memo,
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

// import { FaEye } from "react-icons/fa";

import "../Receipt/save/commanReceipt.css";

/* =========================================================
   RECEIPT / MATCH ROW
========================================================= */

export interface ReceiptRow {
  id: number;

  brId: string;

  date: string;

  type: string;

  docNo: string;

  description: string;

  docAmount: string;

  debit: string;

  credit: string;

  match: boolean;

  matchAmount: string;
}

/* =========================================================
   COST CENTER
========================================================= */

export interface CostCenter {
  fccid: string;

  fccname: string;

  fpositionno: number;
}

/* =========================================================
   ACCOUNT DATA
========================================================= */

export interface AccountData {
  fcoid: string;

  faccountid: string;

  faccountgroupid?: string;

  fgph: string;

  fgcs: string;

  faccountname: string;
}

/* =========================================================
   TABLE FIELD

   IMPORTANT:

   This is the exact keyboard order of the grid.
========================================================= */

export type TableField =
  | "brId"
  | "date"
  | "type"
  | "docNo"
  | "description"
  | "docAmount"
  | "debit"
  | "credit"
  | "match"
  | "matchAmount";

/* =========================================================
   TABLE PROPS
========================================================= */

interface MatchTableProps {
  rows: ReceiptRow[];

  handleRowChange: (
    id: number,
    field: keyof ReceiptRow,
    value: string | boolean
  ) => void;

  onFieldEnter: (
    rowIndex: number,
    field: TableField
  ) => void;

  onTableEscape: () => void;

  /*
   * Kept for compatibility with your existing main file.
   * They are not used by this table anymore.
   */
  accountOptions?: AccountData[];

  costCenters?: CostCenter[];
}

/* =========================================================
   TABLE REF
========================================================= */

export interface ReceiptTableRef {
  /*
   * Compatibility name.
   *
   * It now focuses Br. ID of row 1.
   */
  focusFirstAccountId: () => void;

  /*
   * Preferred new name.
   */
  focusFirstBrId: () => void;

  /*
   * Focus any grid field.
   */
  focusField: (
    rowIndex: number,
    field: TableField
  ) => void;
}

/* =========================================================
   ROW REF VALUE

   No react-select.

   Only normal HTML elements are required.
========================================================= */

type RowRefValue =
  | HTMLInputElement
  | HTMLButtonElement
  | null;

/* =========================================================
   ROW REFS
========================================================= */

type RowRefs = Partial<
  Record<TableField, RowRefValue>
>;

/* =========================================================
   RECEIPT ROW PROPS
========================================================= */

interface MatchRowProps {
  row: ReceiptRow;

  index: number;

  isSelected: boolean;

  setSelectedRowId: (
    id: number
  ) => void;

  setRowRef: (
    rowIndex: number,
    field: TableField,
    value: RowRefValue
  ) => void;

  handleRowChange: (
    id: number,
    field: keyof ReceiptRow,
    value: string | boolean
  ) => void;

  onFieldEnter: (
    rowIndex: number,
    field: TableField
  ) => void;

  onTableEscape: () => void;
}

/* =========================================================
   MATCH ROW
========================================================= */

const MatchRow = memo(
  ({
    row,
    index,
    isSelected,
    setSelectedRowId,
    setRowRef,
    handleRowChange,
    onFieldEnter,
    onTableEscape,
  }: MatchRowProps) => {

    /* =====================================================
       INPUT KEY DOWN

       ENTER -> next field

       ESC -> leave table
    ===================================================== */

    const handleInputKeyDown =
      useCallback(
        (
          event: React.KeyboardEvent<HTMLInputElement>,
          field: TableField
        ) => {

          /* ===============================================
             ESC
          =============================================== */

          if (
            event.key === "Escape"
          ) {

            event.preventDefault();

            event.stopPropagation();

            onTableEscape();

            return;
          }


          /* ===============================================
             ENTER
          =============================================== */

          if (
            event.key !== "Enter"
          ) {
            return;
          }

          event.preventDefault();

          event.stopPropagation();

          onFieldEnter(
            index,
            field
          );
        },
        [
          index,
          onFieldEnter,
          onTableEscape,
        ]
      );


    /* =====================================================
       CHECKBOX KEY DOWN
    ===================================================== */

    const handleCheckboxKeyDown =
      useCallback(
        (
          event: React.KeyboardEvent<HTMLInputElement>
        ) => {

          /* ===============================================
             ESC
          =============================================== */

          if (
            event.key === "Escape"
          ) {

            event.preventDefault();

            event.stopPropagation();

            onTableEscape();

            return;
          }


          /* ===============================================
             ENTER
          =============================================== */

          if (
            event.key === "Enter"
          ) {

            event.preventDefault();

            event.stopPropagation();

            onFieldEnter(
              index,
              "match"
            );
          }

        },
        [
          index,
          onFieldEnter,
          onTableEscape,
        ]
      );


    /* =====================================================
       ROW CLICK
    ===================================================== */

    const handleRowClick =
      useCallback(() => {

        setSelectedRowId(
          row.id
        );

      }, [
        row.id,
        setSelectedRowId,
      ]);


    /* =====================================================
       TEXT CHANGE
    ===================================================== */

    const handleInputChange =
      useCallback(
        (
          field:
            | "brId"
            | "date"
            | "type"
            | "docNo"
            | "description"
            | "docAmount"
            | "debit"
            | "credit"
            | "matchAmount",
          value: string
        ) => {

          handleRowChange(
            row.id,
            field,
            value
          );

          setSelectedRowId(
            row.id
          );

        },
        [
          row.id,
          handleRowChange,
          setSelectedRowId,
        ]
      );


    /* =====================================================
       MATCH CHANGE
    ===================================================== */

    const handleMatchChange =
      useCallback(
        (
          event:
            React.ChangeEvent<HTMLInputElement>
        ) => {

          handleRowChange(
            row.id,
            "match",
            event.target.checked
          );

          setSelectedRowId(
            row.id
          );

        },
        [
          row.id,
          handleRowChange,
          setSelectedRowId,
        ]
      );


    /* =====================================================
       COMMON INPUT CLASS
    ===================================================== */

    const inputClass =
      `
        receipt-grid-input
        w-full
      `;


    /* =====================================================
       RETURN
    ===================================================== */

    return (

      <tr
        onClick={
          handleRowClick
        }

        className={
          isSelected
            ? "receipt-row-selected"
            : ""
        }
      >

        {/* =================================================
            BR. ID
        ================================================= */}

        <td
          className="
            receipt-cell
            p-0
          "
        >

          <input
            ref={(element) =>
              setRowRef(
                index,
                "brId",
                element
              )
            }

            type="text"

            value={
              row.brId
            }

            onChange={(event) =>
              handleInputChange(
                "brId",
                event.target.value
              )
            }

            onFocus={() =>
              setSelectedRowId(
                row.id
              )
            }

            onKeyDown={(event) =>
              handleInputKeyDown(
                event,
                "brId"
              )
            }

            className={
              inputClass
            }
          />

        </td>


        {/* =================================================
            DATE
        ================================================= */}

        <td
          className="
            receipt-cell
            p-0
          "
        >

          <input
            ref={(element) =>
              setRowRef(
                index,
                "date",
                element
              )
            }

            type="text"

            value={
              row.date
            }

            onChange={(event) =>
              handleInputChange(
                "date",
                event.target.value
              )
            }

            onFocus={() =>
              setSelectedRowId(
                row.id
              )
            }

            onKeyDown={(event) =>
              handleInputKeyDown(
                event,
                "date"
              )
            }

            className={
              inputClass
            }

            placeholder=""
          />

        </td>


        {/* =================================================
            TYPE
        ================================================= */}

        <td
          className="
            receipt-cell
            p-0
          "
        >

          <input
            ref={(element) =>
              setRowRef(
                index,
                "type",
                element
              )
            }

            type="text"

            value={
              row.type
            }

            onChange={(event) =>
              handleInputChange(
                "type",
                event.target.value
              )
            }

            onFocus={() =>
              setSelectedRowId(
                row.id
              )
            }

            onKeyDown={(event) =>
              handleInputKeyDown(
                event,
                "type"
              )
            }

            className={
              inputClass
            }

            placeholder=""
          />

        </td>


        {/* =================================================
            DOC. NO.
        ================================================= */}

        <td
          className="
            receipt-cell
            p-0
          "
        >

          <input
            ref={(element) =>
              setRowRef(
                index,
                "docNo",
                element
              )
            }

            type="text"

            value={
              row.docNo
            }

            onChange={(event) =>
              handleInputChange(
                "docNo",
                event.target.value
              )
            }

            onFocus={() =>
              setSelectedRowId(
                row.id
              )
            }

            onKeyDown={(event) =>
              handleInputKeyDown(
                event,
                "docNo"
              )
            }

            className={
              inputClass
            }

            placeholder=""
          />

        </td>


        {/* =================================================
            DESCRIPTION
        ================================================= */}

        <td
          className="
            receipt-cell
            p-0
          "
        >

          <input
            ref={(element) =>
              setRowRef(
                index,
                "description",
                element
              )
            }

            type="text"

            value={
              row.description
            }

            onChange={(event) =>
              handleInputChange(
                "description",
                event.target.value
              )
            }

            onFocus={() =>
              setSelectedRowId(
                row.id
              )
            }

            onKeyDown={(event) =>
              handleInputKeyDown(
                event,
                "description"
              )
            }

            className={
              inputClass
            }

            placeholder=""
          />

        </td>


        {/* =================================================
            DOC AMOUNT
        ================================================= */}

        <td
          className="
            receipt-cell
            p-0
          "
        >

          <input
            ref={(element) =>
              setRowRef(
                index,
                "docAmount",
                element
              )
            }

            type="number"

            min="0"

            step="0.01"

            value={
              row.docAmount
            }

            onChange={(event) =>
              handleInputChange(
                "docAmount",
                event.target.value
              )
            }

            onFocus={() =>
              setSelectedRowId(
                row.id
              )
            }

            onKeyDown={(event) =>
              handleInputKeyDown(
                event,
                "docAmount"
              )
            }

            className={`
              ${inputClass}
              text-right
            `}
          />

        </td>


        {/* =================================================
            DEBIT
        ================================================= */}

        <td
          className="
            receipt-cell
            p-0
          "
        >

          <input
            ref={(element) =>
              setRowRef(
                index,
                "debit",
                element
              )
            }

            type="number"

            min="0"

            step="0.01"

            value={
              row.debit
            }

            onChange={(event) =>
              handleInputChange(
                "debit",
                event.target.value
              )
            }

            onFocus={() =>
              setSelectedRowId(
                row.id
              )
            }

            onKeyDown={(event) =>
              handleInputKeyDown(
                event,
                "debit"
              )
            }

            className={`
              ${inputClass}
              text-right
            `}
          />

        </td>


        {/* =================================================
            CREDIT
        ================================================= */}

        <td
          className="
            receipt-cell
            p-0
          "
        >

          <input
            ref={(element) =>
              setRowRef(
                index,
                "credit",
                element
              )
            }

            type="number"

            min="0"

            step="0.01"

            value={
              row.credit
            }

            onChange={(event) =>
              handleInputChange(
                "credit",
                event.target.value
              )
            }

            onFocus={() =>
              setSelectedRowId(
                row.id
              )
            }

            onKeyDown={(event) =>
              handleInputKeyDown(
                event,
                "credit"
              )
            }

            className={`
              ${inputClass}
              text-right
            `}
          />

        </td>


        {/* =================================================
            MATCH
        ================================================= */}

        <td
          className="
            receipt-cell
          "
        >

          <div
            className="
              receipt-checkbox-wrapper
            "
          >

            <input
              ref={(element) =>
                setRowRef(
                  index,
                  "match",
                  element
                )
              }

              type="checkbox"

              checked={
                row.match
              }

              onChange={
                handleMatchChange
              }

              onFocus={() =>
                setSelectedRowId(
                  row.id
                )
              }

              onKeyDown={
                handleCheckboxKeyDown
              }
            />

          </div>

        </td>


        {/* =================================================
            MATCH AMOUNT
        ================================================= */}

        <td
          className="
            receipt-cell
            p-0
          "
        >

          <input
            ref={(element) =>
              setRowRef(
                index,
                "matchAmount",
                element
              )
            }

            type="number"

            min="0"

            step="0.01"

            value={
              row.matchAmount
            }

            onChange={(event) =>
              handleInputChange(
                "matchAmount",
                event.target.value
              )
            }

            onFocus={() =>
              setSelectedRowId(
                row.id
              )
            }

            onKeyDown={(event) =>
              handleInputKeyDown(
                event,
                "matchAmount"
              )
            }

            className={`
              ${inputClass}
              text-right
            `}
          />

        </td>

      </tr>
    );
  }
);

MatchRow.displayName =
  "MatchRow";


/* =========================================================
   MAIN MATCH TABLE
========================================================= */

const MatchTable = forwardRef<
  ReceiptTableRef,
  MatchTableProps
>(
  (
    {
      rows,
      handleRowChange,
      onFieldEnter,
      onTableEscape,
    },
    ref
  ) => {

    /* =====================================================
       SELECTED ROW
    ===================================================== */

    const [
      selectedRowId,
      setSelectedRowIdState,
    ] = useState<
      number | null
    >(null);


    /* =====================================================
       ROW REFS
    ===================================================== */

    const rowRefs =
      useRef<RowRefs[]>([]);


    /* =====================================================
       SET SELECTED ROW
    ===================================================== */

    const setSelectedRowId =
      useCallback(
        (
          id: number
        ) => {

          setSelectedRowIdState(
            id
          );

        },
        []
      );


    /* =====================================================
       SET ROW REF
    ===================================================== */

    const setRowRef =
      useCallback(
        (
          rowIndex: number,
          field: TableField,
          value: RowRefValue
        ) => {

          if (
            !rowRefs.current[
              rowIndex
            ]
          ) {

            rowRefs.current[
              rowIndex
            ] = {};

          }


          if (value) {

            rowRefs.current[
              rowIndex
            ][field] = value;

          } else {

            delete rowRefs.current[
              rowIndex
            ][field];

          }

        },
        []
      );


    /* =====================================================
       FOCUS FIELD
    ===================================================== */

    const focusField =
      useCallback(
        (
          rowIndex: number,
          field: TableField
        ) => {

          const element =
            rowRefs.current[
              rowIndex
            ]?.[field];


          if (!element) {

            console.warn(
              "MatchTable: field not found",
              {
                rowIndex,
                field,
              }
            );

            return;
          }


          requestAnimationFrame(
            () => {

              element.focus();


              /* =========================================
                 SELECT TEXT

                 For normal text/number inputs,
                 select the current value.
              ========================================= */

              if (
                element instanceof
                HTMLInputElement
              ) {

                if (
                  element.type !==
                  "checkbox"
                ) {

                  element.select();

                }

              }

            }
          );

        },
        []
      );


    /* =====================================================
       IMPERATIVE HANDLE
    ===================================================== */

    useImperativeHandle(
      ref,
      () => ({

        /* ===============================================
           OLD NAME - COMPATIBILITY
        =============================================== */

        focusFirstAccountId:
          () => {

            focusField(
              0,
              "brId"
            );

          },


        /* ===============================================
           NEW NAME
        =============================================== */

        focusFirstBrId:
          () => {

            focusField(
              0,
              "brId"
            );

          },


        /* ===============================================
           ANY FIELD
        =============================================== */

        focusField,

      }),
      [
        focusField,
      ]
    );


    /* =====================================================
       RETURN
    ===================================================== */

    return (

      <div
        className="
          receipt-table-wrapper
        "
      >

        <table
          className="
            receipt-table
          "
        >

          {/* =================================================
              COLUMN WIDTHS

              10 COLUMNS
          ================================================= */}

          <colgroup>

            {/* Br. ID */}

            <col
              style={{
                width: "60px",
              }}
            />


            {/* Date */}

            <col
              style={{
                width: "100px",
              }}
            />


            {/* Type */}

            <col
              style={{
                width: "65px",
              }}
            />


            {/* Doc. No. */}

            <col
              style={{
                width: "130px",
              }}
            />


            {/* Description */}

            <col
              style={{
                width: "auto",
              }}
            />


            {/* Doc Amt. */}

            <col
              style={{
                width: "105px",
              }}
            />


            {/* Debit */}

            <col
              style={{
                width: "105px",
              }}
            />


            {/* Credit */}

            <col
              style={{
                width: "105px",
              }}
            />


            {/* Match */}

            <col
              style={{
                width: "60px",
              }}
            />


            {/* Match Amt. */}

            <col
              style={{
                width: "115px",
              }}
            />

          </colgroup>


          {/* =================================================
              HEADER
          ================================================= */}

          <thead>

            <tr>

              <th>
                Br. ID
              </th>


              <th>
                Date
              </th>


              <th>
                Type
              </th>


              <th>
                Doc. No.
              </th>


              <th>
                Description
              </th>


              <th
                className="
                  text-right
                "
              >
                Doc Amt.
              </th>


              <th
                className="
                  text-right
                "
              >
                Debit
              </th>


              <th
                className="
                  text-right
                "
              >
                Credit
              </th>


              <th
                className="
                  text-center
                "
              >
                Match
              </th>


              <th
                className="
                  text-right
                "
              >
                Match Amt.
              </th>

            </tr>

          </thead>


          {/* =================================================
              BODY
          ================================================= */}

          <tbody>

            {rows.map(
              (
                row,
                index
              ) => (

                <MatchRow

                  key={
                    row.id
                  }

                  row={
                    row
                  }

                  index={
                    index
                  }

                  isSelected={
                    selectedRowId ===
                    row.id
                  }

                  setSelectedRowId={
                    setSelectedRowId
                  }

                  setRowRef={
                    setRowRef
                  }

                  handleRowChange={
                    handleRowChange
                  }

                  onFieldEnter={
                    onFieldEnter
                  }

                  onTableEscape={
                    onTableEscape
                  }

                />

              )
            )}

          </tbody>

        </table>

      </div>

    );
  }
);

MatchTable.displayName =
  "MatchTable";


export default MatchTable;