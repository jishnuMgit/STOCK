// GridSelect.tsx
// A react-select whose dropdown is a small grid: a header row (column titles)
// and one row per option with several columns, like the VB LookUpEdit.
//   Branch lookup   : Branch | ID
//   Customer lookup : Customer ID | Customer Name
// The box shows option.label; typing filters on ANY column.
import React, { useMemo } from "react";
import Select, {
  components,
  type MenuListProps,
  type OptionProps,
  type Props as SelectProps,
} from "react-select";

export type GridOption = {
  value: string;
  label: string; // what the closed box shows
  cols: string[]; // what the grid row shows, one entry per column
};

type Simple = { value: string; label: string };

type GridSelectProps = {
  options: GridOption[];
  value: Simple | null;
  onChange: (option: Simple | null) => void;
  headers: string[]; // column titles
  colTemplate: string; // CSS grid-template-columns, e.g. "110px 1fr"
  menuWidth?: number; // px; the menu is at least as wide as the box
  // px; the menu is the box width PLUS this much: the first column is exactly
  // as wide as the box, the last column sticks out to the right of it.
  // Use colTemplate "1fr <extraWidth>px" with it.
  extraWidth?: number;
} & Omit<
  Partial<SelectProps<GridOption, false>>,
  "options" | "value" | "onChange" | "components"
>;

const GridSelect: React.FC<GridSelectProps> = ({
  options,
  value,
  onChange,
  headers,
  colTemplate,
  menuWidth,
  extraWidth,
  styles,
  ...rest
}) => {
  const selected = useMemo(
    () => options.find((o) => o.value === value?.value) ?? null,
    [options, value],
  );

  const gridComponents = useMemo(() => {
    const MenuList = (props: MenuListProps<GridOption, false>) => (
      <components.MenuList {...props}>
        <div
          className="sticky top-0 z-10 grid border-b border-[#d7dee5] bg-[#f1f4fa] text-[14px] font-semibold text-[#24364d]"
          style={{ gridTemplateColumns: colTemplate }}
        >
          {headers.map((h) => (
            <div key={h} className="border-r border-[#dfe5ee] px-3 py-3 last:border-r-0">
              {h}
            </div>
          ))}
        </div>
        {props.children}
      </components.MenuList>
    );

    const Option = ({
      data,
      isFocused,
      isSelected,
      innerRef,
      innerProps,
    }: OptionProps<GridOption, false>) => (
      <div
        ref={innerRef}
        {...innerProps}
        className={`grid cursor-pointer text-[14px] text-[#24364d] ${
          isSelected ? "bg-[#e7f7ed]" : isFocused ? "bg-[#f2faf5]" : "bg-white"
        }`}
        style={{ gridTemplateColumns: colTemplate }}
      >
        {data.cols.map((c, i) => (
          <div key={i} className="truncate px-3 py-2.5" title={c}>
            {c}
          </div>
        ))}
      </div>
    );

    return { MenuList, Option };
  }, [headers, colTemplate]);

  return (
    <Select<GridOption, false>
      {...rest}
      options={options}
      value={selected}
      onChange={(o) => onChange(o ? { value: o.value, label: o.label } : null)}
      components={gridComponents}
      // match on every column (id OR name)
      filterOption={(opt, input) => {
        const q = input.trim().toLowerCase();
        return q === "" || opt.data.cols.some((c) => c.toLowerCase().includes(q));
      }}
      styles={{
        ...styles,
        menu: (base, state) => ({
          ...(styles?.menu ? styles.menu(base, state) : base),
          width:
            extraWidth != null
              ? `calc(100% + ${extraWidth}px)`
              : (menuWidth ?? base.width),
          minWidth: "100%",
        }),
      }}
    />
  );
};

export default GridSelect;
