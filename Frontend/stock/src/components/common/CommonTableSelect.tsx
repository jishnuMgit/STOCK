import type { KeyboardEventHandler, Ref } from "react";
import Select, {
  components,
  type Props as SelectProps,
  type SelectInstance,
  type StylesConfig,
  type OptionProps,
  type MenuListProps,
} from "react-select";
import selectComponents from "./selectComponents";

export interface TableSelectOption {
  label: string;
  value: string;
  [key: string]: any;
}

interface Column {
  key: string;
  label: string;
  width?: string;
  align?: "left" | "center" | "right";
}

interface CommonTableSelectProps {
  options: TableSelectOption[];
  value: TableSelectOption | null;
  onChange: (value: TableSelectOption | null) => void;
  columns: Column[];
  placeholder?: string;
  width?: string;
  menuWidth?: string;
  isClearable?: boolean;
  isSearchable?: boolean;
  isDisabled?: boolean;
  isLoading?: boolean;
  noOptionsMessage?: () => string;
  inputId?: string;
  headerFontSize?: string;
  menuPortalTarget?: HTMLElement;
  controlHeight?: number;
  menuZIndex?: number;
  selectRef?: Ref<SelectInstance<TableSelectOption, false>>;
  onKeyDown?: KeyboardEventHandler;
  onMenuOpen?: () => void;
  onMenuClose?: () => void;
  filterOption?: SelectProps<TableSelectOption, false>["filterOption"];
  controlFontSize?: string;
  borderColor?: string;
  hoverBorderColor?: string;
  menuMaxHeight?: string;
  valueKey?: string;
}

const CommonTableSelect = ({
  options,
  value,
  onChange,
  columns,
  placeholder = "Select...",
  width = "250px",
  menuWidth = "305px",
  isClearable = false,
  isSearchable = true,
  isDisabled = false,
  isLoading = false,
  noOptionsMessage,
  inputId,
  headerFontSize = "14px",
  menuPortalTarget,
  controlHeight = 31,
  menuZIndex = 100000,
  selectRef,
  onKeyDown,
  onMenuOpen,
  onMenuClose,
  filterOption,
  borderColor = "#CBD5E1",
  hoverBorderColor = "#94A3B8",
  menuMaxHeight = "220px",
  valueKey,
}: CommonTableSelectProps) => {

  // Same column structure for header and option rows
  const gridTemplate = columns
    .map((col) => col.width || "1fr")
    .join(" ");

  const getAlignment = (align?: string) => {
    if (align === "right") return "text-right";
    if (align === "center") return "text-center";
    return "text-left";
  };

  const customComponents = {

    // OPTION ROW
    Option: (props: OptionProps<TableSelectOption, false>) => (
      <components.Option {...props}>
        <div
          className="grid w-full items-stretch"
          style={{
            gridTemplateColumns: gridTemplate,
            height: "32px",
            boxSizing: "border-box",
            padding: "0 10px",
            fontSize: headerFontSize,
          }}
        >
          {columns.map((col, index) => (
            <div
              key={col.key}
              className={`
                flex min-w-0 h-full items-center
                truncate
                ${getAlignment(col.align)}
                ${index > 0
                  ? "border-l border-[#D5DDE5] pl-2"
                  : ""
                }
              `}
              style={{
                boxSizing: "border-box",
                overflow: "hidden",
              }}
            >
              {props.data[col.key] ?? "-"}
            </div>
          ))}
        </div>
      </components.Option>
    ),

    // HEADER ROW
    MenuList: (props: MenuListProps<TableSelectOption, false>) => (
      <components.MenuList {...props}>
        <div
          className="
            grid w-full items-stretch
            bg-[#F3F5F7]
            border-b border-[#D5DDE5]
            font-semibold text-[#334155]
          "
          style={{
            gridTemplateColumns: gridTemplate,
            height: "35px",
            boxSizing: "border-box",
            padding: "0 10px",
            fontSize: headerFontSize,
          }}
        >
          {columns.map((col, index) => (
            <div
              key={col.key}
              className={`
                flex min-w-0 h-full items-center
                truncate
                ${getAlignment(col.align)}
                ${index > 0
                  ? "border-l border-[#D5DDE5] pl-2"
                  : ""
                }
              `}
              style={{
                boxSizing: "border-box",
                overflow: "hidden",
              }}
            >
              {col.label}
            </div>
          ))}
        </div>

        {props.children}
      </components.MenuList>
    ),
  };

  const styles: StylesConfig<TableSelectOption, false> = {

    // CONTROL
    control: (base) => ({
      ...base,
      minHeight: `${controlHeight}px`,
      height: `${controlHeight}px`,
      width: width,
      borderColor: borderColor,
      borderRadius: "4px",
      boxShadow: "none",
      fontSize: "14px",
      "&:hover": {
        borderColor: hoverBorderColor,
      },
    }),

    valueContainer: (base) => ({
      ...base,
      padding: "0 10px",
    }),

    indicatorsContainer: (base) => ({
      ...base,
      height: `${controlHeight - 1}px`,
    }),

    menu: (base) => ({
      ...base,
      width: menuWidth === "100%" ? "100%" : `max(100%, ${menuWidth})`,
      minWidth: "100%",
      maxWidth: "calc(100vw - 16px)",
      marginTop: "4px",
      borderRadius: "4px",
      border: "1px solid #E5E7EB",
      boxShadow: "0 4px 10px rgba(0,0,0,0.12)",
      zIndex: menuZIndex,
      overflow: "hidden",
    }),

    menuPortal: (base) => ({
      ...base,
      zIndex: menuZIndex,
    }),

    menuList: (base) => ({
      ...base,
      padding: 0,
      maxHeight: menuMaxHeight,
      overflowX: "hidden",
    }),

    // OPTION
    option: (base, state) => ({
      ...base,

      // Important: remove React Select default padding.
      // Padding is controlled inside the grid.
      padding: 0,

      height: "32px",
      minHeight: "32px",
      boxSizing: "border-box",

      fontSize: "14px",
      color: "#334155",

      backgroundColor: state.isSelected
        ? "#EAF7F0"
        : state.isFocused
          ? "#F0F8F4"
          : "#FFFFFF",

      cursor: "pointer",

      "&:active": {
        backgroundColor: "#DDF2E7",
      },
    }),

    singleValue: (base) => ({
      ...base,
      color: "#334155",
    }),
  };

  return (
    <Select<TableSelectOption, false>
      ref={selectRef}
      inputId={inputId}
      options={options}
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
      onMenuOpen={onMenuOpen}
      onMenuClose={onMenuClose}
      filterOption={filterOption}
      placeholder={placeholder}
      components={{
        ...selectComponents,
        ...customComponents,
      }}
      styles={styles}
      isClearable={isClearable}
      isSearchable={isSearchable}
      isDisabled={isDisabled}
      isLoading={isLoading}
      noOptionsMessage={noOptionsMessage}
      menuPortalTarget={menuPortalTarget}
      menuPosition={menuPortalTarget ? "fixed" : undefined}
      getOptionLabel={(option) =>
        String(valueKey ? (option[valueKey] ?? option.label) : option.label)
      }
      getOptionValue={(option) => option.value}
    />
  );
};

export default CommonTableSelect;

export const CustomTableSelect = ({
  options,
  value,
  onChange,
  columns,
  placeholder = "Select...",
  width = "250px",
  menuWidth = "305px",
  isClearable = false,
  isSearchable = true,
  isDisabled = false,
  inputId,
  headerFontSize = "14px",
  menuPortalTarget,
  controlHeight = 31,
  menuZIndex = 100000,
}: CommonTableSelectProps) => {

  // Same column structure for header and option rows
  const gridTemplate = columns
    .map((col) => col.width || "1fr")
    .join(" ");

  const getAlignment = (align?: string) => {
    if (align === "right") return "text-right";
    if (align === "center") return "text-center";
    return "text-left";
  };

  const customComponents = {

    // OPTION ROW
    Option: (props: OptionProps<TableSelectOption, false>) => (
      <components.Option {...props}>
        <div
          className="grid w-full items-stretch"
          style={{
            gridTemplateColumns: gridTemplate,
            height: "32px",
            boxSizing: "border-box",
            padding: "0 10px",
            fontSize: headerFontSize,
          }}
        >
          {columns.map((col, index) => (
            <div
              key={col.key}
              className={`
                flex min-w-0 h-full items-center
                truncate
                ${getAlignment(col.align)}
                ${index > 0 ? "border-l border-[#D5DDE5] pl-2" : ""}
              `}
              style={{
                boxSizing: "border-box",
                overflow: "hidden",
              }}
            >
              {props.data[col.key] ?? "-"}
            </div>
          ))}
        </div>
      </components.Option>
    ),

    // HEADER ROW
    MenuList: (props: MenuListProps<TableSelectOption, false>) => (
      <components.MenuList {...props}>
        <div
          className="
            grid w-full items-stretch
            bg-[#F3F5F7]
            border-b border-[#D5DDE5]
            font-semibold text-[#334155]
          "
          style={{
            gridTemplateColumns: gridTemplate,
            height: "35px",
            boxSizing: "border-box",
            padding: "0 10px",
            fontSize: headerFontSize,
          }}
        >
          {columns.map((col, index) => (
            <div
              key={col.key}
              className={`
                flex min-w-0 h-full items-center
                truncate
                ${getAlignment(col.align)}
                ${index > 0 ? "border-l border-[#D5DDE5] pl-2" : ""}
              `}
              style={{
                boxSizing: "border-box",
                overflow: "hidden",
              }}
            >
              {col.label}
            </div>
          ))}
        </div>

        {props.children}
      </components.MenuList>
    ),
  };

  const styles: StylesConfig<TableSelectOption, false> = {

    // CONTROL - TRANSPARENT BORDER
    control: (base, state) => ({
      ...base,
      minHeight: `${controlHeight}px`,
      height: `${controlHeight}px`,
      width: width,
      borderColor: "transparent",
      borderRadius: "4px",
      boxShadow: "none",
      fontSize: "14px",
      "&:hover": {
        borderColor: "transparent",
      },
      ...(state.isFocused && {
        borderColor: "transparent",
        boxShadow: "none",
      }),
    }),

    valueContainer: (base) => ({
      ...base,
      padding: "0 10px",
    }),

    indicatorsContainer: (base) => ({
      ...base,
      height: `${controlHeight - 1}px`,
    }),

    // MENU - TRANSPARENT BORDER
    menu: (base) => ({
      ...base,
      width: menuWidth,
      minWidth: menuWidth,
      marginTop: "4px",
      borderRadius: "4px",
      border: "1px solid transparent",
      boxShadow: "0 4px 10px rgba(0,0,0,0.12)",
      zIndex: menuZIndex,
      overflow: "hidden",
    }),

    menuPortal: (base) => ({
      ...base,
      zIndex: menuZIndex,
    }),

    menuList: (base) => ({
      ...base,
      padding: 0,
      maxHeight: "220px",
      overflowX: "hidden",
    }),

    // OPTION
    option: (base, state) => ({
      ...base,
      padding: 0,
      height: "32px",
      minHeight: "32px",
      boxSizing: "border-box",
      fontSize: "14px",
      color: "#334155",

      backgroundColor: state.isSelected
        ? "#EAF7F0"
        : state.isFocused
          ? "#F0F8F4"
          : "#FFFFFF",

      cursor: "pointer",

      "&:active": {
        backgroundColor: "#DDF2E7",
      },
    }),

    singleValue: (base) => ({
      ...base,
      color: "#334155",
    }),
  };

  return (
    <Select<TableSelectOption, false>
      inputId={inputId}
      options={options}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      components={{
        ...selectComponents,
        ...customComponents,
      }}
      styles={styles}
      isClearable={isClearable}
      isSearchable={isSearchable}
      isDisabled={isDisabled}
      menuPortalTarget={menuPortalTarget}
      menuPosition={menuPortalTarget ? "fixed" : undefined}
      getOptionLabel={(option) => option.label}
      getOptionValue={(option) => option.value}
    />
  );
};