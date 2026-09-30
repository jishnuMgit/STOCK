import React, { useState } from "react";
import Select, {
  type SingleValue,
  type StylesConfig,
} from "react-select";

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

interface AccountRow {
  key: string;
  label: string;
  idPlaceholder: string;
  namePlaceholder: string;
}

interface FormValues {
  branch: string;
  [key: string]: string;
}

// ============================================================
// BRANCH OPTIONS
// ============================================================

const branchOptions: SelectOption[] = [
  { value: "branch1", label: "Branch 1" },
  { value: "branch2", label: "Branch 2" },
  { value: "branch3", label: "Branch 3" },
];

// ============================================================
// SAMPLE ACCOUNT OPTIONS
// Replace these with your actual account data.
// ============================================================

const accountOptionsByRow: Record<string, AccountOption[]> = {
  cashSupplier: [
    { id: "1001", name: "Cash Supplier Account" },
    { id: "1002", name: "Supplier Control Account" },
    { id: "1003", name: "Local Supplier Account" },
  ],

  cashCustomer: [
    { id: "2001", name: "Cash Customer Account" },
    { id: "2002", name: "Customer Control Account" },
    { id: "2003", name: "Local Customer Account" },
  ],

  stock: [
    { id: "3001", name: "Stock Account" },
    { id: "3002", name: "Inventory Account" },
    { id: "3003", name: "Closing Stock Account" },
  ],

  sales: [
    { id: "4001", name: "Sales Account" },
    { id: "4002", name: "Local Sales Account" },
    { id: "4003", name: "Export Sales Account" },
  ],

  salesReturn: [
    { id: "5001", name: "Sales Return Account" },
    { id: "5002", name: "Sales Discount Account" },
  ],

  costOfSales: [
    { id: "6001", name: "Cost Of Sales Account" },
    { id: "6002", name: "Purchase Cost Account" },
  ],

  costOfSalesReturn: [
    { id: "7001", name: "Cost Of Sales Return Account" },
    { id: "7002", name: "Purchase Return Account" },
  ],

  stockAdjustment: [
    { id: "8001", name: "Stock Adjustment Account" },
    { id: "8002", name: "Inventory Adjustment Account" },
  ],

  inputVAT: [
    { id: "9001", name: "Input VAT Account" },
    { id: "9002", name: "Input Tax Account" },
  ],

  outputVAT: [
    { id: "10001", name: "Output VAT Account" },
    { id: "10002", name: "Output Tax Account" },
  ],

  roundOff: [
    { id: "11001", name: "Round Off Account" },
    { id: "11002", name: "Rounding Difference Account" },
  ],
};

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
  branch: "",
  cashSupplierId: "",
  cashSupplierName: "",
  cashCustomerId: "",
  cashCustomerName: "",
  stockId: "",
  stockName: "",
  salesId: "",
  salesName: "",
  salesReturnId: "",
  salesReturnName: "",
  costOfSalesId: "",
  costOfSalesName: "",
  costOfSalesReturnId: "",
  costOfSalesReturnName: "",
  stockAdjustmentId: "",
  stockAdjustmentName: "",
  inputVATId: "",
  inputVATName: "",
  outputVATId: "",
  outputVATName: "",
  roundOffId: "",
  roundOffName: "",
};

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
  const [values, setValues] = useState<FormValues>({
    ...initialValues,
  });

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

  const getAccountOptions = (rowKey: string): AccountOption[] => {
    return accountOptionsByRow[rowKey] ?? [];
  };

  const getIdOptions = (rowKey: string): SelectOption[] => {
    return getAccountOptions(rowKey).map((account) => ({
      value: account.id,
      label: account.id,
    }));
  };

  const getNameOptions = (rowKey: string): SelectOption[] => {
    return getAccountOptions(rowKey).map((account) => ({
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
    const account = getAccountOptions(rowKey).find(
      (item) => item.id === (selected?.value ?? ""),
    );

    setValues((previous) => ({
      ...previous,
      [`${rowKey}Id`]: account?.id ?? "",
      [`${rowKey}Name`]: account?.name ?? "",
    }));
  };

  // ----------------------------------------------------------
  // ACCOUNT NAME CHANGE
  // ----------------------------------------------------------

  const handleAccountNameChange = (
    rowKey: string,
    selected: SingleValue<SelectOption>,
  ) => {
    const account = getAccountOptions(rowKey).find(
      (item) => item.name === (selected?.value ?? ""),
    );

    setValues((previous) => ({
      ...previous,
      [`${rowKey}Id`]: account?.id ?? "",
      [`${rowKey}Name`]: account?.name ?? "",
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

  const handleSave = () => {
    console.log("Posting account settings:", values);
    alert("Posting account settings logged to the console.");
  };

  // ----------------------------------------------------------
  // RENDER
  // ----------------------------------------------------------

  return (
    <div className="flex min-h-screen items-center justify-center bg-white p-5">
      <div className="w-[30%] min-w-[750px] max-w-[800px] bg-white p-[3px] font-sans text-[#263449]">
        <div className="w-full border border-[#d5d5d5]  bg-white">

          {/* HEADER */}
          <header className="flex h-9 shrink-0 items-center border-b border-slate-300 bg-[#a3dfc0]">
          <span className="px-5 text-[17px] font-semibold text-slate-700">
            Set Posting Account

          </span>
        </header>

          {/* FORM BODY */}
          <div className="pr-5 -ml-5 pb-[15px] pt-[14px]">

            {/* BRANCH */}
            <div className="mb-[12px] flex items-center">
              <label
                htmlFor="lkpBranch"
                className="w-[185px] shrink-0 text-right text-[11px] font-medium"
              >
                Branch :
              </label>

              <div className="ml-[8px] w-[200px]">
                <Select<SelectOption, false>
                  inputId="lkpBranch"
                  name="lkpBranch"
                  options={branchOptions}
                  value={getSelectedOption(
                    branchOptions,
                    values.branch,
                  )}
                  onChange={(selected) =>
                    handleChange("branch", selected?.value ?? "")
                  }
                  styles={selectStyles}
                  placeholder=""
                  isClearable
                  isSearchable
                />
              </div>
            </div>

            {/* CASH SUPPLIER ACCOUNT */}
            {/* CASH CUSTOMER ACCOUNT */}
<div className="mb-[7px] grid grid-cols-[185px_minmax(120px,10px)_minmax(200px,1fr)] items-center gap-x-[8px]">
  <label
    htmlFor="lkpCashCustomerAccountID"
    className="whitespace-nowrap text-right text-[11px] font-medium"
  >
    Cash Customer Account :
  </label>

  {/* ACCOUNT ID - 70% WIDTH */}
 
    <Select<SelectOption, false>
      inputId="lkpCashCustomerAccountID"
      name="lkpCashCustomerAccountID"
      options={getIdOptions("cashCustomer")}
      value={getSelectedOption(
        getIdOptions("cashCustomer"),
        values.cashCustomerId,
      )}
      onChange={(selected) =>
        handleAccountIdChange("cashCustomer", selected)
      }
      styles={selectStyles}
      placeholder=""
      isClearable
      isSearchable
    />
  

  {/* ACCOUNT NAME */}
  <Select<SelectOption, false>
    inputId="lkpCashCustomerAccountName"
    name="lkpCashCustomerAccountName"
    options={getNameOptions("cashCustomer")}
    value={getSelectedOption(
      getNameOptions("cashCustomer"),
      values.cashCustomerName,
    )}
    onChange={(selected) =>
      handleAccountNameChange("cashCustomer", selected)
    }
    styles={selectStyles}
    placeholder=""
    isClearable
    isSearchable
  />
</div>

            {/* CASH CUSTOMER ACCOUNT */}
            <div className="mb-[7px] grid grid-cols-[185px_minmax(120px,10px)_minmax(200px,1fr)] items-center gap-x-[8px]">
              <label
                htmlFor="lkpCashCustomerAccountID"
                className="whitespace-nowrap text-right text-[11px] font-medium"
              >
                Cash Customer Account :
              </label>

              <Select<SelectOption, false>
                inputId="lkpCashCustomerAccountID"
                name="lkpCashCustomerAccountID"
                options={getIdOptions("cashCustomer")}
                value={getSelectedOption(
                  getIdOptions("cashCustomer"),
                  values.cashCustomerId,
                )}
                onChange={(selected) =>
                  handleAccountIdChange("cashCustomer", selected)
                }
                styles={selectStyles}
                placeholder=""
                isClearable
                isSearchable
              />

              <Select<SelectOption, false>
                inputId="lkpCashCustomerAccountName"
                name="lkpCashCustomerAccountName"
                options={getNameOptions("cashCustomer")}
                value={getSelectedOption(
                  getNameOptions("cashCustomer"),
                  values.cashCustomerName,
                )}
                onChange={(selected) =>
                  handleAccountNameChange("cashCustomer", selected)
                }
                styles={selectStyles}
                placeholder=""
                isClearable
                isSearchable
              />
            </div>

            {/* STOCK ACCOUNT */}
            <div className="mb-[7px] grid grid-cols-[185px_minmax(120px,10px)_minmax(200px,1fr)] items-center gap-x-[8px]">
              <label
                htmlFor="lkpStockAccountID"
                className="whitespace-nowrap text-right text-[11px] font-medium"
              >
                Stock Account :
              </label>

              <Select<SelectOption, false>
                inputId="lkpStockAccountID"
                name="lkpStockAccountID"
                options={getIdOptions("stock")}
                value={getSelectedOption(
                  getIdOptions("stock"),
                  values.stockId,
                )}
                onChange={(selected) =>
                  handleAccountIdChange("stock", selected)
                }
                styles={selectStyles}
                placeholder=""
                isClearable
                isSearchable
              />

              <Select<SelectOption, false>
                inputId="lkpStockAccountName"
                name="lkpStockAccountName"
                options={getNameOptions("stock")}
                value={getSelectedOption(
                  getNameOptions("stock"),
                  values.stockName,
                )}
                onChange={(selected) =>
                  handleAccountNameChange("stock", selected)
                }
                styles={selectStyles}
                placeholder=""
                isClearable
                isSearchable
              />
            </div>

            {/* SALES ACCOUNT */}
            <div className="mb-[7px] grid grid-cols-[185px_minmax(120px,10px)_minmax(200px,1fr)] items-center gap-x-[8px]">
              <label
                htmlFor="lkpSalesAccountID"
                className="whitespace-nowrap text-right text-[11px] font-medium"
              >
                Sales Account :
              </label>

              <Select<SelectOption, false>
                inputId="lkpSalesAccountID"
                name="lkpSalesAccountID"
                options={getIdOptions("sales")}
                value={getSelectedOption(
                  getIdOptions("sales"),
                  values.salesId,
                )}
                onChange={(selected) =>
                  handleAccountIdChange("sales", selected)
                }
                styles={selectStyles}
                placeholder=""
                isClearable
                isSearchable
              />

              <Select<SelectOption, false>
                inputId="lkpSalesAccountName"
                name="lkpSalesAccountName"
                options={getNameOptions("sales")}
                value={getSelectedOption(
                  getNameOptions("sales"),
                  values.salesName,
                )}
                onChange={(selected) =>
                  handleAccountNameChange("sales", selected)
                }
                styles={selectStyles}
                placeholder=""
                isClearable
                isSearchable
              />
            </div>

            {/* SALES RETURN ACCOUNT */}
            <div className="mb-[7px] grid grid-cols-[185px_minmax(120px,10px)_minmax(200px,1fr)] items-center gap-x-[8px]">
              <label
                htmlFor="lkpSalesReturnAccountID"
                className="whitespace-nowrap text-right text-[11px] font-medium"
              >
                Sales Return Account :
              </label>

              <Select<SelectOption, false>
                inputId="lkpSalesReturnAccountID"
                name="lkpSalesReturnAccountID"
                options={getIdOptions("salesReturn")}
                value={getSelectedOption(
                  getIdOptions("salesReturn"),
                  values.salesReturnId,
                )}
                onChange={(selected) =>
                  handleAccountIdChange("salesReturn", selected)
                }
                styles={selectStyles}
                placeholder=""
                isClearable
                isSearchable
              />

              <Select<SelectOption, false>
                inputId="lkpSalesReturnAccountName"
                name="lkpSalesReturnAccountName"
                options={getNameOptions("salesReturn")}
                value={getSelectedOption(
                  getNameOptions("salesReturn"),
                  values.salesReturnName,
                )}
                onChange={(selected) =>
                  handleAccountNameChange("salesReturn", selected)
                }
                styles={selectStyles}
                placeholder=""
                isClearable
                isSearchable
              />
            </div>

            {/* COST OF SALES ACCOUNT */}
            <div className="mb-[7px] grid grid-cols-[185px_minmax(120px,10px)_minmax(200px,1fr)] items-center gap-x-[8px]">
              <label
                htmlFor="lkpCostOfSalesAccountID"
                className="whitespace-nowrap text-right text-[11px] font-medium"
              >
                Cost Of Sales Account :
              </label>

              <Select<SelectOption, false>
                inputId="lkpCostOfSalesAccountID"
                name="lkpCostOfSalesAccountID"
                options={getIdOptions("costOfSales")}
                value={getSelectedOption(
                  getIdOptions("costOfSales"),
                  values.costOfSalesId,
                )}
                onChange={(selected) =>
                  handleAccountIdChange("costOfSales", selected)
                }
                styles={selectStyles}
                placeholder=""
                isClearable
                isSearchable
              />

              <Select<SelectOption, false>
                inputId="lkpCostOfSalesAccountName"
                name="lkpCostOfSalesAccountName"
                options={getNameOptions("costOfSales")}
                value={getSelectedOption(
                  getNameOptions("costOfSales"),
                  values.costOfSalesName,
                )}
                onChange={(selected) =>
                  handleAccountNameChange("costOfSales", selected)
                }
                styles={selectStyles}
                placeholder=""
                isClearable
                isSearchable
              />
            </div>

            {/* COST OF SALES RETURN ACCOUNT */}
            <div className="mb-[7px] grid grid-cols-[185px_minmax(120px,10px)_minmax(200px,1fr)] items-center gap-x-[8px]">
              <label
                htmlFor="lkpCostOfSalesReturnAccountID"
                className="whitespace-nowrap text-right text-[11px] font-medium"
              >
                Cost Of Sales Return Account :
              </label>

              <Select<SelectOption, false>
                inputId="lkpCostOfSalesReturnAccountID"
                name="lkpCostOfSalesReturnAccountID"
                options={getIdOptions("costOfSalesReturn")}
                value={getSelectedOption(
                  getIdOptions("costOfSalesReturn"),
                  values.costOfSalesReturnId,
                )}
                onChange={(selected) =>
                  handleAccountIdChange("costOfSalesReturn", selected)
                }
                styles={selectStyles}
                placeholder=""
                isClearable
                isSearchable
              />

              <Select<SelectOption, false>
                inputId="lkpCostOfSalesReturnAccountName"
                name="lkpCostOfSalesReturnAccountName"
                options={getNameOptions("costOfSalesReturn")}
                value={getSelectedOption(
                  getNameOptions("costOfSalesReturn"),
                  values.costOfSalesReturnName,
                )}
                onChange={(selected) =>
                  handleAccountNameChange("costOfSalesReturn", selected)
                }
                styles={selectStyles}
                placeholder=""
                isClearable
                isSearchable
              />
            </div>

            {/* STOCK ADJUSTMENT ACCOUNT */}
            <div className="mb-[7px] grid grid-cols-[185px_minmax(120px,10px)_minmax(200px,1fr)] items-center gap-x-[8px]">
              <label
                htmlFor="lkpStockAdjustmentAccountID"
                className="whitespace-nowrap text-right text-[11px] font-medium"
              >
                Stock Adjustment Account :
              </label>

              <Select<SelectOption, false>
                inputId="lkpStockAdjustmentAccountID"
                name="lkpStockAdjustmentAccountID"
                options={getIdOptions("stockAdjustment")}
                value={getSelectedOption(
                  getIdOptions("stockAdjustment"),
                  values.stockAdjustmentId,
                )}
                onChange={(selected) =>
                  handleAccountIdChange("stockAdjustment", selected)
                }
                styles={selectStyles}
                placeholder=""
                isClearable
                isSearchable
              />

              <Select<SelectOption, false>
                inputId="lkpStockAdjustmentAccountName"
                name="lkpStockAdjustmentAccountName"
                options={getNameOptions("stockAdjustment")}
                value={getSelectedOption(
                  getNameOptions("stockAdjustment"),
                  values.stockAdjustmentName,
                )}
                onChange={(selected) =>
                  handleAccountNameChange("stockAdjustment", selected)
                }
                styles={selectStyles}
                placeholder=""
                isClearable
                isSearchable
              />
            </div>

            {/* INPUT VAT ACCOUNT */}
            <div className="mb-[7px] grid grid-cols-[185px_minmax(120px,10px)_minmax(200px,1fr)] items-center gap-x-[8px]">
              <label
                htmlFor="lkpInputVATAccountID"
                className="whitespace-nowrap text-right text-[11px] font-medium"
              >
                Input VAT Account :
              </label>

              <Select<SelectOption, false>
                inputId="lkpInputVATAccountID"
                name="lkpInputVATAccountID"
                options={getIdOptions("inputVAT")}
                value={getSelectedOption(
                  getIdOptions("inputVAT"),
                  values.inputVATId,
                )}
                onChange={(selected) =>
                  handleAccountIdChange("inputVAT", selected)
                }
                styles={selectStyles}
                placeholder=""
                isClearable
                isSearchable
              />

              <Select<SelectOption, false>
                inputId="lkpInputVATAccountName"
                name="lkpInputVATAccountName"
                options={getNameOptions("inputVAT")}
                value={getSelectedOption(
                  getNameOptions("inputVAT"),
                  values.inputVATName,
                )}
                onChange={(selected) =>
                  handleAccountNameChange("inputVAT", selected)
                }
                styles={selectStyles}
                placeholder=""
                isClearable
                isSearchable
              />
            </div>

            {/* OUTPUT VAT ACCOUNT */}
            <div className="mb-[7px] grid grid-cols-[185px_minmax(120px,10px)_minmax(200px,1fr)] items-center gap-x-[8px]">
              <label
                htmlFor="lkpOutputVATAccountID"
                className="whitespace-nowrap text-right text-[11px] font-medium"
              >
                Output VAT Account :
              </label>

              <Select<SelectOption, false>
                inputId="lkpOutputVATAccountID"
                name="lkpOutputVATAccountID"
                options={getIdOptions("outputVAT")}
                value={getSelectedOption(
                  getIdOptions("outputVAT"),
                  values.outputVATId,
                )}
                onChange={(selected) =>
                  handleAccountIdChange("outputVAT", selected)
                }
                styles={selectStyles}
                placeholder=""
                isClearable
                isSearchable
              />

              <Select<SelectOption, false>
                inputId="lkpOutputVATAccountName"
                name="lkpOutputVATAccountName"
                options={getNameOptions("outputVAT")}
                value={getSelectedOption(
                  getNameOptions("outputVAT"),
                  values.outputVATName,
                )}
                onChange={(selected) =>
                  handleAccountNameChange("outputVAT", selected)
                }
                styles={selectStyles}
                placeholder=""
                isClearable
                isSearchable
              />
            </div>

            {/* ROUND OFF ACCOUNT */}
            <div className="mb-[7px] grid grid-cols-[185px_minmax(120px,10px)_minmax(200px,1fr)] items-center gap-x-[8px]">
              <label
                htmlFor="lkpRoundOffAccountID"
                className="whitespace-nowrap text-right text-[11px] font-medium"
              >
                Round Off Account :
              </label>

              <Select<SelectOption, false>
                inputId="lkpRoundOffAccountID"
                name="lkpRoundOffAccountID"
                options={getIdOptions("roundOff")}
                value={getSelectedOption(
                  getIdOptions("roundOff"),
                  values.roundOffId,
                )}
                onChange={(selected) =>
                  handleAccountIdChange("roundOff", selected)
                }
                styles={selectStyles}
                placeholder=""
                isClearable
                isSearchable
              />

              <Select<SelectOption, false>
                inputId="lkpRoundOffAccountName"
                name="lkpRoundOffAccountName"
                options={getNameOptions("roundOff")}
                value={getSelectedOption(
                  getNameOptions("roundOff"),
                  values.roundOffName,
                )}
                onChange={(selected) =>
                  handleAccountNameChange("roundOff", selected)
                }
                styles={selectStyles}
                placeholder=""
                isClearable
                isSearchable
              />
            </div>

            {/* BUTTONS */}
           <div className="flex min-h-[74px] -mb-6 items-start justify-center gap-[12px] pt-[8px]">
          <button
              id="btnSave"
              name="btnSave"
              type="button"
              onClick={handleSave}
className={buttonClass}
>
              <span className="underline underline-offset-2">
                S
              </span>ave
            </button>

            {/* CLEAR */}
            <button
              id="btnClear"
              name="btnClear"
              type="button"
              onClick={handleClear}

className={buttonClass}
>
              <span className="underline underline-offset-2">
                C
              </span>lear
            </button>
        </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default SetPostingAccountPage;