import React, { useEffect, useMemo, useState } from "react";
import { useEnterAsTab } from "../../../../hooks/useEnterAsTab";
import { useAltShortcuts } from "../../../../hooks/useAltShortcuts";
import { useCtrlShortcuts } from "../../../../hooks/useCtrlShortcuts";
import { useInitialFocus } from "../../../../hooks/useInitialFocus";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import type { PairSelectOption } from "../../../../components/common/CustomLinkedPairSelect";
import {
  BranchFilter,
  DateFilter,
  PairFilter,
  PostStatusFilter,
  ReportForm,
  ReportPrintRow,
} from "../../../../components/common/ReportFilters";
import ReportPreview from "../../../../components/common/ReportPreview";
import { buildStockValuationPdf } from "../../../../components/Purchase/Report/RptStockValuation/RptStockValuationPdf";
import {
  buildHtml,
  printStockValuationReport,
  type PrintReport,
} from "../../../../components/Purchase/Report/RptStockValuation/RptStockValuationPrintReport";
import { useMessageModal } from "../../../../hooks/useMessageModal";
dayjs.extend(customParseFormat);

type Option = { value: string; label: string };

const DATE_FORMAT = "DD-MM-YYYY";

/* Replace these with data from your API */
const api = import.meta.env.VITE_API_URL;

// the Post Status and its codes - the same as the Stock report: 0 All, 1 Posted, 2 Non Posted
const postStatusOptions: Option[] = [
  { value: "0", label: "All" },
  { value: "1", label: "Posted" },
  { value: "2", label: "Non Posted" },
];

type RptStockValuationPageProps = {
  onClose?: () => void;
};

const RptStockValuationPage: React.FC<RptStockValuationPageProps> = ({ onClose }) => {
  const { notify, dialog: messageDialog } = useMessageModal();
  // Enter moves on like Tab; the box the cursor is in is outlined; after a pick from a list the
  // cursor goes on
  const handleEnterAsTab = useEnterAsTab();

  // the lookups have been asked for (found or not): the cursor can start
  const [lookupsLoaded, setLookupsLoaded] = useState(false);

  const [rdgBranch, setRdgBranch] = useState("One Branch"); // rdgBranch
  const [lkpBranch, setLkpBranch] = useState<Option | null>(null); // lkpBranch

  // the branches the logged-in user has a right to, and the user's default branch
  const [branchOptions, setBranchOptions] = useState<Option[]>([]);
  const [defaultBranch, setDefaultBranch] = useState<Option | null>(null);

  // Selected Branch: the ticked branches (their ids)
  const [chkBranch, setChkBranch] = useState<string[]>([]); // chkBranch

  // the item groups of the company
  const [groupRows, setGroupRows] = useState<
    { lkpItemGroupID: string; txtItemGroupName: string }[]
  >([]);

  useEffect(() => {
    const loadLookups = async () => {
      try {
        const response = await fetch(`${api}/RptStockValuation/lookups`, {
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
        setGroupRows(result.groups || []);
      } catch (error: unknown) {
        console.error("rptStockValuation lookups error:", error);
        notify.error("Cannot connect to the Stock Valuation API.");
      }
    };

    loadLookups().finally(() => setLookupsLoaded(true));
  }, []);

  const handleBranchTick = (branchId: string, checked: boolean) => {
    setChkBranch((current) =>
      checked ? [...current, branchId] : current.filter((id) => id !== branchId),
    );
  }; // lkpBranch

  const [rdgItemGroup, setRdgItemGroup] = useState("One Item Group"); // rdgItemGroup
  // one item group: the Group ID box and the Group Name box show the same choice
  const [lkpOneItemGroupID, setLkpOneItemGroupID] = useState(""); // lkpOneItemGroupID / lkpOneItemGroupName

  // Posted is what the old form starts with
  const [lkpPostStatus, setLkpPostStatus] = useState<Option | null>(
    postStatusOptions[1],
  ); // lkpPostStatus

  // the date the stock is shown as on (starts as today)
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
  const buildStockValuationParams = () => ({
    rdgBranch: ({ "One Branch": 0, "Selected Branch": 1, "All Branch": 2 } as Record<string, number>)[
      rdgBranch
    ],
    lkpBranch: rdgBranch === "One Branch" ? (lkpBranch?.value ?? "") : "",
    chkBranch: rdgBranch === "Selected Branch" ? chkBranch : [],
    rdgItemGroup: rdgItemGroup === "One Item Group" ? 0 : 1,
    lkpOneItemGroupID: rdgItemGroup === "One Item Group" ? lkpOneItemGroupID : "",
    lkpPostStatus: Number(lkpPostStatus?.value ?? "1"),
    dtpAsOnDate: dayjs(dtpAsOnDate, DATE_FORMAT, true).isValid()
      ? dayjs(dtpAsOnDate, DATE_FORMAT).format("YYYY-MM-DD")
      : "",
    PstrYear: localStorage.getItem("PstrYear") ?? "",
  });

  // Print (the old cmdPrint): the checks of the old form, then the server sends the report and
  // the Print Preview opens (Print = the browser's print window, Download = Excel / PDF)
  const handlePrint = async () => {
    if (printing || preview) return;

    const warn = (message: string, id: string) => {
      notify.warning(message);

      // a box, or (Selected Branch) the first tick box of the list
      const element = document.getElementById(id);
      (element?.querySelector("input") ?? element)?.focus();
    };

    const params = buildStockValuationParams();

    if (params.rdgBranch === 0 && !params.lkpBranch) {
      return warn("Please select 'Branch'", "lkpBranch");
    }

    if (params.rdgBranch === 1 && params.chkBranch.length === 0) {
      return warn("Please select atleast one 'Branch'", "chkBranchList");
    }

    if (params.rdgItemGroup === 0 && !params.lkpOneItemGroupID) {
      return warn("Please select 'Item Group ID'", "lkpOneItemGroupID");
    }

    if (!params.dtpAsOnDate) {
      return warn("Please enter 'Date'", "dtpAsOnDate");
    }

    setPrinting(true);

    try {
      const response = await fetch(`${api}/RptStockValuation/print`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        notify.warning(result.message || "The Stock Valuation report could not be printed.");
        if (result.field) document.getElementById(result.field)?.focus();
        return;
      }

      setPreview({ report: result.report, fileBase: result.fileBase, params });
    } catch (error: unknown) {
      console.error("rptStockValuation print error:", error);
      notify.error("Cannot connect to the Stock Valuation API.");
    } finally {
      setPrinting(false);
    }
  };

  // the Excel file of the Print Preview, made by the server (null after an error)
  const fetchExcel = async (): Promise<Blob | null> => {
    if (!preview) return null;

    const response = await fetch(`${api}/RptStockValuation/excel`, {
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
    setRdgItemGroup("One Item Group");
    setLkpOneItemGroupID("");
    setLkpPostStatus(postStatusOptions[1]);
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
    p: () => (preview ? printStockValuationReport(preview.report) : handlePrint()),
  });

  return (
    <ReportForm
      title="Stock Valuation"
      onKeyDown={handleEnterAsTab}
      overlay={
        // the Print Preview (after Print)
        preview && (
          <ReportPreview
            showClose={false}
            html={buildHtml(preview.report)}
            fileBase={preview.fileBase}
            onPrint={() => printStockValuationReport(preview.report)}
            buildPdf={() => buildStockValuationPdf(preview.report)}
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

      <PairFilter
        name="Item Group"
        mode={rdgItemGroup}
        onModeChange={setRdgItemGroup}
        options={groupPairOptions}
        value={lkpOneItemGroupID}
        onChange={setLkpOneItemGroupID}
        // the same ID box width as every other ID + Name pair on the report pages
        firstWidth={190}
        ids={{ radio: "rdgItemGroup", first: "lkpOneItemGroupID", second: "lkpOneItemGroupName" }}
      />

      <DateFilter label="As On Date" id="dtpAsOnDate" value={dtpAsOnDate} onChange={setDtpAsOnDate} />

      <PostStatusFilter options={postStatusOptions} value={lkpPostStatus} onChange={setLkpPostStatus} />

      <ReportPrintRow onPrint={handlePrint} />
    </ReportForm>
  );
};

export default RptStockValuationPage;