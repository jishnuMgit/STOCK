import type { PoolClient } from "pg";
import pool from "../../../DB/db.js";

/* =========================================================
   GET ITEM (header mode 'GHD', branch rows mode 'GTL')
========================================================= */

export async function getItemPageService(
  PstrCoID: string,
  itemId: string
): Promise<{ header: any | null; rows: any[] }> {
  const client: PoolClient = await pool.connect();

  try {
    await client.query("BEGIN");

    const headerCursor =
      `cur_itempage_${Date.now()}_${Math.floor(Math.random() * 100000)}`;

    await client.query(
      `
      CALL dbo.sp_pageitem(
        $1::varchar, $2::varchar, $3::varchar, $4::varchar, $5::varchar,
        $6::varchar, $7::varchar, $8::varchar, $9::numeric, $10::numeric,
        $11::varchar, $12::varchar, $13::varchar, $14::integer, $15::integer,
        $16::varchar, $17::boolean, $18::boolean, $19::varchar,
        $20::varchar, $21::varchar, $22::varchar, $23::refcursor
      )
      `,
      [
        "GHD", PstrCoID, itemId, null, null,
        null, null, null, 0, 0,
        null, null, null, 0, 0,
        null, false, false, null,
        null, null, null, headerCursor,
      ]
    );

    const headerResult = await client.query(`FETCH ALL FROM "${headerCursor}"`);

    const rowsCursor =
      `cur_itempage_${Date.now()}_${Math.floor(Math.random() * 100000)}`;

    await client.query(
      `
      CALL dbo.sp_pageitem(
        $1::varchar, $2::varchar, $3::varchar, $4::varchar, $5::varchar,
        $6::varchar, $7::varchar, $8::varchar, $9::numeric, $10::numeric,
        $11::varchar, $12::varchar, $13::varchar, $14::integer, $15::integer,
        $16::varchar, $17::boolean, $18::boolean, $19::varchar,
        $20::varchar, $21::varchar, $22::varchar, $23::refcursor
      )
      `,
      [
        "GTL", PstrCoID, itemId, null, null,
        null, null, null, 0, 0,
        null, null, null, 0, 0,
        null, false, false, null,
        null, null, null, rowsCursor,
      ]
    );

    const rowsResult = await client.query(`FETCH ALL FROM "${rowsCursor}"`);

    await client.query("COMMIT");

    return {
      header: headerResult.rows[0] || null,
      rows: rowsResult.rows,
    };
  } catch (error: unknown) {
    await client.query("ROLLBACK");
    console.error("getItemPageService error:", error);
    throw error;
  } finally {
    client.release();
  }
}

/* =========================================================
   SAVE ITEM (header mode 'SHD'/'MHD', per-row 'STL'/'MTL')
========================================================= */

export interface ItemBranchRowPayload {
  lkpBranch: string;
  txtItemLocation: string | null;
  chkAllowSaleBelowCost: boolean;
  chkInactive: boolean;
}

export async function saveItemPageService(
  PstrCoID: string,
  txtItemID: string,
  txtItemName: string,
  txtItemDescription: string | null,
  lkpUnit: string,
  txtPacking: number,
  txtCBM: number,
  lkpItemGroupID: string,
  lkpSupplierID: string | null,
  txtSupplierItemID: string,
  txtReorderLevel: number,
  txtReorderQty: number,
  PstrUserID: string,
  rows: ItemBranchRowPayload[]
): Promise<void> {
  const client: PoolClient = await pool.connect();

  try {
    await client.query("BEGIN");

    /* =====================================================
       HEADER — decide SHD (insert) vs MHD (update)
    ===================================================== */

    const existingHeader = await client.query(
      `
      SELECT 1 FROM dbo.tblitemhd
      WHERE fcoid = $1 AND fitemid = $2
      `,
      [PstrCoID, txtItemID]
    );

    const headerMode = existingHeader.rows.length > 0 ? "MHD" : "SHD";

    await callSpItemPage(client, {
      strmode: headerMode,
      PstrCoID,
      txtItemID,
      txtItemName,
      txtItemDescription,
      lkpUnit,
      txtPacking,
      txtCBM,
      lkpItemGroupID,
      lkpSupplierID,
      txtSupplierItemID,
      txtReorderLevel,
      txtReorderQty,
      PstrUserID,
    });

    /* =====================================================
       BRANCH ROWS — decide STL (insert) vs MTL (update)
       per row, same as the header
    ===================================================== */

    for (const row of rows) {
      const existingRow = await client.query(
        `
        SELECT 1 FROM dbo.tblitemtl
        WHERE fcoid = $1 AND fbrid = $2 AND fitemid = $3
        `,
        [PstrCoID, row.lkpBranch, txtItemID]
      );

      const rowMode = existingRow.rows.length > 0 ? "MTL" : "STL";

      await callSpItemPage(client, {
        strmode: rowMode,
        PstrCoID,
        txtItemID,
        lkpBranch: row.lkpBranch,
        lkpOriginalBranch: rowMode === "MTL" ? row.lkpBranch : null,
        txtItemLocation: row.txtItemLocation,
        chkAllowSaleBelowCost: row.chkAllowSaleBelowCost,
        chkInactive: row.chkInactive,
        PstrUserID,
      });
    }

    await client.query("COMMIT");
  } catch (error: unknown) {
    await client.query("ROLLBACK");
    console.error("saveItemPageService error:", error);
    throw error;
  } finally {
    client.release();
  }
}

/* =========================================================
   HAVE TRANS (dbo.havetrans) - "is this item already used?"
   The table it looks in is not written here: it comes from the rule row of
   fSearchKey 'fItemID' in the setup deletion tables (dbo.tblstocksetupdeletion / dbo.tblfinsetupdeletion) (tblstocktrans.fitemid).
========================================================= */

export async function haveItemTransService(
  PstrCoID: string,
  txtItemID: string
): Promise<boolean> {
  try {
    const result = await pool.query(
      `SELECT dbo.havetrans($1, 'fItemID', $2) AS "haveTrans"`,
      [PstrCoID, txtItemID]
    );

    return Number(result.rows[0]?.haveTrans) > 0;
  } catch (error: unknown) {
    // 42P01 = the rule row names a table that does not exist: the setup of
    // the check is wrong, which is not the same as "not used"
    if ((error as { code?: string }).code === "42P01") {
      throw new Error(
        "The 'already used' check for items is not set up correctly (rule 'fItemID' in the setup deletion tables). Please contact the administrator."
      );
    }

    throw error;
  }
}

/* =========================================================
   DELETE ITEM (mode 'D' — whole item, header + every branch)
========================================================= */

export async function deleteItemService(
  PstrCoID: string,
  txtItemID: string
): Promise<void> {
  const client: PoolClient = await pool.connect();

  try {
    await client.query("BEGIN");

    await callSpItemPage(client, {
      strmode: "D",
      PstrCoID,
      txtItemID,
    });

    await client.query("COMMIT");
  } catch (error: unknown) {
    await client.query("ROLLBACK");
    console.error("deleteItemService error:", error);
    throw error;
  } finally {
    client.release();
  }
}

/* =========================================================
   DELETE ONE BRANCH ROW (mode 'D1')
========================================================= */

export async function deleteItemBranchRowService(
  PstrCoID: string,
  txtItemID: string,
  lkpBranch: string
): Promise<void> {
  const client: PoolClient = await pool.connect();

  try {
    await client.query("BEGIN");

    await callSpItemPage(client, {
      strmode: "D1",
      PstrCoID,
      txtItemID,
      lkpBranch: lkpBranch,
    });

    await client.query("COMMIT");
  } catch (error: unknown) {
    await client.query("ROLLBACK");
    console.error("deleteItemBranchRowService error:", error);
    throw error;
  } finally {
    client.release();
  }
}

/* =========================================================
   SHARED HELPER — call dbo.sp_pageitem with sensible
   defaults for whichever fields a given mode doesn't use
========================================================= */

async function callSpItemPage(
  client: PoolClient,
  overrides: Partial<{
    strmode: string;
    PstrCoID: string;
    txtItemID: string;
    lkpBranch: string | null;
    lkpOriginalBranch: string | null;
    txtItemName: string | null;
    txtItemDescription: string | null;
    lkpUnit: string | null;
    txtPacking: number;
    txtCBM: number;
    lkpItemGroupID: string | null;
    lkpSupplierID: string | null;
    txtSupplierItemID: string | null;
    txtReorderLevel: number;
    txtReorderQty: number;
    txtItemLocation: string | null;
    chkAllowSaleBelowCost: boolean;
    chkInactive: boolean;
    PstrUserID: string | null;
  }>
): Promise<void> {
  const params = {
    strmode: null,
    PstrCoID: null,
    txtItemID: null,
    lkpBranch: null,
    lkpOriginalBranch: null,
    txtItemName: null,
    txtItemDescription: null,
    lkpUnit: null,
    txtPacking: 0,
    txtCBM: 0,
    lkpItemGroupID: null,
    lkpSupplierID: null,
    txtSupplierItemID: null,
    txtReorderLevel: 0,
    txtReorderQty: 0,
    txtItemLocation: null,
    chkAllowSaleBelowCost: false,
    chkInactive: false,
    PstrUserID: null,
    ...overrides,
  };

  const cursorName =
    `cur_itempage_${Date.now()}_${Math.floor(Math.random() * 100000)}`;

  await client.query(
    `
    CALL dbo.sp_pageitem(
      $1::varchar, $2::varchar, $3::varchar, $4::varchar, $5::varchar,
      $6::varchar, $7::varchar, $8::varchar, $9::numeric, $10::numeric,
      $11::varchar, $12::varchar, $13::varchar, $14::integer, $15::integer,
      $16::varchar, $17::boolean, $18::boolean, $19::varchar,
      $20::varchar, $21::varchar, $22::varchar, $23::refcursor
    )
    `,
    [
      params.strmode,
      params.PstrCoID,
      params.txtItemID,
      params.lkpBranch,
      params.lkpOriginalBranch,
      params.txtItemName,
      params.txtItemDescription,
      params.lkpUnit,
      params.txtPacking,
      params.txtCBM,
      params.lkpItemGroupID,
      params.lkpSupplierID,
      params.txtSupplierItemID,
      params.txtReorderLevel,
      params.txtReorderQty,
      params.txtItemLocation,
      params.chkAllowSaleBelowCost,
      params.chkInactive,
      params.PstrUserID,
      null,
      null,
      null,
      cursorName,
    ]
  );
}
