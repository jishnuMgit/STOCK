
import React, { useState } from "react";
import Header from "../../../components/common/Header";
import CommonTableSelect, {
  type TableSelectOption,
} from "../../../components/common/CommonTableSelect";

import {
  LocalizationProvider,
} from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";

dayjs.extend(customParseFormat);

const DATE_FORMAT = "DD/MM/YYYY";

const branchOptions: TableSelectOption[] = [
  { value: "JD", label: "JEDDAH", id: "JD" },
  { value: "RH", label: "RIYADH", id: "RH" },
];

const inputStyle =
  " w-full input-style";

const FormField: React.FC<{
  label: string;
  children: React.ReactNode;
}> = ({ label, children }) => (
  <div className="grid grid-cols-[85px_110px] items-center gap-1">
    <label className="text-right whitespace-nowrap text-[12px] text-[#172b43]">
      {label} :
    </label>
    {children}
  </div>
);

const AppDatePicker: React.FC<{
  value: string;
  onChange: (value: string) => void;
}> = ({ value, onChange }) => (
  <LocalizationProvider dateAdapter={AdapterDayjs}>
    <DatePicker
      value={value ? dayjs(value, DATE_FORMAT) : null}
      onChange={(newValue) => {
        onChange(
          newValue?.isValid()
            ? newValue.format(DATE_FORMAT)
            : "",
        );
      }}
      format={DATE_FORMAT}
      slotProps={{
        openPickerButton: {
          sx: { padding: "2px", margin: 0 },
        },
        inputAdornment: {
          sx: { margin: 0, padding: 0 },
        },
      }}
      sx={{
        width: "100%",
        "& .MuiPickersInputBase-root": {
          height: "30px",
          minHeight: "30px",
          borderRadius: "4px",
          backgroundColor: "#ffffff",
          fontSize: "12px",
          padding: 0,
        },
        "& .MuiPickersInputBase-sectionsContainer": {
          paddingLeft: "6px !important",
          marginBottom: "-5px !important",
        },
        "& .MuiPickersInputBase-sectionContent": {
          fontSize: "12px",
          color: "#344054",
        },
        "& .MuiIconButton-root": {
          width: "20px",
          height: "20px",
          padding: "2px",
        },
        "& .MuiSvgIcon-root": {
          fontSize: "14px",
        },
        "& .MuiPickersOutlinedInput-notchedOutline": {
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
    className={`h-9 min-w-20 btn-style whitespace-nowrap ${className}`}
  >
    {children}
  </button>
);

const DepreciationGenerationPage: React.FC = () => {
  const [branch, setBranch] = useState<TableSelectOption | null>(
    branchOptions[0],
  );

  const [asOnDate, setAsOnDate] = useState("");

  const [journalNo, setJournalNo] = useState("JD2600165");

  const handleGenerate = () => {
    console.log("Generate Depreciation:", {
      branch,
      asOnDate,
      journalNo,
    });
  };

  const handleClose = () => {
    window.history.back();
  };

  return (
    <div className="min-h-full w-full bg-white p-1 mt-3 sm:p-2">
      <div className="">
<main className="mx-auto w-full max-w-100 overflow-hidden rounded-[3px] border border-[#91a7bb] bg-white shadow-sm">

        <Header Name="Depreciation Generation" />

        <section className="flex min-h-44 flex-col items-center justify-center gap-2 px-3 py-3 -ml-30">

          <div className="flex flex-col gap-2">

            <FormField label="Branch">
              <CommonTableSelect
                inputId="lkpBranch"
                options={branchOptions}
                value={branch}
                onChange={setBranch}
                columns={[
                  { key: "label", label: "Branch", width: "1fr" },
                  {
                    key: "id",
                    label: "ID",
                    width: "70px",
                    align: "right",
                  },
                ]}
                width="220px"
                menuWidth="280px"
                placeholder="Select Branch"
              />
            </FormField>

            <FormField label="As on date">
              <AppDatePicker
                value={asOnDate}
                onChange={setAsOnDate}
              />
            </FormField>

            <FormField label="Journal No.">
              <input
                type="text"
                value={journalNo}
                onChange={(e) => setJournalNo(e.target.value)}
                className={inputStyle}
              />
            </FormField>

          </div>

          <div className="flex items-center gap-5 pt-2 ml-20">
            <ActionButton
              onClick={handleGenerate}
              className="w-34"
            >
              Generate Depr.
            </ActionButton>

            <ActionButton
              onClick={handleClose}
              className="w-20"
            >
              Close
            </ActionButton>
          </div>

        </section>
      </main>

      </div>
    </div>
  );
};

export default DepreciationGenerationPage;
