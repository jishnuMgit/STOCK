import React, {
  useEffect,
  useState,
} from "react";

import StatementOfAccount, {
  type SOATransaction,
  type SOAAgeing,
  type SOABankDetails,
} from "./StatementOfAccount";

/* ============================================================
   TYPES
============================================================ */

type ReportType =
  | "Customer"
  | "Supplier";

type AccountMode =
  | "One Account"
  | "Range Account"
  | "All Account";

type BranchMode =
  | "One Branch"
  | "All Branch";

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
  {
    id: "RYD",
    name: "Riyadh",
  },
  {
    id: "JED",
    name: "Jeddah",
  },
  {
    id: "DMM",
    name: "Dammam",
  },
  {
    id: "MED",
    name: "Madinah",
  },
];

const customerOptions = [
  {
    id: "1001",
    name: "AL RAJHI TRADING COMPANY",
  },
  {
    id: "1002",
    name: "SAUDI AIRLINES",
  },
  {
    id: "1003",
    name: "AL FARAJ COMPANY",
  },
  {
    id: "1007",
    name: "E. A. JUFFALI & BROS H.O.",
  },
  {
    id: "1010",
    name: "AL HOKAIR GROUP",
  },
];

const supplierOptions = [
  {
    id: "2001",
    name: "SAUDI TRAVEL SERVICES",
  },
  {
    id: "2002",
    name: "GLOBAL HOTEL GROUP",
  },
  {
    id: "2003",
    name: "AIRLINE SERVICES LTD",
  },
];

const divisionOptions = [
  {
    id: "ALL",
    name: "All Division",
  },
  {
    id: "TRAVEL",
    name: "Travel",
  },
  {
    id: "TOURS",
    name: "Tours",
  },
  {
    id: "CORP",
    name: "Corporate",
  },
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
    description:
      "PERIOD : 01 - 13 JUL 26",
    debit: 17457.1,
    credit: 0,
    balance: 17457.1,
  },

  {
    date: "13-Jul-26",
    branchId: "JD",
    type: "CI",
    docNo: "C/JD2600519",
    description:
      "(Ref. 003804) PERIOD : 01 - 13 JUL 26",
    debit: 7097.15,
    credit: 0,
    balance: 24554.25,
  },
];

/* ============================================================
   DUMMY AGEING
============================================================ */

const dummyAgeing: SOAAgeing[] = [
  {
    label: "0 - 30 Days",
    amount: 0,
  },

  {
    label: "31 - 60 Days",
    amount: 0,
  },

  {
    label: "61 - 90 Days",
    amount: 24554.25,
  },

  {
    label: "91 - 120 Days",
    amount: 0,
  },

  {
    label: "121 - 180 Days",
    amount: 0,
  },

  {
    label: "181 - 365 Days",
    amount: 0,
  },
];

/* ============================================================
   DUMMY BANK DETAILS
============================================================ */

const dummyBankDetails: SOABankDetails = {
  accountName:
    "CARAVAN TOURS & TRAVEL (ACE TRAVEL) CO LTD",

  accountNumber:
    "689964-002-15",

  iban:
    "SA56 5500 0000 0689 9640 0215",

  swiftCode:
    "BSFRSARI",

  bankName:
    "BANQUE SAUDI FRANSI",
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
     ACCOUNT
  ========================================================== */

  const [accountMode, setAccountMode] =
    useState<AccountMode>("All Account");

  const [selectedAccount, setSelectedAccount] =
    useState("1007");

  const [accountFrom, setAccountFrom] =
    useState("1001");

  const [accountTo, setAccountTo] =
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
     AGEING
  ========================================================== */

  const [ageing, setAgeing] =
    useState<AgeingMode>(
      "Without Ageing"
    );

  const [ageingMode, setAgeingMode] =
    useState("Days");

  /* ==========================================================
     POST STATUS
  ========================================================== */

  const [postStatus, setPostStatus] =
    useState<PostStatus>("All");

  /* ==========================================================
     ZERO BALANCE
  ========================================================== */

  const [printZeroBalance, setPrintZeroBalance] =
    useState<PrintZeroBalance>("Yes");

  /* ==========================================================
     STATUS
  ========================================================== */

  const [status, setStatus] =
    useState<StatusMode>(
      "Outstanding"
    );

  /* ==========================================================
     PRINT STATE
  ========================================================== */

  const [isPrinting, setIsPrinting] =
    useState(false);

  /* ==========================================================
     GET ACCOUNT OPTIONS
  ========================================================== */

  const accountOptions =
    reportType === "Customer"
      ? customerOptions
      : supplierOptions;

  /* ==========================================================
     FORMAT DATE
  ========================================================== */

  const formatReportDate = (
    value: string
  ) => {
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
     CUSTOMER DETAILS
  ========================================================== */

  const selectedAccountObject =
    accountOptions.find(
      (item) =>
        item.id === selectedAccount
    );

  const selectedCustomerName =
    selectedAccountObject?.name ||
    "E. A. JUFFALI & BROS H.O.";

  /* ==========================================================
     SOA DATA
  ========================================================== */

  const soaData = {
    customerId:
      selectedAccount || "1007",

    customerName:
      selectedCustomerName,

    division:
      selectedDivision === "ALL"
        ? ""
        : divisionOptions.find(
            (item) =>
              item.id === selectedDivision
          )?.name || "",

    paymentTerms:
      "30 DAYS",

    creditLimit:
      50000,

    currency:
      "SAR",

    periodFrom:
      formatReportDate(periodFrom),

    periodTo:
      formatReportDate(periodTo),

    vatNumber:
      "300220164600003",

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

    pageNumber:
      1,

    totalPages:
      1,
  };

  /* ==========================================================
     PRINT
  ========================================================== */

  const handlePrint = () => {
    setIsPrinting(true);
  };

  /* ==========================================================
     AFTER PRINT LAYER IS RENDERED
  ========================================================== */

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

  /* ==========================================================
     RESET PRINT STATE
  ========================================================== */

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
     CLOSE
  ========================================================== */

  const handleClose = () => {
    console.log(
      "Close Statement Of Account"
    );

    // Replace with your navigation:
    // navigate("/");

    window.history.back();
  };

  /* ==========================================================
     RENDER
  ========================================================== */

  return (
    <>
      {/* ======================================================
          MAIN SCREEN
      ====================================================== */}

      <div className="soa-main-page">

        <div className="soa-report-container">

          {/* ==================================================
              HEADER
          ================================================== */}

          <header className="soa-modern-header">

            <div className="soa-header-icon">
              <span>
                $
              </span>
            </div>

            <div>
              <h1>
                Statement of Account
              </h1>

              <p>
                Generate customer and supplier
                account statements
              </p>
            </div>

          </header>

          {/* ==================================================
              REPORT TYPE
          ================================================== */}

          <section className="soa-card"  id="rdgcustorsupp">

            <div className="soa-section-heading">

              <div className="soa-section-icon">
                <span>
                  ◉
                </span>
              </div>

              <div>
                <h2>
                  Statement Type
                </h2>

                <p>
                  Select the type of account
                  statement
                </p>
              </div>

            </div>

            <div className="soa-segment">

              <button
                type="button"
                id=""
                className={
                  reportType === "Customer"
                    ? "soa-segment-button active"
                    : "soa-segment-button"
                }
                onClick={() =>
                  setReportType(
                    "Customer"
                  )
                }
              >
                <span>
                  👤
                </span>

                Customer
              </button>

              <button
                type="button"
                className={
                  reportType === "Supplier"
                    ? "soa-segment-button active"
                    : "soa-segment-button"
                }
                onClick={() =>
                  setReportType(
                    "Supplier"
                  )
                }
              >
                <span>
                  🏢
                </span>

                Supplier
              </button>

            </div>

          </section>

          {/* ==================================================
              FILTER GRID
          ================================================== */}

          <div className="soa-filter-grid">

            {/* =================================================
                BRANCH CARD
            ================================================= */}

            <section className="soa-card" id="rdgbranch">

              <div className="soa-section-heading">

                <div className="soa-section-icon">
                  <span>
                    ⌖
                  </span>
                </div>

                <div>
                  <h2>
                    Branch
                  </h2>

                  <p>
                    Choose branch scope
                  </p>
                </div>

              </div>

              <div className="soa-radio-list">

                <label className="soa-radio-option">

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

                <label className="soa-radio-option">

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

              </div>

              {branchMode ===
                "One Branch" && (
                <div className="soa-field animated-field">

                  <label>
                    Branch
                  </label>

                  <select
                    value={selectedBranch}
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
                          {branch.name}
                        </option>
                      )
                    )}

                  </select>

                </div>
              )}

            </section>

            {/* =================================================
                ACCOUNT CARD
            ================================================= */}

            <section className="soa-card" id="rdgaccount">

              <div className="soa-section-heading">

                <div className="soa-section-icon">
                  <span>
                    #
                  </span>
                </div>

                <div>
                  <h2>
                    Account
                  </h2>

                  <p>
                    Select account range
                  </p>
                </div>

              </div>

              <div className="soa-radio-list">

                <label className="soa-radio-option">

                  <input
                    type="radio"
                    name="accountMode"
                    checked={
                      accountMode ===
                      "All Account"
                    }
                    onChange={() =>
                      setAccountMode(
                        "All Account"
                      )
                    }
                  />

                  <span>
                    All Accounts
                  </span>

                </label>

                <label className="soa-radio-option">

                  <input
                    type="radio"
                    name="accountMode"
                    checked={
                      accountMode ===
                      "One Account"
                    }
                    onChange={() =>
                      setAccountMode(
                        "One Account"
                      )
                    }
                  />

                  <span>
                    One Account
                  </span>

                </label>

                <label className="soa-radio-option">

                  <input
                    type="radio"
                    name="accountMode"
                    checked={
                      accountMode ===
                      "Range Account"
                    }
                    onChange={() =>
                      setAccountMode(
                        "Range Account"
                      )
                    }
                  />

                  <span>
                    Account Range
                  </span>

                </label>

              </div>

              {/* ==============================================
                  ONE ACCOUNT
              ============================================== */}

              {accountMode ===
                "One Account" && (
                <div className="soa-field animated-field">

                  <label>
                    Account
                  </label>

                  <select
                    value={selectedAccount}
                    onChange={(e) =>
                      setSelectedAccount(
                        e.target.value
                      )
                    }
                  >

                    {accountOptions.map(
                      (account) => (
                        <option
                          key={account.id}
                          value={account.id}
                        >
                          {account.id} -{" "}
                          {account.name}
                        </option>
                      )
                    )}

                  </select>

                </div>
              )}

              {/* ==============================================
                  ACCOUNT RANGE
              ============================================== */}

              {accountMode ===
                "Range Account" && (
                <div className="soa-range-fields animated-field">

                  <div className="soa-field">

                    <label>
                      From Account
                    </label>

                    <select
                      value={accountFrom}
                      onChange={(e) =>
                        setAccountFrom(
                          e.target.value
                        )
                      }
                    >

                      {accountOptions.map(
                        (account) => (
                          <option
                            key={account.id}
                            value={account.id}
                          >
                            {account.id} -{" "}
                            {account.name}
                          </option>
                        )
                      )}

                    </select>

                  </div>

                  <div className="soa-range-arrow">
                    →
                  </div>

                  <div className="soa-field">

                    <label>
                      To Account
                    </label>

                    <select
                      value={accountTo}
                      onChange={(e) =>
                        setAccountTo(
                          e.target.value
                        )
                      }
                    >

                      {accountOptions.map(
                        (account) => (
                          <option
                            key={account.id}
                            value={account.id}
                          >
                            {account.id} -{" "}
                            {account.name}
                          </option>
                        )
                      )}

                    </select>

                  </div>

                </div>
              )}

            </section>

            {/* =================================================
                DIVISION CARD
            ================================================= */}

            <section className="soa-card" id="rdgdivision">

              <div className="soa-section-heading">

                <div className="soa-section-icon">
                  <span>
                    ◇
                  </span>
                </div>

                <div>
                  <h2>
                    Division
                  </h2>

                  <p>
                    Filter by division
                  </p>
                </div>

              </div>

              <div className="soa-radio-list">

                <label className="soa-radio-option">

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
                    All Divisions
                  </span>

                </label>

                <label className="soa-radio-option">

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

              </div>

              {divisionMode ===
                "One Division" && (
                <div className="soa-field animated-field">

                  <label>
                    Division
                  </label>

                  <select
                    value={selectedDivision}
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
                            key={division.id}
                            value={division.id}
                          >
                            {division.name}
                          </option>
                        )
                      )}

                  </select>

                </div>
              )}

            </section>

            {/* =================================================
                STATUS CARD
            ================================================= */}

            <section className="soa-card" id="rdgstatus">

              <div className="soa-section-heading">

                <div className="soa-section-icon">
                  <span>
                    ✓
                  </span>
                </div>

                <div>
                  <h2>
                    Status
                  </h2>

                  <p>
                    Select statement status
                  </p>
                </div>

              </div>

              <div className="soa-status-options">

                <label
                  className={
                    status ===
                    "Outstanding"
                      ? "soa-status-option active"
                      : "soa-status-option"
                  }
                >

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

                  <span className="status-dot outstanding" />

                  <span>
                    Outstanding
                  </span>

                </label>

                <label
                  className={
                    status === "All"
                      ? "soa-status-option active"
                      : "soa-status-option"
                  }
                >

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

                  <span className="status-dot all" />

                  <span>
                    All Transactions
                  </span>

                </label>

              </div>

            </section>

          </div>

          {/* ==================================================
              PERIOD + OPTIONS
          ================================================== */}

          <section className="soa-card">

            <div className="soa-section-heading">

              <div className="soa-section-icon">
                <span>
                  ◷
                </span>
              </div>

              <div>
                <h2>
                  Report Period & Options
                </h2>

                <p>
                  Configure the statement
                  generation options
                </p>
              </div>

            </div>

            <div className="soa-options-grid">

              {/* =============================================
                  FROM DATE
              ============================================= */}

              <div className="soa-field">

                <label>
                  Period From
                </label>

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

              </div>

              {/* =============================================
                  TO DATE
              ============================================= */}

              <div className="soa-field">

                <label>
                  Period To
                </label>

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

              {/* =============================================
                  AGEING
              ============================================= */}

              <div className="soa-field">

                <label>
                  Ageing
                </label>

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

              {/* =============================================
                  AGEING MODE
              ============================================= */}

              <div className="soa-field">

                <label>
                  Ageing Mode
                </label>

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

              {/* =============================================
                  POST STATUS
              ============================================= */}

              <div className="soa-field">

                <label>
                  Post Status
                </label>

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

              {/* =============================================
                  ZERO BALANCE
              ============================================= */}

              <div className="soa-field">

                <label>
                  Print Zero Balance
                </label>

                <select
                id="lkpPrintZeroBalance"
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

          </section>

          {/* ==================================================
              SUMMARY
          ================================================== */}

          <div className="soa-summary">

            <div className="soa-summary-item">

              <span>
                Statement
              </span>

              <strong>
                {reportType}
              </strong>

            </div>

            <div className="soa-summary-divider" />

            <div className="soa-summary-item">

              <span>
                Period
              </span>

              <strong>
                {formatReportDate(
                  periodFrom
                )}{" "}
                →{" "}
                {formatReportDate(
                  periodTo
                )}
              </strong>

            </div>

            <div className="soa-summary-divider" />

            <div className="soa-summary-item">

              <span>
                Status
              </span>

              <strong>
                {status}
              </strong>

            </div>

          </div>

          {/* ==================================================
              ACTIONS
          ================================================== */}

          <div className="soa-actions">

            <button
              type="button"
              id="btnClose"
              className="soa-button secondary"
              onClick={handleClose}
            >
              <span>
                ×
              </span>

              Close
            </button>

            <button
            id="btnPdfExport"
              type="button"
              className="soa-button secondary"
              onClick={handlePrint}
            >
              <span>
                ⇩
              </span>

              PDF Export
            </button>

            <button
            id="btnPrint"
              type="button"
              className="soa-button primary"
              onClick={handlePrint}
            >
              <span>
                ⎙
              </span>

              Print Statement
            </button>

          </div>

        </div>

      </div>

      {/* ======================================================
          PRINT ONLY LAYER

          IMPORTANT:
          This component NEVER appears on the frontend.
          It becomes visible only while printing.
      ====================================================== */}

      {isPrinting && (
        <div className="soa-print-root">

          <StatementOfAccount
            {...soaData}
          />

        </div>
      )}

      {/* ======================================================
          SCREEN STYLES
      ====================================================== */}

      <style>{`

        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
        }

        /* ====================================================
           MAIN BACKGROUND
        ==================================================== */

        .soa-main-page {
          min-height: 100vh;

          padding: 35px 20px 50px;

          background:
            linear-gradient(
              135deg,
              #f3f7f6 0%,
              #edf3f5 50%,
              #f7f9fa 100%
            );

          font-family:
            "Inter",
            "Segoe UI",
            Arial,
            sans-serif;

          color: #20313d;
        }

        /* ====================================================
           CONTAINER
        ==================================================== */

        .soa-report-container {
          width: min(
            100%,
            1050px
          );

          margin: 0 auto;
        }

        /* ====================================================
           HEADER
        ==================================================== */

        .soa-modern-header {
          display: flex;

          align-items: center;

          gap: 15px;

          margin-bottom: 25px;
        }

        .soa-header-icon {
          width: 48px;
          height: 48px;

          display: flex;

          align-items: center;
          justify-content: center;

          border-radius: 12px;

          background:
            linear-gradient(
              135deg,
              #198754,
              #43b581
            );

          color: #ffffff;

          font-size: 21px;

          box-shadow:
            0 5px 15px
            rgba(25, 135, 84, 0.20);
        }

        .soa-modern-header h1 {
          margin: 0;

          font-size: 25px;

          font-weight: 700;

          letter-spacing: -0.4px;

          color: #183c31;
        }

        .soa-modern-header p {
          margin: 4px 0 0;

          font-size: 13px;

          color: #70818b;
        }

        /* ====================================================
           CARD
        ==================================================== */

        .soa-card {
          background: #ffffff;

          border: 1px solid #dfe8e5;

          border-radius: 10px;

          padding: 20px;

          margin-bottom: 17px;

          box-shadow:
            0 3px 12px
            rgba(31, 56, 49, 0.05);
        }

        .soa-section-heading {
          display: flex;

          align-items: center;

          gap: 11px;

          margin-bottom: 17px;
        }

        .soa-section-icon {
          width: 35px;
          height: 35px;

          display: flex;

          align-items: center;
          justify-content: center;

          flex-shrink: 0;

          border-radius: 8px;

          background: #e8f6ef;

          color: #168252;

          font-size: 16px;

          font-weight: 600;
        }

        .soa-section-heading h2 {
          margin: 0;

          font-size: 15px;

          font-weight: 650;

          color: #253b46;
        }

        .soa-section-heading p {
          margin: 3px 0 0;

          font-size: 11.5px;

          color: #87959d;
        }

        /* ====================================================
           SEGMENT
        ==================================================== */

        .soa-segment {
          display: grid;

          grid-template-columns: 1fr 1fr;

          gap: 10px;

          max-width: 550px;
        }

        .soa-segment-button {
          height: 48px;

          border: 1px solid #d6e1dc;

          border-radius: 8px;

          background: #f8faf9;

          color: #53666f;

          font-size: 13px;

          font-weight: 550;

          cursor: pointer;

          transition:
            border-color 0.15s,
            background 0.15s,
            color 0.15s,
            transform 0.15s;

          display: flex;

          align-items: center;
          justify-content: center;

          gap: 8px;
        }

        .soa-segment-button:hover {
          border-color: #8bc9aa;

          background: #f2faf6;
        }

        .soa-segment-button.active {
          border-color: #37a875;

          background: #e9f8f0;

          color: #167549;

          box-shadow:
            0 0 0 2px
            rgba(55, 168, 117, 0.08);
        }

        /* ====================================================
           FILTER GRID
        ==================================================== */

        .soa-filter-grid {
          display: grid;

          grid-template-columns:
            repeat(2, minmax(0, 1fr));

          gap: 17px;
        }

        .soa-filter-grid .soa-card {
          margin-bottom: 0;

          min-height: 235px;
        }

        /* ====================================================
           RADIO
        ==================================================== */

        .soa-radio-list {
          display: flex;

          flex-wrap: wrap;

          gap: 9px 17px;

          margin-bottom: 15px;
        }

        .soa-radio-option {
          display: flex;

          align-items: center;

          gap: 7px;

          font-size: 12.5px;

          color: #52646e;

          cursor: pointer;
        }

        .soa-radio-option input {
          width: 15px;
          height: 15px;

          margin: 0;

          accent-color: #22915f;
        }

        .soa-radio-option:hover {
          color: #1e6e4b;
        }

        /* ====================================================
           FIELD
        ==================================================== */

        .soa-field {
          display: flex;

          flex-direction: column;

          gap: 6px;
        }

        .soa-field label {
          font-size: 11.5px;

          font-weight: 600;

          color: #52656f;
        }

        .soa-field select,
        .soa-field input {
          width: 100%;

          height: 38px;

          padding:
            0 11px;

          border: 1px solid #d2deda;

          border-radius: 6px;

          background: #ffffff;

          color: #263b46;

          font-family: inherit;

          font-size: 12px;

          outline: none;

          transition:
            border-color 0.15s,
            box-shadow 0.15s;
        }

        .soa-field select:hover,
        .soa-field input:hover {
          border-color: #a8c8b9;
        }

        .soa-field select:focus,
        .soa-field input:focus {
          border-color: #43a878;

          box-shadow:
            0 0 0 3px
            rgba(67, 168, 120, 0.10);
        }

        /* ====================================================
           RANGE
        ==================================================== */

        .soa-range-fields {
          display: grid;

          grid-template-columns:
            1fr
            25px
            1fr;

          align-items: end;

          gap: 7px;
        }

        .soa-range-arrow {
          height: 38px;

          display: flex;

          align-items: center;
          justify-content: center;

          color: #7a8d96;

          font-size: 17px;
        }

        /* ====================================================
           ANIMATION
        ==================================================== */

        .animated-field {
          animation:
            soaFieldIn
            0.18s
            ease-out;
        }

        @keyframes soaFieldIn {

          from {
            opacity: 0;

            transform:
              translateY(-4px);
          }

          to {
            opacity: 1;

            transform:
              translateY(0);
          }

        }

        /* ====================================================
           STATUS
        ==================================================== */

        .soa-status-options {
          display: grid;

          gap: 9px;
        }

        .soa-status-option {
          min-height: 47px;

          display: flex;

          align-items: center;

          gap: 9px;

          padding:
            0 12px;

          border: 1px solid #e0e7e4;

          border-radius: 7px;

          background: #fbfcfc;

          font-size: 12px;

          color: #60717a;

          cursor: pointer;
        }

        .soa-status-option.active {
          border-color: #9bd1b5;

          background: #f1faf5;

          color: #267451;
        }

        .soa-status-option input {
          display: none;
        }

        .status-dot {
          width: 9px;
          height: 9px;

          border-radius: 50%;

          border: 2px solid
            #b9c5c0;

          background: transparent;
        }

        .soa-status-option.active
        .status-dot {
          border-color: #24955f;

          background: #24955f;

          box-shadow:
            0 0 0 3px
            rgba(36, 149, 95, 0.10);
        }

        /* ====================================================
           OPTIONS
        ==================================================== */

        .soa-options-grid {
          display: grid;

          grid-template-columns:
            repeat(3, 1fr);

          gap: 17px;
        }

        /* ====================================================
           SUMMARY
        ==================================================== */

        .soa-summary {
          min-height: 62px;

          display: flex;

          align-items: center;

          padding:
            0 18px;

          margin-bottom: 17px;

          border:
            1px solid #cde6d9;

          border-radius: 9px;

          background:
            linear-gradient(
              90deg,
              #effaf4,
              #f7fbf9
            );
        }

        .soa-summary-item {
          flex: 1;

          display: flex;

          flex-direction: column;

          gap: 4px;
        }

        .soa-summary-item span {
          font-size: 10.5px;

          color: #789087;
        }

        .soa-summary-item strong {
          font-size: 12.5px;

          color: #256046;
        }

        .soa-summary-divider {
          width: 1px;

          height: 30px;

          background: #d4e7dd;

          margin:
            0 18px;
        }

        /* ====================================================
           ACTIONS
        ==================================================== */

        .soa-actions {
          display: flex;

          justify-content: flex-end;

          align-items: center;

          gap: 10px;
        }

        .soa-button {
          height: 42px;

          padding:
            0 18px;

          display: flex;

          align-items: center;
          justify-content: center;

          gap: 7px;

          border-radius: 7px;

          font-family: inherit;

          font-size: 12.5px;

          font-weight: 600;

          cursor: pointer;

          transition:
            transform 0.12s,
            box-shadow 0.12s,
            background 0.12s;
        }

        .soa-button:hover {
          transform:
            translateY(-1px);
        }

        .soa-button:active {
          transform:
            translateY(0);
        }

        .soa-button.secondary {
          border: 1px solid #d3dfda;

          background: #ffffff;

          color: #536870;
        }

        .soa-button.secondary:hover {
          background: #f6faf8;

          border-color: #abc7b9;
        }

        .soa-button.primary {
          border: 1px solid #168354;

          background:
            linear-gradient(
              135deg,
              #168354,
              #2da66e
            );

          color: #ffffff;

          box-shadow:
            0 5px 12px
            rgba(22, 131, 84, 0.18);
        }

        .soa-button.primary:hover {
          box-shadow:
            0 7px 16px
            rgba(22, 131, 84, 0.25);
        }

        /* ====================================================
           PRINT ROOT
        ==================================================== */

        .soa-print-root {
          display: none;
        }

        /* ====================================================
           RESPONSIVE
        ==================================================== */

        @media (max-width: 800px) {

          .soa-filter-grid {
            grid-template-columns: 1fr;
          }

          .soa-options-grid {
            grid-template-columns:
              repeat(2, 1fr);
          }

        }

        @media (max-width: 550px) {

          .soa-main-page {
            padding:
              20px 12px;
          }

          .soa-card {
            padding: 15px;
          }

          .soa-options-grid {
            grid-template-columns: 1fr;
          }

          .soa-summary {
            flex-direction: column;

            align-items: flex-start;

            padding:
              13px 15px;

            gap: 10px;
          }

          .soa-summary-divider {
            display: none;
          }

          .soa-actions {
            flex-direction: column-reverse;

            align-items: stretch;
          }

          .soa-button {
            width: 100%;
          }

          .soa-range-fields {
            grid-template-columns: 1fr;
          }

          .soa-range-arrow {
            display: none;
          }

        }

        /* ====================================================
           PRINT
        ==================================================== */

        @media print {

          /*
             Hide EVERYTHING from the application.
          */

          body > * {
            visibility: hidden !important;
          }

          /*
             Show ONLY SOA print root.
          */

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

          /*
             Important:
             remove screen page styling from print root.
          */

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