import type { PoolClient } from "pg";
import pool from "../../DB/db.js";

/* =========================================================
   ADMINISTRATION > YEAR - calls dbo.sp_pageyear (the port of the old
   SP_frmYear). The grid is the list of the OPEN years of each branch of the
   logged-in company. The page sends the whole grid; the open years that are not
   in it are taken away and the new ones are opened, in ONE transaction. A closed
   year is never touched.
========================================================= */

export type AdministrationYearRow = {
  fbrid: string;
  fyear: number;
};

// one row of the grid, as the page sends it
export type AdministrationYearRowPayload = {
  lkpBranch: string;
  txtYear: string | number;
};

export type AdministrationYearDone = {
  mode: "S" | "D";
  lkpBranch: string;
  txtYear: number;
  note: string;
};

async function fetchOpenYears(
  client: PoolClient,
  PstrCoID: string
): Promise<AdministrationYearRow[]> {
  const cursorName =
    `cur_year_${Date.now()}_${Math.floor(Math.random() * 100000)}`;

  await client.query(
    `
    CALL dbo.sp_pageyear(
      p_strmode       => 'G'::varchar,
      p_pstrcoid      => $1::varchar,
      p_result_cursor => $2::refcursor
    )
    `,
    [PstrCoID, cursorName]
  );

  const result = await client.query(`FETCH ALL FROM "${cursorName}"`);

  return result.rows as AdministrationYearRow[];
}

/* =========================================================
   THE SCREEN: the company's branches (the Branch dropdown) and its open years
========================================================= */

export async function getAdministrationYearService(PstrCoID: string): Promise<{
  branches: { fbrid: string; fbrname: string }[];
  years: AdministrationYearRow[];
}> {
  const client: PoolClient = await pool.connect();

  try {
    await client.query("BEGIN");

    const branches = await client.query(
      `SELECT fbrid, fbrname FROM dbo.fillbranch($1::varchar)`,
      [PstrCoID]
    );

    const years = await fetchOpenYears(client, PstrCoID);

    await client.query("COMMIT");

    return { branches: branches.rows, years };
  } catch (error: unknown) {
    await client.query("ROLLBACK");
    console.error("getAdministrationYearService error:", error);
    throw error;
  } finally {
    client.release();
  }
}

/* =========================================================
   SAVE / MODIFY - the open years not in the grid are taken away (D), the years
   of the grid that are not open yet are opened (S). A year that is in both is
   left alone. Returns what was done (with the audit note of each) and whether
   the company had no open year before (that was a Save, not a Modify).
========================================================= */

export async function saveAdministrationYearService(data: {
  PstrCoID: string;
  PstrUserID: string;
  rows: AdministrationYearRowPayload[];
}): Promise<{ done: AdministrationYearDone[]; wasEmpty: boolean }> {
  const client: PoolClient = await pool.connect();
  const done: AdministrationYearDone[] = [];

  try {
    await client.query("BEGIN");

    const open = await fetchOpenYears(client, data.PstrCoID);

    const keyOf = (branch: string, year: number | string) =>
      `${branch}|${Number(year)}`;

    const wanted = new Map<string, { branch: string; year: number }>();

    for (const row of data.rows) {
      const branch = String(row.lkpBranch).trim();
      const year = Number(row.txtYear);

      wanted.set(keyOf(branch, year), { branch, year });
    }

    const current = new Set(open.map((row) => keyOf(row.fbrid, row.fyear)));

    const call = (mode: "S" | "D", branch: string, year: number) =>
      client.query(
        `
        CALL dbo.sp_pageyear(
          p_strmode    => $1::varchar,
          p_pstrcoid   => $2::varchar,
          p_strbrid    => $3::varchar,
          p_intyear    => $4::smallint,
          p_pstruserid => $5::varchar
        )
        `,
        [mode, data.PstrCoID, branch, year, data.PstrUserID]
      );

    // the open years that are not in the grid any more
    for (const row of open) {
      if (wanted.has(keyOf(row.fbrid, row.fyear))) continue;

      await call("D", row.fbrid, Number(row.fyear));

      done.push({
        mode: "D",
        lkpBranch: row.fbrid,
        txtYear: Number(row.fyear),
        note: `Year ${row.fyear} of Branch ${row.fbrid} removed`,
      });
    }

    // the years of the grid that are not open yet
    for (const [key, entry] of wanted) {
      if (current.has(key)) continue;

      await call("S", entry.branch, entry.year);

      done.push({
        mode: "S",
        lkpBranch: entry.branch,
        txtYear: entry.year,
        note: `Year ${entry.year} of Branch ${entry.branch} opened`,
      });
    }

    await client.query("COMMIT");

    return { done, wasEmpty: open.length === 0 };
  } catch (error: unknown) {
    await client.query("ROLLBACK");
    console.error("saveAdministrationYearService error:", error);
    throw error;
  } finally {
    client.release();
  }
}

/* =========================================================
   DELETE ONE YEAR (the x of a row): the open year of the branch is taken away
   at once, in its own transaction. Returns what was done (with the audit note)
   so the controller can write the audit row after the commit.
========================================================= */

export async function deleteAdministrationYearService(data: {
  PstrCoID: string;
  PstrUserID: string;
  lkpBranch: string;
  txtYear: string | number;
}): Promise<AdministrationYearDone> {
  const client: PoolClient = await pool.connect();

  try {
    await client.query("BEGIN");

    const branch = String(data.lkpBranch).trim();
    const year = Number(data.txtYear);

    await client.query(
      `
      CALL dbo.sp_pageyear(
        p_strmode    => 'D'::varchar,
        p_pstrcoid   => $1::varchar,
        p_strbrid    => $2::varchar,
        p_intyear    => $3::smallint,
        p_pstruserid => $4::varchar
      )
      `,
      [data.PstrCoID, branch, year, data.PstrUserID]
    );

    await client.query("COMMIT");

    return {
      mode: "D",
      lkpBranch: branch,
      txtYear: year,
      note: `Year ${year} of Branch ${branch} removed`,
    };
  } catch (error: unknown) {
    await client.query("ROLLBACK");
    console.error("deleteAdministrationYearService error:", error);
    throw error;
  } finally {
    client.release();
  }
}

// the same words as the other screens: "... saved successfully" for the first
// save (no open year before), "... modified successfully" afterwards
export const buildAdministrationYearMessage = (wasEmpty: boolean): string =>
  wasEmpty ? "Year saved successfully" : "Year modified successfully";
