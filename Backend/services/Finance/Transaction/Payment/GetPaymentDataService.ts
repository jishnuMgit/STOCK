import type { PoolClient } from "pg";
import pool from "../../../../DB/db.js";

type DbRow = Record<string, any>;

/* Company / year come from the request context */
interface GetDataInput {
  pstrCoID: string;
  pstrYear: string;
  pstrUserID?: string | null;
  lkpBranch: string;
  /* already a payment doc type: BP / CP */
  lkpType: string;
  txtDocNo: string;
}

interface PaymentHeader {
  companyId: any;
  year: any;
  lkpBranch: any;
  lkpType: any;
  txtDocNo: any;
  dtpDate: any;
  cbAccountName: any;
  CCID: any;
  paidTo: any;
  reference: any;
  note: any;
  DivID: any;
  totalDebit: number;
  fpost: boolean;
}

interface PaymentDetailRow {
  id: number;
  AccountID: any;
  AccountName: any;
  fgcs: any;
  DivID: any;
  CCID: any;
  /* signed: debit - credit (negative = credit line) */
  txtDebitCredit: string;
  match: boolean;
  description: any;
}

interface GetPaymentDataResult {
  exists: boolean;
  header: PaymentHeader | null;
  rows: PaymentDetailRow[];
  total?: number;
  rowCount?: number;
  message: string;
}

/* ========================= HELPERS ========================= */

function isEmpty(value: unknown): boolean {
  return value === null || value === undefined || String(value).trim() === "";
}

function clean(value: unknown): string | null {
  return isEmpty(value) ? null : String(value).trim();
}

function toBoolean(value: unknown): boolean {
  return (
    value === true ||
    value === 1 ||
    value === "1" ||
    value === "true" ||
    value === "TRUE"
  );
}

/* ================= PROCEDURE CALL (GETHD / GETTL) ================= */

async function callGetProcedure(
  client: PoolClient,
  mode: "GETHD" | "GETTL",
  {
    pstrCoID,
    pstrYear,
    pstrUserID,
    lkpBranch,
    lkpType,
    txtDocNo,
  }: GetDataInput,
): Promise<DbRow[]> {
  const cursorName = `cur_payment_${mode.toLowerCase()}_${Date.now()}_${Math.floor(
    Math.random() * 100000,
  )}`;

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

  const values = [
    mode, // $1
    clean(pstrCoID), // $2
    clean(pstrYear), // $3
    clean(lkpBranch), // $4
    clean(lkpType), // $5
    clean(txtDocNo), // $6
    0, // $7  slno
    null, // $8  date
    null, // $9
    null, // $10
    null, // $11
    null, // $12
    null, // $13
    null, // $14
    null, // $15
    0, // $16 debit
    0, // $17 credit
    null, // $18 debitcredit (not used by GET modes)
    null, // $19 description
    null, // $20 note
    false, // $21 match
    clean(pstrUserID), // $22
    null, // $23 user date
    null, // $24 details
    cursorName, // $25 cursor
  ];

  await client.query(sql, values);

  const result = await client.query(`FETCH ALL FROM "${cursorName}"`);

  return result.rows;
}

/* Runs one mode inside its own transaction */
async function runMode(
  mode: "GETHD" | "GETTL",
  input: GetDataInput,
): Promise<DbRow[]> {
  if (isEmpty(input.pstrCoID) || isEmpty(input.pstrYear)) {
    throw new Error("Company ID and financial year are required");
  }
  if (isEmpty(input.lkpBranch)) throw new Error("Branch is required");
  if (isEmpty(input.lkpType)) throw new Error("Payment type is required");
  if (isEmpty(input.txtDocNo)) throw new Error("Payment number is required");

  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const rows = await callGetProcedure(client, mode, input);
    await client.query("COMMIT");
    return rows;
  } catch (error: unknown) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError: unknown) {
      console.error(`${mode} rollback error:`, rollbackError);
    }
    console.error(`${mode} error:`, error);
    throw error;
  } finally {
    client.release();
  }
}

export const GetPaymentDataTL = (input: GetDataInput): Promise<DbRow[]> =>
  runMode("GETTL", input);

export const GetPaymentDataHD = (input: GetDataInput): Promise<DbRow[]> =>
  runMode("GETHD", input);

/* ============================== GET DATA ============================== */

export async function GetPaymentData(
  input: GetDataInput,
): Promise<GetPaymentDataResult> {
  const branch = clean(input.lkpBranch);
  const docType = clean(input.lkpType);
  const docNo = clean(input.txtDocNo);

  const fail = (message: string): GetPaymentDataResult => ({
    exists: false,
    header: null,
    rows: [],
    message,
  });

  if (!branch) return fail("Branch is required");
  if (!docType) return fail("Payment type is required");
  if (!docNo) return fail("Payment number is required");

  const params: GetDataInput = {
    ...input,
    lkpBranch: branch,
    lkpType: docType,
    txtDocNo: docNo,
  };

  const [detailRows, headerRows] = await Promise.all([
    GetPaymentDataTL(params),
    GetPaymentDataHD(params),
  ]);

  if (!headerRows || headerRows.length === 0) {
    return fail("Payment not found");
  }

  const dbHeader = headerRows[0];

  /* ---------- DETAIL ROWS (signed amount from fdebitcredit) ---------- */

  const rows: PaymentDetailRow[] = (detailRows || [])
    .filter((row: DbRow) => Number(row.fslno) > 0)
    .map((row: DbRow, index: number): PaymentDetailRow => {
      const signed =
        row.fdebitcredit !== null && row.fdebitcredit !== undefined
          ? String(row.fdebitcredit)
          : "";

      return {
        id: Number(row.fslno) || index + 1,
        AccountID: row.faccountid ?? "",
        AccountName: row.faccountname ?? "",
        fgcs: row.fgcs ?? "",
        DivID: row.fdivid ?? "",
        CCID: row.fccid ?? "",
        txtDebitCredit: signed,
        match: toBoolean(row.fmatch),
        description: row.fdescription ?? "",
      };
    });

  const total = rows.reduce(
    (sum: number, row: PaymentDetailRow): number =>
      sum + (Number(row.txtDebitCredit) || 0),
    0,
  );

  const header: PaymentHeader = {
    companyId: dbHeader.fcoid ?? input.pstrCoID,
    year: dbHeader.fyear ?? input.pstrYear,
    lkpBranch: dbHeader.fbrid ?? branch,
    lkpType: dbHeader.fdoctype ?? docType,
    txtDocNo: dbHeader.fdocno ?? docNo,
    dtpDate: dbHeader.fdate ?? null, // already DD/MM/YYYY string
    cbAccountName: dbHeader.fcbaccountid ?? "",
    CCID: dbHeader.fccid ?? "",
    paidTo: dbHeader.freceivedfrompaidto ?? "",
    reference: dbHeader.freference ?? "",
    note: dbHeader.fnote ?? "",
    DivID: dbHeader.fdivid ?? "",
    totalDebit: total,
    fpost: dbHeader.fpost,
  };

  return {
    exists: true,
    header,
    rows,
    total,
    rowCount: rows.length,
    message: `${header.txtDocNo} loaded`,
  };
}