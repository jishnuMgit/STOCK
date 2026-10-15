import React from "react";
import Select from "react-select";
import { type Option, selectProps } from "./SalesPriceListShared";

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
  branch: Option | null;
  onBranchChange: (option: Option | null) => void;
  applyAllBranches: boolean;
  onApplyAllBranchesChange: (checked: boolean) => void;

  groupMode: string;
  onGroupModeChange: (mode: string) => void;
  groupIdOptions: Option[];
  groupNameOptions: Option[];
  groupId: string | null;
  onGroupChange: (id: string | null) => void;

  percent: string;
  onPercentChange: (value: string) => void;
  onPercentCommit: () => void;
  applyPercent: boolean;
  onApplyPercentChange: (checked: boolean) => void;

  showFind: boolean;
  query: string;
  onQueryChange: (value: string) => void;
};

const SalesPriceListHeader: React.FC<SalesPriceListHeaderProps> = ({
  branchOptions,
  branch,
  onBranchChange,
  applyAllBranches,
  onApplyAllBranchesChange,
  groupMode,
  onGroupModeChange,
  groupIdOptions,
  groupNameOptions,
  groupId,
  onGroupChange,
  percent,
  onPercentChange,
  onPercentCommit,
  applyPercent,
  onApplyPercentChange,
  showFind,
  query,
  onQueryChange,
}) => {
  const selectedGroupId = groupIdOptions.find((o) => o.value === groupId) ?? null;
  const selectedGroupName =
    groupNameOptions.find((o) => o.value === groupId) ?? null;
  const groupDisabled = groupMode !== "One Item Group";

  return (
    <div className="flex flex-col gap-3">
      {/* Branch + apply to all branches */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <FieldLabel className="w-27.5">Branch :</FieldLabel>
          <div className="w-62.5">
            <Select
              inputId="lkpBranch"
              instanceId="lkpBranch"
              options={branchOptions}
              value={branch}
              onChange={onBranchChange}
              {...selectProps}
            />
          </div>
        </div>
        <CheckboxBox
          id="chkApplyToAllBranches"
          label="Apply To All Branches"
          checked={applyAllBranches}
          onChange={onApplyAllBranchesChange}
        />
      </div>

      {/* Item group + increase price by % */}
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="flex items-start gap-3">
          <div className="border border-[#e0e5ea] bg-white px-3.5 py-3">
            <div className="flex flex-col gap-3">
              <CustomRadio
                name="optItemGroup"
                value="One Item Group"
                label="One Item Group"
                checked={groupMode === "One Item Group"}
                onChange={() => onGroupModeChange("One Item Group")}
              />
              <CustomRadio
                name="optItemGroup"
                value="All Item Group"
                label="All Item Group"
                checked={groupMode === "All Item Group"}
                onChange={() => onGroupModeChange("All Item Group")}
              />
            </div>
          </div>
          <div className="grid grid-cols-[110px_350px] gap-2 pt-3">
            <Select
              inputId="lkpItemGroupID"
              instanceId="lkpItemGroupID"
              options={groupIdOptions}
              value={selectedGroupId}
              onChange={(option) => onGroupChange(option?.value ?? null)}
              isDisabled={groupDisabled}
              {...selectProps}
            />
            <Select
              inputId="lkpItemGroupName"
              instanceId="lkpItemGroupName"
              options={groupNameOptions}
              value={selectedGroupName}
              onChange={(option) => onGroupChange(option?.value ?? null)}
              isDisabled={groupDisabled}
              {...selectProps}
            />
          </div>
        </div>

        {/* Increase price by % (unit price only) */}
        <div className="flex flex-col items-end gap-2">
          <CheckboxBox
            id="chkApplyUnitPrice"
            label="Apply to Unit Price"
            checked={applyPercent}
            onChange={onApplyPercentChange}
          />
          <div className="flex items-center gap-2">
            <FieldLabel className="w-42.5">Increase Price By % :</FieldLabel>
            <input
              id="txtIncreasePercent"
              type="number"
              step="0.01"
              aria-label="Increase price by percent"
              value={percent}
              onChange={(event) => onPercentChange(event.target.value)}
              onBlur={onPercentCommit}
              onKeyDown={(event) => {
                if (event.key === "Enter") onPercentCommit();
              }}
              className="h-7.5 w-27.5 rounded-sm border border-[#cfd7df] bg-white px-2 text-right text-[14px] text-[#24364d] outline-none focus:border-[#91a7b9]"
            />
          </div>
        </div>
      </div>

      {/* Find */}
      {showFind && (
        <div className="flex items-center gap-3">
          <FieldLabel className="w-27.5">Find :</FieldLabel>
          <input
            id="txtFind"
            type="text"
            autoFocus
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Item ID or item name"
            className="h-7.5 w-62.5 rounded-sm border border-[#cfd7df] bg-white px-2 text-[14px] text-[#24364d] outline-none focus:border-[#91a7b9]"
          />
        </div>
      )}
    </div>
  );
};

export default SalesPriceListHeader;