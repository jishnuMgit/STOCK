const selectStyles = {
  /* =====================================================
     CONTROL
  ===================================================== */

  control: (base: any, state: any) => ({
    ...base,

    width: "100%",
    minWidth: 0,
    minHeight: "30px",
    height: "30px",
    border: "none",
    borderRadius: 0,
    backgroundColor: "transparent",
    boxShadow: "none",
    fontSize: "14px",
    padding: 0,
    margin: 0,
    cursor: "default",
    "&:hover": {
      border: "none",
    },

    ...(state.isFocused && {
      border: "none",
      boxShadow: "none",
    }),
  }),

  /* =====================================================
     VALUE CONTAINER
  ===================================================== */

  valueContainer: (base: any) => ({
    ...base,
    height: "30px",
    minHeight: "30px",
    minWidth: 0,
    padding: "0 5px",
    margin: 0,
    display: "flex",
    alignItems: "center",
    overflow: "hidden",
  }),

  /* =====================================================
     SINGLE VALUE
  ===================================================== */

  singleValue: (base: any) => ({
    ...base,

    margin: 0,
    padding: 0,
    color: "#344054",
    fontSize: "14px",
    lineHeight: "30px",
    maxWidth: "100%",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  }),

  /* =====================================================
     PLACEHOLDER
  ===================================================== */

  placeholder: (base: any) => ({
    ...base,
    margin: 0,
    padding: 0,
    color: "#808080",
    fontSize: "14px",
    lineHeight: "30px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  }),

  /* =====================================================
     INPUT
  ===================================================== */

  input: (base: any) => ({
    ...base,
    margin: 0,
    padding: 0,
    color: "#344054",
    fontSize: "14px",
    lineHeight: "30px",
    minWidth: 0,
  }),

  /* =====================================================
     INDICATORS
  ===================================================== */

  indicatorsContainer: (base: any) => ({
    ...base,
    height: "30px",
    display: "flex",
    alignItems: "center",
    flexShrink: 0,
  }),

  /* =====================================================
     DROPDOWN INDICATOR
  ===================================================== */

  dropdownIndicator: (base: any) => ({
    ...base,
    width: "18px",
    height: "30px",
    padding: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#aeb8c2",
    flexShrink: 0,
    "&:hover": {
      color: "#808080",
    },
  }),

  /* =====================================================
     SEPARATOR
  ===================================================== */

  indicatorSeparator: () => ({
    display: "none",
  }),

  /* =====================================================
     CLEAR
  ===================================================== */

  clearIndicator: (base: any) => ({
    ...base,
    width: "18px",
    padding: 0,
    color: "#aeb8c2",
    flexShrink: 0,
  }),

  /* =====================================================
     NORMAL MENU
  ===================================================== */

  menu: (base: any) => ({
    ...base,
    marginTop: "0px",
    marginBottom: "0px",
    borderRadius: 0,
    border: "1px solid #aaa",
    boxShadow: "2px 2px 5px rgba(0, 0, 0, 0.18)",
    zIndex: 999999,
    fontSize: "14px",
    overflow: "hidden",
    width: "100%",
    minWidth: 0,
    maxWidth: "100vw",
    boxSizing: "border-box",
  }),

  /* =====================================================
     MENU PORTAL
  ===================================================== */

  menuPortal: (base: any) => ({
    ...base,
    zIndex: 999999,
    maxWidth: "100vw",
  }),

  /* =====================================================
     NORMAL MENU LIST
  ===================================================== */

  menuList: (base: any) => ({
    ...base,
    padding: 0,
    overflowX: "hidden",
    overflowY: "auto",
    maxHeight: "220px",
    width: "100%",
    maxWidth: "100%",
    boxSizing: "border-box",
  }),

  /* =====================================================
     NORMAL OPTION
  ===================================================== */

  option: (base: any, state: any) => ({
    ...base,
    minHeight: "30px",
    height: "30px",
    padding: "0 6px",
    display: "flex",
    alignItems: "center",
    fontSize: "14px",
    lineHeight: "30px",
    cursor: "default",
    backgroundColor: state.isFocused ? "#EEFBF4" : "#ffffff",
    color: "#344054",
    overflow: "hidden",
    whiteSpace: "nowrap",
    textOverflow: "ellipsis",
    "&:active": {
      backgroundColor: "#dff5e9",
    },
  }),
};

/* =========================================================
   ACCOUNT DROPDOWN
========================================================= */

const accountDropdownStyles = {
  ...selectStyles,

  control: (base: any, state: any) => ({
    ...selectStyles.control(base, state),
    width: "100%",
    minWidth: 0,
  }),

  /* =====================================================
     ACCOUNT MENU

     Account ID   = 105px
     Account Name = 558px
     TOTAL        = 663px
  ===================================================== */

  menu: (base: any) => ({
    ...selectStyles.menu(base),
    width: "663px",
    minWidth: "663px",
    maxWidth: "663px",
    overflow: "hidden",
    boxSizing: "border-box",
  }),

  menuPortal: (base: any) => ({
    ...selectStyles.menuPortal(base),
    zIndex: 999999,
  }),

  menuList: (base: any) => ({
    ...selectStyles.menuList(base),
    width: "663px",
    minWidth: "663px",
    maxWidth: "663px",
    padding: 0,
    margin: 0,
    overflow: "hidden",
    maxHeight: "none",
    boxSizing: "border-box",

    "& .account-dropdown-header": {
      display: "flex",
      width: "663px",
      minWidth: "663px",
      maxWidth: "663px",
      height: "30px",
      minHeight: "30px",
      maxHeight: "30px",
      flexShrink: 0,
      boxSizing: "border-box",
      overflow: "hidden",
      backgroundColor: "#eeeeee",
      borderBottom: "2px solid #c8c8c8",
      border: "1px solid #cccccc",
      fontSize: "14px",
      lineHeight: "30px",
      position: "relative",
      zIndex: 2,
    },

    "& .account-dropdown-header-id": {
      flex: "0 0 105px",
      width: "105px",
      minWidth: "105px",
      maxWidth: "105px",
      height: "30px",
      minHeight: "30px",
      boxSizing: "border-box",
      padding: "0 6px",
      overflow: "hidden",
      whiteSpace: "nowrap",
      textOverflow: "ellipsis",
      lineHeight: "30px",
      fontSize: "14px",
      color: "#222222",
      borderRight: "1px solid #cccccc",
    },

    /* Account Name = 558px */
    "& .account-dropdown-header-name": {
      flex: "0 0 558px",
      width: "558px",
      minWidth: "558px",
      maxWidth: "558px",
      height: "30px",
      minHeight: "30px",
      boxSizing: "border-box",
      padding: "0 6px",
      overflow: "hidden",
      whiteSpace: "nowrap",
      textOverflow: "ellipsis",
      lineHeight: "30px",
      fontSize: "14px",
      color: "#222222",
    },

    "& .account-dropdown-options": {
      width: "663px",
      minWidth: "663px",
      maxWidth: "663px",
      height: "auto", // was "375px"
      maxHeight: "375px", // upper limit; the component narrows it at runtime
      minHeight: 0,
      padding: 0,
      margin: 0,
      overflowX: "hidden",
      overflowY: "auto",
      boxSizing: "border-box",

      "&::-webkit-scrollbar": { width: "14px" },
      "&::-webkit-scrollbar-track": { background: "#eeeeee" },
      "&::-webkit-scrollbar-thumb": {
        background: "#bdbdbd",
        border: "1px solid #999999",
        borderRadius: 0,
      },
      "&::-webkit-scrollbar-thumb:hover": { background: "#a8a8a8" },
    },

    "& .account-dropdown-row": {
      display: "flex",
      width: "663px",
      minWidth: "663px",
      maxWidth: "663px",
      height: "30px",
      minHeight: "30px",
      maxHeight: "30px",
      boxSizing: "border-box",
      overflow: "hidden",
      fontSize: "14px",
      lineHeight: "30px",
      color: "#344054",
    },

    "& .account-dropdown-row .account-dropdown-id": {
      flex: "0 0 105px",
      width: "105px",
      minWidth: "105px",
      maxWidth: "105px",
      height: "30px",
      minHeight: "30px",
      boxSizing: "border-box",
      padding: "0 6px",
      overflow: "hidden",
      whiteSpace: "nowrap",
      textOverflow: "ellipsis",
      lineHeight: "30px",
      fontSize: "14px",
      borderRight: "1px solid #eeeeee",
    },

    /* Account Name = 558px */
    "& .account-dropdown-row .account-dropdown-name": {
      flex: "0 0 558px",
      width: "558px",
      minWidth: "558px",
      maxWidth: "558px",
      height: "30px",
      minHeight: "30px",
      boxSizing: "border-box",
      padding: "0 6px",
      overflow: "hidden",
      whiteSpace: "nowrap",
      textOverflow: "ellipsis",
      lineHeight: "30px",
      fontSize: "14px",
    },
  }),

  option: (base: any, state: any) => ({
    ...selectStyles.option(base, state),
    width: "663px",
    minWidth: "663px",
    maxWidth: "663px",
    height: "30px",
    minHeight: "30px",
    maxHeight: "30px",
    padding: 0,
    margin: 0,
    boxSizing: "border-box",
    overflow: "hidden",
    whiteSpace: "nowrap",
    textOverflow: "ellipsis",
    fontSize: "14px",
    lineHeight: "30px",

    "& .account-dropdown-row": {
      display: "flex",
      width: "663px",
      minWidth: "663px",
      maxWidth: "663px",
      height: "30px",
      minHeight: "30px",
      maxHeight: "30px",
      boxSizing: "border-box",
      overflow: "hidden",
      fontSize: "14px",
      lineHeight: "30px",
    },

    "& .account-dropdown-id": {
      flex: "0 0 105px",
      width: "105px",
      minWidth: "105px",
      maxWidth: "105px",
      height: "30px",
      minHeight: "30px",
      boxSizing: "border-box",
      padding: "0 6px",
      overflow: "hidden",
      whiteSpace: "nowrap",
      textOverflow: "ellipsis",
      lineHeight: "30px",
      fontSize: "14px",
      borderRight: "1px solid #eeeeee",
    },

    /* Account Name = 558px */
    "& .account-dropdown-name": {
      flex: "0 0 558px",
      width: "558px",
      minWidth: "558px",
      maxWidth: "558px",
      height: "30px",
      minHeight: "30px",
      boxSizing: "border-box",
      padding: "0 6px",
      overflow: "hidden",
      whiteSpace: "nowrap",
      textOverflow: "ellipsis",
      lineHeight: "30px",
      fontSize: "14px",
    },
  }),
};
/* =========================================================
   EXPORT
========================================================= */
import { components } from "react-select";

const BranchMenuList = (props: any) => {
  return (
    <components.MenuList {...props}>
      {/* Header */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 40px",
          padding: "6px 10px",
          backgroundColor: "#f5f7fa",
          borderBottom: "1px solid #d7dee7",
          fontSize: "14px",
          fontWeight: 600,
          color: "#555",
          position: "sticky",
          top: 0,
          zIndex: 99999,
        }}
      >
        <div>Branch </div>
        <div> ID</div>
      </div>

      {props.children}
    </components.MenuList>
  );
};

const BranchOption = (props: any) => {
  const { data } = props;

  return (
    <components.Option {...props}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 40px",
          width: "100%",
          alignItems: "center",
          fontSize: "14px",
        }}
      >
        <div>{data.label}</div>

        <div style={{ color: "#555" }}>{data.value}</div>
      </div>
    </components.Option>
  );
};

const TYPE_GRID = "80px 1fr";
const TypeMenuList = (props: any) => {
  return (
    <components.MenuList {...props}>
      {/* Header */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: TYPE_GRID,
          padding: "6px 10px",
          backgroundColor: "#f5f7fa",
          borderBottom: "1px solid #d7dee7",
          fontSize: "14px",
          fontWeight: 600,
          color: "#555",
          position: "sticky",
          top: 0,
          zIndex: 99999,
        }}
      >
        <div>Type</div>
        <div>ID</div>
      </div>

      {props.children}
    </components.MenuList>
  );
};

const TypeOption = (props: any) => {
  const { data } = props;

  return (
    <components.Option {...props}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: TYPE_GRID,
          width: "100%",
          alignItems: "center",
          fontSize: "14px",
        }}
      >
        <div>{data.label}</div>
        <div style={{ color: "#555" }}>{data.value}</div>
      </div>
    </components.Option>
  );
};

const BankCashMenuList = (props: any) => {
  return (
    <components.MenuList {...props}>
      {/* Header */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.9fr 75px",
          padding: "6px 10px",
          backgroundColor: "#f5f7fa",
          borderBottom: "1px solid #d7dee7",
          fontSize: "14px",
          fontWeight: 600,
          color: "#555",
          position: "sticky",
          top: 0,
          zIndex: 99999,
        }}
      >
        <div>Account Name</div>
        <div>Account ID</div>
      </div>

      {props.children}
    </components.MenuList>
  );
};

const BankCashOption = (props: any) => {
  const { data } = props;

  return (
    <components.Option {...props}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.9fr 75px",
          width: "100%",
          alignItems: "center",
          fontSize: "14px",
        }}
      >
        <div>{data.label}</div>

        <div style={{ color: "#555" }}>{data.value}</div>
      </div>
    </components.Option>
  );
};
export {
  selectStyles,
  accountDropdownStyles,
  BranchMenuList,
  BranchOption,
  TypeMenuList,
  TypeOption,
  BankCashMenuList,
  BankCashOption,
};
