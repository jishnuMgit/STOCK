/* =========================================================
   RESPONSE KEYS

   The database columns (fbrid, fitemname, ...) never leave the
   backend. Each controller maps a row to the form field names
   the pages use (lkpBranch, txtItemName, ...) right before it
   answers - so state name = form id = payload key = response key.

   mapKeys keeps only the columns listed in the map (a whitelist)
   and renames them; columns not listed are dropped.
========================================================= */

type Row = Record<string, unknown>;
type KeyMap = Record<string, string>;

export const mapKeys = (row: Row, keys: KeyMap): Row =>
  Object.fromEntries(
    Object.entries(keys).map(([column, field]) => [field, row[column]])
  );

export const mapRows = (rows: Row[], keys: KeyMap): Row[] =>
  rows.map((row) => mapKeys(row, keys));

/* ---------- shared ---------- */

export const branchListKeys: KeyMap = {
  fbrid: "lkpBranch",
  fbrname: "txtBranchName",
};

/* ---------- Settings / SetDocumentNo ---------- */

export const yearListKeys: KeyMap = { fyear: "lkpYear" };

export const moduleListKeys: KeyMap = {
  fmoduleid: "lkpModule",
  fmodulename: "txtModuleName",
};

export const documentListKeys: KeyMap = {
  fdoctype: "lkpDocument",
  fdocname: "txtDocumentName",
};

export const documentNoGridKeys: KeyMap = {
  fdoctype: "lkpDocument",
  fdocnoprefix: "txtDocPrefix",
  fstartseqno: "txtStartSeqNo",
  fstrictserialseqno: "chkStrictSerial",
  fseqnoincrementmode: "lkpMode",
  fseqnoresetmode: "lkpResetNo",
  fprintaftersave: "chkPrintAfterSave",
};

/* ---------- Purchase / Setup / Item ---------- */

export const unitListKeys: KeyMap = { funit: "lkpUnit" };

export const itemGroupListKeys: KeyMap = {
  fitemgroupid: "lkpItemGroupID",
  fitemgroupname: "txtItemGroupName",
};

export const supplierListKeys: KeyMap = {
  fcsaccountid: "lkpSupplierID",
  fcsaccountname: "txtSupplierName",
};

export const itemHeaderKeys: KeyMap = {
  fitemid: "txtItemID",
  fitemname: "txtItemName",
  fitemdescription: "txtItemDescription",
  funit: "lkpUnit",
  fpacking: "txtPacking",
  fcbm: "txtCBM",
  fitemgroupid: "lkpItemGroupID",
  fsupplierid: "lkpSupplierID",
  fsupplieritemid: "txtSupplierItemID",
  freorderlevel: "txtReorderLevel",
  freorderqty: "txtReorderQty",
};

export const itemBranchRowKeys: KeyMap = {
  fbrid: "lkpBranch",
  fitemlocation: "txtItemLocation",
  fallowsalebelowcost: "chkAllowSaleBelowCost",
  finactive: "chkInactive",
};

/* ---------- Security / UserLogin ---------- */

export const userTypeListKeys: KeyMap = {
  fpid: "lkpUserType",
  fpname: "txtUserTypeName",
};

export const userStatusListKeys: KeyMap = {
  fpid: "lkpUserStatus",
  fpname: "txtUserStatusName",
};

/* ---------- Settings / SetCompanyInfo ---------- */

export const companyListKeys: KeyMap = {
  fcoid: "lkpCoID",
  fconame: "txtCoName",
};

export const companyDetailKeys: KeyMap = {
  fcoid: "lkpCoID",
  fconame: "txtCoName",
  fconame_ar: "txtCoName_AR",
  fconame_qr: "txtCoName_QR",
  fconame_short: "txtCoName_Short",
  fcovatno: "txtCoVATNo",
  fcovatno_ar: "txtCoVATNo_AR",
  fcoaddress1: "txtCoAddress1",
  fcoaddress2: "txtCoAddress2",
  fcoaddress3: "txtCoAddress3",
  fcoaddress4: "txtCoAddress4",
  fcoaddress1_ar: "txtCoAddress1_AR",
  fcoaddress2_ar: "txtCoAddress2_AR",
  fcoaddress3_ar: "txtCoAddress3_AR",
  fcoaddress4_ar: "txtCoAddress4_AR",
  fcostatus: "txtCoStatus",
};

/* ---------- Settings / SetBranchInfo ---------- */

export const branchInfoKeys: KeyMap = {
  fbrname_ar: "txtBrName_AR",
  fbuildingno: "txtBuildingNo",
  fstreetname: "txtStreetName",
  fdistrict: "txtDistrict",
  fcity: "txtCity",
  fcountry: "txtCountry",
  fpostalcode: "txtPostalCode",
  fadditionalno: "txtAdditionalNo",
  fcrno: "txtCRNo",
  flicenseno: "txtLicenseNo",
  flicensecategory: "txtLicenseCategory",
  fbuildingno_ar: "txtBuildingNo_AR",
  fstreetname_ar: "txtStreetName_AR",
  fdistrict_ar: "txtDistrict_AR",
  fcity_ar: "txtCity_AR",
  fcountry_ar: "txtCountry_AR",
  fpostalcode_ar: "txtPostalCode_AR",
  fadditionalno_ar: "txtAdditionalNo_AR",
  fcrno_ar: "txtCRNo_AR",
  flicenseno_ar: "txtLicenseNo_AR",
  flicensecategory_ar: "txtLicenseCategory_AR",
  fbraddress1: "txtBrAddress1",
  fbraddress2: "txtBrAddress2",
  fbraddress3: "txtBrAddress3",
  fbraddress4: "txtBrAddress4",
  fbraddress1_ar: "txtBrAddress1_AR",
  fbraddress2_ar: "txtBrAddress2_AR",
  fbraddress3_ar: "txtBrAddress3_AR",
  fbraddress4_ar: "txtBrAddress4_AR",
  fho: "chkHo",
};

/* ---------- Settings / FinanceSetting ---------- */

export const parameterListKeys: KeyMap = {
  fname: "lkpParameterName",
  ftype: "lkpParameterType",
};

export const finSettingKeys: KeyMap = {
  fslno: "txtSlNo",
  ftype: "lkpParameterType",
  faccountid: "lkpAccountID",
  fgph: "txtGPH",
};

export const finAccountListKeys: KeyMap = {
  faccountid: "lkpAccountID",
  faccountname: "lkpAccountName",
  fgph: "lkpGPH",
};

/* ---------- Settings / SetPostingAccount ---------- */

export const accountListKeys: KeyMap = {
  faccountid: "lkpAccountID",
  faccountname: "txtAccountName",
};

export const postingAccountKeys: KeyMap = {
  fcashsupplieraccountid: "lkpCashSupplierAccountID",
  fcashcustomeraccountid: "lkpCashCustomerAccountID",
  fstockaccountid: "lkpStockAccountID",
  fsalesaccountid: "lkpSalesAccountID",
  fsalesretaccountid: "lkpSalesReturnAccountID",
  fsalescostaccountid: "lkpCostOfSalesAccountID",
  fsalesretcostaccountid: "lkpCostOfSalesReturnAccountID",
  fstockadjaccountid: "lkpStockAdjustmentAccountID",
  froundoffaccountid: "lkpRoundOffAccountID",
  finputvataccountid: "lkpInputVATAccountID",
  foutputvataccountid: "lkpOutputVATAccountID",
};
