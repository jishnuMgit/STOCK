import React, { useState } from "react";
import {
  BranchFilter,
  DateFilter,
  FilterLabel,
  LabelSelectFilter,
  PostStatusFilter,
  ReportForm,
  ReportPrintRow,
} from "../../../../../components/common/ReportFilters";

// Balance Sheet - the form only (not connected to the server yet), laid out with the common template of the report forms
// (components/common/ReportFilters.tsx), like every other report page.

type Option = { value: string; label: string };

/* Replace these with data from your API */
const branchOptions: Option[] = [
  { value: "OFFICE", label: "OFFICE" },
  { value: "BRANCH 1", label: "BRANCH 1" },
  { value: "BRANCH 2", label: "BRANCH 2" },
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

const RptBalanceSheetPage: React.FC = () => {
  const [branchMode, setBranchMode] = useState("One Branch"); // rdgBranch
  const [branch, setBranch] = useState<Option | null>(branchOptions[0]); // lkpBranch
  const [asOnDate, setAsOnDate] = useState(""); // dtpAsOnDate
  const [accountLevel, setAccountLevel] = useState("4"); // txtAccountLevel
  const [postStatus, setPostStatus] = useState<Option | null>(postStatusOptions[1]); // lkpPostStatus
  const [printZeroBalance, setPrintZeroBalance] = useState<Option | null>(yesNoOptions[1]); // lkpPrint0Balance
  const [printAccountGroup, setPrintAccountGroup] = useState<Option | null>(yesNoOptions[0]); // lkpPrintACGroup

  const handlePrint = () => {
    console.log({
      branchMode,
      branch: branchMode === "One Branch" ? branch : null,
      asOnDate,
      accountLevel,
      postStatus,
      printZeroBalance,
      printAccountGroup,
    });
  };

  return (
    <ReportForm title="Balance Sheet">
      <BranchFilter
        mode={branchMode}
        onModeChange={setBranchMode}
        options={branchOptions}
        value={branch}
        onChange={setBranch}
      />

      <DateFilter label="As On Date" id="dtpAsOnDate" value={asOnDate} onChange={setAsOnDate} />

      {/* Account level */}
      <div className="grid grid-cols-[var(--filter-label,150px)_minmax(0,1fr)] items-center gap-x-4">
        <FilterLabel>Account Level :</FilterLabel>
        <input
          id="txtAccountLevel"
          type="number"
          min="1"
          value={accountLevel}
          onChange={(event) => setAccountLevel(event.target.value)}
          className="h-7.5 w-16 rounded-sm border border-gray-300 bg-white px-2 text-[14px] text-[#172b43] outline-none"
        />
      </div>

      <PostStatusFilter options={postStatusOptions} value={postStatus} onChange={setPostStatus} />

      <LabelSelectFilter
        label="Print 0 Balance"
        id="lkpPrint0Balance"
        options={yesNoOptions}
        value={printZeroBalance}
        onChange={setPrintZeroBalance}
      />

      <LabelSelectFilter
        label="Print A/c Group"
        id="lkpPrintACGroup"
        options={yesNoOptions}
        value={printAccountGroup}
        onChange={setPrintAccountGroup}
      />

      <ReportPrintRow onPrint={handlePrint} />
    </ReportForm>
  );
};

export default RptBalanceSheetPage;
