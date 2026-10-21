import React, { useState } from "react";
import Select, { type SingleValue } from "react-select";

type Option = {
  value: string;
  label: string;
};

type FinanceYearCloseProps = {
  onClose?: () => void;
  onCancel?: () => void;
  onConfirm?: (data: {
    branch: Option | null;
    year: string;
    closingType: "Temporary" | "Final";
  }) => void;
};

const branchOptions: Option[] = [
  { value: "WAREHOUSE_RIYADH", label: "WAREHOUSE RIYADH" },
  { value: "OFFICE", label: "OFFICE" },
  { value: "BRANCH_1", label: "BRANCH 1" },
  { value: "BRANCH_2", label: "BRANCH 2" },
];

const currentYear = new Date().getFullYear();

const yearOptions: Option[] = Array.from(
  { length: 15 },
  (_, index) => {
    const year = currentYear - 5 + index;
    return {
      value: String(year),
      label: String(year),
    };
  },
);

const FinanceYearClose: React.FC<FinanceYearCloseProps> = ({
  
  onCancel,
  onConfirm,
}) => {
  const [branch, setBranch] = useState<Option | null>(
    branchOptions[0],
  );

  const [year, setYear] = useState(String(currentYear));
  const [closingType, setClosingType] = useState<
    "Temporary" | "Final"
  >("Temporary");
  const [message, setMessage] = useState("");

  const selectStyles = {
    control: (base: object) => ({
      ...base,
      minHeight: "30px",
      height: "30px",
      borderRadius: "4px",
      borderColor: "#cfd7df",
      boxShadow: "none",
      fontSize: "14px",
      "&:hover": {
        borderColor: "#aab8c5",
      },
    }),
    valueContainer: (base: object) => ({
      ...base,
      padding: "0 6px",
      height: "28px",
    }),
    singleValue: (base: object) => ({
      ...base,
      color: "#24364d",
      margin: 0,
    }),
    indicatorsContainer: (base: object) => ({
      ...base,
      height: "28px",
    }),
    dropdownIndicator: (base: object) => ({
      ...base,
      padding: "4px",
      color: "#657486",
    }),
    indicatorSeparator: () => ({
      display: "none",
    }),
    menu: (base: object) => ({
      ...base,
      zIndex: 9999,
      marginTop: "2px",
      fontSize: "14px",
    }),
    option: (
      base: object,
      state: { isFocused: boolean; isSelected: boolean },
    ) => ({
      ...base,
      fontSize: "14px",
      padding: "6px 8px",
      color: "#24364d",
      backgroundColor: state.isSelected
        ? "#e7f7ed"
        : state.isFocused
          ? "#f2faf5"
          : "#ffffff",
    }),
  };

  const inputClass =
    "h-[30px] rounded-[4px] border border-[#cfd7df] " +
    "bg-white px-2 text-[14px] text-[#24364d] outline-none " +
    "focus:border-[#91a7b9]";

  const buttonClass =
    "btn-style inline-flex h-[34px] min-w-[80px] items-center " +
    "justify-center rounded-[4px] border border-[#cfd7df] " +
    "bg-white px-4 text-[14px] text-[#344054] shadow-sm " +
    "hover:bg-[#f3f7f5] active:bg-[#e7eee9]";

  const handleConfirm = () => {
    if (!branch) {
      setMessage("Please select a branch.");
      return;
    }

    if (!year) {
      setMessage("Please select a year to close.");
      return;
    }

    const data = {
      branch,
      year,
      closingType,
    };

    console.log("Year close settings:", data);
    onConfirm?.(data);
    if (message){
    setMessage(message);

    }else{
            setMessage("Year close settings validated successfully.");
    }

  };

  const handleClear = () => {
    setBranch(branchOptions[0]);
    setYear(String(currentYear));
    setClosingType("Temporary");
    setMessage("");
    onCancel?.();
  };

  // const handleClose = () => {
  //   setMessage("");
  //   onClose?.();
  // };

  return (
    <div className="flex min-h-full w-full items-start justify-center bg-white px-3 py-3 sm:px-4 sm:py-4">
      <div className="w-full max-w-[615px] bg-white">
        <main className="w-full border border-[#cfd7df] bg-white">
          {/* Header */}
          <header className="flex h-[33px] items-center bg-[#9fdfbc]">
            <h1 className="ml-4 text-[14px] font-semibold text-[#24364d]">
             Finance Year Close
            </h1>
          </header>

          {/* Form */}
          <section className="px-4 pb-5 pt-5 sm:px-6">
            <div className="grid grid-cols-1 items-start gap-x-4 gap-y-4 sm:grid-cols-[100px_minmax(0,1fr)_150px]">
              {/* Branch */}
              <label
                htmlFor="branch"
                className="flex h-[30px] items-center text-[14px] text-[#405066] sm:justify-end"
              >
                Branch :
              </label>

              <div className="min-w-0 w-[250px]">
                <Select<Option, false>
                  inputId="branch"
                  options={branchOptions}
                  value={branch}
                  onChange={(option: SingleValue<Option>) => {
                    setBranch(option);
                    setMessage("");
                  }}
                  styles={selectStyles}
                  isSearchable
                  isClearable={false}
                  menuPosition="fixed"
                />
              </div>

              {/* Closing panel */}
              <fieldset className="row-span-2 rounded-[4px] border border-[#e0e5ea]">
                <legend className="px-2 text-[14px] text-[#405066]">
                  Year Close Type
                </legend>

                <div className="flex flex-col gap-2 px-3 pb-3 pt-1">
                  <label className="flex cursor-pointer items-center gap-2 text-[14px] text-[#344054]">
                    <input
                      type="radio"
                      name="closingType"
                      value="Temporary"
                      checked={closingType === "Temporary"}
                      onChange={() => {
                        setClosingType("Temporary");
                        setMessage("");
                      }}
                      className="h-[13px] w-[13px] accent-[#64b77d]"
                    />
                    Temporary
                  </label>

                  <label className="flex cursor-pointer items-center gap-2 text-[14px] text-[#344054]">
                    <input
                      type="radio"
                      name="closingType"
                      value="Final"
                      checked={closingType === "Final"}
                      onChange={() => {
                        setClosingType("Final");
                        setMessage("");
                      }}
                      className="h-[13px] w-[13px] accent-[#64b77d]"
                    />
                    Final
                  </label>
                </div>
              </fieldset>

              {/* Year to Close */}
              <label
                htmlFor="year"
                className="flex h-[30px] items-center text-[14px] text-[#405066] sm:justify-end"
              >
                Year to Close :
              </label>

              <div>
                <select
                  id="year"
                  value={year}
                  onChange={(event) => {
                    setYear(event.target.value);
                    setMessage("");
                  }}
                  className={`${inputClass} w-[100px]`}
                >
                  {yearOptions.map((option) => (
                    <option
                      key={option.value}
                      value={option.value}
                    >
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Status */}
            {/* {message && (
              <p
                role="status"
                className="mt-3 text-center text-[14px] text-[#405066]"
              >
                {message}
              </p>
            )} */}

            {/* Actions */}
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <button
                id="btnOK"
                type="button"
                onClick={handleConfirm}
                className={buttonClass}
              >
                <u>O</u>K
              </button>

              <button
                id="btnClear"
                type="button"
                onClick={handleClear}
                className={buttonClass}
              >
                <u>C</u>lear
              </button>
{/* 
              <button
                id="btnClose"
                type="button"
                onClick={handleClose}
                className={buttonClass}
              >
                <u>C</u>lose
              </button> */}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};

export default FinanceYearClose;