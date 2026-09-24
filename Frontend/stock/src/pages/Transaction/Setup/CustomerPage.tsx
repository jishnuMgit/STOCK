import React, { useState } from "react";

import CustomerHeader from "../../../components/Setup/CustomerPage/CustomerHeader";
import CustomerMiddle from "../../../components/Setup/CustomerPage/CustomerMiddle";
import CustomerFooter from "../../../components/Setup/CustomerPage/CustomerFooter";

const CustomerPage: React.FC = () => {
  // ============================================================
  // HEADER
  // ============================================================

  const [txtCustomerID, setTxtCustomerID] = useState("1007");

  const [optNewCustomerID, setOptNewCustomerID] =
    useState("Auto");

  const [lkpParentAccountID, setLkpParentAccountID] =
    useState("1103001");

  const [lkpParentAccountName, setLkpParentAccountName] =
    useState("CLIENTS RECEIVABLES");

  const [lkpHaveDivision, setLkpHaveDivision] =
    useState("No");

  const [lkpBusinessType, setLkpBusinessType] =
    useState("B2B");

  // ============================================================
  // MIDDLE - ENGLISH
  // ============================================================

  const [txtCustomerName, setTxtCustomerName] =
    useState("");

  const [txtLegalName, setTxtLegalName] =
    useState("");

  const [txtBuildingNo, setTxtBuildingNo] =
    useState("");

  const [txtStreetName, setTxtStreetName] =
    useState("");

  const [txtDistrict, setTxtDistrict] =
    useState("");

  const [txtCity, setTxtCity] =
    useState("");

  const [lkpCountry, setLkpCountry] =
    useState("UAE");

  const [txtPostalCode, setTxtPostalCode] =
    useState("");

  const [txtAdditionalNo, setTxtAdditionalNo] =
    useState("");

  const [txtCRNo, setTxtCRNo] =
    useState("");

  const [txtVATNo, setTxtVATNo] =
    useState("");

  // ============================================================
  // MIDDLE - ARABIC
  // ============================================================

  const [txtCustomerName_AR, setTxtCustomerName_AR] =
    useState("");

  const [txtLegalName_AR, setTxtLegalName_AR] =
    useState("");

  const [txtBuildingNo_AR, setTxtBuildingNo_AR] =
    useState("");

  const [txtStreetName_AR, setTxtStreetName_AR] =
    useState("");

  const [txtDistrict_AR, setTxtDistrict_AR] =
    useState("");

  const [txtCity_AR, setTxtCity_AR] =
    useState("");

  const [lkpCountry_AR, setLkpCountry_AR] =
    useState("UAE");

  const [txtPostalCode_AR, setTxtPostalCode_AR] =
    useState("");

  const [txtAdditionalNo_AR, setTxtAdditionalNo_AR] =
    useState("");

  const [txtCRNo_AR, setTxtCRNo_AR] =
    useState("");

  const [txtVATNo_AR, setTxtVATNo_AR] =
    useState("");

  // ============================================================
  // MIDDLE - OTHER
  // ============================================================

  const [txtCreditLimit, setTxtCreditLimit] =
    useState("");

  const [txtCreditDays, setTxtCreditDays] =
    useState("");

  const [txtShortName, setTxtShortName] =
    useState("");

  const [lkpStaff, setLkpStaff] =
    useState("");

  const [txtContact, setTxtContact] =
    useState("");

  const [txtEMail, setTxtEMail] =
    useState("");

  const [txtPhone, setTxtPhone] =
    useState("");

  // ============================================================
  // FOOTER
  // ============================================================

  const [chkCustomer, setChkCustomer] =
    useState(true);

  const [chkSupplier, setChkSupplier] =
    useState(false);

  const [chkInterCompany, setChkInterCompany] =
    useState(false);

  const [chkInactiveCustomer, setChkInactiveCustomer] =
    useState(false);

  const [chkExcludeFromAgeing, setChkExcludeFromAgeing] =
    useState(false);

  // ============================================================
  // SAVE
  // ============================================================

  const handleSave = () => {
    const customerData = {
      txtCustomerID,
      optNewCustomerID,

      lkpParentAccountID,
      lkpParentAccountName,

      lkpHaveDivision,
      lkpBusinessType,

      txtCustomerName,
      txtLegalName,
      txtBuildingNo,
      txtStreetName,
      txtDistrict,
      txtCity,
      lkpCountry,
      txtPostalCode,
      txtAdditionalNo,
      txtCRNo,
      txtVATNo,

      txtCustomerName_AR,
      txtLegalName_AR,
      txtBuildingNo_AR,
      txtStreetName_AR,
      txtDistrict_AR,
      txtCity_AR,
      lkpCountry_AR,
      txtPostalCode_AR,
      txtAdditionalNo_AR,
      txtCRNo_AR,
      txtVATNo_AR,

      txtCreditLimit,
      txtCreditDays,
      txtShortName,
      lkpStaff,
      txtContact,
      txtEMail,
      txtPhone,

      chkCustomer,
      chkSupplier,
      chkInterCompany,
      chkInactiveCustomer,
      chkExcludeFromAgeing,
    };

    console.log("CUSTOMER DATA:", customerData);
  };

  // ============================================================
  // DELETE
  // ============================================================

  const handleDelete = () => {
    console.log(
      "DELETE CUSTOMER:",
      txtCustomerID
    );
  };

  // ============================================================
  // CLEAR
  // ============================================================

  const handleClear = () => {
    setTxtCustomerID("1007");
    setOptNewCustomerID("Auto");

    setLkpParentAccountID("1103001");
    setLkpParentAccountName("CLIENTS RECEIVABLES");

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

  return (
 <div className="min-h-screen flex items-center justify-center">
      <div className="lg:w-[90%]  bg-white border-gray-500 border-[0.2px]">

        {/* HEADER */}
        <CustomerHeader
          txtCustomerID={txtCustomerID}
          setTxtCustomerID={setTxtCustomerID}

          optNewCustomerID={optNewCustomerID}
          setOptNewCustomerID={setOptNewCustomerID}

          lkpParentAccountID={lkpParentAccountID}
          setLkpParentAccountID={setLkpParentAccountID}

          lkpParentAccountName={lkpParentAccountName}
          setLkpParentAccountName={setLkpParentAccountName}

          lkpHaveDivision={lkpHaveDivision}
          setLkpHaveDivision={setLkpHaveDivision}

          lkpBusinessType={lkpBusinessType}
          setLkpBusinessType={setLkpBusinessType}
        />

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

          onSave={handleSave}
          onDelete={handleDelete}
          onClear={handleClear}
        />

      </div>
    </div>
  );
};

export default CustomerPage;