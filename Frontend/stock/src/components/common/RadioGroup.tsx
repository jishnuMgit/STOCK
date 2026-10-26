import React from "react";

// ============================================================
// RADIO GROUP (common)
// A bordered panel with one round radio per choice - the look the report screens use for
// "One Branch / All Branches", "Detailed / Summary", "By Item Group / By Item" ...
// Every report page used to carry its own copy of this; use this one.
//
//   <RadioGroup
//     name="rdgByItem"
//     value={rdgByItem}
//     options={[
//       { value: "By Group", label: "By Item Group" },
//       { value: "By Item", label: "By Item" },
//     ]}
//     onChange={setRdgByItem}
//   />
//
// `name` is the name of the radio inputs: the same as the state and the key the server
// takes. Arrow keys move between the choices (they are real radio inputs); the whole panel
// can be switched off with `disabled`.
// ============================================================

export type RadioOption = { value: string; label: string };

type Props = {
  name: string;
  value: string;
  options: RadioOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
};

const RadioGroup: React.FC<Props> = ({
  name,
  value,
  options,
  onChange,
  disabled = false,
  className = "",
}) => (
  <div
    role="radiogroup"
    id={name}
    className={`border border-[#e0e5ea] px-3.5 py-3 ${disabled ? "bg-[#f6f8fa]" : "bg-white"} ${className}`}
  >
    <div className="flex flex-col gap-3">
      {options.map((option) => {
        const checked = option.value === value;

        return (
          <label
            key={option.value}
            className={`flex items-center gap-2.5 whitespace-nowrap select-none ${
              disabled ? "cursor-not-allowed opacity-45" : "cursor-pointer"
            }`}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={checked}
              disabled={disabled}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            <span
              className={`flex h-[19px] w-[19px] shrink-0 items-center justify-center rounded-full border bg-white ${
                checked ? "border-[#64d96e]" : "border-[#cbd3dc]"
              }`}
            >
              <span
                className={`h-2.5 w-2.5 rounded-full bg-[#64d96e] ${
                  checked ? "opacity-100" : "opacity-0"
                }`}
              />
            </span>
            <span className="text-[12px] font-normal text-[#35445a]">{option.label}</span>
          </label>
        );
      })}
    </div>
  </div>
);

export default RadioGroup;
