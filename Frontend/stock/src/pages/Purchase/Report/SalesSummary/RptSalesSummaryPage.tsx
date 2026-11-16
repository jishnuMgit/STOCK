import React, { useState } from "react";
import type { PairSelectOption } from "../../../../components/common/CustomLinkedPairSelect";
import { CustomRadio, RadioPanel } from "../../../../components/common/ReportFormParts";
import {
  BranchFilter,
  FilterRow,
  PairFilter,
  PeriodFilter,
  PostStatusFilter,
  ReportForm,
  ReportPrintRow,
} from "../../../../components/common/ReportFilters";

// Sales Summary - the form only (not connected to the server yet), laid out with the common template of the report forms
// (components/common/ReportFilters.tsx), like every other report page.

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

const RptSalesSummaryPage: React.FC = () => {
  const [branchMode, setBranchMode] = useState("One Branch"); // rdgBranch
  const [branch, setBranch] = useState<Option | null>(branchOptions[0]); // lkpBranch

  const [customerMode, setCustomerMode] = useState("All Customer"); // rdgCustomer
  const [customerId, setCustomerId] = useState(""); // lkpCustomerID / lkpCustomerName

  const [fromDate, setFromDate] = useState(""); // dtpFromDate
  const [toDate, setToDate] = useState(""); // dtpToDate
  const [postStatus, setPostStatus] = useState<Option | null>(postStatusOptions[0]); // lkpPostStatus
  const [avoidPendingCashSales, setAvoidPendingCashSales] = useState(false); // chkAvoidPendingCashSales
  const [reportType, setReportType] = useState("Summary"); // rdgReportType

  const handlePrint = () => {
    console.log({
      branchMode,
      branch: branchMode === "One Branch" ? branch : null,
      customerMode,
      customerId: customerMode === "One Customer" ? customerId : null,
      fromDate,
      toDate,
      postStatus,
      avoidPendingCashSales,
      reportType,
    });
  };

  return (
    <ReportForm title="Sales Summary">
      <BranchFilter
        withSelected
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
      />

      <PeriodFilter
        from={fromDate}
        to={toDate}
        onFromChange={setFromDate}
        onToChange={setToDate}
      />

      {/* Post status + avoid pending cash sales */}
      <PostStatusFilter options={postStatusOptions} value={postStatus} onChange={setPostStatus}>
        <label
          htmlFor="chkAvoidPendingCashSales"
          className="flex h-7.5 cursor-pointer items-center gap-2 rounded-sm border border-gray-300 bg-white px-2 text-[14px] text-[#172b43] select-none"
        >
          <input
            id="chkAvoidPendingCashSales"
            type="checkbox"
            checked={avoidPendingCashSales}
            onChange={(event) => setAvoidPendingCashSales(event.target.checked)}
            className="h-4 w-4 accent-[#4ade80]"
          />
          Avoid Pending Cash Sales
        </label>
      </PostStatusFilter>

      {/* Report type */}
      <FilterRow
        panel={
          <RadioPanel id="rdgReportType" className="h-17.5 w-38">
            <CustomRadio
              name="rdgReportType"
              value="Detailed"
              label="Detailed"
              checked={reportType === "Detailed"}
              onChange={() => setReportType("Detailed")}
            />
            <CustomRadio
              name="rdgReportType"
              value="Summary"
              label="Summary"
              checked={reportType === "Summary"}
              onChange={() => setReportType("Summary")}
            />
          </RadioPanel>
        }
      />

      <ReportPrintRow onPrint={handlePrint} />
    </ReportForm>
  );
};

export default RptSalesSummaryPage;
