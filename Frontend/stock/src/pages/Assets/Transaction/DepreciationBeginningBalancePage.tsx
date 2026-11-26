
import React, { useState } from "react";
import Select from "react-select";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";

import Header from "../../../components/common/Header";
import TransactionActions from "../../../components/common/TransactionActions";
import { useCtrlShortcuts } from "../../../hooks/useCtrlShortcuts";
import { useAltShortcuts } from "../../../hooks/useAltShortcuts";
import { useEnterAsTab } from "../../../hooks/useEnterAsTab";
import "../../../components/Transaction/Receipt/save/commanReceipt.css";

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

  // Enter moves to the next field like the Tab key (the same on every screen)
  const enterAsTab = useEnterAsTab();

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

 

  // The keys of the Payment / Receipt screens: Ctrl+S Save, Ctrl+P Print, Alt+T Post
  useCtrlShortcuts({ s: handleSave, p: handlePrint });
  useAltShortcuts({ t: handlePost });

  // ==================================================
  // UI
  // ==================================================

  return (
    // the frame of the Receipt screen: the grey page and the square window with the grey border
    <div
      onKeyDown={enterAsTab}
      className="min-h-fit mt-3 bg-slate-100 px-5 py-2 flex flex-col justify-center items-center gap-2.5"
    >
      <div className="receipt-screen mx-auto lg:w-275 md:w-[55%] max-w-362.5 min-w-212.5 border border-gray-400 bg-white">

        <Header Name="Depreciation Beginning Balance" />

        {/* =====================================================
            FORM - the spacing of the Receipt form: 20 px at the sides, 8 px between the rows, a 192 px label and
            an 8 px gap
        ===================================================== */}

        <div className="px-5 pt-3 mt-2 pb-2">

          {/* ASSET ACCOUNT */}

          <div className="mb-2 flex items-center gap-2 ml-4">
            <label className="w-48 text-right text-[14px] whitespace-nowrap">
              Asset Account :
            </label>

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
              listLook="receipt"
              headerFontSize="12px"
              menuZIndex={99999}
              onChange={(option) => {
                setAssetAccount(
                  option
                    ? { value: option.value, label: option.firstLabel }
                    : null,
                );
              }}
            />
          </div>

          {/* BRANCH and DATE (the date at the right end, as on Receipt) */}

          <div className="mb-2 flex items-center justify-between gap-8">

            <div className="flex items-center gap-2 ml-4">
              <label className="w-48 text-right text-[14px] whitespace-nowrap">
                Branch :
              </label>

              <CommonTableSelect
                inputId="branch"
                options={branchOptions}
                value={branch}
                onChange={setBranch}
                columns={branchColumns}
                listLook="receipt"
                width="250px"
                menuWidth="320px"
                controlFontSize="14px"
                headerFontSize="12px"
                borderColor="#d7dee7"
                hoverBorderColor="#9fdfbc"
                menuZIndex={99999}
                placeholder=""
              />
            </div>

            <div className="flex items-center gap-2 -mr-2">
              <label className="text-right text-[14px] whitespace-nowrap">
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

          </div>

          {/* ACCUMULATED DEPRECIATION ACCOUNT */}

          <div className="mb-2 flex items-center gap-2 ml-4">
            <label className="w-48 text-right text-[14px] whitespace-nowrap">
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
              listLook="receipt"
              headerFontSize="12px"
              menuZIndex={99999}
              onChange={(option) => {
                setAccumulatedAccount(
                  option
                    ? { value: option.value, label: option.firstLabel }
                    : null,
                );
              }}
            />
          </div>

          {/* DEPRECIATION EXPENSE ACCOUNT */}

          <div className="flex items-center gap-2 ml-4">
            <label className="w-48 text-right text-[14px] whitespace-nowrap">
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
              listLook="receipt"
              headerFontSize="12px"
              menuZIndex={99999}
              onChange={(option) => {
                setExpenseAccount(
                  option
                    ? { value: option.value, label: option.firstLabel }
                    : null,
                );
              }}
            />
          </div>

        </div>

        {/* =====================================================
            TABLE - the grid of the Receipt screen (the shared .receipt-table classes, commanReceipt.css)
        ===================================================== */}

        <div className="receipt-table-wrapper">

          <table className="receipt-table">

            <colgroup>
              <col style={{ width: "38px" }} />
              <col style={{ width: "150px" }} />
              <col style={{ width: "auto" }} />
              <col style={{ width: "75px" }} />
              <col style={{ width: "120px" }} />
              <col style={{ width: "140px" }} />
            </colgroup>

            <thead>
              <tr>
                <th>Line</th>
                <th>Item ID</th>
                <th>Item Name</th>
                <th className="text-center">CC. ID</th>
                <th className="text-right">Pur. Price</th>
                <th className="text-right">Accu. Depr. Amt.</th>
              </tr>
            </thead>

            <tbody>

              {rows.map((row, index) => (

                <tr
                  key={row.id}
                  onClick={() => setActiveRow(row.id)}
                  className={activeRow === row.id ? "receipt-row-selected" : ""}
                >

                  {/* SERIAL NUMBER */}

                  <td className="serial-cell">{index + 1}</td>

                  {/* ITEM ID - REACT SELECT */}

                  <td>
                    <Select<Option, false>
                      inputId={`itemId-${row.id}`}
                      options={itemOptions}
                      components={selectComponents}
                      value={row.itemId}
                      onChange={(option) => handleItemChange(row.id, option)}
                      onFocus={() => setActiveRow(row.id)}
                      styles={tableSelectStyles}
                      menuPortalTarget={
                        typeof document !== "undefined" ? document.body : undefined
                      }
                      menuPosition="fixed"
                      isClearable
                      isSearchable
                      placeholder=""
                    />
                  </td>

                  {/* ITEM NAME - LINKED REACT SELECT */}

                  <td>
                    <Select<Option, false>
                      inputId={`itemName-${row.id}`}
                      options={itemNameOptions}
                      components={selectComponents}
                      value={row.itemName}
                      onChange={(option) => handleItemChange(row.id, option)}
                      onFocus={() => setActiveRow(row.id)}
                      styles={tableSelectStyles}
                      menuPortalTarget={
                        typeof document !== "undefined" ? document.body : undefined
                      }
                      menuPosition="fixed"
                      isClearable
                      isSearchable
                      placeholder=""
                    />
                  </td>

                  {/* COST CENTER ID */}

                  <td>
                    <input
                      type="text"
                      value={row.ccId}
                      onFocus={() => setActiveRow(row.id)}
                      onChange={(e) => handleRowChange(row.id, "ccId", e.target.value)}
                      className="receipt-grid-input text-center"
                    />
                  </td>

                  {/* PURCHASE PRICE */}

                  <td>
                    <input
                      type="number"
                      value={row.purchasePrice}
                      onFocus={() => setActiveRow(row.id)}
                      onChange={(e) => handleRowChange(row.id, "purchasePrice", e.target.value)}
                      className="receipt-grid-input text-right"
                    />
                  </td>

                  {/* ACCUMULATED DEPRECIATION */}

                  <td>
                    <input
                      type="number"
                      value={row.accumulatedDepreciation}
                      onFocus={() => setActiveRow(row.id)}
                      onChange={(e) =>
                        handleRowChange(row.id, "accumulatedDepreciation", e.target.value)
                      }
                      className="receipt-grid-input text-right"
                    />
                  </td>

                </tr>

              ))}

            </tbody>

          </table>

        </div>

        {/* =====================================================
            TOTAL - below the grid, at the right end, as on Receipt
        ===================================================== */}

        <div className="mt-2.5 mr-16.5 ml-auto flex w-55 items-center gap-2 text-[13px]">
          <label className="whitespace-nowrap text-[14px]">Total :</label>

          <input
            id="txtTotAccumulatedDepreciation"
            value={totalAccumulatedDepreciation.toFixed(2)}
            readOnly
            className="ml-1 h-7.5 w-25 rounded border border-gray-300 px-2 text-right outline-none text-[#344054]"
          />
        </div>

        {/* =====================================================
            BUTTONS - the buttons and the keys of the Payment / Receipt screens
        ===================================================== */}

        <TransactionActions
          className="mt-4 mb-4 flex flex-wrap items-center justify-center gap-3"
          actions={[
            { id: "btnSave", label: "Save", underlineIndex: 0, onClick: handleSave },
            { id: "btnPrint", label: "Print", underlineIndex: 0, onClick: handlePrint },
            { id: "btnPost", label: "Post", underlineIndex: 3, onClick: handlePost },
            { id: "btnClear", label: "Clear", onClick: handleCancel },
          ]}
        />

      </div>
    </div>
  );
};

export default DepreciationBeginningBalancePage;
