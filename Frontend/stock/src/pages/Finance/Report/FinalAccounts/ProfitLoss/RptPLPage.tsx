import React, { useState } from "react";
import type { PairSelectOption } from "../../../../../components/common/CustomLinkedPairSelect";
import { CustomRadio, RadioPanel } from "../../../../../components/common/ReportFormParts";
import {
  BranchFilter,
  FILTER_GAP,
  FilterLabel,
  FilterRow,
  LabelSelectFilter,
  PairFilter,
  PostStatusFilter,
  ReportDatePicker,
  ReportForm,
  ReportPrintRow,
} from "../../../../../components/common/ReportFilters";

// Profit & Loss - the form only (not connected to the server yet), laid out with the common template of the report forms
// (components/common/ReportFilters.tsx), like every other report page.

type Option = { value: string; label: string };

/* Replace these with data from your API */
const branchOptions: Option[] = [
  { value: "OFFICE", label: "OFFICE" },
  { value: "BRANCH 1", label: "BRANCH 1" },
  { value: "BRANCH 2", label: "BRANCH 2" },
];

// the cost centers: one list, "ID | Name" in the ID box and "Name | ID" in the Name box
const costCenterPairOptions: PairSelectOption[] = [
  { value: "CC1", firstLabel: "CC1", secondLabel: "COST CENTER 1" },
  { value: "CC2", firstLabel: "CC2", secondLabel: "COST CENTER 2" },
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

const RptPLPage: React.FC = () => {
  const [branchMode, setBranchMode] = useState("One Branch"); // rdgBranch
  const [branch, setBranch] = useState<Option | null>(branchOptions[0]); // lkpBranch

  const [costCenterMode, setCostCenterMode] = useState("All Cost Center"); // rdgCostCenter
  const [costCenter, setCostCenter] = useState(""); // lkpCostCenter / lkpCostCenterName

  const [dateMode, setDateMode] = useState("For A Period"); // rdgDate
  const [month, setMonth] = useState(""); // dtpMonth
  const [fromDate, setFromDate] = useState(""); // dtpFromDate
  const [toDate, setToDate] = useState(""); // dtpToDate

  const [accountLevel, setAccountLevel] = useState("4"); // txtAccountLevel
  const [postStatus, setPostStatus] = useState<Option | null>(postStatusOptions[1]); // lkpPostStatus
  const [printZeroBalance, setPrintZeroBalance] = useState<Option | null>(yesNoOptions[1]); // lkpPrint0Balance
  const [printAccountGroup, setPrintAccountGroup] = useState<Option | null>(yesNoOptions[0]); // lkpPrintACGroup

  const isPeriod = dateMode === "For A Period";

  const handlePrint = () => {
    console.log({
      branchMode,
      branch: branchMode === "One Branch" ? branch : null,
      costCenterMode,
      costCenter: costCenterMode === "One Cost Center" ? costCenter : null,
      dateMode,
      month: isPeriod ? null : month,
      fromDate: isPeriod ? fromDate : null,
      toDate: isPeriod ? toDate : null,
      accountLevel,
      postStatus,
      printZeroBalance,
      printAccountGroup,
    });
  };

  return (
    <ReportForm title="Profit & Loss">
      <BranchFilter
        mode={branchMode}
        onModeChange={setBranchMode}
        options={branchOptions}
        value={branch}
        onChange={setBranch}
      />

      <PairFilter
        name="Cost Center"
        mode={costCenterMode}
        onModeChange={(mode) => {
          setCostCenterMode(mode);
          setCostCenter("");
        }}
        options={costCenterPairOptions}
        value={costCenter}
        onChange={setCostCenter}
        // the same ID box width as every other ID + Name pair
        firstWidth={190}
      />

      {/* Date mode: For a Month (a month) / For a Period (two dates) */}
      <FilterRow
        panel={
          <RadioPanel id="rdgDate" className="h-17.5 w-38">
            <CustomRadio
              name="rdgDate"
              value="For A Month"
              label="For A Month"
              checked={dateMode === "For A Month"}
              onChange={() => setDateMode("For A Month")}
            />
            <CustomRadio
              name="rdgDate"
              value="For A Period"
              label="For A Period"
              checked={dateMode === "For A Period"}
              onChange={() => setDateMode("For A Period")}
            />
          </RadioPanel>
        }
      >
        <div className="flex min-w-0 flex-wrap items-center" style={{ gap: FILTER_GAP }}>
          {isPeriod ? (
            <>
              <div className="w-38.5">
                <ReportDatePicker id="dtpFromDate" label="From Date" value={fromDate} onChange={setFromDate} />
              </div>
              <div className="w-38.5">
                <ReportDatePicker id="dtpToDate" label="To Date" value={toDate} onChange={setToDate} />
              </div>
            </>
          ) : (
            <div className="w-38.5">
              <ReportDatePicker id="dtpMonth" label="Month" value={month} onChange={setMonth} monthOnly />
            </div>
          )}
        </div>
      </FilterRow>

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

export default RptPLPage;
