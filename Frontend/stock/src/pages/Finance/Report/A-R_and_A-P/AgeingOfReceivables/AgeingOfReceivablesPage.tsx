import React, { useState } from "react";
import type { PairSelectOption } from "../../../../../components/common/CustomLinkedPairSelect";
import { CustomRadio, RadioPanel } from "../../../../../components/common/ReportFormParts";
import {
  BranchFilter,
  DateFilter,
  LabelSelectFilter,
  PairFilter,
  PostStatusFilter,
  ReportForm,
  ReportPrintRow,
} from "../../../../../components/common/ReportFilters";

// Ageing of Receivables - the form only (not connected to the server yet), laid out with the common template of the report
// forms (components/common/ReportFilters.tsx), like every other report page.

type Option = { value: string; label: string };

/* Replace these with data from your API */
const branchOptions: Option[] = [
  { value: "JEDDAH", label: "JEDDAH" },
  { value: "RIYADH", label: "RIYADH" },
  { value: "DAMMAM", label: "DAMMAM" },
];

// the parent accounts: one list, "ID | Name" in the ID box and "Name | ID" in the Name box
const parentPairOptions: PairSelectOption[] = [
  { value: "1100", firstLabel: "1100", secondLabel: "Trade Receivables" },
  { value: "1200", firstLabel: "1200", secondLabel: "Other Receivables" },
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

const RptAgeingReceivablesPage: React.FC = () => {
  const [branchMode, setBranchMode] = useState("One Branch"); // rdgBranch
  const [branch, setBranch] = useState<Option | null>(branchOptions[0]); // lkpBranch

  const [parentMode, setParentMode] = useState("One Parent Account"); // rdgParentAccount
  const [parentId, setParentId] = useState(""); // lkpParentAccountID / lkpParentAccountName

  const [asOnDate, setAsOnDate] = useState(""); // dtpAsOnDate
  const [ageingMode, setAgeingMode] = useState<Option | null>(ageingModeOptions[0]); // lkpAgeingMode
  const [postStatus, setPostStatus] = useState<Option | null>(postStatusOptions[0]); // lkpPostStatus
  const [printZeroBalance, setPrintZeroBalance] = useState<Option | null>(yesNoOptions[1]); // lkpPrint0Balance
  const [balanceType, setBalanceType] = useState("All"); // rdgBalanceType

  const handlePrint = () => {
    console.log({
      branchMode,
      branch: branchMode === "One Branch" ? branch : null,
      parentMode,
      parentId: parentMode === "One Parent Account" ? parentId : null,
      asOnDate,
      ageingMode,
      postStatus,
      printZeroBalance,
      balanceType,
    });
  };

  return (
    // the radio texts ("One Parent Account", "Credit Balance Only") are longer than the usual 150 px label column: the whole
    // form gets a 184 px one (every panel and label ends at the same place), so all its boxes still line up
    <ReportForm title="Ageing of Receivables" labelWidth={184}>
      <BranchFilter
        mode={branchMode}
        onModeChange={setBranchMode}
        options={branchOptions}
        value={branch}
        onChange={setBranch}
      />

      <PairFilter
        name="Parent Account"
        mode={parentMode}
        onModeChange={(mode) => {
          setParentMode(mode);
          setParentId("");
        }}
        options={parentPairOptions}
        value={parentId}
        onChange={setParentId}
        // the same ID box width as every other ID + Name pair
        firstWidth={190}
      />

      <DateFilter label="As On Date" id="dtpAsOnDate" value={asOnDate} onChange={setAsOnDate} />

      <LabelSelectFilter
        label="Ageing Mode"
        id="lkpAgeingMode"
        options={ageingModeOptions}
        value={ageingMode}
        onChange={setAgeingMode}
      />

      {/* Post Status, and the Balance type at the right end of the same row */}
      <PostStatusFilter className="w-full" options={postStatusOptions} value={postStatus} onChange={setPostStatus}>
        <div className="ml-auto">
          <RadioPanel id="rdgBalanceType" className="h-22.5 w-[var(--filter-panel,9.5rem)]">
            <CustomRadio
              name="rdgBalanceType"
              value="Debit"
              label="Debit Balance Only"
              checked={balanceType === "Debit"}
              onChange={() => setBalanceType("Debit")}
            />
            <CustomRadio
              name="rdgBalanceType"
              value="Credit"
              label="Credit Balance Only"
              checked={balanceType === "Credit"}
              onChange={() => setBalanceType("Credit")}
            />
            <CustomRadio
              name="rdgBalanceType"
              value="All"
              label="All"
              checked={balanceType === "All"}
              onChange={() => setBalanceType("All")}
            />
          </RadioPanel>
        </div>
      </PostStatusFilter>

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

export default RptAgeingReceivablesPage;
