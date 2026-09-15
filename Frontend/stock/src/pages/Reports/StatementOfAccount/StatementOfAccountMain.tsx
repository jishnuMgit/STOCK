import React, { useEffect, useState } from "react";

import StatementOfAccount, {
  type SOATransaction,
  type SOAAgeing,
  type SOABankDetails,
} from "./StatementOfAccount";

/* ============================================================
   TYPES
============================================================ */

type ReportType = "Customer" | "Supplier";

type BranchMode =
  | "One Branch"
  | "All Branch";

type CustomerMode =
  | "One Customer"
  | "Range Customer"
  | "All Customers";

type DivisionMode =
  | "One Division"
  | "All Division";

type StatusMode =
  | "Outstanding"
  | "All";

type AgeingMode =
  | "Without Ageing"
  | "With Ageing";

type PostStatus =
  | "All"
  | "Posted"
  | "Unposted";

type PrintZeroBalance =
  | "Yes"
  | "No";

/* ============================================================
   DUMMY OPTIONS
============================================================ */

const branchOptions = [
  { id: "RYD", name: "Riyadh" },
  { id: "JED", name: "Jeddah" },
  { id: "DMM", name: "Dammam" },
  { id: "MED", name: "Madinah" },
];

const customerOptions = [
  { id: "1001", name: "AL RAJHI TRADING COMPANY" },
  { id: "1002", name: "SAUDI AIRLINES" },
  { id: "1003", name: "AL FARAJ COMPANY" },
  { id: "1007", name: "E. A. JUFFALI & BROS H.O." },
  { id: "1010", name: "AL HOKAIR GROUP" },
];

const supplierOptions = [
  { id: "2001", name: "SAUDI TRAVEL SERVICES" },
  { id: "2002", name: "GLOBAL HOTEL GROUP" },
  { id: "2003", name: "AIRLINE SERVICES LTD" },
];

const divisionOptions = [
  { id: "ALL", name: "All Division" },
  { id: "TRAVEL", name: "Travel" },
  { id: "TOURS", name: "Tours" },
  { id: "CORP", name: "Corporate" },
];

/* ============================================================
   DUMMY SOA DATA
============================================================ */

const dummyTransactions: SOATransaction[] = [
  {
    date: "13-Jul-26",
    branchId: "JD",
    type: "CI",
    docNo: "C/JD2600518",
    description: "PERIOD : 01 - 13 JUL 26",
    debit: 17457.1,
    credit: 0,
    balance: 17457.1,
  },
  {
    date: "13-Jul-26",
    branchId: "JD",
    type: "CI",
    docNo: "C/JD2600519",
    description: "(Ref. 003804) PERIOD : 01 - 13 JUL 26",
    debit: 7097.15,
    credit: 0,
    balance: 24554.25,
  },
];

const dummyAgeing: SOAAgeing[] = [
  { label: "0 - 30 Days", amount: 0 },
  { label: "31 - 60 Days", amount: 0 },
  { label: "61 - 90 Days", amount: 24554.25 },
  { label: "91 - 120 Days", amount: 0 },
  { label: "121 - 180 Days", amount: 0 },
  { label: "181 - 365 Days", amount: 0 },
];

const dummyBankDetails: SOABankDetails = {
  accountName: "CARAVAN TOURS & TRAVEL (ACE TRAVEL) CO LTD",
  accountNumber: "689964-002-15",
  iban: "SA56 5500 0000 0689 9640 0215",
  swiftCode: "BSFRSARI",
  bankName: "BANQUE SAUDI FRANSI",
};

/* ============================================================
   COMPONENT
============================================================ */

const StatementOfAccountMain: React.FC = () => {
  /* ==========================================================
     REPORT TYPE
  ========================================================== */

  const [reportType, setReportType] =
    useState<ReportType>("Customer");

  /* ==========================================================
     BRANCH
  ========================================================== */

  const [branchMode, setBranchMode] =
    useState<BranchMode>("All Branch");

  const [selectedBranch, setSelectedBranch] =
    useState("RYD");

  /* ==========================================================
     CUSTOMER / SUPPLIER
  ========================================================== */

  const [customerMode, setCustomerMode] =
    useState<CustomerMode>("One Customer");

  const [selectedCustomerId, setSelectedCustomerId] =
    useState("1007");

  const [selectedCustomerName, setSelectedCustomerName] =
    useState("1007");

  const [rangeCustomerId, setRangeCustomerId] =
    useState("1001");

  const [rangeCustomerName, setRangeCustomerName] =
    useState("1010");

  /* ==========================================================
     DIVISION
  ========================================================== */

  const [divisionMode, setDivisionMode] =
    useState<DivisionMode>("All Division");

  const [selectedDivision, setSelectedDivision] =
    useState("ALL");

  /* ==========================================================
     PERIOD
  ========================================================== */

  const [periodFrom, setPeriodFrom] =
    useState("2026-09-01");

  const [periodTo, setPeriodTo] =
    useState("2026-09-30");

  /* ==========================================================
     OPTIONS
  ========================================================== */

  const [ageing, setAgeing] =
    useState<AgeingMode>("Without Ageing");

  const [ageingMode, setAgeingMode] =
    useState("Days");

  const [postStatus, setPostStatus] =
    useState<PostStatus>("All");

  const [printZeroBalance, setPrintZeroBalance] =
    useState<PrintZeroBalance>("Yes");

  /* ==========================================================
     STATUS
  ========================================================== */

  const [status, setStatus] =
    useState<StatusMode>("All");

  /* ==========================================================
     PRINT
  ========================================================== */

  const [isPrinting, setIsPrinting] =
    useState(false);

  /* ==========================================================
     ACCOUNT OPTIONS
  ========================================================== */

  const accountOptions =
    reportType === "Customer"
      ? customerOptions
      : supplierOptions;

  /* ==========================================================
     SELECTED ACCOUNT
  ========================================================== */

  const selectedAccount =
    accountOptions.find(
      (item) => item.id === selectedCustomerId
    );

  /* ==========================================================
     DATE FORMAT
  ========================================================== */

  const formatReportDate = (value: string) => {
    if (!value) {
      return "";
    }

    const [year, month, day] =
      value.split("-");

    const date = new Date(
      Number(year),
      Number(month) - 1,
      Number(day)
    );

    return date.toLocaleDateString(
      "en-GB",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    );
  };

  /* ==========================================================
     SOA DATA
  ========================================================== */

  const soaData = {
    customerId:
      selectedCustomerId || "1007",

    customerName:
      selectedAccount?.name ||
      "E. A. JUFFALI & BROS H.O.",

    division:
      selectedDivision === "ALL"
        ? ""
        : divisionOptions.find(
            (item) =>
              item.id === selectedDivision
          )?.name || "",

    paymentTerms: "30 DAYS",

    creditLimit: 50000,

    currency: "SAR",

    periodFrom:
      formatReportDate(periodFrom),

    periodTo:
      formatReportDate(periodTo),

    vatNumber: "300220164600003",

    transactions:
      dummyTransactions,

    ageing:
      dummyAgeing,

    bankDetails:
      dummyBankDetails,

    amountInWords:
      "TWENTY FOUR THOUSAND FIVE HUNDRED FIFTY FOUR AND TWENTY FIVE HALALA ONLY",

    logoSrc:
      "/images/caravan-logo.png",

    pageNumber: 1,

    totalPages: 1,
  };

  /* ==========================================================
     PRINT
  ========================================================== */

  const handlePrint = () => {
    setIsPrinting(true);
  };

  useEffect(() => {
    if (!isPrinting) {
      return;
    }

    const timer =
      window.setTimeout(() => {
        window.print();
      }, 100);

    return () => {
      window.clearTimeout(timer);
    };
  }, [isPrinting]);

  useEffect(() => {
    const handleAfterPrint = () => {
      setIsPrinting(false);
    };

    window.addEventListener(
      "afterprint",
      handleAfterPrint
    );

    return () => {
      window.removeEventListener(
        "afterprint",
        handleAfterPrint
      );
    };
  }, []);

  /* ==========================================================
     CLEAR
  ========================================================== */

  const handleClear = () => {
    setReportType("Customer");

    setBranchMode("All Branch");
    setSelectedBranch("RYD");

    setCustomerMode("One Customer");
    setSelectedCustomerId("1007");
    setSelectedCustomerName("1007");
    setRangeCustomerId("1001");
    setRangeCustomerName("1010");

    setDivisionMode("All Division");
    setSelectedDivision("ALL");

    setPeriodFrom("2026-09-01");
    setPeriodTo("2026-09-30");

    setAgeing("Without Ageing");
    setAgeingMode("Days");
    setPostStatus("All");
    setPrintZeroBalance("Yes");

    setStatus("All");
  };

  /* ==========================================================
     CLOSE
  ========================================================== */

  const handleClose = () => {
    window.history.back();
  };

  /* ==========================================================
     RENDER
  ========================================================== */

  return (
    <>
      <div className="soa-classic-page">

        <div className="soa-classic-container">

          {/* ==================================================
              HEADER
          ================================================== */}

          <div className="soa-classic-header">
            Statement Of Account
          </div>

          {/* ==================================================
              MAIN FILTER AREA
          ================================================== */}

          <div className="soa-form">

            {/* ==================================================
                BRANCH
            ================================================== */}

            <div className="soa-row">

              <div
                className="soa-radio-box"
                id="optBranch"
              >

                <div className="soa-radio-title">
                  Branch
                </div>

                <label>
                  <input
                    type="radio"
                    name="branchMode"
                    checked={
                      branchMode ===
                      "One Branch"
                    }
                    onChange={() =>
                      setBranchMode(
                        "One Branch"
                      )
                    }
                  />

                  <span>
                    One Branch
                  </span>
                </label>

                <label>
                  <input
                    type="radio"
                    name="branchMode"
                    checked={
                      branchMode ===
                      "All Branch"
                    }
                    onChange={() =>
                      setBranchMode(
                        "All Branch"
                      )
                    }
                  />

                  <span>
                    All Branches
                  </span>
                </label>

              </div>

              <div className="soa-lookup-area">

                <div className="soa-lookup-field">

                  <label>
                    Branch
                  </label>

                  <select
                    id="lkpOneBranch"
                    value={selectedBranch}
                    disabled={
                      branchMode !==
                      "One Branch"
                    }
                    onChange={(e) =>
                      setSelectedBranch(
                        e.target.value
                      )
                    }
                  >

                    {branchOptions.map(
                      (branch) => (
                        <option
                          key={branch.id}
                          value={branch.id}
                        >
                          {branch.id} -{" "}
                          {branch.name}
                        </option>
                      )
                    )}

                  </select>

                </div>

              </div>

            </div>

            {/* ==================================================
                CUSTOMER / SUPPLIER
            ================================================== */}

            <div className="soa-row" >

              <div
                className="soa-radio-box border border-black"
                id="optCustomer"
              >

                <div className="soa-radio-title">

                  {reportType}

                </div>

                <label>

                  <input
                    type="radio"
                    name="customerMode"
                    checked={
                      customerMode ===
                      "One Customer"
                    }
                    onChange={() =>
                      setCustomerMode(
                        "One Customer"
                      )
                    }
                  />

                  <span>
                    One {reportType}
                  </span>

                </label>

                <label>

                  <input
                    type="radio"
                    name="customerMode"
                    checked={
                      customerMode ===
                      "Range Customer"
                    }
                    onChange={() =>
                      setCustomerMode(
                        "Range Customer"
                      )
                    }
                  />

                  <span>
                    Range {reportType}
                  </span>

                </label>

                <label>

                  <input
                    type="radio"
                    name="customerMode"
                    checked={
                      customerMode ===
                      "All Customers"
                    }
                    onChange={() =>
                      setCustomerMode(
                        "All Customers"
                      )
                    }
                  />

                  <span>
                    All {reportType}s
                  </span>

                </label>

              </div>

              <div className="soa-lookup-area ">

                {/* Customer / Supplier selector */}

                <div
                  className="soa-customer-type"
                  id="optCustomerSupplier"
                >

                  <label>
                    <input
                      type="radio"
                      name="reportType"
                      checked={
                        reportType ===
                        "Customer"
                      }
                      onChange={() =>
                        setReportType(
                          "Customer"
                        )
                      }
                    />

                    Customer
                  </label>

                  <label>
                    <input
                      type="radio"
                      name="reportType"
                      checked={
                        reportType ===
                        "Supplier"
                      }
                      onChange={() =>
                        setReportType(
                          "Supplier"
                        )
                      }
                    />

                    Supplier
                  </label>

                </div>

                {/* ONE CUSTOMER */}

                {customerMode ===
                  "One Customer" && (
                  <div className="soa-two-field-row">

                    <div className="soa-id-field">

                      <label>
                        {reportType} ID
                      </label>

                      <select
                        id="lkpOneCustomerID"
                        value={
                          selectedCustomerId
                        }
                        onChange={(e) =>
                          setSelectedCustomerId(
                            e.target.value
                          )
                        }
                      >

                        {accountOptions.map(
                          (account) => (
                            <option
                              key={
                                account.id
                              }
                              value={
                                account.id
                              }
                            >
                              {account.id}
                            </option>
                          )
                        )}

                      </select>

                    </div>

                    <div className="soa-name-field">

                      <label>
                        {reportType} Name
                      </label>

                      <select
                        id="lkpOneCustomerName"
                        value={
                          selectedCustomerId
                        }
                        onChange={(e) =>
                          setSelectedCustomerId(
                            e.target.value
                          )
                        }
                      >

                        {accountOptions.map(
                          (account) => (
                            <option
                              key={
                                account.id
                              }
                              value={
                                account.id
                              }
                            >
                              {account.name}
                            </option>
                          )
                        )}

                      </select>

                    </div>

                  </div>
                )}

                {/* RANGE CUSTOMER */}

                {customerMode ===
                  "Range Customer" && (
                  <>

                    <div className="soa-two-field-row">

                      <div className="soa-id-field">

                        <label>
                          From {reportType} ID
                        </label>

                        <select
                          id="lkpRangeCustomerID"
                          value={
                            rangeCustomerId
                          }
                          onChange={(e) =>
                            setRangeCustomerId(
                              e.target.value
                            )
                          }
                        >

                          {accountOptions.map(
                            (account) => (
                              <option
                                key={
                                  account.id
                                }
                                value={
                                  account.id
                                }
                              >
                                {account.id}
                              </option>
                            )
                          )}

                        </select>

                      </div>

                      <div className="soa-name-field">

                        <label>
                          From {reportType} Name
                        </label>

                        <select
                          id="lkpRangeCustomerName"
                          value={
                            rangeCustomerName
                          }
                          onChange={(e) =>
                            setRangeCustomerName(
                              e.target.value
                            )
                          }
                        >

                          {accountOptions.map(
                            (account) => (
                              <option
                                key={
                                  account.id
                                }
                                value={
                                  account.id
                                }
                              >
                                {account.name}
                              </option>
                            )
                          )}

                        </select>

                      </div>

                    </div>

                  </>
                )}

              </div>

            </div>

            {/* ==================================================
                DIVISION
            ================================================== */}

            <div className="soa-row">

              <div
                className="soa-radio-box"
                id="optDivision"
              >

                <div className="soa-radio-title">
                  Division
                </div>

                <label>

                  <input
                    type="radio"
                    name="divisionMode"
                    checked={
                      divisionMode ===
                      "One Division"
                    }
                    onChange={() =>
                      setDivisionMode(
                        "One Division"
                      )
                    }
                  />

                  <span>
                    One Division
                  </span>

                </label>

                <label>

                  <input
                    type="radio"
                    name="divisionMode"
                    checked={
                      divisionMode ===
                      "All Division"
                    }
                    onChange={() =>
                      setDivisionMode(
                        "All Division"
                      )
                    }
                  />

                  <span>
                    All Division
                  </span>

                </label>

              </div>

              <div className="soa-lookup-area">

                {divisionMode ===
                  "One Division" && (
                  <div className="soa-two-field-row">

                    <div className="soa-id-field">

                      <label>
                        Division ID
                      </label>

                      <select
                        id="lkpOneDivisionID"
                        value={
                          selectedDivision
                        }
                        onChange={(e) =>
                          setSelectedDivision(
                            e.target.value
                          )
                        }
                      >

                        {divisionOptions
                          .filter(
                            (division) =>
                              division.id !==
                              "ALL"
                          )
                          .map(
                            (division) => (
                              <option
                                key={
                                  division.id
                                }
                                value={
                                  division.id
                                }
                              >
                                {division.id}
                              </option>
                            )
                          )}

                      </select>

                    </div>

                    <div className="soa-name-field">

                      <label>
                        Division Name
                      </label>

                      <select
                        id="lkpOneDivisionName"
                        value={
                          selectedDivision
                        }
                        onChange={(e) =>
                          setSelectedDivision(
                            e.target.value
                          )
                        }
                      >

                        {divisionOptions
                          .filter(
                            (division) =>
                              division.id !==
                              "ALL"
                          )
                          .map(
                            (division) => (
                              <option
                                key={
                                  division.id
                                }
                                value={
                                  division.id
                                }
                              >
                                {division.name}
                              </option>
                            )
                          )}

                      </select>

                    </div>

                  </div>
                )}

              </div>

            </div>

            {/* ==================================================
                PERIOD
            ================================================== */}

            <div className="soa-options-row">

              <div className="soa-option-label">
                Period :
              </div>

              <div className="soa-date-fields">

                <input
                  id="dtpFromDate"
                  type="date"
                  value={periodFrom}
                  onChange={(e) =>
                    setPeriodFrom(
                      e.target.value
                    )
                  }
                />

                <span>
                  to
                </span>

                <input
                  id="dtpToDate"
                  type="date"
                  value={periodTo}
                  onChange={(e) =>
                    setPeriodTo(
                      e.target.value
                    )
                  }
                />

              </div>

              {/* STATUS */}

              <div
                className="soa-status-box"
                id="optStatus"
              >

                <div className="soa-status-title">
                  Status
                </div>

                <label>

                  <input
                    type="radio"
                    name="status"
                    checked={
                      status ===
                      "Outstanding"
                    }
                    onChange={() =>
                      setStatus(
                        "Outstanding"
                      )
                    }
                  />

                  Outstanding

                </label>

                <label>

                  <input
                    type="radio"
                    name="status"
                    checked={
                      status === "All"
                    }
                    onChange={() =>
                      setStatus("All")
                    }
                  />

                  All

                </label>

              </div>

            </div>

            {/* ==================================================
                AGEING
            ================================================== */}

            <div className="soa-options-row">

              <div className="soa-option-label">
                Ageing :
              </div>

              <select
                id="lkpAgeing"
                value={ageing}
                onChange={(e) =>
                  setAgeing(
                    e.target.value as AgeingMode
                  )
                }
              >

                <option>
                  Without Ageing
                </option>

                <option>
                  With Ageing
                </option>

              </select>

            </div>

            {/* ==================================================
                AGEING MODE
            ================================================== */}

            <div className="soa-options-row">

              <div className="soa-option-label">
                Ageing Mode :
              </div>

              <select
                id="lkpAgeingMode"
                value={ageingMode}
                onChange={(e) =>
                  setAgeingMode(
                    e.target.value
                  )
                }
              >

                <option>
                  Days
                </option>

                <option>
                  Months
                </option>

              </select>

            </div>

            {/* ==================================================
                POST STATUS
            ================================================== */}

            <div className="soa-options-row">

              <div className="soa-option-label">
                Post Status :
              </div>

              <select
                id="lkpPostStatus"
                value={postStatus}
                onChange={(e) =>
                  setPostStatus(
                    e.target.value as PostStatus
                  )
                }
              >

                <option>
                  All
                </option>

                <option>
                  Posted
                </option>

                <option>
                  Unposted
                </option>

              </select>

            </div>

            {/* ==================================================
                PRINT ZERO BALANCE
            ================================================== */}

            <div className="soa-options-row">

              <div className="soa-option-label">
                Print 0 Balance :
              </div>

              <select
                id="lkpPrint0Balance"
                value={printZeroBalance}
                onChange={(e) =>
                  setPrintZeroBalance(
                    e.target.value as PrintZeroBalance
                  )
                }
              >

                <option>
                  Yes
                </option>

                <option>
                  No
                </option>

              </select>

            </div>

          </div>

          {/* ==================================================
              BUTTONS
          ================================================== */}

          <div className="soa-classic-actions">

            <button
              type="button"
              id="btnPrint"
              onClick={handlePrint}
            >
              Print
            </button>

            <button
              type="button"
              id="btnPDFExport"
              onClick={handlePrint}
            >
              PDF Export
            </button>

            <button
              type="button"
              id="btnClear"
              onClick={handleClear}
            >
              Clear
            </button>

          </div>

        </div>
      </div>

      {/* ======================================================
          PRINT ONLY
      ====================================================== */}

      {isPrinting && (
        <div className="soa-print-root">

          <StatementOfAccount
            {...soaData}
          />

        </div>
      )}

      {/* ======================================================
          CSS
      ====================================================== */}

      <style>{`

        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          font-family:
            Arial,
            "Segoe UI",
            sans-serif;
        //   background: #303030;
        }

        /* =====================================================
           PAGE
        ===================================================== */

        .soa-classic-page {
          min-height: 100vh;

          padding:
            42px 20px;

        //   background: #303030;

          color: #17212b;
        }

        /* =====================================================
           MAIN CONTAINER
        ===================================================== */

        .soa-classic-container {
          width: 100%;
          max-width: 875px;

          min-height: 590px;

          margin: 0 auto;

          background: #ffffff;

          border:
            1px solid #d8d8d8;

          box-shadow:
            0 1px 5px
            rgba(0, 0, 0, 0.18);
        }

        /* =====================================================
           HEADER
        ===================================================== */

        .soa-classic-header {
          height: 35px;

          display: flex;

          align-items: center;

          justify-content: center;

          background: #9cdbb9;

          color: #293b55;

          font-size: 22px;

          font-weight: 700;

          line-height: 35px;

          text-transform: none;
        }

        /* =====================================================
           FORM
        ===================================================== */

        .soa-form {
          padding:
            10px 15px 5px;
        }

        /* =====================================================
           MAIN ROW
        ===================================================== */

        .soa-row {
          display: grid;

          grid-template-columns:
            170px
            1fr;

          column-gap: 15px;

          margin-bottom: 7px;

          min-height: 78px;
        }

        /* =====================================================
           RADIO BOX
        ===================================================== */

        .soa-radio-box {
          border:
            1px solid #dfe3e6;

          background: #ffffff;

          padding:
            10px 12px 8px;

          min-height: 78px;
        }

        .soa-radio-title {
          color: #a01818;

          font-size: 12px;

          margin-bottom: 7px;

          position: relative;

          top: -17px;

          background: #ffffff;

          width: max-content;

          padding: 0 3px;
        }

        .soa-radio-box label {
          display: flex;

          align-items: center;

          gap: 8px;

          height: 27px;

          font-size: 12px;

          color: #374151;

          cursor: pointer;
        }

        .soa-radio-box input,
        .soa-status-box input {
          width: 19px;
          height: 19px;

          margin: 0;

          accent-color: #9CDBB9;

          cursor: pointer;
        }

        /* =====================================================
           LOOKUP AREA
        ===================================================== */

        .soa-lookup-area {
          width: 100%;

          padding-top: 0;
        }

        .soa-lookup-field {
          width: 250px;
        }

        .soa-lookup-field label,
        .soa-id-field label,
        .soa-name-field label {
          display: block;

          color: #a01818;

          font-size: 11px;

          margin-bottom: 4px;
        }

        /* =====================================================
           CUSTOMER / SUPPLIER
        ===================================================== */

        .soa-customer-type {
          display: flex;

          align-items: center;

          justify-content: flex-start;

          gap: 25px;

          height: 32px;

          margin-bottom: 3px;
        }

        .soa-customer-type label {
          display: flex;

          align-items: center;

          gap: 8px;

          font-size: 12px;

          color: #3e4650;

          cursor: pointer;
        }

        .soa-customer-type input {
          width: 19px;
          height: 19px;

          margin: 0;

          accent-color: #68d879;
        }

        /* =====================================================
           TWO FIELDS
        ===================================================== */

        .soa-two-field-row {
          display: grid;

          grid-template-columns:
            132px
            minmax(250px, 1fr);

          gap: 10px;

          width: 100%;

          margin-bottom: 5px;
        }

        .soa-id-field,
        .soa-name-field {
          min-width: 0;
        }

        /* =====================================================
           SELECT
        ===================================================== */

        .soa-classic-container select,
        .soa-classic-container input[type="date"] {
          width: 100%;

          height: 26px;

          padding:
            2px 8px;

          border:
            1px solid #d1d8de;

          border-radius: 0;

          background: #ffffff;

          color: #34404c;

          font-family: inherit;

          font-size: 12px;

          outline: none;
        }

        .soa-classic-container select {
          appearance: auto;
        }

        .soa-classic-container select:hover,
        .soa-classic-container input[type="date"]:hover {
          border-color: #9fb9c9;
        }

        .soa-classic-container select:focus,
        .soa-classic-container input[type="date"]:focus {
          border-color: #82a8bd;

          box-shadow:
            0 0 0 1px
            rgba(82, 143, 177, 0.12);
        }

        .soa-classic-container select:disabled {
          background: #f1f1f1;

          color: #999;

          cursor: not-allowed;
        }

        /* =====================================================
           OPTIONS ROW
        ===================================================== */

        .soa-options-row {
          display: grid;

          grid-template-columns:
            170px
            265px
            1fr;

          align-items: center;

          column-gap: 15px;

          min-height: 33px;

          margin-bottom: 1px;
        }

        .soa-option-label {
          height: 26px;

          display: flex;

          align-items: center;

          justify-content: flex-end;

          padding-right: 8px;

          background: #f6f7f8;

          border:
            1px solid #e1e4e7;

          color: #48515b;

          font-size: 12px;
        }

        .soa-options-row > select {
          width: 265px;
        }

        /* =====================================================
           DATE
        ===================================================== */

        .soa-date-fields {
          display: grid;

          grid-template-columns:
            1fr
            20px
            1fr;

          align-items: center;

          gap: 5px;

          width: 265px;
        }

        .soa-date-fields span {
          text-align: center;

          color: #67737e;

          font-size: 11px;
        }

        /* =====================================================
           STATUS
        ===================================================== */

        .soa-status-box {
          width: 185px;

          min-height: 77px;

          border:
            1px solid #dfe3e6;

          padding:
            9px 12px;

          margin-left: auto;

          position: relative;
        }

        .soa-status-title {
          position: absolute;

          top: -9px;

          left: 62px;

          padding:
            0 7px;

          background: #ffffff;

          color: #67737e;

          font-size: 11px;
        }

        .soa-status-box label {
          display: flex;

          align-items: center;

          gap: 8px;

          height: 29px;

          color: #45515c;

          font-size: 12px;

          cursor: pointer;
        }

        /* =====================================================
           ACTION BUTTONS
        ===================================================== */

        .soa-classic-actions {
          display: flex;

          align-items: center;

          justify-content: center;

          gap: 13px;

          padding:
            15px 10px 17px;
        }

        .soa-classic-actions button {
          min-width: 108px;

          height: 40px;

          padding:
            0 22px;

          border:
            1px solid #9db2c0;

          border-radius: 4px;

          background:
            linear-gradient(
              #ffffff,
              #e9eff3
            );

          color: #159447;

          font-family: inherit;

          font-size: 14px;

          cursor: pointer;

          box-shadow:
            inset 0 1px 0
            rgba(255,255,255,0.8);
        }

        .soa-classic-actions button:hover {
          background:
            linear-gradient(
              #ffffff,
              #dfe8ed
            );

          border-color: #7f9cac;
        }

        .soa-classic-actions button:active {
          background: #e2e8ec;
        }

        /* =====================================================
           PRINT ROOT
        ===================================================== */

        .soa-print-root {
          display: none;
        }

        /* =====================================================
           RESPONSIVE
        ===================================================== */

        @media (max-width: 750px) {

          .soa-classic-page {
            padding:
              20px 10px;
          }

          .soa-classic-header {
            font-size: 18px;
          }

          .soa-row {
            grid-template-columns: 1fr;

            row-gap: 7px;
          }

          .soa-radio-box {
            min-height: auto;
          }

          .soa-lookup-field {
            width: 100%;
          }

          .soa-two-field-row {
            grid-template-columns:
              120px
              1fr;
          }

          .soa-options-row {
            grid-template-columns:
              145px
              1fr;
          }

          .soa-options-row > select {
            width: 100%;
          }

          .soa-status-box {
            grid-column: 2;

            margin-top: 5px;

            margin-left: 0;
          }

          .soa-date-fields {
            width: 100%;
          }
        }

        @media (max-width: 500px) {

          .soa-two-field-row {
            grid-template-columns: 1fr;
          }

          .soa-options-row {
            grid-template-columns: 1fr;
            gap: 4px;
          }

          .soa-option-label {
            justify-content: flex-start;

            padding-left: 8px;
          }

          .soa-status-box {
            grid-column: 1;

            width: 100%;
          }

          .soa-classic-actions {
            flex-direction: column;
          }

          .soa-classic-actions button {
            width: 100%;
          }
        }

        /* =====================================================
           PRINT
        ===================================================== */

        @media print {

          body {
            background: #ffffff !important;
          }

          body > * {
            visibility: hidden !important;
          }

          .soa-print-root {
            display: block !important;

            visibility: visible !important;

            position: absolute !important;

            left: 0 !important;

            top: 0 !important;

            width: 100% !important;

            margin: 0 !important;

            padding: 0 !important;

            background: #ffffff !important;
          }

          .soa-print-root,
          .soa-print-root * {
            visibility: visible !important;
          }

          .soa-print-root .soa-page-wrapper {
            min-height: 0 !important;

            padding: 0 !important;

            margin: 0 !important;

            background: #ffffff !important;
          }

          .soa-print-root .soa-toolbar {
            display: none !important;
          }

          .soa-print-root .soa-document {
            margin: 0 auto !important;

            box-shadow: none !important;

            border: none !important;
          }

          @page {
            size: A4 portrait;

            margin: 8mm;
          }
        }

      `}</style>
    </>
  );
};

export default StatementOfAccountMain;