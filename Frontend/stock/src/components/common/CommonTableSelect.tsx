
import Select, {
  components,
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
  inputId?: string;
  headerFontSize?: string;
  menuPortalTarget?: HTMLElement;
  controlHeight?: number;

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
  inputId,
  headerFontSize = "13px",
  menuPortalTarget,
  controlHeight = 31,
}: CommonTableSelectProps) => {

  const gridTemplate = columns
    .map((col) => col.width || "1fr")
    .join(" ");

  // Column alignment
  const getAlignment = (align?: string) => {
    if (align === "right") return "text-right";
    if (align === "center") return "text-center";
    return "text-left";
  };

  const customComponents = {
    // DROPDOWN OPTION ROWS
    Option: (props: OptionProps<TableSelectOption, false>) => (
      <components.Option {...props}>
        <div
          className="grid items-center w-full"
          style={{
            gridTemplateColumns: gridTemplate,
            fontSize: headerFontSize,
          }}
        >
          {columns.map((col, index) => (
            <span
              key={col.key}
              className={`truncate ${getAlignment(col.align)} ${
                index > 0
                  ? "border-l border-[#D5DDE5] pl-2 ml-5"
                  : ""
              }`}
            >
              {props.data[col.key] ?? "-"}
            </span>
          ))}
        </div>
      </components.Option>
    ),

    // DROPDOWN HEADER
    MenuList: (props: MenuListProps<TableSelectOption, false>) => (
      <components.MenuList {...props}>
        <div
          className="grid items-center px-2.5 py-1.75 bg-[#F3F5F7] border-b border-[#D5DDE5] font-semibold text-[#334155]"
          style={{
            gridTemplateColumns: gridTemplate,
            fontSize: headerFontSize,
          }}
        >
          {columns.map((col, index) => (
            <span
              key={col.key}
              className={`truncate ${getAlignment(col.align)} ${
                index > 0
                  ? "border-l border-[#D5DDE5] pl-2 ml-5"
                  : ""
              }`}
            >
              {col.label}
            </span>
          ))}
        </div>

        {props.children}
      </components.MenuList>
    ),
  };

  const styles: StylesConfig<TableSelectOption, false> = {
    control: (base) => ({
      ...base,
      minHeight: `${controlHeight}px`,
      height: `${controlHeight}px`,
      width: width,
      borderColor: "#CBD5E1",
      borderRadius: "4px",
      boxShadow: "none",
      fontSize: "13px",
      "&:hover": {
        borderColor: "#94A3B8",
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
      width: menuWidth,
      minWidth: menuWidth,
      marginTop: "4px",
      borderRadius: "4px",
      border: "1px solid #E5E7EB",
      boxShadow: "0 4px 10px rgba(0,0,0,0.12)",
      zIndex: 100000,
      overflow: "hidden",
    }),

    menuPortal: (base) => ({
      ...base,
      zIndex: 100000,
    }),

    menuList: (base) => ({
      ...base,
      padding: 0,
      maxHeight: "220px",
    }),

    option: (base, state) => ({
      ...base,
      padding: "7px 10px",
      fontSize: "13px",
      color: "#334155",
      backgroundColor: state.isSelected
        ? "#EAF7F0"
        : state.isFocused
          ? "#F0F8F4"
          : "#FFFFFF",
      cursor: "pointer",
      borderBottom: "1px solid #E5E7EB",
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

export default CommonTableSelect;
