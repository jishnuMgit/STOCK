import { components, type StylesConfig } from "react-select";

/* =========================================================
   SHARED BRANCH DROPDOWN LOOK

   Used by Settings/SetDocumentNo and Settings/SetBranchInfo so
   both Branch dropdowns look and behave identically:
   - type to filter (matches the branch name or its ID)
   - open list shows a "Branch | ID" header
   - the name column is exactly as wide as the Branch box and the
     ID column sits right after the box's right edge, in the part
     of the menu that hangs past it (menu width = 100% + 56px;
     46px ID column + the 10px right padding = 56px)
========================================================= */

interface OptionData {
  label: string;
  value: string;
}

export const filterLabelOrValue = (
  option: { label: string; value: string; data: OptionData },
  inputValue: string
) => {
  const search = inputValue.toLowerCase().trim();

  if (!search) {
    return true;
  }

  return (
    option.data.label.toLowerCase().includes(search) ||
    option.data.value.toLowerCase().includes(search)
  );
};

const BRANCH_ID_COLUMN = "46px";
const BRANCH_GRID_COLUMNS = `calc(100% - ${BRANCH_ID_COLUMN}) ${BRANCH_ID_COLUMN}`;

// Builds the "Name | ID" menu parts with a given heading for the name
// column ("Branch", "Company", ...). Create once at module level so
// react-select doesn't remount the menu on every render.
export const makeNameIdMenuComponents = (nameHeader: string) => ({
  MenuList: (props: any) => (
    <components.MenuList {...props}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: BRANCH_GRID_COLUMNS,
          padding: "6px 10px",
          backgroundColor: "#f5f7fa",
          borderBottom: "1px solid #d7dee7",
          fontSize: "11px",
          fontWeight: 600,
          color: "#555",
          position: "sticky",
          top: 0,
          zIndex: 99999,
        }}
      >
        <div>{nameHeader}</div>
        <div>ID</div>
      </div>

      {props.children}
    </components.MenuList>
  ),

  Option: (props: any) => {
    const { data } = props;

    return (
      <components.Option {...props}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: BRANCH_GRID_COLUMNS,
            width: "100%",
            alignItems: "center",
            fontSize: "12px",
          }}
        >
          <div
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {data.label}
          </div>

          <div style={{ color: "#555" }}>{data.value}</div>
        </div>
      </components.Option>
    );
  },
});

const branchMenuComponents = makeNameIdMenuComponents("Branch");

export const BranchMenuList = branchMenuComponents.MenuList;
export const BranchOption = branchMenuComponents.Option;

export const CustomDropdownIndicator = (props: any) => {
  return (
    <components.DropdownIndicator {...props}>
      <span className="text-[11px] text-slate-500">▼</span>
    </components.DropdownIndicator>
  );
};

// Spread into a Branch select's `styles` to widen the menu and
// remove the list padding so the sticky header sits flush.
export const branchMenuStyles: Pick<
  StylesConfig<any, false>,
  "menu" | "menuList"
> = {
  menu: (base) => ({
    ...base,
    width: "calc(100% + 56px)",
    zIndex: 99999,
    fontSize: "13px",
  }),
  menuList: (base) => ({
    ...base,
    padding: 0,
    // No visible scroll bar (still scrolls with wheel / arrow keys)
    scrollbarWidth: "none",
    msOverflowStyle: "none",
    "&::-webkit-scrollbar": {
      display: "none",
    },
  }),
};
