// services/Purchase/Report/RptItemListService.ts
// Data access for the Item List REPORT page
// (port of the rptItemList form + rptItemListRpt / rptItemListStatusRpt /
//  rptItemListAllBrRpt, all fed by SP_rptItemList -> dbo.sp_rptitemlist).
import type { PoolClient } from "pg";
import pool from "../../../DB/db.js";

export type Branch = { brId: string; brName: string };
export type Group = { groupId: string; groupName: string };

export type Item = {
  itemId: string;
  itemName: string;
  brId: string;
  packing: string;
  groupId: string;
  allowSaleBelowCost: boolean;
  inactive: boolean;
};

export type ItemListRow = {
  itemId: string;
  itemGroupId: string;
  itemGroupName: string;
  itemName: string;
  unit: string;
  packing: number | null;
  // one-branch only (empty for "All Branch")
  reorderLevel: number | null;
  reorderQty: number | null;
  unitPrice: number | null;
  stock: number | null;
};

export type ItemListParams = {
  coId: string;
  allBranches: boolean;
  branchId: string;
  allGroups: boolean;
  groupId: string;
  itemMode: 0 | 1 | 2; // 0 one item, 1 range, 2 all
  itemId: string;
  fromItemId: string;
  toItemId: string;
  status: 0 | 1 | 2; // 0 active, 1 inactive, 2 hide
  salesBelowCost: boolean;
};

type Db = Pick<PoolClient, "query">;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DbRow = Record<string, any>;

const text = (v: unknown): string => String(v ?? "").trim();

// numeric columns come back from pg as strings
const num = (v: unknown): number | null =>
  v === null || v === undefined || v === "" ? null : Number(v);

const flag = (v: unknown) =>
  v === true || v === 1 || /^(1|t|true|y|yes)$/i.test(String(v ?? "").trim());

// ------------------------------------------------------------
// Calls a Postgres PROCEDURE that returns a refcursor (INOUT):
// CALL + FETCH must run in ONE transaction.
// (If the object is really a FUNCTION - error 42809 - it falls back to SELECT.)
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

// ------------------------------------------------------------
// LOOKUPS (VB FillCombos) - plain FUNCTIONS, called with SELECT
// ------------------------------------------------------------
const q = (db: Db, sql: string, args: unknown[]) => db.query(sql, args);

// the branches the user may use (lkpBranch)
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
      brId: text(r.fbrid ?? r.brid),
      brName: text(r.fbrname ?? r.brname),
    }))
    .filter((b) => b.brId !== "");
};

const mapGroups = (rows: DbRow[]): Group[] =>
  rows
    .map((r) => ({
      groupId: text(r.fitemgroupid ?? r.itemgroupid),
      groupName: text(r.fitemgroupname ?? r.itemgroupname),
    }))
    .filter((g) => g.groupId !== "");

const mapItems = (rows: DbRow[]): Item[] =>
  rows
    .map((r) => ({
      itemId: text(r.fitemid ?? r.itemid),
      itemName: text(r.fitemname ?? r.itemname),
      brId: text(r.fbrid ?? r.brid),
      packing: text(r.fpacking ?? r.packing),
      groupId: text(r.fitemgroupid ?? r.itemgroupid),
      allowSaleBelowCost: flag(r.fallowsalebelowcost),
      inactive: flag(r.finactive ?? r.inactive),
    }))
    .filter((i) => i.itemId !== "");

// lkpItemGroupID (ordered by id) and lkpItemGroupName (ordered by name)
export const getGroupsById = async (coId: string): Promise<Group[]> => {
  const { rows } = await q(
    pool,
    `SELECT * FROM dbo.filllookupitemgroupid($1::varchar)`,
    [coId],
  );
  return mapGroups(rows);
};

export const getGroupsByName = async (coId: string): Promise<Group[]> => {
  const { rows } = await q(
    pool,
    `SELECT * FROM dbo.filllookupitemgroupname($1::varchar)`,
    [coId],
  );
  return mapGroups(rows);
};

// lkpItemID (ordered by id) and lkpItemName (ordered by name).
// One row per item and branch.
export const getItemsById = async (coId: string): Promise<Item[]> => {
  const { rows } = await q(
    pool,
    `SELECT * FROM dbo.filllookupitemid($1::varchar)`,
    [coId],
  );
  return mapItems(rows);
};

export const getItemsByName = async (coId: string): Promise<Item[]> => {
  const { rows } = await q(
    pool,
    `SELECT * FROM dbo.filllookupitemname($1::varchar)`,
    [coId],
  );
  return mapItems(rows);
};

// ------------------------------------------------------------
// THE REPORT - dbo.sp_rptitemlist (PROCEDURE with an INOUT refcursor)
//   rdgbranch / rdgitemgroup: false = ONE branch / group, true = ALL
//   rdgitem: 0 one item, 1 range, 2 all
//   rdgitemstatus: 0 active, 1 inactive, 2 hide
// ------------------------------------------------------------
export const getItemList = async (
  p: ItemListParams,
): Promise<ItemListRow[]> => {
  const rows = await callCursor(
    "sp_rptitemlist",
    [
      p.coId,
      p.allBranches,
      p.allBranches ? null : p.branchId,
      p.allGroups,
      p.allGroups ? null : p.groupId,
      p.itemMode,
      p.itemMode === 0 ? p.itemId : null,
      p.itemMode === 1 ? p.fromItemId : null,
      p.itemMode === 1 ? p.toItemId : null,
      p.status,
      p.salesBelowCost,
    ],
    [
      "varchar",
      "boolean",
      "varchar",
      "boolean",
      "varchar",
      "smallint",
      "varchar",
      "varchar",
      "varchar",
      "smallint",
      "boolean",
    ],
  );

  return rows.map((r) => ({
    itemId: text(r.fitemid),
    itemGroupId: text(r.fitemgroupid),
    itemGroupName: text(r.fitemgroupname),
    itemName: text(r.fitemname),
    unit: text(r.funit),
    packing: num(r.fpacking),
    reorderLevel: num(r.freorderlevel),
    reorderQty: num(r.freorderqty),
    unitPrice: num(r.funitprice),
    stock: num(r.fstock),
  }));
};
