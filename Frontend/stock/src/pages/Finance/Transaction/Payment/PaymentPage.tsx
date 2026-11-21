import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { SelectInstance } from "react-select";
import type { TableSelectOption } from "../../../../components/common/CommonTableSelect";

import {
  PaymentActions,
  PaymentBottomForm,
  PaymentForm,
  PaymentHeader,
  PaymentTable,
  type TableField,
  type PaymentTableRef,
  type SortField,
  type PaymentActionsRef,
} from "../../../../components/Transaction/Payment/PaymentComponents";

/* Shared types (payment uses the same row/option shapes as receipt). */
import {
  type SelectOption,
  type Branch,
  type FinancialParameter,
  type CostCenter,
  type ReceiptRow,
  type AccountData,
} from "../../../../types/receiptypes";

/*
 * TODO (Payment Print / Excel):
 * The backend has no /Payment/print or /Payment/excel yet.
 * When it exists, restore: the print/excel state, handlePrint,
 * fetchPaymentExcel, the print preview component + PDF builder,
 * and the ReceiptPrintData / ReceiptPrintResponse types.
 */

import { apiFetch, getSession } from "../../../../utils/session";
import { useConfirmModal } from "../../../../hooks/useConfirmModal";
import { useMessageModal } from "../../../../hooks/useMessageModal";

/* =========================================================
   PAYMENT DOC TYPE

   UI "B" -> "BP" (Bank Payment)
   UI "C" -> "CP" (Cash Payment)
   Also accepts "BP" / "CP". Never appends "R".
========================================================= */

const getPaymentStrDocType = (type: string): string => {
  const value = String(type ?? "").trim().toUpperCase();

  if (value === "B" || value === "BP") return "BP";
  if (value === "C" || value === "CP") return "CP";

  return value;
};

/* BP / CP / B / C -> UI value B / C */
const toUiPaymentType = (type: string | null | undefined): string => {
  const value = String(type ?? "").trim().toUpperCase();

  if (value === "BP" || value === "B") return "B";
  if (value === "CP" || value === "C") return "C";

  return value;
};

/* =========================================================
   CREATE INITIAL ROWS
========================================================= */

const createRows = (): ReceiptRow[] =>
  Array.from({ length: 9 }, (_, index) => ({
    id: index + 1,
    slNo: index + 1,
    accountId: "",
    accountName: "",
    fgcs: "",
    haveCc: false,
    haveDivision: false,
    DivID: "",
    CCID: "",
    txtDebitCredit: "",
    amount: 0,
    match: false,
    description: "",
  }));

/* =========================================================
   TABLE FIELD ORDER
========================================================= */

const tableFieldOrder: TableField[] = [
  "accountId",
  "accountName",
  "DivID",
  "CCID",
  "txtDebitCredit",
];

/* =========================================================
   INITIAL API RESPONSE  (GET /Payment/getPayment)
========================================================= */

interface PaymentsResponse {
  success: boolean;
  message: string;
  data: Branch[];
  finparam: FinancialParameter[];
  accounts: AccountData[];
  accountsortbyId: AccountData[];
  costCenters: CostCenter[];
  defaultBranch: string | null;
  paymentNo?: string | null;
  /* same value as paymentNo, kept by the backend */
  receiptNo?: string | null;
  /* "BP" / "CP" */
  paymentType?: string | null;
}

/* =========================================================
   MODIFY LOOKUP RESPONSE  (GET /Payment/get/data)
========================================================= */

interface ModifyPaymentResponse {
  exists: boolean;

  header: {
    lkpBranch?: string;
    lkpType?: string;
    txtDocNo?: string;
    docNo?: string;
    dtpDate?: string;
    fpost?: boolean | string | number;
    cbAccountName?: string;
    CCID?: string;
    /* holds the "Paid To" value */
    paidTo?: string;
    reference?: string;
    note?: string;
  } | null;

  rows: Array<{
    id?: number;
    AccountID?: string;
    AccountName?: string;
    fgcs?: string;
    DivID?: string;
    CCID?: string;
    /* signed: positive = Debit, negative = Credit */
    txtDebitCredit?: string | number;
    match?: boolean | string | number;
    description?: string;
  }>;

  total?: number;

  message?: string;
}

/* =========================================================
   DATE FORMAT

   YYYY-MM-DD -> DD/MM/YYYY
========================================================= */

const formatPaymentDate = (value?: string) => {
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

const getTodayDate = () => {
  const today = new Date();
  const day = String(today.getDate()).padStart(2, "0");
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const year = today.getFullYear();
  return `${day}/${month}/${year}`;
};

const isPostedFlag = (value: unknown) =>
  value === true ||
  value === 1 ||
  ["true", "1", "t"].includes(String(value ?? "").trim().toLowerCase());

/* =========================================================
   PAYMENT
========================================================= */

const PaymentPage: React.FC = () => {
  const { confirm, dialog } = useConfirmModal();
  const { notify, dialog: messageDialog } = useMessageModal("Payment");

  /* =======================================================
     HEADER FORM STATE
  ======================================================= */
  const [lkpBranch, setLkpBranch] = useState("");
  const [lkpType, setLkpType] = useState("");
  const [cbAccountName, setCbAccountName] = useState("");
  /* UI label is "Paid To"; the state/payload key stays paidTo */
  const [paidTo, setPaidTo] = useState("");
  const [reference, setReference] = useState("");
  const [cbCcId, setCbCcId] = useState("");

  const [txtDocNo, setTxtDocNo] = useState("");

  const [focusPaymentNoAfterClear, setFocusPaymentNoAfterClear] = useState(0);
  const [dtpDate, setDtpDate] = useState(getTodayDate);

  /* =======================================================
     NOTE
  ======================================================= */

  const [note, setNote] = useState("");

  /* =======================================================
     MODE
  ======================================================= */

  const [isModifyMode, setIsModifyMode] = useState(false);
  const [isPosted, setIsPosted] = useState(false);
  const [, setPaymentMessage] = useState("");

  /* =======================================================
     MODIFY LOOKUP TRACKING
  ======================================================= */

  const lastLookupKeyRef = useRef("");

  /* =======================================================
     TABLE ROWS
  ======================================================= */

  const [rows, setRows] = useState<ReceiptRow[]>(createRows);

  /* =======================================================
     API OPTIONS
  ======================================================= */

  const [branchOptions, setBranchOptions] = useState<Branch[]>([]);
  const [accountOptions, setAccountOptions] = useState<AccountData[]>([]);
  const [accountSortByIdOptions, setAccountSortByIdOptions] = useState<
    AccountData[]
  >([]);
  const [financialParameters, setFinancialParameters] = useState<
    FinancialParameter[]
  >([]);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);

  /* =======================================================
     ACTIVE DESCRIPTION ROW
  ======================================================= */

  const [activeDescriptionRow, setActiveDescriptionRow] = useState<
    number | null
  >(null);

  /* =======================================================
     DESCRIPTION
  ======================================================= */

  const [description, setDescription] = useState("");

  /* =======================================================
     REFS
  ======================================================= */

  const branchRef = useRef<SelectInstance<TableSelectOption, false>>(null);
  const typeRef = useRef<SelectInstance<TableSelectOption, false>>(null);
  const documentNoRef = useRef<HTMLInputElement>(null);
  const cbAccountRef = useRef<SelectInstance<TableSelectOption, false>>(null);
  const dateRef = useRef<HTMLInputElement>(null);
  const paidToRef = useRef<HTMLInputElement>(null);
  const referenceRef = useRef<HTMLInputElement>(null);
  const paymentTableRef = useRef<PaymentTableRef>(null);
  const descriptionRef = useRef<HTMLInputElement>(null);
  const noteRef = useRef<HTMLTextAreaElement>(null);
  const actionsRef = useRef<PaymentActionsRef>(null);

  /* =======================================================
     LOAD PAYMENT DATA
  ======================================================= */

  useEffect(() => {
    const controller = new AbortController();

    const loadPaymentData = async () => {
      try {
        const response = await apiFetch(
          `${import.meta.env.VITE_API_URL}/Payment/getPayment`,
          {
            method: "GET",
            signal: controller.signal,
          },
        );

        if (!response.ok) {
          throw new Error(`HTTP Error: ${response.status}`);
        }

        const result = (await response.json()) as PaymentsResponse;

        console.log("Payment Response:", result);

        if (!result.success) {
          console.error("Payment API failed:", result.message);

          return;
        }
        if (result.defaultBranch) {
          setLkpBranch(result.defaultBranch);
        }

        setBranchOptions(result.data || []);

        setFinancialParameters(result.finparam || []);

        setAccountOptions(result.accounts || []);
        setAccountSortByIdOptions(result.accountsortbyId || []);

        setCostCenters(result.costCenters || []);

        const initialPaymentNo = result.paymentNo || result.receiptNo;

        if (initialPaymentNo) {
          setTxtDocNo(String(initialPaymentNo));
        }

        setTimeout(() => {
          const input = documentNoRef.current;

          if (!input) {
            console.log("Document No input not found");
            return;
          }

          input.focus();

          const value = input.value;

          input.setSelectionRange(value.length, value.length);

          console.log("Payment No focused:", document.activeElement === input);
        }, 100);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        console.error("Payment API Error:", error);
      }
    };

    loadPaymentData();

    return () => {
      controller.abort();
    };
  }, []);

  /* =======================================================
     PRINT (NOT AVAILABLE YET)

     TODO: Payment print / Excel backend does not exist yet.
     Do NOT call /Payment/print or /Payment/excel until it does.
     The Print button stays in the layout but only shows a notice.
  ======================================================= */

  const handlePrint = useCallback(() => {
    notify.info("Print is not available for Payment yet.");
  }, []);

  /* =======================================================
     LOAD PAYMENT FOR MODIFY
  ======================================================= */

  const getPayment = useCallback(async () => {
    const requestedDocumentNo = txtDocNo.trim();

    if (!lkpBranch || !requestedDocumentNo) {
      console.log("Modify lookup skipped:", {
        lkpBranch,
        requestedDocumentNo,
      });

      return;
    }

    const lookupKey = `${lkpBranch}|${getPaymentStrDocType(
      lkpType,
    )}|${requestedDocumentNo}`;

    if (lastLookupKeyRef.current === lookupKey) {
      return;
    }

    lastLookupKeyRef.current = lookupKey;

    setPaymentMessage("");

    try {
      const query = new URLSearchParams({
        lkpBranch: lkpBranch,
        lkpType: getPaymentStrDocType(lkpType),
        txtDocNo: requestedDocumentNo,
      });

      const url = `${import.meta.env.VITE_API_URL}/Payment/get/data?${query.toString()}`;
      const response = await apiFetch(url);
      const responseText = await response.text();
      let result: ModifyPaymentResponse;

      try {
        result = JSON.parse(responseText) as ModifyPaymentResponse;
      } catch {
        throw new Error(
          responseText || "Invalid response from payment lookup API.",
        );
      }

      if (!response.ok || !result.exists || !result.header) {
        setIsModifyMode(false);
        setIsPosted(false);

        setPaymentMessage(
          result.message ||
          "Payment not found. New payment mode remains active.",
        );

        return;
      }

      const loadedRows = createRows();

      result.rows.slice(0, loadedRows.length).forEach((loadedRow, index) => {
        const account = accountOptions.find(
          (option) => option.faccountid === loadedRow.AccountID,
        );

        /* signed amount: +Dr / -Cr, exactly as saved */
        const loadedAmount = loadedRow.txtDebitCredit;

        loadedRows[index] = {
          id: index + 1,
          slNo: index + 1,

          accountId: loadedRow.AccountID || "",
          accountName: loadedRow.AccountName || account?.faccountname || "",
          fgcs: loadedRow.fgcs || account?.fgcs || "",
          haveCc: account?.fhavecc === true,
          haveDivision: Boolean(loadedRow.DivID),
          DivID: loadedRow.DivID || "",
          CCID: loadedRow.CCID || "",

          txtDebitCredit:
            loadedAmount === undefined || loadedAmount === null
              ? ""
              : String(loadedAmount),
          amount: Number(loadedAmount) || 0,

          match:
            loadedRow.match === true ||
            loadedRow.match === 1 ||
            loadedRow.match === "1" ||
            loadedRow.match === "true",
          description: loadedRow.description || "",
        };
      });

      /* ===============================================
         HEADER
      =============================================== */

      setLkpBranch(result.header.lkpBranch || lkpBranch);

      /* CP / C -> Cash, otherwise Bank */
      setLkpType(
        result.header.lkpType === "CP" || result.header.lkpType === "C"
          ? "C"
          : "B",
      );

      setTxtDocNo(
        result.header.txtDocNo || result.header.docNo || requestedDocumentNo,
      );

      setDtpDate(formatPaymentDate(result.header.dtpDate) || getTodayDate());
      setCbAccountName(result.header.cbAccountName || "");
      setCbCcId(result.header.CCID || "");
      setPaidTo(result.header.paidTo || "");
      setReference(result.header.reference || "");
      setNote(result.header.note || "");
      setRows(loadedRows);
      setDescription("");
      setActiveDescriptionRow(null);
      setIsPosted(isPostedFlag(result.header.fpost));

      /* ===============================================
         MODIFY MODE
      =============================================== */

      setIsModifyMode(true);
      setPaymentMessage("Payment loaded successfully.");
      console.log("✅ PAYMENT LOADED FOR MODIFY");
      console.log("LOADED HEADER:", result.header);
      console.log("LOADED ROWS:", loadedRows);
    } catch (error) {
      lastLookupKeyRef.current = "";
      setIsModifyMode(false);
      setIsPosted(false);
      console.error("MODIFY LOOKUP ERROR:", error);
      setPaymentMessage(
        error instanceof Error ? error.message : "Unable to load payment.",
      );
    }
  }, [accountOptions, lkpBranch, txtDocNo, lkpType]);

  /* =======================================================
     RESET TABLE + LOAD NEXT DOCUMENT NUMBER
  ======================================================= */

  const resetTableAndLoadNextPaymentNumber = useCallback(async () => {
    /* CLEAR ALL FORM DATA */

    setRows(createRows());

    setCbAccountName("");
    setCbCcId("");
    setPaidTo("");
    setReference("");
    setNote("");
    setDescription("");
    setActiveDescriptionRow(null);

    setDtpDate(getTodayDate());

    setIsModifyMode(false);
    setIsPosted(false);
    setPaymentMessage("");

    lastLookupKeyRef.current = "";

    /*
     * Clear the old payment number immediately so the previously
     * saved/modified/deleted number is not visible while the new
     * number is being requested.
     */
    setTxtDocNo("");

    try {
      /* GET NEW PAYMENT DEFAULTS */

      const response = await apiFetch(
        `${import.meta.env.VITE_API_URL}/Payment/getPayment`,
        {
          method: "GET",
        },
      );

      if (!response.ok) {
        throw new Error(
          `Payment defaults could not be reloaded. Status: ${response.status}`,
        );
      }

      const result = (await response.json()) as PaymentsResponse;

      console.log("GET PAYMENT AFTER RESET:", result);

      if (!result.success) {
        throw new Error(
          result.message || "Payment defaults could not be reloaded.",
        );
      }

      /* RESTORE API OPTIONS */

      setBranchOptions(result.data || []);
      setFinancialParameters(result.finparam || []);
      setAccountOptions(result.accounts || []);
      setAccountSortByIdOptions(result.accountsortbyId || []);
      setCostCenters(result.costCenters || []);

      /* DEFAULT BRANCH */

      const defaultBranch =
        result.defaultBranch || result.data?.[0]?.fbrid || "";

      setLkpBranch(defaultBranch);

      /* DEFAULT PAYMENT TYPE ("BP"/"CP" -> "B"/"C") */

      if (result.paymentType) {
        setLkpType(toUiPaymentType(result.paymentType));
      }

      /* NEW PAYMENT NUMBER */

      const newPaymentNo = result.paymentNo || result.receiptNo || "";

      console.log("NEW PAYMENT NUMBER:", newPaymentNo);

      if (newPaymentNo) {
        setTxtDocNo(String(newPaymentNo));
      } else {
        console.error("❌ NEW PAYMENT NUMBER WAS NOT RETURNED BY API");

        setTxtDocNo("");
      }

      /* FOCUS PAYMENT NO AFTER REACT RENDER */

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const input = documentNoRef.current;

          if (!input) {
            console.warn("Payment No input not found");

            return;
          }

          input.focus();

          /* Do NOT assign input.value: it is controlled React state. */

          const value = input.value || "";
          input.setSelectionRange(value.length, value.length);
        });
      });
    } catch (error) {
      console.error("Payment defaults reload error:", error);

      setTxtDocNo("");

      setPaymentMessage(
        error instanceof Error
          ? error.message
          : "Payment defaults could not be reloaded.",
      );
    }
  }, []);

  /* =======================================================
     BRANCH SELECT OPTIONS
  ======================================================= */

  const branchSelectOptions = useMemo<SelectOption[]>(
    () =>
      branchOptions.map((item) => ({
        value: item.fbrid,
        label: item.fbrname,
      })),
    [branchOptions],
  );

  /* =======================================================
     FOCUS TABLE FIELD
  ======================================================= */

  const focusTableField = useCallback((rowIndex: number, field: TableField) => {
    paymentTableRef.current?.focusField(rowIndex, field);
  }, []);

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
          slNo: remainingRows.length + 1,
          accountId: "",
          accountName: "",
          fgcs: "",
          haveCc: false,
          haveDivision: false,
          DivID: "",
          CCID: "",
          txtDebitCredit: "",
          amount: 0,
          match: false,
          description: "",
        };

        return [...remainingRows, emptyRow];
      });

      if (
        activeDescriptionRow !== null &&
        rows[activeDescriptionRow]?.id === id
      ) {
        setDescription("");
        setActiveDescriptionRow(null);
      }
    },
    [activeDescriptionRow, rows],
  );

  /* =======================================================
     CLEAR DESCRIPTION ROW
  ======================================================= */

  const handleClearDescriptionRow = useCallback(() => {
    if (activeDescriptionRow === null) {
      return;
    }

    const row = rows[activeDescriptionRow];

    if (row) {
      handleClearRow(row.id);
    }
  }, [activeDescriptionRow, handleClearRow, rows]);

  /* =======================================================
     SORT ROWS
  ======================================================= */

  const handleSortRows = useCallback(
    (field: SortField, direction: "asc" | "desc") => {
      setRows((currentRows) =>
        [...currentRows].sort((first, second) => {
          const firstValue =
            field === "accountId" ? first.accountId : first.accountName;

          const secondValue =
            field === "accountId" ? second.accountId : second.accountName;

          const result =
            field === "accountId"
              ? firstValue.localeCompare(secondValue, undefined, {
                numeric: true,
                sensitivity: "base",
              })
              : firstValue.localeCompare(secondValue, undefined, {
                sensitivity: "base",
              });

          return direction === "asc" ? result : -result;
        }),
      );
    },
    [],
  );

  /* =======================================================
     ROW CHANGE
  ======================================================= */

  const handleRowChange = useCallback(
    (id: number, field: keyof ReceiptRow, value: string | boolean) => {
      setRows((currentRows) =>
        currentRows.map((row) =>
          row.id === id
            ? {
              ...row,
              [field]: value,
            }
            : row,
        ),
      );
    },
    [],
  );

  /* =======================================================
     TABLE ESCAPE -> NOTE
  ======================================================= */

  const handleTableEscape = useCallback(() => {
    setActiveDescriptionRow(null);

    requestAnimationFrame(() => {
      const note = noteRef.current;

      if (!note) {
        return;
      }
      note.focus();
      const position = note.value.length;
      note.setSelectionRange(position, position);
    });
  }, []);

  /* =======================================================
     TABLE ENTER
  ======================================================= */

  const handleTableEnter = useCallback(
    (rowIndex: number, field: TableField) => {
      const row = rows[rowIndex];

      /* ACCOUNT ID REQUIRED */

      if (field === "accountId" && !row?.accountId.trim()) {
        notify.warning("Account ID is required.");
        focusTableField(rowIndex, "accountId");
        return;
      }

      /* AMOUNT REQUIRED */

      if (
        field === "txtDebitCredit" &&
        !Number.isFinite(parseFloat(row?.txtDebitCredit ?? ""))
      ) {
        notify.warning("Amount is required.");
        focusTableField(rowIndex, "txtDebitCredit");
        return;
      }

      /* AMOUNT -> DESCRIPTION */

      if (field === "txtDebitCredit") {
        setActiveDescriptionRow(rowIndex);

        // Only load the selected row's description when that row
        // already has one; otherwise keep the current value visible.
        if (row?.description?.trim()) {
          setDescription(row.description);
        }

        requestAnimationFrame(() => {
          const input = descriptionRef.current;

          if (!input) {
            return;
          }

          input.focus();

          input.setSelectionRange(input.value.length, input.value.length);
        });

        return;
      }

      /* AVAILABLE FIELDS */

      const availableFields = tableFieldOrder
        .filter((nextField) => nextField !== "DivID" || row?.haveDivision)
        .filter((nextField) => nextField !== "CCID" || row?.haveCc);

      const fieldIndex = availableFields.indexOf(field);

      const nextField = availableFields[fieldIndex + 1];

      if (nextField) {
        focusTableField(rowIndex, nextField);
      }
    },
    [focusTableField, rows],
  );

  /* =======================================================
     DESCRIPTION CHANGE

     Description is stored inside the active row.
  ======================================================= */

  const handleDescriptionChange = useCallback(
    (value: string) => {
      setDescription(value);

      if (activeDescriptionRow === null) {
        return;
      }

      const activeRow = rows[activeDescriptionRow];

      if (!activeRow) {
        return;
      }

      const activeRowId = activeRow.id;

      setRows((currentRows) =>
        currentRows.map((row) =>
          row.id === activeRowId
            ? {
              ...row,
              description: value,
            }
            : row,
        ),
      );
    },
    [activeDescriptionRow, rows],
  );

  /* =======================================================
     DESCRIPTION ENTER
  ======================================================= */

  const handleDescriptionEnter = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key !== "Enter") {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      /* NO ACTIVE ROW */

      if (activeDescriptionRow === null) {
        focusTableField(0, "accountId");

        return;
      }

      /* NEXT ROW */

      const nextRow = activeDescriptionRow + 1;

      /* LAST ROW -> NOTE */

      if (nextRow >= rows.length) {
        setActiveDescriptionRow(null);

        requestAnimationFrame(() => {
          const note = noteRef.current;

          if (!note) {
            return;
          }

          note.focus();

          const position = note.value.length;

          note.setSelectionRange(position, position);
        });

        return;
      }

      /* NEXT ROW ACCOUNT ID */

      focusTableField(nextRow, "accountId");
    },
    [activeDescriptionRow, focusTableField, rows.length],
  );

  /* =======================================================
     NOTE ENTER -> SAVE / MODIFY
  ======================================================= */

  const handleNoteEnter = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key !== "Enter" || event.shiftKey) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      requestAnimationFrame(() => {
        actionsRef.current?.focusSave();
      });
    },
    [],
  );

  /* =======================================================
     TOTAL  (sum of the signed amounts)
  ======================================================= */

  const total = useMemo(
    () => rows.reduce((sum, row) => sum + (Number(row.txtDebitCredit) || 0), 0),
    [rows],
  );

  /* =======================================================
     SAVE PAYMENT
  ======================================================= */

  const handleSave = useCallback(async () => {
    try {
      /* GET VALID ROWS */

      const validRows = rows.filter(
        (row) => row.accountId && row.accountId.trim() !== "",
      );

      /* VALIDATION */

      const validationFailed =
        !lkpBranch ||
        !lkpType ||
        !txtDocNo.trim() ||
        !dtpDate ||
        !cbAccountName ||
        validRows.length === 0;

      if (validationFailed) {
        notify.warning(
          "Branch, type, payment number, date, cash/bank, and one account row are required.",
        );

        return;
      }

      /* CREATE SAVE PAYLOAD
         (keys are identical to the receipt payload on purpose) */

      const paymentData = {
        lkpBranch,
        lkpType,
        cbAccountName,
        cbCcId,

        txtDocNo,

        dtpDate,
        paidTo,
        reference,
        rows: validRows.map((row, index) => ({
          id: row.id,
          slNo: index + 1,
          accountId: row.accountId,
          accountName: row.accountName,
          fgcs: row.fgcs,
          DivID: row.DivID,
          CCID: row.CCID,
          txtDebitCredit: Number(row.txtDebitCredit) || 0,
          match: row.match,
          description: row.description || "",
        })),
        total,
        note,
      };

      /* CONVERT UI TYPE TO DATABASE TYPE (B -> BP, C -> CP) */

      const saveType = getPaymentStrDocType(lkpType);

      console.log("========== SAVE PAYMENT ==========");
      console.log("OLD PAYMENT NUMBER:", txtDocNo);
      console.log("SAVE TYPE:", saveType);
      console.log("SENDING PAYMENT:", paymentData);

      /* SAVE API */

      const response = await apiFetch(
        `${import.meta.env.VITE_API_URL}/Payment/savePayment`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...paymentData,
            lkpType: saveType,
          }),
        },
      );

      /* READ RESPONSE */

      const text = await response.text();

      let result: {
        success?: boolean;
        message?: string;
        receiptNoChanged?: boolean;
        newReceiptNo?: string;
      };

      try {
        result = JSON.parse(text);
      } catch {
        result = {
          success: false,
          message: text,
        };
      }

      console.log("SAVE API RESPONSE:", result);

      // Payment No was taken by another user: swap in the new one, keep all data
      if (
        response.status === 409 &&
        result.receiptNoChanged &&
        result.newReceiptNo
      ) {
        lastLookupKeyRef.current = ""; // lets the Payment No lookup run again
        setTxtDocNo(result.newReceiptNo);

        notify.warning(
          `Payment No ${txtDocNo} was already used by another user. Changed to ${result.newReceiptNo}. Please click Save again.`,
        );

        requestAnimationFrame(() => actionsRef.current?.focusSave());
        return; // no reset, the form data stays
      }

      /* SAVE ERROR */

      if (!response.ok) {
        notify.error(
          result.message || `Save failed. Status: ${response.status}`,
        );

        return;
      }

      /* SAVE SUCCESS */

      notify.success(result.message || "Saved successfully");

      console.log("✅ SAVE SUCCESS");
      console.log("OLD SAVED PAYMENT:", txtDocNo);

      /* CLEAR + LOAD COMPLETELY NEW PAYMENT NUMBER */

      await resetTableAndLoadNextPaymentNumber();

      console.log("✅ RESET COMPLETED AFTER SAVE");
    } catch (error) {
      console.error("SAVE ERROR:", error);

      notify.error(
        error instanceof Error
          ? error.message
          : "Cannot connect to Payment API.",
      );
    }
  }, [
    lkpBranch,
    lkpType,
    cbAccountName,
    cbCcId,
    txtDocNo,
    dtpDate,
    paidTo,
    reference,
    rows,
    total,
    note,
    resetTableAndLoadNextPaymentNumber,
  ]);

  /* =======================================================
     MODIFY PAYMENT
  ======================================================= */

  const handleModify = useCallback(async () => {
    if (isPosted) {
      notify.warning("A posted payment cannot be modified.");
      return;
    }

    console.log("🔥 MODIFY FUNCTION CALLED");

    /* FILTER VALID ROWS */

    const validRows = rows.filter(
      (row) => row.accountId && row.accountId.trim() !== "",
    );

    console.log("MODIFY CURRENT VALUES:", {
      lkpBranch,
      lkpType,
      cbAccountName,
      cbCcId,
      txtDocNo,
      dtpDate,
      paidTo,
      reference,
      note,
    });

    console.log("MODIFY VALID ROWS:", validRows);

    /* VALIDATION */

    const validationFailed =
      !lkpBranch ||
      !lkpType ||
      !txtDocNo.trim() ||
      !dtpDate ||
      !cbAccountName ||
      validRows.length === 0;

    if (validationFailed) {
      console.error("❌ MODIFY STOPPED BY VALIDATION");

      console.error("Validation values:", {
        lkpBranch: !!lkpBranch,
        lkpType: !!lkpType,
        txtDocNo: !!txtDocNo.trim(),
        dtpDate: !!dtpDate,
        cbAccountName: !!cbAccountName,
        validRows: validRows.length,
      });

      const validationMessage =
        "Branch, type, payment number, date, cash/bank, and one account row are required.";

      setPaymentMessage(validationMessage);

      notify.warning(validationMessage);

      return;
    }

    /* CREATE MODIFY PAYLOAD
       (keys are identical to the receipt payload on purpose) */

    const modifyPayload = {
      lkpBranch,
      lkpType: getPaymentStrDocType(lkpType),
      cbAccountName: cbAccountName,
      cbCcId,

      /* IMPORTANT: keep the loaded payment number. Do NOT generate a new one. */
      txtDocNo: txtDocNo.trim(),

      dtpDate: dtpDate,
      paidTo,
      reference,
      note,
      rows: validRows.map((row, index) => ({
        id: row.id,
        slNo: index + 1,
        accountId: row.accountId,
        accountName: row.accountName,
        fgcs: row.fgcs,
        DivID: row.DivID,
        CCID: row.CCID,
        txtDebitCredit: Number(row.txtDebitCredit) || 0,
        match: row.match,
        description: row.description || "",
      })),

      total,
    };

    console.log("🔥 MODIFY PAYLOAD:");
    console.log(JSON.stringify(modifyPayload, null, 2));
    console.log("MODIFY DOC TYPE:", modifyPayload.lkpType);
    console.log("MODIFY DOC NO:", modifyPayload.txtDocNo);

    /* CALL API */

    try {
      console.log(
        "🔥 CALLING:",
        `${import.meta.env.VITE_API_URL}/Payment/modifyPayment`,
      );

      const response = await apiFetch(
        `${import.meta.env.VITE_API_URL}/Payment/modifyPayment`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify(modifyPayload),
        },
      );

      console.log("🔥 MODIFY API STATUS:", response.status);
      console.log("🔥 MODIFY API OK:", response.ok);

      /* READ RESPONSE AS TEXT FIRST */

      const responseText = await response.text();

      console.log("🔥 MODIFY RAW RESPONSE:");
      console.log(responseText);

      let result: {
        success?: boolean;
        message?: string;
        data?: unknown;
      };

      try {
        result = JSON.parse(responseText) as {
          success?: boolean;
          message?: string;
          data?: unknown;
        };
      } catch {
        result = {
          success: response.ok,
          message: responseText,
        };
      }

      console.log("🔥 MODIFY PARSED RESPONSE:", result);

      /* HTTP ERROR */

      if (!response.ok) {
        throw new Error(
          result.message ||
          `Payment could not be modified. HTTP ${response.status}`,
        );
      }

      /* SUCCESS */

      console.log("✅ MODIFY API SUCCESS");

      setPaymentMessage(result.message || "modified successfully.");

      notify.success(result.message || "modified");

      /* CLEAR FORM + LOAD NEXT PAYMENT NUMBER (only after successful modify) */

      await resetTableAndLoadNextPaymentNumber();

      setFocusPaymentNoAfterClear((current) => current + 1);
    } catch (error) {
      console.error("🔥 MODIFY ERROR:", error);

      const errorMessage =
        error instanceof Error
          ? error.message
          : "Payment could not be modified.";

      setPaymentMessage(errorMessage);

      notify.error(errorMessage);
    }
  }, [
    lkpBranch,
    lkpType,
    cbAccountName,
    cbCcId,
    txtDocNo,
    dtpDate,
    paidTo,
    reference,
    note,
    rows,
    total,
    resetTableAndLoadNextPaymentNumber,
    isPosted,
  ]);

  /* =======================================================
     DELETE PAYMENT
  ======================================================= */

  const handledelete = useCallback(async () => {
    if (isPosted) {
      notify.warning("A posted payment cannot be deleted.");
      return;
    }

    try {
      /* VALIDATION */

      const validationFailed = !lkpBranch || !lkpType || !txtDocNo.trim();

      if (validationFailed) {
        notify.warning("Branch, type, and payment number are required.");
        return;
      }

      /* DELETE CONFIRMATION */

      const shouldDelete = await confirm({
        title: "Payment",
        message: "Do you want to Delete?",
        confirmLabel: "Delete",
        cancelLabel: "Cancel",
      });

      if (!shouldDelete) {
        console.log("❌ DELETE CANCELLED BY USER");

        console.log("❌ NO API CALL WAS MADE");

        return;
      }

      /* CREATE DELETE PAYLOAD (B -> BP, C -> CP) */

      const paymentData = {
        lkpBranch: lkpBranch,
        lkpType: getPaymentStrDocType(lkpType),
        txtDocNo: txtDocNo.trim(),
      };

      console.log("DELETE PAYMENT:", paymentData);

      /* DELETE API */

      const response = await apiFetch(
        `${import.meta.env.VITE_API_URL}/Payment/delete`,
        {
          method: "DELETE",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify(paymentData),
        },
      );

      const text = await response.text();

      console.log("DELETE STATUS:", response.status);

      console.log("DELETE RAW RESPONSE:", text);

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

      console.log("DELETE API RESPONSE:", result);

      /* API ERROR */

      if (!response.ok) {
        notify.error(
          result.message || `Delete failed. Status: ${response.status}`,
        );

        return;
      }

      /* SUCCESS */

      notify.success(result.message || "Payment deleted successfully");

      /* CLEAR FORM + LOAD NEXT PAYMENT */

      await resetTableAndLoadNextPaymentNumber();

      setFocusPaymentNoAfterClear((current) => current + 1);
    } catch (error) {
      console.error("DELETE ERROR:", error);

      notify.error(
        error instanceof Error
          ? error.message
          : "Cannot connect to Payment API.",
      );
    }
  }, [
    confirm,
    isPosted,
    lkpBranch,
    lkpType,
    txtDocNo,
    resetTableAndLoadNextPaymentNumber,
  ]);

  /* =======================================================
     CLEAR FORM
  ======================================================= */

  const clearForm = useCallback(async () => {
    await resetTableAndLoadNextPaymentNumber();

    setFocusPaymentNoAfterClear((current) => current + 1);
  }, [resetTableAndLoadNextPaymentNumber]);

  /* =======================================================
     POST
  ======================================================= */

  const postRequestInFlight = useRef(false);

  const handlePost = useCallback(async () => {
    if (postRequestInFlight.current) return;

    if (isPosted) {
      notify.warning("This payment is already posted.");
      return;
    }

    if (!lkpBranch) {
      notify.warning("Please select 'Branch'.");
      document.getElementById("lkpBranch")?.focus();
      return;
    }

    if (!lkpType) {
      notify.warning("Please select 'Type'.");
      document.getElementById("lkpType")?.focus();
      return;
    }

    if (!txtDocNo.trim()) {
      notify.warning("Please enter 'Payment No.'.");
      document.getElementById("txtDocNo")?.focus();
      return;
    }

    if (!isModifyMode) {
      notify.warning("Load a saved payment before posting.");
      return;
    }

    const {
      pstrCoID: PstrCoID,
      pstrYear: PstrYear,
      pstrUserID: PstrUserID,
    } = getSession();

    if (!PstrCoID || !PstrYear || !PstrUserID) {
      notify.error("Company ID, year, or user ID is missing. Please log in again.");
      return;
    }

    const dateMatch = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(dtpDate.trim());
    if (!dateMatch) {
      notify.warning("Please enter a valid payment date.");
      document.getElementById("dtpDate")?.focus();
      return;
    }

    const [, day, month, year] = dateMatch;
    const isoDate = `${year}-${month}-${day}`;
    const parsedDate = new Date(`${isoDate}T00:00:00`);
    if (
      Number.isNaN(parsedDate.getTime()) ||
      parsedDate.getFullYear() !== Number(year) ||
      parsedDate.getMonth() + 1 !== Number(month) ||
      parsedDate.getDate() !== Number(day)
    ) {
      notify.warning("Please enter a valid payment date.");
      document.getElementById("dtpDate")?.focus();
      return;
    }

    if (!window.confirm("Do you want to post this payment?")) return;

    postRequestInFlight.current = true;

    try {
      const response = await apiFetch(
        `${import.meta.env.VITE_API_URL}/Payment/post`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            PstrCoID,
            PstrYear,
            lkpBranch,
            lkpDocType: getPaymentStrDocType(lkpType),
            txtDocNo: txtDocNo.trim(),
            dtpDate: isoDate,
            PstrUserID,
          }),
        },
      );

      const responseText = await response.text();
      let result: {
        success?: boolean;
        message?: string;
        intDocPostCount?: number;
      };

      try {
        result = JSON.parse(responseText) as {
          success?: boolean;
          message?: string;
          intDocPostCount?: number;
        };
      } catch {
        result = {
          success: false,
          message: responseText || "Payment could not be posted.",
        };
      }

      if (!response.ok || !result.success) {
        notify.error(
          result.message || `Payment could not be posted (error ${response.status}).`,
        );
        return;
      }

      notify.success(result.message || "Payment posting completed successfully.");
      await resetTableAndLoadNextPaymentNumber();
      setFocusPaymentNoAfterClear((current) => current + 1);
    } catch (error) {
      console.error("Payment posting error:", error);
      notify.error(
        error instanceof Error
          ? error.message
          : "Cannot connect to the Payment API.",
      );
    } finally {
      postRequestInFlight.current = false;
    }
  }, [
    dtpDate,
    isPosted,
    isModifyMode,
    lkpBranch,
    lkpType,
    resetTableAndLoadNextPaymentNumber,
    txtDocNo,
  ]);

  /* =======================================================
     INITIAL FOCUS
  ======================================================= */

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      documentNoRef.current?.focus();

      const value = documentNoRef.current?.value ?? "";

      documentNoRef.current?.setSelectionRange(value.length, value.length);
    });

    return () => {
      cancelAnimationFrame(frame);
    };
  }, []);

  /* =======================================================
     RETURN
  ======================================================= */

  return (
    <div className="min-h-fit mt-3 bg-slate-100 px-5 py-2 flex flex-col justify-center items-center gap-2.5">
      <div className="receipt-screen mx-auto lg:w-275 md:w-[55%] max-w-362.5 min-w-212.5 border border-gray-400 bg-white">
        {/* HEADER */}

        <PaymentHeader />

        {/* HEADER FORM */}

        <PaymentForm
          lkpBranch={lkpBranch}
          setLkpBranch={setLkpBranch}
          lkpType={lkpType}
          setLkpType={setLkpType}
          cbAccountName={cbAccountName}
          setCbAccountName={setCbAccountName}
          reference={reference}
          setReference={setReference}
          paidTo={paidTo}
          setPaidTo={setPaidTo}
          documentNo={txtDocNo}
          setDocumentNo={setTxtDocNo}
          dtpDate={dtpDate}
          setDtpDate={setDtpDate}
          branchRef={branchRef}
          typeRef={typeRef}
          documentNoRef={documentNoRef}
          cbAccountRef={cbAccountRef}
          dateRef={dateRef}
          paidToRef={paidToRef}
          referenceRef={referenceRef}
          focusFirstAccountId={() => focusTableField(0, "accountId")}
          branchOptions={branchSelectOptions}
          financialParameters={financialParameters}
          isModifyMode={isModifyMode}
          documentNoEditable
          txtDocNo={getPayment}
          preserveCbAccountOnLoad={isModifyMode}
          focusReceiptNoAfterClear={focusPaymentNoAfterClear}
        />

        {/* TABLE */}

        <PaymentTable
          ref={paymentTableRef}
          url={`${import.meta.env.VITE_API_URL}/Payment/getDivID`}
          rows={rows}
          handleRowChange={handleRowChange}
          onFieldEnter={handleTableEnter}
          onTableEscape={handleTableEscape}
          onClearRow={handleClearRow}
          onSortRows={handleSortRows}
          accountOptions={accountOptions}
          accountSortByIdOptions={accountSortByIdOptions}
          onRowSelect={(id, row) => {
            const rowIndex = rows.findIndex((item) => item.id === id);

            if (rowIndex === -1) {
              return;
            }

            setActiveDescriptionRow(rowIndex);

            setDescription((currentDescription) => {
              // If this row already has its own description, show it.
              if (row.description?.trim()) {
                return row.description;
              }

              // Otherwise keep the previous description visible.
              return currentDescription;
            });
          }}
          costCenters={costCenters}
        />

        {/* TOTAL */}

        <div
          className="mt-2.5 mr-16.5 ml-auto flex w-55 items-center gap-2 text-[13px]
          "
        >
          <label className="whitespace-nowrap text-[14px]">Total :</label>

          <input
            id="txtTotCreditAmt"
            value={total.toFixed(2)}
            readOnly
            className="ml-1 h-7.5 w-25 rounded border border-gray-300 px-2 text-right outline-none text-[#344054]"
          />
        </div>

        {/* BOTTOM FORM */}

        <PaymentBottomForm
          description={description}
          setDescription={handleDescriptionChange}
          note={note}
          setNote={setNote}
          noteRef={noteRef}
          descriptionRef={descriptionRef}
          onNoteEnter={handleNoteEnter}
          onDescriptionEnter={handleDescriptionEnter}
          onDescriptionClear={handleClearDescriptionRow}
        />

        {/* ACTIONS
            TODO: Print is a placeholder until /Payment/print exists. */}

        <PaymentActions
          ref={actionsRef}
          clearForm={clearForm}
          onPrint={handlePrint}
          onPost={() => void handlePost()}
          onSave={isModifyMode ? handleModify : handleSave}
          onDelete={handledelete}
          saveLabel={isModifyMode ? "Modify" : "Save"}
          isPosted={isPosted}
          preventSearchNavigation
        />
      </div>

      {/* TODO: Payment print preview goes here once the backend exists. */}
      {dialog}
      {messageDialog}
    </div>
  );
};

export default PaymentPage;