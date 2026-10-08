import { Request, Response } from "express";
import pool from "../DB/db.js";

type AuthRequest = Request & { user?: { id?: string } };

const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e));

export const getCompanies = async (
  _req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const result = await pool.query(`
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

    return res.status(200).json({
      success: true,
      companies: result.rows,
    });
  } catch (error: unknown) {
    console.error("Get companies error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load companies",
      error: error instanceof Error ? error.message : String(error),
    });
  }
};




// GET /api/company/:id  -> Search button (uses sp_frmcompany mode 'F' via cursor)
export const getCompany = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `CALL dbo.sp_pagecompany(p_mode => 'F', p_coid => $1, p_cursor => 'cur_company')`,
      [req.params.id],
    );
    const { rows } = await client.query("FETCH ALL FROM cur_company");
    await client.query("COMMIT");

    if (rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Company not found" });
    }

    const r = rows[0];
    return res.status(200).json({
      success: true,
      company: {
        fCoID: r.fcoid,
        fCoName: r.fconame,
        fCoName_AR: r.fconame_ar,
        fCoName_Short: r.fconame_short,
        fCoName_QR: r.fconame_qr,
        fCoVATNo: r.fcovatno,
        fCoVATNo_AR: r.fcovatno_ar,
        fPiExpenseAccountGroup: r.fpiexpenseaccountgroup,
        fBG2ARAP: r.fbg2arap, // 'Yes' | 'No' | 'Yes/No'
        fYCMethod: r.fycmethod, // 'M' | 'Y'
        fCoStatus: r.fcostatus,
      },
    });
  } catch (error: unknown) {
    await client.query("ROLLBACK");
    console.error("Get company error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load company",
      error: errMsg(error),
    });
  } finally {
    client.release();
  }
};

// POST /api/company  -> Save button (insert when originalCoID is empty, else update)
export const saveCompany = async (
  req: AuthRequest,
  res: Response,
): Promise<Response> => {
  const b = req.body ?? {};
  const coID = String(b.coID ?? "").trim();
  const coName = String(b.coName ?? "").trim();
  const original = String(b.originalCoID ?? "").trim();

  if (!coID || !coName) {
    return res.status(400).json({
      success: false,
      message: "Company ID and Company Name are required",
    });
  }

  const mode = original ? "M" : "S";
  const userId = req.user?.id ?? null; // replace with your auth/session user

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
        b.coNameAR,
        b.coNameShort,
        b.coNameQR,
        b.coVatNo,
        b.coVatNoAR,
        b.purchaseExpenseGroup,
        b.bg2ARAP,
        b.yearClosingMethod,
        original || null,
        userId,
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
    return res.status(200).json({
      success: true,
      message: mode === "S" ? "Saved" : "Modified",
    });
  } catch (error: unknown) {
    await client.query("ROLLBACK");
    console.error("Save company error:", error);

    const code = (error as { code?: string }).code;
    return res.status(500).json({
      success: false,
      message: code === "23505" ? "Company ID already exists" : errMsg(error),
    });
  } finally {
    client.release();
  }
};

// DELETE /api/company/:id  -> Delete button
export const deleteCompany = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `CALL dbo.sp_pagecompany(p_mode => 'D', p_original_coid => $1)`,
      [req.params.id],
    );
    await client.query("COMMIT");
    return res.status(200).json({ success: true, message: "Deleted" });
  } catch (error: unknown) {
    await client.query("ROLLBACK");
    console.error("Delete company error:", error);
    return res.status(500).json({
      success: false,
      message: errMsg(error),
    });
  } finally {
    client.release();
  }
};
