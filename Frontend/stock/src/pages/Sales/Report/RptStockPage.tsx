import React, { useEffect, useMemo, useState } from "react";
import Select from "react-select";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { toast } from "react-toastify";
import RadioGroup from "../../../components/common/RadioGroup";
import { useEnterAsTab } from "../../../hooks/useEnterAsTab";
import { useAltShortcuts } from "../../../hooks/useAltShortcuts";
import { useGridCellFocus } from "../../../hooks/useGridCellFocus";
import { useAdvanceAfterSelect } from "../../../hooks/useAdvanceAfterSelect";
import { useInitialFocus } from "../../../hooks/useInitialFocus";
import ReportPreview from "../../../components/common/ReportPreview";
import { buildStockPdf } from "../../../components/Sales/Report/RptStock/RptStockPdf";
import {
  buildHtml,
  printStockReport,
  type PrintReport,
} from "../../../components/Sales/Report/RptStock/RptStockPrintReport";
import {
  filterPairOption,
  makePairComponents,
  makePairDividedMenuStyles,
  type PairOption,
} from "../../../components/PairSelect/pairSelectParts";
import { usePairMenuHang } from "../../../hooks/usePairMenuHang";
import {
  BranchDividedMenuList,
  BranchDividedOption,
  branchMenuStyles,
  filterLabelOrValue,
} from "../../../components/BranchSelect/branchSelectParts";

dayjs.extend(customParseFormat);

type Option = { value: string; label: string };

const DATE_FORMAT = "DD-MM-YYYY";
const TODAY = dayjs().format(DATE_FORMAT);

const api = import.meta.env.VITE_API_URL;

const postStatusOptions: Option[] = [
  { value: "ALL", label: "All" },
  { value: "POSTED", label: "Posted" },
  { value: "UNPOSTED", label: "Unposted" },
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
  classNames: selectClassNames,
  menuPosition: "fixed" as const,
  menuPortalTarget: typeof document !== "undefined" ? document.body : undefined,
};

// The Branch box: the same "Branch | ID" list as the Branch boxes of the other screens (grey
// header, a divider, the ID of every branch next to its name; searchable on either). Only its
// list differs from the other boxes, so the menu / list / row looks of selectClassNames are left out.
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

// The Item Group boxes: the same two-column "ID | Name" lists as the Item boxes of Beginning
// Stock (components/PairSelect): the Group ID box opens "Group ID | Group Name", the Group
// Name box opens "Group Name | Group ID", both with a divider, both searchable on either
// column, and picking from one fills the other. Created once, outside the page.
const groupIdComponents = makePairComponents("Group ID", "Group Name", false, true);
const groupNameComponents = makePairComponents("Group ID", "Group Name", true, true);

// The Item boxes: the same "ID | Name" lists as the Item Group boxes (the Item ID box opens
// "Item ID | Item Name", the Item Name box opens "Item Name | Item ID").
const itemIdComponents = makePairComponents("Item ID", "Item Name", false, true);
const itemNameComponents = makePairComponents("Item ID", "Item Name", true, true);

// how far the Group Name list hangs past its box (its Group ID column)
const NAME_MENU_HANG = 120;

// how far the Item Name list hangs past its box (its Item ID column): an Item ID can be long
// (ACCSS-1.5MM-CABLE), so this column is wider
const ITEM_NAME_MENU_HANG = 200;

// how far the lists of the Item Range boxes hang past their box
const RANGE_MENU_HANG = 210;

// the look of the other boxes, but the open list is the pair list's own (its menu, rows and
// header come from the components and the divided styles); only the row colours are kept
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

const FieldLabel: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = "" }) => (
  <div
    className={`flex h-[30px] items-center border border-[#e0e5ea] bg-[#fafbfc] px-3 text-[12px] text-[#405066] ${className}`}
  >
    {children}
  </div>
);

type AppDatePickerProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

const AppDatePicker: React.FC<AppDatePickerProps> = ({
  id,
  label,
  value,
  onChange,
  disabled = false,
}) => (
  <LocalizationProvider dateAdapter={AdapterDayjs}>
    <DatePicker
      value={value ? dayjs(value, DATE_FORMAT) : null}
      onChange={(newValue) => {
        onChange(newValue?.isValid() ? newValue.format(DATE_FORMAT) : "");
      }}
      format={DATE_FORMAT}
      disabled={disabled}
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
        "& .Mui-disabled": { WebkitTextFillColor: "#24364d" },
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

const RptStockPage: React.FC = () => {
  // Enter moves on like Tab; the box the cursor is in is outlined; after a pick from a list the
  // cursor goes on
  const handleEnterAsTab = useEnterAsTab();
  const { cellFocusClass } = useGridCellFocus();
  const { advanceAfterPick, advanceOnEnter } = useAdvanceAfterSelect();

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

  // the Group ID list covers the Group ID box AND the Group Name box next to it (measured
  // when it opens)
  const { hang: groupIdHang, measure: measureGroupIdHang } = usePairMenuHang();

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
    { lkpItemID: string; txtItemName: string; lkpItemGroupID: string }[]
  >([]);
  const { hang: itemIdHang, measure: measureItemIdHang } = usePairMenuHang();

  useEffect(() => {
    const loadBranches = async () => {
      try {
        const response = await fetch(`${api}/RptStock/lookups`, { credentials: "include" });
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
        setBranch(initial);
        setGroupRows(result.groups || []);
        setItemRows(result.items || []);
      } catch (error: unknown) {
        console.error("rptStock branches error:", error);
        toast.error("Cannot connect to the Stock report API.");
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

  // the group boxes: ID | Name, and Name | ID (one group, two boxes)
  const groupIdOptions = useMemo<PairOption[]>(
    () =>
      groupRows.map((row) => ({
        value: row.lkpItemGroupID,
        label: row.lkpItemGroupID,
        id: row.lkpItemGroupID,
        name: row.txtItemGroupName,
      })),
    [groupRows],
  );

  const groupNameOptions = useMemo<PairOption[]>(
    () =>
      [...groupRows]
        .sort((a, b) => a.txtItemGroupName.localeCompare(b.txtItemGroupName))
        .map((row) => ({
          value: row.lkpItemGroupID,
          label: row.txtItemGroupName,
          id: row.lkpItemGroupID,
          name: row.txtItemGroupName,
        })),
    [groupRows],
  );

  // the item boxes: ID | Name, and Name | ID (one item, two boxes)
  const itemIdOptions = useMemo<PairOption[]>(
    () =>
      itemRows.map((row) => ({
        value: row.lkpItemID,
        label: row.lkpItemID,
        id: row.lkpItemID,
        name: row.txtItemName,
      })),
    [itemRows],
  );

  const itemNameOptions = useMemo<PairOption[]>(
    () =>
      [...itemRows]
        .sort((a, b) => a.txtItemName.localeCompare(b.txtItemName))
        .map((row) => ({
          value: row.lkpItemID,
          label: row.txtItemName,
          id: row.lkpItemID,
          name: row.txtItemName,
        })),
    [itemRows],
  );

  const handleClear = () => {
    setRdgBranch("One Branch");
    setBranch(defaultBranch);
    setRdgByItem("By Item");
    setRdgItem("One Item");
    setRdgItemGroup("One Item Group");
    setOneItemId("");
    setFromItem("");
    setToItem("");
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
      toast.warning(message);
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
      const response = await fetch(`${api}/RptStock/print`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        toast.warning(result.message || "The Stock report could not be printed.");
        if (result.field) document.getElementById(result.field)?.focus();
        return;
      }

      setPreview({ report: result.report, fileBase: result.fileBase, params });
    } catch (error: unknown) {
      console.error("rptStock print error:", error);
      toast.error("Cannot connect to the Stock report API.");
    } finally {
      setPrinting(false);
    }
  };

  // the Excel file of the Print Preview, made by the server (null after an error)
  const fetchExcel = async (): Promise<Blob | null> => {
    if (!preview) return null;

    const response = await fetch(`${api}/RptStock/excel`, {
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

  // the cursor starts on the Branch box
  useInitialFocus(lookupsLoaded, "lkpBranch");

  // Alt+P -> Print, Alt+C -> Clear (the underlined letters on the buttons)
  useAltShortcuts({
    p: handlePrint,
    c: handleClear,
  });

  const itemRadioDisabled = rdgByItem !== "By Item";
  const groupRadioDisabled = rdgByItem !== "By Group";
  const oneItemDisabled =
    rdgByItem !== "By Item" ||
    (rdgItem !== "One Item" && rdgItem !== "Item Range");
  const groupDisabled = rdgByItem !== "By Group" || rdgItemGroup !== "One Item Group";

  return (
    <div
      onKeyDown={handleEnterAsTab}
      className="flex min-h-screen w-full items-start justify-center bg-white px-4 py-4"
    >
      <div className="min-h-fit w-240 max-w-full bg-white p-0">
        <main className="w-full overflow-hidden border border-gray-400 bg-white">
           <header
          className="
            flex
            h-7.5
            items-center
            justify-start
          
            bg-[#9fdfbc]
          "
        >
          <h1
            className="
              m-0
                ml-3.5
              text-[17px]
              font-semibold
              text-[#24364d]
            "
          >
            Stock
          </h1>
        </header>

          <section className="px-3.5 pb-6 pt-3">
            <div className="grid grid-cols-[168px_1fr] gap-x-4 gap-y-3">
              {/* Branch */}
              <RadioGroup
                className={cellFocusClass}
                name="rdgBranch"
                value={rdgBranch}
                options={[
                  { value: "One Branch", label: "One Branch" },
                  { value: "All Branches", label: "All Branches" },
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
                    value={branch}
                    onChange={(option) => {
                      setBranch(option);
                      if (option) advanceAfterPick("lkpBranch");
                    }}
                    isDisabled={rdgBranch !== "One Branch"}
                    noOptionsMessage={() => "No Branch Found"}
                    {...branchProps}
                  />
                </div>
              </div>

              {/* By Group / By Item selector */}
              <RadioGroup
                className={cellFocusClass}
                name="rdgByItem"
                value={rdgByItem}
                options={[
                  { value: "By Group", label: "By Item Group" },
                  { value: "By Item", label: "By Item" },
                ]}
                onChange={(value) => {
                  setRdgByItem(value);

                  // By Item Group chosen: One Item Group is what is switched on
                  if (value === "By Group") setRdgItemGroup("One Item Group");
                }}
              />
              <div aria-hidden="true" />

              {/* Group filters: enabled only when By Group is selected */}
              <RadioGroup
                className={cellFocusClass}
                name="rdgItemGroup"
                value={rdgItemGroup}
                options={[
                  { value: "One Item Group", label: "One Item Group" },
                  { value: "All Item Group", label: "All Item Group" },
                ]}
                onChange={setRdgItemGroup}
                disabled={groupRadioDisabled}
              />
              <div className="flex flex-col gap-3 pt-3">
                {!groupDisabled && (
                  <div className="grid grid-cols-[190px_1fr]">
                    <div
                      className={cellFocusClass}
                      onKeyDown={(event) => advanceOnEnter(event, ["lkpOneItemGroupName"])}
                    >
                      <Select<PairOption, false>
                        inputId="lkpOneItemGroupID"
                        instanceId="lkpOneItemGroupID"
                        name="lkpOneItemGroupID"
                        options={groupIdOptions}
                        value={groupIdOptions.find((o) => o.value === groupId) ?? null}
                        onChange={(option) => {
                          setGroupId(option?.value ?? "");
                          if (option) advanceAfterPick("lkpOneItemGroupID", ["lkpOneItemGroupName"]);
                        }}
                        isDisabled={groupDisabled}
                        components={groupIdComponents}
                        styles={makePairDividedMenuStyles(groupIdHang)}
                        onMenuOpen={() =>
                          measureGroupIdHang("lkpOneItemGroupID", "lkpOneItemGroupName")
                        }
                        noOptionsMessage={() => "No Item Group Found"}
                        {...pairProps}
                      />
                    </div>
                    <div
                      className={`-ml-px ${cellFocusClass}`}
                      style={{ marginRight: NAME_MENU_HANG }}
                      onKeyDown={(event) => advanceOnEnter(event)}
                    >
                      <Select<PairOption, false>
                        inputId="lkpOneItemGroupName"
                        instanceId="lkpOneItemGroupName"
                        name="lkpOneItemGroupName"
                        options={groupNameOptions}
                        value={groupNameOptions.find((o) => o.value === groupId) ?? null}
                        onChange={(option) => {
                          setGroupId(option?.value ?? "");
                          if (option) advanceAfterPick("lkpOneItemGroupName");
                        }}
                        isDisabled={groupDisabled}
                        components={groupNameComponents}
                        styles={makePairDividedMenuStyles(NAME_MENU_HANG)}
                        noOptionsMessage={() => "No Item Group Found"}
                        {...pairProps}
                      />
                    </div>
                  </div>
                )}
                
              </div>

              {/* Item filters: enabled only when By Item is selected */}
              <RadioGroup
                className={cellFocusClass}
                name="rdgItem"
                value={rdgItem}
                options={[
                  { value: "One Item", label: "One Item" },
                  { value: "Item Range", label: "Item Range" },
                  { value: "All Item", label: "All Item" },
                ]}
                onChange={setRdgItem}
                disabled={itemRadioDisabled}
              />
              <div className="flex flex-col gap-3 pt-3">
                {rdgItem !== "All Item" &&
                  (rdgItem === "Item Range" ? (
                    <div className="grid grid-cols-3 gap-2 w-[85%] mt-6">
                      <div className={cellFocusClass} onKeyDown={(event) => advanceOnEnter(event)}>
                        <Select<PairOption, false>
                        inputId="lkpFromItem"
                        instanceId="lkpFromItem"
                        name="lkpFromItem"
                        options={itemIdOptions}
                        value={itemIdOptions.find((o) => o.value === fromItem) ?? null}
                        onChange={(option) => {
                          setFromItem(option?.value ?? "");
                          if (option) advanceAfterPick("lkpFromItem");
                        }}
                        isDisabled={itemRadioDisabled}
                        placeholder="From Item"
                        aria-label="From Item"
                        components={itemIdComponents}
                        styles={makePairDividedMenuStyles(RANGE_MENU_HANG)}
                        noOptionsMessage={() => "No Item Found"}
                        {...pairProps}
                      />
                      </div>

                      <div className={cellFocusClass} onKeyDown={(event) => advanceOnEnter(event)}>

                        <Select<PairOption, false>
                        inputId="lkpToItem"
                        instanceId="lkpToItem"
                        name="lkpToItem"
                        options={itemIdOptions}
                        value={itemIdOptions.find((o) => o.value === toItem) ?? null}
                        onChange={(option) => {
                          setToItem(option?.value ?? "");
                          if (option) advanceAfterPick("lkpToItem");
                        }}
                        isDisabled={itemRadioDisabled}
                        placeholder="To Item"
                        aria-label="To Item"
                        components={itemIdComponents}
                        styles={makePairDividedMenuStyles(RANGE_MENU_HANG)}
                        noOptionsMessage={() => "No Item Found"}
                        {...pairProps}
                      />

                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-[190px_1fr]">
                      <div
                        className={cellFocusClass}
                        onKeyDown={(event) => advanceOnEnter(event, ["lkpOneItemName"])}
                      >
                        <Select<PairOption, false>
                          inputId="lkpOneItemID"
                          instanceId="lkpOneItemID"
                          name="lkpOneItemID"
                          options={itemIdOptions}
                          value={itemIdOptions.find((o) => o.value === oneItemId) ?? null}
                          onChange={(option) => {
                            setOneItemId(option?.value ?? "");
                            if (option) advanceAfterPick("lkpOneItemID", ["lkpOneItemName"]);
                          }}
                          isDisabled={oneItemDisabled}
                          components={itemIdComponents}
                          styles={makePairDividedMenuStyles(itemIdHang)}
                          onMenuOpen={() => measureItemIdHang("lkpOneItemID", "lkpOneItemName")}
                          noOptionsMessage={() => "No Item Found"}
                          {...pairProps}
                        />
                      </div>
                      <div
                        className={`-ml-px ${cellFocusClass}`}
                        style={{ marginRight: ITEM_NAME_MENU_HANG }}
                        onKeyDown={(event) => advanceOnEnter(event)}
                      >
                        <Select<PairOption, false>
                          inputId="lkpOneItemName"
                          instanceId="lkpOneItemName"
                          name="lkpOneItemName"
                          options={itemNameOptions}
                          value={itemNameOptions.find((o) => o.value === oneItemId) ?? null}
                          onChange={(option) => {
                            setOneItemId(option?.value ?? "");
                            if (option) advanceAfterPick("lkpOneItemName");
                          }}
                          isDisabled={oneItemDisabled}
                          components={itemNameComponents}
                          styles={makePairDividedMenuStyles(ITEM_NAME_MENU_HANG)}
                          noOptionsMessage={() => "No Item Found"}
                          {...pairProps}
                        />
                      </div>
                    </div>
                  ))}
              </div>

              {/* Post status */}
              <FieldLabel>Post Status :</FieldLabel>
              <div className="flex items-center justify-between">
                <div
                  className={`w-[107px] ${cellFocusClass}`}
                  onKeyDown={(event) => advanceOnEnter(event)}
                >
                  <Select
                    inputId="lkpPostStatus"
                    instanceId="lkpPostStatus"
                    options={postStatusOptions}
                    value={postStatus}
                    onChange={(option) => {
                      setPostStatus(option);
                      if (option) advanceAfterPick("lkpPostStatus");
                    }}
                    {...selectProps}
                  />
                </div>
                <label
                  htmlFor="chkOrderbyTxnNo"
                  className={`flex h-[26px] cursor-pointer items-center gap-2 border border-[#e0e5ea] bg-white px-2 text-[12px] text-[#405066] select-none ${cellFocusClass}`}
                >
                  <input
                    id="chkOrderbyTxnNo"
                    type="checkbox"
                    checked={orderByTxnNo}
                    onChange={(event) => setOrderByTxnNo(event.target.checked)}
                    className="h-4 w-4 accent-[#64d96e]"
                  />
                  Order by Posting No.
                </label>
              </div>

              {/* Detailed / Summary and period */}
              <RadioGroup
                className={cellFocusClass}
                name="rdgDetSum"
                value={rdgDetSum}
                options={[
                  { value: "Detailed", label: "Detailed" },
                  { value: "Summary", label: "Summary" },
                ]}
                onChange={setRdgDetSum}
              />
              <div className="flex items-start gap-2">
                <FieldLabel className="w-[140px]">Period :</FieldLabel>
                <div className={cellFocusClass}>
                  <AppDatePicker
                  id="dtpFromDate"
                  label="From Date"
                  value={fromDate}
                  onChange={setFromDate}
                />
                </div>
                <div className={cellFocusClass}>
                  <AppDatePicker
                  id="dtpToDate"
                  label="To Date"
                  value={toDate}
                  onChange={setToDate}
                />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 flex justify-center gap-3">
              <button
                id="btnPrint"
                type="button"
                onClick={handlePrint}
                className="btn-style"
              >
                <u>P</u>rint
              </button>
              <button
                id="btnClear"
                type="button"
                onClick={handleClear}
                className="btn-style"
              >
                <u>C</u>lear
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
          onPrint={() => printStockReport(preview.report)}
          buildPdf={() => buildStockPdf(preview.report)}
          fetchExcel={fetchExcel}
          onClose={() => setPreview(null)}
        />
      )}
    </div>
  );
};

export default RptStockPage;