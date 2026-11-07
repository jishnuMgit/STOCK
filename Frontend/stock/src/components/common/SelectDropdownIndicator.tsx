import {
  components,
  type DropdownIndicatorProps,
  type GroupBase,
} from "react-select";
import { RxTriangleDown } from "react-icons/rx";

/* the arrow colour used by every dropdown */
export const DROPDOWN_ARROW_COLOR = "#9d9e9d";
export const DROPDOWN_ARROW_SIZE = 18;

/* Drop-in replacement for react-select's DropdownIndicator.
   Generic, so it works with any option type (SelectOption, Option, ...). */
const SelectDropdownIndicator = <
  Option,
  IsMulti extends boolean = false,
  Group extends GroupBase<Option> = GroupBase<Option>,
>(
  props: DropdownIndicatorProps<Option, IsMulti, Group>,
) => (
  <components.DropdownIndicator {...props}>
    <RxTriangleDown
      size={DROPDOWN_ARROW_SIZE}
      color={DROPDOWN_ARROW_COLOR}
    />
  </components.DropdownIndicator>
);

export default SelectDropdownIndicator;