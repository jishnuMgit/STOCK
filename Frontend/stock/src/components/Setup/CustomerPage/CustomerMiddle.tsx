import React from "react";
import Select, { components } from "react-select";

/* =========================================================
   TYPES
========================================================= */

interface CustomerMiddleProps {
  /* English */
  txtCustomerName: string;
  setTxtCustomerName: React.Dispatch<React.SetStateAction<string>>;

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
  txtCustomerName_AR: string;
  setTxtCustomerName_AR: React.Dispatch<React.SetStateAction<string>>;

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

  /* Other Customer Details */
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
}

/* =========================================================
   OPTIONS
========================================================= */

const countryOptions = [
  {
    value: "UAE",
    label: "United Arab Emirates",
  },
  {
    value: "INDIA",
    label: "India",
  },
  {
    value: "SAUDI",
    label: "Saudi Arabia",
  },
  {
    value: "QATAR",
    label: "Qatar",
  },
];

const countryArabicOptions = [
  {
    value: "UAE",
    label: "الإمارات العربية المتحدة",
  },
  {
    value: "INDIA",
    label: "الهند",
  },
  {
    value: "SAUDI",
    label: "المملكة العربية السعودية",
  },
  {
    value: "QATAR",
    label: "قطر",
  },
];

const staffOptions = [
  {
    value: "staff1",
    label: "Staff 1",
  },
  {
    value: "staff2",
    label: "Staff 2",
  },
  {
    value: "staff3",
    label: "Staff 3",
  },
];

/* =========================================================
   SELECT STYLES
========================================================= */

const selectStyles = {
  control: (base: any) => ({
    ...base,
    minHeight: "27px",
    height: "30px",
    borderRadius: "0px",
    borderColor: "#94a3b8",
    boxShadow: "none",
    fontSize: "12px",
    backgroundColor: "#ffffff",
    cursor: "pointer",
  }),

  valueContainer: (base: any) => ({
    ...base,
    height: "30px",
    padding: "0 8px",
  }),

  input: (base: any) => ({
    ...base,
    margin: "0px",
    padding: "0px",
    fontSize: "12px",
  }),

  singleValue: (base: any) => ({
    ...base,
    fontSize: "12px",
    color: "#334155",
  }),

  placeholder: (base: any) => ({
    ...base,
    fontSize: "12px",
    color: "#94a3b8",
  }),

  indicatorsContainer: (base: any) => ({
    ...base,
    height: "30px",
  }),

  dropdownIndicator: (base: any) => ({
    ...base,
    padding: "4px 6px",
  }),

  clearIndicator: (base: any) => ({
    ...base,
    padding: "4px",
  }),

  menu: (base: any) => ({
    ...base,
    zIndex: 9999,
    fontSize: "12px",
  }),

  menuPortal: (base: any) => ({
    ...base,
    zIndex: 99999,
  }),

  option: (base: any, state: any) => ({
    ...base,
    fontSize: "12px",
    padding: "6px 8px",
    backgroundColor: state.isFocused ? "#e2e8f0" : "#ffffff",
    color: "#334155",
    cursor: "pointer",
  }),
};

/* =========================================================
   CUSTOM DROPDOWN INDICATOR
========================================================= */

const CustomDropdownIndicator = (props: any) => {
  return (
    <components.DropdownIndicator {...props}>
      <span
        style={{
          fontSize: "9px",
          color: "#64748b",
        }}
      >
        ▼
      </span>
    </components.DropdownIndicator>
  );
};

/* =========================================================
   INPUT CLASSES
========================================================= */

const inputClass = `h-[30px] w-full md:w-[70%] rounded-none border border-slate-400 bg-white px-2 text-[12px] text-slate-700
  outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200`;

const arabicInputClass = `
  ${inputClass}
  text-right
`;

/* =========================================================
   COMPONENT
========================================================= */

const CustomerMiddle: React.FC<CustomerMiddleProps> = ({
  /* =======================================================
     ENGLISH
  ======================================================= */

  txtCustomerName,
  setTxtCustomerName,

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

  /* =======================================================
     ARABIC
  ======================================================= */

  txtCustomerName_AR,
  setTxtCustomerName_AR,

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

  /* =======================================================
     OTHER
  ======================================================= */

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
}) => {
  return (
    <div className="w-full">
      {/* =====================================================
          ENGLISH + ARABIC
      ===================================================== */}

      <div className="grid grid-cols-1 gap-4 border-b border-slate-300 p-3 lg:grid-cols-2">
        {/* ===================================================
            ENGLISH
        =================================================== */}

        <div className="min-w-0">
          <div className="mb-2 border-b border-slate-300 pb-1 flex justify-center items-center">
            <h3 className="text-[12px] font-semibold text-blue-700">English</h3>
          </div>

          <div className="space-y-1.5">
            {/* CUSTOMER NAME */}

            <div className="grid grid-cols-[92px_minmax(0,1fr)] items-center gap-2">
              <label
                htmlFor="txtCustomerName"
                className="text-[11px] text-slate-600"
              >
                Customer Name
                <span className="text-red-500">*</span>
              </label>

              <input
                id="txtCustomerName"
                name="txtCustomerName"
                type="text"
                value={txtCustomerName}
                maxLength={100}
                onChange={(e) => setTxtCustomerName(e.target.value)}
                className={inputClass}
                style={{ width: "100%" }}
              />
            </div>

            {/* LEGAL NAME */}

            <div className="grid grid-cols-[92px_minmax(0,1fr)] items-center gap-2">
              <label
                htmlFor="txtLegalName"
                className="text-[11px] text-slate-600"
              >
                Legal Name
                <span className="text-red-500">*</span>
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
              />
            </div>

            {/* BUILDING NO */}

            <div className="grid grid-cols-[92px_minmax(0,1fr)] items-center gap-2">
              <label
                htmlFor="txtBuildingNo"
                className="text-[11px] text-slate-600"
              >
                Building No.
                <span className="text-red-500">*</span>
              </label>

              <input
                id="txtBuildingNo"
                name="txtBuildingNo"
                type="text"
                value={txtBuildingNo}
                maxLength={6}
                onChange={(e) => setTxtBuildingNo(e.target.value)}
                className={inputClass}
              />
            </div>

            {/* STREET NAME */}

            <div className="grid grid-cols-[92px_minmax(0,1fr)] items-center gap-2">
              <label
                htmlFor="txtStreetName"
                className="text-[11px] text-slate-600"
              >
                Street Name
                <span className="text-red-500">*</span>
              </label>

              <input
                id="txtStreetName"
                name="txtStreetName"
                type="text"
                value={txtStreetName}
                onChange={(e) => setTxtStreetName(e.target.value)}
                maxLength={40}
                className={inputClass}
              />
            </div>

            {/* DISTRICT */}

            <div className="grid grid-cols-[92px_minmax(0,1fr)] items-center gap-2">
              <label
                htmlFor="txtDistrict"
                className="text-[11px] text-slate-600"
              >
                District
                <span className="text-red-500">*</span>
              </label>

              <input
                id="txtDistrict"
                name="txtDistrict"
                type="text"
                value={txtDistrict}
                onChange={(e) => setTxtDistrict(e.target.value)}
                maxLength={40}
                className={inputClass}
              />
            </div>

            {/* CITY */}

            <div className="grid grid-cols-[92px_minmax(0,1fr)] items-center gap-2">
              <label htmlFor="txtCity" className="text-[11px] text-slate-600">
                City
                <span className="text-red-500">*</span>
              </label>

              <input
                maxLength={40}
                id="txtCity"
                name="txtCity"
                type="text"
                value={txtCity}
                onChange={(e) => setTxtCity(e.target.value)}
                className={inputClass}
              />
            </div>

            {/* COUNTRY */}

            <div className="grid grid-cols-[92px_minmax(0,1fr)] items-center gap-2">
              <label
                htmlFor="lkpCountry"
                className="text-[11px] text-slate-600"
              >
                Country
                <span className="text-red-500">*</span>
              </label>

              <div className="w-[70%]">
                <Select
                  inputId="lkpCountry"
                  name="lkpCountry"
                  options={countryOptions}
                  value={
                    countryOptions.find(
                      (option) => option.value === lkpCountry,
                    ) || null
                  }
                  onChange={(selected) => setLkpCountry(selected?.value || "")}
                  styles={selectStyles}
                  components={{
                    DropdownIndicator: CustomDropdownIndicator,
                    IndicatorSeparator: () => null,
                  }}
                  menuPortalTarget={document.body}
                  menuPosition="fixed"
                  isSearchable
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
                <span className="text-red-500">*</span>
              </label>

              <input
                maxLength={7}
                id="txtPostalCode"
                name="txtPostalCode"
                type="text"
                value={txtPostalCode}
                onChange={(e) => setTxtPostalCode(e.target.value)}
                className={inputClass}
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
                maxLength={6}
                id="txtAdditionalNo"
                name="txtAdditionalNo"
                type="text"
                value={txtAdditionalNo}
                onChange={(e) => setTxtAdditionalNo(e.target.value)}
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
                id="txtCRNo"
                name="txtCRNo"
                type="text"
                value={txtCRNo}
                onChange={(e) => setTxtCRNo(e.target.value)}
                className={inputClass}
              />
            </div>

            {/* VAT NO */}

            <div className="grid grid-cols-[92px_minmax(0,1fr)] items-center gap-2">
              <label htmlFor="txtVATNo" className="text-[11px] text-slate-600">
                VAT No.
                <span className="text-red-500">*</span>
              </label>

              <input
                maxLength={15}
                id="txtVATNo"
                name="txtVATNo"
                type="text"
                value={txtVATNo}
                onChange={(e) => setTxtVATNo(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
        </div>

        {/* ===================================================
            ARABIC
        =================================================== */}

        <div className="min-w-0" dir="rtl">
          <div className="mb-2 border-b border-slate-300 pb-1 flex justify-center items-center">
            <h3 className="text-[12px] font-semibold text-blue-700 text-left">
              العربية
            </h3>
          </div>

          <div className="space-y-1.5">
            {/* =================================================
               CUSTOMER NAME
               LABEL LEFT | INPUT RIGHT
               ================================================= */}

            <div className="grid grid-cols-[92px_minmax(0,1fr)] items-center gap-2">
              {/* LABEL - LEFT */}
              <label
                htmlFor="txtCustomerName_AR"
                className="text-left text-[11px] text-slate-600"
              >
                اسم العميل
                <span className="text-red-500">*</span>
              </label>

              {/* INPUT - RIGHT */}
              <input
                id="txtCustomerName_AR"
                name="txtCustomerName_AR"
                type="text"
                maxLength={100}
                value={txtCustomerName_AR}
                onChange={(e) => setTxtCustomerName_AR(e.target.value)}
                dir="rtl"
                className={arabicInputClass}
                style={{ width: "100%" }}
              />
            </div>

            {/* =================================================
               LEGAL NAME
            ================================================= */}

            <div className="grid grid-cols-[92px_minmax(0,1fr)] items-center gap-2">
              <label
                htmlFor="txtLegalName_AR"
                className="text-left text-[11px] text-slate-600"
              >
                الاسم القانوني
                <span className="text-red-500">*</span>
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
              />
            </div>

            {/* =================================================
               BUILDING NO
            ================================================= */}

            <div className="grid grid-cols-[92px_minmax(0,1fr)] items-center gap-2">
              <label
                htmlFor="txtBuildingNo_AR"
                className="text-left text-[11px] text-slate-600"
              >
                رقم المبنى
                <span className="text-red-500">*</span>
              </label>

              <input
                id="txtBuildingNo_AR"
                name="txtBuildingNo_AR"
                type="text"
                value={txtBuildingNo_AR}
                onChange={(e) => setTxtBuildingNo_AR(e.target.value)}
                maxLength={6}
                dir="rtl"
                className={arabicInputClass}
              />
            </div>

            {/* =================================================
               STREET NAME
             ================================================= */}

            <div className="grid grid-cols-[92px_minmax(0,1fr)] items-center gap-2">
              <label
                htmlFor="txtStreetName_AR"
                className="text-left text-[11px] text-slate-600"
              >
                اسم الشارع
                <span className="text-red-500">*</span>
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
              />
            </div>

            {/* =================================================
               DISTRICT
            ================================================= */}

            <div className="grid grid-cols-[92px_minmax(0,1fr)] items-center gap-2">
              <label
                htmlFor="txtDistrict_AR"
                className="text-left text-[11px] text-slate-600"
              >
                الحي
                <span className="text-red-500">*</span>
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
              />
            </div>

            {/* =================================================
              CITY
            ================================================= */}

            <div className="grid grid-cols-[92px_minmax(0,1fr)] items-center gap-2">
              <label
                htmlFor="txtCity_AR"
                className="text-left text-[11px] text-slate-600"
              >
                المدينة
                <span className="text-red-500">*</span>
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
              />
            </div>

            {/* =================================================
               COUNTRY
               LABEL LEFT | SELECT RIGHT
            ================================================= */}

            <div className="grid grid-cols-[92px_minmax(0,1fr)] items-center gap-2">
              {/* LABEL - LEFT */}
              <label
                htmlFor="lkpCountry_AR"
                className="text-left text-[11px] text-slate-600"
              >
                الدولة
                <span className="text-red-500">*</span>
              </label>

              {/* SELECT - RIGHT */}
              <div className="w-[70%]">
                <Select
                  inputId="lkpCountry_AR"
                  name="lkpCountry_AR"
                  options={countryArabicOptions}
                  value={
                    countryArabicOptions.find(
                      (option) => option.value === lkpCountry_AR,
                    ) || null
                  }
                  onChange={(selected) =>
                    setLkpCountry_AR(selected?.value || "")
                  }
                  styles={{
                    ...selectStyles,

                    singleValue: (base: any) => ({
                      ...base,
                      fontSize: "12px",
                      color: "#334155",
                      direction: "rtl",
                      textAlign: "right",
                    }),

                    placeholder: (base: any) => ({
                      ...base,
                      fontSize: "12px",
                      color: "#94a3b8",
                      direction: "rtl",
                      textAlign: "right",
                    }),

                    input: (base: any) => ({
                      ...base,
                      direction: "rtl",
                      textAlign: "right",
                      width: "70%",
                    }),

                    option: (base: any, state: any) => ({
                      ...base,
                      fontSize: "12px",
                      padding: "6px 8px",
                      backgroundColor: state.isFocused ? "#e2e8f0" : "#ffffff",
                      color: "#334155",
                      cursor: "pointer",
                      direction: "rtl",
                      textAlign: "right",
                    }),
                  }}
                  components={{
                    DropdownIndicator: CustomDropdownIndicator,
                    IndicatorSeparator: () => null,
                  }}
                  menuPortalTarget={document.body}
                  menuPosition="fixed"
                  isSearchable
                />
              </div>
            </div>

            {/* =================================================
              POSTAL CODE
            ================================================= */}

            <div className="grid grid-cols-[92px_minmax(0,1fr)] items-center gap-2">
              <label
                htmlFor="txtPostalCode_AR"
                className="text-left text-[11px] text-slate-600"
              >
                الرمز البريدي
                <span className="text-red-500">*</span>
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
              />
            </div>

            {/* =================================================
              ADDITIONAL NO
            ================================================= */}

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

            {/* =================================================
              CR NO
            ================================================= */}

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

            {/* =================================================
             VAT NO
            ================================================= */}

            <div className="grid grid-cols-[92px_minmax(0,1fr)] items-center gap-2">
              <label
                htmlFor="txtVATNo_AR"
                className="text-left text-[11px] text-slate-600"
              >
                الرقم الضريبي
                <span className="text-red-500">*</span>
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
              />
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================
          OTHER CUSTOMER DETAILS
      ===================================================== */}

      <div className="p-3">
        <div className="grid grid-cols-1 gap-x-2 gap-y-1.5 md:grid-cols-2 lg:grid-cols-4 mr-[6.2rem]">
          {/* =================================================
           CREDIT LIMIT
          ================================================= */}

          <div className="grid grid-cols-[92px_minmax(0,1fr)] items-center gap-2">
            <label
              htmlFor="txtCreditLimit"
              className="text-[11px] text-slate-600"
            >
              Credit Limit
            </label>

            <input
              id="txtCreditLimit"
              name="txtCreditLimit"
              type="text"
              value={txtCreditLimit}
              onChange={(e) => setTxtCreditLimit(e.target.value)}
              className={inputClass}
              style={{ width: "70%" }}
            />
          </div>

          {/* =================================================
             CREDIT DAYS
          ================================================= */}

          <div className="grid grid-cols-[55px_minmax(0,1fr)] items-center gap-2">
            <label
              htmlFor="txtCreditDays"
              className="text-[11px] text-slate-600 whitespace-nowrap -ml-1.5"
            >
              Credit Days
            </label>

            <input
              id="txtCreditDays"
              name="txtCreditDays"
              type="text"
              value={txtCreditDays}
              onChange={(e) => setTxtCreditDays(e.target.value)}
              className={inputClass}
              style={{ width: "50%" }}
            />
          </div>

          {/* =================================================
            SHORT NAME
          ================================================= */}

          <div className="relative -left-[65px] grid grid-cols-[60px_minmax(0,1fr)] items-center gap-2">
            <label
              htmlFor="txtShortName"
              className="text-[11px] text-slate-600 whitespace-nowrap"
            >
              Short Name
            </label>

            <input
              id="txtShortName"
              name="txtShortName"
              type="text"
              value={txtShortName}
              onChange={(e) => setTxtShortName(e.target.value)}
              maxLength={30}
              className={inputClass}
              style={{ width: "100%" }}
            />
          </div>

          {/* =================================================
            STAFF
          ================================================= */}

          <div className="grid grid-cols-[25px_minmax(0,1fr)] items-center gap-2">
            <label htmlFor="lkpStaff" className="text-[11px] text-slate-600">
              Staff
            </label>

            <div className="w-full min-w-0">
              <Select
                inputId="lkpStaff"
                name="lkpStaff"
                options={staffOptions}
                value={
                  staffOptions.find((option) => option.value === lkpStaff) ||
                  null
                }
                onChange={(selected) => setLkpStaff(selected?.value || "")}
                styles={selectStyles}
                components={{
                  DropdownIndicator: CustomDropdownIndicator,
                  IndicatorSeparator: () => null,
                }}
                menuPortalTarget={document.body}
                menuPosition="fixed"
                isSearchable
              />
            </div>
          </div>

          {/* =================================================
             CONTACT - FULL WIDTH
          ================================================= */}

          <div className="lg:col-span-4 grid grid-cols-[92px_minmax(0,1fr)] items-center gap-2">
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
              className={inputClass}
              style={{ width: "100%" }}
            />
          </div>

          {/* =================================================
            E-MAIL - FULL WIDTH
          ==== ============================================= */}

          <div className="lg:col-span-4 grid grid-cols-[92px_minmax(0,1fr)] items-center gap-2">
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
              className={inputClass}
              style={{ width: "100%" }}
            />
          </div>

          {/* =================================================
             PHONE - FULL WIDTH
          ================================================= */}

          <div className="lg:col-span-4 grid grid-cols-[92px_minmax(0,1fr)] items-center gap-2">
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
              className={inputClass}
              style={{ width: "100%" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerMiddle;
