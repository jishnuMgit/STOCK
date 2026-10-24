import type { PoolClient } from "pg";
import pool from "../DB/db.js";

type DbRow = Record<string, any>;

/* Company / year come from the request context, NOT from .env */
interface GetDataInput {
  pstrCoID: string;
  pstrYear: string;
  pstrUserID?: string | null;
  lkpBranch: string;
  /* already a doc type: BR / CR (controller runs GetStrDocType) */
  lkpType: string;
  txtDocNo: string;
}

interface ReceiptHeader {
  companyId: any;
  year: any;
  lkpBranch: any;
  lkpType: any;
  txtDocNo: any;
  dtpDate: any;
  cbAccountName: any;
  CCID: any;
  receivedFrom: any;
  reference: any;
  note: any;
  DivID: any;
  totalCredit: number;
}

interface ReceiptDetailRow {
  id: number;
  AccountID: any;
  AccountName: any;
  fgcs: any;
  DivID: any;
  CCID: any;
  /* signed: credit - debit (negative = debit line) */
  txtDebitCredit: string;
  /* kept as alias so the existing frontend does not break */
  creditAmt: string;
  match: boolean;
  description: any;
}

interface GetDataResult {
  exists: boolean;
  header: ReceiptHeader | null;
  rows: ReceiptDetailRow[];
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
  const cursorName = `cur_receipt_${mode.toLowerCase()}_${Date.now()}_${Math.floor(
    Math.random() * 100000,
  )}`;

  const sql = `
    CALL dbo.sp_pagesreceipt_det(
      $1::varchar,  $2::varchar,  $3::varchar,  $4::varchar,
      $5::varchar,  $6::varchar,  $7::smallint, $8::varchar,
      $9::varchar,  $10::varchar, $11::varchar, $12::varchar,
      $13::varchar, $14::varchar, $15::varchar, $16::numeric,
      $17::numeric, $18::varchar, $19::varchar, $20::boolean,
      $21::varchar, $22::varchar, $23::jsonb,   $24::refcursor
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
    0, // $16
    0, // $17
    null, // $18
    null, // $19
    false, // $20
    clean(pstrUserID), // $21
    null, // $22
    null, // $23 details
    cursorName, // $24 cursor
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
  if (isEmpty(input.lkpType)) throw new Error("Receipt type is required");
  if (isEmpty(input.txtDocNo)) throw new Error("Receipt number is required");

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

export const GetDataTL = (input: GetDataInput): Promise<DbRow[]> =>
  runMode("GETTL", input);

export const GetDataHD = (input: GetDataInput): Promise<DbRow[]> =>
  runMode("GETHD", input);

/* ============================== GET DATA ============================== */

export async function GetData(input: GetDataInput): Promise<GetDataResult> {
  const branch = clean(input.lkpBranch);
  const docType = clean(input.lkpType);
  const docNo = clean(input.txtDocNo);

  const fail = (message: string): GetDataResult => ({
    exists: false,
    header: null,
    rows: [],
    message,
  });

  if (!branch) return fail("Branch is required");
  if (!docType) return fail("Receipt type is required");
  if (!docNo) return fail("Receipt number is required");

  const params: GetDataInput = {
    ...input,
    lkpBranch: branch,
    lkpType: docType,
    txtDocNo: docNo,
  };

  const [detailRows, headerRows] = await Promise.all([
    GetDataTL(params),
    GetDataHD(params),
  ]);

  if (!headerRows || headerRows.length === 0) {
    return fail("Receipt not found");
  }

  const dbHeader = headerRows[0];

  /* ---------- DETAIL ROWS (signed amount from fdebitcredit) ---------- */

  const rows: ReceiptDetailRow[] = (detailRows || [])
    .filter((row: DbRow) => Number(row.fslno) > 0)
    .map((row: DbRow, index: number): ReceiptDetailRow => {
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
        creditAmt: signed,
        match: toBoolean(row.fmatch),
        description: row.fdescription ?? "",
      };
    });

  /* ---------- TOTAL = sum of the same signed values ---------- */

  const total = rows.reduce(
    (sum: number, row: ReceiptDetailRow): number =>
      sum + (Number(row.txtDebitCredit) || 0),
    0,
  );

  /* ---------- HEADER ---------- */

  const header: ReceiptHeader = {
    companyId: dbHeader.fcoid ?? input.pstrCoID,
    year: dbHeader.fyear ?? input.pstrYear,
    lkpBranch: dbHeader.fbrid ?? branch,
    lkpType: dbHeader.fdoctype ?? docType,
    txtDocNo: dbHeader.fdocno ?? docNo,
    dtpDate: dbHeader.fdate ?? null, // already DD/MM/YYYY string
    cbAccountName: dbHeader.fcbaccountid ?? "",
    CCID: dbHeader.fccid ?? "",
    receivedFrom: dbHeader.freceivedfrompaidto ?? "",
    reference: dbHeader.freference ?? "",
    note: dbHeader.fnote ?? "",
    DivID: dbHeader.fdivid ?? "",
    totalCredit: total,
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
