import type { Response } from "express";
import pool from "../../../DB/db.js";
import type { AuthenticatedRequest } from "../../../middleware/authMiddleware.js";

/* =====================================================
   HELPERS
===================================================== */

const isEmpty = (v: unknown): boolean =>
  v === null || v === undefined || String(v).trim() === "";

const NO_COMPANY_MESSAGE = "Company ID is not available in session";

/* =====================================================
   LOAD DROPDOWN DATA
   GET /getLookups
   (VB: clsMatchEnquiry.FillCombos - document list)
===================================================== */

export const getMatchEnquiryLookups = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<Response> => {
  try {
    const coId = req.user?.CoID;

    if (!coId) {
      return res
        .status(400)
        .json({ success: false, message: NO_COMPANY_MESSAGE });
    }

    const docType = await pool.query(`SELECT * FROM dbo.getdoctype($1,$2)`, [
      coId,
      "FIN",
    ]);

    // VB filter excluded 'BG' and 'PI' (INV / RCN were added explicitly)
    const documents = docType.rows.filter((d: Record<string, any>) => {
      const type = String(d.fdoctype ?? "").toUpperCase();
      return type !== "BG" && type !== "PI";
    });

    return res.status(200).json({
      success: true,
      DocType: documents,
      message: "Match enquiry lookups loaded successfully",
    });
  } catch (error: unknown) {
    console.error("getMatchEnquiryLookups error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load match enquiry lookups",
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

/* =====================================================
   GET MATCH ENQUIRY
   POST /getMatchEnquiry
   body: { year, brId, docType, docNo }
   (VB: clsMatchEnquiry.GetData + frmMatchEnquiry.ValidateMe)
   coId comes from the session.
===================================================== */

export const getMatchEnquiry = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<Response> => {
  const coId = req.user?.CoID;
  const { year, brId, docType, docNo } = req.body;

  if (!coId) {
    return res
      .status(400)
      .json({ success: false, message: NO_COMPANY_MESSAGE });
  }

  /* ---------- ValidateMe ---------- */
  if (isEmpty(year)) {
    return res
      .status(400)
      .json({ success: false, message: "Please select 'Year'" });
  }
  if (isEmpty(brId)) {
    return res
      .status(400)
      .json({ success: false, message: "Please select 'Branch'" });
  }
  if (isEmpty(docType)) {
    return res
      .status(400)
      .json({ success: false, message: "Please input 'Document'" });
  }
  if (isEmpty(docNo)) {
    return res
      .status(400)
      .json({ success: false, message: "Please input 'Document No.'" });
  }

  const client = await pool.connect();

  try {
    const cursorName = "cur_matchenquiry";

    await client.query("BEGIN");

    await client.query(
      `
      CALL dbo.sp_pagematchenquiry(
        p_pstrcoid   => $1::varchar,
        p_pstryear   => $2::varchar,
        p_strbrid    => $3::varchar,
        p_strdoctype => $4::varchar,
        p_strdocno   => $5::varchar,
        p_result     => $6::refcursor
      )
      `,
      [
        coId, // 1 p_pstrcoid
        String(year), // 2 p_pstryear
        String(brId), // 3 p_strbrid
        String(docType), // 4 p_strdoctype
        String(docNo).trim(), // 5 p_strdocno
        cursorName, // 6 p_result
      ],
    );

    const result = await client.query(`FETCH ALL FROM "${cursorName}"`);

    await client.query("COMMIT");

    return res.status(200).json({
      success: true,
      data: result.rows,
      message: "Match enquiry loaded successfully",
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("getMatchEnquiry error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to get match enquiry",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  } finally {
    client.release();
  }
};
