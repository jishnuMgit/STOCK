import { useEffect, useState } from "react";
import { toast } from "react-toastify";

import type { PairOption } from "../../PairSelect/pairSelectParts";

// ============================================================
// BEGINNING BALANCE - what the page, the header, the grid and the footer share
// ============================================================

export const api = import.meta.env.VITE_API_URL;

// dbo.tblmenu fmenuid of the Beginning Balance page
export const MENU_ID = "110110";

// the grid always shows at least this many rows
export const MIN_ROWS = 13;

export type Option = {
  value: string;
  label: string;
};

// an account / cost center of the lists: the pair lists need value, label, id
// and name; chkHaveCC = the account needs a cost center
export type AccountOption = PairOption & { chkHaveCC?: boolean };

// the box values follow the element ids: lkpAccountID, lkpCCID, txtDebit,
// txtCredit (the Account Name box shows the name of lkpAccountID)
export type BeginningBalanceRow = {
  lkpAccountID: string;
  lkpCCID: string;
  txtDebit: string;
  txtCredit: string;
};

export const emptyRow = (): BeginningBalanceRow => ({
  lkpAccountID: "",
  lkpCCID: "",
  txtDebit: "",
  txtCredit: "",
});

export const isEmptyRow = (row: BeginningBalanceRow) =>
  !row.lkpAccountID && !row.lkpCCID && !row.txtDebit && !row.txtCredit;

/** keeps one empty row at the end and at least MIN_ROWS rows in total */
export const padRows = (rows: BeginningBalanceRow[]): BeginningBalanceRow[] => {
  const result = [...rows];

  if (result.length === 0 || !isEmptyRow(result[result.length - 1])) {
    result.push(emptyRow());
  }

  while (result.length < MIN_ROWS) result.push(emptyRow());

  return result;
};

// "1,234.50" -> 1234.5 ; "" or not a number -> 0
export const toAmount = (value: string): number => {
  const number = Number(String(value).replace(/,/g, ""));

  return Number.isFinite(number) ? number : 0;
};

// 1234.5 -> "1,234.50" (the totals)
export const formatAmount = (value: number): string =>
  value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

// the date the page opens with: today when the login year is this year, else the
// first day of the login year (yyyy-mm-dd)
export const defaultDate = (year: string): string => {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

  return today.slice(0, 4) === year || !/^\d{4}$/.test(year)
    ? today
    : `${year}-01-01`;
};

// ============================================================
// THE LISTS OF THE GRID: the head accounts (once by Account ID, once by Account
// Name) and the cost centers - the same database functions the Receipt screen
// uses. Loaded once.
// ============================================================

type AccountRow = {
  lkpAccountID: string;
  txtAccountName: string | null;
  chkHaveCC: boolean | null;
};

// showName: the Account Name box shows the name, the Account ID box the ID
const toAccountOptions = (
  rows: AccountRow[],
  showName: boolean,
): AccountOption[] =>
  rows.map((row) => ({
    value: row.lkpAccountID,
    label: showName ? (row.txtAccountName ?? "") : row.lkpAccountID,
    id: row.lkpAccountID,
    name: row.txtAccountName ?? "",
    chkHaveCC: row.chkHaveCC === true,
  }));

export function useBeginningBalanceLookups() {
  const [accountsByID, setAccountsByID] = useState<AccountOption[]>([]);
  const [accountsByName, setAccountsByName] = useState<AccountOption[]>([]);
  const [costCenters, setCostCenters] = useState<AccountOption[]>([]);

  useEffect(() => {
    const loadAccounts = async () => {
      try {
        const PstrCoID = localStorage.getItem("PstrCoID");

        if (!PstrCoID) {
          toast.error("getAccountList: no PstrCoID in localStorage");
          return;
        }

        const response = await fetch(
          `${api}/BeginningBalance/getAccountList?PstrCoID=${PstrCoID}`,
          { credentials: "include" },
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
          toast.error(result.message || "Failed to load the Accounts");
          return;
        }

        setAccountsByID(toAccountOptions(result.accountsByID || [], false));
        setAccountsByName(toAccountOptions(result.accountsByName || [], true));

        setCostCenters(
          (result.costCenters || []).map(
            (row: { lkpCCID: string; txtCCName: string | null }) => ({
              value: row.lkpCCID,
              label: row.lkpCCID,
              id: row.lkpCCID,
              name: row.txtCCName ?? "",
            }),
          ),
        );
      } catch (error: unknown) {
        console.error("getAccountList error:", error);
        toast.error("Failed to load the Accounts");
      }
    };

    loadAccounts();
  }, []);

  return { accountsByID, accountsByName, costCenters };
}
