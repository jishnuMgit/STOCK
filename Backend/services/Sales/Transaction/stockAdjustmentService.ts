import type { PoolClient } from "pg";
import pool from "../../../DB/db.js";

/* =========================================================
   STOCK ADJUSTMENT - calls dbo.sp_pagestockadjustment and
   dbo.sp_pagestockadjustmentpost (the ports of the old SP_frmADJ and
   SP_ADJPost).

   An adjustment is stored once in dbo.tblstocktrans (doc type ADJ, in the
   branch): one row per line, with Qty. In (stock goes up) or Qty. Out (stock
   goes down). The total cost of a line is (Qty. In - Qty. Out) x unit cost.
========================================================= */

const DOC_TYPE = "ADJ";

/* =========================================================
   BRANCH LIST: only the branches the logged-in user has a right to, plus the
   user's default branch
========================================================= */

export async function getStockAdjustmentBranchListService(
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

export async function getStockAdjustmentDefaultBranchService(
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
   ITEM LIST of the branch: its items (tblitemtl) that are not blocked for it,
   with their unit and packing
========================================================= */

export type StockAdjustmentItem = {
  fitemid: string;
  fitemname: string | null;
  funit: string | null;
  fpacking: string | null;
};

export async function getStockAdjustmentItemListService(
  PstrCoID: string,
  lkpBranch: string
): Promise<StockAdjustmentItem[]> {
  const result = await pool.query(
    `
    SELECT fitemid, fitemname, funit, fpacking
    FROM dbo.fillbranchitems($1::varchar, $2::varchar)
    `,
    [PstrCoID, lkpBranch]
  );

  return result.rows;
}

/* =========================================================
   STOCK OF AN ITEM (the Out of Stock warning) and its unit cost

   The old GetItemStock: everything that came in minus everything that went out
   of the branch, from ALL the stock lines of the item (every year, posted or
   not), leaving out THIS document's own lines (doc type ADJ + Entry No.).
   The unit cost is the branch's current cost from the stock control row of the
   login year (0 when the item has none).
========================================================= */

export async function getStockAdjustmentItemStockService(
  PstrCoID: string,
  PstrYear: number,
  lkpBranch: string,
  lkpItemID: string,
  txtDocNo: string
): Promise<{ stock: number; unitCost: number }> {
  const stockResult = await pool.query(
    `
    SELECT COALESCE(SUM(COALESCE(fqtyin, 0)), 0)
         - COALESCE(SUM(COALESCE(fqtyout, 0)), 0) AS "stock"
    FROM dbo.tblstocktrans
    WHERE fcoid   = $1
      AND fbrid   = $2
      AND fitemid = $3
      AND NOT (fdoctype = $4 AND fdocno = $5)
    `,
    [PstrCoID, lkpBranch, lkpItemID, DOC_TYPE, txtDocNo]
  );

  const costResult = await pool.query(
    `
    SELECT COALESCE(funitcost, 0) AS "unitCost"
    FROM dbo.tblstockcontrol
    WHERE fcoid   = $1
      AND fyear   = $2
      AND fbrid   = $3
      AND fitemid = $4
    `,
    [PstrCoID, String(PstrYear), lkpBranch, lkpItemID]
  );

  return {
    stock: Number(stockResult.rows[0]?.stock ?? 0),
    unitCost: Number(costResult.rows[0]?.unitCost ?? 0),
  };
}

/* =========================================================
   THE NEXT ENTRY NO. (dbo.getnextdocno, from the ADJ row of tbldocumentno)
   The settings come back too: the prefix the Entry No. must start with, and
   whether the numbers are strictly serial / automatic.
========================================================= */

export type StockAdjustmentNextDocNo = {
  txtDocNo: string;
  txtPrefix: string;
  chkStrictSerial: boolean;
  chkAutoIncrement: boolean;
};

export async function getStockAdjustmentNextDocNoService(
  PstrCoID: string,
  PstrYear: number,
  lkpBranch: string
): Promise<StockAdjustmentNextDocNo> {
  const setting = await pool.query(
    `
    SELECT fdocnoprefix, fstrictserialseqno, fseqnoincrementmode
    FROM dbo.tbldocumentno
    WHERE fcoid    = $1
      AND fyear    = $2
      AND fbrid    = $3
      AND fdoctype = $4
    LIMIT 1
    `,
    [PstrCoID, String(PstrYear), lkpBranch, DOC_TYPE]
  );

  const next = await pool.query(
    `SELECT fdocno FROM dbo.getnextdocno($1::varchar, $2::varchar, $3::varchar, $4::varchar)`,
    [PstrCoID, String(PstrYear), lkpBranch, DOC_TYPE]
  );

  return {
    txtDocNo: String(next.rows[0]?.fdocno ?? ""),
    txtPrefix: String(setting.rows[0]?.fdocnoprefix ?? ""),
    chkStrictSerial: Boolean(setting.rows[0]?.fstrictserialseqno),
    chkAutoIncrement: String(setting.rows[0]?.fseqnoincrementmode ?? "") === "Auto",
  };
}

/* =========================================================
   THE SAVED DOCUMENT (modes GHD + GTL)
========================================================= */

export type StockAdjustmentHeader = {
  fdate: string | null;
  fnote: string | null;
  fpost: boolean;
  fsuserid: string | null;
  fsuserdate: string | null;
  fmuserid: string | null;
  fmuserdate: string | null;
};

export type StockAdjustmentLine = {
  fslno: number;
  fitemid: string;
  funit: string | null;
  fqtyin: string;
  fqtyout: string;
  funitcost: string;
  ftotalcost: string;
};

export async function getStockAdjustmentService(
  PstrCoID: string,
  PstrYear: number,
  lkpBranch: string,
  txtDocNo: string
): Promise<{ header: StockAdjustmentHeader | null; lines: StockAdjustmentLine[] }> {
  const client: PoolClient = await pool.connect();

  try {
    await client.query("BEGIN");

    const header = await fetchCursor<StockAdjustmentHeader>(
      client,
      "GHD",
      PstrCoID,
      PstrYear,
      lkpBranch,
      txtDocNo
    );

    const lines = await fetchCursor<StockAdjustmentLine>(
      client,
      "GTL",
      PstrCoID,
      PstrYear,
      lkpBranch,
      txtDocNo
    );

    await client.query("COMMIT");

    return { header: header[0] ?? null, lines };
  } catch (error: unknown) {
    await client.query("ROLLBACK");
    console.error("getStockAdjustmentService error:", error);
    throw error;
  } finally {
    client.release();
  }
}

/* =========================================================
   THE SEARCH LIST (the Search button): the saved adjustments of the branch in
   the login year, newest first, with their date, note and total cost
========================================================= */

export type StockAdjustmentFindRow = {
  fdocno: string;
  fdate: string | null;
  fnote: string | null;
  ftotalcost: string;
  fpost: boolean;
};

export async function getStockAdjustmentFindListService(
  PstrCoID: string,
  PstrYear: number,
  lkpBranch: string
): Promise<StockAdjustmentFindRow[]> {
  const result = await pool.query(
    `
    SELECT fdocno,
           to_char(MIN(fdate), 'YYYY-MM-DD')        AS fdate,
           MAX(fnote)                               AS fnote,
           COALESCE(SUM(ftotalcost), 0)             AS ftotalcost,
           COALESCE(bool_and(COALESCE(fpost, false)), false) AS fpost
    FROM dbo.tblstocktrans
    WHERE fcoid    = $1
      AND fyear    = $2
      AND fbrid    = $3
      AND fdoctype = $4
    GROUP BY fdocno
    ORDER BY MIN(fdate) DESC, fdocno DESC
    LIMIT 500
    `,
    [PstrCoID, String(PstrYear), lkpBranch, DOC_TYPE]
  );

  return result.rows;
}

/* =========================================================
   AUDIT NOTES
========================================================= */

export interface StockAdjustmentAuditLine {
  slNo: number;
  item: string;
  qtyIn: number;
  qtyOut: number;
  unitCost: number;
  totalCost: number;
}

export type StockAdjustmentSaveResult = {
  mode: "S" | "M";
  // the Entry No. actually saved (a new one when it was taken meanwhile)
  txtDocNo: string;
  docNoChanged: boolean;
  lines: number;
  totalCost: number;
  addedLines: StockAdjustmentAuditLine[];
  changedLines: { slNo: number; item: string; changes: string[] }[];
  removedLines: StockAdjustmentAuditLine[];
  dateChange: { from: string; to: string } | null;
  noteChange: { from: string; to: string } | null;
};

const num = (value: number) => String(Math.round(value * 10000) / 10000);
const showDate = (value: string) => value.split("-").reverse().join("/");

const lineText = (line: StockAdjustmentAuditLine) =>
  `Sl.# ${line.slNo} '${line.item}' ${
    line.qtyIn > 0 ? `In ${num(line.qtyIn)}` : `Out ${num(line.qtyOut)}`
  } x ${num(line.unitCost)} = ${num(line.totalCost)}`;

// the audit note of a Save / Modify: the header, then WHAT was added, changed
// and removed, line by line
export function buildStockAdjustmentAuditNote(
  lkpBranch: string,
  dtpDate: string,
  result: StockAdjustmentSaveResult
): string {
  const head =
    `Branch : ${lkpBranch} Entry No. : ${result.txtDocNo} Date : ${showDate(dtpDate)}` +
    `; Lines : ${result.lines}; Total Cost : ${result.totalCost.toFixed(4)}`;

  const parts: string[] = [];

  if (result.addedLines.length > 0) {
    parts.push(`Added: ${result.addedLines.map(lineText).join("; ")}`);
  }

  if (result.changedLines.length > 0) {
    parts.push(
      `Changed: ${result.changedLines
        .map((line) => `Sl.# ${line.slNo} '${line.item}' (${line.changes.join("; ")})`)
        .join("; ")}`
    );
  }

  if (result.removedLines.length > 0) {
    parts.push(`Removed: ${result.removedLines.map(lineText).join("; ")}`);
  }

  const headerChanges: string[] = [];

  if (result.dateChange) {
    headerChanges.push(
      `Date ${showDate(result.dateChange.from)} -> ${showDate(result.dateChange.to)}`
    );
  }

  if (result.noteChange) {
    headerChanges.push(
      `Note '${result.noteChange.from}' -> '${result.noteChange.to}'`
    );
  }

  if (headerChanges.length > 0) {
    parts.push(`Header: ${headerChanges.join("; ")}`);
  }

  const note = [head, ...parts].join("\n");

  // tbluseraudit.fnote is varchar(2000)
  return note.length > 2000 ? `${note.slice(0, 1996)}...` : note;
}

const savedLineText = (line: StockAdjustmentLine) =>
  lineText({
    slNo: Number(line.fslno),
    item: line.fitemid,
    qtyIn: Number(line.fqtyin),
    qtyOut: Number(line.fqtyout),
    unitCost: Number(line.funitcost),
    totalCost: Number(line.ftotalcost),
  });

export function buildStockAdjustmentDeleteAuditNote(
  lkpBranch: string,
  txtDocNo: string,
  dtpDate: string | null,
  lines: StockAdjustmentLine[]
): string {
  const total = lines.reduce((sum, line) => sum + Number(line.ftotalcost), 0);

  const head =
    `DocType : ${DOC_TYPE} - DocNo : ${txtDocNo}; Branch : ${lkpBranch}` +
    (dtpDate ? ` Date : ${showDate(dtpDate)}` : "") +
    `; Lines : ${lines.length}; Total Cost : ${total.toFixed(4)}`;

  const note = `${head}\nDeleted: ${lines.map(savedLineText).join("; ")}`;

  return note.length > 2000 ? `${note.slice(0, 1996)}...` : note;
}

// the audit note of a Post: the header, then each line as posted (the cost is
// the branch's cost the post wrote onto it)
export function buildStockAdjustmentPostAuditNote(
  lkpBranch: string,
  txtDocNo: string,
  dtpDate: string | null,
  lines: StockAdjustmentLine[]
): string {
  const total = lines.reduce((sum, line) => sum + Number(line.ftotalcost), 0);

  const head =
    `Branch : ${lkpBranch} Entry No. : ${txtDocNo}` +
    (dtpDate ? ` Date : ${showDate(dtpDate)}` : "") +
    `; Lines : ${lines.length}; Total Cost : ${total.toFixed(4)}`;

  const note = `${head}\nPosted: ${lines.map(savedLineText).join("; ")}`;

  return note.length > 2000 ? `${note.slice(0, 1996)}...` : note;
}

/* =========================================================
   SAVE (the Save / Modify button), one transaction

   A new Entry No.: every line is inserted (mode S). An Entry No. that already
   has a document (Modify): removed lines are deleted (D1), kept lines updated
   (M1, in two passes so renumbering can't clash with a Sl.# still in use), new
   lines inserted (S), and the header last (M).

   When the page thinks the Entry No. is new (chkSaved false) but it was saved
   meanwhile from another workstation, an automatic numbering gets the next free
   Entry No. (txtDocNo in the result says so); otherwise it is refused.
========================================================= */

export interface StockAdjustmentRowPayload {
  lkpItemID: string;
  txtQtyIn: number | string;
  txtQtyOut: number | string;
  txtUnitCost: number | string;
  txtOriginalSlNo?: number | string | null;
}

export async function saveStockAdjustmentService(p: {
  PstrCoID: string;
  PstrYear: number;
  lkpBranch: string;
  txtDocNo: string;
  dtpDate: string;
  txtNote: string;
  chkSaved: boolean;
  rows: StockAdjustmentRowPayload[];
  PstrUserID: string;
}): Promise<StockAdjustmentSaveResult> {
  const client: PoolClient = await pool.connect();

  try {
    await client.query("BEGIN");

    let txtDocNo = p.txtDocNo;
    let docNoChanged = false;

    let saved = await fetchCursor<StockAdjustmentLine>(
      client,
      "GTL",
      p.PstrCoID,
      p.PstrYear,
      p.lkpBranch,
      txtDocNo
    );

    // a new document whose Entry No. has been taken meanwhile
    if (!p.chkSaved && saved.length > 0) {
      const setting = await client.query(
        `
        SELECT fseqnoincrementmode
        FROM dbo.tbldocumentno
        WHERE fcoid = $1 AND fyear = $2 AND fbrid = $3 AND fdoctype = $4
        LIMIT 1
        `,
        [p.PstrCoID, String(p.PstrYear), p.lkpBranch, DOC_TYPE]
      );

      if (String(setting.rows[0]?.fseqnoincrementmode ?? "") !== "Auto") {
        throw new Error(
          "Stock Adjustment with the same 'Entry No.' is already saved from other workstation"
        );
      }

      const next = await client.query(
        `SELECT fdocno FROM dbo.getnextdocno($1::varchar, $2::varchar, $3::varchar, $4::varchar)`,
        [p.PstrCoID, String(p.PstrYear), p.lkpBranch, DOC_TYPE]
      );

      txtDocNo = String(next.rows[0].fdocno);
      docNoChanged = true;

      saved = await fetchCursor<StockAdjustmentLine>(
        client,
        "GTL",
        p.PstrCoID,
        p.PstrYear,
        p.lkpBranch,
        txtDocNo
      );
    }

    const savedHeader = (
      await fetchCursor<StockAdjustmentHeader>(
        client,
        "GHD",
        p.PstrCoID,
        p.PstrYear,
        p.lkpBranch,
        txtDocNo
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
    // quantities and the unit cost: (In - Out) x cost, 4 decimals as the column
    const lines = p.rows.map((row, index) => {
      const qtyIn = Number(row.txtQtyIn) || 0;
      const qtyOut = Number(row.txtQtyOut) || 0;
      const unitCost = Number(row.txtUnitCost) || 0;

      return {
        slNo: index + 1,
        item: row.lkpItemID,
        unit: unitOf.get(row.lkpItemID) ?? null,
        qtyIn,
        qtyOut,
        unitCost,
        totalCost: Math.round((qtyIn - qtyOut) * unitCost * 10000) / 10000,
        originalSlNo:
          row.txtOriginalSlNo === null ||
          row.txtOriginalSlNo === undefined ||
          row.txtOriginalSlNo === ""
            ? null
            : Number(row.txtOriginalSlNo),
      };
    });

    const totalCost = lines.reduce((sum, line) => sum + line.totalCost, 0);

    const savedSlNos = new Set(saved.map((line) => Number(line.fslno)));
    const mode: "S" | "M" = saved.length > 0 ? "M" : "S";

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
      txtDocNo,
      dtpDate: p.dtpDate,
      txtNote: p.txtNote,
      PstrUserID: p.PstrUserID,
    };

    // removed lines first
    for (const line of removed) {
      await callSpStockAdjustment(client, {
        ...common,
        strmode: "D1",
        originalSlNo: Number(line.fslno),
      });
    }

    // changed lines, pass 1: out of the way (negative Sl.#), pass 2: the final Sl.#
    for (const line of kept) {
      await callSpStockAdjustment(client, {
        ...common,
        strmode: "M1",
        intSlNo: -line.slNo,
        itemId: line.item,
        unit: line.unit,
        qtyIn: line.qtyIn,
        qtyOut: line.qtyOut,
        unitCost: line.unitCost,
        totalCost: line.totalCost,
        originalSlNo: line.originalSlNo as number,
      });
    }

    for (const line of kept) {
      await callSpStockAdjustment(client, {
        ...common,
        strmode: "M1",
        intSlNo: line.slNo,
        itemId: line.item,
        unit: line.unit,
        qtyIn: line.qtyIn,
        qtyOut: line.qtyOut,
        unitCost: line.unitCost,
        totalCost: line.totalCost,
        originalSlNo: -line.slNo,
      });
    }

    // new lines
    for (const line of added) {
      await callSpStockAdjustment(client, {
        ...common,
        strmode: "S",
        intSlNo: line.slNo,
        itemId: line.item,
        unit: line.unit,
        qtyIn: line.qtyIn,
        qtyOut: line.qtyOut,
        unitCost: line.unitCost,
        totalCost: line.totalCost,
      });
    }

    // the header update last: date, note and the modified-by on every line
    if (mode === "M") {
      await callSpStockAdjustment(client, { ...common, strmode: "M" });
    }

    await client.query("COMMIT");

    // what the save did, line by line, for the audit note
    const savedByNo = new Map(saved.map((line) => [Number(line.fslno), line]));

    const changedLines = kept
      .map((line) => {
        const before = savedByNo.get(line.originalSlNo as number) as StockAdjustmentLine;
        const changes: string[] = [];

        if (before.fitemid !== line.item) {
          changes.push(`Item ${before.fitemid} -> ${line.item}`);
        }

        if (Number(before.fqtyin) !== line.qtyIn) {
          changes.push(`Qty In ${num(Number(before.fqtyin))} -> ${num(line.qtyIn)}`);
        }

        if (Number(before.fqtyout) !== line.qtyOut) {
          changes.push(`Qty Out ${num(Number(before.fqtyout))} -> ${num(line.qtyOut)}`);
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
      txtDocNo,
      docNoChanged,
      lines: lines.length,
      totalCost,
      addedLines: added.map((line) => ({
        slNo: line.slNo,
        item: line.item,
        qtyIn: line.qtyIn,
        qtyOut: line.qtyOut,
        unitCost: line.unitCost,
        totalCost: line.totalCost,
      })),
      changedLines,
      removedLines: removed.map((line) => ({
        slNo: Number(line.fslno),
        item: line.fitemid,
        qtyIn: Number(line.fqtyin),
        qtyOut: Number(line.fqtyout),
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
    };
  } catch (error: unknown) {
    await client.query("ROLLBACK");
    console.error("saveStockAdjustmentService error:", error);
    throw error;
  } finally {
    client.release();
  }
}

/* =========================================================
   DELETE (the Delete button): the whole document and its finance rows
   (mode D). The header and the lines are read first, for the audit note.
========================================================= */

export async function deleteStockAdjustmentService(p: {
  PstrCoID: string;
  PstrYear: number;
  lkpBranch: string;
  txtDocNo: string;
  PstrUserID: string;
}): Promise<{
  header: StockAdjustmentHeader | null;
  lines: StockAdjustmentLine[];
}> {
  const client: PoolClient = await pool.connect();

  try {
    await client.query("BEGIN");

    const lines = await fetchCursor<StockAdjustmentLine>(
      client,
      "GTL",
      p.PstrCoID,
      p.PstrYear,
      p.lkpBranch,
      p.txtDocNo
    );

    const header = await fetchCursor<StockAdjustmentHeader>(
      client,
      "GHD",
      p.PstrCoID,
      p.PstrYear,
      p.lkpBranch,
      p.txtDocNo
    );

    await callSpStockAdjustment(client, {
      strmode: "D",
      PstrCoID: p.PstrCoID,
      PstrYear: p.PstrYear,
      lkpBranch: p.lkpBranch,
      txtDocNo: p.txtDocNo,
      PstrUserID: p.PstrUserID,
    });

    await client.query("COMMIT");

    return { header: header[0] ?? null, lines };
  } catch (error: unknown) {
    await client.query("ROLLBACK");
    console.error("deleteStockAdjustmentService error:", error);
    throw error;
  } finally {
    client.release();
  }
}

/* =========================================================
   POST (the Post button): dbo.sp_pagestockadjustmentpost, mode P.
   One transaction: the branch's stock moves by Qty. In - Qty. Out, the two
   finance lines are written and the lines are marked posted - or nothing
   changes. The lines are read before and after, for the audit note (the post
   writes the cost onto them).
========================================================= */

export async function postStockAdjustmentService(p: {
  PstrCoID: string;
  PstrYear: number;
  lkpBranch: string;
  txtDocNo: string;
  PstrUserID: string;
}): Promise<{
  header: StockAdjustmentHeader | null;
  after: StockAdjustmentLine[];
}> {
  const client: PoolClient = await pool.connect();

  try {
    await client.query("BEGIN");

    const header = await fetchCursor<StockAdjustmentHeader>(
      client,
      "GHD",
      p.PstrCoID,
      p.PstrYear,
      p.lkpBranch,
      p.txtDocNo
    );

    await client.query(
      `
      CALL dbo.sp_pagestockadjustmentpost(
        p_strmode    => $1::varchar,
        p_pstrcoid   => $2::varchar,
        p_pstryear   => $3::varchar,
        p_strbrid    => $4::varchar,
        p_strdoctype => $5::varchar,
        p_strdocno   => $6::varchar,
        p_pstruserid => $7::varchar
      )
      `,
      ["P", p.PstrCoID, String(p.PstrYear), p.lkpBranch, DOC_TYPE, p.txtDocNo, p.PstrUserID]
    );

    const after = await fetchCursor<StockAdjustmentLine>(
      client,
      "GTL",
      p.PstrCoID,
      p.PstrYear,
      p.lkpBranch,
      p.txtDocNo
    );

    await client.query("COMMIT");

    return { header: header[0] ?? null, after };
  } catch (error: unknown) {
    await client.query("ROLLBACK");
    console.error("postStockAdjustmentService error:", error);
    throw error;
  } finally {
    client.release();
  }
}

/* =========================================================
   PRINT (the Print button): the saved document, read only.
   The lines come from dbo.sp_pagestockprint (the old SP_rptStDocPrint) for doc
   type ADJ, with the item and branch names; the company name is read here, as
   the old report took it from the application.
========================================================= */

export type StockAdjustmentPrintLine = {
  fslno: number;
  fitemid: string;
  fitemname: string | null;
  funit: string | null;
  fqtyin: string;
  fqtyout: string;
  funitcost: string;
  ftotalcost: string;
  // the branch name the procedure joins on every row
  fbrname?: string | null;
};

export type StockAdjustmentPrint = {
  header: {
    fconame: string;
    fbrname: string;
    fdocno: string;
    fdate: string | null;
    fnote: string | null;
  };
  lines: StockAdjustmentPrintLine[];
};

export async function getStockAdjustmentPrintService(
  PstrCoID: string,
  PstrYear: number,
  lkpBranch: string,
  txtDocNo: string
): Promise<StockAdjustmentPrint> {
  const document = await getStockAdjustmentService(
    PstrCoID,
    PstrYear,
    lkpBranch,
    txtDocNo
  );

  // The filter is built HERE, from values the controller has already validated,
  // each one quoted - never from the browser (the procedure joins it as text).
  const quote = (value: string) => value.replace(/'/g, "''");

  const strFilter =
    `a.fcoid = '${quote(PstrCoID)}' and a.fyear = '${Math.trunc(Number(PstrYear))}' ` +
    `and a.fbrid = '${quote(lkpBranch)}' and a.fdoctype = '${DOC_TYPE}' ` +
    `and a.fdocno = '${quote(txtDocNo)}'`;

  const cursorName =
    `cur_stockadjustmentprint_${Date.now()}_${Math.floor(Math.random() * 100000)}`;

  const client: PoolClient = await pool.connect();

  let lines: StockAdjustmentPrintLine[];

  try {
    await client.query("BEGIN");

    await client.query(
      `CALL dbo.sp_pagestockprint(
         p_strdoc        => $1::varchar,
         p_strfilter     => $2::text,
         p_result_cursor => $3::refcursor
       )`,
      [DOC_TYPE, strFilter, cursorName]
    );

    const result = await client.query(`FETCH ALL FROM "${cursorName}"`);

    await client.query("COMMIT");

    lines = result.rows as StockAdjustmentPrintLine[];
  } catch (error: unknown) {
    await client.query("ROLLBACK");
    console.error("getStockAdjustmentPrintService error:", error);
    throw error;
  } finally {
    client.release();
  }

  const company = await pool.query(
    `SELECT fconame FROM dbo.tblcompany WHERE fcoid = $1`,
    [PstrCoID]
  );

  return {
    header: {
      fconame: String(company.rows[0]?.fconame ?? "").trim(),
      fbrname: String(lines[0]?.fbrname ?? ""),
      fdocno: txtDocNo,
      fdate: document.header?.fdate ?? null,
      fnote: document.header?.fnote ?? null,
    },
    lines,
  };
}

/* =========================================================
   SHARED HELPERS - call dbo.sp_pagestockadjustment with named arguments
========================================================= */

async function fetchCursor<T>(
  client: PoolClient,
  strmode: "GHD" | "GTL",
  PstrCoID: string,
  PstrYear: number,
  lkpBranch: string,
  txtDocNo: string
): Promise<T[]> {
  const cursorName =
    `cur_stockadjustment_${Date.now()}_${Math.floor(Math.random() * 100000)}`;

  await callSpStockAdjustment(client, {
    strmode,
    PstrCoID,
    PstrYear,
    lkpBranch,
    txtDocNo,
    cursorName,
  });

  const result = await client.query(`FETCH ALL FROM "${cursorName}"`);

  return result.rows as T[];
}

async function callSpStockAdjustment(
  client: PoolClient,
  p: {
    strmode: string;
    PstrCoID: string;
    PstrYear: number;
    lkpBranch: string;
    txtDocNo: string;
    dtpDate?: string;
    txtNote?: string;
    intSlNo?: number;
    itemId?: string;
    unit?: string | null;
    qtyIn?: number;
    qtyOut?: number;
    unitCost?: number;
    totalCost?: number;
    originalSlNo?: number;
    PstrUserID?: string;
    cursorName?: string;
  }
): Promise<void> {
  await client.query(
    `
    CALL dbo.sp_pagestockadjustment(
      p_strmode        => $1::varchar,
      p_pstrcoid       => $2::varchar,
      p_pstryear       => $3::varchar,
      p_strbrid        => $4::varchar,
      p_strdoctype     => $5::varchar,
      p_strdocno       => $6::varchar,
      p_dtpdate        => $7::timestamp,
      p_strnote        => $8::varchar,
      p_intslno        => $9::smallint,
      p_stritemid      => $10::varchar,
      p_strunit        => $11::varchar,
      p_numqtyout      => $12::numeric,
      p_numqtyin       => $13::numeric,
      p_numunitcost    => $14::numeric,
      p_numtotalcost   => $15::numeric,
      p_original_fslno => $16::smallint,
      p_pstruserid     => $17::varchar,
      p_result_cursor  => $18::refcursor
    )
    `,
    [
      p.strmode,
      p.PstrCoID,
      String(p.PstrYear),
      p.lkpBranch,
      DOC_TYPE,
      p.txtDocNo,
      p.dtpDate ?? null,
      p.txtNote ?? null,
      p.intSlNo ?? 0,
      p.itemId ?? null,
      p.unit ?? null,
      p.qtyOut ?? 0,
      p.qtyIn ?? 0,
      p.unitCost ?? 0,
      p.totalCost ?? 0,
      p.originalSlNo ?? 0,
      p.PstrUserID ?? null,
      p.cursorName ??
        `cur_stockadjustment_${Date.now()}_${Math.floor(Math.random() * 100000)}`,
    ]
  );
}
