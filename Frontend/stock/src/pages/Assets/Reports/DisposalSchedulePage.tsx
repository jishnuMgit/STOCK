

import React, { useState } from "react";
import {
  LocalizationProvider,
} from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";

import Header from "../../../components/common/Header";

import CommonTableSelect from "../../../components/common/CommonTableSelect";
import CustomLinkedPairSelect, {
  type PairSelectOption,
} from "../../../components/common/CustomLinkedPairSelect";

dayjs.extend(customParseFormat);

type Option = {
  value: string;
  label: string;
};

const DATE_FORMAT = "DD-MM-YYYY";
const TODAY = dayjs().format(DATE_FORMAT);

// ==================================================
// SAMPLE OPTIONS
// ==================================================

// Branch - Single Select

const branchOptions: Option[] = [
  { value: "JD", label: "Jeddah" },
  { value: "RH", label: "Riyadh" },
];

const branchColumns = [
  { key: "label", label: "Branch", width: "1fr" },
  { key: "value", label: "ID", width: "70px", align: "right" as const },
];

// Cost Center

const costCenterIdOptions: Option[] = [
  { value: "CC001", label: "CC001" },
  { value: "CC002", label: "CC002" },
];

const costCenterNameOptions: Option[] = [
  { value: "CC001", label: "Administration" },
  { value: "CC002", label: "Finance" },
];

// Asset

const assetIdOptions: Option[] = [
  { value: "AS001", label: "AS001" },
  { value: "AS002", label: "AS002" },
];

const assetNameOptions: Option[] = [
  { value: "AS001", label: "Computer" },
  { value: "AS002", label: "Printer" },
];

// ==================================================
// CREATE LINKED PAIR OPTIONS
// ==================================================

const createPairOptions = (
  idOptions: Option[],
  nameOptions: Option[],
): PairSelectOption[] => {
  return idOptions.map((id) => ({
    value: id.value,
    firstLabel: id.label,
    secondLabel:
      nameOptions.find((item) => item.value === id.value)?.label ?? "",
  }));
};

const costCenterPairOptions = createPairOptions(
  costCenterIdOptions,
  costCenterNameOptions,
);

const assetPairOptions = createPairOptions(
  assetIdOptions,
  assetNameOptions,
);

// ==================================================
// CUSTOM RADIO
// ==================================================

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

    <span className="text-[14px] leading-4.25 text-[#172b43]">
      {label}
    </span>
  </label>
);

// ==================================================
// RADIO PANEL
// ==================================================

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

// ==================================================
// DATE PICKER
// ==================================================

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
          newValue?.isValid()
            ? newValue.format(DATE_FORMAT)
            : "",
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
          fontSize:"14px",
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
          fontSize: "14px",
          color: "#344054",
        },

        "& .MuiPickersInputBase-input": {
          minWidth: 0,
          width: "100%",
          fontSize: "14px",
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
      }}
    />
  </LocalizationProvider>
);

// ==================================================
// ACTION BUTTON
// ==================================================

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

// ==================================================
// DEPRECIATION SCHEDULE PAGE
// ==================================================

const DisposalSchedulePage: React.FC = () => {
  const [branchMode, setBranchMode] = useState("All Branch");
  const [branch, setBranch] = useState<Option | null>(null);

  const [costCenterMode, setCostCenterMode] =
    useState("All Cost Center");
  const [costCenterId, setCostCenterId] =
    useState<Option | null>(null);
  const [costCenterName, setCostCenterName] =
    useState<Option | null>(null);

  const [assetMode, setAssetMode] = useState("All Asset");
  const [assetId, setAssetId] = useState<Option | null>(null);
  const [assetName, setAssetName] = useState<Option | null>(null);

  const [fromDate, setFromDate] = useState("01/10/2026");
  const [toDate, setToDate] = useState(TODAY);

  const [detailMode, setDetailMode] = useState("Summary");

  const handlePrint = () => {
    console.log("Disposal Schedule Report:", {
      branchMode,
      branch:
        branchMode === "One Branch" ? branch : null,

      costCenterMode,
      costCenterId:
        costCenterMode === "One Cost Center"
          ? costCenterId
          : null,
      costCenterName:
        costCenterMode === "One Cost Center"
          ? costCenterName
          : null,

      assetMode,
      assetId:
        assetMode === "One Asset" ? assetId : null,
      assetName:
        assetMode === "One Asset" ? assetName : null,

      fromDate,
      toDate,
      detailMode,
    });
  };

  // const handleClose = () => {
  //   window.history.back();
  // };

  return (
    <div className="min-h-screen w-full bg-white p-1 sm:p-2">
      <main className="mx-auto w-full max-w-220 overflow-hidden rounded-[3px] border border-gray-400 bg-white shadow-sm">

        <Header Name="Disposal Schedule" />

        <section className="relative min-h-96 px-3.5 pb-3.5 pt-3.5">
          <div className="flex flex-col items-start gap-3.5">

            {/* BRANCH */}
            <div className="grid grid-cols-[150px_minmax(0,1fr)] items-center gap-x-4">
              <RadioPanel className="h-17.5 w-38">
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
                  label="All Branch"
                  checked={branchMode === "All Branch"}
                  onChange={() => setBranchMode("All Branch")}
                />
              </RadioPanel>

              <div className="pt-1">
                {branchMode === "One Branch" && (
                  <div className="w-62.5 max-w-full">
                    <CommonTableSelect
                      inputId="lkpBranch"
                      options={branchOptions}
                      value={branch}
                      onChange={setBranch}
                      columns={branchColumns}
                      width="250px"
                      menuWidth="320px"
                      placeholder="Select Branch"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* COST CENTER */}
            <div className="grid grid-cols-[150px_minmax(0,1fr)] items-center gap-x-4">
              <RadioPanel className="h-17.5 w-38">
                <CustomRadio
                  name="rgdCostCenter"
                  value="One Cost Center"
                  label="One Cost Center"
                  checked={costCenterMode === "One Cost Center"}
                  onChange={() => setCostCenterMode("One Cost Center")}
                />
                <CustomRadio
                  name="rgdCostCenter"
                  value="All Cost Center"
                  label="All Cost Center"
                  checked={costCenterMode === "All Cost Center"}
                  onChange={() => setCostCenterMode("All Cost Center")}
                />
              </RadioPanel>

              <div className="min-w-0 pt-1">
                {costCenterMode === "One Cost Center" && (
                  <CustomLinkedPairSelect
                    firstInputId="lkpCostCenterId"
                    secondInputId="lkpCostCenterName"
                    options={costCenterPairOptions}
                    firstValue={costCenterId?.value ?? null}
                    secondValue={costCenterName?.value ?? null}
                    firstHeader="Cost Center ID"
                    secondHeader="Cost Center Name"
                    firstWidth={120}
                    secondWidth={450}
                    gap={10}
                     menuPortalTarget={
                      typeof document !== "undefined" ? document.body : undefined
                    }
                    headerFontSize="12px"
                    onChange={(option) => {
                      setCostCenterId(
                        option
                          ? { value: option.value, label: option.firstLabel }
                          : null
                      );
                      setCostCenterName(
                        option
                          ? { value: option.value, label: option.secondLabel }
                          : null
                      );
                    }}
                  />
                )}
              </div>
            </div>

            {/* ASSET */}
            <div className="grid grid-cols-[150px_minmax(0,1fr)] items-center gap-x-4">
              <RadioPanel className="h-17.5 w-38">
                <CustomRadio
                  name="rgdAsset"
                  value="One Asset"
                  label="One Asset"
                  checked={assetMode === "One Asset"}
                  onChange={() => setAssetMode("One Asset")}
                />
                <CustomRadio
                  name="rgdAsset"
                  value="All Asset"
                  label="All Asset"
                  checked={assetMode === "All Asset"}
                  onChange={() => setAssetMode("All Asset")}
                />
              </RadioPanel>

              <div className="min-w-0 pt-1">
                {assetMode === "One Asset" && (
                  <CustomLinkedPairSelect
                    firstInputId="lkpAssetId"
                    secondInputId="lkpAssetName"
                    options={assetPairOptions}
                    firstValue={assetId?.value ?? null}
                    secondValue={assetName?.value ?? null}
                    firstHeader="Asset ID"
                    secondHeader="Asset Name"
                    firstWidth={120}
                    secondWidth={450}
                    gap={10}
                     menuPortalTarget={
                      typeof document !== "undefined" ? document.body : undefined
                    }
                    headerFontSize="12px"
                    onChange={(option) => {
                      setAssetId(
                        option
                          ? { value: option.value, label: option.firstLabel }
                          : null
                      );
                      setAssetName(
                        option
                          ? { value: option.value, label: option.secondLabel }
                          : null
                      );
                    }}
                  />
                )}
              </div>
            </div>

            {/* PERIOD */}
            <div className="grid grid-cols-[150px_minmax(0,1fr)] items-center gap-x-4">
              <div className="flex h-7.5 w-38 items-center border border-gray-300 bg-[#FAFBFC] px-1.75">
                <span className="text-[14px] text-[#172b43]">
                  Period :
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-1.25">
                <div className="w-36.5">
                  <AppDatePicker
                    id="dtpFromDate"
                    label="Period start date"
                    value={fromDate}
                    onChange={setFromDate}
                  />
                </div>
                <div className="w-36.5">
                  <AppDatePicker
                    id="dtpToDate"
                    label="Period end date"
                    value={toDate}
                    onChange={setToDate}
                  />
                </div>
              </div>
            </div>

            {/* DETAILS AND BUTTONS */}
            <div className="grid grid-cols-[150px_minmax(0,1fr)] items-start gap-x-4">
              <RadioPanel className="h-17.5 w-38">
                <CustomRadio
                  name="rgdDetails"
                  value="Detailed"
                  label="Detailed"
                  checked={detailMode === "Detailed"}
                  onChange={() => setDetailMode("Detailed")}
                />
                <CustomRadio
                  name="rgdDetails"
                  value="Summary"
                  label="Summary"
                  checked={detailMode === "Summary"}
                  onChange={() => setDetailMode("Summary")}
                />
              </RadioPanel>

              <div className="flex items-center gap-1 pt-8.5 pl-6 -mt-1.5">
                <ActionButton
                  onClick={handlePrint}
                  className="h-9 w-20"
                >
                  <u>P</u>rint
                </ActionButton>

              
              </div>
            </div>

          </div>
        </section>
      </main>
    </div>
  );
};

export default DisposalSchedulePage;
