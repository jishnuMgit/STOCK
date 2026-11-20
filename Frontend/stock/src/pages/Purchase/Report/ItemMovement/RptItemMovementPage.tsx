import React, { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { toast } from "react-toastify";
import { CustomRadio, RadioPanel } from "../../../../components/common/ReportFormParts";
import ReportPreview from "../../../../components/common/ReportPreview";
import { buildItemMovementPdf } from "../../../../components/Purchase/Report/RptItemMovement/RptItemMovementPdf";
import {
  buildHtml,
  printItemMovementReport,
  type PrintReport,
} from "../../../../components/Purchase/Report/RptItemMovement/RptItemMovementPrintReport";
import { useEnterAsTab } from "../../../../hooks/useEnterAsTab";
import { useAltShortcuts } from "../../../../hooks/useAltShortcuts";
import { useCtrlShortcuts } from "../../../../hooks/useCtrlShortcuts";
import { useInitialFocus } from "../../../../hooks/useInitialFocus";
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

dayjs.extend(customParseFormat);

type Option = { value: string; label: string };

const DATE_FORMAT = "DD-MM-YYYY";

const api = import.meta.env.VITE_API_URL;

/* Replace these with data from your API */
// the Post Status and its codes - the same as the other reports: 0 All, 1 Posted, 2 Non Posted
const postStatusOptions: Option[] = [
  { value: "0", label: "All" },
  { value: "1", label: "Posted" },
  { value: "2", label: "Non Posted" },
];

type RptItemMovementPageProps = {
  onClose?: () => void;
};

const RptItemMovementPage: React.FC<RptItemMovementPageProps> = ({ onClose }) => {
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
  const [itemRows, setItemRows] = useState<
    { lkpBranch: string; lkpItemID: string; txtItemName: string }[]
  >([]);

  useEffect(() => {
    const loadLookups = async () => {
      try {
        const response = await fetch(`${api}/RptItemMovement/lookups`, {
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
        setItemRows(result.items || []);
      } catch (error: unknown) {
        console.error("rptItemMovement lookups error:", error);
        toast.error("Cannot connect to the Item Movement API.");
      }
    };

    loadLookups().finally(() => setLookupsLoaded(true));
  }, []);

  const [rdgItem, setRdgItem] = useState("All Item"); // rdgItem: the old form starts on All Item
  // one item: the Item ID box and the Item Name box show the same choice
  const [lkpItemID, setLkpItemID] = useState(""); // lkpItemID / lkpItemName
  const [lkpFromItem, setLkpFromItem] = useState(""); // Item Range: From Item
  const [lkpToItem, setLkpToItem] = useState(""); // Item Range: To Item

  // the items of the chosen branch (One Branch), or every item once (All Branch)
  const branchItems = useMemo(() => {
    const rows =
      rdgBranch === "One Branch" && lkpBranch
        ? itemRows.filter((row) => row.lkpBranch === lkpBranch.value)
        : itemRows;

    const seen = new Set<string>();

    return rows.filter((row) => {
      if (seen.has(row.lkpItemID)) return false;
      seen.add(row.lkpItemID);
      return true;
    });
  }, [itemRows, rdgBranch, lkpBranch]);

  const itemExistsInBranch = (itemId: string, branchId: string) =>
    itemRows.some(
      (row) => row.lkpItemID === itemId && row.lkpBranch === branchId,
    );

  const clearItemsNotInBranch = (branchId: string) => {
    if (lkpItemID && !itemExistsInBranch(lkpItemID, branchId)) setLkpItemID("");
    if (lkpFromItem && !itemExistsInBranch(lkpFromItem, branchId)) {
      setLkpFromItem("");
    }
    if (lkpToItem && !itemExistsInBranch(lkpToItem, branchId)) {
      setLkpToItem("");
    }
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

  // the period (starts as today)
  const [dtpFromDate, setDtpFromDate] = useState(dayjs().format(DATE_FORMAT)); // dtpFromDate
  const [dtpToDate, setDtpToDate] = useState(dayjs().format(DATE_FORMAT)); // dtpToDate
  const [lkpPostStatus, setLkpPostStatus] = useState<Option | null>(
    postStatusOptions[1],
  ); // lkpPostStatus
  const [rdgItemMovement, setRdgItemMovement] = useState("Fast Moving"); // rdgItemMovement
  const [rdgOrderBy, setRdgOrderBy] = useState("Qty"); // rdgOrderBy (Fast / Slow Moving only)

  // the Print Preview: the report the server sent, the name of the file, and what it was made from
  // (the Excel file is made from the same values)
  const [preview, setPreview] = useState<{
    report: PrintReport;
    fileBase: string;
    params: Record<string, unknown>;
  } | null>(null);
  const [printing, setPrinting] = useState(false);

  // what the server takes: the element ids of the page, the radios as their codes
  // dd-mm-yyyy of the box -> yyyy-mm-dd ("" when it is not a date)
  const toIsoDate = (value: string) =>
    dayjs(value, DATE_FORMAT, true).isValid()
      ? dayjs(value, DATE_FORMAT).format("YYYY-MM-DD")
      : "";

  const buildItemMovementParams = () => ({
    rdgBranch: rdgBranch === "One Branch" ? 0 : 1,
    lkpBranch: rdgBranch === "One Branch" ? (lkpBranch?.value ?? "") : "",
    rdgItem: { "One Item": 0, "Range Item": 1, "All Item": 2 }[rdgItem] ?? 2,
    lkpItemID: rdgItem === "One Item" ? lkpItemID : "",
    lkpFromItem: rdgItem === "Range Item" ? lkpFromItem : "",
    lkpToItem: rdgItem === "Range Item" ? lkpToItem : "",
    dtpFromDate: toIsoDate(dtpFromDate),
    dtpToDate: toIsoDate(dtpToDate),
    lkpPostStatus: Number(lkpPostStatus?.value ?? "1"),
    rdgItemMovement: { "Fast Moving": 0, "Slow Moving": 1, "Non Moving": 2 }[rdgItemMovement] ?? 0,
    rdgOrderBy: rdgOrderBy === "Qty" ? 0 : 1,
  });

  // Print (the old cmdPrint): the checks of the old form, then the server sends the report and the Print
  // Preview opens (Print = the browser's print window, Download = Excel / PDF)
  const handlePrint = async () => {
    if (printing || preview) return;

    const warn = (message: string, id: string) => {
      toast.warning(message);
      document.getElementById(id)?.focus();
    };

    const params = buildItemMovementParams();

    if (params.rdgBranch === 0 && !params.lkpBranch) {
      return warn("Please select 'Branch'", "lkpBranch");
    }

    if (params.rdgItem === 0 && !params.lkpItemID) {
      return warn("Please select 'Item ID'", "lkpItemID");
    }

    if (params.rdgItem === 1 && !params.lkpFromItem) {
      return warn("Please select 'Item ID From'", "lkpFromItem");
    }

    if (params.rdgItem === 1 && !params.lkpToItem) {
      return warn("Please select 'Item ID To'", "lkpToItem");
    }

    if (!params.dtpFromDate) {
      return warn("Please enter 'From Date'", "dtpFromDate");
    }

    if (!params.dtpToDate) {
      return warn("Please enter 'To Date'", "dtpToDate");
    }

    // yyyy-mm-dd texts compare as dates
    if (params.dtpFromDate > params.dtpToDate) {
      return warn("'To Date' should be greater than 'From Date'", "dtpToDate");
    }

    setPrinting(true);

    try {
      const response = await fetch(`${api}/RptItemMovement/print`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        toast.warning(result.message || "The Item Movement report could not be printed.");
        if (result.field) document.getElementById(result.field)?.focus();
        return;
      }

      setPreview({ report: result.report, fileBase: result.fileBase, params });
    } catch (error: unknown) {
      console.error("rptItemMovement print error:", error);
      toast.error("Cannot connect to the Item Movement API.");
    } finally {
      setPrinting(false);
    }
  };

  // the Excel file of the Print Preview, made by the server (null after an error)
  const fetchExcel = async (): Promise<Blob | null> => {
    if (!preview) return null;

    const response = await fetch(`${api}/RptItemMovement/excel`, {
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
    setRdgItem("All Item");
    setLkpItemID("");
    setLkpFromItem("");
    setLkpToItem("");
    setDtpFromDate(dayjs().format(DATE_FORMAT));
    setDtpToDate(dayjs().format(DATE_FORMAT));
    setLkpPostStatus(postStatusOptions[1]);
    setRdgItemMovement("Fast Moving");
    setRdgOrderBy("Qty");
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
    p: () => (preview ? printItemMovementReport(preview.report) : handlePrint()),
  });

  return (
    <ReportForm
      title="Item Movement"
      onKeyDown={handleEnterAsTab}
      overlay={
        // the Print Preview (after Print)
        preview && (
          <ReportPreview
            showClose={false}
            html={buildHtml(preview.report)}
            fileBase={preview.fileBase}
            onPrint={() => printItemMovementReport(preview.report)}
            buildPdf={() => buildItemMovementPdf(preview.report)}
            fetchExcel={fetchExcel}
            onClose={() => setPreview(null)}
          />
        )
      }
    >
      <BranchFilter
        mode={rdgBranch}
        onModeChange={(mode) => {
          setRdgBranch(mode);
          if (mode === "One Branch" && lkpBranch) clearItemsNotInBranch(lkpBranch.value);
        }}
        options={branchOptions}
        value={lkpBranch}
        onChange={(option) => {
          setLkpBranch(option);
          if (rdgBranch === "One Branch" && option) clearItemsNotInBranch(option.value);
        }}
      />

      <PairFilter
        name="Item"
        mode={rdgItem}
        onModeChange={setRdgItem}
        options={itemPairOptions}
        value={lkpItemID}
        onChange={setLkpItemID}
        // an Item ID can be long (ACCSS-1.5MM-CABLE)
        firstWidth={190}
        range={{
          from: lkpFromItem,
          to: lkpToItem,
          onFromChange: setLkpFromItem,
          onToChange: setLkpToItem,
        }}
      />

      <PostStatusFilter
        options={postStatusOptions}
        value={lkpPostStatus}
        onChange={setLkpPostStatus}
      />

      {/* Fast / Slow / Non Moving, and Order by (it does not apply to Non Moving) */}
      <FilterRow
        className="w-full"
        panel={
          <RadioPanel id="rdgItemMovement" className="h-22.5 w-38">
            {["Fast Moving", "Slow Moving", "Non Moving"].map((label) => (
              <CustomRadio
                key={label}
                name="rdgItemMovement"
                value={label}
                label={label}
                checked={rdgItemMovement === label}
                onChange={() => setRdgItemMovement(label)}
              />
            ))}
          </RadioPanel>
        }
      >
        {/* Order by - at the right end of the row */}
        {rdgItemMovement !== "Non Moving" && (
          <div className="flex justify-end">
            <RadioPanel id="rdgOrderBy" className="h-17.5 w-48">
              <CustomRadio
                name="rdgOrderBy"
                value="Qty"
                label="Order by Qty."
                checked={rdgOrderBy === "Qty"}
                onChange={() => setRdgOrderBy("Qty")}
              />
              <CustomRadio
                name="rdgOrderBy"
                value="Value"
                label="Order by Value"
                checked={rdgOrderBy === "Value"}
                onChange={() => setRdgOrderBy("Value")}
              />
            </RadioPanel>
          </div>
        )}
      </FilterRow>

      <PeriodFilter
        from={dtpFromDate}
        to={dtpToDate}
        onFromChange={setDtpFromDate}
        onToChange={setDtpToDate}
      />

      <ReportPrintRow onPrint={handlePrint} />
    </ReportForm>
  );
};

export default RptItemMovementPage;