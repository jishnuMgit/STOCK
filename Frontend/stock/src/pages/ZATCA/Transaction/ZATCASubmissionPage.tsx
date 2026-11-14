
import React, { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import { toast } from "react-toastify";
import customParseFormat from "dayjs/plugin/customParseFormat";

import Header from "../../../components/common/Header";

import CommonTableSelect, {
  type TableSelectOption,
} from "../../../components/common/CommonTableSelect";

import {
  LocalizationProvider,
} from "@mui/x-date-pickers/LocalizationProvider";

import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import CustomLinkedPairSelect, {
  type PairSelectOption,
} from "../../../components/common/CustomLinkedPairSelect";

dayjs.extend(customParseFormat);

// ==================================================
// TYPES
// ==================================================

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
  // carried through to the submit call
  customerId: string;
  origDocType: string;
  docType: string;
  invRcnType: string;
  docDateIso: string;
  invDateTime: string;
};

type ApiRow = {
  fbrid: string;
  fdoctype: string;
  forigdoctype: string | null;
  fdocno: string;
  fdate: string;
  finvdatetime: string | null;
  fcustomerid: string;
  faccountname: string | null;
  fbillingamtwovat: string | number;
  fscvatamt: string | number;
  fbillingamt: string | number;
  finvrcntype: string | null;
};

// Router mount: app.use("/api/zatca-submission", zatcaSubmissionRouter)
// If your other pages use an axios instance (token header, base URL), call it
// inside http() instead of fetch.
const API = import.meta.env.VITE_API_URL + "/zatca-submission";

const http = async (path: string, init?: RequestInit): Promise<Response> =>
  fetch(`${API}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...init,
  });

const api = async <T,>(path: string, init?: RequestInit): Promise<T> => {
  const res = await http(path, init);
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

const money = (v: string | number) => Number(v || 0).toFixed(2);
const toIso = (ui: string) => dayjs(ui, DATE_FORMAT).format("YYYY-MM-DD");

// ==================================================
// CONSTANTS
// ==================================================

const DATE_FORMAT = "DD-MM-YYYY";

const TODAY = dayjs().format(DATE_FORMAT);

const documentColumns = [
  { key: "label", label: "Document Type", width: "1fr" },
  { key: "id", label: "ID", width: "65px", align: "right" as const },
];

const branchColumns = [
  { key: "label", label: "Branch", width: "1fr" },
  { key: "id", label: "ID", width: "65px", align: "right" as const },
];

const createPairOptions = (
  ids: TableSelectOption[],
  names: TableSelectOption[],
): PairSelectOption[] =>
  ids.map((item) => ({
    value: item.value,
    firstLabel: item.label,
    secondLabel: names.find((name) => name.value === item.value)?.label ?? "",
  }));

// width of the customer pair, so the Branch box lines up with it
const CUSTOMER_ID_WIDTH = 120;
const CUSTOMER_NAME_WIDTH = 320;
const PAIR_GAP = 10;
const BRANCH_WIDTH = 224; // lkpBranch: 320px reduced by 30%

// radio panels: rdgCustomer is 10% wider than rdgBranch; the Branch box is
// pushed right by the difference so both lookups still start on the same line
const RDG_BRANCH_WIDTH = 112;
const RDG_CUSTOMER_WIDTH = Math.round(RDG_BRANCH_WIDTH * 1.1); // 123
const BRANCH_OFFSET = RDG_CUSTOMER_WIDTH - RDG_BRANCH_WIDTH;

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
    customerId: "",
    origDocType: "",
    docType: "",
    invRcnType: "",
    docDateIso: "",
    invDateTime: "",
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

    <span className="text-[14px] leading-4.25 text-[#172b43]">
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
          fontSize: "14px",
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
          fontSize: "14px",
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
  disabled?: boolean;
}> = ({ children, onClick, className = "", disabled = false }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={`min-w-20 btn-style ${disabled ? "opacity-50" : ""} ${className}`}
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

  const [branch, setBranch] = useState<TableSelectOption | null>(null);

  // LOOKUPS (loaded from the API)

  const [documentOptions, setDocumentOptions] = useState<TableSelectOption[]>([]);
  const [branchOptions, setBranchOptions] = useState<TableSelectOption[]>([]);
  const [customerIdOptions, setCustomerIdOptions] = useState<TableSelectOption[]>([]);
  const [customerNameOptions, setCustomerNameOptions] = useState<TableSelectOption[]>([]);

  // STATUS

  const [busy, setBusy] = useState(false);

  // CUSTOMER

  const [customerMode, setCustomerMode] = useState("All Customers");

  const [customerId, setCustomerId] =
    useState<TableSelectOption | null>(null);

  const [customerName, setCustomerName] =
    useState<TableSelectOption | null>(null);

  const customerPairOptionsById = useMemo(
    () =>
      createPairOptions(customerIdOptions, customerNameOptions).sort((a, b) =>
        a.firstLabel.localeCompare(b.firstLabel, undefined, {
          numeric: true,
          sensitivity: "base",
        }),
      ),
    [customerIdOptions, customerNameOptions],
  );
  const customerPairOptionsByName = useMemo(
    () =>
      [...customerPairOptionsById].sort((a, b) =>
        a.secondLabel.localeCompare(b.secondLabel, undefined, {
          numeric: true,
          sensitivity: "base",
        }),
      ),
    [customerPairOptionsById],
  );

  // DATE FILTER

  const [dateMode, setDateMode] =
    useState("By Document Issue Date");

  const [fromDate, setFromDate] = useState(TODAY);

  const [toDate, setToDate] = useState(TODAY);

  // DOCUMENT NUMBER

  const [documentNo, setDocumentNo] = useState("");

  // TABLE

  const [rows, setRows] = useState<DocumentRow[]>(createRows);

  // ==================================================
  // LOAD LOOKUPS
  // ==================================================

  useEffect(() => {
    Promise.all([
      api<{ data: { fbrname: string; fbrid: string }[] }>("/getBranchList"),
      api<{ data: { fcsaccountid: string; fcsaccountname: string }[] }>("/getCustomerList"),
      api<{ data: { fpid: string; fpname: string }[] }>("/getDocumentTypeList"),
      api<{ data: { fcsaccountid: string; fcsaccountname: string }[] }>("/getCustomerNameList"),
    ])
      .then(([branches, customers, documentTypes, customersByName]) => {
        setBranchOptions(
          (branches.data ?? []).map((b) => ({ value: b.fbrid, label: b.fbrname, id: b.fbrid })),
        );
        setCustomerIdOptions(
          (customers.data ?? []).map((c) => ({
            value: c.fcsaccountid,
            label: c.fcsaccountid,
            id: c.fcsaccountname,
          })),
        );
        setCustomerNameOptions(
          (customersByName.data ?? []).map((c) => ({
            value: c.fcsaccountid,
            label: c.fcsaccountname,
            id: c.fcsaccountid,
          })),
        );
        setDocumentOptions(
          (documentTypes.data ?? []).map((d) => ({ value: d.fpid, label: d.fpname, id: d.fpid })),
        );
      })
      .catch((e: Error) => toast.error(e.message));
  }, []);

  // ==================================================
  // SEARCH
  // ==================================================

  const handleSearch = async () => {

    // same rules as ValidateMe
    if (documentMode === "One Document" && !documentType) {
      return toast.error("Please input 'Document'");
    }
    if (
      documentMode === "One Document" &&
      (documentType?.value === "DN" || documentType?.value === "CN") &&
      branchMode !== "One Branch"
    ) {
      return toast.error("Please select a 'Branch'");
    }
    if (branchMode === "One Branch" && !branch) {
      return toast.error("Please select a 'Branch'");
    }
    if (customerMode === "One Customer" && !customerId) {
      return toast.error("Please select 'Customer ID'");
    }

    const byNo =
      documentFilter === "By Document No." && documentMode === "One Document";

    if (byNo && !documentNo.trim()) {
      return toast.error("Please input 'From Invoice No.'");
    }

    setBusy(true);
    try {
      const { data } = await api<{ data: ApiRow[] }>("/searchZATCASubmission", {
        method: "POST",
        body: JSON.stringify({
          docMode: documentMode === "One Document" ? "one" : "all",
          docType: documentMode === "One Document" ? documentType?.value : null,
          branchId: branchMode === "One Branch" ? branch?.value : null,
          customerId: customerMode === "One Customer" ? customerId?.value : null,
          filterBy: byNo ? "no" : "date",
          fromDocNo: byNo ? documentNo.trim() : null,
          toDocNo: byNo ? documentNo.trim() : null,
          dateBasis: dateMode === "By Document Issue Date" ? "issue" : "document",
          fromDate: byNo ? null : toIso(fromDate),
          toDate: byNo ? null : toIso(toDate),
        }),
      });

      const mapped: DocumentRow[] = data.map((r, i) => ({
        id: i + 1,
        selected: true, // the VB grid pre-ticks Select
        branchId: r.fbrid,
        documentType: r.fdoctype,
        documentNo: r.fdocno,
        documentDate: r.fdate ? dayjs(r.fdate).format(DATE_FORMAT) : "",
        issueTime: r.finvdatetime ?? "",
        customerName: r.faccountname ?? "",
        invoiceAmountExclVat: money(r.fbillingamtwovat),
        vatAmount: money(r.fscvatamt),
        invoiceAmountInclVat: money(r.fbillingamt),
        customerId: r.fcustomerid,
        origDocType: r.forigdoctype ?? "",
        docType: r.fdoctype,
        invRcnType: r.finvrcntype ?? "",
        docDateIso: r.fdate,
        invDateTime: r.finvdatetime ?? "",
      }));

      // keep the empty filler rows so the grid height stays stable
      const filler = createRows().slice(mapped.length);
      setRows([...mapped, ...filler.map((f, i) => ({ ...f, id: mapped.length + i + 1 }))]);

      if (!mapped.length) toast.info("No documents found");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  // ==================================================
  // SUBMIT
  // ==================================================

  const handleSubmit = async () => {
    const selected = rows.filter((r) => r.selected && r.documentNo.trim() !== "");
    if (!selected.length) {
      return toast.error("Please select at least one document");
    }

    setBusy(true);
    try {
      const { message, data } = await api<{
        message: string;
        data: { rejected: number; results: { docNo: string; status: string; message?: string }[] };
      }>("/submitZATCASubmission", {
        method: "POST",
        body: JSON.stringify({
          documents: selected.map((r) => ({
            brId: r.branchId,
            docType: r.docType,
            origDocType: r.origDocType,
            docNo: r.documentNo,
            invRcnType: r.invRcnType,
            customerId: r.customerId,
            docDate: r.docDateIso,
            invDateTime: r.invDateTime,
          })),
        }),
      });

      const failed = data.results
        .filter((x) => x.status === "REJECTED" || x.status === "ERROR")
        .map((x) => `${x.docNo}: ${x.message ?? x.status}`);

      if (data.rejected > 0) {
        toast.error(message);
        failed.forEach((f) => toast.error(f));
      } else {
        toast.success(message);
      }
      // ClearMe() after submit, as the VB form does
      setRows(createRows());
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  // ==================================================
  // CANCEL
  // ==================================================

  const handleClear = () => {
    setDocumentMode("One Document");
    setDocumentType(null);
    setDocumentFilter("By Document Date");
    setDocumentNo("");

    setBranchMode("All Branch");
    setBranch(null);

    setCustomerMode("All Customers");
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

  // const handleClose = () => {
  //   window.history.back();
  // };

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

          <div className="grid grid-cols-1 gap-x-2 gap-y-2 lg:grid-cols-[165px_minmax(180px,1fr)_130px_minmax(330px,2fr)_176px]">

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

            <div className="flex min-w-0 flex-nowrap items-center gap-2 lg:col-start-3 lg:row-start-1 lg:col-span-2 ml-30">
              <RadioPanel className="h-18.75 w-[132px] shrink-0">
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
                <div className="min-w-0" style={{ width: BRANCH_WIDTH, marginLeft: BRANCH_OFFSET }}>
                  <CommonTableSelect
                    inputId="lkpBranch"
                    options={branchOptions}
                    value={branch}
                    onChange={setBranch}
                    columns={branchColumns}
                    width="100%"
                    menuWidth={`300px`}
                    placeholder="Select Branch"
                  />
                </div>
              )}
            </div>

            {/* CUSTOMER MODE */}

            <div className="flex min-w-0 flex-nowrap items-center gap-2 lg:col-start-3 lg:row-start-2 lg:col-span-2 ml-30">
              <RadioPanel className="h-18.75 w-[133px] shrink-0">

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
                    firstInputId="lkpcustomerId"
                    secondInputId="lkpcustomerName"
                    options={customerPairOptionsById}
                    secondOptions={customerPairOptionsByName}
                    firstValue={customerId?.value ?? null}
                    secondValue={customerName?.value ?? null}
                    firstHeader="Customer ID"
                    secondHeader="Customer Name"
                    firstWidth={CUSTOMER_ID_WIDTH}
                    secondWidth={CUSTOMER_NAME_WIDTH}
                    gap={PAIR_GAP}
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

            <RadioPanel className="h-18.75 -ml-10">

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
                  <div className="w-[140px]">
                    <AppDatePicker
                      id="fromDate"
                      label="From Date"
                      value={fromDate}
                      onChange={setFromDate}
                    />
                  </div>

                  <div className="w-[140px]">
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
                disabled={busy}
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
                      Line
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
              disabled={busy}
              className="w-20"
            >
              Submit
            </ActionButton>

            <ActionButton
              onClick={handleClear}
              className="w-20"
            >
              Clear
            </ActionButton>

        

          </div>

        </section>

      </main>

    </div>
  );
};

export default ZATCASubmission;
