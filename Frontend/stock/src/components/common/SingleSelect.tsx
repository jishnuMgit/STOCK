
import {
  createContext,
  useContext,
  useRef,
  type CSSProperties,
  type ComponentType,
  type ReactNode,
} from "react";
import Select, {
  type DropdownIndicatorProps,
  type Props as ReactSelectProps,
  type SingleValue,
  type StylesConfig,
} from "react-select";
import selectComponents from './selectComponents'
import {
  AccountDropdownSingleValue,
  AccountDropdownOption,
  AccountDropdownMenuList,
} from "../../components/Transaction/Receipt/save/ReceiptComp";
import type { AccountOption } from "../../types/receiptypes";

interface SelectOption {
  label: string;
  value: string;
}

export type MenuColumnWidth =
  | `${number}px`
  | `${number}%`
  | `${number}fr`;

const MenuColumnWidthsContext = createContext<
  readonly MenuColumnWidth[] | undefined
>(undefined);

export const SingleSelectMenuColumns = ({
  children,
  className,
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) => {
  const columnWidths = useContext(MenuColumnWidthsContext);

  return (
    <div
      className={className}
      style={{
        display: "grid",
        gridTemplateColumns: columnWidths
          ?.map((width) => `minmax(0, ${width})`)
          .join(" "),
        width: "100%",
        minWidth: 0,
        overflow: "hidden",
        boxSizing: "border-box",
        ...style,
      }}
    >
      {children}
    </div>
  );
};

interface AccountSelectProps {
  row: any;
  index: number;

  selectedAccount: AccountOption | null;

  isAccountIdEditing: boolean;
  setIsAccountIdEditing: (value: boolean) => void;

  accountIdSearchText: string;
  setAccountIdSearchText: (value: string) => void;

  accountIdOptions: AccountOption[];

  accountIdMenuLayout: {
    placement: "top" | "bottom";
    maxHeight: number;
  };

  setAccountIdMenuLayout: (value: any) => void;

  setRowRef: (
    index: number,
    field: string,
    instance: any
  ) => void;

  handleAccountChange: (option: AccountOption) => void;

  handleAccountIdMenuOpen: () => void;
  handleAccountIdMenuClose: () => void;

  handleEditableSelectBackspace: (
    ...args: any[]
  ) => boolean;

  handleSelectKeyDown: (
    ...args: any[]
  ) => void;

  getMenuLayout: (id: string) => any;

  accountFilterOption: any;
  accountDropdownStyles: any;

  accountIdMenuOpenRef: any;

  accountIdDropdownIndicator: ComponentType<
    DropdownIndicatorProps<AccountOption, false>
  >;
}

type SingleSelectProps<Option extends SelectOption> =
  | AccountSelectProps
  | {
      mode: "item";
      selectProps: ReactSelectProps<Option, false>;
      menuColumnWidths?: readonly MenuColumnWidth[];
      menuWidth?: string | number;
    };

const SingleSelect = <Option extends SelectOption = AccountOption>(
  props: SingleSelectProps<Option>,
) => {
  const accountIdSelectRef = useRef<any>(null);

  if ("mode" in props) {
    const { menuColumnWidths, menuWidth, selectProps } = props;
    const itemSelectProps =
      menuWidth === undefined
        ? selectProps
        : {
            ...selectProps,
            styles: {
              ...selectProps.styles,
              menu: (base, state) => ({
                ...selectProps.styles?.menu?.(base, state),
                width: menuWidth,
                minWidth: menuWidth,
                maxWidth: menuWidth,
              }),
            } satisfies StylesConfig<Option, false>,
          };

    return (
      <MenuColumnWidthsContext.Provider value={menuColumnWidths}>
        <Select<Option, false> {...itemSelectProps} />
      </MenuColumnWidthsContext.Provider>
    );
  }

  const {
    row,
    index,
    selectedAccount,
    isAccountIdEditing,
    setIsAccountIdEditing,
    accountIdSearchText,
    setAccountIdSearchText,
    accountIdOptions,
    accountIdMenuLayout,
    setAccountIdMenuLayout,
    setRowRef,
    handleAccountChange,
    handleAccountIdMenuOpen,
    handleAccountIdMenuClose,
    handleEditableSelectBackspace,
    handleSelectKeyDown,
    getMenuLayout,
    accountFilterOption,
    accountDropdownStyles,
    accountIdMenuOpenRef,
    accountIdDropdownIndicator,
  } = props;

  const inputId = `lkpAccountId-${row.id}`;

  return (
    <Select<AccountOption, false>
      inputId={inputId}
      ref={(instance) => {
        accountIdSelectRef.current = instance;

        setRowRef(index, "accountId", instance);
      }}
      value={isAccountIdEditing ? null : selectedAccount}
      inputValue={accountIdSearchText}
      onInputChange={(newValue, actionMeta) => {
        if (actionMeta.action === "input-change") {
          setAccountIdSearchText(newValue);
          setIsAccountIdEditing(true);
        }

        return newValue;
      }}
      backspaceRemovesValue={false}
      onKeyDown={(event) => {
        const handled = handleEditableSelectBackspace(
          event,
          selectedAccount?.label ?? "",
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
      onMenuOpen={() => {
        setAccountIdMenuLayout(
          getMenuLayout(inputId)
        );

        handleAccountIdMenuOpen();
      }}
      onMenuClose={() => {
        handleAccountIdMenuClose();
        setAccountIdSearchText("");
        setIsAccountIdEditing(false);
      }}
      onChange={(option: SingleValue<AccountOption>) => {
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
        ...selectComponents,
        DropdownIndicator: accountIdDropdownIndicator,
        SingleValue: (props) => (
          <AccountDropdownSingleValue
            {...(props as any)}
            displayMode="id"
          />
        ),
        Option: (props) => (
          <AccountDropdownOption
             {...(props as any)}
            displayMode="id"
          />
        ),

        MenuList: (props) => (
          <AccountDropdownMenuList
             {...(props as any)}
            displayMode="id"
          />
        ),
      }}
      filterOption={accountFilterOption}
      isSearchable
      isClearable={false}
      menuPlacement={accountIdMenuLayout.placement}
      menuPosition="fixed"
      maxMenuHeight={accountIdMenuLayout.maxHeight}
      menuPortalTarget={document.body}
      menuShouldScrollIntoView={false}
      captureMenuScroll={false}
      menuShouldBlockScroll={false}
      closeMenuOnSelect
      blurInputOnSelect={false}
      tabSelectsValue={false}
      noOptionsMessage={() => "No Account Found"}
    />
  );
};

export default SingleSelect;
