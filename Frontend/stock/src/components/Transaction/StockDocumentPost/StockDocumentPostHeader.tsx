import React, { useEffect, useRef } from "react";
import Select from "react-select";
import { useAdvanceAfterSelect } from "../../../hooks/useAdvanceAfterSelect";
import { useGridCellFocus } from "../../../hooks/useGridCellFocus";
import {
  type Option,
  branchSelectProps,
  documentSelectProps,
  selectProps,
} from "./StockDocumentPostShared";
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

type StockDocumentPostHeaderProps = {
  branchOptions: Option[];
  lkpBranch: Option | null;
  onBranchChange: (option: Option | null) => void;

  documentOptions: Option[];
  lkpDocument: Option | null;
  onDocumentChange: (option: Option | null) => void;

  yearOptions: Option[];
  lkpYear: Option | null;
  onYearChange: (option: Option | null) => void;

  monthOptions: Option[];
  lkpMonth: Option | null;
  onMonthChange: (option: Option | null) => void;

  allSelected: boolean;
  someSelected: boolean;
  onToggleAll: () => void;
  selectAllDisabled?: boolean;
};

const StockDocumentPostHeader: React.FC<StockDocumentPostHeaderProps> = ({
  branchOptions,
  lkpBranch,
  onBranchChange,
  documentOptions,
  lkpDocument,
  onDocumentChange,
  yearOptions,
  lkpYear,
  onYearChange,
  monthOptions,
  lkpMonth,
  onMonthChange,
  allSelected,
  someSelected,
  onToggleAll,
  selectAllDisabled = false,
}) => {
  const selectAllRef = useRef<HTMLInputElement>(null);

  // Enter / a pick in a dropdown goes on to the next box (the other forms do the same)
  const { advanceAfterPick, advanceOnEnter } = useAdvanceAfterSelect();

  // the box the cursor is in gets the green outline (as the cells of the other grids)
  const { cellFocusClass } = useGridCellFocus();

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
        <div
          className={`w-62.5 ${cellFocusClass}`}
          onKeyDown={(event) => advanceOnEnter(event)}
        >
          <Select
            inputId="lkpBranch"
            instanceId="lkpBranch"
            options={branchOptions}
            value={lkpBranch}
            onChange={(option) => {
              onBranchChange(option);
              if (option) advanceAfterPick("lkpBranch");
            }}
            noOptionsMessage={() => "No Branch Found"}
            {...branchSelectProps}
          />
        </div>
      </div>

      {/* Document + year / month */}
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <div className="flex items-center gap-3">
          <FieldLabel className="w-27.5">Document :</FieldLabel>
          <div
          className={`w-62.5 ${cellFocusClass}`}
          onKeyDown={(event) => advanceOnEnter(event)}
        >
            <Select
              inputId="lkpDocument"
              instanceId="lkpDocument"
              options={documentOptions}
              value={lkpDocument}
              onChange={(option) => {
                onDocumentChange(option);
                if (option) advanceAfterPick("lkpDocument");
              }}
              noOptionsMessage={() => "No Document Found"}
              {...documentSelectProps}
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <FieldLabel className="w-27.5">Year / Month :</FieldLabel>
          <div
            className={`w-25 ${cellFocusClass}`}
            onKeyDown={(event) => advanceOnEnter(event)}
          >
            <Select
              inputId="lkpYear"
              instanceId="lkpYear"
              options={yearOptions}
              value={lkpYear}
              onChange={(option) => {
                onYearChange(option);
                if (option) advanceAfterPick("lkpYear");
              }}
              {...selectProps}
              isSearchable
            />
          </div>
          <div
            className={`w-37.5 ${cellFocusClass}`}
            onKeyDown={(event) => advanceOnEnter(event)}
          >
            <Select
              inputId="lkpMonth"
              instanceId="lkpMonth"
              options={monthOptions}
              value={lkpMonth}
              onChange={(option) => {
                onMonthChange(option);
                if (option) advanceAfterPick("lkpMonth");
              }}
              {...selectProps}
              isSearchable
            />
          </div>
        </div>
      </div>

      {/* Select all */}
      <label
        htmlFor="chkSelectAll"
        className="flex w-fit cursor-pointer items-center gap-2 text-[12px] text-[#405066] select-none"
      >
        <span className={`inline-flex p-0.5 ${cellFocusClass}`}>
          <input
            ref={selectAllRef}
            id="chkSelectAll"
            type="checkbox"
            checked={allSelected}
            disabled={selectAllDisabled}
            onChange={onToggleAll}
            className="h-4 w-4 accent-[#64d96e]"
          />
        </span>
        Select All
      </label>
    </div>
  );
};

export default StockDocumentPostHeader;