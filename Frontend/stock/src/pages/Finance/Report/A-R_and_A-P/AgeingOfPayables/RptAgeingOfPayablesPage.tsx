import React, { useState } from "react";
import {
  BranchFilter,
  DateFilter,
  LabelSelectFilter,
  PostStatusFilter,
  ReportForm,
  ReportPrintRow,
} from "../../../../../components/common/ReportFilters";

// Ageing of Payables - the form only (not connected to the server yet), laid out with the common template of the report
// forms (components/common/ReportFilters.tsx), like every other report page.

type Option = { value: string; label: string };

/* Replace these with data from your API */
const branchOptions: Option[] = [
  { value: "JEDDAH", label: "JEDDAH" },
  { value: "RIYADH", label: "RIYADH" },
  { value: "DAMMAM", label: "DAMMAM" },
];
const ageingModeOptions: Option[] = [
  { value: "MONTH", label: "Month" },
  { value: "DAYS", label: "Days" },
];
const postStatusOptions: Option[] = [
  { value: "ALL", label: "All" },
  { value: "POSTED", label: "Posted" },
  { value: "UNPOSTED", label: "Not Posted" },
];
const yesNoOptions: Option[] = [
  { value: "YES", label: "Yes" },
  { value: "NO", label: "No" },
];

const RptAgeingOfPayablesPage: React.FC = () => {
  const [branchMode, setBranchMode] = useState("One Branch"); // rdgBranch
  const [branch, setBranch] = useState<Option | null>(branchOptions[0]); // lkpBranch

  const [asOnDate, setAsOnDate] = useState(""); // dtpAsOnDate
  const [ageingMode, setAgeingMode] = useState<Option | null>(ageingModeOptions[0]); // lkpAgeingMode
  const [postStatus, setPostStatus] = useState<Option | null>(postStatusOptions[0]); // lkpPostStatus
  const [printZeroBalance, setPrintZeroBalance] = useState<Option | null>(yesNoOptions[1]); // lkpPrint0Balance

  const handlePrint = () => {
    console.log({
      branchMode,
      branch: branchMode === "One Branch" ? branch : null,
      asOnDate,
      ageingMode,
      postStatus,
      printZeroBalance,
    });
  };

  return (
    <ReportForm title="Ageing of Payables">
      <BranchFilter
        mode={branchMode}
        onModeChange={setBranchMode}
        options={branchOptions}
        value={branch}
        onChange={setBranch}
      />

      <DateFilter label="As On Date" id="dtpAsOnDate" value={asOnDate} onChange={setAsOnDate} />

      <LabelSelectFilter
        label="Ageing Mode"
        id="lkpAgeingMode"
        options={ageingModeOptions}
        value={ageingMode}
        onChange={setAgeingMode}
      />

      <PostStatusFilter options={postStatusOptions} value={postStatus} onChange={setPostStatus} />

      <LabelSelectFilter
        label="Print 0 Balance"
        id="lkpPrint0Balance"
        options={yesNoOptions}
        value={printZeroBalance}
        onChange={setPrintZeroBalance}
      />

      <ReportPrintRow onPrint={handlePrint} />
    </ReportForm>
  );
};

export default RptAgeingOfPayablesPage;
