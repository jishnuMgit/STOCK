// services/CompanyService.ts
// Data access + business rules for the Company page
// (port of frmCompany / clsCompany / SP_frmCompany -> dbo.sp_pagecompany).
import pool from "../DB/db.js";

// An error with an HTTP status the controller can send back as it is.
export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export type CompanyListRow = {
  fCoID: string;
  fCoName: string;
  fCoName_AR: string | null;
  fCoName_QR: string | null;
  fCoName_Short: string | null;
  fCoVATNo: string | null;
  fCoStatus: string | null;
  fPositionNo: number | null;
};

export type Company = {
  fCoID: string;
  fCoName: string;
  fCoName_AR: string | null;
  fCoName_Short: string | null;
  fCoName_QR: string | null;
  fCoVATNo: string | null;
  fCoVATNo_AR: string | null;
  fPiExpenseAccountGroup: string | null;
  fBG2ARAP: string | null; // 'Yes' | 'No' | 'Yes/No'
  fYCMethod: string | null; // 'M' | 'Y'
  fCoStatus: string | null;
};

export type PurchaseGroup = { value: string; label: string };

export type SavePayload = {
  userId: string | null;
  coID?: unknown;
  coName?: unknown;
  originalCoID?: unknown;
  coNameAR?: unknown;
  coNameShort?: unknown;
  coNameQR?: unknown;
  coVatNo?: unknown;
  coVatNoAR?: unknown;
  purchaseExpenseGroup?: unknown;
  bg2ARAP?: unknown;
  yearClosingMethod?: unknown;
};

// ------------------------------------------------------------
// READ
// ------------------------------------------------------------

// all companies (the grid / list)
export const getCompanies = async (): Promise<CompanyListRow[]> => {
  const { rows } = await pool.query(`
    SELECT
      fcoid AS "fCoID",
      fconame AS "fCoName",
      fconame_ar AS "fCoName_AR",
      fconame_qr AS "fCoName_QR",
      fconame_short AS "fCoName_Short",
      fcovatno AS "fCoVATNo",
      fcostatus AS "fCoStatus",
      fpositionno AS "fPositionNo"
    FROM dbo.tblcompany
    ORDER BY fpositionno, fcoid
  `);
  return rows;
};

// Search button: sp_pagecompany mode 'F' returns a cursor, so CALL and FETCH
// must run in one transaction. Returns null when the company does not exist.
export const getCompany = async (id: string): Promise<Company | null> => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `CALL dbo.sp_pagecompany(p_mode => 'F', p_coid => $1, p_cursor => 'cur_company')`,
      [id],
    );
    const { rows } = await client.query("FETCH ALL FROM cur_company");
    await client.query("COMMIT");

    const r = rows[0];
    if (!r) return null;

    return {
      fCoID: r.fcoid,
      fCoName: r.fconame,
      fCoName_AR: r.fconame_ar,
      fCoName_Short: r.fconame_short,
      fCoName_QR: r.fconame_qr,
      fCoVATNo: r.fcovatno,
      fCoVATNo_AR: r.fcovatno_ar,
      fPiExpenseAccountGroup: r.fpiexpenseaccountgroup,
      fBG2ARAP: r.fbg2arap,
      fYCMethod: r.fycmethod,
      fCoStatus: r.fcostatus,
    };
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {
      /* ignore */
    }
    throw error;
  } finally {
    client.release();
  }
};

// Purchase Expense Group dropdown
export const getPurchaseGroups = async (): Promise<PurchaseGroup[]> => {
  const { rows } = await pool.query(
    `SELECT faccountid AS "value", faccountname AS "label"
       FROM dbo.fillpurchaseexpensegroup()
      ORDER BY faccountid`,
  );
  return rows;
};

export const getYearClosingMethods = async (
  PstrCoID: string,
): Promise<PurchaseGroup[]> => {
  const { rows } = await pool.query(
    `SELECT fpid AS "value", fpname AS "label"
       FROM dbo.filllookupycfinparam($1)
      ORDER BY fpid`,
    [PstrCoID],
  );
  return rows;
};

// ------------------------------------------------------------
// SAVE (insert when originalCoID is empty, else update)
// Returns the mode used: "S" saved, "M" modified.
// ------------------------------------------------------------
export const saveCompany = async (p: SavePayload): Promise<"S" | "M"> => {
  const coID = String(p.coID ?? "").trim();
  const coName = String(p.coName ?? "").trim();
  const original = String(p.originalCoID ?? "").trim();

  if (!coID || !coName) {
    throw new ApiError(400, "Company ID and Company Name are required");
  }

  const mode = original ? "M" : "S";

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    await client.query(
      `CALL dbo.sp_pagecompany(
         p_mode => $1, p_coid => $2, p_coname => $3, p_coname_ar => $4,
         p_coname_short => $5, p_coname_qr => $6, p_covatno => $7, p_covatno_ar => $8,
         p_piexpenseaccountgroup => $9, p_bg2arap => $10, p_ycmethod => $11,
         p_original_coid => $12, p_userid => $13)`,
      [
        mode,
        coID,
        coName,
        p.coNameAR,
        p.coNameShort,
        p.coNameQR,
        p.coVatNo,
        p.coVatNoAR,
        p.purchaseExpenseGroup,
        p.bg2ARAP,
        p.yearClosingMethod,
        original || null,
        p.userId,
      ],
    );

    // CoID changed on an existing record: cascade to tblYear
    if (mode === "M" && original !== coID) {
      await client.query(
        `CALL dbo.sp_pagecompany(p_mode => 'M1', p_coid => $1, p_original_coid => $2)`,
        [coID, original],
      );
    }

    await client.query("COMMIT");
    return mode;
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {
      /* ignore */
    }
    throw error;
  } finally {
    client.release();
  }
};

// ------------------------------------------------------------
// DELETE
// ------------------------------------------------------------
export const deleteCompany = async (id: string): Promise<void> => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `CALL dbo.sp_pagecompany(p_mode => 'D', p_original_coid => $1)`,
      [id],
    );
    await client.query("COMMIT");
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {
      /* ignore */
    }
    throw error;
  } finally {
    client.release();
  }
};
