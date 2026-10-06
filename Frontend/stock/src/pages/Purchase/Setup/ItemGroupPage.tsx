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

const vatSlabOptions: Option[] = [
  {
    value: "5",
    label: "5%",
  },
  {
    value: "12",
    label: "12%",
  },
  {
    value: "18",
    label: "18%",
  },
  {
    value: "28",
    label: "28%",
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
    borderRadius: 0,
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
  }),

  placeholder: (base) => ({
    ...base,
    color: "#202020",
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
  "h-[30px] border border-[#cbd5e1] bg-white px-2 text-[13px] text-[#202020] outline-none focus:border-blue-400 focus:bg-blue-50";

// ============================================================
// BUTTON STYLE
// ============================================================


// ============================================================
// ITEM GROUP
// ============================================================

const ItemGroupPage: React.FC = () => {
  const [vatSlab, setVatSlab] =
    useState<Option | null>(null);

  const [vatPercentage, setVatPercentage] =
    useState("0.00");

  // ==========================================================
  // VAT SLAB CHANGE
  // ==========================================================

  const handleVatSlabChange = (
    option: Option | null,
  ) => {
    setVatSlab(option);

    if (option) {
      setVatPercentage(
        Number(option.value).toFixed(2),
      );
    } else {
      setVatPercentage("0.00");
    }
  };

  return (
 <div className="flex min-h-screen w-full justify-center overflow-hidden bg-white pt-5">
  <main className="h-fit w-full min-w-[700px] max-w-[720px] border border-gray-400 bg-white pb-6 text-[#202020]">


        {/* ====================================================
            TITLE
        ==================================================== */}

       <div className="flex h-[30px] items-center border-b border-slate-400 bg-[#a3dfc0]">
            <span
              className="
                rounded-[3px]
                px-2
                text-[18px]
                font-semibold
                text-slate-800
              "
            >
              Item Group
            </span>
          </div>

        {/* ====================================================
            FORM
        ==================================================== */}

        <div className="px-[20px] pt-[26px]">

          {/* ==================================================
              ITEM GROUP ID
          ================================================== */}

          <div className="mb-[10px] flex h-[30px] items-center">

            <label
              htmlFor="txtItemGroupID"
              className="
                flex
                w-[142px]
                shrink-0
                items-center
                justify-end
                relative
                whitespace-nowrap
                text-[14px]
                text-[#374151]
              "
            >
             
                Item
             

              
                Group ID :

                 <span className="ml-[3px] absolute -top-1.5 right-1 text-red-500">
                *
              </span>
             

            
            </label>

            <input
              id="txtItemGroupID"
              type="text"
              autoComplete="off"
              className={`${inputClass} ml-[8px] w-[137px]`}
            />
          </div>

          {/* ==================================================
              ITEM GROUP NAME
          ================================================== */}

          <div className="mb-[10px] flex h-[30px] items-center">

            <label
              htmlFor="txtItemGroupName"
              className="
                flex
                w-[142px]
                shrink-0
                items-center
                justify-end
                relative
                whitespace-nowrap
                text-[14px]
                text-[#374151]
              "
            >
             
                Item
             

              
                
                Group Name :
              <span className="ml-[3px] absolute -top-1.5 right-1 text-red-500">
                *
              </span>

             
            </label>

            <input
              id="txtItemGroupName"
              type="text"
              autoComplete="off"
              className={`${inputClass} ml-[8px] w-[490px]`}
            />
          </div>

          {/* ==================================================
              VAT SLAB
          ================================================== */}

          <div className="mb-[10px] flex h-[30px] items-center">

            <label
              htmlFor="lkpVATSlab"
              className="
                flex
                w-[142px]
                shrink-0
                items-center
                justify-end
                relative
                whitespace-nowrap
                text-[14px]
                text-[#374151]
              "
            >
              VAT Slab :
 <span className="ml-[3px] absolute -top-1.5 right-1 text-red-500">
                *
              </span>
             
            </label>

            <div className="ml-[8px] w-[129px]">
              <Select<Option, false>
                inputId="lkpVATSlab"
                instanceId="lkpVATSlab"
                options={vatSlabOptions}
                value={vatSlab}
                onChange={handleVatSlabChange}
                styles={selectStyles}
                isClearable={false}
                isSearchable={false}
                placeholder="Select Slab"
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
              VAT %
          ================================================== */}

          <div className="mb-[20px] flex h-[30px] items-center">

            <label
              htmlFor="txtVATPer"
              className="
                flex
                w-[142px]
                shrink-0
                items-center
                relative
                justify-end
                whitespace-nowrap
                text-[14px]
                text-[#374151]
              "
            >
              VAT % :

             <span className="ml-[3px] absolute -top-1.5 right-1 text-red-500">
                *
              </span>
            </label>

            <input
              id="txtVATPer"
              type="text"
              inputMode="decimal"
              value={vatPercentage}
              onChange={(event) => {
                const value =
                  event.target.value;

                if (
                  value === "" ||
                  /^\d*\.?\d*$/.test(value)
                ) {
                  setVatPercentage(value);
                }
              }}
              className={`${inputClass} ml-[8px] w-[129px] text-right`}
            />
          </div>

          {/* ==================================================
              BUTTONS
          ================================================== */}

          <div
            className="
              flex
              justify-center
              gap-[13px]
              pl-[30px]
            "
          >
            <button
              id="btnSave"
              type="button"
              className={`btn-style w-[108px]`}
            >
              <u>Save</u>
            </button>

            <button
              id="btnDelete"
              type="button"
              className={`btn-style w-[109px]`}
            >
              <u>Delete</u>
            </button>

            <button
              id="btnClear"
              type="button"
              className={`btn-style w-[108px]`}
            >
              <u>Clear</u>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ItemGroupPage;