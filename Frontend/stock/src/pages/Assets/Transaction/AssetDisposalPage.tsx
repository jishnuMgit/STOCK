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
   1. Types, constants and sample data
   2. Shared building blocks
   3. Parts : ItemRows (item picker), AssetInfoRows (details of the chosen
              asset, read-only), DisposalRows (the fields you fill in),
              DisposalActions (Save, Revert Disposal, Find, Cancel, Close)
   4. AssetDisposalPage : owns the state and renders the parts

   ItemRows, AssetInfoRows and DisposalRows all return items of the same
   12-column grid (left half = 6 columns, right half = 6 columns).
   ===================================================================== */

/* ---------------------------------------------------------------------
   1. TYPES, CONSTANTS AND SAMPLE DATA
   --------------------------------------------------------------------- */
type Option = { value: string; label: string };

const DATE_FORMAT = "DD-MM-YYYY";
// const TODAY = dayjs().format(DATE_FORMAT);

const statusOptions: Option[] = [
  { value: "Disposed", label: "Disposed" },
  { value: "Active", label: "Active" },
];

/** details of an asset as saved by Asset Purchase (read-only on this page) */
type Asset = {
  id: string;
  name: string;
  qty: number;
  branch: string;
  purchasePrice: number;
  purchaseDate: string;
  accountId: string;
  accountName: string;
  deprPercent: number;
  deprCalcUptoDate: string;
  monthlyDepr: number;
  accumulatedDepr: number;
  bookValue: number;
  disposed?: {
    jvNo: string;
    jvDate: string;
    price: number;
    date: string;
    deprEndDate: string;
    note: string;
  };
};

/* Sample assets. Replace with an API call that loads the chosen item. */
const sampleAssets: Asset[] = [
  {
    id: "A001",
    name: "OFFICE FURNITURE SET",
    qty: 1,
    branch: "JEDDAH",
    purchasePrice: 12000,
    purchaseDate: "01-01-2024",
    accountId: "1201001",
    accountName: "FURNITURE AND FIXTURES",
    deprPercent: 10,
    deprCalcUptoDate: "31-12-2025",
    monthlyDepr: 100,
    accumulatedDepr: 2400,
    bookValue: 9600,
  },
  {
    id: "A002",
    name: "LAPTOP DELL LATITUDE",
    qty: 2,
    branch: "JEDDAH",
    purchasePrice: 7000,
    purchaseDate: "15-03-2023",
    accountId: "1201002",
    accountName: "OFFICE EQUIPMENT",
    deprPercent: 25,
    deprCalcUptoDate: "31-12-2025",
    monthlyDepr: 145.83,
    accumulatedDepr: 4375,
    bookValue: 2625,
  },
  {
    id: "A003",
    name: "TOYOTA COROLLA 2019",
    qty: 1,
    branch: "JEDDAH",
    purchasePrice: 45000,
    purchaseDate: "10-06-2019",
    accountId: "1202001",
    accountName: "MOTOR VEHICLES",
    deprPercent: 20,
    deprCalcUptoDate: "30-06-2025",
    monthlyDepr: 750,
    accumulatedDepr: 45000,
    bookValue: 0,
    disposed: {
      jvNo: "JV-0457",
      jvDate: "30-06-2025",
      price: 6000,
      date: "30-06-2025",
      deprEndDate: "30-06-2025",
      note: "SOLD TO STAFF",
    },
  },
];

const itemIdOptions: Option[] = sampleAssets.map((a) => ({
  value: a.id,
  label: a.id,
}));
const itemNameOptions: Option[] = sampleAssets.map((a) => ({
  value: a.id,
  label: a.name,
}));

type FormState = {
  itemId: string | null;
  status: string | null;
  disposalJvNo: string;
  jvDate: string;
  disposalPrice: string;
  disposalDate: string;
  deprEndDate: string;
  note: string;
};

type SetField = <K extends keyof FormState>(
  key: K,
  value: FormState[K],
) => void;

const initialForm = (): FormState => ({
  itemId: null,
  status: "Disposed",
  disposalJvNo: "",
  jvDate: "",
  disposalPrice: "",
  disposalDate: "",
  deprEndDate: "",
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
    !min-h-[30px] !h-[30px] !rounded-[4px] !border !shadow-none !text-[12px]
    hover:!border-[#aab8c5]
    ${isDisabled ? "!bg-[#eef1f4]" : "!bg-white"}
    ${isFocused ? "!border-[#91a7b9]" : "!border-[#cfd7df]"}
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
  " w-full min-w-0 input-style";

const readOnlyClass =
  "h-[30px] w-full min-w-0 rounded-[4px] border border-[#cfd7df] bg-[#eef1f4] px-2 text-[12px] text-[#24364d] outline-none";

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
      components={selectComponents}
      instanceId={id}
      options={options}
      value={options.find((o) => o.value === value) ?? null}
      onChange={(option) => onChange(option?.value ?? null)}
      {...selectProps}
    />
  </div>
);

/** read-only grey box (data loaded from the asset) */
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

/* Label widths: left half LL, right half LR, so every row lines up */
const LL = "w-[120px]"; // Item, Qty, Purchase Price, Asset Account, Depreciation %, ...
const LR = "w-[135px]"; // Branch, Purchase Date, Depr. calc. upto date, ...

/* ---------------------------------------------------------------------
   3. PARTS
   --------------------------------------------------------------------- */

/* 3a. Item picker (ID select + name select) */
const ItemRows: React.FC<{
  itemId: string | null;
  onItemChange: (id: string | null) => void;
}> = ({ itemId, onItemChange }) => (
  <Field
    label="Item :"
    labelClassName={LL}
    className="sm:col-span-2 lg:col-span-12"
  >
    <Combo
      id="lkpItemID"
      options={itemIdOptions}
      value={itemId}
      onChange={onItemChange}
      className="w-[110px] shrink-0"
    />
    <Combo
      id="lkpItemName"
      options={itemNameOptions}
      value={itemId}
      onChange={onItemChange}
      className="flex-1"
    />
  </Field>
);

/* 3b. Details of the chosen asset. All read-only: they come from the asset. */
const AssetInfoRows: React.FC<{ asset: Asset | null }> = ({ asset }) => (
  <>
    <Field label="Qty :" labelClassName={LL} className="lg:col-span-6">
      <div className="w-[108px]">
        <ReadOnlyBox
          id="txtQty"
          value={asset ? formatAmount(asset.qty) : ""}
          right
        />
      </div>
    </Field>
    <Field label="Branch :" labelClassName={LR} className="lg:col-span-6">
      <ReadOnlyBox id="txtBranch" value={asset?.branch ?? ""} />
    </Field>

    <Field label="Purchase Price :" labelClassName={LL} className="lg:col-span-6">
      <div className="w-[108px]">
        <ReadOnlyBox
          id="txtPurchasePrice"
          value={asset ? formatAmount(asset.purchasePrice) : ""}
          right
        />
      </div>
    </Field>
    <Field label="Purchase Date :" labelClassName={LR} className="lg:col-span-6 lg:ml-44">
      <div className="w-[108px]">
        <ReadOnlyBox id="txtPurchaseDate" value={asset?.purchaseDate ?? ""} />
      </div>
    </Field>

    <Field
      label="Asset Account :"
      labelClassName={LL}
      className="sm:col-span-2 lg:col-span-12"
    >
      <div className="w-[110px] shrink-0">
        <ReadOnlyBox id="txtAssetAccountID" value={asset?.accountId ?? ""} />
      </div>
      <ReadOnlyBox id="txtAssetAccountName" value={asset?.accountName ?? ""} />
    </Field>

    <Field label="Depreciation % :" labelClassName={LL} className="lg:col-span-6">
      <div className="w-[108px]">
        <ReadOnlyBox
          id="txtDeprPercent"
          value={asset ? formatAmount(asset.deprPercent) : ""}
          right
        />
      </div>
    </Field>
    <Field
      label="Depr. calc. upto date :"
      labelClassName={LR}
      className="lg:col-span-6 lg:ml-44"
    >
      <div className="w-[108px]">
        <ReadOnlyBox
          id="txtDeprCalcUptoDate"
          value={asset?.deprCalcUptoDate ?? ""}
        />
      </div>
    </Field>

    <Field
      label="Monthly Depr. Amt :"
      labelClassName={LL}
      className="lg:col-span-6"
    >
      <div className="w-[108px]">
        <ReadOnlyBox
          id="txtMonthlyDeprAmt"
          value={asset ? formatAmount(asset.monthlyDepr) : ""}
          right
        />
      </div>
    </Field>
    <Field
      label="Accumulated Depr. :"
      labelClassName={LR}
      className="lg:col-span-6 lg:ml-44"
    >
      <div className="w-[108px]">
        <ReadOnlyBox
          id="txtAccumulatedDepr"
          value={asset ? formatAmount(asset.accumulatedDepr) : ""}
          right
        />
      </div>
    </Field>

    {/* Book Value shares its row with Status (first field of DisposalRows) */}
    <Field label="Book Value :" labelClassName={LL} className="lg:col-span-6">
      <div className="w-[108px]">
        <ReadOnlyBox
          id="txtBookValue"
          value={asset ? formatAmount(asset.bookValue) : ""}
          right
        />
      </div>
    </Field>
  </>
);

/* 3c. The disposal fields you fill in */
const DisposalRows: React.FC<{ form: FormState; set: SetField }> = ({
  form,
  set,
}) => (
  <>
    <Field label="Status :" labelClassName={LR} className="lg:col-span-6 lg:ml-43">
      <Combo
        id="lkpStatus"
        options={statusOptions}
        value={form.status}
        onChange={(v) => set("status", v)}
        className="w-[108px] shrink-0"
      />
    </Field>

    <Field
      label="Disposal JV No. :"
      htmlFor="txtDisposalJvNo"
      labelClassName={LL}
      className="lg:col-span-6"
    >
      <div className="w-[108px]">
        <input
          id="txtDisposalJvNo"
          value={form.disposalJvNo}
          onChange={(event) => set("disposalJvNo", event.target.value)}
          className={inputClass}
        />
      </div>
    </Field>
    <Field label="JV Date :" labelClassName={LR} className="lg:col-span-6 lg:ml-43">
      <div className="w-[108px]">
        <AppDatePicker
          id="dtpJvDate"
          label="JV Date"
          value={form.jvDate}
          onChange={(v) => set("jvDate", v)}
        />
      </div>
    </Field>

    <Field
      label="Disposal Price :"
      htmlFor="txtDisposalPrice"
      labelClassName={LL}
      className="lg:col-span-6"
    >
      <div className="w-[108px]">
        <input
          id="txtDisposalPrice"
          inputMode="decimal"
          value={form.disposalPrice}
          onFocus={(event) => event.target.select()}
          onChange={(event) => {
            if (/^\d*\.?\d{0,2}$/.test(event.target.value))
              set("disposalPrice", event.target.value);
          }}
          className={`${inputClass} text-right`}
        />
      </div>
    </Field>
    <Field label="Disposal Date :" labelClassName={LR} className="lg:col-span-6 lg:ml-43">
      <div className="w-[108px]">
        <AppDatePicker
          id="dtpDisposalDate"
          label="Disposal Date"
          value={form.disposalDate}
          onChange={(v) => set("disposalDate", v)}
        />
      </div>
    </Field>

    <Field label="Depr. End Date :" labelClassName={LL} className="lg:col-span-6">
      <div className="w-[108px]">
        <AppDatePicker
          id="dtpDeprEndDate"
          label="Depr. End Date"
          value={form.deprEndDate}
          onChange={(v) => set("deprEndDate", v)}
        />
      </div>
    </Field>
    <div className="hidden lg:col-span-6 lg:block" />

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
  </>
);

/* 3d. Buttons: Revert Disposal is active only for an asset that is disposed */
const DisposalActions: React.FC<{
  canRevert: boolean;
  onSave: () => void;
  onRevert: () => void;
  onFind: () => void;
  onCancel: () => void;
  onClose: () => void;
}> = ({ canRevert, onSave, onRevert, onFind, onCancel, onClose }) => (
  <div className="flex flex-wrap justify-center gap-3">
    <button id="btnSave" type="button" onClick={onSave} className="btn-style">
      <u>S</u>ave
    </button>
    <button
      id="btnRevert"
      type="button"
      onClick={onRevert}
      disabled={!canRevert}
      className="btn-style disabled:cursor-not-allowed disabled:opacity-50"
    >
      <u>R</u>evert Disposal
    </button>
    <button id="btnFind" type="button" onClick={onFind} className="btn-style">
      <u>F</u>ind
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
type AssetDisposalPageProps = {
  title?: string;
  onFind?: () => void;
  onClose?: () => void;
};

const AssetDisposalPage: React.FC<AssetDisposalPageProps> = ({
  title = "Asset Disposal",
  onFind,
  onClose,
}) => {
  const [form, setForm] = useState<FormState>(initialForm);
  const [asset, setAsset] = useState<Asset | null>(null);
  const [isDisposed, setIsDisposed] = useState(false); // the loaded asset is already disposed
  const [error, setError] = useState("");

  const set: SetField = (key, value) => {
    setError("");
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  /* Loads the chosen asset. Replace with an API call. An asset that is
     already disposed shows its disposal details and allows "Revert Disposal". */
  const handleItemChange = (id: string | null) => {
    const found = sampleAssets.find((a) => a.id === id) ?? null;
    setAsset(found);
    setIsDisposed(!!found?.disposed);
    setError("");
    setForm({
      ...initialForm(),
      itemId: id,
      disposalJvNo: found?.disposed?.jvNo ?? "",
      jvDate: found?.disposed?.jvDate ?? "",
      disposalPrice: found?.disposed ? String(found.disposed.price) : "",
      disposalDate: found?.disposed?.date ?? "",
      deprEndDate: found?.disposed?.deprEndDate ?? "",
      note: found?.disposed?.note ?? "",
    });
  };

  const reset = () => {
    setForm(initialForm());
    setAsset(null);
    setIsDisposed(false);
    setError("");
  };

  const handleSave = () => {
    if (!asset) {
      setError("Select the item to dispose.");
      return;
    }
    if (!form.disposalDate) {
      setError("Enter the disposal date.");
      return;
    }
    setError("");
    console.log({
      itemId: asset.id,
      status: form.status,
      disposalJvNo: form.disposalJvNo,
      jvDate: form.jvDate,
      disposalPrice: toNumber(form.disposalPrice),
      disposalDate: form.disposalDate,
      deprEndDate: form.deprEndDate,
      note: form.note,
    });
    setIsDisposed(true);
  };

  const handleRevert = () => {
    if (!asset) return;
    console.log("revert disposal", asset.id);
    setForm((prev) => ({
      ...initialForm(),
      itemId: prev.itemId,
      status: "Active",
    }));
    setIsDisposed(false);
  };

  const handleFind = () => {
    console.log("find disposed asset");
    onFind?.();
  };

  const handleClose = () => {
    reset();
    onClose?.();
  };

  return (
    <div className="flex min-h-full w-full items-start justify-center bg-white px-4 py-4">
      <div className="min-h-fit w-225 max-w-full bg-white p-0">
        <main className="w-full overflow-hidden border border-gray-400 bg-white">
          <header className="flex h-7.5 items-center justify-start bg-[#9fdfbc]">
            <h1 className="m-0 ml-3.5 text-[17px] font-semibold text-[#24364d]">
              {title}
            </h1>
          </header>

          <section className="flex flex-col gap-4 px-3.5 pb-3 pt-3">
            <div className={groupGrid}>
              <ItemRows itemId={form.itemId} onItemChange={handleItemChange} />
              <AssetInfoRows asset={asset} />
              <DisposalRows form={form} set={set} />
            </div>

            {error && (
              <p role="alert" className="m-0 text-[12px] text-[#c0392b]">
                {error}
              </p>
            )}

            <div className="mt-3">
              <DisposalActions
                canRevert={isDisposed}
                onSave={handleSave}
                onRevert={handleRevert}
                onFind={handleFind}
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

export default AssetDisposalPage;