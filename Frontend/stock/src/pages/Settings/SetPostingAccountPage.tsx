import React, { useEffect, useState } from "react";
import Select, { type SingleValue, type StylesConfig } from "react-select";
import { toast } from "react-toastify";
import { useAltShortcuts } from "../../hooks/useAltShortcuts";
import { useEnterAsTab } from "../../hooks/useEnterAsTab";
import { useButtonPermissions } from "../../hooks/useButtonPermissions";
import {
  filterLabelOrValue,
  makeNameIdMenuComponents,
  branchMenuStyles,
} from "../../components/BranchSelect/branchSelectParts";

// Branch list with a divider between the Branch and the ID column
const branchComponents = makeNameIdMenuComponents("Branch", true);
import {
  makePairComponents,
  pairDividedIdMenuStyles as accountIdMenuStyles,
  pairDividedNameMenuStyles as accountNameMenuStyles,
  filterPairOption as accountFilterOption,
} from "../../components/PairSelect/pairSelectParts";

// Same list look as the Branch dropdown: grey "Account ID | Account Name"
// header and a divider between the columns (the Name box shows
// "Account Name | Account ID"). Created once,
// outside the page component, so react-select doesn't remount the menu.
const accountIdComponents = makePairComponents("Account ID", "Account Name", false, true);
const accountNameComponents = makePairComponents("Account ID", "Account Name", true, true);
// ============================================================
// TYPES
// ============================================================

interface SelectOption {
  value: string;
  label: string;
  // set on the account ID / Name boxes, whose open list shows both
  // columns and filters on either
  id?: string;
  name?: string;
}

interface AccountOption {
  lkpAccountID: string;
  txtAccountName: string;
}
//@ts-ignore
interface AccountRow {
  key: string;
  label: string;
  idPlaceholder: string;
  namePlaceholder: string;
}

interface FormValues {
  lkpBranch: string;
  [key: string]: string;
}

// ============================================================
// INITIAL FORM VALUES
// ============================================================

const buttonClass = "btn-style";

const initialValues: FormValues = {
  lkpBranch: "",
  lkpCashSupplierAccountID: "",
  lkpCashSupplierAccountName: "",
  lkpCashCustomerAccountID: "",
  lkpCashCustomerAccountName: "",
  lkpStockAccountID: "",
  lkpStockAccountName: "",
  lkpSalesAccountID: "",
  lkpSalesAccountName: "",
  lkpSalesReturnAccountID: "",
  lkpSalesReturnAccountName: "",
  lkpCostOfSalesAccountID: "",
  lkpCostOfSalesAccountName: "",
  lkpCostOfSalesReturnAccountID: "",
  lkpCostOfSalesReturnAccountName: "",
  lkpStockAdjustmentAccountID: "",
  lkpStockAdjustmentAccountName: "",
  lkpRoundOffAccountID: "",
  lkpRoundOffAccountName: "",
  lkpInputVATAccountID: "",
  lkpInputVATAccountName: "",
  lkpOutputVATAccountID: "",
  lkpOutputVATAccountName: "",
};

// ============================================================
// THE 11 ACCOUNT FIELDS THAT ARE SAVED
// (the Name fields are not stored - they are looked up from the
// account list)
// ============================================================

const postingAccountFields: string[] = [
  "lkpCashSupplierAccountID",
  "lkpCashCustomerAccountID",
  "lkpStockAccountID",
  "lkpSalesAccountID",
  "lkpSalesReturnAccountID",
  "lkpCostOfSalesAccountID",
  "lkpCostOfSalesReturnAccountID",
  "lkpStockAdjustmentAccountID",
  "lkpRoundOffAccountID",
  "lkpInputVATAccountID",
  "lkpOutputVATAccountID",
];

// dbo.tblmenu fmenuid for the Set Stock Posting Account page.
const MENU_ID = "9111";


// ============================================================
// REACT SELECT STYLES
// ============================================================

const selectStyles: StylesConfig<SelectOption, false> = {
  control: (base, state) => ({
    ...base,
    minHeight: "30px",
    height: "30px",
    width: "100%",
    borderRadius: "4px",
    border: "1px solid #d1d5db",
    boxShadow: "none",
    backgroundColor: state.isFocused ? "#eefbf4" : "#ffffff",
    fontSize: "11px",
    cursor: "pointer",
    "&:hover": {
      borderColor: "#9fdfbc",
    },
  }),

  valueContainer: (base) => ({
    ...base,
    height: "23px",
    minHeight: "23px",
    padding: "0 6px",
  }),

  input: (base) => ({
    ...base,
    margin: "0",
    padding: "0",
    fontSize: "11px",
  }),

  singleValue: (base) => ({
    ...base,
    color: "#263449",
    fontSize: "11px",
  }),

  placeholder: (base) => ({
    ...base,
    color: "#737b86",
    fontSize: "11px",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  }),

  indicatorsContainer: (base) => ({
    ...base,
    height: "23px",
  }),

  dropdownIndicator: (base) => ({
    ...base,
    padding: "3px",
    color: "#596575",
  }),

  clearIndicator: (base) => ({
    ...base,
    padding: "2px",
  }),

  indicatorSeparator: () => ({
    display: "none",
  }),

  menu: (base) => ({
    ...base,
    zIndex: 100,
    fontSize: "11px",
    marginTop: "1px",
    borderRadius: "2px",
  }),

  menuList: (base) => ({
    ...base,
    maxHeight: "180px",
    padding: "2px",
  }),

  option: (base, state) => ({
    ...base,
    fontSize: "11px",
    padding: "5px 8px",
    backgroundColor: state.isSelected
      ? "#dce9f7"
      : state.isFocused
        ? "#edf3fa"
        : "#ffffff",
    color: "#263449",
    cursor: "pointer",
  }),
};

// ============================================================
// COMPONENT
// ============================================================

const SetPostingAccountPage: React.FC = () => {
  const perms = useButtonPermissions(MENU_ID);
  const handleEnterAsTab = useEnterAsTab();

  const [values, setValues] = useState<FormValues>({
    ...initialValues,
  });

  // ----------------------------------------------------------
  // LOAD BRANCH LIST (lkpBranch dropdown, filtered by
  // dbo.userbranches - same as SetBranchInfo / SetDocumentNo)
  // ----------------------------------------------------------

  const [branchOptions, setBranchOptions] = useState<SelectOption[]>([]);

  // the branch the page opened with, and a counter that forces the
  // saved accounts to be loaded again (used by Clear)
  const [defaultBranch, setDefaultBranch] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  // Does the selected branch already have posting accounts set?
  // false -> the button says Save (mode S), true -> Modify (mode M)
  const [hasSavedRow, setHasSavedRow] = useState(false);

  useEffect(() => {
    const loadBranchList = async () => {
      try {
        const PstrCoID = localStorage.getItem("PstrCoID");
        const PstrUserID = localStorage.getItem("PstrUserID");

        if (!PstrCoID || !PstrUserID) {
          toast.error("getBranchList: no PstrCoID/PstrUserID in localStorage");
          return;
        }

        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/PostingAccount/getBranchList?PstrCoID=${PstrCoID}&PstrUserID=${PstrUserID}`,
        );

        if (!response.ok) {
          throw new Error(`HTTP Error: ${response.status}`);
        }

        const result = await response.json();

        if (!result.success) {
          console.error("getBranchList failed:", result.message);
          toast.error(`getBranchList failed: ${result.message}`);
          return;
        }

        setBranchOptions(
          (result.data || []).map(
            (row: { lkpBranch: string; txtBranchName: string }) => ({
              value: row.lkpBranch,
              label: row.txtBranchName,
            }),
          ),
        );
      } catch (error) {
        console.error("getBranchList error:", error);
        toast.error(
          `getBranchList error: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    };

    loadBranchList();
  }, []);

  // ----------------------------------------------------------
  // LOAD DEFAULT BRANCH (lkpBranch pre-select, live lookup via
  // dbo.getuserdefbranch - same as SetBranchInfo)
  // ----------------------------------------------------------

  useEffect(() => {
    const loadDefaultBranch = async () => {
      try {
        const PstrCoID = localStorage.getItem("PstrCoID");
        const PstrUserID = localStorage.getItem("PstrUserID");

        if (!PstrCoID || !PstrUserID) {
          toast.error("getDefaultBranch: no PstrCoID/PstrUserID in localStorage");
          return;
        }

        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/PostingAccount/getDefaultBranch?PstrCoID=${PstrCoID}&PstrUserID=${PstrUserID}`,
        );

        if (!response.ok) {
          throw new Error(`HTTP Error: ${response.status}`);
        }

        const result = await response.json();

        if (!result.success) {
          console.error("getDefaultBranch failed:", result.message);
          toast.error(`getDefaultBranch failed: ${result.message}`);
          return;
        }

        if (result.data) {
          setDefaultBranch(result.data);
          setValues((previous) => ({ ...previous, lkpBranch: result.data }));
        }
      } catch (error) {
        console.error("getDefaultBranch error:", error);
        toast.error(
          `getDefaultBranch error: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    };

    loadDefaultBranch();
  }, []);

  // ----------------------------------------------------------
  // LOAD ACCOUNT LIST (the ID / Name dropdowns of every row,
  // dbo.fillpostingaccount - company only, no branch column)
  // ----------------------------------------------------------

  const [accountList, setAccountList] = useState<AccountOption[]>([]);

  useEffect(() => {
    const loadAccountList = async () => {
      try {
        const PstrCoID = localStorage.getItem("PstrCoID");

        if (!PstrCoID) {
          toast.error("getAccountList: no PstrCoID in localStorage");
          return;
        }

        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/PostingAccount/getAccountList?PstrCoID=${PstrCoID}`,
        );

        if (!response.ok) {
          throw new Error(`HTTP Error: ${response.status}`);
        }

        const result = await response.json();

        if (!result.success) {
          console.error("getAccountList failed:", result.message);
          toast.error(`getAccountList failed: ${result.message}`);
          return;
        }

        setAccountList(result.data || []);
      } catch (error) {
        console.error("getAccountList error:", error);
        toast.error(
          `getAccountList error: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    };

    loadAccountList();
  }, []);

  // ----------------------------------------------------------
  // PREFILL THE 11 ACCOUNTS WHEN A BRANCH IS SELECTED (mode 'G').
  // Waits for the account list so the Name boxes can be filled.
  // ----------------------------------------------------------

  useEffect(() => {
    // the 22 fields (11 ID + 11 Name) for one saved row, or all
    // blank when the branch has never been saved
    const buildAccountValues = (row: Record<string, string | null> | null) => {
      const accountValues: Record<string, string> = {};

      for (const field of postingAccountFields) {
        const accountId = row?.[field] ?? "";
        const account = accountList.find((item) => item.lkpAccountID === accountId);

        accountValues[field] = account ? account.lkpAccountID : "";
        accountValues[field.replace(/ID$/, "Name")] = account?.txtAccountName ?? "";
      }

      return accountValues;
    };

    if (!values.lkpBranch) {
      setHasSavedRow(false);
      setValues((previous) => ({ ...previous, ...buildAccountValues(null) }));
      return;
    }

    if (accountList.length === 0) {
      return;
    }

    const loadPostingAccount = async () => {
      try {
        const PstrCoID = localStorage.getItem("PstrCoID");

        if (!PstrCoID) {
          toast.error("getPostingAccount: no PstrCoID in localStorage");
          return;
        }

        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/PostingAccount/getPostingAccount?PstrCoID=${PstrCoID}&lkpBranch=${values.lkpBranch}`,
        );

        if (!response.ok) {
          throw new Error(`HTTP Error: ${response.status}`);
        }

        const result = await response.json();

        if (!result.success) {
          console.error("getPostingAccount failed:", result.message);
          toast.error(`getPostingAccount failed: ${result.message}`);
          return;
        }

        // null = a branch that was never saved. A row with every account
        // empty counts as "nothing set yet" too, so the button stays Save.
        setHasSavedRow(
          !!result.data &&
            postingAccountFields.some((field) => !!result.data[field]),
        );

        setValues((previous) => ({
          ...previous,
          ...buildAccountValues(result.data),
        }));
      } catch (error) {
        console.error("getPostingAccount error:", error);
        toast.error(
          `getPostingAccount error: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    };

    loadPostingAccount();
  }, [values.lkpBranch, accountList, reloadKey]);

  // ----------------------------------------------------------
  // GENERAL VALUE HANDLER
  // ----------------------------------------------------------

  const handleChange = (name: string, value: string) => {
    setValues((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // ----------------------------------------------------------
  // GET SELECTED OPTION
  // ----------------------------------------------------------

  const getSelectedOption = (
    options: SelectOption[],
    value: string,
  ): SelectOption | null => {
    return options.find((option) => option.value === value) ?? null;
  };

  // ----------------------------------------------------------
  // ACCOUNT OPTIONS FOR EACH ROW
  // ----------------------------------------------------------

  const getAccountOptions = (): AccountOption[] => {
    return accountList;
  };

  // Both boxes use the account ID as the option's value (account names can
  // repeat, the ID cannot); the box only differs in what it shows.
  const getIdOptions = (): SelectOption[] => {
    return getAccountOptions().map((account) => ({
      value: account.lkpAccountID,
      label: account.lkpAccountID,
      id: account.lkpAccountID,
      name: account.txtAccountName,
    }));
  };

  const getNameOptions = (): SelectOption[] => {
    return getAccountOptions().map((account) => ({
      value: account.lkpAccountID,
      label: account.txtAccountName,
      id: account.lkpAccountID,
      name: account.txtAccountName,
    }));
  };

  // ----------------------------------------------------------
  // ACCOUNT CHANGE - used by the ID box AND the Name box (both give the
  // account ID as the value, so picking from either fills both)
  // ----------------------------------------------------------

  const handleAccountIdChange = (
    rowKey: string,
    selected: SingleValue<SelectOption>,
  ) => {
    const account = getAccountOptions().find(
      (item) => item.lkpAccountID === (selected?.value ?? ""),
    );

    setValues((previous) => ({
      ...previous,
      [`lkp${rowKey}AccountID`]: account?.lkpAccountID ?? "",
      [`lkp${rowKey}AccountName`]: account?.txtAccountName ?? "",
    }));
  };

  // ----------------------------------------------------------
  // CLEAR FORM
  // ----------------------------------------------------------

  const handleClear = () => {
    // back to the page-open state: the default branch, with its
    // saved accounts loaded again
    setValues({ ...initialValues, lkpBranch: defaultBranch });
    setReloadKey((previous) => previous + 1);
  };

  // ----------------------------------------------------------
  // SAVE FORM
  // ----------------------------------------------------------

  // The one button: Save the first time, Modify once the branch has a row
  // (the old form switched its button text between "&Save" and "&Modify").
  const actionWord = hasSavedRow ? "Modify" : "Save";
  const canSaveOrModify = hasSavedRow ? perms.modify : perms.save;

  const handleSave = async () => {
    if (!canSaveOrModify) {
      toast.error(`You do not have permission to ${actionWord}.`);
      return;
    }

    if (!values.lkpBranch) {
      toast.warning("Please select a 'Branch'");
      document.getElementById("lkpBranch")?.focus();
      return;
    }

    const PstrCoID = localStorage.getItem("PstrCoID");
    const PstrYear = localStorage.getItem("PstrYear");
    const PstrUserID = localStorage.getItem("PstrUserID");

    if (!PstrCoID || !PstrYear || !PstrUserID) {
      toast.error("Company ID / Year / User ID not found. Please log in again.");
      return;
    }

    // only the 11 account ids are stored
    const accountPayload = Object.fromEntries(
      postingAccountFields.map((field) => [
        field,
        values[field] || null,
      ]),
    );

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/PostingAccount/savePostingAccount`,
        {
          method: "POST",
          credentials: "include", // the server checks the session and the rights
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            PstrCoID,
            PstrYear,
            PstrUserID,
            lkpBranch: values.lkpBranch,
            ...accountPayload,
          }),
        },
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        toast.error(
          result.message ||
            (hasSavedRow
              ? "Not modified, try again."
              : "Not saved, try again."),
        );

        // the backend validator names the field that failed - same name as
        // the element id, so the cursor goes straight into it
        if (result.field) {
          document.getElementById(result.field)?.focus();
        }

        return;
      }

      toast.success(
        result.message ||
          (hasSavedRow
            ? "Posting accounts modified successfully."
            : "Posting accounts saved successfully."),
      );

      // load the branch again: it now has a saved row, so the button
      // flips from Save to Modify
      setReloadKey((previous) => previous + 1);
    } catch (error) {
      console.error("savePostingAccount error:", error);
      toast.error("Cannot connect to Posting Account API.");
    }
  };

  // Alt+S -> Save (new branch), Alt+M -> Modify (saved branch),
  // Alt+C -> Clear (the underlined letters on the buttons)
  useAltShortcuts({
    s: () => {
      if (!hasSavedRow) handleSave();
    },
    m: () => {
      if (hasSavedRow) handleSave();
    },
    c: handleClear,
  });


  // ----------------------------------------------------------
  // RENDER
  // ----------------------------------------------------------

  return (
    <div
      onKeyDown={handleEnterAsTab}
      className="flex min-h-screen w-full items-center justify-center bg-white"
    >
      <div className="w-[870px] overflow-hidden border border-slate-400 bg-white shadow-sm">

          {/* HEADER */}
          <div className="flex h-[28px] w-full items-center bg-[#a7dfc0]">
            <h1 className="ml-[5px] text-[17px] font-semibold text-[#374151]">
              Set Posting Account
            </h1>
          </div>

          {/* FORM BODY */}
          <div className="p-[12px] m-[12px]">

            {/* BRANCH */}
            <div className="mb-[8px] flex items-center gap-2">
              <label
                htmlFor="lkpBranch"
                className="w-[230px] shrink-0 whitespace-nowrap pr-3 text-right text-[14px] text-gray-600"
              >
                Branch :
              </label>

              <div className="-ml-3 w-[30%] min-w-0">
                <Select<SelectOption, false>
                  inputId="lkpBranch"
                  name="lkpBranch"
                  options={branchOptions}
                  value={getSelectedOption(branchOptions, values.lkpBranch)}
                  onChange={(selected) =>
                    handleChange("lkpBranch", selected?.value ?? "")
                  }
                  styles={{ ...selectStyles, ...branchMenuStyles }}
                  components={branchComponents}
                  filterOption={filterLabelOrValue}
                  noOptionsMessage={() => "No Branch Found"}
                  placeholder=""
                  isClearable
                  isSearchable
                />
              </div>
            </div>

            {/* CASH SUPPLIER ACCOUNT */}
            <div className="mb-[8px] flex items-center gap-2">
              <label
                htmlFor="lkpCashSupplierAccountID"
                className="w-[230px] shrink-0 whitespace-nowrap pr-3 text-right text-[14px] text-gray-600"
              >
                Cash Supplier Account :
              </label>

              {/* ACCOUNT ID */}
              <div className="-ml-3 w-[30%] min-w-0">
                <Select<SelectOption, false>
                  inputId="lkpCashSupplierAccountID"
                  name="lkpCashSupplierAccountID"
                  options={getIdOptions()}
                  value={getSelectedOption(
                    getIdOptions(),
                    values.lkpCashSupplierAccountID,
                  )}
                  onChange={(selected) =>
                    handleAccountIdChange("CashSupplier", selected)
                  }
                  styles={{ ...selectStyles, ...accountIdMenuStyles }}
                  components={accountIdComponents}
                  filterOption={accountFilterOption}
                  noOptionsMessage={() => "No Account Found"}
                  menuPortalTarget={document.body}
                  menuPosition="fixed"
                  menuPlacement="auto"
                  placeholder=""
                  isClearable
                  isSearchable
                />
              </div>

              {/* ACCOUNT NAME */}
              <div className="ml-3 w-full min-w-0">
                <Select<SelectOption, false>
                  inputId="lkpCashSupplierAccountName"
                  name="lkpCashSupplierAccountName"
                  options={getNameOptions()}
                  value={getSelectedOption(
                    getNameOptions(),
                    values.lkpCashSupplierAccountID,
                  )}
                  onChange={(selected) =>
                    handleAccountIdChange("CashSupplier", selected)
                  }
                  styles={{ ...selectStyles, ...accountNameMenuStyles }}
                  components={accountNameComponents}
                  filterOption={accountFilterOption}
                  noOptionsMessage={() => "No Account Found"}
                  menuPortalTarget={document.body}
                  menuPosition="fixed"
                  menuPlacement="auto"
                  placeholder=""
                  isClearable
                  isSearchable
                />
              </div>
            </div>

            {/* CASH CUSTOMER ACCOUNT */}
            <div className="mb-[8px] flex items-center gap-2">
              <label
                htmlFor="lkpCashCustomerAccountID"
                className="w-[230px] shrink-0 whitespace-nowrap pr-3 text-right text-[14px] text-gray-600"
              >
                Cash Customer Account :
              </label>

              <div className="-ml-3 w-[30%] min-w-0">
                <Select<SelectOption, false>
                  inputId="lkpCashCustomerAccountID"
                  name="lkpCashCustomerAccountID"
                  options={getIdOptions()}
                  value={getSelectedOption(
                    getIdOptions(),
                    values.lkpCashCustomerAccountID,
                  )}
                  onChange={(selected) =>
                    handleAccountIdChange("CashCustomer", selected)
                  }
                  styles={{ ...selectStyles, ...accountIdMenuStyles }}
                  components={accountIdComponents}
                  filterOption={accountFilterOption}
                  noOptionsMessage={() => "No Account Found"}
                  menuPortalTarget={document.body}
                  menuPosition="fixed"
                  menuPlacement="auto"
                  placeholder=""
                  isClearable
                  isSearchable
                />
              </div>

              <div className="ml-3 w-full min-w-0">
                <Select<SelectOption, false>
                  inputId="lkpCashCustomerAccountName"
                  name="lkpCashCustomerAccountName"
                  options={getNameOptions()}
                  value={getSelectedOption(
                    getNameOptions(),
                    values.lkpCashCustomerAccountID,
                  )}
                  onChange={(selected) =>
                    handleAccountIdChange("CashCustomer", selected)
                  }
                  styles={{ ...selectStyles, ...accountNameMenuStyles }}
                  components={accountNameComponents}
                  filterOption={accountFilterOption}
                  noOptionsMessage={() => "No Account Found"}
                  menuPortalTarget={document.body}
                  menuPosition="fixed"
                  menuPlacement="auto"
                  placeholder=""
                  isClearable
                  isSearchable
                />
              </div>
            </div>

            {/* STOCK ACCOUNT */}
            <div className="mb-[8px] flex items-center gap-2">
              <label
                htmlFor="lkpStockAccountID"
                className="w-[230px] shrink-0 whitespace-nowrap pr-3 text-right text-[14px] text-gray-600"
              >
                Stock Account :
              </label>

              <div className="-ml-3 w-[30%] min-w-0">
                <Select<SelectOption, false>
                  inputId="lkpStockAccountID"
                  name="lkpStockAccountID"
                  options={getIdOptions()}
                  value={getSelectedOption(
                    getIdOptions(),
                    values.lkpStockAccountID,
                  )}
                  onChange={(selected) =>
                    handleAccountIdChange("Stock", selected)
                  }
                  styles={{ ...selectStyles, ...accountIdMenuStyles }}
                  components={accountIdComponents}
                  filterOption={accountFilterOption}
                  noOptionsMessage={() => "No Account Found"}
                  menuPortalTarget={document.body}
                  menuPosition="fixed"
                  menuPlacement="auto"
                  placeholder=""
                  isClearable
                  isSearchable
                />
              </div>

              <div className="ml-3 w-full min-w-0">
                <Select<SelectOption, false>
                  inputId="lkpStockAccountName"
                  name="lkpStockAccountName"
                  options={getNameOptions()}
                  value={getSelectedOption(
                    getNameOptions(),
                    values.lkpStockAccountID,
                  )}
                  onChange={(selected) =>
                    handleAccountIdChange("Stock", selected)
                  }
                  styles={{ ...selectStyles, ...accountNameMenuStyles }}
                  components={accountNameComponents}
                  filterOption={accountFilterOption}
                  noOptionsMessage={() => "No Account Found"}
                  menuPortalTarget={document.body}
                  menuPosition="fixed"
                  menuPlacement="auto"
                  placeholder=""
                  isClearable
                  isSearchable
                />
              </div>
            </div>

            {/* SALES ACCOUNT */}
            <div className="mb-[8px] flex items-center gap-2">
              <label
                htmlFor="lkpSalesAccountID"
                className="w-[230px] shrink-0 whitespace-nowrap pr-3 text-right text-[14px] text-gray-600"
              >
                Sales Account :
              </label>

              <div className="-ml-3 w-[30%] min-w-0">
                <Select<SelectOption, false>
                  inputId="lkpSalesAccountID"
                  name="lkpSalesAccountID"
                  options={getIdOptions()}
                  value={getSelectedOption(
                    getIdOptions(),
                    values.lkpSalesAccountID,
                  )}
                  onChange={(selected) =>
                    handleAccountIdChange("Sales", selected)
                  }
                  styles={{ ...selectStyles, ...accountIdMenuStyles }}
                  components={accountIdComponents}
                  filterOption={accountFilterOption}
                  noOptionsMessage={() => "No Account Found"}
                  menuPortalTarget={document.body}
                  menuPosition="fixed"
                  menuPlacement="auto"
                  placeholder=""
                  isClearable
                  isSearchable
                />
              </div>

              <div className="ml-3 w-full min-w-0">
                <Select<SelectOption, false>
                  inputId="lkpSalesAccountName"
                  name="lkpSalesAccountName"
                  options={getNameOptions()}
                  value={getSelectedOption(
                    getNameOptions(),
                    values.lkpSalesAccountID,
                  )}
                  onChange={(selected) =>
                    handleAccountIdChange("Sales", selected)
                  }
                  styles={{ ...selectStyles, ...accountNameMenuStyles }}
                  components={accountNameComponents}
                  filterOption={accountFilterOption}
                  noOptionsMessage={() => "No Account Found"}
                  menuPortalTarget={document.body}
                  menuPosition="fixed"
                  menuPlacement="auto"
                  placeholder=""
                  isClearable
                  isSearchable
                />
              </div>
            </div>

            {/* SALES RETURN ACCOUNT */}
            <div className="mb-[8px] flex items-center gap-2">
              <label
                htmlFor="lkpSalesReturnAccountID"
                className="w-[230px] shrink-0 whitespace-nowrap pr-3 text-right text-[14px] text-gray-600"
              >
                Sales Return Account :
              </label>

              <div className="-ml-3 w-[30%] min-w-0">
                <Select<SelectOption, false>
                  inputId="lkpSalesReturnAccountID"
                  name="lkpSalesReturnAccountID"
                  options={getIdOptions()}
                  value={getSelectedOption(
                    getIdOptions(),
                    values.lkpSalesReturnAccountID,
                  )}
                  onChange={(selected) =>
                    handleAccountIdChange("SalesReturn", selected)
                  }
                  styles={{ ...selectStyles, ...accountIdMenuStyles }}
                  components={accountIdComponents}
                  filterOption={accountFilterOption}
                  noOptionsMessage={() => "No Account Found"}
                  menuPortalTarget={document.body}
                  menuPosition="fixed"
                  menuPlacement="auto"
                  placeholder=""
                  isClearable
                  isSearchable
                />
              </div>

              <div className="ml-3 w-full min-w-0">
                <Select<SelectOption, false>
                  inputId="lkpSalesReturnAccountName"
                  name="lkpSalesReturnAccountName"
                  options={getNameOptions()}
                  value={getSelectedOption(
                    getNameOptions(),
                    values.lkpSalesReturnAccountID,
                  )}
                  onChange={(selected) =>
                    handleAccountIdChange("SalesReturn", selected)
                  }
                  styles={{ ...selectStyles, ...accountNameMenuStyles }}
                  components={accountNameComponents}
                  filterOption={accountFilterOption}
                  noOptionsMessage={() => "No Account Found"}
                  menuPortalTarget={document.body}
                  menuPosition="fixed"
                  menuPlacement="auto"
                  placeholder=""
                  isClearable
                  isSearchable
                />
              </div>
            </div>

            {/* COST OF SALES ACCOUNT */}
            <div className="mb-[8px] flex items-center gap-2">
              <label
                htmlFor="lkpCostOfSalesAccountID"
                className="w-[230px] shrink-0 whitespace-nowrap pr-3 text-right text-[14px] text-gray-600"
              >
                Cost Of Sales Account :
              </label>

              <div className="-ml-3 w-[30%] min-w-0">
                <Select<SelectOption, false>
                  inputId="lkpCostOfSalesAccountID"
                  name="lkpCostOfSalesAccountID"
                  options={getIdOptions()}
                  value={getSelectedOption(
                    getIdOptions(),
                    values.lkpCostOfSalesAccountID,
                  )}
                  onChange={(selected) =>
                    handleAccountIdChange("CostOfSales", selected)
                  }
                  styles={{ ...selectStyles, ...accountIdMenuStyles }}
                  components={accountIdComponents}
                  filterOption={accountFilterOption}
                  noOptionsMessage={() => "No Account Found"}
                  menuPortalTarget={document.body}
                  menuPosition="fixed"
                  menuPlacement="auto"
                  placeholder=""
                  isClearable
                  isSearchable
                />
              </div>

              <div className="ml-3 w-full min-w-0">
                <Select<SelectOption, false>
                  inputId="lkpCostOfSalesAccountName"
                  name="lkpCostOfSalesAccountName"
                  options={getNameOptions()}
                  value={getSelectedOption(
                    getNameOptions(),
                    values.lkpCostOfSalesAccountID,
                  )}
                  onChange={(selected) =>
                    handleAccountIdChange("CostOfSales", selected)
                  }
                  styles={{ ...selectStyles, ...accountNameMenuStyles }}
                  components={accountNameComponents}
                  filterOption={accountFilterOption}
                  noOptionsMessage={() => "No Account Found"}
                  menuPortalTarget={document.body}
                  menuPosition="fixed"
                  menuPlacement="auto"
                  placeholder=""
                  isClearable
                  isSearchable
                />
              </div>
            </div>

            {/* COST OF SALES RETURN ACCOUNT */}
            <div className="mb-[8px] flex items-center gap-2">
              <label
                htmlFor="lkpCostOfSalesReturnAccountID"
                className="w-[230px] shrink-0 whitespace-nowrap pr-3 text-right text-[14px] text-gray-600"
              >
                Cost Of Sales Return Account :
              </label>

              <div className="-ml-3 w-[30%] min-w-0">
                <Select<SelectOption, false>
                  inputId="lkpCostOfSalesReturnAccountID"
                  name="lkpCostOfSalesReturnAccountID"
                  options={getIdOptions()}
                  value={getSelectedOption(
                    getIdOptions(),
                    values.lkpCostOfSalesReturnAccountID,
                  )}
                  onChange={(selected) =>
                    handleAccountIdChange("CostOfSalesReturn", selected)
                  }
                  styles={{ ...selectStyles, ...accountIdMenuStyles }}
                  components={accountIdComponents}
                  filterOption={accountFilterOption}
                  noOptionsMessage={() => "No Account Found"}
                  menuPortalTarget={document.body}
                  menuPosition="fixed"
                  menuPlacement="auto"
                  placeholder=""
                  isClearable
                  isSearchable
                />
              </div>

              <div className="ml-3 w-full min-w-0">
                <Select<SelectOption, false>
                  inputId="lkpCostOfSalesReturnAccountName"
                  name="lkpCostOfSalesReturnAccountName"
                  options={getNameOptions()}
                  value={getSelectedOption(
                    getNameOptions(),
                    values.lkpCostOfSalesReturnAccountID,
                  )}
                  onChange={(selected) =>
                    handleAccountIdChange("CostOfSalesReturn", selected)
                  }
                  styles={{ ...selectStyles, ...accountNameMenuStyles }}
                  components={accountNameComponents}
                  filterOption={accountFilterOption}
                  noOptionsMessage={() => "No Account Found"}
                  menuPortalTarget={document.body}
                  menuPosition="fixed"
                  menuPlacement="auto"
                  placeholder=""
                  isClearable
                  isSearchable
                />
              </div>
            </div>

            {/* STOCK ADJUSTMENT ACCOUNT */}
            <div className="mb-[8px] flex items-center gap-2">
              <label
                htmlFor="lkpStockAdjustmentAccountID"
                className="w-[230px] shrink-0 whitespace-nowrap pr-3 text-right text-[14px] text-gray-600"
              >
                Stock Adjustment Account :
              </label>

              <div className="-ml-3 w-[30%] min-w-0">
                <Select<SelectOption, false>
                  inputId="lkpStockAdjustmentAccountID"
                  name="lkpStockAdjustmentAccountID"
                  options={getIdOptions()}
                  value={getSelectedOption(
                    getIdOptions(),
                    values.lkpStockAdjustmentAccountID,
                  )}
                  onChange={(selected) =>
                    handleAccountIdChange("StockAdjustment", selected)
                  }
                  styles={{ ...selectStyles, ...accountIdMenuStyles }}
                  components={accountIdComponents}
                  filterOption={accountFilterOption}
                  noOptionsMessage={() => "No Account Found"}
                  menuPortalTarget={document.body}
                  menuPosition="fixed"
                  menuPlacement="auto"
                  placeholder=""
                  isClearable
                  isSearchable
                />
              </div>

              <div className="ml-3 w-full min-w-0">
                <Select<SelectOption, false>
                  inputId="lkpStockAdjustmentAccountName"
                  name="lkpStockAdjustmentAccountName"
                  options={getNameOptions()}
                  value={getSelectedOption(
                    getNameOptions(),
                    values.lkpStockAdjustmentAccountID,
                  )}
                  onChange={(selected) =>
                    handleAccountIdChange("StockAdjustment", selected)
                  }
                  styles={{ ...selectStyles, ...accountNameMenuStyles }}
                  components={accountNameComponents}
                  filterOption={accountFilterOption}
                  noOptionsMessage={() => "No Account Found"}
                  menuPortalTarget={document.body}
                  menuPosition="fixed"
                  menuPlacement="auto"
                  placeholder=""
                  isClearable
                  isSearchable
                />
              </div>
            </div>


            {/* ROUND OFF ACCOUNT */}
            <div className="mb-[8px] flex items-center gap-2">
              <label
                htmlFor="lkpRoundOffAccountID"
                className="w-[230px] shrink-0 whitespace-nowrap pr-3 text-right text-[14px] text-gray-600"
              >
                Round Off Account :
              </label>

              <div className="-ml-3 w-[30%] min-w-0">
                <Select<SelectOption, false>
                  inputId="lkpRoundOffAccountID"
                  name="lkpRoundOffAccountID"
                  options={getIdOptions()}
                  value={getSelectedOption(
                    getIdOptions(),
                    values.lkpRoundOffAccountID,
                  )}
                  onChange={(selected) =>
                    handleAccountIdChange("RoundOff", selected)
                  }
                  styles={{ ...selectStyles, ...accountIdMenuStyles }}
                  components={accountIdComponents}
                  filterOption={accountFilterOption}
                  noOptionsMessage={() => "No Account Found"}
                  menuPortalTarget={document.body}
                  menuPosition="fixed"
                  menuPlacement="auto"
                  placeholder=""
                  isClearable
                  isSearchable
                />
              </div>

              <div className="ml-3 w-full min-w-0">
                <Select<SelectOption, false>
                  inputId="lkpRoundOffAccountName"
                  name="lkpRoundOffAccountName"
                  options={getNameOptions()}
                  value={getSelectedOption(
                    getNameOptions(),
                    values.lkpRoundOffAccountID,
                  )}
                  onChange={(selected) =>
                    handleAccountIdChange("RoundOff", selected)
                  }
                  styles={{ ...selectStyles, ...accountNameMenuStyles }}
                  components={accountNameComponents}
                  filterOption={accountFilterOption}
                  noOptionsMessage={() => "No Account Found"}
                  menuPortalTarget={document.body}
                  menuPosition="fixed"
                  menuPlacement="auto"
                  placeholder=""
                  isClearable
                  isSearchable
                />
              </div>
            </div>


            {/* INPUT VAT ACCOUNT */}
            <div className="mb-[8px] flex items-center gap-2">
              <label
                htmlFor="lkpInputVATAccountID"
                className="w-[230px] shrink-0 whitespace-nowrap pr-3 text-right text-[14px] text-gray-600"
              >
                Input VAT Account :
              </label>

              <div className="-ml-3 w-[30%] min-w-0">
                <Select<SelectOption, false>
                  inputId="lkpInputVATAccountID"
                  name="lkpInputVATAccountID"
                  options={getIdOptions()}
                  value={getSelectedOption(
                    getIdOptions(),
                    values.lkpInputVATAccountID,
                  )}
                  onChange={(selected) =>
                    handleAccountIdChange("InputVAT", selected)
                  }
                  styles={{ ...selectStyles, ...accountIdMenuStyles }}
                  components={accountIdComponents}
                  filterOption={accountFilterOption}
                  noOptionsMessage={() => "No Account Found"}
                  menuPortalTarget={document.body}
                  menuPosition="fixed"
                  menuPlacement="auto"
                  placeholder=""
                  isClearable
                  isSearchable
                />
              </div>

              <div className="ml-3 w-full min-w-0">
                <Select<SelectOption, false>
                  inputId="lkpInputVATAccountName"
                  name="lkpInputVATAccountName"
                  options={getNameOptions()}
                  value={getSelectedOption(
                    getNameOptions(),
                    values.lkpInputVATAccountID,
                  )}
                  onChange={(selected) =>
                    handleAccountIdChange("InputVAT", selected)
                  }
                  styles={{ ...selectStyles, ...accountNameMenuStyles }}
                  components={accountNameComponents}
                  filterOption={accountFilterOption}
                  noOptionsMessage={() => "No Account Found"}
                  menuPortalTarget={document.body}
                  menuPosition="fixed"
                  menuPlacement="auto"
                  placeholder=""
                  isClearable
                  isSearchable
                />
              </div>
            </div>

            {/* OUTPUT VAT ACCOUNT */}
            <div className="mb-[8px] flex items-center gap-2">
              <label
                htmlFor="lkpOutputVATAccountID"
                className="w-[230px] shrink-0 whitespace-nowrap pr-3 text-right text-[14px] text-gray-600"
              >
                Output VAT Account :
              </label>

              <div className="-ml-3 w-[30%] min-w-0">
                <Select<SelectOption, false>
                  inputId="lkpOutputVATAccountID"
                  name="lkpOutputVATAccountID"
                  options={getIdOptions()}
                  value={getSelectedOption(
                    getIdOptions(),
                    values.lkpOutputVATAccountID,
                  )}
                  onChange={(selected) =>
                    handleAccountIdChange("OutputVAT", selected)
                  }
                  styles={{ ...selectStyles, ...accountIdMenuStyles }}
                  components={accountIdComponents}
                  filterOption={accountFilterOption}
                  noOptionsMessage={() => "No Account Found"}
                  menuPortalTarget={document.body}
                  menuPosition="fixed"
                  menuPlacement="auto"
                  placeholder=""
                  isClearable
                  isSearchable
                />
              </div>

              <div className="ml-3 w-full min-w-0">
                <Select<SelectOption, false>
                  inputId="lkpOutputVATAccountName"
                  name="lkpOutputVATAccountName"
                  options={getNameOptions()}
                  value={getSelectedOption(
                    getNameOptions(),
                    values.lkpOutputVATAccountID,
                  )}
                  onChange={(selected) =>
                    handleAccountIdChange("OutputVAT", selected)
                  }
                  styles={{ ...selectStyles, ...accountNameMenuStyles }}
                  components={accountNameComponents}
                  filterOption={accountFilterOption}
                  noOptionsMessage={() => "No Account Found"}
                  menuPortalTarget={document.body}
                  menuPosition="fixed"
                  menuPlacement="auto"
                  placeholder=""
                  isClearable
                  isSearchable
                />
              </div>
            </div>

            {/* BUTTONS */}
            <div className="mt-[14px] flex justify-center gap-3">
              <button
                id={hasSavedRow ? "btnModify" : "btnSave"}
                name={hasSavedRow ? "btnModify" : "btnSave"}
                type="button"
                onClick={handleSave}
                disabled={!canSaveOrModify}
                className={`${buttonClass} disabled:cursor-not-allowed disabled:opacity-40`}
              >
                <span className="underline underline-offset-2">
                  {actionWord.charAt(0)}
                </span>
                {actionWord.slice(1)}
              </button>

              <button
                id="btnClear"
                name="btnClear"
                type="button"
                onClick={handleClear}
                className={buttonClass}
              >
                <span className="underline underline-offset-2">C</span>lear
              </button>
            </div>

          </div>
      </div>
    </div>
  );
};

export default SetPostingAccountPage;