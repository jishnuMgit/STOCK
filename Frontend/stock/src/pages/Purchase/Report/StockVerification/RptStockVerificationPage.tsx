import React, { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { toast } from "react-toastify";
import ReportPreview from "../../../../components/common/ReportPreview";
import { buildStockVerificationPdf } from "../../../../components/Purchase/Report/RptStockVerification/RptStockVerificationPdf";
import {
  buildHtml,
  printStockVerificationReport,
  type PrintReport,
} from "../../../../components/Purchase/Report/RptStockVerification/RptStockVerificationPrintReport";
import { useEnterAsTab } from "../../../../hooks/useEnterAsTab";
import { useAltShortcuts } from "../../../../hooks/useAltShortcuts";
import { useCtrlShortcuts } from "../../../../hooks/useCtrlShortcuts";
import { useInitialFocus } from "../../../../hooks/useInitialFocus";
import type { PairSelectOption } from "../../../../components/common/CustomLinkedPairSelect";
import {
  BranchFilter,
  DateFilter,
  PairFilter,
  PostStatusFilter,
  ReportForm,
  ReportPrintRow,
} from "../../../../components/common/ReportFilters";
dayjs.extend(customParseFormat);

type Option = { value: string; label: string };

const DATE_FORMAT = "DD-MM-YYYY";

/* Replace these with data from your API */
const api = import.meta.env.VITE_API_URL;

// the Post Status and its codes - the same as the other reports: 0 All, 1 Posted, 2 Non Posted
const postStatusOptions: Option[] = [
  { value: "0", label: "All" },
  { value: "1", label: "Posted" },
  { value: "2", label: "Non Posted" },
];

type RptStockVerificationPageProps = {
  onClose?: () => void;
};

const RptStockVerificationPage: React.FC<RptStockVerificationPageProps> = ({ onClose }) => {
  // Enter moves on like Tab; the box the cursor is in is outlined; after a pick from a list the cursor
  // goes on
  const handleEnterAsTab = useEnterAsTab();

  // the lookups have been asked for (found or not): the cursor can start
  const [lookupsLoaded, setLookupsLoaded] = useState(false);

  const [rdgBranch, setRdgBranch] = useState("One Branch"); // rdgBranch
  const [lkpBranch, setLkpBranch] = useState<Option | null>(null); // lkpBranch

  // the branches the logged-in user has a right to, and the user's default branch
  const [branchOptions, setBranchOptions] = useState<Option[]>([]);
  const [defaultBranch, setDefaultBranch] = useState<Option | null>(null);

  // the item groups of the company
  const [groupRows, setGroupRows] = useState<
    { lkpItemGroupID: string; txtItemGroupName: string }[]
  >([]);

  useEffect(() => {
    const loadLookups = async () => {
      try {
        const response = await fetch(`${api}/RptStockVerification/lookups`, {
          credentials: "include",
        });
        const result = await response.json();

        if (!response.ok || !result.success) {
          toast.error(result.message || "Failed to load the Branches");
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
        setGroupRows(result.groups || []);
      } catch (error: unknown) {
        console.error("rptStockVerification lookups error:", error);
        toast.error("Cannot connect to the Stock Verification API.");
      }
    };

    loadLookups().finally(() => setLookupsLoaded(true));
  }, []);

  const [rdgItemGroup, setRdgItemGroup] = useState("One Item Group"); // rdgItemGroup
  // one item group: the Group ID box and the Group Name box show the same choice
  const [lkpOneItemGroupID, setLkpOneItemGroupID] = useState(""); // lkpOneItemGroupID / lkpOneItemGroupName

  // All is what the old form starts with
  const [lkpPostStatus, setLkpPostStatus] = useState<Option | null>(
    postStatusOptions[0],
  ); // lkpPostStatus

  // the date the stock is counted as on (starts as today)
  const [dtpAsOnDate, setDtpAsOnDate] = useState(dayjs().format(DATE_FORMAT)); // dtpAsOnDate

  // the Print Preview: the report the server sent, the name of the file, and what it was made from
  // (the Excel file is made from the same values)
  const [preview, setPreview] = useState<{
    report: PrintReport;
    fileBase: string;
    params: Record<string, unknown>;
  } | null>(null);
  const [printing, setPrinting] = useState(false);

  // the group boxes: one list, "ID | Name" in the ID box and "Name | ID" in the Name box
  const groupPairOptions = useMemo<PairSelectOption[]>(
    () =>
      groupRows.map((row) => ({
        value: row.lkpItemGroupID,
        firstLabel: row.lkpItemGroupID,
        secondLabel: row.txtItemGroupName,
      })),
    [groupRows],
  );

  // what the server takes: the element ids of the page, the radios as their codes
  const buildStockVerificationParams = () => ({
    rdgBranch: rdgBranch === "One Branch" ? 0 : 1,
    lkpBranch: rdgBranch === "One Branch" ? (lkpBranch?.value ?? "") : "",
    rdgItemGroup: rdgItemGroup === "One Item Group" ? 0 : 1,
    lkpOneItemGroupID: rdgItemGroup === "One Item Group" ? lkpOneItemGroupID : "",
    lkpPostStatus: Number(lkpPostStatus?.value ?? "0"),
    dtpAsOnDate: dayjs(dtpAsOnDate, DATE_FORMAT, true).isValid()
      ? dayjs(dtpAsOnDate, DATE_FORMAT).format("YYYY-MM-DD")
      : "",
  });

  // Print (the old cmdPrint): the checks of the old form, then the server sends the report and the Print
  // Preview opens (Print = the browser's print window, Download = Excel / PDF)
  const handlePrint = async () => {
    if (printing || preview) return;

    const warn = (message: string, id: string) => {
      toast.warning(message);
      document.getElementById(id)?.focus();
    };

    const params = buildStockVerificationParams();

    if (params.rdgBranch === 0 && !params.lkpBranch) {
      return warn("Please select 'Branch'", "lkpBranch");
    }

    if (params.rdgItemGroup === 0 && !params.lkpOneItemGroupID) {
      return warn("Please select 'Item Group ID'", "lkpOneItemGroupID");
    }

    if (!params.dtpAsOnDate) {
      return warn("Please enter 'Date'", "dtpAsOnDate");
    }

    setPrinting(true);

    try {
      const response = await fetch(`${api}/RptStockVerification/print`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        toast.warning(result.message || "The Stock Verification report could not be printed.");
        if (result.field) document.getElementById(result.field)?.focus();
        return;
      }

      setPreview({ report: result.report, fileBase: result.fileBase, params });
    } catch (error: unknown) {
      console.error("rptStockVerification print error:", error);
      toast.error("Cannot connect to the Stock Verification API.");
    } finally {
      setPrinting(false);
    }
  };

  // the Excel file of the Print Preview, made by the server (null after an error)
  const fetchExcel = async (): Promise<Blob | null> => {
    if (!preview) return null;

    const response = await fetch(`${api}/RptStockVerification/excel`, {
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

      toast.error(message);
      return null;
    }

    return response.blob();
  };

  const handleClose = () => {
    setRdgBranch("One Branch");
    setLkpBranch(defaultBranch);
    setRdgItemGroup("One Item Group");
    setLkpOneItemGroupID("");
    setLkpPostStatus(postStatusOptions[0]);
    setDtpAsOnDate(dayjs().format(DATE_FORMAT));
    onClose?.();
  };

  // the cursor starts on the Branch box
  useInitialFocus(lookupsLoaded, "lkpBranch");

  // Alt+P -> Print, Alt+C -> Close (the underlined letters on the buttons)
  useAltShortcuts({
    p: handlePrint,
    c: handleClose,
  });

  // Ctrl+P -> Print (the old forms' Ctrl+P). With the Print Preview open it prints the report that is shown.
  useCtrlShortcuts({
    p: () => (preview ? printStockVerificationReport(preview.report) : handlePrint()),
  });

  return (
    <ReportForm
      title="Stock Verification"
      onKeyDown={handleEnterAsTab}
      overlay={
        // the Print Preview (after Print)
        preview && (
          <ReportPreview
            showClose={false}
            html={buildHtml(preview.report)}
            fileBase={preview.fileBase}
            onPrint={() => printStockVerificationReport(preview.report)}
            buildPdf={() => buildStockVerificationPdf(preview.report)}
            fetchExcel={fetchExcel}
            onClose={() => setPreview(null)}
          />
        )
      }
    >
      <BranchFilter
        mode={rdgBranch}
        onModeChange={setRdgBranch}
        options={branchOptions}
        value={lkpBranch}
        onChange={setLkpBranch}
      />

      <PairFilter
        name="Item Group"
        mode={rdgItemGroup}
        onModeChange={setRdgItemGroup}
        options={groupPairOptions}
        value={lkpOneItemGroupID}
        onChange={setLkpOneItemGroupID}
        ids={{ radio: "rdgItemGroup", first: "lkpOneItemGroupID", second: "lkpOneItemGroupName" }}
      />

      <DateFilter label="As On Date" id="dtpAsOnDate" value={dtpAsOnDate} onChange={setDtpAsOnDate} />

      <PostStatusFilter options={postStatusOptions} value={lkpPostStatus} onChange={setLkpPostStatus} />

      <ReportPrintRow onPrint={handlePrint} />
    </ReportForm>
  );
};

export default RptStockVerificationPage;