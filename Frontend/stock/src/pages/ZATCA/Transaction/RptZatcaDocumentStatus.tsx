
import React, { useState } from "react";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";

import Header from "../../../components/common/Header";
import CommonTableSelect, {
  type TableSelectOption,
} from "../../../components/common/CommonTableSelect";

dayjs.extend(customParseFormat);

const DATE_FORMAT = "DD/MM/YYYY";
const TODAY = dayjs().format(DATE_FORMAT);

const branchOptions: TableSelectOption[] = [
  { value: "JD", label: "JEDDAH", id: "JD" },
  { value: "RH", label: "RIYADH", id: "RH" },
];

const branchColumns = [
  { key: "label", label: "Branch", width: "1fr" },
  { key: "id", label: "ID", width: "65px", align: "right" as const },
];

type RadioProps = {
  name: string;
  value: string;
  label: string;
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
};

const CustomRadio: React.FC<RadioProps> = ({
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
      {checked && (
        <span className="h-2.25 w-2.25 rounded-full bg-[#4ade80]" />
      )}
    </span>

    <span className="text-[12px] leading-4.25 text-[#172b43]">
      {label}
    </span>
  </label>
);

const RadioPanel: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = "" }) => (
  <div
    className={`flex flex-col justify-center gap-1.5 border border-gray-300 rounded-sm bg-white px-1.75 py-1.75 ${className}`}
  >
    {children}
  </div>
);

const AppDatePicker: React.FC<{
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}> = ({ id, label, value, onChange }) => (
  <LocalizationProvider dateAdapter={AdapterDayjs}>
    <DatePicker
      value={value ? dayjs(value, DATE_FORMAT) : null}
      onChange={(newValue) => {
        onChange(
          newValue?.isValid() ? newValue.format(DATE_FORMAT) : ""
        );
      }}
      format={DATE_FORMAT}
      slotProps={{
        textField: {
          id,
          slotProps: {
            htmlInput: { "aria-label": label },
          },
        },
        openPickerButton: {
          sx: { padding: "2px", margin: 0 },
        },
        inputAdornment: {
          sx: { margin: 0, padding: 0 },
        },
      }}
      sx={{
        width: "100%",
        minWidth: 0,
        "& .MuiPickersTextField-root": {
          width: "100%",
        },
        "& .MuiPickersInputBase-root": {
          width: "100%",
          height: "28px",
          minHeight: "28px",
          boxSizing: "border-box",
          borderRadius: "4px",
          backgroundColor: "#ffffff",
          fontSize: "12px",
          padding: 0,
          overflow: "hidden",
        },
        "& .MuiPickersInputBase-sectionsContainer": {
          paddingLeft: "8px !important",
          paddingRight: "0px !important",
          marginBottom: "-5px !important",
          marginLeft: "0px !important",
          boxSizing: "border-box",
          overflow: "hidden",
        },
        "& .MuiPickersInputBase-sectionContent": {
          fontSize: "12px",
          color: "#344054",
        },
        "& .MuiPickersInputBase-input": {
          minWidth: 0,
          width: "100%",
          fontSize: "12px",
          padding: 0,
          height: "28px",
          boxSizing: "border-box",
        },
        "& .MuiInputAdornment-root": {
          margin: 0,
          padding: 0,
        },
        "& .MuiIconButton-root": {
          width: "22px",
          height: "22px",
          padding: "2px",
          margin: 0,
        },
        "& .MuiSvgIcon-root": {
          fontSize: "15px",
        },
        "& .Mui-disabled": {
          WebkitTextFillColor: "#24364d",
        },
        ...(!value && {
          "&:not(:focus-within) .MuiPickersInputBase-sectionsContainer *": {
            color: "transparent",
          },
        }),
        "& .MuiPickersOutlinedInput-notchedOutline": {
          borderColor: "#B7C7D7 !important",
        },
        "& .MuiPickersInputBase-root:hover .MuiPickersOutlinedInput-notchedOutline":
          {
            borderColor: "#B7C7D7 !important",
          },
        "& .MuiPickersInputBase-root.Mui-focused .MuiPickersOutlinedInput-notchedOutline":
          {
            borderColor: "#B7C7D7 !important",
            borderWidth: "1px",
          },
        "& .MuiPickersInputBase-root.Mui-error .MuiPickersOutlinedInput-notchedOutline":
          {
            borderColor: "#B7C7D7 !important",
          },
      }}
    />
  </LocalizationProvider>
);

const ActionButton: React.FC<{
  children: React.ReactNode;
  onClick: () => void;
  className?: string;
}> = ({ children, onClick, className = "" }) => (
  <button
    type="button"
    onClick={onClick}
    className={`min-w-20 btn-style ${className}`}
  >
    {children}
  </button>
);

const RptZatcaDocumentStatus: React.FC = () => {
  const [branchMode, setBranchMode] = useState("All Branch");
  const [branch, setBranch] = useState<TableSelectOption | null>(null);

  const [documentStatus, setDocumentStatus] = useState("Not Cleared");

  const [dateMode, setDateMode] = useState("By Document Issue Date");

  const [fromDate, setFromDate] = useState(TODAY);
  const [toDate, setToDate] = useState(TODAY);

  const [excludeInterCompany, setExcludeInterCompany] = useState(true);

  const handlePrint = () => {
    console.log("ZATCA Document Status", {
      branchMode,
      branch: branchMode === "One Branch" ? branch : null,
      documentStatus,
      dateMode,
      fromDate,
      toDate,
      excludeInterCompany,
    });

    // Connect your report API / Print function here.
  };

  const handleClose = () => {
    window.history.back();
  };

  return (
    <div className="min-h-full w-full bg-white p-1 sm:p-2">
      <main className="mx-auto w-full max-w-145 overflow-hidden rounded-[3px] border border-[#91a7bb] bg-white shadow-sm">

        {/* Header */}
        <Header Name="ZATCA Status" />

        <section className="relative min-h-60 px-3.5 pb-3 pt-3.5">

          <div className="grid grid-cols-[minmax(0,1fr)_172px] gap-x-4.75 gap-y-3">

            {/* Branch Selection */}
            <div className="flex min-w-0 items-start gap-2">
              <RadioPanel className="h-17.5 w-27.25">
                <CustomRadio
                  name="rgdBranch"
                  value="One Branch"
                  label="One Branch"
                  checked={branchMode === "One Branch"}
                  onChange={() => setBranchMode("One Branch")}
                />

                <CustomRadio
                  name="rgdBranch"
                  value="All Branch"
                  label="All Branches"
                  checked={branchMode === "All Branch"}
                  onChange={() => setBranchMode("All Branch")}
                />
              </RadioPanel>

              {branchMode === "One Branch" && (
                <div className="w-62.5 min-w-0 pt-1.5">
                  <CommonTableSelect
                    inputId="zatca-document-status-branch"
                    options={branchOptions}
                    value={branch}
                    onChange={setBranch}
                    columns={branchColumns}
                    width="100%"
                    menuWidth="290px"
                    placeholder="Select Branch"
                    menuPortalTarget={
                      typeof document !== "undefined" ? document.body : undefined
                    }
                  />
                </div>
              )}
            </div>

            {/* Document Status */}
            <div className="flex justify-end">
              <RadioPanel className="h-17.5 w-43">
                <CustomRadio
                  name="rgdStatus"
                  value="Cleared"
                  label="Cleared"
                  checked={documentStatus === "Cleared"}
                  onChange={() => setDocumentStatus("Cleared")}
                />

                <CustomRadio
                  name="rgdStatus"
                  value="Not Cleared"
                  label="Not Cleared"
                  checked={documentStatus === "Not Cleared"}
                  onChange={() => setDocumentStatus("Not Cleared")}
                />
              </RadioPanel>
            </div>

            {/* Period */}
            <div className="flex min-w-0 items-center gap-1.25">
              <div className="flex h-7.5 w-26.25 shrink-0 items-center justify-end border border-gray-300 bg-[#FAFBFC] px-1.75">
                <span className="text-[12px] text-[#172b43]">
                  Period :
                </span>
              </div>

              <div className="w-27.5 min-w-0">
                <AppDatePicker
                  id="dtpFromDate"
                  label="Period start date"
                  value={fromDate}
                  onChange={setFromDate}
                />
              </div>

              <div className="w-27.5 min-w-0">
                <AppDatePicker
                  id="dtpToDate"
                  label="Period end date"
                  value={toDate}
                  onChange={setToDate}
                />
              </div>
            </div>

            {/* Date Selection */}
            <div className="flex justify-end">
              <RadioPanel className="min-h-22.5 w-43">
                <CustomRadio
                  name="rdgDate"
                  value="By Submission Date"
                  label="By Submission Date"
                  checked={dateMode === "By Submission Date"}
                  onChange={() => setDateMode("By Submission Date")}
                />

                <CustomRadio
                  name="rdgDate"
                  value="By Document Issue Date"
                  label="By Document Issue Date"
                  checked={dateMode === "By Document Issue Date"}
                  onChange={() => setDateMode("By Document Issue Date")}
                />

                <CustomRadio
                  name="rdgDate"
                  value="By Document Date"
                  label="By Document Date"
                  checked={dateMode === "By Document Date"}
                  onChange={() => setDateMode("By Document Date")}
                />
              </RadioPanel>
            </div>

            {/* Buttons */}
            <div className="flex items-center justify-center gap-1 pt-0.5">
              <ActionButton
                onClick={handlePrint}
                className="h-9 w-20"
              >
                <u>P</u>rint
              </ActionButton>

              <ActionButton
                onClick={handleClose}
                className="h-9 w-20"
              >
                Close
              </ActionButton>
            </div>

            {/* Exclude Inter Company */}
            <div className="flex justify-end">
              <label className="flex h-6 items-center gap-1 border border-gray-300 bg-[#FAFBFC] px-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={excludeInterCompany}
                  onChange={(e) =>
                    setExcludeInterCompany(e.target.checked)
                  }
                  className="h-3.5 w-3.5 accent-[#64748b]"
                />

                <span className="whitespace-nowrap text-[12px] text-[#172b43]">
                  Exclude Inter Company
                </span>
              </label>
            </div>

          </div>
        </section>
      </main>
    </div>
  );
};

export default RptZatcaDocumentStatus;
