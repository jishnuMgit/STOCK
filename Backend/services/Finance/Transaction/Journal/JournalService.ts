import type { PoolClient } from "pg";
import pool from "../../../../DB/db.js";

import type { ReceiptContext } from "../../../../middleware/receiptContext.js";

/* =========================================================
   TYPES  (can be moved to ../types/types.ts)
========================================================= */

type DbValue = unknown;
type DbRow = Record<string, any>;

export interface JournalRow {
    txtslNo?: number | string;
    lkpAccountID?: string | null;
    lkpCCID?: string | null;
    txtDebit?: number | string | null;
    txtCredit?: number | string | null;
    txtDescription?: string | null;
}

export interface JournalData {
    lkpBranch: string;
    txtDocNo: string;
    dtpDate: string;
    strNote?: string | null;
    rows?: JournalRow[];
}

export interface JournalKey {
    lkpBranch: string;
    txtDocNo: string;
}

interface ServiceResult {
    message: string;
    data?: DbRow;
}

interface JournalProcedureParams {
    strMode: "S" | "D";
    pstrCoID: string;
    pstrYear: string | number;
    lkpBranch: string;
    strDocType: string;
    txtDocNo: string;
    txtSlNo?: number;
    intDocNo?: number;
    dtpDate?: string | null;
    txtNote?: string | null;
    lkpAccountID?: string | null;
    lkpCCID?: string | null;
    txtDescription?: string | null;
    numDebit?: number;
    numCredit?: number;
    pstrUserID: string;
    strCreatedUserID?: string | null;
    strCreatedUserDate?: string | null;
}

/* Business errors -> HTTP 400 in the controller */
export class JournalError extends Error {
    status: number;

    constructor(message: string, status = 400) {
        super(message);
        this.name = "JournalError";
        this.status = status;
    }
}

/* journal doc type used by the API (receipt uses BR / CR) */
export const JOURNAL_DOC_TYPE = "JV";

/* =========================================================
   HELPERS
========================================================= */

function isEmpty(value: DbValue): boolean {
    return value === null || value === undefined || String(value).trim() === "";
}

function toNumber(value: DbValue): number {
    if (isEmpty(value)) {
        return 0;
    }

    const number = Number(value);

    return Number.isFinite(number) ? number : 0;
}

function round2(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
}

/* SP expects DD/MM/YYYY */
function normalizeDate(value: DbValue): string | null {
    if (isEmpty(value)) {
        return null;
    }

    const dateString = String(value).trim();

    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        const [year, month, day] = dateString.split("-");

        return `${day}/${month}/${year}`;
    }

    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) {
        return dateString;
    }

    if (/^\d{4}-\d{2}-\d{2}T/.test(dateString)) {
        const [year, month, day] = dateString.substring(0, 10).split("-");

        return `${day}/${month}/${year}`;
    }

    return dateString;
}

/* VB: txtDocNo.Text.Remove(0, intPrefixLen) -> numeric part (trailing digits) */
function getIntDocNo(txtDocNo: string): number {
    const match = String(txtDocNo).trim().match(/(\d+)$/);

    return match ? Number(match[1]) : 0;
}

/* =========================================================
   PROCEDURE CALL : dbo.sp_pagejv
   (modes S and D only - header / lines are read with plain SELECTs
    because the procedure has no refcursor / OUT parameter)
========================================================= */

async function callJournalProcedure(
    client: PoolClient,
    {
        strMode,
        pstrCoID,
        pstrYear,
        lkpBranch,
        strDocType,
        txtDocNo,
        txtSlNo = 0,
        intDocNo = 0,
        dtpDate = null,
        txtNote = null,
        lkpAccountID = null,
        lkpCCID = null,
        txtDescription = null,
        numDebit = 0,
        numCredit = 0,
        pstrUserID,
        strCreatedUserID = null,
        strCreatedUserDate = null,
    }: JournalProcedureParams,
): Promise<void> {
    if (!pstrCoID || !pstrYear) {
        throw new JournalError("Company ID and financial year are required");
    }

    const sql = `
    CALL dbo.sp_pagejv(
      $1::varchar,
      $2::varchar,
      $3::smallint,
      $4::varchar,
      $5::varchar,
      $6::varchar,
      $7::smallint,
      $8::integer,
      $9::varchar,
      $10::varchar,
      $11::varchar,
      $12::varchar,
      $13::varchar,
      $14::numeric,
      $15::numeric,
      $16::varchar,
      $17::varchar,
      $18::varchar
    )
  `;

    await client.query(sql, [
        strMode, // $1
        pstrCoID, // $2
        pstrYear, // $3
        lkpBranch, // $4
        strDocType, // $5
        txtDocNo, // $6
        txtSlNo, // $7
        intDocNo, // $8
        dtpDate, // $9
        txtNote, // $10
        lkpAccountID, // $11
        lkpCCID, // $12
        txtDescription, // $13
        numDebit, // $14
        numCredit, // $15
        pstrUserID, // $16
        strCreatedUserID, // $17
        strCreatedUserDate, // $18
    ]);
}

/* =========================================================
   READ HELPERS (same filters as the SP)
========================================================= */

async function fetchHeader(
    client: PoolClient,
    { pstrCoID, pstrYear }: ReceiptContext,
    { lkpBranch, txtDocNo }: JournalKey,
): Promise<DbRow | null> {
    const result = await client.query(
        `SELECT DISTINCT
        to_char(fdate, 'YYYY-MM-DD') AS fdate, fnote, fpost,
        fcuserid, fcuserdate,
        fmuserid, fmuserdate
       FROM dbo.tblfintrans
      WHERE fcoid = $1
        AND fyear = $2
        AND fbrid = $3
        AND fdoctype = $4
        AND fdocno = $5`,
        [pstrCoID, Number(pstrYear), lkpBranch, JOURNAL_DOC_TYPE, txtDocNo],
    );

    return result.rows[0] ?? null;
}

async function fetchLines(
    client: PoolClient,
    { pstrCoID, pstrYear }: ReceiptContext,
    { lkpBranch, txtDocNo }: JournalKey,
): Promise<DbRow[]> {
    const result = await client.query(
        `SELECT fslno, faccountid, fccid, fdebit, fcredit, fdescription
       FROM dbo.tblfintrans
      WHERE fcoid = $1
        AND fyear = $2
        AND fbrid = $3
        AND fdoctype = $4
        AND fdocno = $5
      ORDER BY fslno`,
        [pstrCoID, Number(pstrYear), lkpBranch, JOURNAL_DOC_TYPE, txtDocNo],
    );

    return result.rows;
}

/* =========================================================
   VALIDATION (VB ValidateMe + ValidateGrid)
========================================================= */

function validateJournal(data: JournalData): {
    validRows: JournalRow[];
    totalDebit: number;
    totalCredit: number;
} {
    const { lkpBranch, txtDocNo, dtpDate, rows = [] } = data;

    if (isEmpty(lkpBranch)) {
        throw new JournalError("Branch is required");
    }

    if (isEmpty(txtDocNo)) {
        throw new JournalError("Journal number is required");
    }

    if (isEmpty(dtpDate)) {
        throw new JournalError("Journal date is required");
    }

    if (!Array.isArray(rows)) {
        throw new JournalError("Journal rows are invalid");
    }

    const validRows = rows.filter((row) => row && !isEmpty(row.lkpAccountID));

    if (validRows.length === 0) {
        throw new JournalError("There is no information for saving.");
    }

    let totalDebit = 0;
    let totalCredit = 0;

    validRows.forEach((row, index) => {
        const debit = toNumber(row.txtDebit);
        const credit = toNumber(row.txtCredit);
        const slNo = Number(row.txtslNo) || index + 1;

        if (debit < 0 || credit < 0) {
            throw new JournalError(`Sl.# : ${slNo} - Amount cannot be negative`);
        }

        if (debit !== 0 && credit !== 0) {
            throw new JournalError(
                `Sl.# : ${slNo} - Please input either 'Debit' or 'Credit'`,
            );
        }

        totalDebit += debit;
        totalCredit += credit;
    });

    totalDebit = round2(totalDebit);
    totalCredit = round2(totalCredit);

    if (totalDebit !== totalCredit) {
        throw new JournalError("'Total Credit' must be equal to 'Total Debit'");
    }

    return { validRows, totalDebit, totalCredit };
}

/* =========================================================
   INSERT ALL LINES (VB Apply loop, mode S)
========================================================= */

async function insertLines(
    client: PoolClient,
    { pstrCoID, pstrYear, pstrUserID }: ReceiptContext,
    data: JournalData,
    validRows: JournalRow[],
    created: { userID: string | null; userDate: string | null },
): Promise<void> {
    const { lkpBranch, txtDocNo, dtpDate, strNote } = data;

    const intDocNo = getIntDocNo(txtDocNo);

    for (let index = 0; index < validRows.length; index++) {
        const row = validRows[index];

        await callJournalProcedure(client, {
            strMode: "S",

            pstrCoID,

            pstrYear,

            lkpBranch,

            strDocType: JOURNAL_DOC_TYPE,

            txtDocNo,

            txtSlNo: Number(row.txtslNo) || index + 1,

            intDocNo,

            dtpDate: normalizeDate(dtpDate),

            txtNote: strNote || "",

            lkpAccountID: row.lkpAccountID,

            lkpCCID: row.lkpCCID || "",

            txtDescription: row.txtDescription || "",

            numDebit: toNumber(row.txtDebit),

            numCredit: toNumber(row.txtCredit),

            pstrUserID,

            strCreatedUserID: created.userID,

            strCreatedUserDate: created.userDate,
        });
    }
}

/* =========================================================
   JOURNAL TYPES
   Journal has a single doc type: JV.
========================================================= */

export function getJournalTypesService(): { fpid: string; fpname: string }[] {
    return [{ fpid: JOURNAL_DOC_TYPE, fpname: "Journal" }];
}

/* =========================================================
   GET JOURNAL (header + lines)
========================================================= */

export async function getJournalService(
    key: JournalKey,
    ctx: ReceiptContext,
): Promise<{ header: DbRow | null; lines: DbRow[] }> {
    const client = await pool.connect();

    try {
        if (isEmpty(key.lkpBranch)) {
            throw new JournalError("Branch is required");
        }

        if (isEmpty(key.txtDocNo)) {
            throw new JournalError("Document number is required");
        }

        const header = await fetchHeader(client, ctx, key);

        const lines = header ? await fetchLines(client, ctx, key) : [];

        return { header, lines };
    } catch (error: unknown) {
        console.error("getJournalService error:", error);

        throw error;
    } finally {
        client.release();
    }
}

/* =========================================================
   SAVE JOURNAL
========================================================= */

export async function saveJournalService(
    journal: JournalData,
    ctx: ReceiptContext,
): Promise<ServiceResult> {
    const client = await pool.connect();

    const { pstrCoID, pstrYear } = ctx;

    try {
        const { validRows, totalDebit, totalCredit } = validateJournal(journal);

        await client.query("BEGIN");

        const existing = await fetchHeader(client, ctx, journal);

        if (existing) {
            throw new JournalError(
                "Journal Voucher with the same Journal No. is already saved",
            );
        }

        await insertLines(client, ctx, journal, validRows, {
            userID: null,
            userDate: null,
        });

        await client.query("COMMIT");

        return {
            message: "Saved",

            data: {
                pstrCoID,

                pstrYear,

                lkpBranch: journal.lkpBranch,

                strDocType: JOURNAL_DOC_TYPE,

                txtDocNo: journal.txtDocNo,

                totalDebit,

                totalCredit,

                rowCount: validRows.length,
            },
        };
    } catch (error: unknown) {
        try {
            await client.query("ROLLBACK");
        } catch (rollbackError: unknown) {
            console.error("Journal save rollback error:", rollbackError);
        }

        console.error("saveJournalService error:", error);

        throw error;
    } finally {
        client.release();
    }
}

/* =========================================================
   UPDATE JOURNAL  (VB: ApplyD then S for every line)
========================================================= */

export async function updateJournalService(
    journal: JournalData,
    ctx: ReceiptContext,
): Promise<ServiceResult> {
    const client = await pool.connect();

    const { pstrCoID, pstrYear, pstrUserID } = ctx;

    try {
        const { validRows, totalDebit, totalCredit } = validateJournal(journal);

        await client.query("BEGIN");

        const existing = await fetchHeader(client, ctx, journal);

        if (!existing) {
            throw new JournalError("Journal Voucher not found", 404);
        }

        if (Number(existing.fpost) === 1 || existing.fpost === true) {
            throw new JournalError("Posted document cannot be modified");
        }

        /* keep the original "created by" so the SP stamps fmuserid / fmuserdate */
        const createdUserID = existing.fcuserid ?? pstrUserID;

        const createdUserDate = existing.fcuserdate
            ? new Date(existing.fcuserdate).toISOString()
            : new Date().toISOString();

        await callJournalProcedure(client, {
            strMode: "D",

            pstrCoID,

            pstrYear,

            lkpBranch: journal.lkpBranch,

            strDocType: JOURNAL_DOC_TYPE,

            txtDocNo: journal.txtDocNo,

            pstrUserID,
        });

        await insertLines(client, ctx, journal, validRows, {
            userID: createdUserID,
            userDate: createdUserDate,
        });

        await client.query("COMMIT");

        return {
            message: "Modified",

            data: {
                pstrCoID,

                pstrYear,

                lkpBranch: journal.lkpBranch,

                strDocType: JOURNAL_DOC_TYPE,

                txtDocNo: journal.txtDocNo,

                totalDebit,

                totalCredit,

                rowCount: validRows.length,
            },
        };
    } catch (error: unknown) {
        try {
            await client.query("ROLLBACK");
        } catch (rollbackError: unknown) {
            console.error("Journal update rollback error:", rollbackError);
        }

        console.error("updateJournalService error:", error);

        throw error;
    } finally {
        client.release();
    }
}

/* =========================================================
   DELETE JOURNAL
========================================================= */

export async function deleteJournalService(
    key: JournalKey,
    ctx: ReceiptContext,
): Promise<ServiceResult> {
    const client = await pool.connect();

    const { pstrCoID, pstrYear, pstrUserID } = ctx;

    try {
        if (isEmpty(key.lkpBranch)) {
            throw new JournalError("Branch is required");
        }

        if (isEmpty(key.txtDocNo)) {
            throw new JournalError("Document number is required");
        }

        await client.query("BEGIN");

        const existing = await fetchHeader(client, ctx, key);

        if (!existing) {
            throw new JournalError("Journal Voucher not found", 404);
        }

        if (Number(existing.fpost) === 1 || existing.fpost === true) {
            throw new JournalError("Posted document cannot be deleted");
        }

        await callJournalProcedure(client, {
            strMode: "D",

            pstrCoID,

            pstrYear,

            lkpBranch: key.lkpBranch,

            strDocType: JOURNAL_DOC_TYPE,

            txtDocNo: key.txtDocNo,

            pstrUserID,
        });

        await client.query("COMMIT");

        return {
            message: "Journal deleted successfully",

            data: {
                pstrCoID,

                pstrYear,

                lkpBranch: key.lkpBranch,

                strDocType: JOURNAL_DOC_TYPE,

                txtDocNo: key.txtDocNo,
            },
        };
    } catch (error: unknown) {
        try {
            await client.query("ROLLBACK");
        } catch (rollbackError: unknown) {
            console.error("Journal delete rollback error:", rollbackError);
        }

        console.error("deleteJournalService error:", error);

        throw error;
    } finally {
        client.release();
    }
}