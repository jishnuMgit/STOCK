import React, { useState } from "react";
import Select from "react-select";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import selectComponents from "../../../components/common/selectComponents";

dayjs.extend(customParseFormat);

/* =====================================================================
   FILE MAP
   1. Types, constants and sample options
   2. Shared building blocks
   3. Parts : AssetDetails (item, branch, purchase, supplier, JV, account),
              DepreciationGroup (the bordered box), AssetOwner (user, status,
              note), AssetActions (Save, Find, Delete, Cancel, Close)
   4. AssetPurchasePage : owns the state and renders the parts
   ===================================================================== */

/* ---------------------------------------------------------------------
   1. TYPES, CONSTANTS AND SAMPLE OPTIONS
   --------------------------------------------------------------------- */
type Option = { value: string; label: string };

const DATE_FORMAT = "DD-MM-YYYY";

const toOptions = (values: string[]): Option[] =>
  values.map((v) => ({ value: v, label: v }));

/* Replace these with data from your API */
const branchOptions = toOptions(["JEDDAH", "RIYADH"]);
const costCenterOptions = toOptions(["CC1", "CC2", "CC3"]);
const accountIdOptions: Option[] = [
  { value: "1201001", label: "1201001" },
  { value: "1201002", label: "1201002" },
  { value: "1202001", label: "1202001" },
];
const accountNameOptions: Option[] = [
  { value: "1201001", label: "FURNITURE AND FIXTURES" },
  { value: "1201002", label: "OFFICE EQUIPMENT" },
  { value: "1202001", label: "MOTOR VEHICLES" },
];
const statusOptions = toOptions(["Active", "Inactive", "Disposed"]);

type FormState = {
  itemId: string;
  itemName: string;
  qty: string;
  branch: string | null;
  costCenter: string | null;
  purchaseDate: string;
  purchasePrice: string;
  assetSupplier: string;
  supplierRef: string;
  purchaseJvNo: string;
  jvDate: string;
  assetAccount: string | null;
  // depreciation
  deprPercent: string;
  deprStartDate: string;
  deprBegBalance: string; // calculated, read-only
  deprCalcUptoDate: string; // calculated, read-only
  salvageValue: string;
  accumulatedDepreciation: string;
  // owner
  assetUser: string;
  status: string | null;
  note: string;
};

type SetField = <K extends keyof FormState>(
  key: K,
  value: FormState[K],
) => void;

type PartProps = { form: FormState; set: SetField };

const initialForm = (): FormState => ({
  itemId: "",
  itemName: "",
  qty: "1",
  branch: "JEDDAH",
  costCenter: null,
  purchaseDate: "",
  purchasePrice: "0",
  assetSupplier: "",
  supplierRef: "",
  purchaseJvNo: "",
  jvDate: "",
  assetAccount: null,
  deprPercent: "0",
  deprStartDate: "",
  deprBegBalance: "0",
  deprCalcUptoDate: "",
  salvageValue: "0",
  accumulatedDepreciation: "0",
  assetUser: "",
  status: "Active",
  note: "",
});

const toNumber = (value: string) => {
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatAmount = (value: number) =>
  value.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

/** Calculated depreciation figures. These are simple straight-line formulas,
    used until you replace them with your own rules:
      Monthly Depreciation = (Purchase Price - Salvage Value) x Depr. % / 100 / 12
      Book Value           = Purchase Price - Accumulated Depreciation        */
const computeDepreciation = (form: FormState) => {
  const price = toNumber(form.purchasePrice);
  const salvage = toNumber(form.salvageValue);
  const percent = toNumber(form.deprPercent);
  const accumulated = toNumber(form.accumulatedDepreciation);
  return {
    monthly: (Math.max(0, price - salvage) * percent) / 100 / 12,
    bookValue: price - accumulated,
  };
};

/* ---------------------------------------------------------------------
   2. SHARED BUILDING BLOCKS
   --------------------------------------------------------------------- */
const selectClassNames = {
  control: ({
    isFocused,
    isDisabled,
  }: {
    isFocused: boolean;
    isDisabled: boolean;
  }) => `
    !min-h-[30px] !h-[30px] !rounded-[4px] !border hover:!border-[2px] !shadow-none !text-[12px]
    hover:!border-[#9fdfbc]
    ${isDisabled ? "!bg-[#eef1f4]" : "!bg-white"}
    ${isFocused ? "!border-[#9fdfbc]" : "!border-[#cfd7df]"}
  `,
  valueContainer: () => "!h-[26px] !py-0 !px-[5px] !overflow-hidden",
  singleValue: () => "!m-0 !text-[12px] !text-[#24364d]",
  placeholder: () => "!m-0 !text-[12px] !text-[#7a8794]",
  input: () => "!m-0 !p-0 !text-[12px] !text-[#24364d]",
  indicatorsContainer: () => "!h-[26px]",
  dropdownIndicator: () => "!p-[2px] !text-[#657486]",
  indicatorSeparator: () => "!hidden",
  clearIndicator: () => "!p-[2px]",
  menu: () =>
    "!mt-[1px] !rounded-none !border !border-[#cfd7df] !z-[999999] !shadow-md !min-w-[110px]",
  menuList: () => "!p-0 !max-h-[180px]",
  option: ({
    isFocused,
    isSelected,
  }: {
    isFocused: boolean;
    isSelected: boolean;
  }) => `
    !cursor-pointer !px-[6px] !py-[4px] !text-[12px] !text-[#24364d]
    ${isSelected ? "!bg-[#e7f7ed]" : isFocused ? "!bg-[#f2faf5]" : "!bg-white"}
  `,
};

const selectProps = {
  isSearchable: false,
  isClearable: false,
  placeholder: "",
  classNames: selectClassNames,
  menuPosition: "fixed" as const,
  menuPortalTarget: typeof document !== "undefined" ? document.body : undefined,
};

const inputClass =
  "h-[30px] w-full min-w-0 input-style";

const readOnlyClass =
  "h-[30px] w-full min-w-0 rounded-[4px] border border-[#cfd7df] bg-[#eef1f4] px-2 text-[12px] text-[#24364d] outline-none";

/** bordered group box */
const GroupBox: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = "",
}) => (
  <div className={`border border-[#d5ebdd] bg-[#fcfdfe] p-3 ${className}`}>
    {children}
  </div>
);

const groupGrid =
  "grid grid-cols-1 items-center gap-x-6 gap-y-2.5 sm:grid-cols-2 lg:grid-cols-12";

/** label + controls on one line; pass a width class so columns line up */
const Field: React.FC<{
  label: string;
  htmlFor?: string;
  className?: string;
  labelClassName?: string;
  children: React.ReactNode;
}> = ({ label, htmlFor, className = "", labelClassName = "", children }) => (
  <div className={`flex min-w-0 items-center gap-2 ${className}`}>
    <label
      htmlFor={htmlFor}
      className={`shrink-0 whitespace-nowrap text-right text-[12px] text-[#405066] ${labelClassName}`}
    >
      {label}
    </label>
    <div className="flex min-w-0 flex-1 items-center gap-1.5">{children}</div>
  </div>
);

/** single react-select */
const Combo: React.FC<{
  id: string;
  options: Option[];
  value: string | null;
  onChange: (value: string | null) => void;
  className?: string;
}> = ({ id, options, value, onChange, className = "w-full" }) => (
  <div className={`min-w-0 ${className}`}>
    <Select
      inputId={id}
      instanceId={id}
      components={selectComponents}
      options={options}
      value={options.find((o) => o.value === value) ?? null}
      onChange={(option) => onChange(option?.value ?? null)}
      {...selectProps}
    />
  </div>
);

/** editable amount: right aligned, up to `decimals` decimals */
const AmountInput: React.FC<{
  id: string;
  value: string;
  onChange: (value: string) => void;
  decimals?: number;
}> = ({ id, value, onChange, decimals = 2 }) => (
  <input
    id={id}
    inputMode="decimal"
    value={value}
    onFocus={(event) => event.target.select()}
    onChange={(event) => {
      const pattern = new RegExp(`^\\d*\\.?\\d{0,${decimals}}$`);
      if (pattern.test(event.target.value)) onChange(event.target.value);
    }}
    onBlur={() => onChange(formatAmount(toNumber(value)).replace(/,/g, ""))}
    className={`${inputClass} text-right`}
  />
);

/** read-only calculated box */
const ReadOnlyBox: React.FC<{
  id: string;
  value: string;
  right?: boolean;
}> = ({ id, value, right = false }) => (
  <input
    id={id}
    readOnly
    tabIndex={-1}
    value={value}
    className={`${readOnlyClass} ${right ? "text-right" : ""}`}
  />
);

/** compact MUI date picker */
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
        onChange(newValue?.isValid() ? newValue.format(DATE_FORMAT) : "");
      }}
      format={DATE_FORMAT}
      slotProps={{
        textField: { id, slotProps: { htmlInput: { "aria-label": label } } },
        openPickerButton: { sx: { padding: "2px", margin: 0 } },
        inputAdornment: { sx: { margin: 0, padding: 0 } },
      }}
      sx={{
        width: "100%",
        minWidth: 0,
        "& .MuiPickersTextField-root": { width: "100%" },
        "& .MuiPickersInputBase-root": {
          width: "100%",
          height: "30px",
          minHeight: "30px",
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
          height: "30px",
          boxSizing: "border-box",
        },
        "& .MuiInputAdornment-root": { margin: 0, padding: 0 },
        "& .MuiIconButton-root": {
          width: "22px",
          height: "22px",
          padding: "2px",
          margin: 0,
        },
        "& .MuiSvgIcon-root": { fontSize: "15px" },
        // blank look (no "DD-MM-YYYY" hint) while empty and not focused
        ...(!value && {
          "&:not(:focus-within) .MuiPickersInputBase-sectionsContainer *": {
            color: "transparent",
          },
        }),
        "& .MuiPickersOutlinedInput-notchedOutline": {
          borderColor: "#B7C7D7 !important",
        },
        "& .MuiPickersInputBase-root:hover .MuiPickersOutlinedInput-notchedOutline":
          { borderColor: "#B7C7D7 !important" },
        "& .MuiPickersInputBase-root.Mui-focused .MuiPickersOutlinedInput-notchedOutline":
          { borderColor: "#B7C7D7 !important", borderWidth: "1px" },
        "& .MuiPickersInputBase-root.Mui-error .MuiPickersOutlinedInput-notchedOutline":
          { borderColor: "#B7C7D7 !important" },
        "& .MuiPickersInputBase-root.Mui-error:hover .MuiPickersOutlinedInput-notchedOutline":
          { borderColor: "#B7C7D7 !important" },
        "& .MuiPickersInputBase-root.Mui-error.Mui-focused .MuiPickersOutlinedInput-notchedOutline":
          { borderColor: "#B7C7D7 !important" },
      }}
    />
  </LocalizationProvider>
);

/* Label widths: left half uses LL, right half uses LR, so the boxes of every
   row start at the same place. */
const LL = "w-[120px]"; // Item ID, Qty, Purchase Date, Asset Supplier, Purchase JV No., Asset Account
const LR = "w-[150px]"; // Item Name, Branch, Purchase Price, Supplier Ref., JV Date, ...

/* ---------------------------------------------------------------------
   3. PARTS
   --------------------------------------------------------------------- */

/* 3a. Asset details: item, branch, purchase, supplier, JV, account.
   12 columns: left half = 6, right half = 6.                             */
const AssetDetails: React.FC<PartProps> = ({ form, set }) => (
  <div className={groupGrid}>
    {/* row 1 : Item ID | Item Name */}
    <Field
      label="Item ID :"
      htmlFor="txtItemId"
      labelClassName={LL}
      className="lg:col-span-6"
    >
      <div className="w-[200px] max-w-full">
        <input
          id="txtItemId"
          value={form.itemId}
          onChange={(event) => set("itemId", event.target.value)}
          className={inputClass}
        />
      </div>
    </Field>
    <Field
      label="Item Name :"
      htmlFor="txtItemName"
      labelClassName={LR}
      className="lg:col-span-6"
    >
      <input
        id="txtItemName"
        value={form.itemName}
        onChange={(event) => set("itemName", event.target.value)}
        className={inputClass}
      />
    </Field>

    {/* row 2 : Qty | Branch + C.C ID */}
    <Field
      label="Qty :"
      htmlFor="txtQty"
      labelClassName={LL}
      className="lg:col-span-6"
    >
      <div className="w-[108px]">
        <input
          id="txtQty"
          inputMode="numeric"
          value={form.qty}
          onFocus={(event) => event.target.select()}
          onChange={(event) => {
            if (/^\d*$/.test(event.target.value)) set("qty", event.target.value);
          }}
          className={`${inputClass} text-right`}
        />
      </div>
    </Field>
    <Field label="Branch :" labelClassName={LR} className="lg:col-span-4">
      <Combo
        id="lkpBranch"
        options={branchOptions}
        value={form.branch}
        onChange={(v) => set("branch", v)}
      />
    </Field>
    <Field label="C.C ID :" labelClassName="w-[56px]" className="lg:col-span-2">
      <Combo
        id="lkpCostCenter"
        options={costCenterOptions}
        value={form.costCenter}
        onChange={(v) => set("costCenter", v)}
      />
    </Field>

    {/* row 3 : Purchase Date | Purchase Price */}
    <Field
      label="Purchase Date :"
      labelClassName={LL}
      className="lg:col-span-6"
    >
      <div className="w-[108px]">
        <AppDatePicker
          id="dtpPurchaseDate"
          label="Purchase Date"
          value={form.purchaseDate}
          onChange={(v) => set("purchaseDate", v)}
        />
      </div>
    </Field>
    <Field
      label="Purchase Price :"
      htmlFor="txtPurchasePrice"
      labelClassName={LR}
      className="lg:col-span-6"
    >
      <div className="w-[108px]">
        <AmountInput
          id="txtPurchasePrice"
          value={form.purchasePrice}
          onChange={(v) => set("purchasePrice", v)}
        />
      </div>
    </Field>

    {/* row 4 : Asset Supplier | Supplier Ref. */}
    <Field
      label="Asset Supplier :"
      htmlFor="txtAssetSupplier"
      labelClassName={LL}
      className="lg:col-span-6"
    >
      <input
        id="txtAssetSupplier"
        value={form.assetSupplier}
        onChange={(event) => set("assetSupplier", event.target.value)}
        className={inputClass}
      />
    </Field>
    <Field
      label="Supplier Ref. :"
      htmlFor="txtSupplierRef"
      labelClassName={LR}
      className="lg:col-span-6"
    >
      <input
        id="txtSupplierRef"
        value={form.supplierRef}
        onChange={(event) => set("supplierRef", event.target.value)}
        className={inputClass}
      />
    </Field>

    {/* row 5 : Purchase JV No. | JV Date */}
    <Field
      label="Purchase JV No. :"
      htmlFor="txtPurchaseJvNo"
      labelClassName={LL}
      className="lg:col-span-6"
    >
      <div className="w-[200px] max-w-full">
        <input
          id="txtPurchaseJvNo"
          value={form.purchaseJvNo}
          onChange={(event) => set("purchaseJvNo", event.target.value)}
          className={inputClass}
        />
      </div>
    </Field>
    <Field label="JV Date :" labelClassName={LR} className="lg:col-span-6">
      <div className="w-[108px]">
        <AppDatePicker
          id="dtpJvDate"
          label="JV Date"
          value={form.jvDate}
          onChange={(v) => set("jvDate", v)}
        />
      </div>
    </Field>

    {/* row 6 : Asset Account (ID + name) */}
    <Field
      label="Asset Account :"
      labelClassName={LL}
      className="sm:col-span-2 lg:col-span-10"
    >
      <Combo
        id="lkpAssetAccountID"
        options={accountIdOptions}
        value={form.assetAccount}
        onChange={(v) => set("assetAccount", v)}
        className="w-[120px] shrink-0"
      />
      <Combo
        id="lkpAssetAccountName"
        options={accountNameOptions}
        value={form.assetAccount}
        onChange={(v) => set("assetAccount", v)}
        className="flex-1 max-w-[560px]"
      />
    </Field>
  </div>
);

/* 3b. Depreciation group (bordered box) -----------------------------------
   Editable : Depreciation %, Depr. Start Date, Salvage Value,
              Accumulated Depreciation
   Calculated (grey) : Monthly Depreciation, Depr. Beg. Balance,
              Depr. Calc. upto Date, Book Value                            */
const DepreciationGroup: React.FC<
  PartProps & { monthly: number; bookValue: number }
> = ({ form, set, monthly, bookValue }) => (
  <GroupBox>
    <div className={groupGrid}>
      {/* row 1 */}
      <Field
        label="Depreciation % :"
        htmlFor="txtDeprPercent"
        labelClassName={LL}
        className="lg:col-span-6"
      >
        <div className="w-[108px]">
          <AmountInput
            id="txtDeprPercent"
            value={form.deprPercent}
            onChange={(v) => set("deprPercent", v)}
          />
        </div>
      </Field>
      <Field
        label="Monthly Depreciation :"
        labelClassName={LR}
        className="lg:col-span-6"
      >
        <div className="w-[108px]">
          <ReadOnlyBox
            id="txtMonthlyDepreciation"
            value={formatAmount(monthly)}
            right
          />
        </div>
      </Field>

      {/* row 2 */}
      <Field
        label="Depr. Start Date :"
        labelClassName={LL}
        className="lg:col-span-6"
      >
        <div className="w-[108px]">
          <AppDatePicker
            id="dtpDeprStartDate"
            label="Depreciation start date"
            value={form.deprStartDate}
            onChange={(v) => set("deprStartDate", v)}
          />
        </div>
      </Field>
      <Field
        label="Depr. Calc. upto Date :"
        labelClassName={LR}
        className="lg:col-span-6"
      >
        <div className="w-[108px]">
          <ReadOnlyBox id="txtDeprCalcUptoDate" value={form.deprCalcUptoDate} />
        </div>
      </Field>

      {/* row 3 */}
      <Field
        label="Depr. Beg. Balance :"
        labelClassName={LL}
        className="lg:col-span-6"
      >
        <div className="w-[108px]">
          <ReadOnlyBox
            id="txtDeprBegBalance"
            value={formatAmount(toNumber(form.deprBegBalance))}
            right
          />
        </div>
      </Field>
      <Field
        label="Accumulated Depreciation :"
        htmlFor="txtAccumulatedDepreciation"
        labelClassName={LR}
        className="lg:col-span-6"
      >
        <div className="w-27">
          <AmountInput
            id="txtAccumulatedDepreciation"
            value={form.accumulatedDepreciation}
            onChange={(v) => set("accumulatedDepreciation", v)}
          />
        </div>
      </Field>

      {/* row 4 */}
      <Field
        label="Salvage Value :"
        htmlFor="txtSalvageValue"
        labelClassName={LL}
        className="lg:col-span-6"
      >
        <div className="w-27">
          <AmountInput
            id="txtSalvageValue"
            value={form.salvageValue}
            onChange={(v) => set("salvageValue", v)}
          />
        </div>
      </Field>
      <Field label="Book Value :" labelClassName={LR} className="lg:col-span-6">
        <div className="w-27">
          <ReadOnlyBox
            id="txtBookValue"
            value={formatAmount(bookValue)}
            right
          />
        </div>
      </Field>
    </div>
  </GroupBox>
);

/* 3c. Asset user, status and note */
const AssetOwner: React.FC<PartProps> = ({ form, set }) => (
  <div className={groupGrid}>
    <Field
      label="Asset User :"
      htmlFor="txtAssetUser"
      labelClassName={LL}
      className="lg:col-span-6"
    >
      <input
        id="txtAssetUser"
        value={form.assetUser}
        onChange={(event) => set("assetUser", event.target.value)}
        className={inputClass}
      />
    </Field>
    <Field label="Status :" labelClassName={LR} className="lg:col-span-6">
      <Combo
        id="lkpStatus"
        options={statusOptions}
        value={form.status}
        onChange={(v) => set("status", v)}
        className="w-27 shrink-0"
      />
    </Field>

    <Field
      label="Note :"
      htmlFor="txtNote"
      labelClassName={LL}
      className="sm:col-span-2 lg:col-span-12"
    >
      <input
        id="txtNote"
        value={form.note}
        onChange={(event) => set("note", event.target.value)}
        className={inputClass}
      />
    </Field>
  </div>
);

/* 3d. Buttons: Delete is active only for an asset that is already saved */
const AssetActions: React.FC<{
  canDelete: boolean;
  onSave: () => void;
  onFind: () => void;
  onDelete: () => void;
  onCancel: () => void;
  onClose: () => void;
}> = ({ canDelete, onSave, onFind, onDelete, onCancel, onClose }) => (
  <div className="flex justify-center gap-3">
    <button id="btnSave" type="button" onClick={onSave} className="btn-style">
      <u>S</u>ave
    </button>
    <button id="btnFind" type="button" onClick={onFind} className="btn-style">
      <u>F</u>ind
    </button>
    <button
      id="btnDelete"
      type="button"
      onClick={onDelete}
      disabled={!canDelete}
      className="btn-style disabled:cursor-not-allowed disabled:opacity-50"
    >
      <u>D</u>elete
    </button>
    <button
      id="btnCancel"
      type="button"
      onClick={onCancel}
      className="btn-style"
    >
      <u>C</u>ancel
    </button>
    <button id="btnClose" type="button" onClick={onClose} className="btn-style">
      Cl<u>o</u>se
    </button>
  </div>
);

/* ---------------------------------------------------------------------
   4. MAIN PAGE : owns the state and renders the parts
   --------------------------------------------------------------------- */
type AssetPurchasePageProps = {
  title?: string;
  onFind?: (itemId: string) => void;
  onDelete?: (itemId: string) => void;
  onClose?: () => void;
};

const AssetPurchasePage: React.FC<AssetPurchasePageProps> = ({
  title = "Asset Purchase",
  onFind,
  onDelete,
  onClose,
}) => {
  const [form, setForm] = useState<FormState>(initialForm);
  const [isSaved, setIsSaved] = useState(false); // true once the asset exists
  const [error, setError] = useState("");

  const set: SetField = (key, value) => {
    setError("");
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const { monthly, bookValue } = computeDepreciation(form);

  const reset = () => {
    setForm(initialForm());
    setIsSaved(false);
    setError("");
  };

  const handleSave = () => {
    if (!form.itemId.trim() || !form.itemName.trim()) {
      setError("Enter the item ID and the item name.");
      return;
    }
    if (!form.branch || !form.purchaseDate) {
      setError("Select the branch and the purchase date.");
      return;
    }
    setError("");
    console.log({
      ...form,
      qty: toNumber(form.qty),
      purchasePrice: toNumber(form.purchasePrice),
      deprPercent: toNumber(form.deprPercent),
      salvageValue: toNumber(form.salvageValue),
      accumulatedDepreciation: toNumber(form.accumulatedDepreciation),
      monthlyDepreciation: monthly,
      bookValue,
    });
    setIsSaved(true);
  };

  const handleFind = () => {
    console.log("find asset", form.itemId);
    onFind?.(form.itemId);
  };

  const handleDelete = () => {
    console.log("delete asset", form.itemId);
    onDelete?.(form.itemId);
    reset();
  };

  const handleClose = () => {
    reset();
    onClose?.();
  };

  return (
    <div className="flex min-h-full w-full items-start justify-center bg-white px-4 py-4">
      <div className="min-h-fit w-275 max-w-full bg-white p-0">
        <main className="w-full overflow-hidden border border-gray-400 bg-white">
          <header className="flex h-7.5 items-center justify-start bg-[#9fdfbc]">
            <h1 className="m-0 ml-3.5 text-[17px] font-semibold text-[#24364d]">
              {title}
            </h1>
          </header>

          <section className="flex flex-col gap-3 px-3.5 pb-6 pt-3">
            <AssetDetails form={form} set={set} />

            <DepreciationGroup
              form={form}
              set={set}
              monthly={monthly}
              bookValue={bookValue}
            />

            <AssetOwner form={form} set={set} />

            {error && (
              <p role="alert" className="m-0 text-[12px] text-[#c0392b]">
                {error}
              </p>
            )}

            <div className="mt-2">
              <AssetActions
                canDelete={isSaved}
                onSave={handleSave}
                onFind={handleFind}
                onDelete={handleDelete}
                onCancel={reset}
                onClose={handleClose}
              />
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};

export default AssetPurchasePage;