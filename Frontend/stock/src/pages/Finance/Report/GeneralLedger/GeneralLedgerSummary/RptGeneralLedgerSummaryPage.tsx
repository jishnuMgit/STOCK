import React, { useState } from "react";
import type { PairSelectOption } from "../../../../../components/common/CustomLinkedPairSelect";
import {
  BranchFilter,
  PairFilter,
  PeriodFilter,
  PostStatusFilter,
  ReportForm,
  ReportPrintRow,
} from "../../../../../components/common/ReportFilters";

// General Ledger Summary - the form only (not connected to the server yet), laid out with the common template of the report
// forms (components/common/ReportFilters.tsx), like every other report page.

type Option = { value: string; label: string };

/* Replace these with data from your API */
const branchOptions: Option[] = [
  { value: "OFFICE", label: "OFFICE" },
  { value: "BRANCH 1", label: "BRANCH 1" },
  { value: "BRANCH 2", label: "BRANCH 2" },
];

// the account groups / heads: one list, "ID | Name" in the ID box and "Name | ID" in the Name box
const accountPairOptions: PairSelectOption[] = [
  { value: "11000000", firstLabel: "11000000", secondLabel: "CURRENT ASSETS" },
  { value: "12000000", firstLabel: "12000000", secondLabel: "FIXED ASSETS" },
  { value: "21000000", firstLabel: "21000000", secondLabel: "CURRENT LIABILITIES" },
];

// the cost centers: "All C.C." is the first entry of the list and what the boxes show until one is picked
const ALL_CC = "ALL";
const costCenterPairOptions: PairSelectOption[] = [
  { value: ALL_CC, firstLabel: "", secondLabel: "All C.C." },
  { value: "CC1", firstLabel: "CC1", secondLabel: "COST CENTER 1" },
  { value: "CC2", firstLabel: "CC2", secondLabel: "COST CENTER 2" },
];

const postStatusOptions: Option[] = [
  { value: "ALL", label: "All" },
  { value: "POSTED", label: "Posted" },
  { value: "UNPOSTED", label: "Not Posted" },
];

const RptGeneralLedgerSummaryPage: React.FC = () => {
  const [branchMode, setBranchMode] = useState("One Branch"); // rdgBranch
  const [branch, setBranch] = useState<Option | null>(branchOptions[0]); // lkpBranch

  const [accountId, setAccountId] = useState(accountPairOptions[0].value); // lkpAccountID / lkpAccountName
  const [costCenter, setCostCenter] = useState(ALL_CC); // lkpCostCenter / lkpCostCenterName
  const [fromDate, setFromDate] = useState(""); // dtpFromDate
  const [toDate, setToDate] = useState(""); // dtpToDate
  const [postStatus, setPostStatus] = useState<Option | null>(postStatusOptions[0]); // lkpPostStatus

  const handlePrint = () => {
    console.log({
      branchMode,
      branch: branchMode === "One Branch" ? branch : null,
      accountId,
      costCenter: costCenter === ALL_CC ? "" : costCenter,
      fromDate,
      toDate,
      postStatus,
    });
  };

  return (
    // the label "Account Group/Head :" is longer than the usual 150 px label column: the whole form gets a 168 px one (every
    // panel and label ends at the same place), so all its boxes still line up
    <ReportForm title="General Ledger Summary" labelWidth={168}>
      <BranchFilter
        mode={branchMode}
        onModeChange={setBranchMode}
        options={branchOptions}
        value={branch}
        onChange={setBranch}
      />

      {/* the account group / head: always needed */}
      <PairFilter
        required
        name="Account Group/Head"
        mode="One Account Group/Head"
        onModeChange={() => undefined}
        options={accountPairOptions}
        value={accountId}
        onChange={setAccountId}
        firstWidth={190}
        ids={{ first: "lkpAccountID", second: "lkpAccountName" }}
      />

      {/* the cost center: always needed ("All C.C." is the first entry of the list) */}
      <PairFilter
        required
        name="Cost Center"
        mode="One Cost Center"
        onModeChange={() => undefined}
        options={costCenterPairOptions}
        value={costCenter}
        onChange={(id) => setCostCenter(id || ALL_CC)}
        firstWidth={190}
        ids={{ first: "lkpCostCenter", second: "lkpCostCenterName" }}
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

export default RptGeneralLedgerSummaryPage;
