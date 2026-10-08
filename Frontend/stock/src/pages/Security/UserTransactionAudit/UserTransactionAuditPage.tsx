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
  {
    value: "BRANCH 1",
    label: "BRANCH 1",
  },
];

const documentOptions: Option[] = [
  {
    value: "SALES",
    label: "SALES",
  },
  {
    value: "PURCHASE",
    label: "PURCHASE",
  },
  {
    value: "RECEIPT",
    label: "RECEIPT",
  },
  {
    value: "PAYMENT",
    label: "PAYMENT",
  },
];

// ============================================================
// SELECT STYLES
// ============================================================

const selectStyles: StylesConfig<Option, false> = {
  control: (base, state) => ({
    ...base,

    minHeight: "30px",
    height: "30px",

    border: "1px solid #cbd5e1",

    borderRadius: "0px",

    boxShadow: "none",

    backgroundColor: "#ffffff",

    fontSize: "12px",

    cursor: "text",

    "&:hover": {
      borderColor: "#94a3b8",
    },

    ...(state.isFocused && {
      borderColor: "#94a3b8",
      boxShadow: "none",
    }),
  }),

  valueContainer: (base) => ({
    ...base,

    height: "28px",

    padding: "0 7px",

    overflow: "hidden",
  }),

  singleValue: (base) => ({
    ...base,

    color: "#344054",

    fontSize: "12px",

    margin: 0,

    overflow: "hidden",

    textOverflow: "ellipsis",

    whiteSpace: "nowrap",
  }),

  placeholder: (base) => ({
    ...base,

    color: "gray",

    fontSize: "12px",

    margin: 0,
  }),

  input: (base) => ({
    ...base,

    margin: 0,

    padding: 0,

    fontSize: "12px",

    color: "#344054",
  }),

  indicatorsContainer: (base) => ({
    ...base,

    height: "28px",
  }),

  dropdownIndicator: (base) => ({
    ...base,

    padding: "3px",

    color: "#64748b",
  }),

  indicatorSeparator: () => ({
    display: "none",
  }),

  menuPortal: (base) => ({
    ...base,

    zIndex: 999999,
  }),

  menu: (base) => ({
    ...base,

    zIndex: 999999,

    marginTop: "1px",

    fontSize: "12px",

    borderRadius: "0px",

    boxShadow:
      "0 3px 8px rgba(0,0,0,0.15)",
  }),

  menuList: (base) => ({
    ...base,

    padding: 0,

    maxHeight: "180px",

    overflowY: "auto",
  }),

  option: (base, state) => ({
    ...base,

    padding: "6px 8px",

    fontSize: "12px",

    color: "#344054",

    cursor: "pointer",

    backgroundColor:
      state.isSelected
        ? "#e8f5ee"
        : state.isFocused
          ? "#f0f8f3"
          : "#ffffff",

    "&:active": {
      backgroundColor: "#dff1e7",
    },
  }),
};

// ============================================================
// INPUT STYLE
// ============================================================

const inputClass = `
  input-style
`;

// ============================================================
// COMPONENT
// ============================================================

const UserTransactionAudit: React.FC = () => {
  const [branch, setBranch] =
    useState<Option | null>(null);

  const [document, setDocument] =
    useState<Option | null>(null);

  const [documentNo, setDocumentNo] =
    useState("");

  // ==========================================================
  // CLEAR
  // ==========================================================

  const handleClear = () => {
    setBranch(null);
    setDocument(null);
    setDocumentNo("");
  };

  // ==========================================================
  // PRINT
  // ==========================================================

  const handlePrint = () => {
    console.log({
      branch,
      document,
      documentNo,
    });
  };

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div
      className="
        min-h-screen
        w-full
        flex
        items-center
        justify-center
        bg-white
      "
    >
      {/* ======================================================
          MAIN BOX
      ====================================================== */}

      <div
        className="
          w-[465px]
          border
          border-[#707070]
          bg-white
        "
      >
        {/* ====================================================
            TITLE
        ==================================================== */}

        <div  className="  flex h-[36px]  items-center  border-b  border-slate-300  bg-[#a3dfc0]   " >
        <span className="  px-3   text-[17px]  font-semibold text-slate-700  " >User Transaction Audit </span> </div>


        {/* ====================================================
            FORM
        ==================================================== */}

        <div
          className="
            px-[20px]
            pt-[18px]
            pb-[15px]
          "
        >
          {/* ==================================================
              BRANCH
          ================================================== */}

          <div
            className="
              flex
              h-[30px]
              items-center
              mb-[10px]
            "
          >
            <label
              className="
                w-[115px]
                shrink-0
                pr-[10px]
                text-right
                text-[14px]
                text-[#344054]
                whitespace-nowrap
              "
            >
              Branch :
            </label>

            <div className="w-[305px]">
              <Select<Option, false>
                inputId="lkpBranch"
                instanceId="lkpBranch"
                options={branchOptions}
                value={branch}
                onChange={setBranch}
                styles={selectStyles}
                isClearable={false}
                isSearchable={true}
               
                menuPosition="fixed"
                menuPortalTarget={
                  typeof window !== "undefined"
                    ? window.document.body
                    : undefined
                }
              />
            </div>
          </div>

          {/* ==================================================
              DOCUMENT
          ================================================== */}

          <div
            className="
              flex
              h-[30px]
              items-center
              mb-[10px]
            "
          >
            <label
              className="
                w-[115px]
                shrink-0
                pr-[10px]
                text-right
                text-[14px]
                text-[#344054]
                whitespace-nowrap
              "
            >
              Document :
            </label>

            <div className="w-[153px]">
              <Select<Option, false>
                inputId="lkpDocument"
                instanceId="lkpDocument"
                options={documentOptions}
                value={document}
                onChange={setDocument}
                styles={selectStyles}
                isClearable={false}
                isSearchable={true}
                
                menuPosition="fixed"
                menuPortalTarget={
                  typeof window !== "undefined"
                    ? window.document.body
                    : undefined
                }
              />
            </div>
          </div>

          {/* ==================================================
              DOCUMENT NO
          ================================================== */}

          <div
            className="
              flex
              h-[30px]
              items-center
            "
          >
            <label
              className="
                w-[115px]
                shrink-0
                pr-[10px]
                text-right
                text-[14px]
                text-[#344054]
                whitespace-nowrap
              "
            >
              Document No. :
            </label>

            <input
              id="txtDocumentNo"
              type="text"
              value={documentNo}
              onChange={(event) =>
                setDocumentNo(
                  event.target.value
                )
              }
              autoComplete="off"
              
              className={`
                ${inputClass}
                w-[154px]
                
              `}
            />
          </div>

          {/* ==================================================
              BUTTONS
          ================================================== */}

          <div
            className="
              mt-[15px]
              flex
              justify-center
              gap-[15px]
            "
          >
            {/* PRINT */}

            <button
              type="button"
              onClick={handlePrint}
              className="
                btn-style
              "
            >
              <u>P</u>rint
            </button>

            {/* CLEAR */}

            <button
              type="button"
              onClick={handleClear}
              className="
                btn-style
              "
            >
              <u>C</u>lear
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserTransactionAudit;