
import React, { useState } from "react";
import Select from "react-select";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";

import Header from "../../../components/common/Header";

import CommonTableSelect, {
  type TableSelectOption,
} from "../../../components/common/CommonTableSelect";

import CustomLinkedPairSelect, {
  type PairSelectOption,
} from "../../../components/common/CustomLinkedPairSelect";

import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import selectComponents from "../../../components/sharecomponents/selectComponents";

dayjs.extend(customParseFormat);

// ==================================================
// TYPES
// ==================================================

type Option = {
  value: string;
  label: string;
};

type BeginningBalanceRow = {
  id: number;
  itemId: Option | null;
  itemName: Option | null;
  ccId: string;
  purchasePrice: string;
  accumulatedDepreciation: string;
};

// ==================================================
// CONSTANTS
// ==================================================

const DATE_FORMAT = "DD-MM-YYYY";

const branchOptions: TableSelectOption[] = [
  { value: "JD", label: "JEDDAH", id: "JD" },
  { value: "RH", label: "RIYADH", id: "RH" },
];

const branchColumns = [
  { key: "label", label: "Branch", width: "1fr" },
  { key: "id", label: "ID", width: "70px", align: "right" as const },
];

// ==================================================
// ACCOUNT OPTIONS
// Replace with API data
// ==================================================

const accountIdOptions: Option[] = [
  { value: "1001", label: "1001" },
  { value: "1002", label: "1002" },
  { value: "1003", label: "1003" },
];

const accountNameOptions: Option[] = [
  { value: "1001", label: "Fixed Assets Account" },
  { value: "1002", label: "Furniture Account" },
  { value: "1003", label: "Equipment Account" },
];

const createPairOptions = (
  ids: Option[],
  names: Option[],
): PairSelectOption[] =>
  ids.map((item) => ({
    value: item.value,
    firstLabel: item.label,
    secondLabel:
      names.find((name) => name.value === item.value)?.label ?? "",
  }));

const accountPairOptions = createPairOptions(
  accountIdOptions,
  accountNameOptions,
);

// ==================================================
// ITEM OPTIONS
// ==================================================

const itemOptions: Option[] = [
  { value: "IT001", label: "IT001" },
  { value: "IT002", label: "IT002" },
  { value: "IT003", label: "IT003" },
  { value: "IT004", label: "IT004" },
];

const itemNameLabels: Record<string, string> = {
  IT001: "Computer",
  IT002: "Printer",
  IT003: "Office Furniture",
  IT004: "Air Conditioner",
};

const itemNameOptions: Option[] = itemOptions.map((item) => ({
  value: item.value,
  label: itemNameLabels[item.value] ?? "",
}));

// ==================================================
// REACT SELECT STYLES
// ==================================================

const tableSelectStyles = {
    //@ts-ignore
  control: (base: any, state: any) => ({
    ...base,
    minHeight: "30px",
    height: "30px",
    width: "100%",
    border: "none",
    borderRadius: "0px",
    boxShadow: "none",
    backgroundColor: "transparent",
    fontSize: "14px",
    cursor: "pointer",
    // "&:hover": {
    //   borderColor: "#6b8fcf",
    // },
  }),

  valueContainer: (base: any) => ({
    ...base,
    height: "24px",
    padding: "0 5px",
    overflow: "hidden",
  }),

  input: (base: any) => ({
    ...base,
    margin: 0,
    padding: 0,
    fontSize: "14px",
  }),

  singleValue: (base: any) => ({
    ...base,
    fontSize: "14px",
    color: "#172b43",
    margin: 0,
  }),

  placeholder: (base: any) => ({
    ...base,
    fontSize: "14px",
    margin: 0,
  }),

  indicatorsContainer: (base: any) => ({
    ...base,
    height: "24px",
  }),

  dropdownIndicator: (base: any) => ({
    ...base,
    padding: "3px",
    color: "#75869a",
  }),

  clearIndicator: (base: any) => ({
    ...base,
    padding: "2px",
  }),

  indicatorSeparator: () => ({
    display: "none",
  }),

  menu: (base: any) => ({
    ...base,
    zIndex: 100,
    fontSize: "14px",
  }),

  menuPortal: (base: any) => ({
    ...base,
    zIndex: 9999,
  }),

  option: (base: any, state: any) => ({
    ...base,
    fontSize: "14px",
    padding: "6px 8px",
    backgroundColor: state.isSelected
      ? "#dbeafe"
      : state.isFocused
        ? "#eff6ff"
        : "#ffffff",
    color: "#172b43",
  }),
};

// ==================================================
// INITIAL ROWS
// ==================================================

const createRows = (): BeginningBalanceRow[] =>
  Array.from({ length: 15 }, (_, index) => ({
    id: index + 1,
    itemId: null,
    itemName: null,
    ccId: "",
    purchasePrice: "",
    accumulatedDepreciation: "",
  }));

// ==================================================
// DATE PICKER
// ==================================================

const AppDatePicker: React.FC<{
  id: string;
  value: string;
  onChange: (value: string) => void;
}> = ({ id, value, onChange }) => (
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
          sx: { padding: "2px", margin: 0 },
        },
        inputAdornment: {
          sx: { padding: 0, margin: 0 },
        },
      }}
      sx={{
        width: "100%",
        "& .MuiPickersInputBase-root": {
          height: "30px",
          minHeight: "30px",
          borderRadius: "4px",
          backgroundColor: "#fff",
          fontSize: "14px",
          padding: 0,
        },
        "& .MuiPickersInputBase-sectionsContainer": {
          paddingLeft: "6px !important",
          paddingRight: "0px !important",
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
  disabled?: boolean;
  className?: string;
}> = ({ children, onClick, disabled = false, className = "" }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={`h-9 min-w-20 btn-style whitespace-nowrap ${
      disabled ? "cursor-not-allowed opacity-50" : ""
    } ${className}`}
  >
    {children}
  </button>
);

// ==================================================
// MAIN COMPONENT
// ==================================================

const DepreciationBeginningBalancePage: React.FC = () => {

  // Account selections

  const [assetAccount, setAssetAccount] =
    useState<Option | null>(null);

  const [accumulatedAccount, setAccumulatedAccount] =
    useState<Option | null>(null);

  const [expenseAccount, setExpenseAccount] =
    useState<Option | null>(null);

  // Branch

  const [branch, setBranch] =
    useState<TableSelectOption | null>(branchOptions[0]);

  // Date

  const [date, setDate] = useState("");

  // Table

  const [rows, setRows] = useState<BeginningBalanceRow[]>(
    createRows,
  );

  // Current row

  const [activeRow, setActiveRow] = useState(1);

  // ==================================================
  // TABLE UPDATE
  // ==================================================

  const handleItemChange = (
    rowId: number,
    option: Option | null,
  ) => {
    const itemId =
      itemOptions.find((item) => item.value === option?.value) ?? null;
    const itemName =
      itemNameOptions.find((item) => item.value === option?.value) ?? null;

    setRows((prev) =>
      prev.map((row) =>
        row.id === rowId
          ? {
              ...row,
              itemId,
              itemName,
            }
          : row,
      ),
    );
  };

  const handleRowChange = (
    rowId: number,
    field: "ccId" | "purchasePrice" | "accumulatedDepreciation",
    value: string,
  ) => {
    setRows((prev) =>
      prev.map((row) =>
        row.id === rowId
          ? { ...row, [field]: value }
          : row,
      ),
    );
  };

  // ==================================================
  // TOTAL ACCUMULATED DEPRECIATION
  // ==================================================

  const totalAccumulatedDepreciation = rows.reduce(
    (total, row) =>
      total + (Number(row.accumulatedDepreciation) || 0),
    0,
  );

  // ==================================================
  // ADD ROW
  // ==================================================
  //@ts-ignore
  const handleAddRow = () => {
    setRows((prev) => {
      const nextId = Math.max(0, ...prev.map((row) => row.id)) + 1;

      return [
        ...prev,
        {
          id: nextId,
          itemId: null,
          itemName: null,
          ccId: "",
          purchasePrice: "",
          accumulatedDepreciation: "",
        },
      ];
    });
  };

  // ==================================================
  // SAVE
  // ==================================================

  const handleSave = () => {
    const data = {
      assetAccount,
      branch,
      date,
      accumulatedAccount,
      expenseAccount,
      rows: rows.filter(
        (row) =>
          row.itemId ||
          row.ccId ||
          row.purchasePrice ||
          row.accumulatedDepreciation,
      ),
      totalAccumulatedDepreciation,
    };

    console.log("Depreciation Beginning Balance:", data);
  };

  // ==================================================
  // PRINT
  // ==================================================

  const handlePrint = () => {
    console.log("Print Depreciation Beginning Balance");
  };

  // ==================================================
  // POST
  // ==================================================

  const handlePost = () => {
    console.log("Post Depreciation Beginning Balance");
  };

  // ==================================================
  // CANCEL
  // ==================================================

  const handleCancel = () => {
    setAssetAccount(null);
    setAccumulatedAccount(null);
    setExpenseAccount(null);
    setBranch(branchOptions[0]);
    setDate("");
    setRows(createRows());
    setActiveRow(1);
  };

 

  // ==================================================
  // UI
  // ==================================================

  return (
    <div className="min-h-full w-full bg-white p-1 sm:p-2">

      <main className="mx-auto w-full max-w-270 overflow-hidden rounded-[3px] border border-[#91a7bb] bg-white shadow-sm">

        <Header Name="Depreciation Beginning Balance" />

        <section className="px-2.5 pb-3 pt-3">

          {/* ========================================
              TOP ACCOUNT SECTION
          ======================================== */}

          <div className="mx-auto grid max-w-212.5 grid-cols-1 gap-x-5 gap-y-1 sm:grid-cols-[1fr_1fr]">

            {/* ASSET ACCOUNT */}

            <div className="grid grid-cols-[165px_minmax(0,1fr)] items-center gap-1 sm:col-span-2">

              <label className="text-right text-[14px] text-[#172b43]">
                Asset Account :
              </label>

              <div className="flex min-w-0 gap-1">
                <CustomLinkedPairSelect
                  firstInputId="lkpAssetAccountId"
                  secondInputId="lkpAssetAccountName"
                  options={accountPairOptions}
                  firstValue={assetAccount?.value ?? null}
                  secondValue={assetAccount?.value ?? null}
                  firstHeader="Account ID"
                  secondHeader="Account Name"
                  firstWidth={120}
                  secondWidth={430}
                  gap={4}
                  headerFontSize="12px"
                  onChange={(option) => {
                    setAssetAccount(
                      option
                        ? {
                            value: option.value,
                            label: option.firstLabel,
                          }
                        : null,
                    );
                  }}
                />
              </div>

            </div>

            {/* BRANCH */}

            <div className="grid grid-cols-[165px_minmax(0,1fr)] items-center gap-1">

              <label className="text-right text-[14px] text-[#172b43]">
                Branch :
              </label>

              <CommonTableSelect
                inputId="branch"
                options={branchOptions}
                value={branch}
                onChange={setBranch}
                columns={branchColumns}
                width="250px"
                menuWidth="280px"
                placeholder="Select Branch"
              />

            </div>

            {/* DATE */}

            <div className="grid grid-cols-[140px_minmax(0,1fr)] items-center gap-1">

              <label className="text-right text-[14px] text-[#172b43]">
                Date :
              </label>

              <div className="w-36">
                <AppDatePicker
                  id="beginningBalanceDate"
                  value={date}
                  onChange={setDate}
                />
              </div>

            </div>

            {/* ACCUMULATED DEPRECIATION ACCOUNT */}

            <div className="grid grid-cols-[165px_minmax(0,1fr)] items-center gap-1 sm:col-span-2">

              <label className="text-right whitespace-nowrap text-[14px] text-[#172b43] -ml-10">
                Accumulated Depr. Account :
              </label>

              <CustomLinkedPairSelect
                firstInputId="lkpAccumulatedAccountId"
                secondInputId="lkpAccumulatedAccountName"
                options={accountPairOptions}
                firstValue={accumulatedAccount?.value ?? null}
                secondValue={accumulatedAccount?.value ?? null}
                firstHeader="Account ID"
                secondHeader="Account Name"
                firstWidth={120}
                secondWidth={430}
                gap={4}
                headerFontSize="12px"
                onChange={(option) => {
                  setAccumulatedAccount(
                    option
                      ? {
                          value: option.value,
                          label: option.firstLabel,
                        }
                      : null,
                  );
                }}
              />

            </div>

            {/* DEPRECIATION EXPENSE ACCOUNT */}

            <div className="grid grid-cols-[165px_minmax(0,1fr)] items-center gap-1 sm:col-span-2">

              <label className="text-right whitespace-nowrap text-[14px] text-[#172b43]">
                Depr. Expense Account :
              </label>

              <CustomLinkedPairSelect
                firstInputId="lkpExpenseAccountId"
                secondInputId="lkpExpenseAccountName"
                options={accountPairOptions}
                firstValue={expenseAccount?.value ?? null}
                secondValue={expenseAccount?.value ?? null}
                firstHeader="Account ID"
                secondHeader="Account Name"
                firstWidth={120}
                secondWidth={430}
                gap={4}
                headerFontSize="12px"
                onChange={(option) => {
                  setExpenseAccount(
                    option
                      ? {
                          value: option.value,
                          label: option.firstLabel,
                        }
                      : null,
                  );
                }}
              />

            </div>

          </div>

          {/* ========================================
              BEGINNING BALANCE TABLE
          ======================================== */}

          <div className="mt-2.5 w-full overflow-x-auto border border-[#B7ECD0]">

            <table className="w-full min-w-212.5 table-fixed border-collapse">

              <thead className="bg-[#f7f8fa]">

                <tr className="h-6">

                  <th className="w-4 border border-[#B7ECD0]" />

                  <th className="w-[5%] border border-[#B7ECD0] text-center text-[12px] font-normal text-[#172b43]">
                    Sl.No.
                  </th>

                  <th className="w-[15%] border border-[#B7ECD0] px-1 text-left text-[12px] font-normal text-[#172b43]">
                    Item ID
                  </th>

                  <th className="w-[44%] border border-[#B7ECD0] px-1 text-left text-[12px] font-normal text-[#172b43]">
                    Item Name
                  </th>

                  <th className="w-[6%] border border-[#B7ECD0] text-center text-[12px] font-normal text-[#172b43]">
                    CC. ID
                  </th>

                  <th className="w-[13%] border border-[#B7ECD0] px-1 text-right text-[12px] font-normal text-[#172b43]">
                    Pur. Price
                  </th>

                  <th className="w-[14%] border border-[#B7ECD0] px-1 text-right text-[12px] font-normal text-[#172b43]">
                    Accu. Depr. Amt.
                  </th>

                </tr>

              </thead>

              <tbody>

                {rows.map((row, index) => (

                  <tr
                    key={row.id}
                    onClick={() => setActiveRow(row.id)}
                    className="h-6.75 bg-[#fbfcfd]"
                  >

                    {/* ROW INDICATOR */}

                    <td className="border-r border-b border-[#B7ECD0] bg-[#f5f6f8] text-center text-[10px] text-gray-600">
                      {activeRow === row.id ? "▶" : ""}
                    </td>

                    {/* SERIAL NUMBER */}

                    <td className="border-r border-b border-[#B7ECD0] text-center text-[12px] text-[#172b43]">
                      {index + 1}
                    </td>

                    {/* ITEM ID - REACT SELECT */}

                    <td className="border-r border-b border-[#B7ECD0] p-0">

                      <Select<Option, false>
                        inputId={`itemId-${row.id}`}
                        options={itemOptions}
                        components={selectComponents}
                        value={row.itemId}
                        onChange={(option) =>
                          handleItemChange(row.id, option)
                        }
                        styles={tableSelectStyles}
                        menuPortalTarget={
                          typeof document !== "undefined"
                            ? document.body
                            : undefined
                        }
                        menuPosition="fixed"
                        isClearable
                        isSearchable
                        placeholder=""
                      />

                    </td>

                    {/* ITEM NAME - LINKED REACT SELECT */}

                    <td className="border-r border-b border-[#B7ECD0] p-0">

                      <Select<Option, false>
                        inputId={`itemName-${row.id}`}
                        options={itemNameOptions}
                        components={selectComponents}
                        value={row.itemName}
                        onChange={(option) =>
                          handleItemChange(row.id, option)
                        }
                        styles={tableSelectStyles}
                        menuPortalTarget={
                          typeof document !== "undefined"
                            ? document.body
                            : undefined
                        }
                        menuPosition="fixed"
                        isClearable
                        isSearchable
                        placeholder=""
                      />

                    </td>

                    {/* COST CENTER ID */}

                    <td className="border-r border-b border-[#B7ECD0] p-0">

                      <input
                        type="text"
                        value={row.ccId}
                        onChange={(e) =>
                          handleRowChange(
                            row.id,
                            "ccId",
                            e.target.value,
                          )
                        }
                        className="h-7.5 w-full bg-transparent px-1 text-center text-[12px] outline-none focus:bg-[#edf4ff]"
                      />

                    </td>

                    {/* PURCHASE PRICE */}

                    <td className="border-r border-b border-[#B7ECD0] p-0">

                      <input
                        type="number"
                        value={row.purchasePrice}
                        onChange={(e) =>
                          handleRowChange(
                            row.id,
                            "purchasePrice",
                            e.target.value,
                          )
                        }
                        className="h-7.5 w-full bg-transparent px-1 text-right text-[12px] outline-none focus:bg-[#edf4ff]"
                      />

                    </td>

                    {/* ACCUMULATED DEPRECIATION */}

                    <td className="border-r border-b border-[#B7ECD0] p-0">

                      <input
                        type="number"
                        value={row.accumulatedDepreciation}
                        onChange={(e) =>
                          handleRowChange(
                            row.id,
                            "accumulatedDepreciation",
                            e.target.value,
                          )
                        }
                        className="h-7.5 w-full bg-transparent px-1 text-right text-[12px] outline-none focus:bg-[#edf4ff]"
                      />

                    </td>

                  </tr>

                ))}

                {/* NEW ROW */}

                {/* <tr className="h-[26px] bg-[#fbfcfd]">

                  <td className="border-r border-b border-[#B7ECD0] bg-[#f5f6f8] text-center text-[11px] text-gray-500">
                    *
                  </td>

                  <td
                    colSpan={6}
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

            {/* TABLE FOOTER TOTAL */}

            <div className="grid h-7.75 grid-cols-[1fr_13%_14%] border-t border-[#B7ECD0] bg-[#eeeeF2]">

              <div />

              <div className="border border-[#B7ECD0] bg-white" />

              <div className="flex items-center justify-end border border-[#B7ECD0] bg-white px-1 text-[12px] text-[#172b43]">
                {totalAccumulatedDepreciation.toFixed(2)}
              </div>

            </div>

          </div>

          {/* ========================================
              ACTION BUTTONS
          ======================================== */}

          <div className="mt-14 flex flex-wrap items-center justify-center gap-1">

            <ActionButton
              onClick={handleSave}
              className="w-20"
            >
              Save
            </ActionButton>

            <ActionButton
              onClick={handlePrint}
              className="w-20"
            >
              Print
            </ActionButton>

            <ActionButton
              onClick={handlePost}
              className="w-20"
            >
              Post
            </ActionButton>

            <ActionButton
              onClick={handleCancel}
              className="w-20"
            >
              Clear
            </ActionButton>

          

          </div>

        </section>

      </main>

    </div>
  );
};

export default DepreciationBeginningBalancePage;
