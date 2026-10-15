// services/Stock/Report/RptItemHistoryService.ts
// Data access for the Item History REPORT page
// (port of the rptItemHistory form + rptItemHistoryRpt / SP_rptItemHistory).
import pool from "../../../DB/db.js";

// ------------------------------------------------------------
// Calls a Postgres PROCEDURE that returns a refcursor (INOUT), e.g.
//   dbo.sp_rptitemhistory(..., inout p_result_cursor refcursor)
// CALL + FETCH must run in ONE transaction. A plain
// `SELECT * FROM dbo.sp_x(...)` does not work on a procedure.
// If the object is really a FUNCTION (error 42809), it falls back to SELECT.
// ------------------------------------------------------------
let cursorSeq = 0;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DbRow = Record<string, any>;

const callCursor = async (
  name: string,
  args: unknown[],
  casts: string[],
): Promise<DbRow[]> => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SAVEPOINT before_call");

    const cur = `cur_${name}_${process.pid}_${++cursorSeq}`.toLowerCase();
    const list = casts.map((c, i) => `$${i + 1}::${c}`).join(", ");

    try {
      await client.query(
        `CALL dbo.${name}(${list}, $${args.length + 1}::refcursor)`,
        [...args, cur],
      );
      const { rows } = await client.query(`FETCH ALL FROM "${cur}"`);
      await client.query("COMMIT");
      return rows;
    } catch (err) {
      if ((err as { code?: string }).code !== "42809") throw err;

      // not a procedure: it is a function that returns rows
      await client.query("ROLLBACK TO SAVEPOINT before_call");
      const { rows } = await client.query(
        `SELECT * FROM dbo.${name}(${list})`,
        args,
      );
      await client.query("COMMIT");
      return rows;
    }
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch {
      /* ignore */
    }
    throw err;
  } finally {
    client.release();
  }
};

export type Branch = { brId: string; brName: string };

export type ItemLookup = {
  itemId: string;
  itemName: string;
  brId: string;
  packing: string;
  inactive: boolean;
};

export type HistoryRow = {
  date: string | null; // YYYY-MM-DD
  docType: string;
  docNo: string;
  accountId: string;
  qtyIn: number | null;
  qtyOut: number | null;
  unitCost: number | null;
  unitPrice: number | null;
};

export type HistoryGroup = {
  itemId: string;
  itemName: string;
  supplier: string;
  lastSaleDate: string | null;
  lastPurDate: string | null;
  lastSaleUnitPrice: number | null;
  lastPurUnitPriceFC: number | null;
  lastPurUnitPrice: number | null;
  lastPurUnitCost: number | null;
  lastPurCurrency: string;
  stock: number | null;
  rows: HistoryRow[];
};

// ------------------------------------------------------------
// LOOKUPS (VB FillCombos)
// ------------------------------------------------------------

// the branches the user may use (lkpBranch)
export const getUserBranches = async (
  coId: string,
  userId: string,
): Promise<Branch[]> => {
  // dbo.fillbranchofuser is a FUNCTION returning (fbrname, fbrid)
  const { rows } = await pool.query(
    `SELECT * FROM dbo.fillbranchofuser($1::varchar, $2::varchar)`,
    [coId, userId],
  );

  if (rows[0]) console.log("fillbranchofuser columns:", Object.keys(rows[0]));

  return rows
    .map((r) => ({
      brId: text(r.fbrid ?? r.brid),
      brName: text(r.fbrname ?? r.brname),
    }))
    .filter((b) => b.brId !== "");
};

// the items (lkpItemID / lkpItemName). One row per item and branch.
// SELECT * + tolerant mapping: a wrong column type / name no longer fails the
// whole request, and the real column names are logged once for checking.
const flag = (v: unknown) =>
  v === true || v === 1 || /^(1|t|true|y|yes)$/i.test(String(v ?? "").trim());

export const getItemLookup = async (coId: string): Promise<ItemLookup[]> => {
  // dbo.filllookupitemid is a FUNCTION (already ordered by fitemid)
  const { rows } = await pool.query(
    `SELECT * FROM dbo.filllookupitemid($1::varchar)`,
    [coId],
  );

  if (rows[0]) console.log("filllookupitemid columns:", Object.keys(rows[0]));

  return rows
    .map((r) => ({
      itemId: text(r.fitemid ?? r.itemid),
      itemName: text(r.fitemname ?? r.itemname),
      brId: text(r.fbrid ?? r.brid),
      packing: text(r.fpacking ?? r.packing),
      inactive: flag(r.finactive ?? r.inactive),
    }))
    .filter((i) => i.itemId !== "");
};

// ------------------------------------------------------------
// THE REPORT
// ------------------------------------------------------------

const pad = (n: number) => String(n).padStart(2, "0");

// pg gives `timestamp` columns as local Date objects -> "YYYY-MM-DD"
const dateStr = (v: unknown): string | null =>
  v instanceof Date && !Number.isNaN(v.getTime())
    ? `${v.getFullYear()}-${pad(v.getMonth() + 1)}-${pad(v.getDate())}`
    : null;

// numeric columns come back from pg as strings
const num = (v: unknown): number | null =>
  v === null || v === undefined || v === "" ? null : Number(v);

const text = (v: unknown): string => String(v ?? "").trim();

// asOnDate is "DD/MM/YYYY" (what the SQL function expects)
export const getItemHistory = async (p: {
  coId: string;
  allBranches: boolean;
  branchId: string;
  itemId: string;
  asOnDate: string;
}): Promise<HistoryGroup[]> => {
  // dbo.sp_rptitemhistory is a PROCEDURE with an INOUT refcursor
  const rows = await callCursor(
    "sp_rptitemhistory",
    [p.coId, p.allBranches, p.allBranches ? "" : p.branchId, p.itemId, p.asOnDate],
    ["varchar", "boolean", "varchar", "varchar", "varchar"],
  );

  // VB report: grouped by fItemID (the header block shows the first row's values)
  const groups = new Map<string, HistoryGroup>();

  for (const r of rows) {
    const key = String(r.fitemid);
    let g = groups.get(key);

    if (!g) {
      g = {
        itemId: key,
        itemName: text(r.fitemname),
        supplier: text(r.faccountname),
        lastSaleDate: dateStr(r.flastsaledate),
        lastPurDate: dateStr(r.flastpurdate),
        lastSaleUnitPrice: num(r.flastsaleunitprice),
        // the SQL function has ONE purchase price (4 decimals) + its currency
        lastPurUnitPriceFC: num(r.flastpurunitprice),
        lastPurUnitPrice: num(r.flastpurunitprice),
        lastPurUnitCost: num(r.flastpurunitcost),
        lastPurCurrency: text(r.flastpurcurrency),
        stock: num(r.fstock),
        rows: [],
      };
      groups.set(key, g);
    }

    // an item with stock but no transaction up to the date comes back as one
    // row with empty transaction columns: keep the header, skip the empty line
    if (r.fdoctype !== null || r.fdate !== null) {
      g.rows.push({
        date: dateStr(r.fdate),
        docType: text(r.fdoctype),
        docNo: text(r.fdocno),
        accountId: text(r.faccountid),
        qtyIn: num(r.fqtyin),
        qtyOut: num(r.fqtyout),
        unitCost: num(r.funitcost),
        unitPrice: num(r.funitprice),
      });
    }
  }

  return [...groups.values()];
};