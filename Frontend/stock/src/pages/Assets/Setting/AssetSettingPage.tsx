
import React, { useState } from "react";

import Header from "../../../components/common/Header";


import {
  LocalizationProvider,
} from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";

import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { CustomTableSelect, type TableSelectOption } from "../../../components/common/CommonTableSelect";

dayjs.extend(customParseFormat);

type Option = TableSelectOption;

type AssetSettingRow = {
  id: number;
  assetAccount: Option | null;
  accumulatedDepreciationAccount: Option | null;
  depreciationExpenseAccount: Option | null;
};

const DATE_FORMAT = "DD-MM-YYYY";

// ==================================================
// SAMPLE ACCOUNT OPTIONS
// Replace with API data
// ==================================================

const accountOptions: Option[] = [
  { value: "1001", label: "1001 - Fixed Assets", accountName: "Fixed Assets" },
  { value: "1002", label: "1002 - Furniture", accountName: "Furniture" },
  {
    value: "1003",
    label: "1003 - Computer Equipment",
    accountName: "Computer Equipment",
  },
  {
    value: "2001",
    label: "2001 - Accumulated Depreciation",
    accountName: "Accumulated Depreciation",
  },
  {
    value: "3001",
    label: "3001 - Depreciation Expense",
    accountName: "Depreciation Expense",
  },
];

const accountColumns = [
  { key: "accountName", label: "Account Name", width: "1fr" },
  { key: "value", label: "ID", width: "70px", align: "right" as const },
];

// ==================================================
// DATE PICKER
// ==================================================

const AppDatePicker: React.FC<{
  id: string;
  value: string;
  onChange: (value: string) => void;
  yellow?: boolean;
}> = ({ id, value, onChange, yellow = false }) => (
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
          fullWidth: true,
        },
        openPickerButton: {
          sx: {
            padding: "2px",
            margin: 0,
          },
        },
        inputAdornment: {
          sx: {
            margin: 0,
            padding: 0,
          },
        },
      }}
      sx={{
        width: "100%",
        "& .MuiPickersInputBase-root": {
          height: "30px",
          minHeight: "30px",
          borderRadius: "4px",
          backgroundColor: yellow ? "#ffffd9" : "#ffffff",
          fontSize: "14px",
          padding: 0,
        },
        "& .MuiPickersInputBase-sectionsContainer": {
          paddingLeft: "6px !important",
          marginBottom: "-5px !important",
        },
        "& .MuiPickersInputBase-sectionContent": {
          fontSize: "14px",
          color: "#172b43",
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
        "& .MuiPickersInputBase-root.Mui-focused .MuiPickersOutlinedInput-notchedOutline":
          {
            borderColor: "#91a7bb !important",
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
    className={`h-9 min-w-20 btn-style whitespace-nowrap ${className}`}
  >
    {children}
  </button>
);

// ==================================================
// INITIAL ROWS
// ==================================================

const createInitialRows = (): AssetSettingRow[] =>
  Array.from({ length: 15 }, (_, index) => ({
    id: index + 1,
    assetAccount: null,
    accumulatedDepreciationAccount: null,
    depreciationExpenseAccount: null,
  }));

// ==================================================
// MAIN COMPONENT
// ==================================================

const AssetSettingPage: React.FC = () => {
  const [rows, setRows] = useState<AssetSettingRow[]>(
    createInitialRows,
  );

  const [depreciationStartDate, setDepreciationStartDate] =
    useState("");

  const [depreciationGenStartDate, setDepreciationGenStartDate] =
    useState("");

  // Update individual table cell
  const handleCellChange = (
    rowId: number,
    field: keyof Omit<AssetSettingRow, "id">,
    value: Option | null,
  ) => {
    setRows((prev) =>
      prev.map((row) =>
        row.id === rowId
          ? { ...row, [field]: value }
          : row,
      ),
    );
  };

  // Add another row
    //@ts-ignore
  const handleAddRow = () => {
    setRows((prev) => [
      ...prev,
      {
        id: Math.max(0, ...prev.map((row) => row.id)) + 1,
        assetAccount: null,
        accumulatedDepreciationAccount: null,
        depreciationExpenseAccount: null,
      },
    ]);
  };

  // Save
  const handleSave = () => {
    const data = {
      rows: rows.filter(
        (row) =>
          row.assetAccount ||
          row.accumulatedDepreciationAccount ||
          row.depreciationExpenseAccount,
      ),
      depreciationStartDate,
      depreciationGenStartDate,
    };

    console.log("Asset Setting:", data);
  };

  // // Close
  // const handleClose = () => {
  //   window.history.back();
  // };

  return (
    <div className="min-h-full w-full bg-white p-1 sm:p-2">

      <main className="mx-auto w-full max-w-330 overflow-hidden rounded-[3px] border border-[#91a7bb] bg-white shadow-sm">

        <Header Name="Asset Setting" />

        <section className="px-2.5 pb-3 pt-2">

          {/* TABLE */}

          <div className="h-125.7 w-full overflow-auto border border-[#B7ECD0]">

            <table className="w-full min-w-180 table-fixed border-collapse">

              <thead className="sticky top-0 z-10 bg-[#EEFBF4]">

                <tr className="h-6">

                  <th className="w-5 border border-[#B7ECD0] bg-[#f8f9fc]" />

                  <th className="w-[33%] border border-[#B7ECD0] px-1 text-left text-[12px] font-normal text-[#172b43]">
                    Asset Account
                  </th>

                  <th className="w-[33%] border border-[#B7ECD0] px-1 text-left text-[12px] font-normal text-[#172b43]">
                    Accumulated Depreciation Account
                  </th>

                  <th className="w-[33%] border border-[#B7ECD0] px-1 text-left text-[12px] font-normal text-[#172b43]">
                    Depreciation Expense Account
                  </th>

                </tr>

              </thead>

              <tbody>

                {rows.map((row, index) => (

                  <tr
                    key={row.id}
                    className="h-7.5 bg-[#fbfcfd] hover:bg-[#f3f7ff]"
                  >

                    {/* ROW INDICATOR */}

                    <td className="border-r border-b border-[#B7ECD0] bg-white text-center text-[10px] text-gray-500">
                      {index === 0 ? "▶" : ""}
                    </td>

                    {/* ASSET ACCOUNT */}

                    <td className="border-r border-b border-[#B7ECD0] p-0">
                      <CustomTableSelect
                        inputId={`assetAccount-${row.id}`}
                        options={accountOptions}
                        value={row.assetAccount}
                        onChange={(option) =>
                          handleCellChange(
                            row.id,
                            "assetAccount",
                            option,
                          )
                        }
                        columns={accountColumns}
                        width="100%"
                        menuWidth="119%"
                        controlHeight={26}
                        menuPortalTarget={
                          typeof document !== "undefined"
                            ? document.body
                            : undefined
                        }
                        
                        isSearchable
                        placeholder=""
                      />
                    </td>

                    {/* ACCUMULATED DEPRECIATION ACCOUNT */}

                    <td className="border-r border-b border-[#B7ECD0] p-0">
                      <CustomTableSelect
                        inputId={`accumulatedAccount-${row.id}`}
                        options={accountOptions}
                        value={row.accumulatedDepreciationAccount}
                        onChange={(option) =>
                          handleCellChange(
                            row.id,
                            "accumulatedDepreciationAccount",
                            option,
                          )
                        }
                        columns={accountColumns}
                        width="100%"
                        menuWidth="119%"
                        controlHeight={26}
                        menuPortalTarget={
                          typeof document !== "undefined"
                            ? document.body
                            : undefined
                        }
                        
                        isSearchable
                        placeholder=""
                      />
                    </td>

                    {/* DEPRECIATION EXPENSE ACCOUNT */}

                    <td className="border-r border-b border-[#B7ECD0] p-0">
                      <CustomTableSelect
                        inputId={`expenseAccount-${row.id}`}
                        options={accountOptions}
                        value={row.depreciationExpenseAccount}
                        onChange={(option) =>
                          handleCellChange(
                            row.id,
                            "depreciationExpenseAccount",
                            option,
                          )
                        }
                        columns={accountColumns}
                        width="100%"
                        menuWidth="119%"
                        controlHeight={26}
                        menuPortalTarget={
                          typeof document !== "undefined"
                            ? document.body
                            : undefined
                        }
                        
                        isSearchable
                        placeholder=""
                      />
                    </td>

                  </tr>

                ))}

                {/* NEW ROW */}

                {/* <tr className="h-[26px] bg-[#fbfcfd]">

                  <td className="border-r border-b border-[#B7ECD0] bg-white text-center text-[11px] text-gray-500">
                    *
                  </td>

                  <td
                    colSpan={3}
                    className="border-b border-[#B7ECD0]"
                  >
                    <button
                      type="button"
                      onClick={handleAddRow}
                      className="h-full w-full cursor-text"
                      title="Add new row"
                    />
                  </td>

                </tr> */}

              </tbody>

            </table>

          </div>

          {/* BOTTOM DATE SECTION */}

          <div className="mt-3.5 grid grid-cols-1 gap-3 sm:grid-cols-2">

            <div className="grid grid-cols-[165px_minmax(0,140px)] items-center gap-1">

              <label className="whitespace-nowrap text-[14px] text-[#172b43]">
                Depreciation Start Date :
              </label>

              <AppDatePicker
                id="depreciationStartDate"
                value={depreciationStartDate}
                onChange={setDepreciationStartDate}
              />

            </div>

            <div className="grid grid-cols-[200px_minmax(0,140px)] items-center gap-1">

              <label className="whitespace-nowrap text-[14px] text-[#172b43]">
                Depreciation Gen. Start Date :
              </label>

              <AppDatePicker
                id="depreciationGenStartDate"
                value={depreciationGenStartDate}
                onChange={setDepreciationGenStartDate}
                yellow
              />

            </div>

          </div>

          {/* BUTTONS */}

          <div className="mt-4 flex justify-center gap-1">

            <ActionButton
              onClick={handleSave}
              className="w-20"
            >
              Save
            </ActionButton>

            

          </div>

        </section>

      </main>

    </div>
  );
};

export default AssetSettingPage;
