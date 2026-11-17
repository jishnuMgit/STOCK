import React, { useEffect, useRef } from "react";
import CommonTableSelect from "../../common/CommonTableSelect";
import { filterLabelOrValue } from "../../BranchSelect/branchSelectParts";
import { useAdvanceAfterSelect } from "../../../hooks/useAdvanceAfterSelect";
import { useGridCellFocus } from "../../../hooks/useGridCellFocus";
import { type Option } from "./StockDocumentPostShared";

// The Branch and Document lists: "Branch | ID" / "Document | ID" (the old fBrName / fBrID and fDocName / fDocType columns)
const NAME_ID_COLUMNS = (name: string) => [
  { key: "label", label: name },
  { key: "value", label: "ID", width: "70px" },
];

// the label of a box, as on the Receipt screen: 90 px, right aligned
const FieldLabel: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = "" }) => (
  <div className={`text-right text-[14px] whitespace-nowrap text-[#405066] ${className}`}>
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
      {/* Branch: laid out as the Receipt screen (16 px in, a 90 px label, 8 px, the 250 px "Branch | ID" box) */}
      <div className="ml-4 flex items-center gap-2">
        <FieldLabel className="w-22.5">Branch :</FieldLabel>
        <div className="w-62.5" onKeyDown={(event) => advanceOnEnter(event)}>
          <CommonTableSelect
            inputId="lkpBranch"
            options={branchOptions}
            value={lkpBranch}
            onChange={(option) => {
              onBranchChange(option);
              if (option) advanceAfterPick("lkpBranch");
            }}
            columns={NAME_ID_COLUMNS("Branch")}
            placeholder="Select Branch"
            width="250px"
            menuWidth="320px"
            filterOption={filterLabelOrValue}
            noOptionsMessage={() => "No Branch Found"}
            menuPortalTarget={typeof document !== "undefined" ? document.body : undefined}
          />
        </div>
      </div>

      {/* Document + year / month */}
      <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-3">
        <div className="ml-4 flex items-center gap-2">
          <FieldLabel className="w-22.5">Document :</FieldLabel>
          <div className="w-62.5" onKeyDown={(event) => advanceOnEnter(event)}>
            <CommonTableSelect
              inputId="lkpDocument"
              options={documentOptions}
              value={lkpDocument}
              onChange={(option) => {
                onDocumentChange(option);
                if (option) advanceAfterPick("lkpDocument");
              }}
              columns={NAME_ID_COLUMNS("Document")}
              width="250px"
              menuWidth="320px"
              // the list shows up to 11 rows (header 35 px + 11 x 32 px) before it gets a scroll bar
              menuMaxHeight="387px"
              placeholder=""
              filterOption={filterLabelOrValue}
              noOptionsMessage={() => "No Document Found"}
              menuPortalTarget={typeof document !== "undefined" ? document.body : undefined}
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <FieldLabel>Year / Month :</FieldLabel>
          <div className="w-25" onKeyDown={(event) => advanceOnEnter(event)}>
            <CommonTableSelect
              inputId="lkpYear"
              options={yearOptions}
              value={lkpYear}
              onChange={(option) => {
                onYearChange(option);
                if (option) advanceAfterPick("lkpYear");
              }}
              columns={[{ key: "label", label: "Year" }]}
              showHeader={false}
              width="100px"
              menuWidth="100px"
              placeholder=""
              noOptionsMessage={() => "No Year Found"}
              menuPortalTarget={typeof document !== "undefined" ? document.body : undefined}
            />
          </div>
          <div className="w-37.5" onKeyDown={(event) => advanceOnEnter(event)}>
            <CommonTableSelect
              inputId="lkpMonth"
              options={monthOptions}
              value={lkpMonth}
              onChange={(option) => {
                onMonthChange(option);
                if (option) advanceAfterPick("lkpMonth");
              }}
              columns={[{ key: "label", label: "Month" }]}
              showHeader={false}
              width="150px"
              menuWidth="150px"
              placeholder=""
              noOptionsMessage={() => "No Month Found"}
              menuPortalTarget={typeof document !== "undefined" ? document.body : undefined}
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