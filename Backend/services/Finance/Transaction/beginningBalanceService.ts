import pool from "../../../DB/db.js";

/* =========================================================
   FINANCE > TRANSACTION > BEGINNING BALANCE - what the screen loads first:
   the branches, the default branch, the accounts (Account ID / Account Name
   boxes) and the cost centers. The same database functions the other screens
   use (the Branch box of Beginning Stock, the account and cost center boxes of
   Receipt).
========================================================= */

export type BeginningBalanceBranch = { fbrid: string; fbrname: string };

export type BeginningBalanceAccount = {
  faccountid: string;
  faccountname: string | null;
  fhavecc: boolean | null;
};

export type BeginningBalanceCostCenter = {
  fccid: string;
  fccname: string | null;
};

/* =========================================================
   BRANCHES the logged-in user has a right to (dbo.userbranches), in the
   position order of the Branch screen
========================================================= */

export async function getBeginningBalanceBranchListService(
  PstrCoID: string,
  PstrUserID: string
): Promise<BeginningBalanceBranch[]> {
  const result = await pool.query(
    `
    SELECT fbrid, fbrname
    FROM dbo.tblbranch
    WHERE fcoid = $1
      AND dbo.userbranches($1, $2, fbrid)
    ORDER BY fpositionno, fbrid
    `,
    [PstrCoID, PstrUserID]
  );

  return result.rows;
}

/* =========================================================
   DEFAULT BRANCH of the logged-in user (dbo.getuserdefbranch, from
   tbldefaultbranch - the Set Default Branch screen). Empty when none is set.
========================================================= */

export async function getBeginningBalanceDefaultBranchService(
  PstrCoID: string,
  PstrUserID: string
): Promise<string> {
  const result = await pool.query(
    `SELECT dbo.getuserdefbranch($1, $2) AS "defaultBranch"`,
    [PstrCoID, PstrUserID]
  );

  return String(result.rows[0]?.defaultBranch ?? "").trim();
}

/* =========================================================
   ACCOUNTS: the head accounts of the company - one list ordered by Account ID
   (dbo.filllookupaccountid) and one by Account Name (dbo.filllookupaccountname),
   the same rows. fhavecc says the account needs a cost center.
========================================================= */

export async function getBeginningBalanceAccountListService(
  PstrCoID: string
): Promise<{
  byId: BeginningBalanceAccount[];
  byName: BeginningBalanceAccount[];
}> {
  const byId = await pool.query(
    `SELECT faccountid, faccountname, fhavecc FROM dbo.filllookupaccountid($1::varchar)`,
    [PstrCoID]
  );

  const byName = await pool.query(
    `SELECT faccountid, faccountname, fhavecc FROM dbo.filllookupaccountname($1::varchar)`,
    [PstrCoID]
  );

  return { byId: byId.rows, byName: byName.rows };
}

/* =========================================================
   COST CENTERS of the company (dbo.fillcostcenters)
========================================================= */

export async function getBeginningBalanceCostCenterListService(
  PstrCoID: string
): Promise<BeginningBalanceCostCenter[]> {
  const result = await pool.query(
    `SELECT fccid, fccname FROM dbo.fillcostcenters($1::varchar)`,
    [PstrCoID]
  );

  return result.rows;
}
