import React, { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";

import {
  type MatchingComponentsRef,
  type SelectOption,
} from "../../../../components/Transaction/MatchEnquiry/types";

import MatchingComponents from "../../../../components/Transaction/MatchEnquiry/MatchEnquiryComponents";
import useMatchEnquiry from "../../../../hooks/useMatchEnquiry";
import { apiFetch } from "../../../../utils/session";
import ReportPreview from "../../../../components/common/ReportPreview";
import {
  buildHtml,
  printMatchEnquiryReport,
  type PrintReport,
} from "../../../../components/Transaction/MatchEnquiry/MatchEnquiryPrintReport";
import { buildMatchEnquiryPdf } from "../../../../components/Transaction/MatchEnquiry/MatchEnquiryPdf";

const API = `${import.meta.env.VITE_API_URL}/MatchEnquiry`;

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : "Something went wrong";

const MatchEnquiryPage: React.FC = () => {
  /* ---------- HEADER STATE ---------- */
  const [lkpBranch, setLkpBranch] = useState("");
  const [lkpDocType, setLkpDocType] = useState("");
  const [lkpDocTypeNo, setLkpDocTypeNo] = useState(""); // the Document No. box: the key "branch|type|number"
  const [receiptDate, setReceiptDate] = useState("");
  const [lkpCsAccountID, setLkpCsAccountID] = useState("");
  const [lkpCsAccountName, setLkpCsAccountName] = useState("");
  const [lkpDivision, setLkpDivision] = useState("");

  /* ---------- OPTIONS ---------- */
  const [branchOptions] = useState<SelectOption[]>([]);

  /* ---------- API HOOK ---------- */
  // every lookup of the screen comes from the Match Enquiry controller: the document types and the customers (one call),
  // the divisions of the chosen customer, the Document No. list of the Search button
  const {
    rows,
    customerOptions,
    customerNameOptions,
    divisionOptions,
    divisionLoading,
    getLookups,
    getDivisions,
    getDocumentNos,
    getMatchEnquiry,
    clearRows,
  } = useMatchEnquiry();

  const matchingRef = useRef<MatchingComponentsRef | null>(null);

  /* ---------- LOAD THE LOOKUPS: the customers (hook) ---------- */
  useEffect(() => {
    getLookups();
  }, [getLookups]);

  useEffect(() => {
    requestAnimationFrame(() => matchingRef.current?.focusCustomerId());
  }, []);

  /* ---------- LOAD ENQUIRY LINES ---------- */
  const loadEnquiry = useCallback(
    async (lkpBranch: string, lkpDocNo: string, lkpDocType: string) => {
      try {
        await getMatchEnquiry({ lkpBranch, lkpDocType, lkpDocNo });
      } catch (error) {
        toast.error(getErrorMessage(error));
      }
    },
    [getMatchEnquiry],
  );

  // called by the Document No. dropdown: the branch and the document type come with the document
  const handleDocumentSelect = useCallback(
    (branchId: string, docNo: string, docType: string) => {
      setLkpBranch(branchId);
      loadEnquiry(branchId, docNo, docType);
    },
    [loadEnquiry],
  );

  // a new Search invalidates the previous document / lines
  const handleSearch = useCallback(() => {
    setLkpDocTypeNo("");
    setLkpBranch("");
    clearRows();
  }, [clearRows]);

  /* ---------- PRINT (the  rptMatchEnquiryPrint) ---------- */
  // the Print Preview (after Print) and the Print button while the server makes the report
  const [printing, setPrinting] = useState(false);
  const [preview, setPreview] = useState<{
    report: PrintReport;
    fileBase: string;
    params: { lkpBranch: string; lkpDocType: string; lkpDocNo: string };
  } | null>(null);

  const handlePrint = useCallback(async () => {
    if (printing || preview) return;

    if (!lkpBranch || !lkpDocTypeNo || rows.length === 0) {
      toast.error("Please select a 'Document No.' to print");
      return;
    }

    // what the server takes: the branch, the document type and the document number of the screen
    // receiptNo is the document's key "branch|type|number" (the same number can be used by two types)
    const params = {
      lkpBranch,
      lkpDocType,
      lkpDocNo: lkpDocTypeNo.split("|")[2] ?? lkpDocTypeNo,
    };

    setPrinting(true);

    try {
      const response = await apiFetch(`${API}/print`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.success) {
        toast.warning(result?.message || "The Match Enquiry report could not be printed.");
        return;
      }

      setPreview({ report: result.report, fileBase: result.fileBase, params });
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setPrinting(false);
    }
  }, [printing, preview, lkpBranch, lkpDocTypeNo, rows.length, lkpDocType]);

  // the Excel file of the Print Preview, made by the server (null after an error)
  const fetchExcel = useCallback(async (): Promise<Blob | null> => {
    if (!preview) return null;

    const response = await apiFetch(`${API}/excel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(preview.params),
    });

    // an error comes back as JSON, the file as a blob
    if (!response.ok) {
      let message = "Could not create the Excel file";

      try {
        const result = await response.json();
        message = result.message || message;
      } catch {
        message = `Could not create the Excel file (error ${response.status})`;
      }

      toast.error(message);
      return null;
    }

    return response.blob();
  }, [preview]);

  /* ---------- CLEAR ---------- */
  const clearForm = useCallback(() => {
    setLkpBranch("");
    setLkpDocType("");
    setLkpDocTypeNo("");
    setReceiptDate("");
    setLkpCsAccountID("");
    setLkpCsAccountName("");
    setLkpDivision("");
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
          lkpBranch={lkpBranch}
          setLkpBranch={setLkpBranch}
          type={lkpDocType}
          setLkpDocType={setLkpDocType}
          lkpDocTypeNo={lkpDocTypeNo}
          setLkpDocTypeNo={setLkpDocTypeNo}
          receiptDate={receiptDate}
          setReceiptDate={setReceiptDate}
          lkpCsAccountID={lkpCsAccountID}
          setLkpCsAccountID={setLkpCsAccountID}
          lkpCsAccountName={lkpCsAccountName}
          setLkpCsAccountName={setLkpCsAccountName}
          lkpDivision={lkpDivision}
          setLkpDivision={setLkpDivision}
          rows={rows}
          getDocumentNos={getDocumentNos}
          getDivisions={getDivisions}
          divisionLoading={divisionLoading}
          onDocumentSelect={handleDocumentSelect}
          onPrint={handlePrint}
          clearForm={clearForm}
          onSearch={handleSearch}
          branchOptions={branchOptions}
          customerOptions={customerOptions}
          customerNameOptions={customerNameOptions}
          divisionOptions={divisionOptions}
          totalDebit={totalDebit}
          totalCredit={totalCredit}
        />
      </div>

      {/* the Print Preview (after Print) */}
      {preview && (
        <ReportPreview
          html={buildHtml(preview.report)}
          fileBase={preview.fileBase}
          onPrint={() => printMatchEnquiryReport(preview.report)}
          buildPdf={() => buildMatchEnquiryPdf(preview.report)}
          fetchExcel={fetchExcel}
          onClose={() => setPreview(null)}
        />
      )}
    </div>
  );
};

export default MatchEnquiryPage;
