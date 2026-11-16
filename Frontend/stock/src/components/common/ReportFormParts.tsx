import React from "react";

// ============================================================
// THE PARTS OF A REPORT FORM (common)
// The radio and the radio panel of the report pages, as on the Asset Item List page, the design standard for the report
// screens: a row of the form is
//
//   <div className="grid grid-cols-[150px_minmax(0,1fr)] items-center gap-x-4">
//     <RadioPanel className="h-17.5 w-38"> <CustomRadio .../> <CustomRadio .../> </RadioPanel>
//     <div className="min-w-0 pt-1"> the box(es) the radio chooses </div>
//   </div>
//
// The boxes are CommonTableSelect (one box) or CustomLinkedPairSelect (an ID box and a Name box); a date is a
// date picker 154 px wide (w-38.5), the two of a period 5 px apart.
// ============================================================

type RadioProps = {
  name: string;
  value: string;
  label: string;
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
};

export const CustomRadio: React.FC<RadioProps> = ({
  name,
  value,
  label,
  checked,
  onChange,
  disabled = false,
}) => (
  <label
    className={`flex items-center gap-1.25 whitespace-nowrap select-none ${
      disabled ? "cursor-not-allowed opacity-40" : "cursor-pointer"
    }`}
  >
    <input
      type="radio"
      name={name}
      value={value}
      checked={checked}
      onChange={onChange}
      disabled={disabled}
      className="sr-only"
    />

    <span
      className={`flex h-4.75 w-4.75 shrink-0 items-center justify-center rounded-full border ${
        checked ? "border-[#4ade80]" : "border-[#c3cbd3]"
      } bg-white`}
    >
      {checked && <span className="h-2.25 w-2.25 rounded-full bg-[#4ade80]" />}
    </span>

    <span className="text-[14px] leading-4.25 text-[#172b43]">{label}</span>
  </label>
);

export const RadioPanel: React.FC<{
  children: React.ReactNode;
  className?: string;
  id?: string;
}> = ({ children, className = "", id }) => (
  <div
    id={id}
    role="radiogroup"
    className={`flex flex-col justify-center gap-1.5 rounded-sm border border-gray-300 bg-white px-1.75 py-1.75 ${className}`}
  >
    {children}
  </div>
);
