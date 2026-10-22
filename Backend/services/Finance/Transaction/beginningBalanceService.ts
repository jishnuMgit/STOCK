import type { PoolClient } from "pg";
import pool from "../../../DB/db.js";
import { toAmount } from "../../../validators/BeginningBalanceValidator.js";

/* =========================================================
   FINANCE > TRANSACTION > BEGINNING BALANCE - calls dbo.sp_pagebeginningbalance
   (the port of the old SP_frmBeginningBal) and, for what the screen loads first,
   the same database functions the other screens use (the Branch box of Beginning
   Stock, the account and cost center boxes of Receipt).

   The balance is kept as ordinary entries of dbo.tblfintrans: document type BG,
   document no BG, one line for each account (and cost center).
========================================================= */

const DOC_TYPE = "BG";
const DOC_NO = "BG";

export type BeginningBalanceBranch = { fbrid: string; fbrname: string };

export type BeginningBalanceAccount = {
  faccountid: string;
  faccountname: string | null;
  fhavecc: boolean | null;
};

export type BeginningBalanceCostCenter = {
  fccid: string;
  fccname: string | null;
};

/* =========================================================
   BRANCHES the logged-in user has a right to (dbo.userbranches), in the
   position order of the Branch screen
========================================================= */

export async function getBeginningBalanceBranchListService(
  PstrCoID: string,
  PstrUserID: string
): Promise<BeginningBalanceBranch[]> {
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

export async function getBeginningBalanceDefaultBranchService(
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
   ACCOUNTS: the head accounts of the company - one list ordered by Account ID
   (dbo.filllookupaccountid) and one by Account Name (dbo.filllookupaccountname),
   the same rows. fhavecc says the account needs a cost center.
========================================================= */

export async function getBeginningBalanceAccountListService(
  PstrCoID: string
): Promise<{
  byId: BeginningBalanceAccount[];
  byName: BeginningBalanceAccount[];
}> {
  const byId = await pool.query(
    `SELECT faccountid, faccountname, fhavecc FROM dbo.filllookupaccountid($1::varchar)`,
    [PstrCoID]
  );

  const byName = await pool.query(
    `SELECT faccountid, faccountname, fhavecc FROM dbo.filllookupaccountname($1::varchar)`,
    [PstrCoID]
  );

  return { byId: byId.rows, byName: byName.rows };
}

/* =========================================================
   COST CENTERS of the company (dbo.fillcostcenters)
========================================================= */

export async function getBeginningBalanceCostCenterListService(
  PstrCoID: string
): Promise<BeginningBalanceCostCenter[]> {
  const result = await pool.query(
    `SELECT fccid, fccname FROM dbo.fillcostcenters($1::varchar)`,
    [PstrCoID]
  );

  return result.rows;
}

/* =========================================================
   THE BALANCE of a branch for the year: the header (mode GHD) and the lines
   (mode GTL)
========================================================= */

// the dates come back as text, so no time zone can move them
export type BeginningBalanceHeader = {
  fdate: string | null;
  fcuserid: string | null;
  fcuserdate: string | null;
  // the saved-on time with its fractions: given back to mode S when the balance is
  // modified, so the "saved on" of the balance does not move
  fcuserdateraw: string | null;
  fmuserid: string | null;
  fmuserdate: string | null;
  // a posted line (not a system-generated one) locks the balance
  fpost: boolean;
};

export type BeginningBalanceLine = {
  fslno: number;
  faccountid: string;
  fccid: string | null;
  fdebit: string;
  fcredit: string;
};

async function fetchCursor<T>(
  client: PoolClient,
  strmode: "GHD" | "GTL",
  PstrCoID: string,
  PstrYear: string,
  lkpBranch: string
): Promise<T[]> {
  const cursorName =
    `cur_bbal_${Date.now()}_${Math.floor(Math.random() * 100000)}`;

  await client.query(
    `
    CALL dbo.sp_pagebeginningbalance(
      p_strmode       => $1::varchar,
      p_pstrcoid      => $2::varchar,
      p_pstryear      => $3::varchar,
      p_strbrid       => $4::varchar,
      p_strdoctype    => $5::varchar,
      p_result_cursor => $6::refcursor
    )
    `,
    [strmode, PstrCoID, PstrYear, lkpBranch, DOC_TYPE, cursorName]
  );

  const result = await client.query(`FETCH ALL FROM "${cursorName}"`);

  return result.rows as T[];
}

export async function getBeginningBalanceService(
  PstrCoID: string,
  PstrYear: string,
  lkpBranch: string
): Promise<{
  header: BeginningBalanceHeader | null;
  lines: BeginningBalanceLine[];
  posted: boolean;
}> {
  const client: PoolClient = await pool.connect();

  try {
    await client.query("BEGIN");

    const header = await fetchCursor<BeginningBalanceHeader>(
      client, "GHD", PstrCoID, PstrYear, lkpBranch
    );

    const lines = await fetchCursor<BeginningBalanceLine>(
      client, "GTL", PstrCoID, PstrYear, lkpBranch
    );

    await client.query("COMMIT");

    return {
      header: header[0] ?? null,
      lines,
      posted: header[0]?.fpost === true,
    };
  } catch (error: unknown) {
    await client.query("ROLLBACK");
    console.error("getBeginningBalanceService error:", error);
    throw error;
  } finally {
    client.release();
  }
}

// one call of the procedure that changes data: S inserts a line, D deletes the
// whole balance
async function callSp(
  client: PoolClient,
  a: {
    strmode: "S" | "D";
    PstrCoID: string;
    PstrYear: string;
    lkpBranch: string;
    PstrUserID: string;
    slNo?: number;
    dtpDate?: string | null;
    lkpAccountID?: string | null;
    lkpCCID?: string | null;
    debit?: number;
    credit?: number;
    savedBy?: string | null;
    savedOn?: string | null;
  }
): Promise<void> {
  await client.query(
    `
    CALL dbo.sp_pagebeginningbalance(
      p_strmode       => $1::varchar,
      p_pstrcoid      => $2::varchar,
      p_pstryear      => $3::varchar,
      p_strbrid       => $4::varchar,
      p_strdoctype    => $5::varchar,
      p_strdocno      => $6::varchar,
      p_intslno       => $7::smallint,
      p_dtpdate       => $8::timestamp,
      p_straccountid  => $9::varchar,
      p_strccid       => $10::varchar,
      p_numdebit      => $11::numeric,
      p_numcredit     => $12::numeric,
      p_pstruserid    => $13::varchar,
      p_strcuserid    => $14::varchar,
      p_dtpcuserdate  => $15::timestamp
    )
    `,
    [
      a.strmode,
      a.PstrCoID,
      a.PstrYear,
      a.lkpBranch,
      DOC_TYPE,
      DOC_NO,
      a.slNo ?? 0,
      a.dtpDate ?? null,
      a.lkpAccountID ?? null,
      a.lkpCCID ?? null,
      a.debit ?? 0,
      a.credit ?? 0,
      a.PstrUserID,
      a.savedBy ?? null,
      a.savedOn ?? null,
    ]
  );
}

/* =========================================================
   SAVE / MODIFY (the old Apply): ONE transaction. The whole balance of the
   branch and year is deleted and every line of the grid is inserted again
   (so a removed line is simply not inserted). On a Modify the creator and the
   saved-on time of the balance are handed back in, so they do not change; the
   user and the time of the Modify go into the modified-by columns.
========================================================= */

export interface BeginningBalanceRowPayload {
  lkpAccountID: string;
  lkpCCID?: string | null;
  txtDebit?: string | number | null;
  txtCredit?: string | number | null;
  // the line's position in the grid (0 = first row)
  txtGridRow?: number;
}

// a line as the audit note shows it
type AuditLine = {
  account: string;
  costCenter: string;
  debit: number;
  credit: number;
};

export type BeginningBalanceSaveResult = {
  mode: "S" | "M";
  lines: number;
  totalDebit: number;
  totalCredit: number;
  // Modify only: what the date was before (yyyy-mm-dd)
  dateChange: { from: string; to: string } | null;
  addedLines: AuditLine[];
  changedLines: { account: string; costCenter: string; changes: string[] }[];
  removedLines: AuditLine[];
};

const keyOf = (account: string, costCenter: string) => `${account}|${costCenter}`;

const two = (value: number) => (Math.round(value * 100) / 100).toFixed(2);

// "1101001" or "60001 (cost center JD)"
const label = (line: { account: string; costCenter: string }) =>
  line.costCenter === ""
    ? `'${line.account}'`
    : `'${line.account}' (C.C. ${line.costCenter})`;

export async function saveBeginningBalanceService(p: {
  PstrCoID: string;
  PstrYear: string;
  lkpBranch: string;
  // yyyy-mm-dd
  dtpDate: string;
  rows: BeginningBalanceRowPayload[];
  PstrUserID: string;
}): Promise<BeginningBalanceSaveResult> {
  const client: PoolClient = await pool.connect();

  try {
    await client.query("BEGIN");

    // what the branch has now: the header (the creator) and the lines (for the
    // audit note)
    const header =
      (
        await fetchCursor<BeginningBalanceHeader>(
          client, "GHD", p.PstrCoID, p.PstrYear, p.lkpBranch
        )
      )[0] ?? null;

    const before = await fetchCursor<BeginningBalanceLine>(
      client, "GTL", p.PstrCoID, p.PstrYear, p.lkpBranch
    );

    // a cost center belongs only to an account that needs one
    const accountIds = [
      ...new Set(p.rows.map((row) => String(row.lkpAccountID).trim())),
    ];

    const flags = await client.query(
      `SELECT faccountid, fhavecc FROM dbo.tblaccount WHERE fcoid = $1 AND faccountid = ANY($2::varchar[])`,
      [p.PstrCoID, accountIds]
    );

    const needsCostCenter = new Map<string, boolean>(
      flags.rows.map((row) => [String(row.faccountid), row.fhavecc === true])
    );

    // the old ApplyD: take the whole balance away ...
    await callSp(client, {
      strmode: "D",
      PstrCoID: p.PstrCoID,
      PstrYear: p.PstrYear,
      lkpBranch: p.lkpBranch,
      PstrUserID: p.PstrUserID,
    });

    // ... and put every line in again
    const after: AuditLine[] = [];
    let slNo = 0;

    for (const row of p.rows) {
      slNo += 1;

      const account = String(row.lkpAccountID).trim();
      const costCenter = needsCostCenter.get(account)
        ? String(row.lkpCCID ?? "").trim()
        : "";
      const debit = Math.round(toAmount(row.txtDebit) * 100) / 100;
      const credit = Math.round(toAmount(row.txtCredit) * 100) / 100;

      await callSp(client, {
        strmode: "S",
        PstrCoID: p.PstrCoID,
        PstrYear: p.PstrYear,
        lkpBranch: p.lkpBranch,
        PstrUserID: p.PstrUserID,
        slNo,
        dtpDate: p.dtpDate,
        lkpAccountID: account,
        lkpCCID: costCenter,
        debit,
        credit,
        // a Modify hands the creator back in
        savedBy: header?.fcuserid ?? null,
        savedOn: header?.fcuserdateraw ?? null,
      });

      after.push({ account, costCenter, debit, credit });
    }

    await client.query("COMMIT");

    // what the save did, for the audit note
    const beforeLines: AuditLine[] = before.map((line) => ({
      account: line.faccountid,
      costCenter: String(line.fccid ?? "").trim(),
      debit: Number(line.fdebit),
      credit: Number(line.fcredit),
    }));

    const beforeByKey = new Map(
      beforeLines.map((line) => [keyOf(line.account, line.costCenter), line])
    );
    const afterByKey = new Map(
      after.map((line) => [keyOf(line.account, line.costCenter), line])
    );

    const changedLines: BeginningBalanceSaveResult["changedLines"] = [];

    for (const line of after) {
      const old = beforeByKey.get(keyOf(line.account, line.costCenter));

      if (!old) continue;

      const changes: string[] = [];

      if (old.debit !== line.debit) {
        changes.push(`Debit ${two(old.debit)} -> ${two(line.debit)}`);
      }

      if (old.credit !== line.credit) {
        changes.push(`Credit ${two(old.credit)} -> ${two(line.credit)}`);
      }

      if (changes.length > 0) {
        changedLines.push({
          account: line.account,
          costCenter: line.costCenter,
          changes,
        });
      }
    }

    const wasDate = header?.fdate ?? null;

    return {
      mode: before.length > 0 ? "M" : "S",
      lines: after.length,
      totalDebit: after.reduce((sum, line) => sum + line.debit, 0),
      totalCredit: after.reduce((sum, line) => sum + line.credit, 0),
      dateChange:
        before.length > 0 && wasDate && wasDate !== p.dtpDate
          ? { from: wasDate, to: p.dtpDate }
          : null,
      addedLines: after.filter(
        (line) => !beforeByKey.has(keyOf(line.account, line.costCenter))
      ),
      changedLines,
      removedLines: beforeLines.filter(
        (line) => !afterByKey.has(keyOf(line.account, line.costCenter))
      ),
    };
  } catch (error: unknown) {
    await client.query("ROLLBACK");
    console.error("saveBeginningBalanceService error:", error);
    throw error;
  } finally {
    client.release();
  }
}

// the audit note of a save: the branch, the date, the totals - and WHAT was
// added, changed and removed (each line with its account and amounts)
export function buildBeginningBalanceAuditNote(
  lkpBranch: string,
  dtpDate: string,
  result: BeginningBalanceSaveResult
): string {
  const showDate = (value: string) => value.split("-").reverse().join("/");
  const entry = (line: AuditLine) =>
    `${label(line)} Debit ${two(line.debit)} Credit ${two(line.credit)}`;

  const parts: string[] = [
    `Branch : ${lkpBranch} Date : ${showDate(dtpDate)}; Lines : ${result.lines}; Total Debit : ${two(result.totalDebit)}; Total Credit : ${two(result.totalCredit)}`,
  ];

  if (result.dateChange) {
    parts.push(
      `Date changed: ${showDate(result.dateChange.from)} -> ${showDate(result.dateChange.to)}`
    );
  }

  if (result.addedLines.length > 0) {
    parts.push(`Added: ${result.addedLines.map(entry).join("; ")}`);
  }

  if (result.changedLines.length > 0) {
    parts.push(
      `Changed: ${result.changedLines
        .map((line) => `${label(line)} (${line.changes.join("; ")})`)
        .join("; ")}`
    );
  }

  if (result.removedLines.length > 0) {
    parts.push(`Removed: ${result.removedLines.map(entry).join("; ")}`);
  }

  const note = parts.join("\n");

  // tbluseraudit.fnote is varchar(2000)
  return note.length > 2000 ? `${note.slice(0, 1996)}...` : note;
}

/* =========================================================
   DELETE (the old ApplyD): the whole balance of the branch and year, in one
   transaction. The lines are read first, for the audit note.
========================================================= */

export async function deleteBeginningBalanceService(p: {
  PstrCoID: string;
  PstrYear: string;
  lkpBranch: string;
  PstrUserID: string;
}): Promise<{ lines: BeginningBalanceLine[]; date: string | null }> {
  const client: PoolClient = await pool.connect();

  try {
    await client.query("BEGIN");

    const header = await fetchCursor<BeginningBalanceHeader>(
      client, "GHD", p.PstrCoID, p.PstrYear, p.lkpBranch
    );

    const lines = await fetchCursor<BeginningBalanceLine>(
      client, "GTL", p.PstrCoID, p.PstrYear, p.lkpBranch
    );

    await callSp(client, {
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
    console.error("deleteBeginningBalanceService error:", error);
    throw error;
  } finally {
    client.release();
  }
}

// the audit note of a Delete: the branch, the date, the totals - and WHAT went
export function buildBeginningBalanceDeleteAuditNote(
  lkpBranch: string,
  dtpDate: string | null,
  lines: BeginningBalanceLine[]
): string {
  const showDate = (value: string) => value.split("-").reverse().join("/");

  const totalDebit = lines.reduce((sum, line) => sum + Number(line.fdebit), 0);
  const totalCredit = lines.reduce((sum, line) => sum + Number(line.fcredit), 0);

  const head =
    `Branch : ${lkpBranch}` +
    (dtpDate ? ` Date : ${showDate(dtpDate)}` : "") +
    `; Lines : ${lines.length}; Total Debit : ${two(totalDebit)}; Total Credit : ${two(totalCredit)}`;

  const deleted = lines
    .map((line) =>
      `${label({ account: line.faccountid, costCenter: String(line.fccid ?? "").trim() })} Debit ${two(Number(line.fdebit))} Credit ${two(Number(line.fcredit))}`
    )
    .join("; ");

  const note = `${head}\nDeleted: ${deleted}`;

  // tbluseraudit.fnote is varchar(2000)
  return note.length > 2000 ? `${note.slice(0, 1996)}...` : note;
}

/* =========================================================
   POST (the Post button): dbo.sp_pagebeginningbalancepost - the port of the old
   SP_frmFinDocPost, Beginning Balance branch. One transaction: the unposted lines
   of the branch and year (tblfintrans and tblarap) are marked posted. The lines
   are read first, for the audit note. Posting locks the balance.
========================================================= */

export async function postBeginningBalanceService(p: {
  PstrCoID: string;
  PstrYear: string;
  lkpBranch: string;
  PstrUserID: string;
}): Promise<{
  lines: BeginningBalanceLine[];
  date: string | null;
  // the documents posted by this call (the old @@intDocPostCount)
  count: number;
}> {
  const client: PoolClient = await pool.connect();

  try {
    await client.query("BEGIN");

    const header = await fetchCursor<BeginningBalanceHeader>(
      client, "GHD", p.PstrCoID, p.PstrYear, p.lkpBranch
    );

    const lines = await fetchCursor<BeginningBalanceLine>(
      client, "GTL", p.PstrCoID, p.PstrYear, p.lkpBranch
    );

    const result = await client.query(
      `
      CALL dbo.sp_pagebeginningbalancepost(
        p_pstrcoid        => $1::varchar,
        p_pstryear        => $2::varchar,
        p_strbrid         => $3::varchar,
        p_strdoctype      => $4::varchar,
        p_pstruserid      => $5::varchar,
        p_intdocpostcount => 0
      )
      `,
      [p.PstrCoID, p.PstrYear, p.lkpBranch, DOC_TYPE, p.PstrUserID]
    );

    await client.query("COMMIT");

    return {
      lines,
      date: header[0]?.fdate ?? null,
      count: Number(result.rows[0]?.p_intdocpostcount ?? 0),
    };
  } catch (error: unknown) {
    await client.query("ROLLBACK");
    console.error("postBeginningBalanceService error:", error);
    throw error;
  } finally {
    client.release();
  }
}

// the audit note of a Post: the branch, the date, the totals - and each line as posted
export function buildBeginningBalancePostAuditNote(
  lkpBranch: string,
  dtpDate: string | null,
  lines: BeginningBalanceLine[]
): string {
  const showDate = (value: string) => value.split("-").reverse().join("/");

  const totalDebit = lines.reduce((sum, line) => sum + Number(line.fdebit), 0);
  const totalCredit = lines.reduce((sum, line) => sum + Number(line.fcredit), 0);

  const head =
    `Branch : ${lkpBranch}` +
    (dtpDate ? ` Date : ${showDate(dtpDate)}` : "") +
    `; Lines : ${lines.length}; Total Debit : ${two(totalDebit)}; Total Credit : ${two(totalCredit)}`;

  const posted = lines
    .map((line) =>
      `${label({ account: line.faccountid, costCenter: String(line.fccid ?? "").trim() })} Debit ${two(Number(line.fdebit))} Credit ${two(Number(line.fcredit))}`
    )
    .join("; ");

  const note = `${head}\nPosted: ${posted}`;

  // tbluseraudit.fnote is varchar(2000)
  return note.length > 2000 ? `${note.slice(0, 1996)}...` : note;
}

/* =========================================================
   PRINT (the Print button): dbo.sp_rptyearclosebal - the port of the old
   SP_rptYearCloseBal that the report rptYearCloseBalRpt reads. Called as the old
   form calls it: one branch, document type BG, the year of the date, account
   level 4, no groups - so the rows are the accounts, with their debit or credit.
   The company and branch names come from their tables (the old report took the
   company name from the application).
========================================================= */

export type BeginningBalancePrintLine = {
  faccountid: string;
  faccountname: string | null;
  faccountlevel: number | null;
  fccid: string | null;
  fdebit: string;
  fcredit: string;
};

export async function getBeginningBalancePrintService(
  PstrCoID: string,
  lkpBranch: string,
  year: number
): Promise<{
  header: { fconame: string; fbrname: string };
  lines: BeginningBalancePrintLine[];
}> {
  const cursorName =
    `cur_bbalprint_${Date.now()}_${Math.floor(Math.random() * 100000)}`;

  const client: PoolClient = await pool.connect();

  let lines: BeginningBalancePrintLine[];

  try {
    await client.query("BEGIN");

    await client.query(
      `
      CALL dbo.sp_rptyearclosebal(
        p_gstrcoid        => $1::varchar,
        p_rdgbranch       => 0::smallint,
        p_strbrid         => $2::varchar,
        p_strdoctype      => $3::varchar,
        p_intyear         => $4::smallint,
        p_intaccountlevel => 4::smallint,
        p_blnprintacgroup => false,
        p_result_cursor   => $5::refcursor
      )
      `,
      [PstrCoID, lkpBranch, DOC_TYPE, year, cursorName]
    );

    const result = await client.query(`FETCH ALL FROM "${cursorName}"`);

    await client.query("COMMIT");

    lines = result.rows as BeginningBalancePrintLine[];
  } catch (error: unknown) {
    await client.query("ROLLBACK");
    console.error("getBeginningBalancePrintService error:", error);
    throw error;
  } finally {
    client.release();
  }

  const company = await pool.query(
    `SELECT fconame FROM dbo.tblcompany WHERE fcoid = $1`,
    [PstrCoID]
  );

  const branch = await pool.query(
    `SELECT fbrname FROM dbo.tblbranch WHERE fcoid = $1 AND fbrid = $2`,
    [PstrCoID, lkpBranch]
  );

  return {
    header: {
      fconame: String(company.rows[0]?.fconame ?? "").trim(),
      fbrname: String(branch.rows[0]?.fbrname ?? "").trim(),
    },
    lines,
  };
}
