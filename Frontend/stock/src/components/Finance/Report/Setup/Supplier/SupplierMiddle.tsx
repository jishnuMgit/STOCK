import React from "react";
import type { Country, Staff } from "../../../../../hooks/useSupplier";
import CommonTableSelect from "../../../../common/CommonTableSelect";

/* =========================================================
   TYPES
========================================================= */

interface SupplierMiddleProps {
    /** B2B: address / legal / VAT fields are required. B2C: only Supplier Name. */
    isB2B: boolean;

    /* Lookup lists (from DB) */
    countries: Country[];
    staffs: Staff[];

    /* English */
    txtSupplierName: string;
    setTxtSupplierName: React.Dispatch<React.SetStateAction<string>>;

    txtLegalName: string;
    setTxtLegalName: React.Dispatch<React.SetStateAction<string>>;

    txtBuildingNo: string;
    setTxtBuildingNo: React.Dispatch<React.SetStateAction<string>>;

    txtStreetName: string;
    setTxtStreetName: React.Dispatch<React.SetStateAction<string>>;

    txtDistrict: string;
    setTxtDistrict: React.Dispatch<React.SetStateAction<string>>;

    txtCity: string;
    setTxtCity: React.Dispatch<React.SetStateAction<string>>;

    lkpCountry: string;
    setLkpCountry: React.Dispatch<React.SetStateAction<string>>;

    txtPostalCode: string;
    setTxtPostalCode: React.Dispatch<React.SetStateAction<string>>;

    txtAdditionalNo: string;
    setTxtAdditionalNo: React.Dispatch<React.SetStateAction<string>>;

    txtCRNo: string;
    setTxtCRNo: React.Dispatch<React.SetStateAction<string>>;

    txtVATNo: string;
    setTxtVATNo: React.Dispatch<React.SetStateAction<string>>;

    /* Arabic */
    txtSupplierName_AR: string;
    setTxtSupplierName_AR: React.Dispatch<React.SetStateAction<string>>;

    txtLegalName_AR: string;
    setTxtLegalName_AR: React.Dispatch<React.SetStateAction<string>>;

    txtBuildingNo_AR: string;
    setTxtBuildingNo_AR: React.Dispatch<React.SetStateAction<string>>;

    txtStreetName_AR: string;
    setTxtStreetName_AR: React.Dispatch<React.SetStateAction<string>>;

    txtDistrict_AR: string;
    setTxtDistrict_AR: React.Dispatch<React.SetStateAction<string>>;

    txtCity_AR: string;
    setTxtCity_AR: React.Dispatch<React.SetStateAction<string>>;

    lkpCountry_AR: string;
    setLkpCountry_AR: React.Dispatch<React.SetStateAction<string>>;

    txtPostalCode_AR: string;
    setTxtPostalCode_AR: React.Dispatch<React.SetStateAction<string>>;

    txtAdditionalNo_AR: string;
    setTxtAdditionalNo_AR: React.Dispatch<React.SetStateAction<string>>;

    txtCRNo_AR: string;
    setTxtCRNo_AR: React.Dispatch<React.SetStateAction<string>>;

    txtVATNo_AR: string;
    setTxtVATNo_AR: React.Dispatch<React.SetStateAction<string>>;

    /* Other Supplier Details */
    txtCreditLimit: string;
    setTxtCreditLimit: React.Dispatch<React.SetStateAction<string>>;

    txtCreditDays: string;
    setTxtCreditDays: React.Dispatch<React.SetStateAction<string>>;

    txtShortName: string;
    setTxtShortName: React.Dispatch<React.SetStateAction<string>>;

    lkpStaff: string;
    setLkpStaff: React.Dispatch<React.SetStateAction<string>>;

    txtContact: string;
    setTxtContact: React.Dispatch<React.SetStateAction<string>>;

    txtEMail: string;
    setTxtEMail: React.Dispatch<React.SetStateAction<string>>;

    txtPhone: string;
    setTxtPhone: React.Dispatch<React.SetStateAction<string>>;

    branchOptions: { value: string; label: string }[];
    lkpBranch: string;
    setLkpBranch: React.Dispatch<React.SetStateAction<string>>;
}

const inputClass = ` w-full md:w-[80%] input-style`;

const arabicInputClass = `
  ${inputClass}
  text-right
`;

// digits only (also converts Arabic-Indic digits), then cut to max length
const AR_DIGITS = "٠١٢٣٤٥٦٧٨٩";
const digitsOnly = (value: string, max: number) =>
    value
        .replace(/[٠-٩]/g, (d) => String(AR_DIGITS.indexOf(d)))
        .replace(/\D/g, "")
        .slice(0, max);

// red asterisk, shown only when the field is required
const Star = ({ show }: { show: boolean }) =>
    show ? <span className="text-red-500">*</span> : null;

/* =========================================================
   COMPONENT
========================================================= */

const SupplierMiddle: React.FC<SupplierMiddleProps> = ({
    isB2B,

    countries,
    staffs,

    /* ENGLISH */
    txtSupplierName,
    setTxtSupplierName,
    txtLegalName,
    setTxtLegalName,
    txtBuildingNo,
    setTxtBuildingNo,
    txtStreetName,
    setTxtStreetName,
    txtDistrict,
    setTxtDistrict,
    txtCity,
    setTxtCity,
    lkpCountry,
    setLkpCountry,
    txtPostalCode,
    setTxtPostalCode,
    txtAdditionalNo,
    setTxtAdditionalNo,
    txtCRNo,
    setTxtCRNo,
    txtVATNo,
    setTxtVATNo,

    /* ARABIC */
    txtSupplierName_AR,
    setTxtSupplierName_AR,
    txtLegalName_AR,
    setTxtLegalName_AR,
    txtBuildingNo_AR,
    setTxtBuildingNo_AR,
    txtStreetName_AR,
    setTxtStreetName_AR,
    txtDistrict_AR,
    setTxtDistrict_AR,
    txtCity_AR,
    setTxtCity_AR,
    lkpCountry_AR,
    setLkpCountry_AR,
    txtPostalCode_AR,
    setTxtPostalCode_AR,
    txtAdditionalNo_AR,
    setTxtAdditionalNo_AR,
    txtCRNo_AR,
    setTxtCRNo_AR,
    txtVATNo_AR,
    setTxtVATNo_AR,

    /* OTHER */
    txtCreditLimit,
    setTxtCreditLimit,
    txtCreditDays,
    setTxtCreditDays,
    txtShortName,
    setTxtShortName,
    lkpStaff,
    setLkpStaff,
    txtContact,
    setTxtContact,
    txtEMail,
    setTxtEMail,
    txtPhone,
    setTxtPhone,
    branchOptions,
    lkpBranch,
    setLkpBranch,
}) => {
    const commonProps = {
        controlHeight: 30,
        controlFontSize: "12px",
        headerFontSize: "12px",
        borderColor: "#9fdfbc",
        hoverBorderColor: "#9fdfbc",
        menuZIndex: 99999,
        menuPortalTarget: document.body,
        width: "100%",
        menuWidth: "300px",
    };

    /* OPTIONS (built from DB data) */

    const countryOptions = countries.map((c) => ({
        value: c.countryId,
        label: c.countryName,
    }));

    const countryArabicOptions = countries.map((c) => ({
        value: c.countryId,
        label: c.countryNameA || c.countryName,
    }));

    const staffOptions = staffs.map((s) => ({
        value: s.staffId,
        label: s.staffName,
    }));

    return (
        <div className="w-full">
            {/* ENGLISH + ARABIC */}

            <div className="grid grid-cols-1 gap-4 border-b border-slate-300 px-3 pt-1 pb-3 lg:grid-cols-2">
                {/* HEADINGS - ONE COMMON BORDER */}

                <div className="col-span-1 lg:col-span-2 ">
                    <div className="grid grid-cols-1 lg:grid-cols-2">
                        <div className="flex items-center justify-center pb-1">
                            <h3 className="text-[12px] font-semibold text-blue-700">
                                English
                            </h3>
                        </div>

                        <div className="flex items-center justify-center pb-1" dir="rtl">
                            <h3 className="text-[12px] font-semibold text-blue-700">
                                العربية
                            </h3>
                        </div>
                    </div>

                    <div className="relative -left-3 w-[calc(100%+24px)] border-b border-slate-200" />
                </div>

                {/* ENGLISH */}

                <div className="min-w-0 -mt-2">
                    <div className="space-y-1.5">
                        {/* SUPPLIER NAME (always required) */}

                        <div className="grid grid-cols-[92px_minmax(0,1fr)] items-center gap-2">
                            <label
                                htmlFor="txtSupplierName"
                                className="text-[11px] text-slate-600"
                            >
                                Supplier Name
                                <span className="text-red-500">*</span>
                            </label>

                            <input
                                id="txtSupplierName"
                                name="txtSupplierName"
                                type="text"
                                value={txtSupplierName}
                                maxLength={100}
                                onChange={(e) => setTxtSupplierName(e.target.value)}
                                className={inputClass}
                                style={{ width: "100%" }}
                                required
                            />
                        </div>

                        {/* LEGAL NAME */}

                        <div className="grid grid-cols-[92px_minmax(0,1fr)] items-center gap-2">
                            <label
                                htmlFor="txtLegalName"
                                className="text-[11px] text-slate-600"
                            >
                                Legal Name
                                <Star show={isB2B} />
                            </label>

                            <input
                                id="txtLegalName"
                                name="txtLegalName"
                                type="text"
                                value={txtLegalName}
                                maxLength={100}
                                onChange={(e) => setTxtLegalName(e.target.value)}
                                className={inputClass}
                                style={{ width: "100%" }}
                                required={isB2B}
                            />
                        </div>

                        {/* BUILDING NO */}

                        <div className="grid grid-cols-[92px_minmax(0,1fr)] items-center gap-2">
                            <label
                                htmlFor="txtBuildingNo"
                                className="text-[11px] text-slate-600"
                            >
                                Building No.
                                <Star show={isB2B} />
                            </label>

                            <input
                                id="txtBuildingNo"
                                name="txtBuildingNo"
                                type="text"
                                inputMode="numeric"
                                value={txtBuildingNo}
                                maxLength={4}
                                onChange={(e) =>
                                    setTxtBuildingNo(digitsOnly(e.target.value, 4))
                                }
                                className={inputClass}
                                required={isB2B}
                            />
                        </div>

                        {/* STREET NAME */}

                        <div className="grid grid-cols-[92px_minmax(0,1fr)] items-center gap-2">
                            <label
                                htmlFor="txtStreetName"
                                className="text-[11px] text-slate-600"
                            >
                                Street Name
                                <Star show={isB2B} />
                            </label>

                            <input
                                id="txtStreetName"
                                name="txtStreetName"
                                type="text"
                                value={txtStreetName}
                                onChange={(e) => setTxtStreetName(e.target.value)}
                                maxLength={40}
                                className={inputClass}
                                required={isB2B}
                            />
                        </div>

                        {/* DISTRICT */}

                        <div className="grid grid-cols-[92px_minmax(0,1fr)] items-center gap-2">
                            <label
                                htmlFor="txtDistrict"
                                className="text-[11px] text-slate-600"
                            >
                                District
                                <Star show={isB2B} />
                            </label>

                            <input
                                id="txtDistrict"
                                name="txtDistrict"
                                type="text"
                                value={txtDistrict}
                                onChange={(e) => setTxtDistrict(e.target.value)}
                                maxLength={40}
                                className={inputClass}
                                required={isB2B}
                            />
                        </div>

                        {/* CITY */}

                        <div className="grid grid-cols-[92px_minmax(0,1fr)] items-center gap-2">
                            <label htmlFor="txtCity" className="text-[11px] text-slate-600">
                                City
                                <Star show={isB2B} />
                            </label>

                            <input
                                maxLength={40}
                                id="txtCity"
                                name="txtCity"
                                type="text"
                                value={txtCity}
                                onChange={(e) => setTxtCity(e.target.value)}
                                className={inputClass}
                                required={isB2B}
                            />
                        </div>

                        {/* COUNTRY */}

                        <div className="grid grid-cols-[92px_minmax(0,1fr)] items-center gap-2">
                            <label
                                htmlFor="lkpCountry"
                                className="text-[11px] text-slate-600"
                            >
                                Country
                                <Star show={isB2B} />
                            </label>

                            <div className="w-[80%]">
                                <CommonTableSelect
                                    {...commonProps}
                                    inputId="lkpCountry"
                                    options={countryOptions}
                                    value={
                                        countryOptions.find((o) => o.value === lkpCountry) || null
                                    }
                                    columns={[
                                        { key: "label", label: "Country" },
                                        { key: "value", label: "ID", width: "50px" },
                                    ]}
                                    onChange={(selected) => setLkpCountry(selected?.value || "")}
                                    width="100%"
                                    menuWidth="calc(100% + 65px)"
                                />
                            </div>
                        </div>

                        {/* POSTAL CODE */}

                        <div className="grid grid-cols-[92px_minmax(0,1fr)] items-center gap-2">
                            <label
                                htmlFor="txtPostalCode"
                                className="text-[11px] text-slate-600"
                            >
                                Postal Code
                                <Star show={isB2B} />
                            </label>

                            <input
                                maxLength={5}
                                inputMode="numeric"
                                id="txtPostalCode"
                                name="txtPostalCode"
                                type="text"
                                value={txtPostalCode}
                                onChange={(e) =>
                                    setTxtPostalCode(digitsOnly(e.target.value, 5))
                                }
                                className={inputClass}
                                required={isB2B}
                            />
                        </div>

                        {/* ADDITIONAL NO */}

                        <div className="grid grid-cols-[92px_minmax(0,1fr)] items-center gap-2">
                            <label
                                htmlFor="txtAdditionalNo"
                                className="text-[11px] text-slate-600"
                            >
                                Additional No.
                            </label>

                            <input
                                maxLength={4}
                                inputMode="numeric"
                                id="txtAdditionalNo"
                                name="txtAdditionalNo"
                                type="text"
                                value={txtAdditionalNo}
                                onChange={(e) =>
                                    setTxtAdditionalNo(digitsOnly(e.target.value, 4))
                                }
                                className={inputClass}
                            />
                        </div>

                        {/* CR NO */}

                        <div className="grid grid-cols-[92px_minmax(0,1fr)] items-center gap-2">
                            <label htmlFor="txtCRNo" className="text-[11px] text-slate-600">
                                CR No.
                            </label>

                            <input
                                maxLength={20}
                                inputMode="numeric"
                                id="txtCRNo"
                                name="txtCRNo"
                                type="text"
                                value={txtCRNo}
                                onChange={(e) => setTxtCRNo(digitsOnly(e.target.value, 20))}
                                className={inputClass}
                            />
                        </div>

                        {/* VAT NO */}

                        <div className="grid grid-cols-[92px_minmax(0,1fr)] items-center gap-2">
                            <label htmlFor="txtVATNo" className="text-[11px] text-slate-600">
                                VAT No.
                                <Star show={isB2B} />
                            </label>

                            <input
                                maxLength={15}
                                inputMode="numeric"
                                id="txtVATNo"
                                name="txtVATNo"
                                type="text"
                                value={txtVATNo}
                                onChange={(e) => setTxtVATNo(digitsOnly(e.target.value, 15))}
                                className={inputClass}
                                required={isB2B}
                            />
                        </div>
                    </div>
                </div>

                {/* ARABIC */}

                <div className="min-w-0 -mt-2" dir="rtl">
                    <div className="space-y-1.5">
                        {/* SUPPLIER NAME */}

                        <div className="grid grid-cols-[92px_minmax(0,1fr)] items-center gap-2">
                            <label
                                htmlFor="txtSupplierName_AR"
                                className="text-left text-[11px] text-slate-600"
                            >
                                اسم المورد
                                <Star show={isB2B} />
                            </label>

                            <input
                                id="txtSupplierName_AR"
                                name="txtSupplierName_AR"
                                type="text"
                                maxLength={100}
                                value={txtSupplierName_AR}
                                onChange={(e) => setTxtSupplierName_AR(e.target.value)}
                                dir="rtl"
                                className={arabicInputClass}
                                style={{ width: "100%" }}
                                required={isB2B}
                            />
                        </div>

                        {/* LEGAL NAME */}

                        <div className="grid grid-cols-[92px_minmax(0,1fr)] items-center gap-2">
                            <label
                                htmlFor="txtLegalName_AR"
                                className="text-left text-[11px] text-slate-600"
                            >
                                الاسم القانوني
                                <Star show={isB2B} />
                            </label>

                            <input
                                id="txtLegalName_AR"
                                name="txtLegalName_AR"
                                type="text"
                                value={txtLegalName_AR}
                                onChange={(e) => setTxtLegalName_AR(e.target.value)}
                                maxLength={100}
                                dir="rtl"
                                className={arabicInputClass}
                                style={{ width: "100%" }}
                                required={isB2B}
                            />
                        </div>

                        {/* BUILDING NO */}

                        <div className="grid grid-cols-[92px_minmax(0,1fr)] items-center gap-2">
                            <label
                                htmlFor="txtBuildingNo_AR"
                                className="text-left text-[11px] text-slate-600"
                            >
                                رقم المبنى
                                <Star show={isB2B} />
                            </label>

                            <input
                                id="txtBuildingNo_AR"
                                name="txtBuildingNo_AR"
                                type="text"
                                inputMode="numeric"
                                value={txtBuildingNo_AR}
                                onChange={(e) =>
                                    setTxtBuildingNo_AR(digitsOnly(e.target.value, 4))
                                }
                                maxLength={4}
                                dir="rtl"
                                className={arabicInputClass}
                                required={isB2B}
                            />
                        </div>

                        {/* STREET NAME */}

                        <div className="grid grid-cols-[92px_minmax(0,1fr)] items-center gap-2">
                            <label
                                htmlFor="txtStreetName_AR"
                                className="text-left text-[11px] text-slate-600"
                            >
                                اسم الشارع
                                <Star show={isB2B} />
                            </label>

                            <input
                                id="txtStreetName_AR"
                                name="txtStreetName_AR"
                                type="text"
                                value={txtStreetName_AR}
                                onChange={(e) => setTxtStreetName_AR(e.target.value)}
                                maxLength={40}
                                dir="rtl"
                                className={arabicInputClass}
                                required={isB2B}
                            />
                        </div>

                        {/* DISTRICT */}

                        <div className="grid grid-cols-[92px_minmax(0,1fr)] items-center gap-2">
                            <label
                                htmlFor="txtDistrict_AR"
                                className="text-left text-[11px] text-slate-600"
                            >
                                الحي
                                <Star show={isB2B} />
                            </label>

                            <input
                                id="txtDistrict_AR"
                                name="txtDistrict_AR"
                                type="text"
                                value={txtDistrict_AR}
                                onChange={(e) => setTxtDistrict_AR(e.target.value)}
                                maxLength={40}
                                dir="rtl"
                                className={arabicInputClass}
                                required={isB2B}
                            />
                        </div>

                        {/* CITY */}

                        <div className="grid grid-cols-[92px_minmax(0,1fr)] items-center gap-2">
                            <label
                                htmlFor="txtCity_AR"
                                className="text-left text-[11px] text-slate-600"
                            >
                                المدينة
                                <Star show={isB2B} />
                            </label>

                            <input
                                id="txtCity_AR"
                                name="txtCity_AR"
                                type="text"
                                value={txtCity_AR}
                                onChange={(e) => setTxtCity_AR(e.target.value)}
                                maxLength={40}
                                dir="rtl"
                                className={arabicInputClass}
                                required={isB2B}
                            />
                        </div>

                        {/* COUNTRY */}

                        <div className="grid grid-cols-[92px_minmax(0,1fr)] items-center gap-2">
                            <label
                                htmlFor="lkpCountry_AR"
                                className="text-left text-[11px] text-slate-600"
                            >
                                الدولة
                                <Star show={isB2B} />
                            </label>

                            <div className="w-[80%]">
                                <CommonTableSelect
                                    {...commonProps}
                                    inputId="lkpCountry_AR"
                                    options={countryArabicOptions}
                                    value={
                                        countryArabicOptions.find(
                                            (o) => o.value === lkpCountry_AR,
                                        ) || null
                                    }
                                    columns={[
                                        { key: "label", label: "الدولة" },
                                        { key: "value", label: "ID", width: "50px" },
                                    ]}
                                    onChange={(selected) =>
                                        setLkpCountry_AR(selected?.value || "")
                                    }
                                    width="100%"
                                    menuWidth="calc(100% + 65px)"
                                />
                            </div>
                        </div>

                        {/* POSTAL CODE */}

                        <div className="grid grid-cols-[92px_minmax(0,1fr)] items-center gap-2">
                            <label
                                htmlFor="txtPostalCode_AR"
                                className="text-left text-[11px] text-slate-600"
                            >
                                الرمز البريدي
                                <Star show={isB2B} />
                            </label>

                            <input
                                id="txtPostalCode_AR"
                                name="txtPostalCode_AR"
                                type="text"
                                value={txtPostalCode_AR}
                                onChange={(e) => setTxtPostalCode_AR(e.target.value)}
                                maxLength={7}
                                dir="rtl"
                                className={arabicInputClass}
                                required={isB2B}
                            />
                        </div>

                        {/* ADDITIONAL NO */}

                        <div className="grid grid-cols-[92px_minmax(0,1fr)] items-center gap-2">
                            <label
                                htmlFor="txtAdditionalNo_AR"
                                className="text-left text-[11px] text-slate-600"
                            >
                                الرقم الإضافي
                            </label>

                            <input
                                id="txtAdditionalNo_AR"
                                name="txtAdditionalNo_AR"
                                type="text"
                                value={txtAdditionalNo_AR}
                                onChange={(e) => setTxtAdditionalNo_AR(e.target.value)}
                                maxLength={6}
                                dir="rtl"
                                className={arabicInputClass}
                            />
                        </div>

                        {/* CR NO */}

                        <div className="grid grid-cols-[92px_minmax(0,1fr)] items-center gap-2">
                            <label
                                htmlFor="txtCRNo_AR"
                                className="text-left text-[11px] text-slate-600"
                            >
                                رقم السجل التجاري
                            </label>

                            <input
                                maxLength={20}
                                id="txtCRNo_AR"
                                name="txtCRNo_AR"
                                type="text"
                                value={txtCRNo_AR}
                                onChange={(e) => setTxtCRNo_AR(e.target.value)}
                                dir="rtl"
                                className={arabicInputClass}
                            />
                        </div>

                        {/* VAT NO */}

                        <div className="grid grid-cols-[92px_minmax(0,1fr)] items-center gap-2">
                            <label
                                htmlFor="txtVATNo_AR"
                                className="text-left text-[11px] text-slate-600"
                            >
                                الرقم الضريبي
                                <Star show={isB2B} />
                            </label>

                            <input
                                maxLength={15}
                                id="txtVATNo_AR"
                                name="txtVATNo_AR"
                                type="text"
                                value={txtVATNo_AR}
                                onChange={(e) => setTxtVATNo_AR(e.target.value)}
                                dir="rtl"
                                className={arabicInputClass}
                                required={isB2B}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* OTHER SUPPLIER DETAILS */}

            <div className="p-3">
                <div
                    className="mr-[6.2rem] grid grid-cols-[92px_minmax(0,1fr)] items-center gap-x-2 gap-y-1.5
          lg:grid-cols-[92px_96px_100px_56px_84px_minmax(0,1fr)_50px_240px]"
                >
                    {/* ---------- ROW 1 ---------- */}

                    <label htmlFor="txtCreditLimit" className="text-[11px] text-slate-600">
                        Credit Limit
                    </label>
                    <input
                        id="txtCreditLimit"
                        name="txtCreditLimit"
                        type="text"
                        value={txtCreditLimit}
                        onChange={(e) => setTxtCreditLimit(e.target.value)}
                        className={inputClass}
                        style={{ width: "100%" }}
                    />

                    <label
                        htmlFor="txtCreditDays"
                        className="whitespace-nowrap text-[11px] text-slate-600 lg:pl-6"
                    >
                        Credit Days
                    </label>
                    <input
                        id="txtCreditDays"
                        name="txtCreditDays"
                        maxLength={3}
                        type="text"
                        value={txtCreditDays}
                        onChange={(e) => setTxtCreditDays(e.target.value)}
                        className={inputClass}
                        style={{ width: "100%" }}
                    />

                    <label
                        htmlFor="txtShortName"
                        className="whitespace-nowrap text-[11px] text-slate-600 lg:pl-2"
                    >
                        Short Name
                    </label>
                    <input
                        id="txtShortName"
                        name="txtShortName"
                        type="text"
                        value={txtShortName}
                        onChange={(e) => setTxtShortName(e.target.value)}
                        maxLength={20}
                        className={inputClass}
                        style={{ width: "100%" }}
                    />

                    <label htmlFor="lkpStaff" className="text-[11px] text-slate-600">
                        Staff
                    </label>
                    <div className="w-full min-w-0">
                        <CommonTableSelect
                            {...commonProps}
                            inputId="lkpStaff"
                            options={staffOptions}
                            value={staffOptions.find((o) => o.value === lkpStaff) || null}
                            columns={[
                                { key: "label", label: "Staff Name" },
                                { key: "value", label: "ID", width: "50px" },
                            ]}
                            onChange={(selected) => setLkpStaff(selected?.value || "")}
                            width="100%"
                            menuWidth="calc(100% + 50px)"
                        />
                    </div>

                    {/* ---------- ROW 2 ---------- */}

                    <label htmlFor="txtContact" className="text-[11px] text-slate-600">
                        Contact
                    </label>
                    <input
                        maxLength={80}
                        id="txtContact"
                        name="txtContact"
                        type="text"
                        value={txtContact}
                        onChange={(e) => setTxtContact(e.target.value)}
                        className={`${inputClass} lg:col-span-5`}
                        style={{ width: "100%" }}
                    />

                    <label htmlFor="lkpBranch" className="text-[11px] text-slate-600">
                        Branch
                    </label>
                    <div className="w-full min-w-0">
                        <CommonTableSelect
                            {...commonProps}
                            inputId="lkpBranch"
                            options={branchOptions}
                            value={branchOptions.find((o) => o.value === lkpBranch) || null}
                            columns={[
                                { key: "label", label: "Branch" },
                                { key: "value", label: "ID", width: "50px" },
                            ]}
                            onChange={(selected) => setLkpBranch(selected?.value || "")}
                            width="100%"
                            menuWidth="calc(100% + 50px)"
                        />
                    </div>

                    {/* ---------- E-MAIL ---------- */}

                    <label htmlFor="txtEMail" className="text-[11px] text-slate-600">
                        E-Mail
                    </label>
                    <input
                        maxLength={120}
                        id="txtEMail"
                        name="txtEMail"
                        type="text"
                        value={txtEMail}
                        onChange={(e) => setTxtEMail(e.target.value)}
                        className={`${inputClass} lg:col-span-7`}
                        style={{ width: "100%" }}
                    />

                    {/* ---------- PHONE ---------- */}

                    <label htmlFor="txtPhone" className="text-[11px] text-slate-600">
                        Phone
                    </label>
                    <input
                        maxLength={60}
                        id="txtPhone"
                        name="txtPhone"
                        type="text"
                        value={txtPhone}
                        onChange={(e) => setTxtPhone(e.target.value)}
                        className={`${inputClass} lg:col-span-7`}
                        style={{ width: "100%" }}
                    />
                </div>
            </div>
        </div>
    );
};

export default SupplierMiddle;