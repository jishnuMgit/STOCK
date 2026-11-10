import React from "react";
import Select, {
  components,
  type MenuListProps,
  type OptionProps,
  type StylesConfig,
} from "react-select";
import selectComponents from "./selectComponents";

export interface PairSelectOption {
  value: string;
  firstLabel: string;
  secondLabel: string;
}

interface CustomLinkedPairSelectProps {
  options: PairSelectOption[];
  firstValue: string | null;
  secondValue: string | null;
  onChange: (option: PairSelectOption | null) => void;
  firstHeader: string;
  secondHeader: string;
  firstWidth?: number;
  secondWidth?: number;
  gap?: number;
  firstInputId?: string;
  secondInputId?: string;
  placeholder?: string;
  headerFontSize?: string;
  optionFontSize?: string;
  isDisabled?: boolean;
  isSearchable?: boolean;
  menuPortalTarget?: HTMLElement;
  menuZIndex?: number;
}

const CustomLinkedPairSelect: React.FC<CustomLinkedPairSelectProps> = ({
  options,
  firstValue,
  secondValue,
  onChange,
  firstHeader,
  secondHeader,
  firstWidth = 120,
  secondWidth = 450,
  gap = 4,
  firstInputId,
  secondInputId,
  placeholder = "",
  headerFontSize = "12px",
  optionFontSize = "12px",
  isDisabled = false,
  isSearchable = true,
  menuPortalTarget,
  menuZIndex = 100000,
}) => {
  const menuWidth = firstWidth + gap + secondWidth;

  // The blank middle grid column preserves the physical gap between the inputs.
  const normalColumns = `${firstWidth}px ${gap}px ${secondWidth}px`;
  const reverseColumns = `${secondWidth}px ${gap}px ${firstWidth}px`;

  const selectedFirst =
    options.find((option) => option.value === firstValue) ?? null;
  const selectedSecond =
    options.find((option) => option.value === secondValue) ?? null;

  const createComponents = (reverse: boolean) => {
    const gridColumns = reverse ? reverseColumns : normalColumns;
    const firstColumnLabel = reverse ? secondHeader : firstHeader;
    const secondColumnLabel = reverse ? firstHeader : secondHeader;

    return {
      Option: (props: OptionProps<PairSelectOption, false>) => (
        <components.Option {...props}>
          <div
            className="grid w-full items-center overflow-hidden"
            style={{ gridTemplateColumns: gridColumns }}
          >
            <span
              className="min-w-0 truncate border-r border-[#E5E7EB] px-2.5 py-1.75"
              style={{ gridColumn: 1 }}
            >
              {reverse ? props.data.secondLabel : props.data.firstLabel}
            </span>
            <span
              className="min-w-0 truncate px-2.5 py-1.75"
              style={{ gridColumn: 3 }}
            >
              {reverse ? props.data.firstLabel : props.data.secondLabel}
            </span>
          </div>
        </components.Option>
      ),
      MenuList: (props: MenuListProps<PairSelectOption, false>) => (
        <components.MenuList {...props}>
          <div
            className="grid items-center border-b border-[#CBD5E1] bg-[#F3F5F7] font-semibold text-[#344054]"
            style={{
              gridTemplateColumns: gridColumns,
              fontSize: headerFontSize,
            }}
          >
            <span
              className="min-w-0 truncate border-r border-[#CBD5E1] px-2.5 py-1.75"
              style={{ gridColumn: 1 }}
            >
              {firstColumnLabel}
            </span>
            <span
              className="min-w-0 truncate px-2.5 py-1.75"
              style={{ gridColumn: 3 }}
            >
              {secondColumnLabel}
            </span>
          </div>
          {props.children}
        </components.MenuList>
      ),
    };
  };

  const createStyles = (
    reverse: boolean,
  ): StylesConfig<PairSelectOption, false> => ({
    control: (base) => ({
      ...base,
      width: `${reverse ? secondWidth : firstWidth}px`,
      minHeight: "30px",
      height: "30px",
      borderColor: "#CBD5E1",
      borderRadius: "3px",
      boxShadow: "none",
      fontSize: "12px",
      backgroundColor: "#FFFFFF",
      "&:hover": {
        borderColor: "#94A3B8",
      },
    }),
    valueContainer: (base) => ({
      ...base,
      minWidth: 0,
      padding: "0 8px",
      overflow: "hidden",
    }),
    indicatorsContainer: (base) => ({
      ...base,
      height: "28px",
    }),
    dropdownIndicator: (base) => ({
      ...base,
      padding: "4px",
    }),
    clearIndicator: (base) => ({
      ...base,
      padding: "4px",
    }),
    menu: (base) => ({
      ...base,
      position: "absolute",
      left: 0,
      right: "auto",
      width: `${menuWidth}px`,
      minWidth: `${menuWidth}px`,
      maxWidth: `${menuWidth}px`,
      marginTop: "2px",
      border: "none",
      borderRadius: "3px",
      zIndex: menuZIndex,
      overflow: "hidden",
      boxSizing: "border-box",
    }),
    menuPortal: (base) => ({
      ...base,
      zIndex: menuZIndex,
    }),
    menuList: (base) => ({
      ...base,
      padding: 0,
      maxHeight: "200px",
    }),
    option: (base, state) => ({
      ...base,
      padding: 0,
      fontSize: optionFontSize,
      color: "#344054",
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
      color: "#344054",
    }),
    placeholder: (base) => ({
      ...base,
      color: "#94A3B8",
    }),
  });

  return (
    <div className="flex items-start overflow-visible" style={{ gap }}>
      {/* First input: ID/code. Its menu shows ID first, then Name. */}
      <div className="relative shrink-0" style={{ width: firstWidth }}>
        <Select<PairSelectOption, false>
          inputId={firstInputId}
          options={options}
          value={selectedFirst}
          onChange={onChange}
          components={{ ...selectComponents, ...createComponents(false) }}
          styles={createStyles(false)}
          getOptionValue={(option) => option.value}
          getOptionLabel={(option) => option.firstLabel}
          placeholder={placeholder}
          isDisabled={isDisabled}
        
          isSearchable={isSearchable}
          isClearable={false}
          menuPlacement="auto"
          menuShouldScrollIntoView={false}
          menuPortalTarget={menuPortalTarget}
          menuPosition={menuPortalTarget ? "fixed" : undefined}
          classNamePrefix="linked-pair"
        />
      </div>

      {/* Second input: Name. Its menu shows Name first, then ID. */}
      <div className="relative shrink-0" style={{ width: secondWidth }}>
        <Select<PairSelectOption, false>
          inputId={secondInputId}
          options={options}
          value={selectedSecond}
          onChange={onChange}
          components={{ ...selectComponents, ...createComponents(true) }}
          styles={createStyles(true)}
          getOptionValue={(option) => option.value}
          getOptionLabel={(option) => option.secondLabel}
          placeholder={placeholder}
          isDisabled={isDisabled}
          isSearchable={isSearchable}
          isClearable={false}
          menuPlacement="auto"
          menuShouldScrollIntoView={false}
          menuPortalTarget={menuPortalTarget}
          menuPosition={menuPortalTarget ? "fixed" : undefined}
          classNamePrefix="linked-pair"
        />
      </div>
    </div>
  );
};

export default CustomLinkedPairSelect;
