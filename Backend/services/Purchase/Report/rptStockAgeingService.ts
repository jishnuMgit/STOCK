import pool from "../../../DB/db.js";

export type Branch = { brId: string; brName: string };

const text = (value: unknown): string => String(value ?? "");

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

export type Item = { itemId: string; itemName: string; brId: string };

// the items of every branch (the Item ID / Item Name boxes and the Item Range boxes), one row per branch and
// item, by Item ID: dbo.filllookupitemid, the same lookup the other screens use (tblitemtl - the items a branch
// trades - with the name from tblitemhd). The screen shows the items of the branch that is chosen.
export const getItems = async (PstrCoID: string): Promise<Item[]> => {
  const { rows } = await pool.query(`SELECT * FROM dbo.filllookupitemid($1)`, [PstrCoID]);

  return rows.map((r) => ({
    itemId: text(r.fitemid).trim(),
    itemName: text(r.fitemname).trim(),
    brId: text(r.fbrid).trim(),
  }));
};

export type AgeingMode = { ageingMode: string };

// the ageing modes the company has set up for stock (dbo.tblageingperiod, module STK): 'Days' and/or 'Month'.
// A mode counts only when its columns 1-4 are all there (the report needs them); Days comes first.
export const getAgeingModes = async (PstrCoID: string): Promise<AgeingMode[]> => {
  const { rows } = await pool.query(
    `
    SELECT fageingmode
      FROM dbo.tblageingperiod
     WHERE fcoid = $1
       AND fmoduleid = 'STK'
       AND frptcolumnid BETWEEN 1 AND 4
     GROUP BY fageingmode
    HAVING COUNT(DISTINCT frptcolumnid) = 4
     ORDER BY CASE WHEN fageingmode = 'Days' THEN 0 ELSE 1 END, fageingmode
    `,
    [PstrCoID]
  );

  return rows.map((r) => ({ ageingMode: text(r.fageingmode).trim() }));
};

// the labels of the five age columns, from the same table the procedure cuts them by:
// Days "0-30 Days", "31-60 Days" ... ">180 Days"; Month "0-3 Months" ... ">24 Months"
// (the last column has no "to": everything older than its "from")
export const getAgeingLabels = async (PstrCoID: string, lkpAgeingMode: string): Promise<string[]> => {
  const { rows } = await pool.query(
    `
    SELECT frptcolumnid, ffrom, fto
      FROM dbo.tblageingperiod
     WHERE fcoid = $1
       AND fmoduleid = 'STK'
       AND fageingmode = $2
       AND frptcolumnid BETWEEN 1 AND 5
     ORDER BY frptcolumnid
    `,
    [PstrCoID, lkpAgeingMode]
  );

  const unit = lkpAgeingMode === "Days" ? "Days" : "Months";

  return [1, 2, 3, 4, 5].map((column) => {
    const r = rows.find((x) => Number(x.frptcolumnid) === column);

    if (!r) return `Column ${column}`;

    const from = Number(r.ffrom);
    const to = Number(r.fto);

    // Days keeps the first day of the column (181 -> ">180"), Month keeps the month it starts after (24 -> ">24")
    const over = lkpAgeingMode === "Days" ? from - 1 : from;

    return to === 0 ? `>${over} ${unit}` : `${from}-${to} ${unit}`;
  });
};

/* =========================================================
   THE REPORT - dbo.sp_rptstockageing (PROCEDURE with an INOUT refcursor)
========================================================= */

// what the screen asks for, as the procedure takes it (the codes of the old SP_rptStockAgeing)
export type StockAgeingParams = {
  PstrCoID: string;
  PstrYear: string; // the login year: which stock control row gives the Unit Cost
  rdgBranch: 0 | 1; // 0 One Branch, 1 All Branch
  lkpBranch: string; // One Branch
  rdgItem: 0 | 1 | 2; // 0 One Item, 1 Range Item, 2 All Item
  lkpItemID: string; // One Item
  lkpFromItem: string; // Range Item
  lkpToItem: string; // Range Item
  dtpAsOnDate: string; // yyyy-mm-dd
  lkpAgeingMode: string; // 'Days' or 'Month', as tblageingperiod keeps them
  lkpPostStatus: 0 | 1 | 2; // 0 All, 1 Posted, 2 Non Posted (the same as the other reports)
  lkpPrint0Balance: 0 | 1; // 1 Yes: the items whose balance is 0 are printed too, 0 No: they are left out
};

// one printed line: an item, its stock and how old that stock is (the old report is a flat list, no groups)
export type StockAgeingLine = {
  lkpItemID: string;
  txtItemName: string;
  txtItemGroupName: string;
  txtUnit: string;
  txtStock: number; // the Stock column
  txtUnitCost: number;
  txtAge: number[]; // the five age columns, the newest first
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DbRow = Record<string, any>;

const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

// CALL and FETCH must run in ONE transaction
let cursorSeq = 0;

const callStockAgeing = async (p: StockAgeingParams): Promise<DbRow[]> => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const cursor = `cur_rptstockageing_${process.pid}_${++cursorSeq}`.toLowerCase();

    // the arguments of sp_rptstockageing, in its order
    await client.query(
      `
      CALL dbo.sp_rptstockageing(
        $1::varchar, $2::varchar, $3::varchar, $4::boolean, $5::int,
        $6::varchar, $7::varchar, $8::varchar, $9::date, $10::varchar,
        $11::int, $12::boolean, $13::refcursor
      )
      `,
      [
        p.PstrCoID, // p_pstrcoid
        p.PstrYear, // p_pstryear
        p.rdgBranch === 0 ? p.lkpBranch : null, // p_strbrid
        p.rdgBranch === 1, // p_rdgbranch: false One Branch, true All Branch
        p.rdgItem, // p_rdgitem
        p.rdgItem === 0 ? p.lkpItemID : null, // p_stritemid
        p.rdgItem === 1 ? p.lkpFromItem : null, // p_strfromitemid
        p.rdgItem === 1 ? p.lkpToItem : null, // p_strtoitemid
        p.dtpAsOnDate, // p_dtpasondate
        p.lkpAgeingMode, // p_strageingmode
        p.lkpPostStatus, // p_lkppoststatus
        p.lkpPrint0Balance === 0, // p_blnprint0bal: true LEAVES OUT the items whose balance is 0
        cursor,
      ]
    );

    const { rows } = await client.query(`FETCH ALL FROM "${cursor}"`);

    await client.query("COMMIT");

    return rows;
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {
      /* ignore */
    }

    throw error;
  } finally {
    client.release();
  }
};

// the lines come in the order the procedure gives them: by Item ID (the old report has no groups and no totals)
export const getStockAgeing = async (p: StockAgeingParams): Promise<StockAgeingLine[]> => {
  const rows = await callStockAgeing(p);

  return rows.map((r) => ({
    lkpItemID: text(r.fitemid).trim(),
    txtItemName: text(r.fitemname).trim(),
    txtItemGroupName: text(r.fitemgroupname).trim(),
    txtUnit: text(r.funit).trim(),
    txtStock: num(r.fbal),
    txtUnitCost: num(r.funitcost),
    txtAge: [r.fbaldr1, r.fbaldr2, r.fbaldr3, r.fbaldr4, r.fbaldr5].map(num),
  }));
};
