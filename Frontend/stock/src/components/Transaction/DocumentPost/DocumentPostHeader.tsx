import React, { useEffect, useRef } from "react";
import Select from "react-select";
import {type Option,  selectProps } from "./DocumentPostShared";
const FieldLabel: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = "" }) => (
  <div
    className={`flex h-7.5 items-center justify-end  pr-3 text-[14px] text-[#405066] ${className}`}
  >
    {children}
  </div>
);

type DocumentPostHeaderProps = {
  branchOptions: Option[];
  branch: Option | null;
  onBranchChange: (option: Option | null) => void;

  documentOptions: Option[];
  documentType: Option | null;
  onDocumentChange: (option: Option | null) => void;

  yearOptions: Option[];
  year: Option | null;
  onYearChange: (option: Option | null) => void;

  monthOptions: Option[];
  month: Option | null;
  onMonthChange: (option: Option | null) => void;

  allSelected: boolean;
  someSelected: boolean;
  onToggleAll: () => void;
  selectAllDisabled?: boolean;
};

const DocumentPostHeader: React.FC<DocumentPostHeaderProps> = ({
  branchOptions,
  branch,
  onBranchChange,
  documentOptions,
  documentType,
  onDocumentChange,
  yearOptions,
  year,
  onYearChange,
  monthOptions,
  month,
  onMonthChange,
  allSelected,
  someSelected,
  onToggleAll,
  selectAllDisabled = false,
}) => {
  const selectAllRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someSelected && !allSelected;
    }
  }, [someSelected, allSelected]);

  return (
    <div className="flex flex-col gap-3 ">
      {/* Branch */}
      <div className="flex items-center gap-3 ">
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

      {/* Document + year / month */}
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <div className="flex items-center gap-3">
          <FieldLabel className="w-27.5">Document :</FieldLabel>
          <div className="w-62.5">
            <Select
              inputId="lkpDocument"
              instanceId="lkpDocument"
              options={documentOptions}
              value={documentType}
              onChange={onDocumentChange}
              {...selectProps}
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <FieldLabel className="w-27.5">Year / Month :</FieldLabel>
          <div className="w-25">
            <Select
              inputId="lkpYear"
              instanceId="lkpYear"
              options={yearOptions}
              value={year}
              onChange={onYearChange}
              {...selectProps}
            />
          </div>
          <div className="w-37.5">
            <Select
              inputId="lkpMonth"
              instanceId="lkpMonth"
              options={monthOptions}
              value={month}
              onChange={onMonthChange}
              {...selectProps}
            />
          </div>
        </div>
      </div>

      {/* Select all */}
      <label
        htmlFor="chkSelectAll"
        className="flex w-fit cursor-pointer items-center gap-2 text-[12px] text-[#405066] select-none"
      >
        <input
          ref={selectAllRef}
          id="chkSelectAll"
          type="checkbox"
          checked={allSelected}
          disabled={selectAllDisabled}
          onChange={onToggleAll}
          className="h-4 w-4 accent-[#64d96e]"
        />
        Select All
      </label>
    </div>
  );
};

export default DocumentPostHeader;