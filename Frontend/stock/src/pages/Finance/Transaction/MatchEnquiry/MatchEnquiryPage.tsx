import React, { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";

import {
  type MatchingComponentsRef,
  type SelectOption,
} from "../../../../components/Transaction/MatchEnquiry/types";

import MatchingComponents from "../../../../components/Transaction/MatchEnquiry/MatchEnquiryComponents";
import useMatchEnquiry from "../../../../hooks/useMatchEnquiry";
import { apiFetch, getSession } from "../../../../utils/session";

interface CustomerAccount {
  fcsaccountid: string;
  fcsaccountname: string;
}

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : "Something went wrong";

const MatchEnquiryPage: React.FC = () => {
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

  /* ---------- API HOOK ---------- */
  const {
    rows,
    docTypeOptions,
    getLookups,
    getMatchAccounts,
    getMatchEnquiry,
    clearRows,
  } = useMatchEnquiry();

  const matchingRef = useRef<MatchingComponentsRef | null>(null);

  // TODO: replace with the session's financial year if it differs
  const year = String(getSession().pstrYear);

  /* ---------- LOAD DOCUMENT TYPES (hook) ---------- */
  useEffect(() => {
    getLookups();
  }, [getLookups]);

  /* ---------- LOAD CUSTOMERS ---------- */
  useEffect(() => {
    const loadCustomers = async () => {
      try {
        const response = await apiFetch(
          `${import.meta.env.VITE_API_URL}/Match/getCSAccounts`,
        );
        if (!response.ok) throw new Error("Failed to load customer accounts");

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
      } catch (error) {
        console.error("Customer load error:", error);
      }
    };

    loadCustomers();
  }, []);

  useEffect(() => {
    requestAnimationFrame(() => matchingRef.current?.focusCustomerId());
  }, []);

  /* ---------- LOAD ENQUIRY LINES ---------- */
  const loadEnquiry = useCallback(
    async (brId: string, docNo: string) => {
      try {
        await getMatchEnquiry({ year, brId, docType: doctype, docNo });
      } catch (error) {
        toast.error(getErrorMessage(error));
      }
    },
    [getMatchEnquiry, year, doctype],
  );

  // called by the Document No. dropdown
  const handleDocumentSelect = useCallback(
    (brId: string, docNo: string) => {
      setBranch(brId);
      loadEnquiry(brId, docNo);
    },
    [loadEnquiry],
  );

  // a new Search invalidates the previous document / lines
  const handleSearch = useCallback(() => {
    setReceiptNo("");
    setBranch("");
    clearRows();
  }, [clearRows]);

  /* ---------- PRINT ---------- */
  const handlePrint = useCallback(() => {
    if (!branch || !receiptNo || rows.length === 0) {
      toast.error("Please select a 'Document No.' to print");
      return;
    }
    window.print(); // TODO: replace with a report/PDF export if needed
  }, [branch, receiptNo, rows.length]);

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

  /* ---------- TOTALS (VB grid footer sums) ---------- */
  const totalDebit = rows.reduce((t, r) => t + r.debit, 0);
  const totalCredit = rows.reduce((t, r) => t + r.credit, 0);

  return (
    <div className="min-h-full w-full bg-slate-100 px-2 py-2 flex items-center justify-center">
      <div className="w-full max-w-287.5 min-w-0 border border-gray-400 bg-white">
        <MatchingComponents
          ref={matchingRef}
          year={year}
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
          getMatchAccounts={getMatchAccounts}
          onDocumentSelect={handleDocumentSelect}
          onPrint={handlePrint}
          clearForm={clearForm}
          onSearch={handleSearch}
          branchOptions={branchOptions}
          customerOptions={customerOptions}
          customerNameOptions={customerNameOptions}
          divisionOptions={divisionOptions}
          documentOptions={docTypeOptions}
          totalDebit={totalDebit}
          totalCredit={totalCredit}
        />
      </div>
    </div>
  );
};

export default MatchEnquiryPage;
