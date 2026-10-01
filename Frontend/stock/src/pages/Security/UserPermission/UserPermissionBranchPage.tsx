
import { ChevronDown, ChevronRight } from "lucide-react";
import React, { useState } from "react";
import Select, {
  components,
  type SingleValue,
  type StylesConfig,
  type MenuListProps,
  type OptionProps,
} from "react-select";
// ============================================================
// TYPES
// ============================================================

interface SelectOption {
  value: string;
  label: string;
}

interface PermissionNode {
  id: string;
  name: string;
  checked: boolean;
  children?: PermissionNode[];
}

// ============================================================
// USER OPTIONS
// ============================================================
const buttonClass = `
  min-w-[110px]
  h-[40px]
  rounded-[4px]
  border
  border-[#9db8d4]
 
  bg-gradient-to-b
  from-[#ffffff]
  to-[#e7eef5]
  px-4
  text-[18px]
  shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]
  transition-colors
  duration-100
  text-transparent
  bg-clip-text
  bg-gradient-to-r
  from-green-800
  to-green-500
  hover:border-[#7f9fbd]
 
  hover:bg-gradient-to-b
  
  focus:border-[#20884e]
  
 

 
  focus:outline-none
  focus:ring-0
  hover:text-green-800
`;
const userOptions: SelectOption[] = [
  { value: "ABDULAZIZ", label: "ABDULAZIZ" },
  { value: "ADMIN", label: "ADMIN" },
  { value: "USER01", label: "USER01" },
];

// ============================================================
// NESTED PERMISSION DATA
// ============================================================

const initialPermissionData: PermissionNode[] = [
  {
    id: "company",
    name: "Green Spectra",
    checked: false,
    children: [
      {
        id: "warehouse",
        name: "Warehouse Riyadh",
        checked: false,
      },
      {
        id: "office",
        name: "Office",
        checked: true,
      },
      {
        id: "report",
        name: "Report",
        checked: false,
      },
    ],
  },
  {
    id: "company1",
    name: "Travel Max",
    checked: false,
    children: [
      {
        id: "warehouse1",
        name: "Warehouse Riyadh",
        checked: false,
      },
      {
        id: "office1",
        name: "Office",
        checked: true,
      },
      {
        id: "report1",
        name: "Report",
        checked: false,
      },
    ],
  },
  {
    id: "company11",
    name: "Travel Max",
    checked: false,
    children: [
      {
        id: "warehouse11",
        name: "Warehouse Riyadh",
        checked: false,
      },
      {
        id: "office11",
        name: "Office",
        checked: true,
      },
      {
        id: "report11",
        name: "Report",
        checked: false,
      },
    ],
  },
];

// ============================================================
// REACT SELECT STYLES
// ============================================================
// Dropdown title and label
const CustomMenuList = (props: MenuListProps<SelectOption, false>) => {
  return (
    <components.MenuList {...props}>
      {/* Dropdown title */}
      <div className="border-b border-[#b8f0d0] bg-[#ECFAF3] px-3 py-2">
        <div className="text-[13px] font-semibold text-slate-700">
          User List
        </div>

        {/* Column label */}
        <div className="mt-1 border-t border-[#b8f0d0] pt-1 text-[12px] font-medium text-slate-600">
          User ID
        </div>
      </div>

      {props.children}
    </components.MenuList>
  );
};
const selectStyles: StylesConfig<SelectOption, false> = {
  control: (base, state) => ({
    ...base,
    height: "31px",
    minHeight: "31px",
    borderRadius: "3px",
    borderColor: state.isFocused ? "#80bdff" : "#cbd5e1",
    boxShadow: state.isFocused ? "0 0 0 1px #80bdff" : "none",
    fontSize: "14px",
    cursor: "pointer",
    "&:hover": {
      borderColor: "#94a3b8",
    },
  }),

  valueContainer: (base) => ({
    ...base,
    padding: "0 12px",
  }),

  indicatorsContainer: (base) => ({
    ...base,
    height: "29px",
  }),

  dropdownIndicator: (base) => ({
    ...base,
    padding: "0 2px",
    color: "#64748b",
  }),

//  indicatorsContainer: (base) => ({
//   ...base,
//   height: "29px",
//   gap: "0px", // Controls space between the icons
// }),

// dropdownIndicator: (base) => ({
//   ...base,
//   padding: "0 0px", // Adjust chevron spacing
//   color: "#64748b",
// }),

clearIndicator: (base) => ({
  ...base,
  padding: "0 0px", // Adjust X spacing
  color: "#64748b",
}),
indicatorSeparator: () => ({
  display: "none",
}),

  menu: (base) => ({
    ...base,
    zIndex: 50,
    fontSize: "14px",
  }),

  menuList: (base) => ({
    ...base,
    paddingTop: 0,
    paddingBottom: 0,
  }),

  option: (base, state) => ({
    ...base,
    cursor: "pointer",
    backgroundColor: state.isSelected
      ? "#ECFAF3"
      : state.isFocused
        ? "#eff6ff"
        : "white",
    color: state.isSelected ? "black" : "#334155",
  }),
};
// ============================================================
// MAIN COMPONENT
// ============================================================

const UserPermissionBranchPage: React.FC = () => {
  const [userId, setUserId] = useState<SelectOption | null>(
    userOptions[0]
  );

  const [permissionData, setPermissionData] =
    useState<PermissionNode[]>(initialPermissionData);

  const [message, setMessage] = useState("");

  // Independent expand/collapse state for each company
  const [expandedCompanies, setExpandedCompanies] = useState<
    Record<string, boolean>
  >({
    company: true,
    company1: true,
  });

  // ============================================================
  // EXPAND / COLLAPSE INDIVIDUAL COMPANY
  // ============================================================

  const toggleExpanded = (parentId: string) => {
    setExpandedCompanies((previous) => ({
      ...previous,
      [parentId]: !previous[parentId],
    }));
  };

  // ============================================================
  // PARENT CHECKBOX
  // Check/uncheck the parent and all its children
  // ============================================================

  const toggleParent = (parentId: string, checked: boolean) => {
    setPermissionData((previous) =>
      previous.map((parent) => {
        if (parent.id !== parentId) return parent;

        return {
          ...parent,
          checked,
          children: parent.children?.map((child) => ({
            ...child,
            checked,
          })),
        };
      })
    );

    setMessage("");
  };

  // ============================================================
  // CHILD CHECKBOX
  // Parent is checked only when all children are checked
  // ============================================================

  const toggleChild = (
    parentId: string,
    childId: string,
    checked: boolean
  ) => {
    setPermissionData((previous) =>
      previous.map((parent) => {
        if (parent.id !== parentId) return parent;

        const updatedChildren =
          parent.children?.map((child) =>
            child.id === childId
              ? { ...child, checked }
              : child
          ) ?? [];

        const allChildrenChecked =
          updatedChildren.length > 0 &&
          updatedChildren.every((child) => child.checked);

        return {
          ...parent,
          checked: allChildrenChecked,
          children: updatedChildren,
        };
      })
    );

    setMessage("");
  };

  // ============================================================
  // CLEAR
  // ============================================================

  const handleClear = () => {
    setUserId(null);

    setPermissionData((previous) =>
      previous.map((parent) => ({
        ...parent,
        checked: false,
        children: parent.children?.map((child) => ({
          ...child,
          checked: false,
        })),
      }))
    );

    setMessage("");
  };

  // ============================================================
  // SAVE
  // ============================================================

  const handleSave = () => {
    const payload = {
      userId: userId?.value ?? "",
      permissions: permissionData,
    };

    console.log("User permissions:", payload);

    setMessage("Permissions are ready to save.");
  };

  // ============================================================
  // DELETE
  // ============================================================

  const handleDelete = () => {
    setMessage("Delete action selected.");
  };

  // ============================================================
  // UI
  // ============================================================

  return (
    <div className="mt-25 flex items-center justify-center">
      <div className="mb-10 flex min-h-fit w-[calc(100%-32px)] max-w-[30%] min-w-100 flex-col border border-slate-400 bg-white pb-5 font-[Arial,Helvetica,sans-serif] text-[12px] text-gray-700">

        {/* TITLE */}
       <header className="flex h-9 shrink-0 items-center border-b border-slate-300 bg-[#a3dfc0]">
          <span className="px-5 text-[17px] font-semibold text-slate-700">
            User Permission Branches

          </span>
        </header>

        {/* USER SELECT */}
        <section className="flex h-16.5 shrink-0 items-center gap-5 px-5.5">
          <label
            htmlFor="lkpUserID"
            className="w-18 shrink-0 text-[16px] text-slate-600"
          >
            User ID :
          </label>

          <div className="w-[50%] min-w-50 max-w-[calc(100%-92px)]">
            <Select<SelectOption, false>
              inputId="lkpUserID"
              name="lkpUserID"
              options={userOptions}
              value={userId}
              onChange={(option: SingleValue<SelectOption>) => {
                setUserId(option);
                setMessage("");
              }}
              styles={selectStyles}
              isClearable
              placeholder="Select User"
            />
          </div>
        </section>

        {/* PERMISSION TREE */}
        <main
          className="flex min-h-0 flex-1 flex-col px-4.75"
          id="trlBranches"
        >
          <div className="min-h-65 flex-1 overflow-auto border border-[#b8f0d0]">
            <table className="w-full table-fixed border-collapse">
  <colgroup>
    <col />
  </colgroup>

  <thead>
    <tr className="h-7.5 bg-[#ecfaf3]">
      <th className="border-b border-[#b8f0d0] px-2.75 text-left text-[15px] font-normal text-slate-700">
        Branches
      </th>
    </tr>
  </thead>

  <tbody>
    {permissionData.map((parent) => (
      <React.Fragment key={parent.id}>
        {/* LEVEL 1: COMPANY */}
        <tr className="h-7.25">
          <td className="border-b border-[#b8f0d0] p-0">
            <div className="flex h-7 items-center gap-2.25 px-2.5">
              <button
                type="button"
                aria-label={
                  expandedCompanies[parent.id]
                    ? `Collapse ${parent.name}`
                    : `Expand ${parent.name}`
                }
                aria-expanded={!!expandedCompanies[parent.id]}
                onClick={() => toggleExpanded(parent.id)}
                className="flex h-5 w-5 shrink-0 items-center justify-center text-[12px] text-slate-600"
              >
                {expandedCompanies[parent.id] ? (
                  <ChevronDown color="green" />
                ) : (
                  <ChevronRight color="green" />
                )}
              </button>

              <input
                id={`chk${parent.id}`}
                name={`chk${parent.id}`}
                type="checkbox"
                checked={parent.checked}
                onChange={(event) =>
                  toggleParent(parent.id, event.target.checked)
                }
                className="h-4.25 w-4.25 shrink-0 cursor-pointer accent-[#69d875]"
              />

              <label
                htmlFor={`chk${parent.id}`}
                className="flex-1 cursor-pointer text-[15px]"
              >
                {parent.name}
              </label>
            </div>
          </td>
        </tr>

        {/* LEVEL 2: CHILDREN */}
        {expandedCompanies[parent.id] &&
          parent.children?.map((child) => (
            <tr key={child.id} className="h-7.25">
              <td className="border-b border-[#b8f0d0] p-0">
                <div className="ml-10.75 flex h-7 items-center gap-2.25 border-l border-[#b8f0d0] pl-1.5">
                  <input
                    id={`chk${child.id}`}
                    name={`chk${child.id}`}
                    type="checkbox"
                    checked={child.checked}
                    onChange={(event) =>
                      toggleChild(
                        parent.id,
                        child.id,
                        event.target.checked
                      )
                    }
                    className="h-4.25 w-4.25 shrink-0 cursor-pointer accent-[#69d875]"
                  />

                  <label
                    htmlFor={`chk${child.id}`}
                    className="flex-1 cursor-pointer text-[15px]"
                  >
                    {child.name}
                  </label>
                </div>
              </td>
            </tr>
          ))}
      </React.Fragment>
    ))}
  </tbody>
            </table>
          </div>
        </main>

        {/* ACTION BUTTONS */}
        <footer className="flex min-h-19.25 -mb-6 shrink-0 flex-col items-center justify-center gap-1 px-4 py-2">
          {/* {message && (
            <p
              role="status"
              className="text-[11px] text-blue-700"
            >
              {message}
            </p>
          )} */}

          <div className="flex flex-wrap items-center justify-center gap-3.75">

            {/* SAVE */}
            <button
              id="btnSave"
              name="btnSave"
              type="button"
              onClick={handleSave}
className={buttonClass}
>
              <span className="underline underline-offset-2">
                S
              </span>ave
            </button>

            {/* DELETE */}
            <button
              id="btnDelete"
              name="btnDelete"
              type="button"
              onClick={handleDelete}
className={buttonClass}
>
              <span className="underline underline-offset-2">
                D
              </span>elete
            </button>

            {/* CLEAR */}
            <button
              id="btnClear"
              name="btnClear"
              type="button"
              onClick={handleClear}

className={buttonClass}
>
              <span className="underline underline-offset-2">
                C
              </span>lear
            </button>

          </div>
        </footer>
      </div>
    </div>
  );
};

export default UserPermissionBranchPage;