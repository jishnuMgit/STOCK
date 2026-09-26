import React, { useState } from "react";
import Select, {
  type SingleValue,
  type StylesConfig,
} from "react-select";

/* =========================================================
   TYPES
========================================================= */

interface SelectOption {
  value: string;
  label: string;
}

/* =========================================================
   REUSABLE TEXT ROW

   IMPORTANT:
   This component is OUTSIDE SetBranchInfo so it is not
   recreated on every keystroke. This keeps the input focused
   while typing continuously.
========================================================= */

interface BranchTextRowProps {
  labelEn: string;
  labelAr: string;
  idEn: string;
  idAr: string;
  valueEn: string;
  setValueEn: (value: string) => void;
  valueAr: string;
  setValueAr: (value: string) => void;
  maxLength: number;
  inputWidth: number;
}

const BranchTextRow: React.FC<BranchTextRowProps> = ({
  labelEn,
  labelAr,
  idEn,
  idAr,
  valueEn,
  setValueEn,
  valueAr,
  setValueAr,
  maxLength,
  inputWidth,
}) => {
  const rowGrid =
    "grid grid-cols-[120px_460px_460px_80px] items-center gap-3";

  const inputClass = `
    h-[32px]
    rounded-[6px]
    border
    border-slate-300
    bg-white
    px-3
    text-[13px]
    text-slate-700
    outline-none
    focus:border-blue-500
    focus:ring-2
    focus:ring-blue-100
  `;

  const labelEnglishClass = `
    whitespace-nowrap
    text-left
    text-[13px]
    text-slate-600
  `;

  const labelArabicClass = `
    whitespace-nowrap
    text-right
    text-[13px]
    text-slate-600
  `;



  return (
    <div
      className={`
        ${rowGrid}
        mb-3
      `}
    >
      <label
        htmlFor={idEn}
        className={labelEnglishClass}
      >
        {labelEn} :
      </label>

      <div className="flex w-[460px] justify-start">
        <input
          id={idEn}
          name={idEn}
          type="text"
          value={valueEn}
          maxLength={maxLength}
          onChange={(e) => setValueEn(e.target.value)}
          className={inputClass}
          style={{ width: `${inputWidth}px` }}
        />
      </div>

      <div className="flex w-[460px] justify-end">
        <input
          id={idAr}
          name={idAr}
          type="text"
          dir="rtl"
          value={valueAr}
          maxLength={maxLength}
          onChange={(e) => setValueAr(e.target.value)}
          className={`${inputClass} text-right`}
          style={{ width: `${inputWidth}px` }}
        />
      </div>

      <label
        htmlFor={idAr}
        dir="rtl"
        className={labelArabicClass}
      >
        {labelAr} :
      </label>
    </div>
  );
};

/* =========================================================
   COMPONENT
========================================================= */

const SetBranchInfo: React.FC = () => {
  /* =========================================================
     STATES
  ========================================================= */

  const [lkpBranch, setLkpBranch] = useState("");
  const [lkpBranch_Ar, setLkpBranch_Ar] = useState("");

  const [txtBuildingNo, setTxtBuildingNo] = useState("");
  const [txtBuildingNo_Ar, setTxtBuildingNo_Ar] =
    useState("");

  const [txtStreetName, setTxtStreetName] = useState("");
  const [txtStreetName_Ar, setTxtStreetName_Ar] =
    useState("");

  const [txtDistrict, setTxtDistrict] = useState("");
  const [txtDistrict_Ar, setTxtDistrict_Ar] =
    useState("");

  const [txtCity, setTxtCity] = useState("");
  const [txtCity_Ar, setTxtCity_Ar] =
    useState("");

  const [txtCountry, setTxtCountry] = useState("");
  const [txtCountry_Ar, setTxtCountry_Ar] =
    useState("");

  const [txtPostalCode, setTxtPostalCode] =
    useState("");
  const [txtPostalCode_Ar, setTxtPostalCode_Ar] =
    useState("");

  const [txtAdditionalNo, setTxtAdditionalNo] =
    useState("");
  const [txtAdditionalNo_Ar, setTxtAdditionalNo_Ar] =
    useState("");

  const [txtCRNo, setTxtCRNo] = useState("");
  const [txtCRNo_Ar, setTxtCRNo_Ar] =
    useState("");

  const [txtLicenceNo, setTxtLicenceNo] =
    useState("");
  const [txtLicenceNo_Ar, setTxtLicenceNo_Ar] =
    useState("");

  const [txtLicenceCategory, setTxtLicenceCategory] =
    useState("");
  const [
    txtLicenceCategory_Ar,
    setTxtLicenceCategory_Ar,
  ] = useState("");

  const [txtAddress1, setTxtAddress1] =
    useState("");
  const [txtAddress1_Ar, setTxtAddress1_Ar] =
    useState("");

  const [txtAddress2, setTxtAddress2] =
    useState("");
  const [txtAddress2_Ar, setTxtAddress2_Ar] =
    useState("");

  const [txtAddress3, setTxtAddress3] =
    useState("");
  const [txtAddress3_Ar, setTxtAddress3_Ar] =
    useState("");

  const [txtAddress4, setTxtAddress4] =
    useState("");
  const [txtAddress4_Ar, setTxtAddress4_Ar] =
    useState("");

  const [chkHeadOffice, setChkHeadOffice] =
    useState(false);

  /* =========================================================
     OPTIONS
  ========================================================= */
const buttonClass = `
  min-w-[120px]
      h-[40px]
      rounded-[4px]
      border-l
      border-r
      border-b
      border-[#9db8d4]
      border-t-0
      bg-gradient-to-b
      from-[#ffffff]
      to-[#e7eef5]
      px-4
      text-[18px]
      shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]
      transition-colors
      duration-100
      hover:border-l-[#7f9fbd]
      hover:border-r-[#7f9fbd]
      hover:border-b-[#7f9fbd]
      hover:bg-gradient-to-b
      hover:from-[#ffffff]
      hover:to-[#dce8f1]
      focus:border-l-[#20884e]
      focus:border-r-[#20884e]
      focus:border-b-[#20884e]
      focus:border-t-0
      focus:bg-gradient-to-b
      focus:from-[#ffffff]
      focus:to-[#dcefe5]
      focus:outline-none
      focus:ring-0
`;

const textClass = `
  text-[18px] text-green-600
`;
  
  const branchOptions: SelectOption[] = [
    {
      value: "JEDDAH",
      label: "JEDDAH",
    },
    {
      value: "RIYADH",
      label: "RIYADH",
    },
    {
      value: "DAMMAM",
      label: "DAMMAM",
    },
  ];

  const branchOptions_Ar: SelectOption[] = [
    {
      value: "JEDDAH",
      label: "جدة",
    },
    {
      value: "RIYADH",
      label: "الرياض",
    },
    {
      value: "DAMMAM",
      label: "الدمام",
    },
  ];

  /* =========================================================
     FIELD WIDTHS

     IMPORTANT:
     These are the ACTUAL input widths.
  ========================================================= */

  const WIDTH_BRANCH = 300;
  const WIDTH_GENERAL = 460;
  const WIDTH_NUMBERS = 368;
  const WIDTH_ADDRESS = 460;

  /* =========================================================
     FIXED GRID

     DO NOT CHANGE THESE COLUMNS.

     120px = English label
     460px = English input area
     460px = Arabic input area
     100px = Arabic label
  ========================================================= */

  const rowGrid =
    "grid grid-cols-[120px_460px_460px_80px] items-center gap-3";

  /* =========================================================
     INPUT CLASS
  ========================================================= */

  const inputClass = `
    h-[32px]
    rounded-[6px]
    border
    border-slate-300
    bg-white
    px-3
    text-[13px]
    text-slate-700
    outline-none
    focus:border-blue-500
    focus:ring-2
    focus:ring-blue-100
  `;

  /* =========================================================
     LABEL CLASSES
  ========================================================= */

  const labelEnglishClass = `
    whitespace-nowrap
    text-left
    text-[13px]
    text-slate-600
  `;

  const labelArabicClass = `
    whitespace-nowrap
    text-right
    text-[13px]
    text-slate-600
  `;

  /* =========================================================
     SELECT STYLES
  ========================================================= */

  const getSelectStyles = (
    width: number,
    direction: "ltr" | "rtl",
  ): StylesConfig<SelectOption, false> => ({
    container: (base) => ({
      ...base,
      width: `${width}px`,
      minWidth: `${width}px`,
    }),

    control: (base, state) => ({
      ...base,

      width: `${width}px`,
      minHeight: "32px",
      height: "32px",

      borderRadius: "6px",

      borderColor: state.isFocused
        ? "#3b82f6"
        : "#cbd5e1",

      boxShadow: "none",

      backgroundColor: "#ffffff",

      fontSize: "13px",

      cursor: "pointer",

      "&:hover": {
        borderColor: state.isFocused
          ? "#3b82f6"
          : "#94a3b8",
      },
    }),

    valueContainer: (base) => ({
      ...base,

      height: "32px",

      padding:
        direction === "rtl"
          ? "0 8px 0 4px"
          : "0 4px 0 8px",

      justifyContent:
        direction === "rtl"
          ? "flex-end"
          : "flex-start",
    }),

    input: (base) => ({
      ...base,

      margin: 0,
      padding: 0,

      fontSize: "13px",

      textAlign:
        direction === "rtl"
          ? "right"
          : "left",
    }),

    singleValue: (base) => ({
      ...base,

      width: "100%",

      color: "#334155",

      fontSize: "13px",

      textAlign:
        direction === "rtl"
          ? "right"
          : "left",

      direction,
    }),

    placeholder: (base) => ({
      ...base,

      color: "#64748b",

      fontSize: "13px",

      textAlign:
        direction === "rtl"
          ? "right"
          : "left",
    }),

    indicatorsContainer: (base) => ({
      ...base,
      height: "32px",
    }),

    dropdownIndicator: (base) => ({
      ...base,

      padding: "4px 7px",

      color: "#64748b",
    }),

    indicatorSeparator: () => ({
      display: "none",
    }),

    menu: (base) => ({
      ...base,

      zIndex: 9999,

      width: `${width}px`,

      fontSize: "13px",
    }),

    menuList: (base) => ({
      ...base,
      padding: "3px 0",
    }),

    option: (base, state) => ({
      ...base,

      minHeight: "32px",

      padding: "7px 10px",

      fontSize: "13px",

      textAlign:
        direction === "rtl"
          ? "right"
          : "left",

      direction,

      backgroundColor:
        state.isSelected
          ? "#dbeafe"
          : state.isFocused
            ? "#eff6ff"
            : "#ffffff",

      color: "#334155",

      cursor: "pointer",
    }),
  });

  /* =========================================================
     SELECT STYLES
  ========================================================= */

  const branchSelectStyles =
    getSelectStyles(
      WIDTH_BRANCH,
      "ltr",
    );

  const branchArabicSelectStyles =
    getSelectStyles(
      WIDTH_BRANCH,
      "rtl",
    );

  /* =========================================================
     SAVE
  ========================================================= */

  const handleSave = () => {
    console.log("SAVE", {
      lkpBranch,
      lkpBranch_Ar,

      txtBuildingNo,
      txtBuildingNo_Ar,

      txtStreetName,
      txtStreetName_Ar,

      txtDistrict,
      txtDistrict_Ar,

      txtCity,
      txtCity_Ar,

      txtCountry,
      txtCountry_Ar,

      txtPostalCode,
      txtPostalCode_Ar,

      txtAdditionalNo,
      txtAdditionalNo_Ar,

      txtCRNo,
      txtCRNo_Ar,

      txtLicenceNo,
      txtLicenceNo_Ar,

      txtLicenceCategory,
      txtLicenceCategory_Ar,

      txtAddress1,
      txtAddress1_Ar,

      txtAddress2,
      txtAddress2_Ar,

      txtAddress3,
      txtAddress3_Ar,

      txtAddress4,
      txtAddress4_Ar,

      chkHeadOffice,
    });
  };

  /* =========================================================
     CLEAR
  ========================================================= */

  const handleClear = () => {
    setLkpBranch("");
    setLkpBranch_Ar("");

    setTxtBuildingNo("");
    setTxtBuildingNo_Ar("");

    setTxtStreetName("");
    setTxtStreetName_Ar("");

    setTxtDistrict("");
    setTxtDistrict_Ar("");

    setTxtCity("");
    setTxtCity_Ar("");

    setTxtCountry("");
    setTxtCountry_Ar("");

    setTxtPostalCode("");
    setTxtPostalCode_Ar("");

    setTxtAdditionalNo("");
    setTxtAdditionalNo_Ar("");

    setTxtCRNo("");
    setTxtCRNo_Ar("");

    setTxtLicenceNo("");
    setTxtLicenceNo_Ar("");

    setTxtLicenceCategory("");
    setTxtLicenceCategory_Ar("");

    setTxtAddress1("");
    setTxtAddress1_Ar("");

    setTxtAddress2("");
    setTxtAddress2_Ar("");

    setTxtAddress3("");
    setTxtAddress3_Ar("");

    setTxtAddress4("");
    setTxtAddress4_Ar("");

    setChkHeadOffice(false);
  };

  /* =========================================================
     JSX
  ========================================================= */

  return (
   <div
  className="
    flex
    min-h-screen
    w-full
    items-center
    justify-center
    overflow-x-auto
    bg-white
    px-4
  "
>

      {/* =====================================================
          MAIN CONTAINER

          Fixed width prevents the layout from moving
          when the sidebar is displayed.
      ===================================================== */}

      <div
        className="
          w-[1220px]
          min-w-[1120px]
          shrink-0
          border
          border-slate-300
          bg-white
        "
      >

        {/* ===================================================
            TITLE
        ==================================================== */}

        <div
          className="
            flex
            h-[36px]
            items-center
            border-b
            border-slate-300
            bg-[#a3dfc0]
          "
        >

          <span
            className="
              px-3
              text-[17px]
              font-semibold
              text-slate-700
            "
          >
            Set Branch Info.
          </span>

        </div>

        {/* ===================================================
            FORM
        ==================================================== */}

        <div className="px-5 py-5">

          {/* =================================================
              BRANCH
          ================================================= */}

          <div
            className={`
              ${rowGrid}
              mb-3
            `}
          >

            {/* ENGLISH LABEL */}

            <label
              htmlFor="lkpBranch"
              className={labelEnglishClass}
            >
              Branch :
            </label>

            {/* ENGLISH SELECT - 300px */}

            <div className="flex w-[460px] justify-start">

              <Select
                inputId="lkpBranch"
                name="lkpBranch"
                options={branchOptions}
                value={
                  branchOptions.find(
                    (option) =>
                      option.value ===
                      lkpBranch,
                  ) || null
                }
                onChange={(
                  option: SingleValue<SelectOption>,
                ) =>
                  setLkpBranch(
                    option?.value || "",
                  )
                }
                styles={
                  branchSelectStyles
                }
                isSearchable={false}
                isClearable={false}
                placeholder=""
              />

            </div>

            {/* ARABIC SELECT - 300px
                RIGHT ALIGNED */}

            <div
              className="
                flex
                w-[460px]
                justify-end
              "
            >

              <Select
                inputId="lkpBranch_Ar"
                name="lkpBranch_Ar"
                options={branchOptions_Ar}
                value={
                  branchOptions_Ar.find(
                    (option) =>
                      option.value ===
                      lkpBranch_Ar,
                  ) || null
                }
                onChange={(
                  option: SingleValue<SelectOption>,
                ) =>
                  setLkpBranch_Ar(
                    option?.value || "",
                  )
                }
                styles={
                  branchArabicSelectStyles
                }
                isSearchable={false}
                isClearable={false}
                placeholder=""
              />

            </div>

            {/* ARABIC LABEL */}

            <label
              htmlFor="lkpBranch_Ar"
              dir="rtl"
              className={labelArabicClass}
            >
              فرع المكتب :
            </label>

          </div>

          {/* =================================================
              BUILDING NO - 460px
          ================================================= */}

          <BranchTextRow
            labelEn="Building No."
            labelAr="رقم المبنى"
            idEn="txtBuildingNo"
            idAr="txtBuildingNo_Ar"
            valueEn={txtBuildingNo}
            setValueEn={setTxtBuildingNo}
            valueAr={txtBuildingNo_Ar}
            setValueAr={setTxtBuildingNo_Ar}
            maxLength={4}
            inputWidth={WIDTH_GENERAL}
          />

          {/* =================================================
              STREET NAME - 460px
          ================================================= */}

          <BranchTextRow
            labelEn="Street Name"
            labelAr="اسم الشارع"
            idEn="txtStreetName"
            idAr="txtStreetName_Ar"
            valueEn={txtStreetName}
            setValueEn={setTxtStreetName}
            valueAr={txtStreetName_Ar}
            setValueAr={setTxtStreetName_Ar}
            maxLength={30}
            inputWidth={WIDTH_GENERAL}
          />

          {/* =================================================
              DISTRICT - 460px
          ================================================= */}

          <BranchTextRow
            labelEn="District"
            labelAr="الحي"
            idEn="txtDistrict"
            idAr="txtDistrict_Ar"
            valueEn={txtDistrict}
            setValueEn={setTxtDistrict}
            valueAr={txtDistrict_Ar}
            setValueAr={setTxtDistrict_Ar}
            maxLength={30}
            inputWidth={WIDTH_GENERAL}
          />

          {/* =================================================
              CITY - 460px
          ================================================= */}

          <BranchTextRow
            labelEn="City"
            labelAr="مدينة"
            idEn="txtCity"
            idAr="txtCity_Ar"
            valueEn={txtCity}
            setValueEn={setTxtCity}
            valueAr={txtCity_Ar}
            setValueAr={setTxtCity_Ar}
            maxLength={30}
            inputWidth={WIDTH_GENERAL}
          />

          {/* =================================================
              COUNTRY - 460px
          ================================================= */}

          <BranchTextRow
            labelEn="Country"
            labelAr="دولة"
            idEn="txtCountry"
            idAr="txtCountry_Ar"
            valueEn={txtCountry}
            setValueEn={setTxtCountry}
            valueAr={txtCountry_Ar}
            setValueAr={setTxtCountry_Ar}
            maxLength={30}
            inputWidth={WIDTH_GENERAL}
          />

          {/* =================================================
              POSTAL CODE - 368px
          ================================================= */}

          <BranchTextRow
            labelEn="Postal Code"
            labelAr="رمز بريدي"
            idEn="txtPostalCode"
            idAr="txtPostalCode_Ar"
            valueEn={txtPostalCode}
            setValueEn={setTxtPostalCode}
            valueAr={txtPostalCode_Ar}
            setValueAr={setTxtPostalCode_Ar}
            maxLength={5}
            inputWidth={WIDTH_NUMBERS}
          />

          {/* =================================================
              ADDITIONAL NO - 368px
          ================================================= */}

          <BranchTextRow
            labelEn="Additional No."
            labelAr="رقم إضافي"
            idEn="txtAdditionalNo"
            idAr="txtAdditionalNo_Ar"
            valueEn={txtAdditionalNo}
            setValueEn={setTxtAdditionalNo}
            valueAr={txtAdditionalNo_Ar}
            setValueAr={
              setTxtAdditionalNo_Ar
            }
            maxLength={4}
            inputWidth={WIDTH_NUMBERS}
          />

          {/* =================================================
              CR NO - 368px
          ================================================= */}

          <BranchTextRow
            labelEn="CR No."
            labelAr="رقم السجل"
            idEn="txtCRNo"
            idAr="txtCRNo_Ar"
            valueEn={txtCRNo}
            setValueEn={setTxtCRNo}
            valueAr={txtCRNo_Ar}
            setValueAr={setTxtCRNo_Ar}
            maxLength={10}
            inputWidth={WIDTH_NUMBERS}
          />

          {/* =================================================
              LICENCE NO - 368px
          ================================================= */}

          <BranchTextRow
            labelEn="Licence No."
            labelAr="رقم الترخيص"
            idEn="txtLicenceNo"
            idAr="txtLicenceNo_Ar"
            valueEn={txtLicenceNo}
            setValueEn={setTxtLicenceNo}
            valueAr={txtLicenceNo_Ar}
            setValueAr={setTxtLicenceNo_Ar}
            maxLength={40}
            inputWidth={WIDTH_NUMBERS}
          />

          {/* =================================================
              LICENCE CATEGORY - 368px
          ================================================= */}

          <BranchTextRow
            labelEn="Licence Category"
            labelAr="فئة"
            idEn="txtLicenceCategory"
            idAr="txtLicenceCategory_Ar"
            valueEn={txtLicenceCategory}
            setValueEn={
              setTxtLicenceCategory
            }
            valueAr={
              txtLicenceCategory_Ar
            }
            setValueAr={
              setTxtLicenceCategory_Ar
            }
            maxLength={40}
            inputWidth={WIDTH_NUMBERS}
          />

          {/* =================================================
              DIVIDER
          ================================================= */}

          <div
            className="
              my-4
              border-t
              border-slate-200
            "
          />

          {/* =================================================
              ADDRESS 1 - 460px
          ================================================= */}

          <BranchTextRow
            labelEn="Address-Line 1"
            labelAr="سطر العنوان 1"
            idEn="txtAddress1"
            idAr="txtAddress1_Ar"
            valueEn={txtAddress1}
            setValueEn={setTxtAddress1}
            valueAr={txtAddress1_Ar}
            setValueAr={setTxtAddress1_Ar}
            maxLength={80}
            inputWidth={WIDTH_ADDRESS}
          />

          {/* =================================================
              ADDRESS 2 - 460px
          ================================================= */}

          <BranchTextRow
            labelEn="Address-Line 2"
            labelAr="سطر العنوان 2"
            idEn="txtAddress2"
            idAr="txtAddress2_Ar"
            valueEn={txtAddress2}
            setValueEn={setTxtAddress2}
            valueAr={txtAddress2_Ar}
            setValueAr={setTxtAddress2_Ar}
            maxLength={80}
            inputWidth={WIDTH_ADDRESS}
          />

          {/* =================================================
              ADDRESS 3 - 460px
          ================================================= */}

          <BranchTextRow
            labelEn="Address-Line 3"
            labelAr="سطر العنوان 3"
            idEn="txtAddress3"
            idAr="txtAddress3_Ar"
            valueEn={txtAddress3}
            setValueEn={setTxtAddress3}
            valueAr={txtAddress3_Ar}
            setValueAr={setTxtAddress3_Ar}
            maxLength={80}
            inputWidth={WIDTH_ADDRESS}
          />

          {/* =================================================
              ADDRESS 4 - 460px
          ================================================= */}

          <BranchTextRow
            labelEn="Address-Line 4"
            labelAr="سطر العنوان 4"
            idEn="txtAddress4"
            idAr="txtAddress4_Ar"
            valueEn={txtAddress4}
            setValueEn={setTxtAddress4}
            valueAr={txtAddress4_Ar}
            setValueAr={setTxtAddress4_Ar}
            maxLength={80}
            inputWidth={WIDTH_ADDRESS}
          />

          {/* =================================================
              HEAD OFFICE
          ================================================= */}

          <div className="mt-4 ml-[133px]">

            <label
              htmlFor="chkHeadOffice"
              className="
                inline-flex
                items-center
                gap-2
                rounded-md
                border
                border-emerald-200
                bg-emerald-50
                px-3
                py-1.5
                text-[13px]
                text-slate-700
              "
            >

              <input
                id="chkHeadOffice"
                name="chkHeadOffice"
                type="checkbox"
                checked={chkHeadOffice}
                onChange={(e) =>
                  setChkHeadOffice(
                    e.target.checked,
                  )
                }
                className="
                  h-[15px]
                  w-[15px]
                  accent-emerald-500
                "
              />

              Head Office

            </label>

          </div>

        </div>

        {/* ===================================================
            BUTTONS
        ==================================================== */}

    <div
  className="
    relative
    -top-[20px]
    mb-0
    flex
    w-full
    items-start
    justify-center
    gap-4
  "
>
  <button
    type="button"
    onClick={handleSave}
    className={buttonClass}
  >
     <span className={textClass}>
                <span className="underline decoration-2 underline-offset-1">
                  S
                </span>
                ave
              </span>
  </button>

  <button
    type="button"
    onClick={handleClear}
    className={buttonClass}
  >
    <span className={textClass}>
                <span className="underline decoration-2 underline-offset-1">
                  C
                </span>
                lear
              </span>
  </button>
</div>
      </div>

    </div>
  );
};

export default SetBranchInfo;