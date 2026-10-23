import type { PoolClient } from "pg";
import pool from "../../../DB/db.js";

/* =========================================================
   BEGINNING STOCK - calls dbo.sp_pagebeginningstock
   (the port of the old SP_frmBeginningStock; the document is doc type 'BG',
   doc no 'BG', one per branch)
========================================================= */

const DOC_TYPE = "BG";
const DOC_NO = "BG";

/* =========================================================
   BRANCH LIST (the Branch box) - only the branches the logged-in user has a
   right to: dbo.userbranches is true for every branch for an Admin User (AU)
   and for the granted branches (tbluserpermissionbranch) of anyone else
========================================================= */

export async function getBeginningStockBranchListService(
  PstrCoID: string,
  PstrUserID: string
): Promise<{ fbrid: string; fbrname: string }[]> {
  const result = await pool.query(
    `
    SELECT fbrid, fbrname
    FROM dbo.tblbranch
    WHERE fcoid = $1
      AND dbo.userbranches($1, $2, fbrid)
    ORDER BY fpositionno, fbrid
    `,
    [PstrCoID, PstrUserID]
  );

  return result.rows;
}

/* =========================================================
   DEFAULT BRANCH of the logged-in user (dbo.getuserdefbranch, from
   tbldefaultbranch - the Set Default Branch screen). Empty when none is set.
========================================================= */

export async function getBeginningStockDefaultBranchService(
  PstrCoID: string,
  PstrUserID: string
): Promise<string> {
  const result = await pool.query(
    `SELECT dbo.getuserdefbranch($1, $2) AS "defaultBranch"`,
    [PstrCoID, PstrUserID]
  );

  return String(result.rows[0]?.defaultBranch ?? "").trim();
}

/* =========================================================
   ITEM LIST of a branch (the Item ID / Item Name boxes): the items of the
   branch (tblitemtl) that are not blocked for it, with their unit
========================================================= */

export type BeginningStockItem = {
  fitemid: string;
  fitemname: string | null;
  funit: string | null;
};

export async function getBeginningStockItemListService(
  PstrCoID: string,
  lkpBranch: string
): Promise<BeginningStockItem[]> {
  const result = await pool.query(
    `
    SELECT fitemid, fitemname, funit
    FROM dbo.fillbranchitems($1::varchar, $2::varchar)
    `,
    [PstrCoID, lkpBranch]
  );

  return result.rows;
}

/* =========================================================
   THE SAVED DOCUMENT of a branch (modes GHD + GTL)
========================================================= */

export type BeginningStockHeader = {
  fdate: string | null;
  fsuserid: string | null;
  fsuserdate: string | null;
  fmuserid: string | null;
  fmuserdate: string | null;
  fnote: string | null;
};

export type BeginningStockLine = {
  fslno: number;
  fitemid: string;
  funit: string | null;
  fqtyin: string;
  funitcost: string;
  ftotalcost: string;
};

export async function getBeginningStockService(
  PstrCoID: string,
  PstrYear: number,
  lkpBranch: string
): Promise<{
  header: BeginningStockHeader | null;
  lines: BeginningStockLine[];
  posted: boolean;
}> {
  const client: PoolClient = await pool.connect();

  try {
    await client.query("BEGIN");

    const header = await fetchCursor<BeginningStockHeader>(client, "GHD", PstrCoID, PstrYear, lkpBranch);
    const lines = await fetchCursor<BeginningStockLine>(client, "GTL", PstrCoID, PstrYear, lkpBranch);

    await client.query("COMMIT");

    return {
      header: header[0] ?? null,
      lines,
      posted: await isBeginningStockPostedService(PstrCoID, lkpBranch),
    };
  } catch (error: unknown) {
    await client.query("ROLLBACK");
    console.error("getBeginningStockService error:", error);
    throw error;
  } finally {
    client.release();
  }
}

// the old IsPosted: does the branch's Beginning Stock have a posted line?
export async function isBeginningStockPostedService(
  PstrCoID: string,
  lkpBranch: string
): Promise<boolean> {
  const result = await pool.query(
    `
    SELECT 1
    FROM dbo.tblstocktrans
    WHERE fcoid = $1
      AND fbrid = $2
      AND fdoctype = $3
      AND fpost = true
    LIMIT 1
    `,
    [PstrCoID, lkpBranch, DOC_TYPE]
  );

  return (result.rowCount ?? 0) > 0;
}

/* =========================================================
   SAVE (the Save / Modify button)

   One transaction. A branch with no document yet: every line is inserted
   (mode S). A branch that has one (Modify): removed lines are deleted (D1),
   kept lines are updated (M1, in two passes so renumbering can't clash with
   the key), new lines are inserted (S), and last of all the header update (M)
   puts the date, the note and the modified-by on every line (the note is the
   same on every line of the document, in fnote).

   Save and Modify never post: the post flag is false and there is no
   transaction no.
========================================================= */

// what the save did, line by line (for the audit note)
export type BeginningStockAuditLine = {
  slNo: number;
  item: string;
  qty: number;
  unitCost: number;
  totalCost: number;
};

export type BeginningStockSaveResult = {
  mode: "S" | "M";
  lines: number;
  totalCost: number;
  addedLines: BeginningStockAuditLine[];
  changedLines: { slNo: number; item: string; changes: string[] }[];
  removedLines: BeginningStockAuditLine[];
  // Modify only: what the header was before (yyyy-mm-dd, the note)
  dateChange: { from: string; to: string } | null;
  noteChange: { from: string; to: string } | null;
  txtNote: string;
};

// the audit note of a save: the branch, the date, the totals - and WHAT was added,
// changed and removed (each line with its Sl.#, item, quantity and cost)
export function buildBeginningStockAuditNote(
  lkpBranch: string,
  dtpDate: string,
  result: BeginningStockSaveResult
): string {
  const num = (value: number) => String(Math.round(value * 10000) / 10000);
  const showDate = (value: string) => value.split("-").reverse().join("/");
  const entry = (line: BeginningStockAuditLine) =>
    `Sl.# ${line.slNo} '${line.item}' Qty ${num(line.qty)} x ${num(line.unitCost)} = ${num(line.totalCost)}`;

  const parts: string[] = [
    `Branch : ${lkpBranch} Date : ${showDate(dtpDate)}; Lines : ${result.lines}; Total Cost : ${result.totalCost.toFixed(4)}`,
  ];

  if (result.dateChange) {
    parts.push(
      `Date changed: ${showDate(result.dateChange.from)} -> ${showDate(result.dateChange.to)}`
    );
  }

  if (result.mode === "S" && result.txtNote !== "") {
    parts.push(`Note : '${result.txtNote}'`);
  }

  if (result.noteChange) {
    parts.push(
      `Note changed: '${result.noteChange.from}' -> '${result.noteChange.to}'`
    );
  }

  if (result.addedLines.length > 0) {
    parts.push(`Added: ${result.addedLines.map(entry).join("; ")}`);
  }

  if (result.changedLines.length > 0) {
    parts.push(
      `Changed: ${result.changedLines
        .map((line) => `Sl.# ${line.slNo} '${line.item}' (${line.changes.join("; ")})`)
        .join("; ")}`
    );
  }

  if (result.removedLines.length > 0) {
    parts.push(`Removed: ${result.removedLines.map(entry).join("; ")}`);
  }

  // tbluseraudit.fnote is varchar(2000)
  const note = parts.join("\n");

  return note.length > 2000 ? `${note.slice(0, 1996)}...` : note;
}

// the audit note of a Delete: the branch, the date, the totals - and WHAT went
// (each line with its Sl.#, item, quantity and cost)
export function buildBeginningStockDeleteAuditNote(
  lkpBranch: string,
  dtpDate: string | null,
  lines: BeginningStockLine[]
): string {
  const num = (value: number) => String(Math.round(value * 10000) / 10000);
  const showDate = (value: string) => value.split("-").reverse().join("/");

  const total = lines.reduce((sum, line) => sum + Number(line.ftotalcost), 0);

  const head =
    `Branch : ${lkpBranch}` +
    (dtpDate ? ` Date : ${showDate(dtpDate)}` : "") +
    `; Lines : ${lines.length}; Total Cost : ${total.toFixed(4)}`;

  const deleted = lines
    .map(
      (line) =>
        `Sl.# ${Number(line.fslno)} '${line.fitemid}' Qty ${num(Number(line.fqtyin))} x ${num(Number(line.funitcost))} = ${num(Number(line.ftotalcost))}`
    )
    .join("; ");

  const note = `${head}\nDeleted: ${deleted}`;

  // tbluseraudit.fnote is varchar(2000)
  return note.length > 2000 ? `${note.slice(0, 1996)}...` : note;
}

export interface BeginningStockRowPayload {
  lkpItemID: string;
  txtQty: string | number;
  txtUnitCost: string | number;
  // the Sl.# the line had when it was loaded (empty / null for a new line)
  txtOriginalSlNo?: number | string | null;
}

export async function saveBeginningStockService(p: {
  PstrCoID: string;
  PstrYear: number;
  lkpBranch: string;
  dtpDate: string;
  txtNote: string;
  rows: BeginningStockRowPayload[];
  PstrUserID: string;
}): Promise<BeginningStockSaveResult> {
  const client: PoolClient = await pool.connect();

  try {
    await client.query("BEGIN");

    const saved = await fetchCursor<BeginningStockLine>(
      client,
      "GTL",
      p.PstrCoID,
      p.PstrYear,
      p.lkpBranch
    );

    const savedHeader = (
      await fetchCursor<BeginningStockHeader>(
        client,
        "GHD",
        p.PstrCoID,
        p.PstrYear,
        p.lkpBranch
      )
    )[0];

    // the unit of every item comes from the item master, not from the page
    const unitResult = await client.query(
      `SELECT fitemid, funit FROM dbo.tblitemhd WHERE fcoid = $1 AND fitemid = ANY($2::varchar[])`,
      [p.PstrCoID, p.rows.map((row) => row.lkpItemID)]
    );
    const unitOf = new Map<string, string | null>(
      unitResult.rows.map((row) => [row.fitemid as string, row.funit as string | null])
    );

    // the lines as they will be saved: Sl.# in grid order, the total from the
    // quantity and the unit cost (4 decimals, as the column)
    const lines = p.rows.map((row, index) => {
      const qty = Number(row.txtQty) || 0;
      const unitCost = Number(row.txtUnitCost) || 0;

      return {
        slNo: index + 1,
        item: row.lkpItemID,
        unit: unitOf.get(row.lkpItemID) ?? null,
        qty,
        unitCost,
        totalCost: Math.round(qty * unitCost * 10000) / 10000,
        originalSlNo:
          row.txtOriginalSlNo === null ||
          row.txtOriginalSlNo === undefined ||
          row.txtOriginalSlNo === ""
            ? null
            : Number(row.txtOriginalSlNo),
      };
    });

    const savedSlNos = new Set(saved.map((line) => Number(line.fslno)));
    const mode: "S" | "M" = saved.length > 0 ? "M" : "S";

    // The document's saving transaction number (fsavingtransno): the one its
    // lines already carry, so a Modify never renumbers it - or, for a new
    // document (or lines saved before the column existed), the next one from
    // dbo.getnexttransno. The same number goes on every line.
    const savingResult = await client.query(
      `
      SELECT MAX(fsavingtransno) AS "savingTransNo"
      FROM dbo.tblstocktrans
      WHERE fcoid    = $1
        AND fyear    = $2
        AND fbrid    = $3
        AND fdoctype = $4
        AND fdocno   = $5
      `,
      [p.PstrCoID, p.PstrYear, p.lkpBranch, DOC_TYPE, DOC_NO]
    );

    const savingTransNo: string =
      savingResult.rows[0]?.savingTransNo ??
      (
        await client.query(
          `SELECT dbo.getnexttransno($1::varchar, $2::varchar, $3::varchar, 'S') AS "savingTransNo"`,
          [p.PstrCoID, String(p.PstrYear), p.lkpBranch]
        )
      ).rows[0].savingTransNo;

    const kept = lines.filter(
      (line) => line.originalSlNo !== null && savedSlNos.has(line.originalSlNo)
    );
    const added = lines.filter(
      (line) => !(line.originalSlNo !== null && savedSlNos.has(line.originalSlNo))
    );
    const keptOriginals = new Set(kept.map((line) => line.originalSlNo));
    const removed = saved.filter((line) => !keptOriginals.has(Number(line.fslno)));

    const common = {
      PstrCoID: p.PstrCoID,
      PstrYear: p.PstrYear,
      lkpBranch: p.lkpBranch,
      dtpDate: p.dtpDate,
      txtNote: p.txtNote,
      PstrUserID: p.PstrUserID,
      savingTransNo,
    };

    // removed lines first
    for (const line of removed) {
      await callSpBeginningStock(client, {
        ...common,
        strmode: "D1",
        originalSlNo: Number(line.fslno),
      });
    }

    // changed lines, pass 1: out of the way (negative Sl.#), pass 2: the final Sl.#
    for (const line of kept) {
      await callSpBeginningStock(client, {
        ...common,
        strmode: "M1",
        intSlNo: -line.slNo,
        itemId: line.item,
        unit: line.unit,
        qty: line.qty,
        unitCost: line.unitCost,
        totalCost: line.totalCost,
        originalSlNo: line.originalSlNo as number,
      });
    }

    for (const line of kept) {
      await callSpBeginningStock(client, {
        ...common,
        strmode: "M1",
        intSlNo: line.slNo,
        itemId: line.item,
        unit: line.unit,
        qty: line.qty,
        unitCost: line.unitCost,
        totalCost: line.totalCost,
        originalSlNo: -line.slNo,
      });
    }

    // new lines
    for (const line of added) {
      await callSpBeginningStock(client, {
        ...common,
        strmode: "S",
        intSlNo: line.slNo,
        itemId: line.item,
        unit: line.unit,
        qty: line.qty,
        unitCost: line.unitCost,
        totalCost: line.totalCost,
      });
    }

    // the header update last: the date and the modified-by on every line (and
    // the same saved-by on every line, so lines added just now have it too)
    if (mode === "M") {
      await callSpBeginningStock(client, { ...common, strmode: "M" });
    }

    await client.query("COMMIT");

    // what the save did, line by line, for the audit note
    const savedByNo = new Map(saved.map((line) => [Number(line.fslno), line]));
    const num = (value: number) => String(Math.round(value * 10000) / 10000);

    const changedLines = kept
      .map((line) => {
        const before = savedByNo.get(line.originalSlNo as number) as BeginningStockLine;
        const changes: string[] = [];

        if (before.fitemid !== line.item) {
          changes.push(`Item ${before.fitemid} -> ${line.item}`);
        }

        if (Number(before.fqtyin) !== line.qty) {
          changes.push(`Qty ${num(Number(before.fqtyin))} -> ${num(line.qty)}`);
        }

        if (Number(before.funitcost) !== line.unitCost) {
          changes.push(
            `Unit Cost ${num(Number(before.funitcost))} -> ${num(line.unitCost)}`
          );
        }

        return { slNo: line.slNo, item: line.item, changes };
      })
      .filter((line) => line.changes.length > 0);

    return {
      mode,
      lines: lines.length,
      totalCost: lines.reduce((sum, line) => sum + line.totalCost, 0),
      addedLines: added.map((line) => ({
        slNo: line.slNo,
        item: line.item,
        qty: line.qty,
        unitCost: line.unitCost,
        totalCost: line.totalCost,
      })),
      changedLines,
      removedLines: removed.map((line) => ({
        slNo: Number(line.fslno),
        item: line.fitemid,
        qty: Number(line.fqtyin),
        unitCost: Number(line.funitcost),
        totalCost: Number(line.ftotalcost),
      })),
      dateChange:
        mode === "M" && savedHeader?.fdate && savedHeader.fdate !== p.dtpDate
          ? { from: savedHeader.fdate, to: p.dtpDate }
          : null,
      noteChange:
        mode === "M" && (savedHeader?.fnote ?? "") !== p.txtNote
          ? { from: savedHeader?.fnote ?? "", to: p.txtNote }
          : null,
      txtNote: p.txtNote,
    };
  } catch (error: unknown) {
    await client.query("ROLLBACK");
    console.error("saveBeginningStockService error:", error);
    throw error;
  } finally {
    client.release();
  }
}

/* =========================================================
   DELETE (the Delete button): the whole Beginning Stock of the branch (mode D).
   The lines and the date are read first, for the audit note.
========================================================= */

export async function deleteBeginningStockService(p: {
  PstrCoID: string;
  PstrYear: number;
  lkpBranch: string;
  PstrUserID: string;
}): Promise<{ lines: BeginningStockLine[]; date: string | null }> {
  const client: PoolClient = await pool.connect();

  try {
    await client.query("BEGIN");

    const lines = await fetchCursor<BeginningStockLine>(
      client,
      "GTL",
      p.PstrCoID,
      p.PstrYear,
      p.lkpBranch
    );

    const header = await fetchCursor<BeginningStockHeader>(
      client,
      "GHD",
      p.PstrCoID,
      p.PstrYear,
      p.lkpBranch
    );

    await callSpBeginningStock(client, {
      strmode: "D",
      PstrCoID: p.PstrCoID,
      PstrYear: p.PstrYear,
      lkpBranch: p.lkpBranch,
      PstrUserID: p.PstrUserID,
    });

    await client.query("COMMIT");

    return { lines, date: header[0]?.fdate ?? null };
  } catch (error: unknown) {
    await client.query("ROLLBACK");
    console.error("deleteBeginningStockService error:", error);
    throw error;
  } finally {
    client.release();
  }
}

/* =========================================================
   DELETE ONE LINE (the x of a row of a saved Beginning Stock): the line goes from
   the database at once - mode D1. The last line cannot be left on its own: the whole
   Beginning Stock is deleted then (mode D), as the Delete button does. One
   transaction. The lines are read first, for the audit note.
========================================================= */

export async function deleteBeginningStockLineService(p: {
  PstrCoID: string;
  PstrYear: number;
  lkpBranch: string;
  // the line's Sl.# in the database (the Sl.# it had when the page loaded it)
  txtSlNo: number;
  PstrUserID: string;
}): Promise<{
  lines: BeginningStockLine[];
  line: BeginningStockLine | null;
  date: string | null;
  documentDeleted: boolean;
}> {
  const client: PoolClient = await pool.connect();

  try {
    await client.query("BEGIN");

    const lines = await fetchCursor<BeginningStockLine>(
      client,
      "GTL",
      p.PstrCoID,
      p.PstrYear,
      p.lkpBranch
    );

    const header = await fetchCursor<BeginningStockHeader>(
      client,
      "GHD",
      p.PstrCoID,
      p.PstrYear,
      p.lkpBranch
    );

    const line = lines.find((entry) => Number(entry.fslno) === p.txtSlNo) ?? null;

    if (line === null) {
      await client.query("ROLLBACK");

      return { lines, line: null, date: header[0]?.fdate ?? null, documentDeleted: false };
    }

    const documentDeleted = lines.length === 1;

    await callSpBeginningStock(client, {
      strmode: documentDeleted ? "D" : "D1",
      PstrCoID: p.PstrCoID,
      PstrYear: p.PstrYear,
      lkpBranch: p.lkpBranch,
      originalSlNo: p.txtSlNo,
      PstrUserID: p.PstrUserID,
    });

    await client.query("COMMIT");

    return { lines, line, date: header[0]?.fdate ?? null, documentDeleted };
  } catch (error: unknown) {
    await client.query("ROLLBACK");
    console.error("deleteBeginningStockLineService error:", error);
    throw error;
  } finally {
    client.release();
  }
}

// the audit note of a deleted line (Modify): the branch and the line
export function buildBeginningStockLineDeleteAuditNote(
  lkpBranch: string,
  line: BeginningStockLine,
  linesBefore: number
): string {
  const num = (value: number) => String(Math.round(value * 10000) / 10000);

  const head = `Branch : ${lkpBranch}; Lines : ${linesBefore} -> ${linesBefore - 1}`;

  const deleted = `Sl.# ${Number(line.fslno)} '${line.fitemid}' Qty ${num(Number(line.fqtyin))} x ${num(Number(line.funitcost))} = ${num(Number(line.ftotalcost))}`;

  const note = `${head}\nDeleted line: ${deleted}`;

  return note.length > 2000 ? `${note.slice(0, 1996)}...` : note;
}

// the audit note of a Post: the branch, the date, the totals - and each line as
// posted. Posting turns the typed Unit Cost into the weighted-average cost, so a
// line whose cost changed also shows "typed -> average".
export function buildBeginningStockPostAuditNote(
  lkpBranch: string,
  dtpDate: string | null,
  before: BeginningStockLine[],
  after: BeginningStockLine[]
): string {
  const num = (value: number) => String(Math.round(value * 10000) / 10000);
  const showDate = (value: string) => value.split("-").reverse().join("/");

  const total = after.reduce((sum, line) => sum + Number(line.ftotalcost), 0);

  const head =
    `Branch : ${lkpBranch}` +
    (dtpDate ? ` Date : ${showDate(dtpDate)}` : "") +
    `; Lines : ${after.length}; Total Cost : ${total.toFixed(4)}`;

  const typedBySlNo = new Map(
    before.map((line) => [Number(line.fslno), Number(line.funitcost)])
  );

  const posted = after
    .map((line) => {
      const typed = typedBySlNo.get(Number(line.fslno));
      const average = Number(line.funitcost);
      const costNote =
        typed !== undefined && typed !== average
          ? ` (Unit Cost ${num(typed)} -> ${num(average)})`
          : "";

      return `Sl.# ${Number(line.fslno)} '${line.fitemid}' Qty ${num(Number(line.fqtyin))} x ${num(average)} = ${num(Number(line.ftotalcost))}${costNote}`;
    })
    .join("; ");

  const note = `${head}\nPosted: ${posted}`;

  // tbluseraudit.fnote is varchar(2000)
  return note.length > 2000 ? `${note.slice(0, 1996)}...` : note;
}

/* =========================================================
   POST (the Post button): dbo.sp_pagebeginningstockpost, mode P - the port of the old SP_BGPost.
   One transaction: the lines are added into the stock (tblstockcontrol, with the
   weighted-average cost) and marked posted, or nothing changes at all.
   The lines are read before and after, for the audit note.
========================================================= */

export async function postBeginningStockService(p: {
  PstrCoID: string;
  PstrYear: number;
  lkpBranch: string;
  PstrUserID: string;
}): Promise<{
  before: BeginningStockLine[];
  after: BeginningStockLine[];
  date: string | null;
}> {
  const client: PoolClient = await pool.connect();

  try {
    await client.query("BEGIN");

    const before = await fetchCursor<BeginningStockLine>(
      client,
      "GTL",
      p.PstrCoID,
      p.PstrYear,
      p.lkpBranch
    );

    const header = await fetchCursor<BeginningStockHeader>(
      client,
      "GHD",
      p.PstrCoID,
      p.PstrYear,
      p.lkpBranch
    );

    // sp_pagebeginningstockpost works on the lines of the login year only: say so, instead of
    // "posting" nothing
    const unposted = await client.query(
      `
      SELECT COUNT(*)::int AS "count"
      FROM dbo.tblstocktrans
      WHERE fcoid    = $1
        AND fyear    = $2
        AND fbrid    = $3
        AND fdoctype = $4
        AND fdocno   = $5
        AND fpost    = false
      `,
      [p.PstrCoID, p.PstrYear, p.lkpBranch, DOC_TYPE, DOC_NO]
    );

    if (!unposted.rows[0]?.count) {
      throw new Error("Beginning Stock not found");
    }

    await client.query(
      `
      CALL dbo.sp_pagebeginningstockpost(
        p_strmode    => $1::varchar,
        p_pstrcoid   => $2::varchar,
        p_pstryear   => $3::varchar,
        p_strbrid    => $4::varchar,
        p_strdoctype => $5::varchar,
        p_strdocno   => $6::varchar,
        p_gstruserid => $7::varchar
      )
      `,
      [
        "P",
        p.PstrCoID,
        String(p.PstrYear),
        p.lkpBranch,
        DOC_TYPE,
        DOC_NO,
        p.PstrUserID,
      ]
    );

    // every item must now have its stock row. If one has none (an old copy of
    // sp_pagebeginningstockpost that does not create it), the lines would be marked posted with
    // no stock added - so stop here and roll the whole post back
    const missing = await client.query(
      `
      SELECT t.fitemid
      FROM dbo.tblstocktrans t
      WHERE t.fcoid    = $1
        AND t.fyear    = $2
        AND t.fbrid    = $3
        AND t.fdoctype = $4
        AND t.fdocno   = $5
        AND NOT EXISTS (
          SELECT 1
          FROM dbo.tblstockcontrol c
          WHERE c.fcoid   = t.fcoid
            AND c.fyear   = t.fyear::varchar
            AND c.fbrid   = t.fbrid
            AND c.fitemid = t.fitemid
        )
      LIMIT 1
      `,
      [p.PstrCoID, p.PstrYear, p.lkpBranch, DOC_TYPE, DOC_NO]
    );

    if ((missing.rowCount ?? 0) > 0) {
      throw new Error(
        `The stock of item '${missing.rows[0].fitemid}' was not updated, so nothing was posted. Please run the latest sp_pagebeginningstockpost.`
      );
    }

    const after = await fetchCursor<BeginningStockLine>(
      client,
      "GTL",
      p.PstrCoID,
      p.PstrYear,
      p.lkpBranch
    );

    await client.query("COMMIT");

    return { before, after, date: header[0]?.fdate ?? null };
  } catch (error: unknown) {
    await client.query("ROLLBACK");
    console.error("postBeginningStockService error:", error);
    throw error;
  } finally {
    client.release();
  }
}

/* =========================================================
   PRINT (the Print button): dbo.sp_pagebeginningstockprint - the port of the old
   SP_rptStDocPrint for doc type BG. Read only.

   The procedure takes the WHERE text like the old one did, so it is built HERE,
   never taken from the browser: the company comes from the request but the
   controller has already checked the branch exists and the user has a right to
   it; every value is quoted anyway.
========================================================= */

export type BeginningStockPrintLine = {
  fslno: number;
  fitemid: string;
  fitemname: string | null;
  funit: string | null;
  fqtyin: string;
  funitcost: string;
  ftotalcost: string;
  fbrname: string | null;
  fdocno: string | null;
};

export type BeginningStockPrint = {
  header: {
    fconame: string;
    fbrname: string;
    fdate: string | null;
    fdocno: string;
  };
  lines: BeginningStockPrintLine[];
};

export async function getBeginningStockPrintService(
  PstrCoID: string,
  lkpBranch: string
): Promise<BeginningStockPrint> {
  const quote = (value: string) => value.replace(/'/g, "''");

  const strFilter =
    `a.fcoid = '${quote(PstrCoID)}' and a.fbrid = '${quote(lkpBranch)}' ` +
    `and a.fdoctype = '${DOC_TYPE}'`;

  const cursorName =
    `cur_beginningstockprint_${Date.now()}_${Math.floor(Math.random() * 100000)}`;

  const client: PoolClient = await pool.connect();

  let lines: BeginningStockPrintLine[];

  try {
    await client.query("BEGIN");

    await client.query(
      `CALL dbo.sp_pagebeginningstockprint(
         p_strdoc        => $1::varchar,
         p_strfilter     => $2::text,
         p_result_cursor => $3::refcursor
       )`,
      [DOC_TYPE, strFilter, cursorName]
    );

    const result = await client.query(`FETCH ALL FROM "${cursorName}"`);

    await client.query("COMMIT");

    lines = result.rows as BeginningStockPrintLine[];
  } catch (error: unknown) {
    await client.query("ROLLBACK");
    console.error("getBeginningStockPrintService error:", error);
    throw error;
  } finally {
    client.release();
  }

  // the document date as yyyy-mm-dd text (the same header the page reads), and
  // the company name the old report took from the application
  const document = await getBeginningStockService(PstrCoID, 0, lkpBranch);

  const company = await pool.query(
    `SELECT fconame FROM dbo.tblcompany WHERE fcoid = $1`,
    [PstrCoID]
  );

  return {
    header: {
      fconame: String(company.rows[0]?.fconame ?? "").trim(),
      fbrname: String(lines[0]?.fbrname ?? ""),
      fdate: document.header?.fdate ?? null,
      fdocno: String(lines[0]?.fdocno ?? DOC_NO),
    },
    lines,
  };
}

/* =========================================================
   SHARED HELPERS - call dbo.sp_pagebeginningstock with named arguments
========================================================= */

async function fetchCursor<T>(
  client: PoolClient,
  strmode: "GHD" | "GTL",
  PstrCoID: string,
  PstrYear: number,
  lkpBranch: string
): Promise<T[]> {
  const cursorName =
    `cur_beginningstock_${Date.now()}_${Math.floor(Math.random() * 100000)}`;

  await callSpBeginningStock(client, {
    strmode,
    PstrCoID,
    PstrYear,
    lkpBranch,
    cursorName,
  });

  const result = await client.query(`FETCH ALL FROM "${cursorName}"`);

  return result.rows as T[];
}

async function callSpBeginningStock(
  client: PoolClient,
  p: {
    strmode: string;
    PstrCoID: string;
    PstrYear: number;
    lkpBranch: string;
    dtpDate?: string;
    txtNote?: string;
    intSlNo?: number;
    itemId?: string;
    unit?: string | null;
    qty?: number;
    unitCost?: number;
    totalCost?: number;
    originalSlNo?: number;
    PstrUserID?: string;
    savingTransNo?: string;
    cursorName?: string;
  }
): Promise<void> {
  await client.query(
    `
    CALL dbo.sp_pagebeginningstock(
      p_strmode        => $1::varchar,
      p_pstrcoid       => $2::varchar,
      p_pstryear       => $3::varchar,
      p_strbrid        => $4::varchar,
      p_strdoctype     => $5::varchar,
      p_strdocno       => $6::varchar,
      p_dtpdate        => $7::timestamp,
      p_blnpost        => false,
      p_strtransno     => NULL,
      p_intslno        => $8::smallint,
      p_stritemid      => $9::varchar,
      p_strunit        => $10::varchar,
      p_numqtyin       => $11::numeric,
      p_numunitcost    => $12::numeric,
      p_numtotalcost   => $13::numeric,
      p_original_fslno => $14::smallint,
      p_pstruserid     => $15::varchar,
      p_strnote        => $16::varchar,
      p_strsavingtransno => $17::varchar,
      p_result_cursor  => $18::refcursor
    )
    `,
    [
      p.strmode,
      p.PstrCoID,
      String(p.PstrYear),
      p.lkpBranch,
      DOC_TYPE,
      DOC_NO,
      p.dtpDate ?? null,
      p.intSlNo ?? 0,
      p.itemId ?? null,
      p.unit ?? null,
      p.qty ?? 0,
      p.unitCost ?? 0,
      p.totalCost ?? 0,
      p.originalSlNo ?? 0,
      p.PstrUserID ?? null,
      p.txtNote ?? null,
      p.savingTransNo ?? null,
      p.cursorName ??
        `cur_beginningstock_${Date.now()}_${Math.floor(Math.random() * 100000)}`,
    ]
  );
}
