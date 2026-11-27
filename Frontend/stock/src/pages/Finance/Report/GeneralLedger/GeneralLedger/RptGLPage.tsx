import React, { useEffect, useState } from "react";
import ReportPreview from "../../../../../components/common/ReportPreview";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { buildGLPdf } from "../../../../../components/Finance/Report/RptGL/RptGLPdf";
import {
  buildHtml,
  printGLReport,
  type PrintReport,
} from "../../../../../components/Finance/Report/RptGL/RptGLRpt";
import type { PairSelectOption } from "../../../../../components/common/CustomLinkedPairSelect";
import { CustomRadio, RadioPanel } from "../../../../../components/common/ReportFormParts";
import {
  BranchFilter,
  LabelSelectFilter,
  PairFilter,
  PeriodFilter,
  ReportForm,
  ReportPrintRow,
} from "../../../../../components/common/ReportFilters";
import { useMessageModal } from "../../../../../hooks/useMessageModal";

// General Ledger - laid out with the common template of the report forms (components/common/ReportFilters.tsx), like every
// other report page. The Print Preview, the lookups and the request sent to the server are as they were.

dayjs.extend(customParseFormat);

type Option = { value: string; label: string };

const DATE_FORMAT = "DD-MM-YYYY";
const TODAY = dayjs().format(DATE_FORMAT);

const API = `${import.meta.env.VITE_API_URL}/RptGL`;

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

const postStatusOptions: Option[] = [
  { value: "ALL", label: "All" },
  { value: "POSTED", label: "Posted" },
  { value: "UNPOSTED", label: "Not Posted" },
];

// what the procedure expects: 0 non posted, 1 posted, 2 all
const POST_STATUS: Record<string, number> = { UNPOSTED: 0, POSTED: 1, ALL: 2 };

const yesNoOptions: Option[] = [
  { value: "YES", label: "Yes" },
  { value: "NO", label: "No" },
];

// the Cost Center boxes (ID box and Name box, like the Account): "All C.C." is the first entry of the list and what the boxes
// show until a cost center is picked ("" in the request)
const ALL_CC = "ALL_CC";
const ALL_CC_OPTION: PairSelectOption = { value: ALL_CC, firstLabel: "", secondLabel: "All C.C." };

type GLRequest = {
  allBranches: boolean;
  branchId: string;
  accountMode: number; // 0 one account, 1 range, 2 all
  accountId: string;
  fromAccountId: string;
  toAccountId: string;
  ccId: string; // "" = All C.C.
  fromDate: string; // DD/MM/YYYY
  toDate: string; // DD/MM/YYYY
  withOpening: boolean; // always true: the page has no OP option
  postStatus: number;
  transType: number; // 0 generated, 1 manual, 2 all
  print0Bal: boolean;
};

type RptGLPageProps = {
  onClose?: () => void;
};

const TRANS_TYPE: Record<string, number> = {
  "Generated Entries": 0,
  "Manual Entries": 1,
  All: 2,
};

const RptGLPage: React.FC<RptGLPageProps> = ({ onClose }) => {
  const { notify, dialog: messageDialog } = useMessageModal();
  const [branchOptions, setBranchOptions] = useState<Option[]>([]);
  const [accountOptions, setAccountOptions] = useState<PairSelectOption[]>([]);
  const [ccOptions, setCcOptions] = useState<PairSelectOption[]>([ALL_CC_OPTION]);

  const [branchMode, setBranchMode] = useState("One Branch"); // rdgBranch
  const [branch, setBranch] = useState<Option | null>(null); // lkpBranch

  const [accountMode, setAccountMode] = useState("One Account"); // rdgAccount
  const [accountId, setAccountId] = useState(""); // lkpAccountID / lkpAccountName
  const [fromAccount, setFromAccount] = useState(""); // lkpFromAccount
  const [toAccount, setToAccount] = useState(""); // lkpToAccount

  const [costCenter, setCostCenter] = useState(ALL_CC); // lkpCCID / lkpCCName (ALL_CC = All C.C.)

  const [fromDate, setFromDate] = useState(TODAY); // dtpFromDate
  const [toDate, setToDate] = useState(TODAY); // dtpToDate

  const [transType, setTransType] = useState("All"); // rdgTransType

  const [postStatus, setPostStatus] = useState<Option | null>(
    postStatusOptions[0],
  ); // cboPostStatus
  const [printZeroBalance, setPrintZeroBalance] = useState<Option | null>(
    yesNoOptions[0],
  ); // cboPrint0Bal

  const [printing, setPrinting] = useState(false);

  // rdgReportFile (inside the Print Preview): what Download saves

  // print preview: shown after Print. Print there sends it to the printer,
  // Download saves the "Report File" choice
  const [preview, setPreview] = useState<{
    report: PrintReport;
    fileBase: string;
    request: GLRequest;
  } | null>(null);

  // ------------------------------------------------------------
  // LOAD THE LOOKUPS (VB FillCombos)
  // ------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await apiFetch(`${API}/lookups`);
        const data = await res.json();

        if (!res.ok || !data.success) {
          notify.error(data.message || "Failed to load the lookups");
          return;
        }
        if (cancelled) return;

        const branches: Option[] = (
          data.branches as { brId: string; brName: string }[]
        ).map((b) => ({
          value: b.brId,
          label: b.brName,
        }));
        setBranchOptions(branches);
        setBranch(branches[0] ?? null);

        // one list for both boxes: "ID | Name" in the ID box and "Name | ID" in the Name box
        setAccountOptions(
          (data.accountsById as { accountId: string; accountName: string }[]).map((a) => ({
            value: a.accountId,
            firstLabel: a.accountId,
            secondLabel: a.accountName,
          })),
        );

        setCcOptions([
          ALL_CC_OPTION,
          ...(data.costCenters as { ccId: string; ccName: string }[]).map((c) => ({
            value: c.ccId,
            firstLabel: c.ccId,
            secondLabel: c.ccName,
          })),
        ]);
      } catch {
        if (!cancelled) notify.error("Failed to load the lookups");
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // VB ValidateMe: returns the request, or null after showing the message
  const buildRequest = (): GLRequest | null => {
    const oneBranch = branchMode === "One Branch";
    const valid = (v: string) => !!v && dayjs(v, DATE_FORMAT, true).isValid();

    if (oneBranch && !branch) {
      notify.warning("Please select a 'Branch'");
      document.getElementById("lkpBranch")?.focus();
      return null;
    }

    if (accountMode === "One Account" && !accountId) {
      notify.warning("Please select an 'Account ID'");
      document.getElementById("lkpAccountID")?.focus();
      return null;
    }
    if (accountMode === "Range Account") {
      if (!fromAccount) {
        notify.warning("Please select 'From Account ID'");
        document.getElementById("lkpFromAccount")?.focus();
        return null;
      }
      if (!toAccount) {
        notify.warning("Please select 'To Account ID'");
        document.getElementById("lkpToAccount")?.focus();
        return null;
      }
    }

    if (!valid(fromDate)) {
      notify.warning("Please select 'From Date'");
      document.getElementById("dtpFromDate")?.focus();
      return null;
    }
    if (!valid(toDate)) {
      notify.warning("Please select 'To Date'");
      document.getElementById("dtpToDate")?.focus();
      return null;
    }
    if (dayjs(fromDate, DATE_FORMAT).isAfter(dayjs(toDate, DATE_FORMAT))) {
      notify.warning("'To Date' should be greater than 'From Date'");
      document.getElementById("dtpToDate")?.focus();
      return null;
    }

    const slash = (v: string) => v.replace(/-/g, "/"); // DD-MM-YYYY -> DD/MM/YYYY
    const mode =
      accountMode === "One Account" ? 0 : accountMode === "Range Account" ? 1 : 2;

    return {
      allBranches: !oneBranch,
      branchId: oneBranch ? (branch?.value ?? "") : "",
      accountMode: mode,
      accountId: mode === 0 ? accountId : "",
      fromAccountId: mode === 1 ? fromAccount : "",
      toAccountId: mode === 1 ? toAccount : "",
      ccId: costCenter === ALL_CC ? "" : costCenter,
      fromDate: slash(fromDate),
      toDate: slash(toDate),
      withOpening: true, // always with the opening balance
      postStatus: POST_STATUS[postStatus?.value ?? "ALL"] ?? 2,
      transType: TRANS_TYPE[transType] ?? 2,
      print0Bal: printZeroBalance?.value === "YES",
    };
  };

  // gets the .xlsx made by the server (null after an error message)
  const fetchExcel = async (request: GLRequest): Promise<Blob | null> => {
    const res = await apiFetch(`${API}/excel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });

    // an error comes back as JSON, the file as a blob
    if (!res.ok) {
      let message = "Could not create the Excel file";
      try {
        const data = await res.json();
        message = data.message || message;
      } catch {
        // not JSON: the server has no /excel route (404) or crashed (500)
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
  // PRINT (VB cmdPrint_Click): validates, gets the report and shows the
  // Print Preview (Print = printer, Download = Excel / PDF file)
  // ------------------------------------------------------------
  const handlePrint = async () => {
    if (printing || preview) return;

    const request = buildRequest();
    if (!request) return;

    setPrinting(true);
    try {
      const res = await apiFetch(`${API}/print`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        notify.error(data.message || "Could not prepare the report");
        return;
      }

      setPreview({ report: data.report, fileBase: data.fileBase, request });
    } catch {
      notify.error("Could not prepare the report");
    } finally {
      setPrinting(false);
    }
  };

  const handleClose = () => {
    setBranchMode("One Branch");
    setBranch(branchOptions[0] ?? null);
    setAccountMode("One Account");
    setAccountId("");
    setFromAccount("");
    setToAccount("");
    setCostCenter(ALL_CC);
    setFromDate(TODAY);
    setToDate(TODAY);
    setTransType("All");
    setPostStatus(postStatusOptions[0]);
    setPrintZeroBalance(yesNoOptions[0]);
    setPreview(null);
    onClose?.();
  };

  // Alt+P prints, Alt+C closes (Ctrl+P / Ctrl+L of the old form clash with the
  // browser); Esc closes the preview. Re-attached every render so it always
  // sees the latest state.
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
        handleClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  return (
    // "Generated Entries" is longer than the usual 150 px label column: the whole form gets a 168 px one (every panel and
    // label ends at the same place), so all its boxes still line up
    <ReportForm
      title="General Ledger"
      labelWidth={168}
      overlay={
        // the Print Preview (after Print)
        preview && (
          <ReportPreview
            showClose={false}
            html={buildHtml(preview.report)}
            fileBase={preview.fileBase}
            onPrint={() => printGLReport(preview.report)}
            buildPdf={() => buildGLPdf(preview.report)}
            fetchExcel={() => fetchExcel(preview.request)}
            onClose={() => setPreview(null)}
          />
        )
      }
    >
      {messageDialog}
      <BranchFilter
        mode={branchMode}
        onModeChange={setBranchMode}
        options={branchOptions}
        value={branch}
        onChange={setBranch}
      />

      {/* the account: One / Range / All */}
      <PairFilter
        name="Account"
        mode={accountMode}
        onModeChange={(mode) => {
          setAccountMode(mode);
          setAccountId("");
          setFromAccount("");
          setToAccount("");
        }}
        options={accountOptions}
        value={accountId}
        onChange={setAccountId}
        firstWidth={190}
        range={{
          from: fromAccount,
          to: toAccount,
          onFromChange: setFromAccount,
          onToChange: setToAccount,
        }}
      />

      {/* the cost center: always needed ("All C.C." is the first entry of the list) */}
      <PairFilter
        required
        name="Cost Center"
        mode="One Cost Center"
        onModeChange={() => undefined}
        options={ccOptions}
        value={costCenter}
        onChange={(id) => setCostCenter(id || ALL_CC)}
        firstWidth={190}
        ids={{ first: "lkpCCID", second: "lkpCCName" }}
      />

      <PeriodFilter
        from={fromDate}
        to={toDate}
        onFromChange={setFromDate}
        onToChange={setToDate}
      />

      {/* Post Status, and the Entry type at the right end of the same row */}
      <LabelSelectFilter
        className="w-full"
        label="Post Status"
        id="cboPostStatus"
        options={postStatusOptions}
        value={postStatus}
        onChange={setPostStatus}
      >
        <div className="ml-auto">
          <RadioPanel id="rdgTransType" className="h-22.5 w-[var(--filter-panel,9.5rem)]">
            {["Generated Entries", "Manual Entries", "All"].map((v) => (
              <CustomRadio
                key={v}
                name="rdgTransType"
                value={v}
                label={v}
                checked={transType === v}
                onChange={() => setTransType(v)}
              />
            ))}
          </RadioPanel>
        </div>
      </LabelSelectFilter>

      <LabelSelectFilter
        label="Print 0 Balance"
        id="cboPrint0Bal"
        options={yesNoOptions}
        value={printZeroBalance}
        onChange={setPrintZeroBalance}
      />

      <ReportPrintRow onPrint={() => void handlePrint()} disabled={printing} />
    </ReportForm>
  );
};

export default RptGLPage;
