import type { KeyboardEventHandler, Ref } from "react";
import Select, {
  components,
  type Props as SelectProps,
  type SelectInstance,
  type StylesConfig,
  type OptionProps,
  type MenuListProps,
  type ClearIndicatorProps,
} from "react-select";
import { X } from "lucide-react";
import selectComponents, { SELECT_FONT_FAMILY } from "./selectComponents";

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
  inputValue?: string;
  onInputChange?: SelectProps<TableSelectOption, false>["onInputChange"];
  backspaceRemovesValue?: boolean;
  blurInputOnSelect?: boolean;
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
  menuPlacement?: SelectProps<TableSelectOption, false>["menuPlacement"];
  filterOption?: SelectProps<TableSelectOption, false>["filterOption"];
  controlFontSize?: string;
  borderColor?: string;
  hoverBorderColor?: string;
  menuMaxHeight?: string;
  valueKey?: string;
  showHeader?: boolean;
  // the space left and right of the chosen text in the box, CustomTableSelect only (default "0 5px")
  valuePadding?: string;
  // the size (px) of the little x that clears the box, the same x as the one that deletes a row of a grid (12): a slate grey,
  // red on hover. Without it the box keeps react-select's own, bigger x. CommonTableSelect only.
  clearIconSize?: number;
  // the colours of the open list: "receipt" = the Receipt screen's list (grey header, thin grey lines, mint hover row)
  listLook?: "receipt";
}

const CommonTableSelect = ({
  options,
  value,
  onChange,
  inputValue,
  onInputChange,
  backspaceRemovesValue,
  blurInputOnSelect,
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
  menuPlacement = "auto", // opens upward when there is not room below (the list is tall: header + up to 10 rows)
  filterOption,
  borderColor = "#CBD5E1",
  hoverBorderColor = "#94A3B8",
  menuMaxHeight = "220px",
  valueKey,
  showHeader = true,
  listLook,
  clearIconSize,
}: CommonTableSelectProps) => {
  const receipt = listLook === "receipt";

  // Same column structure for header and option rows
  const gridTemplate = columns.map((col) => col.width || "1fr").join(" ");

  const getAlignment = (align?: string) => {
    if (align === "right") return "text-right";
    if (align === "center") return "text-center";
    return "text-left";
  };

  const customComponents = {
    // the little x that clears the box (only when the page asks for a size)
    ...(clearIconSize
      ? {
          ClearIndicator: (props: ClearIndicatorProps<TableSelectOption, false>) => (
            <components.ClearIndicator {...props}>
              <X size={clearIconSize} />
            </components.ClearIndicator>
          ),
        }
      : {}),

    // OPTION ROW
    Option: (props: OptionProps<TableSelectOption, false>) => (
      <components.Option {...props}>
        <div
          className="grid w-full items-stretch"
          style={{
            gridTemplateColumns: gridTemplate,
            height: "32px",
            boxSizing: "border-box",
            padding: 0, // padding is applied per column below
            fontSize: headerFontSize,
          }}
        >
          {columns.map((col, index) => (
            <div
              key={col.key}
              className={`
                flex min-w-0 h-full items-center
                truncate pl-0.5 pr-1.25
                ${getAlignment(col.align)}
                ${index > 0 ? (receipt ? "border-l border-[#EEEEEE]" : "border-l border-[#D5DDE5]") : ""}
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
        {showHeader && (
          <div
            className={`
              grid w-full items-stretch
              ${
                receipt
                  ? "border-b border-[#CCCCCC] bg-[#EEEEEE] font-medium text-[#222222]"
                  : "border-b border-[#D5DDE5] bg-[#F3F5F7] font-semibold text-[#334155]"
              }
            `}
            style={{
              gridTemplateColumns: gridTemplate,
              height: "35px",
              boxSizing: "border-box",
              padding: 0, // padding is applied per column below
              fontSize: headerFontSize,
            }}
          >
            {columns.map((col, index) => (
              <div
                key={col.key}
                className={`
                  flex min-w-0 h-full items-center
                  truncate pl-0.5 pr-1.25
                  ${getAlignment(col.align)}
                  ${index > 0 ? (receipt ? "border-l border-[#CCCCCC]" : "border-l border-[#D5DDE5]") : ""}
                `}
                style={{ boxSizing: "border-box", overflow: "hidden" }}
              >
                {col.label}
              </div>
            ))}
          </div>
        )}

        {props.children}
      </components.MenuList>
    ),
  };

  const styles: StylesConfig<TableSelectOption, false> = {

    // the font of the app, never the browser\'s
    container: (base) => ({
      ...base,
      fontFamily: SELECT_FONT_FAMILY,
    }),

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
      padding: "0 2px",
    }),

    indicatorsContainer: (base) => ({
      ...base,
      height: `${controlHeight - 1}px`,
    }),

    menu: (base) => ({
      ...base,
      fontFamily: SELECT_FONT_FAMILY,
      width: menuWidth === "100%" ? "100%" : `max(100%, ${menuWidth})`,
      minWidth: "100%",
      maxWidth: "calc(100vw - 16px)",
      marginTop: "4px",
      borderRadius: receipt ? 0 : "4px",
      border: receipt ? "1px solid #aaaaaa" : "1px solid #E5E7EB",
      boxShadow: receipt ? "2px 2px 5px rgba(0, 0, 0, 0.18)" : "0 4px 10px rgba(0,0,0,0.12)",
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
      // never taller than the room react-select found (above or below), nor than menuMaxHeight
      maxHeight: Math.min(Number(base.maxHeight) || parseFloat(menuMaxHeight), parseFloat(menuMaxHeight)),
      overflowX: "hidden",
    }),

    // OPTION
    option: (base, state) => ({
      ...base,

      // Important: remove React Select default padding.
      // Padding is controlled inside the grid columns.
      padding: 0,

      height: "32px",
      minHeight: "32px",
      boxSizing: "border-box",

      fontSize: "14px",
      color: "#334155",

      backgroundColor: receipt
        ? state.isFocused
          ? "#EEFBF4"
          : "#FFFFFF"
        : state.isSelected
          ? "#EAF7F0"
          : state.isFocused
            ? "#F0F8F4"
            : "#FFFFFF",

      cursor: "pointer",

      "&:active": {
        backgroundColor: receipt ? "#dff5e9" : "#DDF2E7",
      },
    }),

    ...(clearIconSize
      ? {
          clearIndicator: (base) => ({
            ...base,
            padding: "0 4px",
            color: "#94A3B8",
            cursor: "pointer",
            "&:hover": { color: "#EF4444" },
          }),
        }
      : {}),

    singleValue: (base) => ({
      ...base,
      color: "#334155",
      marginLeft: 0,
    }),

    placeholder: (base) => ({
      ...base,
      marginLeft: 0,
    }),

    input: (base) => ({
      ...base,
      margin: 0,
      padding: 0,
    }),
  };

  return (
    <Select<TableSelectOption, false>
      ref={selectRef}
      inputId={inputId}
      options={options}
      value={value}
      onChange={onChange}
      inputValue={inputValue}
      onInputChange={onInputChange}
      backspaceRemovesValue={backspaceRemovesValue}
      blurInputOnSelect={blurInputOnSelect}
      onKeyDown={onKeyDown}
      onMenuOpen={onMenuOpen}
      onMenuClose={onMenuClose}
      menuPlacement={menuPlacement}
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
      // opens upward unless the whole list fits below (react-select otherwise shrinks it into the space left below)
      minMenuHeight={parseFloat(menuMaxHeight)}
      menuShouldScrollIntoView={false}
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
  valuePadding = "0 5px",
}: CommonTableSelectProps) => {
  // Same column structure for header and option rows
  const gridTemplate = columns.map((col) => col.width || "1fr").join(" ");

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
            padding: 0, // padding is applied per column below
            fontSize: headerFontSize,
          }}
        >
          {columns.map((col, index) => (
            <div
              key={col.key}
              className={`
                flex min-w-0 h-full items-center
                truncate pl-[5px] pr-[5px]
                ${getAlignment(col.align)}
                ${index > 0 ? "border-l border-[#D5DDE5]" : ""}
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
            padding: 0, // padding is applied per column below
            fontSize: headerFontSize,
          }}
        >
          {columns.map((col, index) => (
            <div
              key={col.key}
              className={`
                flex min-w-0 h-full items-center
                truncate pl-[5px] pr-[5px]
                ${getAlignment(col.align)}
                ${index > 0 ? "border-l border-[#D5DDE5]" : ""}
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

    // the font of the app, never the browser\'s
    container: (base) => ({
      ...base,
      fontFamily: SELECT_FONT_FAMILY,
    }),

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
      padding: valuePadding,
    }),

    indicatorsContainer: (base) => ({
      ...base,
      height: `${controlHeight - 1}px`,
    }),

    // MENU - TRANSPARENT BORDER
    menu: (base) => ({
      ...base,
      fontFamily: SELECT_FONT_FAMILY,
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
      maxHeight: Math.min(Number(base.maxHeight) || 220, 220),
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
      marginLeft: 0,
    }),

    placeholder: (base) => ({
      ...base,
      marginLeft: 0,
    }),

    input: (base) => ({
      ...base,
      margin: 0,
      padding: 0,
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
      // opens upward when there is not room below (the list is tall: header + up to 10 rows), like the pair select
      menuPlacement="auto"
      minMenuHeight={220}
      menuShouldScrollIntoView={false}
      getOptionLabel={(option) => option.label}
      getOptionValue={(option) => option.value}
    />
  );
};