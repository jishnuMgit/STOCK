import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { SelectInstance } from "react-select";

import {
  ReceiptHeader,
  ReceiptForm,
  ReceiptTable,
  ReceiptBottomForm,
  ReceiptActions,

  
  
  type TableField,
  type ReceiptTableRef,
  type SortField,
  type ReceiptActionsRef,
} from "../../../components/Transaction/Receipt/save/ReceitComp";


import  {type SelectOption,type Branch,type FinancialParameter,type CostCenter,  type ReceiptRow,type AccountData, } from '../../../types/receiptypes';
import { toast } from "react-toastify";
import ReceiptPrint from "../../../components/Transaction/Receipt/save/Receipt.print";
/* =========================================================
   CREATE INITIAL ROWS
========================================================= */

const createRows = (): ReceiptRow[] =>
  Array.from({ length: 11 }, (_, index) => ({
    id: index + 1,
    accountId: "",
    accountName: "",
    fgcs: "",
    haveCc: false,
    hasDivision: false,
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
];

/* =========================================================
   INITIAL API RESPONSE
========================================================= */


interface ReceiptsResponse {
  success: boolean;
  message: string;
  data: Branch[];
  finparam: FinancialParameter[];
  accounts: AccountData[];
  accountsortbyId: AccountData[];
  costCenters: CostCenter[];
  defaultBranch: string | null;
  receiptNo: string | null;
  receiptType?: string | null;
}
/* =========================================================
   MODIFY LOOKUP RESPONSE
========================================================= */

interface ModifyReceiptResponse {
  exists: boolean;

  header: {
    branch?: string;
    docType?: string;
    docNo?: string;
    receiptDate?: string;
    cbAccount ?: string;
    ccId ?: string;
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

/* =========================================================
   DOCUMENT TYPE

   B -> BR
   C -> CR
========================================================= */

const toDocumentType = (value: string) => {
  const normalized = value.trim().toUpperCase();

  if (normalized === "B") {
    return "BR";
  }

  if (normalized === "C") {
    return "CR";
  }

  return normalized;
};

/* =========================================================
   DATE FORMAT

   YYYY-MM-DD -> DD/MM/YYYY
========================================================= */

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
   TODAY DATE
========================================================= */




/* =========================================================
   TODAY DATE
========================================================= */

const getTodayDate = () => {
  const today = new Date();

  const day = String(today.getDate()).padStart(2, "0");

  const month = String(today.getMonth() + 1).padStart(2, "0");

  const year = today.getFullYear();

  return `${day}/${month}/${year}`;
};

/* =========================================================
   RECEIPT
========================================================= */

const Receipt: React.FC = () => {
  /* =======================================================
     HEADER FORM STATE
  ======================================================= */
const [isPrint,setIsPrint]=useState(false)
  const [branch, setBranch] = useState("");

  const [type, setType] = useState("");

  const [cbAccount, setCbAccount] = useState("");

  const [receivedFrom, setReceivedFrom] = useState("");

  const [reference, setReference] = useState("");

  const [cbCcId, setCbCcId] = useState("");

  const [documentNo, setDocumentNo] = useState("");

  const [date, setDate] = useState(getTodayDate);

  /* =======================================================
     NOTE
  ======================================================= */

  const [note, setNote] = useState("");

  /* =======================================================
     MODE
  ======================================================= */

  const [isModifyMode, setIsModifyMode] = useState(false);

  const [, setReceiptMessage] = useState("");

  /* =======================================================
     MODIFY LOOKUP TRACKING
  ======================================================= */

  const lastLookupKeyRef = useRef("");

  /* =======================================================
     TABLE ROWS
  ======================================================= */

  const [rows, setRows] =
    useState<ReceiptRow[]>(createRows);

  /* =======================================================
     API OPTIONS
  ======================================================= */

  const [branchOptions, setBranchOptions] =
    useState<Branch[]>([]);

  const [accountOptions, setAccountOptions] =
    useState<AccountData[]>([]);
    
    const [accountSortByIdOptions, setAccountSortByIdOptions] =
  useState<AccountData[]>([]);
  const [
    financialParameters,
    setFinancialParameters,
  ] = useState<FinancialParameter[]>([]);

  const [costCenters, setCostCenters] =
    useState<CostCenter[]>([]);

  /* =======================================================
     ACTIVE DESCRIPTION ROW
  ======================================================= */

  const [
    activeDescriptionRow,
    setActiveDescriptionRow,
  ] = useState<number | null>(null);

  /* =======================================================
     DESCRIPTION
  ======================================================= */

  const [description, setDescription] =
    useState("");

  /* =======================================================
     REFS
  ======================================================= */

  const branchRef =
    useRef<SelectInstance<SelectOption, false>>(null);

  const typeRef =
    useRef<SelectInstance<SelectOption, false>>(null);

  const documentNoRef =
    useRef<HTMLInputElement>(null);

  const cbAccountRef =
    useRef<SelectInstance<SelectOption, false>>(null);

  const dateRef =
    useRef<HTMLInputElement>(null);

  const receivedFromRef =
    useRef<HTMLInputElement>(null);

  const referenceRef =
    useRef<HTMLInputElement>(null);

  const receiptTableRef =
    useRef<ReceiptTableRef>(null);

  const descriptionRef =
    useRef<HTMLInputElement>(null);

  const noteRef =
    useRef<HTMLTextAreaElement>(null);

  const actionsRef =
    useRef<ReceiptActionsRef>(null);

  /* =======================================================
     LOAD RECEIPT DATA
  ======================================================= */

  useEffect(() => {
    const controller = new AbortController();

    const loadReceiptData = async () => {
      try {
        const response = await fetch(
          "http://localhost:5000/api/Receipt/getReceipt",
          {
            method: "GET",
            signal: controller.signal,
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
         if (result.defaultBranch) {
          setBranch(
            result.defaultBranch
          );
        }

        setBranchOptions(
          result.data || []
        );

        setFinancialParameters(
          result.finparam || []
        );

        setAccountOptions(
          result.accounts || []
        );
        setAccountSortByIdOptions(
  result.accountsortbyId || []
);

        setCostCenters(
          result.costCenters || []
        );

       

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

    loadReceiptData();

    return () => {
      controller.abort();
    };
  }, []);


 const handlePrint = useCallback(() => {
  console.log("🖨️ PRINT BUTTON CLICKED");

  setIsPrint(true);
}, []);
  /* =======================================================
     LOAD RECEIPT FOR MODIFY
  ======================================================= */

  const getReceipt =
    useCallback(
      async () => {
        const requestedDocumentNo =
          documentNo.trim();

        if (
          !branch ||
          !requestedDocumentNo
        ) {
          console.log(
            "Modify lookup skipped:",
            {
              branch,
              requestedDocumentNo,
            }
          );

          return;
        }

        const lookupKey =
          `${branch}|${toDocumentType(
            type
          )}|${requestedDocumentNo}`;

        if (
          lastLookupKeyRef.current ===
          lookupKey
        ) {
          return;
        }

        lastLookupKeyRef.current =
          lookupKey;

        setReceiptMessage("");

        try {
          const query =
            new URLSearchParams({
              strbranch: branch,
              strdocType:
                toDocumentType(type),
              strdocNo:
                requestedDocumentNo,
            });

          const url =
            `http://localhost:5000/api/Receipt/get/data?${query.toString()}`;

          console.log(
            "MODIFY LOOKUP URL:",
            url
          );

          const response =
            await fetch(url);

          const responseText =
            await response.text();

          console.log(
            "MODIFY LOOKUP STATUS:",
            response.status
          );

          console.log(
            "MODIFY LOOKUP RESPONSE:",
            responseText
          );

          let result: ModifyReceiptResponse;

          try {
            result =
              JSON.parse(
                responseText
              ) as ModifyReceiptResponse;
          } catch {
            throw new Error(
              responseText ||
                "Invalid response from receipt lookup API."
            );
          }

          if (
            !response.ok ||
            !result.exists ||
            !result.header
          ) {
            setIsModifyMode(false);

            setReceiptMessage(
              result.message ||
                "Receipt not found. New receipt mode remains active."
            );

            return;
          }

          const loadedRows =
            createRows();

          result.rows
            .slice(
              0,
              loadedRows.length
            )
            .forEach(
              (
                loadedRow,
                index
              ) => {
                const account =
                  accountOptions.find(
                    (option) =>
                      option.faccountid ===
                      loadedRow.accountId
                  );

                loadedRows[index] = {
                  id: index + 1,

                  accountId:
                    loadedRow.accountId ||
                    "",

                  accountName:
                    loadedRow.accountName ||
                    account?.faccountname ||
                    "",

                  fgcs:
                    loadedRow.fgcs ||
                    account?.fgcs ||
                    "",

                  haveCc:
                    account?.fhavecc ===
                    true,

                  hasDivision:
                    Boolean(
                      loadedRow.division
                    ),

                  division:
                    loadedRow.division ||
                    "",

                  ccId:
                    loadedRow.ccId ||
                    "",

                  creditAmount:
                    loadedRow.creditAmount ===
                      undefined ||
                    loadedRow.creditAmount ===
                      null
                      ? ""
                      : String(
                          loadedRow.creditAmount
                        ),

                  match:
                    loadedRow.match ===
                      true ||
                    loadedRow.match ===
                      1 ||
                    loadedRow.match ===
                      "1" ||
                    loadedRow.match ===
                      "true",

                  description:
                    loadedRow.description ||
                    "",
                };
              }
            );

          /* ===============================================
             HEADER
          =============================================== */

          setBranch(
            result.header.branch ||
              branch
          );

          setType(
            result.header.docType ===
              "CR" ||
              result.header.docType ===
              "C"
              ? "C"
              : "B"
          );

          setDocumentNo(
            result.header.docNo ||
              requestedDocumentNo
          );

          setDate(
            formatReceiptDate(
              result.header.receiptDate
            )
          );

          setCbAccount(
            result.header.cbAccount  ||
              ""
          );

          setCbCcId(
            result.header.ccId  ||
              ""
          );

          setReceivedFrom(
            result.header.receivedFrom ||
              ""
          );

          setReference(
            result.header.reference ||
              ""
          );

          setNote(
            result.header.note ||
              ""
          );

          setRows(
            loadedRows
          );

          setDescription("");

          setActiveDescriptionRow(
            null
          );

          /* ===============================================
             MODIFY MODE
          =============================================== */

          setIsModifyMode(true);

          setReceiptMessage(
            "Receipt loaded successfully."
          );

          console.log(
            "✅ RECEIPT LOADED FOR MODIFY"
          );

          console.log(
            "LOADED HEADER:",
            result.header
          );

          console.log(
            "LOADED ROWS:",
            loadedRows
          );

          // toast.success(
          //   "Receipt loaded successfully." 
          // );
        } catch (error) {
          lastLookupKeyRef.current =
            "";

          setIsModifyMode(false);

          console.error(
            "MODIFY LOOKUP ERROR:",
            error
          );

          setReceiptMessage(
            error instanceof Error
              ? error.message
              : "Unable to load receipt."
          );
        }
      },
      [
        accountOptions,
        branch,
        documentNo,
        type,
      ]
    );

  /* =======================================================
     RESET TABLE + LOAD NEXT DOCUMENT NUMBER
  ======================================================= */

  const resetTableAndLoadNextReceiptNumber =
    useCallback(
      async () => {
        /* =====================================================
           CLEAR ALL FORM DATA
        ===================================================== */

        setRows(createRows());

        setCbAccount("");
        setCbCcId("");
        setReceivedFrom("");
        setReference("");
        setNote("");
        setDescription("");
        setActiveDescriptionRow(null);

        setDate(getTodayDate());

        setIsModifyMode(false);
        setReceiptMessage("");

        lastLookupKeyRef.current = "";

        /* =====================================================
           RELOAD DEFAULT BRANCH / TYPE / RECEIPT NUMBER

           The backend already returns the default branch,
           receipt type and next receipt number from getReceipt.
        ===================================================== */

        try {
          const response = await fetch(
            "http://localhost:5000/api/Receipt/getReceipt"
          );

          if (!response.ok) {
            throw new Error(
              `Receipt defaults could not be reloaded. Status: ${response.status}`
            );
          }

          const result =
            (await response.json()) as ReceiptsResponse;

          if (!result.success) {
            throw new Error(
              result.message ||
                "Receipt defaults could not be reloaded."
            );
          }

          /* Keep the existing option lists in sync. */
          setBranchOptions(result.data || []);
          setFinancialParameters(result.finparam || []);
          setAccountOptions(result.accounts || []);
          setAccountSortByIdOptions(
            result.accountsortbyId || []
          );
          setCostCenters(result.costCenters || []);

          /* Restore backend default branch. */
          const defaultBranch =
            result.defaultBranch ||
            result.data?.[0]?.fbrid ||
            "";

          if (defaultBranch) {
            setBranch(defaultBranch);
          } else {
            setBranch("");
          }

          /* Restore backend default type when supplied. */
          const defaultReceiptType =
            result.receiptType || "";

          if (defaultReceiptType) {
            const normalizedType =
              defaultReceiptType
                .trim()
                .toUpperCase();

            setType(
              normalizedType === "BR"
                ? "B"
                : normalizedType === "CR"
                ? "C"
                : normalizedType
            );
          }

          /* Load the fresh receipt number returned by backend. */
          if (result.receiptNo) {
            setDocumentNo(result.receiptNo);
          } else {
            setDocumentNo("");
          }

          /* Return focus to Receipt No. */
          requestAnimationFrame(() => {
            documentNoRef.current?.focus();

            const value =
              documentNoRef.current?.value ?? "";

            documentNoRef.current?.setSelectionRange(
              value.length,
              value.length
            );
          });
        } catch (error) {
          console.error(
            "Receipt defaults reload error:",
            error
          );

          setReceiptMessage(
            error instanceof Error
              ? error.message
              : "Receipt saved, but the default receipt form could not be reloaded."
          );
        }
      },
      []
    )

  /* =======================================================
     BRANCH SELECT OPTIONS
  ======================================================= */

  const branchSelectOptions =
    useMemo<SelectOption[]>(
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
     CLEAR ROW
  ======================================================= */

  const handleClearRow = useCallback(
    (id: number) => {
      setRows((currentRows) => {
        const remainingRows = currentRows
          .filter((row) => row.id !== id)
          .map((row, index) => ({
            ...row,
            id: index + 1,
          }));

        const emptyRow: ReceiptRow = {
          id: remainingRows.length + 1,
          accountId: "",
          accountName: "",
          fgcs: "",
          haveCc: false,
          hasDivision: false,
          division: "",
          ccId: "",
          creditAmount: "",
          match: false,
          description: "",
        };

        return [
          ...remainingRows,
          emptyRow,
        ];
      });

      if (
        activeDescriptionRow !== null &&
        rows[activeDescriptionRow]?.id === id
      ) {
        setDescription("");
        setActiveDescriptionRow(null);
      }
    },
    [
      activeDescriptionRow,
      rows,
    ]
  );
  /* =======================================================
     CLEAR DESCRIPTION ROW
  ======================================================= */

  const handleClearDescriptionRow =
    useCallback(
      () => {
        if (
          activeDescriptionRow ===
          null
        ) {
          return;
        }

        const row =
          rows[
            activeDescriptionRow
          ];

        if (row) {
          handleClearRow(
            row.id
          );
        }
      },
      [
        activeDescriptionRow,
        handleClearRow,
        rows,
      ]
    );

  /* =======================================================
     SORT ROWS
  ======================================================= */

  const handleSortRows =
    useCallback(
      (
        field: SortField,
        direction: "asc" | "desc"
      ) => {
        setRows(
          (currentRows) =>
            [...currentRows].sort(
              (
                first,
                second
              ) => {
                const firstValue =
                  field ===
                  "accountId"
                    ? first.accountId
                    : first.accountName;

                const secondValue =
                  field ===
                  "accountId"
                    ? second.accountId
                    : second.accountName;

                const result =
                  field ===
                  "accountId"
                    ? firstValue.localeCompare(
                        secondValue,
                        undefined,
                        {
                          numeric: true,
                          sensitivity:
                            "base",
                        }
                      )
                    : firstValue.localeCompare(
                        secondValue,
                        undefined,
                        {
                          sensitivity:
                            "base",
                        }
                      );

                return direction ===
                  "asc"
                  ? result
                  : -result;
              }
            )
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
     TABLE ESCAPE -> NOTE
  ======================================================= */

  const handleTableEscape =
    useCallback(() => {
      setActiveDescriptionRow(
        null
      );

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
     TABLE ENTER
  ======================================================= */

  const handleTableEnter =
    useCallback(
      (
        rowIndex: number,
        field: TableField
      ) => {
        const row =
          rows[rowIndex];

        /* ===============================================
           ACCOUNT ID REQUIRED
        =============================================== */

        if (
          field ===
            "accountId" &&
          !row?.accountId.trim()
        ) {
          toast.warning(
            "Account ID is required."
          );

          focusTableField(
            rowIndex,
            "accountId"
          );

          return;
        }

        /* ===============================================
           CREDIT REQUIRED
        =============================================== */

        if (
          field ===
            "creditAmount" &&
          !row?.creditAmount.trim()
        ) {
          toast.warning(
            "Credit Amount is required."
          );

          focusTableField(
            rowIndex,
            "creditAmount"
          );

          return;
        }

        /* ===============================================
           CREDIT -> DESCRIPTION
        =============================================== */

        if (
          field ===
          "creditAmount"
        ) {
          setActiveDescriptionRow(
            rowIndex
          );

          setDescription(
            row?.description || ""
          );

          requestAnimationFrame(
            () => {
              const input =
                descriptionRef.current;

              if (!input) {
                return;
              }

              input.focus();

              input.setSelectionRange(
                input.value.length,
                input.value.length
              );
            }
          );

          return;
        }

        /* ===============================================
           AVAILABLE FIELDS
        =============================================== */

        const availableFields =
          tableFieldOrder
            .filter(
              (nextField) =>
                nextField !==
                  "division" ||
                row?.hasDivision
            )
            .filter(
              (nextField) =>
                nextField !==
                  "ccId" ||
                row?.haveCc
            );

        const fieldIndex =
          availableFields.indexOf(
            field
          );

        const nextField =
          availableFields[
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

     Description is stored inside the active row.
  ======================================================= */

  const handleDescriptionChange =
    useCallback(
      (value: string) => {
        setDescription(value);

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
          event.key !==
          "Enter"
        ) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();

        /* ===============================================
           NO ACTIVE ROW
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
           NEXT ROW
        =============================================== */

        const nextRow =
          activeDescriptionRow + 1;

        /* ===============================================
           LAST ROW -> NOTE
        =============================================== */

        if (
          nextRow >=
          rows.length
        ) {
          setActiveDescriptionRow(
            null
          );

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

          return;
        }

        /* ===============================================
           NEXT ROW ACCOUNT ID
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
     NOTE ENTER -> SAVE / MODIFY
  ======================================================= */

  const handleNoteEnter =
    useCallback(
      (
        event: React.KeyboardEvent<HTMLTextAreaElement>
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
     TOTAL
  ======================================================= */

  const total = useMemo(
    () =>
      rows.reduce(
        (
          sum,
          row
        ) =>
          sum +
          (Number(
            row.creditAmount
          ) || 0),
        0
      ),
    [rows]
  );

  /* =======================================================
     SAVE RECEIPT
  ======================================================= */

 const handleSave = useCallback(async () => {
  try {
    const validRows = rows.filter(
      (row) =>
        row.accountId &&
        row.accountId.trim() !== ""
    );

    /* ===============================================
       VALIDATION
    =============================================== */

    const validationFailed =
      !branch ||
      !type ||
      !documentNo.trim() ||
      !date ||
      !cbAccount ||
      validRows.length === 0;

    if (validationFailed) {
      const validationMessage =
        "Branch, type, receipt number, date, cash/bank, and one account row are required.";

      toast.warning(validationMessage);
      return;
    }

    /* ===============================================
       SUBMIT CONFIRMATION (BEFORE API CALL)

       NO  -> No API call, continue editing.
       YES -> Continue Save API.
    =============================================== */

    // const shouldSubmit = window.confirm(
    //   "Do you want to submit?"
    // );
    const shouldSubmit=true

    if (!shouldSubmit) {
      console.log("❌ SAVE CANCELLED BY USER");
      console.log("❌ NO API CALL WAS MADE");
      return;
    }

    /* ===============================================
       CREATE SAVE PAYLOAD
    =============================================== */

    const receiptData = {
      branch,

      type,

      cashBank: cbAccount,

      cbCcId,

      receiptNo: documentNo,

      receiptDate: date,

      receivedFrom,

      reference,

      rows: validRows.map(
        (row, index) => ({
          id: row.id,

          slNo: index + 1,

          accountId: row.accountId,

          accountName: row.accountName,

          fgcs: row.fgcs,

          division: row.division,

          ccId: row.ccId,

          creditAmount:
            Number(row.creditAmount) || 0,

          match: row.match,

          description:
            row.description || "",
        })
      ),

      total,

      note,
    };

    const saveType =
      type === "B"
        ? "BR"
        : type === "C"
        ? "CR"
        : type;

    console.log(
      "========== SAVE RECEIPT =========="
    );

    console.log("RECEIPT TYPE:", type);

    console.log("SAVE TYPE:", saveType);

    console.log(
      "SENDING RECEIPT:",
      receiptData
    );

    /* ===============================================
       SAVE API
    =============================================== */

    const response = await fetch(
      "http://localhost:5000/api/Receipt/saveReceipt",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({
          ...receiptData,

          type: saveType,
        }),
      }
    );

    const text = await response.text();

    console.log(
      "SAVE STATUS:",
      response.status
    );

    console.log(
      "SAVE RAW RESPONSE:",
      text
    );

    let result: {
      success?: boolean;
      message?: string;
    };

    try {
      result = JSON.parse(text);
    } catch {
      result = {
        success: false,
        message: text,
      };
    }

    console.log(
      "SAVE API RESPONSE:",
      result
    );

    if (!response.ok) {
      toast.error(
        result.message ||
          `Save failed. Status: ${response.status}`
      );
      return;
    }

    /* ===============================================
       SUCCESS
    =============================================== */

    toast.success(
      result.message ||
        "saved "
    );

    /* ===============================================
       CLEAR FORM + RECALL DEFAULT BRANCH / TYPE /
       NEW RECEIPT NUMBER
    =============================================== */

    await resetTableAndLoadNextReceiptNumber();

  } catch (error) {
    console.error(
      "SAVE ERROR:",
      error
    );

    toast.error(
      error instanceof Error
        ? error.message
        : "Cannot connect to Receipt API."
    );
  }
}, [
  branch,
  type,
  cbAccount,
  cbCcId,
  documentNo,
  date,
  receivedFrom,
  reference,
  rows,
  total,
  note,
  resetTableAndLoadNextReceiptNumber,
]);

  /* =======================================================
     MODIFY RECEIPT
  ======================================================= */

 const handleModify =
  useCallback(
    async () => {
      /* ===============================================
         THIS MUST APPEAR IMMEDIATELY WHEN BUTTON IS CLICKED
      =============================================== */

      console.log(
        "========================================"
      );

      console.log(
        "🔥 MODIFY FUNCTION CALLED"
      );

      console.log(
        "========================================"
      );

      /* ===============================================
         FILTER VALID ROWS
      =============================================== */

      const validRows =
        rows.filter(
          (row) =>
            row.accountId &&
            row.accountId.trim() !== ""
        );

      console.log(
        "MODIFY CURRENT VALUES:",
        {
          branch,
          type,
          cbAccount,
          cbCcId,
          documentNo,
          date,
          receivedFrom,
          reference,
          note,
        }
      );

      console.log(
        "MODIFY VALID ROWS:",
        validRows
      );

      /* ===============================================
         VALIDATION
      =============================================== */

      const validationFailed =
        !branch ||
        !type ||
        !documentNo.trim() ||
        !date ||
        !cbAccount ||
        validRows.length === 0;

      if (validationFailed) {
        console.error(
          "❌ MODIFY STOPPED BY VALIDATION"
        );

        console.error(
          "Validation values:",
          {
            branch: !!branch,
            type: !!type,
            documentNo:
              !!documentNo.trim(),
            date: !!date,
            cbAccount: !!cbAccount,
            validRows:
              validRows.length,
          }
        );

        const validationMessage =
          "Branch, type, receipt number, date, cash/bank, and one account row are required.";

        setReceiptMessage(
          validationMessage
        );

        toast.warning(
          validationMessage
        );

        return;
      }

      /* ===============================================
         SUBMIT CONFIRMATION

         IMPORTANT:
         This happens BEFORE the API call.

         NO  → no API call, no reset, stay in edit mode.
         YES → continue to API.
      =============================================== */

      const shouldSubmit =true
        // window.confirm(
        //   "Do you want to submit?"
        // );

      if (!shouldSubmit) {
        console.log(
          "❌ MODIFY CANCELLED BY USER"
        );

        console.log(
          "❌ NO API CALL WAS MADE"
        );

        return;
      }

      console.log(
        "✅ MODIFY SUBMISSION CONFIRMED"
      );

      /* ===============================================
         CREATE MODIFY PAYLOAD
      =============================================== */

      const modifyPayload = {
        branch,

        type:
          toDocumentType(type),

        cashBank:
          cbAccount,

        cbCcId,

        /* IMPORTANT:
           Keep the loaded receipt number.
           Do NOT generate a new number.
        */
        docNo:
          documentNo.trim(),

        receiptDate:
          date,

        receivedFrom,

        reference,

        note,

        rows: validRows.map(
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

            fgcs:
              row.fgcs,

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
              row.description ||
              "",
          })
        ),

        total,
      };

      /* ===============================================
         DEBUG PAYLOAD
      =============================================== */

      console.log(
        "🔥 MODIFY PAYLOAD:"
      );

      console.log(
        JSON.stringify(
          modifyPayload,
          null,
          2
        )
      );

      console.log(
        "MODIFY DOC TYPE:",
        modifyPayload.type
      );

      console.log(
        "MODIFY DOC NO:",
        modifyPayload.docNo
      );

      /* ===============================================
         CALL API

         This is reached ONLY when user selected YES.
      =============================================== */

      try {
        console.log(
          "🔥 CALLING:",
          "http://localhost:5000/api/Receipt/modifyReceipt"
        );

        const response =
          await fetch(
            "http://localhost:5000/api/Receipt/modifyReceipt",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify(
                  modifyPayload
                ),
            }
          );

        console.log(
          "🔥 MODIFY API STATUS:",
          response.status
        );

        console.log(
          "🔥 MODIFY API OK:",
          response.ok
        );

        /* =============================================
           READ RESPONSE AS TEXT FIRST
        ============================================= */

        const responseText =
          await response.text();

        console.log(
          "🔥 MODIFY RAW RESPONSE:"
        );

        console.log(
          responseText
        );

        let result: {
          success?: boolean;
          message?: string;
          data?: unknown;
        };

        try {
          result =
            JSON.parse(
              responseText
            ) as {
              success?: boolean;
              message?: string;
              data?: unknown;
            };
        } catch {
          result = {
            success:
              response.ok,
            message:
              responseText,
          };
        }

        console.log(
          "🔥 MODIFY PARSED RESPONSE:",
          result
        );

        /* =============================================
           HTTP ERROR
        ============================================= */

        if (!response.ok) {
          throw new Error(
            result.message ||
              `Receipt could not be modified. HTTP ${response.status}`
          );
        }

        /* =============================================
           SUCCESS

           DO NOT CHECK:
             result.success !== true

           because the backend response currently
           returns message/data without necessarily
           returning success:true.
        ============================================= */

        console.log(
          "✅ MODIFY API SUCCESS"
        );

        setReceiptMessage(
          result.message ||
            "modified successfully."
        );

        toast.success(
          result.message ||
            "modified"
        );

        /* =============================================
           CLEAR FORM + RECALL RECEIPT DATA

           This happens ONLY after successful Modify.

           It will:
           - clear table data
           - clear Received From
           - clear Reference
           - clear Description
           - clear Note
           - load default Branch
           - load default Type
           - fetch a NEW Receipt No
           - exit modify mode
        ============================================= */

        await resetTableAndLoadNextReceiptNumber();

      } catch (error) {
        /* =============================================
           MODIFY ERROR
        ============================================= */

        console.error(
          "🔥 MODIFY ERROR:",
          error
        );

        const errorMessage =
          error instanceof Error
            ? error.message
            : "Receipt could not be modified.";

        setReceiptMessage(
          errorMessage
        );

        toast.error(
          errorMessage
        );
      }
    },
    [
      branch,
      type,
      cbAccount,
      cbCcId,
      documentNo,
      date,
      receivedFrom,
      reference,
      note,
      rows,
      total,
      resetTableAndLoadNextReceiptNumber,
    ]
  );

 /* =======================================================
     Delete RECEIPT
  ======================================================= */


const handledelete = useCallback(async () => {
  try {
    /* ===============================================
       VALIDATION
    =============================================== */

    const validationFailed =
      !branch ||
      !type ||
      !documentNo.trim();

    if (validationFailed) {
      toast.warning(
        "Branch, type, and receipt number are required."
      );
      return;
    }

    /* ===============================================
       DELETE CONFIRMATION
    =============================================== */

     const shouldDelete =
        window.confirm(
          "Do you want to Delete?"
        );

      if (!shouldDelete) {
        console.log(
          "❌ MODIFY CANCELLED BY USER"
        );

        console.log(
          "❌ NO API CALL WAS MADE"
        );

        return;
      }

    /* ===============================================
       CREATE DELETE PAYLOAD
    =============================================== */

    const receiptData = {
      branch,
      type: type + "R",
      receiptNo: documentNo.trim(),
    };

    console.log(
      "DELETE RECEIPT:",
      receiptData
    );

    /* ===============================================
       DELETE API
    =============================================== */

    const response = await fetch(
      "http://localhost:5000/api/Receipt/delete",
      {
        method: "DELETE",

        headers: {
          "Content-Type":
            "application/json",
        },

        body: JSON.stringify(
          receiptData
        ),
      }
    );

    const text =
      await response.text();

    console.log(
      "DELETE STATUS:",
      response.status
    );

    console.log(
      "DELETE RAW RESPONSE:",
      text
    );

    let result: {
      success?: boolean;
      message?: string;
    };

    try {
      result = JSON.parse(text);
    } catch {
      result = {
        success: false,
        message: text,
      };
    }

    console.log(
      "DELETE API RESPONSE:",
      result
    );

    /* ===============================================
       API ERROR
    =============================================== */

    if (!response.ok) {
      toast.error(
        result.message ||
          `Delete failed. Status: ${response.status}`
      );

      return;
    }

    /* ===============================================
       SUCCESS
    =============================================== */

    toast.success(
      result.message ||
        "Receipt deleted successfully"
    );

    /* ===============================================
       CLEAR FORM + LOAD NEXT RECEIPT
    =============================================== */

    await resetTableAndLoadNextReceiptNumber();

  } catch (error) {
    console.error(
      "DELETE ERROR:",
      error
    );

    toast.error(
      error instanceof Error
        ? error.message
        : "Cannot connect to Receipt API."
    );
  }
}, [
  branch,
  type,
  documentNo,
  resetTableAndLoadNextReceiptNumber,
]);


  /* =======================================================
     CLEAR FORM
  ======================================================= */

  const clearForm =
    useCallback(() => {
      /*
       * Clear uses the exact same reset path as the
       * post-Save / post-Modify confirmation.
       */
      void resetTableAndLoadNextReceiptNumber();
    }, [resetTableAndLoadNextReceiptNumber]);

  /* =======================================================
     INITIAL FOCUS
  ======================================================= */

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      documentNoRef.current?.focus();

      const value =
        documentNoRef.current?.value ?? "";

      documentNoRef.current?.setSelectionRange(
        value.length,
        value.length
      );
    });

    return () => {
      cancelAnimationFrame(frame);
    };
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
          branch={branch}
          setBranch={setBranch}

          type={type}
          setType={setType}

          cbAccount={cbAccount}
          setCbAccount={setCbAccount}

          reference={reference}
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

          date={date}
          setDate={setDate}

          branchRef={
            branchRef
          }

          typeRef={
            typeRef
          }

          documentNoRef={
            documentNoRef
          }

          cbAccountRef={
            cbAccountRef
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

          txtDocNo={
            getReceipt
          }

          preserveCbAccountOnLoad={
            isModifyMode
          }
        />

        {/* =================================================
            TABLE
        ================================================= */}

        <ReceiptTable
          ref={
            receiptTableRef
          }

          url={`${import.meta.env.BASE_URL}/Receipt/getDivID`}

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

          onClearRow={
            handleClearRow
          }

          onSortRows={
            handleSortRows
          }

          accountOptions={
            accountOptions
          }
          accountSortByIdOptions={
  accountSortByIdOptions
}
onRowSelect={(id, row) => {
  const rowIndex = rows.findIndex(
    (item) => item.id === id
  );

  if (rowIndex === -1) {
    return;
  }

  setActiveDescriptionRow(rowIndex);
  setDescription(row.description || "");
}}

          costCenters={
            costCenters
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
          <label className="whitespace-nowrap">
            Total :
          </label>

          <input
            id="txtTotCreditAmt"
            value={total.toFixed(2)}
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
               text-[#344054]
            "
          />
        </div>

        {/* =================================================
            BOTTOM FORM
        ================================================= */}

        <ReceiptBottomForm
          description={
            description
          }

          setDescription={
            handleDescriptionChange
          }

          note={note}

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

          onDescriptionClear={
            handleClearDescriptionRow
          }
        />

{isPrint && (
  <ReceiptPrint
    receivedFrom={receivedFrom}
    receiptNo={documentNo}
    date={date}
    reference={reference}
    fop={cbAccount}
    currency="SAR"
    amountInFigures={total}
    amountInWords=""
    description={rows
      .filter(
        (row) =>
          row.accountId &&
          row.accountId.trim() !== ""
      )
      .map(
        (row) =>
          row.description || ""
      )
      .filter(Boolean)
      .join(" ")}
    transactions={rows
      .filter(
        (row) =>
          row.accountId &&
          row.accountId.trim() !== ""
      )
      .map((row) => ({
        accountId: row.accountId,
        accountName: row.accountName,
        description: row.description || "",
        creditAmount:
          Number(row.creditAmount) || 0,
      }))}
    preparedBy="MOHAMMED"
    preparedDate="16/09/2026 16:29"
    autoPrint
    onPrintComplete={() => setIsPrint(false)}
  />
)}

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
            onPrint={handlePrint}


          onSave={
            isModifyMode
              ? handleModify
              : handleSave
          }

          onDelete={
           handledelete
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