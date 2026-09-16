import React, {
  memo,
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";

import { FaEye } from "react-icons/fa";

import Select, {
  components,
  type SingleValue,
  type DropdownIndicatorProps,
  type OptionProps,
  type MenuListProps,
  type SelectInstance,
} from "react-select";

import {
  selectStyles,
  accountDropdownStyles,
} from "./ReactSelectStyles";

import "./commanReceipt.css";

/* =========================================================
   TYPES
========================================================= */

export interface ReceiptRow {
  id: number;

  accountId: string;
  accountName: string;

  fgcs: string;

  haveCc: boolean;

  hasDivision: boolean;

  division: string;

  ccId: string;

  creditAmount: string;

  match: boolean;

  description?: string;
}

/* =========================================================
   COST CENTER
========================================================= */

export interface CostCenter {
  fccid: string;
  fccname: string;
  fpositionno: number;
}

/* =========================================================
   CUSTOMER DIVISION
========================================================= */

export interface CustomerDivision {
  fdivid: string;
  fdivname: string;
}

/* =========================================================
   TABLE FIELD
========================================================= */

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
   ACCOUNT DATA
========================================================= */

export interface AccountData {
  fcoid: string;
  faccountid: string;
  faccountgroupid?: string;
  fgph: string;
  fgcs: string;
  faccountname: string;
  fhavecc: boolean;
}

/* =========================================================
   ACCOUNT OPTION
========================================================= */

interface AccountOption {
  value: string;
  label: string;

  accountId: string;
  accountName: string;

  fgcs: string;

  haveCc: boolean;
}

/* =========================================================
   SELECT OPTION
========================================================= */

interface SelectOption {
  value: string;
  label: string;
}

/* =========================================================
   CUSTOMER DIVISION RESPONSE
========================================================= */

interface CustomerDivisionResponse {
  success: boolean;
  message?: string;
  data: CustomerDivision[];
}

/* =========================================================
   TABLE PROPS
========================================================= */

interface ReceiptTableProps {
  url: string;

  rows: ReceiptRow[];

  handleRowChange: (
    id: number,
    field: keyof ReceiptRow,
    value: string | boolean
  ) => void;

  /*
   * Parent owns navigation.
   * This avoids focus loops.
   */
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

  costCenters?: CostCenter[];
}

/* =========================================================
   TABLE REF
========================================================= */

export interface ReceiptTableRef {
  focusFirstAccountId: () => void;

  focusField: (
    rowIndex: number,
    field: TableField
  ) => void;
}

/* =========================================================
   DROPDOWN INDICATOR
========================================================= */

interface CustomDropdownIndicatorProps
  extends DropdownIndicatorProps<
    AccountOption,
    false
  > {
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

/* =========================================================
   ACCOUNT OPTION
========================================================= */

interface AccountOptionProps
  extends OptionProps<
    AccountOption,
    false
  > {
  displayMode:
    | "id"
    | "name";
}

const AccountDropdownOption = ({
  displayMode,
  ...props
}: AccountOptionProps) => {

  return (
    <components.Option {...props}>

      <div className="account-dropdown-row">

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

/* =========================================================
   ACCOUNT MENU
========================================================= */

interface AccountMenuListProps
  extends MenuListProps<
    AccountOption,
    false
  > {
  displayMode:
    | "id"
    | "name";
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

/* =========================================================
   ACCOUNT FILTER
========================================================= */

const accountFilterOption = (
  option: {
    label: string;
    value: string;
    data: AccountOption;
  },
  inputValue: string
) => {

  const search =
    inputValue
      .toLowerCase()
      .trim();

  if (!search) {
    return true;
  }

  return (
    option.data.accountId
      .toLowerCase()
      .includes(search) ||
    option.data.accountName
      .toLowerCase()
      .includes(search)
  );
};

/* =========================================================
   NORMAL FILTER
========================================================= */

const selectFilterOption = (
  option: {
    label: string;
    value: string;
    data: SelectOption;
  },
  inputValue: string
) => {

  const search =
    inputValue
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
   ROW REF
========================================================= */

type RowRefValue =
  | SelectInstance<
      AccountOption,
      false
    >
  | SelectInstance<
      SelectOption,
      false
    >
  | HTMLInputElement
  | HTMLButtonElement
  | null;

type RowRefs = Partial<
  Record<
    TableField,
    RowRefValue
  >
>;

/* =========================================================
   ROW PROPS
========================================================= */

interface ReceiptRowProps {
  url: string;

  row: ReceiptRow;

  index: number;

  isSelected: boolean;

  realAccountOptions: AccountOption[];

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
}

/* =========================================================
   RECEIPT ROW
========================================================= */

const ReceiptRow = memo(
  ({
    url,
    row,
    index,
    isSelected,
    realAccountOptions,
    ccIdOptions,
    setSelectedRowId,
    setRowRef,
    handleRowChange,
    onFieldEnter,
    onTableEscape,
    onClearRow,
  }: ReceiptRowProps) => {

    /* =====================================================
       MENU REFS
    ===================================================== */

    const accountIdMenuOpenRef =
      useRef(false);

    const accountNameMenuOpenRef =
      useRef(false);

    const divisionMenuOpenRef =
      useRef(false);

    const ccIdMenuOpenRef =
      useRef(false);

    /* =====================================================
       DIVISIONS
    ===================================================== */

    const [
      divisions,
      setDivisions,
    ] = useState<
      CustomerDivision[]
    >([]);

    const [
      divisionLoading,
      setDivisionLoading,
    ] = useState(false);

    /* =====================================================
       GET DIVISIONS
    ===================================================== */

    const fetchDivisions =
      useCallback(
        async (
          accountId: string
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

          setDivisionLoading(
            true
          );

          try {

            const response =
              await fetch(
                "http://localhost:5000/api/getCustomerDivisions",
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
              (await response.json()) as
                CustomerDivisionResponse;

            if (
              result.success &&
              Array.isArray(
                result.data
              )
            ) {

              setDivisions(
                result.data
              );

              handleRowChange(
                row.id,
                "hasDivision",
                result.data.length > 0
              );

              if (
                result.data.length === 1
              ) {

                handleRowChange(
                  row.id,
                  "division",
                  result.data[0].fdivid
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

            setDivisionLoading(
              false
            );

          }

        },
        [
          row.id,
          handleRowChange,
        ]
      );

    /* =====================================================
       DIVISION OPTIONS
    ===================================================== */

    const divisionOptions =
      useMemo<
        SelectOption[]
      >(
        () =>
          divisions.map(
            (
              division
            ) => ({
              value:
                division.fdivid,

              label:
                division.fdivname,
            })
          ),
        [divisions]
      );

    /* =====================================================
       SELECTED ACCOUNT
    ===================================================== */

    const selectedAccount =
      useMemo(
        () =>
          realAccountOptions.find(
            (
              account
            ) =>
              account.accountId ===
              row.accountId
          ) || null,
        [
          realAccountOptions,
          row.accountId,
        ]
      );

    /* =====================================================
       ACCOUNT NAME
    ===================================================== */

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

      }, [
        selectedAccount,
      ]);

    /* =====================================================
       SELECTED DIVISION
    ===================================================== */

    const selectedDivision =
      useMemo(
        () =>
          divisionOptions.find(
            (
              option
            ) =>
              option.value ===
              row.division
          ) || null,
        [
          divisionOptions,
          row.division,
        ]
      );

    /* =====================================================
       SELECTED CC
    ===================================================== */

    const selectedCcId =
      useMemo(
        () =>
          ccIdOptions.find(
            (
              option
            ) =>
              option.value ===
              row.ccId
          ) || null,
        [
          ccIdOptions,
          row.ccId,
        ]
      );

    /* =====================================================
       ACCOUNT CHANGE
       
       NO DUPLICATE VALIDATION.
    ===================================================== */

    const handleAccountChange =
      useCallback(
        async (
          option: AccountOption
        ) => {

          setSelectedRowId(
            row.id
          );

          /*
           * Account ID
           */
          handleRowChange(
            row.id,
            "accountId",
            option.accountId
          );

          /*
           * Account Name
           */
          handleRowChange(
            row.id,
            "accountName",
            option.accountName
          );

          /*
           * FGCS
           */
          handleRowChange(
            row.id,
            "fgcs",
            option.fgcs
          );

          /*
           * fhavecc
           */
          handleRowChange(
            row.id,
            "haveCc",
            option.haveCc
          );

          /*
           * Clear old division.
           */
          handleRowChange(
            row.id,
            "division",
            ""
          );

          /*
           * Clear old CC.
           */
          handleRowChange(
            row.id,
            "ccId",
            ""
          );

          /*
           * Load divisions.
           */
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

    /* =====================================================
       SELECT KEY DOWN
    ===================================================== */

    const handleSelectKeyDown =
      useCallback(
        (
          event: React.KeyboardEvent,
          field: TableField,
          menuOpenRef:
            React.MutableRefObject<boolean>
        ) => {

          /*
           * CTRL + DELETE
           */
          if (
            event.key === "Delete" &&
            event.ctrlKey
          ) {

            event.preventDefault();
            event.stopPropagation();

            onClearRow(
              row.id
            );

            return;
          }

          /*
           * ESC
           */
          if (
            event.key === "Escape"
          ) {

            if (
              menuOpenRef.current
            ) {
              return;
            }

            event.preventDefault();
            event.stopPropagation();

            onTableEscape();

            return;
          }

          /*
           * Only Enter and Tab.
           */
          if (
            event.key !== "Enter" &&
            event.key !== "Tab"
          ) {
            return;
          }

          /*
           * Menu open:
           * react-select handles selection.
           */
          if (
            menuOpenRef.current
          ) {
            return;
          }

          event.preventDefault();
          event.stopPropagation();

          /*
           * DIRECT PARENT CALLBACK.
           *
           * No document event.
           */
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

    /* =====================================================
       NORMAL INPUT KEY DOWN
    ===================================================== */

    const handleControlKeyDown =
      useCallback(
        (
          event: React.KeyboardEvent,
          field: TableField
        ) => {

          /*
           * CTRL + DELETE
           */
          if (
            event.key === "Delete" &&
            event.ctrlKey
          ) {

            event.preventDefault();
            event.stopPropagation();

            onClearRow(
              row.id
            );

            return;
          }

          /*
           * ESC
           */
          if (
            event.key === "Escape"
          ) {

            event.preventDefault();
            event.stopPropagation();

            onTableEscape();

            return;
          }

          /*
           * ENTER / TAB
           */
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

    /* =====================================================
       MENU OPEN/CLOSE
    ===================================================== */

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

    /* =====================================================
       ACCOUNT ID INDICATOR
    ===================================================== */

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
            showArrow={
              isSelected
            }
          />
        ),
        [isSelected]
      );

    /* =====================================================
       ACCOUNT NAME INDICATOR
    ===================================================== */

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
            showArrow={
              isSelected
            }
          />
        ),
        [isSelected]
      );

    /* =====================================================
       NORMAL INDICATOR
    ===================================================== */

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

    /* =====================================================
       ROW
    ===================================================== */

    return (

      <tr
        className={
          isSelected
            ? "receipt-row-selected"
            : ""
        }
        onClick={() =>
          setSelectedRowId(
            row.id
          )
        }
      >

        {/* =================================================
            SL
        ================================================= */}

        <td className="receipt-cell serial-cell">
          {index + 1}
        </td>

        {/* =================================================
            ACCOUNT ID
        ================================================= */}

        <td className="receipt-cell">

          <Select<
            AccountOption,
            false
          >

            inputId={
              `lkpAccountId-${row.id}`
            }

            ref={(instance) =>
              setRowRef(
                index,
                "accountId",
                instance
              )
            }

            value={
              selectedAccount
            }

            onKeyDown={(event) =>
              handleSelectKeyDown(
                event,
                "accountId",
                accountIdMenuOpenRef
              )
            }

            onMenuOpen={
              handleAccountIdMenuOpen
            }

            onMenuClose={
              handleAccountIdMenuClose
            }

            onChange={(
              option: SingleValue<
                AccountOption
              >
            ) => {

              if (!option) {
                return;
              }

              handleAccountChange(
                option
              );

            }}

            options={
              realAccountOptions
            }

            placeholder=""

            styles={
              accountDropdownStyles
            }

            components={{

              DropdownIndicator:
                RowAccountIdIndicator,

              Option: (
                props
              ) => (
                <AccountDropdownOption
                  {...props}
                  displayMode="id"
                />
              ),

              MenuList: (
                props
              ) => (
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

            tabSelectsValue={false}

            noOptionsMessage={() =>
              "No Account Found"
            }

          />

        </td>

        {/* =================================================
            ACCOUNT NAME
        ================================================= */}

        <td className="receipt-cell">

          <Select<
            AccountOption,
            false
          >

            inputId={
              `lkpAccountName-${row.id}`
            }

            ref={(instance) =>
              setRowRef(
                index,
                "accountName",
                instance
              )
            }

            value={
              selectedAccountName
            }

            onKeyDown={(event) =>
              handleSelectKeyDown(
                event,
                "accountName",
                accountNameMenuOpenRef
              )
            }

            onMenuOpen={
              handleAccountNameMenuOpen
            }

            onMenuClose={
              handleAccountNameMenuClose
            }

            onChange={(
              option: SingleValue<
                AccountOption
              >
            ) => {

              if (!option) {
                return;
              }

              handleAccountChange(
                option
              );

            }}

            options={
              realAccountOptions
            }

            placeholder=""

            styles={
              accountDropdownStyles
            }

            components={{

              DropdownIndicator:
                RowAccountNameIndicator,

              Option: (
                props
              ) => (
                <AccountDropdownOption
                  {...props}
                  displayMode="name"
                />
              ),

              MenuList: (
                props
              ) => (
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

            /*
             * NEVER disable Account Name
             * based on fhavecc.
             */
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

            tabSelectsValue={false}

            noOptionsMessage={() =>
              "No Account Found"
            }

          />

        </td>

        {/* =================================================
            DIVISION
        ================================================= */}

        <td className="receipt-cell">

          <Select<
            SelectOption,
            false
          >

            inputId={
              `lkpDivision-${row.id}`
            }

            ref={(instance) =>
              setRowRef(
                index,
                "division",
                instance
              )
            }

            value={
              selectedDivision
            }

            onKeyDown={(event) =>
              handleSelectKeyDown(
                event,
                "division",
                divisionMenuOpenRef
              )
            }

            onMenuOpen={
              handleDivisionMenuOpen
            }

            onMenuClose={
              handleDivisionMenuClose
            }

            onChange={(
              option: SingleValue<
                SelectOption
              >
            ) => {

              handleRowChange(
                row.id,
                "division",
                option?.value || ""
              );

              setSelectedRowId(
                row.id
              );

            }}

            options={
              divisionOptions
            }

            placeholder=""

            styles={
              selectStyles
            }

            components={{
              DropdownIndicator:
                RowNormalDropdownIndicator,
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

        {/* =================================================
            CC ID
        ================================================= */}

        <td className="receipt-cell">

          <Select<
            SelectOption,
            false
          >

            inputId={
              `lkpCCId-${row.id}`
            }

            ref={(instance) =>
              setRowRef(
                index,
                "ccId",
                instance
              )
            }

            value={
              selectedCcId
            }

            onKeyDown={(event) =>
              handleSelectKeyDown(
                event,
                "ccId",
                ccIdMenuOpenRef
              )
            }

            onMenuOpen={
              handleCcMenuOpen
            }

            onMenuClose={
              handleCcMenuClose
            }

            onChange={(
              option: SingleValue<
                SelectOption
              >
            ) => {

              handleRowChange(
                row.id,
                "ccId",
                option?.value || ""
              );

              setSelectedRowId(
                row.id
              );

            }}

            options={
              ccIdOptions
            }

            placeholder=""

            styles={
              selectStyles
            }

            components={{
              DropdownIndicator:
                RowNormalDropdownIndicator,
            }}

            isSearchable

            isClearable={false}

            /*
             * fhavecc === true:
             *     CC ID enabled
             *
             * fhavecc === false:
             *     CC ID disabled
             */
            isDisabled={
              !row.haveCc
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

        {/* =================================================
            CREDIT AMOUNT
        ================================================= */}

        <td className="receipt-cell">

          <input

            id={
              `txtCreditAmt-${row.id}`
            }

            ref={(element) =>
              setRowRef(
                index,
                "creditAmount",
                element
              )
            }

            type="number"

            min="0"

            step="0.01"

            value={
              row.creditAmount
            }

            onChange={(event) =>
              handleRowChange(
                row.id,
                "creditAmount",
                event.target.value
              )
            }

            onFocus={() =>
              setSelectedRowId(
                row.id
              )
            }

            onKeyDown={(event) =>
              handleControlKeyDown(
                event,
                "creditAmount"
              )
            }

            className="receipt-grid-input"

          />

        </td>

        {/* =================================================
            MATCH
        ================================================= */}

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

              checked={
                row.match
              }

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

        {/* =================================================
            VIEW
        ================================================= */}

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

const ReceiptTable =
  forwardRef<
    ReceiptTableRef,
    ReceiptTableProps
  >(
    (
      {
        rows,
        url,
        handleRowChange,
        onFieldEnter,
        onTableEscape,
        onClearRow,
        onSortRows,
        accountOptions = [],
        costCenters = [],
      },
      ref
    ) => {

      /* =====================================================
         SELECTED ROW
      ===================================================== */

      const [
        selectedRowId,
        setSelectedRowIdState,
      ] =
        useState<
          number | null
        >(null);

      /* =====================================================
         SORT
      ===================================================== */

      const [
        sortField,
        setSortField,
      ] =
        useState<
          SortField | null
        >(null);

      const [
        sortDirection,
        setSortDirection,
      ] =
        useState<
          "asc" | "desc"
        >("asc");

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

            setSortField(
              field
            );

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

      /* =====================================================
         ROW REFS
      ===================================================== */

      const rowRefs =
        useRef<RowRefs[]>([]);

      /* =====================================================
         SELECTED ROW
      ===================================================== */

      const setSelectedRowId =
        useCallback(
          (
            id: number
          ) => {

            setSelectedRowIdState(
              id
            );

          },
          []
        );

      /* =====================================================
         SET REF
      ===================================================== */

      const setRowRef =
        useCallback(
          (
            rowIndex: number,
            field: TableField,
            value: RowRefValue
          ) => {

            if (
              !rowRefs.current[
                rowIndex
              ]
            ) {

              rowRefs.current[
                rowIndex
              ] = {};

            }

            if (value) {

              rowRefs.current[
                rowIndex
              ][field] = value;

            } else {

              delete rowRefs.current[
                rowIndex
              ][field];

            }

          },
          []
        );

      /* =====================================================
         ACCOUNT OPTIONS
      ===================================================== */

      const realAccountOptions =
        useMemo<
          AccountOption[]
        >(
          () => {

            if (
              !Array.isArray(
                accountOptions
              )
            ) {
              return [];
            }

            return accountOptions
              .filter(
                (
                  account
                ) =>
                  Boolean(
                    account &&
                    account.faccountid
                  )
              )
              .map(
                (
                  account
                ) => ({

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
          [
            accountOptions,
          ]
        );

      /* =====================================================
         CC OPTIONS
      ===================================================== */

      const ccIdOptions =
        useMemo<
          SelectOption[]
        >(
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
                (
                  first,
                  second
                ) =>
                  first.fpositionno -
                  second.fpositionno
              )
              .map(
                (
                  costCenter
                ) => ({

                  value:
                    costCenter.fccid,

                  label:
                    costCenter.fccid,

                })
              );

          },
          [
            costCenters,
          ]
        );

      /* =====================================================
         FOCUS FIELD
      ===================================================== */

      const focusField =
        useCallback(
          (
            rowIndex: number,
            field: TableField
          ) => {

            const element =
              rowRefs.current[
                rowIndex
              ]?.[field];

            if (!element) {

              console.warn(
                "ReceiptTable field not found:",
                rowIndex,
                field
              );

              return;
            }

            requestAnimationFrame(
              () => {

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

              }
            );

          },
          []
        );

      /* =====================================================
         IMPERATIVE HANDLE
      ===================================================== */

      useImperativeHandle(
        ref,
        () => ({

          focusFirstAccountId:
            () => {

              focusField(
                0,
                "accountId"
              );

            },

          focusField,

        }),
        [
          focusField,
        ]
      );

      /* =====================================================
         RETURN
      ===================================================== */

      return (

        <div className="receipt-table-wrapper">

          <table
            id="tblReceipt"
            className="receipt-table"
          >

            <colgroup>

              <col
                style={{
                  width: "38px",
                }}
              />

              <col
                style={{
                  width: "105px",
                }}
              />

              <col
                style={{
                  width: "auto",
                }}
              />

              <col
                style={{
                  width: "75px",
                }}
              />

              <col
                style={{
                  width: "75px",
                }}
              />

              <col
                style={{
                  width: "100px",
                }}
              />

              <col
                style={{
                  width: "60px",
                }}
              />

              <col
                style={{
                  width: "60px",
                }}
              />

            </colgroup>

            <thead>

              <tr>

                <th>
                  Sl.
                </th>

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

                <th>
                  Division
                </th>

                <th>
                  CC. ID
                </th>

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
                (
                  row,
                  index
                ) => (

                  <ReceiptRow

                    key={
                      row.id
                    }

                    url={
                      url
                    }

                    row={
                      row
                    }

                    index={
                      index
                    }

                    isSelected={
                      selectedRowId ===
                      row.id
                    }

                    realAccountOptions={
                      realAccountOptions
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

export default ReceiptTable;