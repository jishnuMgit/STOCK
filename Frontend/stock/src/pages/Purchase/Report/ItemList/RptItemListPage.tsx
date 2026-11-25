import React, { useEffect, useMemo, useRef, useState } from "react";
import { buildItemListPdf } from "./downloadItemListPdf";
import { saveFile } from "./saveFile";
import {
  buildHtml,
  printItemListReport,
  type PrintReport,
} from "./printItemListReport";
import type { PairSelectOption } from "../../../../components/common/CustomLinkedPairSelect";
import { CustomRadio, RadioPanel } from "../../../../components/common/ReportFormParts";
import {
  BranchFilter,
  FilterRow,
  PairFilter,
  ReportForm,
  ReportPrintRow,
} from "../../../../components/common/ReportFilters";
import { useEnterAsTab } from "../../../../hooks/useEnterAsTab";
import Header from "../../../../components/common/Header";
import { useMessageModal } from "../../../../hooks/useMessageModal";

type Option = { value: string; label: string };

type Branch = { brId: string; brName: string };
type Group = { groupId: string; groupName: string };
type Item = { itemId: string; itemName: string; groupId?: string };

type ItemListRequest = {
  allBranches: boolean;
  branchId: string;
  allGroups: boolean;
  groupId: string;
  itemMode: number;
  itemId: string;
  fromItemId: string;
  toItemId: string;
  status: number;
  salesBelowCost: boolean;
};

const API = `${import.meta.env.VITE_API_URL}/RptItemList`;

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

// ---- two-column lookup list (Item ID | Item Name, like the grid lookups) ----
type ItemOption = Option & { id: string; name: string };

// one record as the two boxes of the pair filter: "ID | Name" in the ID box, "Name | ID" in the Name box
const toPairOptions = (list: ItemOption[]): PairSelectOption[] =>
  list.map((o) => ({ value: o.value, firstLabel: o.id, secondLabel: o.name }));

type RptItemListPageProps = {
  onClose?: () => void;
};

const RptItemListPage: React.FC<RptItemListPageProps> = ({ onClose }) => {
  const { notify, dialog: messageDialog } = useMessageModal();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [groupsById, setGroupsById] = useState<Group[]>([]);
  const [itemsById, setItemsById] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [printing, setPrinting] = useState(false);

  // rdgReportFile (inside the Print Preview): what Download saves
  const [reportFile, setReportFile] = useState("Excel"); // "Excel" | "PDF"

  // print preview: shown after Print. Print there sends it to the printer,
  // Download saves the "Report File" choice
  const [preview, setPreview] = useState<{
    report: PrintReport;
    fileBase: string;
    request: ItemListRequest;
  } | null>(null);

  const [branchMode, setBranchMode] = useState("One Branch"); // rdgBranch
  const [branch, setBranch] = useState<ItemOption | null>(null); // lkpBranch

  const [statusMode, setStatusMode] = useState("Active"); // rdgItemStatus

  // VB Activated: All Category, All Item
  const [groupMode, setGroupMode] = useState("All Item Group"); // rdgCategory
  const [groupId, setGroupId] = useState<string | null>(null); // lkpItemGroupID / Name
  const [salesBelowCost, setSalesBelowCost] = useState(false); // chkSalesBelowCost

  const [itemMode, setItemMode] = useState("All Item"); // rdgItem
  const [itemId, setItemId] = useState<string | null>(null); // lkpItemID / Name
  const [fromItem, setFromItem] = useState<ItemOption | null>(null); // lkpItemIDFrom
  const [toItem, setToItem] = useState<ItemOption | null>(null); // lkpItemIDTo

  // Enter moves on like Tab; after a pick from a list the cursor goes on (the common template's boxes do it)
  const handleEnterAsTab = useEnterAsTab();

  // ------------------------------------------------------------
  // OPTIONS FROM THE SERVER
  // ------------------------------------------------------------
  const collator = useMemo(
    () => new Intl.Collator(undefined, { numeric: true, sensitivity: "base" }),
    [],
  );

  const uniqueBy = <T,>(list: T[], key: (t: T) => string): T[] => {
    const seen = new Set<string>();
    return list.filter((x) => {
      const k = key(x);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  };

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

  // lkpItemGroupID: by id / lkpItemGroupName: by name
  const groupIdOptions: ItemOption[] = useMemo(
    () =>
      uniqueBy(groupsById, (g) => g.groupId)
        .sort((a, b) => collator.compare(a.groupId, b.groupId))
        .map((g) => ({
          value: g.groupId,
          label: g.groupId,
          id: g.groupId,
          name: g.groupName,
        })),
    [groupsById, collator],
  );

  // the item lookups only list the items of the selected Item Group
  const groupFilter = groupMode === "One Item Group" && groupId ? groupId : null;

  const scopedItemsById = useMemo(
    () =>
      groupFilter ? itemsById.filter((i) => i.groupId === groupFilter) : itemsById,
    [itemsById, groupFilter],
  );
  // lkpItemID: by id / lkpItemName: by name (each item once)
  const itemIdOptions: ItemOption[] = useMemo(
    () =>
      uniqueBy(scopedItemsById, (i) => i.itemId)
        .sort((a, b) => collator.compare(a.itemId, b.itemId))
        .map((i) => ({
          value: i.itemId,
          label: i.itemId,
          id: i.itemId,
          name: i.itemName,
        })),
    [scopedItemsById, collator],
  );

  const handleGroupChange = (nextGroupId: string | null) => {
    setGroupId(nextGroupId);

    if (groupMode !== "One Item Group" || !nextGroupId) return;

    const nextGroupItems = itemsById.filter(
      (item) => item.groupId === nextGroupId,
    );
    const hasItem = (id: string | null | undefined) =>
      !id || nextGroupItems.some((item) => item.itemId === id);

    setItemId((id) => (hasItem(id) ? id : null));
    setFromItem((item) => (hasItem(item?.value) ? item : null));
    setToItem((item) => (hasItem(item?.value) ? item : null));
  };

  // the pair boxes' lists
  const groupPairOptions = useMemo(() => toPairOptions(groupIdOptions), [groupIdOptions]);
  const itemPairOptions = useMemo(() => toPairOptions(itemIdOptions), [itemIdOptions]);

  const canUseAllBranches = branches.length > 1;

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

        const list = data.branches as Branch[];
        setBranches(list);
        setGroupsById(data.groupsById as Group[]);
        setItemsById(data.itemsById as Item[]);
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
        if (!cancelled) notify.error("Failed to load the lookups");
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
  const buildRequest = (): ItemListRequest | null => {
    const oneBranch = branchMode === "One Branch";
    const oneGroup = groupMode === "One Item Group";

    if (oneBranch && !branch) {
      notify.warning("Please select 'Branch'");
      document.getElementById("lkpBranch")?.focus();
      return null;
    }
    if (oneGroup && !groupId) {
      notify.warning("Please select 'Item Group'");
      document.getElementById("lkpItemGroupID")?.focus();
      return null;
    }
    if (itemMode === "One Item" && !itemId) {
      notify.warning("Please select 'Item ID'");
      document.getElementById("lkpItemID")?.focus();
      return null;
    }
    if (itemMode === "Range Item") {
      if (!fromItem) {
        notify.warning("Please select 'Item ID From'");
        document.getElementById("lkpFromItem")?.focus();
        return null;
      }
      if (!toItem) {
        notify.warning("Please select 'Item ID To'");
        document.getElementById("lkpToItem")?.focus();
        return null;
      }
    }

    return {
      allBranches: !oneBranch,
      branchId: oneBranch ? (branch?.value ?? "") : "",
      allGroups: !oneGroup,
      groupId: oneGroup ? (groupId ?? "") : "",
      itemMode: { "One Item": 0, "Range Item": 1, "All Item": 2 }[itemMode] ?? 2,
      itemId: itemMode === "One Item" ? (itemId ?? "") : "",
      fromItemId: itemMode === "Range Item" ? (fromItem?.value ?? "") : "",
      toItemId: itemMode === "Range Item" ? (toItem?.value ?? "") : "",
      status: { Active: 0, Inactive: 1, Hide: 2 }[statusMode] ?? 0,
      salesBelowCost,
    };
  };

  // gets the .xlsx made by the server (null after an error message)
  const fetchExcel = async (request: ItemListRequest): Promise<Blob | null> => {
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

  // Print in the preview: the browser print dialog (printer)
  const handlePreviewPrint = () => {
    if (!preview || printing) return;
    try {
      printItemListReport(preview.report);
    } catch {
      notify.error("Could not open the print view");
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
      const blob = asPdf ? await buildItemListPdf(report) : await fetchExcel(request);
      if (!blob) return; // the error is already shown

      const kind = asPdf ? "pdf" : "xlsx";
      const saved = await saveFile(blob, `${fileBase}.${kind}`, kind);
      if (saved) {

        notify.success(asPdf ? "PDF file downloaded" : "Excel file downloaded");
        setPreview(null); // cancelled "Save as": the preview stays
      }
    } catch {
      notify.error(
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
    setStatusMode("Active");
    setGroupMode("All Item Group");
    setGroupId(null);
    setSalesBelowCost(false);
    setItemMode("All Item");
    setItemId(null);
    setFromItem(null);
    setToItem(null);
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

  // VB rdgItem_SelectedIndexChanged: the item boxes are cleared
  const chooseItemMode = (mode: string) => {
    setItemMode(mode);
    setItemId(null);
    setFromItem(null);
    setToItem(null);
  };

  return (
    <ReportForm
      title="Item List"
      onKeyDown={handleEnterAsTab}
      overlay={
        // Print preview
        preview && (

          <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/40 p-4">
            <div className="flex h-[90vh] w-full max-w-300 flex-col overflow-hidden border border-gray-400 bg-white shadow-xl">
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

      {/* Status */}
      <FilterRow
        panel={
          <RadioPanel id="rdgItemStatus" className="h-22.5 w-38">
            {["Active", "Inactive", "Hide"].map((label) => (
              <CustomRadio
                key={label}
                name="rdgItemStatus"
                value={label}
                label={label}
                checked={statusMode === label}
                onChange={() => setStatusMode(label)}
              />
            ))}
          </RadioPanel>
        }
      />

      {/* Item Group (rdgCategory) */}
      <PairFilter
        name="Item Group"
        mode={groupMode}
        onModeChange={(mode) => {
          setGroupMode(mode);
          if (mode === "All Item Group") setGroupId(null);
        }}
        options={groupPairOptions}
        value={groupId ?? ""}
        onChange={(id) => handleGroupChange(id || null)}
        ids={{ radio: "rdgCategory", first: "lkpItemGroupID", second: "lkpItemGroupName" }}
        // the same ID box width as the Item row below (so the two Name boxes start together); the Name box is narrower here
        // so that Sales Below Cost fits at the right end of the row, where it always was (190 + 5 + 290 + the checkbox)
        firstWidth={190}
        secondWidth={290}
        aside={
          <label
            htmlFor="chkSalesBelowCost"
            className="flex h-7.5 cursor-pointer items-center gap-2 rounded-sm border border-gray-300 bg-white px-2 text-[14px] whitespace-nowrap text-[#172b43] select-none"
          >
            <input
              id="chkSalesBelowCost"
              type="checkbox"
              checked={salesBelowCost}
              onChange={(event) => setSalesBelowCost(event.target.checked)}
              className="h-4 w-4 accent-[#4ade80]"
            />
            Sales Below Cost
          </label>
        }
      />

      {/* Item */}
      <PairFilter
        name="Item"
        mode={itemMode}
        onModeChange={chooseItemMode}
        options={itemPairOptions}
        value={itemId ?? ""}
        onChange={(id) => setItemId(id || null)}
        // an Item ID can be long (ACCSS-1.5MM-CABLE)
        firstWidth={190}
        range={{
          from: fromItem?.value ?? "",
          to: toItem?.value ?? "",
          onFromChange: (id) => setFromItem(id ? (itemIdOptions.find((o) => o.value === id) ?? null) : null),
          onToChange: (id) => setToItem(id ? (itemIdOptions.find((o) => o.value === id) ?? null) : null),
        }}
      />

      <ReportPrintRow onPrint={handlePrint} disabled={loading || printing} />
    </ReportForm>
  );
};

export default RptItemListPage;
