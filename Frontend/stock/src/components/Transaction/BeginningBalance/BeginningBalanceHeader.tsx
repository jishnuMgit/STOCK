import React, { useState } from "react";
import Select, { type StylesConfig } from "react-select";

// ============================================================
// TYPES
// ============================================================

type Option = {
  value: string;
  label: string;
};

// ============================================================
// OPTIONS
// ============================================================

const branchOptions: Option[] = [
  {
    value: "OFFICE",
    label: "OFFICE",
  },
];

// ============================================================
// SELECT STYLES
// ============================================================

const selectStyles: StylesConfig<Option, false> = {
  control: (base, state) => ({
    ...base,
    minHeight: 30,
    height: 30,
    width: "100%",
    border: "1px solid #cbd5e1",
    borderRadius: 4,
    boxShadow: "none",
    backgroundColor: state.isFocused
      ? "#eff6ff"
      : "#ffffff",
    cursor: "pointer",
    fontSize: 13,

    "&:hover": {
      borderColor: "#94a3b8",
    },
  }),

  valueContainer: (base) => ({
    ...base,
    height: 30,
    minHeight: 30,
    padding: "0 7px",
    overflow: "hidden",
  }),

  singleValue: (base) => ({
    ...base,
    color: "#202020",
    fontSize: 13,
    margin: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  }),

  placeholder: (base) => ({
    ...base,
    color: "#64748b",
    fontSize: 13,
    margin: 0,
  }),

  input: (base) => ({
    ...base,
    margin: 0,
    padding: 0,
    fontSize: 13,
  }),

  indicatorsContainer: (base) => ({
    ...base,
    height: 30,
  }),

  dropdownIndicator: (base) => ({
    ...base,
    padding: "0 3px",
    color: "#64748b",
  }),

  indicatorSeparator: () => ({
    display: "none",
  }),

  menuPortal: (base) => ({
    ...base,
    zIndex: 9999,
  }),

  menu: (base) => ({
    ...base,
    zIndex: 9999,
    fontSize: 13,
    marginTop: 1,
  }),

  menuList: (base) => ({
    ...base,
    padding: 0,
    maxHeight: 180,
  }),

  option: (base, state) => ({
    ...base,
    padding: "6px 8px",
    fontSize: 13,
    color: "#202020",
    cursor: "pointer",

    backgroundColor: state.isSelected
      ? "#dbeafe"
      : state.isFocused
        ? "#eff6ff"
        : "#ffffff",
  }),
};

// ============================================================
// INPUT STYLE
// ============================================================

const inputClass =
  "input-style";

// ============================================================
// HEADER
// ============================================================

const BeginningBalanceHeader: React.FC = () => {
  const [branch, setBranch] = useState<Option | null>(
    branchOptions[0],
  );

  return (
    <header className="w-full shrink-0">

      {/* ======================================================
          TITLE
      ====================================================== */}

     
       <div
          className="
            flex
            h-9
            items-center
            border-b
            border-slate-300
            bg-[#a3dfc0]
          "
        >

          <span
            className="
              px-4.5
              text-[17px]
              font-semibold
              text-slate-700
            "
          >
Beginning Balance
          </span>

        </div>

      {/* ======================================================
          HEADER FORM
      ====================================================== */}

      <div className="h-[75px] w-full px-[20px] pt-[22px]">
        <div className="relative h-full w-full">

          {/* ==================================================
              BRANCH
          ================================================== */}

          <div className="absolute left-0 top-0 flex h-[30px] items-center">
            <label
              className="
                w-[51px]
                shrink-0
                whitespace-nowrap
                text-right
                text-[14px]
                text-[#202020]
              "
            >
              Branch :
            </label>

            <div className="ml-[8px] w-[235px]">
              <Select<Option, false>
                inputId="lkpBranch"
                instanceId="lkpBranch"
                options={branchOptions}
                value={branch}
                onChange={setBranch}
                styles={selectStyles}
                isClearable={false}
                isSearchable={false}
                menuPosition="fixed"
                menuPortalTarget={
                  typeof document !== "undefined"
                    ? document.body
                    : undefined
                }
              />
            </div>
          </div>

          {/* ==================================================
              DATE
          ================================================== */}

          <div className="absolute right-0 top-0 flex h-[30px] items-center">
            <label
              className="
                mr-[8px]
                whitespace-nowrap
                text-[14px]
                text-[#202020]
              "
            >
              Date :
            </label>

            <input
              id="dtpDate"
              type="date"
              defaultValue="2023-12-03"
              className={`${inputClass} w-[145px]`}
            />
          </div>
        </div>
      </div>
    </header>
  );
};

export default BeginningBalanceHeader;