import type { PoolClient } from "pg";
import pool from "../../../DB/db.js";

/* =========================================================
   GET ITEM (header mode 'GHD', branch rows mode 'GTL')
========================================================= */

export async function getItemPageService(
  CoID: string,
  itemId: string
): Promise<{ header: any | null; rows: any[] }> {
  const client: PoolClient = await pool.connect();

  try {
    await client.query("BEGIN");

    const headerCursor =
      `cur_itempage_${Date.now()}_${Math.floor(Math.random() * 100000)}`;

    await client.query(
      `
      CALL dbo.sp_itempage(
        $1::varchar, $2::varchar, $3::varchar, $4::varchar, $5::varchar,
        $6::varchar, $7::varchar, $8::varchar, $9::numeric, $10::numeric,
        $11::varchar, $12::varchar, $13::varchar, $14::integer, $15::integer,
        $16::varchar, $17::boolean, $18::boolean, $19::varchar,
        $20::varchar, $21::varchar, $22::varchar, $23::refcursor
      )
      `,
      [
        "GHD", CoID, itemId, null, null,
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
      CALL dbo.sp_itempage(
        $1::varchar, $2::varchar, $3::varchar, $4::varchar, $5::varchar,
        $6::varchar, $7::varchar, $8::varchar, $9::numeric, $10::numeric,
        $11::varchar, $12::varchar, $13::varchar, $14::integer, $15::integer,
        $16::varchar, $17::boolean, $18::boolean, $19::varchar,
        $20::varchar, $21::varchar, $22::varchar, $23::refcursor
      )
      `,
      [
        "GTL", CoID, itemId, null, null,
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
  CoID: string,
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
  userId: string,
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
      [CoID, txtItemID]
    );

    const headerMode = existingHeader.rows.length > 0 ? "MHD" : "SHD";

    await callSpItemPage(client, {
      strmode: headerMode,
      coid: CoID,
      itemid: txtItemID,
      itemname: txtItemName,
      itemdesc: txtItemDescription,
      unit: lkpUnit,
      packing: txtPacking,
      cbm: txtCBM,
      itemgroupid: lkpItemGroupID,
      supplierid: lkpSupplierID,
      supplieritemid: txtSupplierItemID,
      reorderlevel: txtReorderLevel,
      reorderqty: txtReorderQty,
      userid: userId,
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
        [CoID, row.lkpBranch, txtItemID]
      );

      const rowMode = existingRow.rows.length > 0 ? "MTL" : "STL";

      await callSpItemPage(client, {
        strmode: rowMode,
        coid: CoID,
        itemid: txtItemID,
        brid: row.lkpBranch,
        origbrid: rowMode === "MTL" ? row.lkpBranch : null,
        itemlocation: row.txtItemLocation,
        allowsale: row.chkAllowSaleBelowCost,
        inactive: row.chkInactive,
        userid: userId,
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
   DELETE ITEM (mode 'D' — whole item, header + every branch)
========================================================= */

export async function deleteItemService(
  CoID: string,
  txtItemID: string
): Promise<void> {
  const client: PoolClient = await pool.connect();

  try {
    await client.query("BEGIN");

    await callSpItemPage(client, {
      strmode: "D",
      coid: CoID,
      itemid: txtItemID,
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
  CoID: string,
  txtItemID: string,
  lkpBranch: string
): Promise<void> {
  const client: PoolClient = await pool.connect();

  try {
    await client.query("BEGIN");

    await callSpItemPage(client, {
      strmode: "D1",
      coid: CoID,
      itemid: txtItemID,
      brid: lkpBranch,
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
   SHARED HELPER — call dbo.sp_itempage with sensible
   defaults for whichever fields a given mode doesn't use
========================================================= */

async function callSpItemPage(
  client: PoolClient,
  overrides: Partial<{
    strmode: string;
    coid: string;
    itemid: string;
    brid: string | null;
    origbrid: string | null;
    itemname: string | null;
    itemdesc: string | null;
    unit: string | null;
    packing: number;
    cbm: number;
    itemgroupid: string | null;
    supplierid: string | null;
    supplieritemid: string | null;
    reorderlevel: number;
    reorderqty: number;
    itemlocation: string | null;
    allowsale: boolean;
    inactive: boolean;
    userid: string | null;
  }>
): Promise<void> {
  const params = {
    strmode: null,
    coid: null,
    itemid: null,
    brid: null,
    origbrid: null,
    itemname: null,
    itemdesc: null,
    unit: null,
    packing: 0,
    cbm: 0,
    itemgroupid: null,
    supplierid: null,
    supplieritemid: null,
    reorderlevel: 0,
    reorderqty: 0,
    itemlocation: null,
    allowsale: false,
    inactive: false,
    userid: null,
    ...overrides,
  };

  const cursorName =
    `cur_itempage_${Date.now()}_${Math.floor(Math.random() * 100000)}`;

  await client.query(
    `
    CALL dbo.sp_itempage(
      $1::varchar, $2::varchar, $3::varchar, $4::varchar, $5::varchar,
      $6::varchar, $7::varchar, $8::varchar, $9::numeric, $10::numeric,
      $11::varchar, $12::varchar, $13::varchar, $14::integer, $15::integer,
      $16::varchar, $17::boolean, $18::boolean, $19::varchar,
      $20::varchar, $21::varchar, $22::varchar, $23::refcursor
    )
    `,
    [
      params.strmode,
      params.coid,
      params.itemid,
      params.brid,
      params.origbrid,
      params.itemname,
      params.itemdesc,
      params.unit,
      params.packing,
      params.cbm,
      params.itemgroupid,
      params.supplierid,
      params.supplieritemid,
      params.reorderlevel,
      params.reorderqty,
      params.itemlocation,
      params.allowsale,
      params.inactive,
      params.userid,
      null,
      null,
      null,
      cursorName,
    ]
  );
}
