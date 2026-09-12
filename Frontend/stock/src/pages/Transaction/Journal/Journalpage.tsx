import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type { SelectInstance } from "react-select";


import JournalTable, {
  type TableField,
  type JournalTableRef,
  type JournalRow,
  type AccountData,
  type CostCenter,
} from "../../../components/Transaction/Journal/JournalTable";

import ReceiptBottomForm from "../../../components/Transaction/Receipt/save/ReceiptBottomForm";

import ReceiptActions, {
  type ReceiptActionsRef,
} from "../../../components/Transaction/Receipt/save/ReceiptActions";

import JournalForm from "../../../components/Transaction/Journal/JournalForm";
import JournalHeader from "../../../components/Transaction/Journal/JournalHeader";

/* =========================================================
   TYPES
========================================================= */

interface Branch {
  fbrid: string;
  fbrname: string;
}

/* =========================================================
   CREATE INITIAL ROWS
========================================================= */

const createRows = (): JournalRow[] =>
  Array.from(
    { length: 11 },
    (_, index) => ({
      id: index + 1,

      accountId: "",

      accountName: "",

      division: "",

      ccId: "",

      debitAmount: "",

      creditAmount: "",

      match: false,

      description: "",
    })
  );

/* =========================================================
   TABLE FIELD ORDER
========================================================= */

const tableFieldOrder: TableField[] = [
  "accountId",
  "accountName",
  "division",
  "ccId",
  "debitAmount",
  "creditAmount",
  "match",
  "view",
];

/* =========================================================
   JOURNAL PAGE
========================================================= */

const JournalPage: React.FC = () => {
  /* =======================================================
     BRANCH
  ======================================================= */

  const [branch, setBranch] =
    useState("JEDDAH");

  /* =======================================================
     JOURNAL TYPE
  ======================================================= */

  const [type, setType] =
    useState("Standard");

  /* =======================================================
     JOURNAL NUMBER
  ======================================================= */

  const [journalNo, setJournalNo] =
    useState("JD26000033");

  /* =======================================================
     JOURNAL DATE
  ======================================================= */

  const [journalDate, setJournalDate] =
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

  /* =======================================================
     NOTE
  ======================================================= */

  const [note, setNote] =
    useState("");

  /* =======================================================
     TABLE ROWS
  ======================================================= */

  const [rows, setRows] =
    useState<JournalRow[]>(
      createRows
    );

  /* =======================================================
     ACTIVE DESCRIPTION ROW
  ======================================================= */

  const [
    activeDescriptionRow,
    setActiveDescriptionRow,
  ] = useState<number | null>(null);

  /* =======================================================
     DESCRIPTION VALUE
  ======================================================= */

  const [
    descriptionValue,
    setDescriptionValue,
  ] = useState("");

  /* =======================================================
     DUMMY BRANCH DATA
  ======================================================= */

  const branchOptions =
    useMemo<Branch[]>(
      () => [
        {
          fbrid: "JEDDAH",
          fbrname: "JEDDAH",
        },

        {
          fbrid: "RIYADH",
          fbrname: "RIYADH",
        },

        {
          fbrid: "DAMMAM",
          fbrname: "DAMMAM",
        },
      ],
      []
    );

  /* =======================================================
     DUMMY ACCOUNT DATA
  ======================================================= */

  const accountOptions =
    useMemo<AccountData[]>(
      () => [
        {
          fcoid: "001",
          faccountid: "60001",
          faccountgroupid: "60",
          fgph: "P",
          fgcs: "C",
          faccountname:
            "ABC TRADING",
        },

        {
          fcoid: "001",
          faccountid: "1101001",
          faccountgroupid: "11",
          fgph: "B",
          fgcs: "C",
          faccountname:
            "PETTY CASH",
        },

        {
          fcoid: "001",
          faccountid: "1102002",
          faccountgroupid: "11",
          fgph: "B",
          fgcs: "C",
          faccountname:
            "SAUDI NATIONAL BANK - SNB",
        },

        {
          fcoid: "001",
          faccountid: "41001",
          faccountgroupid: "41",
          fgph: "P",
          fgcs: "R",
          faccountname:
            "SALES REVENUE",
        },

        {
          fcoid: "001",
          faccountid: "51001",
          faccountgroupid: "51",
          fgph: "P",
          fgcs: "E",
          faccountname:
            "OFFICE EXPENSE",
        },

        {
          fcoid: "001",
          faccountid: "61001",
          faccountgroupid: "61",
          fgph: "P",
          fgcs: "E",
          faccountname:
            "TRAVEL EXPENSE",
        },
      ],
      []
    );

  /* =======================================================
     DUMMY COST CENTERS
  ======================================================= */

  const accountCCID =
    useMemo<CostCenter[]>(
      () => [
        {
          fccid: "RH",
          fccname: "RIYADH",
          fpositionno: 1,
        },

        {
          fccid: "JD",
          fccname: "JEDDAH",
          fpositionno: 2,
        },

        {
          fccid: "DM",
          fccname: "DAMMAM",
          fpositionno: 3,
        },
      ],
      []
    );

  /* =======================================================
     REFS
  ======================================================= */

  const branchRef =
    useRef<
      SelectInstance<
        {
          value: string;
          label: string;
        },
        false
      >
    >(null);

  const typeRef =
    useRef<
      SelectInstance<
        {
          value: string;
          label: string;
        },
        false
      >
    >(null);

  const journalNoRef =
    useRef<HTMLInputElement>(null);

  const dateRef =
    useRef<HTMLInputElement>(null);

  const journalTableRef =
    useRef<JournalTableRef>(null);

  const noteRef =
    useRef<HTMLTextAreaElement>(null);

  const descriptionRef =
    useRef<HTMLInputElement>(null);

  const actionsRef =
    useRef<ReceiptActionsRef>(null);

  /* =======================================================
     BRANCH SELECT OPTIONS
  ======================================================= */

  const branchSelectOptions =
    useMemo(
      () =>
        branchOptions.map(
          (item) => ({
            value: item.fbrid,
            label: item.fbrname,
          })
        ),
      [branchOptions]
    );

  /* =======================================================
     FOCUS TABLE FIELD
  ======================================================= */

  const focusTableField =
    useCallback(
      (
        rowIndex: number,
        field: TableField
      ) => {
        journalTableRef.current?.focusField(
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
        field: keyof JournalRow,
        value: string | boolean
      ) => {
        setRows(
          (currentRows) =>
            currentRows.map(
              (row) =>
                row.id === id
                  ? {
                      ...row,
                      [field]: value,
                    }
                  : row
            )
        );
      },
      []
    );

  /* =======================================================
     TABLE ESCAPE -> NOTE
  ======================================================= */

  const handleTableEscape =
    useCallback(() => {
      setActiveDescriptionRow(null);

      requestAnimationFrame(() => {
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
      });
    }, []);

  /* =======================================================
     TABLE ENTER
  ======================================================= */

  const handleTableEnter =
    useCallback(
      (
        rowIndex: number,
        field: TableField
      ) => {
        /* ================================================
           VIEW -> DESCRIPTION
        ================================================= */

        if (field === "view") {
          setActiveDescriptionRow(
            rowIndex
          );

          const row =
            rows[rowIndex];

          if (
            row &&
            row.description &&
            row.description.trim() !== ""
          ) {
            setDescriptionValue(
              row.description
            );
          }

          requestAnimationFrame(() => {
            const input =
              descriptionRef.current;

            if (!input) {
              return;
            }

            input.focus();

            const position =
              input.value.length;

            input.setSelectionRange(
              position,
              position
            );
          });

          return;
        }

        /* ================================================
           NEXT FIELD
        ================================================= */

        const fieldIndex =
          tableFieldOrder.indexOf(
            field
          );

        const nextField =
          tableFieldOrder[
            fieldIndex + 1
          ];

        if (nextField) {
          focusTableField(
            rowIndex,
            nextField
          );
          return;
        }

        /* ================================================
           END OF ROW

           If View is the last field,
           View itself handles Description.
        ================================================= */

        if (
          rowIndex + 1 <
          rows.length
        ) {
          focusTableField(
            rowIndex + 1,
            "accountId"
          );
        }
      },
      [
        focusTableField,
        rows,
      ]
    );

  /* =======================================================
     DESCRIPTION CHANGE
  ======================================================= */

  const handleDescriptionChange =
    useCallback(
      (value: string) => {
        setDescriptionValue(
          value
        );

        if (
          activeDescriptionRow ===
          null
        ) {
          return;
        }

        const activeRow =
          rows[
            activeDescriptionRow
          ];

        if (!activeRow) {
          return;
        }

        const activeRowId =
          activeRow.id;

        setRows(
          (currentRows) =>
            currentRows.map(
              (row) =>
                row.id ===
                activeRowId
                  ? {
                      ...row,
                      description:
                        value,
                    }
                  : row
            )
        );
      },
      [
        activeDescriptionRow,
        rows,
      ]
    );

  /* =======================================================
     DESCRIPTION ENTER
  ======================================================= */

  const handleDescriptionEnter =
    useCallback(
      (
        event: React.KeyboardEvent<HTMLInputElement>
      ) => {
        if (
          event.key !== "Enter"
        ) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();

        /* ==============================================
           NO ACTIVE ROW
        ============================================== */

        if (
          activeDescriptionRow ===
          null
        ) {
          focusTableField(
            0,
            "accountId"
          );

          return;
        }

        /* ==============================================
           CURRENT ROW
        ============================================== */

        const currentRow =
          activeDescriptionRow;

        const nextRow =
          currentRow + 1;

        /* ==============================================
           LAST ROW -> NOTE
        ============================================== */

        if (
          nextRow >=
          rows.length
        ) {
          setActiveDescriptionRow(
            null
          );

          requestAnimationFrame(() => {
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
          });

          return;
        }

        /* ==============================================
           NEXT ROW -> ACCOUNT ID
        ============================================== */

        focusTableField(
          nextRow,
          "accountId"
        );
      },
      [
        activeDescriptionRow,
        focusTableField,
        rows.length,
      ]
    );

  /* =======================================================
     NOTE ENTER -> SAVE
  ======================================================= */

  const handleNoteEnter =
    useCallback(
      (
        event: React.KeyboardEvent<HTMLTextAreaElement>
      ) => {
        if (
          event.key !== "Enter" ||
          event.shiftKey
        ) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();

        requestAnimationFrame(() => {
          actionsRef.current?.focusSave();
        });
      },
      []
    );

  /* =======================================================
     DEBIT TOTAL
  ======================================================= */

  const debitTotal =
    useMemo(
      () =>
        rows.reduce(
          (
            sum,
            row
          ) =>
            sum +
            (
              Number(
                row.debitAmount
              ) || 0
            ),
          0
        ),
      [rows]
    );

  /* =======================================================
     CREDIT TOTAL
  ======================================================= */

  const creditTotal =
    useMemo(
      () =>
        rows.reduce(
          (
            sum,
            row
          ) =>
            sum +
            (
              Number(
                row.creditAmount
              ) || 0
            ),
          0
        ),
      [rows]
    );

  /* =======================================================
     SAVE JOURNAL
  ======================================================= */

  const handleSave =
    useCallback(
      async () => {
        const journalData = {
          branch,

          type,

          journalNo,

          journalDate,

          rows:
            rows
              .filter(
                (row) =>
                  row.accountId &&
                  row.accountId.trim() !== ""
              )
              .map(
                (
                  row,
                  index
                ) => ({
                  id:
                    row.id,

                  slNo:
                    index + 1,

                  accountId:
                    row.accountId,

                  accountName:
                    row.accountName,

                  division:
                    row.division,

                  ccId:
                    row.ccId,

                  debitAmount:
                    Number(
                      row.debitAmount
                    ) || 0,

                  creditAmount:
                    Number(
                      row.creditAmount
                    ) || 0,

                  match:
                    row.match,

                  description:
                    row.description ||
                    "",
                })
              ),

          debitTotal,

          creditTotal,

          note,
        };

        console.log(
          "================================"
        );

        console.log(
          "JOURNAL DATA"
        );

        console.log(
          "================================"
        );

        console.log(
          journalData
        );

        console.log(
          "================================"
        );

        alert(
          "Dummy Journal Save"
        );
      },
      [
        branch,
        type,
        journalNo,
        journalDate,
        rows,
        debitTotal,
        creditTotal,
        note,
      ]
    );

  /* =======================================================
     CLEAR FORM
  ======================================================= */

  const clearForm =
    useCallback(() => {
      setBranch("JEDDAH");

      setType("Standard");

      setJournalNo(
        "JD26000033"
      );

      setJournalDate(() => {
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
      });

      setNote("");

      setDescriptionValue("");

      setActiveDescriptionRow(
        null
      );

      setRows(
        createRows()
      );

      requestAnimationFrame(() => {
        branchRef.current?.focus();
      });
    }, []);

  /* =======================================================
     INITIAL FOCUS
  ======================================================= */

  useEffect(() => {
    branchRef.current?.focus();
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
      <div
        className="
          mx-auto
          lg:w-275
          md:w-[55%]
          max-w-362.5
          min-w-212.5
          border
          border-gray-400
          bg-white
        "
      >
        {/* =================================================
            HEADER
        ================================================= */}

        <JournalHeader />

        {/* =================================================
            JOURNAL FORM
        ================================================= */}

        <JournalForm
          branch={branch}
          setBranch={setBranch}

          type={type}
          setType={setType}

          journalNo={journalNo}
          setJournalNo={setJournalNo}

          journalDate={journalDate}
          setJournalDate={setJournalDate}

          branchRef={branchRef}
          typeRef={typeRef}
          journalNoRef={journalNoRef}
          dateRef={dateRef}

          focusFirstAccountId={() =>
            focusTableField(
              0,
              "accountId"
            )
          }

          branchOptions={
            branchSelectOptions
          }
        />

        {/* =================================================
            JOURNAL TABLE
        ================================================= */}

        <JournalTable
          ref={journalTableRef}

          rows={rows}

          handleRowChange={
            handleRowChange
          }

          onFieldEnter={
            handleTableEnter
          }

          onTableEscape={
            handleTableEscape
          }

          accountOptions={
            accountOptions
          }

          costCenters={
            accountCCID
          }
        />

        {/* =================================================
            TOTALS
        ================================================= */}

        <div
  className="
    mt-2
    mr-36
    ml-auto
    flex
    w-55
    flex-col
    items-end
    gap-2
    text-xs
  "
>
  {/* =================================================
      TOTAL ROW
  ================================================= */}

  <div
    className="
      flex
      items-center
      gap-1
    "
  >
    <input
      value="Total"
      readOnly
      className="
        h-7
        w-18
        rounded
        border
        border-gray-300
        px-2
        text-center
        outline-none
      "
    />

    <input
      value={debitTotal.toFixed(2)}
      readOnly
      className="
        h-7
        w-19
        rounded
        border
        border-gray-300
        px-2
        text-right
        outline-none
      "
    />

    <input
      value={creditTotal.toFixed(2)}
      readOnly
      className="
        h-7
        w-19
        rounded
        border
        border-gray-300
        px-2
        text-right
        outline-none
      "
    />
  </div>

  {/* =================================================
      DR - CR
  ================================================= */}

  <div
    className="
      flex
      items-center
      gap-1
    "
  >
    <label
      className="
        whitespace-nowrap
        text-xs
        text-slate-600
      "
    >
      Dr- Cr:
    </label>

    <input
      value={(
        debitTotal -
        creditTotal
      ).toFixed(2)}
      readOnly
      className="
        h-7
        w-19
        rounded
        border
        border-gray-300
        px-2
        text-right
        outline-none
      "
    />
  </div>
</div>
        {/* =================================================
            BOTTOM FORM
        ================================================= */}

        <ReceiptBottomForm
          description={
            descriptionValue
          }

          setDescription={
            handleDescriptionChange
          }

          note={note}

          setNote={setNote}

          noteRef={noteRef}

          descriptionRef={
            descriptionRef
          }

          onNoteEnter={
            handleNoteEnter
          }

          onDescriptionEnter={
            handleDescriptionEnter
          }
        />

        {/* =================================================
            ACTIONS
        ================================================= */}

        <ReceiptActions
          ref={actionsRef}

          clearForm={clearForm}

          onSave={handleSave}
        />
      </div>
    </div>
  );
};

export default JournalPage;