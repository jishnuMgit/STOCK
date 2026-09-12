import { useState } from "react";

import CustomSelect, {
  type SelectOption,
} from "./CustomSelect";

import "./CustomSelect.css";

/* =========================================================
   ACCOUNT OPTIONS
========================================================= */

const accountOptions: SelectOption[] = [
  {
    id: "1101001",
    label: "PETTY CASH",
  },
  {
    id: "1102001",
    label: "AL RAJHI BANK",
  },
  {
    id: "1102002",
    label: "SAUDI NATIONAL BANK - SNB",
  },
  {
    id: "1102003",
    label: "SAUDI BRITISH BANK",
  },
  {
    id: "1102004",
    label: "BANQUE SAUDI FRANSI - BSF CVN",
  },
  {
    id: "1102005",
    label: "BSF- REGION ACCOUNT",
  },
  {
    id: "1102006",
    label: "BANQUE SAUDI FRANSI - BSF ACE",
  },
  {
    id: "1103001",
    label: "ACCOUNTS RECEIVABLE",
  },
  {
    id: "1103002",
    label: "ECL ALLOWANCE",
  },
  {
    id: "1104001",
    label: "CUSTOMER CONTROL ACCOUNT",
  },
];

/* =========================================================
   NUMBER OF INPUTS
========================================================= */

const INPUT_COUNT = 5;

/* =========================================================
   COMPONENT
========================================================= */

export default function Example() {
  /*
   * Each input stores its own Account ID.
   *
   * Example:
   *
   * [
   *   "1101001",
   *   "1102001",
   *   "",
   *   "",
   *   ""
   * ]
   */

  const [selectedAccounts, setSelectedAccounts] =
    useState<string[]>(
      Array(INPUT_COUNT).fill("")
    );

  /* =======================================================
     SELECT ACCOUNT
  ======================================================= */

  const handleAccountChange = (
    index: number,
    value: SelectOption
  ) => {
    console.log(
      `Row ${index + 1} selected:`,
      value
    );

    setSelectedAccounts((current) => {
      const updated = [...current];

      updated[index] = value.id;

      return updated;
    });
  };

  /* =======================================================
     SELECTED ACCOUNT DATA
  ======================================================= */

  const getSelectedAccount = (
    index: number
  ) => {
    return accountOptions.find(
      (option) =>
        option.id ===
        selectedAccounts[index]
    );
  };

  /* =======================================================
     CLEAR ACCOUNT
  ======================================================= */

  const clearAccount = (index: number) => {
    setSelectedAccounts((current) => {
      const updated = [...current];

      updated[index] = "";

      return updated;
    });
  };

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="winform-example-page">

      {/* =================================================
          TITLE
      ================================================= */}

      <div className="winform-example-title">
        Receipt Account Lookup
      </div>

      {/* =================================================
          INPUTS
      ================================================= */}

      <div className="winform-account-form">

        {Array.from(
          { length: INPUT_COUNT },
          (_, index) => {
            const selected =
              getSelectedAccount(index);

            return (
              <div
                className="winform-account-row"
                key={index}
              >

                {/* -----------------------------------------
                    SL NO
                ----------------------------------------- */}

                <div className="winform-account-sl">
                  {index + 1}
                </div>

                {/* -----------------------------------------
                    ACCOUNT
                ----------------------------------------- */}

                <div className="winform-account-field">

                  <CustomSelect
                    options={accountOptions}

                    value={
                      selectedAccounts[index]
                    }

                    placeholder=""

                    displayMode="id"

                    onChange={(
                      value: SelectOption
                    ) => {
                      handleAccountChange(
                        index,
                        value
                      );
                    }}
                  />

                </div>

                {/* -----------------------------------------
                    ACCOUNT NAME
                ----------------------------------------- */}

                <div className="winform-account-name">

                  {selected?.label || ""}

                </div>

                {/* -----------------------------------------
                    CLEAR
                ----------------------------------------- */}

                <button
                  type="button"
                  className="winform-clear-button"
                  onClick={() =>
                    clearAccount(index)
                  }
                >
                  ×
                </button>

              </div>
            );
          }
        )}

      </div>

      {/* =================================================
          SELECTED DATA
      ================================================= */}

      <div className="winform-result">

        <div className="winform-result-title">
          Selected Accounts
        </div>

        {selectedAccounts.map(
          (accountId, index) => {
            const account =
              getSelectedAccount(index);

            return (
              <div
                className="winform-result-row"
                key={index}
              >

                <span className="result-sl">
                  {index + 1}.
                </span>

                <span className="result-id">
                  {account?.id || ""}
                </span>

                <span className="result-name">
                  {account?.label || ""}
                </span>

              </div>
            );
          }
        )}

      </div>

    </div>
  );
}