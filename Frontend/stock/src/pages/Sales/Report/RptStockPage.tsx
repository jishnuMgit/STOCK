import React, { useEffect, useMemo, useState } from "react";
import Select from "react-select";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { toast } from "react-toastify";
import RadioGroup from "../../../components/common/RadioGroup";
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

/* Replace these with data from your API */
const itemIdOptions: Option[] = [
  { value: "1001", label: "1001" },
  { value: "1002", label: "1002" },
];
const itemNameOptions: Option[] = [
  { value: "1001", label: "Item One" },
  { value: "1002", label: "Item Two" },
];
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

// how far the Group Name list hangs past its box (its Group ID column)
const NAME_MENU_HANG = 120;

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
      } catch (error: unknown) {
        console.error("rptStock branches error:", error);
        toast.error("Cannot connect to the Stock report API.");
      }
    };

    loadBranches();
  }, []);
  const [rdgByItem, setRdgByItem] = useState("By Item"); // rdgByItem: By Item / By Group

  const [rdgItem, setRdgItem] = useState("One Item"); // rdgItem
  const [rdgItemGroup, setRdgItemGroup] = useState("One Item Group"); // rdgItemGroup
  const [oneItemId, setOneItemId] = useState<Option | null>(null); // lkpOneItemID
  const [oneItemName, setOneItemName] = useState<Option | null>(null); // lkpOneItemName
  const [fromItem, setFromItem] = useState<Option | null>(null); // Item Range: From Item
  const [toItem, setToItem] = useState<Option | null>(null); // Item Range: To Item
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

  const handleClear = () => {
    setRdgBranch("One Branch");
    setBranch(defaultBranch);
    setRdgByItem("By Item");
    setRdgItem("One Item");
    setRdgItemGroup("One Item Group");
    setOneItemId(null);
    setOneItemName(null);
    setFromItem(null);
    setToItem(null);
    setGroupId("");
    setPostStatus(postStatusOptions[0]);
    setRdgDetSum("Detailed");
    setFromDate(TODAY);
    setToDate(TODAY);
    setOrderByTxnNo(false);
  };

  const handlePrint = () => {
    console.log({
      rdgBranch,
      branch,
      rdgByItem,
      rdgItem,
      rdgItemGroup,
      oneItemId,
      oneItemName,
      fromItem,
      toItem,
      groupId,
      postStatus,
      rdgDetSum,
      fromDate,
      toDate,
      orderByTxnNo,
    });
  };

  const itemRadioDisabled = rdgByItem !== "By Item";
  const groupRadioDisabled = rdgByItem !== "By Group";
  const oneItemDisabled =
    rdgByItem !== "By Item" ||
    (rdgItem !== "One Item" && rdgItem !== "Item Range");
  const groupDisabled = rdgByItem !== "By Group" || rdgItemGroup !== "One Item Group";

  return (
    <div className="flex min-h-screen w-full items-start justify-center bg-white px-4 py-4">
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
                name="rdgBranch"
                value={rdgBranch}
                options={[
                  { value: "One Branch", label: "One Branch" },
                  { value: "All Branches", label: "All Branches" },
                ]}
                onChange={setRdgBranch}
              />
              <div className="pt-3">
                <div className="w-[250px]">
                  <Select
                    inputId="lkpBranch"
                    instanceId="lkpBranch"
                    options={branchOptions}
                    value={branch}
                    onChange={setBranch}
                    isDisabled={rdgBranch !== "One Branch"}
                    noOptionsMessage={() => "No Branch Found"}
                    {...branchProps}
                  />
                </div>
              </div>

              {/* By Group / By Item selector */}
              <RadioGroup
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
                    <div>
                      <Select<PairOption, false>
                        inputId="lkpOneItemGroupID"
                        instanceId="lkpOneItemGroupID"
                        name="lkpOneItemGroupID"
                        options={groupIdOptions}
                        value={groupIdOptions.find((o) => o.value === groupId) ?? null}
                        onChange={(option) => setGroupId(option?.value ?? "")}
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
                    <div className="-ml-px">
                      <Select<PairOption, false>
                        inputId="lkpOneItemGroupName"
                        instanceId="lkpOneItemGroupName"
                        name="lkpOneItemGroupName"
                        options={groupNameOptions}
                        value={groupNameOptions.find((o) => o.value === groupId) ?? null}
                        onChange={(option) => setGroupId(option?.value ?? "")}
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
      <Select
        inputId="lkpFromItem"
        instanceId="lkpFromItem"
        options={itemIdOptions}
        value={fromItem}
        onChange={setFromItem}
        isDisabled={itemRadioDisabled}
        placeholder="From Item"
        aria-label="From Item"
        {...selectProps}
      />

      <Select
        inputId="lkpToItem"
        instanceId="lkpToItem"
        options={itemIdOptions}
        value={toItem}
        onChange={setToItem}
        isDisabled={itemRadioDisabled}
        placeholder="To Item"
        aria-label="To Item"
        {...selectProps}
      />
    </div>
  ) : (
    <div className="grid grid-cols-[190px_1fr] gap-2">
      <Select
        inputId="lkpOneItemID"
        instanceId="lkpOneItemID"
        options={itemIdOptions}
        value={oneItemId}
        onChange={setOneItemId}
        isDisabled={oneItemDisabled}
        {...selectProps}
      />

      <Select
        inputId="lkpOneItemName"
        instanceId="lkpOneItemName"
        options={itemNameOptions}
        value={oneItemName}
        onChange={setOneItemName}
        isDisabled={oneItemDisabled}
        {...selectProps}
      />
    </div>
  ))}
              </div>

              {/* Post status */}
              <FieldLabel>Post Status :</FieldLabel>
              <div className="flex items-center justify-between">
                <div className="w-[107px]">
                  <Select
                    inputId="lkpPostStatus"
                    instanceId="lkpPostStatus"
                    options={postStatusOptions}
                    value={postStatus}
                    onChange={setPostStatus}
                    {...selectProps}
                  />
                </div>
                <label
                  htmlFor="chkOrderbyTxnNo"
                  className="flex h-[26px] cursor-pointer items-center gap-2 border border-[#e0e5ea] bg-white px-2 text-[12px] text-[#405066] select-none"
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
                <AppDatePicker
                  id="dtpFromDate"
                  label="From Date"
                  value={fromDate}
                  onChange={setFromDate}
                />
                <AppDatePicker
                  id="dtpToDate"
                  label="To Date"
                  value={toDate}
                  onChange={setToDate}
                />
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
    </div>
  );
};

export default RptStockPage;