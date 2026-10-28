import pool from "../../../DB/db.js";

export type Branch = { brId: string; brName: string };

const text = (value: unknown): string => String(value ?? "");

// the branches the logged-in user has a right to
export const getBranches = async (PstrCoID: string, PstrUserID: string): Promise<Branch[]> => {
  const { rows } = await pool.query(
    `
    SELECT fbrid, fbrname
      FROM dbo.tblbranch
     WHERE fcoid = $1
       AND dbo.userbranches($1, $2, fbrid)
     ORDER BY fpositionno, fbrid
    `,
    [PstrCoID, PstrUserID]
  );

  return rows.map((r) => ({ brId: text(r.fbrid).trim(), brName: text(r.fbrname).trim() }));
};

// the user's default branch (Set Default Branch); "" when none is set
export const getDefaultBranch = async (PstrCoID: string, PstrUserID: string): Promise<string> => {
  const { rows } = await pool.query(`SELECT dbo.getuserdefbranch($1, $2) AS "defaultBranch"`, [
    PstrCoID,
    PstrUserID,
  ]);

  return text(rows[0]?.defaultBranch).trim();
};

export type Supplier = { supplierId: string; supplierName: string };

// the suppliers of the company (the Supplier ID / Supplier Name boxes), by Supplier ID:
// dbo.filllookupsupplierid (the accounts of tblaccountcs that are suppliers)
export const getSuppliers = async (PstrCoID: string): Promise<Supplier[]> => {
  const { rows } = await pool.query(`SELECT * FROM dbo.filllookupsupplierid($1)`, [PstrCoID]);

  return rows.map((r) => ({
    supplierId: text(r.fcsaccountid).trim(),
    supplierName: text(r.fcsaccountname).trim(),
  }));
};
