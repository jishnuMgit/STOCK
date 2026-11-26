import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  LocalizationProvider,
} from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";

import Header from "../../../components/common/Header";
import { useMessageModal } from "../../../hooks/useMessageModal";
import { useCtrlShortcuts } from "../../../hooks/useCtrlShortcuts";
import { useAltShortcuts } from "../../../hooks/useAltShortcuts";
import { useEnterAsTab } from "../../../hooks/useEnterAsTab";
import "../../../components/Transaction/Receipt/save/commanReceipt.css";
import ActionButton from "../../../components/common/ActionButton";
import TransactionActions from "../../../components/common/TransactionActions";
import CommonTableSelect, {
  type TableSelectOption,
} from "../../../components/common/CommonTableSelect";
import CustomLinkedPairSelect, {
  type PairSelectOption,
} from "../../../components/common/CustomLinkedPairSelect";

dayjs.extend(customParseFormat);

const DATE_FORMAT = "DD-MM-YYYY";
const API_DATE_FORMAT = "DD/MM/YYYY";
const TODAY = dayjs().format(DATE_FORMAT);

const documentColumns = [
  { key: "label", label: "Document Type", width: "1fr" },
  { key: "id", label: "ID", width: "65px", align: "right" as const },
];

const branchColumns = [
  { key: "label", label: "Branch", width: "1fr" },
  { key: "id", label: "ID", width: "65px", align: "right" as const },
];

// Router mount: app.use("/api/zatca-pdfa3-pending", zatcaPdfA3PendingRouter)
const API = import.meta.env.VITE_API_URL + "/zatca-pdfa3-pending";

const api = async <T,>(path: string, init?: RequestInit): Promise<T> => {
  const res = await fetch(`${API}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  const type = res.headers.get("content-type") ?? "";
  if (!type.includes("application/json")) {
    throw new Error(`Unexpected response from ${API}${path} (${res.status}): route not reachable`);
  }
  const json = await res.json();
  if (!res.ok || json.success === false) {
    throw new Error(json.message || `Request failed (${res.status})`);
  }
  return json as T;
};

type Row = {
  slNo: number;
  branchId: string;
  docType: string;
  docNo: string;
  docDate: string;
  issueTime: string;
  customerName: string;
  amountExVat: number;
  vatAmount: number;
  amountInVat: number;
};

type LookupResult = {
  branches: { brId: string; brName: string }[];
  customers: { customerId: string; customerName: string }[];
  customersByName: { customerId: string; customerName: string }[];
  docTypes: { pId: string; pName: string }[];
};

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
    className={`flex items-center gap-1.25 whitespace-nowrap select-none ${disabled ? "cursor-not-allowed opacity-40" : "cursor-pointer"
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
      className={`flex h-4.75 w-4.75 shrink-0 items-center justify-center rounded-full border ${checked ? "border-[#4ade80]" : "border-[#c3cbd3]"
        } bg-white`}
    >
      {checked && (
        <span className="h-2.25 w-2.25 rounded-full bg-[#4ade80]" />
      )}
    </span>

    <span className="text-[14px] leading-4.25 text-[#172b43]">
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
      value={value ? dayjs(value, DATE_FORMAT, true) : null}
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
          fontSize: "14px",
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
          fontSize: "14px",
          color: "#344054",
        },
        "& .MuiPickersInputBase-input": {
          minWidth: 0,
          width: "100%",
          fontSize: "14px",
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

const columns = [
  { key: "slNo", label: "Line", width: "38px" },
  { key: "branchId", label: "Br. ID", width: "50px" },
  { key: "docType", label: "Doc. Type", width: "68px" },
  { key: "docNo", label: "Doc. No.", width: "100px" },
  { key: "docDate", label: "Doc. Date", width: "98px" },
  { key: "issueTime", label: "Document Issue Time", width: "140px" },
  { key: "customerName", label: "Customer Name", width: "255px" },
  { key: "amountExVat", label: "Inv. Amt. Excl. VAT", width: "118px", right: true },
  { key: "vatAmount", label: "VAT Amt.", width: "98px", right: true },
  { key: "amountInVat", label: "Inv. Amt. Incl. VAT", width: "125px", right: true },
] as const;

const MIN_ROWS = 14; // the old grid always showed empty lines

const money = (n: number): string =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const RptZatcaPdfA3Generation: React.FC = () => {
  // the messages (warnings, errors, exported ...) are the common message window, as on the Payment screen - not a toast
  const { notify, dialog: messageDialog } = useMessageModal("ZATCA PDF/A3 Generation");
  const [documentMode, setDocumentMode] = useState("All Document");
  const [branchMode, setBranchMode] = useState("All Branch");
  const [customerMode, setCustomerMode] = useState("All Customer");

  const [invoiceMode, setInvoiceMode] = useState("By Invoice Date");
  const [documentType, setDocumentType] =
    useState<TableSelectOption | null>(null);
  const [branch, setBranch] = useState<TableSelectOption | null>(null);
  const [customer, setCustomer] = useState<PairSelectOption | null>(null);
  const [fromInvoiceNo, setFromInvoiceNo] = useState("");
  const [toInvoiceNo, setToInvoiceNo] = useState("");

  const [fromDate, setFromDate] = useState(TODAY);
  const [toDate, setToDate] = useState(TODAY);

  const [branchOptions, setBranchOptions] = useState<TableSelectOption[]>([]);
  const [documentOptions, setDocumentOptions] = useState<TableSelectOption[]>([]);
  const [customerIdList, setCustomerIdList] = useState<PairSelectOption[]>([]);
  const [customerNameList, setCustomerNameList] = useState<PairSelectOption[]>([]);

  // Customer ID box: in ID order (dbo.filllookupcustomerid); Customer Name box: in name order
  // (dbo.filllookupcustomername), the same as the ZATCA Submission page
  const customerOptionsById = useMemo(
    () =>
      [...customerIdList].sort((a, b) =>
        a.firstLabel.localeCompare(b.firstLabel, undefined, { numeric: true, sensitivity: "base" }),
      ),
    [customerIdList],
  );

  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);

  // the row the cursor is on in the grid (it follows a click and the arrow keys)
  const [currentRow, setCurrentRow] = useState(0);
  const gridRef = useRef<HTMLDivElement | null>(null);

  // Enter moves to the next field like the Tab key (the same on every screen)
  const enterAsTab = useEnterAsTab();

  // the same rules as the VB form (rdgDocument / rdgBranch / rdgIDorDate / rdgCustomer):
  // All Document = all branches, by date, all customers; All Branch = by date;
  // By Invoice No. = all customers
  const oneDocument = documentMode === "One Document";
  const oneBranch = oneDocument && branchMode === "One Branch";
  const byInvoiceNo = oneBranch && invoiceMode === "By Invoice No.";
  const oneCustomer = oneDocument && !byInvoiceNo && customerMode === "One Customer";

  useEffect(() => {
    api<LookupResult>("/getLookups")
      .then((d) => {
        setBranchOptions(
          (d.branches ?? []).map((b) => ({ value: b.brId, label: b.brName, id: b.brId })),
        );
        setDocumentOptions(
          (d.docTypes ?? []).map((t) => ({ value: t.pId, label: t.pName, id: t.pId })),
        );
        const pair = (c: { customerId: string; customerName: string }): PairSelectOption => ({
          value: c.customerId,
          firstLabel: c.customerId,
          secondLabel: c.customerName,
        });
        setCustomerIdList((d.customers ?? []).map(pair));
        setCustomerNameList((d.customersByName ?? []).map(pair));
      })
      .catch((e: Error) => notify.error(e.message));
  }, []);

  // the body of Search and Export; the server checks again (ValidateMe)
  const buildBody = (): Record<string, unknown> | null => {
    if (oneDocument && !documentType) {
      notify.error("Please input 'Document'");
      return null;
    }
    if (oneBranch && !branch) {
      notify.error("Please select a 'Branch'");
      return null;
    }

    if (byInvoiceNo) {
      if (!fromInvoiceNo.trim()) {
        notify.error("Please input 'From Invoice No.'");
        return null;
      }
    } else {
      if (!fromDate) {
        notify.error("Please select 'Invoice From Date'");
        return null;
      }
      if (!toDate) {
        notify.error("Please select 'Invoice To Date'");
        return null;
      }
      const parsedFromDate = dayjs(fromDate, DATE_FORMAT, true);
      const parsedToDate = dayjs(toDate, DATE_FORMAT, true);
      if (!parsedFromDate.isValid()) {
        notify.error("Invalid 'Invoice From Date'");
        return null;
      }
      if (!parsedToDate.isValid()) {
        notify.error("Invalid 'Invoice To Date'");
        return null;
      }
      if (parsedFromDate.isAfter(parsedToDate)) {
        notify.error("'To Date' should be greater than or equal to 'From Date'");
        return null;
      }
      if (parsedFromDate.year() !== parsedToDate.year()) {
        notify.error("'From Date' & 'To Date' should be in same year");
        return null;
      }
      if (oneCustomer && !customer) {
        notify.error("Please select 'Customer ID'");
        return null;
      }
    }

    return {
      documentMode: oneDocument ? "one" : "all",
      invType: oneDocument ? documentType?.value : null,
      branchMode: oneBranch ? "one" : "all",
      branchId: oneBranch ? branch?.value : null,
      invoiceMode: byInvoiceNo ? "id" : "date",
      fromInvoiceNo: fromInvoiceNo.trim(),
      toInvoiceNo: toInvoiceNo.trim(),
      fromDate: byInvoiceNo
        ? ""
        : dayjs(fromDate, DATE_FORMAT, true).format(API_DATE_FORMAT),
      toDate: byInvoiceNo
        ? ""
        : dayjs(toDate, DATE_FORMAT, true).format(API_DATE_FORMAT),
      customerMode: oneCustomer ? "one" : "all",
      customerId: oneCustomer ? customer?.value : null,
    };
  };

  // Search = the old Refresh button
  const handleSearch = async () => {
    if (busy) return;
    const body = buildBody();
    if (!body) return;

    setBusy(true);
    try {
      const { data } = await api<{ data: { rows: Row[] } }>("/getZATCAPDFA3Pending", {
        method: "POST",
        body: JSON.stringify(body),
      });
      setRows(data.rows);
      setCurrentRow(0);
      if (data.rows.length === 0) notify.info("No documents found");
    } catch (e) {
      setRows([]);
      notify.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleExport = async () => {
    if (busy) return;
    if (rows.length === 0) {
      notify.error("No documents to export");
      return;
    }
    const body = buildBody();
    if (!body) return;

    setBusy(true);
    try {
      const { data } = await api<{
        data: {
          total: number;
          exported: number;
          failed: number;
          results: { docNo: string; ok: boolean; message: string }[];
        };
      }>("/exportZATCAPDFA3", { method: "POST", body: JSON.stringify(body) });

      if (data.failed === 0) {
        notify.success(`ZATCA PDF/A3 exported: ${data.exported} document(s)`);
        setRows([]);
        return;
      }

      // keep the list; say which documents failed and why
      const bad = data.results.filter((r) => !r.ok);
      const shown = bad
        .slice(0, 3)
        .map((r) => `${r.docNo}: ${r.message}`)
        .join(" | ");
      notify.error(
        `${data.exported} exported, ${data.failed} failed. ${shown}${bad.length > 3 ? " ..." : ""}`,
      );
    } catch (e) {
      notify.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleCancel = () => {
    setDocumentMode("All Document");
    setBranchMode("All Branch");
    setCustomerMode("All Customer");
    setInvoiceMode("By Invoice Date");
    setDocumentType(null);
    setBranch(null);
    setCustomer(null);
    setFromInvoiceNo("");
    setToInvoiceNo("");
    setFromDate(TODAY);
    setToDate(TODAY);
    setRows([]);
    setCurrentRow(0);
  };

  // The keys: Ctrl+F Search, Ctrl+S Export (they stop the browser's own "find" and "save page"), and the underlined
  // letters of the buttons: Alt+S Search, Alt+E Export
  useCtrlShortcuts({
    f: () => {
      if (!busy) void handleSearch();
    },
    s: () => {
      if (!busy) void handleExport();
    },
  });
  useAltShortcuts({
    s: () => {
      if (!busy) void handleSearch();
    },
    e: () => {
      if (!busy) void handleExport();
    },
  });

  const emptyCount = Math.max(0, MIN_ROWS - rows.length);

  return (
    <div className="min-h-full w-full bg-gray-100 px-3 pb-5">
      {messageDialog}
      <main className="mx-auto mt-5 w-full max-w-290 overflow-hidden border border-gray-400 bg-white">

        {/* Window Header */}
        <Header Name="ZATCA PDF/A3 Generation" />

        <section className="relative flex min-h-[650px] flex-col gap-3 px-3.5 pb-3 pt-3.5 sm:px-3.5" onKeyDown={enterAsTab}>

          {/* Filter Section */}
          <div className="grid grid-cols-1 gap-x-3 gap-y-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">

            {/* Document Selection */}
            <div className="flex items-start gap-2">
              <RadioPanel className="w-41.25 min-h-18.75 shrink-0">
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

              {oneDocument && (
                <div className="w-55 min-w-0 pt-2.5">
                  <CommonTableSelect
                    inputId="zatca-document-type"
                    options={documentOptions}
                    value={documentType}
                    onChange={setDocumentType}
                    columns={documentColumns}
                    width="220px"
                    menuWidth="285px"
                    listLook="receipt"
                    placeholder=""
                    menuPortalTarget={
                      typeof document !== "undefined" ? document.body : undefined
                    }
                  />
                </div>
              )}
            </div>

            {/* Branch Selection */}
            <div className="flex items-start sm:justify-start">
              <RadioPanel className="w-41.25 min-h-18.75">
                <CustomRadio
                  name="rdgBranch"
                  value="One Branch"
                  label="One Branch"
                  checked={oneBranch}
                  disabled={!oneDocument}
                  onChange={() => setBranchMode("One Branch")}
                />

                <CustomRadio
                  name="rdgBranch"
                  value="All Branch"
                  label="All Branches"
                  checked={!oneBranch}
                  disabled={!oneDocument}
                  onChange={() => setBranchMode("All Branch")}
                />
              </RadioPanel>

              {oneBranch && (
                <div className="w-55 min-w-0 pt-2.5 ml-3">
                  <CommonTableSelect
                    inputId="zatca-branch"
                    options={branchOptions}
                    value={branch}
                    onChange={setBranch}
                    columns={branchColumns}
                    width="220px"
                    menuWidth="285px"
                    listLook="receipt"
                    placeholder=""
                    menuPortalTarget={
                      typeof document !== "undefined" ? document.body : undefined
                    }
                  />
                </div>
              )}
            </div>

            {/* Invoice Filter */}
            <div className="flex justify-start sm:justify-end">
              <RadioPanel className="w-41.25 min-h-18.75">
                <CustomRadio
                  name="rdgInvoice"
                  value="By Invoice No."
                  label="By Invoice No."
                  checked={byInvoiceNo}
                  disabled={!oneBranch}
                  onChange={() => setInvoiceMode("By Invoice No.")}
                />

                <CustomRadio
                  name="rdgInvoice"
                  value="By Invoice Date"
                  label="By Invoice Date"
                  checked={!byInvoiceNo}
                  disabled={!oneBranch}
                  onChange={() => setInvoiceMode("By Invoice Date")}
                />
              </RadioPanel>
            </div>

            {/* Invoice Criteria */}
            <div className="flex flex-wrap items-center gap-2">
              {byInvoiceNo ? (
                <div className="flex flex-wrap items-center gap-1.25">
                  <input
                    id="zatca-from-invoice-number"
                    type="text"
                    value={fromInvoiceNo}
                    onChange={(event) => {
                      setFromInvoiceNo(event.target.value);
                      setToInvoiceNo(event.target.value); // To follows From (VB Leave event)
                    }}
                    placeholder="From Invoice No."
                    aria-label="From invoice number"
                    className="h-7.5 w-27.5 rounded-[3px] border border-[#B7C7D7] bg-white px-2 text-[12px] text-[#172b43] outline-none"
                  />
                  <input
                    id="zatca-to-invoice-number"
                    type="text"
                    value={toInvoiceNo}
                    onChange={(event) => setToInvoiceNo(event.target.value)}
                    placeholder="To Invoice No."
                    aria-label="To invoice number"
                    className="h-7.5 w-27.5 rounded-[3px] border border-[#B7C7D7] bg-white px-2 text-[12px] text-[#172b43] outline-none"
                  />
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-1.25">
                  <div className="w-35">
                    <AppDatePicker
                      id="dtpFromDate"
                      label="Invoice start date"
                      value={fromDate}
                      onChange={setFromDate}
                    />
                  </div>

                  <div className="w-35">
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

            {/* Customer Selection (and Search at its right end) */}
            <div className="flex items-start sm:col-span-2">
              <RadioPanel className="w-41.25 min-h-18.75">
                <CustomRadio
                  name="rdgCustomer"
                  value="One Customer"
                  label="One Customer"
                  checked={oneCustomer}
                  disabled={!oneDocument || byInvoiceNo}
                  onChange={() => setCustomerMode("One Customer")}
                />

                <CustomRadio
                  name="rdgCustomer"
                  value="All Customer"
                  label="All Customers"
                  checked={!oneCustomer}
                  disabled={!oneDocument || byInvoiceNo}
                  onChange={() => setCustomerMode("All Customer")}
                />
              </RadioPanel>

              {oneCustomer && (
                <div className="min-w-0 pt-2.5 ml-3">
                  <CustomLinkedPairSelect
                    options={customerOptionsById}
                    secondOptions={customerNameList}
                    firstValue={customer?.value ?? null}
                    secondValue={customer?.value ?? null}
                    onChange={setCustomer}
                    firstHeader="Customer ID"
                    secondHeader="Customer Name"
                    firstWidth={120}
                    secondWidth={240}
                    gap={5}
                    listLook="receipt"
                    nameDividerAtBoxEnd
                    firstInputId="lkpcustomerId"
                    secondInputId="lkpcustomerName"
                    menuZIndex={99999}
                    placeholder=""
                    menuPortalTarget={
                      typeof document !== "undefined" ? document.body : undefined
                    }
                  />
                </div>
              )}

              {/* Search - at the right end of the customer row, so the Customer pair has room */}
              <div className="ml-auto flex items-center self-center pl-3">
                <ActionButton
                  id="btnSearch"
                  label="Search"
                  underlineIndex={0}
                  onClick={handleSearch}
                  disabled={busy}
                  onKeyDown={(event) => {
                    // the arrow keys go down to the buttons at the bottom, as Payment moves between its buttons
                    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
                      event.preventDefault();
                      event.stopPropagation();
                      document.getElementById("btnExport")?.focus();
                    } else if (event.key === "Enter") {
                      event.preventDefault();
                      event.stopPropagation();
                      event.currentTarget.click();
                    }
                  }}
                />
              </div>
            </div>

          </div>

          {/* Document Grid - the grid of the Payment screen: the shared .receipt-table classes
              (components/Transaction/Receipt/save/commanReceipt.css), 28 px header and rows, a full #b7ecd0 box on every cell.
              The side margin is the 12 px of the Payment screen. */}
          <div className="receipt-table-wrapper min-h-0 flex-1">

            {/* the cursor enters the grid with Tab / Enter; the arrow keys move it from row to row */}
            <div
              ref={gridRef}
              tabIndex={0}
              className="h-full max-h-125 w-full overflow-auto outline-none"
              onKeyDown={(event) => {
                if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
                event.preventDefault();
                event.stopPropagation();
                const next = Math.min(Math.max(currentRow + (event.key === "ArrowDown" ? 1 : -1), 0), rows.length - 1);
                setCurrentRow(next);
                gridRef.current?.querySelector<HTMLElement>(`[data-row="${next}"]`)?.scrollIntoView({ block: "nearest" });
              }}
            >
              <table className="receipt-table min-w-245">

                <colgroup>
                  {columns.map((column) => (
                    <col key={column.key} style={{ width: column.key === "customerName" ? "auto" : column.width }} />
                  ))}
                </colgroup>

                {/* Table Header */}
                <thead>
                  <tr>
                    {columns.map((column) => (
                      <th key={column.key} className={"right" in column ? "text-right" : ""}>
                        {column.label}
                      </th>
                    ))}
                  </tr>
                </thead>

                {/* Table Body */}
                <tbody>
                  {rows.map((row, index) => (
                    <tr
                      key={`${row.branchId}-${row.docType}-${row.docNo}`}
                      data-row={index}
                      className={index === currentRow ? "receipt-row-selected" : ""}
                      onClick={() => {
                        setCurrentRow(index);
                        gridRef.current?.focus();
                      }}
                    >
                      {columns.map((column) => {
                        const v = row[column.key];
                        return (
                          <td
                            key={column.key}
                            className={
                              column.key === "slNo"
                                ? "serial-cell"
                                : `px-1.5 truncate ${"right" in column ? "text-right" : ""}`
                            }
                          >
                            {typeof v === "number" && "right" in column ? money(v) : v}
                          </td>
                        );
                      })}
                    </tr>
                  ))}

                  {Array.from({ length: emptyCount }, (_, i) => (
                    <tr key={`empty-${i}`}>
                      {columns.map((column) => (
                        <td key={column.key} />
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bottom Buttons */}
          <div className="-mb-1">
            <TransactionActions
              className="flex flex-wrap items-center justify-center gap-1 pb-1 pt-1"
              actions={[
                { id: "btnExport", label: "Export PDF/A3", underlineIndex: 0, onClick: handleExport, disabled: busy || rows.length === 0 },
                { id: "btnClear", label: "Clear", onClick: handleCancel },
              ]}
            />
          </div>

        </section>
      </main>
    </div>
  );
};

export default RptZatcaPdfA3Generation;
