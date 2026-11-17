import React, { useState } from "react";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import type { PairSelectOption } from "../../../../../components/common/CustomLinkedPairSelect";
import { CustomRadio, RadioPanel } from "../../../../../components/common/ReportFormParts";
import {
  BranchFilter,
  FILTER_GAP,
  FilterRow,
  LabelSelectFilter,
  PairFilter,
  PostStatusFilter,
  ReportDatePicker,
  ReportForm,
  ReportPrintRow,
} from "../../../../../components/common/ReportFilters";

// General Ledger - Group - the form only (not connected to the server yet), laid out with the common template of the report
// forms (components/common/ReportFilters.tsx), like every other report page.

dayjs.extend(customParseFormat);

type Option = { value: string; label: string };

const DATE_FORMAT = "DD-MM-YYYY";
const TODAY = dayjs().format(DATE_FORMAT);

/* Replace these with data from your API */
const branchOptions: Option[] = [
  { value: "OFFICE", label: "OFFICE" },
  { value: "BRANCH 1", label: "BRANCH 1" },
  { value: "BRANCH 2", label: "BRANCH 2" },
];

// the account groups: one list, "ID | Name" in the ID box and "Name | ID" in the Name box
const accountGroupPairOptions: PairSelectOption[] = [
  { value: "AG1", firstLabel: "AG1", secondLabel: "Current Assets" },
  { value: "AG2", firstLabel: "AG2", secondLabel: "Current Liabilities" },
  { value: "AG3", firstLabel: "AG3", secondLabel: "Direct Expenses" },
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

const RptGeneralLedgerGroupPage: React.FC = () => {
  const [branchMode, setBranchMode] = useState("One Branch"); // rdgBranch
  const [branch, setBranch] = useState<Option | null>(branchOptions[0]); // lkpBranch
  const [accountGroupId, setAccountGroupId] = useState(""); // lkpAccountGroupID / lkpAccountGroupName
  const [dateMode, setDateMode] = useState("As On Date"); // rdgDate
  const [fromDate, setFromDate] = useState(TODAY); // dtpFromDate (also used as the As On Date)
  const [toDate, setToDate] = useState(TODAY); // dtpToDate
  const [postStatus, setPostStatus] = useState<Option | null>(postStatusOptions[0]); // lkpPostStatus
  const [printZeroBalance, setPrintZeroBalance] = useState<Option | null>(yesNoOptions[0]); // lkpPrint0Balance
  const isPeriod = dateMode === "For A Period";

  const handlePrint = () => {
    console.log({
      branchMode,
      branch: branchMode === "One Branch" ? branch : null,
      accountGroupId,
      dateMode,
      fromDate,
      toDate: isPeriod ? toDate : null,
      postStatus,
      printZeroBalance,
    });
  };

  return (
    <ReportForm title="General Ledger - Group">
      <BranchFilter
        mode={branchMode}
        onModeChange={setBranchMode}
        options={branchOptions}
        value={branch}
        onChange={setBranch}
      />

      {/* the account group: always needed */}
      <PairFilter
        required
        name="Account Group"
        mode="One Account Group"
        onModeChange={() => undefined}
        options={accountGroupPairOptions}
        value={accountGroupId}
        onChange={setAccountGroupId}
        firstWidth={190}
      />

      {/* Date mode: As On Date (one date) / For A Period (two dates) */}
      <FilterRow
        panel={
          <RadioPanel id="rdgDate" className="h-17.5 w-38">
            <CustomRadio
              name="rdgDate"
              value="As On Date"
              label="As On Date"
              checked={dateMode === "As On Date"}
              onChange={() => setDateMode("As On Date")}
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
          <div className="w-38.5">
            <ReportDatePicker
              id="dtpFromDate"
              label={isPeriod ? "From Date" : "As On Date"}
              value={fromDate}
              onChange={setFromDate}
            />
          </div>
          {isPeriod && (
            <div className="w-38.5">
              <ReportDatePicker id="dtpToDate" label="To Date" value={toDate} onChange={setToDate} />
            </div>
          )}
        </div>
      </FilterRow>

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

export default RptGeneralLedgerGroupPage;
