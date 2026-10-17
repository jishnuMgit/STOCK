import type { PoolClient } from "pg";
import pool from "../../../DB/db.js";

/* =========================================================
   STOCK TRANSFER - calls dbo.sp_pagestocktransferpage
   (the port of the old SP_frmST).

   A transfer is stored twice in dbo.tblstocktrans, one set of rows for each
   branch: the OUT rows (doc type ST, in the From branch) and the IN rows (doc
   type STI, in the To branch, generated). The Entry No. is the same on both.
========================================================= */

const DOC_TYPE = "ST";
const DOC_TYPE_G = "STI";

/* =========================================================
   BRANCH LISTS
   From: only the branches the logged-in user has a right to, plus the user's
   default branch. To: every branch of the company (the old tblAllBranch).
========================================================= */

export async function getStockTransferBranchListService(
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

export async function getStockTransferDefaultBranchService(
  PstrCoID: string,
  PstrUserID: string
): Promise<string> {
  const result = await pool.query(
    `SELECT dbo.getuserdefbranch($1, $2) AS "defaultBranch"`,
    [PstrCoID, PstrUserID]
  );

  return String(result.rows[0]?.defaultBranch ?? "").trim();
}

export async function getStockTransferToBranchListService(
  PstrCoID: string
): Promise<{ fbrid: string; fbrname: string }[]> {
  const result = await pool.query(
    `
    SELECT fbrid, fbrname
    FROM dbo.tblbranch
    WHERE fcoid = $1
    ORDER BY fpositionno, fbrid
    `,
    [PstrCoID]
  );

  return result.rows;
}

/* =========================================================
   ITEM LIST of the From branch: the branch's items (tblitemtl) that are not
   blocked for it, with their unit and packing
========================================================= */

export type StockTransferItem = {
  fitemid: string;
  fitemname: string | null;
  funit: string | null;
  fpacking: string | null;
};

export async function getStockTransferItemListService(
  PstrCoID: string,
  lkpBranch: string
): Promise<StockTransferItem[]> {
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
   STOCK OF AN ITEM (the "Stock :" box, and the Out of Stock check)

   The old GetItemStock: everything that came in minus everything that went out
   of the branch, from ALL the stock lines of the item (every year, posted or
   not), leaving out THIS document's own OUT lines (doc type ST + Entry No.).
   The unit cost is the branch's current cost from the stock control row of the
   login year (0 when the item has none).
========================================================= */

export async function getStockTransferItemStockService(
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
    [PstrCoID, PstrYear, lkpBranch, lkpItemID]
  );

  return {
    stock: Number(stockResult.rows[0]?.stock ?? 0),
    unitCost: Number(costResult.rows[0]?.unitCost ?? 0),
  };
}

/* =========================================================
   THE NEXT ENTRY NO. (dbo.getnextdocno, from the ST row of tbldocumentno)
   The settings come back too: the prefix the Entry No. must start with, and
   whether the numbers are strictly serial / automatic.
========================================================= */

export type StockTransferNextDocNo = {
  txtDocNo: string;
  txtPrefix: string;
  chkStrictSerial: boolean;
  chkAutoIncrement: boolean;
};

export async function getStockTransferNextDocNoService(
  PstrCoID: string,
  PstrYear: number,
  lkpBranch: string
): Promise<StockTransferNextDocNo> {
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

export type StockTransferHeader = {
  fsttobrid: string | null;
  fdate: string | null;
  fnote: string | null;
  fpost: boolean;
  fsuserid: string | null;
  fsuserdate: string | null;
  fmuserid: string | null;
  fmuserdate: string | null;
};

export type StockTransferLine = {
  fslno: number;
  fitemid: string;
  funit: string | null;
  fqtyout: string;
  funitcost: string;
  ftotalcost: string;
};

export async function getStockTransferService(
  PstrCoID: string,
  PstrYear: number,
  lkpBranch: string,
  txtDocNo: string
): Promise<{ header: StockTransferHeader | null; lines: StockTransferLine[] }> {
  const client: PoolClient = await pool.connect();

  try {
    await client.query("BEGIN");

    const header = await fetchCursor<StockTransferHeader>(
      client,
      "GHD",
      PstrCoID,
      PstrYear,
      lkpBranch,
      txtDocNo
    );

    const lines = await fetchCursor<StockTransferLine>(
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
    console.error("getStockTransferService error:", error);
    throw error;
  } finally {
    client.release();
  }
}

/* =========================================================
   AUDIT NOTES
========================================================= */

export interface StockTransferAuditLine {
  slNo: number;
  item: string;
  qty: number;
  unitCost: number;
  totalCost: number;
}

export type StockTransferSaveResult = {
  mode: "S" | "M";
  // the Entry No. actually saved (a new one when it was taken meanwhile)
  txtDocNo: string;
  docNoChanged: boolean;
  lines: number;
  totalCost: number;
  addedLines: StockTransferAuditLine[];
  changedLines: { slNo: number; item: string; changes: string[] }[];
  removedLines: StockTransferAuditLine[];
  toBranchChange: { from: string; to: string } | null;
  dateChange: { from: string; to: string } | null;
  noteChange: { from: string; to: string } | null;
};

const num = (value: number) => String(Math.round(value * 10000) / 10000);
const showDate = (value: string) => value.split("-").reverse().join("/");

// the audit note of a Save / Modify: the header, then WHAT was added, changed
// and removed, line by line
export function buildStockTransferAuditNote(
  lkpBranch: string,
  lkpToBranch: string,
  dtpDate: string,
  result: StockTransferSaveResult
): string {
  const head =
    `Branch : ${lkpBranch} To : ${lkpToBranch} Entry No. : ${result.txtDocNo} Date : ${showDate(dtpDate)}` +
    `; Lines : ${result.lines}; Total Cost : ${result.totalCost.toFixed(4)}`;

  const parts: string[] = [];

  const lineText = (line: StockTransferAuditLine) =>
    `Sl.# ${line.slNo} '${line.item}' Qty ${num(line.qty)} x ${num(line.unitCost)} = ${num(line.totalCost)}`;

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

  if (result.toBranchChange) {
    headerChanges.push(`To Branch ${result.toBranchChange.from} -> ${result.toBranchChange.to}`);
  }

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

export function buildStockTransferDeleteAuditNote(
  lkpBranch: string,
  txtDocNo: string,
  lkpToBranch: string | null,
  dtpDate: string | null,
  lines: StockTransferLine[]
): string {
  const total = lines.reduce((sum, line) => sum + Number(line.ftotalcost), 0);

  const head =
    `DocType : ${DOC_TYPE} - DocNo : ${txtDocNo}; Branch : ${lkpBranch}` +
    (lkpToBranch ? ` To : ${lkpToBranch}` : "") +
    (dtpDate ? ` Date : ${showDate(dtpDate)}` : "") +
    `; Lines : ${lines.length}; Total Cost : ${total.toFixed(4)}`;

  const deleted = lines
    .map(
      (line) =>
        `Sl.# ${Number(line.fslno)} '${line.fitemid}' Qty ${num(Number(line.fqtyout))} x ${num(Number(line.funitcost))} = ${num(Number(line.ftotalcost))}`
    )
    .join("; ");

  const note = `${head}\nDeleted: ${deleted}`;

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

export interface StockTransferRowPayload {
  lkpItemID: string;
  txtQty: number | string;
  txtUnitCost: number | string;
  txtOriginalSlNo?: number | string | null;
}

export async function saveStockTransferService(p: {
  PstrCoID: string;
  PstrYear: number;
  lkpBranch: string;
  txtDocNo: string;
  lkpToBranch: string;
  dtpDate: string;
  txtNote: string;
  chkSaved: boolean;
  rows: StockTransferRowPayload[];
  PstrUserID: string;
}): Promise<StockTransferSaveResult> {
  const client: PoolClient = await pool.connect();

  try {
    await client.query("BEGIN");

    let txtDocNo = p.txtDocNo;
    let docNoChanged = false;

    let saved = await fetchCursor<StockTransferLine>(
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
          "Stock Transfer with the same 'Entry No.' is already saved from other workstation"
        );
      }

      const next = await client.query(
        `SELECT fdocno FROM dbo.getnextdocno($1::varchar, $2::varchar, $3::varchar, $4::varchar)`,
        [p.PstrCoID, String(p.PstrYear), p.lkpBranch, DOC_TYPE]
      );

      txtDocNo = String(next.rows[0].fdocno);
      docNoChanged = true;

      saved = await fetchCursor<StockTransferLine>(
        client,
        "GTL",
        p.PstrCoID,
        p.PstrYear,
        p.lkpBranch,
        txtDocNo
      );
    }

    const savedHeader = (
      await fetchCursor<StockTransferHeader>(
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

    const docAmt = lines.reduce((sum, line) => sum + line.totalCost, 0);

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
      lkpToBranch: p.lkpToBranch,
      dtpDate: p.dtpDate,
      txtNote: p.txtNote,
      docAmt,
      PstrUserID: p.PstrUserID,
    };

    // removed lines first
    for (const line of removed) {
      await callSpStockTransfer(client, {
        ...common,
        strmode: "D1",
        originalSlNo: Number(line.fslno),
      });
    }

    // changed lines, pass 1: out of the way (negative Sl.#), pass 2: the final Sl.#
    for (const line of kept) {
      await callSpStockTransfer(client, {
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
      await callSpStockTransfer(client, {
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
      await callSpStockTransfer(client, {
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

    // the header update last: To branch, date, note and the modified-by on both
    // sets of rows (the IN rows move to a changed To branch)
    if (mode === "M") {
      await callSpStockTransfer(client, { ...common, strmode: "M" });
    }

    await client.query("COMMIT");

    // what the save did, line by line, for the audit note
    const savedByNo = new Map(saved.map((line) => [Number(line.fslno), line]));

    const changedLines = kept
      .map((line) => {
        const before = savedByNo.get(line.originalSlNo as number) as StockTransferLine;
        const changes: string[] = [];

        if (before.fitemid !== line.item) {
          changes.push(`Item ${before.fitemid} -> ${line.item}`);
        }

        if (Number(before.fqtyout) !== line.qty) {
          changes.push(`Qty ${num(Number(before.fqtyout))} -> ${num(line.qty)}`);
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
      totalCost: docAmt,
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
        qty: Number(line.fqtyout),
        unitCost: Number(line.funitcost),
        totalCost: Number(line.ftotalcost),
      })),
      toBranchChange:
        mode === "M" && savedHeader?.fsttobrid && savedHeader.fsttobrid !== p.lkpToBranch
          ? { from: savedHeader.fsttobrid, to: p.lkpToBranch }
          : null,
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
    console.error("saveStockTransferService error:", error);
    throw error;
  } finally {
    client.release();
  }
}

/* =========================================================
   DELETE (the Delete button): the whole transfer, both sets of rows (mode D).
   The header and the lines are read first, for the audit note.
========================================================= */

export async function deleteStockTransferService(p: {
  PstrCoID: string;
  PstrYear: number;
  lkpBranch: string;
  txtDocNo: string;
  PstrUserID: string;
}): Promise<{
  header: StockTransferHeader | null;
  lines: StockTransferLine[];
}> {
  const client: PoolClient = await pool.connect();

  try {
    await client.query("BEGIN");

    const lines = await fetchCursor<StockTransferLine>(
      client,
      "GTL",
      p.PstrCoID,
      p.PstrYear,
      p.lkpBranch,
      p.txtDocNo
    );

    const header = await fetchCursor<StockTransferHeader>(
      client,
      "GHD",
      p.PstrCoID,
      p.PstrYear,
      p.lkpBranch,
      p.txtDocNo
    );

    await callSpStockTransfer(client, {
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
    console.error("deleteStockTransferService error:", error);
    throw error;
  } finally {
    client.release();
  }
}

/* =========================================================
   POST (the Post button): dbo.sp_pagestocktransferpost, mode P.
   One transaction: the From branch's stock goes down, the To branch's up (at the
   weighted-average cost), both sets of rows are marked posted - or nothing
   changes. The lines are read before and after, for the audit note (the post
   writes the cost onto them).
========================================================= */

export async function postStockTransferService(p: {
  PstrCoID: string;
  PstrYear: number;
  lkpBranch: string;
  txtDocNo: string;
  PstrUserID: string;
}): Promise<{
  header: StockTransferHeader | null;
  after: StockTransferLine[];
}> {
  const client: PoolClient = await pool.connect();

  try {
    await client.query("BEGIN");

    const header = await fetchCursor<StockTransferHeader>(
      client,
      "GHD",
      p.PstrCoID,
      p.PstrYear,
      p.lkpBranch,
      p.txtDocNo
    );

    await client.query(
      `
      CALL dbo.sp_pagestocktransferpost(
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

    const after = await fetchCursor<StockTransferLine>(
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
    console.error("postStockTransferService error:", error);
    throw error;
  } finally {
    client.release();
  }
}

// the audit note of a Post: the header, then each line as posted (the cost is
// the From branch's cost the post wrote onto it)
export function buildStockTransferPostAuditNote(
  lkpBranch: string,
  txtDocNo: string,
  lkpToBranch: string | null,
  dtpDate: string | null,
  lines: StockTransferLine[]
): string {
  const total = lines.reduce((sum, line) => sum + Number(line.ftotalcost), 0);

  const head =
    `Branch : ${lkpBranch}` +
    (lkpToBranch ? ` To : ${lkpToBranch}` : "") +
    ` Entry No. : ${txtDocNo}` +
    (dtpDate ? ` Date : ${showDate(dtpDate)}` : "") +
    `; Lines : ${lines.length}; Total Cost : ${total.toFixed(4)}`;

  const posted = lines
    .map(
      (line) =>
        `Sl.# ${Number(line.fslno)} '${line.fitemid}' Qty ${num(Number(line.fqtyout))} x ${num(Number(line.funitcost))} = ${num(Number(line.ftotalcost))}`
    )
    .join("; ");

  const note = `${head}\nPosted: ${posted}`;

  return note.length > 2000 ? `${note.slice(0, 1996)}...` : note;
}

/* =========================================================
   PRINT (the Print button): the saved document, read only.
   The old report read the OUT rows (doc type ST) with the item and branch
   names; the company name is read here, as the old report took it from the
   application.
========================================================= */

export type StockTransferPrintLine = {
  fslno: number;
  fitemid: string;
  fitemname: string | null;
  funit: string | null;
  fqtyout: string;
  funitcost: string;
  ftotalcost: string;
  // the branch names the procedure joins on every row
  fbrname?: string | null;
  ftobrname?: string | null;
};

export type StockTransferPrint = {
  header: {
    fconame: string;
    fbrname: string;
    ftobrname: string;
    fdocno: string;
    fdate: string | null;
    fnote: string | null;
  };
  lines: StockTransferPrintLine[];
};

export async function getStockTransferPrintService(
  PstrCoID: string,
  PstrYear: number,
  lkpBranch: string,
  txtDocNo: string
): Promise<StockTransferPrint> {
  const document = await getStockTransferService(
    PstrCoID,
    PstrYear,
    lkpBranch,
    txtDocNo
  );

  // The lines come from the TL's dbo.sp_pagestockprint (the old SP_rptStDocPrint),
  // which takes the WHERE text. The filter is built HERE, from values the
  // controller has already validated, each one quoted - never from the browser.
  // (The old report's filter: company, year, branch, doc type and Entry No.)
  const quote = (value: string) => value.replace(/'/g, "''");

  const strFilter =
    `a.fcoid = '${quote(PstrCoID)}' and a.fyear = '${Math.trunc(Number(PstrYear))}' ` +
    `and a.fbrid = '${quote(lkpBranch)}' and a.fdoctype = '${DOC_TYPE}' ` +
    `and a.fdocno = '${quote(txtDocNo)}'`;

  const cursorName =
    `cur_stocktransferprint_${Date.now()}_${Math.floor(Math.random() * 100000)}`;

  const client: PoolClient = await pool.connect();

  let lines: StockTransferPrintLine[];

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

    lines = result.rows as StockTransferPrintLine[];
  } catch (error: unknown) {
    await client.query("ROLLBACK");
    console.error("getStockTransferPrintService error:", error);
    throw error;
  } finally {
    client.release();
  }

  // the company name the old report took from the application
  const company = await pool.query(
    `SELECT fconame FROM dbo.tblcompany WHERE fcoid = $1`,
    [PstrCoID]
  );

  return {
    header: {
      fconame: String(company.rows[0]?.fconame ?? "").trim(),
      // d (the row's own branch = the From branch) and f (the To branch) of the procedure
      fbrname: String(lines[0]?.fbrname ?? ""),
      ftobrname: String(lines[0]?.ftobrname ?? ""),
      fdocno: txtDocNo,
      fdate: document.header?.fdate ?? null,
      fnote: document.header?.fnote ?? null,
    },
    lines,
  };
}

/* =========================================================
   SHARED HELPERS - call dbo.sp_pagestocktransferpage with named arguments
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
    `cur_stocktransfer_${Date.now()}_${Math.floor(Math.random() * 100000)}`;

  await callSpStockTransfer(client, {
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

async function callSpStockTransfer(
  client: PoolClient,
  p: {
    strmode: string;
    PstrCoID: string;
    PstrYear: number;
    lkpBranch: string;
    txtDocNo: string;
    lkpToBranch?: string;
    dtpDate?: string;
    txtNote?: string;
    docAmt?: number;
    intSlNo?: number;
    itemId?: string;
    unit?: string | null;
    qty?: number;
    unitCost?: number;
    totalCost?: number;
    originalSlNo?: number;
    PstrUserID?: string;
    cursorName?: string;
  }
): Promise<void> {
  await client.query(
    `
    CALL dbo.sp_pagestocktransferpage(
      p_strmode        => $1::varchar,
      p_pstrcoid       => $2::varchar,
      p_pstryear       => $3::varchar,
      p_strstbrid      => $4::varchar,
      p_strdoctype     => $5::varchar,
      p_strdoctypeg    => $6::varchar,
      p_strdocno       => $7::varchar,
      p_strtobrid      => $8::varchar,
      p_dtpdate        => $9::timestamp,
      p_numdocamt      => $10::numeric,
      p_intslno        => $11::smallint,
      p_stritemid      => $12::varchar,
      p_strunit        => $13::varchar,
      p_numqtyout      => $14::numeric,
      p_numunitcost    => $15::numeric,
      p_numtotalcost   => $16::numeric,
      p_original_fslno => $17::smallint,
      p_strnote        => $18::varchar,
      p_pstruserid     => $19::varchar,
      p_result_cursor  => $20::refcursor
    )
    `,
    [
      p.strmode,
      p.PstrCoID,
      String(p.PstrYear),
      p.lkpBranch,
      DOC_TYPE,
      DOC_TYPE_G,
      p.txtDocNo,
      p.lkpToBranch ?? null,
      p.dtpDate ?? null,
      p.docAmt ?? 0,
      p.intSlNo ?? 0,
      p.itemId ?? null,
      p.unit ?? null,
      p.qty ?? 0,
      p.unitCost ?? 0,
      p.totalCost ?? 0,
      p.originalSlNo ?? 0,
      p.txtNote ?? null,
      p.PstrUserID ?? null,
      p.cursorName ??
        `cur_stocktransfer_${Date.now()}_${Math.floor(Math.random() * 100000)}`,
    ]
  );
}
