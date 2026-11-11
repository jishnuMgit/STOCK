
import React, { useState } from "react";
import {
  LocalizationProvider,
} from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";

import Header from "../../../components/common/Header";
import CommonTableSelect, {
  type TableSelectOption,
} from "../../../components/common/CommonTableSelect";
import CustomLinkedPairSelect, {
  type PairSelectOption,
} from "../../../components/common/CustomLinkedPairSelect";

dayjs.extend(customParseFormat);

const DATE_FORMAT = "DD/MM/YYYY";
const TODAY = dayjs().format(DATE_FORMAT);

const documentOptions: TableSelectOption[] = [
  { value: "INV", label: "Sales Invoice", id: "INV" },
  { value: "CRN", label: "Credit Note", id: "CRN" },
  { value: "DBN", label: "Debit Note", id: "DBN" },
];

const documentColumns = [
  { key: "label", label: "Document Type", width: "1fr" },
  { key: "id", label: "ID", width: "65px", align: "right" as const },
];

const branchOptions: TableSelectOption[] = [
  { value: "JD", label: "JEDDAH", id: "JD" },
  { value: "RH", label: "RIYADH", id: "RH" },
];

const branchColumns = [
  { key: "label", label: "Branch", width: "1fr" },
  { key: "id", label: "ID", width: "65px", align: "right" as const },
];

const customerOptions: PairSelectOption[] = [
  { value: "C001", firstLabel: "C001", secondLabel: "Customer One" },
  { value: "C002", firstLabel: "C002", secondLabel: "Customer Two" },
];

type RadioProps = {
  name: string;
  value: string;
  label: string;
  checked: boolean;
  onChange: () => void;
};

const CustomRadio: React.FC<RadioProps> = ({
  name,
  value,
  label,
  checked,
  onChange,
}) => (
  <label className="flex items-center gap-1.25 whitespace-nowrap select-none cursor-pointer">
    <input
      type="radio"
      name={name}
      value={value}
      checked={checked}
      onChange={onChange}
      className="sr-only"
    />

    <span
      className={`flex h-4.75 w-4.75 shrink-0 items-center justify-center rounded-full border ${
        checked ? "border-[#4ade80]" : "border-[#c3cbd3]"
      } bg-white`}
    >
      {checked && (
        <span className="h-2.25 w-2.25 rounded-full bg-[#4ade80]" />
      )}
    </span>

    <span className="text-[12px] leading-4.25 text-[#172b43]">
      {label}
    </span>
  </label>
);

const RadioPanel: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = "" }) => (
  <div
    className={`flex flex-col justify-center gap-1.5 border border-gray-300 rounded-sm bg-white px-1.75 py-1.75 ${className}`}
  >
    {children}
  </div>
);

const AppDatePicker: React.FC<{
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}> = ({ id, label, value, onChange }) => (
  <LocalizationProvider dateAdapter={AdapterDayjs}>
    <DatePicker
      value={value ? dayjs(value, DATE_FORMAT) : null}
      onChange={(newValue) => {
        onChange(
          newValue?.isValid()
            ? newValue.format(DATE_FORMAT)
            : ""
        );
      }}
      format={DATE_FORMAT}
      slotProps={{
        textField: {
          id,
          slotProps: {
            htmlInput: { "aria-label": label },
          },
        },
        openPickerButton: {
          sx: { padding: "2px", margin: 0 },
        },
        inputAdornment: {
          sx: { margin: 0, padding: 0 },
        },
      }}
      sx={{
        width: "100%",
        minWidth: 0,
        "& .MuiPickersTextField-root": {
          width: "100%",
        },
        "& .MuiPickersInputBase-root": {
          width: "100%",
          height: "28px",
          minHeight: "28px",
          boxSizing: "border-box",
          borderRadius: "4px",
          backgroundColor: "#ffffff",
          fontSize: "12px",
          padding: 0,
          overflow: "hidden",
        },
        "& .MuiPickersInputBase-sectionsContainer": {
          paddingLeft: "8px !important",
          paddingRight: "0px !important",
          marginBottom: "-5px !important",
          marginLeft: "0px !important",
          boxSizing: "border-box",
          overflow: "hidden",
        },
        "& .MuiPickersInputBase-sectionContent": {
          fontSize: "12px",
          color: "#344054",
        },
        "& .MuiPickersInputBase-input": {
          minWidth: 0,
          width: "100%",
          fontSize: "12px",
          padding: 0,
          height: "28px",
          boxSizing: "border-box",
        },
        "& .MuiInputAdornment-root": {
          margin: 0,
          padding: 0,
        },
        "& .MuiIconButton-root": {
          width: "22px",
          height: "22px",
          padding: "2px",
          margin: 0,
        },
        "& .MuiSvgIcon-root": {
          fontSize: "15px",
        },
        "& .Mui-disabled": {
          WebkitTextFillColor: "#24364d",
        },
        ...(!value && {
          "&:not(:focus-within) .MuiPickersInputBase-sectionsContainer *": {
            color: "transparent",
          },
        }),
        "& .MuiPickersOutlinedInput-notchedOutline": {
          borderColor: "#B7C7D7 !important",
        },
        "& .MuiPickersInputBase-root:hover .MuiPickersOutlinedInput-notchedOutline":
          {
            borderColor: "#B7C7D7 !important",
          },
        "& .MuiPickersInputBase-root.Mui-focused .MuiPickersOutlinedInput-notchedOutline":
          {
            borderColor: "#B7C7D7 !important",
            borderWidth: "1px",
          },
        "& .MuiPickersInputBase-root.Mui-error .MuiPickersOutlinedInput-notchedOutline":
          {
            borderColor: "#B7C7D7 !important",
          },
      }}
    />
  </LocalizationProvider>
);

const ActionButton: React.FC<{
  children: React.ReactNode;
  onClick: () => void;
  className?: string;
  disabled?: boolean;
}> = ({ children, onClick, className = "", disabled = false }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={`min-w-20 btn-style ${className}`}
  >
    {children}
  </button>
);

type DocumentRow = {
  id: number;
  branchId: string;
  documentType: string;
  documentNo: string;
  documentDate: string;
  issueTime: string;
  customerName: string;
  exclusiveVat: string;
  vatAmount: string;
  inclusiveVat: string;
};

const columns = [
  { key: "id", label: "Sl.No", width: "40px" },
  { key: "branchId", label: "Br. ID", width: "50px" },
  { key: "documentType", label: "Doc. Type", width: "68px" },
  { key: "documentNo", label: "Doc. No.", width: "100px" },
  { key: "documentDate", label: "Doc. Date", width: "98px" },
  { key: "issueTime", label: "Document Issue Time", width: "140px" },
  { key: "customerName", label: "Customer Name", width: "255px" },
  { key: "exclusiveVat", label: "Inv. Amt. Excl. VAT", width: "118px" },
  { key: "vatAmount", label: "VAT Amt.", width: "98px" },
  { key: "inclusiveVat", label: "Inv. Amt. Incl. VAT", width: "125px" },
];

const createEmptyRows = (): DocumentRow[] =>
  Array.from({ length: 14 }, (_, index) => ({
    id: index + 1,
    branchId: "",
    documentType: "",
    documentNo: "",
    documentDate: "",
    issueTime: "",
    customerName: "",
    exclusiveVat: "",
    vatAmount: "",
    inclusiveVat: "",
  }));

const RptZatcaPdfA3Generation: React.FC = () => {
  const [documentMode, setDocumentMode] = useState("All Document");
  const [branchMode, setBranchMode] = useState("All Branch");
  const [customerMode, setCustomerMode] = useState("All Customer");

  const [invoiceMode, setInvoiceMode] = useState("By Invoice Date");
  const [documentType, setDocumentType] =
    useState<TableSelectOption | null>(null);
  const [branch, setBranch] = useState<TableSelectOption | null>(null);
  const [customer, setCustomer] = useState<PairSelectOption | null>(null);
  const [invoiceNo, setInvoiceNo] = useState("");

  const [fromDate, setFromDate] = useState(TODAY);
  const [toDate, setToDate] = useState(TODAY);

  const [rows, setRows] = useState<DocumentRow[]>(createEmptyRows());

  const handleSearch = () => {
    console.log("ZATCA PDF/A3 Search", {
      documentMode,
      documentType: documentMode === "One Document" ? documentType : null,
      branchMode,
      branch: branchMode === "One Branch" ? branch : null,
      customerMode,
      customer: customerMode === "One Customer" ? customer : null,
      invoiceMode,
      invoiceNo: invoiceMode === "By Invoice No." ? invoiceNo : null,
      fromDate: invoiceMode === "By Invoice Date" ? fromDate : null,
      toDate: invoiceMode === "By Invoice Date" ? toDate : null,
    });

    // Connect your search API here.
  };

  const handleExport = () => {
    console.log("Export PDF/A3", {
      documentMode,
      documentType: documentMode === "One Document" ? documentType : null,
      branchMode,
      branch: branchMode === "One Branch" ? branch : null,
      customerMode,
      customer: customerMode === "One Customer" ? customer : null,
      invoiceMode,
      invoiceNo: invoiceMode === "By Invoice No." ? invoiceNo : null,
      fromDate: invoiceMode === "By Invoice Date" ? fromDate : null,
      toDate: invoiceMode === "By Invoice Date" ? toDate : null,
      rows,
    });

    // Connect your PDF/A3 export function here.
  };

  const handleCancel = () => {
    setDocumentMode("All Document");
    setBranchMode("All Branch");
    setCustomerMode("All Customer");
    setInvoiceMode("By Invoice Date");
    setDocumentType(null);
    setBranch(null);
    setCustomer(null);
    setInvoiceNo("");
    setFromDate(TODAY);
    setToDate(TODAY);
    setRows(createEmptyRows());
  };

  const handleClose = () => {
    window.history.back();
  };

  return (
    <div className="min-h-full w-full bg-white p-1 sm:p-2">
      <main className="mx-auto w-full max-w-290 overflow-hidden rounded-[3px] border border-[#91a7bb] bg-white shadow-sm">

        {/* Window Header */}
        <Header Name="ZATCA PDF/A3 Generation" />

        <section className="relative flex min-h-[650px] flex-col gap-3 px-3.5 pb-3 pt-3.5 sm:px-3.5">

          {/* Filter Section */}
          <div className="grid grid-cols-1 gap-x-3 gap-y-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">

            {/* Document Selection */}
            <div className="flex items-start gap-2">
              <RadioPanel className="w-32.5 min-h-18.75 shrink-0">
                <CustomRadio
                  name="rdgDocument"
                  value="One Document"
                  label="One Document"
                  checked={documentMode === "One Document"}
                  onChange={() => setDocumentMode("One Document")}
                />

                <CustomRadio
                  name="rdgDocument"
                  value="All Document"
                  label="All Document"
                  checked={documentMode === "All Document"}
                  onChange={() => setDocumentMode("All Document")}
                />
              </RadioPanel>

              {documentMode === "One Document" && (
                <div className="w-full max-w-55 min-w-0 pt-2.5">
                  <CommonTableSelect
                    inputId="zatca-document-type"
                    options={documentOptions}
                    value={documentType}
                    onChange={setDocumentType}
                    columns={documentColumns}
                    width="100%"
                    menuWidth="280px"
                    placeholder="Select Document"
                    menuPortalTarget={
                      typeof document !== "undefined" ? document.body : undefined
                    }
                  />
                </div>
              )}
            </div>

            {/* Branch Selection */}
            <div className="flex items-start sm:justify-start">
              <RadioPanel className="w-30 min-h-18.75">
                <CustomRadio
                  name="rdgBranch"
                  value="One Branch"
                  label="One Branch"
                  checked={branchMode === "One Branch"}
                  onChange={() => setBranchMode("One Branch")}
                />

                <CustomRadio
                  name="rdgBranch"
                  value="All Branch"
                  label="All Branches"
                  checked={branchMode === "All Branch"}
                  onChange={() => setBranchMode("All Branch")}
                />
              </RadioPanel>

              {branchMode === "One Branch" && (
                <div className="w-full max-w-55 min-w-0 pt-2.5 ml-3">
                  <CommonTableSelect
                    inputId="zatca-branch"
                    options={branchOptions}
                    value={branch}
                    onChange={setBranch}
                    columns={branchColumns}
                    width="100%"
                    menuWidth="270px"
                    placeholder="Select Branch"
                    menuPortalTarget={
                      typeof document !== "undefined" ? document.body : undefined
                    }
                  />
                </div>
              )}
            </div>

            {/* Invoice Filter */}
            <div className="flex justify-start sm:justify-end">
              <RadioPanel className="w-44 min-h-18.75">
                <CustomRadio
                  name="rdgInvoice"
                  value="By Invoice No."
                  label="By Invoice No."
                  checked={invoiceMode === "By Invoice No."}
                  onChange={() => setInvoiceMode("By Invoice No.")}
                />

                <CustomRadio
                  name="rdgInvoice"
                  value="By Invoice Date"
                  label="By Invoice Date"
                  checked={invoiceMode === "By Invoice Date"}
                  onChange={() => setInvoiceMode("By Invoice Date")}
                />
              </RadioPanel>
            </div>

            {/* Invoice Criteria */}
            <div className="flex flex-wrap items-center gap-2">
              {invoiceMode === "By Invoice No." ? (
                <div className="w-55">
                  <input
                    id="zatca-invoice-number"
                    type="text"
                    value={invoiceNo}
                    onChange={(event) => setInvoiceNo(event.target.value)}
                    placeholder="Enter Invoice No."
                    aria-label="Invoice number"
                    className="h-7.5 w-full rounded-[3px] border border-[#B7C7D7] bg-white px-2 text-[12px] text-[#172b43] outline-none"
                  />
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-1.25">
                  <div className="w-27.5">
                    <AppDatePicker
                      id="dtpFromDate"
                      label="Invoice start date"
                      value={fromDate}
                      onChange={setFromDate}
                    />
                  </div>

                  <div className="w-27.5">
                    <AppDatePicker
                      id="dtpToDate"
                      label="Invoice end date"
                      value={toDate}
                      onChange={setToDate}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Customer Selection */}
            <div className="flex items-start">
              <RadioPanel className="w-32.5 min-h-18.75">
                <CustomRadio
                  name="rdgCustomer"
                  value="One Customer"
                  label="One Customer"
                  checked={customerMode === "One Customer"}
                  onChange={() => setCustomerMode("One Customer")}
                />

                <CustomRadio
                  name="rdgCustomer"
                  value="All Customer"
                  label="All Customers"
                  checked={customerMode === "All Customer"}
                  onChange={() => setCustomerMode("All Customer")}
                />
              </RadioPanel>

              {customerMode === "One Customer" && (
                <div className="min-w-0 pt-2.5 ml-3">
                  <CustomLinkedPairSelect
                    options={customerOptions}
                    firstValue={customer?.value ?? null}
                    secondValue={customer?.value ?? null}
                    onChange={setCustomer}
                    firstHeader="Customer ID"
                    secondHeader="Customer Name"
                    firstWidth={120}
                    secondWidth={400}
                    firstInputId="zatca-customer-id"
                    secondInputId="zatca-customer-name"
                    placeholder="Select"
                    menuPortalTarget={
                      typeof document !== "undefined" ? document.body : undefined
                    }
                  />
                </div>
              )}
            </div>

            {/* Search Button */}
            <div className="flex items-center justify-end sm:col-start-3">
              <ActionButton
                onClick={handleSearch}
                className="h-7.5 w-25 mt-13"
              >
                Search
              </ActionButton>
            </div>
          </div>

          {/* Document Grid */}
          <div className="min-h-0 w-full flex-1 overflow-hidden border border-[#B7C7D7] bg-white">

            <div className="h-full w-full overflow-auto">
              <table className="w-full min-w-245 table-fixed border-collapse text-[12px] text-[#172b43]">

                <colgroup>
                  <col style={{ width: "22px" }} />
                  {columns.map((column) => (
                    <col
                      key={column.key}
                      style={{ width: column.width }}
                    />
                  ))}
                </colgroup>

                {/* Table Header */}
                <thead>
                  <tr className="h-6 bg-[#f5f6f8]">
                    <th className="border border-[#B7ECD0]"></th>

                    {columns.map((column) => (
                      <th
                        key={column.key}
                        className="border border-[#B7ECD0] px-1 text-left font-semibold whitespace-nowrap"
                      >
                        {column.label}
                      </th>
                    ))}
                  </tr>
                </thead>

                {/* Table Body */}
                <tbody>
                  {rows.map((row, index) => (
                    <tr
                      key={row.id}
                      className="h-6 bg-white"
                    >
                      {/* Row Indicator */}
                      <td className="border border-[#B7ECD0] bg-[#f7f7f9] text-center text-[11px]">
                        {index === 0 ? "›" : ""}
                      </td>

                      <td className="border border-[#B7ECD0] px-1"></td>

                      <td className="border border-[#B7ECD0] px-1"></td>

                      {/* Selected cell */}
                      <td
                        className={`border border-[#B7ECD0] px-1 ${
                          index === 0 ? "" : ""
                        }`}
                      ></td>

                      <td className="border border-[#B7ECD0] px-1"></td>

                      <td className="border border-[#B7ECD0] px-1"></td>

                      <td className="border border-[#B7ECD0] px-1"></td>

                      <td className="border border-[#B7ECD0] px-1"></td>

                      <td className="border border-[#B7ECD0] px-1"></td>

                      <td className="border border-[#B7ECD0] px-1"></td>

                      <td className="border border-[#B7ECD0] px-1"></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bottom Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-1 pb-1 pt-1">
            <ActionButton
              onClick={handleExport}
              className="h-9 w-40"
            >
              Export PDF/A3
            </ActionButton>

            <ActionButton
              onClick={handleCancel}
              className="h-9 w-20"
            >
              Cancel
            </ActionButton>

            <ActionButton
              onClick={handleClose}
              className="h-9 w-20"
            >
              Close
            </ActionButton>
          </div>

        </section>
      </main>
    </div>
  );
};

export default RptZatcaPdfA3Generation;
