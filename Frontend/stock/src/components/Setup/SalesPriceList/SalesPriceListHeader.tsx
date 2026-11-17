import React, { useMemo } from "react";
import { type Option } from "./SalesPriceListShared";
import type { PairOption } from "../../PairSelect/pairSelectParts";
import { filterLabelOrValue } from "../../BranchSelect/branchSelectParts";
import CommonTableSelect from "../../common/CommonTableSelect";
import CustomLinkedPairSelect, {
  type PairSelectOption,
} from "../../common/CustomLinkedPairSelect";
import { FILTER_GAP } from "../../common/ReportFilters";

// The Branch list: "Branch | ID", as on every other screen. With the 70 px ID column and a list of box + 70 px, the ID
// column starts exactly where the 250 px box ends.
const BRANCH_COLUMNS = [
  { key: "label", label: "Branch", width: "1fr" },
  { key: "value", label: "ID", width: "70px", align: "right" as const },
];

type RadioOptionProps = {
  name: string;
  value: string;
  label: string;
  checked: boolean;
  onChange: () => void;
};

const CustomRadio: React.FC<RadioOptionProps> = ({
  name,
  value,
  label,
  checked,
  onChange,
}) => (
  <label className="flex cursor-pointer items-center gap-2.5 whitespace-nowrap select-none">
    <input
      type="radio"
      name={name}
      value={value}
      checked={checked}
      onChange={onChange}
      className="sr-only"
    />
    <span
      className={`flex h-4.75 w-4.75 shrink-0 items-center justify-center rounded-full border bg-white ${
        checked ? "border-[#64d96e]" : "border-[#cbd3dc]"
      }`}
    >
      <span
        className={`h-2.5 w-2.5 rounded-full bg-[#64d96e] ${
          checked ? "opacity-100" : "opacity-0"
        }`}
      />
    </span>
    <span className="text-[14px] font-normal text-[#35445a]">{label}</span>
  </label>
);

const FieldLabel: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = "" }) => (
  <div
    className={`flex h-7.5 items-center justify-end border border-[#e0e5ea] bg-[#fafbfc] pr-3 text-[14px] text-[#405066] ${className}`}
  >
    {children}
  </div>
);

const CheckboxBox: React.FC<{
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}> = ({ id, label, checked, onChange }) => (
  <label
    htmlFor={id}
    className="flex h-7.5 cursor-pointer items-center gap-2 border border-[#e0e5ea] bg-white px-2 text-[14px] text-[#405066] select-none"
  >
    <input
      id={id}
      name={id}
      type="checkbox"
      checked={checked}
      onChange={(event) => onChange(event.target.checked)}
      className="h-4 w-4 accent-[#64d96e]"
    />
    {label}
  </label>
);

type SalesPriceListHeaderProps = {
  branchOptions: Option[];
  lkpBranch: Option | null;
  onBranchChange: (option: Option | null) => void;
  chkApplyToAllBranches: boolean;
  onChkApplyToAllBranchesChange: (checked: boolean) => void;

  // 0 = One Item Group, 1 = All Item Group
  rdgItemGroup: number;
  onRdgItemGroupChange: (value: number) => void;
  groupIdOptions: PairOption[];
  groupNameOptions: PairOption[];
  lkpItemGroupID: string;
  onItemGroupChange: (lkpItemGroupID: string) => void;

  txtIncreasePercent: string;
  onPercentChange: (value: string) => void;
  onPercentCommit: () => void;
  chkApplyUnitPrice: boolean;
  onChkApplyUnitPriceChange: (checked: boolean) => void;

  showFind: boolean;
  txtFind: string;
  onTxtFindChange: (value: string) => void;
};

const SalesPriceListHeader: React.FC<SalesPriceListHeaderProps> = ({
  branchOptions,
  lkpBranch,
  onBranchChange,
  chkApplyToAllBranches,
  onChkApplyToAllBranchesChange,
  rdgItemGroup,
  onRdgItemGroupChange,
  groupIdOptions,
  lkpItemGroupID,
  onItemGroupChange,
  txtIncreasePercent,
  onPercentChange,
  onPercentCommit,
  chkApplyUnitPrice,
  onChkApplyUnitPriceChange,
  showFind,
  txtFind,
  onTxtFindChange,
}) => {
  const oneItemGroup = rdgItemGroup === 0;

  // the Item Group boxes: one list, "ID | Name" in the ID box and "Name | ID" in the Name box
  const groupPairOptions = useMemo<PairSelectOption[]>(
    () =>
      groupIdOptions.map((o: PairOption) => ({
        value: o.value,
        firstLabel: o.id ?? o.value,
        secondLabel: o.name ?? o.label,
      })),
    [groupIdOptions],
  );

  return (
    <div className="flex flex-col gap-3">
      {/* Branch + apply to all branches */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <FieldLabel className="w-27.5">Branch :</FieldLabel>
          <div className="w-62.5">
            <CommonTableSelect
              inputId="lkpBranch"
              options={branchOptions}
              value={lkpBranch}
              onChange={onBranchChange}
              columns={BRANCH_COLUMNS}
              width="250px"
              menuWidth="320px"
              placeholder="Select Branch"
              filterOption={filterLabelOrValue}
              menuPortalTarget={document.body}
              noOptionsMessage={() => "No Branch Found"}
            />
          </div>
        </div>
        <CheckboxBox
          id="chkApplyToAllBranches"
          label="Apply To All Branches"
          checked={chkApplyToAllBranches}
          onChange={onChkApplyToAllBranchesChange}
        />
      </div>

      {/* Item group + increase price by % */}
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="flex items-start gap-3">
          <div className="border border-[#e0e5ea] bg-white px-3.5 py-3">
            <div className="flex flex-col gap-3">
              <CustomRadio
                name="rdgItemGroup"
                value="0"
                label="One Item Group"
                checked={oneItemGroup}
                onChange={() => onRdgItemGroupChange(0)}
              />
              <CustomRadio
                name="rdgItemGroup"
                value="1"
                label="All Item Group"
                checked={!oneItemGroup}
                onChange={() => onRdgItemGroupChange(1)}
              />
            </div>
          </div>

          {/* the Item Group boxes are only for One Item Group */}
          {oneItemGroup && (
            <div className="pt-3">
              <CustomLinkedPairSelect
                firstInputId="lkpItemGroupID"
                secondInputId="lkpItemGroupName"
                options={groupPairOptions}
                firstValue={lkpItemGroupID || null}
                secondValue={lkpItemGroupID || null}
                firstHeader="Item Group ID"
                secondHeader="Item Group Name"
                // the same boxes as on the report pages: 190 px for the ID, 5 px between; the Name box is a little
                // narrower (380 px) so that Apply to Unit Price still fits on this row
                firstWidth={190}
                secondWidth={380}
                gap={FILTER_GAP}
                menuZIndex={999999}
                menuPortalTarget={document.body}
                headerFontSize="12px"
                noOptionsMessage={() => "No Item Group Found"}
                onChange={(option) => onItemGroupChange(option?.value ?? "")}
              />
            </div>
          )}
        </div>

        {/* Apply to Unit Price: unlocks the price column. Increase price by %
            (made on the unit cost) only for One Item Group */}
        <div className="flex flex-col items-end gap-2">
          <CheckboxBox
            id="chkApplyUnitPrice"
            label="Apply to Unit Price"
            checked={chkApplyUnitPrice}
            onChange={onChkApplyUnitPriceChange}
          />
          {oneItemGroup && (
            <div className="flex items-center gap-2">
              <FieldLabel className="w-42.5">Increase Price By % :</FieldLabel>
              <input
                id="txtIncreasePercent"
                name="txtIncreasePercent"
                type="number"
                step="0.01"
                aria-label="Increase price by percent"
                value={txtIncreasePercent}
                onChange={(event) => onPercentChange(event.target.value)}
                onBlur={onPercentCommit}
                onKeyDown={(event) => {
                  if (event.key === "Enter") onPercentCommit();
                }}
                className="h-7.5 w-27.5 rounded-sm border border-[#cfd7df] bg-white px-2 text-right text-[14px] text-[#24364d] outline-none focus:border-[#91a7b9]"
              />
            </div>
          )}
        </div>
      </div>

      {/* Find */}
      {showFind && (
        <div className="flex items-center gap-3">
          <FieldLabel className="w-27.5">Find :</FieldLabel>
          <input
            id="txtFind"
            name="txtFind"
            type="text"
            autoFocus
            value={txtFind}
            onChange={(event) => onTxtFindChange(event.target.value)}
            placeholder="Item ID or item name"
            className="h-7.5 w-62.5 rounded-sm border border-[#cfd7df] bg-white px-2 text-[14px] text-[#24364d] outline-none focus:border-[#91a7b9]"
          />
        </div>
      )}
    </div>
  );
};

export default SalesPriceListHeader;
