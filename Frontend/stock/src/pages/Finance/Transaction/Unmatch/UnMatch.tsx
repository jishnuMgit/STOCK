import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type { SelectInstance } from "react-select";

/* =========================================================
   MATCH TABLE
========================================================= */

import MatchTable, {
  type TableField,
  type ReceiptRow,
} from "../../../../test/MatchTable";

/* =========================================================
   BOTTOM FORM
========================================================= */


/* =========================================================
   ACTIONS
========================================================= */

import ReceiptActions, {
  type ReceiptActionsRef,
} from "../../../../test/ReceiptActions";

/* =========================================================
   MATCH HEADER
========================================================= */

import MatchHeader from "../../../../test/MatchHeader";

import MatchHeaderForm, {
  type SelectOption,
} from "../../../../test/MatchHeaderForm";
import MatchAction from "../../../../test/MatchAction";
import UnMatchTable from "../../../../components/Transaction/UnMatch/UnMatchTable";
import UnMatchHeaderForm from "../../../../components/Transaction/UnMatch/UnMatchHeaderForm";
import UnMatchHeader from "../../../../components/Transaction/UnMatch/UnMatchHeader";

/* =========================================================
   CREATE INITIAL ROWS
========================================================= */

const createRows = (): ReceiptRow[] =>
  Array.from(
    { length: 11 },
    (_, index) => ({
      id: index + 1,

      brId: "",

      date: "",

      type: "",

      docNo: "",

      description: "",

      docAmount: "",

      debit: "",

      credit: "",

      match: false,

      matchAmount: "",
    })
  );

/* =========================================================
   TABLE FIELD ORDER

   IMPORTANT:
   This controls ENTER navigation.

   Br. ID
      ↓
   Date
      ↓
   Type
      ↓
   Doc. No.
      ↓
   Description
      ↓
   Doc. Amt.
      ↓
   Debit
      ↓
   Credit
      ↓
   Match
      ↓
   Match Amt.
      ↓
   Next Row Br. ID
========================================================= */

const tableFieldOrder: TableField[] = [
  "brId",
  "date",
  "type",
  "docNo",
  "description",
  "docAmount",
  "debit",
  "credit",
  "match",
  "matchAmount",
];

/* =========================================================
   API RESPONSE
========================================================= */

interface ReceiptsResponse {
  success: boolean;

  message: string;

  data: {
    fbrid: string;
    fbrname: string;
  }[];

  defaultBranch: string | null;

  receiptNo: string | null;
}

/* =========================================================
   MATCHING
========================================================= */

const UnMatch: React.FC = () => {
  /* =======================================================
     HEADER STATE
  ======================================================= */

  const [branch, setBranch] =
    useState("");

  const [type, setType] =
    useState("BR");

  const [receiptNo, setReceiptNo] =
    useState("");

  const [receiptDate, setReceiptDate] =
    useState(() => {
      const today = new Date();

      const day = String(
        today.getDate()
      ).padStart(2, "0");

      const month = String(
        today.getMonth() + 1
      ).padStart(2, "0");

      const year =
        today.getFullYear();

      return `${day}/${month}/${year}`;
    });

  const [cbAccount, setCbAccount] =
    useState("");

  const [customerId, setCustomerId] =
    useState("");

  const [customerName, setCustomerName] =
    useState("");

  const [divisionId, setDivisionId] =
    useState("");

  const [debitAmount, setDebitAmount] =
    useState(0);

  const [creditAmount, setCreditAmount] =
    useState(0);

  const [reference, setReference] =
    useState("");

  const [receivedFrom, setReceivedFrom] =
    useState("");

  /* =======================================================
     NOTE
  ======================================================= */

  const [note, setNote] =
    useState("");

  /* =======================================================
     TABLE ROWS
  ======================================================= */

  const [rows, setRows] =
    useState<ReceiptRow[]>(
      createRows
    );

  /* =======================================================
     BRANCH OPTIONS
  ======================================================= */

  const [
    branchOptions,
    setBranchOptions,
  ] =
    useState<
      {
        fbrid: string;
        fbrname: string;
      }[]
    >([]);

  /* =======================================================
     DESCRIPTION

     Kept for the existing bottom form.

     The actual grid Description field is handled
     directly by MatchTable.
  ======================================================= */

  const [
    description,
    setDescription,
  ] =
    useState("");

  /* =======================================================
     MATCH AMOUNTS
  ======================================================= */

  const [
    docAmount,
    setDocAmount,
  ] =
    useState(0);

  const [
    matchAmount,
    setMatchAmount,
  ] =
    useState(0);

  const balance =
    docAmount -
    matchAmount;

  /* =======================================================
     HEADER REFS
  ======================================================= */

  const customerIdRef =
    useRef<
      SelectInstance<
        SelectOption,
        false
      >
    >(null);

  const customerNameRef =
    useRef<
      SelectInstance<
        SelectOption,
        false
      >
    >(null);

  const divisionRef =
    useRef<
      SelectInstance<
        SelectOption,
        false
      >
    >(null);

  const typeRef =
    useRef<
      SelectInstance<
        SelectOption,
        false
      >
    >(null);

  const receiptNoRef =
    useRef<HTMLInputElement>(
      null
    );

  const branchRef =
    useRef<
      SelectInstance<
        SelectOption,
        false
      >
    >(null);

  const dateRef =
    useRef<HTMLInputElement>(
      null
    );

  /* =======================================================
     MATCH TABLE REF
  ======================================================= */

  const receiptTableRef =
    useRef<React.ComponentRef<typeof MatchTable>>(
      null
    );

  /* =======================================================
     BOTTOM FORM REFS
  ======================================================= */

  const noteRef =
    useRef<HTMLTextAreaElement>(
      null
    );

  const descriptionRef =
    useRef<HTMLInputElement>(
      null
    );

  /* =======================================================
     ACTION REF
  ======================================================= */

  const actionsRef =
    useRef<ReceiptActionsRef>(
      null
    );

  /* =======================================================
     LOAD INITIAL DATA
  ======================================================= */

  useEffect(() => {
    const controller =
      new AbortController();

    const handleApi =
      async () => {
        try {
          const response =
            await fetch(
              `${import.meta.env.VITE_API_URL}/getReceipts`,
              {
                method: "GET",
                signal:
                  controller.signal,
              }
            );

          if (!response.ok) {
            throw new Error(
              `HTTP Error: ${response.status}`
            );
          }

          const result =
            (await response.json()) as ReceiptsResponse;

          console.log(
            "Matching API Response:",
            result
          );

          if (
            !result.success
          ) {
            console.error(
              "Matching API failed:",
              result.message
            );

            return;
          }

          /* =============================================
             BRANCHES
          ============================================= */

          setBranchOptions(
            result.data || []
          );

          /* =============================================
             DEFAULT BRANCH
          ============================================= */

          if (
            result.defaultBranch
          ) {
            setBranch(
              result.defaultBranch
            );
          }

          /* =============================================
             RECEIPT / DOCUMENT NUMBER
          ============================================= */

          if (
            result.receiptNo
          ) {
            setReceiptNo(
              result.receiptNo
            );
          }
        } catch (
          error
        ) {
          if (
            error instanceof DOMException &&
            error.name ===
              "AbortError"
          ) {
            return;
          }

          console.error(
            "Matching API Error:",
            error
          );
        }
      };

    handleApi();

    return () =>
      controller.abort();
  }, []);

  /* =======================================================
     BRANCH SELECT OPTIONS
  ======================================================= */

  const branchSelectOptions =
    useMemo<SelectOption[]>(
      () =>
        branchOptions.map(
          (item) => ({
            value:
              item.fbrid,

            label:
              item.fbrname,
          })
        ),
      [branchOptions]
    );

  /* =======================================================
     CUSTOMER ID OPTIONS
  ======================================================= */

  const customerIdOptions =
    useMemo<SelectOption[]>(
      () => [],
      []
    );

  /* =======================================================
     CUSTOMER NAME OPTIONS
  ======================================================= */

  const customerNameOptions =
    useMemo<SelectOption[]>(
      () => [],
      []
    );

  /* =======================================================
     DIVISION OPTIONS
  ======================================================= */

  const divisionOptions =
    useMemo<SelectOption[]>(
      () => [],
      []
    );

  /* =======================================================
     DOCUMENT TYPE OPTIONS
  ======================================================= */

  const typeOptions =
    useMemo<SelectOption[]>(
      () => [
        {
          value: "BR",
          label: "BR",
        },
        {
          value: "CR",
          label: "CR",
        },
      ],
      []
    );

  /* =======================================================
     FOCUS TABLE FIELD

     This is the main connection between the header
     and MatchTable.
  ======================================================= */

  const focusTableField =
    useCallback(
      (
        rowIndex: number,
        field: TableField
      ) => {
        receiptTableRef.current?.focusField(
          rowIndex,
          field
        );
      },
      []
    );

  /* =======================================================
     ROW CHANGE
  ======================================================= */

  const handleRowChange =
    useCallback(
      (
        id: number,
        field: keyof ReceiptRow,
        value: string | boolean
      ) => {
        setRows(
          (currentRows) =>
            currentRows.map(
              (row) =>
                row.id === id
                  ? {
                      ...row,
                      [field]:
                        value,
                    }
                  : row
            )
        );
      },
      []
    );

  /* =======================================================
     ESC FROM TABLE -> NOTE
  ======================================================= */

  const handleTableEscape =
    useCallback(() => {
      requestAnimationFrame(
        () => {
          const note =
            noteRef.current;

          if (!note) {
            return;
          }

          note.focus();

          const position =
            note.value.length;

          note.setSelectionRange(
            position,
            position
          );
        }
      );
    }, []);

  /* =======================================================
     TABLE ENTER NAVIGATION

     IMPORTANT:

     MatchTable calls this every time ENTER is
     pressed on a table field.

     Current row:

     Br.ID
       ↓
     Date
       ↓
     Type
       ↓
     Doc.No
       ↓
     Description
       ↓
     Doc.Amount
       ↓
     Debit
       ↓
     Credit
       ↓
     Match
       ↓
     Match Amount

     Then next row Br.ID.
  ======================================================= */

  const handleTableEnter =
    useCallback(
      (
        rowIndex: number,
        field: TableField
      ) => {
        /* ===============================================
           CURRENT FIELD INDEX
        =============================================== */

        const fieldIndex =
          tableFieldOrder.indexOf(
            field
          );

        /* ===============================================
           NEXT FIELD
        =============================================== */

        const nextField =
          tableFieldOrder[
            fieldIndex + 1
          ];

        /* ===============================================
           NEXT FIELD IN SAME ROW
        =============================================== */

        if (nextField) {
          focusTableField(
            rowIndex,
            nextField
          );

          return;
        }

        /* ===============================================
           CURRENT ROW IS COMPLETE

           MOVE TO NEXT ROW
        =============================================== */

        const nextRow =
          rowIndex + 1;

        if (
          nextRow <
          rows.length
        ) {
          focusTableField(
            nextRow,
            "brId"
          );

          return;
        }

        /* ===============================================
           LAST FIELD OF LAST ROW

           GO TO NOTE
        =============================================== */

        requestAnimationFrame(
          () => {
            const note =
              noteRef.current;

            if (!note) {
              return;
            }

            note.focus();

            const position =
              note.value.length;

            note.setSelectionRange(
              position,
              position
            );
          }
        );
      },
      [
        focusTableField,
        rows.length,
      ]
    );

  /* =======================================================
     DESCRIPTION CHANGE

     This is only for the bottom Description component
     if it is still displayed.

     The MatchTable Description column has its own
     row value.
  ======================================================= */

  const handleDescriptionChange =
    useCallback(
      (
        value: string
      ) => {
        setDescription(
          value
        );
      },
      []
    );

  /* =======================================================
     DESCRIPTION ENTER

     Bottom description -> first table Br.ID.

     The grid Description field itself is handled by
     MatchTable -> handleTableEnter.
  ======================================================= */

  const handleDescriptionEnter =
    useCallback(
      (
        event:
          React.KeyboardEvent<HTMLInputElement>
      ) => {
        if (
          event.key !==
          "Enter"
        ) {
          return;
        }

        event.preventDefault();

        event.stopPropagation();

        focusTableField(
          0,
          "brId"
        );
      },
      [focusTableField]
    );

  /* =======================================================
     NOTE ENTER -> SAVE
  ======================================================= */

  const handleNoteEnter =
    useCallback(
      (
        event:
          React.KeyboardEvent<HTMLTextAreaElement>
      ) => {
        if (
          event.key !==
            "Enter" ||
          event.shiftKey
        ) {
          return;
        }

        event.preventDefault();

        event.stopPropagation();

        requestAnimationFrame(
          () => {
            actionsRef.current?.focusSave();
          }
        );
      },
      []
    );

  /* =======================================================
     CALCULATE DOCUMENT AMOUNT

     Uses Doc. Amt. column.
  ======================================================= */

  useEffect(() => {
    const amount =
      rows.reduce(
        (
          sum,
          row
        ) =>
          sum +
          (
            Number(
              row.docAmount
            ) || 0
          ),
        0
      );

    setDocAmount(
      amount
    );
  }, [rows]);

  /* =======================================================
     CALCULATE MATCH AMOUNT

     Only checked rows are included.
  ======================================================= */

  useEffect(() => {
    const amount =
      rows.reduce(
        (
          sum,
          row
        ) => {
          if (
            row.match
          ) {
            return (
              sum +
              (
                Number(
                  row.matchAmount
                ) || 0
              )
            );
          }

          return sum;
        },
        0
      );

    setMatchAmount(
      amount
    );
  }, [rows]);

  /* =======================================================
     SEARCH
  ======================================================= */

  const handleSearch =
    useCallback(() => {
      console.log(
        "MATCH SEARCH",
        {
          customerId,
          customerName,
          division: divisionId,
          type,
          receiptNo,
          branch,
          receiptDate,
        }
      );

      /*
        Connect your matching API here.

        Example:

        POST /api/searchMatching
      */
    }, [
      customerId,
      customerName,
      divisionId,
      type,
      receiptNo,
      branch,
      receiptDate,
    ]);

  /* =======================================================
     SAVE MATCHING DATA
  ======================================================= */

  const handleSave =
    useCallback(
      async () => {
        try {
          const matchingData = {
            customerId,

            customerName,

            division: divisionId,

            type,

            receiptNo,

            branch,

            receiptDate,

            rows:
              rows.map(
                (
                  row,
                  index
                ) => ({
                  id:
                    row.id,

                  slNo:
                    index + 1,

                  brId:
                    row.brId,

                  date:
                    row.date,

                  type:
                    row.type,

                  docNo:
                    row.docNo,

                  description:
                    row.description ||
                    "",

                  docAmount:
                    Number(
                      row.docAmount
                    ) || 0,

                  debit:
                    Number(
                      row.debit
                    ) || 0,

                  credit:
                    Number(
                      row.credit
                    ) || 0,

                  match:
                    row.match,

                  matchAmount:
                    Number(
                      row.matchAmount
                    ) || 0,
                })
              ),

            docAmount,

            matchAmount,

            balance,

            note,
          };

          console.log(
            "MATCHING DATA:",
            matchingData
          );

          /*
            Connect your matching save API here.

            Example:

            const response = await fetch(
              `${import.meta.env.VITE_API_URL}/saveMatching``,
              {
                method: "POST",
                headers: {
                  "Content-Type":
                    "application/json",
                },
                body:
                  JSON.stringify(
                    matchingData
                  ),
              }
            );
          */

          alert(
            "Matching data prepared successfully"
          );
        } catch (
          error
        ) {
          console.error(
            "MATCH SAVE ERROR:",
            error
          );

          alert(
            "Cannot save matching data"
          );
        }
      },
      [
        customerId,
        customerName,
        divisionId,
        type,
        receiptNo,
        branch,
        receiptDate,
        rows,
        docAmount,
        matchAmount,
        balance,
        note,
      ]
    );

  /* =======================================================
     CLEAR FORM
  ======================================================= */

  const clearForm =
    useCallback(() => {
      setCustomerId("");

      setCustomerName("");

      setDivisionId("");

      setType("BR");

      setReceiptNo("");

      setBranch("");

      setCbAccount("");

      setReference("");

      setReceivedFrom("");

      setNote("");

      setDescription("");

      setDocAmount(0);

      setMatchAmount(0);

      setReceiptDate(
        () => {
          const today =
            new Date();

          const day =
            String(
              today.getDate()
            ).padStart(
              2,
              "0"
            );

          const month =
            String(
              today.getMonth() + 1
            ).padStart(
              2,
              "0"
            );

          const year =
            today.getFullYear();

          return `${day}/${month}/${year}`;
        }
      );

      setRows(
        createRows()
      );
    }, []);

  /* =======================================================
     INITIAL FOCUS

     Header first field = Customer ID.
  ======================================================= */

  useEffect(() => {
    requestAnimationFrame(
      () => {
        customerIdRef.current?.focus();
      }
    );
  }, []);

  /* =======================================================
     RETURN
  ======================================================= */

  return (
    <div
      className="
        min-h-screen
        bg-slate-100
        px-5
        py-2
        flex
        flex-col
        justify-center
        items-center
        gap-2.5
      "
    >
      {/* =================================================
          MAIN FORM CONTAINER
      ================================================= */}

      <div
        className="
          mx-auto
          lg:w-280
          md:w-[55%]
          max-w-362.5
          min-w-212.5
          border
          border-gray-400
          bg-white
        "
      >
        {/* =================================================
            HEADER TITLE
        ================================================= */}

        <UnMatchHeader />

        {/* =================================================
            MATCH HEADER FORM
        ================================================= */}

        <UnMatchHeaderForm
          /* =============================================
             CUSTOMER
          ============================================= */

          customerId={
            customerId
          }

          setCustomerId={
            setCustomerId
          }

          customerName={
            customerName
          }

          setCustomerName={
            setCustomerName
          }

          customerIdOptions={
            customerIdOptions
          }

          customerNameOptions={
            customerNameOptions
          }

          /* =============================================
             DIVISION
          ============================================= */

          divisionId={
            divisionId
          }

          setDivisionId={
            setDivisionId
          }

          divisionOptions={
            divisionOptions
          }

          /* =============================================
             DOCUMENT TYPE
          ============================================= */

          type={
            type
          }

          setType={
            setType
          }

          typeOptions={
            typeOptions
          }

          /* =============================================
             DOCUMENT NUMBER
          ============================================= */

          receiptNo={
            receiptNo
          }

          setReceiptNo={
            setReceiptNo
          }

          /* =============================================
             BRANCH
          ============================================= */

          branch={
            branch
          }

          setBranch={
            setBranch
          }

          branchOptions={
            branchSelectOptions
          }

          /* =============================================
             DATE
          ============================================= */

          receiptDate={
            receiptDate
          }

          setReceiptDate={
            setReceiptDate
          }

          /* =============================================
             AMOUNTS
          ============================================= */

          docAmount={
            docAmount
          }

          matchAmount={
            matchAmount
          }

          balance={
            balance
          }

          /* =============================================
             SEARCH
          ============================================= */

          onSearch={
            handleSearch
          }

          /* =============================================
             REFS
          ============================================= */

          customerIdRef={
            customerIdRef
          }

          customerNameRef={
            customerNameRef
          }

          divisionRef={
            divisionRef
          }

          typeRef={
            typeRef
          }

          /* IMPORTANT:
             This was incorrectly passed as:

             receiptNo={receiptNoRef}

             It must be:

             receiptNoRef={receiptNoRef}
          */
//@ts-ignore
          receiptNoRef={
            receiptNoRef
          }

          branchRef={
            branchRef
          }

          dateRef={
            dateRef
          }

          /* =============================================
             TABLE FOCUS
          ============================================= */

          focusFirstAccountId={() =>
            focusTableField(
              0,
              "brId"
            )
          }
        />

        {/* =================================================
            MATCH TABLE

            ENTER NAVIGATION:

            Br.ID
            ↓
            Date
            ↓
            Type
            ↓
            Doc.No.
            ↓
            Description
            ↓
            Doc.Amount
            ↓
            Debit
            ↓
            Credit
            ↓
            Match
            ↓
            Match Amount
            ↓
            Next Row Br.ID
        ================================================= */}

        <UnMatchTable
          ref={
            receiptTableRef
          }

          rows={
            rows
          }

          handleRowChange={
            handleRowChange
          }

          onFieldEnter={
            handleTableEnter
          }

          onTableEscape={
            handleTableEscape
          }
        />

        {/* =================================================
            TOTAL
        ================================================= */}

<div className="mt-2 w-full ">

  {/* =====================================================
      TOTAL ROW
      Aligns exactly with:
      Doc Amt. | Debit | Credit
  ===================================================== */}

  <div className="ml-auto grid w-82.5 grid-cols-3 gap-0 -mr-24">

    {/* DOC AMOUNT */}
 

    {/* DEBIT */}
    <div className="flex justify-end ">
      <input
        value={debitAmount.toFixed(2)}
        readOnly
        className="
          box-border
          h-7.5
          w-23.75
                    rounded-md

          border
          border-[#c7c7c7]
          bg-[#f7f7f7]
          px-2
          text-right
          text-[13px]
          font-semibold
          text-red-600
          outline-none
        "
      />
    </div>

    {/* CREDIT */}
    <div className="flex justify-end ">
      <input
        value={creditAmount.toFixed(2)}
        readOnly
        className="
          box-border
          h-7.5
          w-23.75
                    rounded-md

          border
          border-[#c7c7c7]
          bg-[#f7f7f7]
          px-2
          text-right
          z-100
          text-[13px]
          font-semibold
          text-red-600
          outline-none
        "
      />
    </div>

  </div>


  {/* =====================================================
      DIFFERENCE AMOUNT
      Positioned under the right-side amount columns
  ===================================================== */}



</div>
        {/* =================================================
            BOTTOM FORM
        ================================================= */}

        {/* <ReceiptBottomForm
          description={
            description
          }

          setDescription={
            handleDescriptionChange
          }

          note={
            note
          }

          setNote={
            setNote
          }

          noteRef={
            noteRef
          }

          descriptionRef={
            descriptionRef
          }

          onNoteEnter={
            handleNoteEnter
          }

          onDescriptionEnter={
            handleDescriptionEnter
          }
        /> */}

        {/* =================================================
            ACTIONS
        ================================================= */}

        <MatchAction
          ref={
            actionsRef
          }

          clearForm={
            clearForm
          }

          onSave={
            handleSave
          }
        />
      </div>
    </div>
  );
};

export default UnMatch;