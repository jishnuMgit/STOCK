import React, { useCallback, useEffect, useRef, useState } from "react";

import CustomerHeader from "../../../components/Setup/CustomerPage/CustomerHeader";
import CustomerMiddle from "../../../components/Setup/CustomerPage/CustomerMiddle";
import CustomerFooter from "../../../components/Setup/CustomerPage/CustomerFooter";
import { useCustomer, type CustomerDetail } from "../../../hooks/useCustomer";

interface CustomerPageProps {
  /** When set, the page opens for this existing customer. */
  customerId?: string;
  /** "delete": record is loaded read-only and only Delete is allowed. */
  mode?: "modify" | "delete";
  onClose?: () => void;
  /** Called after a successful save / update / delete (e.g. refresh the list). */
  onSaved?: () => void;
}

// TODO: confirm these two values
const CUSTOMER_ACCOUNT_TYPE_ID = "60";
const PARENT_ACCOUNT_LEVEL = 3;

// Fields that exist in the DB but have no input on this screen.
// sp_pagecustomer's Modify mode overwrites EVERY column, so on edit we load
// these and send them back unchanged; otherwise they'd be wiped.
const PRESERVED_KEYS = [
  "csAccountType",
  "csAccountTypeDet",
  "transType",
  "invMethod",
  "rcnMethod",
  "brId",
  "ctaCardType",
  "ctaCardNo",
  "ctaExpiry",
  "calcVatOnDomCanXchg",
  "serviceChargePolicy",
  "doNotRound",
  "csAccountCategoryId",
] as const;

const errMsg = (err: unknown, fallback: string) =>
  err instanceof Error ? err.message : fallback;

const CustomerPage: React.FC<CustomerPageProps> = ({
  customerId,
  mode,
  onClose,
  onSaved,
}) => {
  const isEdit = !!customerId;
  const isDelete = isEdit && mode === "delete";

  const [saving, setSaving] = useState(false);
  const [loadingRecord, setLoadingRecord] = useState(false);
  const [preserved, setPreserved] = useState<CustomerDetail>({});

  // ============================================================
  // HEADER
  // ============================================================

  const [txtCustomerID, setTxtCustomerID] = useState("");
  const [optNewCustomerID, setOptNewCustomerID] = useState("Auto");
  const [lkpGAccountID, setLkpGAccountID] = useState("");
  const [lkpGAccountName, setLkpGAccountName] = useState("");
  const [lkpHaveDivision, setLkpHaveDivision] = useState("No");
  const [lkpBusinessType, setLkpBusinessType] = useState("B2B");

  // ============================================================
  // MIDDLE - ENGLISH
  // ============================================================

  const [txtCustomerName, setTxtCustomerName] = useState("");
  const [txtLegalName, setTxtLegalName] = useState("");
  const [txtBuildingNo, setTxtBuildingNo] = useState("");
  const [txtStreetName, setTxtStreetName] = useState("");
  const [txtDistrict, setTxtDistrict] = useState("");
  const [txtCity, setTxtCity] = useState("");
  const [lkpCountry, setLkpCountry] = useState("UAE");
  const [txtPostalCode, setTxtPostalCode] = useState("");
  const [txtAdditionalNo, setTxtAdditionalNo] = useState("");
  const [txtCRNo, setTxtCRNo] = useState("");
  const [txtVATNo, setTxtVATNo] = useState("");

  // ============================================================
  // MIDDLE - ARABIC
  // ============================================================

  const [txtCustomerName_AR, setTxtCustomerName_AR] = useState("");
  const [txtLegalName_AR, setTxtLegalName_AR] = useState("");
  const [txtBuildingNo_AR, setTxtBuildingNo_AR] = useState("");
  const [txtStreetName_AR, setTxtStreetName_AR] = useState("");
  const [txtDistrict_AR, setTxtDistrict_AR] = useState("");
  const [txtCity_AR, setTxtCity_AR] = useState("");
  const [lkpCountry_AR, setLkpCountry_AR] = useState("UAE");
  const [txtPostalCode_AR, setTxtPostalCode_AR] = useState("");
  const [txtAdditionalNo_AR, setTxtAdditionalNo_AR] = useState("");
  const [txtCRNo_AR, setTxtCRNo_AR] = useState("");
  const [txtVATNo_AR, setTxtVATNo_AR] = useState("");

  // ============================================================
  // MIDDLE - OTHER
  // ============================================================

  const [txtCreditLimit, setTxtCreditLimit] = useState("");
  const [txtCreditDays, setTxtCreditDays] = useState("");
  const [txtShortName, setTxtShortName] = useState("");
  const [lkpStaff, setLkpStaff] = useState("");
  const [txtContact, setTxtContact] = useState("");
  const [txtEMail, setTxtEMail] = useState("");
  const [txtPhone, setTxtPhone] = useState("");

  // ============================================================
  // FOOTER
  // ============================================================

  const [chkCustomer, setChkCustomer] = useState(true);
  const [chkSupplier, setChkSupplier] = useState(false);
  const [chkInterCompany, setChkInterCompany] = useState(false);
  const [chkInactiveCustomer, setChkInactiveCustomer] = useState(false);
  const [chkExcludeFromAgeing, setChkExcludeFromAgeing] = useState(false);

  const {
    fetchNextCustomerId,
    parentAccounts,
    fetchParentAccounts,
    fetchCustomer,
    saveCustomer,
    updateCustomer,
    deleteCustomer,
  } = useCustomer();

  // ============================================================
  // LOAD (add mode: defaults / edit mode: existing record)
  // ============================================================

  const loadDefaults = useCallback(async () => {
    const [nextId, accounts] = await Promise.all([
      fetchNextCustomerId(CUSTOMER_ACCOUNT_TYPE_ID, PARENT_ACCOUNT_LEVEL),
      fetchParentAccounts(),
    ]);

    if (nextId) setTxtCustomerID(nextId);

    if (accounts && accounts.length > 0) {
      setLkpGAccountID(accounts[0].accountId);
      setLkpGAccountName(accounts[0].accountName);
    }
  }, [fetchNextCustomerId, fetchParentAccounts]);

  // DB record -> form state
  const populate = useCallback((d: CustomerDetail) => {
    setTxtCustomerID(d.csAccountId ?? "");
    setLkpGAccountID(d.gAccountId ?? "");
    setLkpHaveDivision(d.haveDivision ? "Yes" : "No");
    setLkpBusinessType(d.businessTypeId || "B2B");

    setTxtCustomerName(d.accountName ?? "");
    setTxtLegalName(d.legalName ?? "");
    setTxtBuildingNo(d.buildingNo ?? "");
    setTxtStreetName(d.streetName ?? "");
    setTxtDistrict(d.district ?? "");
    setTxtCity(d.city ?? "");
    setLkpCountry(d.countryId || "UAE");
    setTxtPostalCode(d.postalCode ?? "");
    setTxtAdditionalNo(d.additionalNo ?? "");
    setTxtCRNo(d.crNo ?? "");
    setTxtVATNo(d.vatNo ?? "");

    setTxtCustomerName_AR(d.accountNameA ?? "");
    setTxtLegalName_AR(d.legalNameA ?? "");
    setTxtBuildingNo_AR(d.buildingNoA ?? "");
    setTxtStreetName_AR(d.streetNameA ?? "");
    setTxtDistrict_AR(d.districtA ?? "");
    setTxtCity_AR(d.cityA ?? "");
    setLkpCountry_AR(d.countryIdA || "UAE");
    setTxtPostalCode_AR(d.postalCodeA ?? "");
    setTxtAdditionalNo_AR(d.additionalNoA ?? "");
    setTxtCRNo_AR(d.crNoA ?? "");
    setTxtVATNo_AR(d.vatNoA ?? "");

    setTxtCreditLimit(d.creditLimit == null ? "" : String(d.creditLimit));
    setTxtCreditDays(d.creditDays == null ? "" : String(d.creditDays));
    setTxtShortName(d.shortName ?? "");
    setTxtContact(d.contact ?? "");
    setTxtEMail(d.email ?? "");
    setTxtPhone(d.phone ?? "");

    // fcsdet: 100 = customer, 110 = customer + supplier, 010 = supplier
    // char 1 = customer, char 2 = supplier, char 3 = untouched here
    const det = d.csAccountTypeDet ?? "000";
    setChkCustomer(det[0] === "1");
    setChkSupplier(det[1] === "1");
    setChkInterCompany(!!d.interCompany);
    setChkInactiveCustomer(!!d.status);
    setChkExcludeFromAgeing(!!d.exclFromAgeing);

    // keep the columns this screen doesn't edit
    const keep: Record<string, unknown> = {};
    for (const key of PRESERVED_KEYS) keep[key] = d[key];
    setPreserved(keep as CustomerDetail);
  }, []);

  const loadRecord = useCallback(async () => {
    if (!customerId) return;
    try {
      setLoadingRecord(true);
      const [detail, accounts] = await Promise.all([
        fetchCustomer(customerId),
        fetchParentAccounts(),
      ]);
      populate(detail);
      const match = accounts?.find((a) => a.accountId === detail.gAccountId);
      setLkpGAccountName(match?.accountName ?? "");
    } catch (err) {
      window.alert(errMsg(err, "Failed to load customer"));
      onClose?.();
    } finally {
      setLoadingRecord(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId, fetchCustomer, fetchParentAccounts, populate]);

  useEffect(() => {
    if (isEdit) loadRecord();
    else loadDefaults();
  }, [isEdit, loadRecord, loadDefaults]);

  // ============================================================
  // SAVE (POST for new, PUT for existing)
  // ============================================================

  // fcsdet: 1st char = customer, 2nd = supplier, 3rd kept as stored.
  const deriveCsAccountTypeDet = () => {
    const third = (preserved.csAccountTypeDet ?? "000")[2] ?? "0";
    return `${chkCustomer ? "1" : "0"}${chkSupplier ? "1" : "0"}${third}`;
  };

  // ASSUMPTION: fcs on a NEW record is 'C' (customer) or 'S' (supplier-only).
  // Confirm with: SELECT DISTINCT fcs FROM dbo.tblaccountcs;
  const deriveCsAccountType = () => (chkCustomer ? "C" : "S");

  const handleSave = async () => {
    if (saving || isDelete) return;

    if (!txtCustomerID.trim()) {
      window.alert("Customer ID is required");
      return;
    }
    if (!txtCustomerName.trim()) {
      window.alert("Customer Name is required");
      return;
    }
    if (!lkpGAccountID) {
      window.alert("GL Account is required");
      return;
    }
    if (!chkCustomer && !chkSupplier) {
      window.alert("Select Customer, Supplier or both");
      return;
    }

    const payload: CustomerDetail = {
      // untouched DB columns first (edit mode only), form values override
      ...(isEdit ? preserved : { csAccountType: deriveCsAccountType() }),

      csAccountId: txtCustomerID.trim(),
      csAccountTypeDet: deriveCsAccountTypeDet(),
      gAccountId: lkpGAccountID,
      haveDivision: lkpHaveDivision === "Yes",
      businessTypeId: lkpBusinessType,

      accountName: txtCustomerName,
      legalName: txtLegalName,
      buildingNo: txtBuildingNo,
      streetName: txtStreetName,
      district: txtDistrict,
      city: txtCity,
      countryId: lkpCountry,
      postalCode: txtPostalCode,
      additionalNo: txtAdditionalNo,
      crNo: txtCRNo,
      vatNo: txtVATNo,

      accountNameA: txtCustomerName_AR,
      legalNameA: txtLegalName_AR,
      buildingNoA: txtBuildingNo_AR,
      streetNameA: txtStreetName_AR,
      districtA: txtDistrict_AR,
      cityA: txtCity_AR,
      countryIdA: lkpCountry_AR,
      postalCodeA: txtPostalCode_AR,
      additionalNoA: txtAdditionalNo_AR,
      crNoA: txtCRNo_AR,
      vatNoA: txtVATNo_AR,

      creditLimit: parseInt(txtCreditLimit, 10) || 0,
      creditDays: parseInt(txtCreditDays, 10) || 0,
      shortName: txtShortName,
      contact: txtContact,
      email: txtEMail,
      phone: txtPhone,
      // lkpStaff has no matching column in sp_pagecustomer, so it isn't sent

      interCompany: chkInterCompany,
      status: chkInactiveCustomer, // ASSUMPTION: fstatus true = inactive
      exclFromAgeing: chkExcludeFromAgeing,
    };

    try {
      setSaving(true);

      if (isEdit) await updateCustomer(customerId!, payload);
      else await saveCustomer(payload);

      window.alert(
        isEdit
          ? "Customer updated successfully"
          : "Customer saved successfully",
      );
      onSaved?.();
      onClose?.();
    } catch (err) {
      window.alert(errMsg(err, "Failed to save customer"));
    } finally {
      setSaving(false);
    }
  };

  // ============================================================
  // DELETE
  // ============================================================

  const handleDelete = async () => {
    if (saving) return;

    if (!isEdit) {
      window.alert("Open an existing customer to delete it");
      return;
    }
    if (!window.confirm(`Delete customer "${txtCustomerName}"?`)) return;

    try {
      setSaving(true);
      await deleteCustomer(customerId!);
      onSaved?.();
      onClose?.();
    } catch (err) {
      window.alert(errMsg(err, "Failed to delete customer"));
    } finally {
      setSaving(false);
    }
  };

  // ============================================================
  // CLEAR (edit mode: revert to the saved record)
  // ============================================================

  const handleClear = () => {
    if (isEdit) {
      loadRecord();
      return;
    }

    loadDefaults();
    setOptNewCustomerID("Auto");

    setLkpHaveDivision("No");
    setLkpBusinessType("B2B");

    setTxtCustomerName("");
    setTxtLegalName("");
    setTxtBuildingNo("");
    setTxtStreetName("");
    setTxtDistrict("");
    setTxtCity("");
    setLkpCountry("UAE");
    setTxtPostalCode("");
    setTxtAdditionalNo("");
    setTxtCRNo("");
    setTxtVATNo("");

    setTxtCustomerName_AR("");
    setTxtLegalName_AR("");
    setTxtBuildingNo_AR("");
    setTxtStreetName_AR("");
    setTxtDistrict_AR("");
    setTxtCity_AR("");
    setLkpCountry_AR("UAE");
    setTxtPostalCode_AR("");
    setTxtAdditionalNo_AR("");
    setTxtCRNo_AR("");
    setTxtVATNo_AR("");

    setTxtCreditLimit("");
    setTxtCreditDays("");
    setTxtShortName("");
    setLkpStaff("");
    setTxtContact("");
    setTxtEMail("");
    setTxtPhone("");

    setChkCustomer(true);
    setChkSupplier(false);
    setChkInterCompany(false);
    setChkInactiveCustomer(false);
    setChkExcludeFromAgeing(false);
  };

  // ============================================================
  // JSX
  // ============================================================

  // ============================================================
  // KEYBOARD: focus Customer ID on open, Enter = Tab
  // ============================================================

  const formRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  // Runs on open, and again when an edit record finishes loading
  // (the form is unmounted while loading, which drops focus).
  useEffect(() => {
    if (loadingRecord) return;

    // Delete mode: the fields are locked, so focus Cancel (safe default)
    if (isDelete) {
      cancelRef.current?.focus();
      return;
    }

    const el =
      formRef.current?.querySelector<HTMLInputElement>("#txtCustomerID");
    el?.focus();
    el?.select();
  }, [loadingRecord, isDelete]);

  const handleEnterAsTab = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Enter" || e.defaultPrevented) return; // react-select handles Enter itself when its menu is open

    const target = e.target as HTMLElement;
    if (target.tagName !== "INPUT") return; // leave buttons / textareas alone

    const root = formRef.current;
    if (!root) return;

    const focusables = Array.from(
      root.querySelectorAll<HTMLElement>("input, select, textarea, button"),
    ).filter(
      (el) =>
        !el.hasAttribute("disabled") &&
        (el as HTMLInputElement).type !== "hidden" &&
        el.tabIndex >= 0 &&
        el.offsetParent !== null, // skip anything not visible
    );

    const index = focusables.indexOf(target);
    const next = focusables[index + (e.shiftKey ? -1 : 1)];

    if (next) {
      e.preventDefault();
      next.focus();
      if (next instanceof HTMLInputElement && next.type === "text")
        next.select();
    }
  };

  if (loadingRecord) {
    return (
      <div className="w-full bg-white p-6 text-center text-[12px] text-slate-500">
        Loading customer...
      </div>
    );
  }

  return (
    <div ref={formRef} onKeyDown={handleEnterAsTab} className="w-full bg-white">
      <CustomerHeader
        txtCustomerID={txtCustomerID}
        setTxtCustomerID={setTxtCustomerID}
        optNewCustomerID={optNewCustomerID}
        setOptNewCustomerID={setOptNewCustomerID}
        lkpGAccountID={lkpGAccountID}
        setlkpGAccountID={setLkpGAccountID}
        lkpGAccountName={lkpGAccountName}
        setlkpGAccountName={setLkpGAccountName}
        lkpHaveDivision={lkpHaveDivision}
        setLkpHaveDivision={setLkpHaveDivision}
        lkpBusinessType={lkpBusinessType}
        setLkpBusinessType={setLkpBusinessType}
        onClose={onClose}
        parentAccounts={parentAccounts}
      />
      {/* Header + middle are locked in delete mode */}
      <fieldset disabled={isDelete} className="m-0 min-w-0 border-0 p-0">
        {/* HEADER */}

        {/* MIDDLE */}
        <CustomerMiddle
          txtCustomerName={txtCustomerName}
          setTxtCustomerName={setTxtCustomerName}
          txtLegalName={txtLegalName}
          setTxtLegalName={setTxtLegalName}
          txtBuildingNo={txtBuildingNo}
          setTxtBuildingNo={setTxtBuildingNo}
          txtStreetName={txtStreetName}
          setTxtStreetName={setTxtStreetName}
          txtDistrict={txtDistrict}
          setTxtDistrict={setTxtDistrict}
          txtCity={txtCity}
          setTxtCity={setTxtCity}
          lkpCountry={lkpCountry}
          setLkpCountry={setLkpCountry}
          txtPostalCode={txtPostalCode}
          setTxtPostalCode={setTxtPostalCode}
          txtAdditionalNo={txtAdditionalNo}
          setTxtAdditionalNo={setTxtAdditionalNo}
          txtCRNo={txtCRNo}
          setTxtCRNo={setTxtCRNo}
          txtVATNo={txtVATNo}
          setTxtVATNo={setTxtVATNo}
          txtCustomerName_AR={txtCustomerName_AR}
          setTxtCustomerName_AR={setTxtCustomerName_AR}
          txtLegalName_AR={txtLegalName_AR}
          setTxtLegalName_AR={setTxtLegalName_AR}
          txtBuildingNo_AR={txtBuildingNo_AR}
          setTxtBuildingNo_AR={setTxtBuildingNo_AR}
          txtStreetName_AR={txtStreetName_AR}
          setTxtStreetName_AR={setTxtStreetName_AR}
          txtDistrict_AR={txtDistrict_AR}
          setTxtDistrict_AR={setTxtDistrict_AR}
          txtCity_AR={txtCity_AR}
          setTxtCity_AR={setTxtCity_AR}
          lkpCountry_AR={lkpCountry_AR}
          setLkpCountry_AR={setLkpCountry_AR}
          txtPostalCode_AR={txtPostalCode_AR}
          setTxtPostalCode_AR={setTxtPostalCode_AR}
          txtAdditionalNo_AR={txtAdditionalNo_AR}
          setTxtAdditionalNo_AR={setTxtAdditionalNo_AR}
          txtCRNo_AR={txtCRNo_AR}
          setTxtCRNo_AR={setTxtCRNo_AR}
          txtVATNo_AR={txtVATNo_AR}
          setTxtVATNo_AR={setTxtVATNo_AR}
          txtCreditLimit={txtCreditLimit}
          setTxtCreditLimit={setTxtCreditLimit}
          txtCreditDays={txtCreditDays}
          setTxtCreditDays={setTxtCreditDays}
          txtShortName={txtShortName}
          setTxtShortName={setTxtShortName}
          lkpStaff={lkpStaff}
          setLkpStaff={setLkpStaff}
          txtContact={txtContact}
          setTxtContact={setTxtContact}
          txtEMail={txtEMail}
          setTxtEMail={setTxtEMail}
          txtPhone={txtPhone}
          setTxtPhone={setTxtPhone}
        />
      </fieldset>

      {/* FOOTER */}
      <CustomerFooter
        chkCustomer={chkCustomer}
        setChkCustomer={setChkCustomer}
        chkSupplier={chkSupplier}
        setChkSupplier={setChkSupplier}
        chkInterCompany={chkInterCompany}
        setChkInterCompany={setChkInterCompany}
        chkInactiveCustomer={chkInactiveCustomer}
        setChkInactiveCustomer={setChkInactiveCustomer}
        chkExcludeFromAgeing={chkExcludeFromAgeing}
        setChkExcludeFromAgeing={setChkExcludeFromAgeing}
        saveLabel={isEdit ? "Modify" : "Save"}
        saveDisabled={isDelete}
        onSave={handleSave}
        onDelete={handleDelete}
        onClear={handleClear}
      />
    </div>
  );
};

export default CustomerPage;
