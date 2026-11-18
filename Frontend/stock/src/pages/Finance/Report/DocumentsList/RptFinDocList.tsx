import React, { useState } from "react";
import { CustomRadio, RadioPanel } from "../../../../components/common/ReportFormParts";
import {
  BranchOnlyFilter,
  FILTER_GAP,
  FilterRow,
  PostStatusFilter,
  ReportDatePicker,
  ReportForm,
  ReportPrintRow,
  SingleFilter,
} from "../../../../components/common/ReportFilters";

// Document List (Finance) - the form only (not connected to the server yet), laid out with the common template of the
// report forms (components/common/ReportFilters.tsx), like every other report page.

type Option = { value: string; label: string };

/* Replace these with data from your API */
const branchOptions: Option[] = [
  { value: "OFFICE", label: "OFFICE" },
  { value: "BRANCH 1", label: "BRANCH 1" },
  { value: "BRANCH 2", label: "BRANCH 2" },
];
const documentOptions: Option[] = [
  { value: "SALES INVOICE", label: "Sales Invoice" },
  { value: "PURCHASE INVOICE", label: "Purchase Invoice" },
  { value: "RECEIPT VOUCHER", label: "Receipt Voucher" },
  { value: "PAYMENT VOUCHER", label: "Payment Voucher" },
  { value: "JOURNAL VOUCHER", label: "Journal Voucher" },
];
const postStatusOptions: Option[] = [
  { value: "ALL", label: "All" },
  { value: "POSTED", label: "Posted" },
  { value: "UNPOSTED", label: "Not Posted" },
];

// the Document No. boxes: the same size as the date boxes beside them (154 px, 30 px high)
const docNoInputClass =
  "h-7.5 w-38.5 rounded-sm border border-gray-300 bg-white px-2 text-[14px] text-[#172b43] outline-none";

const RptFinDocList: React.FC = () => {
  const [branch, setBranch] = useState<Option | null>(branchOptions[0]); // lkpBranch
  const [documentType, setDocumentType] = useState<Option | null>(null); // lkpDocument

  const [filterMode, setFilterMode] = useState("By Document No."); // rdgFilter
  const [fromDocNo, setFromDocNo] = useState(""); // txtFromDocNo
  const [toDocNo, setToDocNo] = useState(""); // txtToDocNo
  const [fromDate, setFromDate] = useState(""); // dtpFromDate
  const [toDate, setToDate] = useState(""); // dtpToDate

  const [postStatus, setPostStatus] = useState<Option | null>(postStatusOptions[1]); // lkpPostStatus

  const byDocNo = filterMode === "By Document No.";

  const handlePrint = () => {
    console.log({
      branch,
      documentType,
      filterMode,
      fromDocNo: byDocNo ? fromDocNo : null,
      toDocNo: byDocNo ? toDocNo : null,
      fromDate: byDocNo ? null : fromDate,
      toDate: byDocNo ? null : toDate,
      postStatus,
    });
  };

  return (
    <ReportForm title="Document List">
      <BranchOnlyFilter options={branchOptions} value={branch} onChange={setBranch} />

      <SingleFilter
        required
        name="Document"
        mode="One Document"
        onModeChange={() => undefined}
        options={documentOptions}
        value={documentType}
        onChange={setDocumentType}
      />

      {/* Filter mode: by document number or by document date */}
      <FilterRow
        panel={
          <RadioPanel id="rdgFilter" className="h-17.5 w-38">
            <CustomRadio
              name="rdgFilter"
              value="By Document No."
              label="By Document No."
              checked={byDocNo}
              onChange={() => setFilterMode("By Document No.")}
            />
            <CustomRadio
              name="rdgFilter"
              value="By Document Date"
              label="By Document Date"
              checked={!byDocNo}
              onChange={() => setFilterMode("By Document Date")}
            />
          </RadioPanel>
        }
      >
        <div className="flex min-w-0 flex-wrap items-center" style={{ gap: FILTER_GAP }}>
          {byDocNo ? (
            <>
              <input
                id="txtFromDocNo"
                type="text"
                aria-label="From Document No."
                autoComplete="off"
                value={fromDocNo}
                onChange={(event) => setFromDocNo(event.target.value)}
                className={docNoInputClass}
              />
              <input
                id="txtToDocNo"
                type="text"
                aria-label="To Document No."
                autoComplete="off"
                value={toDocNo}
                onChange={(event) => setToDocNo(event.target.value)}
                className={docNoInputClass}
              />
            </>
          ) : (
            <>
              <div className="w-38.5">
                <ReportDatePicker id="dtpFromDate" label="From Date" value={fromDate} onChange={setFromDate} />
              </div>
              <div className="w-38.5">
                <ReportDatePicker id="dtpToDate" label="To Date" value={toDate} onChange={setToDate} />
              </div>
            </>
          )}
        </div>
      </FilterRow>

      <PostStatusFilter options={postStatusOptions} value={postStatus} onChange={setPostStatus} />

      <ReportPrintRow onPrint={handlePrint} />
    </ReportForm>
  );
};

export default RptFinDocList;
