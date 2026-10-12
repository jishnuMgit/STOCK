import React, { useState } from "react";
import Select from "react-select";

type Option = { value: string; label: string };

/* Replace these with data from your API (same value in both lists = same account) */
const accountIdOptions: Option[] = [
  { value: "1001", label: "1001" },
  { value: "1002", label: "1002" },
  { value: "1003", label: "1003" },
];
const accountNameOptions: Option[] = [
  { value: "1001", label: "Cash Account" },
  { value: "1002", label: "Bank Account" },
  { value: "1003", label: "Sales Account" },
];
const statusOptions: Option[] = [
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
];

const selectClassNames = {
  control: ({
    isFocused,
    isDisabled,
  }: {
    isFocused: boolean;
    isDisabled: boolean;
  }) => `
    !min-h-[25px] !h-[30px] !rounded-[4px] !border !shadow-none !text-[14px]
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
    !cursor-pointer !px-[6px] !py-[5px] !text-[14px] !text-[#24364d]
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

const FieldLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex h-7.5 items-center justify-end border border-[#e0e5ea] bg-[#fafbfc] pr-3 text-[14px] ">
    {children}
  </div>
);

type InactivateAccountPageProps = {
  onClose?: () => void;
};

const InactivateAccountPage: React.FC<InactivateAccountPageProps> = ({
  onClose,
}) => {
  const [accountId, setAccountId] = useState<string | null>(null); // lkpAccountID / lkpAccountName
  const [status, setStatus] = useState<Option | null>(null); // lkpStatus

  const selectedId = accountIdOptions.find((o) => o.value === accountId) ?? null;
  const selectedName =
    accountNameOptions.find((o) => o.value === accountId) ?? null;

  const handleModify = () => {
    console.log({ accountId, status });
  };

  const handleClose = () => {
    setAccountId(null);
    setStatus(null);
    onClose?.();
  };

  return (
  <div className="flex min-h-full w-full items-center justify-center bg-white px-4 py-4">
  <div className="mx-auto min-h-full w-160 max-w-full bg-white p-0">
        <main className="w-full overflow-hidden border border-[#d5dce2] bg-white">
          <header className="flex h-7.5 items-center justify-start bg-[#9fdfbc]">
            <h1 className="m-0 ml-3.5 text-[17px] font-semibold text-[#24364d]">
              Inactivate Account
            </h1>
          </header>

          <section className="px-3.5 pb-6 pt-5">
            <div className="grid grid-cols-[100px_1fr] items-center gap-x-4 gap-y-4">
              <FieldLabel>Account :</FieldLabel>
              <div className="grid grid-cols-[120px_1fr] gap-2">
                <Select
                  inputId="lkpAccountID"
                  instanceId="lkpAccountID"
                  options={accountIdOptions}
                  value={selectedId}
                  onChange={(option) => setAccountId(option?.value ?? null)}
                  {...selectProps}
                />
                <Select
                  inputId="lkpAccountName"
                  instanceId="lkpAccountName"
                  options={accountNameOptions}
                  value={selectedName}
                  onChange={(option) => setAccountId(option?.value ?? null)}
                  {...selectProps}
                />
              </div>

              <FieldLabel>Status :</FieldLabel>
              <div className="w-30">
                <Select
                  inputId="lkpStatus"
                  instanceId="lkpStatus"
                  options={statusOptions}
                  value={status}
                  onChange={setStatus}
                  {...selectProps}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 flex justify-center gap-3">
              <button
                id="btnModify"
                type="button"
                onClick={handleModify}
                className="btn-style"
              >
                <u>M</u>odify
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
    </div>
  );
};

export default InactivateAccountPage;