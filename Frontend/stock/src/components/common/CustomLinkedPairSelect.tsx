import React, { useRef, useState } from "react";
import Select, {
  components,
  type MenuListProps,
  type OptionProps,
  type SelectInstance,
  type StylesConfig,
} from "react-select";
import type { KeyboardEventHandler, Ref } from "react";
import selectComponents, { SELECT_FONT_FAMILY } from "./selectComponents";

export interface PairSelectOption {
  value: string;
  firstLabel: string;
  secondLabel: string;
}

interface CustomLinkedPairSelectProps {
  options: PairSelectOption[];
  secondOptions?: PairSelectOption[];
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
  // rows shown before the list scrolls (10 on every report page); the list is as high as the header plus that many rows
  maxVisibleRows?: number;
  // the Name box takes the rest of the row (the row is as wide as its container) instead of secondWidth: the form pages
  fluid?: boolean;
  isDisabled?: boolean;
  isSearchable?: boolean;
  menuPortalTarget?: HTMLElement;
  menuZIndex?: number;
  firstSelectRef?: Ref<SelectInstance<PairSelectOption, false>>;
  onKeyDown?: KeyboardEventHandler;
  onMenuOpen?: () => void;
  onMenuClose?: () => void;
  noOptionsMessage?: () => string;
}

// The search of both boxes looks in BOTH columns: a name typed in the ID box finds the record by its name, an ID typed in
// the name box finds it by its ID. The chosen one fills both boxes. (The same as components/sharecomponents/CustomLinkedPairSelect.tsx.)
const matchesEitherColumn = (
  option: { data: PairSelectOption },
  input: string,
): boolean => {
  const text = input.trim().toLowerCase();
  if (!text) return true;

  return (
    option.data.firstLabel.toLowerCase().includes(text) ||
    option.data.secondLabel.toLowerCase().includes(text)
  );
};

const CustomLinkedPairSelect: React.FC<CustomLinkedPairSelectProps> = ({
  options,
  secondOptions,
  firstValue,
  secondValue,
  onChange,
  firstHeader,
  secondHeader,
  firstWidth = 140,
  secondWidth = 450,
  gap = 4,
  firstInputId,
  secondInputId,
  placeholder = "",
  headerFontSize = "14px",
  optionFontSize = "14px",
  maxVisibleRows = 10,
  fluid = false,
  isDisabled = false,
  isSearchable = true,
  menuPortalTarget,
  menuZIndex = 100000,
  firstSelectRef,
  onKeyDown,
  onMenuOpen,
  onMenuClose,
  noOptionsMessage,
}) => {
  const nameOptions = secondOptions ?? options;
  const menuWidth = firstWidth + gap + secondWidth;

  // The blank middle grid column preserves the physical gap between the inputs.
  // fluid: the Name column is whatever the Name box is
  const normalColumns = fluid ? `${firstWidth}px ${gap}px minmax(0,1fr)` : `${firstWidth}px ${gap}px ${secondWidth}px`;
  const reverseColumns = fluid ? `minmax(0,1fr) ${gap}px ${firstWidth}px` : `${secondWidth}px ${gap}px ${firstWidth}px`;

  // fluid: the width of the whole row, measured when the ID box opens its list (that list covers both boxes)
  const rowRef = useRef<HTMLDivElement>(null);
  const [rowWidth, setRowWidth] = useState(0);

  const selectedFirst =
    options.find((option) => option.value === firstValue) ?? null;
  const selectedSecond =
    nameOptions.find((option) => option.value === secondValue) ?? null;

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

  // the height of the open list: the sticky header + maxVisibleRows rows. A row is its text line (1.5 x the font size) + 14 px
  // of padding, the header the same + its 1 px line, so 10 rows show without a scroll bar and the 11th starts one.
  const px = (size: string, fallback: number) => parseFloat(size) || fallback;
  const rowHeight = Math.round(px(optionFontSize, 14) * 1.5) + 14;
  const headerHeight = Math.round(px(headerFontSize, 14) * 1.5) + 14 + 1;
  const listHeight = headerHeight + maxVisibleRows * rowHeight + 1;

  const createStyles = (
    reverse: boolean,
  ): StylesConfig<PairSelectOption, false> => ({
    // the font of the app, never the browser's
    container: (base) => ({
      ...base,
      fontFamily: SELECT_FONT_FAMILY,
    }),
    control: (base) => ({
      ...base,
      width: reverse ? (fluid ? "100%" : `${secondWidth}px`) : `${firstWidth}px`,
      minHeight: "30px",
      height: "30px",
      borderColor: "#CBD5E1",
      borderRadius: "3px",
      boxShadow: "none",
      fontSize: "14px",
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
      fontFamily: SELECT_FONT_FAMILY,
      position: "absolute",
      left: 0,
      right: "auto",
      ...(fluid
        ? reverse
          ? // the Name box's list: its own width, and the ID column hangs out to the right
            { width: `calc(100% + ${firstWidth + gap}px)`, minWidth: `calc(100% + ${firstWidth + gap}px)`, maxWidth: "none" }
          : // the ID box's list: both boxes
            { width: `${rowWidth || menuWidth}px`, minWidth: `${rowWidth || menuWidth}px`, maxWidth: "none" }
        : { width: `${menuWidth}px`, minWidth: `${menuWidth}px`, maxWidth: `${menuWidth}px` }),
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
      // never taller than the room react-select found (above or below), nor than the 10 rows
      maxHeight: Math.min(Number(base.maxHeight) || listHeight, listHeight),
      overflowX: "hidden",
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
    <div
      ref={rowRef}
      className={`flex items-start overflow-visible ${fluid ? "w-full" : ""}`}
      style={{ gap }}
    >
      {/* First input: ID/code. Its menu shows ID first, then Name. */}
      <div className="relative shrink-0" style={{ width: firstWidth }}>
        <Select<PairSelectOption, false>
          ref={firstSelectRef}
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
          filterOption={matchesEitherColumn}
          isClearable={false}
          onKeyDown={onKeyDown}
          onMenuOpen={() => {
            if (fluid && rowRef.current) setRowWidth(rowRef.current.getBoundingClientRect().width);
            onMenuOpen?.();
          }}
          onMenuClose={onMenuClose}
          noOptionsMessage={noOptionsMessage}
          menuPlacement="auto"
          // opens upward unless the whole list fits below (react-select otherwise shrinks it into the space left below)
          minMenuHeight={listHeight}
          menuShouldScrollIntoView={false}
          menuPortalTarget={menuPortalTarget}
          menuPosition={menuPortalTarget ? "fixed" : undefined}
          classNamePrefix="linked-pair"
        />
      </div>

      {/* Second input: Name. Its menu shows Name first, then ID. */}
      <div
        className={`relative ${fluid ? "min-w-0 flex-1" : "shrink-0"}`}
        style={fluid ? undefined : { width: secondWidth }}
      >
        <Select<PairSelectOption, false>
          inputId={secondInputId}
          options={nameOptions}
          value={selectedSecond}
          onChange={onChange}
          components={{ ...selectComponents, ...createComponents(true) }}
          styles={createStyles(true)}
          getOptionValue={(option) => option.value}
          getOptionLabel={(option) => option.secondLabel}
          placeholder={placeholder}
          isDisabled={isDisabled}
          isSearchable={isSearchable}
          filterOption={matchesEitherColumn}
          isClearable={false}
          onKeyDown={onKeyDown}
          onMenuOpen={onMenuOpen}
          onMenuClose={onMenuClose}
          noOptionsMessage={noOptionsMessage}
          menuPlacement="auto"
          // opens upward unless the whole list fits below (react-select otherwise shrinks it into the space left below)
          minMenuHeight={listHeight}
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
