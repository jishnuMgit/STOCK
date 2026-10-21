// services/Sales/Report/RptSalesPriceListService.ts
// Data access for the Sales Price List REPORT page
// (port of the rptPriceList form + rptPriceListRpt / SP_rptPriceList
//  -> dbo.sp_rptpricelist).
import type { PoolClient } from "pg";
import pool from "../../../DB/db.js";

export type Branch = { brId: string; brName: string };

export type ItemGroup = { groupId: string; groupName: string };
export type ItemLookup = {
  itemId: string;
  itemName: string;
  itemGroupId: string; // the Item lookup follows the selected Item Group
};

export type PriceListParams = {
  coId: string;
  branchId: string;
  groupId: string | null; // null = all item groups
  itemFrom: string | null; // null = all items
  itemTo: string | null; // One Item: same as itemFrom
};

export type PriceItem = {
  itemId: string;
  itemName: string;
  unit: string;
  unitCost: number | null;
  unitPrice: number | null;
};

// the report is grouped by item group (VB group header ghItemGroup)
export type PriceGroup = {
  groupId: string;
  groupName: string;
  items: PriceItem[];
};

type Db = Pick<PoolClient, "query">;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DbRow = Record<string, any>;

const text = (v: unknown): string => String(v ?? "");

// numeric columns come back from pg as strings; an empty value stays empty
const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

// ------------------------------------------------------------
// Calls a Postgres PROCEDURE that returns a refcursor (INOUT):
// CALL + FETCH must run in ONE transaction.
// ------------------------------------------------------------
let cursorSeq = 0;

const callCursor = async (
  name: string,
  args: unknown[],
  casts: string[],
): Promise<DbRow[]> => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const cur = `cur_${name}_${process.pid}_${++cursorSeq}`.toLowerCase();
    const list = casts.map((c, i) => `$${i + 1}::${c}`).join(", ");

    await client.query(
      `CALL dbo.${name}(${list}, $${args.length + 1}::refcursor)`,
      [...args, cur],
    );
    const { rows } = await client.query(`FETCH ALL FROM "${cur}"`);
    await client.query("COMMIT");
    return rows;
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

const q = (db: Db, sql: string, args: unknown[]) => db.query(sql, args);

// ------------------------------------------------------------
// LOOKUPS (VB FillCombos): the branches the user may use
// ------------------------------------------------------------
export const getUserBranches = async (
  coId: string,
  userId: string,
): Promise<Branch[]> => {
  const { rows } = await q(
    pool,
    `SELECT * FROM dbo.fillbranchofuser($1::varchar, $2::varchar)`,
    [coId, userId],
  );
  return rows
    .map((r) => ({
      brId: text(r.fbrid ?? r.brid).trim(),
      brName: text(r.fbrname ?? r.brname).trim(),
    }))
    .filter((b) => b.brId !== "");
};

// the item groups (Item Group filter)
export const getItemGroups = async (): Promise<ItemGroup[]> => {
  const { rows } = await q(
    pool,
    `SELECT fitemgroupid AS "groupId", fitemgroupname AS "groupName"
       FROM dbo.tblitemgroup
      ORDER BY fitemgroupid`,
    [],
  );
  return rows.map((r) => ({
    groupId: text(r.groupId).trim(),
    groupName: text(r.groupName).trim(),
  }));
};

// the items of the company (Item filter)
export const getItems = async (coId: string): Promise<ItemLookup[]> => {
  const { rows } = await q(
    pool,
    `SELECT fitemid AS "itemId", fitemname AS "itemName",
            fitemgroupid AS "itemGroupId"
       FROM dbo.tblitemhd
      WHERE fcoid = $1
      ORDER BY fitemid`,
    [coId],
  );
  return rows.map((r) => ({
    itemId: text(r.itemId).trim(),
    itemName: text(r.itemName).trim(),
    itemGroupId: text(r.itemGroupId).trim(),
  }));
};

// ------------------------------------------------------------
// THE REPORT - dbo.sp_rptpricelist (PROCEDURE with an INOUT refcursor)
//   parameters: company, branch, item group, item from, item to
//               (a NULL filter means "all")
//   columns:    fitemid, fitemname, funit, funitcost, funitprice,
//               fitemgroupid, fitemgroupname
// ------------------------------------------------------------
export const getPriceList = async (p: PriceListParams): Promise<PriceGroup[]> => {
  const rows = await callCursor(
    "sp_rptpricelist",
    [p.coId, p.branchId, p.groupId, p.itemFrom, p.itemTo],
    ["varchar", "varchar", "varchar", "varchar", "varchar"],
  );

  const mapped = rows.map((r) => ({
    groupId: text(r.fitemgroupid).trim(),
    groupName: text(r.fitemgroupname).trim(),
    item: {
      itemId: text(r.fitemid).trim(),
      itemName: text(r.fitemname),
      unit: text(r.funit),
      unitCost: num(r.funitcost),
      unitPrice: num(r.funitprice),
    } as PriceItem,
  }));

  // VB group field fItemGroupID, ascending (stable: the procedure's order
  // is kept inside each group)
  mapped.sort((a, b) =>
    a.groupId < b.groupId ? -1 : a.groupId > b.groupId ? 1 : 0,
  );

  const groups: PriceGroup[] = [];
  for (const m of mapped) {
    let g = groups[groups.length - 1];
    if (!g || g.groupId !== m.groupId) {
      g = { groupId: m.groupId, groupName: m.groupName, items: [] };
      groups.push(g);
    }
    g.items.push(m.item);
  }
  return groups;
};