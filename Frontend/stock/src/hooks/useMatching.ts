import { useCallback, useState } from "react";

export interface SelectOption {
  value: string;
  label: string;
}

export interface MatchAccountRow {
  [key: string]: unknown;
}

interface GetMatchAccountsParams {
  strDocType: string;
  strCSAccountID: string;
  strDivID: string;
  gstrCoID: string;
}

const useMatching = () => {
  const [divisionOptionsLocal, setDivisionOptionsLocal] =
    useState<SelectOption[]>([]);

  const [divisionLoading, setDivisionLoading] =
    useState(false);

  const [matchAccounts, setMatchAccounts] =
    useState<MatchAccountRow[]>([]);

  const [matchAccountsLoading, setMatchAccountsLoading] =
    useState(false);

  /* =========================================================
     FIRST API
     GET CUSTOMER DIVISION
  ========================================================= */
  const getDiv = useCallback(
    async (strCSAccountID: string): Promise<SelectOption[]> => {
      setDivisionOptionsLocal([]);

      if (!strCSAccountID?.trim()) {
        return [];
      }

      setDivisionLoading(true);

      try {
        const response = await fetch(
          "http://localhost:5000/api/Receipt/getDivID",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              customerid: strCSAccountID,
            }),
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP Error: ${response.status}`);
        }

        const result = await response.json();

        if (
          !result?.success ||
          !Array.isArray(result?.data)
        ) {
          setDivisionOptionsLocal([]);
          return [];
        }

        const options: SelectOption[] = result.data
          .map((division: any) => ({
            // Keep fDivID as the actual selected value because
            // the Match API expects strDivID.
            value: String(
              division.fdivid ??
              division.fDivID ??
              ""
            ),
            label: String(
              division.fdivname ??
              division.fDivName ??
              division.fdivid ??
              division.fDivID ??
              ""
            ),
          }))
          .filter(
            (option: SelectOption) =>
              option.value.trim() !== ""
          );

        setDivisionOptionsLocal(options);

        return options;
      } catch (error) {
        console.error(
          "Get Customer Division Error:",
          error
        );

        setDivisionOptionsLocal([]);
        return [];
      } finally {
        setDivisionLoading(false);
      }
    },
    []
  );

  /* =========================================================
     SECOND API
     GET MATCH ACCOUNTS

     Equivalent to:
     objMatchAccounts.GetData(
       strDocType,
       strCSAccountID,
       strDivID
     )
  ========================================================= */
  const getMatchAccounts = useCallback(
    async ({
      strDocType,
      strCSAccountID,
      strDivID,
      gstrCoID,
    }: GetMatchAccountsParams): Promise<MatchAccountRow[]> => {
      setMatchAccountsLoading(true);

      try {
        const response = await fetch(
          "http://localhost:5000/api/Match/getMatchAccounts",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              strDocType,
              strCSAccountID,
              strDivID,
              gstrCoID,
            }),
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP Error: ${response.status}`);
        }

        const result = await response.json();

        if (!result?.success) {
          throw new Error(
            result?.message ||
              "Failed to get match accounts"
          );
        }

        const data: MatchAccountRow[] =
          Array.isArray(result?.data)
            ? result.data
            : [];

        setMatchAccounts(data);

        return data;
      } catch (error) {
        console.error(
          "Get Match Accounts Error:",
          error
        );

        setMatchAccounts([]);
        throw error;
      } finally {
        setMatchAccountsLoading(false);
      }
    },
    []
  );

  /* =========================================================
     CLEAR MATCHING DATA
  ========================================================= */
  const clearMatchingData = useCallback(() => {
    setDivisionOptionsLocal([]);
    setMatchAccounts([]);
  }, []);

  return {
    divisionOptionsLocal,
    divisionLoading,
    matchAccounts,
    matchAccountsLoading,
    getDiv,
    getMatchAccounts,
    clearMatchingData,
  };
};

export default useMatching;
