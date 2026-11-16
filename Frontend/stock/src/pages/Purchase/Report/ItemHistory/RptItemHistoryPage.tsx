import React, { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { buildItemHistoryPdf } from "./downloadItemHistoryPdf";
import { saveFile } from "./saveFile";
import {
  buildHtml,
  printItemHistoryReport,
  type PrintReport,
} from "./printItemHistoryReport";
import type { PairSelectOption } from "../../../../components/common/CustomLinkedPairSelect";
import { CustomRadio } from "../../../../components/common/ReportFormParts";
import {
  BranchFilter,
  DateFilter,
  PairFilter,
  ReportForm,
  ReportPrintRow,
} from "../../../../components/common/ReportFilters";
import { useEnterAsTab } from "../../../../hooks/useEnterAsTab";
import Header from "../../../../components/common/Header";

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
  const [branches, setBranches] = useState<Branch[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [printing, setPrinting] = useState(false);

  // rdgReportFile (inside the Print Preview): what Download saves
  const [reportFile, setReportFile] = useState("Excel"); // "Excel" | "PDF"

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
          toast.error(data.message || "Failed to load branches and items");
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
        if (!cancelled) toast.error("Failed to load branches and items");
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
      toast.warning("Please select 'Branch'", { toastId: "ih-branch" });
      document.getElementById("lkpBranch")?.focus();
      return null;
    }

    if (!itemId) {
      toast.warning("Please select an Item", { toastId: "ih-item" });
      document.getElementById("lkpItemID")?.focus();
      return null;
    }

    if (!asOnDate || !dayjs(asOnDate, DATE_FORMAT, true).isValid()) {
      toast.warning("Please select Date", { toastId: "ih-date" });
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
      toast.error(message);
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
        toast.error(data.message || "Could not prepare the report");
        return;
      }

      setPreview({ report: data.report, fileBase: data.fileBase, request });
    } catch {
      toast.error("Could not prepare the report");
    } finally {
      setPrinting(false);
    }
  };

  // Print in the preview: the browser print dialog (printer)
  const handlePreviewPrint = () => {
    if (!preview || printing) return;
    try {
      printItemHistoryReport(preview.report);
    } catch {
      toast.error("Could not open the print view");
    }
  };

  // Download in the preview: saves the chosen file ("Save as" window, so the
  // browser does not open it afterwards)
  // a double click must not start two saves (state is not updated yet on the
  // second click, so a ref is used)
  const downloading = useRef(false);

  const handlePreviewOk = async () => {
    if (!preview || printing || downloading.current) return;
    downloading.current = true;
    const { report, fileBase, request } = preview;
    const asPdf = reportFile === "PDF";

    setPrinting(true);
    try {
      const blob = asPdf ? await buildItemHistoryPdf(report) : await fetchExcel(request);
      if (!blob) return; // the error is already shown

      const kind = asPdf ? "pdf" : "xlsx";
      const saved = await saveFile(blob, `${fileBase}.${kind}`, kind);
      if (saved) {
       
        toast.success(asPdf ? "PDF file downloaded" : "Excel file downloaded");
         setPreview(null); // cancelled "Save as": the preview stays
      }
    } catch {
      toast.error(
        asPdf ? "Could not create the PDF file" : "Could not create the Excel file",
      );
    } finally {
      downloading.current = false;
      setPrinting(false);
    }
  };

  const previewHtml = useMemo(
    () =>
      preview
        ? // 40px left / 20px right margin for the preview only
        buildHtml(preview.report).replace(
          "</head>",
          "<style>body{padding-left:40px;padding-right:20px}</style></head>",
        )
        : "",
    [preview],
  );

  const handleClose = () => {
    setBranchMode("One Branch");
    setBranch(branchOptions[0] ?? null);
    setItemId(null);
    setAsOnDate(dayjs().format(DATE_FORMAT));
    setReportFile("Excel");
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
        // Print preview
        preview && (

          <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/40 p-4">
            <div className="flex h-[90vh] w-full max-w-250 flex-col overflow-hidden border border-gray-400 bg-white shadow-xl">
              <Header Name="Print Preview" />

              <iframe
                title="Print Preview"
                srcDoc={previewHtml}
                className="min-h-0 flex-1 border-0 bg-white"
              />

              <footer className="flex shrink-0 flex-wrap items-center justify-center gap-4 border-t border-[#e0e5ea] px-3 py-4">
                <div className="flex gap-3">
                  <button
                    id="btnPreviewPrint"
                    type="button"
                    onClick={handlePreviewPrint}
                    disabled={printing}
                    className="btn-style focus-visible:ring-2 focus-visible:ring-[#64d96e] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <u>P</u>rint
                  </button>
                  <button
                    id="btnPreviewOk"
                    type="button"
                    autoFocus
                    onClick={handlePreviewOk}
                    disabled={printing}
                    className="btn-style focus-visible:ring-2 focus-visible:ring-[#64d96e] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <u>D</u>ownload
                  </button>
                </div>

                {/* Report File: what Download saves */}
                <div
                  id="rdgReportFile"
                  className="relative flex items-center gap-5 border border-[#e0e5ea] bg-white px-10.5 py-2.5"
                >
                  <span className="absolute -top-2.5 left-2.5 bg-white px-1 text-[13px] text-[#405066]">
                    File Format
                  </span>
                  <CustomRadio
                    name="rdgReportFile"
                    value="Excel"
                    label="Excel"
                    checked={reportFile === "Excel"}
                    onChange={() => setReportFile("Excel")}
                  />
                  <CustomRadio
                    name="rdgReportFile"
                    value="PDF"
                    label="PDF"
                    checked={reportFile === "PDF"}
                    onChange={() => setReportFile("PDF")}
                  />
                </div>
              </footer>
            </div>
          </div>
        )
      }
    >
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
