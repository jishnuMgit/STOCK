import React, { useEffect, useMemo, useState } from "react";
import type { PairSelectOption } from "../../../../components/common/CustomLinkedPairSelect";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { toast } from "react-toastify";
import { CustomRadio, RadioPanel } from "../../../../components/common/ReportFormParts";
import ReportPreview from "../../../../components/common/ReportPreview";
import { buildSupplierPurchasePdf } from "../../../../components/Purchase/Report/RptSupplierPurchase/RptSupplierPurchasePdf";
import {
  buildHtml,
  printSupplierPurchaseReport,
  type PrintReport,
} from "../../../../components/Purchase/Report/RptSupplierPurchase/RptSupplierPurchasePrintReport";
import { useEnterAsTab } from "../../../../hooks/useEnterAsTab";
import { useAltShortcuts } from "../../../../hooks/useAltShortcuts";
import { useCtrlShortcuts } from "../../../../hooks/useCtrlShortcuts";
import { useInitialFocus } from "../../../../hooks/useInitialFocus";
import {
  BranchFilter,
  FilterRow,
  PairFilter,
  PeriodFilter,
  ReportForm,
  ReportPrintRow,
} from "../../../../components/common/ReportFilters";

dayjs.extend(customParseFormat);

type Option = { value: string; label: string };

const DATE_FORMAT = "DD-MM-YYYY";

const api = import.meta.env.VITE_API_URL;

type RptSupplierPurchasePageProps = {
  onClose?: () => void;
};

const RptSupplierPurchasePage: React.FC<RptSupplierPurchasePageProps> = ({
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

  // the old form starts on All Supplier
  const [rdgSupplier, setRdgSupplier] = useState("All Supplier"); // rdgSupplier
  // one supplier: the Supplier ID box and the Supplier Name box show the same choice
  const [lkpSupplierID, setLkpSupplierID] = useState(""); // lkpSupplierID / lkpSupplierName

  // the suppliers of the company (the Supplier ID / Supplier Name boxes)
  const [supplierRows, setSupplierRows] = useState<
    { lkpSupplierID: string; txtSupplierName: string }[]
  >([]);

  // the supplier boxes: one list, "ID | Name" in the ID box and "Name | ID" in the Name box
  const supplierPairOptions = useMemo<PairSelectOption[]>(
    () =>
      supplierRows.map((row) => ({
        value: row.lkpSupplierID,
        firstLabel: row.lkpSupplierID,
        secondLabel: row.txtSupplierName,
      })),
    [supplierRows],
  );

  useEffect(() => {
    const loadLookups = async () => {
      try {
        const response = await fetch(`${api}/RptSupplierPurchase/lookups`, {
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
        setSupplierRows(result.suppliers || []);
      } catch (error: unknown) {
        console.error("rptSupplierPurchase lookups error:", error);
        toast.error("Cannot connect to the Supplier Purchase API.");
      }
    };

    loadLookups().finally(() => setLookupsLoaded(true));
  }, []);

  // the period (starts as today)
  const [dtpFromDate, setDtpFromDate] = useState(dayjs().format(DATE_FORMAT)); // dtpFromDate
  const [dtpToDate, setDtpToDate] = useState(dayjs().format(DATE_FORMAT)); // dtpToDate
  const [rdgDetOrSum, setRdgDetOrSum] = useState("Summary"); // rdgDetOrSum: the old form starts on Summary
  // Detailed only: the documents to print - "PI" Purchase Invoice, "PR" Purchase Return
  const [rdgDocType, setRdgDocType] = useState("PI"); // rdgDocType

  // the Print Preview: the report the server sent, the name of the file, and what it was made from
  // (the Excel file is made from the same values)
  const [preview, setPreview] = useState<{
    report: PrintReport;
    fileBase: string;
    params: Record<string, unknown>;
  } | null>(null);
  const [printing, setPrinting] = useState(false);

  // what the server takes: the element ids of the page, the radios as their codes
  const buildSupplierPurchaseParams = () => {
    const toIso = (value: string) =>
      dayjs(value, DATE_FORMAT, true).isValid() ? dayjs(value, DATE_FORMAT).format("YYYY-MM-DD") : "";

    return {
      rdgBranch: rdgBranch === "One Branch" ? 0 : 1,
      lkpBranch: rdgBranch === "One Branch" ? (lkpBranch?.value ?? "") : "",
      rdgSupplier: rdgSupplier === "One Supplier" ? 0 : 1,
      lkpSupplierID: rdgSupplier === "One Supplier" ? lkpSupplierID : "",
      dtpFromDate: toIso(dtpFromDate),
      dtpToDate: toIso(dtpToDate),
      rdgDetOrSum: rdgDetOrSum === "Detailed" ? 0 : 1,
      rdgDocType,
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

    const params = buildSupplierPurchaseParams();

    if (params.rdgBranch === 0 && !params.lkpBranch) {
      return warn("Please select 'Branch'", "lkpBranch");
    }

    if (params.rdgSupplier === 0 && !params.lkpSupplierID) {
      return warn("Please select 'Supplier ID'", "lkpSupplierID");
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
      const response = await fetch(`${api}/RptSupplierPurchase/print`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        toast.warning(result.message || "The Supplier Purchase report could not be printed.");
        if (result.field) document.getElementById(result.field)?.focus();
        return;
      }

      setPreview({ report: result.report, fileBase: result.fileBase, params });
    } catch (error: unknown) {
      console.error("rptSupplierPurchase print error:", error);
      toast.error("Cannot connect to the Supplier Purchase API.");
    } finally {
      setPrinting(false);
    }
  };

  // the Excel file of the Print Preview, made by the server (null after an error)
  const fetchExcel = async (): Promise<Blob | null> => {
    if (!preview) return null;

    const response = await fetch(`${api}/RptSupplierPurchase/excel`, {
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
    setRdgSupplier("All Supplier");
    setLkpSupplierID("");
    setDtpFromDate(dayjs().format(DATE_FORMAT));
    setDtpToDate(dayjs().format(DATE_FORMAT));
    setRdgDetOrSum("Summary");
    setRdgDocType("PI");
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
    p: () => (preview ? printSupplierPurchaseReport(preview.report) : handlePrint()),
  });

  return (
    <ReportForm
      title="Supplier Purchase"
      onKeyDown={handleEnterAsTab}
      overlay={
        // the Print Preview (after Print)
        preview && (
          <ReportPreview
            showClose={false}
            html={buildHtml(preview.report)}
            fileBase={preview.fileBase}
            onPrint={() => printSupplierPurchaseReport(preview.report)}
            buildPdf={() => buildSupplierPurchasePdf(preview.report)}
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
        name="Supplier"
        mode={rdgSupplier}
        onModeChange={(mode) => {
          setRdgSupplier(mode);
          // the old form clears the supplier when the choice changes
          setLkpSupplierID("");
        }}
        options={supplierPairOptions}
        value={lkpSupplierID}
        onChange={setLkpSupplierID}
        // the same ID box width as every other ID + Name pair on the report pages
        firstWidth={190}
      />

      <PeriodFilter
        from={dtpFromDate}
        to={dtpToDate}
        onFromChange={setDtpFromDate}
        onToChange={setDtpToDate}
      />

      {/* Report type (Detailed: and the documents to print) */}
      <FilterRow
        panel={
          <RadioPanel id="rdgDetOrSum" className="h-17.5 w-38">
            <CustomRadio
              name="rdgDetOrSum"
              value="Detailed"
              label="Detailed"
              checked={rdgDetOrSum === "Detailed"}
              onChange={() => setRdgDetOrSum("Detailed")}
            />
            <CustomRadio
              name="rdgDetOrSum"
              value="Summary"
              label="Summary"
              checked={rdgDetOrSum === "Summary"}
              onChange={() => setRdgDetOrSum("Summary")}
            />
          </RadioPanel>
        }
      >
        {/* Detailed only: the documents to print */}
        {rdgDetOrSum === "Detailed" && (
          <RadioPanel id="rdgDocType" className="h-17.5 w-48">
            <CustomRadio
              name="rdgDocType"
              value="PI"
              label="Purchase Invoice"
              checked={rdgDocType === "PI"}
              onChange={() => setRdgDocType("PI")}
            />
            <CustomRadio
              name="rdgDocType"
              value="PR"
              label="Purchase Return"
              checked={rdgDocType === "PR"}
              onChange={() => setRdgDocType("PR")}
            />
          </RadioPanel>
        )}
      </FilterRow>

      <ReportPrintRow onPrint={handlePrint} />
    </ReportForm>
  );
}

export default RptSupplierPurchasePage;