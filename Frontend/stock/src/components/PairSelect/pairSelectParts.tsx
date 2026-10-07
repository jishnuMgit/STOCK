import { components, type StylesConfig } from "react-select";
import { accountDropdownStyles } from "../Transaction/Receipt/save/ReactSelectStyles";

/* =========================================================
   ID | NAME DROPDOWN (shared) - two looks, same behaviour

   1. the ITEM-PAGE look (makePairComponents + pairMenuStyles /
      pairNameMenuStyles): used by Item Group and Supplier on the
      Item page - sized for a 155px ID box.
   2. the RECEIPT / JOURNAL look (receiptPairIdComponents /
      receiptPairNameComponents + receiptPairMenuStyles, at the
      bottom of this file): a 663px list with a grey 30px header,
      30px rows and a mint hover - used by Set Posting Account.

   Used wherever a row has an ID box and a Name box (Item Group,
   Supplier on the Item page; the 11 accounts on Set Posting
   Account). Same idea as the legacy desktop form: the ID box and
   the Name box each open the same two-column "ID | Name" list,
   both are searchable (type part of the ID or the name), and
   picking from either one fills both.

   Usage (create the components ONCE, outside the page component,
   so react-select doesn't remount the menu on every render):

     const idComponents   = makePairComponents("Supplier ID", "Supplier Name", false);
     const nameComponents = makePairComponents("Supplier ID", "Supplier Name", true);

     <Select styles={{ ...yourStyles, ...pairMenuStyles }}
             components={idComponents} filterOption={filterPairOption}
             menuPortalTarget={document.body} menuPosition="fixed" ... />
     <Select styles={{ ...yourStyles, ...pairNameMenuStyles }}
             components={nameComponents} filterOption={filterPairOption}
             menuPortalTarget={document.body} menuPosition="fixed" ... />

   Each option must carry  { value, label, id, name }.
========================================================= */

export interface PairOption {
  value: string;
  label: string;
  id?: string;
  name?: string;
}

// The ID box is 155px wide + 8px gap, then the Name box starts and its
// text is inset ~9px. The row has 10px left padding, so 162px puts the
// name column directly under the text in the Name box.
const PAIR_GRID_COLUMNS = "162px 1fr";

// Name box's list (same idea as the Branch dropdown): the name column is
// exactly as wide as the Name box and the ID column sits right after the
// box's right edge, in the part of the menu that hangs past it
// (menu width = 100% + 56px; 46px ID column + 10px right padding).
const PAIR_GRID_COLUMNS_NAME_FIRST = "calc(100% - 100px) 100px";

// Lists with the divider (header + rows have 8px side padding):
//  - ID box list:   "ID | Name"  - the menu hangs 330px past the box, the
//    ID column ends exactly at the box's right edge (100% + 330px menu,
//    first column = box width - 8px padding) and the Name column starts
//    right there.
//  - Name box list: "Name | ID"  - the Name column ends at the box's right
//    edge and the ID column sits in the 100px that hang past it.
const DIVIDED_HANG_ID = 330;
const DIVIDED_HANG_NAME = 100;
const DIVIDED_COLUMNS_ID_FIRST = `calc(100% - ${DIVIDED_HANG_ID - 8}px) 1fr`;
const DIVIDED_COLUMNS_NAME_FIRST = `calc(100% - ${DIVIDED_HANG_NAME - 8}px) 1fr`;

export const filterPairOption = (
  option: { label: string; value: string; data: PairOption },
  inputValue: string
) => {
  const search = inputValue.toLowerCase().trim();

  if (!search) {
    return true;
  }

  return (
    (option.data.id || "").toLowerCase().includes(search) ||
    (option.data.name || "").toLowerCase().includes(search)
  );
};

const ellipsisStyle = {
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
} as const;

// nameFirst = false -> "ID | Name"  (used by the ID box)
// nameFirst = true  -> "Name | ID"  (used by the Name box)
// divider   = true  -> a thin line between the two columns, in the header
//                      and in every row (off by default: Item page)
export const makePairComponents = (
  idHeader: string,
  nameHeader: string,
  nameFirst: boolean,
  divider = false
) => {
  // With the divider the first column is exactly as wide as the box the
  // list belongs to (the line sits at the box's right edge) - see
  // pairDividedIdMenuStyles / pairDividedNameMenuStyles below.
  const columns = divider
    ? nameFirst
      ? DIVIDED_COLUMNS_NAME_FIRST
      : DIVIDED_COLUMNS_ID_FIRST
    : nameFirst
      ? PAIR_GRID_COLUMNS_NAME_FIRST
      : PAIR_GRID_COLUMNS;
  const headerPadding = divider ? "6px 8px" : "6px 10px";

  // The line is the first cell's right border. The cell grows by the
  // container's vertical padding (negative margin + padding) so the line
  // runs the full height of the header / row without gaps, and the second
  // cell gets some room after the line.
  const firstCell = (verticalPadding: number, line: string) =>
    divider
      ? {
          borderRight: line,
          margin: `-${verticalPadding}px 0`,
          padding: `${verticalPadding}px 0`,
        }
      : {};
  const secondCell = divider ? { paddingLeft: "8px" } : {};

  return {
    MenuList: (props: any) => (
      <components.MenuList {...props}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: columns,
            padding: headerPadding,
            backgroundColor: "#f5f7fa",
            borderBottom: "1px solid #d7dee7",
            fontSize: "11px",
            fontWeight: 600,
            color: "#555",
            whiteSpace: "nowrap",
            position: "sticky",
            top: 0,
            zIndex: 99999,
          }}
        >
          <div style={firstCell(6, "1px solid #d7dee7")}>
            {nameFirst ? nameHeader : idHeader}
          </div>
          <div style={secondCell}>{nameFirst ? idHeader : nameHeader}</div>
        </div>

        {props.children}
      </components.MenuList>
    ),

    Option: (props: any) => (
      <components.Option {...props}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: columns,
            width: "100%",
            alignItems: "center",
            fontSize: "12px",
          }}
        >
          {nameFirst ? (
            <>
              <div
                style={{ ...ellipsisStyle, ...firstCell(5, "1px solid #eeeeee") }}
              >
                {props.data.name}
              </div>
              <div style={secondCell}>{props.data.id}</div>
            </>
          ) : (
            <>
              <div style={firstCell(5, "1px solid #eeeeee")}>
                {props.data.id}
              </div>
              <div style={{ ...ellipsisStyle, ...secondCell }}>
                {props.data.name}
              </div>
            </>
          )}
        </div>
      </components.Option>
    ),
  };
};

// For the Name boxes: menu = Name box width + the ID column.
export const pairNameMenuStyles: Pick<
  StylesConfig<PairOption, false>,
  "menu" | "menuList" | "menuPortal"
> = {
  menu: (base) => ({
    ...base,
    width: "calc(100% + 110px)",
    zIndex: 99999,
    fontSize: "12px",
  }),
  menuList: (base) => ({
    ...base,
    padding: 0,
  }),
  menuPortal: (base) => ({
    ...base,
    zIndex: 99999,
  }),
};

// A scroll bar takes ~15px off the list's width, which pushes every
// percentage-based column (and the divider) off the box's edge - so, like
// the Branch list, the divided lists hide it (wheel / arrow keys still scroll).
const dividedMenuList: typeof pairNameMenuStyles.menuList = (base) => ({
  ...base,
  padding: 0,
  scrollbarWidth: "none",
  msOverflowStyle: "none",
  "&::-webkit-scrollbar": {
    display: "none",
  },
});

// Same, for the lists made with makePairComponents(..., divider = true)
export const pairDividedNameMenuStyles: typeof pairNameMenuStyles = {
  ...pairNameMenuStyles,
  menuList: dividedMenuList,
  menu: (base) => ({
    ...base,
    width: `calc(100% + ${DIVIDED_HANG_NAME}px)`,
    zIndex: 99999,
    fontSize: "12px",
    marginTop: "1px", // the list sits right under the box (default is 8px)
  }),
};

export const pairDividedIdMenuStyles: typeof pairNameMenuStyles = {
  ...pairNameMenuStyles,
  menuList: dividedMenuList,
  menu: (base) => ({
    ...base,
    width: `calc(100% + ${DIVIDED_HANG_ID}px)`,
    zIndex: 99999,
    fontSize: "12px",
    marginTop: "1px", // the list sits right under the box (default is 8px)
  }),
};

// For the ID boxes: a fixed-width list, wider than the box.
export const pairMenuStyles: Pick<
  StylesConfig<PairOption, false>,
  "menu" | "menuList" | "menuPortal"
> = {
  menu: (base) => ({
    ...base,
    width: "560px",
    zIndex: 99999,
    fontSize: "12px",
  }),
  menuList: (base) => ({
    ...base,
    padding: 0,
  }),
  menuPortal: (base) => ({
    ...base,
    zIndex: 99999,
  }),
};

/* =========================================================
   RECEIPT / JOURNAL LOOK

   A 663px list with a grey 30px header ("Account ID | Account Name"),
   30px rows with a divider between the columns, a mint hover and a
   square scroll bar. The look itself lives in `accountDropdownStyles`
   (components/Transaction/Receipt/save/ReactSelectStyles.tsx); the
   components below only draw the header and the rows with the class
   names that style expects - the same way JournalTable does.

   The ID box opens "ID | Name", the Name box opens "Name | ID"; the
   search (filterPairOption above) and the "pick from either, both
   fill" behaviour are the same as the Item-page look.

   Usage:
     <Select
       styles={{ ...yourControlStyles, ...receiptPairMenuStyles }}
       components={receiptPairIdComponents}   // or receiptPairNameComponents
       filterOption={filterPairOption}
       menuPortalTarget={document.body}
       menuPosition="fixed"
       menuPlacement="auto"
       maxMenuHeight={405}
       ... />
========================================================= */

// only the MENU part of the Receipt styles - the box (control) keeps the
// page's own look
export const receiptPairMenuStyles = {
  menu: accountDropdownStyles.menu,
  menuList: accountDropdownStyles.menuList,
  menuPortal: accountDropdownStyles.menuPortal,
  option: accountDropdownStyles.option,
};

// Height of the scrolling part of the list: WHOLE 30px rows only, so the
// last visible row is never cut in half. It follows the room react-select
// says it has (props.maxHeight - give the Select maxMenuHeight={405} for
// 12 rows), so near the bottom of the window it shrinks by whole rows.
const RECEIPT_HEADER_HEIGHT = 30;
const RECEIPT_ROW_HEIGHT = 30;

// the same two lines the Receipt style draws between the ID and the Name
// column (header / rows)
const RECEIPT_HEADER_DIVIDER = "1px solid #cccccc";
const RECEIPT_ROW_DIVIDER = "1px solid #eeeeee";

const receiptOptionsMaxHeight = (menuMaxHeight?: number): number => {
  const room = Math.min(375, (menuMaxHeight ?? 405) - RECEIPT_HEADER_HEIGHT);

  return Math.max(
    Math.floor(room / RECEIPT_ROW_HEIGHT) * RECEIPT_ROW_HEIGHT,
    RECEIPT_ROW_HEIGHT * 3
  );
};

// nameFirst = false -> "ID | Name"  (the ID box)
// nameFirst = true  -> "Name | ID"  (the Name box)
const makeReceiptPairComponents = (
  idHeader: string,
  nameHeader: string,
  nameFirst: boolean
) => ({
  MenuList: (props: any) => (
    <components.MenuList {...props}>
      <div className="account-dropdown-header">
        {nameFirst ? (
          <>
            {/* the Receipt style draws the divider on the ID cell only, so
                with the Name column first the line is moved to the Name cell
                - it must sit BETWEEN the two columns, like in the ID list */}
            <div
              className="account-dropdown-header-name"
              style={{ borderRight: RECEIPT_HEADER_DIVIDER }}
            >
              {nameHeader}
            </div>
            <div
              className="account-dropdown-header-id"
              style={{ borderRight: "none" }}
            >
              {idHeader}
            </div>
          </>
        ) : (
          <>
            <div className="account-dropdown-header-id">{idHeader}</div>
            <div className="account-dropdown-header-name">{nameHeader}</div>
          </>
        )}
      </div>

      <div
        className="account-dropdown-options"
        style={{ maxHeight: receiptOptionsMaxHeight(props.maxHeight) }}
      >
        {props.children}
      </div>
    </components.MenuList>
  ),

  Option: (props: any) => (
    <components.Option {...props}>
      <div className="account-dropdown-row">
        {nameFirst ? (
          <>
            <div
              className="account-dropdown-name"
              style={{ borderRight: RECEIPT_ROW_DIVIDER }}
            >
              {props.data.name}
            </div>
            <div
              className="account-dropdown-id"
              style={{ borderRight: "none" }}
            >
              {props.data.id}
            </div>
          </>
        ) : (
          <>
            <div className="account-dropdown-id">{props.data.id}</div>
            <div className="account-dropdown-name">{props.data.name}</div>
          </>
        )}
      </div>
    </components.Option>
  ),
});

// Created once (not inside a page component) so react-select doesn't
// remount the menu on every render.
export const receiptPairIdComponents = makeReceiptPairComponents(
  "Account ID",
  "Account Name",
  false
);
export const receiptPairNameComponents = makeReceiptPairComponents(
  "Account ID",
  "Account Name",
  true
);
