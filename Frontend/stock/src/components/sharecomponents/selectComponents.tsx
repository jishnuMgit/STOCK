import {
  components,
  type DropdownIndicatorProps,
} from "react-select";
import { RxTriangleDown } from "react-icons/rx";

export type Option = {
  value: string;
  label: string;
};

const DropdownIndicator = (
  props: DropdownIndicatorProps<Option, false>,
) => (
  <components.DropdownIndicator {...props}>
    <RxTriangleDown size={18} />
  </components.DropdownIndicator>
);

const selectComponents = {
  DropdownIndicator,
  IndicatorSeparator: () => null,
};

export default selectComponents;