import React, { useState } from "react";
import {
  BranchFilter,
  PeriodFilter,
  PostStatusFilter,
  ReportForm,
  ReportPrintRow,
  SingleFilter,
} from "../../../../components/common/ReportFilters";

// Document List - the form only (not connected to the server yet), laid out with the common template of the report forms
// (components/common/ReportFilters.tsx), like every other report page.

type Option = { value: string; label: string };

/* Replace these with data from your API */
const branchOptions: Option[] = [
  { value: "OFFICE", label: "OFFICE" },
  { value: "BRANCH 1", label: "BRANCH 1" },
  { value: "BRANCH 2", label: "BRANCH 2" },
];
const documentOptions: Option[] = [
  { value: "SALES INVOICE", label: "Sales Invoice" },
  { value: "PURCHASE INVOICE", label: "Purchase Invoice" },
  { value: "RECEIPT VOUCHER", label: "Receipt Voucher" },
  { value: "PAYMENT VOUCHER", label: "Payment Voucher" },
  { value: "JOURNAL VOUCHER", label: "Journal Voucher" },
];
const postStatusOptions: Option[] = [
  { value: "ALL", label: "All" },
  { value: "POSTED", label: "Posted" },
  { value: "UNPOSTED", label: "Not Posted" },
];

const RptDocumentListPage: React.FC = () => {
  const [branchMode, setBranchMode] = useState("One Branch"); // rdgBranch
  const [branch, setBranch] = useState<Option | null>(branchOptions[0]); // lkpBranch

  const [documentMode, setDocumentMode] = useState("One Document"); // rdgDocument
  const [documentType, setDocumentType] = useState<Option | null>(null); // lkpDocument

  const [fromDate, setFromDate] = useState(""); // dtpFromDate
  const [toDate, setToDate] = useState(""); // dtpToDate
  const [postStatus, setPostStatus] = useState<Option | null>(postStatusOptions[0]); // lkpPostStatus

  const handlePrint = () => {
    console.log({
      branchMode,
      branch: branchMode === "One Branch" ? branch : null,
      documentMode,
      documentType: documentMode === "One Document" ? documentType : null,
      fromDate,
      toDate,
      postStatus,
    });
  };

  return (
    <ReportForm title="Document List">
      <BranchFilter
        mode={branchMode}
        onModeChange={setBranchMode}
        options={branchOptions}
        value={branch}
        onChange={setBranch}
      />

      <SingleFilter
        name="Document"
        mode={documentMode}
        onModeChange={(mode) => {
          setDocumentMode(mode);
          setDocumentType(null);
        }}
        options={documentOptions}
        value={documentType}
        onChange={setDocumentType}
      />

      <PeriodFilter
        from={fromDate}
        to={toDate}
        onFromChange={setFromDate}
        onToChange={setToDate}
      />

      <PostStatusFilter options={postStatusOptions} value={postStatus} onChange={setPostStatus} />

      <ReportPrintRow onPrint={handlePrint} />
    </ReportForm>
  );
};

export default RptDocumentListPage;
