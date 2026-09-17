import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import MatchingComponents, {
  type MatchingComponentsRef,
  type ReceiptRow,
  type SelectOption,
} from "../../../components/Transaction/Match/MatchingComponents";

/* =========================================================
   CUSTOMER ACCOUNT TYPE
========================================================= */

interface CustomerAccount {
  fcsaccountid: string;
  fcsaccountname: string;
}

/* =========================================================
   CREATE ROWS
========================================================= */

const createRows = (): ReceiptRow[] => {
  return Array.from({ length: 11 }, (_, index) => ({
    id: index + 1,
    brId: "",
    date: "",
    type: "",
    docNo: "",
    description: "",
    docAmount: 0,
    debit: 0,
    credit: 0,
    match: false,
    matchAmount: 0,
  }));
};

/* =========================================================
   MATCHING
========================================================= */

const Matching: React.FC = () => {
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
    useState("");

  const [customerId, setCustomerId] =
    useState("");

  const [customerName, setCustomerName] =
    useState("");

  const [divisionId, setDivisionId] =
    useState("");

  /* =======================================================
     ROW STATE
  ======================================================= */

  const [rows, setRows] =
    useState<ReceiptRow[]>(
      createRows()
    );

  /* =======================================================
     OPTIONS
  ======================================================= */

  const [branchOptions, setBranchOptions] =
    useState<SelectOption[]>([]);

  const [
    customerOptions,
    setCustomerOptions,
  ] = useState<SelectOption[]>([]);

  const [
    customerNameOptions,
    setCustomerNameOptions,
  ] = useState<SelectOption[]>([]);

  const [divisionOptions] =
    useState<SelectOption[]>([]);

  const [documentOptions] =
    useState<SelectOption[]>([]);

  /* =======================================================
     COMPONENT REF
  ======================================================= */

  const matchingRef =
    useRef<MatchingComponentsRef | null>(
      null
    );

  /* =======================================================
     UPDATE TABLE ROW
  ======================================================= */

  const handleRowChange = useCallback(
    (
      rowIndex: number,
      field: keyof ReceiptRow,
      value:
        | string
        | number
        | boolean
    ) => {
      setRows((previousRows) =>
        previousRows.map(
          (row, index) => {
            if (index !== rowIndex) {
              return row;
            }

            return {
              ...row,
              [field]: value,
            };
          }
        )
      );
    },
    []
  );

  /* =======================================================
     LOAD DATA
  ======================================================= */

useEffect(() => {
  const loadMatchData = async () => {
    try {
      /* ===============================================
         LOAD MATCH DATA
      =============================================== */

      const response = await fetch(
        "http://localhost:5000/api/Match/getCSAccounts"
      );

      if (!response.ok) {
        throw new Error(
          "Failed to load matching data"
        );
      }

      const data =
        await response.json();

      /* ===============================================
         BRANCH OPTIONS
      =============================================== */

      if (
        Array.isArray(
          data?.branchOptions
        )
      ) {
        setBranchOptions(
          data.branchOptions
        );
      }

      /* ===============================================
         HEADER DEFAULT VALUES
      =============================================== */

      if (data?.branch) {
        setBranch(
          data.branch
        );
      }

      if (data?.receiptNo) {
        setReceiptNo(
          data.receiptNo
        );
      }

      /* ===============================================
         LOAD CUSTOMER ACCOUNTS
      =============================================== */

      const accountResponse =
        await fetch(
          "http://localhost:5000/api/Match/getCSAccounts"
        );

      if (!accountResponse.ok) {
        throw new Error(
          "Failed to load customer accounts"
        );
      }

      const accountData =
        await accountResponse.json();

      /* ===============================================
         CUSTOMER ID

         API:
         AccountID

         LABEL:
         ID + NAME

         SORT:
         ID
      =============================================== */

      if (
        Array.isArray(
          accountData?.AccountID
        )
      ) {
        const customerIdOptions: SelectOption[] =
          (
            accountData.AccountID as CustomerAccount[]
          )
            .map((account) => ({
              value:
                account.fcsaccountid,

              label:
                `${account.fcsaccountid}  ${account.fcsaccountname}`,
            }))
            .sort((a, b) =>
              a.value.localeCompare(
                b.value,
                undefined,
                {
                  numeric: true,
                  sensitivity:
                    "base",
                }
              )
            );

        setCustomerOptions(
          customerIdOptions
        );
      }

      /* ===============================================
         CUSTOMER NAME

         API:
         AccountName

         LABEL:
         NAME + ID

         SORT:
         NAME
      =============================================== */

      if (
        Array.isArray(
          accountData?.AccountName
        )
      ) {
        const customerNameOptionsData: SelectOption[] =
          (
            accountData.AccountName as CustomerAccount[]
          )
            .map((account) => ({
              value:
                account.fcsaccountid,

              label:
                `${account.fcsaccountname}  ${account.fcsaccountid}`,
            }))
            .sort((a, b) =>
              a.label.localeCompare(
                b.label,
                undefined,
                {
                  sensitivity:
                    "base",
                }
              )
            );

        setCustomerNameOptions(
          customerNameOptionsData
        );
      }
    } catch (error) {
      console.error(
        "Matching data load error:",
        error
      );
    }
  };

  loadMatchData();
}, []);
  /* =======================================================
     SEARCH
  ======================================================= */

  const handleSearch =
    useCallback(() => {
      const searchData = {
        branch,
        type,
        receiptNo,
        receiptDate,
        customerId,
        customerName,
        divisionId,
      };

      console.log(
        "Matching Search:",
        searchData
      );
    }, [
      branch,
      type,
      receiptNo,
      receiptDate,
      customerId,
      customerName,
      divisionId,
    ]);

  /* =======================================================
     SAVE
  ======================================================= */

  const handleSave =
    useCallback(() => {
      const validRows =
        rows.filter(
          (row) =>
            row.brId &&
            row.brId.trim() !== ""
        );

      const matchingData = {
        branch,

        docType:
          type,

        docNo:
          receiptNo,

        customerId,

        customerName,

        divisionId,

        matchApplyDate:
          receiptDate,

        rows:
          validRows,
      };

      console.log(
        "Matching Save:",
        matchingData
      );

      alert(
        "Matching saved successfully"
      );
    }, [
      rows,
      branch,
      type,
      receiptNo,
      customerId,
      customerName,
      divisionId,
      receiptDate,
    ]);

  /* =======================================================
     CLEAR FORM
  ======================================================= */

  const clearForm =
    useCallback(() => {
      setBranch("");

      setType("BR");

      setReceiptNo("");

      setReceiptDate("");

      setCustomerId("");

      setCustomerName("");

      setDivisionId("");

      setRows(
        createRows()
      );

      requestAnimationFrame(
        () => {
          matchingRef.current
            ?.focusCustomerId();
        }
      );
    }, []);

  /* =======================================================
     INITIAL FOCUS
  ======================================================= */

  useEffect(() => {
    requestAnimationFrame(
      () => {
        matchingRef.current
          ?.focusCustomerId();
      }
    );
  }, []);

  /* =======================================================
     DOCUMENT AMOUNT
  ======================================================= */

  const documentAmount =
    rows.reduce(
      (total, row) =>
        total +
        Number(
          row.docAmount || 0
        ),
      0
    );

  /* =======================================================
     MATCH AMOUNT
  ======================================================= */

  const totalMatchAmount =
    rows.reduce(
      (total, row) => {
        if (!row.match) {
          return total;
        }

        return (
          total +
          Number(
            row.matchAmount || 0
          )
        );
      },
      0
    );

  /* =======================================================
     BALANCE
  ======================================================= */

  const balance =
    documentAmount -
    totalMatchAmount;

  /* =======================================================
     RETURN
  ======================================================= */

  return (
    <div
      className="
        min-h-screen
        w-full
        bg-slate-100
        px-2
        py-2
        flex
        items-center
        justify-center
      "
    >
      <div
        className="
          w-full
          max-w-287.5
          min-w-0
          border
          border-gray-400
          bg-white
        "
      >
        <MatchingComponents
          ref={
            matchingRef
          }

          /* ===============================================
             HEADER
          =============================================== */

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

          receiptNo={
            receiptNo
          }

          setReceiptNo={
            setReceiptNo
          }

          receiptDate={
            receiptDate
          }

          setReceiptDate={
            setReceiptDate
          }

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

          divisionId={
            divisionId
          }

          setDivisionId={
            setDivisionId
          }

          /* ===============================================
             TABLE
          =============================================== */

          rows={
            rows
          }

          handleRowChange={
            handleRowChange
          }

          /* ===============================================
             ACTIONS
          =============================================== */

          onSave={
            handleSave
          }

          clearForm={
            clearForm
          }

          onSearch={
            handleSearch
          }

          /* ===============================================
             OPTIONS
          =============================================== */

          branchOptions={
            branchOptions
          }

          customerOptions={
            customerOptions
          }

          customerNameOptions={
            customerNameOptions
          }

          divisionOptions={
            divisionOptions
          }

          documentOptions={
            documentOptions
          }

          /* ===============================================
             TOTALS
          =============================================== */

          documentAmount={
            documentAmount
          }

          totalMatchAmount={
            totalMatchAmount
          }

          balance={
            balance
          }
        />
      </div>
    </div>
  );
};

export default Matching;