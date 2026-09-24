import React, {
  memo,
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";

import { Link } from "react-router-dom";

import { FaEye } from "react-icons/fa";

import Select, {
  components,
  type SingleValue,
  type SingleValueProps,
  type DropdownIndicatorProps,
  type OptionProps,
  type MenuListProps,
  type SelectInstance,
} from "react-select";

import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";

import {
  LocalizationProvider,
} from "@mui/x-date-pickers/LocalizationProvider";

import {
  DatePicker,
} from "@mui/x-date-pickers/DatePicker";

import { selectStyles, accountDropdownStyles, BranchOption, BranchMenuList, TypeOption, TypeMenuList ,BankCashMenuList, BankCashOption} from "./ReactSelectStyles";

import "./commanReceipt.css";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { toast } from "react-toastify";

dayjs.extend(customParseFormat);

/* =========================================================
   COMMON TYPES
========================================================= */

import  {type SelectOption,type ReceiptDocNumberResponse,
  type AccountResponse,type CustomerDivision,type FinancialParameter,
  type CostCenter,  type ReceiptRow,type AccountData,type CbAccount,
  type AccountOption ,type AccountOptionProps} from '../../../../types/receiptypes';


export type TableField =
  | "accountId"
  | "accountName"
  | "division"
  | "ccId"
  | "creditAmount"
  | "match"
  | "view";

export type SortField =
  | "accountId"
  | "accountName";

/* =========================================================
   =========================================================
   RECEIPT HEADER
   =========================================================
========================================================= */

export const ReceiptHeader: React.FC = () => {
  return (
    <header
      className="
        flex
        h-6.5
        items-center
        justify-center
        bg-[#9fdfbc]
        text-[18px]
        font-bold
        text-slate-700
      "
    >
      Receipt
    </header>
  );
};

/* =========================================================
   =========================================================
   RECEIPT FORM
   =========================================================
========================================================= */

interface ReceiptFormProps {
  lkpBranch: string;
  setLkpBranch: (value: string) => void;

  lkpType: string;
  setLkpType: (value: string) => void;

  cbAccount: string;
  setCbAccount: (value: string) => void;

  reference: string;
  setReference: (value: string) => void;

  receivedFrom: string;
  setReceivedFrom: (value: string) => void;

  documentNo: string;
  setDocumentNo: (value: string) => void;

  date: string;
  setDate: (value: string) => void;

  branchRef: React.RefObject<
    SelectInstance<SelectOption, false> | null
  >;

  typeRef: React.RefObject<
    SelectInstance<SelectOption, false> | null
  >;

  documentNoRef: React.RefObject<HTMLInputElement | null>;

  cbAccountRef: React.RefObject<
    SelectInstance<SelectOption, false> | null
  >;

  dateRef: React.RefObject<HTMLInputElement | null>;

  receivedFromRef: React.RefObject<HTMLInputElement | null>;

  referenceRef: React.RefObject<HTMLInputElement | null>;

  focusFirstAccountId: () => void;

  branchOptions: SelectOption[];

  financialParameters: FinancialParameter[];

  isModifyMode?: boolean;

  txtDocNo?: () => void;

  preserveCbAccountOnLoad?: boolean;

  documentNoEditable?: boolean;

  focusReceiptNoAfterClear?: number;
}


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

const filterOption = (
  option: {
    label: string;
    value: string;
    data: SelectOption;
  },
  inputValue: string
) => {
  const search = inputValue.toLowerCase().trim();

  if (!search) {
    return true;
  }

  return (
    option.data.label.toLowerCase().includes(search) ||
    option.data.value.toLowerCase().includes(search)
  );
};

export const ReceiptForm: React.FC<ReceiptFormProps> = ({
  lkpBranch,
  setLkpBranch,
  lkpType,
  setLkpType,

  cbAccount,
  setCbAccount,

  reference,
  setReference,

  receivedFrom,
  setReceivedFrom,

  documentNo,
  setDocumentNo,

  date,
  setDate,

  branchRef,
  typeRef,
  documentNoRef,
  cbAccountRef,
  dateRef,
  receivedFromRef,
  referenceRef,

  focusFirstAccountId,

  branchOptions,

  financialParameters,

  isModifyMode = false,

  txtDocNo,

  preserveCbAccountOnLoad = false,

  documentNoEditable = false,

  focusReceiptNoAfterClear = 0,
  
}) => {
  const [openSelect, setOpenSelect] = useState<
    "branch" | "type" | "cbAccount" | null
  >(null);

  /*
   * =========================================================
   * BRANCH FOCUS CONTROL
   * =========================================================
   *
   * When keyboard navigation moves to Branch, Branch gets focus.
   *
   * If Branch value changes immediately after that, React Select
   * can lose its internal input focus because the controlled
   * `value` changes and the component re-renders.
   *
   * This ref tells us:
   *
   * "Branch was focused by keyboard navigation and should keep
   * focus when its value changes."
   *
   * It is reset when Enter moves from Branch -> Type.
   */
  const keepBranchFocus = useRef(false);

  /*
   * This function is used when keyboard navigation moves TO
   * the Branch select.
   */
  const focusBranch = useCallback(() => {
    keepBranchFocus.current = true;

    requestAnimationFrame(() => {
      branchRef.current?.focus();
    });
  }, [branchRef]);

  /*
   * =========================================================
   * CASH / BANK FOCUS CONTROL
   * =========================================================
   *
   * Same problem as Branch, but worse: the Cash/Bank select is
   * also `isDisabled` while its options are loading
   * (accountsLoading === true). A disabled control cannot hold
   * DOM focus, so the moment loadAccounts() fires after the user
   * tabs/enters into this field, the browser forcibly blurs it -
   * even though we already called cbAccountRef.current?.focus().
   *
   * This ref tells us:
   *
   * "The user intentionally navigated to Cash/Bank and, once it
   * becomes enabled again (loading finished), focus should be
   * restored to it."
   *
   * It is cleared as soon as the user leaves the field (Enter/Tab)
   * or picks a value.
   */
  const keepCbAccountFocus = useRef(false);

  const [accountsLoading, setAccountsLoading] =
    useState(false);

  const [documentNoLoading, setDocumentNoLoading] =
    useState(false);

useEffect(() => {
  if (focusReceiptNoAfterClear === 0) return;
  if (documentNoLoading) return;

  // IMPORTANT:
  // We are intentionally focusing Receipt No now.
  // Do not allow the old Cash/Bank focus request
  // to steal focus.
  keepCbAccountFocus.current = false;

  const focusReceiptNo = () => {
    const input = documentNoRef.current;

    if (!input) return;

    input.focus();

    const position = input.value.length;

    input.setSelectionRange(
      position,
      position
    );
  };

  const frame = requestAnimationFrame(() => {
    focusReceiptNo();

    setTimeout(() => {
      focusReceiptNo();
    }, 100);
  });

  return () => {
    cancelAnimationFrame(frame);
  };
}, [
  focusReceiptNoAfterClear,
  documentNoLoading,
]);

  const [docnolen, setdocnolen] =
    useState<number>(0);

  const [cbAccounts, setCbAccounts] =
    useState<CbAccount[]>([]);

  /*
   * =========================================================
   * TYPE OPTIONS
   * =========================================================
   */
  const typeOptions: SelectOption[] = useMemo(() => {
    const apiTypeOptions = financialParameters
      .filter(
        (parameter) =>
          parameter.fptype === "RTP"
      )
      .sort(
        (first, second) =>
          first.fpositionno -
          second.fpositionno
      )
      .map((parameter) => ({
        value: parameter.fpname,
        label: parameter.fpid,
      }));

    return apiTypeOptions.length > 0
      ? apiTypeOptions
      : [
          {
            value: "Bank",
            label: "B",
          },
          {
            value: "Cash",
            label: "C",
          },
        ];
  }, [financialParameters]);

  /*
   * =========================================================
   * GET RECEIPT DOCUMENT NUMBER
   * =========================================================
   */
  const getReceiptDocNumber = async (
    fbrid: string,
    typeId: string
  ) => {
    if (!fbrid) {
      setDocumentNo("");
      return;
    }

    const documentType =
      typeId === "C"        ? "CR"
        : "BR";

    try {
      setDocumentNoLoading(true);

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/Receipt/getDocNo`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            fbrid,
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

      if (
        result.success &&
        Array.isArray(result.data) &&
        result.data.length > 0
      ) {
        const docData =
          result.data[0];

        setDocumentNo(
          docData?.fdocno || ""
        );

        setdocnolen(
          Number(docData?.fdocnolen) || 0
        );
      } else {
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

  /*
   * =========================================================
   * LOAD CASH / BANK ACCOUNTS
   * =========================================================
   */
  const loadAccounts = async (
    requestedCbType: string
  ) => {
    const cbType =
      financialParameters.find(
        (parameter) =>
          parameter.fpid ===
            requestedCbType ||
          parameter.fpname ===
            requestedCbType
      )?.fpid ||
      requestedCbType;

    if (
      cbType !== "B" &&
      cbType !== "C"
    ) {
      setCbAccounts([]);

      if (
        !preserveCbAccountOnLoad
      ) {
        setCbAccount("");
      }

      return;
    }

    try {
      setAccountsLoading(true);

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/Receipt/getReceiptType`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
             lkpType:cbType,
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

      if (
        result.success &&
        Array.isArray(result.data)
      ) {
        setCbAccounts(result.data);

        if (
          !preserveCbAccountOnLoad
        ) {
          setCbAccount("");
        }
      } else {
        setCbAccounts([]);

        if (
          !preserveCbAccountOnLoad
        ) {
          setCbAccount("");
        }
      }
    } catch (error) {
      console.error(
        "Cash/Bank Account API Error:",
        error
      );

      setCbAccounts([]);

      if (
        !preserveCbAccountOnLoad
      ) {
        setCbAccount("");
      }
    } finally {
      setAccountsLoading(false);
    }
  };

  /*
   * =========================================================
   * INITIAL LOAD
   * =========================================================
   */
  useEffect(() => {
    const defaultType =
      lkpType || "B";

    if (!lkpType) {
      setLkpType("B");
    }

    if (
      lkpBranch &&
      !isModifyMode
    ) {
      getReceiptDocNumber(
        lkpBranch,
        defaultType
      );
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /*
   * =========================================================
   * FINANCIAL PARAMETERS
   * =========================================================
   */
  useEffect(() => {
    const defaultType =
      financialParameters.find(
        (parameter) =>
          parameter.fptype === "RTP" &&
          (
            parameter.fpid === lkpType ||
            parameter.fpname === lkpType
          )
      )?.fpid ||
      financialParameters.find(
        (parameter) =>
          parameter.fptype === "RTP"
      )?.fpid ||
      lkpType ||
      "B";

    if (lkpType !== defaultType) {
      setLkpType(defaultType);
    }

    loadAccounts(defaultType);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [financialParameters]);

  /*
   * =========================================================
   * lkpBranch CHANGE
   * =========================================================
   */
  useEffect(() => {
    if (!lkpBranch) {
      if (!isModifyMode) {
        setDocumentNo("");
      }

      return;
    }

    const currentType =
      lkpType || "B";

    if (!isModifyMode) {
      getReceiptDocNumber(
        lkpBranch,
        currentType
      );
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lkpBranch, isModifyMode]);

  /*
   * =========================================================
   * MODIFY MODE
   * =========================================================
   */
  useEffect(() => {
    if (isModifyMode) {
      loadAccounts(lkpType);
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isModifyMode, lkpType]);

  /*
   * =========================================================
   * ENTER NAVIGATION FOR SELECT
   * =========================================================
   */
  const handleSelectKeyDown = (
    event: React.KeyboardEvent,
    selectName:
      | "branch"
      | "type"
      | "cbAccount",
    focusNext: () => void
  ) => {
    if (event.key !== "Enter") {
      return;
    }

    /*
     * If dropdown is currently open, allow react-select
     * to handle Enter and select the highlighted option.
     */
    if (openSelect === selectName) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    /*
     * VERY IMPORTANT:
     *
     * We are leaving Branch now.
     * Therefore Branch should no longer be refocused
     * after its value changes.
     */
    if (selectName === "branch") {
      keepBranchFocus.current = false;
    }

    /*
     * We are leaving Cash/Bank now.
     * Therefore Cash/Bank should no longer be refocused
     * after its loading state changes.
     */
    if (selectName === "cbAccount") {
      keepCbAccountFocus.current = false;
    }

    /*
     * Wait until the current React Select keyboard event
     * has finished before moving focus.
     */
    requestAnimationFrame(() => {
      focusNext();
    });
  };

  /*
   * =========================================================
   * NORMAL INPUT ENTER NAVIGATION
   * =========================================================
   */
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

  const inputClass =
    "h-7 rounded border border-[#d7dee7] bg-white px-2 text-xs text-slate-700 outline-none focus:border-[#9fdfbc] focus:ring-1 focus:ring-[#9fdfbc]";

  /*
   * =========================================================
   * SELECT STYLES
   * =========================================================
   */
  const selectStylesLocal = {
    control: (base: any) => ({
      ...base,
      minHeight: "28px",
      height: "28px",
      borderColor: "#d7dee7",
      borderRadius: "4px",
      boxShadow: "none",
      fontSize: "12px",
      cursor: "text",

      "&:hover": {
        borderColor: "#9fdfbc",
      },
    }),

    valueContainer: (base: any) => ({
      ...base,
      height: "28px",
      padding: "0 8px",
    }),

    singleValue: (base: any) => ({
      ...base,
      color: "#344054",
      fontSize: "12px",
    }),

    placeholder: (base: any) => ({
      ...base,
      color: "#808080",
      fontSize: "12px",
    }),

    input: (base: any) => ({
      ...base,
      margin: 0,
      padding: 0,
      fontSize: "12px",
      color: "#344054",
    }),

    indicatorsContainer: (base: any) => ({
      ...base,
      height: "28px",
    }),

    dropdownIndicator: (base: any) => ({
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

    clearIndicator: (base: any) => ({
      ...base,
      color: "#aeb8c2",
      padding: "4px",

      "&:hover": {
        color: "#808080",
      },
    }),

    menu: (base: any) => ({
      ...base,
      fontSize: "12px",
      zIndex: 100,
      marginTop: "2px",
      borderRadius: "4px",
      overflow: "hidden",
    }),

    menuList: (base: any) => ({
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
        state.isSelected ||
        state.isFocused
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

  /*
   * =========================================================
   * CASH / BANK OPTIONS
   * =========================================================
   */
  const cbAccountOptions: SelectOption[] =
    useMemo(
      () =>
        cbAccounts.map(
          (account) => ({
            value:
              account.faccountid,
            label:
              account.faccountname,
          })
        ),
      [cbAccounts]
    );

  /*
   * =========================================================
   * SELECTED VALUES
   * =========================================================
   */
  const selectedBranch =
    branchOptions.find(
      (option) =>
        option.value === lkpBranch
    ) || null;

  const selectedType =
    typeOptions.find(
      (option) =>
        option.label ===
          (lkpType || "B") ||
        option.value ===
          (lkpType || "B")
    ) || null;

  const selectedCbAccount =
    cbAccountOptions.find(
      (option) =>
        option.value === cbAccount
    ) || null;

  /*
   * =========================================================
   * IMPORTANT BRANCH FOCUS FIX
   * =========================================================
   *
   * This MUST be AFTER selectedBranch is declared.
   *
   * When Branch gets focus and its value is updated,
   * React Select can temporarily lose focus.
   *
   * We restore focus only if keyboard navigation told us
   * to keep Branch focused.
   */
  useEffect(() => {
    if (!keepBranchFocus.current) {
      return;
    }

    if (!selectedBranch) {
      return;
    }

    requestAnimationFrame(() => {
      if (!keepBranchFocus.current) {
        return;
      }

      branchRef.current?.focus();
    });
  }, [selectedBranch]);

  /*
   * =========================================================
   * IMPORTANT CASH / BANK FOCUS FIX
   * =========================================================
   *
   * The Cash/Bank select is `isDisabled` while
   * `accountsLoading` is true. A disabled control can't hold
   * DOM focus, so when the user navigates here (Enter from
   * Receipt No, or Tab) and a reload of accounts kicks off
   * right after, the browser blurs the field out from under
   * them - the cursor/highlight just disappears.
   *
   * Once loading finishes (accountsLoading becomes false),
   * the control becomes focusable again. If the user had
   * intentionally navigated here (keepCbAccountFocus.current
   * is true) and hasn't since left the field, we hand focus
   * back to it.
   */
  useEffect(() => {
    if (!keepCbAccountFocus.current) {
      return;
    }

    if (accountsLoading) {
      // Still disabled - can't take focus yet, wait for it
      // to finish loading.
      return;
    }

    requestAnimationFrame(() => {
      if (!keepCbAccountFocus.current) {
        return;
      }

      cbAccountRef.current?.focus();
    });
  }, [accountsLoading]);

  return (
    <div className="px-5 pt-3 pb-2">

      {/* =====================================================
          FIRST ROW
      ===================================================== */}

      <div className="mb-2 flex items-center justify-between gap-8">

        {/* ================= BRANCH ================= */}

        <div className="flex items-center gap-2">

          <label className="w-22.5 text-right text-xs whitespace-nowrap">
            Branch :
          </label>

           <Select<SelectOption, false>
            ref={branchRef}
            id="lkpBranch"
            value={selectedBranch}
            onKeyDown={(event) =>
              handleSelectKeyDown(
                event,
                "branch",
                () => typeRef.current?.focus()
              )
            }
            onMenuOpen={() =>
              setOpenSelect("branch")
            }
            onMenuClose={() =>
              setOpenSelect(null)
            }
            onChange={(option) => {
              const selectedBranch =
                option?.value || "";

              setLkpBranch(selectedBranch);

              if (!isModifyMode) {
                getReceiptDocNumber(
                  selectedBranch,
                  lkpType || "B"
                );
              }
            }}
            options={branchOptions}
            placeholder="Select Branch"
             components={{
              Option: BranchOption,
              MenuList:BranchMenuList,
            }}

            filterOption={
              filterOption
            }
              styles={{
              ...selectStylesLocal,

              control: (base: any) => ({
                ...base,

                minHeight: "28px",
                height: "28px",

                width: "200px",

                borderColor:
                  "#d7dee7",

                borderRadius: "4px",

                boxShadow: "none",

                fontSize: "12px",

                cursor: "text",

                "&:hover": {
                  borderColor:
                    "#9fdfbc",
                },
              }),

              menu: (base: any) => ({
                ...base,

                width: "250px",

                zIndex: 99999,
              }),

              menuPortal: (base: any) => ({
                ...base,

                zIndex: 99999,
              }),

              option: (
                base: any,
                state: any
              ) => ({
                ...base,

                padding: "6px 10px",

                fontSize: "12px",

                backgroundColor:
                  state.isFocused
                    ? "#eef8f3"
                    : "#fff",

                color: "#222",

                cursor: "pointer",
              }),
            }}

            isSearchable
            isClearable={false}
            noOptionsMessage={() =>
              "No Branch Found"
            }
          />


        </div>

        {/* ================= TYPE ================= */}

        <div className="flex items-center gap-2">

          <label className="text-right text-xs whitespace-nowrap">
            Type :
          </label>

          <Select<SelectOption, false>
            ref={typeRef}

            inputId="lkpType"

            value={selectedType}

            onKeyDown={(event) =>
              handleSelectKeyDown(
                event,
                "type",
                () =>
                  documentNoRef.current?.focus()
              )
            }

            onMenuOpen={() =>
              setOpenSelect("type")
            }

            onMenuClose={() =>
              setOpenSelect(null)
            }

            onChange={(option) => {
              const selectedType =
                option?.label ||
                option?.value ||
                "B";

              setLkpType(
                selectedType
              );

              loadAccounts(
                selectedType
              );

              if (
                lkpBranch &&
                !isModifyMode
              ) {
                getReceiptDocNumber(
                  lkpBranch,
                  selectedType
                );
              }
            }}

            options={typeOptions}

            placeholder="Select"

            components={{
              Option: TypeOption,
              MenuList: TypeMenuList,
            }}

            filterOption={
              filterOption
            }

            styles={{
              ...selectStylesLocal,

              control: (base: any) => ({
                ...base,

                minHeight: "28px",
                height: "28px",

                width: "80px",

                borderColor:
                  "#d7dee7",

                borderRadius: "4px",

                boxShadow: "none",

                fontSize: "12px",

                cursor: "text",

                "&:hover": {
                  borderColor:
                    "#9fdfbc",
                },
              }),

              menu: (base: any) => ({
                ...base,

                width: "120px",

                zIndex: 99999,
              }),

              menuPortal: (base: any) => ({
                ...base,

                zIndex: 99999,
              }),

              option: (
                base: any,
                state: any
              ) => ({
                ...base,

                padding: "6px 10px",

                fontSize: "12px",

                backgroundColor:
                  state.isFocused
                    ? "#eef8f3"
                    : "#fff",

                color: "#222",

                cursor: "pointer",
              }),
            }}

            isSearchable

            isClearable={false}

            noOptionsMessage={() =>
              "No Type Found"
            }
          />

        </div>

        {/* ================= RECEIPT NO ================= */}

        <div className="flex items-center gap-2">

          <label className="text-right text-xs whitespace-nowrap">
            Receipt No. :
          </label>

          <input
            maxLength={docnolen}

            id="txtReceiptNo"

            ref={documentNoRef}

            value={
              documentNoLoading
                ? "Loading..."
                : documentNo
            }

            readOnly={
              !documentNoEditable
            }

            onChange={(event) => {
              if (
                documentNoEditable
              ) {
                setDocumentNo(
                  event.target.value
                );
              }
            }}

            onBlur={(e) => {
              if (
                documentNoEditable &&
                docnolen > 0 &&
                e.target.value
                  .length !==
                  docnolen
              ) {
                toast.warning(
                  `Receipt No. width must be ${docnolen}`
                );

                return;
              }

              if (
                documentNoEditable
              ) {
                txtDocNo?.();
              }
            }}

            onKeyDown={(event) => {
              if (
                documentNoEditable &&
                event.key === "Enter"
              ) {
                event.preventDefault();

                txtDocNo?.();

                /*
                 * We are intentionally moving into Cash/Bank.
                 * If a reload of its options happens right
                 * after this (branch/type change effects),
                 * the field will be temporarily disabled and
                 * lose focus - this flag tells the effect
                 * above to hand focus back once loading ends.
                 */
                keepCbAccountFocus.current = true;

                requestAnimationFrame(() => {
                  cbAccountRef.current?.focus();
                });

                return;
              }

              handleInputKeyDown(
                event,
                () => {
                  keepCbAccountFocus.current = true;
                  cbAccountRef.current?.focus();
                }
              );
            }}

            className={`${inputClass} w-37.5`}
          />

        </div>

      </div>

      {/* =====================================================
          SECOND ROW
      ===================================================== */}

      <div className="mb-2 flex items-center justify-between gap-8">

        {/* ================= CASH / BANK ================= */}

        <div className="flex items-center gap-2">

          <label
            className="w-22.5 text-right text-xs whitespace-nowrap"
            id="lblCBAccountName"
          >
            {selectedType?.value} :
          </label>

          <Select<SelectOption, false>
            ref={cbAccountRef}

            id="lkpCBAccountName"

            value={selectedCbAccount}

            onKeyDown={(event) =>
              handleSelectKeyDown(
                event,
                "cbAccount",
                () =>
                  dateRef.current?.focus()
              )
            }

            onMenuOpen={() =>
              setOpenSelect(
                "cbAccount"
              )
            }

            onMenuClose={() =>
              setOpenSelect(null)
            }

            onChange={(option) => {
              setCbAccount(
                option?.value || ""
              );

              /*
               * A value was picked - the user is done with
               * this field, so stop trying to refocus it on
               * future loading-state changes.
               */
              keepCbAccountFocus.current = false;
            }}

            options={
              cbAccountOptions
            }

            placeholder={
              accountsLoading
                ? "Loading..."
                : "Select"
            }

            components={{
              Option:
                BankCashOption,

              MenuList:
                BankCashMenuList,
            }}

            filterOption={
              filterOption
            }

            styles={{
              ...selectStylesLocal,

              control: (base: any) => ({
                ...base,

                minHeight: "28px",
                height: "28px",

                width: "400px",

                borderColor:
                  "#d7dee7",

                borderRadius: "4px",

                boxShadow: "none",

                fontSize: "12px",

                cursor: "text",

                "&:hover": {
                  borderColor:
                    "#9fdfbc",
                },
              }),

              menu: (base: any) => ({
                ...base,

                width: "480px",

                zIndex: 99999,
              }),

              menuPortal: (base: any) => ({
                ...base,

                zIndex: 99999,
              }),

              option: (
                base: any,
                state: any
              ) => ({
                ...base,

                padding: "6px 10px",

                fontSize: "12px",

                backgroundColor:
                  state.isFocused
                    ? "#eef8f3"
                    : "#fff",

                color: "#222",

                cursor: "pointer",
              }),

              menuList: (
                base: any
              ) => ({
                ...base,

                maxHeight:
                  "600px",
              }),
            }}

            isSearchable

            isClearable={false}

            isDisabled={
              accountsLoading ||
              cbAccountOptions.length ===
                0
            }

            noOptionsMessage={() =>
              "No Cash/Bank Found"
            }
          />

        </div>

        {/* ================= DATE ================= */}

        <div className="flex items-center gap-2">

          <label className="text-right text-xs whitespace-nowrap">
            Date :
          </label>

          <LocalizationProvider
            dateAdapter={
              AdapterDayjs
            }
          >
            <DatePicker
              value={
                date
                  ? dayjs(
                      date,
                      "DD-MM-YYYY"
                    )
                  : null
              }

              onChange={(newValue) => {
                if (
                  newValue?.isValid()
                ) {
                  setDate(
                    newValue.format(
                      "DD-MM-YYYY"
                    )
                  );
                } else {
                  setDate("");
                }
              }}

              format="DD-MM-YYYY"

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
                    width: "120px",
                  },

                "& .MuiPickersInputBase-root":
                  {
                    width: "150px",
                    height: "28px",
                    minHeight: "28px",
                    boxSizing:
                      "border-box",
                    borderRadius: "4px",
                    backgroundColor:
                      "#ffffff",
                    fontSize: "12px",
                    padding: 0,
                    overflow:
                      "hidden",
                  },

                "& .MuiPickersInputBase-sectionsContainer":
                  {
                    paddingLeft:
                      "10px !important",

                    paddingRight:
                      "0px !important",

                    marginBottom:
                      "-5px !important",

                    marginLeft:
                      "0px !important",

                    boxSizing:
                      "border-box",

                    overflow:
                      "hidden",
                  },

                "& .MuiPickersInputBase-sectionContent":
                  {
                    fontSize: "12px",
                    color:
                      "#344054",
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
                      "#B7C7D7 !important",
                  },

                "& .MuiPickersInputBase-root:hover .MuiPickersOutlinedInput-notchedOutline":
                  {
                    borderColor:
                      "#B7C7D7 !important",
                  },

                "& .MuiPickersInputBase-root.Mui-focused .MuiPickersOutlinedInput-notchedOutline":
                  {
                    borderColor:
                      "#B7C7D7 !important",

                    borderWidth:
                      "1px",
                  },

                "& .MuiPickersInputBase-root.Mui-error .MuiPickersOutlinedInput-notchedOutline":
                  {
                    borderColor:
                      "#B7C7D7 !important",
                  },

                "& .MuiPickersInputBase-root.Mui-error:hover .MuiPickersOutlinedInput-notchedOutline":
                  {
                    borderColor:
                      "#B7C7D7 !important",
                  },

                "& .MuiPickersInputBase-root.Mui-error.Mui-focused .MuiPickersOutlinedInput-notchedOutline":
                  {
                    borderColor:
                      "#B7C7D7 !important",
                  },
              }}
            />
          </LocalizationProvider>

        </div>

      </div>

      {/* =====================================================
          THIRD ROW
      ===================================================== */}

      <div className="flex items-center justify-between gap-8">

        {/* ================= RECEIVED FROM ================= */}

        <div className="flex items-center gap-2">

          <label className="w-22.5 text-right text-xs whitespace-nowrap">
            Received From :
          </label>

          <input
            maxLength={100}

            ref={receivedFromRef}

            id="txtReceivedFrom"

            value={receivedFrom}

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

        {/* ================= REFERENCE ================= */}

        <div className="flex items-center gap-2">

          <label className="text-right text-xs whitespace-nowrap">
            Reference :
          </label>

          <input
            maxLength={20}

            ref={referenceRef}

            id="txtReference"

            value={reference}

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

/* =========================================================
   =========================================================
   RECEIPT TABLE
   =========================================================
========================================================= */



interface CustomerDivisionResponse {
  success: boolean;
  message?: string;
  data: CustomerDivision[];
}

interface ReceiptTableProps {
  url: string;

  rows: ReceiptRow[];

  handleRowChange: (
    id: number,
    field: keyof ReceiptRow,
    value: string | boolean
  ) => void;

  onFieldEnter: (
    rowIndex: number,
    field: TableField
  ) => void;

  onTableEscape: () => void;
  onClearRow: (
    id: number
  ) => void;

  onSortRows: (
    field: SortField,
    direction: "asc" | "desc"
  ) => void;

  accountOptions?: AccountData[];
accountSortByIdOptions?: AccountData[];

  costCenters?: CostCenter[];

  /* Fired whenever a row becomes the "active" row - clicking
     any cell in the row, focusing any of its fields, opening
     any of its dropdowns, etc. The parent should use this to
     show/edit that specific row's own description (e.g. in
     ReceiptBottomForm) instead of a single shared field. */
  onRowSelect?: (
    id: number,
    row: ReceiptRow
  ) => void;
}

const CcIdSingleValue = (
  props: SingleValueProps<SelectOption, false>
) => {
  return (
    <components.SingleValue {...props}>
      {props.data.value}
    </components.SingleValue>
  );
};

export interface ReceiptTableRef {
  focusFirstAccountId: () => void;

  focusField: (
    rowIndex: number,
    field: TableField
  ) => void;
}

interface CustomDropdownIndicatorProps
  extends DropdownIndicatorProps<AccountOption, false> {
  showArrow: boolean;
}

const CustomDropdownIndicator = (
  props: CustomDropdownIndicatorProps
) => {
  if (!props.showArrow) {
    return null;
  }

  return (
    <components.DropdownIndicator {...props}>
      <span className="receipt-dropdown-arrow">
        ▼
      </span>
    </components.DropdownIndicator>
  );
};



const AccountDropdownOption = ({
  displayMode,
  ...props
}: AccountOptionProps) => {
  return (
    <components.Option {...props}>
      <div
        className="account-dropdown-row"
        title={`${props.data.accountId} - ${props.data.accountName}`}
      >

        {displayMode === "id" ? (
          <>
            <div className="account-dropdown-id">
              {props.data.accountId}
            </div>

            <div className="account-dropdown-name">
              {props.data.accountName}
            </div>
          </>
        ) : (
          <>
            <div className="account-dropdown-name">
              {props.data.accountName}
            </div>

            <div className="account-dropdown-id">
              {props.data.accountId}
            </div>
          </>
        )}

      </div>
    </components.Option>
  );
};

interface AccountMenuListProps
  extends MenuListProps<AccountOption, false> {
  displayMode: "id" | "name";
}

const AccountDropdownMenuList = ({
  displayMode,
  ...props
}: AccountMenuListProps) => {
  return (
    <components.MenuList {...props}>
      <div className="account-dropdown-header">

        {displayMode === "id" ? (
          <>
            <div className="account-dropdown-header-id">
              Account ID
            </div>

            <div className="account-dropdown-header-name">
              Account Name
            </div>
          </>
        ) : (
          <>
            <div className="account-dropdown-header-name">
              Account Name
            </div>

            <div className="account-dropdown-header-id">
              Account ID
            </div>
          </>
        )}

      </div>

      <div className="account-dropdown-options">
        {props.children}
      </div>
    </components.MenuList>
  );
};

interface LabeledOptionProps
  extends OptionProps<SelectOption, false> {
  idHeader: string;
  nameHeader: string;
}

/* Generic two-column option row (value / label) used by
   Division and CC.ID dropdowns so the user can see both
   the code and its description while picking. */
const LabeledDropdownOption = ({
  idHeader,
  nameHeader,
  ...props
}: LabeledOptionProps) => {
  const optionId = String(
    props.data.value ?? ""
  );

  const optionName = String(
    props.data.label ?? ""
  );

  return (
    <components.Option {...props}>
      <div
        className="account-dropdown-row"
        title={`${optionId} - ${optionName}`}
        style={{
          display: "grid",
          gridTemplateColumns: "80px 1fr",
          width: "260px",
          minWidth: "260px",
          gap: "8px",
          alignItems: "center",
        }}
      >
        <div
          className="account-dropdown-id"
          title={optionId}
          style={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {optionId}
        </div>

        <div
          className="account-dropdown-name"
          title={optionName}
          style={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {optionName}
        </div>
      </div>
    </components.Option>
  );
};

interface LabeledMenuListProps
  extends MenuListProps<SelectOption, false> {
  idHeader: string;
  nameHeader: string;
}

const LabeledDropdownMenuList = ({
  idHeader,
  nameHeader,
  ...props
}: LabeledMenuListProps) => {
  return (
    <components.MenuList
      {...props}
      innerProps={{
        ...props.innerProps,
        style: {
          ...props.innerProps.style,
          minWidth: "260px",
          width: "260px",
        },
      }}
    >
     <div
  className="account-dropdown-header"
  style={{
    display: "grid",
    gridTemplateColumns: "80px 1fr",
    width: "260px",
    minWidth: "260px",
    gap: "8px",
    alignItems: "center",
  }}
>
  <div className="account-dropdown-header-id">
    {idHeader}
  </div>

  <div
    className="account-dropdown-header-name"
    style={{
      position: "relative",
    }}
  >
    <span
      style={{
        height:'35px',
        position: "absolute",
        left: "-14px",
        top: "-10px",
        bottom: "-10px",
        borderLeft: "2px solid #d0d0d0",
      }}
    />

    {nameHeader}
  </div>
</div>

      <div
        className="account-dropdown-options"
        style={{
          width: "260px",
          minWidth: "260px",
        }}
      >
        {props.children}
      </div>
    </components.MenuList>
  );
};

interface AccountSingleValueProps
  extends SingleValueProps<AccountOption, false> {
  displayMode: "id" | "name";
}

const AccountDropdownSingleValue = ({
  displayMode,
  ...props
}: AccountSingleValueProps) => {
  const data = props.data as AccountOption;

  return (
    <components.SingleValue {...props}>
      <span
        title={`${data.accountId} - ${data.accountName}`}
      >
        {displayMode === "id"
          ? data.accountId
          : data.accountName}
      </span>
    </components.SingleValue>
  );
};

type LabeledSingleValueProps =
  SingleValueProps<SelectOption, false>;

const LabeledDropdownSingleValue = (
  props: LabeledSingleValueProps
) => {
  const data = props.data as SelectOption;

  const value = String(
    data.value ?? ""
  );

  const label = String(
    data.label ?? ""
  );

  return (
    <components.SingleValue {...props}>
      <span
        title={`${value} - ${label}`}
        style={{
          display: "block",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {value}
      </span>
    </components.SingleValue>
  );
};

const accountFilterOption = (
  option: {
    label: string;
    value: string;
    data: AccountOption;
  },
  inputValue: string
) => {
  const search =
    inputValue.toLowerCase().trim();

  if (!search) {
    return true;
  }

  return (
    String(option.data.accountId || "")
      .toLowerCase()
      .includes(search) ||
    String(option.data.accountName || "")
      .toLowerCase()
      .includes(search)
  );
};

const selectFilterOption = (
  option: {
    label: string;
    value: string;
    data: SelectOption;
  },
  inputValue: string
) => {
  const search =
    inputValue.toLowerCase().trim();

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
   EDITABLE-SEARCH BACKSPACE FIX (applies to every Select
   in the table row: Account ID, Account Name, Division,
   CC.ID)

   Default react-select behaviour: once a value is selected,
   the text input is empty, so the FIRST Backspace press just
   clears the whole selection instead of letting the user
   delete the label one character at a time to search for a
   different value. This helper intercepts Backspace when the
   controlled search text is empty and there is a selected
   value: it seeds the search text with the current label
   minus its last character and re-opens the menu, so every
   further Backspace keeps trimming one character at a time
   and the (now visible) input value drives normal filtering.
========================================================= */

const handleEditableSelectBackspace = (
  event: React.KeyboardEvent,
  currentLabel: string,
  searchText: string,
  setSearchText: (value: string) => void,
  setIsEditing: (value: boolean) => void,
  selectRef: React.RefObject<SelectInstance<any, any> | null>
): boolean => {
  if (event.key !== "Backspace") {
    return false;
  }

  event.preventDefault();
  event.stopPropagation();

  // Keep the Select in editing mode even when the text becomes empty.
  // This prevents the selected option's label from reappearing.
  setIsEditing(true);

  const nextSearchText =
    searchText !== ""
      ? searchText.slice(0, -1)
      : currentLabel.slice(0, -1);

  setSearchText(nextSearchText);

  // Open the options without manually restoring focus.
  requestAnimationFrame(() => {
    selectRef.current?.openMenu("first");
  });

  return true;
};

type RowRefValue =
  | SelectInstance<AccountOption, false>
  | SelectInstance<SelectOption, false>
  | HTMLInputElement
  | HTMLButtonElement
  | null;

type RowRefs = Partial<
  Record<TableField, RowRefValue>
>;

interface ReceiptRowProps {
  url: string;

  row: ReceiptRow;

  index: number;

  isSelected: boolean;

  realAccountOptions: AccountOption[];

  accountIdOptions: AccountOption[];

  ccIdOptions: SelectOption[];

  setSelectedRowId: (
    id: number
  ) => void;

  setRowRef: (
    rowIndex: number,
    field: TableField,
    value: RowRefValue
  ) => void;

  handleRowChange: (
    id: number,
    field: keyof ReceiptRow,
    value: string | boolean
  ) => void;

  onFieldEnter: (
    rowIndex: number,
    field: TableField
  ) => void;

  onTableEscape: () => void;

  onClearRow: (
    id: number
  ) => void;
   onRowSelect?: (
    id: number,
    row: ReceiptRow
  ) => void;
}

const ReceiptRow = memo(
  ({
    url,
    row,
    index,
    isSelected,
    realAccountOptions,
    accountIdOptions,
    ccIdOptions,
    setSelectedRowId,
    setRowRef,
    handleRowChange,
    onFieldEnter,
    onTableEscape,
    onClearRow,
    onRowSelect,
  }: ReceiptRowProps) => {

    const accountIdMenuOpenRef =
      useRef(false);

    const accountNameMenuOpenRef =
      useRef(false);

    const divisionMenuOpenRef =
      useRef(false);

    const ccIdMenuOpenRef =
      useRef(false);

    /* Local instance refs + controlled search text per field,
       used only for the "edit selected value via Backspace"
       fix. See handleEditableSelectBackspace above. */
  
    
       const accountIdSelectRef =
      useRef<SelectInstance<
        AccountOption,
        false
      > | null>(null);

    const accountNameSelectRef =
      useRef<SelectInstance<
        AccountOption,
        false
      > | null>(null);

    const divisionSelectRef =
      useRef<SelectInstance<
        SelectOption,
        false
      > | null>(null);

    const ccIdSelectRef =
      useRef<SelectInstance<
        SelectOption,
        false
      > | null>(null);

    const [
      accountIdSearchText,
      setAccountIdSearchText,
    ] = useState("");

    const [
      accountNameSearchText,
      setAccountNameSearchText,
    ] = useState("");

    const [
      divisionSearchText,
      setDivisionSearchText,
    ] = useState("");

    const [
      ccIdSearchText,
      setCcIdSearchText,
    ] = useState("");

    // Prevent react-select from restoring the selected label while
    // the user is editing it character-by-character.
    const [isAccountIdEditing, setIsAccountIdEditing] =
      useState(false);

    const [isAccountNameEditing, setIsAccountNameEditing] =
      useState(false);

    const [isDivisionEditing, setIsDivisionEditing] =
      useState(false);

    const [isCcIdEditing, setIsCcIdEditing] =
      useState(false);

    const [divisions, setDivisions] =
      useState<CustomerDivision[]>([]);

    const [divisionLoading, setDivisionLoading] =
      useState(false);

   const fetchDivisions =
  useCallback(
    async (
      accountId: string,
      existingDivision: string = ""
    ) => {
      if (!accountId) {
        setDivisions([]);
        setDivisionLoading(false);

        handleRowChange(
          row.id,
          "division",
          ""
        );

        handleRowChange(
          row.id,
          "hasDivision",
          false
        );

        return;
      }

      setDivisionLoading(true);

      try {
        const response =
          await fetch(
            `${import.meta.env.VITE_API_URL}/Receipt/getDivID`,
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body: JSON.stringify({
                customerid:
                  accountId,
              }),
            }
          );

        if (!response.ok) {
          throw new Error(
            `HTTP Error: ${response.status}`
          );
        }

        const result =
          (await response.json()) as CustomerDivisionResponse;

        if (
          result.success &&
          Array.isArray(result.data)
        ) {
          setDivisions(result.data);

          handleRowChange(
            row.id,
            "hasDivision",
            result.data.length > 0
          );

          /*
           * IMPORTANT:
           * When loading an existing receipt,
           * keep its already saved division.
           */
          if (existingDivision) {
            const savedDivisionExists =
              result.data.some(
                (division) =>
                  String(
                    division.fdivid
                  ) ===
                  String(
                    existingDivision
                  )
              );

            if (savedDivisionExists) {
              handleRowChange(
                row.id,
                "division",
                existingDivision
              );
            } else if (
              result.data.length === 1
            ) {
              handleRowChange(
                row.id,
                "division",
                String(
                  result.data[0].fdivid
                )
              );
            }

            return;
          }

          /*
           * Normal new account selection.
           */
          if (result.data.length === 1) {
            handleRowChange(
              row.id,
              "division",
              String(
                result.data[0].fdivid
              )
            );
          } else {
            handleRowChange(
              row.id,
              "division",
              ""
            );
          }
        } else {
          setDivisions([]);

          handleRowChange(
            row.id,
            "division",
            ""
          );

          handleRowChange(
            row.id,
            "hasDivision",
            false
          );
        }
      } catch (error) {
        console.error(
          "Get Customer Divisions Error:",
          error
        );

        setDivisions([]);

        handleRowChange(
          row.id,
          "division",
          ""
        );

        handleRowChange(
          row.id,
          "hasDivision",
          false
        );
      } finally {
        setDivisionLoading(false);
      }
    },
    [
      row.id,
      handleRowChange,
    ]
  );

    const divisionOptions =
      useMemo<SelectOption[]>(
        () =>
          divisions.map(
            (division) => ({
              value: division.fdivid,
              label: division.fdivname,
              
            })
          ),
        [divisions]
      );

    const selectedAccount =
      useMemo(
        () =>
          realAccountOptions.find(
            (account) =>
              account.accountId ===
              row.accountId
          ) || null,
        [
          realAccountOptions,
          row.accountId,
        ]
      );

    const selectedAccountName =
      useMemo(() => {
        if (!selectedAccount) {
          return null;
        }

        return {
          value:
            selectedAccount.accountId,

          label:
            selectedAccount.accountName,

          accountId:
            selectedAccount.accountId,

          accountName:
            selectedAccount.accountName,

          fgcs:
            selectedAccount.fgcs,

          haveCc:
            selectedAccount.haveCc,
        };
      }, [selectedAccount]);

   const selectedDivision =
  useMemo(
    () =>
      divisionOptions.find(
        (option) =>
          String(option.value) ===
          String(row.division)
      ) || null,
    [
      divisionOptions,
      row.division,
    ]
  );

    const selectedCcId =
      useMemo(
        () =>
          ccIdOptions.find(
            (option) =>
              option.value ===
              row.ccId
          ) || null,
        [
          ccIdOptions,
          row.ccId,
        ]
      );

    const handleAccountChange =
      useCallback(
        async (
          option: AccountOption
        ) => {
          setSelectedRowId(
            row.id
          );

          setAccountIdSearchText("");
          setAccountNameSearchText("");

          handleRowChange(
            row.id,
            "accountId",
            option.accountId
          );

          handleRowChange(
            row.id,
            "accountName",
            option.accountName
          );

          handleRowChange(
            row.id,
            "fgcs",
            option.fgcs
          );

          handleRowChange(
            row.id,
            "haveCc",
            option.haveCc
          );

          handleRowChange(
            row.id,
            "division",
            ""
          );

          handleRowChange(
            row.id,
            "ccId",
            ""
          );

          await fetchDivisions(
            option.accountId
          );
        },
        [
          row.id,
          setSelectedRowId,
          handleRowChange,
          fetchDivisions,
        ]
      );

useEffect(() => {
  if (!row.accountId) {
    return;
  }

  void fetchDivisions(
    row.accountId,
    row.division || ""
  );
}, [
  row.accountId,
  fetchDivisions,
]);

    const handleSelectKeyDown =
      useCallback(
        (
          event: React.KeyboardEvent,
          field: TableField,
          menuOpenRef:
            React.MutableRefObject<boolean>
        ) => {
          if (
            event.key === "Delete" &&
            event.ctrlKey
          ) {
            event.preventDefault();
            event.stopPropagation();

            onClearRow(row.id);

            return;
          }

          if (
            event.key === "Escape"
          ) {
            if (menuOpenRef.current) {
              return;
            }

            event.preventDefault();
            event.stopPropagation();

            onTableEscape();

            return;
          }

          if (
            event.key !== "Enter" &&
            event.key !== "Tab"
          ) {
            return;
          }

          if (menuOpenRef.current) {
            return;
          }

          event.preventDefault();
          event.stopPropagation();

          onFieldEnter(
            index,
            field
          );
        },
        [
          index,
          row.id,
          onFieldEnter,
          onTableEscape,
          onClearRow,
        ]
      );
      /* =========================================================
   CREDIT AMOUNT - HALALA FORMAT
========================================================= */

const formatCreditAmount = (
  value: string
): string => {
  if (
    value === "" ||
    value === null ||
    value === undefined
  ) {
    return "";
  }

  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    return "";
  }

  return numberValue.toFixed(2);
};

    const handleControlKeyDown =
      useCallback(
        (
          event: React.KeyboardEvent,
          field: TableField
        ) => {
          if (
            event.key === "Delete" &&
            event.ctrlKey
          ) {
            event.preventDefault();
            event.stopPropagation();

            onClearRow(row.id);

            return;
          }

          if (
            event.key === "Escape"
          ) {
            event.preventDefault();
            event.stopPropagation();

            onTableEscape();

            return;
          }

          if (
            event.key !== "Enter" &&
            event.key !== "Tab"
          ) {
            return;
          }

          event.preventDefault();
          event.stopPropagation();

          onFieldEnter(
            index,
            field
          );
        },
        [
          index,
          row.id,
          onFieldEnter,
          onTableEscape,
          onClearRow,
        ]
      );

    const handleAccountIdMenuOpen =
      useCallback(() => {
        accountIdMenuOpenRef.current =
          true;

        setSelectedRowId(
          row.id
        );
      }, [
        row.id,
        setSelectedRowId,
      ]);

    const handleAccountIdMenuClose =
      useCallback(() => {
        accountIdMenuOpenRef.current =
          false;
      }, []);

    const handleAccountNameMenuOpen =
      useCallback(() => {
        accountNameMenuOpenRef.current =
          true;

        setSelectedRowId(
          row.id
        );
      }, [
        row.id,
        setSelectedRowId,
      ]);

    const handleAccountNameMenuClose =
      useCallback(() => {
        accountNameMenuOpenRef.current =
          false;
      }, []);

    const handleDivisionMenuOpen =
      useCallback(() => {
        divisionMenuOpenRef.current =
          true;

        setSelectedRowId(
          row.id
        );
      }, [
        row.id,
        setSelectedRowId,
      ]);

    const handleDivisionMenuClose =
      useCallback(() => {
        divisionMenuOpenRef.current =
          false;
      }, []);

    const handleCcMenuOpen =
      useCallback(() => {
        ccIdMenuOpenRef.current =
          true;

        setSelectedRowId(
          row.id
        );
      }, [
        row.id,
        setSelectedRowId,
      ]);

    const handleCcMenuClose =
      useCallback(() => {
        ccIdMenuOpenRef.current =
          false;
      }, []);

    const RowAccountIdIndicator =
      useCallback(
        (
          props: DropdownIndicatorProps<
            AccountOption,
            false
          >
        ) => (
          <CustomDropdownIndicator
            {...props}
            showArrow={isSelected}
          />
        ),
        [isSelected]
      );

    const RowAccountNameIndicator =
      useCallback(
        (
          props: DropdownIndicatorProps<
            AccountOption,
            false
          >
        ) => (
          <CustomDropdownIndicator
            {...props}
            showArrow={isSelected}
          />
        ),
        [isSelected]
      );

    const RowNormalDropdownIndicator =
      useCallback(
        (
          props: DropdownIndicatorProps<
            SelectOption,
            false
          >
        ) => (
          <components.DropdownIndicator
            {...props}
          >
            <span className="receipt-dropdown-arrow">
              ▼
            </span>
          </components.DropdownIndicator>
        ),
        []
      );

    return (
      <tr
        className={
          isSelected
            ? "receipt-row-selected"
            : ""
        }
       
     onClick={() => {
  setSelectedRowId(row.id);
  //@ts-ignore
  onRowSelect?.(row.id, row);
}}
        
      >
        <td className="receipt-cell serial-cell">
          {index + 1}
        </td>

        <td className="receipt-cell">
          <Select<AccountOption, false>
            inputId={
              `lkpAccountId-${row.id}`
            }
            ref={(instance) => {
              accountIdSelectRef.current =
                instance;

              setRowRef(
                index,
                "accountId",
                instance
              );
            }}
            value={
              isAccountIdEditing
                ? null
                : selectedAccount
            }
            inputValue={
              accountIdSearchText
            }
            onInputChange={(
              newValue,
              actionMeta
            ) => {
              if (
                actionMeta.action ===
                "input-change"
              ) {
                setAccountIdSearchText(
                  newValue
                );
                setIsAccountIdEditing(true);
              }

              return newValue;
            }}
            backspaceRemovesValue={
              false
            }
            onKeyDown={(event) => {
              const handled =
                handleEditableSelectBackspace(
                  event,
                  selectedAccount?.label ??
                    "",
                  accountIdSearchText,
                  setAccountIdSearchText,
                  setIsAccountIdEditing,
                  accountIdSelectRef
                );

              if (handled) {
                return;
              }

              handleSelectKeyDown(
                event,
                "accountId",
                accountIdMenuOpenRef
              );
            }}
            onMenuOpen={
              handleAccountIdMenuOpen
            }
            onMenuClose={() => {
              handleAccountIdMenuClose();
              setAccountIdSearchText("");
              setIsAccountIdEditing(false);
            }}
            onChange={(
              option: SingleValue<AccountOption>
            ) => {
              if (!option) {
                return;
              }

              setIsAccountIdEditing(false);
              setAccountIdSearchText("");

              void handleAccountChange(option);
            }}
           options={accountIdOptions}
            placeholder=""
            styles={accountDropdownStyles}
            components={{
              DropdownIndicator:
                RowAccountIdIndicator,

              SingleValue: (props) => (
                <AccountDropdownSingleValue
                  {...props}
                  displayMode="id"
                />
              ),

              Option: (props) => (
                <AccountDropdownOption
                  {...props}
                  displayMode="id"
                />
              ),

              MenuList: (props) => (
                <AccountDropdownMenuList
                  {...props}
                  displayMode="id"
                />
              ),
            }}
            filterOption={
              accountFilterOption
            }
            isSearchable
            isClearable={false}
            menuPlacement="auto"
            menuPosition="fixed"
            menuPortalTarget={
              document.body
            }
            menuShouldScrollIntoView={
              false
            }
            closeMenuOnSelect
            blurInputOnSelect={false}
            tabSelectsValue={false}
            noOptionsMessage={() =>
              "No Account Found"
            }
          />
        </td>

        <td className="receipt-cell">
          <Select<AccountOption, false>
            inputId={
              `lkpAccountName-${row.id}`
            }
            ref={(instance) => {
              accountNameSelectRef.current =
                instance;

              setRowRef(
                index,
                "accountName",
                instance
              );
            }}
            value={
              isAccountNameEditing
                ? null
                : selectedAccountName
            }
            inputValue={
              accountNameSearchText
            }
            onInputChange={(
              newValue,
              actionMeta
            ) => {
              if (
                actionMeta.action ===
                "input-change"
              ) {
                setAccountNameSearchText(
                  newValue
                );
                setIsAccountNameEditing(true);
              }

              return newValue;
            }}
            backspaceRemovesValue={
              false
            }
            onKeyDown={(event) => {
              const handled =
                handleEditableSelectBackspace(
                  event,
                  selectedAccountName?.label ??
                    "",
                  accountNameSearchText,
                  setAccountNameSearchText,
                  setIsAccountNameEditing,
                  accountNameSelectRef
                );

              if (handled) {
                return;
              }

              handleSelectKeyDown(
                event,
                "accountName",
                accountNameMenuOpenRef
              );
            }}
            onMenuOpen={
              handleAccountNameMenuOpen
            }
            onMenuClose={() => {
              handleAccountNameMenuClose();
              setAccountNameSearchText("");
              setIsAccountNameEditing(false);
            }}
            onChange={(
              option: SingleValue<AccountOption>
            ) => {
              if (!option) {
                return;
              }

              setIsAccountNameEditing(false);
              setAccountNameSearchText("");

              void handleAccountChange(option);
            }}
            options={
              realAccountOptions
            }
            placeholder=""
            styles={accountDropdownStyles}
            components={{
              DropdownIndicator:
                RowAccountNameIndicator,

              SingleValue: (props) => (
                <AccountDropdownSingleValue
                  {...props}
                  displayMode="name"
                />
              ),

              Option: (props) => (
                <AccountDropdownOption
                  {...props}
                  displayMode="name"
                />
              ),

              MenuList: (props) => (
                <AccountDropdownMenuList
                  {...props}
                  displayMode="name"
                />
              ),
            }}
            filterOption={
              accountFilterOption
            }
            isSearchable
            isClearable={false}
            isDisabled={false}
            menuPlacement="auto"
            menuPosition="fixed"
            menuPortalTarget={
              document.body
            }
            menuShouldScrollIntoView={
              false
            }
            closeMenuOnSelect
            blurInputOnSelect={false}
            tabSelectsValue={false}
            noOptionsMessage={() =>
              "No Account Found"
            }
          />
        </td>

        <td className="receipt-cell">
          <Select<SelectOption, false>
            inputId={
              `lkpDivision-${row.id}`
            }
            ref={(instance) => {
              divisionSelectRef.current =
                instance;

              setRowRef(
                index,
                "division",
                instance
              );
            }}
            value={
              isDivisionEditing
                ? null
                : selectedDivision
            }
            inputValue={
              divisionSearchText
            }
            onInputChange={(
              newValue,
              actionMeta
            ) => {
              if (
                actionMeta.action ===
                "input-change"
              ) {
                setDivisionSearchText(
                  newValue
                );
                setIsDivisionEditing(true);
              }

              return newValue;
            }}
            backspaceRemovesValue={
              false
            }
            onKeyDown={(event) => {
              const handled =
                handleEditableSelectBackspace(
                  event,
                  selectedDivision?.label ??
                    "",
                  divisionSearchText,
                  setDivisionSearchText,
                  setIsDivisionEditing,
                  divisionSelectRef
                );

              if (handled) {
                return;
              }

              handleSelectKeyDown(
                event,
                "division",
                divisionMenuOpenRef
              );
            }}
            onMenuOpen={
              handleDivisionMenuOpen
            }
            onMenuClose={() => {
              handleDivisionMenuClose();
              setDivisionSearchText("");
              setIsDivisionEditing(false);
            }}
            onChange={(
              option: SingleValue<SelectOption>
            ) => {
              handleRowChange(
                row.id,
                "division",
                option?.value || ""
              );

              setDivisionSearchText("");
              setIsDivisionEditing(false);

              setSelectedRowId(row.id);
            }}
            blurInputOnSelect={false}
            options={divisionOptions}
            placeholder=""
            styles={{
              ...selectStyles,
              menu: (base: any) => ({
                ...base,
                minWidth: "260px",
                width: "260px",
              }),
              menuList: (base: any) => ({
                ...base,
                minWidth: "260px",
                width: "260px",
                overflowX: "hidden",
              }),
            }}
            components={{
              DropdownIndicator:
                RowNormalDropdownIndicator,

              SingleValue: (props) => (
                <LabeledDropdownSingleValue {...props} />
              ),

              Option: (props) => (
                <LabeledDropdownOption
                  {...props}
                  idHeader="ID"
                  nameHeader="Division"
                />
              ),

              MenuList: (props) => (
                <LabeledDropdownMenuList
                  {...props}
                  idHeader="ID"
                  nameHeader="Division"
                />
              ),
            }}
            isSearchable
            isClearable={false}
            isDisabled={
              !row.accountId ||
              divisionLoading ||
              !row.hasDivision ||
              divisionOptions.length === 0
            }
            menuPlacement="auto"
            menuPosition="fixed"
            menuPortalTarget={
              document.body
            }
            menuShouldScrollIntoView={
              false
            }
            filterOption={
              selectFilterOption
            }
            noOptionsMessage={() =>
              "No Division Found"
            }
          />
        </td>

        <td className="receipt-cell">
          <Select<SelectOption, false>
            inputId={
              `lkpCCId-${row.id}`
            }
            ref={(instance) => {
              ccIdSelectRef.current =
                instance;

              setRowRef(
                index,
                "ccId",
                instance
              );
            }}
            value={
              isCcIdEditing
                ? null
                : selectedCcId
            }
            inputValue={ccIdSearchText}
            onInputChange={(
              newValue,
              actionMeta
            ) => {
              if (
                actionMeta.action ===
                "input-change"
              ) {
                setCcIdSearchText(
                  newValue
                );
                setIsCcIdEditing(true);
              }

              return newValue;
            }}
            backspaceRemovesValue={
              false
            }
            onKeyDown={(event) => {
              const handled =
                handleEditableSelectBackspace(
                  event,
                  selectedCcId?.label ??
                    "",
                  ccIdSearchText,
                  setCcIdSearchText,
                  setIsCcIdEditing,
                  ccIdSelectRef
                );

              if (handled) {
                return;
              }

              handleSelectKeyDown(
                event,
                "ccId",
                ccIdMenuOpenRef
              );
            }}
            onMenuOpen={
              handleCcMenuOpen
            }
            onMenuClose={() => {
              handleCcMenuClose();
              setCcIdSearchText("");
              setIsCcIdEditing(false);
            }}
            onChange={(
              option: SingleValue<SelectOption>
            ) => {
              handleRowChange(
                row.id,
                "ccId",
                option?.value || ""
              );

              setCcIdSearchText("");
              setIsCcIdEditing(false);

              setSelectedRowId(row.id);
            }}
            blurInputOnSelect={false}
            options={ccIdOptions}
            placeholder=""
            styles={{
              ...selectStyles,
              menu: (base: any) => ({
                ...base,
                minWidth: "260px",
                width: "260px",
              }),
              menuList: (base: any) => ({
                ...base,
                minWidth: "260px",
                width: "260px",
                overflowX: "hidden",
              }),
            }}
          components={{
  DropdownIndicator: RowNormalDropdownIndicator,
  SingleValue: CcIdSingleValue,

  Option: (props) => (
    <LabeledDropdownOption
      {...props}
      idHeader="ID"
      nameHeader="Cost Center"
    />
  ),

  MenuList: (props) => (
    <LabeledDropdownMenuList
      {...props}
      idHeader="ID"
      nameHeader="Cost Center"
    />
  ),
}}
            isSearchable
            isClearable={false}
            isDisabled={
              !row.haveCc ||
              ccIdOptions.length === 0
            }
            menuPlacement="auto"
            menuPosition="fixed"
            menuPortalTarget={
              document.body
            }
            menuShouldScrollIntoView={
              false
            }
            filterOption={
              selectFilterOption
            }
            noOptionsMessage={() =>
              "No CC ID Found"
            }
          />
        </td>

        <td className="receipt-cell">
        <input
  id={`txtCreditAmt-${row.id}`}
  ref={(element) =>
    setRowRef(
      index,
      "creditAmount",
      element
    )
  }
  placeholder="0.00"
  type="text"
  inputMode="decimal"
  value={row.creditAmount}
  onChange={(event) => {
    const inputValue =
      event.target.value;

    /* Allow only numbers with
       maximum 2 decimal places */

    if (
      /^\d*\.?\d{0,2}$/.test(
        inputValue
      )
    ) {
      handleRowChange(
        row.id,
        "creditAmount",
        inputValue
      );
    }
  }}
  onFocus={() =>
    setSelectedRowId(
      row.id
    )
  }
  onBlur={() => {
    if (
      row.creditAmount
    ) {
      handleRowChange(
        row.id,
        "creditAmount",
        formatCreditAmount(
          row.creditAmount
        )
      );
    }
  }}
  onKeyDown={(event) =>
    handleControlKeyDown(
      event,
      "creditAmount"
    )
  }
  className="
    receipt-grid-input
    text-right
  "
/>
        </td>

        <td className="receipt-cell">
          <div className="receipt-checkbox-wrapper">
            <input
              id={
                `chkMatch-${row.id}`
              }
              ref={(element) =>
                setRowRef(
                  index,
                  "match",
                  element
                )
              }
              type="checkbox"
              checked={row.match}
              onChange={(event) => {
                setSelectedRowId(
                  row.id
                );

                handleRowChange(
                  row.id,
                  "match",
                  event.target.checked
                );
              }}
            />
          </div>
        </td>

        <td className="receipt-cell">
          <button
            id={
              `btnView-${row.id}`
            }
            ref={(element) =>
              setRowRef(
                index,
                "view",
                element
              )
            }
            type="button"
            onClick={(event) => {
              event.stopPropagation();

              setSelectedRowId(
                row.id
              );
            }}
            className="receipt-view-button"
            tabIndex={0}
          >
            <FaEye size={12} />
          </button>
        </td>
      </tr>
    );
  }
);

ReceiptRow.displayName =
  "ReceiptRow";

/* =========================================================
   MAIN TABLE
========================================================= */

export const ReceiptTable =
  forwardRef<
    ReceiptTableRef,
    ReceiptTableProps
  >(
    (
      {
  rows,
  handleRowChange,
  onFieldEnter,
  onTableEscape,
  onClearRow,
  onSortRows,
  accountOptions = [],
  accountSortByIdOptions = [],
  costCenters = [],
  onRowSelect,
},
      ref
    ) => {
      const [
        selectedRowId,
        setSelectedRowIdState,
      ] = useState<number | null>(null);

      const [
        sortField,
        setSortField,
      ] = useState<SortField | null>(null);

      const [
        sortDirection,
        setSortDirection,
      ] = useState<"asc" | "desc">("asc");

      const handleSort =
        useCallback(
          (
            field: SortField
          ) => {
            const nextDirection =
              sortField === field &&
              sortDirection === "asc"
                ? "desc"
                : "asc";

            setSortField(field);
            setSortDirection(
              nextDirection
            );

            onSortRows(
              field,
              nextDirection
            );
          },
          [
            onSortRows,
            sortDirection,
            sortField,
          ]
        );

      const rowRefs =
        useRef<RowRefs[]>([]);

      const setSelectedRowId =
        useCallback(
          (id: number) => {
            setSelectedRowIdState(id);

            const activeRow = rows.find(
              (currentRow) =>
                currentRow.id === id
            );

            if (activeRow) {
              onRowSelect?.(
                id,
                activeRow
              );
            }
          },
          [rows, onRowSelect]
        );

      const setRowRef =
        useCallback(
          (
            rowIndex: number,
            field: TableField,
            value: RowRefValue
          ) => {
            if (
              !rowRefs.current[rowIndex]
            ) {
              rowRefs.current[rowIndex] =
                {};
            }

            if (value) {
              rowRefs.current[rowIndex][field] =
                value;
            } else {
              delete rowRefs.current[rowIndex][field];
            }
          },
          []
        );

      /*
       * =========================================================
       * AUTO-SELECT / RE-SYNC SELECTED ROW ON LOAD
       * =========================================================
       *
       * onRowSelect (which the parent uses to populate the
       * bottom Description/Note fields) was previously only
       * fired by a user action - clicking a row, focusing one
       * of its fields, etc. That left the description box
       * empty right after data loaded, until the user clicked
       * a row themselves.
       *
       * It's not enough to select the first row only when its
       * id is missing: a row commonly exists (e.g. id 1) from
       * the very first render, and its real description/data
       * arrives slightly later from an API call while keeping
       * the SAME id. Checking "does this id still exist" says
       * yes both times, so onRowSelect never re-fires with the
       * freshly loaded data.
       *
       * Instead, every time `rows` changes we resolve the
       * current target row (the previously selected id if it's
       * still present, otherwise the first row) and push it
       * through setSelectedRowId again. setSelectedRowId always
       * calls onRowSelect with whatever that row's latest data
       * is, so the bottom form keeps in sync as data loads -
       * including on the very first load.
       */
      useEffect(() => {
        if (rows.length === 0) {
          return;
        }

        const targetRow =
          rows.find(
            (currentRow) =>
              currentRow.id ===
              selectedRowId
          ) || rows[0];

        setSelectedRowId(targetRow.id);

        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [rows]);

      const realAccountOptions =
        useMemo<AccountOption[]>(
          () => {
            if (!Array.isArray(accountOptions)) {
              return [];
            }

            return accountOptions
              .filter(
                (account) =>
                  Boolean(
                    account &&
                    account.faccountid
                  )
              )
              .map(
                (account) => ({
                  value:
                    account.faccountid,

                  label:
                    account.faccountid,

                  accountId:
                    account.faccountid,

                  accountName:
                    account.faccountname ||
                    "",

                  fgcs:
                    account.fgcs ||
                    "",

                  haveCc:
                    account.fhavecc ===
                    true,
                })
              );
          },
          [accountOptions]
        );

        const accountIdOptions =
  useMemo<AccountOption[]>(() => {
    if (!Array.isArray(accountSortByIdOptions)) {
      return [];
    }

    return accountSortByIdOptions
      .filter(
        (account) =>
          Boolean(
            account &&
            account.faccountid
          )
      )
      .map(
        (account) => ({
          value: account.faccountid,
          label: account.faccountid,

          accountId:
            account.faccountid,

          accountName:
            account.faccountname || "",

          fgcs:
            account.fgcs || "",

          haveCc:
            account.fhavecc === true,
        })
      );
  }, [accountSortByIdOptions]);

      const ccIdOptions =
        useMemo<SelectOption[]>(
          () => {
            if (
              !Array.isArray(
                costCenters
              )
            ) {
              return [];
            }

            return [...costCenters]
              .sort(
                (first, second) =>
                  first.fpositionno -
                  second.fpositionno
              )
              .map(
                (costCenter) => ({
                  value:
                    costCenter.fccid,

                  /* Falls back to the id when the cost center
                     has no separate name field so the column
                     never renders blank. */
                  label:
                    (costCenter as any)
                      .fccname ||
                    costCenter.fccid,
                })
              );
          },
          [costCenters]
        );

      const focusField =
        useCallback(
          (
            rowIndex: number,
            field: TableField
          ) => {
            const element =
              rowRefs.current[rowIndex]?.[field];

            if (!element) {
              console.warn(
                "ReceiptTable field not found:",
                rowIndex,
                field
              );

              return;
            }

            requestAnimationFrame(() => {
              element.focus();

              if (
                element instanceof
                HTMLInputElement
              ) {
                if (
                  element.type !==
                  "checkbox"
                ) {
                  element.select();
                }
              }
            });
          },
          []
        );

      useImperativeHandle(
        ref,
        () => ({
          focusFirstAccountId: () => {
            focusField(
              0,
              "accountId"
            );
          },

          focusField,
        }),
        [focusField]
      );

      return (
        <div className="receipt-table-wrapper">
          <table
            id="tblReceipt"
            className="receipt-table"
          >
            <colgroup>
              <col style={{ width: "38px" }} />
              <col style={{ width: "105px" }} />
              <col style={{ width: "auto" }} />
              <col style={{ width: "75px" }} />
              <col style={{ width: "75px" }} />
              <col style={{ width: "100px" }} />
              <col style={{ width: "60px" }} />
              <col style={{ width: "60px" }} />
            </colgroup>

            <thead>
              <tr>
                <th>Sl.</th>

                <th>
                  <button
                    type="button"
                    onClick={() =>
                      handleSort(
                        "accountId"
                      )
                    }
                  >
                    Account ID
                  </button>
                </th>

                <th>
                  <button
                    type="button"
                    onClick={() =>
                      handleSort(
                        "accountName"
                      )
                    }
                  >
                    Account Name
                  </button>
                </th>

                <th>Div ID</th>

                <th>CC. ID</th>

                <th className="text-right">
                  Credit Amt.
                </th>

                <th className="text-center">
                  Match
                </th>

                <th className="text-center">
                  View
                </th>
              </tr>
            </thead>

            <tbody>
              {rows.map(
                (row, index) => (
                  <ReceiptRow
                    key={row.id}
                    url=""
                    row={row}
                    index={index}
                    isSelected={
                      selectedRowId ===
                      row.id
                    }
                    realAccountOptions={
                      realAccountOptions
                    }
                    accountIdOptions={
                      accountIdOptions
                    }
                    ccIdOptions={
                      ccIdOptions
                    }
                    setSelectedRowId={
                      setSelectedRowId
                    }
                    setRowRef={
                      setRowRef
                    }
                    handleRowChange={
                      handleRowChange
                    }
                    onFieldEnter={
                      onFieldEnter
                    }
                    onTableEscape={
                      onTableEscape
                    }
                    onClearRow={
                      onClearRow
                    }
                  />
                )
              )}
            </tbody>
          </table>
        </div>
      );
    }
  );

ReceiptTable.displayName =
  "ReceiptTable";

/* =========================================================
   =========================================================
   RECEIPT BOTTOM FORM
   =========================================================
========================================================= */

interface ReceiptBottomFormProps {
  description: string;

  setDescription: (
    value: string
  ) => void;

  descriptionRef: React.RefObject<
    HTMLInputElement | null
  >;

  onDescriptionEnter: (
    event: React.KeyboardEvent<HTMLInputElement>
  ) => void;

  onDescriptionClear?: () => void;

  note: string;

  setNote: (
    value: string
  ) => void;

  noteRef: React.RefObject<
    HTMLTextAreaElement | null
  >;

  onNoteEnter: (
    event: React.KeyboardEvent<HTMLTextAreaElement>
  ) => void;
}

export const ReceiptBottomForm: React.FC<
  ReceiptBottomFormProps
> = ({
  description,
  setDescription,
  descriptionRef,
  onDescriptionEnter,
  onDescriptionClear = () => {},
  note,
  setNote,
  noteRef,
  onNoteEnter,
}) => {
  return (
    <div className="-mt-4 ml-10 w-[76%]">

      <div className="mb-2 flex w-[60%] items-center gap-2">
        <label className="w-20.5 shrink-0 text-right text-xs">
          Description :
        </label>

        <input
        maxLength={250}
          id="txtDescription"
          ref={descriptionRef}
          type="text"
          value={description}
          onChange={(event) =>
            setDescription(
              event.target.value
            )
          }
          onKeyDown={(event) => {
            if (
              event.key === "Delete" &&
              event.ctrlKey
            ) {
              event.preventDefault();
              event.stopPropagation();

              onDescriptionClear();

              return;
            }

            if (
              event.key === "Enter"
            ) {
              event.preventDefault();
              event.stopPropagation();
            }

            onDescriptionEnter(event);
          }}
          className="
            h-6.5
            w-full
            flex-1
            rounded
            border
            border-gray-300
            px-2
            text-xs
            outline-none
            focus:border-[#9fdfbc]
            focus:ring-1
            focus:ring-[#9fdfbc]
            text-[#344054]
          "
        />
      </div>

      <div className="flex w-full items-start gap-2">
        <label className="w-20.5 shrink-0 pt-1 text-right text-xs">
          Note :
        </label>

        <textarea
        maxLength={800}
          id="txtNote"
          ref={noteRef}
          value={note}
          onChange={(event) =>
            setNote(event.target.value)
          }
          onKeyDown={onNoteEnter}
          className="
            h-10.75
            w-full
            flex-1
            resize-y
            rounded
            border
            border-gray-300
            p-2
            text-xs
            outline-none
            focus:border-[#9fdfbc]
            focus:ring-1
            focus:ring-[#9fdfbc]
             text-[#344054]
          "
        />
      </div>
    </div>
  );
};

/* =========================================================
   =========================================================
   RECEIPT ACTIONS
   =========================================================
========================================================= */

export interface ReceiptActionsRef {
  focusSave: () => void;
}

interface ReceiptActionsProps {
  clearForm: () => void;

  onSave: () => void;

  onSearch?: () => void;

  onDelete?: () => void;

  onPrint?: () => void;

  onPost?: () => void;

  onAttach?: () => void;

  saveLabel?: string;

  preventSearchNavigation?: boolean;
}

export const ReceiptActions = forwardRef<
  ReceiptActionsRef,
  ReceiptActionsProps
>(
  (
    {
      clearForm,
      onSave,
      onSearch,
      onDelete,
      onPrint,
      onPost,
      onAttach,
      saveLabel = "Save",
      preventSearchNavigation = false,
    },
    ref
  ) => {
    const saveRef =
      useRef<HTMLButtonElement | null>(
        null
      );

    const searchRef =
      useRef<HTMLButtonElement | null>(
        null
      );

    const deleteRef =
      useRef<HTMLButtonElement | null>(
        null
      );

    const printRef =
      useRef<HTMLButtonElement | null>(
        null
      );

    const postRef =
      useRef<HTMLButtonElement | null>(
        null
      );

    const attachRef =
      useRef<HTMLButtonElement | null>(
        null
      );

    const clearRef =
      useRef<HTMLButtonElement | null>(
        null
      );

    const [
      activeIndex,
      setActiveIndex,
    ] = useState(0);

    const buttonRefs = [
      saveRef,
      searchRef,
      deleteRef,
      printRef,
      postRef,
      attachRef,
      clearRef,
    ];

    const focusButton =
      useCallback(
        (index: number) => {
          const button =
            buttonRefs[index]?.current;

          if (!button) {
            return;
          }

          setActiveIndex(index);

          requestAnimationFrame(() => {
            button.focus();
          });
        },
        []
      );

    useImperativeHandle(
      ref,
      () => ({
        focusSave: () => {
          focusButton(0);
        },
      }),
      [focusButton]
    );

    const handleKeyDown =
      useCallback(
        (
          event: React.KeyboardEvent<HTMLButtonElement>
        ) => {
          switch (
            event.key
          ) {
            case "ArrowRight":
            case "ArrowDown": {
              event.preventDefault();
              event.stopPropagation();

              const nextIndex =
                activeIndex <
                buttonRefs.length - 1
                  ? activeIndex + 1
                  : 0;

              focusButton(
                nextIndex
              );

              break;
            }

            case "ArrowLeft":
            case "ArrowUp": {
              event.preventDefault();
              event.stopPropagation();

              const previousIndex =
                activeIndex > 0
                  ? activeIndex - 1
                  : buttonRefs.length - 1;

              focusButton(
                previousIndex
              );

              break;
            }

            case "Enter": {
              event.preventDefault();
              event.stopPropagation();

              event.currentTarget.click();

              break;
            }

            default:
              break;
          }
        },
        [
          activeIndex,
          focusButton,
        ]
      );

    const handleFocus =
      (index: number) => {
        setActiveIndex(index);
      };

    const buttonClass = `
      min-w-[120px]
      h-[40px]
      rounded-[4px]
      border-l
      border-r
      border-b
      border-[#9db8d4]
      border-t-0
      bg-gradient-to-b
      from-[#ffffff]
      to-[#e7eef5]
      px-4
      text-[15px]
      shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]
      transition-colors
      duration-100
      hover:border-l-[#7f9fbd]
      hover:border-r-[#7f9fbd]
      hover:border-b-[#7f9fbd]
      hover:bg-gradient-to-b
      hover:from-[#ffffff]
      hover:to-[#dce8f1]
      focus:border-l-[#20884e]
      focus:border-r-[#20884e]
      focus:border-b-[#20884e]
      focus:border-t-0
      focus:bg-gradient-to-b
      focus:from-[#ffffff]
      focus:to-[#dcefe5]
      focus:outline-none
      focus:ring-0
    `;

    const textClass = `
      bg-gradient-to-b
      from-[#145c34]
      via-[#20884e]
      to-[#8fd9ad]
      bg-clip-text
      text-transparent
      font-medium
    `;

    return (
      <div
        className="
          my-5
          flex
          w-full
          flex-wrap
          items-center
          justify-center
          gap-2.75
        "
      >
        <button
          ref={saveRef}
          type="button"
          className={buttonClass}
          onFocus={() =>
            handleFocus(0)
          }
          onKeyDown={
            handleKeyDown
          }
          onClick={onSave}
          id={
            saveLabel === "Modify"
              ? "btnModify"
              : "btnSave"
          }
        >
          <span className={textClass}>
            <span className="underline decoration-2 underline-offset-1">
              {saveLabel === "Save"
                ? "S"
                : "M"}
            </span>

            {saveLabel.slice(1)}
          </span>
        </button>

        <Link to="/Transaction/receipt/modify">
          <button
            ref={searchRef}
            type="button"
            className={buttonClass}
            onFocus={() =>
              handleFocus(1)
            }
            onKeyDown={
              handleKeyDown
            }
            onClick={(event) => {
              if (
                preventSearchNavigation
              ) {
                event.preventDefault();
              }

              onSearch?.();
            }}
            id="btnSearch"
          >
            <span className={textClass}>
              Search
            </span>
          </button>
        </Link>

        <button
          ref={deleteRef}
          type="button"
          className={buttonClass}
          onFocus={() =>
            handleFocus(2)
          }
          onKeyDown={
            handleKeyDown
          }
          onClick={onDelete}
          id="btnDelete"
        >
          <span className={textClass}>
            <span className="underline decoration-2 underline-offset-1">
              D
            </span>
            elete
          </span>
        </button>

        <button
          ref={printRef}
          type="button"
          className={buttonClass}
          onFocus={() =>
            handleFocus(3)
          }
          onKeyDown={
            handleKeyDown
          }
          onClick={onPrint}
          id="btnPrint"
        >
          <span className={textClass}>
            Print
          </span>
        </button>

        <button
          ref={postRef}
          type="button"
          className={buttonClass}
          onFocus={() =>
            handleFocus(4)
          }
          onKeyDown={
            handleKeyDown
          }
          onClick={onPost}
          id="btnPost"
        >
          <span className={textClass}>
            Post
          </span>
        </button>

        <button
          ref={attachRef}
          type="button"
          className={buttonClass}
          onFocus={() =>
            handleFocus(5)
          }
          onKeyDown={
            handleKeyDown
          }
          onClick={onAttach}
          id="btnAttach"
        >
          <span className={textClass}>
            Attach
          </span>
        </button>

        <button
          ref={clearRef}
          type="button"
          className={buttonClass}
          onFocus={() =>
            handleFocus(6)
          }
          onKeyDown={
            handleKeyDown
          }
          onClick={clearForm}
          id="btnClear"
        >
          <span className={textClass}>
            <span className="underline decoration-2 underline-offset-1">
              C
            </span>
            lear
          </span>
        </button>
      </div>
    );
  }
);

ReceiptActions.displayName =
  "ReceiptActions";