import type { PoolClient } from "pg";
import pool from "../../../DB/db.js";

/* =========================================================
   STOCK DOCUMENT POST - calls dbo.sp_pagegetstockdocumentpost
   (the port of the old SP_GetStockPost - mode G - and SP_StockPost - mode P)
========================================================= */

const text = (value: unknown): string => String(value ?? "");

/* ---------------------------------------------------------
   LOOKUPS
--------------------------------------------------------- */

export type Branch = { brId: string; brName: string };

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

export type DocumentType = { docType: string; docName: string };

// the stock documents that are posted here (dbo.fillstockdocumentpost)
export const getDocuments = async (PstrCoID: string): Promise<DocumentType[]> => {
  const { rows } = await pool.query(`SELECT fdoctype, fdocname FROM dbo.fillstockdocumentpost($1)`, [
    PstrCoID,
  ]);

  return rows.map((r) => ({ docType: text(r.fdoctype).trim(), docName: text(r.fdocname).trim() }));
};

// the years of the company (dbo.fillyear)
export const getYears = async (PstrCoID: string): Promise<string[]> => {
  const { rows } = await pool.query(`SELECT fyear FROM dbo.fillyear($1) ORDER BY fyear DESC`, [
    PstrCoID,
  ]);

  return rows.map((r) => text(r.fyear));
};

// the name of a document type ("" when it is not a stock document that is posted here)
export const getDocumentName = async (PstrCoID: string, docType: string): Promise<string> => {
  const documents = await getDocuments(PstrCoID);

  return documents.find((d) => d.docType === docType)?.docName ?? "";
};

/* ---------------------------------------------------------
   THE LIST (GetData): the documents that are not posted yet
--------------------------------------------------------- */

export type UnpostedDocument = {
  docNo: string;
  date: string;
  accountId: string;
  docAmt: number;
};

const cursorName = () => `cur_stockdocumentpost_${Date.now()}_${Math.floor(Math.random() * 100000)}`;

export const getUnpostedDocuments = async (p: {
  PstrCoID: string;
  lkpBranch: string;
  lkpDocument: string;
  lkpYear: string;
  lkpMonth: number;
}): Promise<UnpostedDocument[]> => {
  const client: PoolClient = await pool.connect();

  try {
    await client.query("BEGIN");

    const cursor = cursorName();

    await client.query(
      `
      CALL dbo.sp_pagegetstockdocumentpost(
        p_strmode    => 'G',
        p_pstrcoid   => $1::varchar,
        p_pstryear   => $2::varchar,
        p_strbrid    => $3::varchar,
        p_strdoctype => $4::varchar,
        p_intmonth   => $5::smallint,
        p_result_cursor => $6::refcursor
      )
      `,
      [p.PstrCoID, p.lkpYear, p.lkpBranch, p.lkpDocument, p.lkpMonth, cursor]
    );

    const { rows } = await client.query(`FETCH ALL FROM "${cursor}"`);

    await client.query("COMMIT");

    return rows.map((r) => ({
      docNo: text(r.fdocno).trim(),
      date: text(r.fdate),
      accountId: text(r.fcsaccountid).trim(),
      docAmt: Number(r.fdocamt ?? 0),
    }));
  } catch (error: unknown) {
    await client.query("ROLLBACK").catch(() => undefined);
    console.error("getUnpostedDocuments error:", error);
    throw error;
  } finally {
    client.release();
  }
};

/* ---------------------------------------------------------
   THE CHECKS BEFORE A DOCUMENT IS POSTED (the old cmdPost_Click)
--------------------------------------------------------- */

export type DocumentLine = { itemId: string; qtyIn: number; qtyOut: number; year: string };

// the lines of one document (the old objStCommon.GetDataPost)
export const getDocumentLines = async (p: {
  PstrCoID: string;
  lkpBranch: string;
  lkpDocument: string;
  lkpYear: string;
  txtDocNo: string;
}): Promise<DocumentLine[]> => {
  const { rows } = await pool.query(
    `
    SELECT fitemid, COALESCE(fqtyin, 0) AS fqtyin, COALESCE(fqtyout, 0) AS fqtyout, fyear
      FROM dbo.tblstocktrans
     WHERE fcoid = $1 AND fbrid = $2 AND fdoctype = $3 AND fyear = $4 AND fdocno = $5
     ORDER BY fslno
    `,
    [p.PstrCoID, p.lkpBranch, p.lkpDocument, p.lkpYear, p.txtDocNo]
  );

  return rows.map((r) => ({
    itemId: text(r.fitemid).trim(),
    qtyIn: Number(r.fqtyin),
    qtyOut: Number(r.fqtyout),
    year: text(r.fyear),
  }));
};

// the old GetPINo / GetSINo: the document a Purchase Return / Sales Return is against
export const getOriginalDocNo = async (p: {
  PstrCoID: string;
  lkpBranch: string;
  lkpDocument: string;
  lkpYear: string;
  txtDocNo: string;
}): Promise<string> => {
  const { rows } = await pool.query(
    `
    SELECT MAX(fprsrorigdocno) AS "origDocNo"
      FROM dbo.tblstocktrans
     WHERE fcoid = $1 AND fbrid = $2 AND fdoctype = $3 AND fyear = $4 AND fdocno = $5
    `,
    [p.PstrCoID, p.lkpBranch, p.lkpDocument, p.lkpYear, p.txtDocNo]
  );

  return text(rows[0]?.origDocNo).trim();
};

// the old IsPosted: is the document posted? (a document that does not exist is not)
export const isDocumentPosted = async (p: {
  PstrCoID: string;
  lkpBranch: string;
  lkpDocument: string;
  lkpYear: string;
  txtDocNo: string;
}): Promise<boolean> => {
  const { rows } = await pool.query(
    `
    SELECT COALESCE(BOOL_AND(fpost), false) AS "posted"
      FROM dbo.tblstocktrans
     WHERE fcoid = $1 AND fbrid = $2 AND fdoctype = $3 AND fyear = $4 AND fdocno = $5
    `,
    [p.PstrCoID, p.lkpBranch, p.lkpDocument, p.lkpYear, p.txtDocNo]
  );

  return rows[0]?.posted === true;
};

// the old GetItemPostedStock: the stock the item has in the branch now
export const getItemPostedStock = async (p: {
  PstrCoID: string;
  lkpYear: string;
  lkpBranch: string;
  lkpItemID: string;
}): Promise<number> => {
  const { rows } = await pool.query(`SELECT dbo.getitempostedstock($1, $2, $3, $4) AS "stock"`, [
    p.PstrCoID,
    p.lkpYear,
    p.lkpBranch,
    p.lkpItemID,
  ]);

  return Number(rows[0]?.stock ?? 0);
};

// the old HaveUnitCost: the line has a unit cost to post with
export const haveUnitCost = async (p: {
  PstrCoID: string;
  lkpBranch: string;
  lkpItemID: string;
  lkpYear: string;
  lkpDocument: string;
  txtDocNo: string;
  qtyIn: number;
  qtyOut: number;
}): Promise<boolean> => {
  const { rows } = await pool.query(
    `SELECT dbo.haveunitcost($1, $2, $3, $4, $5, $6, $7, $8) AS "haveCost"`,
    [p.PstrCoID, p.lkpBranch, p.lkpItemID, p.lkpYear, p.lkpDocument, p.txtDocNo, p.qtyIn, p.qtyOut]
  );

  return rows[0]?.haveCost === true;
};

/* ---------------------------------------------------------
   POST ONE DOCUMENT (the old clsStDocPost.DocumentPost): one transaction, or nothing changes
--------------------------------------------------------- */

export const postDocument = async (p: {
  PstrCoID: string;
  PstrUserID: string;
  lkpBranch: string;
  lkpDocument: string;
  lkpYear: string;
  txtDocNo: string;
}): Promise<number> => {
  const client: PoolClient = await pool.connect();

  try {
    await client.query("BEGIN");

    const { rows } = await client.query(
      `
      CALL dbo.sp_pagegetstockdocumentpost(
        p_strmode    => 'P',
        p_pstrcoid   => $1::varchar,
        p_pstryear   => $2::varchar,
        p_strbrid    => $3::varchar,
        p_strdoctype => $4::varchar,
        p_strdocno   => $5::varchar,
        p_pstruserid => $6::varchar
      )
      `,
      [p.PstrCoID, p.lkpYear, p.lkpBranch, p.lkpDocument, p.txtDocNo, p.PstrUserID]
    );

    await client.query("COMMIT");

    return Number(rows[0]?.p_intpostedcount ?? 1);
  } catch (error: unknown) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
};
