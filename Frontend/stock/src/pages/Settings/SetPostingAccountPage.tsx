import React, { useEffect, useState } from "react";
import Select, { type SingleValue, type StylesConfig } from "react-select";
import { toast } from "react-toastify";
import { useAltShortcuts } from "../../hooks/useAltShortcuts";
import { useEnterAsTab } from "../../hooks/useEnterAsTab";
import { useButtonPermissions } from "../../hooks/useButtonPermissions";
import {
  filterLabelOrValue,
  BranchMenuList,
  BranchOption,
  branchMenuStyles,
} from "../../components/BranchSelect/branchSelectParts";
// ============================================================
// TYPES
// ============================================================

interface SelectOption {
  value: string;
  label: string;
}

interface AccountOption {
  id: string;
  name: string;
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

const buttonClass = `
  min-w-[110px]
  h-[40px]
  rounded-[4px]
  border
  border-[#9db8d4]
  bg-gradient-to-b
  from-[#ffffff]
  to-[#e7eef5]
  px-4
  text-[18px]
  shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]
  transition-colors
  duration-100
  text-transparent
  bg-clip-text
  bg-gradient-to-r
  from-green-800
  to-green-500
  hover:border-[#7f9fbd]
  hover:bg-gradient-to-b
  focus:border-[#20884e]
  focus:outline-none
  focus:ring-0
  hover:text-green-800
`;

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
// FORM FIELD -> dbo.tblsetpostingaccount COLUMN
// (the Name fields are not stored - they are looked up from the
// account list)
// ============================================================

const postingAccountColumns: Record<string, string> = {
  lkpCashSupplierAccountID: "fcashsupplieraccountid",
  lkpCashCustomerAccountID: "fcashcustomeraccountid",
  lkpStockAccountID: "fstockaccountid",
  lkpSalesAccountID: "fsalesaccountid",
  lkpSalesReturnAccountID: "fsalesretaccountid",
  lkpCostOfSalesAccountID: "fsalescostaccountid",
  lkpCostOfSalesReturnAccountID: "fsalesretcostaccountid",
  lkpStockAdjustmentAccountID: "fstockadjaccountid",
  lkpRoundOffAccountID: "froundoffaccountid",
  lkpInputVATAccountID: "finputvataccountid",
  lkpOutputVATAccountID: "foutputvataccountid",
};

// dbo.tblmenu fmenuid for the Set Stock Posting Account page.
const MENU_ID = "9111";


// ============================================================
// REACT SELECT STYLES
// ============================================================

const selectStyles: StylesConfig<SelectOption, false> = {
  control: (base, state) => ({
    ...base,
    minHeight: "27px",
    height: "27px",
    width: "100%",
    borderRadius: "2px",
    border: state.isFocused
      ? "1px solid #7398c5"
      : "1px solid #c7cbd1",
    boxShadow: "none",
    backgroundColor: "#ffffff",
    fontSize: "11px",
    cursor: "pointer",
    "&:hover": {
      borderColor: "#8b9db3",
    },
  }),

  valueContainer: (base) => ({
    ...base,
    height: "25px",
    padding: "0 5px",
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
    height: "25px",
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
            (row: { fbrid: string; fbrname: string }) => ({
              value: row.fbrid,
              label: row.fbrname,
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

        setAccountList(
          (result.data || []).map(
            (row: { faccountid: string; faccountname: string }) => ({
              id: row.faccountid,
              name: row.faccountname,
            }),
          ),
        );
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

      for (const [field, column] of Object.entries(postingAccountColumns)) {
        const accountId = row?.[column] ?? "";
        const account = accountList.find((item) => item.id === accountId);

        accountValues[field] = account ? account.id : "";
        accountValues[field.replace(/ID$/, "Name")] = account?.name ?? "";
      }

      return accountValues;
    };

    if (!values.lkpBranch) {
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
  }, [values.lkpBranch, accountList]);

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

  const getIdOptions = (): SelectOption[] => {
    return getAccountOptions().map((account) => ({
      value: account.id,
      label: account.id,
    }));
  };

  const getNameOptions = (): SelectOption[] => {
    return getAccountOptions().map((account) => ({
      value: account.name,
      label: account.name,
    }));
  };

  // ----------------------------------------------------------
  // ACCOUNT ID CHANGE
  // ----------------------------------------------------------

  const handleAccountIdChange = (
    rowKey: string,
    selected: SingleValue<SelectOption>,
  ) => {
    const account = getAccountOptions().find(
      (item) => item.id === (selected?.value ?? ""),
    );

    setValues((previous) => ({
      ...previous,
      [`lkp${rowKey}AccountID`]: account?.id ?? "",
      [`lkp${rowKey}AccountName`]: account?.name ?? "",
    }));
  };

  // ----------------------------------------------------------
  // ACCOUNT NAME CHANGE
  // ----------------------------------------------------------

  const handleAccountNameChange = (
    rowKey: string,
    selected: SingleValue<SelectOption>,
  ) => {
    const account = getAccountOptions().find(
      (item) => item.name === (selected?.value ?? ""),
    );

    setValues((previous) => ({
      ...previous,
      [`lkp${rowKey}AccountID`]: account?.id ?? "",
      [`lkp${rowKey}AccountName`]: account?.name ?? "",
    }));
  };

  // ----------------------------------------------------------
  // CLEAR FORM
  // ----------------------------------------------------------

  const handleClear = () => {
    setValues({ ...initialValues });
  };

  // ----------------------------------------------------------
  // SAVE FORM
  // ----------------------------------------------------------

  const handleSave = async () => {
    if (!perms.save) {
      toast.error("You do not have permission to Save.");
      return;
    }

    if (!values.lkpBranch) {
      toast.warning("Branch is required.");
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
      Object.keys(postingAccountColumns).map((field) => [
        field,
        values[field] || null,
      ]),
    );

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/PostingAccount/savePostingAccount`,
        {
          method: "POST",
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
        toast.error(result.message || "Posting accounts could not be saved.");
        return;
      }

      toast.success(result.message || "Posting accounts saved successfully.");
    } catch (error) {
      console.error("savePostingAccount error:", error);
      toast.error("Cannot connect to Posting Account API.");
    }
  };

  // Alt+S -> Save, Alt+C -> Clear (the underlined letters on the buttons)
  useAltShortcuts({
    s: handleSave,
    c: handleClear,
  });


  // ----------------------------------------------------------
  // RENDER
  // ----------------------------------------------------------

  return (
    <div
      onKeyDown={handleEnterAsTab}
      className="flex min-h-screen items-center justify-center bg-white p-4 sm:p-5 "
    >
      <div className="w-full max-w-200 bg-white p-0.75 font-sans text-[#263449] ">
        <div className="w-full border border-[#d5d5d5] bg-white">

          {/* HEADER */}
          <header className="flex h-9 shrink-0 items-center border-b border-slate-300 bg-[#a3dfc0]">
            <span className="px-5 text-[1.0625rem] font-semibold text-slate-700">
              Set Posting Account
            </span>
          </header>

          {/* FORM BODY */}
          <div className="pb-3.75 pt-3.5 sm:pr-3 ">

            {/* BRANCH */}
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0 -ml-4">
              <label
                htmlFor="lkpBranch"
                className="w-full shrink-0 text-left text-[0.6875rem] font-medium sm:w-46.25 sm:text-right"
              >
                Branch :
              </label>

              <div className="w-full min-w-0 sm:w-50">
                <Select<SelectOption, false>
                  inputId="lkpBranch"
                  name="lkpBranch"
                  options={branchOptions}
                  value={getSelectedOption(branchOptions, values.lkpBranch)}
                  onChange={(selected) =>
                    handleChange("lkpBranch", selected?.value ?? "")
                  }
                  styles={{ ...selectStyles, ...branchMenuStyles }}
                  components={{ Option: BranchOption, MenuList: BranchMenuList }}
                  filterOption={filterLabelOrValue}
                  noOptionsMessage={() => "No Branch Found"}
                  placeholder=""
                  isClearable
                  isSearchable
                />
              </div>
            </div>

            {/* CASH SUPPLIER ACCOUNT */}
            <div className="flex gap-2 items-center m-2">
              <label
                htmlFor="lkpCashSupplierAccountID"
                className="w-[160px] shrink-0 text-right text-[0.6875rem] font-medium whitespace-nowrap"
              >
                Cash Supplier Account :
              </label>

              {/* ACCOUNT ID */}
              <div className="w-[30%] min-w-0">
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
                  styles={selectStyles}
                  placeholder=""
                  isClearable
                  isSearchable
                />
              </div>

              {/* ACCOUNT NAME */}
              <div className="w-full min-w-0">
                <Select<SelectOption, false>
                  inputId="lkpCashSupplierAccountName"
                  name="lkpCashSupplierAccountName"
                  options={getNameOptions()}
                  value={getSelectedOption(
                    getNameOptions(),
                    values.lkpCashSupplierAccountName,
                  )}
                  onChange={(selected) =>
                    handleAccountNameChange("CashSupplier", selected)
                  }
                  styles={selectStyles}
                  placeholder=""
                  isClearable
                  isSearchable
                />
              </div>
            </div>

            {/* CASH CUSTOMER ACCOUNT */}
            <div className="flex gap-2 items-center m-2">
              <label
                htmlFor="lkpCashCustomerAccountID"
                className="w-[160px] shrink-0 text-right text-[0.6875rem] font-medium whitespace-nowrap"
              >
                Cash Customer Account :
              </label>

              <div className="w-[30%] min-w-0">
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
                  styles={selectStyles}
                  placeholder=""
                  isClearable
                  isSearchable
                />
              </div>

              <div className="w-full min-w-0">
                <Select<SelectOption, false>
                  inputId="lkpCashCustomerAccountName"
                  name="lkpCashCustomerAccountName"
                  options={getNameOptions()}
                  value={getSelectedOption(
                    getNameOptions(),
                    values.lkpCashCustomerAccountName,
                  )}
                  onChange={(selected) =>
                    handleAccountNameChange("CashCustomer", selected)
                  }
                  styles={selectStyles}
                  placeholder=""
                  isClearable
                  isSearchable
                />
              </div>
            </div>

            {/* STOCK ACCOUNT */}
            <div className="flex gap-2 items-center m-2">
              <label
                htmlFor="lkpStockAccountID"
                className="w-[160px] shrink-0 text-right text-[0.6875rem] font-medium whitespace-nowrap"
              >
                Stock Account :
              </label>

              <div className="w-[30%] min-w-0">
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
                  styles={selectStyles}
                  placeholder=""
                  isClearable
                  isSearchable
                />
              </div>

              <div className="w-full min-w-0">
                <Select<SelectOption, false>
                  inputId="lkpStockAccountName"
                  name="lkpStockAccountName"
                  options={getNameOptions()}
                  value={getSelectedOption(
                    getNameOptions(),
                    values.lkpStockAccountName,
                  )}
                  onChange={(selected) =>
                    handleAccountNameChange("Stock", selected)
                  }
                  styles={selectStyles}
                  placeholder=""
                  isClearable
                  isSearchable
                />
              </div>
            </div>

            {/* SALES ACCOUNT */}
            <div className="flex gap-2 items-center m-2">
              <label
                htmlFor="lkpSalesAccountID"
                className="w-[160px] shrink-0 text-right text-[0.6875rem] font-medium whitespace-nowrap"
              >
                Sales Account :
              </label>

              <div className="w-[30%] min-w-0">
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
                  styles={selectStyles}
                  placeholder=""
                  isClearable
                  isSearchable
                />
              </div>

              <div className="w-full min-w-0">
                <Select<SelectOption, false>
                  inputId="lkpSalesAccountName"
                  name="lkpSalesAccountName"
                  options={getNameOptions()}
                  value={getSelectedOption(
                    getNameOptions(),
                    values.lkpSalesAccountName,
                  )}
                  onChange={(selected) =>
                    handleAccountNameChange("Sales", selected)
                  }
                  styles={selectStyles}
                  placeholder=""
                  isClearable
                  isSearchable
                />
              </div>
            </div>

            {/* SALES RETURN ACCOUNT */}
            <div className="flex gap-2 items-center m-2">
              <label
                htmlFor="lkpSalesReturnAccountID"
                className="w-[160px] shrink-0 text-right text-[0.6875rem] font-medium whitespace-nowrap"
              >
                Sales Return Account :
              </label>

              <div className="w-[30%] min-w-0">
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
                  styles={selectStyles}
                  placeholder=""
                  isClearable
                  isSearchable
                />
              </div>

              <div className="w-full min-w-0">
                <Select<SelectOption, false>
                  inputId="lkpSalesReturnAccountName"
                  name="lkpSalesReturnAccountName"
                  options={getNameOptions()}
                  value={getSelectedOption(
                    getNameOptions(),
                    values.lkpSalesReturnAccountName,
                  )}
                  onChange={(selected) =>
                    handleAccountNameChange("SalesReturn", selected)
                  }
                  styles={selectStyles}
                  placeholder=""
                  isClearable
                  isSearchable
                />
              </div>
            </div>

            {/* COST OF SALES ACCOUNT */}
            <div className="flex gap-2 items-center m-2">
              <label
                htmlFor="lkpCostOfSalesAccountID"
                className="w-[160px] shrink-0 text-right text-[0.6875rem] font-medium whitespace-nowrap"
              >
                Cost Of Sales Account :
              </label>

              <div className="w-[30%] min-w-0">
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
                  styles={selectStyles}
                  placeholder=""
                  isClearable
                  isSearchable
                />
              </div>

              <div className="w-full min-w-0">
                <Select<SelectOption, false>
                  inputId="lkpCostOfSalesAccountName"
                  name="lkpCostOfSalesAccountName"
                  options={getNameOptions()}
                  value={getSelectedOption(
                    getNameOptions(),
                    values.lkpCostOfSalesAccountName,
                  )}
                  onChange={(selected) =>
                    handleAccountNameChange("CostOfSales", selected)
                  }
                  styles={selectStyles}
                  placeholder=""
                  isClearable
                  isSearchable
                />
              </div>
            </div>

            {/* COST OF SALES RETURN ACCOUNT */}
            <div className="flex gap-2 items-center m-2">
              <label
                htmlFor="lkpCostOfSalesReturnAccountID"
                className="w-[160px] shrink-0 text-right text-[0.6875rem] font-medium whitespace-nowrap"
              >
                Cost Of Sales Return Account :
              </label>

              <div className="w-[30%] min-w-0">
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
                  styles={selectStyles}
                  placeholder=""
                  isClearable
                  isSearchable
                />
              </div>

              <div className="w-full min-w-0">
                <Select<SelectOption, false>
                  inputId="lkpCostOfSalesReturnAccountName"
                  name="lkpCostOfSalesReturnAccountName"
                  options={getNameOptions()}
                  value={getSelectedOption(
                    getNameOptions(),
                    values.lkpCostOfSalesReturnAccountName,
                  )}
                  onChange={(selected) =>
                    handleAccountNameChange("CostOfSalesReturn", selected)
                  }
                  styles={selectStyles}
                  placeholder=""
                  isClearable
                  isSearchable
                />
              </div>
            </div>

            {/* STOCK ADJUSTMENT ACCOUNT */}
            <div className="flex gap-2 items-center m-2">
              <label
                htmlFor="lkpStockAdjustmentAccountID"
                className="w-[160px] shrink-0 text-right text-[0.6875rem] font-medium whitespace-nowrap"
              >
                Stock Adjustment Account :
              </label>

              <div className="w-[30%] min-w-0">
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
                  styles={selectStyles}
                  placeholder=""
                  isClearable
                  isSearchable
                />
              </div>

              <div className="w-full min-w-0">
                <Select<SelectOption, false>
                  inputId="lkpStockAdjustmentAccountName"
                  name="lkpStockAdjustmentAccountName"
                  options={getNameOptions()}
                  value={getSelectedOption(
                    getNameOptions(),
                    values.lkpStockAdjustmentAccountName,
                  )}
                  onChange={(selected) =>
                    handleAccountNameChange("StockAdjustment", selected)
                  }
                  styles={selectStyles}
                  placeholder=""
                  isClearable
                  isSearchable
                />
              </div>
            </div>


            {/* ROUND OFF ACCOUNT */}
            <div className="flex gap-2 items-center m-2">
              <label
                htmlFor="lkpRoundOffAccountID"
                className="w-[160px] shrink-0 text-right text-[0.6875rem] font-medium whitespace-nowrap"
              >
                Round Off Account :
              </label>

              <div className="w-[30%] min-w-0">
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
                  styles={selectStyles}
                  placeholder=""
                  isClearable
                  isSearchable
                />
              </div>

              <div className="w-full min-w-0">
                <Select<SelectOption, false>
                  inputId="lkpRoundOffAccountName"
                  name="lkpRoundOffAccountName"
                  options={getNameOptions()}
                  value={getSelectedOption(
                    getNameOptions(),
                    values.lkpRoundOffAccountName,
                  )}
                  onChange={(selected) =>
                    handleAccountNameChange("RoundOff", selected)
                  }
                  styles={selectStyles}
                  placeholder=""
                  isClearable
                  isSearchable
                />
              </div>
            </div>


            {/* INPUT VAT ACCOUNT */}
            <div className="flex gap-2 items-center m-2">
              <label
                htmlFor="lkpInputVATAccountID"
                className="w-[160px] shrink-0 text-right text-[0.6875rem] font-medium whitespace-nowrap"
              >
                Input VAT Account :
              </label>

              <div className="w-[30%] min-w-0">
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
                  styles={selectStyles}
                  placeholder=""
                  isClearable
                  isSearchable
                />
              </div>

              <div className="w-full min-w-0">
                <Select<SelectOption, false>
                  inputId="lkpInputVATAccountName"
                  name="lkpInputVATAccountName"
                  options={getNameOptions()}
                  value={getSelectedOption(
                    getNameOptions(),
                    values.lkpInputVATAccountName,
                  )}
                  onChange={(selected) =>
                    handleAccountNameChange("InputVAT", selected)
                  }
                  styles={selectStyles}
                  placeholder=""
                  isClearable
                  isSearchable
                />
              </div>
            </div>

            {/* OUTPUT VAT ACCOUNT */}
            <div className="flex gap-2 items-center m-2">
              <label
                htmlFor="lkpOutputVATAccountID"
                className="w-[160px] shrink-0 text-right text-[0.6875rem] font-medium whitespace-nowrap"
              >
                Output VAT Account :
              </label>

              <div className="w-[30%] min-w-0">
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
                  styles={selectStyles}
                  placeholder=""
                  isClearable
                  isSearchable
                />
              </div>

              <div className="w-full min-w-0">
                <Select<SelectOption, false>
                  inputId="lkpOutputVATAccountName"
                  name="lkpOutputVATAccountName"
                  options={getNameOptions()}
                  value={getSelectedOption(
                    getNameOptions(),
                    values.lkpOutputVATAccountName,
                  )}
                  onChange={(selected) =>
                    handleAccountNameChange("OutputVAT", selected)
                  }
                  styles={selectStyles}
                  placeholder=""
                  isClearable
                  isSearchable
                />
              </div>
            </div>

            {/* BUTTONS */}
            <div className="flex min-h-18.5 -mb-6 items-start justify-center gap-3 pt-2">
              <button
                id="btnSave"
                name="btnSave"
                type="button"
                onClick={handleSave}
                disabled={!perms.save}
                className={`${buttonClass} disabled:cursor-not-allowed disabled:opacity-40`}
              >
                <span className="underline underline-offset-2">S</span>ave
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
    </div>
  );
};

export default SetPostingAccountPage;