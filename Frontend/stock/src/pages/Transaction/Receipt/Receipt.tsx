import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type { SelectInstance } from "react-select";

import ReceiptHeader from "../../../components/Transaction/Receipt/save/ReceiptHeader";

import ReceiptForm, {
  type Branch,
  type FinancialParameter,
} from "../../../components/Transaction/Receipt/save/ReceiptForm";

import ReceiptTable, {
  type TableField,
  type ReceiptTableRef,
  type AccountData,
  type ReceiptRow,
  type CostCenter,
} from "../../../components/Transaction/Receipt/save/ReceiptTable";

import ReceiptBottomForm from "../../../components/Transaction/Receipt/save/ReceiptBottomForm";

import ReceiptActions, {
  type ReceiptActionsRef,
} from "../../../components/Transaction/Receipt/save/ReceiptActions";


/* =========================================================
   CREATE INITIAL ROWS
========================================================= */

const createRows = (): ReceiptRow[] =>
  Array.from({ length: 11 }, (_, index) => ({
    id: index + 1,
    accountId: "",
    accountName: "",
    fgcs:'',
    division: "",
    ccId: "",
    creditAmount: "",
    match: false,
    description: "",
  }));


/* =========================================================
   TABLE FIELD ORDER
========================================================= */

const tableFieldOrder: TableField[] = [
  "accountId",
  "accountName",
  "division",
  "ccId",
  "creditAmount",
  "match",
  "view",
];


/* =========================================================
   API RESPONSE
========================================================= */

interface ReceiptsResponse {
  success: boolean;
  message: string;

  data: Branch[];

  finparam: FinancialParameter[];

  accounts: AccountData[];

  costCenters: CostCenter[];

  defaultBranch: string | null;

  receiptNo: string | null;
}

interface ModifyReceiptResponse {
  exists: boolean;
  header: {
    branch?: string;
    docType?: string;
    docNo?: string;
    receiptDate?: string;
    cashBank?: string;
    cashBankCcId?: string;
    receivedFrom?: string;
    reference?: string;
    note?: string;
  } | null;
  rows: Array<{
    id?: number;
    accountId?: string;
    accountName?: string;
    fgcs?: string;
    division?: string;
    ccId?: string;
    creditAmount?: string | number;
    match?: boolean | string | number;
    description?: string;
  }>;
  total?: number;
  message?: string;
}

const toDocumentType = (value: string) => {
  const normalized = value.trim().toUpperCase();
  return normalized === "B"
    ? "BR"
    : normalized === "C"
    ? "CR"
    : normalized;
};

const formatReceiptDate = (value?: string) => {
  if (!value) {
    return "";
  }

  const datePart = value.slice(0, 10);

  if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
    const [year, month, day] = datePart.split("-");
    return `${day}/${month}/${year}`;
  }

  return value;
};


/* =========================================================
   RECEIPT
========================================================= */

const Receipt: React.FC = () => {

  /* =======================================================
     HEADER FORM STATE


change the name of useState()
     

======================================================= */

  const [branch, setBranch] = useState("");

  const [type, setType] = useState("");

  const [cashBank, setCashBank] = useState("");
  


  const [receivedFrom, setReceivedFrom] =useState("");
  const [reference, setReference] = useState("");


  const [cashBankCcId, setCashBankCcId] = useState("");
  /* =======================================================
     RECEIPT NUMBER
  ======================================================= */

  const [documentNo, setDocumentNo] = useState("");


  /* =======================================================
     RECEIPT DATE
  ======================================================= */

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


  /* =======================================================
     NOTE
  ======================================================= */

  const [note, setNote] =
    useState("");

  const [isModifyMode, setIsModifyMode] =
    useState(false);

  const [receiptMessage, setReceiptMessage] =
    useState("");

  const lastLookupKeyRef =
    useRef("");


  /* =======================================================
     TABLE ROWS

     Description is still stored in each row.

     Example:

       Row 1 -> description
       Row 2 -> description
       Row 3 -> description
  ======================================================= */

  const [rows, setRows] =
    useState<ReceiptRow[]>(
      createRows
    );


  /* =======================================================
     API OPTIONS
  ======================================================= */

  const [branchOptions, setBranchOptions] =
    useState<Branch[]>([]);

  const [accountOptions, setAccountOptions] =
    useState<AccountData[]>([]);

  const [
    financialParameters,
    setFinancialParameters,
  ] =
    useState<FinancialParameter[]>([]);


  /* =======================================================
     COST CENTERS
  ======================================================= */

  const [accountCCID, setAccountCCID] =
    useState<CostCenter[]>([]);


  /* =======================================================
     ACTIVE DESCRIPTION ROW

     This is the row currently associated with the
     Description field.

     IMPORTANT:

     We don't clear this just because Enter is pressed.
  ======================================================= */

  const [
    activeDescriptionRow,
    setActiveDescriptionRow,
  ] =
    useState<number | null>(null);


  /* =======================================================
     DESCRIPTION DISPLAY VALUE

     This is the important part.

     The Description box remembers its previous value.

     Example:

       Row 3 -> "row 3"

       navigation happens

       Description box -> "row 3"

     It does NOT become empty simply because another
     navigation event occurs.
  ======================================================= */

  const [
    descriptionValue,
    setDescriptionValue,
  ] =
    useState("");


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


  const documentNoRef =
    useRef<HTMLInputElement>(null);


  const cashBankRef =
    useRef<
      SelectInstance<
        {
          value: string;
          label: string;
        },
        false
      >
    >(null);


  const dateRef =
    useRef<HTMLInputElement>(null);


  const receivedFromRef =
    useRef<HTMLInputElement>(null);


  const referenceRef =
    useRef<HTMLInputElement>(null);


  const receiptTableRef =
    useRef<ReceiptTableRef>(null);


  const noteRef =
    useRef<HTMLTextAreaElement>(null);


  const descriptionRef =
    useRef<HTMLInputElement>(null);


  const actionsRef =
    useRef<ReceiptActionsRef>(null);


  /* =======================================================
     LOAD RECEIPT DATA
  ======================================================= */

  useEffect(() => {

    const controller =
      new AbortController();


    const handleApi = async () => {

      try {

        const response =
          await fetch(
            "http://localhost:5000/api/getReceipts",
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
          "Receipt Response:",
          result
        );


        if (!result.success) {

          console.error(
            "Receipt API failed:",
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
           FINANCIAL PARAMETERS
        ============================================= */

        setFinancialParameters(
          result.finparam || []
        );


        /* =============================================
           ACCOUNTS
        ============================================= */

        setAccountOptions(
          result.accounts || []
        );


        /* =============================================
           COST CENTERS
        ============================================= */

        setAccountCCID(
          result.costCenters || []
        );


        /* =============================================
           DEFAULT BRANCH
        ============================================= */

        if (result.defaultBranch) {

          setBranch(
            result.defaultBranch
          );
        }


        /* =============================================
           INITIAL RECEIPT NUMBER
        ============================================= */

        if (result.receiptNo) {

          setDocumentNo(
            result.receiptNo
          );
        }

      } catch (error) {

        if (
          error instanceof DOMException &&
          error.name === "AbortError"
        ) {
          return;
        }


        console.error(
          "Receipt API Error:",
          error
        );
      }
    };


    handleApi();


    return () =>
      controller.abort();

  }, []);

  const loadReceiptForModify =
    useCallback(
      async () => {
        const requestedDocumentNo = documentNo.trim();

        if (!branch || !requestedDocumentNo) {
          return;
        }

        const lookupKey = `${branch}|${toDocumentType(type)}|${requestedDocumentNo}`;

        if (lastLookupKeyRef.current === lookupKey) {
          return;
        }

        lastLookupKeyRef.current = lookupKey;
        setReceiptMessage("");

        try {
          const query = new URLSearchParams({
            strbranch: branch,
            strdocType: toDocumentType(type),
            strdocNo: requestedDocumentNo,
          });

          const response = await fetch(
            `http://localhost:5000/api/get/data?${query.toString()}`
          );

          const result =
            (await response.json()) as ModifyReceiptResponse;

          if (!response.ok || !result.exists || !result.header) {
            setIsModifyMode(false);
            setReceiptMessage(
              result.message || "Receipt not found. New receipt mode remains active."
            );
            return;
          }

          const loadedRows = createRows();

          result.rows
            .slice(0, loadedRows.length)
            .forEach((loadedRow, index) => {
              const account = accountOptions.find(
                (option) =>
                  option.faccountid === loadedRow.accountId
              );

              loadedRows[index] = {
                id: index + 1,
                accountId: loadedRow.accountId || "",
                accountName:
                  loadedRow.accountName ||
                  account?.faccountname ||
                  "",
                fgcs:
                  loadedRow.fgcs ||
                  account?.fgcs ||
                  "",
                division: loadedRow.division || "",
                ccId: loadedRow.ccId || "",
                creditAmount:
                  loadedRow.creditAmount === undefined ||
                  loadedRow.creditAmount === null
                    ? ""
                    : String(loadedRow.creditAmount),
                match:
                  loadedRow.match === true ||
                  loadedRow.match === 1 ||
                  loadedRow.match === "1" ||
                  loadedRow.match === "true",
                description: loadedRow.description || "",
              };
            });

          setBranch(result.header.branch || branch);
          setType(
            result.header.docType === "CR" ||
              result.header.docType === "C"
              ? "C"
              : "B"
          );
          setDocumentNo(result.header.docNo || requestedDocumentNo);
          setReceiptDate(
            formatReceiptDate(result.header.receiptDate)
          );
          setCashBank(result.header.cashBank || "");
          setCashBankCcId(result.header.cashBankCcId || "");
          setReceivedFrom(result.header.receivedFrom || "");
          setReference(result.header.reference || "");
          setNote(result.header.note || "");
          setRows(loadedRows);
          setDescriptionValue("");
          setActiveDescriptionRow(null);
          setIsModifyMode(true);
          setReceiptMessage("Receipt loaded successfully.");
          alert('Receipt loaded successfully.')
        } catch (error) {
          lastLookupKeyRef.current = "";
          setIsModifyMode(false);
          setReceiptMessage(
            error instanceof Error
              ? error.message
              : "Unable to load receipt."
          );
        }
      },
      [accountOptions, branch, documentNo, type]
    );

  const resetTableAndLoadNextReceiptNumber =
    useCallback(
      async () => {
        setRows(createRows());
        setCashBank("");
        setReceivedFrom("");
        setReference("");
        setNote("");
        setDescriptionValue("");
        setActiveDescriptionRow(null);
        setIsModifyMode(false);
        lastLookupKeyRef.current = "";

        try {
          const response = await fetch(
            "http://localhost:5000/api/getReceiptDocNumber",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                fbrid: branch,
                fptype: toDocumentType(type),
              }),
            }
          );

          const result = await response.json() as {
            success?: boolean;
            data?: Array<{
              getnextdocno?: string;
            }>;
          };

          if (!response.ok || !result.success) {
            throw new Error("Receipt number could not be reloaded.");
          }

          setDocumentNo(result.data?.[0]?.getnextdocno || "");
        } catch (error) {
          console.error("Receipt number reload error:", error);
          setReceiptMessage(
            "Receipt saved, but the next receipt number could not be loaded."
          );
        }
      },
      [branch, type]
    );


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

      /*
       * We are leaving the table.
       *
       * IMPORTANT:
       * Do NOT clear descriptionValue.
       *
       * This is what allows the old description to remain
       * available when Description is reached again.
       */

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


        /*
         * Put cursor at the end.
         * Do not select all text.
         */

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

        /* ===============================================
           VIEW -> DESCRIPTION
        =============================================== */

        if (
          field === "view"
        ) {

          /*
           * Remember which row is being viewed.
           */

          setActiveDescriptionRow(
            rowIndex
          );


          /*
           * Get the row.
           */

          const row =
            rows[rowIndex];


          /*
           * IMPORTANT:
           *
           * If this row already has a description,
           * load it.
           *
           * If this row has NO description,
           * DO NOT clear descriptionValue.
           *
           * This is the requested behavior:
           *
           *     old description remains.
           */

          setDescriptionValue(
            row?.description || ""
          );


          /*
           * Focus happens AFTER React has updated
           * the description state.
           */

          requestAnimationFrame(() => {

            const input =
              descriptionRef.current;


            if (!input) {
              return;
            }


            input.focus();


            /*
             * IMPORTANT:
             *
             * Do NOT use:
             *
             * input.select();
             *
             * because that selects the complete
             * description.
             *
             * Put cursor at the end instead.
             */

            const position =
              input.value.length;


            input.setSelectionRange(
              position,
              position
            );

          });


          return;
        }


        /* ===============================================
           NEXT FIELD
        =============================================== */

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
        }

      },
      [
        focusTableField,
        rows,
      ]
    );


  /* =======================================================
     DESCRIPTION CHANGE

     Every character typed into the Description field:

     1. Updates descriptionValue.
     2. Updates the active row.

     Therefore modification is preserved.
  ======================================================= */

  const handleDescriptionChange =
    useCallback(
      (value: string) => {

        /*
         * Always keep the value displayed in the
         * Description input.
         */

        setDescriptionValue(
          value
        );


        /*
         * No row selected.
         */

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


        /*
         * Save the modified description
         * into the correct row.
         */

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


        /*
         * IMPORTANT:
         *
         * We DO NOT clear:
         *
         *     descriptionValue
         *
         * The description remains.
         */


        /* ===============================================
           NO ACTIVE DESCRIPTION ROW
        =============================================== */

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


        /* ===============================================
           CURRENT ROW
        =============================================== */

        const currentRow =
          activeDescriptionRow;


        const nextRow =
          currentRow + 1;


        /* ===============================================
           LAST ROW -> NOTE
        =============================================== */

        if (
          nextRow >=
          rows.length
        ) {

          /*
           * We leave the Description field.
           *
           * Keep descriptionValue.
           *
           * Only remove the row association.
           */

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


        /* ===============================================
           NEXT ROW -> ACCOUNT ID

           IMPORTANT:

           DO NOT CLEAR DESCRIPTION.

           The previous description stays available.
        =============================================== */

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
     TOTAL
  ======================================================= */

  const total =
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
     SAVE RECEIPT
  ======================================================= */

  const handleSave =
    useCallback(
      async () => {

        try {

          const receiptData = {

            branch,

            type,

            cashBank,
            cbCcId: cashBankCcId,

            receiptNo: documentNo,

            receiptDate,

            receivedFrom,

            reference,


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
                      // fgcs:row.fgcs,

                    slNo:
                      index + 1,

                    accountId:
                      row.accountId,

                    accountName:
                      row.accountName,
                      
                      fgcs:row.fgcs,

                    division:
                      row.division,

                    ccId:
                      row.ccId,

                    creditAmount:
                      Number(
                        row.creditAmount
                      ) || 0,

                    match:
                      row.match,

                    description:
                      row.description || "",
                  })
                ),


            total:
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


            note,
          };


          /* =============================================
             B -> BR
             C -> CR
          ============================================= */

          const saveType =
            type === "B"
              ? "BR"
              : type === "C"
              ? "CR"
              : type;


          console.log(
            "RECEIPT TYPE:",
            type
          );


          console.log(
            "SAVE TYPE:",
            saveType
          );


          console.log(
            "SENDING RECEIPT:",
            receiptData
          );


          const response =
            await fetch(
              "http://localhost:5000/api/saveReceipt",
              {
                method: "POST",

                headers: {
                  "Content-Type":
                    "application/json",
                },

                body:
                  JSON.stringify({
                    ...receiptData,

                    type:
                      saveType,
                  }),
              }
            );


          const text =
            await response.text();


          console.log(
            "STATUS:",
            response.status
          );


          console.log(
            "RAW RESPONSE:",
            text
          );


          let result;


          try {

            result =
              JSON.parse(text);

          } catch {

            result = {

              success:
                false,

              message:
                text,
            };
          }


          console.log(
            "API RESPONSE:",
            result
          );


          if (!response.ok) {

            alert(
              result.message ||
                `Save failed. Status: ${response.status}`
            );
            // window.location.reload()

            return;
          }


          alert(
            result.message ||
              "Receipt saved successfully"
          );
          await resetTableAndLoadNextReceiptNumber();


        } catch (error) {

          console.error(
            "SAVE ERROR:",
            error
          );


          alert(
            "Cannot connect to Receipt API"
          );
        }

      },
      [
        branch,
        type,
        cashBank,
        cashBankCcId,
        documentNo,
        receiptDate,
        receivedFrom,
        reference,
        rows,
        note,
        resetTableAndLoadNextReceiptNumber,
      ]
    );

  const handleModify =
    useCallback(
      async () => {
        const validRows = rows.filter(
          (row) =>
            row.accountId &&
            row.accountId.trim() !== ""
        );

        if (
          !branch ||
          !type ||
          !documentNo.trim() ||
          !receiptDate ||
          !cashBank ||
          validRows.length === 0
        ) {
          setReceiptMessage(
            "Branch, type, receipt number, date, cash/bank, and one account row are required."
          );
          return;
        }

        try {
          const response = await fetch(
            "http://localhost:5000/api/updateReceipt",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                branch,
                type: toDocumentType(type),
                cashBank,
                cbCcId: cashBankCcId,
                docNo: documentNo.trim(),
                receiptDate,
                receivedFrom,
                reference,
                note,
                rows: validRows.map((row, index) => ({
                  ...row,
                  slNo: index + 1,
                  creditAmount:
                    Number(row.creditAmount) || 0,
                })),
                total,
              }),
            }
          );

          const result = await response.json() as {
            success?: boolean;
            message?: string;
          };

          if (!response.ok || !result.success) {
            throw new Error(
              result.message ||
                "Receipt could not be modified."
            );
          }

          setReceiptMessage(
            result.message ||
              "Receipt modified successfully."
          );
          alert("Receipt modified successfully.");
          await resetTableAndLoadNextReceiptNumber();
        } catch (error) {
          setReceiptMessage(
            error instanceof Error
              ? error.message
              : "Receipt could not be modified."
          );
        }
      },
      [
        branch,
        cashBank,
        cashBankCcId,
        note,
        receiptDate,
        documentNo,
        receivedFrom,
        reference,
        rows,
        total,
        type,
        resetTableAndLoadNextReceiptNumber,
      ]
    );


  /* =======================================================
     CLEAR FORM
  ======================================================= */

  const clearForm =
    useCallback(() => {

      
      

      setCashBank("");
      setCashBankCcId("");

      setReference("");

      setReceivedFrom("");

      setNote("");

      setIsModifyMode(false);

      setReceiptMessage("");

      lastLookupKeyRef.current = "";


      /*
       * Clear description only when the entire form
       * is explicitly cleared.
       */

      setDescriptionValue("");


      setActiveDescriptionRow(
        null
      );


      setReceiptDate(() => {

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


      setRows(
        createRows()
      );


      /*
       * Receipt number remains unchanged.
       */

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

        <ReceiptHeader />


        {/* =================================================
            HEADER FORM
        ================================================= */}

        <ReceiptForm

          branch={
            branch
          }

          setBranch={
            setBranch
          }


          type={
            type
          }

          setType={
            setType
          }


          cashBank={
            cashBank
          }

          setCashBank={
            setCashBank
          }


          reference={
            reference
          }

          setReference={
            setReference
          }


          receivedFrom={
            receivedFrom
          }

          setReceivedFrom={
            setReceivedFrom
          }


          documentNo={
            documentNo
          }

          setDocumentNo={
            setDocumentNo
          }


          receiptDate={
            receiptDate
          }

          setReceiptDate={
            setReceiptDate
          }


          branchRef={
            branchRef
          }

          typeRef={
            typeRef
          }

          documentNoRef={
            documentNoRef
          }

          cashBankRef={
            cashBankRef
          }

          dateRef={
            dateRef
          }

          receivedFromRef={
            receivedFromRef
          }

          referenceRef={
            referenceRef
          }


          focusFirstAccountId={() =>
            focusTableField(
              0,
              "accountId"
            )
          }


          branchOptions={
            branchSelectOptions
          }


          financialParameters={
            financialParameters
          }

          isModifyMode={
            isModifyMode
          }

          documentNoEditable

          onDocumentNoLookup={
            loadReceiptForModify
          }

          preserveCashBankOnLoad={
            isModifyMode
          }

        />


        {/* =================================================
            TABLE
        ================================================= */}

        <ReceiptTable

         url={`${import.meta.env.VITE_BASE_URL}/getReceipts`}

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

          accountOptions={
            accountOptions
          }

          costCenters={
            accountCCID
          }

        />


        {/* =================================================
            TOTAL
        ================================================= */}

        <div
          className="
            mt-2
            mr-16
            ml-auto
            flex
            w-55
            items-center
            gap-2
            text-xs
          "
        >

          <label
            className="whitespace-nowrap"
          >
            Total :
          </label>


          <input
            value={
              total.toFixed(2)
            }
            id="txtTotal"

            readOnly

            className="
              ml-3
              h-6.5
              w-25
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
            BOTTOM FORM
        ================================================= */}

        <ReceiptBottomForm

          description={
            descriptionValue
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

        />
{/* 
        {receiptMessage && (
          <div className="px-5 text-center text-xs text-slate-600">
            {receiptMessage}
          </div>
        )} */}


        {/* =================================================
            ACTIONS
        ================================================= */}

        <ReceiptActions

          ref={
            actionsRef
          }

          clearForm={
            clearForm
          }

          onSave={
            isModifyMode
              ? handleModify
              : handleSave
          }

          saveLabel={
            isModifyMode
              ? "Modify"
              : "Save"
          }

          preventSearchNavigation

          
        />

      </div>

    </div>
  );
};


export default Receipt;