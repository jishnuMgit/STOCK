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
    width: "300px",
    minWidth: "300px",
   
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