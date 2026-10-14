import React, { useEffect, useRef, useState } from "react";
import Select, { components, type MenuListProps } from "react-select";
import { toast } from "react-toastify";
import { useEnterAsTab } from "../../../hooks/useEnterAsTab";
import { useButtonPermissions } from "../../../hooks/useButtonPermissions";

// ============================================================
// TYPES
// ============================================================

type Option = { value: string; label: string };
type Account = { accountId: string; accountName: string; isActive: boolean };

// one account as a row of the lookup (the value is the account id in both lists)
type AccountOption = { value: string; id: string; name: string };

const API = `${import.meta.env.VITE_API_URL}/InactivateAccount`;

// TODO: dbo.tblmenu fmenuid of the "Inactivate Account" page
const MENU_ID = "110205";

const statusOptions: Option[] = [
  { value: "TRUE", label: "Active" },
  { value: "FALSE", label: "Inactive" },
];

// ============================================================
// WHO IS LOGGED IN (company / year / user sent to the API)
// Same source as the Cost Center page.
// ============================================================

const getAppSession = (): { coId: string; year: string; userId: string } => {
  try {
    const PstrCoID = localStorage.getItem("PstrCoID") ?? "{}";
    const PstrYear = localStorage.getItem("PstrYear") ?? "{}";
    const PstrUserID = localStorage.getItem("PstrUserID") ?? "{}";
    return {
      coId: String(PstrCoID),
      year: String(PstrYear),
      userId: String(PstrUserID),
    };
  } catch {
    return { coId: "", year: "", userId: "" };
  }
};

// ============================================================
// SELECT STYLES
// ============================================================

const baseClassNames = {
  control: ({
    isFocused,
    isDisabled,
  }: {
    isFocused: boolean;
    isDisabled: boolean;
  }) => `
    !min-h-[25px] !h-[30px] !rounded-[4px] !border !shadow-none !text-[14px]
    hover:!border-[#aab8c5]
    ${isDisabled ? "!bg-[#f6f8fa]" : "!bg-white"}
    ${isFocused ? "!border-[#91a7b9]" : "!border-[#cfd7df]"}
  `,
  valueContainer: () => "!h-[23px] !py-0 !px-[5px] !overflow-hidden",
  singleValue: () => "!m-0 !text-[13px] !text-[#24364d]",
  placeholder: () => "!m-0 !text-[13px] !text-[#7a8794]",
  input: () => "!m-0 !p-0 !text-[13px] !text-[#24364d]",
  indicatorsContainer: () => "!h-[23px]",
  dropdownIndicator: () => "!p-[3px] !text-[#657486]",
  indicatorSeparator: () => "!hidden",
  clearIndicator: () => "!p-[3px]",
  menuList: () => "!p-0 !max-h-[240px]",
  option: ({
    isFocused,
    isSelected,
  }: {
    isFocused: boolean;
    isSelected: boolean;
  }) => `
    !cursor-pointer !px-[6px] !py-[5px] !text-[14px] !text-[#24364d]
    ${isSelected ? "!bg-[#e7f7ed]" : isFocused ? "!bg-[#f2faf5]" : "!bg-white"}
  `,
};

const menuClass =
  "!mt-[1px] !rounded-none !border !border-[#cfd7df] !z-[999999] !shadow-md";

const commonSelectProps = {
  isSearchable: false,
  isClearable: false,
  placeholder: "",
  menuPosition: "fixed" as const,
  menuPortalTarget: typeof document !== "undefined" ? document.body : undefined,
};

// status: a small list
const statusSelectProps = {
  ...commonSelectProps,
  classNames: { ...baseClassNames, menu: () => menuClass },
};

// account lookups: the list is much wider than the box and shows two columns
// (same look as the grid lookups on the other pages: gray header, light-green hover row)
const lookupSelectProps = {
  ...commonSelectProps,
  classNames: {
    ...baseClassNames,
    menu: () =>
      "!mt-[2px] !rounded-[3px] !border !border-[#9fb0bf] !z-[999999] !shadow-lg !overflow-hidden",
    menuList: () => "!p-0 !max-h-[280px]",
    option: ({
      isFocused,
      isSelected,
    }: {
      isFocused: boolean;
      isSelected: boolean;
    }) => `
      !cursor-pointer !p-0 !text-[13px] !text-[#24364d]
      ${isSelected ? "!bg-[#dff3e7]" : isFocused ? "!bg-[#eaf6ef]" : "!bg-white"}
    `,
  },
};

// ============================================================
// TWO-COLUMN LOOKUP (like the old DevExpress lookups)
//   Account ID box   -> columns: Account ID | Account Name
//   Account Name box -> columns: Account Name | Account ID
// The header row sticks to the top of the list.
// ============================================================

// the Account row is: [ID box 120px] [gap 8px] [name box]
// (keep these in step with grid-cols-[120px_1fr] gap-2 in the render)
const ID_BOX_WIDTH = 120;
const ROW_GAP = 8;

// Account Name list: the name column is as wide as the name box and this
// Account ID column sticks out to the right of the box (keep equal to the
// 120px in NAME_COLUMNS below)
const ID_COL_WIDTH = 120;

const ID_COLUMNS = "grid-cols-[120px_1fr]";
const NAME_COLUMNS = "grid-cols-[1fr_120px]";

// the first cell carries the vertical divider; the option rows have no padding
// of their own, so the line runs the full height of header and rows
const CELL_FIRST = "border-r border-[#cfd7df] px-[10px] py-[6px]";
const CELL_SECOND = "px-[10px] py-[6px]";

const lookupHeader = (columns: string, first: string, second: string) => (
  <div
    className={`sticky top-0 z-10 grid ${columns} border-b border-[#cfd7df] bg-[#ececec] text-[13px] font-semibold text-[#24364d]`}
  >
    <span className={CELL_FIRST}>{first}</span>
    <span className={CELL_SECOND}>{second}</span>
  </div>
);

// defined outside the component so React does not remount the list on every render
const IdMenuList = (props: MenuListProps<AccountOption, false>) => (
  <components.MenuList {...props}>
    {lookupHeader(ID_COLUMNS, "Account ID", "Account Name")}
    {props.children}
  </components.MenuList>
);

const NameMenuList = (props: MenuListProps<AccountOption, false>) => (
  <components.MenuList {...props}>
    {lookupHeader(NAME_COLUMNS, "Account Name", "Account ID")}
    {props.children}
  </components.MenuList>
);

const FieldLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex h-7.5 items-center justify-end border border-[#e0e5ea] bg-[#fafbfc] pr-3 text-[14px] ">
    {children}
  </div>
);

// ============================================================
// COMPONENT
// ============================================================

type InactivateAccountPageProps = {
  onClose?: () => void;
};

const InactivateAccountPage: React.FC<InactivateAccountPageProps> = ({
  onClose,
}) => {
  const handleEnterAsTab = useEnterAsTab();
  const perms = useButtonPermissions(MENU_ID);

  const { coId, year, userId } = getAppSession();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountId, setAccountId] = useState<string | null>(null); // lkpAccountID / lkpAccountName
  const [status, setStatus] = useState<Option | null>(null); // lkpStatus
  const [saving, setSaving] = useState(false);

  // bumped after a modify / clear so the accounts load again from the database
  const [reloadKey, setReloadKey] = useState(0);

  // width of the whole Account row (ID box + gap + name box), measured when a
  // list opens; both lists are sized from it
  const accountRowRef = useRef<HTMLDivElement>(null);
  const [rowWidth, setRowWidth] = useState(430);
  const measureRow = () => setRowWidth(accountRowRef.current?.offsetWidth ?? 430);

  // ============================================================
  // LOAD ACCOUNTS (VB: FillCombos / GetInactiveAccountData)
  // ============================================================

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch(`${API}?coId=${encodeURIComponent(coId)}`);
        const data = await res.json();

        if (!res.ok || !data.success) {
          toast.error(data.message || "Failed to load accounts");
          return;
        }
        if (cancelled) return;

        setAccounts(data.accounts as Account[]);
      } catch {
        if (!cancelled) toast.error("Failed to load accounts");
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [reloadKey, coId]);

  // ============================================================
  // OPTIONS (Account ID box sorted by ID, Account Name box sorted by name)
  // ============================================================

  const toOption = (a: Account): AccountOption => ({
    value: a.accountId,
    id: a.accountId,
    name: a.accountName,
  });

  const accountIdOptions: AccountOption[] = [...accounts]
    .sort((a, b) => a.accountId.localeCompare(b.accountId))
    .map(toOption);
  const accountNameOptions: AccountOption[] = [...accounts]
    .sort((a, b) => a.accountName.localeCompare(b.accountName))
    .map(toOption);

  const selectedId = accountIdOptions.find((o) => o.value === accountId) ?? null;
  const selectedName =
    accountNameOptions.find((o) => o.value === accountId) ?? null;

  // VB: lkpAccountID/lkpAccountName_EditValueChanged -> sync both lookups and load the current status
  const handleAccountChange = (id: string | null) => {
    setAccountId(id);
    const acc = accounts.find((a) => a.accountId === id);
    if (acc) setStatus(statusOptions[acc.isActive ? 0 : 1]);
  };

  // ============================================================
  // CLEAR / CLOSE
  // ============================================================

  const handleClear = () => {
    setAccountId(null);
    setStatus(null);
    setReloadKey((key) => key + 1);
  };

  const handleClose = () => {
    setAccountId(null);
    setStatus(null);
    onClose?.();
  };

  // ============================================================
  // MODIFY (VB: ValidateMe + cmdSave_Click -> Apply)
  // ============================================================

  const handleModify = async () => {
    if (!perms.modify) {
      toast.warning("You don't have the permission to modify", {
        toastId: "ia-modify-denied",
      });
      return;
    }

    if (!accountId) {
      toast.warning("Please select an 'Account'");
      document.getElementById("lkpAccountID")?.focus();
      return;
    }

    if (!status) {
      toast.warning("Please select a 'Status'");
      document.getElementById("lkpStatus")?.focus();
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          coId,
          year,
          userId,
          accountId,
          isActive: status.value === "TRUE",
          menuName: "Inactivate Account",
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        toast.error(data.message || "Not modified, try again");
        return;
      }

      toast.success("Modified");
      handleClear();
    } catch {
      toast.error("Not modified, try again");
    } finally {
      setSaving(false);
    }
  };

  // ============================================================
  // KEYBOARD SHORTCUTS (page wide)
  //  Alt+M  Modify
  //  Alt+C  Close
  // No dependency array on purpose: the listener is re-attached after every
  // render, so it always sees the latest state / permissions / handlers.
  // ============================================================

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.altKey && !event.ctrlKey && !event.metaKey) {
        if (event.code === "KeyM") {
          event.preventDefault();
          if (!saving) handleModify();
          return;
        }

        if (event.code === "KeyC") {
          event.preventDefault();
          handleClose();
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  // Enter on a BUTTON presses it; Enter anywhere else moves to the next box.
  const handlePageKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    const target = event.target as HTMLElement;

    if (event.key === "Enter" && target.tagName === "BUTTON") {
      event.preventDefault();
      target.click();
      return;
    }

    handleEnterAsTab(event);
  };

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div
      onKeyDown={handlePageKeyDown}
      className="flex min-h-full w-full items-center justify-center bg-white px-4 py-4"
    >
      <div className="mx-auto min-h-full w-160 max-w-full bg-white p-0">
        <main className="w-full overflow-hidden border border-[#d5dce2] bg-white">
          <header className="flex h-7.5 items-center justify-start bg-[#9fdfbc]">
            <h1 className="m-0 ml-3.5 text-[17px] font-semibold text-[#24364d]">
              Inactivate Account
            </h1>
          </header>

          <section className="px-3.5 pb-6 pt-5">
            <div className="grid grid-cols-[100px_1fr] items-center gap-x-4 gap-y-4">
              <FieldLabel>Account :</FieldLabel>
              <div
                ref={accountRowRef}
                className="grid grid-cols-[120px_1fr] gap-2"
              >
                {/* Account ID box: shows the id, the list shows ID + name */}
                <Select<AccountOption, false>
                  inputId="lkpAccountID"
                  instanceId="lkpAccountID"
                  options={accountIdOptions}
                  value={selectedId}
                  onChange={(option) => handleAccountChange(option?.value ?? null)}
                  onMenuOpen={measureRow}
                  styles={{
                    // starts at the left edge of the ID box, as wide as the whole Account row
                    menu: (base) => ({ ...base, width: rowWidth }),
                  }}
                  getOptionLabel={(o) => o.id}
                  formatOptionLabel={(o, meta) =>
                    meta.context === "menu" ? (
                      <div className={`grid ${ID_COLUMNS}`}>
                        <span className={CELL_FIRST}>{o.id}</span>
                        <span className={CELL_SECOND}>{o.name}</span>
                      </div>
                    ) : (
                      o.id
                    )
                  }
                  components={{ MenuList: IdMenuList }}
                  {...lookupSelectProps}
                />

                {/* Account Name box: shows the name, the list shows name + ID */}
                <Select<AccountOption, false>
                  inputId="lkpAccountName"
                  instanceId="lkpAccountName"
                  options={accountNameOptions}
                  value={selectedName}
                  onChange={(option) => handleAccountChange(option?.value ?? null)}
                  onMenuOpen={measureRow}
                  styles={{
                    // starts at the left edge of the Account Name box: the name
                    // column is as wide as the box, the ID column sticks out to its right
                    menu: (base) => ({
                      ...base,
                      width: rowWidth - ID_BOX_WIDTH - ROW_GAP + ID_COL_WIDTH,
                    }),
                  }}
                  getOptionLabel={(o) => o.name}
                  formatOptionLabel={(o, meta) =>
                    meta.context === "menu" ? (
                      <div className={`grid ${NAME_COLUMNS}`}>
                        <span className={CELL_FIRST}>{o.name}</span>
                        <span className={CELL_SECOND}>{o.id}</span>
                      </div>
                    ) : (
                      o.name
                    )
                  }
                  components={{ MenuList: NameMenuList }}
                  {...lookupSelectProps}
                />
              </div>

              <FieldLabel>Status :</FieldLabel>
              <div className="w-30">
                <Select
                  inputId="lkpStatus"
                  instanceId="lkpStatus"
                  options={statusOptions}
                  value={status}
                  onChange={setStatus}
                  {...statusSelectProps}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 flex justify-center gap-3">
              <button
                id="btnModify"
                name="btnModify"
                type="button"
                onClick={handleModify}
                disabled={!perms.modify || saving}
                title="Alt+M"
                className="btn-style disabled:cursor-not-allowed disabled:opacity-40"
              >
                <u>M</u>odify
              </button>
             
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};

export default InactivateAccountPage;
