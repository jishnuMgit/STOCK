import type { PoolClient } from "pg";
import pool from "../../../DB/db.js";

/* =========================================================
   ITEM ENQUIRY - calls dbo.sp_pageitemenquiry
   (the port of the old SP_frmItemDetail). A view-only screen: nothing here
   changes data.
========================================================= */

export type ItemEnquiryItem = {
  fitemid: string;
  fitemname: string;
};

export type ItemEnquiryHeader = {
  fitemid: string;
  fitemname: string;
  funit: string | null;
  fpacking: string | null;
  fcbm: string | null;
  fitemgroupid: string | null;
  fitemgroupname: string | null;
  fsupplierid: string | null;
  fsuppliername: string | null;
  fsupplieritemid: string | null;
  freorderlevel: string | null;
  freorderqty: string | null;
};

export type ItemEnquiryBranchRow = {
  fbrid: string;
  fbrname: string;
  fstock: string;
  fpreviousunitcost: string;
  funitprice: string | null;
  funitcost: string;
  ftotalcost: string;
};

/* =========================================================
   ITEM LIST (the Item ID / Item Name boxes) - mode G
========================================================= */

export async function getItemEnquiryItemListService(
  PstrCoID: string
): Promise<ItemEnquiryItem[]> {
  const client: PoolClient = await pool.connect();

  try {
    await client.query("BEGIN");

    const rows = await fetchCursor<ItemEnquiryItem>(
      client,
      "G",
      PstrCoID,
      0,
      null
    );

    await client.query("COMMIT");

    return rows;
  } catch (error: unknown) {
    await client.query("ROLLBACK");
    console.error("getItemEnquiryItemListService error:", error);
    throw error;
  } finally {
    client.release();
  }
}

/* =========================================================
   ONE ITEM: its details (GHD) and its branches (GTL), one transaction
========================================================= */

export async function getItemEnquiryService(
  PstrCoID: string,
  PstrYear: number,
  lkpItemID: string
): Promise<{
  header: ItemEnquiryHeader | null;
  branches: ItemEnquiryBranchRow[];
}> {
  const client: PoolClient = await pool.connect();

  try {
    await client.query("BEGIN");

    const header = await fetchCursor<ItemEnquiryHeader>(
      client,
      "GHD",
      PstrCoID,
      PstrYear,
      lkpItemID
    );

    const branches = await fetchCursor<ItemEnquiryBranchRow>(
      client,
      "GTL",
      PstrCoID,
      PstrYear,
      lkpItemID
    );

    await client.query("COMMIT");

    return { header: header[0] ?? null, branches };
  } catch (error: unknown) {
    await client.query("ROLLBACK");
    console.error("getItemEnquiryService error:", error);
    throw error;
  } finally {
    client.release();
  }
}

/* =========================================================
   SHARED HELPER - call dbo.sp_pageitemenquiry with named arguments
========================================================= */

async function fetchCursor<T>(
  client: PoolClient,
  strmode: "G" | "GHD" | "GTL",
  PstrCoID: string,
  PstrYear: number,
  lkpItemID: string | null
): Promise<T[]> {
  const cursorName =
    `cur_itemenquiry_${Date.now()}_${Math.floor(Math.random() * 100000)}`;

  await client.query(
    `
    CALL dbo.sp_pageitemenquiry(
      p_strmode       => $1::varchar,
      p_pstrcoid      => $2::varchar,
      p_pstryear      => $3::varchar,
      p_stritemid     => $4::varchar,
      p_result_cursor => $5::refcursor
    )
    `,
    [strmode, PstrCoID, PstrYear, lkpItemID, cursorName]
  );

  const result = await client.query(`FETCH ALL FROM "${cursorName}"`);

  return result.rows as T[];
}
