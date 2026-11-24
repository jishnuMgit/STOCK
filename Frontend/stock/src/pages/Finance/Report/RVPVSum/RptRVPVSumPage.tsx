import React, { useEffect, useMemo, useState } from "react";
import type { PairSelectOption } from "../../../../components/common/CustomLinkedPairSelect";
import { useInitialFocus } from "../../../../hooks/useInitialFocus";
import { useEnterAsTab } from "../../../../hooks/useEnterAsTab";
import { useAltShortcuts } from "../../../../hooks/useAltShortcuts";
import { useCtrlShortcuts } from "../../../../hooks/useCtrlShortcuts";
import ReportPreview from "../../../../components/common/ReportPreview";
import {
  BranchFilter,
  PairFilter,
  PeriodFilter,
  PostStatusFilter,
  ReportForm,
  ReportPrintRow,
  SingleFilter,
} from "../../../../components/common/ReportFilters";
import {
  buildHtml,
  printRVPVSumReport,
  type PrintReport,
} from "../../../../components/Finance/Report/RptRVPVSum/RptRVPVSumPrintReport";
import { buildRVPVSumPdf } from "../../../../components/Finance/Report/RptRVPVSum/RptRVPVSumPdf";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { useMessageModal } from "../../../../hooks/useMessageModal";

dayjs.extend(customParseFormat);

type Option = { value: string; label: string };

const DATE_FORMAT = "DD-MM-YYYY";

const api = import.meta.env.VITE_API_URL;

/* Replace these with data from your API */
const postStatusOptions: Option[] = [
  { value: "ALL", label: "All" },
  { value: "POSTED", label: "Posted" },
  { value: "UNPOSTED", label: "Not Posted" },
];

type RptRVPVSumPageProps = {
  onClose?: () => void;
};

const RptRVPVSumPage: React.FC<RptRVPVSumPageProps> = ({
  onClose,
}) => {
  const { notify, dialog: messageDialog } = useMessageModal();
  const handleEnterAsTab = useEnterAsTab();

  const [rdgBranch, setRdgBranch] = useState("One Branch"); // rdgBranch
  const [lkpBranch, setLkpBranch] = useState<Option | null>(null); // lkpBranch
  const [chkBranch, setChkBranch] = useState<string[]>([]); // chkBranch (Selected Branch): the ids of the branches ticked

  const handleBranchTick = (branchId: string, checked: boolean) => {
    setChkBranch((current) =>
      checked ? [...current, branchId] : current.filter((id) => id !== branchId),
    );
  };

  // the branches the logged-in user has a right to, and the user's default branch (the old FillCombos)
  const [branchOptions, setBranchOptions] = useState<Option[]>([]);
  const [defaultBranch, setDefaultBranch] = useState<Option | null>(null);

  // the documents of the Finance module (without JV / PJ / SJ) and the head accounts
  const [documentOptions, setDocumentOptions] = useState<Option[]>([]);
  const [accountRows, setAccountRows] = useState<{ lkpAccountID: string; txtAccountName: string }[]>([]);

  // the lookups have been asked for (found or not): the cursor can start
  const [lookupsLoaded, setLookupsLoaded] = useState(false);

  useEffect(() => {
    const loadLookups = async () => {
      try {
        const response = await fetch(`${api}/RptRVPVSum/lookups`, {
          credentials: "include",
        });
        const result = await response.json();

        if (!response.ok || !result.success) {
          notify.error(result.message || "Failed to load the Branches");
          return;
        }

        const options: Option[] = (result.branches || []).map(
          (row: { lkpBranch: string; txtBranchName: string }) => ({
            value: row.lkpBranch,
            label: row.txtBranchName,
          }),
        );

        const initial =
          options.find((option) => option.value === result.lkpDefaultBranch) ?? null;

        setBranchOptions(options);
        setDefaultBranch(initial);
        setLkpBranch(initial);

        setDocumentOptions(
          (result.documents || []).map(
            (row: { lkpDocument: string; txtDocumentName: string }) => ({
              value: row.lkpDocument,
              label: row.txtDocumentName,
            }),
          ),
        );

        setAccountRows(result.accounts || []);
      } catch (error: unknown) {
        console.error("rptRVPVSum lookups error:", error);
        notify.error("Cannot connect to the Receipt / Payment Summary API.");
      }
    };

    loadLookups().finally(() => setLookupsLoaded(true));
  }, []);

  // the cursor starts on the Branch box
  useInitialFocus(lookupsLoaded, "lkpBranch");

  const [lkpDocument, setLkpDocument] = useState<Option | null>(null); // lkpDocument

  const [rdgAccount, setRdgAccount] = useState("All Account"); // rdgAccount (the old form starts on All Account)
  const [lkpAccountID, setLkpAccountID] = useState(""); // lkpAccountID / lkpAccountName

  // the account boxes: one list, "ID | Name" in the ID box and "Name | ID" in the Name box
  const accountPairOptions = useMemo<PairSelectOption[]>(
    () =>
      [...accountRows]
        .sort((a, b) => a.txtAccountName.localeCompare(b.txtAccountName))
        .map((row) => ({
          value: row.lkpAccountID,
          firstLabel: row.lkpAccountID,
          secondLabel: row.txtAccountName,
        })),
    [accountRows],
  );

  const [dtpFromDate, setDtpFromDate] = useState(dayjs().format(DATE_FORMAT)); // dtpFromDate
  const [dtpToDate, setDtpToDate] = useState(dayjs().format(DATE_FORMAT)); // dtpToDate
  const [lkpPostStatus, setLkpPostStatus] = useState<Option | null>(
    postStatusOptions[1],
  ); // lkpPostStatus

  // the Print Preview (after Print) and the Print button while the server makes the report
  const [printing, setPrinting] = useState(false);
  const [preview, setPreview] = useState<{
    report: PrintReport;
    fileBase: string;
    params: ReturnType<typeof buildRVPVSumParams>;
  } | null>(null);

  // dd-mm-yyyy of the box -> yyyy-mm-dd ("" when it is not a date)
  const toIsoDate = (value: string) =>
    dayjs(value, DATE_FORMAT, true).isValid()
      ? dayjs(value, DATE_FORMAT).format("YYYY-MM-DD")
      : "";

  // what the server takes: the element ids of the page, the radios and the lists as their codes
  const buildRVPVSumParams = () => ({
    rdgBranch: { "One Branch": 0, "Selected Branch": 1, "All Branch": 2 }[rdgBranch] ?? 0,
    lkpBranch: rdgBranch === "One Branch" ? (lkpBranch?.value ?? "") : "",
    chkBranch: rdgBranch === "Selected Branch" ? chkBranch : [],
    lkpDocument: lkpDocument?.value ?? "",
    rdgAccount: rdgAccount === "One Account" ? 0 : 1,
    lkpAccountID: rdgAccount === "One Account" ? lkpAccountID : "",
    dtpFromDate: toIsoDate(dtpFromDate),
    dtpToDate: toIsoDate(dtpToDate),
    lkpPostStatus: { ALL: 0, POSTED: 1, UNPOSTED: 2 }[lkpPostStatus?.value ?? "POSTED"] ?? 1,
  });

  // Print (the old cmdPrint): the checks of the old form, then the server sends the report and the Print Preview
  // opens (Print = the browser's print window, Download = Excel / PDF)
  const handlePrint = async () => {
    if (printing || preview) return;

    const warn = (message: string, id: string) => {
      notify.warning(message);
      document.getElementById(id)?.focus();
    };

    const params = buildRVPVSumParams();

    if (!params.lkpDocument) {
      return warn("Please select a 'Document'", "lkpDocument");
    }

    if (params.rdgBranch === 0 && !params.lkpBranch) {
      return warn("Please select a 'Branch'", "lkpBranch");
    }

    if (params.rdgBranch === 1 && params.chkBranch.length === 0) {
      return warn("Please select atleast one 'Branch'", "chkBranchList");
    }

    if (params.rdgAccount === 0 && !params.lkpAccountID) {
      return warn("Please select an 'Account ID'", "lkpAccountID");
    }

    if (!params.dtpFromDate) {
      return warn("Please select 'From Date'", "dtpFromDate");
    }

    if (!params.dtpToDate) {
      return warn("Please select 'To Date'", "dtpToDate");
    }

    // yyyy-mm-dd texts compare as dates
    if (params.dtpFromDate > params.dtpToDate) {
      return warn("'To Date' should be greater than 'From Date'", "dtpToDate");
    }

    if (params.dtpFromDate.slice(0, 4) !== params.dtpToDate.slice(0, 4)) {
      return warn("'From Date' and 'To Date' should be in the same year", "dtpToDate");
    }

    setPrinting(true);

    try {
      const response = await fetch(`${api}/RptRVPVSum/print`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        notify.warning(result.message || "The Receipt / Payment Summary report could not be printed.");
        if (result.field) document.getElementById(result.field)?.focus();
        return;
      }

      setPreview({ report: result.report, fileBase: result.fileBase, params });
    } catch (error: unknown) {
      console.error("rptRVPVSum print error:", error);
      notify.error("Cannot connect to the Receipt / Payment Summary API.");
    } finally {
      setPrinting(false);
    }
  };

  // the Excel file of the Print Preview, made by the server (null after an error)
  const fetchExcel = async (): Promise<Blob | null> => {
    if (!preview) return null;

    const response = await fetch(`${api}/RptRVPVSum/excel`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(preview.params),
    });

    // an error comes back as JSON, the file as a blob
    if (!response.ok) {
      let message = "Could not create the Excel file";

      try {
        const result = await response.json();
        message = result.message || message;
      } catch {
        message = `Could not create the Excel file (error ${response.status})`;
      }

      notify.error(message);
      return null;
    }

    return response.blob();
  };

  const handleClose = () => {
    setRdgBranch("One Branch");
    setLkpBranch(defaultBranch);
    setChkBranch([]);
    setLkpDocument(null);
    setRdgAccount("All Account");
    setLkpAccountID("");
    setDtpFromDate(dayjs().format(DATE_FORMAT));
    setDtpToDate(dayjs().format(DATE_FORMAT));
    setLkpPostStatus(postStatusOptions[1]);
    onClose?.();
  };

  // Alt+P -> Print, Alt+C -> Close (the underlined letters on the buttons)
  useAltShortcuts({
    p: () => void handlePrint(),
    c: handleClose,
  });

  // Ctrl+P -> Print (the old form's Ctrl+P). With the Print Preview open it prints the report that is shown.
  useCtrlShortcuts({
    p: () => (preview ? printRVPVSumReport(preview.report) : void handlePrint()),
  });

  return (
    <ReportForm
      title="Receipt / Payment Summary"
      onKeyDown={handleEnterAsTab}
      overlay={
        // the Print Preview (after Print)
        preview && (
          <ReportPreview
            showClose={false}
            html={buildHtml(preview.report)}
            fileBase={preview.fileBase}
            onPrint={() => printRVPVSumReport(preview.report)}
            buildPdf={() => buildRVPVSumPdf(preview.report)}
            fetchExcel={fetchExcel}
            onClose={() => setPreview(null)}
          />
        )
      }
    >
      {messageDialog}
      <BranchFilter
        withSelected
        mode={rdgBranch}
        onModeChange={setRdgBranch}
        options={branchOptions}
        value={lkpBranch}
        onChange={setLkpBranch}
        selectedIds={chkBranch}
        onTick={handleBranchTick}
      />

      <SingleFilter
        required
        name="Document"
        mode="One Document"
        onModeChange={() => undefined}
        options={documentOptions}
        value={lkpDocument}
        onChange={setLkpDocument}
      />

      <PairFilter
        name="Account"
        mode={rdgAccount}
        onModeChange={(mode) => {
          setRdgAccount(mode);
          // the old form clears the account when the choice changes
          setLkpAccountID("");
        }}
        options={accountPairOptions}
        value={lkpAccountID}
        onChange={setLkpAccountID}
        // the same ID box width as every other ID + Name pair on the report pages
        firstWidth={190}
      />

      <PeriodFilter
        from={dtpFromDate}
        to={dtpToDate}
        onFromChange={setDtpFromDate}
        onToChange={setDtpToDate}
      />

      <PostStatusFilter options={postStatusOptions} value={lkpPostStatus} onChange={setLkpPostStatus} />

      <ReportPrintRow onPrint={() => void handlePrint()} disabled={printing} />
    </ReportForm>
  );
};

export default RptRVPVSumPage;
