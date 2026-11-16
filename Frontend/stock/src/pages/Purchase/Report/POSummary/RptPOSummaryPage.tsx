import React, { useState } from "react";
import type { PairSelectOption } from "../../../../components/common/CustomLinkedPairSelect";
import {
  BranchFilter,
  PairFilter,
  PeriodFilter,
  ReportForm,
  ReportPrintRow,
} from "../../../../components/common/ReportFilters";

// P.O. Summary - the form only (not connected to the server yet), laid out with the common template of the report forms
// (components/common/ReportFilters.tsx), like every other report page.

type Option = { value: string; label: string };

/* Replace these with data from your API */
const branchOptions: Option[] = [
  { value: "OFFICE", label: "OFFICE" },
  { value: "BRANCH 1", label: "BRANCH 1" },
  { value: "BRANCH 2", label: "BRANCH 2" },
];

// the items: one list, "ID | Name" in the ID box and "Name | ID" in the Name box
const itemPairOptions: PairSelectOption[] = [
  { value: "1001", firstLabel: "1001", secondLabel: "Item One" },
  { value: "1002", firstLabel: "1002", secondLabel: "Item Two" },
];

const RptPOSummaryPage: React.FC = () => {
  const [branchMode, setBranchMode] = useState("One Branch"); // rdgBranch
  const [branch, setBranch] = useState<Option | null>(branchOptions[0]); // lkpBranch

  const [itemMode, setItemMode] = useState("One Item"); // rdgItem
  const [itemId, setItemId] = useState(""); // lkpItemID / lkpItemName

  const [fromDate, setFromDate] = useState(""); // dtpFromDate
  const [toDate, setToDate] = useState(""); // dtpToDate

  const handlePrint = () => {
    console.log({
      branchMode,
      branch: branchMode === "One Branch" ? branch : null,
      itemMode,
      itemId: itemMode === "One Item" ? itemId : null,
      fromDate,
      toDate,
    });
  };

  return (
    <ReportForm title="P.O. Summary">
      <BranchFilter
        mode={branchMode}
        onModeChange={setBranchMode}
        options={branchOptions}
        value={branch}
        onChange={setBranch}
      />

      <PairFilter
        name="Item"
        mode={itemMode}
        onModeChange={(mode) => {
          setItemMode(mode);
          setItemId("");
        }}
        options={itemPairOptions}
        value={itemId}
        onChange={setItemId}
        // an Item ID can be long
        firstWidth={190}
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

export default RptPOSummaryPage;
