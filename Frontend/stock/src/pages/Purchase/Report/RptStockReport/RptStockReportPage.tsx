import React, { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { CustomRadio, RadioPanel } from "../../../../components/common/ReportFormParts";
import { useEnterAsTab } from "../../../../hooks/useEnterAsTab";
import { useAltShortcuts } from "../../../../hooks/useAltShortcuts";
import { useCtrlShortcuts } from "../../../../hooks/useCtrlShortcuts";
import { useInitialFocus } from "../../../../hooks/useInitialFocus";
import ReportPreview from "../../../../components/common/ReportPreview";
import { buildStockReportPdf } from "../../../../components/Purchase/Report/RptStockReport/RptStockReportPdf";
import {
  buildHtml,
  printStockReport,
  type PrintReport,
} from "../../../../components/Purchase/Report/RptStockReport/RptStockReportPrintReport";
import type { PairSelectOption } from "../../../../components/common/CustomLinkedPairSelect";
import {
  BranchFilter,
  FilterRow,
  PairFilter,
  PeriodFilter,
  PostStatusFilter,
  ReportForm,
  ReportPrintRow,
} from "../../../../components/common/ReportFilters";
import { useMessageModal } from "../../../../hooks/useMessageModal";

dayjs.extend(customParseFormat);

type Option = { value: string; label: string };

const DATE_FORMAT = "DD-MM-YYYY";
const TODAY = dayjs().format(DATE_FORMAT);

const api = import.meta.env.VITE_API_URL;

const postStatusOptions: Option[] = [
  { value: "ALL", label: "All" },
  { value: "POSTED", label: "Posted" },
  { value: "UNPOSTED", label: "Not Posted" },
];

const RptStockReportPage: React.FC = () => {
  const { notify, dialog: messageDialog } = useMessageModal();
  // Enter moves on like Tab; the box the cursor is in is outlined; after a pick from a list the
  // cursor goes on
  const handleEnterAsTab = useEnterAsTab();

  // the lookups have been asked for (found or not): the cursor can start
  const [lookupsLoaded, setLookupsLoaded] = useState(false);

  const [rdgBranch, setRdgBranch] = useState("One Branch"); // rdgBranch
  const [branch, setBranch] = useState<Option | null>(null); // lkpBranch

  // the branches the logged-in user has a right to, and the user's default branch
  const [branchOptions, setBranchOptions] = useState<Option[]>([]);
  const [defaultBranch, setDefaultBranch] = useState<Option | null>(null);

  // the item groups of the company
  const [groupRows, setGroupRows] = useState<
    { lkpItemGroupID: string; txtItemGroupName: string }[]
  >([]);

  // the Print Preview: the report the server sent, the name of the file, and the arguments it was
  // made from (the Excel file is made from the same ones)
  const [preview, setPreview] = useState<{
    report: PrintReport;
    fileBase: string;
    params: ReturnType<typeof buildStockParams>;
  } | null>(null);
  const [printing, setPrinting] = useState(false);

  // the items of the company (the Item ID / Item Name boxes and the Item Range boxes)
  const [itemRows, setItemRows] = useState<
    { lkpBranch: string; lkpItemID: string; txtItemName: string; lkpItemGroupID: string }[]
  >([]);

  useEffect(() => {
    const loadBranches = async () => {
      try {
        const response = await fetch(`${api}/RptStockReport/lookups`, { credentials: "include" });
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
        setBranch(initial);
        setGroupRows(result.groups || []);
        setItemRows(result.items || []);
      } catch (error: unknown) {
        console.error("rptStockReport branches error:", error);
        notify.error("Cannot connect to the Stock report API.");
      }
    };

    loadBranches().finally(() => setLookupsLoaded(true));
  }, []);
  const [rdgByItem, setRdgByItem] = useState("By Item"); // rdgByItem: By Item / By Group

  const [rdgItem, setRdgItem] = useState("One Item"); // rdgItem
  const [rdgItemGroup, setRdgItemGroup] = useState("One Item Group"); // rdgItemGroup
  // one item: the Item ID box and the Item Name box show the same choice
  const [oneItemId, setOneItemId] = useState(""); // lkpOneItemID / lkpOneItemName
  const [fromItem, setFromItem] = useState(""); // Item Range: From Item
  const [toItem, setToItem] = useState(""); // Item Range: To Item
  // one item group: the Group ID box and the Group Name box show the same choice
  const [groupId, setGroupId] = useState(""); // lkpOneItemGroupID / lkpOneItemGroupName

  const [postStatus, setPostStatus] = useState<Option | null>(
    postStatusOptions[0],
  ); // lkpPostStatus
  const [rdgDetSum, setRdgDetSum] = useState("Detailed"); // rdgDetSum
  const [fromDate, setFromDate] = useState(TODAY); // dtpFromDate
  const [toDate, setToDate] = useState(TODAY); // dtpToDate
  const [orderByTxnNo, setOrderByTxnNo] = useState(false); // chkOrderbyTxnNo

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

  // the items of the chosen branch (One Branch), or every item once (All Branch)
  const branchItems = useMemo(() => {
    const rows =
      rdgBranch === "One Branch" && branch
        ? itemRows.filter((row) => row.lkpBranch === branch.value)
        : itemRows;

    const seen = new Set<string>();

    return rows.filter((row) => {
      if (seen.has(row.lkpItemID)) return false;
      seen.add(row.lkpItemID);
      return true;
    });
  }, [itemRows, rdgBranch, branch]);

  const clearItemSelections = () => {
    setOneItemId("");
    setFromItem("");
    setToItem("");
  };

  // the item boxes: one list, "ID | Name" in the ID box and "Name | ID" in the Name box
  const itemPairOptions = useMemo<PairSelectOption[]>(
    () =>
      branchItems.map((row) => ({
        value: row.lkpItemID,
        firstLabel: row.lkpItemID,
        secondLabel: row.txtItemName,
      })),
    [branchItems],
  );

  const handleClear = () => {
    setRdgBranch("One Branch");
    setBranch(defaultBranch);
    setRdgByItem("By Item");
    setRdgItem("One Item");
    setRdgItemGroup("One Item Group");
    clearItemSelections();
    setGroupId("");
    setPostStatus(postStatusOptions[0]);
    setRdgDetSum("Detailed");
    setFromDate(TODAY);
    setToDate(TODAY);
    setOrderByTxnNo(false);
  };

  // The arguments of SP_rptStock, with the same names and the same codes as the stored
  // procedure takes them (dates as dd/mm/yyyy text, a value that does not apply is null).
  function buildStockParams() {
    const byGroup = rdgByItem === "By Group";
    const toProcedureDate = (value: string) => value.replace(/-/g, "/");

    return {
      strDetOrSum: rdgDetSum === "Detailed" ? "D" : "S",
      // 0 All, 1 Posted, 2 Non Posted
      lkpPostStatus: { ALL: 0, POSTED: 1, UNPOSTED: 2 }[postStatus?.value ?? "ALL"] ?? 0,
      pstrCoID: localStorage.getItem("PstrCoID") ?? "",
      rdgBranch: rdgBranch === "One Branch" ? 0 : 1, // 0 One Branch, 1 All Branch
      strBrID: rdgBranch === "One Branch" ? (branch?.value ?? null) : null,
      rdgByItem: byGroup ? 0 : 1, // 0 Item Group, 1 Item
      strItemGroupID: byGroup && rdgItemGroup === "One Item Group" ? groupId || null : null,
      // 0 One Item, 1 Item Range, 2 All Item (a report by group takes every item of the group)
      rdgItem: byGroup ? 2 : { "One Item": 0, "Item Range": 1, "All Item": 2 }[rdgItem] ?? 2,
      strItemID: !byGroup && rdgItem === "One Item" ? oneItemId || null : null,
      strFromItemID: !byGroup && rdgItem === "Item Range" ? fromItem || null : null,
      strToItemID: !byGroup && rdgItem === "Item Range" ? toItem || null : null,
      strFromDate: toProcedureDate(fromDate),
      strToDate: toProcedureDate(toDate),
      blnOrderBy: rdgDetSum === "Detailed" && orderByTxnNo, // order by Txn. No. (Detailed only)
    };
  }

  // Print (the old cmdPrint): the checks of the old form, then the server sends the report and
  // the Print Preview opens (Print = the browser's print window, Download = Excel / PDF)
  const handlePrint = async () => {
    if (printing || preview) return;

    const warn = (message: string, id: string) => {
      notify.warning(message);
      document.getElementById(id)?.focus();
    };

    const params = buildStockParams();

    if (params.rdgBranch === 0 && !params.strBrID) {
      return warn("Please select 'Branch'", "lkpBranch");
    }

    if (rdgByItem === "By Group" && rdgItemGroup === "One Item Group" && !groupId) {
      return warn("Please select 'Item Group'", "lkpOneItemGroupID");
    }

    if (params.rdgByItem === 1 && params.rdgItem === 0 && !params.strItemID) {
      return warn("Please select 'Item ID'", "lkpOneItemID");
    }

    if (params.rdgByItem === 1 && params.rdgItem === 1 && !params.strFromItemID) {
      return warn("Please select 'From Item ID'", "lkpFromItem");
    }

    if (params.rdgByItem === 1 && params.rdgItem === 1 && !params.strToItemID) {
      return warn("Please select 'To Item ID'", "lkpToItem");
    }

    setPrinting(true);

    try {
      const response = await fetch(`${api}/RptStockReport/print`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        notify.warning(result.message || "The Stock report could not be printed.");
        if (result.field) document.getElementById(result.field)?.focus();
        return;
      }

      setPreview({ report: result.report, fileBase: result.fileBase, params });
    } catch (error: unknown) {
      console.error("rptStockReport print error:", error);
      notify.error("Cannot connect to the Stock report API.");
    } finally {
      setPrinting(false);
    }
  };

  // the Excel file of the Print Preview, made by the server (null after an error)
  const fetchExcel = async (): Promise<Blob | null> => {
    if (!preview) return null;

    const response = await fetch(`${api}/RptStockReport/excel`, {
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

  // the cursor starts on the Branch box
  useInitialFocus(lookupsLoaded, "lkpBranch");

  // Alt+P -> Print, Alt+C -> Clear (the underlined letters on the buttons)
  useAltShortcuts({
    p: handlePrint,
    c: handleClear,
  });

  // Ctrl+P -> Print (the old forms' Ctrl+P). With the Print Preview open it prints the report that is shown.
  useCtrlShortcuts({
    p: () => (preview ? printStockReport(preview.report) : handlePrint()),
  });

  // the item filters work with By Item, the group filters with By Item Group: the other one is switched off
  const itemRadioDisabled = rdgByItem !== "By Item";
  const groupRadioDisabled = rdgByItem !== "By Group";

  return (
    <ReportForm
      title="Stock"
      onKeyDown={handleEnterAsTab}
      overlay={
        // the Print Preview (after Print)
        preview && (
          <ReportPreview
            showClose={false}
            html={buildHtml(preview.report)}
            fileBase={preview.fileBase}
            onPrint={() => printStockReport(preview.report)}
            buildPdf={() => buildStockReportPdf(preview.report)}
            fetchExcel={fetchExcel}
            onClose={() => setPreview(null)}
          />
        )
      }
    >
      {messageDialog}
      <BranchFilter
        mode={rdgBranch}
        onModeChange={(mode) => {
          if (mode !== rdgBranch) clearItemSelections();
          setRdgBranch(mode);
        }}
        options={branchOptions}
        value={branch}
        onChange={(option) => {
          if (option?.value !== branch?.value) clearItemSelections();
          setBranch(option);
        }}
      />

      {/* By Item Group / By Item */}
      <FilterRow
        panel={
          <RadioPanel id="rdgByItem" className="h-17.5 w-38">
            <CustomRadio
              name="rdgByItem"
              value="By Group"
              label="By Item Group"
              checked={rdgByItem === "By Group"}
              onChange={() => {
                setRdgByItem("By Group");
                // By Item Group chosen: One Item Group is what is switched on
                setRdgItemGroup("One Item Group");
              }}
            />
            <CustomRadio
              name="rdgByItem"
              value="By Item"
              label="By Item"
              checked={rdgByItem === "By Item"}
              onChange={() => setRdgByItem("By Item")}
            />
          </RadioPanel>
        }
      />

      {/* Item Group: One / All, with By Item Group */}
      <PairFilter
        name="Item Group"
        mode={rdgItemGroup}
        onModeChange={setRdgItemGroup}
        options={groupPairOptions}
        value={groupId}
        onChange={setGroupId}
        disabled={groupRadioDisabled}
        // the same ID box width as the Item row below it, so the two Name boxes start at the same place
        firstWidth={190}
        ids={{ radio: "rdgItemGroup", first: "lkpOneItemGroupID", second: "lkpOneItemGroupName" }}
      />

      {/* Item: One / Item Range / All, with By Item */}
      <PairFilter
        name="Item"
        mode={rdgItem}
        onModeChange={setRdgItem}
        options={itemPairOptions}
        value={oneItemId}
        onChange={setOneItemId}
        disabled={itemRadioDisabled}
        // an Item ID can be long (ACCSS-1.5MM-CABLE)
        firstWidth={190}
        ids={{ radio: "rdgItem", first: "lkpOneItemID", second: "lkpOneItemName" }}
        range={{
          from: fromItem,
          to: toItem,
          onFromChange: setFromItem,
          onToChange: setToItem,
          label: "Item Range",
        }}
      />

      <PostStatusFilter className="w-full" options={postStatusOptions} value={postStatus} onChange={setPostStatus}>
        <label
          htmlFor="chkOrderbyTxnNo"
          className="ml-auto flex h-7.5 cursor-pointer items-center gap-2 rounded-sm border border-gray-300 bg-white px-2 text-[14px] text-[#172b43] select-none"
        >
          <input
            id="chkOrderbyTxnNo"
            type="checkbox"
            checked={orderByTxnNo}
            onChange={(event) => setOrderByTxnNo(event.target.checked)}
            className="h-4 w-4 accent-[#4ade80]"
          />
          Order by Posting No.
        </label>
      </PostStatusFilter>

      {/* Detailed / Summary */}
      <FilterRow
        panel={
          <RadioPanel id="rdgDetSum" className="h-17.5 w-38">
            <CustomRadio
              name="rdgDetSum"
              value="Detailed"
              label="Detailed"
              checked={rdgDetSum === "Detailed"}
              onChange={() => setRdgDetSum("Detailed")}
            />
            <CustomRadio
              name="rdgDetSum"
              value="Summary"
              label="Summary"
              checked={rdgDetSum === "Summary"}
              onChange={() => setRdgDetSum("Summary")}
            />
          </RadioPanel>
        }
      />

      <PeriodFilter
        from={fromDate}
        to={toDate}
        onFromChange={setFromDate}
        onToChange={setToDate}
      />

      <ReportPrintRow onPrint={handlePrint} />
    </ReportForm>
  );
};

export default RptStockReportPage;