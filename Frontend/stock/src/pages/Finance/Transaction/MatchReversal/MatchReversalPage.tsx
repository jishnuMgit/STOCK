import React, { useCallback, useEffect, useRef, useState } from "react";

import {
  type MatchingComponentsRef,
  type SelectOption,
} from "../../../../components/Transaction/MatchReversal/types";

import MatchingComponents from "../../../../components/Transaction/MatchReversal/MatchReversalComponents";
import useMatchReversal from "../../../../hooks/useMatchReversal";
import { apiFetch, getSession } from "../../../../utils/session";
import { toast } from "react-toastify";

interface CustomerAccount {
  fcsaccountid: string;
  fcsaccountname: string;
}

interface DocType {
  fdocname: string;
  fdoctype: string;
}

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : "Something went wrong";

const MatchReversalPage: React.FC = () => {
  /* ---------- HEADER STATE ---------- */
  const [branch, setBranch] = useState("");
  const [doctype, setDocType] = useState("");
  const [receiptNo, setReceiptNo] = useState("");
  const [receiptDate, setReceiptDate] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [divisionId, setDivisionId] = useState("");

  /* ---------- OPTIONS ---------- */
  const [branchOptions] = useState<SelectOption[]>([]);
  const [customerOptions, setCustomerOptions] = useState<SelectOption[]>([]);
  const [customerNameOptions, setCustomerNameOptions] = useState<
    SelectOption[]
  >([]);
  const [divisionOptions] = useState<SelectOption[]>([]);
  const [documentOptions, setDocumentOptions] = useState<SelectOption[]>([]);

  /* ---------- API HOOK ---------- */
  const {
    rows,
    saving,
    getMatchAccounts,
    getMatchedTransactions,
    toggleSelect,
    unmatch,
    clearRows,
  } = useMatchReversal();

  const matchingRef = useRef<MatchingComponentsRef | null>(null);

  // TODO: replace with the session's financial year if it differs from the calendar year
  const year = String(getSession().pstrYear);

  /* ---------- LOAD DOC TYPES + CUSTOMERS ---------- */
  /* ---------- LOAD CUSTOMERS + DOCUMENT TYPES (one request) ---------- */
  useEffect(() => {
    const loadLookups = async () => {
      try {
        const response = await apiFetch(
          `${import.meta.env.VITE_API_URL}/Match/getCSAccounts`,
        );
        if (!response.ok) throw new Error("Failed to load lookup data");

        const data = await response.json();

        if (Array.isArray(data?.AccountID)) {
          setCustomerOptions(
            (data.AccountID as CustomerAccount[])
              .map((a) => ({ value: a.fcsaccountid, label: a.fcsaccountname }))
              .sort((a, b) =>
                a.value.localeCompare(b.value, undefined, {
                  numeric: true,
                  sensitivity: "base",
                }),
              ),
          );
        }

        if (Array.isArray(data?.AccountName)) {
          setCustomerNameOptions(
            (data.AccountName as CustomerAccount[])
              .map((a) => ({ value: a.fcsaccountname, label: a.fcsaccountid }))
              .sort((a, b) =>
                a.value.localeCompare(b.value, undefined, {
                  sensitivity: "base",
                }),
              ),
          );
        }

        if (Array.isArray(data?.DocType)) {
          setDocumentOptions(
            (data.DocType as DocType[]).map((d) => ({
              value: d.fdoctype,
              label: d.fdocname,
            })),
          );
        }
      } catch (error) {
        console.error("Lookup load error:", error);
      }
    };

    loadLookups();
  }, []);

  useEffect(() => {
    requestAnimationFrame(() => matchingRef.current?.focusCustomerId());
  }, []);

  /* ---------- LOAD MATCHED LINES (GetTL) ---------- */
  const loadMatchedLines = useCallback(
    async (brId: string, docNo: string) => {
      try {
        await getMatchedTransactions({
          year,
          brId,
          docType: doctype,
          docNo,
          divId: divisionId || undefined,
        });
      } catch (error) {
        toast.error(getErrorMessage(error));
      }
    },
    [getMatchedTransactions, year, doctype, divisionId],
  );

  // called by the Document No. dropdown
  const handleDocumentSelect = useCallback(
    (brId: string, docNo: string) => {
      setBranch(brId);
      loadMatchedLines(brId, docNo);
    },
    [loadMatchedLines],
  );

  // a new Search invalidates the previous document / lines
  const handleSearch = useCallback(() => {
    setReceiptNo("");
    setBranch("");
    clearRows();
  }, [clearRows]);

  /* ---------- UN-MATCH ---------- */
  const handleUnmatch = useCallback(async () => {
    if (saving) return;

    if (!doctype) return toast.error("Please input 'Document'");
    if (!receiptNo) return toast.error("Please input 'Document No.'");
    if (!branch) return toast.error("Please select 'Branch'");
    if (!rows.some((r) => r.select)) {
      return toast.error("There is no Account selected for Un-Match");
    }
    if (!window.confirm("Un-match the selected accounts?")) return;

    try {
      const result = await unmatch({
        year,
        brId: branch,
        docType: doctype,
        docNo: receiptNo,
        divId: divisionId || undefined,
        rows,
      });

      toast.success(result?.message ?? "Accounts Un-Matched");
      await loadMatchedLines(branch, receiptNo); // refresh grid
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }, [
    saving,
    doctype,
    receiptNo,
    branch,
    rows,
    year,
    divisionId,
    unmatch,
    loadMatchedLines,
  ]);

  /* ---------- CLEAR ---------- */
  const clearForm = useCallback(() => {
    setBranch("");
    setDocType("");
    setReceiptNo("");
    setReceiptDate("");
    setCustomerId("");
    setCustomerName("");
    setDivisionId("");
    clearRows();
    requestAnimationFrame(() => matchingRef.current?.focusCustomerId());
  }, [clearRows]);

  /* ---------- TOTALS ---------- */
  const documentAmount = rows.reduce((t, r) => t + r.docAmount, 0);
  const totalMatchAmount = rows.reduce(
    (t, r) => (r.select ? t + r.docAmount : t),
    0,
  ); // amount that will be un-matched
  const balance = documentAmount - totalMatchAmount;

  return (
    <div className="min-h-full w-full bg-slate-100 px-2 py-2 flex items-center justify-center">
      <div className="w-full max-w-287.5 min-w-0 border border-gray-400 bg-white">
        <MatchingComponents
          ref={matchingRef}
          branch={branch}
          setBranch={setBranch}
          type={doctype}
          setDocType={setDocType}
          receiptNo={receiptNo}
          setReceiptNo={setReceiptNo}
          receiptDate={receiptDate}
          setReceiptDate={setReceiptDate}
          customerId={customerId}
          setCustomerId={setCustomerId}
          customerName={customerName}
          setCustomerName={setCustomerName}
          divisionId={divisionId}
          setDivisionId={setDivisionId}
          rows={rows}
          toggleSelect={toggleSelect}
          getMatchAccounts={getMatchAccounts}
          onDocumentSelect={handleDocumentSelect}
          onSave={handleUnmatch}
          clearForm={clearForm}
          onSearch={handleSearch}
          branchOptions={branchOptions}
          customerOptions={customerOptions}
          customerNameOptions={customerNameOptions}
          divisionOptions={divisionOptions}
          documentOptions={documentOptions}
          documentAmount={documentAmount}
          totalMatchAmount={totalMatchAmount}
          balance={balance}
        />
      </div>
    </div>
  );
};

export default MatchReversalPage;
