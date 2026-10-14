import React, { useState } from "react";
import Select from "react-select";

type Option = { value: string; label: string };

type RadioOptionProps = {
  name: string;
  value: string;
  label: string;
  checked: boolean;
  onChange: () => void;
};

/* Replace these with data from your API */
const branchOptions: Option[] = [
  { value: "OFFICE", label: "OFFICE" },
  { value: "BRANCH 1", label: "BRANCH 1" },
  { value: "BRANCH 2", label: "BRANCH 2" },
];
const groupIdOptions: Option[] = [
  { value: "G1", label: "G1" },
  { value: "G2", label: "G2" },
];
const groupNameOptions: Option[] = [
  { value: "G1", label: "Group One" },
  { value: "G2", label: "Group Two" },
];
const itemIdOptions: Option[] = [
  { value: "1001", label: "1001" },
  { value: "1002", label: "1002" },
  { value: "1003", label: "1003" },
];
const itemNameOptions: Option[] = [
  { value: "1001", label: "Item One" },
  { value: "1002", label: "Item Two" },
  { value: "1003", label: "Item Three" },
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

const CustomRadio: React.FC<RadioOptionProps> = ({
  name,
  value,
  label,
  checked,
  onChange,
}) => (
  <label className="flex cursor-pointer items-center gap-2.5 whitespace-nowrap select-none">
    <input
      type="radio"
      name={name}
      value={value}
      checked={checked}
      onChange={onChange}
      className="sr-only"
    />
    <span
      className={`flex h-[19px] w-[19px] shrink-0 items-center justify-center rounded-full border bg-white ${
        checked ? "border-[#64d96e]" : "border-[#cbd3dc]"
      }`}
    >
      <span
        className={`h-2.5 w-2.5 rounded-full bg-[#64d96e] ${
          checked ? "opacity-100" : "opacity-0"
        }`}
      />
    </span>
    <span className="text-[12px] font-normal text-[#35445a]">{label}</span>
  </label>
);

const RadioPanel: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = "" }) => (
  <div className={`border border-[#e0e5ea] bg-white px-3.5 py-3 ${className}`}>
    <div className="flex flex-col gap-3">{children}</div>
  </div>
);

type RptItemListPageProps = {
  onClose?: () => void;
};

const RptItemListPage: React.FC<RptItemListPageProps> = ({ onClose }) => {
  const [branchMode, setBranchMode] = useState("One Branch"); // optBranch
  const [branch, setBranch] = useState<Option | null>(branchOptions[0]); // lkpBranch

  const [statusMode, setStatusMode] = useState("Active"); // optStatus

  const [groupMode, setGroupMode] = useState("One Item Group"); // optItemGroup
  const [groupId, setGroupId] = useState<string | null>(null); // lkpItemGroupID / lkpItemGroupName
  const [salesBelowCost, setSalesBelowCost] = useState(false); // chkSalesBelowCost

  const [itemMode, setItemMode] = useState("One Item"); // optItem
  const [itemId, setItemId] = useState<string | null>(null); // lkpItemID / lkpItemName
  const [fromItem, setFromItem] = useState<Option | null>(null); // lkpFromItem
  const [toItem, setToItem] = useState<Option | null>(null); // lkpToItem

  const selectedGroupId =
    groupIdOptions.find((o) => o.value === groupId) ?? null;
  const selectedGroupName =
    groupNameOptions.find((o) => o.value === groupId) ?? null;
  const selectedItemId = itemIdOptions.find((o) => o.value === itemId) ?? null;
  const selectedItemName =
    itemNameOptions.find((o) => o.value === itemId) ?? null;

  const handlePrint = () => {
    console.log({
      branchMode,
      branch: branchMode === "One Branch" ? branch : null,
      statusMode,
      groupMode,
      groupId: groupMode === "One Item Group" ? groupId : null,
      salesBelowCost,
      itemMode,
      itemId: itemMode === "One Item" ? itemId : null,
      fromItem: itemMode === "Range Item" ? fromItem : null,
      toItem: itemMode === "Range Item" ? toItem : null,
    });
  };

  const handleClose = () => {
    setBranchMode("One Branch");
    setBranch(branchOptions[0]);
    setStatusMode("Active");
    setGroupMode("One Item Group");
    setGroupId(null);
    setSalesBelowCost(false);
    setItemMode("One Item");
    setItemId(null);
    setFromItem(null);
    setToItem(null);
    onClose?.();
  };

  const groupDisabled = groupMode !== "One Item Group";

  return (
    <div className="flex min-h-full w-full items-start justify-center bg-white px-4 py-4">
      <div className="min-h-fit w-225 max-w-full bg-white p-0">
        <main className="w-full overflow-hidden border border-gray-400 bg-white">
          <header className="flex h-7.5 items-center justify-start bg-[#9fdfbc]">
            <h1 className="m-0 ml-3.5 text-[17px] font-semibold text-[#24364d]">
              Item List
            </h1>
          </header>

          <section className="px-3.5 pb-6 pt-3">
            <div className="grid grid-cols-[168px_1fr_170px] items-start gap-x-4 gap-y-3 max-[760px]:grid-cols-[168px_1fr]">
              {/* Branch */}
              <RadioPanel>
                <CustomRadio
                  name="rdgBranch"
                  value="One Branch"
                  label="One Branch"
                  checked={branchMode === "One Branch"}
                  onChange={() => setBranchMode("One Branch")}
                />
                <CustomRadio
                  name="rdgBranch"
                  value="All Branch"
                  label="All Branch"
                  checked={branchMode === "All Branch"}
                  onChange={() => setBranchMode("All Branch")}
                />
              </RadioPanel>
              <div className="pt-3">
                <div className="w-[250px]">
                  <Select
                    inputId="lkpBranch"
                    instanceId="lkpBranch"
                    options={branchOptions}
                    value={branch}
                    onChange={setBranch}
                    isDisabled={branchMode !== "One Branch"}
                    {...selectProps}
                  />
                </div>
              </div>

              {/* Status (top right) */}
              <RadioPanel className="max-[760px]:col-span-2">
                <CustomRadio
                  name="rdgStatus"
                  value="Active"
                  label="Active"
                  checked={statusMode === "Active"}
                  onChange={() => setStatusMode("Active")}
                />
                <CustomRadio
                  name="rdgStatus"
                  value="Inactive"
                  label="Inactive"
                  checked={statusMode === "Inactive"}
                  onChange={() => setStatusMode("Inactive")}
                />
                <CustomRadio
                  name="rdgStatus"
                  value="Hide"
                  label="Hide"
                  checked={statusMode === "Hide"}
                  onChange={() => setStatusMode("Hide")}
                />
              </RadioPanel>

              {/* Item group */}
              <RadioPanel>
                <CustomRadio
                  name="rdgItemGroup"
                  value="One Item Group"
                  label="One Item Group"
                  checked={groupMode === "One Item Group"}
                  onChange={() => setGroupMode("One Item Group")}
                />
                <CustomRadio
                  name="rdgItemGroup"
                  value="All Item Group"
                  label="All Item Group"
                  checked={groupMode === "All Item Group"}
                  onChange={() => setGroupMode("All Item Group")}
                />
              </RadioPanel>
              <div className="pt-3">
                <div className="grid grid-cols-[135px_1fr] gap-2">
                  <Select
                    inputId="lkpItemGroupID"
                    instanceId="lkpItemGroupID"
                    options={groupIdOptions}
                    value={selectedGroupId}
                    onChange={(option) => setGroupId(option?.value ?? null)}
                    isDisabled={groupDisabled}
                    {...selectProps}
                  />
                  <Select
                    inputId="lkpItemGroupName"
                    instanceId="lkpItemGroupName"
                    options={groupNameOptions}
                    value={selectedGroupName}
                    onChange={(option) => setGroupId(option?.value ?? null)}
                    isDisabled={groupDisabled}
                    {...selectProps}
                  />
                </div>
              </div>
              <div className="pt-3 max-[760px]:col-span-2 max-[760px]:pt-0">
                <label
                  htmlFor="chkSalesBelowCost"
                  className="flex h-[30px] cursor-pointer items-center gap-2 border border-[#e0e5ea] bg-white px-2 text-[12px] text-[#405066] select-none"
                >
                  <input
                    id="chkSalesBelowCost"
                    type="checkbox"
                    checked={salesBelowCost}
                    onChange={(event) => setSalesBelowCost(event.target.checked)}
                    className="h-4 w-4 accent-[#64d96e]"
                  />
                  Sales Below Cost
                </label>
              </div>

              {/* Item */}
              <RadioPanel>
                <CustomRadio
                  name="rdgItem"
                  value="One Item"
                  label="One Item"
                  checked={itemMode === "One Item"}
                  onChange={() => setItemMode("One Item")}
                />
                <CustomRadio
                  name="rdgItem"
                  value="Range Item"
                  label="Range Item"
                  checked={itemMode === "Range Item"}
                  onChange={() => setItemMode("Range Item")}
                />
                <CustomRadio
                  name="rdgItem"
                  value="All Item"
                  label="All Item"
                  checked={itemMode === "All Item"}
                  onChange={() => setItemMode("All Item")}
                />
              </RadioPanel>
              <div className="pt-3">
                {itemMode === "One Item" && (
                  <div className="grid grid-cols-[135px_1fr] gap-2">
                    <Select
                      inputId="lkpItemID"
                      instanceId="lkpItemID"
                      options={itemIdOptions}
                      value={selectedItemId}
                      onChange={(option) => setItemId(option?.value ?? null)}
                      {...selectProps}
                    />
                    <Select
                      inputId="lkpItemName"
                      instanceId="lkpItemName"
                      options={itemNameOptions}
                      value={selectedItemName}
                      onChange={(option) => setItemId(option?.value ?? null)}
                      {...selectProps}
                    />
                  </div>
                )}
                {itemMode === "Range Item" && (
                  <div className="flex items-center gap-2">
                    <div className="w-[135px]">
                      <Select
                        inputId="lkpFromItem"
                        instanceId="lkpFromItem"
                        options={itemIdOptions}
                        value={fromItem}
                        onChange={setFromItem}
                        {...selectProps}
                      />
                    </div>
                    <span className="text-[12px] text-[#405066]">to</span>
                    <div className="w-[135px]">
                      <Select
                        inputId="lkpToItem"
                        instanceId="lkpToItem"
                        options={itemIdOptions}
                        value={toItem}
                        onChange={setToItem}
                        {...selectProps}
                      />
                    </div>
                  </div>
                )}
              </div>
              <div className="max-[760px]:hidden" />

              {/* Actions */}
              <div />
              <div className="flex gap-3">
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
    </div>
  );
};

export default RptItemListPage;