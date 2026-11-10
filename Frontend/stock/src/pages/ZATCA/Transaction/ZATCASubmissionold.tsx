
import React, { useState } from "react";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";

import Header from "../../../components/common/Header";

import CommonTableSelect, {
  type TableSelectOption,
} from "../../../components/common/CommonTableSelect";

import CustomLinkedPairSelect, {
  type PairSelectOption,
} from "../../../components/common/CustomLinkedPairSelect";

import {
  LocalizationProvider,
} from "@mui/x-date-pickers/LocalizationProvider";

import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";

dayjs.extend(customParseFormat);

// ==================================================
// TYPES
// ==================================================

type Option = {
  value: string;
  label: string;
};

type DocumentRow = {
  id: number;
  selected: boolean;
  branchId: string;
  documentType: string;
  documentNo: string;
  documentDate: string;
  issueTime: string;
  customerName: string;
  invoiceAmountExclVat: string;
  vatAmount: string;
  invoiceAmountInclVat: string;
};

// ==================================================
// CONSTANTS
// ==================================================

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

const customerIdOptions: Option[] = [
  { value: "C001", label: "C001" },
  { value: "C002", label: "C002" },
];

const customerNameOptions: Option[] = [
  { value: "C001", label: "Customer One" },
  { value: "C002", label: "Customer Two" },
];

const createPairOptions = (
  idOptions: Option[],
  nameOptions: Option[],
): PairSelectOption[] =>
  idOptions.map((item) => ({
    value: item.value,
    firstLabel: item.label,
    secondLabel:
      nameOptions.find((name) => name.value === item.value)?.label ?? "",
  }));

const customerPairOptions = createPairOptions(
  customerIdOptions,
  customerNameOptions,
);

// ==================================================
// INITIAL TABLE ROWS
// ==================================================

const createRows = (): DocumentRow[] =>
  Array.from({ length: 15 }, (_, index) => ({
    id: index + 1,
    selected: false,
    branchId: "",
    documentType: "",
    documentNo: "",
    documentDate: "",
    issueTime: "",
    customerName: "",
    invoiceAmountExclVat: "",
    vatAmount: "",
    invoiceAmountInclVat: "",
  }));

// ==================================================
// CUSTOM RADIO
// ==================================================

type RadioProps = {
  name: string;
  value: string;
  label: string;
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
};

const CustomRadio: React.FC<RadioProps> = ({
  name,
  value,
  label,
  checked,
  onChange,
  disabled = false,
}) => (
  <label
    className={`flex items-center gap-1.25 whitespace-nowrap select-none ${
      disabled
        ? "cursor-not-allowed opacity-40"
        : "cursor-pointer"
    }`}
  >
    <input
      type="radio"
      name={name}
      value={value}
      checked={checked}
      onChange={onChange}
      disabled={disabled}
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

// ==================================================
// RADIO PANEL
// ==================================================

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

// ==================================================
// DATE PICKER
// ==================================================

const AppDatePicker: React.FC<{
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}> = ({ id, label, value, onChange }) => (
  <LocalizationProvider dateAdapter={AdapterDayjs}>
    <DatePicker
      value={
        value
          ? dayjs(value, DATE_FORMAT)
          : null
      }
      onChange={(newValue) => {
        onChange(
          newValue?.isValid()
            ? newValue.format(DATE_FORMAT)
            : "",
        );
      }}
      format={DATE_FORMAT}
      slotProps={{
        textField: {
          id,
          slotProps: {
            htmlInput: {
              "aria-label": label,
            },
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
          height: "25px",
          minHeight: "25px",
          boxSizing: "border-box",
          borderRadius: "3px",
          backgroundColor: "#ffffff",
          fontSize: "12px",
          padding: 0,
          overflow: "hidden",
        },

        "& .MuiPickersInputBase-sectionsContainer": {
          paddingLeft: "6px !important",
          paddingRight: "0px !important",
          marginBottom: "-5px !important",
          boxSizing: "border-box",
        },

        "& .MuiPickersInputBase-sectionContent": {
          fontSize: "12px",
          color: "#344054",
        },

        "& .MuiIconButton-root": {
          width: "21px",
          height: "21px",
          padding: "2px",
        },

        "& .MuiSvgIcon-root": {
          fontSize: "15px",
        },

        "& .MuiPickersOutlinedInput-notchedOutline": {
          borderColor: "#B7C7D7 !important",
        },

        "& .MuiPickersInputBase-root.Mui-focused .MuiPickersOutlinedInput-notchedOutline":
          {
            borderColor: "#B7C7D7 !important",
            borderWidth: "1px",
          },
      }}
    />
  </LocalizationProvider>
);

// ==================================================
// ACTION BUTTON
// ==================================================

const ActionButton: React.FC<{
  children: React.ReactNode;
  onClick: () => void;
  className?: string;
}> = ({ children, onClick, className = "" }) => (
  <button
    type="button"
    onClick={onClick}
    className={`min-w-20 btn-style ${className}`}
  >
    {children}
  </button>
);

// ==================================================
// MAIN COMPONENT
// ==================================================

const ZATCASubmission: React.FC = () => {

  // DOCUMENT FILTER

  const [documentMode, setDocumentMode] = useState("One Document");

  const [documentType, setDocumentType] =
    useState<TableSelectOption | null>(null);

  const [documentFilter, setDocumentFilter] =
    useState("By Document Date");

  // BRANCH

  const [branchMode, setBranchMode] = useState("All Branch");

  const [branch, setBranch] =
    useState<TableSelectOption | null>(branchOptions[0]);

  // CUSTOMER

  const [customerMode, setCustomerMode] = useState("All Customer");

  const [customerId, setCustomerId] =
    useState<Option | null>(null);

  const [customerName, setCustomerName] =
    useState<Option | null>(null);

  // DATE FILTER

  const [dateMode, setDateMode] =
    useState("By Document Issue Date");

  const [fromDate, setFromDate] = useState("09/11/2026");

  const [toDate, setToDate] = useState(TODAY);

  // DOCUMENT NUMBER

  const [documentNo, setDocumentNo] = useState("");

  // TABLE

  const [rows, setRows] = useState<DocumentRow[]>(createRows);

  // ==================================================
  // SEARCH
  // ==================================================

  const handleSearch = () => {
    const searchParams = {
      documentMode,

      documentType:
        documentMode === "One Document"
          ? documentType
          : null,

      documentFilter,

      documentNo:
        documentFilter === "By Document No."
          ? documentNo
          : null,

      branchMode,

      branch:
        branchMode === "One Branch"
          ? branch
          : null,

      customerMode,

      customerId:
        customerMode === "One Customer"
          ? customerId
          : null,

      customerName:
        customerMode === "One Customer"
          ? customerName
          : null,

      dateMode,
      fromDate,
      toDate,
    };

    console.log("ZATCA Document Search:", searchParams);

    // Connect your search API here.
  };

  // ==================================================
  // SUBMIT
  // ==================================================

  const handleSubmit = () => {
    const selectedDocuments = rows.filter(
      (row) => row.selected && row.documentNo.trim() !== "",
    );

    console.log("ZATCA Document Submission:", {
      filters: {
        documentMode,
        documentType,
        branchMode,
        branch,
        customerMode,
        customerId,
        customerName,
        documentFilter,
        dateMode,
        fromDate,
        toDate,
      },
      documents: selectedDocuments,
    });

    // Connect your ZATCA submission API here.
  };

  // ==================================================
  // CANCEL
  // ==================================================

  const handleCancel = () => {
    setDocumentMode("One Document");
    setDocumentType(null);
    setDocumentFilter("By Document Date");
    setDocumentNo("");

    setBranchMode("All Branch");
    setBranch(branchOptions[0]);

    setCustomerMode("All Customer");
    setCustomerId(null);
    setCustomerName(null);

    setDateMode("By Document Issue Date");
    setFromDate(TODAY);
    setToDate(TODAY);

    setRows(createRows());
  };

  // ==================================================
  // CLOSE
  // ==================================================

  const handleClose = () => {
    window.history.back();
  };

  // ==================================================
  // TABLE ROW UPDATE
  // ==================================================
  //@ts-ignore
  const updateRows = (data: DocumentRow[]) => {
    setRows(data);
  };

  // ==================================================
  // UI
  // ==================================================

  return (
    <div className="min-h-full w-full bg-white p-1 sm:p-2">

      <main className="mx-auto flex w-full max-w-292.5 min-w-292.5 flex-col overflow-hidden rounded-[3px] border border-[#91a7bb] bg-white shadow-sm">

        {/* WINDOW HEADER */}

        <Header Name="ZATCA Submission" />

        <section className="relative flex flex-col px-3.5 pb-3 pt-3">

          {/* ==========================================
              TOP FILTER SECTION
          ========================================== */}

          <div className="grid grid-cols-1 gap-x-2 gap-y-2 lg:grid-cols-[145px_minmax(180px,1fr)_130px_minmax(330px,2fr)_176px]">

            {/* DOCUMENT MODE */}

            <RadioPanel className="h-18.75">

              <CustomRadio
                name="documentMode"
                value="One Document"
                label="One Document"
                checked={documentMode === "One Document"}
                onChange={() => setDocumentMode("One Document")}
              />

              <CustomRadio
                name="documentMode"
                value="All Document"
                label="All Documents"
                checked={documentMode === "All Document"}
                onChange={() => setDocumentMode("All Document")}
              />

            </RadioPanel>

            {/* DOCUMENT SELECT */}

            <div className="pt-3">

              {documentMode === "One Document" && (
                <CommonTableSelect
                  inputId="documentType"
                  options={documentOptions}
                  value={documentType}
                  onChange={setDocumentType}
                  columns={documentColumns}
                  width="220px"
                  menuWidth="300px"
                  placeholder=""
                />
              )}

            </div>

            {/* BRANCH MODE */}

            <div className="flex min-w-0 flex-wrap items-center gap-2 lg:col-start-3 lg:row-start-1 lg:col-span-2 ml-30">
              <RadioPanel className="h-18.75 shrink-0">
                <CustomRadio
                  name="branchMode"
                  value="One Branch"
                  label="One Branch"
                  checked={branchMode === "One Branch"}
                  onChange={() => setBranchMode("One Branch")}
                />

                <CustomRadio
                  name="branchMode"
                  value="All Branch"
                  label="All Branches"
                  checked={branchMode === "All Branch"}
                  onChange={() => setBranchMode("All Branch")}
                />
              </RadioPanel>

              {branchMode === "One Branch" && (
                <div className="min-w-0 max-w-60 flex-1">
                  <CommonTableSelect
                    inputId="branch"
                    options={branchOptions}
                    value={branch}
                    onChange={setBranch}
                    columns={branchColumns}
                    width="100%"
                    menuWidth="250px"
                    placeholder="Select Branch"
                  />
                </div>
              )}
            </div>

            {/* CUSTOMER MODE */}

            <div className="flex min-w-0 flex-nowrap items-center gap-2 lg:col-start-3 lg:row-start-2 lg:col-span-2 ml-30">
              <RadioPanel className="h-18.75 shrink-0">

                <CustomRadio
                  name="customerMode"
                  value="One Customer"
                  label="One Customer"
                  checked={customerMode === "One Customer"}
                  onChange={() => setCustomerMode("One Customer")}
                />

                <CustomRadio
                  name="customerMode"
                  value="All Customers"
                  label="All Customers"
                  checked={customerMode === "All Customers"}
                  onChange={() => setCustomerMode("All Customers")}
                />

              </RadioPanel>

              {customerMode === "One Customer" && (
                <div className="min-w-0">
                  <CustomLinkedPairSelect
                    firstInputId="customerId"
                    secondInputId="customerName"
                    options={customerPairOptions}
                    firstValue={customerId?.value ?? null}
                    secondValue={customerName?.value ?? null}
                    firstHeader="Customer ID"
                    secondHeader="Customer Name"
                    firstWidth={120}
                    secondWidth={320}
                    gap={4}
                    headerFontSize="12px"
                    menuZIndex={99999}
                    menuPortalTarget={
                      typeof document !== "undefined" ? document.body : undefined
                    }
                    onChange={(option) => {
                      setCustomerId(
                        option
                          ? {
                              value: option.value,
                              label: option.firstLabel,
                            }
                          : null,
                      );

                      setCustomerName(
                        option
                          ? {
                              value: option.value,
                              label: option.secondLabel,
                            }
                          : null,
                      );
                    }}
                  />
                </div>
              )}
            </div>

            {/* DATE MODE */}

            <RadioPanel className="h-18.75">

              <CustomRadio
                name="dateMode"
                value="By Document Issue Date"
                label="By Document Issue Date"
                checked={dateMode === "By Document Issue Date"}
                onChange={() =>
                  setDateMode("By Document Issue Date")
                }
              />

              <CustomRadio
                name="dateMode"
                value="By Document Date"
                label="By Document Date"
                checked={dateMode === "By Document Date"}
                onChange={() =>
                  setDateMode("By Document Date")
                }
              />

            </RadioPanel>

            {/* DOCUMENT NUMBER / DATE FILTER */}

            <RadioPanel className="h-18.75">

              <CustomRadio
                name="documentFilter"
                value="By Document No."
                label="By Document No."
                checked={documentFilter === "By Document No."}
                onChange={() => setDocumentFilter("By Document No.")}
                disabled={documentMode === "All Document"}
              />

              <CustomRadio
                name="documentFilter"
                value="By Document Date"
                label="By Document Date"
                checked={documentFilter === "By Document Date"}
                onChange={() => setDocumentFilter("By Document Date")}
                disabled={documentMode === "All Document"}
              />

            </RadioPanel>

            {/* DOCUMENT NUMBER / DATE INPUTS */}

            <div className="flex min-w-0 items-center gap-1 pt-1">

              {documentFilter === "By Document No." &&
              documentMode === "One Document" ? (
                <input
                  type="text"
                  value={documentNo}
                  onChange={(e) => setDocumentNo(e.target.value)}
                  placeholder="Document No."
                  className="w-full input-style"
                />
              ) : (
                <>
                  <div className="w-27.5">
                    <AppDatePicker
                      id="fromDate"
                      label="From Date"
                      value={fromDate}
                      onChange={setFromDate}
                    />
                  </div>

                  <div className="w-27.5">
                    <AppDatePicker
                      id="toDate"
                      label="To Date"
                      value={toDate}
                      onChange={setToDate}
                    />
                  </div>
                </>
              )}

            </div>

            {/* SEARCH BUTTON */}

            <div className="flex items-start justify-end pt-1 lg:col-start-5 lg:row-start-2 absolute top-38 right-3">

              <ActionButton
                onClick={handleSearch}
                className="w-24 "
              >
                Search
              </ActionButton>

            </div>

          </div>

          {/* ==========================================
              DOCUMENT TABLE
          ========================================== */}

          <div className="mt-3 w-full overflow-hidden border border-[#B7ECD0] mt-10">

            <div className="max-h-98.75 overflow-auto">

              <table className="w-full min-w-262.5 table-fixed border-collapse">

                <thead className="sticky top-0 z-10 bg-[#EEFBF4]">

                  <tr className="h-6">

                    <th className="w-4 border-r border-b border-[#B7ECD0]" />

                    <th className="w-[3%] border-r border-b border-[#B7ECD0]" />

                    <th className="w-[4%] border-r border-b border-[#B7ECD0] px-1 text-left text-[12px] font-normal text-[#172b43]">
                      Sl.No.
                    </th>

                    <th className="w-[4.5%] border-r border-b border-[#B7ECD0] px-1 text-left text-[12px] font-normal text-[#172b43]">
                      Br. ID
                    </th>

                    <th className="w-[12%] border-r border-b border-[#B7ECD0] px-1 text-left text-[12px] font-normal text-[#172b43]">
                      Document No.
                    </th>

                    <th className="w-[9%] border-r border-b border-[#B7ECD0] px-1 text-left text-[12px] font-normal text-[#172b43]">
                      Document Date
                    </th>

                    <th className="w-[13%] border-r border-b border-[#B7ECD0] px-1 text-left text-[12px] font-normal text-[#172b43]">
                      Document Issue Time
                    </th>

                    <th className="w-[23%] border-r border-b border-[#B7ECD0] px-1 text-left text-[12px] font-normal text-[#172b43]">
                      Customer Name
                    </th>

                    <th className="w-[10.5%] border-r border-b border-[#B7ECD0] px-1 text-right text-[12px] font-normal text-[#172b43]">
                      Inv. Amt. Excl. VAT
                    </th>

                    <th className="w-[9%] border-r border-b border-[#B7ECD0] px-1 text-right text-[12px] font-normal text-[#172b43]">
                      VAT Amt.
                    </th>

                    <th className="w-[12%] border-b border-[#B7ECD0] px-1 text-right text-[12px] font-normal text-[#172b43]">
                      Inv. Amt. Incl. VAT
                    </th>

                  </tr>

                </thead>

                <tbody>

                  {rows.map((row, index) => (

                    <tr
                      key={row.id}
                      className="h-6.5 bg-white"
                    >

                      <td className="border-r border-b border-[#B7ECD0] bg-[#f5f6f8] text-center text-[10px]">
                        {index === 0 ? "▶" : ""}
                      </td>

                      <td className="border-r border-b border-[#B7ECD0] text-center">
                        <input
                          type="checkbox"
                          checked={row.selected}
                          className="accent-green-600"
                          onChange={(event) =>
                            setRows((currentRows) =>
                              currentRows.map((currentRow) =>
                                currentRow.id === row.id
                                  ? { ...currentRow, selected: event.target.checked }
                                  : currentRow,
                              ),
                            )
                          }
                          aria-label={`Select document row ${index + 1}`}
                        />
                      </td>

                      <td className="border-r border-b border-[#B7ECD0] text-center text-[12px]">
                        {row.branchId ? index + 1 : ""}
                      </td>

                      <td className="border-r border-b border-[#B7ECD0] text-[12px]">
                        {row.branchId}
                      </td>

                      <td className="border-r border-b border-[#B7ECD0] text-[12px]">
                        {row.documentNo}
                      </td>

                      <td className="border-r border-b border-[#B7ECD0] text-[12px]">
                        {row.documentDate}
                      </td>

                      <td className="border-r border-b border-[#B7ECD0] text-[12px]">
                        {row.issueTime}
                      </td>

                      <td className="border-r border-b border-[#B7ECD0] text-[12px]">
                        {row.customerName}
                      </td>

                      <td className="border-r border-b border-[#B7ECD0] text-right text-[12px]">
                        {row.invoiceAmountExclVat}
                      </td>

                      <td className="border-r border-b border-[#B7ECD0] text-right text-[12px]">
                        {row.vatAmount}
                      </td>

                      <td className="border-b border-[#B7ECD0] text-right text-[12px]">
                        {row.invoiceAmountInclVat}
                      </td>

                    </tr>

                  ))}

                </tbody>

              </table>

            </div>

            {/* TABLE FOOTER */}

            <div className="h-7.25 border-t border-[#B7ECD0] bg-[#eeeeF2]" />

          </div>

          {/* ==========================================
              BOTTOM BUTTONS
          ========================================== */}

          <div className="mt-3 flex justify-center gap-1">

            <ActionButton
              onClick={handleSubmit}
              className="w-20"
            >
              Submit
            </ActionButton>

            <ActionButton
              onClick={handleCancel}
              className="w-20"
            >
              Cancel
            </ActionButton>

            <ActionButton
              onClick={handleClose}
              className="w-20"
            >
              Close
            </ActionButton>

          </div>

        </section>

      </main>

    </div>
  );
};

export default ZATCASubmission;
