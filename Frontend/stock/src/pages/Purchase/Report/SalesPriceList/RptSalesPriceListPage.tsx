import React, { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import { buildSalesPriceListPdf } from "./downloadSalesPriceListPdf";
import { saveFile } from "./saveFile";
import {
  buildHtml,
  printSalesPriceListReport,
  type PriceListReport,
} from "./PrintSalesPriceListReport";
import type { PairSelectOption } from "../../../../components/common/CustomLinkedPairSelect";
import { CustomRadio } from "../../../../components/common/ReportFormParts";
import {
  BranchOnlyFilter,
  PairFilter,
  ReportForm,
  ReportPrintRow,
} from "../../../../components/common/ReportFilters";
import Header from "../../../../components/common/Header";

type Option = { value: string; label: string };

// a branch of the list (the Branch | ID list: the name is the label, the ID the value)
type BranchOption = Option;

// the items and the item groups of the lookups
type LookupItem = { id: string; name: string; groupId?: string };

// one record as the two boxes of the pair filter: "ID | Name" in the ID box, "Name | ID" in the Name box
const toPairOptions = (list: LookupItem[]): PairSelectOption[] =>
  list.map((i) => ({ value: i.id, firstLabel: i.id, secondLabel: i.name }));

const API = `${import.meta.env.VITE_API_URL}/RptSalesPriceList`;

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

type RptSalesPriceListPageProps = {
  onClose?: () => void;
};

type Request = {
  branchId: string;
  groupMode: "One" | "All";
  groupId: string;
  itemMode: "One" | "Range" | "All";
  itemId: string;
  itemFrom: string;
  itemTo: string;
};

const RptSalesPriceListPage: React.FC<RptSalesPriceListPageProps> = ({
  onClose,
}) => {
  const [branchOptions, setBranchOptions] = useState<BranchOption[]>([]);
  const [branch, setBranch] = useState<BranchOption | null>(null); // lkpBranch
  const [reportFile, setReportFile] = useState("Excel"); // rdgReportFile
  const [busy, setBusy] = useState(false);

  // Item Group / Item filters
  const [itemGroups, setItemGroups] = useState<LookupItem[]>([]);
  const [items, setItems] = useState<LookupItem[]>([]);
  const [groupMode, setGroupMode] = useState<"One" | "All">("All"); // rdgItemGroup
  const [groupId, setGroupId] = useState<string | null>(null);
  const [itemMode, setItemMode] = useState<"One" | "Range" | "All">("All"); // rdgItem
  const [itemId, setItemId] = useState<string | null>(null);
  const [itemFrom, setItemFrom] = useState<string | null>(null);
  const [itemTo, setItemTo] = useState<string | null>(null);

  const groupPairOptions = useMemo(() => toPairOptions(itemGroups), [itemGroups]);

  // the Item lookups only list the items of the selected Item Group
  const itemChoices = useMemo(
    () =>
      groupMode === "One" && groupId
        ? items.filter((i) => i.groupId === groupId)
        : items,
    [items, groupMode, groupId],
  );

  const itemPairOptions = useMemo(() => toPairOptions(itemChoices), [itemChoices]);

  const handleGroupChange = (nextGroupId: string | null) => {
    setGroupId(nextGroupId);

    const nextItemChoices =
      groupMode === "One" && nextGroupId
        ? items.filter((item) => item.groupId === nextGroupId)
        : items;
    const hasItem = (id: string | null) =>
      id === null || nextItemChoices.some((item) => item.id === id);

    setItemId((id) => (hasItem(id) ? id : null));
    setItemFrom((id) => (hasItem(id) ? id : null));
    setItemTo((id) => (hasItem(id) ? id : null));
  };

  // print preview: shown after Print. Print there sends it to the printer,
  // Download saves the "Report File" choice (rdgReportFile)
  const [preview, setPreview] = useState<{
    report: PriceListReport;
    fileBase: string;
    request: Request;
  } | null>(null);

  // ------------------------------------------------------------
  // LOAD THE LOOKUPS (VB FillCombos); the first branch is selected
  // ------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await apiFetch(`${API}/lookups`);
        const data = await res.json();

        if (!res.ok || !data.success) {
          toast.error(data.message || "Failed to load the lookups");
          return;
        }
        if (cancelled) return;

        const options: BranchOption[] = (
          data.branches as { brId: string; brName: string }[]
        ).map((b) => ({
          value: b.brId,
          label: b.brName,
        }));

        setBranchOptions(options);
        setBranch(options[0] ?? null);

        setItemGroups(
          (data.itemGroups as { groupId: string; groupName: string }[]).map(
            (g) => ({ id: g.groupId, name: g.groupName }),
          ),
        );
        setItems(
          (
            data.items as {
              itemId: string;
              itemName: string;
              itemGroupId: string;
            }[]
          ).map((i) => ({
            id: i.itemId,
            name: i.itemName,
            groupId: i.itemGroupId,
          })),
        );
      } catch {
        if (!cancelled) toast.error("Failed to load the lookups");
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // gets the .xlsx made by the server (null after an error message)
  const fetchExcel = async (request: Request): Promise<Blob | null> => {
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
      toast.error(message);
      return null;
    }

    return res.blob();
  };

  // VB ValidateMe: returns the request, or null after showing the message
  const buildRequest = (): Request | null => {
    const warn = (message: string, focusId: string) => {
      toast.warning(message, { toastId: "pl-validate" });
      document.getElementById(focusId)?.focus();
      return null;
    };

    if (!branch) return warn("Please select 'Branch'", "lkpBranch");

    if (groupMode === "One" && !groupId) {
      return warn("Please select 'Item Group'", "lkpItemGroupID");
    }

    if (itemMode === "One" && !itemId) {
      return warn("Please select 'Item'", "lkpItemID");
    }
    if (itemMode === "Range") {
      if (!itemFrom) return warn("Please select 'From Item'", "lkpFromItem");
      if (!itemTo) return warn("Please select 'To Item'", "lkpToItem");
      if (itemFrom > itemTo) {
        return warn(
          "'To Item' should be greater than 'From Item'",
          "lkpToItem",
        );
      }
    }

    return {
      branchId: branch.value,
      groupMode,
      groupId: groupMode === "One" ? (groupId ?? "") : "",
      itemMode,
      itemId: itemMode === "One" ? (itemId ?? "") : "",
      itemFrom: itemMode === "Range" ? (itemFrom ?? "") : "",
      itemTo: itemMode === "Range" ? (itemTo ?? "") : "",
    };
  };

  // ------------------------------------------------------------
  // PRINT (VB cmdPrint_Click): validates, gets the report and shows the
  // Print Preview (Print = printer, Download = Excel / PDF file).
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
        toast.error(data.message || "Could not prepare the report");
        return;
      }

      setPreview({
        report: data.report,
        fileBase: data.fileBase,
        request,
      });
    } catch {
      toast.error("Could not prepare the report");
    } finally {
      setBusy(false);
    }
  };

  // Print in the preview: the browser print dialog (printer)
  const handlePreviewPrint = () => {
    if (!preview || busy) return;
    try {
      printSalesPriceListReport(preview.report);
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
    if (!preview || busy || downloading.current) return;
    downloading.current = true;
    const { report, fileBase, request } = preview;
    const asPdf = reportFile === "PDF";

    setBusy(true);
    try {
      const blob = asPdf ? await buildSalesPriceListPdf(report) : await fetchExcel(request);
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
      setBusy(false);
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
    setBranch(branchOptions[0] ?? null);
    setReportFile("Excel");
    setGroupMode("All");
    setGroupId(null);
    setItemMode("All");
    setItemId(null);
    setItemFrom(null);
    setItemTo(null);
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
    <ReportForm
      title="Sales Price List"
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
                    disabled={busy}
                    className="btn-style focus-visible:ring-2 focus-visible:ring-[#64d96e] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <u>P</u>rint
                  </button>
                  <button
                    id="btnPreviewOk"
                    type="button"
                    autoFocus
                    onClick={handlePreviewOk}
                    disabled={busy}
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
      <BranchOnlyFilter options={branchOptions} value={branch} onChange={setBranch} />

      <PairFilter
        name="Item Group"
        mode={groupMode === "One" ? "One Item Group" : "All Item Group"}
        onModeChange={(mode) => {
          const next = mode === "One Item Group" ? "One" : "All";
          setGroupMode(next);
          if (next === "All") setGroupId(null);
        }}
        options={groupPairOptions}
        value={groupId ?? ""}
        onChange={(id) => handleGroupChange(id || null)}
        // the same ID box width as the Item row below it, so the two Name boxes start at the same place
        firstWidth={190}
        ids={{ radio: "rdgItemGroup", first: "lkpItemGroupID", second: "lkpItemGroupName" }}
      />

      <PairFilter
        name="Item"
        mode={{ One: "One Item", Range: "Range Item", All: "All Item" }[itemMode]}
        onModeChange={(mode) => {
          const next = ({ "One Item": "One", "Range Item": "Range", "All Item": "All" } as const)[
            mode as "One Item" | "Range Item" | "All Item"
          ];
          setItemMode(next);
          if (next === "All") {
            setItemId(null);
            setItemFrom(null);
            setItemTo(null);
          }
        }}
        options={itemPairOptions}
        value={itemId ?? ""}
        onChange={(id) => setItemId(id || null)}
        // an Item ID can be long (ACCSS-1.5MM-CABLE)
        firstWidth={190}
        ids={{ radio: "rdgItem", first: "lkpItemID", second: "lkpItemName" }}
        range={{
          from: itemFrom ?? "",
          to: itemTo ?? "",
          onFromChange: (id) => setItemFrom(id || null),
          onToChange: (id) => setItemTo(id || null),
        }}
      />

      <ReportPrintRow onPrint={handlePrint} />
    </ReportForm>
  );
};

export default RptSalesPriceListPage;
