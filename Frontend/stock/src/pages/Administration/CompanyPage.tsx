import React, { useState } from "react";
import Select, { type StylesConfig, type SingleValue } from "react-select";

type Option = {
  value: string;
  label: string;
};

const CompanyPage: React.FC = () => {
  // ============================================================
  // STATE
  // ============================================================

  const [txtCoID, setCoID] = useState("");
  const [txtCoName, setCoName] = useState("");
  const [txtCoName_AR, setCoName_AR] = useState("");
  const [txtCoName_Short, setCoName_Short] = useState("");
  const [txtCoName_QR, setCoName_QR] = useState("");
  const [txtVATNo, setVATNo] = useState("");
  const [txtVATNo_AR, setVATNo_AR] = useState("");

  const [lkpPurchaseExpenseGroup, setPurchaseExpenseGroup] =
    useState<Option | null>(null);

  const [lkpBG2ARAP, setBG2ARAP] =
    useState<Option | null>(null);

  const [lkpYearClosingMethod, setYearClosingMethod] =
    useState<Option | null>(null);

  // ============================================================
  // OPTIONS
  // ============================================================

  const purchaseExpenseGroupOptions: Option[] = [
    { value: "", label: "" },
  ];

  const bg2ARAPOptions: Option[] = [
    { value: "Yes/No", label: "Yes/No" },
    { value: "Yes", label: "Yes" },
    { value: "No", label: "No" },
  ];

  const yearClosingMethodOptions: Option[] = [
    { value: "", label: "" },
    { value: "Monthly", label: "Monthly" },
    { value: "Yearly", label: "Yearly" },
  ];

  // ============================================================
  // INPUT STYLE
  // ============================================================

  const inputClass = "w-full input-style";

  const smallInputClass = "w-[50%] input-style";

  // ============================================================
  // REACT SELECT STYLE
  // ============================================================

  const selectStyles: StylesConfig<Option, false> = {
    control: (base, state) => ({
      ...base,
      minHeight: "30px",
      height: "30px",
      width: "50%",
      border: "1px solid #d1d5db",
      borderRadius: "4px",
      boxShadow: "none",
      backgroundColor: state.isFocused ? "#eefbf4" : "#ffffff",
      fontSize: "11px",
      cursor: "pointer",

      "&:hover": {
        borderColor: "#9fdfbc",
      },
    }),

    valueContainer: (base) => ({
      ...base,
      height: "23px",
      minHeight: "23px",
      padding: "0 6px",
    }),

    singleValue: (base) => ({
      ...base,
      margin: 0,
      color: "#374151",
      fontSize: "11px",
    }),

    placeholder: (base) => ({
      ...base,
      margin: 0,
      color: "#808080",
      fontSize: "11px",
    }),

    input: (base) => ({
      ...base,
      margin: 0,
      padding: 0,
      fontSize: "11px",
      color: "#374151",
    }),

    indicatorsContainer: (base) => ({
      ...base,
      height: "23px",
    }),

    dropdownIndicator: (base) => ({
      ...base,
      padding: "2px 4px",
      color: "#aeb8c2",

      "&:hover": {
        color: "#808080",
      },
    }),

    indicatorSeparator: () => ({
      display: "none",
    }),

    menu: (base) => ({
      ...base,
      zIndex: 9999,
      marginTop: "2px",
      fontSize: "11px",
      borderRadius: "2px",
      overflow: "hidden",
    }),

    menuList: (base) => ({
      ...base,
      padding: 0,
      maxHeight: "180px",
    }),

    option: (base, state) => ({
      ...base,
      padding: "5px 8px",
      fontSize: "11px",
      color: "#374151",
      cursor: "pointer",

      backgroundColor: state.isSelected
        ? "#dff5e9"
        : state.isFocused
          ? "#eefbf4"
          : "#ffffff",

      "&:active": {
        backgroundColor: "#dff5e9",
      },
    }),
  };
    const selectStyles1: StylesConfig<Option, false> = {
    control: (base, state) => ({
      ...base,
      minHeight: "30px",
      height: "30px",
      width: "25%",
      border: "1px solid #d1d5db",
      borderRadius: "4px",
      boxShadow: "none",
      backgroundColor: state.isFocused ? "#eefbf4" : "#ffffff",
      fontSize: "11px",
      cursor: "pointer",

      "&:hover": {
        borderColor: "#9fdfbc",
      },
    }),

    valueContainer: (base) => ({
      ...base,
      height: "23px",
      minHeight: "23px",
      padding: "0 6px",
    }),

    singleValue: (base) => ({
      ...base,
      margin: 0,
      color: "#374151",
      fontSize: "11px",
    }),

    placeholder: (base) => ({
      ...base,
      margin: 0,
      color: "#808080",
      fontSize: "11px",
    }),

    input: (base) => ({
      ...base,
      margin: 0,
      padding: 0,
      fontSize: "11px",
      color: "#374151",
    }),

    indicatorsContainer: (base) => ({
      ...base,
      height: "23px",
    }),

    dropdownIndicator: (base) => ({
      ...base,
      padding: "2px 4px",
      color: "#aeb8c2",

      "&:hover": {
        color: "#808080",
      },
    }),

    indicatorSeparator: () => ({
      display: "none",
    }),

    menu: (base) => ({
      ...base,
      zIndex: 9999,
      marginTop: "2px",
      fontSize: "11px",
      borderRadius: "2px",
      overflow: "hidden",
    }),

    menuList: (base) => ({
      ...base,
      padding: 0,
      maxHeight: "180px",
    }),

    option: (base, state) => ({
      ...base,
      padding: "5px 8px",
      fontSize: "11px",
      color: "#374151",
      cursor: "pointer",

      backgroundColor: state.isSelected
        ? "#dff5e9"
        : state.isFocused
          ? "#eefbf4"
          : "#ffffff",

      "&:active": {
        backgroundColor: "#dff5e9",
      },
    }),
  };

  // ============================================================
  // SAVE
  // ============================================================

  const handleSave = () => {
    console.log({
      txtCoID,
      txtCoName,
      txtCoName_AR,
      txtCoName_Short,
      txtCoName_QR,
      txtVATNo,
      txtVATNo_AR,
      lkpPurchaseExpenseGroup,
      lkpBG2ARAP,
      lkpYearClosingMethod,
    });
  };

  // ============================================================
  // SEARCH
  // ============================================================

  const handleSearch = () => {
    console.log("Search");
  };

  // ============================================================
  // DELETE
  // ============================================================

  const handleDelete = () => {
    console.log("Delete");
  };

  // ============================================================
  // CLEAR
  // ============================================================

  const handleClear = () => {
    setCoID("");
    setCoName("");
    setCoName_AR("");
    setCoName_Short("");
    setCoName_QR("");
    setVATNo("");
    setVATNo_AR("");

    setPurchaseExpenseGroup(null);
    setBG2ARAP(null);
    setYearClosingMethod(null);
  };

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-white">
      <div className="w-[870px] overflow-hidden border border-slate-400 bg-white shadow-sm">

        {/* =====================================================
            HEADER
        ===================================================== */}

        <div className="flex h-[28px] w-full items-center bg-[#a7dfc0]">
          <h1 className="ml-[5px] text-[17px] font-semibold text-[#374151]">
            Company
          </h1>
        </div>

        {/* =====================================================
            FORM
        ===================================================== */}

        <div className="px-[5px] pb-[12px] pt-[8px]">

          {/* =================================================
              COMPANY ID
          ================================================= */}

          <div className="mb-[8px] grid grid-cols-[195px_1fr] items-center">
            <label
              htmlFor="txtCoID"
              className="pr-3 text-right text-[14px] text-gray-600"
            >
              Company ID :
            </label>

            <input
              id="txtCoID"
              type="text"
              value={txtCoID}
              onChange={(e) => setCoID(e.target.value)}
              autoComplete="off"
              className="w-[10%] input-style"
            />
          </div>

          {/* =================================================
              COMPANY NAME
          ================================================= */}

          <div className="mb-[8px] grid grid-cols-[195px_1fr] items-center">
            <label
              htmlFor="txtCoName"
              className="pr-3 text-right text-[14px] text-gray-600"
            >
              Company Name :
            </label>

            <input
              id="txtCoName"
              type="text"
              value={txtCoName}
              onChange={(e) => setCoName(e.target.value)}
              autoComplete="off"
              className={inputClass}
            />
          </div>

          {/* =================================================
              COMPANY NAME AR
          ================================================= */}

          <div className="mb-[8px] grid grid-cols-[195px_1fr] items-center">
            <label
              htmlFor="txtCoName_AR"
              className="pr-3 text-right text-[14px] text-gray-600"
            >
              Company Name (AR) :
            </label>

            <input
              id="txtCoName_AR"
              type="text"
              dir="rtl"
              value={txtCoName_AR}
              onChange={(e) => setCoName_AR(e.target.value)}
              autoComplete="off"
              className={inputClass}
            />
          </div>

          {/* =================================================
              SHORT COMPANY NAME
          ================================================= */}

          <div className="mb-[8px] grid grid-cols-[195px_1fr] items-center">
            <label
              htmlFor="txtCoName_Short"
              className="pr-3 text-right text-[14px] text-gray-600"
            >
              Short Company Name :
            </label>

            <input
              id="txtCoName_Short"
              type="text"
              value={txtCoName_Short}
              onChange={(e) => setCoName_Short(e.target.value)}
              autoComplete="off"
              className={smallInputClass}
            />
          </div>

          {/* =================================================
              COMPANY NAME QR
          ================================================= */}

          <div className="mb-[8px] grid grid-cols-[195px_1fr] items-center">
            <label
              htmlFor="txtCoName_QR"
              className="pr-3 text-right text-[14px] text-gray-600"
            >
              Company Name (QR) :
            </label>

            <input
              id="txtCoName_QR"
              type="text"
              value={txtCoName_QR}
              onChange={(e) => setCoName_QR(e.target.value)}
              autoComplete="off"
              className={smallInputClass}
            />
          </div>

          {/* =================================================
              VAT NO
          ================================================= */}

          <div className="mb-[8px] grid grid-cols-[195px_1fr] items-center">
            <label
              htmlFor="txtVATNo"
              className="pr-3 text-right text-[14px] text-gray-600"
            >
              VAT No. :
            </label>

            <input
              id="txtVATNo"
              type="text"
              value={txtVATNo}
              onChange={(e) => setVATNo(e.target.value)}
              autoComplete="off"
              className={smallInputClass}
            />
          </div>

          {/* =================================================
              VAT NO AR
          ================================================= */}

          <div className="mb-[8px] grid grid-cols-[195px_1fr] items-center">
            <label
              htmlFor="txtVATNo_AR"
              className="pr-3 text-right text-[14px] text-gray-600"
            >
              VAT No. (AR) :
            </label>

            <input
              id="txtVATNo_AR"
              type="text"
              value={txtVATNo_AR}
              onChange={(e) => setVATNo_AR(e.target.value)}
              autoComplete="off"
              className={`${smallInputClass} text-right`}
            />
          </div>

          {/* =================================================
              PURCHASE EXPENSE GROUP
          ================================================= */}

          <div className="mb-[8px] grid grid-cols-[195px_1fr] items-center">
            <label
              htmlFor="lkpPurchaseExpenseGroup"
              className="pr-3 text-right text-[14px] text-gray-600"
            >
              Purchase Expense Group :
            </label>

            <Select<Option, false>
              inputId="lkpPurchaseExpenseGroup"
              instanceId="lkpPurchaseExpenseGroup"
              options={purchaseExpenseGroupOptions}
              value={lkpPurchaseExpenseGroup}
              onChange={(option: SingleValue<Option>) =>
                setPurchaseExpenseGroup(option)
              }
              styles={selectStyles}
              isClearable={false}
              isSearchable
              placeholder=""
              menuPosition="fixed"
            />
          </div>

          {/* =================================================
              BG2 AR/AP
          ================================================= */}

          <div className="mb-[8px] grid grid-cols-[195px_1fr] items-center">
            <label
              htmlFor="lkpBG2ARAP"
              className="pr-3 text-right text-[14px] text-gray-600"
            >
              BG2 AR/AP :
            </label>

            <Select<Option, false>
              inputId="lkpBG2ARAP"
              instanceId="lkpBG2ARAP"
              options={bg2ARAPOptions}
              value={lkpBG2ARAP}
              onChange={(option: SingleValue<Option>) =>
                setBG2ARAP(option)
              }
              styles={selectStyles1}
              isClearable={false}
              isSearchable={false}
              placeholder=""
              menuPosition="fixed"
            />
          </div>

          {/* =================================================
              YEAR CLOSING METHOD
          ================================================= */}

          <div className="mb-[8px] grid grid-cols-[195px_1fr] items-center">
            <label
              htmlFor="lkpYearClosingMethod"
              className="pr-3 text-right text-[14px] text-gray-600"
            >
              Year Closing Method :
            </label>

            <Select<Option, false>
              inputId="lkpYearClosingMethod"
              instanceId="lkpYearClosingMethod"
              options={yearClosingMethodOptions}
              value={lkpYearClosingMethod}
              onChange={(option: SingleValue<Option>) =>
                setYearClosingMethod(option)
              }
              styles={selectStyles1}
              isClearable={false}
              isSearchable={false}
              placeholder=""
              menuPosition="fixed"
            />
          </div>

          {/* =================================================
              BUTTONS
          ================================================= */}

          <div className="mt-[14px] flex justify-center gap-3">

            <button
              id="btnSave"
              type="button"
              onClick={handleSave}
              className="btn-style"
            >
              <span className="underline underline-offset-2">
                S
              </span>
              ave
            </button>

            <button
              id="btnSearch"
              type="button"
              onClick={handleSearch}
              className="btn-style"
            >
              <span className="underline underline-offset-2">
                S
              </span>
              earch
            </button>

            <button
              id="btnDelete"
              type="button"
              onClick={handleDelete}
              className="btn-style"
            >
              <span className="underline underline-offset-2">
                D
              </span>
              elete
            </button>

            <button
              id="btnClear"
              type="button"
              onClick={handleClear}
              className="btn-style"
            >
              <span className="underline underline-offset-2">
                C
              </span>
              lear
            </button>

          </div>
        </div>
      </div>
    </div>
  );
};

export default CompanyPage;