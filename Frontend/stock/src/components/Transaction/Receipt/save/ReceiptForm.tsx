import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import Select, {
  components,
  type SelectInstance,
  type OptionProps,
} from "react-select";

import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";

import {
  LocalizationProvider,
} from "@mui/x-date-pickers/LocalizationProvider";

import {
  AdapterDayjs,
} from "@mui/x-date-pickers/AdapterDayjs";

import {
  DatePicker,
} from "@mui/x-date-pickers/DatePicker";

import "./commanReceipt.css";

dayjs.extend(customParseFormat);

/* =========================================================
   TYPES
========================================================= */

interface ReceiptFormProps {
  branch: string;
  setBranch: (value: string) => void;

  type: string;
  setType: (value: string) => void;

  cashBank: string;
  setCashBank: (value: string) => void;

  reference: string;
  setReference: (value: string) => void;

  receivedFrom: string;
  setReceivedFrom: (value: string) => void;

  documentNo: string;
  setDocumentNo: (value: string) => void;

  receiptDate: string;
  setReceiptDate: (value: string) => void;

  branchRef: React.RefObject<
    SelectInstance<SelectOption, false> | null
  >;

  typeRef: React.RefObject<
    SelectInstance<SelectOption, false> | null
  >;

  documentNoRef: React.RefObject<
    HTMLInputElement | null
  >;

  cashBankRef: React.RefObject<
    SelectInstance<SelectOption, false> | null
  >;

  dateRef: React.RefObject<
    HTMLInputElement | null
  >;

  receivedFromRef: React.RefObject<
    HTMLInputElement | null
  >;

  referenceRef: React.RefObject<
    HTMLInputElement | null
  >;

  focusFirstAccountId: () => void;

  branchOptions: SelectOption[];

  financialParameters: FinancialParameter[];

  isModifyMode?: boolean;

  onDocumentNoLookup?: () => void;

  preserveCashBankOnLoad?: boolean;

  documentNoEditable?: boolean;
}

/* =========================================================
   SELECT OPTION
========================================================= */

interface SelectOption {
  value: string;
  label: string;
}

/* =========================================================
   BRANCH
========================================================= */

export interface Branch {
  fbrid: string;
  fbrname: string;
}

/* =========================================================
   FINANCIAL PARAMETER
========================================================= */

export interface FinancialParameter {
  fptype: string;
  fpid: string;
  fpname: string;
  fpositionno: number;
}

/* =========================================================
   CASH / BANK ACCOUNT
========================================================= */

interface CashBankAccount {
  fcoid: string;
  faccountid: string;
  faccountgroupid?: string;
  fgph: string;
  fgcs: string;
  faccountname: string;
}

/* =========================================================
   CASH / BANK API RESPONSE
========================================================= */

interface AccountResponse {
  message?: string;
  success: boolean;
  cashorbank: string;
  data: CashBankAccount[];
}

/* =========================================================
   RECEIPT DOCUMENT NUMBER RESPONSE
========================================================= */

interface ReceiptDocNumberResponse {
  success: boolean;

  data: {
    getnextdocno: string;
  }[];

  message?: string;
}

/* =========================================================
   CUSTOM OPTION
========================================================= */

const CustomOption = (
  props: OptionProps<SelectOption, false>
) => {
  const { data } = props;

  return (
    <components.Option {...props}>
      <div className="flex w-full items-center justify-between">
        <span className="text-xs text-slate-700">
          {data.label}
        </span>

        <span className="text-[11px] text-gray-400">
          {data.value}
        </span>
      </div>
    </components.Option>
  );
};

/* =========================================================
   SEARCH FILTER
========================================================= */

const filterOption = (
  option: {
    label: string;
    value: string;
    data: SelectOption;
  },
  inputValue: string
) => {
  const search = inputValue
    .toLowerCase()
    .trim();

  if (!search) {
    return true;
  }

  return (
    option.data.label
      .toLowerCase()
      .includes(search) ||
    option.data.value
      .toLowerCase()
      .includes(search)
  );
};

/* =========================================================
   RECEIPT FORM
========================================================= */

const ReceiptForm: React.FC<ReceiptFormProps> = ({
  branch,
  setBranch,

  type,
  setType,

  cashBank,
  setCashBank,

  reference,
  setReference,

  receivedFrom,
  setReceivedFrom,

  documentNo,
  setDocumentNo,

  receiptDate,
  setReceiptDate,

  branchRef,
  typeRef,
  documentNoRef,
  cashBankRef,
  dateRef,
  receivedFromRef,
  referenceRef,

  focusFirstAccountId,

  branchOptions,

  financialParameters,

  isModifyMode = false,

  onDocumentNoLookup,

  preserveCashBankOnLoad = false,

  documentNoEditable = false,
}) => {
  /* =======================================================
     STATE
  ======================================================= */

  const [
    openSelect,
    setOpenSelect,
  ] = useState<
    "branch" | "type" | "cashBank" | null
  >(null);

  const [
    accountsLoading,
    setAccountsLoading,
  ] = useState(false);

  const [
    documentNoLoading,
    setDocumentNoLoading,
  ] = useState(false);

  const [
    cashBankAccounts,
    setCashBankAccounts,
  ] = useState<CashBankAccount[]>([]);

  /* =======================================================
     TYPE OPTIONS

     B = Bank
     C = Cash

     Display value is B / C
  ======================================================= */

  const typeOptions: SelectOption[] =
    useMemo(
      () => {
        const apiTypeOptions = financialParameters
          .filter((parameter) => parameter.fptype === "RTP")
          .sort((first, second) => first.fpositionno - second.fpositionno)
          .map((parameter) => ({
            value:parameter.fpname ,
            label: parameter.fpid,
          }));

        return apiTypeOptions.length > 0
          ? apiTypeOptions
          : [
              { value: "B", label: "B" },
              { value: "C", label: "C" },
            ];
      },
      [financialParameters]
    );

  /* =======================================================
     GET RECEIPT DOCUMENT NUMBER

     B -> BR
     C -> CR
  ======================================================= */

  const getReceiptDocNumber = async (
    fbrid: string,
    typeId: string
  ) => {
    if (!fbrid) {
      setDocumentNo("");
      return;
    }

    /*
      Convert UI Type to document type

      B -> BR
      C -> CR
    */

    const documentType =
      typeId === "C"
        ? "CR"
        : "BR";

    try {
      setDocumentNoLoading(true);

      console.log(
        "Getting receipt number:",
        {
          fbrid,
          typeId,
          documentType,
        }
      );

      const response =
        await fetch(
          "http://localhost:5000/api/getReceiptDocNumber",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              fbrid,

              /*
                API receives:

                B -> BR
                C -> CR
              */

              fptype: documentType,
            }),
          }
        );

      if (!response.ok) {
        throw new Error(
          `HTTP Error: ${response.status}`
        );
      }

      const result =
        (await response.json()) as ReceiptDocNumberResponse;

      console.log(
        "Receipt Document Number Response:",
        result
      );

      if (
        result.success &&
        Array.isArray(result.data) &&
        result.data.length > 0
      ) {
        const newDocumentNo =
          result.data[0]?.getnextdocno;

        console.log(
          "New Receipt Number:",
          newDocumentNo
        );

        setDocumentNo(
          newDocumentNo || ""
        );
      } else {
        console.error(
          "Receipt number was not returned:",
          result
        );

        setDocumentNo("");
      }
    } catch (error) {
      console.error(
        "Receipt Document Number API Error:",
        error
      );

      setDocumentNo("");
    } finally {
      setDocumentNoLoading(false);
    }
  };

  /* =======================================================
     LOAD CASH / BANK ACCOUNTS

     B = Bank
     C = Cash
  ======================================================= */

  const loadAccounts = async (
    cashorbank: string
  ) => {
    const cashBankType =
      financialParameters.find(
        (parameter) =>
          parameter.fpid === cashorbank ||
          parameter.fpname === cashorbank
      )?.fpid || cashorbank;

    console.log(
      "Loading Cash/Bank accounts for:",
      cashBankType
    );

    if (
      cashBankType !== "B" &&
      cashBankType !== "C"
    ) {
      console.warn(
        "Invalid Cash/Bank value:",
        cashBankType
      );

      setCashBankAccounts([]);
      if (!preserveCashBankOnLoad) {
        setCashBank("");
      }

      return;
    }

    try {
      setAccountsLoading(true);

      const response =
        await fetch(
          "http://localhost:5000/api/getReceiptCashORBank",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              cashorbank: cashBankType,
            }),
          }
        );

      if (!response.ok) {
        throw new Error(
          `HTTP Error: ${response.status}`
        );
      }

      const result =
        (await response.json()) as AccountResponse;

      console.log(
        "Cash/Bank API Response:",
        result
      );

      if (
        result.success &&
        Array.isArray(result.data)
      ) {
        setCashBankAccounts(
          result.data
        );

        /*
          Don't automatically select
          an account.

          The dropdown will contain
          all B/C accounts.
        */

        if (!preserveCashBankOnLoad) {
          setCashBank("");
        }
      } else {
        console.error(
          "Cash/Bank accounts not returned:",
          result
        );

        setCashBankAccounts([]);
        if (!preserveCashBankOnLoad) {
          setCashBank("");
        }
      }
    } catch (error) {
      console.error(
        "Cash/Bank Account API Error:",
        error
      );

      setCashBankAccounts([]);
      if (!preserveCashBankOnLoad) {
        setCashBank("");
      }
    } finally {
      setAccountsLoading(false);
    }
  };

  /* =======================================================
     DEFAULT INITIALIZATION

     Default Type = B

     Load B accounts automatically.
  ======================================================= */

  useEffect(() => {
    /*
      If parent hasn't supplied a type,
      make B the default.
    */

    const defaultType =
      type || "B";

    if (!type) {
      setType("B");
    }

    /*
      If branch is already available,
      load receipt number.

      B -> BR
      C -> CR
    */

    if (branch && !isModifyMode) {
      getReceiptDocNumber(
        branch,
        defaultType
      );
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const defaultType =
      financialParameters.find(
        (parameter) =>
          parameter.fptype === "RTP" &&
          (parameter.fpid === type || parameter.fpname === type)
      )?.fpid ||
      financialParameters.find(
        (parameter) => parameter.fptype === "RTP"
      )?.fpid ||
      type ||
      "B";

    if (type !== defaultType) {
      setType(defaultType);
    }

    loadAccounts(defaultType);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [financialParameters]);

  /* =======================================================
     BRANCH CHANGE

     Reload document number when branch changes.

     B -> BR
     C -> CR
  ======================================================= */

  useEffect(() => {
    if (!branch) {
      if (!isModifyMode) {
        setDocumentNo("");
      }
      return;
    }

    const currentType =
      type || "B";

    if (!isModifyMode) {
      getReceiptDocNumber(
        branch,
        currentType
      );
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branch, isModifyMode]);

  useEffect(() => {
    if (isModifyMode) {
      loadAccounts(type );
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isModifyMode, type]);

  /* =======================================================
     SELECT ENTER HANDLER
  ======================================================= */

  const handleSelectKeyDown = (
    event: React.KeyboardEvent,
    selectName:
      | "branch"
      | "type"
      | "cashBank",
    focusNext: () => void
  ) => {
    if (event.key !== "Enter") {
      return;
    }

    /*
      If menu is open, allow react-select
      to select the highlighted option.
    */

    if (
      openSelect === selectName
    ) {
      return;
    }

    event.preventDefault();

    focusNext();
  };

  /* =======================================================
     INPUT ENTER HANDLER
  ======================================================= */

  const handleInputKeyDown = (
    event: Pick<
      React.KeyboardEvent,
      "key" | "preventDefault"
    >,
    focusNext: () => void
  ) => {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();

    focusNext();
  };

  /* =======================================================
     INPUT STYLE
  ======================================================= */

  const inputClass =
    "h-7 rounded border border-[#d7dee7] bg-white px-2 text-xs text-slate-700 outline-none focus:border-[#9fdfbc] focus:ring-1 focus:ring-[#9fdfbc]";

  /* =======================================================
     SELECT STYLE
  ======================================================= */

  const selectStyles = {
    control: (base: any) => ({
      ...base,

      minHeight: "28px",
      height: "28px",

      borderColor:
        "#d7dee7",

      borderRadius:
        "4px",

      boxShadow:
        "none",

      fontSize:
        "12px",

      cursor:
        "text",

      "&:hover": {
        borderColor:
          "#9fdfbc",
      },
    }),

    valueContainer: (
      base: any
    ) => ({
      ...base,

      height: "28px",

      padding: "0 8px",
    }),

    singleValue: (
      base: any
    ) => ({
      ...base,

      color: "#344054",

      fontSize: "12px",
    }),

    placeholder: (
      base: any
    ) => ({
      ...base,

      color: "#808080",

      fontSize: "12px",
    }),

    input: (
      base: any
    ) => ({
      ...base,

      margin: 0,

      padding: 0,

      fontSize: "12px",

      color: "#344054",
    }),

    indicatorsContainer: (
      base: any
    ) => ({
      ...base,

      height: "28px",
    }),

    dropdownIndicator: (
      base: any
    ) => ({
      ...base,

      color: "#aeb8c2",

      padding: "4px",

      "&:hover": {
        color: "#808080",
      },
    }),

    indicatorSeparator: () => ({
      display: "none",
    }),

    clearIndicator: (
      base: any
    ) => ({
      ...base,

      color: "#aeb8c2",

      padding: "4px",

      "&:hover": {
        color: "#808080",
      },
    }),

    menu: (
      base: any
    ) => ({
      ...base,

      fontSize: "12px",

      zIndex: 100,

      marginTop: "2px",

      borderRadius: "4px",

      overflow: "hidden",
    }),

    menuList: (
      base: any
    ) => ({
      ...base,

      padding: "3px 0",

      maxHeight: "200px",

      overflowY: "auto",
    }),

    option: (
      base: any,
      state: any
    ) => ({
      ...base,

      fontSize: "12px",

      cursor: "pointer",

      backgroundColor:
        state.isSelected
          ? "#eefbf4"
          : state.isFocused
          ? "#eefbf4"
          : "#ffffff",

      color: "#344054",

      padding: "7px 10px",

      "&:active": {
        backgroundColor:
          "#dff5e9",
      },
    }),
  };

  /* =======================================================
     CASH / BANK OPTIONS
  ======================================================= */

  const cashBankOptions:
    SelectOption[] =
    useMemo(
      () =>
        cashBankAccounts.map(
          (account) => ({
            value:
              account.faccountid,

            label:
              account.faccountname,
          })
        ),

      [cashBankAccounts]
    );

  /* =======================================================
     SELECTED BRANCH
  ======================================================= */

  const selectedBranch =
    branchOptions.find(
      (option) =>
        option.value === branch
    ) || null;

  /* =======================================================
     SELECTED TYPE

     Default = B
  ======================================================= */

  const selectedType =
    typeOptions.find(
      (option) =>
        option.label === (type || "B") ||
        option.value === (type || "B")
    ) || null;

  /* =======================================================
     SELECTED CASH / BANK
  ======================================================= */

  const selectedCashBank =
    cashBankOptions.find(
      (option) =>
        option.value === cashBank
    ) || null;

  /* =======================================================
     RETURN
  ======================================================= */

  return (
    <div className="px-5 pt-3 pb-2">

      {/* ==================================================
          ROW 1
      ================================================== */}

      <div className="mb-2 flex items-center justify-between gap-8">

        {/* =========================
            BRANCH
        ========================= */}

        <div className="flex items-center gap-2">

          <label className="w-22.5 text-right text-xs whitespace-nowrap">
            Branch :
          </label>

          <Select<SelectOption, false>
            ref={branchRef}
            id="ddlBranch"
            value={
              selectedBranch
            }

            onKeyDown={(event) =>
              handleSelectKeyDown(
                event,
                "branch",
                () =>
                  typeRef.current?.focus()
              )
            }

            onMenuOpen={() =>
              setOpenSelect(
                "branch"
              )
            }

            onMenuClose={() =>
              setOpenSelect(
                null
              )
            }

            onChange={(option) => {
              const selectedBranch =
                option?.value || "";

              console.log(
                "Selected Branch:",
                selectedBranch
              );

              setBranch(
                selectedBranch
              );

              /*
                Use current type.

                B -> BR
                C -> CR
              */

              if (!isModifyMode) {
                getReceiptDocNumber(
                  selectedBranch,
                  type || "B"
                );
              }
            }}

            options={
              branchOptions
            }

            placeholder="Select Branch"

            components={{
              Option:
                CustomOption,
            }}

            filterOption={
              filterOption
            }

            styles={{
              ...selectStyles,

              control: (
                base: any
              ) => ({
                ...base,

                minHeight:
                  "28px",

                height:
                  "28px",

                width:
                  "200px",

                borderColor:
                  "#d7dee7",

                borderRadius:
                  "4px",

                boxShadow:
                  "none",

                fontSize:
                  "12px",

                cursor:
                  "text",

                "&:hover": {
                  borderColor:
                    "#9fdfbc",
                },
              }),
            }}

            isSearchable

            isClearable={false}

            noOptionsMessage={() =>
              "No Branch Found"
            }
          />

        </div>

        {/* =========================
            TYPE
        ========================= */}

        <div className="flex items-center gap-2">

          <label className="text-right text-xs whitespace-nowrap">
            Type :
          </label>

          <Select<SelectOption, false>
            ref={typeRef}

            inputId="ddlType"

            value={
              selectedType
            }

            onKeyDown={(event) =>
              handleSelectKeyDown(
                event,
                "type",
                () =>
                  documentNoRef.current?.focus()
              )
            }

            onMenuOpen={() =>
              setOpenSelect(
                "type"
              )
            }

            onMenuClose={() =>
              setOpenSelect(
                null
              )
            }

            onChange={(option) => {
              const selectedType =
                option?.label || option?.value || "B";

              console.log(
                "Selected Type:",
                selectedType
              );

              /*
                Update parent Type.

                B = Bank
                C = Cash
              */

              setType(
                selectedType
              );

              /*
                Reload Cash/Bank accounts.
              */

              loadAccounts(
                selectedType
              );

              /*
                Reload document number.

                B -> BR
                C -> CR
              */

              if (branch && !isModifyMode) {
                getReceiptDocNumber(
                  branch,
                  selectedType
                );
              }
            }}

            options={
              typeOptions
            }

            placeholder="Select"

            components={{
              Option:
                CustomOption,
            }}

            filterOption={
              filterOption
            }

            styles={{
              ...selectStyles,

              control: (
                base: any
              ) => ({
                ...base,

                minHeight:
                  "28px",

                height:
                  "28px",

                width:
                  "70px",

                borderColor:
                  "#d7dee7",

                borderRadius:
                  "4px",

                boxShadow:
                  "none",

                fontSize:
                  "12px",

                cursor:
                  "text",

                "&:hover": {
                  borderColor:
                    "#9fdfbc",
                },
              }),
            }}

            isSearchable

            isClearable={false}

            noOptionsMessage={() =>
              "No Type Found"
            }
          />

        </div>

        {/* =========================
            RECEIPT NUMBER
        ========================= */}

        <div className="flex items-center gap-2">

          <label className="text-right text-xs whitespace-nowrap">
            Receipt No. :
          </label>

          <input

          id="txtReceiptNo"
            ref={
              documentNoRef
            }

            value={
              documentNoLoading
                ? "Loading..."
                : documentNo
            }

            readOnly={!documentNoEditable}

            onChange={(event) => {
              if (documentNoEditable) {
                setDocumentNo(event.target.value);
              }
            }}

            onBlur={() => {
              if (documentNoEditable) {
                onDocumentNoLookup?.();
              }
            }}

            onKeyDown={(event) => {
              if (
                documentNoEditable &&
                event.key === "Enter"
              ) {
                event.preventDefault();
                onDocumentNoLookup?.();
                cashBankRef.current?.focus();
                return;
              }

              handleInputKeyDown(
                event,
                () =>
                  cashBankRef.current?.focus()
              );
            }}

            className={`${inputClass} w-37.5`}
          />

        </div>

      </div>

      {/* ==================================================
          ROW 2
      ================================================== */}

      <div className="mb-2 flex items-center justify-between gap-8">

        {/* =========================
            CASH / BANK
        ========================= */}

        <div className="flex items-center gap-2">

          <label className="w-22.5 text-right text-xs whitespace-nowrap">
            Cash/Bank :
          </label>

          <Select<SelectOption, false>
            ref={
              cashBankRef
            }
             id="lkpCBAccount"
            value={
              selectedCashBank
            }

            onKeyDown={(event) =>
              handleSelectKeyDown(
                event,
                "cashBank",
                () =>
                  dateRef.current?.focus()
              )
            }

            onMenuOpen={() =>
              setOpenSelect(
                "cashBank"
              )
            }

            onMenuClose={() =>
              setOpenSelect(
                null
              )
            }

            onChange={(option) => {
              const selectedCashBank =
                option?.value || "";

              console.log(
                "Selected Cash/Bank:",
                selectedCashBank
              );

              setCashBank(
                selectedCashBank
              );
            }}

            options={
              cashBankOptions
            }

            placeholder={
              accountsLoading
                ? "Loading..."
                : "Select"
            }

            components={{
              Option:
                CustomOption,
            }}

            filterOption={
              filterOption
            }

            styles={{
              ...selectStyles,

              control: (
                base: any
              ) => ({
                ...base,

                minHeight:
                  "28px",

                height:
                  "28px",

                width:
                  "400px",

                borderColor:
                  "#d7dee7",

                borderRadius:
                  "4px",

                boxShadow:
                  "none",

                fontSize:
                  "12px",

                cursor:
                  "text",

                "&:hover": {
                  borderColor:
                    "#9fdfbc",
                },
              }),
            }}

            isSearchable

            isClearable={false}

            isDisabled={
              accountsLoading ||
              cashBankOptions.length ===
                0
            }

            noOptionsMessage={() =>
              "No Cash/Bank Found"
            }
          />

        </div>

        {/* =========================
            DATE
        ========================= */}

        <div className="flex items-center gap-2">

          <label className="text-right text-xs whitespace-nowrap">
            Date :
          </label>

          <LocalizationProvider
            dateAdapter={AdapterDayjs}
          >
            <DatePicker
              value={
                receiptDate
                  ? dayjs(
                      receiptDate,
                      "DD/MM/YYYY"
                    )
                  : null
              }

              onChange={(newValue) => {
                if (
                  newValue?.isValid()
                ) {
                  setReceiptDate(
                    newValue.format(
                      "DD/MM/YYYY"
                    )
                  );
                } else {
                  setReceiptDate("");
                }
              }}

              format="DD/MM/YYYY"

              inputRef={dateRef}

              slotProps={{
                textField: {
                  id: "dtpDate",
                  onKeyDown: (
                    event
                  ) =>
                    handleInputKeyDown(
                      event,
                      () =>
                        receivedFromRef.current?.focus()
                    ),
                },
                openPickerButton: {
                  sx: {
                    padding: "2px",
                    margin: 0,
                  },
                },

                inputAdornment: {
                  sx: {
                    margin: 0,
                    padding: 0,
                  },
                },
              }}

              sx={{
                width: "150px",

                "& .MuiPickersTextField-root":
                  {
                    width: "150px",
                  },

                "& .MuiPickersInputBase-root":
                  {
                    width: "150px",

                    height: "28px",

                    minHeight: "28px",

                    boxSizing:
                      "border-box",

                    borderRadius:
                      "4px",

                    backgroundColor:
                      "#ffffff",

                    fontSize: "12px",

                    padding: 0,

                    overflow: "hidden",
                  },

                "& .MuiPickersInputBase-sectionContainer":
                  {
                    minWidth: 0,

                    padding:
                      "0 0 0 8px",

                    overflow: "hidden",
                  },

                "& .MuiPickersInputBase-input":
                  {
                    minWidth: 0,

                    width: "100%",

                    fontSize: "12px",

                    padding: 0,

                    height: "28px",

                    boxSizing:
                      "border-box",
                  },

                "& .MuiInputAdornment-root":
                  {
                    margin: 0,
                    padding: 0,
                  },

                "& .MuiIconButton-root":
                  {
                    width: "24px",

                    height: "24px",

                    padding: "2px",

                    margin: 0,
                  },

                "& .MuiSvgIcon-root":
                  {
                    fontSize: "16px",
                  },

                "& .MuiPickersOutlinedInput-notchedOutline":
                  {
                    borderColor:
                      "#d7dee7",
                  },

                "& .MuiPickersInputBase-root:hover .MuiPickersOutlinedInput-notchedOutline":
                  {
                    borderColor:
                      "#9fdfbc",
                  },

                "& .MuiPickersInputBase-root.Mui-focused .MuiPickersOutlinedInput-notchedOutline":
                  {
                    borderColor:
                      "#9fdfbc",

                    borderWidth: "1px",
                  },
              }}
            />
          </LocalizationProvider>

        </div>

      </div>

      {/* ==================================================
          ROW 3
      ================================================== */}

      <div className="flex items-center justify-between gap-8">

        {/* =========================
            RECEIVED FROM
        ========================= */}

        <div className="flex items-center gap-2">

          <label className="w-22.5 text-right text-xs whitespace-nowrap">
            Received From :
          </label>

          <input
            ref={
              receivedFromRef
            }
            id="txtReceivedFromPaidTo"
            value={
              receivedFrom
            }

            onChange={(event) =>
              setReceivedFrom(
                event.target.value
              )
            }

            onKeyDown={(event) =>
              handleInputKeyDown(
                event,
                () =>
                  referenceRef.current?.focus()
              )
            }

            className={`${inputClass} w-100`}
          />

        </div>

        {/* =========================
            REFERENCE
        ========================= */}

        <div className="flex items-center gap-2">

          <label className="text-right text-xs whitespace-nowrap">
            Reference :
          </label>

          <input
            ref={
              referenceRef
            }
            id="txtRefNo"

            value={
              reference
            }

            onChange={(event) =>
              setReference(
                event.target.value
              )
            }

            onKeyDown={(event) =>
              handleInputKeyDown(
                event,
                focusFirstAccountId
              )
            }

            className={`${inputClass} w-50`}
          />

        </div>

      </div>

    </div>
  );
};

export default ReceiptForm;