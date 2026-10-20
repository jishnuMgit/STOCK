import React, { useEffect, useMemo, useState } from "react";
import Select, {
  components,
  createFilter,
  type MenuListProps,
  type OptionProps,
} from "react-select";
import { toast } from "react-toastify";
import { downloadSalesPriceListPdf } from "./downloadSalesPriceListPdf";
import { buildHtml, type PriceListReport } from "./PrintSalesPriceListReport";

type Option = { value: string; label: string };

type RadioOptionProps = {
  name: string;
  value: string;
  label: string;
  checked: boolean;
  onChange: () => void;
};

const API = `${import.meta.env.VITE_API_URL}/RptSalesPriceList`;

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

// ---- two-column lookup lists (header row + ID | Name rows) ----
type LookupOption = Option & { id: string; name: string };
type BranchOption = LookupOption;

const lookupClassNames = (menuWidth: string) => ({
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

const makeMenuList = (cols: string, first: string, second: string) => {
  const LookupMenuList = (props: MenuListProps<LookupOption, false>) => (
    <components.MenuList {...props}>
      <div
        className={`${cols} sticky top-0 z-[1] border-b border-[#cfd7df] bg-[#f5f6fa] text-[13px] font-semibold text-[#24364d]`}
      >
        <div className="border-r border-[#cfd7df] px-[8px] py-[7px]">
          {first}
        </div>
        <div className="px-[8px] py-[7px]">{second}</div>
      </div>
      {props.children}
    </components.MenuList>
  );
  return LookupMenuList;
};

const makeOptionRow = (cols: string, idFirst: boolean) => {
  const LookupOptionRow = (props: OptionProps<LookupOption, false>) => {
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
  return LookupOptionRow;
};

// lkpBranch: Branch (= box width) | ID hanging outside the box to the right
const BRANCH_COLS = "grid grid-cols-[1fr_55px]";
const branchClassNames = lookupClassNames("!w-[calc(100%_+_55px)]");
const branchComponents = {
  MenuList: makeMenuList(BRANCH_COLS, "Branch", "ID"),
  Option: makeOptionRow(BRANCH_COLS, false),
};

const CustomRadio: React.FC<RadioOptionProps> = ({
  name,
  value,
  label,
  checked,
  onChange,
}) => (
  <label className="flex cursor-pointer items-center gap-2.5 whitespace-nowrap select-none">
    <input
      type="radio"
      name={name}
      value={value}
      checked={checked}
      onChange={onChange}
      className="sr-only"
    />
    <span
      className={`flex h-[19px] w-[19px] shrink-0 items-center justify-center rounded-full border bg-white ${
        checked ? "border-[#64d96e]" : "border-[#cbd3dc]"
      }`}
    >
      <span
        className={`h-2.5 w-2.5 rounded-full bg-[#64d96e] ${
          checked ? "opacity-100" : "opacity-0"
        }`}
      />
    </span>
    <span className="text-[12px] font-normal text-[#35445a]">{label}</span>
  </label>
);

const RadioPanel: React.FC<{
  children: React.ReactNode;
  className?: string;
  id?: string;
}> = ({ children, className = "", id }) => (
  <div
    id={id}
    className={`relative border border-[#e0e5ea] bg-white px-3.5 py-3 ${className}`}
  >
    <div className="flex flex-col gap-3">{children}</div>
  </div>
);

const FieldLabel: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = "" }) => (
  <div
    className={`flex h-[30px] items-center   bg-[#fafbfc] px-3 text-[14px] text-[#405066] ${className}`}
  >
    {children}
  </div>
);

// ---- Item Group / Item lookups ----
type LookupItem = { id: string; name: string; groupId?: string };

// the same rules as the other selects, but typeable and clearable
const pairProps = {
  ...selectProps,
  isSearchable: true,
  isClearable: true,
};

// typing searches the ID and the name
const lookupFilter = createFilter<LookupOption>({
  ignoreCase: true,
  ignoreAccents: true,
  matchFrom: "any",
  stringify: (o) => `${o.data.id} ${o.data.name}`,
});

// ID box: its list spans both boxes (ID | Name).
// Name box: Name = box width, the ID column hangs outside to the right.
const ID_COLS = "grid grid-cols-[143px_1fr]";
const NAME_COLS = "grid grid-cols-[1fr_110px]";
const idClassNames = lookupClassNames("!w-[490px]");
const nameClassNames = lookupClassNames("!w-[calc(100%_+_110px)]");
const rangeClassNames = lookupClassNames("!w-[450px]");

const lookupKit = (idHead: string, nameHead: string) => ({
  id: {
    MenuList: makeMenuList(ID_COLS, idHead, nameHead),
    Option: makeOptionRow(ID_COLS, true),
  },
  name: {
    MenuList: makeMenuList(NAME_COLS, nameHead, idHead),
    Option: makeOptionRow(NAME_COLS, false),
  },
});
const groupKit = lookupKit("ID", "Group Name");
const itemKit = lookupKit("Item ID", "Item Name");

const toOptions = (list: LookupItem[], labelIsId: boolean): LookupOption[] =>
  list.map((i) => ({
    value: i.id,
    label: labelIsId ? i.id : i.name,
    id: i.id,
    name: i.name,
  }));

// ID box + Name box bound to one value
const LookupPair: React.FC<{
  idInputId: string;
  nameInputId: string;
  kit: typeof groupKit;
  items: LookupItem[];
  value: string | null;
  onChange: (id: string | null) => void;
  disabled?: boolean;
}> = ({ idInputId, nameInputId, kit, items, value, onChange, disabled = false }) => {
  const idOptions = useMemo(() => toOptions(items, true), [items]);
  const nameOptions = useMemo(() => toOptions(items, false), [items]);

  const idValue = idOptions.find((o) => o.value === value) ?? null;
  const nameValue = nameOptions.find((o) => o.value === value) ?? null;

  return (
    <div className="flex gap-2">
      <div className="w-[135px] shrink-0">
        <Select<LookupOption, false>
          inputId={idInputId}
          instanceId={idInputId}
          options={idOptions}
          value={idValue}
          onChange={(o) => onChange(o?.value ?? null)}
          isDisabled={disabled}
          filterOption={lookupFilter}
          {...pairProps}
          classNames={idClassNames}
          components={kit.id}
        />
      </div>
      <div className="min-w-0 flex-1">
        <Select<LookupOption, false>
          inputId={nameInputId}
          instanceId={nameInputId}
          options={nameOptions}
          value={nameValue}
          onChange={(o) => onChange(o?.value ?? null)}
          isDisabled={disabled}
          filterOption={lookupFilter}
          {...pairProps}
          classNames={nameClassNames}
          components={kit.name}
        />
      </div>
    </div>
  );
};

// ID box only (Range Item: From ID  to  To ID)
const LookupId: React.FC<{
  inputId: string;
  items: LookupItem[];
  value: string | null;
  onChange: (id: string | null) => void;
}> = ({ inputId, items, value, onChange }) => {
  const idOptions = useMemo(() => toOptions(items, true), [items]);
  const idValue = idOptions.find((o) => o.value === value) ?? null;

  return (
    <div className="w-[135px] shrink-0">
      <Select<LookupOption, false>
        inputId={inputId}
        instanceId={inputId}
        options={idOptions}
        value={idValue}
        onChange={(o) => onChange(o?.value ?? null)}
        filterOption={lookupFilter}
        {...pairProps}
        classNames={rangeClassNames}
        components={itemKit.id}
      />
    </div>
  );
};

type RptSalesPriceListPageProps = {
  onClose?: () => void;
};

type Request = {
  branchId: string;
  groupMode: "One" | "All";
  groupId: string;
  itemMode: "One" | "Range" | "All";
  itemId: string;
  itemFrom: string;
  itemTo: string;
};

const RptSalesPriceListPage: React.FC<RptSalesPriceListPageProps> = ({
  onClose,
}) => {
  const [branchOptions, setBranchOptions] = useState<BranchOption[]>([]);
  const [branch, setBranch] = useState<BranchOption | null>(null); // lkpBranch
  const [reportFile, setReportFile] = useState("Excel"); // rdgReportFile
  const [busy, setBusy] = useState(false);

  // Item Group / Item filters
  const [itemGroups, setItemGroups] = useState<LookupItem[]>([]);
  const [items, setItems] = useState<LookupItem[]>([]);
  const [groupMode, setGroupMode] = useState<"One" | "All">("All"); // rdgItemGroup
  const [groupId, setGroupId] = useState<string | null>(null);
  const [itemMode, setItemMode] = useState<"One" | "Range" | "All">("All"); // rdgItem
  const [itemId, setItemId] = useState<string | null>(null);
  const [itemFrom, setItemFrom] = useState<string | null>(null);
  const [itemTo, setItemTo] = useState<string | null>(null);

  // the Item lookups only list the items of the selected Item Group
  const itemChoices = useMemo(
    () =>
      groupMode === "One" && groupId
        ? items.filter((i) => i.groupId === groupId)
        : items,
    [items, groupMode, groupId],
  );

  const handleGroupChange = (nextGroupId: string | null) => {
    setGroupId(nextGroupId);

    const nextItemChoices =
      groupMode === "One" && nextGroupId
        ? items.filter((item) => item.groupId === nextGroupId)
        : items;
    const hasItem = (id: string | null) =>
      id === null || nextItemChoices.some((item) => item.id === id);

    setItemId((id) => (hasItem(id) ? id : null));
    setItemFrom((id) => (hasItem(id) ? id : null));
    setItemTo((id) => (hasItem(id) ? id : null));
  };

  // print preview: shown after Print, OK then downloads the chosen file
  const [preview, setPreview] = useState<{
    report: PriceListReport;
    fileBase: string;
    request: Request;
    asPdf: boolean;
  } | null>(null);

  // ------------------------------------------------------------
  // LOAD THE LOOKUPS (VB FillCombos); the first branch is selected
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

        const options: BranchOption[] = (
          data.branches as { brId: string; brName: string }[]
        ).map((b) => ({
          value: b.brId,
          label: b.brName,
          id: b.brId,
          name: b.brName,
        }));

        setBranchOptions(options);
        setBranch(options[0] ?? null);

        setItemGroups(
          (data.itemGroups as { groupId: string; groupName: string }[]).map(
            (g) => ({ id: g.groupId, name: g.groupName }),
          ),
        );
        setItems(
          (
            data.items as {
              itemId: string;
              itemName: string;
              itemGroupId: string;
            }[]
          ).map((i) => ({
            id: i.itemId,
            name: i.itemName,
            groupId: i.itemGroupId,
          })),
        );
      } catch {
        if (!cancelled) toast.error("Failed to load the lookups");
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // downloads the .xlsx made by the server
  const downloadExcel = async (request: Request) => {
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
        /* keep the default message */
      }
      toast.error(message);
      return false;
    }

    const disposition = res.headers.get("Content-Disposition") ?? "";
    const name =
      /filename="?([^";]+)"?/i.exec(disposition)?.[1] ?? "PriceList.xlsx";

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
  };

  // VB ValidateMe: returns the request, or null after showing the message
  const buildRequest = (): Request | null => {
    const warn = (message: string, focusId: string) => {
      toast.warning(message, { toastId: "pl-validate" });
      document.getElementById(focusId)?.focus();
      return null;
    };

    if (!branch) return warn("Please select 'Branch'", "lkpBranch");

    if (groupMode === "One" && !groupId) {
      return warn("Please select 'Item Group'", "lkpItemGroupID");
    }

    if (itemMode === "One" && !itemId) {
      return warn("Please select 'Item'", "lkpItemID");
    }
    if (itemMode === "Range") {
      if (!itemFrom) return warn("Please select 'From Item'", "lkpItemFromID");
      if (!itemTo) return warn("Please select 'To Item'", "lkpItemToID");
      if (itemFrom > itemTo) {
        return warn(
          "'To Item' should be greater than 'From Item'",
          "lkpItemToID",
        );
      }
    }

    return {
      branchId: branch.value,
      groupMode,
      groupId: groupMode === "One" ? (groupId ?? "") : "",
      itemMode,
      itemId: itemMode === "One" ? (itemId ?? "") : "",
      itemFrom: itemMode === "Range" ? (itemFrom ?? "") : "",
      itemTo: itemMode === "Range" ? (itemTo ?? "") : "",
    };
  };

  // ------------------------------------------------------------
  // PRINT (VB cmdPrint_Click): validates, gets the report and shows the
  // preview. OK in the preview downloads the "Report File" choice.
  // ------------------------------------------------------------
  const handlePrint = async () => {
    if (busy || preview) return;

    const request = buildRequest();
    if (!request) return;

    setBusy(true);
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

      setPreview({
        report: data.report,
        fileBase: data.fileBase,
        request,
        asPdf: reportFile === "PDF",
      });
    } catch {
      toast.error("Could not prepare the report");
    } finally {
      setBusy(false);
    }
  };

  // OK in the preview
  const handlePreviewOk = async () => {
    if (!preview || busy) return;
    const { report, fileBase, request, asPdf } = preview;

    setBusy(true);
    try {
      if (asPdf) {
        downloadSalesPriceListPdf(report, `${fileBase}.pdf`);
        setPreview(null);
      } else if (await downloadExcel(request)) {
        setPreview(null);
      }
    } catch {
      toast.error(
        asPdf ? "Could not create the PDF file" : "Could not create the Excel file",
      );
    } finally {
      setBusy(false);
    }
  };

  const previewHtml = useMemo(
    () =>
      preview
        ? // 10px left / right margin for the preview only
          buildHtml(preview.report).replace(
            "</head>",
            "<style>body{padding-left:10px;padding-right:10px}</style></head>",
          )
        : "",
    [preview],
  );

  const handleClose = () => {
    setBranch(branchOptions[0] ?? null);
    setReportFile("Excel");
    setGroupMode("All");
    setGroupId(null);
    setItemMode("All");
    setItemId(null);
    setItemFrom(null);
    setItemTo(null);
    setPreview(null);
    onClose?.();
  };

  // Alt+P prints, Alt+C closes (Ctrl+P / Ctrl+L of the old form clash with the
  // browser); Esc closes the preview. Re-attached every render so it always
  // sees the latest state.
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

  return (
    <div className="flex min-h-full w-full items-start justify-center bg-white px-4 py-4">
      <div className="min-h-fit w-175 max-w-full bg-white p-0">
        <main className="w-full overflow-hidden border border-gray-400 bg-white">
          <header className="flex h-7.5 items-center justify-start bg-[#9fdfbc]">
            <h1 className="m-0 ml-3.5 text-[17px] font-semibold text-[#24364d]">
              Sales Price List
            </h1>
          </header>

          <section className="px-3.5 pb-6 pt-3">
            {/* Branch + Report File */}
            <div className="flex items-start justify-between gap-4 max-[560px]:flex-col">
              <div className="flex items-center gap-3 pt-3">
                <FieldLabel className="w-fit">Branch :</FieldLabel>
                <div className="w-[220px] ">
                  <Select
                    inputId="lkpBranch"
                    instanceId="lkpBranch"
                    options={branchOptions}
                    value={branch}
                    onChange={setBranch}
                    {...selectProps}
                    classNames={branchClassNames}
                    components={branchComponents}
                  />
                </div>
              </div>

              {/* Report File: what the Print button produces */}
              <RadioPanel id="rdgReportFile" className="mt-2 h-21 w-[190px] shrink-0">
                <span className="absolute -top-2.5 left-2.5 bg-white px-1 text-[13px] text-[#405066]">
                  Report File
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
              </RadioPanel>
            </div>

            {/* Item Group / Item filters */}
            <div className="mt-4 flex gap-3 max-[560px]:flex-col">
              <div className="flex w-[168px] shrink-0 flex-col gap-3">
                <RadioPanel id="rdgItemGroup" className="h-[76px]">
                  <CustomRadio
                    name="rdgItemGroup"
                    value="One"
                    label="One Item Group"
                    checked={groupMode === "One"}
                    onChange={() => setGroupMode("One")}
                  />
                  <CustomRadio
                    name="rdgItemGroup"
                    value="All"
                    label="All Item Group"
                    checked={groupMode === "All"}
                    onChange={() => {
                      setGroupMode("All");
                      setGroupId(null);
                    }}
                  />
                </RadioPanel>

                <RadioPanel id="rdgItem" className="h-[108px]">
                  <CustomRadio
                    name="rdgItem"
                    value="One"
                    label="One Item"
                    checked={itemMode === "One"}
                    onChange={() => setItemMode("One")}
                  />
                  <CustomRadio
                    name="rdgItem"
                    value="Range"
                    label="Range Item"
                    checked={itemMode === "Range"}
                    onChange={() => setItemMode("Range")}
                  />
                  <CustomRadio
                    name="rdgItem"
                    value="All"
                    label="All Item"
                    checked={itemMode === "All"}
                    onChange={() => {
                      setItemMode("All");
                      setItemId(null);
                      setItemFrom(null);
                      setItemTo(null);
                    }}
                  />
                </RadioPanel>
              </div>

              <div className="flex min-w-0 flex-1 flex-col gap-3">
                {/* Item Group: ID | Name (same height as its radio panel) */}
                <div className="h-[76px] pt-3">
                  <LookupPair
                    idInputId="lkpItemGroupID"
                    nameInputId="lkpItemGroupName"
                    kit={groupKit}
                    items={itemGroups}
                    value={groupId}
                    onChange={handleGroupChange}
                    disabled={groupMode !== "One"}
                  />
                </div>

                {/* Item: One Item = ID + Name, Range Item = ID to ID,
                    All Item = nothing */}
                <div className="min-h-[108px] pt-3">
                  {itemMode === "One" && (
                    <LookupPair
                      idInputId="lkpItemID"
                      nameInputId="lkpItemName"
                      kit={itemKit}
                      items={itemChoices}
                      value={itemId}
                      onChange={setItemId}
                    />
                  )}
                  {itemMode === "Range" && (
                    <div className="flex items-center gap-2">
                      <LookupId
                        inputId="lkpItemFromID"
                        items={itemChoices}
                        value={itemFrom}
                        onChange={setItemFrom}
                      />
                      <span className="text-[12px] text-[#405066]">to</span>
                      <LookupId
                        inputId="lkpItemToID"
                        items={itemChoices}
                        value={itemTo}
                        onChange={setItemTo}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* actions */}
            <div className="mt-4 flex gap-3 pl-[180px] max-[560px]:pl-0">
              <button
                id="btnPrint"
                type="button"
                onClick={handlePrint}
                disabled={busy}
                title="Alt+P"
                className="btn-style disabled:cursor-not-allowed disabled:opacity-40"
              >
                <u>P</u>rint
              </button>
              <button
                id="btnClose"
                type="button"
                onClick={handleClose}
                title="Alt+C"
                className="btn-style"
              >
                <u>C</u>lose
              </button>
            </div>
          </section>
        </main>
      </div>

      {/* Print preview */}
      {preview && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/40 p-4">
          <div className="flex h-[90vh] w-full max-w-250 flex-col overflow-hidden border border-gray-400 bg-white shadow-xl">
            <header className="flex h-7.5 shrink-0 items-center bg-[#9fdfbc] pl-3 text-[17px] font-semibold text-slate-700">
              Print Preview
            </header>

            <iframe
              title="Print Preview"
              srcDoc={previewHtml}
              className="min-h-0 flex-1 border-0 bg-white"
            />

            <footer className="flex shrink-0 items-center justify-center gap-3 border-t border-[#e0e5ea] py-3">
              <button
                id="btnPreviewOk"
                type="button"
                autoFocus
                onClick={handlePreviewOk}
                disabled={busy}
                className="btn-style focus-visible:ring-2 focus-visible:ring-[#64d96e] disabled:cursor-not-allowed disabled:opacity-40"
              >
                OK
              </button>
              <button
                id="btnPreviewCancel"
                type="button"
                onClick={() => setPreview(null)}
                disabled={busy}
                className="btn-style focus-visible:ring-2 focus-visible:ring-[#64d96e] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Cancel
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
};

export default RptSalesPriceListPage;
