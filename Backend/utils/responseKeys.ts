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
    Object.entries(keys).map(([column, field]) => [field, row[column]]),
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

export const defaultBranchUserListKeys: KeyMap = {
  fuserid: "txtUserID",
};

export const defaultBranchGridKeys: KeyMap = {
  fuserid: "txtUserID",
  fdefbrid: "lkpDefaultBranch",
};

/* ---------- Purchase / BeginningStock ---------- */

export const beginningStockItemKeys: KeyMap = {
  fitemid: "lkpItemID",
  fitemname: "txtItemName",
  funit: "txtUnit",
};

export const beginningStockLineKeys: KeyMap = {
  fslno: "txtSlNo",
  fitemid: "lkpItemID",
  funit: "txtUnit",
  fqtyin: "txtQty",
  funitcost: "txtUnitCost",
  ftotalcost: "txtTotalCost",
};

// the Beginning Stock print: the heading (company, branch, date, doc no) and the lines
export const beginningStockPrintHeaderKeys: KeyMap = {
  fconame: "txtCoName",
  fbrname: "txtBranchName",
  fdate: "dtpDate",
  fdocno: "txtDocNo",
};

export const beginningStockPrintLineKeys: KeyMap = {
  fslno: "txtSlNo",
  fitemid: "lkpItemID",
  fitemname: "lkpItemName",
  funit: "txtUnit",
  fqtyin: "txtQty",
  funitcost: "txtUnitCost",
  ftotalcost: "txtTotalCost",
};

export const beginningStockHeaderKeys: KeyMap = {
  fdate: "dtpDate",
  fsuserid: "txtSavedBy",
  fsuserdate: "txtSavedOn",
  fmuserid: "txtModifiedBy",
  fmuserdate: "txtModifiedOn",
  fnote: "txtNote",
};

/* ---------- Sales / Setup / ItemEnquiry ---------- */

export const itemEnquiryItemKeys: KeyMap = {
  fitemid: "lkpItemID",
  fitemname: "lkpItemName",
};

export const itemEnquiryHeaderKeys: KeyMap = {
  fitemid: "lkpItemID",
  fitemname: "lkpItemName",
  funit: "txtUnit",
  fpacking: "txtPacking",
  fcbm: "txtCBM",
  fitemgroupid: "lkpItemGroupID",
  fitemgroupname: "lkpItemGroupName",
  fsupplierid: "lkpSupplierID",
  fsuppliername: "lkpSupplierName",
  fsupplieritemid: "txtSupplierItemID",
  freorderlevel: "txtReorderLevel",
  freorderqty: "txtReorderQty",
};

export const itemEnquiryGridKeys: KeyMap = {
  fbrid: "txtBranchID",
  fbrname: "txtBranchName",
  fstock: "txtStock",
  fpreviousunitcost: "txtPrevUnitCost",
  funitprice: "txtUnitPrice",
  funitcost: "txtUnitCost",
  ftotalcost: "txtTotalCost",
};

/* ---------- Sales / Transaction / StockTransfer ---------- */

export const stockTransferToBranchKeys: KeyMap = {
  fbrid: "lkpToBranch",
  fbrname: "txtToBranchName",
};

export const stockTransferItemKeys: KeyMap = {
  fitemid: "lkpItemID",
  fitemname: "txtItemName",
  funit: "txtUnit",
  fpacking: "txtPacking",
};

export const stockTransferLineKeys: KeyMap = {
  fslno: "txtSlNo",
  fitemid: "lkpItemID",
  funit: "txtUnit",
  fqtyout: "txtQty",
  funitcost: "txtUnitCost",
  ftotalcost: "txtTotalCost",
};

export const stockTransferHeaderKeys: KeyMap = {
  fsttobrid: "lkpToBranch",
  fdate: "dtpDate",
  fnote: "txtNote",
  fsuserid: "txtSavedBy",
  fsuserdate: "txtSavedOn",
  fmuserid: "txtModifiedBy",
  fmuserdate: "txtModifiedOn",
};

export const stockTransferPrintHeaderKeys: KeyMap = {
  fconame: "txtCoName",
  fbrname: "txtBranchName",
  ftobrname: "txtToBranchName",
  fdocno: "txtDocNo",
  fdate: "dtpDate",
  fnote: "txtNote",
};

export const stockTransferPrintLineKeys: KeyMap = {
  fslno: "txtSlNo",
  fitemid: "lkpItemID",
  fitemname: "lkpItemName",
  funit: "txtUnit",
  fqtyout: "txtQty",
  funitcost: "txtUnitCost",
  ftotalcost: "txtTotalCost",
};

/* ---------- Sales / Transaction / StockAdjustment ---------- */

export const stockAdjustmentItemKeys: KeyMap = {
  fitemid: "lkpItemID",
  fitemname: "txtItemName",
  funit: "txtUnit",
  fpacking: "txtPacking",
};

export const stockAdjustmentLineKeys: KeyMap = {
  fslno: "txtSlNo",
  fitemid: "lkpItemID",
  funit: "txtUnit",
  fqtyin: "txtQtyIn",
  fqtyout: "txtQtyOut",
  funitcost: "txtUnitCost",
  ftotalcost: "txtTotalCost",
};

export const stockAdjustmentHeaderKeys: KeyMap = {
  fdate: "dtpDate",
  fnote: "txtNote",
  fsuserid: "txtSavedBy",
  fsuserdate: "txtSavedOn",
  fmuserid: "txtModifiedBy",
  fmuserdate: "txtModifiedOn",
};

export const stockAdjustmentPrintHeaderKeys: KeyMap = {
  fconame: "txtCoName",
  fbrname: "txtBranchName",
  fdocno: "txtDocNo",
  fdate: "dtpDate",
  fnote: "txtNote",
};

export const stockAdjustmentPrintLineKeys: KeyMap = {
  fslno: "txtSlNo",
  fitemid: "lkpItemID",
  fitemname: "lkpItemName",
  funit: "txtUnit",
  fqtyin: "txtQtyIn",
  fqtyout: "txtQtyOut",
  funitcost: "txtUnitCost",
  ftotalcost: "txtTotalCost",
};

// the Search list: the saved adjustments of a branch
export const stockAdjustmentFindKeys: KeyMap = {
  fdocno: "txtDocNo",
  fdate: "dtpDate",
  fnote: "txtNote",
  ftotalcost: "txtTotalCost",
  fpost: "chkPosted",
};

export const userAuditUserListKeys: KeyMap = {
  fuserid: "lkpUserID",
};

export const userAuditActionListKeys: KeyMap = {
  fpid: "lkpAction",
  fpname: "txtActionName",
};

export const userAuditGridKeys: KeyMap = {
  fyear: "txtYear",
  fbrid: "txtBranchID",
  fbrname: "txtBranchName",
  fdoctype: "txtDocType",
  fdocno: "txtDocNo",
  fscreenname: "txtScreenName",
  faction: "txtAction",
  fnote: "txtAuditNote",
  fuserid: "txtUserID",
  fuserdate: "txtAuditDate",
};

export const activePeriodGridKeys: KeyMap = {
  fbrid: "txtBranchID",
  fbrname: "txtBranchName",
  factivefromdate: "dtpFromDate",
  factivetodate: "dtpToDate",
};

export const staffGridKeys: KeyMap = {
  fstaffid: "txtStaffID",
  fstaffname: "txtStaffName",
  fispurchase: "chkIsPurchase",
  fissales: "chkIsSales",
};

export const unitGridKeys: KeyMap = {
  funit: "txtUnit",
};

export const itemGroupKeys: KeyMap = {
  fitemgroupid: "txtItemGroupID",
  fitemgroupname: "txtItemGroupName",
  fvatslab: "lkpVATSlab",
  fvatper: "txtVATPer",
};

export const vatSlabListKeys: KeyMap = {
  fvatslab: "lkpVATSlab",
  fvatper: "txtVATPer",
};

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

/* ---------- Settings / SetChartOfAccount ---------- */

export const parameterListKeys: KeyMap = {
  fname: "lkpParameterName",
  ftype: "lkpParameterType",
};

export const chartOfAccountKeys: KeyMap = {
  fslno: "txtSlNo",
  ftype: "lkpParameterType",
  fgaccountid: "lkpAccountID",
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

export const itemListKeys = {
  fitemid: "itemID",
  fitemname: "itemName",
  fbrid: "branchID",
  fpacking: "packing",
  fitemgroupid: "itemGroupID",
  fallowsalebelowcost: "allowSaleBelowCost",
  finactive: "inactive",
};

export const supplierLookupKeys = {
  fcsaccountid: "supplierID",
  fcsaccountname: "supplierName",
};

/* ---------- Sales / Setup / SalesPriceList ---------- */

export const salesPriceListItemGroupKeys: KeyMap = {
  fitemgroupid: "lkpItemGroupID",
  fitemgroupname: "lkpItemGroupName",
};

export const salesPriceListGridKeys: KeyMap = {
  fitemid: "lkpItemID",
  fitemname: "txtItemName",
  funit: "txtUnit",
  funitcost: "txtUnitCost",
  funitprice: "txtUnitPrice",
  fitemgroupid: "lkpItemGroupID",
};
