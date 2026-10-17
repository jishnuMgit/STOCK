import type { PoolClient } from "pg";
import pool from "../../../DB/db.js";

/* =========================================================
   SALES PRICE LIST - calls dbo.sp_pagesalespricelist (the port of the old
   SP_frmEditPriceList). The grid shows the items of a branch with their unit
   cost and Unit Price; Modify sets the Unit Price of the changed items.
========================================================= */

// passed to the procedure as the TL's arguments (it does not use them: the audit
// row is written by the controller)
const SCREEN_NAME = "Sales Price List";
const MODULE_ID = "STK";

export type SalesPriceListGridRow = {
  fitemid: string;
  fitemname: string | null;
  funit: string | null;
  funitcost: string;
  funitprice: string;
  fbrid: string;
  fitemgroupid: string | null;
};

// one changed row of the grid, as the page sends it
export type SalesPriceListRowPayload = {
  lkpItemID: string;
  txtUnitPrice: number | string;
  txtOriginalUnitPrice: number | string;
};

/* =========================================================
   BRANCH LIST: only the branches the logged-in user has a right to, plus the
   user's default branch
========================================================= */

export async function getSalesPriceListBranchListService(
  PstrCoID: string,
  PstrUserID: string
): Promise<{ fbrid: string; fbrname: string }[]> {
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

export async function getSalesPriceListDefaultBranchService(
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
   ITEM GROUP LIST (the Item Group ID / Name boxes)
========================================================= */

export async function getSalesPriceListItemGroupListService(
  PstrCoID: string
): Promise<{ fitemgroupid: string; fitemgroupname: string }[]> {
  const result = await pool.query(
    `SELECT * FROM dbo.fillitemgroup($1::varchar)`,
    [PstrCoID]
  );

  return result.rows;
}

/* =========================================================
   THE GRID - mode GBTL
   rdgItemGroup: 0 = One Item Group (lkpItemGroupID), 1 = All Item Group
========================================================= */

export async function getSalesPriceListService(
  PstrCoID: string,
  PstrYear: string,
  lkpBranch: string,
  rdgItemGroup: number,
  lkpItemGroupID: string | null
): Promise<SalesPriceListGridRow[]> {
  const client: PoolClient = await pool.connect();

  try {
    await client.query("BEGIN");

    const cursorName =
      `cur_salespricelist_${Date.now()}_${Math.floor(Math.random() * 100000)}`;

    await client.query(
      `
      CALL dbo.sp_pagesalespricelist(
        p_strmode        => 'GBTL'::varchar,
        p_pstrcoid       => $1::varchar,
        p_pstryear       => $2::varchar,
        p_strbrid        => $3::varchar,
        p_rd_itemgroup   => $4::smallint,
        p_stritemgroupid => $5::varchar,
        p_result_cursor  => $6::refcursor
      )
      `,
      [PstrCoID, PstrYear, lkpBranch, rdgItemGroup, lkpItemGroupID, cursorName]
    );

    const result = await client.query(`FETCH ALL FROM "${cursorName}"`);

    await client.query("COMMIT");

    return result.rows as SalesPriceListGridRow[];
  } catch (error: unknown) {
    await client.query("ROLLBACK");
    console.error("getSalesPriceListService error:", error);
    throw error;
  } finally {
    client.release();
  }
}

/* =========================================================
   MODIFY - mode MTL (this branch) or MTLA (all branches, the
   "Apply To All Branches" tick). One call for each changed item, all in ONE
   transaction: if one fails, none of the prices change.
========================================================= */

export async function modifySalesPriceListService(data: {
  PstrCoID: string;
  PstrYear: string;
  PstrUserID: string;
  lkpBranch: string;
  chkApplyToAllBranches: boolean;
  rows: SalesPriceListRowPayload[];
}): Promise<{ mode: "MTL" | "MTLA" }> {
  const mode = data.chkApplyToAllBranches ? "MTLA" : "MTL";
  const client: PoolClient = await pool.connect();

  try {
    await client.query("BEGIN");

    for (const row of data.rows) {
      await client.query(
        `
        CALL dbo.sp_pagesalespricelist(
          p_strmode               => $1::varchar,
          p_pstrcoid              => $2::varchar,
          p_pstryear              => $3::varchar,
          p_strbrid               => $4::varchar,
          p_stritemid             => $5::varchar,
          p_blnunitprice_inc      => true,
          p_numunitprice          => $6::numeric,
          p_original_numunitprice => $7::numeric,
          p_pstruserid            => $8::varchar,
          p_strscreenname         => $9::varchar,
          p_strmoduleid           => $10::varchar
        )
        `,
        [
          mode,
          data.PstrCoID,
          data.PstrYear,
          data.lkpBranch,
          row.lkpItemID,
          Number(row.txtUnitPrice).toFixed(2),
          Number(row.txtOriginalUnitPrice).toFixed(2),
          data.PstrUserID,
          SCREEN_NAME,
          MODULE_ID,
        ]
      );
    }

    await client.query("COMMIT");

    return { mode };
  } catch (error: unknown) {
    await client.query("ROLLBACK");
    console.error("modifySalesPriceListService error:", error);
    throw error;
  } finally {
    client.release();
  }
}

// the audit note of one changed item (the old: "Item X Retail Price : Changed
// from a to b")
export const buildSalesPriceListAuditNote = (
  row: SalesPriceListRowPayload
): string =>
  `Item ${row.lkpItemID} Unit Price : Changed from ${Number(
    row.txtOriginalUnitPrice
  ).toFixed(2)} to ${Number(row.txtUnitPrice).toFixed(2)}`;
