import type { StylesConfig } from "react-select";
export interface SelectOption {
  value: string;
  label: string;
}

  const selectStyles: StylesConfig<SelectOption, false> = {
        control: (base: any) => ({
          ...base,
          minHeight: "29px",
          height: "29px",
          // IMPORTANT: no width here; your existing Select width is preserved.
          borderRadius: "3px",
          borderColor: "#b7c7d7",
          boxShadow: "none",
          fontSize: "13px",
          backgroundColor: "#ffffff",
        }),

        valueContainer: (base: any) => ({
          ...base,
          height: "29px",
          padding: "0 8px",
        }),

        indicatorsContainer: (base: any) => ({
          ...base,
          height: "29px",
        }),

        dropdownIndicator: (base: any) => ({
          ...base,
          padding: "4px",
        }),

        clearIndicator: (base: any) => ({
          ...base,
          padding: "4px",
        }),

        menu: (base: any) => ({
          ...base,
          zIndex: 9999,
          fontSize: "13px",

          // Wider than the Select, but constrained to the viewport.
          width: "min(520px, calc(100vw - 24px))",
          minWidth: "min(360px, calc(100vw - 24px))",
          maxWidth: "calc(100vw - 24px)",
          left: 0,
        }),

        menuList: (base: any) => ({
          ...base,
          padding: 0,
          maxWidth: "100%",
          overflowX: "hidden",
        }),

        option: (base: any, state: any) => ({
          ...base,
          fontSize: "13px",
          padding: "6px 8px",
          backgroundColor: state.isFocused ? "#dbeafe" : "#ffffff",
          color: "#222",
          cursor: "pointer",
        }),
      };
export  const customerNameSelectStyles: StylesConfig<
  SelectOption,
  false
> = {
  ...selectStyles,

  control: (base) => ({
    ...base,
    minHeight: "29px",
    height: "29px",
    borderColor: "#b7c7d7",
  }),

  menu: (base) => ({
    ...base,
    width: "650px",
    zIndex: 9999,
  }),
};


export  const customerIdSelectStyles: StylesConfig<
  SelectOption,
  false
> = {
  ...selectStyles,

  control: (base) => ({
    ...base,
    minHeight: "29px",
    height: "29px",
    borderColor: "#b7c7d7",
  }),

  menu: (base) => ({
    ...base,
    width: "300px",
    zIndex: 9999,
  }),
};


export const docSelectStyles: StylesConfig<
  SelectOption,
  false
> = {
  ...selectStyles,

  control: (base) => ({
    ...base,
    minHeight: "29px",
    height: "29px",
    borderColor: "#b7c7d7",
  }),

  menu: (base) => ({
    ...base,
    // the box's width plus the ID column that hangs out past its right edge (the Branch list of the reports)
    width: "calc(var(--select-width, 160px) + 70px)",
    minWidth: "calc(var(--select-width, 160px) + 70px)",

    zIndex: 9999,
  }),
};

export  const DivisionSelectStyles: StylesConfig<
  SelectOption,
  false
> = {
  ...selectStyles,

  control: (base) => ({
    ...base,
    minHeight: "29px",
    height: "29px",
    borderColor: "#b7c7d7",
  }),

  menu: (base) => ({
    ...base,
    width: "430px",
    zIndex: 9999,
  }),
};

export  const DocumnetNoSelectStyles: StylesConfig<
  SelectOption,
  false
> = {
  ...selectStyles,

  control: (base) => ({
    ...base,
    minHeight: "29px",
    height: "29px",
    borderColor: "#b7c7d7",
  }),

  menu: (base) => ({
    ...base,
    width: "700px",
    zIndex: 9999,
  }),
};

// The Customer ID box's list: it runs under the ID box and the Name box next to it (the ID box is 154px, the gap 11px,
// the Name box 520px), so "Account ID" is as wide as the ID box and "Account Name" starts exactly under the Name box.
export const customerIdListStyles: StylesConfig<SelectOption, false> = {
  ...selectStyles,

  menu: (base) => ({
    ...base,
    width: "calc(var(--select-width, 154px) + 11px + 520px)",
    minWidth: "calc(var(--select-width, 154px) + 11px + 520px)",
    maxWidth: "calc(100vw - 24px)",
    zIndex: 9999,
  }),
};

// The Customer Name box's list: "Account Name" as wide as the box, the ID column hanging out past its right edge, a
// divider line between the two (the Branch list of the reports).
export const customerNameListStyles: StylesConfig<SelectOption, false> = {
  ...selectStyles,

  menu: (base) => ({
    ...base,
    width: "calc(var(--select-width, 520px) + 120px)",
    minWidth: "calc(var(--select-width, 520px) + 120px)",
    maxWidth: "calc(100vw - 24px)",
    zIndex: 9999,
  }),
};

// The Division box's list: the same design - the name as wide as the box, the ID column hanging out past its right edge.
export const divisionListStyles: StylesConfig<SelectOption, false> = {
  ...selectStyles,

  menu: (base) => ({
    ...base,
    width: "calc(var(--select-width, 300px) + 80px)",
    minWidth: "calc(var(--select-width, 300px) + 80px)",
    maxWidth: "calc(100vw - 24px)",
    zIndex: 9999,
  }),
};

// The Document No. box's list: BrID, Date, Document No. (type and number), Debit, Credit, Description - as wide as the Customer ID list above it - from the
// left edge of the box to the right edge of the Customer Name box (the ID box 154px + the gap 11px + the Name box 520px).
export const documentNoListStyles: StylesConfig<SelectOption, false> = {
  ...selectStyles,

  menu: (base) => ({
    ...base,
    width: "calc(154px + 11px + 520px)",
    minWidth: "calc(154px + 11px + 520px)",
    maxWidth: "calc(100vw - 24px)",
    zIndex: 9999,
  }),
};
