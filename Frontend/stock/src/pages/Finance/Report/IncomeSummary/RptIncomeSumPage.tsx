import React, { useEffect, useState } from "react";
import Header from "../../../../components/common/Header";
import Select from "react-select";
import { toast } from "react-toastify";
import {
  BranchDividedMenuList,
  BranchDividedOption,
  branchMenuStyles,
  filterLabelOrValue,
  makeNameIdMenuComponents,
} from "../../../../components/BranchSelect/branchSelectParts";
import { useInitialFocus } from "../../../../hooks/useInitialFocus";
import { useGridCellFocus } from "../../../../hooks/useGridCellFocus";
import { useEnterAsTab } from "../../../../hooks/useEnterAsTab";
import { useAltShortcuts } from "../../../../hooks/useAltShortcuts";
import { useCtrlShortcuts } from "../../../../hooks/useCtrlShortcuts";
import { useAdvanceAfterSelect } from "../../../../hooks/useAdvanceAfterSelect";
import RadioGroup from "../../../../components/common/RadioGroup";
import ReportPreview from "../../../../components/common/ReportPreview";
import {
  buildHtml,
  printIncomeSumReport,
  type PrintReport,
} from "../../../../components/Finance/Report/RptIncomeSum/RptIncomeSumPrintReport";
import { buildIncomeSumPdf } from "../../../../components/Finance/Report/RptIncomeSum/RptIncomeSumPdf";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";

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

const selectClassNames = {
  control: ({
    isFocused,
    isDisabled,
  }: {
    isFocused: boolean;
    isDisabled: boolean;
  }) => `
    !min-h-[25px] !h-[30px] !rounded-[4px] !border !shadow-none !text-[13px]
    hover:!border-[#aab8c5]
    ${isDisabled ? "!bg-[#f6f8fa]" : "!bg-white"}
    ${isFocused ? "!border-[#91a7b9]" : "!border-[#cfd7df]"}
  `,
  valueContainer: () => "!h-[23px] !py-0 !px-[5px] !overflow-hidden",
  singleValue: () => "!m-0 !text-[13px] !text-[#24364d]",
  placeholder: () => "!m-0 !text-[13px] !text-[#7a8794]",
  input: () => "!m-0 !p-0 !text-[13px] !text-[#24364d]",
  indicatorsContainer: () => "!h-[23px]",
  dropdownIndicator: () => "!p-[3px] !text-[#657486]",
  indicatorSeparator: () => "!hidden",
  clearIndicator: () => "!p-[3px]",
  menu: () =>
    "!mt-[1px] !rounded-none !border !border-[#cfd7df] !z-[999999] !shadow-md",
  menuList: () => "!p-0 !max-h-[180px]",
  option: ({
    isFocused,
    isSelected,
  }: {
    isFocused: boolean;
    isSelected: boolean;
  }) => `
    !cursor-pointer !px-[6px] !py-[5px] !text-[13px] !text-[#24364d]
    ${isSelected ? "!bg-[#e7f7ed]" : isFocused ? "!bg-[#f2faf5]" : "!bg-white"}
  `,
};

const selectProps = {
  isSearchable: false,
  isClearable: false,
  placeholder: "",
  classNames: selectClassNames,
  menuPosition: "fixed" as const,
  menuPortalTarget: typeof document !== "undefined" ? document.body : undefined,
};

// The Branch box: the "Branch | ID" list of the other screens, searchable on either column.
const branchProps = {
  ...selectProps,
  isSearchable: true,
  classNames: {
    control: selectClassNames.control,
    valueContainer: selectClassNames.valueContainer,
    singleValue: selectClassNames.singleValue,
    placeholder: selectClassNames.placeholder,
    input: selectClassNames.input,
    indicatorsContainer: selectClassNames.indicatorsContainer,
    dropdownIndicator: selectClassNames.dropdownIndicator,
    indicatorSeparator: selectClassNames.indicatorSeparator,
    clearIndicator: selectClassNames.clearIndicator,
    option: selectClassNames.option,
  },
  styles: branchMenuStyles,
  components: { Option: BranchDividedOption, MenuList: BranchDividedMenuList },
  filterOption: filterLabelOrValue,
};

// The Cost Center box shows the cost center ID; its list is "Cost Center | ID" (name first), searchable on either, laid
// out like the Branch list: the name column is as wide as the box, the ID column hangs out past the box's right edge.
const costCenterMenuComponents = makeNameIdMenuComponents("Cost Center", true); // true: a divider line between the two columns
const costCenterProps = {
  ...branchProps,
  components: {
    Option: costCenterMenuComponents.Option,
    MenuList: costCenterMenuComponents.MenuList,
  },
  getOptionLabel: (option: Option) => option.value,
};

const FieldLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex h-7.5 items-center justify-start border border-[#e0e5ea] bg-[#fafbfc] pl-3 text-[12px] text-[#405066]">
    {children}
  </div>
);

type AppDatePickerProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  monthOnly?: boolean;
};

const AppDatePicker: React.FC<AppDatePickerProps> = ({
  id,
  label,
  value,
  onChange,
  monthOnly = false,
}) => {
  const format = monthOnly ? MONTH_FORMAT : DATE_FORMAT;

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <DatePicker
        value={value ? dayjs(value, format) : null}
        onChange={(newValue) => {
          onChange(newValue?.isValid() ? newValue.format(format) : "");
        }}
        format={format}
        views={monthOnly ? ["year", "month"] : ["year", "month", "day"]}
        slotProps={{
          textField: { id, slotProps: { htmlInput: { "aria-label": label } } },
          openPickerButton: { sx: { padding: "2px", margin: 0 } },
          inputAdornment: { sx: { margin: 0, padding: 0 } },
        }}
        sx={{
          width: "140px",
          "& .MuiPickersTextField-root": { width: "120px" },
          "& .MuiPickersInputBase-root": {
            width: "140px",
            height: "30px",
            minHeight: "30px",
            boxSizing: "border-box",
            borderRadius: "4px",
            backgroundColor: "#ffffff",
            fontSize: "12px",
            padding: 0,
            overflow: "hidden",
          },
          "& .MuiPickersInputBase-sectionsContainer": {
            paddingLeft: "10px !important",
            paddingRight: "0px !important",
            marginBottom: "-5px !important",
            marginLeft: "0px !important",
            boxSizing: "border-box",
            overflow: "hidden",
          },
          "& .MuiPickersInputBase-sectionContent": {
            fontSize: "12px",
            color: "#344054",
          },
          "& .MuiPickersInputBase-input": {
            minWidth: 0,
            width: "100%",
            fontSize: "12px",
            padding: 0,
            height: "30px",
            boxSizing: "border-box",
          },
          "& .MuiInputAdornment-root": { margin: 0, padding: 0 },
          "& .MuiIconButton-root": {
            width: "24px",
            height: "24px",
            padding: "2px",
            margin: 0,
          },
          "& .MuiSvgIcon-root": { fontSize: "16px" },
          // blank look (no format hint) while empty and not focused
          ...(!value && {
            "&:not(:focus-within) .MuiPickersInputBase-sectionsContainer *": {
              color: "transparent",
            },
          }),
          "& .MuiPickersOutlinedInput-notchedOutline": {
            borderColor: "#B7C7D7 !important",
          },
          "& .MuiPickersInputBase-root:hover .MuiPickersOutlinedInput-notchedOutline":
            { borderColor: "#B7C7D7 !important" },
          "& .MuiPickersInputBase-root.Mui-focused .MuiPickersOutlinedInput-notchedOutline":
            { borderColor: "#B7C7D7 !important", borderWidth: "1px" },
          "& .MuiPickersInputBase-root.Mui-error .MuiPickersOutlinedInput-notchedOutline":
            { borderColor: "#B7C7D7 !important" },
          "& .MuiPickersInputBase-root.Mui-error:hover .MuiPickersOutlinedInput-notchedOutline":
            { borderColor: "#B7C7D7 !important" },
          "& .MuiPickersInputBase-root.Mui-error.Mui-focused .MuiPickersOutlinedInput-notchedOutline":
            { borderColor: "#B7C7D7 !important" },
        }}
      />
    </LocalizationProvider>
  );
};

type RptIncomeSumPageProps = {
  onClose?: () => void;
};

const RptIncomeSumPage: React.FC<RptIncomeSumPageProps> = ({
  onClose,
}) => {
  const handleEnterAsTab = useEnterAsTab();
  const { cellFocusClass } = useGridCellFocus();
  const { advanceAfterPick, advanceOnEnter } = useAdvanceAfterSelect();

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

  useEffect(() => {
    const loadLookups = async () => {
      try {
        const response = await fetch(`${api}/RptIncomeSum/lookups`, {
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
        console.error("rptIncomeSum lookups error:", error);
        toast.error("Cannot connect to the Income Summary API.");
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
    params: ReturnType<typeof buildIncomeSumParams>;
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

  const buildIncomeSumParams = () => ({
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

    const params = buildIncomeSumParams();

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
      const response = await fetch(`${api}/RptIncomeSum/print`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        toast.warning(result.message || "The Income Summary report could not be printed.");
        if (result.field) document.getElementById(result.field)?.focus();
        return;
      }

      setPreview({ report: result.report, fileBase: result.fileBase, params });
    } catch (error: unknown) {
      console.error("rptIncomeSum print error:", error);
      toast.error("Cannot connect to the Income Summary API.");
    } finally {
      setPrinting(false);
    }
  };

  // the Excel file of the Print Preview, made by the server (null after an error)
  const fetchExcel = async (): Promise<Blob | null> => {
    if (!preview) return null;

    const response = await fetch(`${api}/RptIncomeSum/excel`, {
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
    p: () => (preview ? printIncomeSumReport(preview.report) : void handlePrint()),
  });

  return (
    <div
      onKeyDown={handleEnterAsTab}
      className="flex min-h-full w-full items-start justify-center bg-white px-4 py-4"
    >
      <div className="min-h-fit w-175 max-w-full bg-white p-0">
        <main className="w-full overflow-hidden border border-gray-400 bg-white">
          <Header Name="Income Summary" />

          <section className="px-3.5 pb-6 pt-3">
            <div className="grid grid-cols-[168px_1fr] items-start gap-x-4 gap-y-3">
              {/* Branch */}
              <RadioGroup
                className={cellFocusClass}
                name="rdgBranch"
                value={rdgBranch}
                options={[
                  { value: "One Branch", label: "One Branch" },
                  { value: "All Branch", label: "All Branch" },
                ]}
                onChange={setRdgBranch}
              />
              <div className="pt-3">
                <div
                  className={`w-62.5 ${cellFocusClass}`}
                  onKeyDown={(event) => advanceOnEnter(event)}
                >
                  <Select
                    inputId="lkpBranch"
                    instanceId="lkpBranch"
                    options={branchOptions}
                    value={lkpBranch}
                    onChange={(option) => {
                      setLkpBranch(option);
                      if (option) advanceAfterPick("lkpBranch");
                    }}
                    isDisabled={rdgBranch !== "One Branch"}
                    noOptionsMessage={() => "No Branch Found"}
                    {...branchProps}
                  />
                </div>
              </div>

              {/* Cost center */}
              <RadioGroup
                className={cellFocusClass}
                name="rdgCostCenter"
                value={rdgCostCenter}
                options={[
                  { value: "One Cost Center", label: "One Cost Center" },
                  { value: "All Cost Center", label: "All Cost Center" },
                ]}
                onChange={setRdgCostCenter}
              />
              <div className="pt-3">
                <div
                  className={`w-62.5 ${cellFocusClass}`}
                  onKeyDown={(event) => advanceOnEnter(event)}
                >
                  <Select
                    inputId="lkpCostCenter"
                    instanceId="lkpCostCenter"
                    options={costCenterOptions}
                    value={lkpCostCenter}
                    onChange={(option) => {
                      setLkpCostCenter(option);
                      if (option) advanceAfterPick("lkpCostCenter");
                    }}
                    isDisabled={rdgCostCenter !== "One Cost Center"}
                    noOptionsMessage={() => "No Cost Center Found"}
                    {...costCenterProps}
                  />
                </div>
              </div>

              {/* Date mode */}
              <RadioGroup
                className={cellFocusClass}
                name="rdgDate"
                value={rdgDate}
                options={[
                  { value: "Up To Month", label: "Up to Month" },
                  { value: "For A Period", label: "For a Period" },
                ]}
                onChange={setRdgDate}
              />
              <div
                className={`flex items-start gap-2 ${isPeriod ? "pt-9.5" : "pt-1.75"}`}
              >
                {isPeriod ? (
                  <>
                    <div className={`w-35 ${cellFocusClass}`}>
                      <AppDatePicker
                        id="dtpFromDate"
                        label="From Date"
                        value={dtpFromDate}
                        onChange={setDtpFromDate}
                      />
                    </div>
                    <div className={`w-35 ${cellFocusClass}`}>
                      <AppDatePicker
                        id="dtpToDate"
                        label="To Date"
                        value={dtpToDate}
                        onChange={setDtpToDate}
                      />
                    </div>
                  </>
                ) : (
                  <div className={`w-35 ${cellFocusClass}`}>
                    <AppDatePicker
                      id="dtpMonth"
                      label="Up To Month"
                      value={dtpMonth}
                      onChange={setDtpMonth}
                      monthOnly
                    />
                  </div>
                )}
              </div>

              {/* Account level */}
              <FieldLabel>Account Level :</FieldLabel>
              <div className={`w-14 ${cellFocusClass}`}>
                <input
                  id="txtAccountLevel"
                  type="number"
                  min="1"
                  max="4"
                  value={txtAccountLevel}
                  onChange={(event) => setTxtAccountLevel(event.target.value)}
                  className="h-7.5 w-14 rounded-sm border border-[#cfd7df] bg-white px-2 text-[12px] text-[#24364d] outline-none focus:border-[#91a7b9]"
                />
              </div>

              {/* Post status */}
              <FieldLabel>Post Status :</FieldLabel>
              <div
                className={`w-35 ${cellFocusClass}`}
                onKeyDown={(event) => advanceOnEnter(event)}
              >
                <Select
                  inputId="lkpPostStatus"
                  instanceId="lkpPostStatus"
                  options={postStatusOptions}
                  value={lkpPostStatus}
                  onChange={(option) => {
                    setLkpPostStatus(option);
                    if (option) advanceAfterPick("lkpPostStatus");
                  }}
                  {...selectProps}
                />
              </div>

              {/* Print 0 balance */}
              <FieldLabel>Print 0 Balance :</FieldLabel>
              <div
                className={`w-25 ${cellFocusClass}`}
                onKeyDown={(event) => advanceOnEnter(event)}
              >
                <Select
                  inputId="lkpPrint0Balance"
                  instanceId="lkpPrint0Balance"
                  options={yesNoOptions}
                  value={lkpPrint0Balance}
                  onChange={(option) => {
                    setLkpPrint0Balance(option);
                    if (option) advanceAfterPick("lkpPrint0Balance");
                  }}
                  {...selectProps}
                />
              </div>

              {/* Print A/c group */}
              <FieldLabel>Print A/c Group :</FieldLabel>
              <div
                className={`w-25 ${cellFocusClass}`}
                onKeyDown={(event) => advanceOnEnter(event)}
              >
                <Select
                  inputId="lkpPrintACGroup"
                  instanceId="lkpPrintACGroup"
                  options={yesNoOptions}
                  value={lkpPrintACGroup}
                  onChange={(option) => {
                    setLkpPrintACGroup(option);
                    if (option) advanceAfterPick("lkpPrintACGroup");
                  }}
                  {...selectProps}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 flex justify-center gap-3">
              <button
                id="btnPrint"
                type="button"
                onClick={() => void handlePrint()}
                disabled={printing}
                className="btn-style disabled:cursor-not-allowed disabled:opacity-60"
              >
                <u>P</u>rint
              </button>
              <button
                id="btnClose"
                type="button"
                onClick={handleClose}
                className="btn-style"
              >
                <u>C</u>lose
              </button>
            </div>
          </section>
        </main>
      </div>

      {/* the Print Preview (after Print) */}
      {preview && (
        <ReportPreview
          html={buildHtml(preview.report)}
          fileBase={preview.fileBase}
          onPrint={() => printIncomeSumReport(preview.report)}
          buildPdf={() => buildIncomeSumPdf(preview.report)}
          fetchExcel={fetchExcel}
          onClose={() => setPreview(null)}
        />
      )}
    </div>
  );
};

export default RptIncomeSumPage;