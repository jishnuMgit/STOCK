import React, { useState } from "react";
import CommonTableSelect from "../../../../components/common/CommonTableSelect";
import { CustomRadio, RadioPanel } from "../../../../components/common/ReportFormParts";
import {
  BranchFilter,
  FilterLabel,
  FilterRow,
  LabelSelectFilter,
  ReportForm,
  ReportPrintRow,
} from "../../../../components/common/ReportFilters";

// Beginning/Year Close Balance - the form only (not connected to the server yet), laid out with the common template of the
// report forms (components/common/ReportFilters.tsx), like every other report page.

type Option = { value: string; label: string };

/* Replace these with data from your API */
const branchOptions: Option[] = [
  { value: "OFFICE", label: "OFFICE" },
  { value: "BRANCH 1", label: "BRANCH 1" },
  { value: "BRANCH 2", label: "BRANCH 2" },
];
const yearOptions: Option[] = [
  { value: "2026", label: "2026" },
  { value: "2025", label: "2025" },
  { value: "2024", label: "2024" },
];
const yesNoOptions: Option[] = [
  { value: "YES", label: "Yes" },
  { value: "NO", label: "No" },
];

const RptFinYearCloseBalPage: React.FC = () => {
  const [branchMode, setBranchMode] = useState("One Branch"); // rdgBranch
  const [branch, setBranch] = useState<Option | null>(branchOptions[0]); // lkpBranch

  const [balanceMode, setBalanceMode] = useState("Year Close Balance"); // rdgBalance
  const [year, setYear] = useState<Option | null>(null); // lkpYear

  const [accountLevel, setAccountLevel] = useState("4"); // txtAccountLevel
  const [printAccountGroup, setPrintAccountGroup] = useState<Option | null>(yesNoOptions[0]); // lkpPrintACGroup

  const handlePrint = () => {
    console.log({
      branchMode,
      branch: branchMode === "One Branch" ? branch : null,
      balanceMode,
      year: balanceMode === "Year Close Balance" ? year : null,
      accountLevel,
      printAccountGroup,
    });
  };

  return (
    // "Year Close Balance" is longer than the usual 150 px label column: the whole form gets a 168 px one (every panel and
    // label ends at the same place), so all its boxes still line up
    <ReportForm title="Beginning/Year Close Balance" labelWidth={168}>
      <BranchFilter
        mode={branchMode}
        onModeChange={setBranchMode}
        options={branchOptions}
        value={branch}
        onChange={setBranch}
      />

      {/* Balance type: Beginning Balance / Year Close Balance (and its year) */}
      <FilterRow
        panel={
          <RadioPanel id="rdgBalance" className="h-17.5 w-[var(--filter-panel,9.5rem)]">
            <CustomRadio
              name="rdgBalance"
              value="Beginning Balance"
              label="Beginning Balance"
              checked={balanceMode === "Beginning Balance"}
              onChange={() => setBalanceMode("Beginning Balance")}
            />
            <CustomRadio
              name="rdgBalance"
              value="Year Close Balance"
              label="Year Close Balance"
              checked={balanceMode === "Year Close Balance"}
              onChange={() => setBalanceMode("Year Close Balance")}
            />
          </RadioPanel>
        }
      >
        {balanceMode === "Year Close Balance" && (
          <div className="w-27.5">
            <CommonTableSelect
              inputId="lkpYear"
              options={yearOptions}
              value={year}
              onChange={setYear}
              columns={[{ key: "label", label: "Year" }]}
              showHeader={false}
              width="110px"
              menuWidth="110px"
              placeholder=""
              menuPortalTarget={typeof document !== "undefined" ? document.body : undefined}
              noOptionsMessage={() => "No Year Found"}
            />
          </div>
        )}
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

export default RptFinYearCloseBalPage;
