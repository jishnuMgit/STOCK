import React, { useEffect, useRef, useState } from "react";
import Select, {
  components,
  type MenuListProps,
  type SingleValue,
  type StylesConfig,
} from "react-select";

import { useCoa } from "../../../hooks/useCoa";

// ============================================================
// TYPES
// ============================================================

// S = add a new account under accountId, M = modify accountId, D = delete accountId
export type CoaMode = "S" | "M" | "D";

interface COAPageProps {
  mode: CoaMode;
  accountId: string; // the node that was clicked in the list
  onClose: () => void;
  // called after a successful save / modify / delete.
  // expandId = parent node the list should open (after an Add)
  onChanged: (expandId?: string) => void | Promise<void>;
}

interface AccountFormData {
  txtAccountGroupID: string;
  txtAccountGroupName: string;
  txtAccountGroupLevel: string;
  txtAccountID: string;
  txtAccountName: string;
  txtAccountName_AR: string;
  txtAccountLevel: string;
  lkpAccountGroupOrHead: string;
  lkpGPH: string; // Have Cost Center: Yes / No
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

const emptyForm: AccountFormData = {
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
};

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

const defaultGph = (level: number) => (level < 4 ? "G" : "H");

const errorMessage = (err: unknown, fallback: string) =>
  err instanceof Error ? err.message : fallback;

// ============================================================
// MAIN COMPONENT
// ============================================================

const COAPage: React.FC<COAPageProps> = ({
  mode,
  accountId,
  onClose,
  onChanged,
}) => {
  const {
    fetchAccount,
    fetchNextAccountId,
    saveAccount,
    updateAccount,
    deleteAccount,
  } = useCoa();

  // ============================================================
  // STATE
  // ============================================================

  const [formData, setFormData] = useState<AccountFormData>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState("");

  const accountIdRef = useRef<HTMLInputElement>(null);
  const accountNameRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLDivElement>(null);

  const isAdd = mode === "S";
  const isModify = mode === "M";
  const isDelete = mode === "D";
  const disabledAll = loading || busy;

  // ============================================================
  // LOAD (port of frmChartOfAccountSub_Load)
  // ============================================================

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        setLoadError("");

        const acc = await fetchAccount(accountId);
        if (cancelled) return;

        if (isAdd) {
          // acc is the PARENT: the new account goes one level below it
          const groupLevel = acc.accountLevel ?? 0;
          const level = groupLevel + 1;
          const nextId = await fetchNextAccountId(acc.accountId, groupLevel);
          if (cancelled) return;

          setFormData({
            ...emptyForm,
            txtAccountGroupID: acc.accountId,
            txtAccountGroupName: acc.accountName,
            txtAccountGroupLevel: String(groupLevel),
            txtAccountID: nextId,
            txtAccountLevel: String(level),
            lkpAccountGroupOrHead: defaultGph(level),
            lkpGPH: "No",
            newAccountID: "Auto",
          });
        } else {
          // Modify / Delete: acc is the account itself
          const level = acc.accountLevel ?? 0;

          setFormData({
            txtAccountGroupID: acc.accountGroupId,
            txtAccountGroupName: acc.accountGroupName,
            txtAccountGroupLevel:
              acc.accountGroupLevel === null
                ? ""
                : String(acc.accountGroupLevel),
            txtAccountID: acc.accountId,
            txtAccountName: acc.accountName,
            txtAccountName_AR: acc.accountNameA ?? "",
            txtAccountLevel: String(level),
            lkpAccountGroupOrHead: acc.groupOrHead || defaultGph(level),
            lkpGPH: acc.haveCC ? "Yes" : "No",
            // Modify may rename the id, so it must be editable
            newAccountID: "Manual",
          });
        }
      } catch (err) {
        if (!cancelled) {
          setLoadError(errorMessage(err, "Failed to load account"));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [accountId, isAdd, fetchAccount, fetchNextAccountId]);

  // cursor goes to Account Name once the form is ready
  useEffect(() => {
    if (!loading && !loadError && !isDelete) {
      accountNameRef.current?.focus();
    }
  }, [loading, loadError, isDelete]);

  // ============================================================
  // ENTER = TAB
  // ============================================================

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

  // ============================================================
  // INPUT CHANGE
  // ============================================================

  const handleChange = (field: keyof AccountFormData, value: string) => {
    setFormData((previous) => ({ ...previous, [field]: value }));
  };

  const requestNextId = async (groupId: string, groupLevelText: string) => {
    const groupLevel = parseInt(groupLevelText, 10);
    if (!groupId || Number.isNaN(groupLevel)) return "";
    return fetchNextAccountId(groupId, groupLevel);
  };

  const handleIdModeChange = async (idMode: "Auto" | "Manual") => {
    setFormData((previous) => ({ ...previous, newAccountID: idMode }));

    if (idMode === "Auto" && isAdd) {
      try {
        const nextId = await requestNextId(
          formData.txtAccountGroupID,
          formData.txtAccountGroupLevel,
        );
        setFormData((previous) => ({ ...previous, txtAccountID: nextId }));
      } catch (err) {
        window.alert(errorMessage(err, "Unable to Generate New Account ID"));
      }
    }

    // wait for the re-render so the Account ID input is enabled/disabled first
    setTimeout(() => {
      if (idMode === "Manual") accountIdRef.current?.focus();
      else accountNameRef.current?.focus();
    }, 0);
  };

  // ============================================================
  // CLEAR  (port of ClearMe: group stays, name / id / cost center reset)
  // ============================================================

  const handleClear = async () => {
    const auto = formData.newAccountID === "Auto";
    let nextId = "";

    if (auto && isAdd) {
      try {
        nextId = await requestNextId(
          formData.txtAccountGroupID,
          formData.txtAccountGroupLevel,
        );
      } catch (err) {
        window.alert(errorMessage(err, "Unable to Generate New Account ID"));
      }
    }

    setFormData((previous) => ({
      ...previous,
      txtAccountID: auto ? nextId || previous.txtAccountID : "",
      txtAccountName: "",
      txtAccountName_AR: "",
      lkpGPH: "No",
    }));

    setTimeout(() => {
      if (auto) accountNameRef.current?.focus();
      else accountIdRef.current?.focus();
    }, 0);
  };

  // ============================================================
  // SAVE / MODIFY
  // ============================================================

  const handleSave = async () => {
    if (!formData.txtAccountName.trim()) {
      window.alert(
        isAdd
          ? "Please input an 'Account name'"
          : "Please input the 'Account Name'",
      );
      accountNameRef.current?.focus();
      return;
    }

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

    const common = {
      accountName: formData.txtAccountName.trim(),
      accountNameA: formData.txtAccountName_AR.trim(),
      haveCC: formData.lkpGPH === "Yes",
      groupOrHead: formData.lkpAccountGroupOrHead || undefined,
    };

    try {
      setBusy(true);

      if (isAdd) {
        const auto = formData.newAccountID === "Auto";

        await saveAccount({
          ...common,
          accountGroupId: formData.txtAccountGroupID,
          autoId: auto,
          accountId: auto ? undefined : formData.txtAccountID.trim(),
        });

        window.alert("Saved");
        await onChanged(formData.txtAccountGroupID);

        // ready for the next account under the same group (VB: ClearMe)
        await handleClear();
      } else {
        await updateAccount(accountId, {
          ...common,
          accountId: formData.txtAccountID.trim(),
        });

        window.alert("Modified");
        await onChanged();
        onClose();
      }
    } catch (err) {
      window.alert(
        errorMessage(
          err,
          isAdd ? "Not Saved, try again" : "Not Modified, try again",
        ),
      );
    } finally {
      setBusy(false);
    }
  };

  // ============================================================
  // DELETE
  // ============================================================

  const handleDelete = async () => {
    if (!isDelete) return;

    const confirmed = window.confirm(
      `Do you want to delete the account '${formData.txtAccountName}' ?`,
    );
    if (!confirmed) return;

    try {
      setBusy(true);
      await deleteAccount(accountId);
      window.alert("Deleted!");
      await onChanged();
      onClose();
    } catch (err) {
      window.alert(errorMessage(err, "Not Deleted, try again"));
    } finally {
      setBusy(false);
    }
  };

  // ============================================================
  // COMMON STYLES
  // ============================================================

  const smallInputClass =
    "h-[29px] rounded-[2px] border border-slate-300 bg-white px-2 text-[13px] text-slate-700 outline-none focus:border-slate-400 focus:ring-0";

  const labelClass = "text-[14px] text-slate-600 whitespace-nowrap";

  const roClass = "read-only:bg-slate-50";

  return (
    <div className="flex min-h-fit items-start w-full justify-center bg-[#a3dfc0]">
      <div className="mt-[2px] w-full bg-white">
        {/* TITLE */}
        <div className="flex h-7 w-full items-center border-b border-slate-400 bg-[#a3dfc0]">
          <h1
            id="ChartOfAccount"
            className="ml-[10px] text-[17px] font-semibold text-slate-700"
          >
            Chart Of Account
          </h1>
        </div>

        {/* LOAD ERROR */}
        {loadError && (
          <div className="px-[38px] py-6 text-center text-[13px] text-red-500">
            {loadError}
          </div>
        )}

        {/* FORM */}
        {!loadError && (
          <div
            ref={formRef}
            onKeyDown={handleEnterAsTab}
            className={`px-[38px] pb-[25px] pt-[10px] ${loading ? "pointer-events-none opacity-60" : ""}`}
          >
            {/* ACCOUNT GROUP */}
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
                readOnly
                tabIndex={-1}
                className={`input-style ${roClass}`}
              />

              <input
                id="txtAccountGroupName"
                type="text"
                value={formData.txtAccountGroupName}
                readOnly
                tabIndex={-1}
                className={`input-style ${roClass}`}
              />
            </div>

            {/* ACCOUNT GROUP LEVEL + NEW ACCOUNT ID */}
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
                readOnly
                tabIndex={-1}
                className={`${smallInputClass} ${roClass}`}
              />

              <fieldset className="relative ml-[5px] flex h-[55px] items-center gap-[25px] rounded-[7px] border border-slate-200 px-[17px] pt-[5px]">
                <legend className="px-[5px] text-[14px] text-slate-500">
                  New Account ID
                </legend>

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
                    disabled={!isAdd || disabledAll}
                    onChange={() => handleIdModeChange("Auto")}
                    className="h-[16px] w-[16px] accent-blue-600"
                  />
                  <span>Auto</span>
                </label>

                <label
                  htmlFor="manualAccountID"
                  className="flex cursor-pointer items-center gap-[7px] text-[13px] text-slate-600"
                >
                  <input
                    id="manualAccountID"
                    type="radio"
                    name="newAccountID"
                    value="Manual"
                    checked={formData.newAccountID === "Manual"}
                    disabled={!isAdd || disabledAll}
                    onChange={() => handleIdModeChange("Manual")}
                    className="h-[16px] w-[16px] accent-blue-600"
                  />
                  <span>Manual</span>
                </label>
              </fieldset>
            </div>

            {/* ACCOUNT ID */}
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
                maxLength={12}
                value={formData.txtAccountID}
                disabled={formData.newAccountID === "Auto" || isDelete}
                onChange={(e) => handleChange("txtAccountID", e.target.value)}
                className="input-style disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
              />
            </div>

            {/* ACCOUNT NAME */}
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
                maxLength={100}
                value={formData.txtAccountName}
                disabled={isDelete}
                onChange={(e) => handleChange("txtAccountName", e.target.value)}
                className="input-style disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
              />
            </div>

            {/* ACCOUNT NAME ARABIC */}
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
                maxLength={100}
                value={formData.txtAccountName_AR}
                disabled={isDelete}
                onChange={(e) =>
                  handleChange("txtAccountName_AR", e.target.value)
                }
                className="input-style disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
              />
            </div>

            {/* ACCOUNT LEVEL + HAVE COST CENTER */}
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
                readOnly
                tabIndex={-1}
                className={`${smallInputClass} ${roClass}`}
              />

              <div />

              <label
                htmlFor="lkpGPH"
                className={`${labelClass} text-right -ml-4`}
              >
                Have Cost Center :
              </label>

              <select
                id="lkpGPH"
                value={formData.lkpGPH}
                disabled={isDelete}
                onChange={(e) => handleChange("lkpGPH", e.target.value)}
                className="input-style cursor-pointer pr-2"
              >
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </div>

            {/* GROUP / PARENT / HEAD */}
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
                isDisabled={isDelete}
                formatOptionLabel={formatGphOption}
                styles={gphStyles}
                components={{ MenuList: GphMenuList }}
                isSearchable={false}
                menuPortalTarget={document.body}
                menuPosition="fixed"
              />
            </div>

            {/* BUTTONS */}
            <div className="mt-[10px] flex justify-center gap-[11px]">
              {/* SAVE / MODIFY (disabled in Delete mode) */}
              <button
                id="btnSave"
                type="button"
                onClick={handleSave}
                disabled={disabledAll || isDelete}
                className="btn-style disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isAdd ? (
                  <>
                    <span className="underline">S</span>
                    ave
                  </>
                ) : (
                  "Modify"
                )}
              </button>

              {/* DELETE (only enabled in Delete mode) */}
              <button
                id="btnDelete"
                type="button"
                onClick={handleDelete}
                disabled={disabledAll || !isDelete}
                className="btn-style disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="underline">D</span>
                elete
              </button>

              {/* CLEAR (Add mode only) */}
              <button
                id="btnClear"
                type="button"
                onClick={handleClear}
                disabled={disabledAll || !isAdd}
                className="btn-style disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="underline">C</span>
                lear
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default COAPage;
