import React, { useState } from "react";
import type { PairSelectOption } from "../../../components/common/CustomLinkedPairSelect";
import {
  BranchFilter,
  DateFilter,
  PairFilter,
  PostStatusFilter,
  ReportForm,
  ReportPrintRow,
} from "../../../components/common/ReportFilters";

// Stock Value (Sales) - the form only (not connected to the server yet), laid out with the common template of the report
// forms (components/common/ReportFilters.tsx), like every other report page.

type Option = { value: string; label: string };

/* Replace these with data from your API */
const branchOptions: Option[] = [
  { value: "OFFICE", label: "OFFICE" },
  { value: "BRANCH 1", label: "BRANCH 1" },
  { value: "BRANCH 2", label: "BRANCH 2" },
];

// the item groups: one list, "ID | Name" in the ID box and "Name | ID" in the Name box
const groupPairOptions: PairSelectOption[] = [
  { value: "G1", firstLabel: "G1", secondLabel: "Group One" },
  { value: "G2", firstLabel: "G2", secondLabel: "Group Two" },
];

const postStatusOptions: Option[] = [
  { value: "ALL", label: "All" },
  { value: "POSTED", label: "Posted" },
  { value: "UNPOSTED", label: "Not Posted" },
];

const RptStockValuePage: React.FC = () => {
  const [branchMode, setBranchMode] = useState("One Branch"); // rdgBranch
  const [branch, setBranch] = useState<Option | null>(null); // lkpBranch

  const [groupMode, setGroupMode] = useState("All Item Group"); // rdgItemGroup
  const [groupId, setGroupId] = useState(""); // lkpItemGroupID / lkpItemGroupName

  const [asOnDate, setAsOnDate] = useState(""); // dtpAsOnDate
  const [postStatus, setPostStatus] = useState<Option | null>(postStatusOptions[1]); // lkpPostStatus

  const handlePrint = () => {
    console.log({
      branchMode,
      branch: branchMode === "One Branch" ? branch : null,
      groupMode,
      groupId: groupMode === "One Item Group" ? groupId : null,
      asOnDate,
      postStatus,
    });
  };

  return (
    <ReportForm title="Stock Value">
      <BranchFilter
        mode={branchMode}
        onModeChange={setBranchMode}
        options={branchOptions}
        value={branch}
        onChange={setBranch}
      />

      <PairFilter
        name="Item Group"
        mode={groupMode}
        onModeChange={(mode) => {
          setGroupMode(mode);
          setGroupId("");
        }}
        options={groupPairOptions}
        value={groupId}
        onChange={setGroupId}
        // the same ID box width as every other ID + Name pair
        firstWidth={190}
      />

      <DateFilter label="As On Date" id="dtpAsOnDate" value={asOnDate} onChange={setAsOnDate} />

      <PostStatusFilter options={postStatusOptions} value={postStatus} onChange={setPostStatus} />

      <ReportPrintRow onPrint={handlePrint} />
    </ReportForm>
  );
};

export default RptStockValuePage;
