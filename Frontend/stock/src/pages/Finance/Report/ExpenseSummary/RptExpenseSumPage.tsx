import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import type { PairSelectOption } from "../../../../components/common/CustomLinkedPairSelect";
import { useInitialFocus } from "../../../../hooks/useInitialFocus";
import { useEnterAsTab } from "../../../../hooks/useEnterAsTab";
import { useAltShortcuts } from "../../../../hooks/useAltShortcuts";
import { useCtrlShortcuts } from "../../../../hooks/useCtrlShortcuts";
import ReportPreview from "../../../../components/common/ReportPreview";
import { CustomRadio, RadioPanel } from "../../../../components/common/ReportFormParts";
import {
  BranchFilter,
  FILTER_GAP,
  FilterLabel,
  FilterRow,
  LabelSelectFilter,
  PairFilter,
  PostStatusFilter,
  ReportDatePicker,
  ReportForm,
  ReportPrintRow,
} from "../../../../components/common/ReportFilters";
import {
  buildHtml,
  printExpenseSumReport,
  type PrintReport,
} from "../../../../components/Finance/Report/RptExpenseSum/RptExpenseSumPrintReport";
import { buildExpenseSumPdf } from "../../../../components/Finance/Report/RptExpenseSum/RptExpenseSumPdf";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";

// Expense Summary - laid out with the common template of the report forms (components/common/ReportFilters.tsx), like every
// other report page. The Print Preview, the lookups and what is sent to the server are as they were.

dayjs.extend(customParseFormat);

type Option = { value: string; label: string };

const DATE_FORMAT = "DD-MM-YYYY";
const MONTH_FORMAT = "MM-YYYY";

const api = import.meta.env.VITE_API_URL;

/* Replace these with data from your API */
const postStatusOptions: Option[] = [
  { value: "ALL", label: "All" },
  { value: "POSTED", label: "Posted" },
  { value: "UNPOSTED", label: "Not Posted" }
];
const yesNoOptions: Option[] = [
  { value: "YES", label: "Yes" },
  { value: "NO", label: "No" },
];

type RptExpenseSumPageProps = {
  onClose?: () => void;
};

const RptExpenseSumPage: React.FC<RptExpenseSumPageProps> = ({
  onClose,
}) => {
  const handleEnterAsTab = useEnterAsTab();

  const [rdgBranch, setRdgBranch] = useState("One Branch"); // rdgBranch
  const [lkpBranch, setLkpBranch] = useState<Option | null>(null); // lkpBranch

  // the branches the logged-in user has a right to, and the user's default branch (the old FillCombos)
  const [branchOptions, setBranchOptions] = useState<Option[]>([]);
  const [defaultBranch, setDefaultBranch] = useState<Option | null>(null);

  // the lookups have been asked for (found or not): the cursor can start
  const [lookupsLoaded, setLookupsLoaded] = useState(false);
  const [rdgCostCenter, setRdgCostCenter] = useState("One Cost Center"); // rdgCostCenter
  const [lkpCostCenter, setLkpCostCenter] = useState<Option | null>(null); // lkpCostCenter

  // the cost centers of the company (dbo.fillcostcenters)
  const [costCenterOptions, setCostCenterOptions] = useState<Option[]>([]);

  // the Cost Center boxes: one list, "ID | Name" in the ID box and "Name | ID" in the Name box
  const costCenterPairOptions: PairSelectOption[] = costCenterOptions.map((option) => ({
    value: option.value,
    firstLabel: option.value,
    secondLabel: option.label,
  }));

  useEffect(() => {
    const loadLookups = async () => {
      try {
        const response = await fetch(`${api}/RptExpenseSum/lookups`, {
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

        setCostCenterOptions(
          (result.costCenters || []).map(
            (row: { lkpCostCenter: string; txtCostCenterName: string }) => ({
              value: row.lkpCostCenter,
              label: row.txtCostCenterName,
            }),
          ),
        );
      } catch (error: unknown) {
        console.error("rptExpenseSum lookups error:", error);
        toast.error("Cannot connect to the Expense Summary API.");
      }
    };

    loadLookups().finally(() => setLookupsLoaded(true));
  }, []);

  // the cursor starts on the Branch box
  useInitialFocus(lookupsLoaded, "lkpBranch");

  const [rdgDate, setRdgDate] = useState("For A Period"); // rdgDate
  const [dtpMonth, setDtpMonth] = useState(dayjs().format(MONTH_FORMAT)); // dtpMonth
  const [dtpFromDate, setDtpFromDate] = useState(dayjs().format(DATE_FORMAT)); // dtpFromDate
  const [dtpToDate, setDtpToDate] = useState(dayjs().format(DATE_FORMAT)); // dtpToDate

  const [txtAccountLevel, setTxtAccountLevel] = useState("4"); // txtAccountLevel
  const [lkpPostStatus, setLkpPostStatus] = useState<Option | null>(
    postStatusOptions[1],
  ); // lkpPostStatus
  const [lkpPrint0Balance, setLkpPrint0Balance] = useState<Option | null>(
    yesNoOptions[1],
  ); // lkpPrint0Balance
  const [lkpPrintACGroup, setLkpPrintACGroup] = useState<Option | null>(
    yesNoOptions[0],
  ); // lkpPrintACGroup

  const isPeriod = rdgDate === "For A Period";

  // the Print Preview (after Print) and the Print button while the server makes the report
  const [printing, setPrinting] = useState(false);
  const [preview, setPreview] = useState<{
    report: PrintReport;
    fileBase: string;
    params: ReturnType<typeof buildExpenseSumParams>;
  } | null>(null);

  // dd-mm-yyyy of the box -> yyyy-mm-dd ("" when it is not a date)
  const toIsoDate = (value: string) =>
    dayjs(value, DATE_FORMAT, true).isValid()
      ? dayjs(value, DATE_FORMAT).format("YYYY-MM-DD")
      : "";

  // what the server takes: the element ids of the page, the radios and the lists as their codes
  // mm-yyyy of the box -> yyyy-mm ("" when it is not a month)
  const toIsoMonth = (value: string) =>
    dayjs(value, MONTH_FORMAT, true).isValid()
      ? dayjs(value, MONTH_FORMAT).format("YYYY-MM")
      : "";

  const buildExpenseSumParams = () => ({
    rdgDate: rdgDate === "Up To Month" ? 0 : 1,
    dtpMonth: rdgDate === "Up To Month" ? toIsoMonth(dtpMonth) : "",
    rdgBranch: rdgBranch === "One Branch" ? 0 : 1,
    lkpBranch: rdgBranch === "One Branch" ? (lkpBranch?.value ?? "") : "",
    rdgCostCenter: rdgCostCenter === "One Cost Center" ? 0 : 1,
    lkpCostCenter: rdgCostCenter === "One Cost Center" ? (lkpCostCenter?.value ?? "") : "",
    dtpFromDate: rdgDate === "For A Period" ? toIsoDate(dtpFromDate) : "",
    dtpToDate: rdgDate === "For A Period" ? toIsoDate(dtpToDate) : "",
    txtAccountLevel: Number(txtAccountLevel),
    lkpPostStatus: { ALL: 0, POSTED: 1, UNPOSTED: 2 }[lkpPostStatus?.value ?? "POSTED"] ?? 1,
    lkpPrint0Balance: lkpPrint0Balance?.value === "YES" ? 1 : 0,
    lkpPrintACGroup: lkpPrintACGroup?.value === "YES" ? 1 : 0,
  });

  // Print (the old cmdPrint): the checks of the old form, then the server sends the report and the Print Preview
  // opens (Print = the browser's print window, Download = Excel / PDF)
  const handlePrint = async () => {
    if (printing || preview) return;

    const warn = (message: string, id: string) => {
      toast.warning(message);
      document.getElementById(id)?.focus();
    };

    const params = buildExpenseSumParams();

    if (params.rdgBranch === 0 && !params.lkpBranch) {
      return warn("Please select 'Branch'", "lkpBranch");
    }

    if (params.rdgCostCenter === 0 && !params.lkpCostCenter) {
      return warn("Please select 'Cost Center'", "lkpCostCenter");
    }

    if (params.rdgDate === 0) {
      // Up to Month: the monthly report
      if (!params.dtpMonth) {
        return warn("Please enter 'Month'", "dtpMonth");
      }
    } else {
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

      if (params.dtpFromDate.slice(0, 4) !== params.dtpToDate.slice(0, 4)) {
        return warn("'From Date' and 'To Date' should be in the same year", "dtpToDate");
      }
    }

    if (!Number.isInteger(params.txtAccountLevel) || params.txtAccountLevel < 1 || params.txtAccountLevel > 4) {
      return warn("'Account Level' should be from 1 to 4", "txtAccountLevel");
    }

    setPrinting(true);

    try {
      const response = await fetch(`${api}/RptExpenseSum/print`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        toast.warning(result.message || "The Expense Summary report could not be printed.");
        if (result.field) document.getElementById(result.field)?.focus();
        return;
      }

      setPreview({ report: result.report, fileBase: result.fileBase, params });
    } catch (error: unknown) {
      console.error("rptExpenseSum print error:", error);
      toast.error("Cannot connect to the Expense Summary API.");
    } finally {
      setPrinting(false);
    }
  };

  // the Excel file of the Print Preview, made by the server (null after an error)
  const fetchExcel = async (): Promise<Blob | null> => {
    if (!preview) return null;

    const response = await fetch(`${api}/RptExpenseSum/excel`, {
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
    setRdgCostCenter("One Cost Center");
    setLkpCostCenter(null);
    setRdgDate("For A Period");
    setDtpMonth(dayjs().format(MONTH_FORMAT));
    setDtpFromDate(dayjs().format(DATE_FORMAT));
    setDtpToDate(dayjs().format(DATE_FORMAT));
    setTxtAccountLevel("4");
    setLkpPostStatus(postStatusOptions[1]);
    setLkpPrint0Balance(yesNoOptions[1]);
    setLkpPrintACGroup(yesNoOptions[0]);
    onClose?.();
  };

  // Alt+P -> Print, Alt+C -> Close (the underlined letters on the buttons)
  useAltShortcuts({
    p: () => void handlePrint(),
    c: handleClose,
  });

  // Ctrl+P -> Print (the old forms' Ctrl+P). With the Print Preview open it prints the report that is shown.
  useCtrlShortcuts({
    p: () => (preview ? printExpenseSumReport(preview.report) : void handlePrint()),
  });

  return (
    <ReportForm
      title="Expense Summary"
      onKeyDown={handleEnterAsTab}
      overlay={
        // the Print Preview (after Print)
        preview && (
          <ReportPreview
            showClose={false}
            html={buildHtml(preview.report)}
            fileBase={preview.fileBase}
            onPrint={() => printExpenseSumReport(preview.report)}
            buildPdf={() => buildExpenseSumPdf(preview.report)}
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
        name="Cost Center"
        mode={rdgCostCenter}
        onModeChange={setRdgCostCenter}
        options={costCenterPairOptions}
        value={lkpCostCenter?.value ?? ""}
        onChange={(id) => setLkpCostCenter(costCenterOptions.find((option) => option.value === id) ?? null)}
        // the same ID box width as every other ID + Name pair
        firstWidth={190}
        ids={{ radio: "rdgCostCenter", first: "lkpCostCenter", second: "lkpCostCenterName" }}
      />

      {/* Date mode: Up to Month (a month) / For a Period (two dates) */}
      <FilterRow
        panel={
          <RadioPanel id="rdgDate" className="h-17.5 w-38">
            <CustomRadio
              name="rdgDate"
              value="Up To Month"
              label="Up to Month"
              checked={rdgDate === "Up To Month"}
              onChange={() => setRdgDate("Up To Month")}
            />
            <CustomRadio
              name="rdgDate"
              value="For A Period"
              label="For a Period"
              checked={rdgDate === "For A Period"}
              onChange={() => setRdgDate("For A Period")}
            />
          </RadioPanel>
        }
      >
        <div className="flex min-w-0 flex-wrap items-center" style={{ gap: FILTER_GAP }}>
          {isPeriod ? (
            <>
              <div className="w-38.5">
                <ReportDatePicker id="dtpFromDate" label="From Date" value={dtpFromDate} onChange={setDtpFromDate} />
              </div>
              <div className="w-38.5">
                <ReportDatePicker id="dtpToDate" label="To Date" value={dtpToDate} onChange={setDtpToDate} />
              </div>
            </>
          ) : (
            <div className="w-38.5">
              <ReportDatePicker id="dtpMonth" label="Up To Month" value={dtpMonth} onChange={setDtpMonth} monthOnly />
            </div>
          )}
        </div>
      </FilterRow>

      {/* Account level */}
      <div className="grid grid-cols-[var(--filter-label,150px)_minmax(0,1fr)] items-center gap-x-4">
        <FilterLabel>Account Level :</FilterLabel>
        <input
          id="txtAccountLevel"
          type="number"
          min="1"
          max="4"
          value={txtAccountLevel}
          onChange={(event) => setTxtAccountLevel(event.target.value)}
          className="h-7.5 w-16 rounded-sm border border-gray-300 bg-white px-2 text-[14px] text-[#172b43] outline-none"
        />
      </div>

      <PostStatusFilter options={postStatusOptions} value={lkpPostStatus} onChange={setLkpPostStatus} />

      <LabelSelectFilter
        label="Print 0 Balance"
        id="lkpPrint0Balance"
        options={yesNoOptions}
        value={lkpPrint0Balance}
        onChange={setLkpPrint0Balance}
      />

      <LabelSelectFilter
        label="Print A/c Group"
        id="lkpPrintACGroup"
        options={yesNoOptions}
        value={lkpPrintACGroup}
        onChange={setLkpPrintACGroup}
      />

      <ReportPrintRow onPrint={() => void handlePrint()} disabled={printing} />
    </ReportForm>
  );
};

export default RptExpenseSumPage;
