import React, { useCallback, useEffect, useRef, useState } from "react";

import SupplierHeader from "../../../../components/Finance/Report/Setup/Supplier/SupplierHeader";
import SupplierMiddle from "../../../../components/Finance/Report/Setup/Supplier/SupplierMiddle";
import SupplierFooter from "../../../../components/Finance/Report/Setup/Supplier/SupplierFooter";
import { useSupplier, type SupplierDetail } from "../../../../hooks/useSupplier";
import { useConfirmModal } from "../../../../hooks/useConfirmModal";
import { useMessageModal } from "../../../../hooks/useMessageModal";
interface SupplierPageProps {
    /** When set, the page opens for this existing supplier. */
    supplierId?: string;
    /** "delete": record is loaded read-only and only Delete is allowed. */
    mode?: "modify" | "delete";
    onClose?: () => void;
    /** Called after a successful save / update / delete (e.g. refresh the list). */
    onSaved?: () => void;
}

// TODO: confirm these two values (customer uses "60"; supplier prefix is different)
const SUPPLIER_ACCOUNT_TYPE_ID = "70";
const PARENT_ACCOUNT_LEVEL = 3;

// Fields that exist in the DB but have no input on this screen.
// sp_pagesupplier's Modify mode overwrites EVERY column, so on edit we load
// these and send them back unchanged; otherwise they'd be wiped.
// (backend getSupplier must return them - see note)
const PRESERVED_KEYS = [
    "csAccountType",
    "csAccountTypeDet",
    "transType",
    "invMethod",
    "rcnMethod",
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

const SupplierPage: React.FC<SupplierPageProps> = ({
    supplierId,
    mode,
    onClose,
    onSaved,
}) => {
    const { notify, dialog: messageDialog } = useMessageModal();
    const isEdit = !!supplierId;
    const isDelete = isEdit && mode === "delete";
    const { confirm, dialog } = useConfirmModal();

    const formRef = useRef<HTMLDivElement>(null);

    const [saving, setSaving] = useState(false);
    const [loadingRecord, setLoadingRecord] = useState(false);
    const [preserved, setPreserved] = useState<SupplierDetail>({});

    // ============================================================
    // HEADER
    // ============================================================

    const [txtSupplierID, setTxtSupplierID] = useState("");
    const [optNewSupplierID, setOptNewSupplierID] = useState("Auto");
    const [lkpGAccountID, setLkpGAccountID] = useState("");
    const [lkpGAccountName, setLkpGAccountName] = useState("");
    const [lkpHaveDivision, setLkpHaveDivision] = useState("No");
    const [lkpBusinessType, setLkpBusinessType] = useState("B2B");

    // ============================================================
    // MIDDLE - ENGLISH
    // ============================================================

    const [txtSupplierName, setTxtSupplierName] = useState("");
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

    const [txtSupplierName_AR, setTxtSupplierName_AR] = useState("");
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
    const [lkpBranch, setLkpBranch] = useState("");
    const [txtEMail, setTxtEMail] = useState("");
    const [txtPhone, setTxtPhone] = useState("");

    // ============================================================
    // FOOTER
    // ============================================================

    const [chkCustomer, setChkCustomer] = useState(false);
    const [chkSupplier, setChkSupplier] = useState(true);
    const [chkInterCompany, setChkInterCompany] = useState(false);
    const [chkInactiveSupplier, setChkInactiveSupplier] = useState(false);
    const [chkExcludeFromAgeing, setChkExcludeFromAgeing] = useState(false);

    const {
        fetchNextSupplierId,
        parentAccounts,
        fetchParentAccounts,
        countries,
        fetchCountries,
        staffs,
        fetchStaffs,
        branches,
        fetchBranches,
        fetchSupplier,
        saveSupplier,
        updateSupplier,
        deleteSupplier,
    } = useSupplier();

    const branchOptions = branches.map((b) => ({
        value: b.brId,
        label: b.brName,
    }));

    // ============================================================
    // LOAD (add mode: defaults / edit mode: existing record)
    // ============================================================

    const loadDefaults = useCallback(async () => {
        const [nextId, accounts, countryList] = await Promise.all([
            fetchNextSupplierId(SUPPLIER_ACCOUNT_TYPE_ID, PARENT_ACCOUNT_LEVEL),
            fetchParentAccounts(),
            fetchCountries(),
            fetchStaffs(),
            fetchBranches(),
        ]);

        if (nextId) setTxtSupplierID(nextId);

        if (accounts && accounts.length > 0) {
            setLkpGAccountID(accounts[0].accountId);
            setLkpGAccountName(accounts[0].accountName);
        }

        // default country: UAE if it exists in the list, otherwise the first one
        const defaultCountry =
            countryList?.find((c) => c.countryId === "UAE") ?? countryList?.[0];
        if (defaultCountry) {
            setLkpCountry(defaultCountry.countryId);
            setLkpCountry_AR(defaultCountry.countryId);
        }
    }, [
        fetchNextSupplierId,
        fetchParentAccounts,
        fetchCountries,
        fetchStaffs,
        fetchBranches,
    ]);

    // DB record -> form state
    const populate = useCallback((d: SupplierDetail) => {
        setTxtSupplierID(d.csAccountId ?? "");
        setLkpGAccountID(d.gAccountId ?? "");
        setLkpHaveDivision(d.haveDivision ? "Yes" : "No");
        setLkpBusinessType(d.businessTypeId || "B2B");

        setTxtSupplierName(d.accountName ?? "");
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

        setTxtSupplierName_AR(d.accountNameA ?? "");
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
        setLkpStaff(d.staffId ?? "");
        setTxtContact(d.contact ?? "");
        setLkpBranch(d.brId ?? "");
        setTxtEMail(d.email ?? "");
        setTxtPhone(d.phone ?? "");

        // fcsdet: char 1 = customer, char 2 = supplier, char 3 = untouched here
        const det = d.csAccountTypeDet ?? "010";
        setChkCustomer(det[0] === "1");
        setChkSupplier(det[1] === "1");
        setChkInterCompany(!!d.interCompany);
        setChkInactiveSupplier(!!d.status);
        setChkExcludeFromAgeing(!!d.exclFromAgeing);

        // keep the columns this screen doesn't edit
        const keep: Record<string, unknown> = {};
        for (const key of PRESERVED_KEYS) keep[key] = d[key];
        setPreserved(keep as SupplierDetail);
    }, []);

    const loadRecord = useCallback(async () => {
        if (!supplierId) return;
        try {
            setLoadingRecord(true);
            const [detail, accounts] = await Promise.all([
                fetchSupplier(supplierId),
                fetchParentAccounts(),
                fetchCountries(),
                fetchStaffs(),
                fetchBranches(),
            ]);
            populate(detail);
            const match = accounts?.find((a) => a.accountId === detail.gAccountId);
            setLkpGAccountName(match?.accountName ?? "");
        } catch (err) {
            notify.error(errMsg(err, "Failed to load supplier"));
            onClose?.();
        } finally {
            setLoadingRecord(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        supplierId,
        fetchSupplier,
        fetchParentAccounts,
        fetchCountries,
        fetchStaffs,
        fetchBranches,
        populate,
    ]);

    useEffect(() => {
        if (isEdit) loadRecord();
        else loadDefaults();
    }, [isEdit, loadRecord, loadDefaults]);

    // ============================================================
    // SAVE (POST for new, PUT for existing)
    // ============================================================

    // fcsdet: 1st char = customer, 2nd = supplier, 3rd kept as stored.
    // (the backend always forces fcs = 'S' for this module)
    const deriveCsAccountTypeDet = () => {
        const third = (preserved.csAccountTypeDet ?? "000")[2] ?? "0";
        return `${chkCustomer ? "1" : "0"}${chkSupplier ? "1" : "0"}${third}`;
    };

    // Auto = generated ID (locked). Manual = user types the ID.
    // In edit mode, Manual means "rename this supplier's ID".
    const handleIdModeChange = async (value: string) => {
        setOptNewSupplierID(value);

        const focusIdField = (select = false) =>
            setTimeout(() => {
                const el =
                    formRef.current?.querySelector<HTMLInputElement>("#txtSupplierID");
                el?.focus();
                if (select) el?.select();
            }, 0);

        // EDIT: Auto = back to the current ID, Manual = edit the current ID
        if (isEdit) {
            if (value === "Auto") setTxtSupplierID(supplierId!);
            else focusIdField(true);
            return;
        }

        // ADD: Manual = empty field
        if (value === "Manual") {
            focusIdField();
            return;
        }

        // ADD: Auto = fetch the next generated ID
        const nextId = await fetchNextSupplierId(
            SUPPLIER_ACCOUNT_TYPE_ID,
            PARENT_ACCOUNT_LEVEL,
        );
        if (nextId) setTxtSupplierID(nextId);
        else notify.error("Failed to get next supplier ID");
    };

    const handleSave = async () => {
        if (saving || isDelete) return;

        if (!txtSupplierID.trim()) {
            notify.warning("Supplier ID is required");
            return;
        }
        if (!txtSupplierName.trim()) {
            notify.warning("Supplier Name is required");
            return;
        }
        if (!lkpGAccountID) {
            notify.warning("GL Account is required");
            return;
        }
        if (!chkCustomer && !chkSupplier) {
            notify.warning("Select Customer, Supplier or both");
            return;
        }

        if (txtSupplierID.trim().length > 12) {
            notify.warning("Supplier ID cannot be longer than 12 characters");
            return;
        }

        const isB2B = lkpBusinessType === "B2B";

        if (isB2B) {
            const requiredFields: [string, string][] = [
                ["Legal Name", txtLegalName],
                ["Building No", txtBuildingNo],
                ["Street Name", txtStreetName],
                ["District", txtDistrict],
                ["City", txtCity],
                ["Country", lkpCountry],
                ["Postal Code", txtPostalCode],
                ["VAT No", txtVATNo],
            ];

            const missing = requiredFields.find(([, value]) => !value.trim());
            if (missing) {
                notify.warning(`${missing[0]} is required`);
                return;
            }

            // numbers only + max length (B2B only)
            const numericChecks: [string, string, number][] = [
                ["Building No", txtBuildingNo, 4],
                ["Postal Code", txtPostalCode, 5],
                ["Additional No", txtAdditionalNo, 4],
                ["CR No", txtCRNo, 20],
                ["VAT No", txtVATNo, 15],
                ["Building No (AR)", txtBuildingNo_AR, 4],
                ["Postal Code (AR)", txtPostalCode_AR, 5],
                ["Additional No (AR)", txtAdditionalNo_AR, 4],
                ["CR No (AR)", txtCRNo_AR, 20],
                ["VAT No (AR)", txtVATNo_AR, 15],
            ];

            // for (const [label, value, max] of numericChecks) {
            //     if (value && !/^\d+$/.test(value)) {
            //         toast.warning(`${label} must contain numbers only`);
            //         return;
            //     }
            //     if (value.length > max) {
            //         toast.warning(`${label} cannot be longer than ${max} digits`);
            //         return;
            //     }
            // }

            if (txtEMail && !/^\S+@\S+\.\S+$/.test(txtEMail)) {
                notify.warning("Invalid e-mail");
                return;
            }
        }

        const payload: SupplierDetail = {
            // untouched DB columns first (edit mode only), form values override
            ...(isEdit ? preserved : {}),

            csAccountId: txtSupplierID.trim(),
            csAccountTypeDet: deriveCsAccountTypeDet(),
            gAccountId: lkpGAccountID,
            haveDivision: lkpHaveDivision === "Yes",
            businessTypeId: lkpBusinessType,

            accountName: txtSupplierName,
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

            accountNameA: txtSupplierName_AR,
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
            staffId: lkpStaff || undefined,
            contact: txtContact,
            brId: lkpBranch,
            email: txtEMail,
            phone: txtPhone,

            interCompany: chkInterCompany,
            status: chkInactiveSupplier, // ASSUMPTION: fstatus true = inactive
            exclFromAgeing: chkExcludeFromAgeing,
        };

        try {
            setSaving(true);

            if (isEdit) await updateSupplier(supplierId!, payload);
            else await saveSupplier(payload);

            notify.success(
                isEdit
                    ? "Supplier updated successfully"
                    : "Supplier saved successfully",
            );
            onSaved?.();
            onClose?.();
        } catch (err) {
            notify.error(errMsg(err, "Failed to save supplier"));
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
            notify.warning("Open an existing supplier to delete it");
            return;
        }
        const shouldDelete = await confirm({
            title: "Supplier",
            message: `Delete supplier "${txtSupplierName}"?`,
            confirmLabel: "Delete",
            cancelLabel: "Cancel",
        });
        if (!shouldDelete) return;

        try {
            setSaving(true);
            await deleteSupplier(supplierId!);
            notify.success("Supplier deleted successfully");
            onSaved?.();
            onClose?.();
        } catch (err) {
            notify.error(errMsg(err, "Failed to delete supplier"));
        } finally {
            setSaving(false);
        }
    };

    // ============================================================
    // CLEAR (edit mode: revert to the saved record)
    // ============================================================

    const handleClear = () => {
        if (isEdit) {
            setOptNewSupplierID("Auto");
            loadRecord();
            return;
        }

        loadDefaults();
        setOptNewSupplierID("Auto");

        setLkpHaveDivision("No");
        setLkpBusinessType("B2B");

        setTxtSupplierName("");
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

        setTxtSupplierName_AR("");
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
        setLkpBranch("");
        setTxtEMail("");
        setTxtPhone("");

        setChkCustomer(false);
        setChkSupplier(true);
        setChkInterCompany(false);
        setChkInactiveSupplier(false);
        setChkExcludeFromAgeing(false);
    };

    // ============================================================
    // KEYBOARD: focus Supplier ID on open, Enter = Tab
    // ============================================================

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
            formRef.current?.querySelector<HTMLInputElement>("#txtSupplierID");
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

    // ============================================================
    // JSX
    // ============================================================

    if (loadingRecord) {
        return (
            <div className="w-full bg-white p-6 text-center text-[12px] text-slate-500">
              {messageDialog}
                Loading supplier...
            </div>
        );
    }

    return (
        <>
          {messageDialog}
            <div
                ref={formRef}
                onKeyDown={handleEnterAsTab}
                className="w-full bg-white"
            >
                <SupplierHeader
                    txtSupplierID={txtSupplierID}
                    setTxtSupplierID={setTxtSupplierID}
                    optNewSupplierID={optNewSupplierID}
                    onIdModeChange={handleIdModeChange}
                    idLocked={isDelete}
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
                    {/* MIDDLE */}
                    <SupplierMiddle
                        isB2B={lkpBusinessType === "B2B"}
                        countries={countries}
                        staffs={staffs}
                        branchOptions={branchOptions}
                        txtSupplierName={txtSupplierName}
                        setTxtSupplierName={setTxtSupplierName}
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
                        txtSupplierName_AR={txtSupplierName_AR}
                        setTxtSupplierName_AR={setTxtSupplierName_AR}
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
                        lkpBranch={lkpBranch}
                        setLkpBranch={setLkpBranch}
                        txtEMail={txtEMail}
                        setTxtEMail={setTxtEMail}
                        txtPhone={txtPhone}
                        setTxtPhone={setTxtPhone}
                    />
                </fieldset>

                {/* FOOTER */}
                <SupplierFooter
                    chkCustomer={chkCustomer}
                    setChkCustomer={setChkCustomer}
                    chkSupplier={chkSupplier}
                    setChkSupplier={setChkSupplier}
                    chkInterCompany={chkInterCompany}
                    setChkInterCompany={setChkInterCompany}
                    chkInactiveSupplier={chkInactiveSupplier}
                    setChkInactiveSupplier={setChkInactiveSupplier}
                    chkExcludeFromAgeing={chkExcludeFromAgeing}
                    setChkExcludeFromAgeing={setChkExcludeFromAgeing}
                    saveLabel={isEdit ? "Modify" : "Save"}
                    saveDisabled={isDelete}
                    deleteDisabled={!isDelete}
                    clearDisabled={isDelete}
                    onSave={handleSave}
                    onDelete={handleDelete}
                    onClear={handleClear}
                />
            </div>
            {dialog}
        </>
    );
};

export default SupplierPage;