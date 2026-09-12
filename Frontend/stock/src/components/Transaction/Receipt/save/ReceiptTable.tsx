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

import "./commanReceipt.css"

/* =========================================================
   TYPES
========================================================= */

export interface ReceiptRow {
  id: number;
  accountId: string;
  accountName: string;
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
}

/* =========================================================
   SELECT OPTIONS
========================================================= */

interface AccountOption {
  value: string;
  label: string;
  accountId: string;
  accountName: string;
}

interface SelectOption {
  value: string;
  label: string;
}

/* =========================================================
   CUSTOMER DIVISION API RESPONSE
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

/* =========================================================
   ACCOUNT DROPDOWN OPTION
========================================================= */

interface AccountOptionProps
  extends OptionProps<AccountOption, false> {
  displayMode: "id" | "name";
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
   ACCOUNT MENU LIST
========================================================= */

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
  const search = inputValue
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
   ROW REF
========================================================= */

type RowRefValue =
  | SelectInstance<AccountOption, false>
  | SelectInstance<SelectOption, false>
  | HTMLInputElement
  | HTMLButtonElement
  | null;

type RowRefs = Partial<
  Record<TableField, RowRefValue>
>;

/* =========================================================
   RECEIPT ROW PROPS
========================================================= */

interface ReceiptRowProps {
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
}

/* =========================================================
   RECEIPT ROW
========================================================= */

const ReceiptRow = memo(
  ({
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
  }: ReceiptRowProps) => {
    /* =====================================================
       MENU OPEN REFS
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
       DIVISION STATE

       Each ReceiptRow owns its own divisions.
    ===================================================== */

    const [
      divisions,
      setDivisions,
    ] = useState<CustomerDivision[]>(
      []
    );

    const [
      divisionLoading,
      setDivisionLoading,
    ] = useState(false);

    /* =====================================================
       FETCH CUSTOMER DIVISIONS

       IMPORTANT:

       API expects:

       {
         customerid: accountId
       }

       NOT:

       {
         accountId: accountId
       }
    ===================================================== */

    const fetchDivisions =
      useCallback(
        async (accountId: string) => {
          if (!accountId) {
            setDivisions([]);

            setDivisionLoading(
              false
            );

            handleRowChange(
              row.id,
              "division",
              ""
            );

            return;
          }

          console.log(
            "================================="
          );

          console.log(
            "GET CUSTOMER DIVISIONS"
          );

          console.log(
            "ROW ID:",
            row.id
          );

          console.log(
            "CUSTOMER ID:",
            accountId
          );

          console.log(
            "================================="
          );

          setDivisionLoading(true);

          /* Clear old division list */
          setDivisions([]);

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

            console.log(
              "Division API Status:",
              response.status
            );

            if (!response.ok) {
              throw new Error(
                `HTTP Error: ${response.status}`
              );
            }

            const result =
              (await response.json()) as CustomerDivisionResponse;

            console.log(
              "Division API Response:",
              result
            );

            /* =================================================
               SUCCESS
            ================================================= */

            if (
              result.success &&
              Array.isArray(
                result.data
              )
            ) {
              console.log(
                "Divisions:",
                result.data
              );

              setDivisions(
                result.data
              );

              /* =================================================
                 ONE DIVISION

                 Automatically select it.
              ================================================= */

              if (
                result.data.length ===
                1
              ) {
                const firstDivision =
                  result.data[0];

                console.log(
                  "Auto selecting division:",
                  firstDivision
                );

                handleRowChange(
                  row.id,
                  "division",
                  firstDivision.fdivid
                );
              }

              /* =================================================
                 MULTIPLE DIVISIONS

                 User selects manually.
              ================================================= */

              else if (
                result.data.length > 1
              ) {
                handleRowChange(
                  row.id,
                  "division",
                  ""
                );
              }

              /* =================================================
                 ZERO DIVISIONS
              ================================================= */

              else {
                handleRowChange(
                  row.id,
                  "division",
                  ""
                );
              }
            } else {
              console.warn(
                "Invalid division response:",
                result
              );

              setDivisions([]);

              handleRowChange(
                row.id,
                "division",
                ""
              );
            }
          } catch (error) {
            console.error(
              "Get Customer Divisions API Error:",
              error
            );

            setDivisions([]);

            handleRowChange(
              row.id,
              "division",
              ""
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
  useMemo<SelectOption[]>(
    () =>
      divisions.map((division) => ({
        value: division.fdivid,
        label: division.fdivname,
      })),
    [divisions]
  );

    /* =====================================================
       SELECTED ACCOUNT
    ===================================================== */

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

    /* =====================================================
       ACCOUNT ID VALUE
    ===================================================== */

    const selectedAccountId =
      selectedAccount;

    /* =====================================================
       ACCOUNT NAME VALUE
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
        };
      }, [selectedAccount]);

    /* =====================================================
       SELECTED DIVISION
    ===================================================== */

    const selectedDivision =
      useMemo(
        () =>
          divisionOptions.find(
            (option) =>
              option.value ===
              row.division
          ) || null,
        [
          divisionOptions,
          row.division,
        ]
      );

    /* =====================================================
       SELECTED CC ID
    ===================================================== */

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

    /* =====================================================
       ACCOUNT CHANGE
    ===================================================== */

    const handleAccountChange =
      useCallback(
        async (
          option: AccountOption
        ) => {
          const accountId =
            option.accountId;

          const accountName =
            option.accountName;

          console.log(
            "================================="
          );

          console.log(
            "ACCOUNT SELECTED"
          );

          console.log(
            "ROW ID:",
            row.id
          );

          console.log(
            "ACCOUNT ID:",
            accountId
          );

          console.log(
            "ACCOUNT NAME:",
            accountName
          );

          console.log(
            "================================="
          );

          /* =================================================
             SELECT ROW
          ================================================= */

          setSelectedRowId(
            row.id
          );

          /* =================================================
             SET ACCOUNT ID
          ================================================= */

          handleRowChange(
            row.id,
            "accountId",
            accountId
          );

          /* =================================================
             SET ACCOUNT NAME
          ================================================= */

          handleRowChange(
            row.id,
            "accountName",
            accountName
          );

          /* =================================================
             CLEAR OLD DIVISION
          ================================================= */

          handleRowChange(
            row.id,
            "division",
            ""
          );

          /* =================================================
             LOAD CUSTOMER DIVISIONS

             accountId -> customerid
          ================================================= */

          await fetchDivisions(
            accountId
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
          /* =================================================
             ESC
          ================================================= */

          if (
            event.key ===
            "Escape"
          ) {
            /*
             * If react-select menu is open,
             * allow react-select to close it.
             */

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

          /* =================================================
             ENTER
          ================================================= */

          if (
            event.key !==
            "Enter"
          ) {
            return;
          }

          /*
           * If dropdown is open,
           * react-select handles Enter.
           */

          if (
            menuOpenRef.current
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
          onFieldEnter,
          onTableEscape,
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
          /* =================================================
             ESC
          ================================================= */

          if (
            event.key ===
            "Escape"
          ) {
            event.preventDefault();
            event.stopPropagation();

            onTableEscape();

            return;
          }

          /* =================================================
             ENTER
          ================================================= */

          if (
            event.key !==
            "Enter"
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
          onFieldEnter,
          onTableEscape,
        ]
      );

    /* =====================================================
       ROW CLICK
    ===================================================== */

    const handleRowClick =
      useCallback(() => {
        setSelectedRowId(
          row.id
        );
      }, [
        row.id,
        setSelectedRowId,
      ]);

    /* =====================================================
       ACCOUNT ID MENU OPEN
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

    /* =====================================================
       ACCOUNT ID MENU CLOSE
    ===================================================== */

    const handleAccountIdMenuClose =
      useCallback(() => {
        accountIdMenuOpenRef.current =
          false;
      }, []);

    /* =====================================================
       ACCOUNT NAME MENU OPEN
    ===================================================== */

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

    /* =====================================================
       ACCOUNT NAME MENU CLOSE
    ===================================================== */

    const handleAccountNameMenuClose =
      useCallback(() => {
        accountNameMenuOpenRef.current =
          false;
      }, []);

    /* =====================================================
       DIVISION MENU OPEN
    ===================================================== */

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

    /* =====================================================
       DIVISION MENU CLOSE
    ===================================================== */

    const handleDivisionMenuClose =
      useCallback(() => {
        divisionMenuOpenRef.current =
          false;
      }, []);

    /* =====================================================
       CC MENU OPEN
    ===================================================== */

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

    /* =====================================================
       CC MENU CLOSE
    ===================================================== */

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
            showArrow={isSelected}
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
            showArrow={isSelected}
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
       RETURN ROW
    ===================================================== */

    return (
      <tr
        onClick={handleRowClick}
        className={
          isSelected
            ? "receipt-row-selected"
            : ""
        }
      >
        {/* =================================================
            SERIAL NUMBER

            IMPORTANT:
            This uses index only for display.
            The actual row identity is row.id.
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
            ref={(instance) =>
              setRowRef(
                index,
                "accountId",
                instance
              )
            }
            value={
              selectedAccountId
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
              option: SingleValue<AccountOption>
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
              option: SingleValue<AccountOption>
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
              option: SingleValue<SelectOption>
            ) => {
              const divisionId =
                option?.value || "";

              console.log(
                "DIVISION SELECTED",
                {
                  rowId: row.id,
                  divisionId,
                  divisionName:
                    option?.label,
                }
              );

              handleRowChange(
                row.id,
                "division",
                divisionId
              );

              setSelectedRowId(
                row.id
              );
            }}
            options={
              divisionOptions
            }
            placeholder=""
            styles={selectStyles}
            components={{
              DropdownIndicator:
                RowNormalDropdownIndicator,
            }}
            isSearchable
            isClearable={false}
            isDisabled={
              !row.accountId ||
              divisionLoading
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
            noOptionsMessage={() => {
              if (!row.accountId) {
                return "Select Account First";
              }

              if (divisionLoading) {
                return "Loading Divisions...";
              }

              return "No Division Found";
            }}
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
              option: SingleValue<SelectOption>
            ) => {
              const ccId =
                option?.value || "";

              handleRowChange(
                row.id,
                "ccId",
                ccId
              );

              setSelectedRowId(
                row.id
              );
            }}
            options={
              ccIdOptions
            }
            placeholder=""
            styles={selectStyles}
            components={{
              DropdownIndicator:
                RowNormalDropdownIndicator,
            }}
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
            onChange={(event) => {
              handleRowChange(
                row.id,
                "creditAmount",
                event.target.value
              );
            }}
            onFocus={() => {
              setSelectedRowId(
                row.id
              );
            }}
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
              onKeyDown={(event) =>
                handleControlKeyDown(
                  event,
                  "match"
                )
              }
            />
          </div>
        </td>

        {/* =================================================
            VIEW
        ================================================= */}

        <td className="receipt-cell">
          <button
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
            onKeyDown={(event) =>
              handleControlKeyDown(
                event,
                "view"
              )
            }
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
   MAIN RECEIPT TABLE
========================================================= */

const ReceiptTable = forwardRef<
  ReceiptTableRef,
  ReceiptTableProps
>(
  (
    {
      rows,
      handleRowChange,
      onFieldEnter,
      onTableEscape,
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
    ] = useState<number | null>(
      null
    );

    /* =====================================================
       ROW REFS

       IMPORTANT:
       Indexed by row index.

       The actual data ID is still row.id.
    ===================================================== */

    const rowRefs =
      useRef<RowRefs[]>([]);

    /* =====================================================
       SET SELECTED ROW
    ===================================================== */

    const setSelectedRowId =
      useCallback(
        (id: number) => {
          setSelectedRowIdState(
            id
          );
        },
        []
      );

    /* =====================================================
       SET ROW REF
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

       Converts API AccountData into react-select options.
    ===================================================== */

    const realAccountOptions =
      useMemo<AccountOption[]>(
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

                /*
                 * Account ID dropdown
                 * uses ID as the main value.
                 */

                label:
                  account.faccountid,

                accountId:
                  account.faccountid,

                accountName:
                  account.faccountname ||
                  "",
              })
            );
        },
        [accountOptions]
      );

    /* =====================================================
       COST CENTER OPTIONS
    ===================================================== */

   const ccIdOptions =
  useMemo<SelectOption[]>(
    () => {
      if (!Array.isArray(costCenters)) {
        return [];
      }

      return [...costCenters]
        .sort(
          (first, second) =>
            first.fpositionno -
            second.fpositionno
        )
        .map((costCenter) => ({
          value: costCenter.fccid,
          label: costCenter.fccid,
        }));
    },
    [costCenters]
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
              "ReceiptTable: field not found:",
              {
                rowIndex,
                field,
              }
            );

            return;
          }

          requestAnimationFrame(() => {
            element.focus();

            /*
             * Select text inside normal inputs.
             */

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

    /* =====================================================
       IMPERATIVE HANDLE
    ===================================================== */

    useImperativeHandle(
      ref,
      () => ({
        /* =================================================
           FIRST ACCOUNT ID
        ================================================= */

        focusFirstAccountId: () => {
          focusField(
            0,
            "accountId"
          );
        },

        /* =================================================
           ANY TABLE FIELD
        ================================================= */

        focusField,
      }),
      [focusField]
    );

    /* =====================================================
       RETURN
    ===================================================== */

    return (
      <div className="receipt-table-wrapper">
        <table className="receipt-table">
          {/* =================================================
              COLUMN WIDTHS
          ================================================= */}

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

          {/* =================================================
              HEADER
          ================================================= */}

          <thead>
            <tr>
              <th className="text-right">
                Sl.
              </th>

              <th>
                Account ID
              </th>

              <th>
                Account Name
              </th>

              <th>
                Division
              </th>

              <th>
                CC. ID
              </th>

              <th className="text-right">
                Credit Amount
              </th>

              <th className="text-center">
                Match
              </th>

              <th className="text-center">
                View
              </th>
            </tr>
          </thead>

          {/* =================================================
              BODY

              IMPORTANT:

              NO useMemo/useState/useEffect/useCallback
              inside this map.

              This avoids the Rules of Hooks error.
          ================================================= */}

          <tbody>
            {rows.map(
              (
                row,
                index
              ) => {
                return (
                  <ReceiptRow
                    key={row.id}
                    row={row}
                    index={index}
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
                  />
                );
              }
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