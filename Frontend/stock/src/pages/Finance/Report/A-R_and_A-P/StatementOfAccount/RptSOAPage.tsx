import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  buildHtml,
  printSoaReport,
  type PrintReport,
} from "./PrintSOAReport";
import { previewPrintedLine } from "../../../../../components/common/printHtml";
import { buildSoaPdf } from "./downloadSoaPdf";
import { saveFile } from "./saveFile";
import Header from "../../../../../components/common/Header";
import type { PairSelectOption } from "../../../../../components/common/CustomLinkedPairSelect";
import { CustomRadio, RadioPanel } from "../../../../../components/common/ReportFormParts";
import {
  BranchFilter,
  FilterRow,
  LabelSelectFilter,
  PairFilter,
  PeriodFilter,
  PostStatusFilter,
  ReportForm,
  ReportPrintRow,
} from "../../../../../components/common/ReportFilters";
import { useMessageModal } from "../../../../../hooks/useMessageModal";

// Statement Of Account - laid out with the common template of the report forms (components/common/ReportFilters.tsx), like
// every other report page. The Print Preview, the lookups and the criteria sent to the server are as they were.

dayjs.extend(customParseFormat);

type Option = {
  value: string;
  label: string;
};

const API = `${import.meta.env.VITE_API_URL}/RptSOA`;

// Sends the login cookie, and the company / user kept at sign-in as a stopgap
// (the server uses its session first and only falls back to these).
const apiFetch = (url: string, init: RequestInit = {}) => {
  const coId = localStorage.getItem("PstrCoID") ?? "";
  const userId = localStorage.getItem("PstrUserID") ?? "";
  const sep = url.includes("?") ? "&" : "?";

  return fetch(
    `${url}${sep}coId=${encodeURIComponent(coId)}&userId=${encodeURIComponent(userId)}`,
    { credentials: "include", ...init },
  );
};

// STATIC OPTIONS
const ageingOptions: Option[] = [
  { value: "WITHOUT", label: "Without Ageing" },
  { value: "WITH", label: "With Ageing" },
];
// values must match tblageingperiod.fageingmode / sp_rptsoa ('Days' | 'Months')
const ageingModeOptions: Option[] = [
  { value: "Days", label: "Days" },
  { value: "Months", label: "Months" },
];
const postStatusOptions: Option[] = [
  { value: "ALL", label: "All" },
  { value: "POSTED", label: "Posted" },
  { value: "UNPOSTED", label: "Not Posted" },
];
const printZeroOptions: Option[] = [
  { value: "YES", label: "Yes" },
  { value: "NO", label: "No" },
];

const DATE_FORMAT = "DD-MM-YYYY";

// ============================================================
// COMPONENT
// ============================================================
type RptSOAPageProps = {
  onClose?: () => void;
};

const RptSOAPage: React.FC<RptSOAPageProps> = () => {
  const { notify, dialog: messageDialog } = useMessageModal();
  // radios
  const [branchMode, setBranchMode] = useState<"One Branch" | "All Branches">("One Branch");
  const [reportType, setReportType] = useState<"Customer" | "Supplier">("Customer");
  const [customerMode, setCustomerMode] = useState<
    "One Customer" | "Range Customer" | "All Customers"
  >("One Customer");
  const [divisionMode, setDivisionMode] = useState<"One Division" | "All Division">("All Division");
  const [status, setStatus] = useState<"All" | "Outstanding">("All");

  // lookups
  const [branchOptions, setBranchOptions] = useState<Option[]>([]);
  const [accountIdOptions, setAccountIdOptions] = useState<Option[]>([]);
  const [accountNameOptions, setAccountNameOptions] = useState<Option[]>([]);
  const [divisionIdOptions, setDivisionIdOptions] = useState<Option[]>([]);
  const [divisionNameOptions, setDivisionNameOptions] = useState<Option[]>([]);

  // selections
  const [branch, setBranch] = useState<Option | null>(null);
  const [customerId, setCustomerId] = useState<Option | null>(null); // one account / range FROM
  const [rangeCustomerId, setRangeCustomerId] = useState<Option | null>(null); // range TO
  const [divisionId, setDivisionId] = useState<Option | null>(null);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [ageing, setAgeing] = useState<Option | null>(ageingOptions[0]);
  const [ageingMode, setAgeingMode] = useState<Option | null>(ageingModeOptions[0]);
  const [postStatus, setPostStatus] = useState<Option | null>(postStatusOptions[0]);
  const [printZeroBalance, setPrintZeroBalance] = useState<Option | null>(printZeroOptions[0]);

  const [printing, setPrinting] = useState(false);

  // rdgReportFile (inside the Print Preview): what Download saves
  const [reportFile, setReportFile] = useState("Excel"); // "Excel" | "PDF"

  // print preview: shown after Print. Print there sends it to the printer,
  // Download saves the "File Format" choice
  const [preview, setPreview] = useState<{
    report: PrintReport;
    fileBase: string;
    payload: Record<string, unknown>;
  } | null>(null);

  const csLabel = reportType === "Supplier" ? "Supplier" : "Customer";
  const hasDivision = customerMode === "One Customer" && divisionIdOptions.length > 0;

  // the account boxes (Customer / Supplier) and the division boxes: one list, "ID | Name" in the ID box and "Name | ID" in the
  // Name box
  const accountPairOptions = useMemo<PairSelectOption[]>(() => {
    const nameById = new Map(accountNameOptions.map((o) => [o.value, o.label]));
    return accountIdOptions.map((o) => ({
      value: o.value,
      firstLabel: o.label,
      secondLabel: nameById.get(o.value) ?? "",
    }));
  }, [accountIdOptions, accountNameOptions]);

  const divisionPairOptions = useMemo<PairSelectOption[]>(() => {
    const nameById = new Map(divisionNameOptions.map((o) => [o.value, o.label]));
    return divisionIdOptions.map((o) => ({
      value: o.value,
      firstLabel: o.label,
      secondLabel: nameById.get(o.value) ?? "",
    }));
  }, [divisionIdOptions, divisionNameOptions]);

  // the account radios: the page keeps "One Customer" / "Range Customer" / "All Customers" (what the server takes), the
  // common row says "One Customer" / "Range Customer" / "All Customer" (or Supplier)
  const accountRowMode =
    customerMode === "One Customer"
      ? `One ${csLabel}`
      : customerMode === "Range Customer"
        ? `Range ${csLabel}`
        : `All ${csLabel}`;

  const handleAccountMode = (mode: string) =>
    changeCustomerMode(
      mode.startsWith("One") ? "One Customer" : mode.startsWith("Range") ? "Range Customer" : "All Customers",
    );

  // ------------------------------------------------------------
  // LOAD THE LOOKUPS (VB FillCombos)
  // ------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const b = await apiFetch(`${API}/branches`).then((r) => r.json());
        if (cancelled) return;

        if (!b.success) {
          notify.error(b.message || "Could not load the branches");
          return;
        }
        setBranchOptions(b.branches);
        setBranch(b.branches[0] ?? null);
      } catch {
        if (!cancelled) notify.error("Could not load the branches");
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Customer -> customer lookups, Supplier -> supplier lookups
  // (reloaded every time the Customer / Supplier radio changes)
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const type = reportType === "Supplier" ? "S" : "C";
        const a = await apiFetch(`${API}/accounts?type=${type}`).then((r) => r.json());
        if (cancelled) return;

        if (!a.success) {
          notify.error(a.message || `Could not load the ${reportType.toLowerCase()}s`);
          return;
        }
        setAccountIdOptions(a.ids);
        setAccountNameOptions(a.names);
      } catch {
        if (!cancelled) notify.error(`Could not load the ${reportType.toLowerCase()}s`);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [reportType]);

  const resetDivisions = () => {
    setDivisionIdOptions([]);
    setDivisionNameOptions([]);
    setDivisionId(null);
    setDivisionMode("All Division");
  };

  // VB lkpAccountID_EditValueChanged: an account with divisions switches the
  // form to "One Division"; one without keeps "All Division" (locked)
  const loadDivisions = async (accountId: string | null) => {
    resetDivisions();
    if (!accountId) return;
    try {
      const res = await apiFetch(`${API}/divisions/${encodeURIComponent(accountId)}`);
      const data = await res.json();
      if (!data.success) {
        notify.error(data.message || "Could not load the divisions");
        return;
      }
      setDivisionIdOptions(data.ids);
      setDivisionNameOptions(data.names);
      if (data.ids.length > 0) setDivisionMode("One Division");
    } catch {
      notify.error("Could not load the divisions");
    }
  };

  const pickOneAccount = (accountId: string | null) => {
    setCustomerId(accountIdOptions.find((o) => o.value === accountId) ?? null);
    loadDivisions(accountId);
  };

  const pickDivision = (divId: string | null) => {
    setDivisionId(divisionIdOptions.find((o) => o.value === divId) ?? null);
  };

  const changeCustomerMode = (mode: typeof customerMode) => {
    setCustomerMode(mode);
    setCustomerId(null);
    setRangeCustomerId(null);
    resetDivisions();
  };

  const changeReportType = (t: typeof reportType) => {
    setReportType(t);
    changeCustomerMode("One Customer");
  };

  // ------------------------------------------------------------
  // CLEAR
  // ------------------------------------------------------------
  const handleClear = () => {
    setBranchMode("One Branch");
    setReportType("Customer");
    setCustomerMode("One Customer");
    setStatus("All");
    setBranch(branchOptions[0] ?? null);
    setCustomerId(null);
    setRangeCustomerId(null);
    resetDivisions();
    setFromDate("");
    setToDate("");
    setAgeing(ageingOptions[0]);
    setAgeingMode(ageingModeOptions[0]);
    setPostStatus(postStatusOptions[0]);
    setPrintZeroBalance(printZeroOptions[0]);
    setReportFile("Excel");
    setPreview(null);
  };

  // ------------------------------------------------------------
  // The criteria sent to the server (the server validates again)
  // ------------------------------------------------------------
  const buildPayload = (): Record<string, unknown> => {
    const withAgeing = ageing?.value === "WITH";
    return {
      branchMode,
      branchId: branch?.value ?? null,
      branchName: branch?.label ?? null,
      reportType,
      accountMode: customerMode,
      accountId: customerMode === "One Customer" ? (customerId?.value ?? null) : null,
      fromAccountId: customerMode === "Range Customer" ? (customerId?.value ?? null) : null,
      toAccountId: customerMode === "Range Customer" ? (rangeCustomerId?.value ?? null) : null,
      divisionMode: hasDivision ? divisionMode : "All Division",
      divisionId: hasDivision ? (divisionId?.value ?? null) : null,
      fromDate,
      toDate,
      ageing: withAgeing,
      ageingMode: withAgeing ? (ageingMode?.value ?? null) : null,
      postStatus: postStatus?.value ?? "ALL",
      print0Balance: printZeroBalance?.value === "YES",
      soaType: status === "Outstanding" ? "Outstanding" : "All",
    };
  };

  // VB ValidateMe (quick messages; the server checks the same things)
  const validate = (): string | null => {
    if (branchMode === "One Branch" && !branch) return "Please select a 'Branch'";

    if (customerMode === "One Customer") {
      if (!customerId) return "Please select an 'Account'";
      if (hasDivision && divisionMode === "One Division" && !divisionId)
        return "Please select 'Division'";
    } else if (customerMode === "Range Customer") {
      if (!customerId) return "Please select 'From Account ID'";
      if (!rangeCustomerId) return "Please select 'To Account ID'";
    }

    if (!fromDate) return "Please select 'From Date'";
    if (!toDate) return "Please select 'To Date'";
    if (dayjs(fromDate, DATE_FORMAT).isAfter(dayjs(toDate, DATE_FORMAT)))
      return "'To Date' should be greater than 'From Date'";

    if (ageing?.value === "WITH" && !ageingMode) return "Please select an 'Ageing Mode'";
    if (!postStatus) return "Please select an 'Option'";
    return null;
  };

  // gets the .xlsx made by the server (null after an error message)
  const fetchExcel = async (payload: Record<string, unknown>): Promise<Blob | null> => {
    const res = await apiFetch(`${API}/excel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    // an error comes back as JSON, the file as a blob
    if (!res.ok) {
      let message = "Could not create the Excel file";
      try {
        const data = await res.json();
        message = data.message || message;
      } catch {
        message =
          res.status === 404
            ? "Excel is not available: the /excel route was not found (404)"
            : `Could not create the Excel file (error ${res.status})`;
      }
      notify.error(message);
      return null;
    }

    return res.blob();
  };

  // ------------------------------------------------------------
  // PRINT (VB cmdPrint_Click)
  // The criteria go to the server, which returns the report; the Print
  // Preview is then shown (Print = printer, Download = Excel / PDF).
  // ------------------------------------------------------------
  const handlePrint = async () => {
    if (printing || preview) return;

    const problem = validate();
    if (problem) {
      notify.warning(problem);
      return;
    }

    const payload = buildPayload();
    setPrinting(true);
    try {
      const res = await apiFetch(`${API}/print`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        notify.error(data.message || "Could not prepare the report");
        return;
      }

      setPreview({ report: data.report, fileBase: data.fileBase, payload });
    } catch {
      notify.error("Could not prepare the report");
    } finally {
      setPrinting(false);
    }
  };

  // Print in the preview: the browser print dialog (printer)
  const handlePreviewPrint = () => {
    if (!preview || printing) return;
    try {
      printSoaReport(preview.report);
    } catch {
      notify.error("Could not open the print view");
    }
  };

  // Download in the preview: saves the chosen file ("Save as" window, so the
  // browser does not open it afterwards). A double click must not start two
  // saves (state is not updated yet on the second click, so a ref is used).
  const downloading = useRef(false);

  const handlePreviewOk = async () => {
    if (!preview || printing || downloading.current) return;
    downloading.current = true;
    const { report, fileBase, payload } = preview;
    const asPdf = reportFile === "PDF";

    setPrinting(true);
    try {
      const blob = asPdf ? await buildSoaPdf(report) : await fetchExcel(payload);
      if (!blob) return; // the error is already shown

      const kind = asPdf ? "pdf" : "xlsx";
      const saved = await saveFile(blob, `${fileBase}.${kind}`, kind);
      if (saved) {
       
        notify.success(asPdf ? "PDF file downloaded" : "Excel file downloaded");
         setPreview(null); // cancelled "Save as": the preview stays
      }
      
// saved === false -> you cancelled, so no toast
    } catch {
      notify.error(
        asPdf ? "Could not create the PDF file" : "Could not create the Excel file",
      );
    } finally {
      downloading.current = false;
      setPrinting(false);
    }
  };

  const previewHtml = useMemo(() => {
    if (!preview) return "";

    const html = buildHtml(preview.report);
    // the user and the time at the bottom right (a browser draws the page margin box only when it prints)
    const printed = previewPrintedLine(html);

    return html
      .replace(
        "</head>",
        // 40px left / 20px right margin for the preview only
        "<style>body{padding-left:40px;padding-right:20px}" +
          // the preview has no page breaks: a band shows where the next customer's statement starts
          ".acc + .acc::before{content:attr(data-stmt);display:block;margin:28px -20px 20px -40px;padding:6px 40px;" +
          "background:#eef1f6;border-top:1px dashed #8a97b0;border-bottom:1px dashed #8a97b0;color:#44506a;font-size:11px;font-weight:600}" +
          `${printed.css}</style></head>`,
      )
      .replace("</body>", `${printed.line}</body>`);
  }, [preview]);

  // Alt+P prints, Alt+C clears, Escape closes the preview. Re-attached every
  // render so it always sees the latest state.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (preview) {
        if (event.key === "Escape") setPreview(null);
        return;
      }
      if (!event.altKey || event.ctrlKey || event.metaKey) return;

      if (event.code === "KeyP") {
        event.preventDefault();
        handlePrint();
      } else if (event.code === "KeyC") {
        event.preventDefault();
        handleClear();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  return (
    <ReportForm
      title="Statement Of Account"
      overlay={
        // Print preview
        preview && (
          <div className="fixed inset-0 z-99999 flex items-center justify-center bg-black/40 p-4">
            <div className="flex h-[90vh] w-full max-w-300 flex-col overflow-hidden border border-gray-400 bg-white shadow-xl">
              <Header Name="Print Preview" />

              <iframe
                title="Print Preview"
                srcDoc={previewHtml}
                className="min-h-0 flex-1 border-0 bg-white"
              />

              <footer className="flex shrink-0 flex-wrap items-center justify-center gap-4 border-t border-[#e0e5ea] px-3 py-4">
                <div className="flex gap-3">
                  <button id="btnPreviewPrint" type="button" onClick={handlePreviewPrint}
                    disabled={printing}
                    className="btn-style focus-visible:ring-2 focus-visible:ring-[#64d96e] disabled:cursor-not-allowed disabled:opacity-40">
                    <u>P</u>rint
                  </button>
                  <button id="btnPreviewOk" type="button" autoFocus onClick={handlePreviewOk}
                    disabled={printing}
                    className="btn-style focus-visible:ring-2 focus-visible:ring-[#64d96e] disabled:cursor-not-allowed disabled:opacity-40">
                    <u>D</u>ownload
                  </button>
                </div>

                {/* File Format: what Download saves */}
                <div id="rdgReportFile"
                  className="relative flex items-center gap-5 border border-[#e0e5ea] bg-white px-10.5 py-2.5">
                  <span className="absolute -top-2.5 left-2.5 bg-white px-1 text-[13px] text-[#405066]">
                    File Format
                  </span>
                  <CustomRadio name="rdgReportFile" value="Excel" label="Excel"
                    checked={reportFile === "Excel"} onChange={() => setReportFile("Excel")} />
                  <CustomRadio name="rdgReportFile" value="PDF" label="PDF"
                    checked={reportFile === "PDF"} onChange={() => setReportFile("PDF")} />
                </div>
              </footer>
            </div>
          </div>
        )
      }
    >
      {messageDialog}
      <BranchFilter
        mode={branchMode === "One Branch" ? "One Branch" : "All Branch"}
        onModeChange={(mode) => setBranchMode(mode === "One Branch" ? "One Branch" : "All Branches")}
        options={branchOptions}
        value={branch}
        onChange={setBranch}
      />

      {/* Customer / Supplier */}
      <FilterRow
        panel={
          <RadioPanel id="reportType" className="h-17.5 w-38">
            <CustomRadio name="reportType" value="Customer" label="Customer"
              checked={reportType === "Customer"} onChange={() => changeReportType("Customer")} />
            <CustomRadio name="reportType" value="Supplier" label="Supplier"
              checked={reportType === "Supplier"} onChange={() => changeReportType("Supplier")} />
          </RadioPanel>
        }
      />

      {/* the account: One / Range / All */}
      <PairFilter
        name={csLabel}
        mode={accountRowMode}
        onModeChange={handleAccountMode}
        options={accountPairOptions}
        value={customerId?.value ?? ""}
        onChange={(id) => pickOneAccount(id || null)}
        firstWidth={190}
        range={{
          from: customerId?.value ?? "",
          to: rangeCustomerId?.value ?? "",
          onFromChange: (id) => setCustomerId(accountIdOptions.find((o) => o.value === id) ?? null),
          onToChange: (id) => setRangeCustomerId(accountIdOptions.find((o) => o.value === id) ?? null),
        }}
        ids={{ radio: "customerMode", first: "lkpOneCustomerID", second: "lkpOneCustomerName" }}
      />

      {/* the division: only for an account that has divisions */}
      <PairFilter
        name="Division"
        mode={divisionMode}
        onModeChange={(mode) => {
          if (mode === "One Division") {
            setDivisionMode("One Division");
          } else {
            setDivisionMode("All Division");
            setDivisionId(null);
          }
        }}
        options={divisionPairOptions}
        value={divisionId?.value ?? ""}
        onChange={(id) => pickDivision(id || null)}
        firstWidth={190}
        disabled={!hasDivision}
        ids={{ radio: "divisionMode", first: "lkpOneDivisionID", second: "lkpOneDivisionName" }}
      />

      <PeriodFilter
        from={fromDate}
        to={toDate}
        onFromChange={setFromDate}
        onToChange={setToDate}
      />

      <LabelSelectFilter label="Ageing" id="lkpAgeing" options={ageingOptions} value={ageing} onChange={setAgeing} />

      {/* Ageing Mode, and the SOA type at the right end of the same row */}
      <LabelSelectFilter
        className="w-full"
        label="Ageing Mode"
        id="lkpAgeingMode"
        options={ageingModeOptions}
        value={ageingMode}
        onChange={setAgeingMode}
        disabled={ageing?.value !== "WITH"}
      >
        <div className="ml-auto">
          <RadioPanel id="rdgSOAType" className="h-17.5 w-40">
            <CustomRadio name="rdgSOAType" value="Outstanding SOA" label="Outstanding SOA"
              checked={status === "Outstanding"} onChange={() => setStatus("Outstanding")} />
            <CustomRadio name="rdgSOAType" value="SOA" label="SOA"
              checked={status === "All"} onChange={() => setStatus("All")} />
          </RadioPanel>
        </div>
      </LabelSelectFilter>

      <PostStatusFilter options={postStatusOptions} value={postStatus} onChange={setPostStatus} />

      <LabelSelectFilter
        label="Print 0 Balance"
        id="lkpPrint0Balance"
        options={printZeroOptions}
        value={printZeroBalance}
        onChange={setPrintZeroBalance}
      />

      <ReportPrintRow onPrint={() => void handlePrint()} disabled={printing}>
        <button type="button" onClick={handleClear} disabled={printing}
          className="btn-style disabled:cursor-not-allowed disabled:opacity-40">
          <u>C</u>lear
        </button>
      </ReportPrintRow>
    </ReportForm>
  );
};

export default RptSOAPage;
