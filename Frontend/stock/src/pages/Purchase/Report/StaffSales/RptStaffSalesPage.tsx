import React, { useState } from "react";
import type { PairSelectOption } from "../../../../components/common/CustomLinkedPairSelect";
import { CustomRadio, RadioPanel } from "../../../../components/common/ReportFormParts";
import {
  BranchFilter,
  FilterRow,
  PairFilter,
  PeriodFilter,
  ReportForm,
  ReportPrintRow,
} from "../../../../components/common/ReportFilters";

// Staff Sales - the form only (not connected to the server yet), laid out with the common template of the report forms
// (components/common/ReportFilters.tsx), like every other report page.

type Option = { value: string; label: string };

/* Replace these with data from your API */
const branchOptions: Option[] = [
  { value: "OFFICE", label: "OFFICE" },
  { value: "BRANCH 1", label: "BRANCH 1" },
  { value: "BRANCH 2", label: "BRANCH 2" },
];

// the staff: one list, "ID | Name" in the ID box and "Name | ID" in the Name box
const staffPairOptions: PairSelectOption[] = [
  { value: "0006", firstLabel: "0006", secondLabel: "Kiran Methan" },
  { value: "0007", firstLabel: "0007", secondLabel: "Ahmed Rahman" },
  { value: "0008", firstLabel: "0008", secondLabel: "Sara Khan" },
];

const RptStaffSalesPage: React.FC = () => {
  const [branchMode, setBranchMode] = useState("One Branch"); // rdgBranch
  const [branch, setBranch] = useState<Option | null>(branchOptions[0]); // lkpBranch

  const [staffMode, setStaffMode] = useState("One Staff"); // rdgStaff
  const [staffId, setStaffId] = useState(""); // lkpStaffID / lkpStaffName

  const [fromDate, setFromDate] = useState(""); // dtpFromDate
  const [toDate, setToDate] = useState(""); // dtpToDate
  const [postStatus, setPostStatus] = useState("All"); // rdgPostStatus

  const handlePrint = () => {
    console.log({
      branchMode,
      branch: branchMode === "One Branch" ? branch : null,
      staffMode,
      staffId: staffMode === "One Staff" ? staffId : null,
      fromDate,
      toDate,
      postStatus,
    });
  };

  return (
    <ReportForm title="Staff Sales">
      <BranchFilter
        mode={branchMode}
        onModeChange={setBranchMode}
        options={branchOptions}
        value={branch}
        onChange={setBranch}
      />

      <PairFilter
        name="Staff"
        mode={staffMode}
        onModeChange={(mode) => {
          setStaffMode(mode);
          setStaffId("");
        }}
        options={staffPairOptions}
        value={staffId}
        onChange={setStaffId}
      />

      <PeriodFilter
        from={fromDate}
        to={toDate}
        onFromChange={setFromDate}
        onToChange={setToDate}
      />

      {/* Post status */}
      <FilterRow
        panel={
          <RadioPanel id="rdgPostStatus" className="h-22.5 w-38">
            <CustomRadio
              name="rdgPostStatus"
              value="Non Posted"
              label="Non Posted"
              checked={postStatus === "Non Posted"}
              onChange={() => setPostStatus("Non Posted")}
            />
            <CustomRadio
              name="rdgPostStatus"
              value="Posted"
              label="Posted"
              checked={postStatus === "Posted"}
              onChange={() => setPostStatus("Posted")}
            />
            <CustomRadio
              name="rdgPostStatus"
              value="All"
              label="All"
              checked={postStatus === "All"}
              onChange={() => setPostStatus("All")}
            />
          </RadioPanel>
        }
      />

      <ReportPrintRow onPrint={handlePrint} />
    </ReportForm>
  );
};

export default RptStaffSalesPage;
