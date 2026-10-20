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
    <span className="text-[14px] font-normal text-[#35445a]">{label}</span>
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

const FieldLabel: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = "" }) => (
  <div
    className={`flex h-[30px] items-center   bg-[#fafbfc] px-3 text-[14px] text-[#405066] ${className}`}
  >
    {children}
  </div>
);

type RptSalesPriceListPageProps = {
  onClose?: () => void;
};

const RptSalesPriceListPage: React.FC<RptSalesPriceListPageProps> = ({ onClose }) => {
  const [branch, setBranch] = useState<Option | null>(branchOptions[0]); // lkpBranch
  const [priceType, setPriceType] = useState("All"); // optPriceType

  const handlePrint = () => {
    console.log({ branch, priceType });
  };

  const handleClose = () => {
    setBranch(branchOptions[0]);
    setPriceType("All");
    onClose?.();
  };

  return (
    <div className="flex min-h-full w-full items-start justify-center bg-white px-4 py-4">
      <div className="min-h-fit w-150 max-w-full bg-white p-0">
        <main className="w-full overflow-hidden border border-gray-400 bg-white">
          <header className="flex h-7.5 items-center justify-start bg-[#9fdfbc]">
            <h1 className="m-0 ml-3.5 text-[17px] font-semibold text-[#24364d]">
             Sales Price List
            </h1>
          </header>

          <section className="px-3.5 pb-6 pt-3">
            <div className="flex items-stretch justify-between gap-4 max-[560px]:flex-col">
              {/* Branch + actions */}
              <div className="flex flex-col justify-between gap-6">
                <div className="flex items-center gap-3 pt-3">
                  <FieldLabel className="w-fit">Branch :</FieldLabel>
                  <div className="w-[220px] ">
                    <Select
                      inputId="lkpBranch"
                      instanceId="lkpBranch"
                      options={branchOptions}
                      value={branch}
                      onChange={setBranch}
                      {...selectProps}
                    />
                  </div>
                </div>

                <div className="flex gap-3 pl-[102px]">
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

              {/* Price type */}
              <RadioPanel className="w-[190px] shrink-0">
                <CustomRadio
                  name="rdgPriceType"
                  value="All"
                  label="All"
                  checked={priceType === "All"}
                  onChange={() => setPriceType("All")}
                />
                <CustomRadio
                  name="rdgPriceType"
                  value="Retail Price"
                  label="Retail Price"
                  checked={priceType === "Retail Price"}
                  onChange={() => setPriceType("Retail Price")}
                />
                <CustomRadio
                  name="rdgPriceType"
                  value="Wholesale Price"
                  label="Wholesale Price"
                  checked={priceType === "Wholesale Price"}
                  onChange={() => setPriceType("Wholesale Price")}
                />
                <CustomRadio
                  name="rdgPriceType"
                  value="Special Price"
                  label="Special Price"
                  checked={priceType === "Special Price"}
                  onChange={() => setPriceType("Special Price")}
                />
              </RadioPanel>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};

export default RptSalesPriceListPage;