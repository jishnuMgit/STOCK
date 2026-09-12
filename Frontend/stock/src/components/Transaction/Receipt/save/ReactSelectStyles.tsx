const selectStyles = {
  /* =====================================================
     CONTROL
  ===================================================== */

  control: (base: any, state: any) => ({
    ...base,

    width: "100%",
    minWidth: 0,

    minHeight: "27px",
    height: "27px",

    border: "none",
    borderRadius: 0,

    backgroundColor: "transparent",

    boxShadow: "none",

    fontSize: "12px",

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

    height: "27px",
    minHeight: "27px",

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

    fontSize: "12px",

    lineHeight: "27px",

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

    fontSize: "12px",

    lineHeight: "27px",

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

    fontSize: "12px",

    lineHeight: "27px",

    minWidth: 0,
  }),

  /* =====================================================
     INDICATORS
  ===================================================== */

  indicatorsContainer: (base: any) => ({
    ...base,

    height: "27px",

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

    height: "27px",

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

    boxShadow:
      "2px 2px 5px rgba(0, 0, 0, 0.18)",

    zIndex: 999999,

    fontSize: "12px",

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

    minHeight: "27px",

    height: "27px",

    padding: "0 6px",

    display: "flex",

    alignItems: "center",

    fontSize: "12px",

    lineHeight: "27px",

    cursor: "default",

    backgroundColor: state.isFocused
      ? "#EEFBF4"
      : "#ffffff",

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

  /* =====================================================
     CONTROL
  ===================================================== */

  control: (
    base: any,
    state: any
  ) => ({
    ...selectStyles.control(
      base,
      state
    ),

    width: "100%",

    minWidth: 0,
  }),

  /* =====================================================
     ACCOUNT MENU

     Account ID   = 105px
     Account Name = 450px
     TOTAL        = 600px
  ===================================================== */

  menu: (base: any) => ({
    ...selectStyles.menu(base),

    width: "600px",

    minWidth: "600px",

    maxWidth: "600px",

    overflow: "hidden",

    boxSizing: "border-box",

    /* Important:
       Do NOT put scrolling here.
       Scrolling belongs to account-dropdown-options.
    */
  }),

  /* =====================================================
     MENU PORTAL
  ===================================================== */

  menuPortal: (base: any) => ({
    ...selectStyles.menuPortal(base),

    zIndex: 999999,
  }),

  

  menuList: (base: any) => ({
    ...selectStyles.menuList(base),

    width: "600px",

    minWidth: "600px",

    maxWidth: "600px",

    padding: 0,

    margin: 0,

    overflow: "hidden",

    maxHeight: "none",

    boxSizing: "border-box",

    /* =================================================
       HEADER
    ================================================= */

    "& .account-dropdown-header": {
      display: "flex",

      width: "600px",

      minWidth: "600px",

      maxWidth: "600px",

      height: "27px",

      minHeight: "27px",

      maxHeight: "27px",

      flexShrink: 0,

      boxSizing: "border-box",

      overflow: "hidden",

      backgroundColor: "#eeeeee",

      borderBottom:
        "2px solid #c8c8c8",
        border: "1px solid #cccccc",

      fontSize: "13px",

      lineHeight: "27px",

      position: "relative",

      zIndex: 2,
    },

    /* =================================================
       HEADER ACCOUNT ID

       EXACTLY 105px
    ================================================= */

    "& .account-dropdown-header-id": {
      flex: "0 0 105px",

      width: "105px",

      minWidth: "105px",

      maxWidth: "105px",

      height: "27px",

      minHeight: "27px",

      boxSizing: "border-box",

      padding: "0 6px",

      overflow: "hidden",

      whiteSpace: "nowrap",

      textOverflow: "ellipsis",

      lineHeight: "27px",

      fontSize: "13px",

      color: "#222222",

      borderRight:
        "1px solid #cccccc",
    },

    /* =================================================
       HEADER ACCOUNT NAME

       EXACTLY 450px
    ================================================= */

    "& .account-dropdown-header-name": {
      flex: "0 0 450px",

      width: "450px",

      minWidth: "450px",

      maxWidth: "450px",

      height: "27px",

      minHeight: "27px",

      boxSizing: "border-box",

      padding: "0 6px",

      overflow: "hidden",

      whiteSpace: "nowrap",

      textOverflow: "ellipsis",

      lineHeight: "27px",

      fontSize: "13px",

      color: "#222222",
    },

    /* =================================================
       OPTIONS CONTAINER

       ONLY THIS AREA SCROLLS
    ================================================= */

    "& .account-dropdown-options": {
      width: "600px",

      minWidth: "600px",

      maxWidth: "600px",

      height: "220px",

      minHeight: 0,

      maxHeight: "220px",

      padding: 0,

      margin: 0,

      overflowX: "hidden",

      overflowY: "auto",

      boxSizing: "border-box",

      /* =================================================
         SCROLLBAR
      ================================================= */

      "&::-webkit-scrollbar": {
        width: "12px",
      },

      "&::-webkit-scrollbar-track": {
        background: "#eeeeee",
      },

      "&::-webkit-scrollbar-thumb": {
        background: "#bdbdbd",

        border:
          "1px solid #999999",

        borderRadius: 0,
      },

      "&::-webkit-scrollbar-thumb:hover": {
        background: "#a8a8a8",
      },
    },

    /* =================================================
       ACCOUNT ROW
    ================================================= */

    "& .account-dropdown-row": {
      display: "flex",

      width: "600px",

      minWidth: "600px",

      maxWidth: "600px",

      height: "27px",

      minHeight: "27px",

      maxHeight: "27px",

      boxSizing: "border-box",

      overflow: "hidden",

      fontSize: "13px",

      lineHeight: "27px",

      color: "#344054",
    },

    /* =================================================
       ACCOUNT ID

       EXACTLY 105px
    ================================================= */

    "& .account-dropdown-row .account-dropdown-id": {
      flex: "0 0 105px",

      width: "105px",

      minWidth: "105px",

      maxWidth: "105px",

      height: "27px",

      minHeight: "27px",

      boxSizing: "border-box",

      padding: "0 6px",

      overflow: "hidden",

      whiteSpace: "nowrap",

      textOverflow: "ellipsis",

      lineHeight: "27px",

      fontSize: "13px",

      borderRight:
        "1px solid #eeeeee",
    },

    /* =================================================
       ACCOUNT NAME

       EXACTLY 450px
    ================================================= */

    "& .account-dropdown-row .account-dropdown-name": {
      flex: "0 0 450px",

      width: "450px",

      minWidth: "450px",

      maxWidth: "450px",

      height: "27px",

      minHeight: "27px",

      boxSizing: "border-box",

      padding: "0 6px",

      overflow: "hidden",

      whiteSpace: "nowrap",

      textOverflow: "ellipsis",

      lineHeight: "27px",

      fontSize: "13px",
    },
  }),

  /* =====================================================
     ACCOUNT OPTION

     React Select option itself.
  ===================================================== */

  option: (
    base: any,
    state: any
  ) => ({
    ...selectStyles.option(
      base,
      state
    ),

    width: "600px",

    minWidth: "600px",

    maxWidth: "600px",

    height: "27px",

    minHeight: "27px",

    maxHeight: "27px",

    padding: 0,

    margin: 0,

    boxSizing: "border-box",

    overflow: "hidden",

    whiteSpace: "nowrap",

    textOverflow: "ellipsis",

    fontSize: "13px",

    lineHeight: "27px",

    /* =================================================
       ACCOUNT ROW
    ================================================= */

    "& .account-dropdown-row": {
      display: "flex",

      width: "600px",

      minWidth: "600px",

      maxWidth: "600px",

      height: "27px",

      minHeight: "27px",

      maxHeight: "27px",

      boxSizing: "border-box",

      overflow: "hidden",

      fontSize: "13px",

      lineHeight: "27px",
    },

    /* =================================================
       ACCOUNT ID

       EXACTLY 105px
    ================================================= */

    "& .account-dropdown-id": {
      flex: "0 0 105px",

      width: "105px",

      minWidth: "105px",

      maxWidth: "105px",

      height: "27px",

      minHeight: "27px",

      boxSizing: "border-box",

      padding: "0 6px",

      overflow: "hidden",

      whiteSpace: "nowrap",

      textOverflow: "ellipsis",

      lineHeight: "27px",

      fontSize: "13px",

      borderRight:
        "1px solid #eeeeee",
    },

    /* =================================================
       ACCOUNT NAME

       EXACTLY 450px
    ================================================= */

    "& .account-dropdown-name": {
      flex: "0 0 450px",

      width: "450px",

      minWidth: "450px",

      maxWidth: "450px",

      height: "27px",

      minHeight: "27px",

      boxSizing: "border-box",

      padding: "0 6px",

      overflow: "hidden",

      whiteSpace: "nowrap",

      textOverflow: "ellipsis",

      lineHeight: "27px",

      fontSize: "13px",
    },
  }),
};


/* =========================================================
   EXPORT
========================================================= */

export {
  selectStyles,
  accountDropdownStyles,
};