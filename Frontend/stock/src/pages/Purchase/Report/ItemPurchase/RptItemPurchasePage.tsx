import React, { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { toast } from "react-toastify";
import ReportPreview from "../../../../components/common/ReportPreview";
import { buildItemPurchasePdf } from "../../../../components/Purchase/Report/RptItemPurchase/RptItemPurchasePdf";
import {
  buildHtml,
  printItemPurchaseReport,
  type PrintReport,
} from "../../../../components/Purchase/Report/RptItemPurchase/RptItemPurchasePrintReport";
import { useEnterAsTab } from "../../../../hooks/useEnterAsTab";
import { useAltShortcuts } from "../../../../hooks/useAltShortcuts";
import { useCtrlShortcuts } from "../../../../hooks/useCtrlShortcuts";
import { useInitialFocus } from "../../../../hooks/useInitialFocus";
import type { PairSelectOption } from "../../../../components/common/CustomLinkedPairSelect";
import {
  BranchFilter,
  PairFilter,
  PeriodFilter,
  ReportForm,
  ReportPrintRow,
} from "../../../../components/common/ReportFilters";

dayjs.extend(customParseFormat);

type Option = { value: string; label: string };

const DATE_FORMAT = "DD-MM-YYYY";

const api = import.meta.env.VITE_API_URL;

type RptItemPurchasePageProps = {
  onClose?: () => void;
};

const RptItemPurchasePage: React.FC<RptItemPurchasePageProps> = ({
  onClose,
}) => {
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
        const response = await fetch(`${api}/RptItemPurchase/lookups`, {
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
        console.error("rptItemPurchase lookups error:", error);
        toast.error("Cannot connect to the Item Purchase API.");
      }
    };

    loadLookups().finally(() => setLookupsLoaded(true));
  }, []);

  // the old form starts on All Item
  const [rdgItem, setRdgItem] = useState("All Item"); // rdgItem
  // one item: the Item ID box and the Item Name box show the same choice
  const [lkpItemID, setLkpItemID] = useState(""); // lkpItemID / lkpItemName

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

  // the Print Preview: the report the server sent, the name of the file, and what it was made from
  // (the Excel file is made from the same values)
  const [preview, setPreview] = useState<{
    report: PrintReport;
    fileBase: string;
    params: Record<string, unknown>;
  } | null>(null);
  const [printing, setPrinting] = useState(false);

  // what the server takes: the element ids of the page, the radios as their codes
  const buildItemPurchaseParams = () => {
    const toIso = (value: string) =>
      dayjs(value, DATE_FORMAT, true).isValid() ? dayjs(value, DATE_FORMAT).format("YYYY-MM-DD") : "";

    return {
      rdgBranch: rdgBranch === "One Branch" ? 0 : 1,
      lkpBranch: rdgBranch === "One Branch" ? (lkpBranch?.value ?? "") : "",
      rdgItem: rdgItem === "One Item" ? 0 : 1,
      lkpItemID: rdgItem === "One Item" ? lkpItemID : "",
      dtpFromDate: toIso(dtpFromDate),
      dtpToDate: toIso(dtpToDate),
    };
  };

  // Print (the old cmdPrint): the checks of the old form, then the server sends the report and the Print
  // Preview opens (Print = the browser's print window, Download = Excel / PDF)
  const handlePrint = async () => {
    if (printing || preview) return;

    const warn = (message: string, id: string) => {
      toast.warning(message);
      document.getElementById(id)?.focus();
    };

    const params = buildItemPurchaseParams();

    if (params.rdgBranch === 0 && !params.lkpBranch) {
      return warn("Please select 'Branch'", "lkpBranch");
    }

    if (params.rdgItem === 0 && !params.lkpItemID) {
      return warn("Please select 'Item ID'", "lkpItemID");
    }

    if (!params.dtpFromDate) {
      return warn("Please enter 'From Date'", "dtpFromDate");
    }

    if (!params.dtpToDate) {
      return warn("Please enter 'To Date'", "dtpToDate");
    }

    if (params.dtpFromDate > params.dtpToDate) {
      return warn("'To Date' should be greater than 'From Date'", "dtpToDate");
    }

    setPrinting(true);

    try {
      const response = await fetch(`${api}/RptItemPurchase/print`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        toast.warning(result.message || "The Item Purchase report could not be printed.");
        if (result.field) document.getElementById(result.field)?.focus();
        return;
      }

      setPreview({ report: result.report, fileBase: result.fileBase, params });
    } catch (error: unknown) {
      console.error("rptItemPurchase print error:", error);
      toast.error("Cannot connect to the Item Purchase API.");
    } finally {
      setPrinting(false);
    }
  };

  // the Excel file of the Print Preview, made by the server (null after an error)
  const fetchExcel = async (): Promise<Blob | null> => {
    if (!preview) return null;

    const response = await fetch(`${api}/RptItemPurchase/excel`, {
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
    setDtpFromDate(dayjs().format(DATE_FORMAT));
    setDtpToDate(dayjs().format(DATE_FORMAT));
    onClose?.();
  };

  // the cursor starts on the Branch box
  useInitialFocus(lookupsLoaded, "lkpBranch");

  // Alt+P -> Print, Alt+C -> Close (the underlined letters on the buttons); Ctrl+P -> Print (the old forms' Ctrl+P)
  useAltShortcuts({
    p: handlePrint,
    c: handleClose,
  });
  useCtrlShortcuts({
    p: () => (preview ? printItemPurchaseReport(preview.report) : handlePrint()),
  });

  // the item chosen does not belong to the branch chosen: it is cleared
  const clearItemNotInBranch = (branchId: string) => {
    if (lkpItemID && !itemExistsInBranch(lkpItemID, branchId)) setLkpItemID("");
  };

  return (
    <ReportForm
      title="Item Purchase"
      onKeyDown={handleEnterAsTab}
      overlay={
        // the Print Preview (after Print)
        preview && (
          <ReportPreview
            showClose={false}
            html={buildHtml(preview.report)}
            fileBase={preview.fileBase}
            onPrint={() => printItemPurchaseReport(preview.report)}
            buildPdf={() => buildItemPurchasePdf(preview.report)}
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
          if (mode === "One Branch" && lkpBranch) clearItemNotInBranch(lkpBranch.value);
        }}
        options={branchOptions}
        value={lkpBranch}
        onChange={(option) => {
          setLkpBranch(option);
          if (rdgBranch === "One Branch" && option) clearItemNotInBranch(option.value);
        }}
      />

      <PairFilter
        name="Item"
        mode={rdgItem}
        onModeChange={(mode) => {
          setRdgItem(mode);
          // the old form clears the item when the choice changes
          setLkpItemID("");
        }}
        options={itemPairOptions}
        value={lkpItemID}
        onChange={setLkpItemID}
        // an Item ID can be long (ACCSS-1.5MM-CABLE)
        firstWidth={190}
      />

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

export default RptItemPurchasePage;