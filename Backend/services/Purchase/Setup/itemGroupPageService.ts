import type { PoolClient } from "pg";
import pool from "../../../DB/db.js";

/* =========================================================
   ITEM GROUP PAGE - calls dbo.sp_pageitemgroup
   (modes: G1 one group, S insert, M update, D delete)
========================================================= */

export type ItemGroupRow = {
  fitemgroupid: string;
  fitemgroupname: string | null;
  fvatslab: string | null;
  fvatper: string | null;
};

/* =========================================================
   GET ITEM GROUP (mode 'G1')
========================================================= */

export async function getItemGroupPageService(
  PstrCoID: string,
  txtItemGroupID: string
): Promise<ItemGroupRow | null> {
  const client: PoolClient = await pool.connect();

  try {
    await client.query("BEGIN");

    const row = await fetchItemGroupRow(client, PstrCoID, txtItemGroupID);

    await client.query("COMMIT");

    return row;
  } catch (error: unknown) {
    await client.query("ROLLBACK");
    console.error("getItemGroupPageService error:", error);
    throw error;
  } finally {
    client.release();
  }
}

// one place that runs mode 'G1' - the page load and the save (to read the
// old row for the audit note) both use it, so the SELECT lives only in the
// procedure
async function fetchItemGroupRow(
  client: PoolClient,
  PstrCoID: string,
  txtItemGroupID: string
): Promise<ItemGroupRow | null> {
  const cursorName =
    `cur_itemgrouppage_${Date.now()}_${Math.floor(Math.random() * 100000)}`;

  await callSpItemGroupPage(client, {
    strmode: "G1",
    PstrCoID,
    txtItemGroupID,
    cursorName,
  });

  const result = await client.query(`FETCH ALL FROM "${cursorName}"`);

  return result.rows[0] ?? null;
}

/* =========================================================
   SAVE ITEM GROUP (mode 'S' for a new Item Group ID, 'M' when it
   already exists). The VAT % is NOT taken from the request: it is
   read from tblvatslab for the chosen slab, so the two always agree.
========================================================= */

export async function saveItemGroupPageService(
  PstrCoID: string,
  txtItemGroupID: string,
  txtItemGroupName: string,
  lkpVATSlab: string,
  PstrUserID: string
): Promise<{
  mode: "S" | "M";
  before: ItemGroupRow | null;
  txtVATPer: string;
}> {
  const client: PoolClient = await pool.connect();

  try {
    await client.query("BEGIN");

    // the percentage that belongs to the chosen slab
    const slab = await client.query(
      `SELECT fvatper FROM dbo.tblvatslab WHERE fcoid = $1 AND fvatslab = $2`,
      [PstrCoID, lkpVATSlab]
    );

    if (slab.rows.length === 0) {
      throw new Error(`VAT Slab '${lkpVATSlab}' not found`);
    }

    const txtVATPer: string = slab.rows[0].fvatper;

    // what the row held before this save - the audit note shows what changed
    const before = await fetchItemGroupRow(client, PstrCoID, txtItemGroupID);
    const mode = before ? "M" : "S";

    await callSpItemGroupPage(client, {
      strmode: mode,
      PstrCoID,
      txtItemGroupID,
      txtItemGroupName,
      lkpVATSlab,
      txtVATPer,
      original: txtItemGroupID,
      PstrUserID,
    });

    await client.query("COMMIT");

    return { mode, before, txtVATPer };
  } catch (error: unknown) {
    await client.query("ROLLBACK");
    console.error("saveItemGroupPageService error:", error);
    throw error;
  } finally {
    client.release();
  }
}

/* =========================================================
   HAVE TRANS (dbo.sp_havetrans) - "is this item group already used?"
   The table it looks in is not written here: it comes from the rule row of
   fSearchKey 'fItemGroupID' in dbo.tblstocksetupdeletion
   (tblitemhd.fitemgroupid).
========================================================= */

export async function haveItemGroupTransService(
  PstrCoID: string,
  txtItemGroupID: string
): Promise<boolean> {
  try {
    const result = await pool.query(
      `SELECT dbo.sp_havetrans($1, 'fItemGroupID', $2) AS "haveTrans"`,
      [PstrCoID, txtItemGroupID]
    );

    return Number(result.rows[0]?.haveTrans) > 0;
  } catch (error: unknown) {
    // 42P01 / 42703 = the rule row names a table or column that does not
    // exist: the setup of the check is wrong, which is not the same as "not used"
    const code = (error as { code?: string }).code;

    if (code === "42P01" || code === "42703") {
      throw new Error(
        "The 'already used' check for item groups is not set up correctly (rule 'fItemGroupID' in tblstocksetupdeletion). Please contact the administrator."
      );
    }

    throw error;
  }
}

/* =========================================================
   DELETE ITEM GROUP (mode 'D')
========================================================= */

export async function deleteItemGroupPageService(
  PstrCoID: string,
  txtItemGroupID: string
): Promise<void> {
  const client: PoolClient = await pool.connect();

  try {
    await client.query("BEGIN");

    await callSpItemGroupPage(client, {
      strmode: "D",
      PstrCoID,
      original: txtItemGroupID,
    });

    await client.query("COMMIT");
  } catch (error: unknown) {
    await client.query("ROLLBACK");
    console.error("deleteItemGroupPageService error:", error);
    throw error;
  } finally {
    client.release();
  }
}

/* =========================================================
   SHARED HELPER - call dbo.sp_pageitemgroup with named arguments,
   so a mode only passes what it uses
========================================================= */

async function callSpItemGroupPage(
  client: PoolClient,
  p: {
    strmode: string;
    PstrCoID: string;
    txtItemGroupID?: string;
    txtItemGroupName?: string;
    lkpVATSlab?: string;
    txtVATPer?: string;
    original?: string;
    PstrUserID?: string;
    cursorName?: string;
  }
): Promise<void> {
  await client.query(
    `
    CALL dbo.sp_pageitemgroup(
      p_strmode               => $1::varchar,
      p_pstrcoid              => $2::varchar,
      p_stritemgroupid        => $3::varchar,
      p_stritemgroupname      => $4::varchar,
      p_strvatslab            => $5::varchar,
      p_numvatper             => $6::numeric,
      p_original_fitemgroupid => $7::varchar,
      p_pstruserid            => $8::varchar,
      p_result_cursor         => $9::refcursor
    )
    `,
    [
      p.strmode,
      p.PstrCoID,
      p.txtItemGroupID ?? null,
      p.txtItemGroupName ?? null,
      p.lkpVATSlab ?? null,
      p.txtVATPer ?? 0,
      p.original ?? null,
      p.PstrUserID ?? null,
      p.cursorName ??
        `cur_itemgrouppage_${Date.now()}_${Math.floor(Math.random() * 100000)}`,
    ]
  );
}
