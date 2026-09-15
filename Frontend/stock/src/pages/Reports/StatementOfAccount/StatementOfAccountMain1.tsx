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

type AccountMode =
  | "One Account"
  | "Range Account"
  | "All Account";

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

/* ============================================================
   DUMMY DATA
============================================================ */

const branches = [
  { id: "RYD", name: "Riyadh" },
  { id: "JED", name: "Jeddah" },
  { id: "DMM", name: "Dammam" },
];

const customers = [
  {
    id: "1001",
    name: "AL RAJHI TRADING COMPANY",
  },
  {
    id: "1002",
    name: "SAUDI AIRLINES",
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

const suppliers = [
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

const divisions = [
  {
    id: "TRAVEL",
    name: "Travel",
  },
  {
    id: "TOURS",
    name: "Tours",
  },
  {
    id: "CORPORATE",
    name: "Corporate",
  },
];

/* ============================================================
   DUMMY REPORT DATA
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
     STATE
  ========================================================== */

  const [reportType, setReportType] =
    useState<ReportType>("Customer");

  const [branchMode, setBranchMode] =
    useState<BranchMode>("All Branch");

  const [selectedBranch, setSelectedBranch] =
    useState("RYD");

  const [accountMode, setAccountMode] =
    useState<AccountMode>("All Account");

  const [selectedAccount, setSelectedAccount] =
    useState("1007");

  const [accountFrom, setAccountFrom] =
    useState("1001");

  const [accountTo, setAccountTo] =
    useState("1010");

  const [divisionMode, setDivisionMode] =
    useState<DivisionMode>("All Division");

  const [selectedDivision, setSelectedDivision] =
    useState("TRAVEL");

  const [status, setStatus] =
    useState<StatusMode>("Outstanding");

  const [periodFrom, setPeriodFrom] =
    useState("2026-09-01");

  const [periodTo, setPeriodTo] =
    useState("2026-09-30");

  const [ageing, setAgeing] =
    useState<AgeingMode>("Without Ageing");

  const [ageingMode, setAgeingMode] =
    useState("Days");

  const [postStatus, setPostStatus] =
    useState<PostStatus>("All");

  const [printZeroBalance, setPrintZeroBalance] =
    useState<"Yes" | "No">("Yes");

  const [isPrinting, setIsPrinting] =
    useState(false);

  /* ==========================================================
     ACCOUNT OPTIONS
  ========================================================== */

  const accountOptions =
    reportType === "Customer"
      ? customers
      : suppliers;

  /* ==========================================================
     SELECTED ACCOUNT
  ========================================================== */

  const selectedAccountData =
    accountOptions.find(
      (item) =>
        item.id === selectedAccount
    );

  /* ==========================================================
     DATE FORMAT
  ========================================================== */

  const formatDate = (
    value: string
  ) => {
    if (!value) {
      return "";
    }

    const [year, month, day] =
      value.split("-");

    return new Date(
      Number(year),
      Number(month) - 1,
      Number(day)
    ).toLocaleDateString(
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
      selectedAccount,

    customerName:
      selectedAccountData?.name ||
      "E. A. JUFFALI & BROS H.O.",

    division:
      divisionMode === "All Division"
        ? ""
        : divisions.find(
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
      formatDate(periodFrom),

    periodTo:
      formatDate(periodTo),

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

  useEffect(() => {
    if (!isPrinting) {
      return;
    }

    const timer =
      window.setTimeout(() => {
        window.print();
      }, 150);

    return () => {
      window.clearTimeout(timer);
    };
  }, [isPrinting]);

  useEffect(() => {
    const afterPrint = () => {
      setIsPrinting(false);
    };

    window.addEventListener(
      "afterprint",
      afterPrint
    );

    return () => {
      window.removeEventListener(
        "afterprint",
        afterPrint
      );
    };
  }, []);

  /* ==========================================================
     CLOSE
  ========================================================== */

  const handleClose = () => {
    window.history.back();
  };

  /* ==========================================================
     RADIO COMPONENT
  ========================================================== */

  const Radio = ({
    name,
    checked,
    onChange,
    children,
  }: {
    name: string;
    checked: boolean;
    onChange: () => void;
    children: React.ReactNode;
  }) => (
    <label className="soa-radio">
      <input
        type="radio"
        name={name}
        checked={checked}
        onChange={onChange}
      />

      <span className="soa-radio-circle" />

      <span>
        {children}
      </span>
    </label>
  );

  /* ==========================================================
     RENDER
  ========================================================== */

  return (
    <>
      {/* ======================================================
          MAIN SCREEN
      ====================================================== */}

      <main className="soa-main">

        <div className="soa-panel">

          {/* ==================================================
              HEADER
          ================================================== */}

          <header className="soa-header">

            <div>

              <h1>
                Statement of Account
              </h1>

              <p>
                Generate and print account
                statements
              </p>

            </div>

          </header>

          {/* ==================================================
              STATEMENT TYPE
          ================================================== */}

          <section className="soa-section">

            <div className="soa-section-title">
              Statement For
            </div>

            <div className="soa-type-buttons">

              <button
                type="button"
                className={
                  reportType === "Customer"
                    ? "soa-type active"
                    : "soa-type"
                }
                onClick={() =>
                  setReportType("Customer")
                }
              >
                <span className="soa-type-radio" />
                Customer
              </button>

              <button
                type="button"
                className={
                  reportType === "Supplier"
                    ? "soa-type active"
                    : "soa-type"
                }
                onClick={() =>
                  setReportType("Supplier")
                }
              >
                <span className="soa-type-radio" />
                Supplier
              </button>

            </div>

          </section>

          {/* ==================================================
              FILTER GRID
          ================================================== */}

          <div className="soa-grid">

            {/* =================================================
                BRANCH
            ================================================= */}

            <section className="soa-section">

              <div className="soa-section-title">
                Branch
              </div>

              <Radio
                name="branch"
                checked={
                  branchMode ===
                  "All Branch"
                }
                onChange={() =>
                  setBranchMode(
                    "All Branch"
                  )
                }
              >
                All Branches
              </Radio>

              <Radio
                name="branch"
                checked={
                  branchMode ===
                  "One Branch"
                }
                onChange={() =>
                  setBranchMode(
                    "One Branch"
                  )
                }
              >
                One Branch
              </Radio>

              {branchMode ===
                "One Branch" && (
                <div className="soa-inline-field">

                  <select
                    value={selectedBranch}
                    onChange={(e) =>
                      setSelectedBranch(
                        e.target.value
                      )
                    }
                  >

                    {branches.map(
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
                ACCOUNT
            ================================================= */}

            <section className="soa-section">

              <div className="soa-section-title">
                Account
              </div>

              <Radio
                name="account"
                checked={
                  accountMode ===
                  "All Account"
                }
                onChange={() =>
                  setAccountMode(
                    "All Account"
                  )
                }
              >
                All Accounts
              </Radio>

              <Radio
                name="account"
                checked={
                  accountMode ===
                  "One Account"
                }
                onChange={() =>
                  setAccountMode(
                    "One Account"
                  )
                }
              >
                One Account
              </Radio>

              <Radio
                name="account"
                checked={
                  accountMode ===
                  "Range Account"
                }
                onChange={() =>
                  setAccountMode(
                    "Range Account"
                  )
                }
              >
                Account Range
              </Radio>

              {accountMode ===
                "One Account" && (
                <div className="soa-inline-field">

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

              {accountMode ===
                "Range Account" && (
                <div className="soa-range">

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
                          {account.id}
                        </option>
                      )
                    )}

                  </select>

                  <span>
                    to
                  </span>

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
                          {account.id}
                        </option>
                      )
                    )}

                  </select>

                </div>
              )}

            </section>

            {/* =================================================
                DIVISION
            ================================================= */}

            <section className="soa-section">

              <div className="soa-section-title">
                Division
              </div>

              <Radio
                name="division"
                checked={
                  divisionMode ===
                  "All Division"
                }
                onChange={() =>
                  setDivisionMode(
                    "All Division"
                  )
                }
              >
                All Divisions
              </Radio>

              <Radio
                name="division"
                checked={
                  divisionMode ===
                  "One Division"
                }
                onChange={() =>
                  setDivisionMode(
                    "One Division"
                  )
                }
              >
                One Division
              </Radio>

              {divisionMode ===
                "One Division" && (
                <div className="soa-inline-field">

                  <select
                    value={selectedDivision}
                    onChange={(e) =>
                      setSelectedDivision(
                        e.target.value
                      )
                    }
                  >

                    {divisions.map(
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
                STATUS
            ================================================= */}

            <section className="soa-section">

              <div className="soa-section-title">
                Status
              </div>

              <Radio
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
              >
                Outstanding
              </Radio>

              <Radio
                name="status"
                checked={
                  status === "All"
                }
                onChange={() =>
                  setStatus("All")
                }
              >
                All Transactions
              </Radio>

            </section>

          </div>

          {/* ==================================================
              REPORT OPTIONS
          ================================================== */}

          <section className="soa-section soa-options">

            <div className="soa-section-title">
              Report Options
            </div>

            <div className="soa-options-grid">

              <div className="soa-field">

                <label>
                  Period From
                </label>

                <input
                  type="date"
                  value={periodFrom}
                  onChange={(e) =>
                    setPeriodFrom(
                      e.target.value
                    )
                  }
                />

              </div>

              <div className="soa-field">

                <label>
                  Period To
                </label>

                <input
                  type="date"
                  value={periodTo}
                  onChange={(e) =>
                    setPeriodTo(
                      e.target.value
                    )
                  }
                />

              </div>

              <div className="soa-field">

                <label>
                  Ageing
                </label>

                <select
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

              <div className="soa-field">

                <label>
                  Ageing Mode
                </label>

                <select
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

              <div className="soa-field">

                <label>
                  Post Status
                </label>

                <select
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

              <div className="soa-field">

                <label>
                  Print 0 Balance
                </label>

                <select
                  value={printZeroBalance}
                  onChange={(e) =>
                    setPrintZeroBalance(
                      e.target.value as
                        | "Yes"
                        | "No"
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
              FOOTER ACTIONS
          ================================================== */}

          <footer className="soa-footer">

            <button
              type="button"
              className="soa-btn cancel"
              onClick={handleClose}
            >
              Close
            </button>

            <button
              type="button"
              className="soa-btn pdf"
              onClick={handlePrint}
            >
              PDF Export
            </button>

            <button
              type="button"
              className="soa-btn print"
              onClick={handlePrint}
            >
              Print Statement
            </button>

          </footer>

        </div>

      </main>

      {/* ======================================================
          PRINT-ONLY SOA
      ====================================================== */}

      {isPrinting && (
        <div className="soa-print-only">

          <StatementOfAccount
            {...soaData}
          />

        </div>
      )}

      {/* ======================================================
          STYLES
      ====================================================== */}

      <style>{`

        * {
          box-sizing: border-box;
        }

        /* ====================================================
           PAGE
        ==================================================== */

        .soa-main {
          min-height: 100vh;

          padding: 35px 20px;

          background: #f3f5f6;

          font-family:
            "Segoe UI",
            Arial,
            sans-serif;

          color: #25343d;
        }

        /* ====================================================
           PANEL
        ==================================================== */

        .soa-panel {
          width: 720px;

          max-width: 100%;

          margin: 0 auto;

          background: #ffffff;

          border:
            1px solid #d8e0dd;

          border-radius: 6px;

          box-shadow:
            0 3px 12px
            rgba(31, 52, 45, 0.08);

          overflow: hidden;
        }

        /* ====================================================
           HEADER
        ==================================================== */

        .soa-header {
          padding:
            19px 24px;

          border-bottom:
            1px solid #dfe6e3;

          background: #ffffff;
        }

        .soa-header h1 {
          margin: 0;

          font-size: 20px;

          font-weight: 600;

          color: #1f4537;
        }

        .soa-header p {
          margin:
            4px 0 0;

          font-size: 12px;

          color: #7a898f;
        }

        /* ====================================================
           SECTION
        ==================================================== */

        .soa-section {
          padding:
            17px 24px;

          border-bottom:
            1px solid #e5ebe8;
        }

        .soa-section-title {
          margin-bottom: 12px;

          font-size: 12px;

          font-weight: 600;

          color: #365248;

          text-transform: uppercase;

          letter-spacing:
            0.3px;
        }

        /* ====================================================
           TYPE
        ==================================================== */

        .soa-type-buttons {
          display: flex;

          gap: 10px;
        }

        .soa-type {
          height: 38px;

          min-width: 145px;

          padding:
            0 15px;

          display: flex;

          align-items: center;

          gap: 9px;

          border:
            1px solid #d6dfdb;

          border-radius: 5px;

          background: #ffffff;

          color: #596a70;

          font-size: 12px;

          cursor: pointer;
        }

        .soa-type.active {
          border-color: #68ad8a;

          background: #eff8f3;

          color: #246347;
        }

        .soa-type-radio {
          width: 12px;
          height: 12px;

          border:
            1px solid #aebbb5;

          border-radius: 50%;

          position: relative;
        }

        .soa-type.active
        .soa-type-radio {
          border-color: #23875a;
        }

        .soa-type.active
        .soa-type-radio::after {
          content: "";

          position: absolute;

          width: 6px;
          height: 6px;

          left: 2px;
          top: 2px;

          border-radius: 50%;

          background: #23875a;
        }

        /* ====================================================
           GRID
        ==================================================== */

        .soa-grid {
          display: grid;

          grid-template-columns:
            1fr
            1fr;
        }

        .soa-grid .soa-section {
          min-height: 190px;
        }

        .soa-grid .soa-section:nth-child(
          odd
        ) {
          border-right:
            1px solid #e5ebe8;
        }

        /* ====================================================
           RADIO
        ==================================================== */

        .soa-radio {
          display: flex;

          align-items: center;

          gap: 8px;

          min-height: 29px;

          font-size: 12px;

          color: #52636b;

          cursor: pointer;
        }

        .soa-radio input {
          display: none;
        }

        .soa-radio-circle {
          width: 14px;
          height: 14px;

          border:
            1px solid #b6c2bd;

          border-radius: 50%;

          position: relative;

          flex-shrink: 0;
        }

        .soa-radio input:checked
        + .soa-radio-circle {
          border-color: #26885b;
        }

        .soa-radio input:checked
        + .soa-radio-circle::after {
          content: "";

          position: absolute;

          width: 7px;
          height: 7px;

          left: 2px;
          top: 2px;

          border-radius: 50%;

          background: #26885b;
        }

        /* ====================================================
           SELECT
        ==================================================== */

        .soa-inline-field {
          margin-top: 8px;

          padding-left: 22px;
        }

        .soa-inline-field select {
          width: 100%;

          height: 34px;

          padding:
            0 9px;

          border:
            1px solid #d1dbd7;

          border-radius: 4px;

          background: #ffffff;

          color: #30444d;

          font-size: 12px;

          outline: none;
        }

        .soa-inline-field select:focus {
          border-color: #5ca983;

          box-shadow:
            0 0 0 2px
            rgba(92, 169, 131, 0.10);
        }

        /* ====================================================
           RANGE
        ==================================================== */

        .soa-range {
          display: grid;

          grid-template-columns:
            1fr
            auto
            1fr;

          align-items: center;

          gap: 7px;

          padding-left: 22px;

          margin-top: 8px;
        }

        .soa-range select {
          height: 34px;

          min-width: 0;

          padding:
            0 8px;

          border:
            1px solid #d1dbd7;

          border-radius: 4px;

          background: #ffffff;

          font-size: 12px;

          color: #30444d;

          outline: none;
        }

        .soa-range span {
          font-size: 11px;

          color: #87938f;
        }

        /* ====================================================
           OPTIONS
        ==================================================== */

        .soa-options {
          border-bottom: none;
        }

        .soa-options-grid {
          display: grid;

          grid-template-columns:
            repeat(3, 1fr);

          gap: 15px;
        }

        .soa-field {
          display: flex;

          flex-direction: column;

          gap: 6px;
        }

        .soa-field label {
          font-size: 11px;

          color: #697a80;

          font-weight: 500;
        }

        .soa-field input,
        .soa-field select {
          width: 100%;

          height: 35px;

          padding:
            0 9px;

          border:
            1px solid #d1dbd7;

          border-radius: 4px;

          background: #ffffff;

          color: #30444d;

          font-size: 12px;

          outline: none;
        }

        .soa-field input:focus,
        .soa-field select:focus {
          border-color: #5ca983;

          box-shadow:
            0 0 0 2px
            rgba(92, 169, 131, 0.10);
        }

        /* ====================================================
           FOOTER
        ==================================================== */

        .soa-footer {
          display: flex;

          justify-content: flex-end;

          align-items: center;

          gap: 8px;

          padding:
            14px 24px;

          border-top:
            1px solid #e1e8e5;

          background: #fafcfc;
        }

        .soa-btn {
          height: 36px;

          padding:
            0 17px;

          border-radius: 4px;

          font-size: 12px;

          font-weight: 500;

          cursor: pointer;

          transition:
            0.15s ease;
        }

        .soa-btn.cancel {
          border:
            1px solid #d2dbd7;

          background: #ffffff;

          color: #68777d;
        }

        .soa-btn.pdf {
          border:
            1px solid #9ebfb0;

          background: #ffffff;

          color: #287051;
        }

        .soa-btn.print {
          border:
            1px solid #238459;

          background: #238459;

          color: #ffffff;
        }

        .soa-btn:hover {
          transform:
            translateY(-1px);
        }

        .soa-btn.cancel:hover {
          background: #f5f7f6;
        }

        .soa-btn.pdf:hover {
          background: #eff8f3;
        }

        .soa-btn.print:hover {
          background: #1c754e;
        }

        /* ====================================================
           PRINT LAYER
        ==================================================== */

        .soa-print-only {
          display: none;
        }

        /* ====================================================
           PRINT
        ==================================================== */

        @media print {

          /*
             Hide the entire application.
          */

          body > * {
            visibility: hidden !important;
          }

          /*
             Show only the print layer.
          */

          .soa-print-only {
            display: block !important;

            visibility: visible !important;

            position: absolute !important;

            top: 0 !important;
            left: 0 !important;

            width: 100% !important;

            margin: 0 !important;
            padding: 0 !important;
          }

          .soa-print-only,
          .soa-print-only * {
            visibility: visible !important;
          }

          /*
             Remove screen-only SOA styling.
          */

          .soa-print-only
          .soa-page-wrapper {
            margin: 0 !important;

            padding: 0 !important;

            min-height: 0 !important;

            background: #ffffff !important;
          }

          .soa-print-only
          .soa-toolbar {
            display: none !important;
          }

          .soa-print-only
          .soa-document {
            margin: 0 auto !important;

            box-shadow: none !important;

            border: none !important;
          }

          @page {
            size: A4 portrait;

            margin: 8mm;
          }

        }

        /* ====================================================
           MOBILE
        ==================================================== */

        @media (
          max-width: 650px
        ) {

          .soa-main {
            padding:
              15px 10px;
          }

          .soa-grid {
            grid-template-columns:
              1fr;
          }

          .soa-grid
          .soa-section {
            border-right: none !important;
          }

          .soa-options-grid {
            grid-template-columns:
              1fr;
          }

          .soa-footer {
            flex-direction:
              column-reverse;

            align-items:
              stretch;
          }

          .soa-btn {
            width: 100%;
          }

        }

      `}</style>
    </>
  );
};

export default StatementOfAccountMain;