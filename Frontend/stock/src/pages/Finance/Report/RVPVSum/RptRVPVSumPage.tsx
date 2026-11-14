import React, { useEffect, useMemo, useState } from "react";
import Select, { type StylesConfig } from "react-select";
import { toast } from "react-toastify";
import {
  BranchDividedMenuList,
  BranchDividedOption,
  branchMenuStyles,
  filterLabelOrValue,
  makeNameIdMenuComponents,
} from "../../../../components/BranchSelect/branchSelectParts";
import {
  filterPairOption,
  makePairComponents,
  makePairDividedMenuStyles,
  type PairOption,
} from "../../../../components/PairSelect/pairSelectParts";
import { usePairMenuHang } from "../../../../hooks/usePairMenuHang";
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
  printRVPVSumReport,
  type PrintReport,
} from "../../../../components/Finance/Report/RptRVPVSum/RptRVPVSumPrintReport";
import { buildRVPVSumPdf } from "../../../../components/Finance/Report/RptRVPVSum/RptRVPVSumPdf";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import Header from "../../../../components/common/Header";

dayjs.extend(customParseFormat);

type Option = { value: string; label: string };

const DATE_FORMAT = "DD-MM-YYYY";
const MONTH_FORMAT = "MM-YYYY";

const api = import.meta.env.VITE_API_URL;

/* Replace these with data from your API */
const postStatusOptions: Option[] = [
  { value: "ALL", label: "All" },
  { value: "POSTED", label: "Posted" },
  { value: "UNPOSTED", label: "Not Posted" },
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

// The Document box shows the document name; its list is "Document | ID" (name first), searchable on either.
const documentMenuComponents = makeNameIdMenuComponents("Document", true); // true: a divider line between the two columns
const documentProps = {
  ...branchProps,
  components: {
    Option: documentMenuComponents.Option,
    MenuList: documentMenuComponents.MenuList,
  },
};

// The Selected Branch box (the old checked combo): the same "Branch | ID" list, any number of branches ticked. The box
// grows with the branches ticked, so the names stay readable.
const chkBranchProps = {
  ...branchProps,
  isMulti: true as const,
  // the Branch list's look, typed for a list of many
  styles: branchMenuStyles as unknown as StylesConfig<Option, true>,
  closeMenuOnSelect: false,
  hideSelectedOptions: false,
  classNames: {
    ...branchProps.classNames,
    control: () =>
      "!min-h-[30px] !h-auto !rounded-[4px] !border !shadow-none !text-[13px] !bg-white !border-[#cfd7df] hover:!border-[#aab8c5]",
    valueContainer: () => "!h-auto !min-h-[23px] !py-0 !px-[5px] gap-[2px]",
    multiValue: () => "!m-0 !rounded-[3px] !bg-[#e7f7ed]",
    multiValueLabel: () => "!text-[12px] !text-[#24364d] !py-0",
    multiValueRemove: () => "!px-[3px] !text-[#657486] hover:!bg-[#cfeedd]",
  },
};

// The Account boxes: the "ID | Name" lists of the other screens - the Account ID box opens "Account ID | Account Name",
// the Account Name box opens "Account Name | Account ID", both searchable on either column, and picking from one fills
// the other. Created once, outside the page.
const accountIdComponents = makePairComponents("Account ID", "Account Name", false, true);
const accountNameComponents = makePairComponents("Account ID", "Account Name", true, true);

// how far the Account Name list hangs past its box (its Account ID column)
const ACCOUNT_NAME_MENU_HANG = 150;

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

type RptRVPVSumPageProps = {
  onClose?: () => void;
};

const RptRVPVSumPage: React.FC<RptRVPVSumPageProps> = ({
  onClose,
}) => {
  const handleEnterAsTab = useEnterAsTab();
  const { cellFocusClass } = useGridCellFocus();
  const { advanceAfterPick, advanceOnEnter } = useAdvanceAfterSelect();
  const { hang: accountIdHang, measure: measureAccountIdHang } = usePairMenuHang();

  const [rdgBranch, setRdgBranch] = useState("One Branch"); // rdgBranch
  const [lkpBranch, setLkpBranch] = useState<Option | null>(null); // lkpBranch
  const [chkBranch, setChkBranch] = useState<Option[]>([]); // chkBranch (Selected Branch)

  // the branches the logged-in user has a right to, and the user's default branch (the old FillCombos)
  const [branchOptions, setBranchOptions] = useState<Option[]>([]);
  const [defaultBranch, setDefaultBranch] = useState<Option | null>(null);

  // the documents of the Finance module (without JV / PJ / SJ) and the head accounts
  const [documentOptions, setDocumentOptions] = useState<Option[]>([]);
  const [accountRows, setAccountRows] = useState<{ lkpAccountID: string; txtAccountName: string }[]>([]);

  // the lookups have been asked for (found or not): the cursor can start
  const [lookupsLoaded, setLookupsLoaded] = useState(false);

  useEffect(() => {
    const loadLookups = async () => {
      try {
        const response = await fetch(`${api}/RptRVPVSum/lookups`, {
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

        setDocumentOptions(
          (result.documents || []).map(
            (row: { lkpDocument: string; txtDocumentName: string }) => ({
              value: row.lkpDocument,
              label: row.txtDocumentName,
            }),
          ),
        );

        setAccountRows(result.accounts || []);
      } catch (error: unknown) {
        console.error("rptRVPVSum lookups error:", error);
        toast.error("Cannot connect to the Receipt / Payment Summary API.");
      }
    };

    loadLookups().finally(() => setLookupsLoaded(true));
  }, []);

  // the cursor starts on the Branch box
  useInitialFocus(lookupsLoaded, "lkpBranch");

  const [lkpDocument, setLkpDocument] = useState<Option | null>(null); // lkpDocument

  const [rdgAccount, setRdgAccount] = useState("All Account"); // rdgAccount (the old form starts on All Account)
  const [lkpAccountID, setLkpAccountID] = useState(""); // lkpAccountID / lkpAccountName

  // the account boxes: ID | Name, and Name | ID (one account, two boxes)
  const accountIdOptions = useMemo<PairOption[]>(
    () =>
      accountRows.map((row) => ({
        value: row.lkpAccountID,
        label: row.lkpAccountID,
        id: row.lkpAccountID,
        name: row.txtAccountName,
      })),
    [accountRows],
  );

  const accountNameOptions = useMemo<PairOption[]>(
    () =>
      [...accountRows]
        .sort((a, b) => a.txtAccountName.localeCompare(b.txtAccountName))
        .map((row) => ({
          value: row.lkpAccountID,
          label: row.txtAccountName,
          id: row.lkpAccountID,
          name: row.txtAccountName,
        })),
    [accountRows],
  );

  const [dtpFromDate, setDtpFromDate] = useState(dayjs().format(DATE_FORMAT)); // dtpFromDate
  const [dtpToDate, setDtpToDate] = useState(dayjs().format(DATE_FORMAT)); // dtpToDate
  const [lkpPostStatus, setLkpPostStatus] = useState<Option | null>(
    postStatusOptions[1],
  ); // lkpPostStatus

  // the Print Preview (after Print) and the Print button while the server makes the report
  const [printing, setPrinting] = useState(false);
  const [preview, setPreview] = useState<{
    report: PrintReport;
    fileBase: string;
    params: ReturnType<typeof buildRVPVSumParams>;
  } | null>(null);

  // dd-mm-yyyy of the box -> yyyy-mm-dd ("" when it is not a date)
  const toIsoDate = (value: string) =>
    dayjs(value, DATE_FORMAT, true).isValid()
      ? dayjs(value, DATE_FORMAT).format("YYYY-MM-DD")
      : "";

  // what the server takes: the element ids of the page, the radios and the lists as their codes
  const buildRVPVSumParams = () => ({
    rdgBranch: { "One Branch": 0, "Selected Branch": 1, "All Branch": 2 }[rdgBranch] ?? 0,
    lkpBranch: rdgBranch === "One Branch" ? (lkpBranch?.value ?? "") : "",
    chkBranch: rdgBranch === "Selected Branch" ? chkBranch.map((option) => option.value) : [],
    lkpDocument: lkpDocument?.value ?? "",
    rdgAccount: rdgAccount === "One Account" ? 0 : 1,
    lkpAccountID: rdgAccount === "One Account" ? lkpAccountID : "",
    dtpFromDate: toIsoDate(dtpFromDate),
    dtpToDate: toIsoDate(dtpToDate),
    lkpPostStatus: { ALL: 0, POSTED: 1, UNPOSTED: 2 }[lkpPostStatus?.value ?? "POSTED"] ?? 1,
  });

  // Print (the old cmdPrint): the checks of the old form, then the server sends the report and the Print Preview
  // opens (Print = the browser's print window, Download = Excel / PDF)
  const handlePrint = async () => {
    if (printing || preview) return;

    const warn = (message: string, id: string) => {
      toast.warning(message);
      document.getElementById(id)?.focus();
    };

    const params = buildRVPVSumParams();

    if (!params.lkpDocument) {
      return warn("Please select a 'Document'", "lkpDocument");
    }

    if (params.rdgBranch === 0 && !params.lkpBranch) {
      return warn("Please select a 'Branch'", "lkpBranch");
    }

    if (params.rdgBranch === 1 && params.chkBranch.length === 0) {
      return warn("Please select atleast one 'Branch'", "chkBranch");
    }

    if (params.rdgAccount === 0 && !params.lkpAccountID) {
      return warn("Please select an 'Account ID'", "lkpAccountID");
    }

    if (!params.dtpFromDate) {
      return warn("Please select 'From Date'", "dtpFromDate");
    }

    if (!params.dtpToDate) {
      return warn("Please select 'To Date'", "dtpToDate");
    }

    // yyyy-mm-dd texts compare as dates
    if (params.dtpFromDate > params.dtpToDate) {
      return warn("'To Date' should be greater than 'From Date'", "dtpToDate");
    }

    if (params.dtpFromDate.slice(0, 4) !== params.dtpToDate.slice(0, 4)) {
      return warn("'From Date' and 'To Date' should be in the same year", "dtpToDate");
    }

    setPrinting(true);

    try {
      const response = await fetch(`${api}/RptRVPVSum/print`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        toast.warning(result.message || "The Receipt / Payment Summary report could not be printed.");
        if (result.field) document.getElementById(result.field)?.focus();
        return;
      }

      setPreview({ report: result.report, fileBase: result.fileBase, params });
    } catch (error: unknown) {
      console.error("rptRVPVSum print error:", error);
      toast.error("Cannot connect to the Receipt / Payment Summary API.");
    } finally {
      setPrinting(false);
    }
  };

  // the Excel file of the Print Preview, made by the server (null after an error)
  const fetchExcel = async (): Promise<Blob | null> => {
    if (!preview) return null;

    const response = await fetch(`${api}/RptRVPVSum/excel`, {
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
    setChkBranch([]);
    setLkpDocument(null);
    setRdgAccount("All Account");
    setLkpAccountID("");
    setDtpFromDate(dayjs().format(DATE_FORMAT));
    setDtpToDate(dayjs().format(DATE_FORMAT));
    setLkpPostStatus(postStatusOptions[1]);
    onClose?.();
  };

  // Alt+P -> Print, Alt+C -> Close (the underlined letters on the buttons)
  useAltShortcuts({
    p: () => void handlePrint(),
    c: handleClose,
  });

  // Ctrl+P -> Print (the old form's Ctrl+P). With the Print Preview open it prints the report that is shown.
  useCtrlShortcuts({
    p: () => (preview ? printRVPVSumReport(preview.report) : void handlePrint()),
  });

  return (
    <div
      onKeyDown={handleEnterAsTab}
      className="flex min-h-full w-full items-start justify-center bg-white px-4 py-4"
    >
      <div className="min-h-fit min-w-205 w-220 max-w-full bg-white p-0">
        <main className="w-full overflow-hidden border border-gray-400 bg-white">
         <Header Name="Receipt / Payment Summary" />

          <section className="px-3.5 pb-6 pt-3">
            <div className="grid grid-cols-[168px_1fr] items-start gap-x-4 gap-y-3">
              {/* Branch: One Branch / Selected Branch / All Branch */}
              <RadioGroup
                className={cellFocusClass}
                name="rdgBranch"
                value={rdgBranch}
                options={[
                  { value: "One Branch", label: "One Branch" },
                  { value: "Selected Branch", label: "Selected Branch" },
                  { value: "All Branch", label: "All Branch" },
                ]}
                onChange={setRdgBranch}
              />
              <div className="pt-3">
                {rdgBranch === "One Branch" && (
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
                      noOptionsMessage={() => "No Branch Found"}
                      {...branchProps}
                    />
                  </div>
                )}
                {rdgBranch === "Selected Branch" && (
                  <div className={`w-62.5 ${cellFocusClass}`}>
                    <Select<Option, true>
                      inputId="chkBranch"
                      instanceId="chkBranch"
                      options={branchOptions}
                      value={chkBranch}
                      onChange={(options) => setChkBranch([...options])}
                      noOptionsMessage={() => "No Branch Found"}
                      {...chkBranchProps}
                    />
                  </div>
                )}
              </div>

              {/* Document */}
              <FieldLabel>Document :</FieldLabel>
              <div
                className={`w-62.5 ${cellFocusClass}`}
                onKeyDown={(event) => advanceOnEnter(event)}
              >
                <Select
                  inputId="lkpDocument"
                  instanceId="lkpDocument"
                  options={documentOptions}
                  value={lkpDocument}
                  onChange={(option) => {
                    setLkpDocument(option);
                    if (option) advanceAfterPick("lkpDocument");
                  }}
                  noOptionsMessage={() => "No Document Found"}
                  {...documentProps}
                />
              </div>

              {/* Account: One Account / All Account */}
              <RadioGroup
                className={cellFocusClass}
                name="rdgAccount"
                value={rdgAccount}
                options={[
                  { value: "One Account", label: "One Account" },
                  { value: "All Account", label: "All Account" },
                ]}
                onChange={setRdgAccount}
              />
              <div className="pt-3">
                {rdgAccount === "One Account" && (
                  <div className="grid grid-cols-[150px_1fr]">
                    <div
                      className={cellFocusClass}
                      onKeyDown={(event) => advanceOnEnter(event, ["lkpAccountName"])}
                    >
                      <Select<PairOption, false>
                        inputId="lkpAccountID"
                        instanceId="lkpAccountID"
                        name="lkpAccountID"
                        options={accountIdOptions}
                        value={accountIdOptions.find((o) => o.value === lkpAccountID) ?? null}
                        onChange={(option) => {
                          setLkpAccountID(option?.value ?? "");
                          if (option) advanceAfterPick("lkpAccountID", ["lkpAccountName"]);
                        }}
                        components={accountIdComponents}
                        styles={makePairDividedMenuStyles(accountIdHang)}
                        onMenuOpen={() => measureAccountIdHang("lkpAccountID", "lkpAccountName")}
                        noOptionsMessage={() => "No Account Found"}
                        {...pairProps}
                      />
                    </div>
                    <div
                      className={`-ml-px ${cellFocusClass}`}
                      style={{ marginRight: ACCOUNT_NAME_MENU_HANG }}
                      onKeyDown={(event) => advanceOnEnter(event)}
                    >
                      <Select<PairOption, false>
                        inputId="lkpAccountName"
                        instanceId="lkpAccountName"
                        name="lkpAccountName"
                        options={accountNameOptions}
                        value={accountNameOptions.find((o) => o.value === lkpAccountID) ?? null}
                        onChange={(option) => {
                          setLkpAccountID(option?.value ?? "");
                          if (option) advanceAfterPick("lkpAccountName");
                        }}
                        components={accountNameComponents}
                        styles={makePairDividedMenuStyles(ACCOUNT_NAME_MENU_HANG)}
                        noOptionsMessage={() => "No Account Found"}
                        {...pairProps}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Period */}
              <FieldLabel>Period :</FieldLabel>
              <div className="flex items-start gap-2">
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
          showClose={false}
          html={buildHtml(preview.report)}
          fileBase={preview.fileBase}
          onPrint={() => printRVPVSumReport(preview.report)}
          buildPdf={() => buildRVPVSumPdf(preview.report)}
          fetchExcel={fetchExcel}
          onClose={() => setPreview(null)}
        />
      )}
    </div>
  );
};

export default RptRVPVSumPage;
