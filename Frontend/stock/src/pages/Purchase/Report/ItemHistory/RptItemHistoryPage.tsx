import React, { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import ReportPreview from "../../../../components/common/ReportPreview";
import { buildItemHistoryPdf } from "../../../../components/Purchase/Report/RptItemHistory/RptItemHistoryPdf";
import {
  buildHtml,
  printItemHistoryReport,
  type PrintReport,
} from "../../../../components/Purchase/Report/RptItemHistory/RptItemHistoryRpt";
import type { PairSelectOption } from "../../../../components/common/CustomLinkedPairSelect";
import {
  BranchFilter,
  DateFilter,
  PairFilter,
  ReportForm,
  ReportPrintRow,
} from "../../../../components/common/ReportFilters";
import { useEnterAsTab } from "../../../../hooks/useEnterAsTab";
import { useMessageModal } from "../../../../hooks/useMessageModal";

dayjs.extend(customParseFormat);

type Option = { value: string; label: string };

type Branch = { brId: string; brName: string };

type Item = {
  itemId: string;
  itemName: string;
  brId: string;
  packing: string;
  inactive: boolean;
};

const DATE_FORMAT = "DD-MM-YYYY";

const API = `${import.meta.env.VITE_API_URL}/RptItemHistory`;

type ItemHistoryRequest = {
  allBranches: boolean;
  branchId: string;
  itemId: string;
  asOnDate: string; // DD/MM/YYYY
};

// Sends the login cookie, and the company / user kept at sign-in as a stopgap
// (the server uses its session first and only falls back to these).
// TODO: if your pages send a token, add the same Authorization header here,
// then delete the coId / userId part.
const apiFetch = (url: string, init: RequestInit = {}) => {
  const coId = localStorage.getItem("PstrCoID") ?? "";
  const userId = localStorage.getItem("PstrUserID") ?? "";
  const sep = url.includes("?") ? "&" : "?";

  return fetch(
    `${url}${sep}coId=${encodeURIComponent(coId)}&userId=${encodeURIComponent(userId)}`,
    { credentials: "include", ...init },
  );
};

type ItemOption = Option & { id: string; name: string };

// one record as the two boxes of the pair filter: "ID | Name" in the ID box, "Name | ID" in the Name box
const toPairOptions = (list: ItemOption[]): PairSelectOption[] =>
  list.map((o) => ({ value: o.value, firstLabel: o.id, secondLabel: o.name }));

type RptItemHistoryPageProps = {
  onClose?: () => void;
};

const RptItemHistoryPage: React.FC<RptItemHistoryPageProps> = ({ onClose }) => {
  const { notify, dialog: messageDialog } = useMessageModal();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [printing, setPrinting] = useState(false);

  // rdgReportFile (inside the Print Preview): what Download saves

  // print preview: shown after Print. Print there sends it to the printer,
  // Download saves the "Report File" choice
  const [preview, setPreview] = useState<{
    report: PrintReport;
    fileBase: string;
    request: ItemHistoryRequest;
  } | null>(null);

  // Enter moves on like Tab; after a pick from a list the cursor goes on (the common template's boxes do it)
  const handleEnterAsTab = useEnterAsTab();

  const [branchMode, setBranchMode] = useState("One Branch"); // optBranch
  const [branch, setBranch] = useState<ItemOption | null>(null); // lkpBranch
  const [itemId, setItemId] = useState<string | null>(null); // lkpItemID / lkpItemName
  const [asOnDate, setAsOnDate] = useState(() => dayjs().format(DATE_FORMAT)); // dtpAsOnDate

  // ------------------------------------------------------------
  // OPTIONS FROM THE SERVER
  // ------------------------------------------------------------
  const branchOptions: ItemOption[] = useMemo(
    () =>
      branches.map((b) => ({
        value: b.brId,
        label: b.brName,
        id: b.brId,
        name: b.brName,
      })),
    [branches],
  );

  // each item once (the lookup has one row per item and branch)
  const uniqueItems = useMemo(() => {
    const map = new Map<string, Item>();
    items.forEach((i) => {
      if (!map.has(i.itemId)) map.set(i.itemId, i);
    });
    return [...map.values()];
  }, [items]);

  const collator = useMemo(
    () => new Intl.Collator(undefined, { numeric: true, sensitivity: "base" }),
    [],
  );

  // lkpItemID: sorted by item id
  const itemIdOptions: ItemOption[] = useMemo(
    () =>
      [...uniqueItems]
        .sort((a, b) => collator.compare(a.itemId, b.itemId))
        .map((i) => ({
          value: i.itemId,
          label: i.itemId,
          id: i.itemId,
          name: i.itemName,
        })),
    [uniqueItems, collator],
  );

  // lkpItemName: sorted by item name (item id breaks ties)
  // the pair boxes' list
  const itemPairOptions = useMemo(() => toPairOptions(itemIdOptions), [itemIdOptions]);

  const canUseAllBranches = branches.length > 1;

  // ------------------------------------------------------------
  // LOAD BRANCHES + ITEMS (VB FillCombos)
  // ------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await apiFetch(`${API}/lookups`);
        const data = await res.json();

        if (!res.ok || !data.success) {
          notify.error(data.message || "Failed to load branches and items");
          return;
        }
        if (cancelled) return;

        const list = data.branches as Branch[];
        setBranches(list);
        setItems(data.items as Item[]);
        // the first branch is the default
        setBranch(
          list[0]
            ? {
              value: list[0].brId,
              label: list[0].brName,
              id: list[0].brId,
              name: list[0].brName,
            }
            : null,
        );
      } catch {
        if (!cancelled) notify.error("Failed to load branches and items");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // ------------------------------------------------------------
  // VB ValidateMe: returns the request, or null after showing the message
  // ------------------------------------------------------------
  const buildRequest = (): ItemHistoryRequest | null => {
    const oneBranch = branchMode === "One Branch";

    if (oneBranch && !branch) {
      notify.warning("Please select 'Branch'");
      document.getElementById("lkpBranch")?.focus();
      return null;
    }

    if (!itemId) {
      notify.warning("Please select an Item");
      document.getElementById("lkpItemID")?.focus();
      return null;
    }

    if (!asOnDate || !dayjs(asOnDate, DATE_FORMAT, true).isValid()) {
      notify.warning("Please select Date");
      document.getElementById("dtpAsOnDate")?.focus();
      return null;
    }

    return {
      allBranches: !oneBranch,
      branchId: oneBranch ? (branch?.value ?? "") : "",
      itemId,
      asOnDate: asOnDate.replace(/-/g, "/"), // DD-MM-YYYY -> DD/MM/YYYY
    };
  };

  // gets the .xlsx made by the server (null after an error message)
  const fetchExcel = async (
    request: ItemHistoryRequest,
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
    setItemId(null);
    setAsOnDate(dayjs().format(DATE_FORMAT));
    setPreview(null);
    if (onClose) onClose();
    else window.history.back();
  };

  // Alt+P prints, Alt+C closes (Ctrl+P / Ctrl+L of the old form clash with the
  // browser). Re-attached every render so it always sees the latest state.
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
    <ReportForm
      title="Item History"
      onKeyDown={handleEnterAsTab}
      overlay={
        // the Print Preview (after Print)
        preview && (
          <ReportPreview
            showClose={false}
            html={buildHtml(preview.report)}
            fileBase={preview.fileBase}
            onPrint={() => printItemHistoryReport(preview.report)}
            buildPdf={() => buildItemHistoryPdf(preview.report)}
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
        onChange={(option) =>
          setBranch(option ? (branchOptions.find((b) => b.value === option.value) ?? null) : null)
        }
        allDisabled={!canUseAllBranches}
      />

      {/* the item is always needed: "Item :" and the two boxes */}
      <PairFilter
        required
        name="Item"
        mode="One Item"
        onModeChange={() => {}}
        options={itemPairOptions}
        value={itemId ?? ""}
        onChange={(id) => setItemId(id || null)}
        // an Item ID can be long (ACCSS-1.5MM-CABLE)
        firstWidth={190}
      />

      <DateFilter label="As On Date" id="dtpAsOnDate" value={asOnDate} onChange={setAsOnDate} />

      <ReportPrintRow onPrint={handlePrint} disabled={loading || printing} />
    </ReportForm>
  );
};

export default RptItemHistoryPage;
