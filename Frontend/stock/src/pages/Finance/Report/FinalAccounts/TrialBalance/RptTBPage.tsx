import React, { useEffect, useMemo, useState } from "react";
import ReportPreview from "../../../../../components/common/ReportPreview";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { buildTrialBalancePdf } from "../../../../../components/Finance/Report/RptTB/RptTBPdf";
import { saveFile } from "./saveFile";
import {
  buildHtml,
  printTrialBalanceReport,
  type PrintReport,
} from "../../../../../components/Finance/Report/RptTB/RptTBRpt";
import { useEnterAsTab } from "../../../../../hooks/useEnterAsTab";
import { CustomRadio, RadioPanel } from "../../../../../components/common/ReportFormParts";
import {
  BranchFilter,
  FilterLabel,
  FilterRow,
  LabelSelectFilter,
  PeriodFilter,
  PostStatusFilter,
  ReportForm,
  ReportPrintRow,
} from "../../../../../components/common/ReportFilters";
import { useMessageModal } from "../../../../../hooks/useMessageModal";

// Trial Balance - laid out with the common template of the report forms (components/common/ReportFilters.tsx), like every
// other report page. The Print Preview, the lookups and the request sent to the server are as they were.

dayjs.extend(customParseFormat); // needed for dayjs(value, "DD-MM-YYYY")

type Option = {
  value: string;
  label: string;
};

type Branch = { brId: string; brName: string };

const DATE_FORMAT = "DD-MM-YYYY";

const API = `${import.meta.env.VITE_API_URL}/RptTB`;

// Sends the login cookie, and the company / user kept at sign-in as a stopgap
// (the server uses its session first and only falls back to these).
const withLogin = (url: string) => {
  const coId = localStorage.getItem("PstrCoID") ?? "";
  const userId = localStorage.getItem("PstrUserID") ?? "";
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}coId=${encodeURIComponent(coId)}&userId=${encodeURIComponent(userId)}`;
};

const apiFetch = (url: string, init: RequestInit = {}) =>
  fetch(withLogin(url), { credentials: "include", ...init });

const postStatusOptions: Option[] = [
  { value: "ALL", label: "All" },
  { value: "POSTED", label: "Posted" },
  { value: "UNPOSTED", label: "Not Posted" },
];

const yesNoOptions: Option[] = [
  { value: "YES", label: "Yes" },
  { value: "NO", label: "No" },
];

// what sp_rpttb expects
const POST_STATUS: Record<string, number> = { ALL: 2, POSTED: 1, UNPOSTED: 0 };
const TRANS_TYPE: Record<string, number> = { All: 2, Generated: 1, Manual: 0 };

const today = () => dayjs().format(DATE_FORMAT);

const toServerDate = (value: string) => value.replace(/-/g, "/"); // DD-MM-YYYY -> DD/MM/YYYY

const RptTBPage: React.FC = () => {
  const { notify, dialog: messageDialog } = useMessageModal();
  // Enter moves on like Tab; after a pick from a list the cursor goes on (the common template's boxes do it)
  const handleEnterAsTab = useEnterAsTab();

  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false); // printing or exporting

  const [branchMode, setBranchMode] = useState("One Branch");
  const [branch, setBranch] = useState<Option | null>(null);

  const [fromDate, setFromDate] = useState(today());
  const [toDate, setToDate] = useState(today());

  const [accountLevel, setAccountLevel] = useState("4");
  const [postStatus, setPostStatus] = useState<Option | null>(
    postStatusOptions[0],
  );
  const [printZeroBalance, setPrintZeroBalance] = useState<Option | null>(
    yesNoOptions[1],
  );
  const [printAccountGroup, setPrintAccountGroup] = useState<Option | null>(
    yesNoOptions[0],
  );
  const [entryMode, setEntryMode] = useState("All");
  // rdgReportFile (inside the Print Preview): what Download saves

  // print preview: shown after Print. Print there sends it to the printer,
  // Download saves the "Report File" choice
  const [preview, setPreview] = useState<{
    report: PrintReport;
    // the name of the downloaded file, without the extension (it holds the time: made once, when the preview opens)
    fileBase: string;
    request: NonNullable<ReturnType<typeof buildRequest>>;
  } | null>(null);

  const branchOptions: Option[] = useMemo(
    () => branches.map((b) => ({ value: b.brId, label: b.brName })),
    [branches],
  );

  // VB ConfigurerdgBranchUserID: a user who has one branch only works with it
  // (assumed rule - the old helper is not in the files)
  const canUseAllBranches = branches.length > 1;

  // ------------------------------------------------------------
  // LOAD THE BRANCHES (VB FillCombos)
  // ------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await apiFetch(`${API}/lookups`);
        const data = await res.json();

        if (!res.ok || !data.success) {
          notify.error(data.message || "Failed to load the branches");
          return;
        }
        if (cancelled) return;

        const list = data.branches as Branch[];
        setBranches(list);
        // the first branch is the default
        setBranch(list[0] ? { value: list[0].brId, label: list[0].brName } : null);
      } catch {
        if (!cancelled) notify.error("Failed to load the branches");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleClear = () => {
    setBranchMode("One Branch");
    setBranch(branchOptions[0] ?? null);
    setFromDate(today());
    setToDate(today());
    setAccountLevel("4");
    setPostStatus(postStatusOptions[0]);
    setPrintZeroBalance(yesNoOptions[1]);
    setPrintAccountGroup(yesNoOptions[0]);
    setEntryMode("All");
  };

  // ------------------------------------------------------------
  // VB ValidateMe: returns the request body, or null (and says why)
  // ------------------------------------------------------------
  const buildRequest = () => {
    const oneBranch = branchMode === "One Branch";

    if (oneBranch && !branch) {
      notify.warning("Please select a 'Branch'");
      document.getElementById("lkpBranch")?.focus();
      return null;
    }

    const from = dayjs(fromDate, DATE_FORMAT, true);
    const to = dayjs(toDate, DATE_FORMAT, true);

    if (!fromDate || !from.isValid()) {
      notify.warning("Please select 'From Date'");
      document.getElementById("dtpFromDate")?.focus();
      return null;
    }
    if (!toDate || !to.isValid()) {
      notify.warning("Please select 'To Date'");
      document.getElementById("dtpToDate")?.focus();
      return null;
    }
    if (from.isAfter(to)) {
      notify.warning("'To Date' should be greater than 'From Date'");
      document.getElementById("dtpToDate")?.focus();
      return null;
    }

    const level = Number(accountLevel);
    if (accountLevel.trim() === "" || !Number.isInteger(level)) {
      notify.warning("Please input an 'Account Level'");
      document.getElementById("txtAccountLevel")?.focus();
      return null;
    }
    if (level < 1 || level > 4) {
      notify.warning("'Account Level' must be from 1 to 4");
      document.getElementById("txtAccountLevel")?.focus();
      return null;
    }

    if (!postStatus) {
      notify.warning("Please select 'Post Status'");
      document.getElementById("lkpPostStatus")?.focus();
      return null;
    }
    if (!printZeroBalance) {
      notify.warning("Please select 'Print 0 Balance'");
      document.getElementById("lkpPrint0Balance")?.focus();
      return null;
    }
    if (!printAccountGroup) {
      notify.warning("Please select 'Print A/c Group'");
      document.getElementById("lkpPrintACGroup")?.focus();
      return null;
    }

    return {
      allBranches: !oneBranch,
      branchId: oneBranch ? branch?.value : "",
      fromDate: toServerDate(fromDate),
      toDate: toServerDate(toDate),
      accountLevel: level,
      postStatus: POST_STATUS[postStatus.value],
      print0Bal: printZeroBalance.value === "YES",
      transType: TRANS_TYPE[entryMode],
      printAcGroup: printAccountGroup.value === "YES",
    };
  };

  // file name: TrialBalance_<from>_<to>_<time>.<ext> (dates are DD/MM/YYYY).
  // The time keeps every download's name different from a file that is still
  // open (Acrobat / Excel lock the file).
  const makeFileName = (
    request: NonNullable<ReturnType<typeof buildRequest>>,
    ext: string,
  ) => {
    const ymd = (d: string) => d.split("/").reverse().join("");
    const t = new Date();
    const hms = [t.getHours(), t.getMinutes(), t.getSeconds()]
      .map((n) => String(n).padStart(2, "0"))
      .join("");
    return `TrialBalance_${ymd(request.fromDate)}_${ymd(request.toDate)}_${hms}.${ext}`;
  };

  // gets the .xlsx made by the server (null after an error message)
  const fetchExcel = async (
    request: NonNullable<ReturnType<typeof buildRequest>>,
  ): Promise<Blob | null> => {
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
        /* keep the default message */
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
    if (busy || preview) return;

    const request = buildRequest();
    if (!request) return;

    setBusy(true);
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

      setPreview({ report: data.report, fileBase: makeFileName(request, "").slice(0, -1), request });
    } catch {
      notify.error("Could not prepare the report");
    } finally {
      setBusy(false);
    }
  };

  // ------------------------------------------------------------
  // EXCEL button: always the .xlsx, whatever "Report File" says
  // ------------------------------------------------------------
  const handleExcel = async () => {
    if (busy || preview) return;

    const request = buildRequest();
    if (!request) return;

    setBusy(true);
    try {
      const blob = await fetchExcel(request);
      if (blob) {
        const saved = await saveFile(blob, makeFileName(request, "xlsx"), "xlsx");
        if (saved) notify.success("Excel file downloaded");
      }
    } catch {
      notify.error("Could not create the Excel file");
    } finally {
      setBusy(false);
    }
  };

  // Alt+P prints, Alt+E exports, Alt+C clears (Ctrl+P of the old form clashes
  // with the browser). Re-attached every render so it sees the latest state.
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
      } else if (event.code === "KeyE") {
        event.preventDefault();
        handleExcel();
      } else if (event.code === "KeyC") {
        event.preventDefault();
        handleClear();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  return (
    // "Generated Entries" is longer than the usual 150 px label column: the whole form gets a 168 px one (every panel and
    // label ends at the same place), so all its boxes still line up
    <ReportForm
      title="Trial Balance"
      labelWidth={168}
      onKeyDown={handleEnterAsTab}
      overlay={
        // the Print Preview (after Print)
        preview && (
          <ReportPreview
            showClose={false}
            html={buildHtml(preview.report)}
            fileBase={preview.fileBase}
            onPrint={() => printTrialBalanceReport(preview.report)}
            buildPdf={() => buildTrialBalancePdf(preview.report)}
            fetchExcel={() => fetchExcel(preview.request)}
            onClose={() => setPreview(null)}
          />
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
        // a user who has one branch only works with it
        allDisabled={!canUseAllBranches}
      />

      <PeriodFilter
        from={fromDate}
        to={toDate}
        onFromChange={setFromDate}
        onToChange={setToDate}
      />

      {/* Account level */}
      <div className="grid grid-cols-[var(--filter-label,150px)_minmax(0,1fr)] items-center gap-x-4">
        <FilterLabel>Account Level :</FilterLabel>
        <input
          id="txtAccountLevel"
          type="number"
          min="1"
          max="4"
          value={accountLevel}
          onChange={(event) => setAccountLevel(event.target.value)}
          className="h-7.5 w-16 rounded-sm border border-gray-300 bg-white px-2 text-[14px] text-[#172b43] outline-none"
        />
      </div>

      <PostStatusFilter options={postStatusOptions} value={postStatus} onChange={setPostStatus} />

      <LabelSelectFilter
        label="Print 0 Balance"
        id="lkpPrint0Balance"
        options={yesNoOptions}
        value={printZeroBalance}
        onChange={setPrintZeroBalance}
      />

      <LabelSelectFilter
        label="Print A/C Group"
        id="lkpPrintACGroup"
        options={yesNoOptions}
        value={printAccountGroup}
        onChange={setPrintAccountGroup}
      />

      {/* Entry type */}
      <FilterRow
        panel={
          <RadioPanel id="rdgEntryMode" className="h-22.5 w-[var(--filter-panel,9.5rem)]">
            <CustomRadio
              name="entryMode"
              value="Generated"
              label="Generated Entries"
              checked={entryMode === "Generated"}
              onChange={() => setEntryMode("Generated")}
            />
            <CustomRadio
              name="entryMode"
              value="Manual"
              label="Manual Entries"
              checked={entryMode === "Manual"}
              onChange={() => setEntryMode("Manual")}
            />
            <CustomRadio
              name="entryMode"
              value="All"
              label="All"
              checked={entryMode === "All"}
              onChange={() => setEntryMode("All")}
            />
          </RadioPanel>
        }
      />

      <ReportPrintRow onPrint={() => void handlePrint()} disabled={loading || busy}>
        <button
          id="btnClear"
          type="button"
          onClick={handleClear}
          title="Alt+C"
          className="btn-style focus-visible:ring-2 focus-visible:ring-[#64d96e]"
        >
          <u>C</u>lear
        </button>
      </ReportPrintRow>
    </ReportForm>
  );
};

export default RptTBPage;
