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

const transferToOptions: Option[] = [
  {
    value: "",
    label: "",
  },
];

const entryNoOptions: Option[] = [
  {
    value: "01",
    label: "01",
  },
];

// ============================================================
// SELECT STYLES
// ============================================================

const selectStyles: StylesConfig<Option, false> = {
  control: (base, state) => ({
    ...base,
    minHeight: 28,
    height: 28,
    width: "100%",
    border: "1px solid #cbd5e1",
    borderRadius: 4,
    boxShadow: "none",
    backgroundColor: state.isFocused ? "#eff6ff" : "#ffffff",
    cursor: "pointer",
    fontSize: 15,

    "&:hover": {
      borderColor: "#94a3b8",
    },
  }),

  valueContainer: (base) => ({
    ...base,
    height: 28,
    minHeight: 28,
    padding: "0 6px",
    overflow: "hidden",
  }),

  singleValue: (base) => ({
    ...base,
    color: "#202020",
    fontSize: 15,
    margin: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  }),

  placeholder: (base) => ({
    ...base,
    color: "#64748b",
    fontSize: 15,
    margin: 0,
  }),

  input: (base) => ({
    ...base,
    margin: 0,
    padding: 0,
    fontSize: 15,
  }),

  indicatorsContainer: (base) => ({
    ...base,
    height: 28,
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
    fontSize: 15,
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
    fontSize: 15,
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
  " px-2 input-style";

// ============================================================
// HEADER
// ============================================================

const StockTransferHeader: React.FC = () => {
  const [branch, setBranch] = useState<Option | null>(
    branchOptions[0],
  );

  const [transferTo, setTransferTo] =
    useState<Option | null>(transferToOptions[0]);

  const [entryNo, setEntryNo] =
    useState<Option | null>(entryNoOptions[0]);

  return (
    <header className="w-full shrink-0">

      {/* ======================================================
          TITLE
      ====================================================== */}

      

      {/* ======================================================
          HEADER FORM
      ====================================================== */}

      <div className="h-[83px] w-full px-[16px] pt-3 mt-2">
        <div className="relative h-full w-full">

          {/* ==================================================
              BRANCH
          ================================================== */}

          <div className="absolute left-0 top-0 flex h-[28px] items-center">
            <label
              className="
                w-[80px]
                shrink-0
                whitespace-nowrap
                text-right
                text-[14px]
                text-[#202020]
              "
            >
              Branch :
            </label>

            <div className="ml-[7px] w-[220px]">
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
              ENTRY NO
          ================================================== */}

          <div className="absolute left-[425px] top-0 flex h-[28px] items-center">
            <label
              className="
                w-[82px]
                shrink-0
                whitespace-nowrap
                text-right
                text-[14px]
                text-[#202020]
              "
            >
              Entry No. :
            </label>

            <div className="ml-[7px] w-[145px]">
              <Select<Option, false>
                inputId="txtEntryNo"
                instanceId="txtEntryNo"
                options={entryNoOptions}
                value={entryNo}
                onChange={setEntryNo}
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

          <div className="absolute right-0 top-0 flex h-[28px] items-center">
            <label className="mr-[7px] whitespace-nowrap text-[14px] text-[#202020]">
              Date :
            </label>

            <input
              id="dtpDate"
              type="date"
              defaultValue="2026-07-01"
              className={`w-[120px] input-style`}
            />
          </div>

          {/* ==================================================
              TRANSFER TO
          ================================================== */}

          <div className="absolute left-0 top-[38px] flex h-[28px] items-center">
            <label
              className="
                w-[80px]
                shrink-0
                whitespace-nowrap
                text-right
                text-[14px]
                text-[#202020]
              "
            >
              Transfer To :
            </label>

            <div className="ml-[7px] w-[220px]">
              <Select<Option, false>
                inputId="lkpTransferTo"
                instanceId="lkpTransferTo"
                options={transferToOptions}
                value={transferTo}
                onChange={setTransferTo}
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
              STOCK
          ================================================== */}

          <div className="absolute left-[43%] top-[38px] flex h-[28px] items-center">
            <label className="mr-[7px] whitespace-nowrap text-[14px] text-[#202020]">
              Stock :
            </label>

            <input
              id="txtStock"
              type="text"
              defaultValue=""
              className={`${inputClass} w-[86px]`}
            />
          </div>
        </div>
      </div>
    </header>
  );
};

export default StockTransferHeader;