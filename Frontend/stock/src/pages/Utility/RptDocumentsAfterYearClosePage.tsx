import React, { useState } from "react";
import {
  BranchFilter,
  LabelSelectFilter,
  ReportForm,
  ReportPrintRow,
} from "../../components/common/ReportFilters";

// Documents After Year Close - the form only (not connected to the server yet), laid out with the common template of the
// report forms (components/common/ReportFilters.tsx), like every other report page.

type Option = { value: string; label: string };

/* Replace these with data from your API */
const branchOptions: Option[] = [
  { value: "WAREHOUSE RIYADH", label: "WAREHOUSE RIYADH" },
  { value: "OFFICE", label: "OFFICE" },
];

const currentYear = new Date().getFullYear();
const yearOptions: Option[] = Array.from({ length: 6 }, (_, index) => {
  const value = String(currentYear - index);
  return { value, label: value };
});

const RptDocumentsAfterYearClosePage: React.FC = () => {
  const [branchMode, setBranchMode] = useState("One Branch"); // rdgBranch
  const [branch, setBranch] = useState<Option | null>(branchOptions[0]); // lkpBranch
  const [year, setYear] = useState<Option | null>(null); // lkpYear

  const handlePrint = () => {
    console.log({
      branchMode,
      branch: branchMode === "One Branch" ? branch : null,
      year,
    });
  };

  return (
    <ReportForm title="Documents After Year Close">
      <BranchFilter
        mode={branchMode}
        onModeChange={setBranchMode}
        options={branchOptions}
        value={branch}
        onChange={setBranch}
      />

      <LabelSelectFilter
        label="Year"
        id="lkpYear"
        options={yearOptions}
        value={year}
        onChange={setYear}
        boxWidth={110}
        noOptionsMessage="No Year Found"
      />

      <ReportPrintRow onPrint={handlePrint} />
    </ReportForm>
  );
};

export default RptDocumentsAfterYearClosePage;
