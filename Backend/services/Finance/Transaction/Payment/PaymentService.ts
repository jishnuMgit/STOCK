import type { PoolClient } from "pg";
import pool from "../../../../DB/db.js";

import type { ReceiptContext } from "../../../../middleware/receiptContext.js";
import { GetPaymentDocType } from "../../../../utils/PaymentDocType.js";

import type {
    ReceiptProcedureParams,
    ReceiptData,
    ReceiptRow,
    ReceiptDocumentParams,
} from "../../../../types/types.js";

/* =========================================================
   TYPES  (payment uses the same payload shape as receipt)
========================================================= */

type DbValue = unknown;
type DbRow = Record<string, any>;

interface ServiceResult {
    message: string;
    data?: DbRow;
}

type LineInput = Omit<
    ReceiptProcedureParams,
    "strMode" | "pstrCoID" | "pstrYear" | "PstrUserID"
>;

/* =========================================================
   HELPERS
========================================================= */

function isEmpty(value: DbValue): boolean {
    return value === null || value === undefined || String(value).trim() === "";
}

function clean(value: DbValue): string | null {
    return isEmpty(value) ? null : String(value).trim();
}

function toNumber(value: DbValue): number {
    if (isEmpty(value)) return 0;

    const number = Number(value);

    return Number.isFinite(number) ? number : 0;
}

function toBoolean(value: DbValue): boolean {
    return (
        value === true ||
        value === 1 ||
        value === "1" ||
        value === "true" ||
        value === "TRUE"
    );
}

/*
   PAYMENT (reverse of receipt):
   if txtDebitCredit > 0
      numDebit = txtDebitCredit, numCredit = 0
   else
      numDebit = 0, numCredit = Abs(txtDebitCredit)
*/
function AssignPaymentDebitCredit(value: DbValue): {
    numDebit: number;
    numCredit: number;
} {
    const txtDebitCredit = toNumber(value);

    if (txtDebitCredit > 0) {
        return { numDebit: txtDebitCredit, numCredit: 0 };
    }

    return { numDebit: 0, numCredit: Math.abs(txtDebitCredit) };
}

/*
   Control row = opposite side of the total:
     total > 0 -> credit = total
     total <= 0 -> debit = |total|
*/
function AssignControlDebitCredit(total: number): {
    numDebit: number;
    numCredit: number;
} {
    if (total > 0) {
        return { numDebit: 0, numCredit: total };
    }

    return { numDebit: Math.abs(total), numCredit: 0 };
}

/* fdebitcredit of the control row = opposite of the total signed amount */
function oppositeOf(total: number): number {
    return total === 0 ? 0 : -total;
}

function normalizeDate(value: DbValue): string | null {
    if (isEmpty(value)) return null;

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

/* =========================================================
   PROCEDURE CALL

  dbo.sp_pagespayment_det(
      1   p_strmode            11  p_strref              21  p_blnmatch
      2   p_pstrcoid           12  p_straccountid        22  p_pstruserid
      3   p_pstryear           13  p_strgcs              23  p_struserdate
      4   p_strbrid            14  p_strdivid            24  p_strdetails
      5   p_strdoctype         15  p_strccid             25  p_result_cursor
      6   p_strdocno           16  p_numdebit
      7   p_intslno            17  p_numcredit
      8   p_dtpdate            18  p_numdebitcredit
      9   p_strcbaccountid     19  p_strdescription
      10  p_strreceivedfrompaidto  20  p_strnote
  )
========================================================= */

async function callPaymentProcedure(
    client: PoolClient,
    {
        strMode,
        pstrCoID,
        pstrYear,
        lkpBranch,
        strDocType,
        txtDocNo,
        txtSlNo = 0,
        dtpDate = null,
        lkpCBAccountName = null,
        txtReceivedFrom = null,
        txtReference = null,
        lkpAccountID = null,
        strGCS = null,
        lkpDivID = null,
        lkpCCID = null,
        numDebit = 0,
        numCredit = 0,
        numDebitCredit = null,
        txtDescription = null,
        txtNote = null,
        chkMatch = false,
        PstrUserID,
        strUserDate = null,
        details = null,
    }: ReceiptProcedureParams,
): Promise<any[]> {
    if (!pstrCoID || !pstrYear) {
        throw new Error("Company ID and financial year are required");
    }

    const cursorName = `cur_payment_${Date.now()}_${Math.floor(
        Math.random() * 100000,
    )}`;

    const jsonDetails =
        details !== null && details !== undefined ? JSON.stringify(details) : null;

    const values = [
        strMode, // $1
        pstrCoID, // $2
        pstrYear, // $3
        lkpBranch, // $4
        strDocType, // $5
        txtDocNo, // $6
        txtSlNo, // $7
        dtpDate, // $8
        lkpCBAccountName, // $9
        txtReceivedFrom, // $10
        txtReference, // $11
        lkpAccountID, // $12
        strGCS, // $13
        lkpDivID, // $14
        lkpCCID, // $15
        numDebit, // $16
        numCredit, // $17
        numDebitCredit, // $18
        txtDescription, // $19
        txtNote, // $20
        chkMatch, // $21
        PstrUserID, // $22
        strUserDate, // $23
        jsonDetails, // $24
        cursorName, // $25
    ];

    const sql = `
    CALL dbo.sp_pagespayment_det(
      $1::varchar,  $2::varchar,  $3::varchar,  $4::varchar,
      $5::varchar,  $6::varchar,  $7::smallint, $8::varchar,
      $9::varchar,  $10::varchar, $11::varchar, $12::varchar,
      $13::varchar, $14::varchar, $15::varchar, $16::numeric,
      $17::numeric, $18::numeric, $19::varchar, $20::varchar,
      $21::boolean, $22::varchar, $23::varchar, $24::jsonb,
      $25::refcursor
    )
  `;

    await client.query(sql, values);

    if (["GETHD", "GETTL"].includes(String(strMode).toUpperCase())) {
        const result = await client.query(`FETCH ALL FROM "${cursorName}"`);

        return result.rows;
    }

    return [];
}

/* =========================================================
   SAVE ONE PAYMENT LINE
========================================================= */

async function savePaymentLine(
    client: PoolClient,
    { pstrCoID, pstrYear, pstrUserID }: ReceiptContext,
    line: LineInput,
): Promise<any[]> {
    return callPaymentProcedure(client, {
        ...line,
        strMode: "S",
        pstrCoID,
        pstrYear,
        PstrUserID: pstrUserID,
        details: null,
    });
}

/* =========================================================
   SAVE GENERATED (CONTROL) ENTRY
========================================================= */

async function saveGeneratedEntry(
    client: PoolClient,
    { pstrCoID, pstrYear, pstrUserID }: ReceiptContext,
    entry: LineInput,
): Promise<any[]> {
    return callPaymentProcedure(client, {
        ...entry,
        strMode: "SC",
        pstrCoID,
        pstrYear,
        txtSlNo: 0,
        lkpAccountID: entry.lkpCBAccountName,
        PstrUserID: pstrUserID,
        details: null,
    });
}

/* =========================================================
   DELETE INTERNAL
========================================================= */

async function deletePaymentInternal(
    client: PoolClient,
    { pstrCoID, pstrYear, pstrUserID }: ReceiptContext,
    {
        lkpBranch,
        strDocType,
        txtDocNo,
    }: { lkpBranch: DbValue; strDocType: DbValue; txtDocNo: DbValue },
): Promise<any[]> {
    return callPaymentProcedure(client, {
        strMode: "D",
        pstrCoID,
        pstrYear,
        lkpBranch,
        strDocType,
        txtDocNo,
        txtSlNo: 0,
        PstrUserID: pstrUserID,
        details: null,
    });
}

/* =========================================================
   SAVE PAYMENT
========================================================= */

export async function savePaymentService(
    payment: ReceiptData,
    ctx: ReceiptContext,
    existingClient: PoolClient | null = null,
    manageTransaction: boolean = true,
): Promise<ServiceResult> {
    const client: PoolClient = existingClient || (await pool.connect());

    const { pstrCoID, pstrYear } = ctx;

    try {
        const {
            lkpBranch,
            lkpType,
            txtDocNo,
            dtpDate,
            lkpCBAccountName,
            txtReceivedFrom,
            txtReference,
            strNote,
            rows = [],
        } = payment;

        if (isEmpty(lkpBranch)) throw new Error("Branch is required");
        if (isEmpty(lkpType)) throw new Error("Payment type is required");

        const strDocType = GetPaymentDocType(lkpType);

        if (isEmpty(txtDocNo)) throw new Error("Payment number is required");
        if (isEmpty(dtpDate)) throw new Error("Payment date is required");
        if (isEmpty(lkpCBAccountName)) {
            throw new Error("Cash/Bank account is required");
        }
        if (!Array.isArray(rows)) throw new Error("Payment rows are invalid");

        const validRows: ReceiptRow[] = rows.filter(
            (row: ReceiptRow): boolean => row && !isEmpty(row.lkpAccountID),
        );

        if (validRows.length === 0) {
            throw new Error("There is no information for saving.");
        }

        /* Signed net total of all lines (positive = debit). */

        const TottxtDebitCredit = validRows.reduce(
            (sum: number, row: ReceiptRow): number =>
                sum + toNumber(row.txtDebitCredit),
            0,
        );

        if (manageTransaction) {
            await client.query("BEGIN");
        }

        /* DETAIL LINES */

        for (let index = 0; index < validRows.length; index++) {
            const row = validRows[index];

            const txtSlNo = Number(row.txtslNo) || index + 1;

            const { numDebit, numCredit } = AssignPaymentDebitCredit(
                row.txtDebitCredit,
            );

            await savePaymentLine(client, ctx, {
                lkpBranch,
                strDocType,
                txtDocNo,
                dtpDate,
                txtReceivedFrom,
                txtReference,
                txtSlNo,
                lkpCBAccountName,
                lkpAccountID: row.lkpAccountID,
                strGCS: row.strGCS || "",
                lkpCCID: row.lkpCCID || "",
                numDebit,
                numCredit,
                /* signed user-entered amount, saved as-is in fdebitcredit */
                numDebitCredit: toNumber(row.txtDebitCredit),
                txtDescription: row.txtDescription || "",
                txtNote: strNote || "",
                lkpDivID: row.lkpDivID || "",
                chkMatch: toBoolean(row.ckhMatch),
                strUserDate: new Date().toISOString(),
            });
        }

        /* GENERATED CONTROL ENTRY */

        const firstRow = validRows[0];

        const control = AssignControlDebitCredit(TottxtDebitCredit);

        await saveGeneratedEntry(client, ctx, {
            lkpBranch,
            strDocType,
            txtDocNo,
            dtpDate,
            txtReceivedFrom,
            txtReference,
            lkpCBAccountName,
            strGCS: firstRow.strGCS || "",
            numDebit: control.numDebit,
            numCredit: control.numCredit,
            numDebitCredit: oppositeOf(TottxtDebitCredit),
            txtDescription: [txtReference, txtReceivedFrom]
                .filter((value) => !isEmpty(value))
                .join(" - "),
            txtNote: strNote || "",
            chkMatch: toBoolean(firstRow.ckhMatch),
            strUserDate: new Date().toISOString(),
        });

        if (manageTransaction) {
            await client.query("COMMIT");
        }

        return {
            message: "saved ",
            data: {
                pstrCoID,
                pstrYear,
                lkpBranch,
                strDocType,
                txtDocNo,
                total: TottxtDebitCredit,
                lkpCBAccountName,
                rowCount: validRows.length,
            },
        };
    } catch (error: unknown) {
        if (manageTransaction) {
            try {
                await client.query("ROLLBACK");
            } catch (rollbackError: unknown) {
                console.error("Payment rollback error:", rollbackError);
            }
        }

        console.error("savePaymentService error:", error);

        throw error;
    } finally {
        if (!existingClient) {
            client.release();
        }
    }
}

/* =========================================================
   DELETE PAYMENT
========================================================= */

export async function deletePaymentService(
    { lkpBranch, lkpType, txtDocNo }: ReceiptDocumentParams,
    ctx: ReceiptContext,
): Promise<ServiceResult> {
    const client = await pool.connect();

    const { pstrCoID, pstrYear } = ctx;

    try {
        if (isEmpty(lkpBranch)) throw new Error("Branch is required");
        if (isEmpty(lkpType)) throw new Error("Payment type is required");
        if (isEmpty(txtDocNo)) throw new Error("Document number is required");

        const strDocType = GetPaymentDocType(lkpType);

        await client.query("BEGIN");

        await deletePaymentInternal(client, ctx, {
            lkpBranch,
            strDocType,
            txtDocNo,
        });

        await client.query("COMMIT");

        return {
            message: "Payment deleted successfully",
            data: {
                pstrCoID,
                pstrYear,
                lkpBranch,
                type: strDocType,
                txtDocNo,
            },
        };
    } catch (error: unknown) {
        try {
            await client.query("ROLLBACK");
        } catch (rollbackError: unknown) {
            console.error("Delete rollback error:", rollbackError);
        }

        console.error("deletePaymentService error:", error);

        throw error;
    } finally {
        client.release();
    }
}

/* =========================================================
   UPDATE PAYMENT - MODE : M
========================================================= */

export async function updatePaymentService(
    payment: ReceiptData,
    ctx: ReceiptContext,
): Promise<ServiceResult> {
    const { pstrCoID, pstrYear, pstrUserID } = ctx;

    const {
        lkpBranch,
        lkpType,
        txtDocNo,
        dtpDate,
        txtReceivedFrom,
        txtReference,
        lkpCBAccountName,
        strNote,
        cbCcId,
        rows = [],
    } = payment;

    const client = await pool.connect();

    try {
        if (isEmpty(lkpBranch)) throw new Error("Branch is required");
        if (isEmpty(lkpType)) throw new Error("Payment type is required");
        if (isEmpty(txtDocNo)) throw new Error("Document number is required");
        if (isEmpty(dtpDate)) throw new Error("Payment date is required");
        if (isEmpty(lkpCBAccountName)) {
            throw new Error("Cash/Bank account is required");
        }
        if (!Array.isArray(rows)) throw new Error("Payment rows are invalid");

        const strDocType = GetPaymentDocType(lkpType);

        const validRows: ReceiptRow[] = rows.filter(
            (row: ReceiptRow): boolean => row && !isEmpty(row.lkpAccountID),
        );

        if (validRows.length === 0) {
            throw new Error("There is no information for modifying.");
        }

        const TottxtDebitCredit = validRows.reduce(
            (tot: number, row: ReceiptRow): number =>
                tot + toNumber(row.txtDebitCredit),
            0,
        );

        await client.query("BEGIN");

        /* 1. CONTROL ENTRY (M + slno = 0) */

        const control = AssignControlDebitCredit(TottxtDebitCredit);

        await callPaymentProcedure(client, {
            strMode: "M",
            pstrCoID,
            pstrYear,
            lkpBranch,
            strDocType,
            txtDocNo: clean(txtDocNo),
            txtSlNo: 0,
            dtpDate,
            lkpCBAccountName,
            txtReceivedFrom,
            txtReference,
            lkpAccountID: lkpCBAccountName,
            strGCS: validRows[0]?.strGCS || "",
            lkpDivID: validRows[0]?.lkpDivID || "",
            lkpCCID: validRows[0]?.lkpCCID || cbCcId || "",
            numDebit: control.numDebit,
            numCredit: control.numCredit,
            numDebitCredit: oppositeOf(TottxtDebitCredit),
            txtDescription: [txtReference, txtReceivedFrom]
                .filter((value) => !isEmpty(value))
                .join(" - "),
            txtNote: strNote || "",
            chkMatch: toBoolean(validRows[0]?.ckhMatch),
            PstrUserID: pstrUserID,
            strUserDate: new Date().toISOString(),
            details: null,
        });

        /* 2. DETAILS JSON (keys must match jsonb_to_recordset in the SP) */

        const details = validRows.map((row: ReceiptRow, index: number) => {
            const { numDebit, numCredit } = AssignPaymentDebitCredit(
                row.txtDebitCredit,
            );

            return {
                slno: Number(row.txtslNo) || index + 1,
                dtpdate: normalizeDate(dtpDate),
                cbaccountid: lkpCBAccountName || "",
                receivedfrompaidto: txtReceivedFrom || "",
                ref: txtReference || "",
                accountid: row.lkpAccountID || "",
                gcs: row.strGCS || "",
                divid: row.lkpDivID || "",
                ccid: row.lkpCCID || "",
                debit: numDebit,
                credit: numCredit,
                debitcredit: toNumber(row.txtDebitCredit),
                description: row.txtDescription || "",
                note: strNote || "",
                match: toBoolean(row.ckhMatch),
            };
        });

        /* 3. ALL DETAIL ROWS (M + details JSON) */

        await callPaymentProcedure(client, {
            strMode: "M",
            pstrCoID,
            pstrYear,
            lkpBranch,
            strDocType,
            txtDocNo: clean(txtDocNo),
            txtSlNo: 1,
            dtpDate,
            lkpCBAccountName,
            txtReceivedFrom,
            txtReference,
            lkpAccountID: null,
            strGCS: null,
            lkpDivID: null,
            lkpCCID: null,
            numDebit: 0,
            numCredit: 0,
            numDebitCredit: 0,
            txtDescription: null,
            txtNote: null,
            chkMatch: false,
            PstrUserID: pstrUserID,
            strUserDate: new Date().toISOString(),
            details,
        });

        await client.query("COMMIT");

        return {
            message: "Payment modified successfully",
            data: {
                pstrCoID,
                pstrYear,
                lkpBranch,
                strDocType,
                txtDocNo,
                total: TottxtDebitCredit,
                lkpCBAccountName,
                rowCount: validRows.length,
            },
        };
    } catch (error: unknown) {
        try {
            await client.query("ROLLBACK");
        } catch (rollbackError: unknown) {
            console.error("Payment modify rollback error:", rollbackError);
        }

        console.error("updatePaymentService error:", error);

        throw error;
    } finally {
        client.release();
    }
}