import React, { useState } from "react";
import type { PairSelectOption } from "../../../components/common/CustomLinkedPairSelect";
import { CustomRadio, RadioPanel } from "../../../components/common/ReportFormParts";
import {
  BranchFilter,
  FilterRow,
  PairFilter,
  PeriodFilter,
  PostStatusFilter,
  ReportForm,
  ReportPrintRow,
} from "../../../components/common/ReportFilters";

// Customer Sales - the form only (not connected to the server yet), laid out with the common template of the report forms
// (components/common/ReportFilters.tsx), like every other report page.

type Option = { value: string; label: string };

/* Replace these with data from your API */
const branchOptions: Option[] = [
  { value: "OFFICE", label: "OFFICE" },
  { value: "BRANCH 1", label: "BRANCH 1" },
  { value: "BRANCH 2", label: "BRANCH 2" },
];

// the customers: one list, "ID | Name" in the ID box and "Name | ID" in the Name box
const customerPairOptions: PairSelectOption[] = [
  { value: "C001", firstLabel: "C001", secondLabel: "Customer One" },
  { value: "C002", firstLabel: "C002", secondLabel: "Customer Two" },
];

// the items: the same
const itemPairOptions: PairSelectOption[] = [
  { value: "1001", firstLabel: "1001", secondLabel: "Item One" },
  { value: "1002", firstLabel: "1002", secondLabel: "Item Two" },
];

const postStatusOptions: Option[] = [
  { value: "ALL", label: "All" },
  { value: "POSTED", label: "Posted" },
  { value: "UNPOSTED", label: "Not Posted" },
];

// the check boxes at the right end of a row (Order By Amount, Cash)
const SideCheckbox: React.FC<{
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}> = ({ id, label, checked, onChange }) => (
  <label
    htmlFor={id}
    className="flex h-7.5 cursor-pointer items-center gap-2 rounded-sm border border-gray-300 bg-white px-2 text-[14px] whitespace-nowrap text-[#172b43] select-none"
  >
    <input
      id={id}
      type="checkbox"
      checked={checked}
      onChange={(event) => onChange(event.target.checked)}
      className="h-4 w-4 accent-[#4ade80]"
    />
    {label}
  </label>
);

const RptCustomerSalesPage: React.FC = () => {
  const [branchMode, setBranchMode] = useState("One Branch"); // rdgBranch
  const [branch, setBranch] = useState<Option | null>(branchOptions[0]); // lkpBranch
  const [orderByAmount, setOrderByAmount] = useState(false); // chkOrderByAmount

  const [customerMode, setCustomerMode] = useState("One Customer"); // rdgCustomer
  const [customerId, setCustomerId] = useState(""); // lkpCustomerID / lkpCustomerName
  const [cash, setCash] = useState(false); // chkCash

  const [itemMode, setItemMode] = useState("One Item"); // rdgItem
  const [itemId, setItemId] = useState(""); // lkpItemID / lkpItemName
  const [fromItem, setFromItem] = useState(""); // lkpFromItem
  const [toItem, setToItem] = useState(""); // lkpToItem

  const [fromDate, setFromDate] = useState(""); // dtpFromDate
  const [toDate, setToDate] = useState(""); // dtpToDate
  const [postStatus, setPostStatus] = useState<Option | null>(postStatusOptions[0]); // lkpPostStatus
  const [reportType, setReportType] = useState("Summary2"); // rdgReportType

  const handlePrint = () => {
    console.log({
      branchMode,
      branch: branchMode === "One Branch" ? branch : null,
      orderByAmount,
      customerMode,
      customerId: customerMode === "One Customer" ? customerId : null,
      cash,
      itemMode,
      itemId: itemMode === "One Item" ? itemId : null,
      fromItem: itemMode === "Range Item" ? fromItem : null,
      toItem: itemMode === "Range Item" ? toItem : null,
      fromDate,
      toDate,
      postStatus,
      reportType,
    });
  };

  return (
    <ReportForm title="Customer Sales">
      <BranchFilter
        mode={branchMode}
        onModeChange={setBranchMode}
        options={branchOptions}
        value={branch}
        onChange={setBranch}
        aside={
          <SideCheckbox
            id="chkOrderByAmount"
            label="Order By Amount"
            checked={orderByAmount}
            onChange={setOrderByAmount}
          />
        }
      />

      <PairFilter
        name="Customer"
        mode={customerMode}
        onModeChange={(mode) => {
          setCustomerMode(mode);
          setCustomerId("");
        }}
        options={customerPairOptions}
        value={customerId}
        onChange={setCustomerId}
        // the same ID box width as every other ID + Name pair; the Name box is a little narrower (380 px) so that Cash
        // still fits at the right end of the row
        firstWidth={190}
        secondWidth={380}
        aside={<SideCheckbox id="chkCash" label="Cash" checked={cash} onChange={setCash} />}
      />

      <PairFilter
        name="Item"
        mode={itemMode}
        onModeChange={(mode) => {
          setItemMode(mode);
          setItemId("");
          setFromItem("");
          setToItem("");
        }}
        options={itemPairOptions}
        value={itemId}
        onChange={setItemId}
        firstWidth={190}
        range={{ from: fromItem, to: toItem, onFromChange: setFromItem, onToChange: setToItem }}
      />

      <PeriodFilter
        from={fromDate}
        to={toDate}
        onFromChange={setFromDate}
        onToChange={setToDate}
      />

      <PostStatusFilter options={postStatusOptions} value={postStatus} onChange={setPostStatus} />

      {/* Report type */}
      <FilterRow
        panel={
          <RadioPanel id="rdgReportType" className="h-22.5 w-38">
            <CustomRadio
              name="rdgReportType"
              value="Detailed"
              label="Detailed"
              checked={reportType === "Detailed"}
              onChange={() => setReportType("Detailed")}
            />
            <CustomRadio
              name="rdgReportType"
              value="Summary1"
              label="Summary1"
              checked={reportType === "Summary1"}
              onChange={() => setReportType("Summary1")}
            />
            <CustomRadio
              name="rdgReportType"
              value="Summary2"
              label="Summary2"
              checked={reportType === "Summary2"}
              onChange={() => setReportType("Summary2")}
            />
          </RadioPanel>
        }
      />

      <ReportPrintRow onPrint={handlePrint} />
    </ReportForm>
  );
};

export default RptCustomerSalesPage;
