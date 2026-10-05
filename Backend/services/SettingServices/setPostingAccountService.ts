import type { PoolClient } from "pg";
import pool from "../../DB/db.js";

/* =========================================================
   PAYLOAD (keys = form field names)
========================================================= */

export interface PostingAccountPayload {
  lkpCashSupplierAccountID: string | null;
  lkpCashCustomerAccountID: string | null;
  lkpStockAccountID: string | null;
  lkpSalesAccountID: string | null;
  lkpSalesReturnAccountID: string | null;
  lkpCostOfSalesAccountID: string | null;
  lkpCostOfSalesReturnAccountID: string | null;
  lkpStockAdjustmentAccountID: string | null;
  lkpRoundOffAccountID: string | null;
  lkpInputVATAccountID: string | null;
  lkpOutputVATAccountID: string | null;
}

/* =========================================================
   FORM FIELD -> COLUMN -> LABEL (used to build the audit note)
========================================================= */

export const postingAccountFields: {
  field: keyof PostingAccountPayload;
  column: string;
  label: string;
}[] = [
  { field: "lkpCashSupplierAccountID", column: "fcashsupplieraccountid", label: "Cash Supplier Account" },
  { field: "lkpCashCustomerAccountID", column: "fcashcustomeraccountid", label: "Cash Customer Account" },
  { field: "lkpStockAccountID", column: "fstockaccountid", label: "Stock Account" },
  { field: "lkpSalesAccountID", column: "fsalesaccountid", label: "Sales Account" },
  { field: "lkpSalesReturnAccountID", column: "fsalesretaccountid", label: "Sales Return Account" },
  { field: "lkpCostOfSalesAccountID", column: "fsalescostaccountid", label: "Cost Of Sales Account" },
  { field: "lkpCostOfSalesReturnAccountID", column: "fsalesretcostaccountid", label: "Cost Of Sales Return Account" },
  { field: "lkpStockAdjustmentAccountID", column: "fstockadjaccountid", label: "Stock Adjustment Account" },
  { field: "lkpRoundOffAccountID", column: "froundoffaccountid", label: "Round Off Account" },
  { field: "lkpInputVATAccountID", column: "finputvataccountid", label: "Input VAT Account" },
  { field: "lkpOutputVATAccountID", column: "foutputvataccountid", label: "Output VAT Account" },
];

/* =========================================================
   GET POSTING ACCOUNT (mode 'G')
========================================================= */

// one place that runs mode 'G' - the page load and the save (to read
// the old row for the audit note) both use it, so the SELECT lives
// only in the procedure
async function fetchPostingAccountRow(
  client: PoolClient,
  PstrCoID: string,
  lkpBranch: string
): Promise<Record<string, string | null> | null> {
  const cursorName =
    `cur_postingaccount_${Date.now()}_${Math.floor(Math.random() * 100000)}`;

  await callSpPostingAccount(client, {
    strmode: "G",
    PstrCoID,
    lkpBranch,
    cursorName,
  });

  const result = await client.query(`FETCH ALL FROM "${cursorName}"`);

  return result.rows[0] ?? null;
}

export async function getPostingAccountService(
  PstrCoID: string,
  lkpBranch: string
): Promise<any | null> {
  const client: PoolClient = await pool.connect();

  try {
    await client.query("BEGIN");

    const row = await fetchPostingAccountRow(client, PstrCoID, lkpBranch);

    await client.query("COMMIT");

    return row;
  } catch (error: unknown) {
    await client.query("ROLLBACK");
    console.error("getPostingAccountService error:", error);
    throw error;
  } finally {
    client.release();
  }
}

/* =========================================================
   SAVE POSTING ACCOUNT (mode 'S' if the company + branch has
   no row yet, mode 'M' if it already does)
========================================================= */

export async function savePostingAccountService(
  PstrCoID: string,
  lkpBranch: string,
  payload: PostingAccountPayload,
  PstrUserID: string
): Promise<{ mode: "S" | "M"; before: Record<string, string | null> | null }> {
  const client: PoolClient = await pool.connect();

  try {
    await client.query("BEGIN");

    // what the row held before this save - the audit note shows
    // exactly what changed
    const before = await fetchPostingAccountRow(client, PstrCoID, lkpBranch);
    const mode = before ? "M" : "S";

    await callSpPostingAccount(client, {
      strmode: mode,
      PstrCoID,
      lkpBranch,
      ...payload,
      PstrUserID,
    });

    await client.query("COMMIT");

    return { mode, before };
  } catch (error: unknown) {
    await client.query("ROLLBACK");
    console.error("savePostingAccountService error:", error);
    throw error;
  } finally {
    client.release();
  }
}

/* =========================================================
   SHARED HELPER - call dbo.sp_pagesetpostingaccount with
   sensible defaults for whichever fields a mode doesn't use
========================================================= */

async function callSpPostingAccount(
  client: PoolClient,
  overrides: Partial<
    PostingAccountPayload & {
      strmode: string;
      PstrCoID: string;
      lkpBranch: string;
      PstrUserID: string | null;
      cursorName: string;
    }
  >
): Promise<void> {
  const p = {
    strmode: null,
    PstrCoID: null,
    lkpBranch: null,
    lkpCashSupplierAccountID: null,
    lkpCashCustomerAccountID: null,
    lkpStockAccountID: null,
    lkpSalesAccountID: null,
    lkpSalesReturnAccountID: null,
    lkpCostOfSalesAccountID: null,
    lkpCostOfSalesReturnAccountID: null,
    lkpStockAdjustmentAccountID: null,
    lkpRoundOffAccountID: null,
    lkpInputVATAccountID: null,
    lkpOutputVATAccountID: null,
    PstrUserID: null,
    cursorName:
      `cur_postingaccount_${Date.now()}_${Math.floor(Math.random() * 100000)}`,
    ...overrides,
  };

  await client.query(
    `
    CALL dbo.sp_pagesetpostingaccount(
      $1::varchar, $2::varchar, $3::varchar, $4::varchar, $5::varchar,
      $6::varchar, $7::varchar, $8::varchar, $9::varchar, $10::varchar,
      $11::varchar, $12::varchar, $13::varchar, $14::varchar, $15::varchar,
      $16::refcursor
    )
    `,
    [
      p.strmode,
      p.PstrCoID,
      p.lkpBranch,
      p.lkpCashSupplierAccountID,
      p.lkpCashCustomerAccountID,
      p.lkpStockAccountID,
      p.lkpSalesAccountID,
      p.lkpSalesReturnAccountID,
      p.lkpCostOfSalesAccountID,
      p.lkpCostOfSalesReturnAccountID,
      p.lkpStockAdjustmentAccountID,
      p.lkpRoundOffAccountID,
      p.lkpInputVATAccountID,
      p.lkpOutputVATAccountID,
      p.PstrUserID,
      p.cursorName,
    ]
  );
}
