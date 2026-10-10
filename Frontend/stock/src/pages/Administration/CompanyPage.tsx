import React, { useEffect, useRef, useState } from "react";
import Select, {
  components,
  createFilter,
  type StylesConfig,
  type SingleValue,
  type MenuListProps,
  type OptionProps,
} from "react-select";
import { toast } from "react-toastify";

type Option = {
  value: string;
  label: string;
};

const API = `${import.meta.env.VITE_API_URL}/companies`;

// Enter key moves focus in this order
const FIELD_ORDER = [
  "txtCoID",
  "txtCoName",
  "txtCoName_AR",
  "txtCoName_Short",
  "txtCoName_QR",
  "txtCoVATNo",
  "txtCoVATNo_AR",
  "lkpPurchaseExpenseGroup",
  "lkpBG2ARAP",
  "lkpYearClosingMethod",
  "btnSave",
];

// ============================================================
// PURCHASE EXPENSE GROUP: table-style dropdown (header + 2 columns)
// ============================================================

const AccountMenuList = (props: MenuListProps<Option, false>) => (
  <components.MenuList {...props}>
    <div className="sticky top-0 z-10 grid grid-cols-[1fr_110px] border-b border-gray-200 bg-white px-3 py-2 text-[12px] font-semibold text-gray-600">
      <span>Account Name</span>
      <span className="text-right">Account ID</span>
    </div>
    {props.children}
  </components.MenuList>
);

const AccountOption = (props: OptionProps<Option, false>) => (
  <components.Option {...props}>
    <div className="grid min-h-[18px] grid-cols-[1fr_110px] items-center">
      <span>{props.data.label}</span>
      <span className="text-right text-gray-500">{props.data.value}</span>
    </div>
  </components.Option>
);

const CompanyPage: React.FC = () => {
  // ============================================================
  // STATE
  // ============================================================

  const [txtCoID, setCoID] = useState("");
  const [txtCoName, setCoName] = useState("");
  const [txtCoName_AR, setCoName_AR] = useState("");
  const [txtCoName_Short, setCoName_Short] = useState("");
  const [txtCoName_QR, setCoName_QR] = useState("");
  const [txtCoVATNo, setCoVATNo] = useState("");
  const [txtCoVATNo_AR, setCoVATNo_AR] = useState("");

  const [lkpPurchaseExpenseGroup, setPurchaseExpenseGroup] =
    useState<Option | null>(null);

  const [lkpBG2ARAP, setBG2ARAP] = useState<Option | null>(null);

  const [lkpYearClosingMethod, setYearClosingMethod] =
    useState<Option | null>(null);

  // Purchase Expense Group options are loaded from the database
  const [purchaseExpenseGroupOptions, setPurchaseExpenseGroupOptions] =
    useState<Option[]>([]);

  // empty = new record, filled = editing an existing record
  const [originalCoID, setOriginalCoID] = useState("");
  const [saving, setSaving] = useState(false);

  // ============================================================
  // OPTIONS
  // ============================================================

  const bg2ARAPOptions: Option[] = [
    { value: "Yes", label: "Yes" },
    { value: "No", label: "No" },
  ];

  const yearClosingMethodOptions: Option[] = [
    { value: "", label: "" },
    { value: "M", label: "Monthly" },
    { value: "Y", label: "Yearly" },
  ];

  // ============================================================
  // INPUT STYLE
  // ============================================================

  const inputClass = "w-full input-style";

  const smallInputClass = "w-[50%] input-style";

  // ============================================================
  // REACT SELECT STYLE
  // ============================================================

  const selectStyles: StylesConfig<Option, false> = {
    control: (base, state) => ({
      ...base,
      minHeight: "30px",
      height: "30px",
      width: "50%",
      border: "1px solid #d1d5db",
      borderRadius: "4px",
      boxShadow: "none",
      backgroundColor: state.isFocused ? "#eefbf4" : "#ffffff",
      fontSize: "11px",
      cursor: "pointer",

      "&:hover": {
        borderColor: "#9fdfbc",
      },
    }),

    valueContainer: (base) => ({
      ...base,
      height: "23px",
      minHeight: "23px",
      padding: "0 6px",
    }),

    singleValue: (base) => ({
      ...base,
      margin: 0,
      color: "#374151",
      fontSize: "11px",
    }),

    placeholder: (base) => ({
      ...base,
      margin: 0,
      color: "#808080",
      fontSize: "11px",
    }),

    input: (base) => ({
      ...base,
      margin: 0,
      padding: 0,
      fontSize: "11px",
      color: "#374151",
    }),

    indicatorsContainer: (base) => ({
      ...base,
      height: "23px",
    }),

    dropdownIndicator: (base) => ({
      ...base,
      padding: "2px 4px",
      color: "#aeb8c2",

      "&:hover": {
        color: "#808080",
      },
    }),

    indicatorSeparator: () => ({
      display: "none",
    }),

    menu: (base) => ({
      ...base,
      zIndex: 9999,
      marginTop: "2px",
      fontSize: "11px",
      borderRadius: "2px",
      overflow: "hidden",
    }),

    menuList: (base) => ({
      ...base,
      padding: 0,
      maxHeight: "180px",
    }),

    option: (base, state) => ({
      ...base,
      padding: "5px 8px",
      fontSize: "11px",
      color: "#374151",
      cursor: "pointer",

      backgroundColor: state.isSelected
        ? "#dff5e9"
        : state.isFocused
          ? "#eefbf4"
          : "#ffffff",

      "&:active": {
        backgroundColor: "#dff5e9",
      },
    }),
  };

  const selectStyles1: StylesConfig<Option, false> = {
    control: (base, state) => ({
      ...base,
      minHeight: "30px",
      height: "30px",
      width: "25%",
      border: "1px solid #d1d5db",
      borderRadius: "4px",
      boxShadow: "none",
      backgroundColor: state.isFocused ? "#eefbf4" : "#ffffff",
      fontSize: "11px",
      cursor: "pointer",

      "&:hover": {
        borderColor: "#9fdfbc",
      },
    }),

    valueContainer: (base) => ({
      ...base,
      height: "23px",
      minHeight: "23px",
      padding: "0 6px",
    }),

    singleValue: (base) => ({
      ...base,
      margin: 0,
      color: "#374151",
      fontSize: "11px",
    }),

    placeholder: (base) => ({
      ...base,
      margin: 0,
      color: "#808080",
      fontSize: "11px",
    }),

    input: (base) => ({
      ...base,
      margin: 0,
      padding: 0,
      fontSize: "11px",
      color: "#374151",
    }),

    indicatorsContainer: (base) => ({
      ...base,
      height: "23px",
    }),

    dropdownIndicator: (base) => ({
      ...base,
      padding: "2px 4px",
      color: "#aeb8c2",

      "&:hover": {
        color: "#808080",
      },
    }),

    indicatorSeparator: () => ({
      display: "none",
    }),

    menu: (base) => ({
      ...base,
      zIndex: 9999,
      marginTop: "2px",
      fontSize: "11px",
      borderRadius: "2px",
      overflow: "hidden",
    }),

    menuList: (base) => ({
      ...base,
      padding: 0,
      maxHeight: "180px",
    }),

    option: (base, state) => ({
      ...base,
      padding: "5px 8px",
      fontSize: "11px",
      color: "#374151",
      cursor: "pointer",

      backgroundColor: state.isSelected
        ? "#dff5e9"
        : state.isFocused
          ? "#eefbf4"
          : "#ffffff",

      "&:active": {
        backgroundColor: "#dff5e9",
      },
    }),
  };

  const purchaseSelectStyles: StylesConfig<Option, false> = {
    ...selectStyles,

    clearIndicator: () => ({ display: "none" }),

    menu: (base) => ({
      ...base,
      zIndex: 9999,
      width: "480px",
      marginTop: "4px",
      borderRadius: "8px",
      border: "1px solid #e5e7eb",
      boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
      overflow: "hidden",
    }),

    menuList: (base) => ({
      ...base,
      padding: 0,
      maxHeight: "260px",
    }),

    option: (base, state) => ({
      ...base,
      padding: "9px 12px",
      fontSize: "13px",
      color: "#374151",
      cursor: "pointer",
      backgroundColor:
        state.isFocused || state.isSelected ? "#eefbf4" : "#ffffff",
      "&:active": { backgroundColor: "#dff5e9" },
    }),
  };

  // ============================================================
  // LOAD PURCHASE EXPENSE GROUP OPTIONS
  // ============================================================

  useEffect(() => {
    let cancelled = false;

    const loadPurchaseGroups = async () => {
      try {
        const res = await fetch(`${API}/purchase-groups`);
        const data = await res.json();
        if (!res.ok || !data.success) {
          toast.error(data.message || "Failed to load purchase expense groups");
          return;
        }
        if (cancelled) return;

        setPurchaseExpenseGroupOptions([
          ...data.groups.map((g: { value: string; label: string }) => ({
            value: g.value,
            label: g.label,
          })),
        ]);
      } catch {
        if (!cancelled) toast.error("Failed to load purchase expense groups");
      }
    };

    loadPurchaseGroups();
    return () => {
      cancelled = true;
    };
  }, []);

  // ============================================================
  // ENTER KEY NAVIGATION
  // ============================================================

  const menuOpenRef = useRef(false);

  const focusNext = (currentId: string) => {
    const i = FIELD_ORDER.indexOf(currentId);
    const nextId = FIELD_ORDER[i + 1];
    if (nextId) document.getElementById(nextId)?.focus();
  };

  // For text inputs
  const handleEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    focusNext(e.currentTarget.id);
  };

  // For react-select: Enter picks an option while the menu is open,
  // and moves to the next control when the menu is closed
  const handleSelectEnter =
    (id: string) => (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "Enter" && !menuOpenRef.current) {
        e.preventDefault();
        focusNext(id);
      }
    };

  // ============================================================
  // CLEAR
  // ============================================================

  const handleClear = () => {
    setCoID("");
    setCoName("");
    setCoName_AR("");
    setCoName_Short("");
    setCoName_QR("");
    setCoVATNo("");
    setCoVATNo_AR("");

    setPurchaseExpenseGroup(null);
    setBG2ARAP(null);
    setYearClosingMethod(null);

    setOriginalCoID("");
  };

  // ============================================================
  // SAVE
  // ============================================================

  const handleSave = async () => {
    if (!txtCoID.trim()) {
      toast.warning("Company ID is required");
      document.getElementById("txtCoID")?.focus();
      return;
    }
    if (!txtCoName.trim()) {
      toast.warning("Company Name is required");
      document.getElementById("txtCoName")?.focus();
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originalCoID,
          coID: txtCoID,
          coName: txtCoName,
          coNameAR: txtCoName_AR,
          coNameShort: txtCoName_Short,
          coNameQR: txtCoName_QR,
          coVatNo: txtCoVATNo, // controller reads b.vatNo
          coVatNoAR: txtCoVATNo_AR, // controller reads b.vatNoAR
          purchaseExpenseGroup: lkpPurchaseExpenseGroup?.value ?? "",
          bg2ARAP: lkpBG2ARAP?.value ?? "",
          yearClosingMethod: lkpYearClosingMethod?.value ?? "",
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.message || "Not saved, try again");
        return;
      }
      toast.success(data.message); // "Saved" or "Modified"
      handleClear();
      document.getElementById("txtCoID")?.focus();
    } catch {
      toast.error("Not saved, try again");
    } finally {
      setSaving(false);
    }
  };

  // ============================================================
  // SEARCH
  // ============================================================

  // Fills every field from the API response
  const fillForm = (c: any) => {
    setCoID(c.fCoID ?? "");
    setCoName(c.fCoName ?? "");
    setCoName_AR(c.fCoName_AR ?? "");
    setCoName_Short(c.fCoName_Short ?? "");
    setCoName_QR(c.fCoName_QR ?? "");
    setCoVATNo(c.fCoVATNo ?? "");
    setCoVATNo_AR(c.fCoVATNo_AR ?? "");
    // Keep the saved group even if it isn't in the dropdown list,
    // so Modify never overwrites it with a blank
    const savedGroup = c.fPiExpenseAccountGroup ?? "";
    setPurchaseExpenseGroup(
      savedGroup
        ? (purchaseExpenseGroupOptions.find((o) => o.value === savedGroup) ?? {
            value: savedGroup,
            label: savedGroup,
          })
        : null,
    );
    setBG2ARAP(bg2ARAPOptions.find((o) => o.value === c.fBG2ARAP) ?? null);
    setYearClosingMethod(
      yearClosingMethodOptions.find((o) => o.value === c.fYCMethod) ?? null,
    );
    setOriginalCoID(c.fCoID); // Save becomes Modify
  };

  // Returns true when the company was found and loaded
  const loadCompany = async (
    id: string,
    showErrors: boolean,
  ): Promise<boolean> => {
    try {
      const res = await fetch(`${API}/${encodeURIComponent(id)}`);

      if (res.status === 404) return false; // not found = new company

      const data = await res.json();
      if (!res.ok || !data.success) {
        if (showErrors) toast.error(data.message || "Search failed");
        return false;
      }

      fillForm(data.company);
      return true;
    } catch {
      if (showErrors) toast.error("Search failed");
      return false;
    }
  };

  // Search button
  const handleSearch = async () => {
    const id = txtCoID.trim();
    if (!id) {
      toast.warning("Enter a Company ID to search");
      document.getElementById("txtCoID")?.focus();
      return;
    }
    const found = await loadCompany(id, true);
    if (!found) toast.info("Company not found", { toastId: "co-not-found" });
  };

  // Runs when the cursor leaves the Company ID box
  const handleCoIDBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
    // Clear and Search buttons do their own work; don't race with them
    const next = (e.relatedTarget as HTMLElement | null)?.id;
    if (next === "btnClear" || next === "btnSearch") return;

    const id = txtCoID.trim();
    if (!id) return;
    if (id === originalCoID) return; // this record is already loaded

    const found = await loadCompany(id, false);

    if (!found && originalCoID) {
      // Was editing another company and the new ID doesn't exist:
      // start a fresh record with this ID
      const keepId = id;
      handleClear();
      setCoID(keepId);
    }
  };

  // ============================================================
  // DELETE
  // ============================================================

  const handleDelete = async () => {
    if (!originalCoID) {
      toast.warning("Search for a company first");
      return;
    }
    if (!window.confirm(`Delete company ${originalCoID}?`)) return;

    try {
      const res = await fetch(`${API}/${encodeURIComponent(originalCoID)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.message || "Not deleted");
        return;
      }
      toast.success(data.message); // "Deleted"
      handleClear();
      document.getElementById("txtCoID")?.focus();
    } catch {
      toast.error("Not deleted");
    }
  };

  // ============================================================
  // ALT SHORTCUTS: S = Save, M = Modify, D = Delete, C = Clear, E = Search
  // ============================================================

  const actionsRef = useRef({
    save: () => {},
    modify: () => {},
    del: () => {},
    clear: () => {},
    search: () => {},
  });

  // Keep the ref pointing at the latest handlers and state.
  // No dependency array on purpose: it refreshes after every render.
  useEffect(() => {
    actionsRef.current = {
      // Save and Modify share one button; each shortcut works only in its own mode
      save: () => {
        if (!originalCoID && !saving) handleSave();
      },
      modify: () => {
        if (originalCoID && !saving) handleSave();
      },
      del: () => handleDelete(),
      clear: () => {
        handleClear();
        document.getElementById("txtCoID")?.focus();
      },
      search: () => handleSearch(),
    };
  });

  // Registers the key listener once
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!e.altKey || e.ctrlKey || e.metaKey) return;

      const actions: Record<string, () => void> = {
        KeyS: () => actionsRef.current.save(),
        KeyM: () => actionsRef.current.modify(),
        KeyD: () => actionsRef.current.del(),
        KeyC: () => actionsRef.current.clear(),
        KeyE: () => actionsRef.current.search(),
      };

      const action = actions[e.code];
      if (!action) return;

      e.preventDefault();
      action();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-white">
      <div className="w-[870px] overflow-hidden border border-slate-400 bg-white shadow-sm">

        {/* =====================================================
            HEADER
        ===================================================== */}

        <div className="flex h-[28px] w-full items-center bg-[#a7dfc0]">
          <h1 className="ml-[5px] text-[17px] font-semibold text-[#374151]">
            Company
          </h1>
        </div>

        {/* =====================================================
            FORM
        ===================================================== */}

        <div className="p-[12px] m-[12px]">

          {/* =================================================
              COMPANY ID
          ================================================= */}

          <div className="mb-[8px] grid grid-cols-[195px_1fr] items-center">
            <label
              htmlFor="txtCoID"
              className="pr-3 text-right text-[14px] text-gray-600"
            >
              Company ID :
            </label>

            <input
              id="txtCoID"
              type="text"
              maxLength={3}
              autoFocus
              value={txtCoID}
              onChange={(e) => setCoID(e.target.value)}
              onBlur={handleCoIDBlur}
              onKeyDown={handleEnter}
              autoComplete="off"
              className="w-[10%] input-style"
            />
          </div>

          {/* =================================================
              COMPANY NAME
          ================================================= */}

          <div className="mb-[8px] grid grid-cols-[195px_1fr] items-center">
            <label
              htmlFor="txtCoName"
              className="pr-3 text-right text-[14px] text-gray-600"
            >
              Company Name :
            </label>

            <input
              id="txtCoName"
              type="text"
              maxLength={100}
              value={txtCoName}
              onChange={(e) => setCoName(e.target.value)}
              onKeyDown={handleEnter}
              autoComplete="off"
              className={inputClass}
            />
          </div>

          {/* =================================================
              COMPANY NAME AR
          ================================================= */}

          <div className="mb-[8px] grid grid-cols-[195px_1fr] items-center">
            <label
              htmlFor="txtCoName_AR"
              className="pr-3 text-right text-[14px] text-gray-600"
            >
              Company Name (AR) :
            </label>

            <input
              id="txtCoName_AR"
              type="text"
              dir="rtl"
              maxLength={100}
              value={txtCoName_AR}
              onChange={(e) => setCoName_AR(e.target.value)}
              onKeyDown={handleEnter}
              autoComplete="off"
              className={inputClass}
            />
          </div>

          {/* =================================================
              SHORT COMPANY NAME
          ================================================= */}

          <div className="mb-[8px] grid grid-cols-[195px_1fr] items-center">
            <label
              htmlFor="txtCoName_Short"
              className="pr-3 text-right text-[14px] text-gray-600"
            >
              Short Company Name :
            </label>

            <input
              id="txtCoName_Short"
              type="text"
              maxLength={30}
              value={txtCoName_Short}
              onChange={(e) => setCoName_Short(e.target.value)}
              onKeyDown={handleEnter}
              autoComplete="off"
              className={smallInputClass}
            />
          </div>

          {/* =================================================
              COMPANY NAME QR
          ================================================= */}

          <div className="mb-[8px] grid grid-cols-[195px_1fr] items-center">
            <label
              htmlFor="txtCoName_QR"
              className="pr-3 text-right text-[14px] text-gray-600"
            >
              Company Name (QR) :
            </label>

            <input
              id="txtCoName_QR"
              type="text"
              maxLength={30}
              value={txtCoName_QR}
              onChange={(e) => setCoName_QR(e.target.value)}
              onKeyDown={handleEnter}
              autoComplete="off"
              className={smallInputClass}
            />
          </div>

          {/* =================================================
              VAT NO
          ================================================= */}

          <div className="mb-[8px] grid grid-cols-[195px_1fr] items-center">
            <label
              htmlFor="txtCoVATNo"
              className="pr-3 text-right text-[14px] text-gray-600"
            >
              VAT No. :
            </label>

            <input
              id="txtCoVATNo"
              type="text"
              maxLength={15}
              value={txtCoVATNo}
              onChange={(e) => setCoVATNo(e.target.value)}
              onKeyDown={handleEnter}
              autoComplete="off"
              className={smallInputClass}
            />
          </div>

          {/* =================================================
              VAT NO AR
          ================================================= */}

          <div className="mb-[8px] grid grid-cols-[195px_1fr] items-center">
            <label
              htmlFor="txtCoVATNo_AR"
              className="pr-3 text-right text-[14px] text-gray-600"
            >
              VAT No. (AR) :
            </label>

            <input
              id="txtCoVATNo_AR"
              type="text"
              maxLength={15}
              value={txtCoVATNo_AR}
              onChange={(e) => setCoVATNo_AR(e.target.value)}
              onKeyDown={handleEnter}
              autoComplete="off"
              className={`${smallInputClass} text-right`}
            />
          </div>

          {/* =================================================
              PURCHASE EXPENSE GROUP
          ================================================= */}

          <div className="mb-[8px] grid grid-cols-[195px_1fr] items-center">
            <label
              htmlFor="lkpPurchaseExpenseGroup"
              className="pr-3 text-right text-[14px] text-gray-600"
            >
              Purchase Expense Group :
            </label>

            <Select<Option, false>
              inputId="lkpPurchaseExpenseGroup"
              instanceId="lkpPurchaseExpenseGroup"
              options={purchaseExpenseGroupOptions}
              value={lkpPurchaseExpenseGroup}
              onChange={(option: SingleValue<Option>) =>
                setPurchaseExpenseGroup(option)
              }
              onKeyDown={handleSelectEnter("lkpPurchaseExpenseGroup")}
              onMenuOpen={() => (menuOpenRef.current = true)}
              onMenuClose={() => (menuOpenRef.current = false)}
              components={{ MenuList: AccountMenuList, Option: AccountOption }}
              styles={purchaseSelectStyles}
              filterOption={createFilter({
                ignoreCase: true,
                ignoreAccents: true,
                matchFrom: "any",
                stringify: (o) => `${o.data.label} ${o.data.value}`,
              })}
              noOptionsMessage={() => "No matching account"}
              isClearable
              backspaceRemovesValue
              isSearchable
              placeholder=""
              menuPosition="fixed"
            />
          </div>

          {/* =================================================
              BG2 AR/AP
          ================================================= */}

          <div className="mb-[8px] grid grid-cols-[195px_1fr] items-center">
            <label
              htmlFor="lkpBG2ARAP"
              className="pr-3 text-right text-[14px] text-gray-600"
            >
              BG2 AR/AP :
            </label>

            <Select<Option, false>
              inputId="lkpBG2ARAP"
              instanceId="lkpBG2ARAP"
              options={bg2ARAPOptions}
              value={lkpBG2ARAP}
              onChange={(option: SingleValue<Option>) => setBG2ARAP(option)}
              onKeyDown={handleSelectEnter("lkpBG2ARAP")}
              onMenuOpen={() => (menuOpenRef.current = true)}
              onMenuClose={() => (menuOpenRef.current = false)}
              styles={selectStyles1}
              isClearable={false}
              isSearchable={false}
              placeholder=""
              menuPosition="fixed"
            />
          </div>

          {/* =================================================
              YEAR CLOSING METHOD
          ================================================= */}

          <div className="mb-[8px] grid grid-cols-[195px_1fr] items-center">
            <label
              htmlFor="lkpYearClosingMethod"
              className="pr-3 text-right text-[14px] text-gray-600"
            >
              Year Closing Method :
            </label>

            <Select<Option, false>
              inputId="lkpYearClosingMethod"
              instanceId="lkpYearClosingMethod"
              options={yearClosingMethodOptions}
              value={lkpYearClosingMethod}
              onChange={(option: SingleValue<Option>) =>
                setYearClosingMethod(option)
              }
              onKeyDown={handleSelectEnter("lkpYearClosingMethod")}
              onMenuOpen={() => (menuOpenRef.current = true)}
              onMenuClose={() => (menuOpenRef.current = false)}
              styles={selectStyles1}
              isClearable={false}
              isSearchable={false}
              placeholder=""
              menuPosition="fixed"
            />
          </div>

          {/* =================================================
              BUTTONS
          ================================================= */}

          <div className="mt-[14px] flex justify-center gap-3">

            <button
              id="btnSave"
              type="button"
              onClick={handleSave}
              disabled={saving}
              title={originalCoID ? "Alt+M" : "Alt+S"}
              className="btn-style"
            >
              {originalCoID ? (
                <>
                  <span className="underline underline-offset-2">M</span>
                  odify
                </>
              ) : (
                <>
                  <span className="underline underline-offset-2">S</span>
                  ave
                </>
              )}
            </button>

            <button
              id="btnSearch"
              type="button"
              onClick={handleSearch}
              title="Alt+E"
              className="btn-style"
            >
              S
              <span className="underline underline-offset-2">e</span>
              arch
            </button>

            <button
              id="btnDelete"
              type="button"
              onClick={handleDelete}
              title="Alt+D"
              className="btn-style"
            >
              <span className="underline underline-offset-2">D</span>
              elete
            </button>

            <button
              id="btnClear"
              type="button"
              onClick={handleClear}
              title="Alt+C"
              className="btn-style"
            >
              <span className="underline underline-offset-2">C</span>
              lear
            </button>

          </div>
        </div>
      </div>
    </div>
  );
};

export default CompanyPage;
