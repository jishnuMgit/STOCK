import React, { useEffect, useRef, useState } from "react";
import Select, {
  components,
  type MenuListProps,
  type SingleValue,
  type StylesConfig,
} from "react-select";

// ============================================================
// TYPES
// ============================================================

interface AccountFormData {
  txtAccountGroupID: string;
  txtAccountGroupName: string;
  txtAccountGroupLevel: string;
  txtAccountID: string;
  txtAccountName: string;
  txtAccountName_AR: string;
  txtAccountLevel: string;
  lkpAccountGroupOrHead: string;
  lkpGPH: string;
  newAccountID: "Auto" | "Manual";
}

interface GphOption {
  value: string;
  label: string;
  description: string;
}

const gphOptions: GphOption[] = [
  { value: "G", label: "G", description: "Account Group" },
  { value: "H", label: "H", description: "Account Head" },
  { value: "P", label: "P", description: "Account Parent" },
];

// first column = width of the input, so the divider lines up with its right edge
const GPH_COLS = "calc(var(--ctrl-w, 125px) - 1px) 1fr";

const gphStyles: StylesConfig<GphOption, false> = {
  control: (base, state) => ({
    ...base,
    minHeight: "29px",
    height: "29px",
    borderRadius: "2px",
    borderColor: state.isFocused ? "#94a3b8" : "#cbd5e1",
    boxShadow: "none",
    fontSize: "13px",
    cursor: "pointer",
    "&:hover": { borderColor: "#94a3b8" },
  }),
  valueContainer: (base) => ({ ...base, height: "29px", padding: "0 8px" }),
  input: (base) => ({ ...base, margin: 0, padding: 0 }),
  singleValue: (base) => ({ ...base, color: "#334155" }),
  indicatorsContainer: (base) => ({ ...base, height: "29px" }),
  indicatorSeparator: () => ({ display: "none" }),
  menuPortal: (base, state: any) =>
    ({
      ...base,
      zIndex: 9999,
      "--ctrl-w": `${state?.rect?.width ?? 0}px`,
    }) as any,
  menu: (base) => ({
    ...base,
    width: "300px",
    minWidth: "100%",
    fontSize: "13px",
    borderRadius: "6px",
    border: "1px solid #d9e2dc",
    boxShadow: "0 6px 18px rgba(15, 23, 42, 0.12)",
    overflow: "hidden",
    marginTop: "4px",
  }),
  menuList: (base) => ({ ...base, padding: 0 }),
  option: (base, state) => ({
    ...base,
    padding: 0,
    borderBottom: "1px solid #f1f5f9",
    color: state.isDisabled ? "#cbd5e1" : "#334155",
    cursor: state.isDisabled ? "not-allowed" : "pointer",
    backgroundColor: state.isDisabled
      ? "#ffffff"
      : state.isSelected
        ? "#dff0e6"
        : state.isFocused
          ? "#edf7f1"
          : "#ffffff",
  }),
};

// Open menu: "G | Account Group". Closed box: just "G".
const formatGphOption = (
  option: GphOption,
  { context }: { context: "menu" | "value" },
) =>
  context === "menu" ? (
    <div className="grid" style={{ gridTemplateColumns: GPH_COLS }}>
      <span className="border-r border-slate-200 px-3 py-2">
        {option.label}
      </span>
      <span className="truncate px-3 py-2">{option.description}</span>
    </div>
  ) : (
    option.label
  );

const GphMenuList = (props: MenuListProps<GphOption, false>) => (
  <components.MenuList {...props}>
    <div
      className="sticky top-0 z-[1] grid border-b border-slate-300 bg-slate-100 text-[13px] font-semibold text-slate-800"
      style={{ gridTemplateColumns: GPH_COLS }}
    >
      <span className="border-r border-slate-300 px-3 py-2">Id</span>
      <span className="px-3 py-2">Description</span>
    </div>
    {props.children}
  </components.MenuList>
);

// G is only allowed for level < 4, H only for level >= 4 (P is always allowed)
const isGphDisabled = (gph: string, levelText: string) => {
  const level = parseInt(levelText, 10);
  if (Number.isNaN(level)) return false;
  if (gph === "G") return level >= 4;
  if (gph === "H") return level < 4;
  return false;
};

// ============================================================
// MAIN COMPONENT
// ============================================================

const COAPage: React.FC = () => {
  // ============================================================
  // STATE
  // ============================================================

  const [formData, setFormData] = useState<AccountFormData>({
    txtAccountGroupID: "1102000",
    txtAccountGroupName: "BANK",
    txtAccountGroupLevel: "3",
    txtAccountID: "1102007",
    txtAccountName: "",
    txtAccountName_AR: "",
    txtAccountLevel: "4",
    lkpAccountGroupOrHead: "H",
    lkpGPH: "No",
    newAccountID: "Auto",
  });

  const accountIdRef = useRef<HTMLInputElement>(null);
  const accountNameRef = useRef<HTMLInputElement>(null);

  const formRef = useRef<HTMLDivElement>(null);

  const handleEnterAsTab = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Enter" || e.defaultPrevented) return; // react-select handles Enter itself when its menu is open

    const target = e.target as HTMLElement;
    if (target.tagName !== "INPUT" && target.tagName !== "SELECT") return; // leave buttons alone

    const root = formRef.current;
    if (!root) return;

    const focusables = Array.from(
      root.querySelectorAll<HTMLElement>("input, select, textarea, button"),
    ).filter((el) => {
      const input = el as HTMLInputElement;
      return (
        !el.hasAttribute("disabled") &&
        input.type !== "hidden" &&
        el.tabIndex >= 0 &&
        el.offsetParent !== null && // skip anything not visible
        !(input.type === "radio" && !input.checked) // one stop per radio group, like Tab
      );
    });

    const index = focusables.indexOf(target);
    const next = focusables[index + (e.shiftKey ? -1 : 1)];

    if (next) {
      e.preventDefault();
      next.focus();
      if (next instanceof HTMLInputElement && next.type === "text")
        next.select();
    }
  };

  // Initial load: cursor in Account Name
  useEffect(() => {
    accountNameRef.current?.focus();
  }, []);

  // ============================================================
  // INPUT CHANGE
  // ============================================================

  const handleChange = (field: keyof AccountFormData, value: string) => {
    setFormData((previous) => {
      const next = { ...previous, [field]: value };

      // Level < 4 -> G (Group), otherwise H (Head)
      if (field === "txtAccountLevel") {
        const level = parseInt(value, 10);
        if (!Number.isNaN(level)) {
          next.lkpAccountGroupOrHead = level < 4 ? "G" : "H";
        }
      }
      return next;
    });
  };

  const handleIdModeChange = (mode: "Auto" | "Manual") => {
    setFormData((previous) => ({ ...previous, newAccountID: mode }));

    // wait for the re-render so the Account ID input is enabled/disabled first
    setTimeout(() => {
      if (mode === "Manual") {
        accountIdRef.current?.focus();
        accountIdRef.current?.focus();
      } else {
        accountNameRef.current?.focus();
      }
    }, 0);
  };

  // ============================================================
  // SAVE
  // ============================================================

  const handleSave = () => {
    if (
      isGphDisabled(formData.lkpAccountGroupOrHead, formData.txtAccountLevel)
    ) {
      window.alert(
        formData.lkpAccountGroupOrHead === "G"
          ? "Group (G) is only allowed for Account Level below 4"
          : "Head (H) is only allowed for Account Level 4 and above",
      );
      return;
    }

    console.log("Save:", formData);
  };

  // ============================================================
  // DELETE
  // ============================================================

  const handleDelete = () => {
    console.log("Delete:", formData);
  };

  // ============================================================
  // CLEAR
  // ============================================================

  const handleClear = () => {
    setFormData({
      txtAccountGroupID: "",
      txtAccountGroupName: "",
      txtAccountGroupLevel: "",
      txtAccountID: "",
      txtAccountName: "",
      txtAccountName_AR: "",
      txtAccountLevel: "",
      lkpAccountGroupOrHead: "",
      lkpGPH: "No",
      newAccountID: "Auto",
    });
    accountNameRef.current?.focus();
  };

  // ============================================================
  // COMMON STYLES
  // ============================================================

  const smallInputClass = `
    h-[29px]
    rounded-[2px]
    border
    border-slate-300
    bg-white
    px-2
    text-[13px]
    text-slate-700
    outline-none
    focus:border-slate-400
    focus:ring-0
  `;

  const labelClass = `
    text-[14px]
    text-slate-600
    whitespace-nowrap
  `;

  return (
    <div className="flex min-h-fit items-start w-full justify-center bg-[#a3dfc0]">
      {/* ========================================================
          MAIN PAGE
      ======================================================== */}

      <div className="mt-[2px] w-full bg-white">
        {/* ======================================================
            TITLE
        ====================================================== */}

        <div
          className="
                flex
                h-7
                w-full
                items-center
                border-b
                border-slate-400
                bg-[#a3dfc0]
              "
        >
          <h1
            id="ChartOfAccount"
            className="
                  ml-[10px]
                  text-[17px]
                  font-semibold
                  text-slate-700
                "
          >
            Chart Of Account
          </h1>
        </div>

        {/* ======================================================
            FORM
        ====================================================== */}

        <div
          ref={formRef}
          onKeyDown={handleEnterAsTab}
          className="px-[38px] pb-[25px] pt-[10px]"
        >
          {/* ====================================================
              ACCOUNT GROUP
          ==================================================== */}

          <div className="mb-[5px] grid grid-cols-[155px_125px_1fr] items-center gap-[10px]">
            <label
              htmlFor="txtAccountGroupID"
              className={`${labelClass} text-right`}
            >
              Account Group :
            </label>

            <input
              id="txtAccountGroupID"
              type="text"
              value={formData.txtAccountGroupID}
              onChange={(e) =>
                handleChange("txtAccountGroupID", e.target.value)
              }
              className="input-style"
            />

            <input
              id="txtAccountGroupName"
              type="text"
              value={formData.txtAccountGroupName}
              onChange={(e) =>
                handleChange("txtAccountGroupName", e.target.value)
              }
              className="input-style"
            />
          </div>

          {/* ====================================================
              ACCOUNT GROUP LEVEL + NEW ACCOUNT ID
          ==================================================== */}

          <div className="mb-[5px] grid grid-cols-[155px_125px_1fr] items-center gap-[10px]">
            <label
              htmlFor="txtAccountGroupLevel"
              className={`${labelClass} text-right`}
            >
              Account Group Level :
            </label>

            <input
              id="txtAccountGroupLevel"
              type="text"
              value={formData.txtAccountGroupLevel}
              onChange={(e) =>
                handleChange("txtAccountGroupLevel", e.target.value)
              }
              className={smallInputClass}
            />

            {/* NEW ACCOUNT ID */}

            <fieldset
              className="
                relative
                ml-[5px]
                flex
                h-[55px]
                items-center
                gap-[25px]
                rounded-[7px]
                border
                border-slate-200
                px-[17px]
                pt-[5px]
              "
            >
              <legend
                className="
                  px-[5px]
                  text-[14px]
                  text-slate-500
                "
              >
                New Account ID
              </legend>

              {/* AUTO */}

              <label
                htmlFor="autoAccountID"
                className="flex cursor-pointer items-center gap-[7px] text-[13px] text-slate-600"
              >
                <input
                  id="autoAccountID"
                  type="radio"
                  name="newAccountID"
                  value="Auto"
                  checked={formData.newAccountID === "Auto"}
                  onChange={() => handleIdModeChange("Auto")}
                  className="h-[16px] w-[16px] accent-blue-600"
                />

                <span>Auto</span>
              </label>

              {/* MANUAL */}

              <label
                htmlFor="manualAccountID"
                className="
                  flex
                  cursor-pointer
                  items-center
                  gap-[7px]
                  text-[13px]
                  text-slate-600
                "
              >
                <input
                  id="manualAccountID"
                  type="radio"
                  name="newAccountID"
                  value="Manual"
                  checked={formData.newAccountID === "Manual"}
                  onChange={() => handleIdModeChange("Manual")}
                  className="
                    h-[16px]
                    w-[16px]
                    accent-blue-600
                  "
                />

                <span>Manual</span>
              </label>
            </fieldset>
          </div>

          {/* ====================================================
              ACCOUNT ID
          ==================================================== */}

          <div className="mb-[5px] grid grid-cols-[155px_125px_1fr] items-center gap-[10px]">
            <label
              htmlFor="txtAccountID"
              className={`${labelClass} text-right`}
            >
              Account ID :
            </label>

            <input
              id="txtAccountID"
              ref={accountIdRef}
              type="text"
              value={formData.txtAccountID}
              disabled={formData.newAccountID === "Auto"}
              onChange={(e) => handleChange("txtAccountID", e.target.value)}
              className="input-style disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
            />
          </div>

          {/* ====================================================
              ACCOUNT NAME
          ==================================================== */}

          <div className="mb-[5px] grid grid-cols-[155px_1fr] items-center gap-[10px]">
            <label
              htmlFor="txtAccountName"
              className={`${labelClass} text-right`}
            >
              Account Name :
            </label>

            <input
              id="txtAccountName"
              ref={accountNameRef}
              type="text"
              value={formData.txtAccountName}
              onChange={(e) => handleChange("txtAccountName", e.target.value)}
              className="input-style"
            />
          </div>

          {/* ====================================================
              ACCOUNT NAME ARABIC
          ==================================================== */}

          <div className="mb-[5px] grid grid-cols-[155px_1fr] items-center gap-[10px]">
            <label
              htmlFor="txtAccountName_AR"
              className={`${labelClass} text-right`}
            >
              Account Name (AR) :
            </label>

            <input
              id="txtAccountName_AR"
              type="text"
              dir="rtl"
              value={formData.txtAccountName_AR}
              onChange={(e) =>
                handleChange("txtAccountName_AR", e.target.value)
              }
              className="input-style"
            />
          </div>

          {/* ====================================================
              ACCOUNT LEVEL + HAVE COST CENTER
          ==================================================== */}

          <div className="mb-[5px] grid grid-cols-[155px_125px_1fr_108px_108px] items-center gap-[10px]">
            <label
              htmlFor="txtAccountLevel"
              className={`${labelClass} text-right`}
            >
              Account Level :
            </label>

            <input
              id="txtAccountLevel"
              type="text"
              value={formData.txtAccountLevel}
              onChange={(e) => handleChange("txtAccountLevel", e.target.value)}
              className={smallInputClass}
              readOnly
            />

            <div />

            <label htmlFor="lkpGPH" className={`${labelClass } text-right -ml-4`}>
              Have Cost Center :
            </label>

            <select
              id="lkpGPH"
              value={formData.lkpGPH}
              onChange={(e) => handleChange("lkpGPH", e.target.value)}
              className="input-style cursor-pointer pr-2"
            >
              <option value="Yes">Yes</option>
              <option value="No">No</option>
            </select>
          </div>

          {/* ====================================================
              GROUP / PARENT / HEAD
          ==================================================== */}

          <div className="grid grid-cols-[155px_125px_1fr] items-center gap-[10px]">
            <label
              htmlFor="lkpAccountGroupOrHead"
              className={`${labelClass} text-right`}
            >
              Group/Parent/Head :
            </label>

            <Select
              inputId="lkpAccountGroupOrHead"
              instanceId="lkpAccountGroupOrHead"
              name="lkpAccountGroupOrHead"
              options={gphOptions}
              value={
                gphOptions.find(
                  (o) => o.value === formData.lkpAccountGroupOrHead,
                ) ?? null
              }
              onChange={(option: SingleValue<GphOption>) =>
                handleChange("lkpAccountGroupOrHead", option?.value ?? "")
              }
              isOptionDisabled={(option) =>
                isGphDisabled(option.value, formData.txtAccountLevel)
              }
              formatOptionLabel={formatGphOption}
              styles={gphStyles}
              components={{ MenuList: GphMenuList }}
              isSearchable={false}
              menuPortalTarget={document.body}
              menuPosition="fixed"
            />
          </div>

          {/* ====================================================
              BUTTONS
          ==================================================== */}

          <div
            className="
              mt-[10px]
              flex
              justify-center
              gap-[11px]
            "
          >
            {/* SAVE */}

            <button
              id="btnSave"
              type="button"
              onClick={handleSave}
              className="btn-style"
            >
              <span className="underline">S</span>
              ave
            </button>

            {/* DELETE */}

            <button
              id="btnDelete"
              type="button"
              onClick={handleDelete}
              className="btn-style"
            >
              <span className="underline">D</span>
              elete
            </button>

            {/* CLEAR */}

            <button
              id="btnClear"
              type="button"
              onClick={handleClear}
              className="btn-style"
            >
              <span className="underline">C</span>
              lear
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default COAPage;
