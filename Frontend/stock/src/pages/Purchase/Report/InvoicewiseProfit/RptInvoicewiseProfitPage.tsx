import React, { useState } from "react";
import type { PairSelectOption } from "../../../../components/common/CustomLinkedPairSelect";
import {
  BranchFilter,
  PairFilter,
  PeriodFilter,
  PostStatusFilter,
  ReportForm,
  ReportPrintRow,
} from "../../../../components/common/ReportFilters";

// Invoicewise Profit - the form only (not connected to the server yet), laid out with the common template of the report
// forms (components/common/ReportFilters.tsx), like every other report page.

type Option = { value: string; label: string };

/* Replace these with data from your API */
const branchOptions: Option[] = [
  { value: "OFFICE", label: "OFFICE" },
  { value: "BRANCH 1", label: "BRANCH 1" },
  { value: "BRANCH 2", label: "BRANCH 2" },
];

// the customers: one list, "ID | Name" in the ID box and "Name | ID" in the Name box
const customerPairOptions: PairSelectOption[] = [
  { value: "C001", firstLabel: "C001", secondLabel: "Customer One" },
  { value: "C002", firstLabel: "C002", secondLabel: "Customer Two" },
];

const postStatusOptions: Option[] = [
  { value: "ALL", label: "All" },
  { value: "POSTED", label: "Posted" },
  { value: "UNPOSTED", label: "Not Posted" },
];

const RptInvoicewiseProfitPage: React.FC = () => {
  const [branchMode, setBranchMode] = useState("One Branch"); // rdgBranch
  const [branch, setBranch] = useState<Option | null>(branchOptions[0]); // lkpBranch

  const [customerMode, setCustomerMode] = useState("One Customer"); // rdgCustomer
  const [customerId, setCustomerId] = useState(""); // lkpCustomerID / lkpCustomerName

  const [fromDate, setFromDate] = useState(""); // dtpFromDate
  const [toDate, setToDate] = useState(""); // dtpToDate
  const [postStatus, setPostStatus] = useState<Option | null>(postStatusOptions[0]); // lkpPostStatus

  const handlePrint = () => {
    console.log({
      branchMode,
      branch: branchMode === "One Branch" ? branch : null,
      customerMode,
      customerId: customerMode === "One Customer" ? customerId : null,
      fromDate,
      toDate,
      postStatus,
    });
  };

  return (
    <ReportForm title="Invoicewise Profit">
      <BranchFilter
        mode={branchMode}
        onModeChange={setBranchMode}
        options={branchOptions}
        value={branch}
        onChange={setBranch}
      />

      <PairFilter
        name="Customer"
        mode={customerMode}
        onModeChange={(mode) => {
          setCustomerMode(mode);
          setCustomerId("");
        }}
        options={customerPairOptions}
        value={customerId}
        onChange={setCustomerId}
        // the same ID box width as the Item rows of the other reports, so every ID + Name pair looks the same
        firstWidth={190}
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

export default RptInvoicewiseProfitPage;
