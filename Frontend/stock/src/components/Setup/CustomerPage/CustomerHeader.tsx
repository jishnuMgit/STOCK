import React from "react";
import {
  type SingleValue,
} from "react-select";
import { X } from "lucide-react";
import type { ParentAccount } from "../../../hooks/useCustomer";
import CommonTableSelect, { type TableSelectOption } from "../../common/CommonTableSelect";

// ============================================================
// TYPES
// ============================================================

interface SelectOption {
  value: string;
  label: string;
  secondary?: string; // shown only in the open dropdown menu
}

interface CustomerHeaderProps {
  txtCustomerID: string;
  setTxtCustomerID: React.Dispatch<React.SetStateAction<string>>;

  optNewCustomerID: string;

  onIdModeChange: (value: string) => void;
  idLocked?: boolean;

  lkpGAccountID: string;
  setlkpGAccountID: React.Dispatch<React.SetStateAction<string>>;

  lkpGAccountName: string;
  setlkpGAccountName: React.Dispatch<React.SetStateAction<string>>;

  lkpHaveDivision: string;
  setLkpHaveDivision: React.Dispatch<React.SetStateAction<string>>;

  lkpBusinessType: string;
  setLkpBusinessType: React.Dispatch<React.SetStateAction<string>>;
  parentAccounts: ParentAccount[];
  onClose?: () => void;
}

// ============================================================
// OPTIONS
// ============================================================

const haveDivisionOptions: SelectOption[] = [
  { value: "Yes", label: "Yes" },
  { value: "No", label: "No" },
];

const businessTypeOptions: SelectOption[] = [
  { value: "B2B", label: "B2B" },
  { value: "B2C", label: "B2C" },
];


const CustomerHeader: React.FC<CustomerHeaderProps> = ({
  txtCustomerID,
  setTxtCustomerID,

  optNewCustomerID,

  onIdModeChange,
  idLocked = false,

  lkpGAccountID,
  setlkpGAccountID,

  setlkpGAccountName,

  lkpHaveDivision,
  setLkpHaveDivision,

  lkpBusinessType,
  setLkpBusinessType,
  parentAccounts,
  onClose,
}) => {
  // ==========================================================
  // HELPER
  // ==========================================================

  const getOption = (
    options: SelectOption[],
    value: string,
  ): SelectOption | null => {
    return options.find((item) => item.value === value) ?? null;
  };

  // ID dropdown: "1103001 - CLIENTS RECEIVABLES"
  const accountIdOptions: SelectOption[] = parentAccounts.map((a) => ({
    value: a.accountId,
    label: a.accountId,
    secondary: a.accountName,
  }));

  // Name dropdown: "CLIENTS RECEIVABLES - 1103001"
  const accountNameOptions: SelectOption[] = parentAccounts.map((a) => ({
    value: a.accountId,
    label: a.accountName,
    secondary: a.accountId,
  }));

  // Selecting either dropdown keeps the ID and name in sync
  const handleAccountChange = (option: SingleValue<SelectOption>) => {
    const account = parentAccounts.find((a) => a.accountId === option?.value);
    setlkpGAccountID(account?.accountId ?? "");
    setlkpGAccountName(account?.accountName ?? "");
  };

  const [idMenuWidth, setIdMenuWidth] = React.useState(480);
  const [nameBoxWidth, setNameBoxWidth] = React.useState(140);

  const commonProps = {
    controlHeight: 28,
    controlFontSize: "12px",
    headerFontSize: "12px",
    borderColor: "#aeb7c2",
    hoverBorderColor: "#94a3b8",
    menuZIndex: 9999,
    isSearchable: false,
    menuPortalTarget: document.body,
  };

  // ==========================================================
  // INPUT STYLE
  // ==========================================================

  const inputClass = `h-[30px] w-full rounded-[3px] border border-slate-400 px-2 text-[12px] outline-none
    focus:border-blue-500 focus:ring-1 focus:ring-blue-200`;

  return (
    <>
      {/* ======================================================
          TITLE
      ====================================================== */}

      <div className="sticky top-0 z-10 flex h-8 items-center justify-between border-b border-slate-300 bg-[#a3dfc0] pr-1">
        <h1 className="ml-1.25 text-[17px] font-semibold text-slate-700">
          Customer
        </h1>

        {onClose && (
          <button
            type="button"
            title="Close"
            onClick={onClose}
            className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full text-slate-700 hover:bg-red-100 hover:text-red-600 focus:outline-none"
          >
            <X width={16} height={16} />
          </button>
        )}
      </div>

      {/* ======================================================
          HEADER CONTROLS
      ====================================================== */}

      <div className=" border-b border-slate-200 px-3 py-3 sm:px-5 lg:px-6">
        <div
          className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[130px_100px_minmax(0,1fr)_80px_150px]
      lg:items-end lg:gap-4"
        >
          {/* ==================================================
        NEW CUSTOMER ID
    ================================================== */}

          <div className="w-full">
            <label
              htmlFor="optNewCustomerID_Auto"
              className="mb-1 block text-[11px] text-slate-600"
            >
              New Customer ID
            </label>

            <div className="flex h-7 items-center gap-3 rounded-[3px] border border-slate-200 px-2">
              {/* AUTO */}

              <label
                htmlFor="optNewCustomerID_Auto"
                className="flex cursor-pointer items-center gap-1 whitespace-nowrap
          "
              >
                <input
                  id="optNewCustomerID_Auto"
                  name="optNewCustomerID"
                  type="radio"
                  value="Auto"
                  checked={optNewCustomerID === "Auto"}
                  onChange={(e) => onIdModeChange(e.target.value)}
                  disabled={idLocked}
                  className="h-3.25 w-3.25 accent-blue-600"
                />

                <span className="text-[12px]">Auto</span>
              </label>

              {/* MANUAL */}

              <label
                htmlFor="optNewCustomerID_Manual"
                className="flex cursor-pointer items-center gap-1 whitespace-nowrap"
              >
                <input
                  id="optNewCustomerID_Manual"
                  name="optNewCustomerID"
                  type="radio"
                  value="Manual"
                  checked={optNewCustomerID === "Manual"}
                  onChange={(e) => onIdModeChange(e.target.value)}
                  disabled={idLocked}
                  className="h-3.25 w-3.25 accent-blue-600"
                />

                <span className="text-[12px]">Manual</span>
              </label>
            </div>
          </div>

          {/* ==================================================
        CUSTOMER ID
    ================================================== */}

          <div className="w-full">
            <label
              htmlFor="txtCustomerID"
              className="mb-1 block text-[11px] text-slate-600"
            >
              Customer ID
            </label>

            <input
              id="txtCustomerID"
              name="txtCustomerID"
              type="text"
              value={txtCustomerID}
              maxLength={12}
              onChange={(e) => setTxtCustomerID(e.target.value)}
              readOnly={idLocked || optNewCustomerID === "Auto"}
              className={`${inputClass} ${idLocked || optNewCustomerID === "Auto"
                ? "cursor-not-allowed bg-slate-200 text-slate-500"
                : "bg-white text-slate-700"
                }`}
            />
          </div>

          {/* ==================================================
        PARENT ACCOUNT
    ================================================== */}
          <div className="grid grid-cols-[30%_minmax(0,1fr)] items-end gap-2.5 sm:col-span-2 lg:col-span-1">
            {/* PARENT ACCOUNT ID */}

            <div id="glIdBox" className="w-full">
              <label
                htmlFor="lkpGAccountID"
                className="mb-1 block whitespace-nowrap text-[11px] text-slate-600"
              >
                GL. Account ID
              </label>

              <CommonTableSelect
                {...commonProps}
                inputId="lkpGAccountID"
                value={getOption(accountIdOptions, lkpGAccountID) as TableSelectOption | null}
                options={accountIdOptions as TableSelectOption[]}
                columns={[
                  { key: "label", label: "GL. Account ID", width: "120px" },
                  { key: "secondary", label: "GL. Account Name" },
                ]}
                valueKey="label"
                width="100%"
                menuWidth={`${idMenuWidth}px`}
                onMenuOpen={() => {
                  const idBox = document.getElementById("glIdBox")?.getBoundingClientRect();
                  const nameBox = document.getElementById("glNameBox")?.getBoundingClientRect();
                  setIdMenuWidth(
                    idBox && nameBox ? Math.round(nameBox.right - idBox.left) : 480,
                  );
                }}
                onChange={handleAccountChange}
              />
            </div>

            {/* PARENT ACCOUNT NAME */}

            <div id="glNameBox" className="w-full">
              <label
                htmlFor="lkpGAccountName"
                className="mb-1 block whitespace-nowrap text-[11px] text-slate-600"
              >
                GL. Account Name
              </label>

              <CommonTableSelect
                {...commonProps}
                inputId="lkpGAccountName"
                value={getOption(accountNameOptions, lkpGAccountID) as TableSelectOption | null}
                options={accountNameOptions as TableSelectOption[]}
                columns={[
                  { key: "label", label: "GL. Account Name", width: `${Math.max(nameBoxWidth, 110)}px` },
                  { key: "secondary", label: "GL. Account ID" },
                ]}
                valueKey="label"
                width="100%"
                menuWidth="480px"
                onMenuOpen={() => {
                  const w = document.getElementById("glNameBox")?.getBoundingClientRect().width;
                  if (w) setNameBoxWidth(Math.round(w));
                }}
                onChange={handleAccountChange}
              />
            </div>
          </div>

          {/* ==================================================
              HAVE DIVISION
              ================================================== */}

          <div className="relative -left-1.25 w-full">
            <label
              htmlFor="lkpHaveDivision"
              className="mb-1 block whitespace-nowrap text-[11px] text-slate-600"
            >
              Division
            </label>

            <CommonTableSelect
              {...commonProps}
              inputId="lkpHaveDivision"
              value={getOption(haveDivisionOptions, lkpHaveDivision) as TableSelectOption | null}
              options={haveDivisionOptions as TableSelectOption[]}
              columns={[{ key: "label", label: "Division" }]}
              width="100%"
              menuWidth="100%"
              onChange={(option) => setLkpHaveDivision(option?.value ?? "")}
            />
          </div>

          {/* ==================================================
    BUSINESS TYPE
================================================== */}

          <div className="relative -left-3.25 w-[50%]">
            <label
              htmlFor="lkpBusinessType"
              className="mb-1 block whitespace-nowrap text-[11px] text-slate-600"
            >
              Business Type
            </label>

            <CommonTableSelect
              {...commonProps}
              inputId="lkpBusinessType"
              value={getOption(businessTypeOptions, lkpBusinessType) as TableSelectOption | null}
              options={businessTypeOptions as TableSelectOption[]}
              columns={[{ key: "label", label: "Business Type" }]}
              width="100%"
              menuWidth="100%"
              onChange={(option) => setLkpBusinessType(option?.value ?? "")}
            />
          </div>
        </div>
      </div>
    </>
  );
};

export default CustomerHeader;
