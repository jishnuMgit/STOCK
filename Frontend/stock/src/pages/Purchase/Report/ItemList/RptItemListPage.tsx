import React, { useEffect, useMemo, useRef, useState } from "react";
import Select, {
  components,
  type MenuListProps,
  type OptionProps,
} from "react-select";
import { toast } from "react-toastify";
import { buildItemListPdf } from "./downloadItemListPdf";
import { saveFile } from "./saveFile";
import {
  buildHtml,
  printItemListReport,
  type PrintReport,
} from "./printItemListReport";

type Option = { value: string; label: string };

type RadioOptionProps = {
  name: string;
  value: string;
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: () => void;
};

type Branch = { brId: string; brName: string };
type Group = { groupId: string; groupName: string };
type Item = { itemId: string; itemName: string; groupId?: string };

type ItemListRequest = {
  allBranches: boolean;
  branchId: string;
  allGroups: boolean;
  groupId: string;
  itemMode: number;
  itemId: string;
  fromItemId: string;
  toItemId: string;
  status: number;
  salesBelowCost: boolean;
};

const API = `${import.meta.env.VITE_API_URL}/RptItemList`;

// Sends the login cookie, and the company / user kept at sign-in as a stopgap
// (the server uses its session first and only falls back to these).
const apiFetch = (url: string, init: RequestInit = {}) => {
  const coId = localStorage.getItem("PstrCoID") ?? "";
  const userId = localStorage.getItem("PstrUserID") ?? "";
  const sep = url.includes("?") ? "&" : "?";

  return fetch(
    `${url}${sep}coId=${encodeURIComponent(coId)}&userId=${encodeURIComponent(userId)}`,
    { credentials: "include", ...init },
  );
};

const selectClassNames = {
  control: ({
    isFocused,
    isDisabled,
  }: {
    isFocused: boolean;
    isDisabled: boolean;
  }) => `
    !min-h-[25px] !h-[30px] !rounded-[4px] !border !shadow-none !text-[13px]
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
  menu: () =>
    "!mt-[1px] !rounded-none !border !border-[#cfd7df] !z-[999999] !shadow-md",
  menuList: () => "!p-0 !max-h-[180px]",
  option: ({
    isFocused,
    isSelected,
  }: {
    isFocused: boolean;
    isSelected: boolean;
  }) => `
    !cursor-pointer !px-[6px] !py-[5px] !text-[13px] !text-[#24364d]
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

// ---- two-column lookup list (Item ID | Item Name, like the grid lookups) ----
type ItemOption = Option & { id: string; name: string };

const ID_FIRST = "grid grid-cols-[143px_1fr]"; // lkpItemID: Item ID (box 135 + gap 8) | Item Name (= width of the name box)
const NAME_FIRST = "grid grid-cols-[1fr_130px]"; // lkpItemName: Item Name (= box width) | Item ID outside

const itemListClassNames = (menuWidth: string) => ({
  ...selectClassNames,
  menu: () =>
    `!mt-[1px] ${menuWidth} !rounded-none !border !border-[#cfd7df] !z-[999999] !shadow-md`,
  menuList: () => "!p-0 !max-h-[240px]",
  option: ({
    isFocused,
    isSelected,
  }: {
    isFocused: boolean;
    isSelected: boolean;
  }) => `
    !cursor-pointer !p-0 !text-[13px] !text-[#24364d]
    ${isSelected ? "!bg-[#e7f7ed]" : isFocused ? "!bg-[#f2faf5]" : "!bg-white"}
  `,
});

// the first column is exactly as wide as the box; the second column hangs
// outside the box to the right
const idClassNames = itemListClassNames(""); // width is set from the measured Item row
const nameClassNames = itemListClassNames("!w-[calc(100%_+_130px)]"); // box + 130

const makeItemMenuList = (
  cols: string,
  first: string,
  second: string,
  headerBg = "bg-[#f5f6fa]", // same header colour for every lookup
) => {
  const ItemMenuList = (props: MenuListProps<ItemOption, false>) => (
    <components.MenuList {...props}>
      <div
        className={`${cols} sticky top-0 z-[1] border-b border-[#cfd7df] ${headerBg} text-[13px] font-semibold text-[#24364d]`}
      >
        <div className="border-r border-[#cfd7df] px-[8px] py-[7px]">
          {first}
        </div>
        <div className="px-[8px] py-[7px]">{second}</div>
      </div>
      {props.children}
    </components.MenuList>
  );
  return ItemMenuList;
};

const makeItemOption = (cols: string, idFirst: boolean) => {
  const ItemOptionRow = (props: OptionProps<ItemOption, false>) => {
    const { id, name } = props.data;
    return (
      <components.Option {...props}>
        <div className={cols}>
          <div className="truncate px-[8px] py-[6px]">{idFirst ? id : name}</div>
          <div className="truncate px-[8px] py-[6px]">{idFirst ? name : id}</div>
        </div>
      </components.Option>
    );
  };
  return ItemOptionRow;
};

const idComponents = {
  MenuList: makeItemMenuList(ID_FIRST, "Item ID", "Item Name"),
  Option: makeItemOption(ID_FIRST, true),
};
const nameComponents = {
  MenuList: makeItemMenuList(NAME_FIRST, "Item Name", "Item ID"),
  Option: makeItemOption(NAME_FIRST, false),
};

// lkpBranch: Branch (= box width) | ID hanging outside to the right
const BRANCH_COLS = "grid grid-cols-[1fr_55px]";
const branchClassNames = itemListClassNames("!w-[calc(100%_+_55px)]");
const branchComponents = {
  MenuList: makeItemMenuList(BRANCH_COLS, "Branch", "ID"),
  Option: makeItemOption(BRANCH_COLS, false),
};

// type in either box: matches the item id or the item name
const filterItem = (option: { data: ItemOption }, input: string) => {
  const q = input.trim().toLowerCase();
  return (
    q === "" ||
    option.data.id.toLowerCase().includes(q) ||
    option.data.name.toLowerCase().includes(q)
  );
};

// ---- list layouts for the group / range lookups -------------------------
// group ID box: Group ID (box + gap) | Group Name (= width of the name box)
// group name box: Group Name (= box width) | Group ID hanging outside
const groupIdComponents = {
  MenuList: makeItemMenuList(ID_FIRST, "ID", "Group Name"),
  Option: makeItemOption(ID_FIRST, true),
};
const groupNameComponents = {
  MenuList: makeItemMenuList(NAME_FIRST, "Group Name", "ID"),
  Option: makeItemOption(NAME_FIRST, false),
};

// range boxes (135px each): Item ID (= box width) | Item Name outside
const RANGE_COLS = "grid grid-cols-[135px_1fr]";
const rangeComponents = {
  MenuList: makeItemMenuList(RANGE_COLS, "Item ID", "Item Name"),
  Option: makeItemOption(RANGE_COLS, true),
};

// ---- Enter moves to the next field (like Tab) ------------------------------
// Branch -> Group ID -> Group Name -> Item ID -> Item Name (or From -> To)
// -> Print. A disabled or hidden field is skipped.
const NAV_ORDER = [
  "lkpBranch",
  "lkpItemGroupID",
  "lkpItemGroupName",
  "lkpItemID",
  "lkpItemName",
  "lkpFromItem",
  "lkpToItem",
  "btnPrint",
] as const;
type NavKey = (typeof NAV_ORDER)[number];

const focusField = (key: NavKey): boolean => {
  const el = document.getElementById(key);
  if (!el || (el as HTMLInputElement).disabled) return false;
  el.focus();
  return true;
};

const focusNext = (from: NavKey) => {
  for (let i = NAV_ORDER.indexOf(from) + 1; i < NAV_ORDER.length; i++) {
    if (focusField(NAV_ORDER[i])) return;
  }
};

// focus a field after React has re-rendered (a radio just enabled / showed it)
const focusSoon = (id: string) =>
  setTimeout(() => document.getElementById(id)?.focus(), 50);

const CustomRadio: React.FC<RadioOptionProps> = ({
  name,
  value,
  label,
  checked,
  disabled = false,
  onChange,
}) => (
  <label
    className={`flex items-center gap-2.5 whitespace-nowrap select-none ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
      }`}
  >
    <input
      type="radio"
      name={name}
      value={value}
      checked={checked}
      disabled={disabled}
      onChange={onChange}
      className="sr-only"
    />
    <span
      className={`flex h-[19px] w-[19px] shrink-0 items-center justify-center rounded-full border bg-white ${checked ? "border-[#64d96e]" : "border-[#cbd3dc]"
        }`}
    >
      <span
        className={`h-2.5 w-2.5 rounded-full bg-[#64d96e] ${checked ? "opacity-100" : "opacity-0"
          }`}
      />
    </span>
    <span className="text-[12px] font-normal text-[#35445a]">{label}</span>
  </label>
);

const RadioPanel: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = "" }) => (
  <div className={`border border-[#e0e5ea] bg-white px-3.5 py-3 ${className}`}>
    <div className="flex flex-col gap-3">{children}</div>
  </div>
);

type RptItemListPageProps = {
  onClose?: () => void;
};

const RptItemListPage: React.FC<RptItemListPageProps> = ({ onClose }) => {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [groupsById, setGroupsById] = useState<Group[]>([]);
  const [groupsByName, setGroupsByName] = useState<Group[]>([]);
  const [itemsById, setItemsById] = useState<Item[]>([]);
  const [itemsByName, setItemsByName] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [printing, setPrinting] = useState(false);

  // rdgReportFile (inside the Print Preview): what Download saves
  const [reportFile, setReportFile] = useState("Excel"); // "Excel" | "PDF"

  // print preview: shown after Print. Print there sends it to the printer,
  // Download saves the "Report File" choice
  const [preview, setPreview] = useState<{
    report: PrintReport;
    fileBase: string;
    request: ItemListRequest;
  } | null>(null);

  const [branchMode, setBranchMode] = useState("One Branch"); // rdgBranch
  const [branch, setBranch] = useState<ItemOption | null>(null); // lkpBranch

  const [statusMode, setStatusMode] = useState("Active"); // rdgItemStatus

  // VB Activated: All Category, All Item
  const [groupMode, setGroupMode] = useState("All Item Group"); // rdgCategory
  const [groupId, setGroupId] = useState<string | null>(null); // lkpItemGroupID / Name
  const [salesBelowCost, setSalesBelowCost] = useState(false); // chkSalesBelowCost

  const [itemMode, setItemMode] = useState("All Item"); // rdgItem
  const [itemId, setItemId] = useState<string | null>(null); // lkpItemID / Name
  const [groupRowWidth, setGroupRowWidth] = useState<number | undefined>();
  const [itemRowWidth, setItemRowWidth] = useState<number | undefined>();
  const [fromItem, setFromItem] = useState<ItemOption | null>(null); // lkpItemIDFrom
  const [toItem, setToItem] = useState<ItemOption | null>(null); // lkpItemIDTo

  // Enter on a lookup:
  //  - list closed -> go to the next field
  //  - list open   -> Enter picks the highlighted row, then go to the next field
  const pendingAdvance = useRef<NavKey | null>(null);

  const handleAdvanceOnEnter = (
    event: React.KeyboardEvent<HTMLDivElement>,
    key: NavKey,
  ) => {
    if (event.key !== "Enter") return;

    const open =
      (event.target as HTMLElement).getAttribute("aria-expanded") === "true";

    if (!open) {
      event.preventDefault();
      focusNext(key);
      return;
    }

    pendingAdvance.current = key;
    setTimeout(() => {
      pendingAdvance.current = null; // nothing was picked (e.g. "No options")
    }, 0);
  };

  const measureLookupRow = (id: string, setWidth: (width: number) => void) => {
    const row = document.getElementById(id);
    if (row) setWidth(row.getBoundingClientRect().width);
  };

  const advanceAfterPick = () => {
    const key = pendingAdvance.current;
    if (!key) return; // picked with the mouse: stay
    pendingAdvance.current = null;
    setTimeout(() => focusNext(key), 0);
  };

  // ------------------------------------------------------------
  // OPTIONS FROM THE SERVER
  // ------------------------------------------------------------
  const collator = useMemo(
    () => new Intl.Collator(undefined, { numeric: true, sensitivity: "base" }),
    [],
  );

  const uniqueBy = <T,>(list: T[], key: (t: T) => string): T[] => {
    const seen = new Set<string>();
    return list.filter((x) => {
      const k = key(x);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  };

  const branchOptions: ItemOption[] = useMemo(
    () =>
      branches.map((b) => ({
        value: b.brId,
        label: b.brName,
        id: b.brId,
        name: b.brName,
      })),
    [branches],
  );

  // lkpItemGroupID: by id / lkpItemGroupName: by name
  const groupIdOptions: ItemOption[] = useMemo(
    () =>
      uniqueBy(groupsById, (g) => g.groupId)
        .sort((a, b) => collator.compare(a.groupId, b.groupId))
        .map((g) => ({
          value: g.groupId,
          label: g.groupId,
          id: g.groupId,
          name: g.groupName,
        })),
    [groupsById, collator],
  );

  const groupNameOptions: ItemOption[] = useMemo(
    () =>
      uniqueBy(groupsByName, (g) => g.groupId)
        .sort(
          (a, b) =>
            collator.compare(a.groupName, b.groupName) ||
            collator.compare(a.groupId, b.groupId),
        )
        .map((g) => ({
          value: g.groupId,
          label: g.groupName,
          id: g.groupId,
          name: g.groupName,
        })),
    [groupsByName, collator],
  );

  // the item lookups only list the items of the selected Item Group
  const groupFilter = groupMode === "One Item Group" && groupId ? groupId : null;

  const scopedItemsById = useMemo(
    () =>
      groupFilter ? itemsById.filter((i) => i.groupId === groupFilter) : itemsById,
    [itemsById, groupFilter],
  );
  const scopedItemsByName = useMemo(
    () =>
      groupFilter
        ? itemsByName.filter((i) => i.groupId === groupFilter)
        : itemsByName,
    [itemsByName, groupFilter],
  );

  // lkpItemID: by id / lkpItemName: by name (each item once)
  const itemIdOptions: ItemOption[] = useMemo(
    () =>
      uniqueBy(scopedItemsById, (i) => i.itemId)
        .sort((a, b) => collator.compare(a.itemId, b.itemId))
        .map((i) => ({
          value: i.itemId,
          label: i.itemId,
          id: i.itemId,
          name: i.itemName,
        })),
    [scopedItemsById, collator],
  );

  const itemNameOptions: ItemOption[] = useMemo(
    () =>
      uniqueBy(scopedItemsByName, (i) => i.itemId)
        .sort(
          (a, b) =>
            collator.compare(a.itemName, b.itemName) ||
            collator.compare(a.itemId, b.itemId),
        )
        .map((i) => ({
          value: i.itemId,
          label: i.itemName,
          id: i.itemId,
          name: i.itemName,
        })),
    [scopedItemsByName, collator],
  );

  const handleGroupChange = (nextGroupId: string | null) => {
    setGroupId(nextGroupId);

    if (groupMode !== "One Item Group" || !nextGroupId) return;

    const nextGroupItems = itemsById.filter(
      (item) => item.groupId === nextGroupId,
    );
    const hasItem = (id: string | null | undefined) =>
      !id || nextGroupItems.some((item) => item.itemId === id);

    setItemId((id) => (hasItem(id) ? id : null));
    setFromItem((item) => (hasItem(item?.value) ? item : null));
    setToItem((item) => (hasItem(item?.value) ? item : null));
  };

  const selectedGroupId =
    groupIdOptions.find((o) => o.value === groupId) ?? null;
  const selectedGroupName =
    groupNameOptions.find((o) => o.value === groupId) ?? null;
  const selectedItemId = itemIdOptions.find((o) => o.value === itemId) ?? null;
  const selectedItemName =
    itemNameOptions.find((o) => o.value === itemId) ?? null;

  // VB ConfigurerdgBranchUserID: a user who has one branch only works with it
  // (assumed rule - the old helper is not in the files)
  const canUseAllBranches = branches.length > 1;

  // ------------------------------------------------------------
  // LOAD THE LOOKUPS (VB FillCombos)
  // ------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await apiFetch(`${API}/lookups`);
        const data = await res.json();

        if (!res.ok || !data.success) {
          toast.error(data.message || "Failed to load the lookups");
          return;
        }
        if (cancelled) return;

        const list = data.branches as Branch[];
        setBranches(list);
        setGroupsById(data.groupsById as Group[]);
        setGroupsByName(data.groupsByName as Group[]);
        setItemsById(data.itemsById as Item[]);
        setItemsByName(data.itemsByName as Item[]);
        // the first branch is the default
        setBranch(
          list[0]
            ? {
              value: list[0].brId,
              label: list[0].brName,
              id: list[0].brId,
              name: list[0].brName,
            }
            : null,
        );
      } catch {
        if (!cancelled) toast.error("Failed to load the lookups");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // ------------------------------------------------------------
  // VB ValidateMe: returns the request, or null after showing the message
  // ------------------------------------------------------------
  const buildRequest = (): ItemListRequest | null => {
    const oneBranch = branchMode === "One Branch";
    const oneGroup = groupMode === "One Item Group";

    if (oneBranch && !branch) {
      toast.warning("Please select 'Branch'", { toastId: "il-branch" });
      document.getElementById("lkpBranch")?.focus();
      return null;
    }
    if (oneGroup && !groupId) {
      toast.warning("Please select 'Item Group'", { toastId: "il-group" });
      document.getElementById("lkpItemGroupID")?.focus();
      return null;
    }
    if (itemMode === "One Item" && !itemId) {
      toast.warning("Please select 'Item ID'", { toastId: "il-item" });
      document.getElementById("lkpItemID")?.focus();
      return null;
    }
    if (itemMode === "Range Item") {
      if (!fromItem) {
        toast.warning("Please select 'Item ID From'", { toastId: "il-from" });
        document.getElementById("lkpFromItem")?.focus();
        return null;
      }
      if (!toItem) {
        toast.warning("Please select 'Item ID To'", { toastId: "il-to" });
        document.getElementById("lkpToItem")?.focus();
        return null;
      }
    }

    return {
      allBranches: !oneBranch,
      branchId: oneBranch ? (branch?.value ?? "") : "",
      allGroups: !oneGroup,
      groupId: oneGroup ? (groupId ?? "") : "",
      itemMode: { "One Item": 0, "Range Item": 1, "All Item": 2 }[itemMode] ?? 2,
      itemId: itemMode === "One Item" ? (itemId ?? "") : "",
      fromItemId: itemMode === "Range Item" ? (fromItem?.value ?? "") : "",
      toItemId: itemMode === "Range Item" ? (toItem?.value ?? "") : "",
      status: { Active: 0, Inactive: 1, Hide: 2 }[statusMode] ?? 0,
      salesBelowCost,
    };
  };

  // gets the .xlsx made by the server (null after an error message)
  const fetchExcel = async (request: ItemListRequest): Promise<Blob | null> => {
    const res = await apiFetch(`${API}/excel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });

    // an error comes back as JSON, the file as a blob
    if (!res.ok) {
      let message = "Could not create the Excel file";
      try {
        const data = await res.json();
        message = data.message || message;
      } catch {
        // not JSON: the server has no /excel route (404) or crashed (500)
        message =
          res.status === 404
            ? "Excel is not available: the /excel route was not found (404)"
            : `Could not create the Excel file (error ${res.status})`;
      }
      toast.error(message);
      return null;
    }

    return res.blob();
  };

  // ------------------------------------------------------------
  // PRINT (VB cmdPrint_Click): validates, gets the report and shows the
  // Print Preview (Print = printer, Download = Excel / PDF file)
  // ------------------------------------------------------------
  const handlePrint = async () => {
    if (printing || preview) return;

    const request = buildRequest();
    if (!request) return;

    setPrinting(true);
    try {
      const res = await apiFetch(`${API}/print`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        toast.error(data.message || "Could not prepare the report");
        return;
      }

      setPreview({ report: data.report, fileBase: data.fileBase, request });
    } catch {
      toast.error("Could not prepare the report");
    } finally {
      setPrinting(false);
    }
  };

  // Print in the preview: the browser print dialog (printer)
  const handlePreviewPrint = () => {
    if (!preview || printing) return;
    try {
      printItemListReport(preview.report);
    } catch {
      toast.error("Could not open the print view");
    }
  };

  // Download in the preview: saves the chosen file ("Save as" window, so the
  // browser does not open it afterwards)
  // a double click must not start two saves (state is not updated yet on the
  // second click, so a ref is used)
  const downloading = useRef(false);

  const handlePreviewOk = async () => {
    if (!preview || printing || downloading.current) return;
    downloading.current = true;
    const { report, fileBase, request } = preview;
    const asPdf = reportFile === "PDF";

    setPrinting(true);
    try {
      const blob = asPdf ? buildItemListPdf(report) : await fetchExcel(request);
      if (!blob) return; // the error is already shown

      const kind = asPdf ? "pdf" : "xlsx";
      const saved = await saveFile(blob, `${fileBase}.${kind}`, kind);
      if (saved) {
       
        toast.success(asPdf ? "PDF file downloaded" : "Excel file downloaded");
         setPreview(null); // cancelled "Save as": the preview stays
      }
    } catch {
      toast.error(
        asPdf ? "Could not create the PDF file" : "Could not create the Excel file",
      );
    } finally {
      downloading.current = false;
      setPrinting(false);
    }
  };

  const previewHtml = useMemo(
    () =>
      preview
        ? // 40px left / 20px right margin for the preview only
        buildHtml(preview.report).replace(
          "</head>",
          "<style>body{padding-left:40px;padding-right:20px}</style></head>",
        )
        : "",
    [preview],
  );

  const handleClose = () => {
    setBranchMode("One Branch");
    setBranch(branchOptions[0] ?? null);
    setStatusMode("Active");
    setGroupMode("All Item Group");
    setGroupId(null);
    setSalesBelowCost(false);
    setItemMode("All Item");
    setItemId(null);
    setFromItem(null);
    setToItem(null);
    setReportFile("Excel");
    setPreview(null);
    if (onClose) onClose();
    else window.history.back();
  };

  // Alt+P prints, Alt+C closes (Ctrl+P / Ctrl+L of the old form clash with the
  // browser). Re-attached every render so it always sees the latest state.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (preview) {
        if (event.key === "Escape") setPreview(null);
        return;
      }
      if (!event.altKey || event.ctrlKey || event.metaKey) return;

      if (event.code === "KeyP") {
        event.preventDefault();
        handlePrint();
      } else if (event.code === "KeyC") {
        event.preventDefault();
        handleClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  // VB rdgItem_SelectedIndexChanged: clear the item boxes, focus the first
  const chooseItemMode = (mode: string, focusId?: string) => {
    setItemMode(mode);
    setItemId(null);
    setFromItem(null);
    setToItem(null);
    if (focusId) focusSoon(focusId);
  };

  const groupDisabled = groupMode !== "One Item Group";

  return (
    <div className="flex min-h-full w-full items-start justify-center bg-white px-4 py-4">
      <div className="min-h-fit w-225 max-w-full bg-white p-0">
        <main className="w-full overflow-hidden border border-gray-400 bg-white">
          <header className="flex h-7.5 items-center justify-start bg-[#9fdfbc]">
            <h1 className="m-0 ml-3.5 text-[17px] font-semibold text-[#24364d]">
              Item List
            </h1>
          </header>

          <section className="px-3.5 pb-6 pt-3">
            <div className="grid grid-cols-[168px_1fr_170px] items-start gap-x-4 gap-y-3 max-[760px]:grid-cols-[168px_1fr]">
              {/* Branch */}
              <RadioPanel>
                <CustomRadio
                  name="rdgBranch"
                  value="One Branch"
                  label="One Branch"
                  checked={branchMode === "One Branch"}
                  onChange={() => {
                    setBranchMode("One Branch");
                    focusSoon("lkpBranch");
                  }}
                />
                <CustomRadio
                  name="rdgBranch"
                  value="All Branch"
                  label="All Branch"
                  checked={branchMode === "All Branch"}
                  disabled={!canUseAllBranches}
                  onChange={() => setBranchMode("All Branch")}
                />
              </RadioPanel>
              <div className="pt-3">
                <div className="w-[250px]">
                  {branchMode === "One Branch" && (
                    <Select
                      inputId="lkpBranch"
                      instanceId="lkpBranch"
                      options={branchOptions}
                      value={branch}
                      onChange={(option) => {
                        setBranch(option);
                        advanceAfterPick();
                      }}
                      onKeyDown={(event) => handleAdvanceOnEnter(event, "lkpBranch")}
                      isDisabled={loading}
                      {...selectProps}
                      classNames={branchClassNames}
                      components={branchComponents}
                    />
                  )}
                </div>
              </div>

              {/* Status (top right) */}
              <RadioPanel className="max-[760px]:col-span-2">
                <CustomRadio
                  name="rdgItemStatus"
                  value="Active"
                  label="Active"
                  checked={statusMode === "Active"}
                  onChange={() => setStatusMode("Active")}
                />
                <CustomRadio
                  name="rdgItemStatus"
                  value="Inactive"
                  label="Inactive"
                  checked={statusMode === "Inactive"}
                  onChange={() => setStatusMode("Inactive")}
                />
                <CustomRadio
                  name="rdgItemStatus"
                  value="Hide"
                  label="Hide"
                  checked={statusMode === "Hide"}
                  onChange={() => setStatusMode("Hide")}
                />
              </RadioPanel>

              {/* Item group */}
              <RadioPanel>
                <CustomRadio
                  name="rdgCategory"
                  value="One Item Group"
                  label="One Item Group"
                  checked={groupMode === "One Item Group"}
                  onChange={() => {
                    setGroupMode("One Item Group");
                    focusSoon("lkpItemGroupID");
                  }}
                />
                <CustomRadio
                  name="rdgCategory"
                  value="All Item Group"
                  label="All Item Group"
                  checked={groupMode === "All Item Group"}
                  onChange={() => {
                    setGroupMode("All Item Group");
                    setGroupId(null);
                  }}
                />
              </RadioPanel>
              {/* hidden while All Item Group is selected (empty cell keeps the grid) */}
              {groupMode === "One Item Group" ? (
                <div className="pt-3">
                  <div
                    id="itemGroupLookupRow"
                    className="grid grid-cols-[135px_1fr] gap-2"
                  >
                    <Select
                      inputId="lkpItemGroupID"
                      instanceId="lkpItemGroupID"
                      options={groupIdOptions}
                      value={selectedGroupId}
                      onChange={(option) => {
                        handleGroupChange(option?.value ?? null);
                        advanceAfterPick();
                      }}
                      onKeyDown={(event) =>
                        handleAdvanceOnEnter(event, "lkpItemGroupID")
                      }
                      isDisabled={groupDisabled || loading}
                      {...selectProps}
                      classNames={idClassNames}
                      styles={{
                        menu: (base) => ({
                          ...base,
                          width: groupRowWidth ?? 480,
                        }),
                      }}
                      onMenuOpen={() =>
                        measureLookupRow("itemGroupLookupRow", setGroupRowWidth)
                      }
                      components={groupIdComponents}
                      filterOption={filterItem}
                      isSearchable
                    />
                    <Select
                      inputId="lkpItemGroupName"
                      instanceId="lkpItemGroupName"
                      options={groupNameOptions}
                      value={selectedGroupName}
                      onChange={(option) => {
                        handleGroupChange(option?.value ?? null);
                        advanceAfterPick();
                      }}
                      onKeyDown={(event) =>
                        handleAdvanceOnEnter(event, "lkpItemGroupName")
                      }
                      isDisabled={groupDisabled || loading}
                      {...selectProps}
                      classNames={nameClassNames}
                      components={groupNameComponents}
                      filterOption={filterItem}
                      isSearchable
                    />
                  </div>
                </div>
              ) : (
                <div />
              )}
              <div className="pt-3 max-[760px]:col-span-2 max-[760px]:pt-0">
                <label
                  htmlFor="chkSalesBelowCost"
                  className="flex h-[30px] cursor-pointer items-center gap-2 border border-[#e0e5ea] bg-white px-2 text-[12px] text-[#405066] select-none"
                >
                  <input
                    id="chkSalesBelowCost"
                    type="checkbox"
                    checked={salesBelowCost}
                    onChange={(event) => setSalesBelowCost(event.target.checked)}
                    className="h-4 w-4 accent-[#64d96e]"
                  />
                  Sales Below Cost
                </label>
              </div>

              {/* Item */}
              <RadioPanel>
                <CustomRadio
                  name="rdgItem"
                  value="One Item"
                  label="One Item"
                  checked={itemMode === "One Item"}
                  onChange={() => chooseItemMode("One Item", "lkpItemID")}
                />
                <CustomRadio
                  name="rdgItem"
                  value="Range Item"
                  label="Range Item"
                  checked={itemMode === "Range Item"}
                  onChange={() => chooseItemMode("Range Item", "lkpFromItem")}
                />
                <CustomRadio
                  name="rdgItem"
                  value="All Item"
                  label="All Item"
                  checked={itemMode === "All Item"}
                  onChange={() => chooseItemMode("All Item")}
                />
              </RadioPanel>
              <div className="pt-3">
                {itemMode === "One Item" && (
                  <div
                    id="itemLookupRow"
                    className="grid grid-cols-[135px_1fr] gap-2"
                  >
                    <Select
                      inputId="lkpItemID"
                      instanceId="lkpItemID"
                      options={itemIdOptions}
                      value={selectedItemId}
                      onChange={(option) => {
                        setItemId(option?.value ?? null);
                        advanceAfterPick();
                      }}
                      onKeyDown={(event) =>
                        handleAdvanceOnEnter(event, "lkpItemID")
                      }
                      isDisabled={loading}
                      {...selectProps}
                      classNames={idClassNames}
                      styles={{
                        menu: (base) => ({
                          ...base,
                          width: itemRowWidth ?? 480,
                        }),
                      }}
                      onMenuOpen={() =>
                        measureLookupRow("itemLookupRow", setItemRowWidth)
                      }
                      components={idComponents}
                      filterOption={filterItem}
                      isSearchable
                    />
                    <Select
                      inputId="lkpItemName"
                      instanceId="lkpItemName"
                      options={itemNameOptions}
                      value={selectedItemName}
                      onChange={(option) => {
                        setItemId(option?.value ?? null);
                        advanceAfterPick();
                      }}
                      onKeyDown={(event) =>
                        handleAdvanceOnEnter(event, "lkpItemName")
                      }
                      isDisabled={loading}
                      {...selectProps}
                      classNames={nameClassNames}
                      components={nameComponents}
                      filterOption={filterItem}
                      isSearchable
                    />
                  </div>
                )}
                {itemMode === "Range Item" && (
                  <div className="flex items-center gap-2">
                    <div className="w-[135px]">
                      <Select
                        inputId="lkpFromItem"
                        instanceId="lkpFromItem"
                        options={itemIdOptions}
                        value={fromItem}
                        onChange={(option) => {
                          setFromItem(option);
                          advanceAfterPick();
                        }}
                        onKeyDown={(event) =>
                          handleAdvanceOnEnter(event, "lkpFromItem")
                        }
                        isDisabled={loading}
                        {...selectProps}
                        classNames={idClassNames}
                        styles={{ menu: (base) => ({ ...base, width: 480 }) }}
                        components={rangeComponents}
                        filterOption={filterItem}
                        isSearchable
                      />
                    </div>
                    <span className="text-[12px] text-[#405066]">to</span>
                    <div className="w-[135px]">
                      <Select
                        inputId="lkpToItem"
                        instanceId="lkpToItem"
                        options={itemIdOptions}
                        value={toItem}
                        onChange={(option) => {
                          setToItem(option);
                          advanceAfterPick();
                        }}
                        onKeyDown={(event) =>
                          handleAdvanceOnEnter(event, "lkpToItem")
                        }
                        isDisabled={loading}
                        {...selectProps}
                        classNames={idClassNames}
                        styles={{ menu: (base) => ({ ...base, width: 480 }) }}
                        components={rangeComponents}
                        filterOption={filterItem}
                        isSearchable
                      />
                    </div>
                  </div>
                )}
              </div>
              <div className="max-[760px]:hidden" />

              {/* Actions */}
              <div />
              <div className="flex gap-3">
                <button
                  id="btnPrint"
                  type="button"
                  onClick={handlePrint}
                  disabled={loading || printing}
                  title="Alt+P"
                  className="btn-style focus-visible:ring-2 focus-visible:ring-[#64d96e] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <u>P</u>rint
                </button>
                <button
                  id="btnClose"
                  type="button"
                  onClick={handleClose}
                  title="Alt+C"
                  className="btn-style focus-visible:ring-2 focus-visible:ring-[#64d96e]"
                >
                  <u>C</u>lose
                </button>
              </div>
            </div>
          </section>
        </main>
      </div>

      {/* Print preview */}
      {preview && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/40 p-4">
          <div className="flex h-[90vh] w-full max-w-300 flex-col overflow-hidden border border-gray-400 bg-white shadow-xl">
            <header className="flex h-7.5 shrink-0 items-center bg-[#9fdfbc] pl-3 text-[17px] font-semibold text-slate-700">
              Print Preview
            </header>

            <iframe
              title="Print Preview"
              srcDoc={previewHtml}
              className="min-h-0 flex-1 border-0 bg-white"
            />

            <footer className="flex shrink-0 flex-wrap items-center justify-center gap-4 border-t border-[#e0e5ea] px-3 py-4">
              <div className="flex gap-3">
                <button
                  id="btnPreviewPrint"
                  type="button"
                  onClick={handlePreviewPrint}
                  disabled={printing}
                  className="btn-style focus-visible:ring-2 focus-visible:ring-[#64d96e] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <u>P</u>rint
                </button>
                <button
                  id="btnPreviewOk"
                  type="button"
                  autoFocus
                  onClick={handlePreviewOk}
                  disabled={printing}
                  className="btn-style focus-visible:ring-2 focus-visible:ring-[#64d96e] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <u>D</u>ownload
                </button>
                <button
                  id="btnPreviewCancel"
                  type="button"
                  onClick={() => setPreview(null)}
                  disabled={printing}
                  className="btn-style focus-visible:ring-2 focus-visible:ring-[#64d96e] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <u>C</u>lose
                </button>
              </div>

              {/* Report File: what Download saves */}
              <div
                id="rdgReportFile"
                className="relative flex items-center gap-5 border border-[#e0e5ea] bg-white px-10.5 py-2.5"
              >
                <span className="absolute -top-2.5 left-2.5 bg-white px-1 text-[13px] text-[#405066]">
                 File Format
                </span>
                <CustomRadio
                  name="rdgReportFile"
                  value="Excel"
                  label="Excel"
                  checked={reportFile === "Excel"}
                  onChange={() => setReportFile("Excel")}
                />
                <CustomRadio
                  name="rdgReportFile"
                  value="PDF"
                  label="PDF"
                  checked={reportFile === "PDF"}
                  onChange={() => setReportFile("PDF")}
                />
              </div>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
};

export default RptItemListPage;
