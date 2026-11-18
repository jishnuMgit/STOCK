import React, { useState } from "react";
import { CustomRadio, RadioPanel } from "../../components/common/ReportFormParts";
import {
  BranchFilter,
  FilterRow,
  PeriodFilter,
  ReportForm,
  ReportPrintRow,
} from "../../components/common/ReportFilters";

// Verify Document Accuracy - the form only (not connected to the server yet), laid out with the common template of the report
// forms (components/common/ReportFilters.tsx), like every other report page.

type Option = { value: string; label: string };

/* Replace these with data from your API */
const branchOptions: Option[] = [
  { value: "WAREHOUSE RIYADH", label: "WAREHOUSE RIYADH" },
  { value: "OFFICE", label: "OFFICE" },
];

const RptVerifyDocumentAccuracyPage: React.FC = () => {
  const [branchMode, setBranchMode] = useState("One Branch"); // rdgBranch
  const [branch, setBranch] = useState<Option | null>(branchOptions[0]); // lkpBranch

  const [accuracyMode, setAccuracyMode] = useState("Posting"); // rdgAccuracy
  const [fromDate, setFromDate] = useState(""); // dtpFromDate
  const [toDate, setToDate] = useState(""); // dtpToDate

  const handlePrint = () => {
    console.log({
      branchMode,
      branch: branchMode === "One Branch" ? branch : null,
      accuracyMode, // "Posting" = posting accuracy in A/R & A/P, "Arithmetic" = arithmetic accuracy in GL
      fromDate,
      toDate,
    });
  };

  return (
    // "Posting Accuracy in A/R & A/P" is much longer than the usual 150 px label column: the whole form gets a 250 px one
    // (every panel and label ends at the same place), so all its boxes still line up
    <ReportForm title="Verify Document Accuracy" labelWidth={250}>
      <BranchFilter
        mode={branchMode}
        onModeChange={setBranchMode}
        options={branchOptions}
        value={branch}
        onChange={setBranch}
      />

      {/* Accuracy type */}
      <FilterRow
        panel={
          <RadioPanel id="rdgAccuracy" className="h-17.5 w-[var(--filter-panel,9.5rem)]">
            <CustomRadio
              name="rdgAccuracy"
              value="Posting"
              label="Posting Accuracy in A/R & A/P"
              checked={accuracyMode === "Posting"}
              onChange={() => setAccuracyMode("Posting")}
            />
            <CustomRadio
              name="rdgAccuracy"
              value="Arithmetic"
              label="Arithmetic Accuracy in GL"
              checked={accuracyMode === "Arithmetic"}
              onChange={() => setAccuracyMode("Arithmetic")}
            />
          </RadioPanel>
        }
      />

      <PeriodFilter
        from={fromDate}
        to={toDate}
        onFromChange={setFromDate}
        onToChange={setToDate}
      />

      <ReportPrintRow onPrint={handlePrint} />
    </ReportForm>
  );
};

export default RptVerifyDocumentAccuracyPage;
