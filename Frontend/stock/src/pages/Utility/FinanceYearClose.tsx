import React, { useState } from "react";
import Header from "../../components/common/Header";
import CommonTableSelect from "../../components/common/CommonTableSelect";
import { filterLabelOrValue } from "../../components/BranchSelect/branchSelectParts";

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

// the Branch list: "Branch | ID", as on every other screen. With the 70 px ID column and a list of box + 70 px, the ID
// column starts exactly where the 250 px box ends.
const branchColumns = [
  { key: "label", label: "Branch", width: "1fr" },
  { key: "value", label: "ID", width: "70px", align: "right" as const },
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
          <Header Name="Finance Year Close" />

          {/* Form */}
          <section className="px-4 pb-5 pt-5 sm:px-6">
            {/* the two rows are on their own, so the Year Close Type panel (taller than both) cannot stretch the space between them */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="grid grid-cols-1 items-start gap-x-2 gap-y-3.5 sm:grid-cols-[100px_250px]">
              {/* Branch */}
              <label
                htmlFor="branch"
                className="flex h-[30px] items-center text-[14px] text-[#405066] sm:justify-end"
              >
                Branch :
              </label>

              <div className="min-w-0 w-[250px]">
                <CommonTableSelect
                  inputId="branch"
                  options={branchOptions}
                  value={branch}
                  onChange={(option) => {
                    setBranch(option);
                    setMessage("");
                  }}
                  columns={branchColumns}
                  width="250px"
                  menuWidth="320px"
                  placeholder="Select Branch"
                  filterOption={filterLabelOrValue}
                  menuPortalTarget={typeof document !== "undefined" ? document.body : undefined}
                  noOptionsMessage={() => "No Branch Found"}
                />
              </div>

              {/* Year to Close */}
              <label
                htmlFor="year"
                className="flex h-[30px] items-center text-[14px] text-[#405066] sm:justify-end"
              >
                Year to Close :
              </label>

              <div className="w-27.5">
                <CommonTableSelect
                  inputId="year"
                  options={yearOptions}
                  value={yearOptions.find((option) => option.value === year) ?? null}
                  onChange={(option) => {
                    setYear(option?.value ?? "");
                    setMessage("");
                  }}
                  columns={[{ key: "label", label: "Year" }]}
                  showHeader={false}
                  width="110px"
                  menuWidth="110px"
                  placeholder=""
                  menuPortalTarget={typeof document !== "undefined" ? document.body : undefined}
                  noOptionsMessage={() => "No Year Found"}
                />
              </div>
            </div>

              {/* Closing panel */}
              <fieldset className="w-37.5 shrink-0 rounded-[4px] border border-[#e0e5ea]">
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