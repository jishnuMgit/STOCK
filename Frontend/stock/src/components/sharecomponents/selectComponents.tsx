import {
  components,
  type DropdownIndicatorProps,
} from "react-select";
import { RxTriangleDown } from "react-icons/rx";

export type Option = {
  value: string;
  label: string;
};

// `any` for the option type so the same indicator fits every page's own
// option shape (SelectOption, Option, DropdownOption, ...).
const DropdownIndicator = (
  props: DropdownIndicatorProps<any, false>,
) => (
  <components.DropdownIndicator {...props}>
    <RxTriangleDown size={17} color="gray"/>
  </components.DropdownIndicator>
);

// The font of the app (src/index.css: Inter). The React Select boxes and their lists name it in their `styles`, so a select
// never falls back to the browser's own font.
export const SELECT_FONT_FAMILY = "'Inter', sans-serif";

// The shared dropdown look: a small triangle and no separator line.
// Pass it as `components={selectComponents}`, or merge it with a page's own
// parts: `components={{ ...selectComponents, MenuList, Option }}`.
const selectComponents = {
  DropdownIndicator,
  IndicatorSeparator: () => null,
};

export default selectComponents;
