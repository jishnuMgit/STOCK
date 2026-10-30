import {
  BranchDividedMenuList,
  BranchDividedOption,
  branchMenuStyles,
  filterLabelOrValue,
  makeNameIdMenuComponents,
} from "../../BranchSelect/branchSelectParts";

export type Option = { value: string; label: string };

// one unposted document (names = the server's response keys)
export type DocRow = {
  txtDocNo: string;
  // dd-mm-yyyy
  txtDate: string;
  txtAccountID: string;
  txtDocAmt: number;
};

const selectClassNames = {
  control: ({
    isFocused,
    isDisabled,
  }: {
    isFocused: boolean;
    isDisabled: boolean;
  }) => `!min-h-[25px] !h-[30px] !rounded-[4px] !border !shadow-none !text-[13px] hover:!border-[#aab8c5]
    ${isDisabled ? "!bg-[#f6f8fa]" : "!bg-white"} ${isFocused ? "!border-[#91a7b9]" : "!border-[#cfd7df]"}`,
  valueContainer: () => "!h-[23px] !py-0 !px-[5px] !overflow-hidden",
  singleValue: () => "!m-0 !text-[13px] !text-[#24364d]",
  placeholder: () => "!m-0 !text-[13px] !text-[#7a8794]",
  input: () => "!m-0 !p-0 !text-[13px] !text-[#24364d]",
  indicatorsContainer: () => "!h-[23px]",
  dropdownIndicator: () => "!p-[3px] !text-[#657486]",
  indicatorSeparator: () => "!hidden",
  clearIndicator: () => "!p-[3px]",
  menu: () =>"!mt-[1px] !rounded-none !border !border-[#cfd7df] !z-[999] !shadow-md",
  menuList: () => "!p-0 !max-h-[180px]",
  option: ({isFocused,isSelected,}: {isFocused: boolean; isSelected: boolean; }) => `!cursor-pointer !px-[6px] !py-[5px] !text-[13px] !text-[#24364d] ${isSelected ? "!bg-[#e7f7ed]" : isFocused ? "!bg-[#f2faf5]" : "!bg-white"} `,
};

export const selectProps = {
  isSearchable: false,
  isClearable: false,
  placeholder: "",
  classNames: selectClassNames,
  menuPosition: "fixed" as const,
  menuPortalTarget: typeof document !== "undefined" ? document.body : undefined,
};

// The Branch and Document boxes open a "Name | ID" list with a divider (as the Branch box of the report screens),
// and can be searched on the name or the ID: the Branch box "Branch | ID" (the old fBrName / fBrID columns),
// the Document box "Document | ID" (the old fDocName / fDocType columns).
const documentComponents = makeNameIdMenuComponents("Document", true);

// the menu look comes from branchMenuStyles / the two parts, not from the plain classNames
const inputClassNames = {
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
};

export const branchSelectProps = {
  ...selectProps,
  isSearchable: true,
  classNames: inputClassNames,
  styles: branchMenuStyles,
  components: { Option: BranchDividedOption, MenuList: BranchDividedMenuList },
  filterOption: filterLabelOrValue,
};

export const documentSelectProps = {
  ...branchSelectProps,
  components: { Option: documentComponents.Option, MenuList: documentComponents.MenuList },
};

// Doc. Amt. and the total: 4 decimals, as the costs
export const formatAmount = (value: number) =>
  value.toLocaleString("en-US", {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  });