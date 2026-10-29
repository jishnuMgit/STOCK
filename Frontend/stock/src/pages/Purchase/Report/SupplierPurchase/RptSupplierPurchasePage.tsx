import React, { useEffect, useMemo, useState } from "react";
import Select from "react-select";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { toast } from "react-toastify";
import RadioGroup from "../../../../components/common/RadioGroup";
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
import { useGridCellFocus } from "../../../../hooks/useGridCellFocus";
import { useAdvanceAfterSelect } from "../../../../hooks/useAdvanceAfterSelect";
import { useInitialFocus } from "../../../../hooks/useInitialFocus";
import {
  BranchDividedMenuList,
  BranchDividedOption,
  branchMenuStyles,
  filterLabelOrValue,
} from "../../../../components/BranchSelect/branchSelectParts";
import {
  filterPairOption,
  makePairComponents,
  makePairDividedMenuStyles,
  type PairOption,
} from "../../../../components/PairSelect/pairSelectParts";
import { usePairMenuHang } from "../../../../hooks/usePairMenuHang";

dayjs.extend(customParseFormat);

type Option = { value: string; label: string };

const DATE_FORMAT = "DD-MM-YYYY";

const api = import.meta.env.VITE_API_URL;

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
    ${isFocused ? "!border-green-600" : "!border-[#cfd7df]"}
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

// The Supplier boxes: the "ID | Name" lists of the other screens - the Supplier ID box opens "Supplier ID |
// Supplier Name", the Supplier Name box opens "Supplier Name | Supplier ID", both searchable on either column,
// and picking from one fills the other. Created once, outside the page.
const supplierIdComponents = makePairComponents("Supplier ID", "Supplier Name", false, true);
const supplierNameComponents = makePairComponents("Supplier ID", "Supplier Name", true, true);

// how far the Supplier Name list hangs past its box (its Supplier ID column)
const SUPPLIER_NAME_MENU_HANG = 200;

// the look of the other boxes, but the open list is the pair list's own
const pairProps = {
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
    option: ({ isFocused, isSelected }: { isFocused: boolean; isSelected: boolean }) =>
      `!cursor-pointer !text-[#24364d] ${
        isSelected ? "!bg-[#e7f7ed]" : isFocused ? "!bg-[#f2faf5]" : "!bg-white"
      }`,
  },
  filterOption: filterPairOption,
};

const FieldLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex h-[30px] items-center border border-[#e0e5ea] bg-[#fafbfc] px-3 text-[14px] text-[#405066]">
    {children}
  </div>
);

type AppDatePickerProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
};

const AppDatePicker: React.FC<AppDatePickerProps> = ({
  id,
  label,
  value,
  onChange,
}) => (
  <LocalizationProvider dateAdapter={AdapterDayjs}>
    <DatePicker
      value={value ? dayjs(value, DATE_FORMAT) : null}
      onChange={(newValue) => {
        onChange(newValue?.isValid() ? newValue.format(DATE_FORMAT) : "");
      }}
      format={DATE_FORMAT}
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
          fontSize: "14px",
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
          fontSize: "14px",
          color: "#344054",
        },
        "& .MuiPickersInputBase-input": {
          minWidth: 0,
          width: "100%",
          fontSize: "14px",
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
        // blank look (no "DD-MM-YYYY" hint) while empty and not focused
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
          { borderColor: "#16a34a !important", borderWidth: "1px" }, // green-600, as the cell outline
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

type RptSupplierPurchasePageProps = {
  onClose?: () => void;
};

const RptSupplierPurchasePage: React.FC<RptSupplierPurchasePageProps> = ({
  onClose,
}) => {
  // Enter moves on like Tab; the box the cursor is in is outlined; after a pick from a list the cursor
  // goes on
  const handleEnterAsTab = useEnterAsTab();
  const { cellFocusClass } = useGridCellFocus();
  const { advanceAfterPick, advanceOnEnter } = useAdvanceAfterSelect();

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
  const { hang: supplierIdHang, measure: measureSupplierIdHang } = usePairMenuHang();

  // the supplier boxes: ID | Name, and Name | ID (one supplier, two boxes)
  const supplierIdOptions = useMemo<PairOption[]>(
    () =>
      supplierRows.map((row) => ({
        value: row.lkpSupplierID,
        label: row.lkpSupplierID,
        id: row.lkpSupplierID,
        name: row.txtSupplierName,
      })),
    [supplierRows],
  );

  const supplierNameOptions = useMemo<PairOption[]>(
    () =>
      [...supplierRows]
        .sort((a, b) => a.txtSupplierName.localeCompare(b.txtSupplierName))
        .map((row) => ({
          value: row.lkpSupplierID,
          label: row.txtSupplierName,
          id: row.lkpSupplierID,
          name: row.txtSupplierName,
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

  const supplierDisabled = rdgSupplier !== "One Supplier";

  return (
    <div
      onKeyDown={handleEnterAsTab}
      className="flex min-h-full w-full items-start justify-center bg-white px-4 py-4"
    >
      <div className="min-h-fit w-205 max-w-full bg-white p-0">
        <main className="w-full overflow-hidden border border-gray-400 bg-white">
          <header className="flex h-7.5 items-center justify-start bg-[#9fdfbc]">
            <h1 className="m-0 ml-3.5 text-[17px] font-semibold text-[#24364d]">
              Supplier Purchase
            </h1>
          </header>

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
                  className={`w-[250px] ${cellFocusClass}`}
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

              {/* Supplier */}
              <RadioGroup
                className={cellFocusClass}
                name="rdgSupplier"
                value={rdgSupplier}
                options={[
                  { value: "One Supplier", label: "One Supplier" },
                  { value: "All Supplier", label: "All Supplier" },
                ]}
                onChange={(value) => {
                  setRdgSupplier(value);
                  // the old form clears the supplier when the choice changes
                  setLkpSupplierID("");
                }}
              />
              <div className="pt-3">
                <div className="grid grid-cols-[190px_1fr]">
                  <div
                    className={cellFocusClass}
                    onKeyDown={(event) => advanceOnEnter(event, ["lkpSupplierName"])}
                  >
                    <Select<PairOption, false>
                      inputId="lkpSupplierID"
                      instanceId="lkpSupplierID"
                      name="lkpSupplierID"
                      options={supplierIdOptions}
                      value={supplierIdOptions.find((o) => o.value === lkpSupplierID) ?? null}
                      onChange={(option) => {
                        setLkpSupplierID(option?.value ?? "");
                        if (option) advanceAfterPick("lkpSupplierID", ["lkpSupplierName"]);
                      }}
                      isDisabled={supplierDisabled}
                      components={supplierIdComponents}
                      styles={makePairDividedMenuStyles(supplierIdHang)}
                      onMenuOpen={() => measureSupplierIdHang("lkpSupplierID", "lkpSupplierName")}
                      noOptionsMessage={() => "No Supplier Found"}
                      {...pairProps}
                    />
                  </div>
                  <div
                    className={`-ml-px ${cellFocusClass}`}
                    style={{ marginRight: SUPPLIER_NAME_MENU_HANG }}
                    onKeyDown={(event) => advanceOnEnter(event)}
                  >
                    <Select<PairOption, false>
                      inputId="lkpSupplierName"
                      instanceId="lkpSupplierName"
                      name="lkpSupplierName"
                      options={supplierNameOptions}
                      value={supplierNameOptions.find((o) => o.value === lkpSupplierID) ?? null}
                      onChange={(option) => {
                        setLkpSupplierID(option?.value ?? "");
                        if (option) advanceAfterPick("lkpSupplierName");
                      }}
                      isDisabled={supplierDisabled}
                      components={supplierNameComponents}
                      styles={makePairDividedMenuStyles(SUPPLIER_NAME_MENU_HANG)}
                      noOptionsMessage={() => "No Supplier Found"}
                      {...pairProps}
                    />
                  </div>
                </div>
              </div>

              {/* Period */}
              <FieldLabel>Period :</FieldLabel>
              <div className="flex items-start gap-2">
                <div className={`w-[140px] ${cellFocusClass}`}>
                  <AppDatePicker
                    id="dtpFromDate"
                    label="From Date"
                    value={dtpFromDate}
                    onChange={setDtpFromDate}
                  />
                </div>
                <div className={`w-[140px] ${cellFocusClass}`}>
                  <AppDatePicker
                    id="dtpToDate"
                    label="To Date"
                    value={dtpToDate}
                    onChange={setDtpToDate}
                  />
                </div>
              </div>

              {/* Report type + actions */}
              <RadioGroup
                className={cellFocusClass}
                name="rdgDetOrSum"
                value={rdgDetOrSum}
                options={[
                  { value: "Detailed", label: "Detailed" },
                  { value: "Summary", label: "Summary" },
                ]}
                onChange={setRdgDetOrSum}
              />
              <div className="flex items-end gap-3 self-stretch">
                {/* Detailed only: the documents to print */}
                {rdgDetOrSum === "Detailed" && (
                  <RadioGroup
                    className={`w-[190px] ${cellFocusClass}`}
                    name="rdgDocType"
                    value={rdgDocType}
                    options={[
                      { value: "PI", label: "Purchase Invoice" },
                      { value: "PR", label: "Purchase Return" },
                    ]}
                    onChange={setRdgDocType}
                  />
                )}
                <button
                  id="btnPrint"
                  type="button"
                  onClick={handlePrint}
                  className="btn-style"
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
            </div>
          </section>
        </main>
      </div>

      {/* the Print Preview (after Print) */}
      {preview && (
        <ReportPreview
          html={buildHtml(preview.report)}
          fileBase={preview.fileBase}
          onPrint={() => printSupplierPurchaseReport(preview.report)}
          buildPdf={() => buildSupplierPurchasePdf(preview.report)}
          fetchExcel={fetchExcel}
          onClose={() => setPreview(null)}
        />
      )}
    </div>
  );
}

export default RptSupplierPurchasePage;