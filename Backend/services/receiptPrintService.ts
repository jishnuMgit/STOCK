import pool from "../DB/db.js";
import { amountToWords } from "../utils/numberToWords.js";

/* =========================================================
   TYPES
========================================================= */

export interface ReceiptPrintParams {
  coId: string;
  year: string;
  branch: string;
  docType: string;
  docNo: string;
}

export interface ReceiptPrintRow {
  slNo: number;
  accountId: string;
  accountName: string;
  description: string;
  amount: number;
}

export interface ReceiptPrintData {
  coId: string;

  docType: string;
  heading: string;

  branchId: string;
  docNo: string;
  date: string;

  receivedFrom: string;
  reference: string;
  fop: string;
  note: string;

  currency: string;
  total: number;
  amountInWords: string;

  preparedBy: string;
  preparedDate: string;

  company: {
    nameEn: string;
    nameAr: string;
    addressEn: string[];
    addressAr: string[];
  };

  rows: ReceiptPrintRow[];
}

/* =========================================================
   CONSTANTS

   The VB form (DocumentPrint) always prints SAR.
========================================================= */

const CURRENCY = "SAR";

/* Letters, digits, space and  _ - . /  only. */
const SAFE_TOKEN = /^[A-Za-z0-9 _\-./]{1,20}$/;

/* =========================================================
   HELPERS
========================================================= */

const text = (value: unknown): string =>
  value === null || value === undefined
    ? ""
    : String(value).trim();

const toNumber = (value: unknown): number => {
  const number = Number(value);

  return Number.isFinite(number) ? number : 0;
};

const pad = (value: number) => String(value).padStart(2, "0");

/*
   Prepared date is printed as dd/MM/yyyy HH:mm:ss.

   The SP may return it as text (already formatted) or as a
   timestamp. node-pg builds a local Date from a timestamp
   without time zone, so the local getters give the stored value.
*/
const formatDateTime = (value: unknown): string => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return (
      `${pad(value.getDate())}/${pad(value.getMonth() + 1)}/${value.getFullYear()} ` +
      `${pad(value.getHours())}:${pad(value.getMinutes())}:${pad(value.getSeconds())}`
    );
  }

  return text(value);
};

const formatDate = (value: unknown): string => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const months = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];

    return `${pad(value.getDate())}-${months[value.getMonth()]}-${value.getFullYear()}`;
  }

  return text(value);
};

const sqlLiteral = (value: string): string =>
  `'${value.replace(/'/g, "''")}'`;

const normalizeDocType = (value: string): string => {
  const type = value.trim().toUpperCase();

  if (type === "B") {
    return "BR";
  }

  if (type === "C") {
    return "CR";
  }

  return type;
};

/* =========================================================
   FILTER

   Same filter the VB form builds in GeneratePrintFilter.
   sp_rptbankdetprint appends it to its WHERE clause, so every
   value is validated and quoted here.
========================================================= */

const buildPrintFilter = ({
  coId,
  year,
  branch,
  docType,
  docNo,
}: ReceiptPrintParams): string => {
  for (const [name, value] of Object.entries({
    coId,
    year,
    branch,
    docType,
    docNo,
  })) {
    if (!SAFE_TOKEN.test(value)) {
      throw new Error(`Invalid value for ${name}`);
    }
  }

  return [
    `fcoid=${sqlLiteral(coId)}`,
    `fyear=${sqlLiteral(year)}`,
    `fbrid=${sqlLiteral(branch)}`,
    `fdoctype=${sqlLiteral(docType)}`,
    `fdocno=${sqlLiteral(docNo)}`,
    `forigin <> 'UIG'`,
  ].join(" AND ");
};

/* =========================================================
   CALL sp_rptbankdetprint
========================================================= */

async function runPrintProcedure(
  docType: string,
  filter: string
): Promise<Record<string, any>[]> {
  const cursorName = `cur_bankdetprint_${Date.now()}_${Math.floor(
    Math.random() * 100000
  )}`;

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query(
      `
      CALL dbo.sp_rptbankdetprint(
        $1::varchar,
        $2::varchar,
        $3::refcursor
      )
      `,
      [docType, filter, cursorName]
    );

    const result = await client.query(
      `FETCH ALL FROM "${cursorName}"`
    );

    await client.query("COMMIT");

    return result.rows;
  } catch (error: unknown) {
    await client.query("ROLLBACK");

    throw error;
  } finally {
    client.release();
  }
}

/* =========================================================
   GET RECEIPT PRINT DATA

   Returns null when the document does not exist.
========================================================= */

export async function getReceiptPrintData(
  params: ReceiptPrintParams
): Promise<ReceiptPrintData | null> {
  const docType = normalizeDocType(params.docType);

  const filter = buildPrintFilter({
    ...params,
    docType,
  });

  const dbRows = await runPrintProcedure(docType, filter);

  if (dbRows.length === 0) {
    return null;
  }

  const first = dbRows[0];

  const rows: ReceiptPrintRow[] = dbRows.map((row, index) => ({
    slNo: toNumber(row.fslno) || index + 1,
    accountId: text(row.faccountid),
    accountName: text(row.faccountname),
    description: text(row.fdescription),
    /* fdebitcredit comes from the corrected SP; fcredit keeps
       older versions of the SP working for receipts. */
    amount: toNumber(row.fdebitcredit ?? row.fcredit),
  }));

  const total =
    first.ftotalamt !== undefined && first.ftotalamt !== null
      ? toNumber(first.ftotalamt)
      : rows.reduce((sum, row) => sum + row.amount, 0);

  const lines = (...values: unknown[]) =>
    values.map(text).filter((value) => value !== "");

  return {
    coId: text(first.fcoid) || params.coId,

    docType,
    heading: docType === "BR" ? "BANK RECEIPT" : "CASH RECEIPT",

    branchId: text(first.fbrid) || params.branch,
    docNo: text(first.fdocno) || params.docNo,
    date: formatDate(first.fdate),

    receivedFrom: text(first.freceivedfrompaidto),
    reference: text(first.freference),
    fop: text(first.fcbaccountname),
    note: text(first.fnote),

    currency: CURRENCY,
    total,
    amountInWords: amountToWords(total),

    preparedBy: text(first.fuserid ?? first.fcuserid),
    preparedDate: formatDateTime(first.fuserdate ?? first.fcuserdate),

    company: {
      nameEn: text(first.fconame),
      nameAr: text(first.fconame_ar),
      addressEn: lines(
        first.fcombinedaddress1,
        first.fcombinedaddress2,
        first.fcombinedaddress4,
        first.fcombinedaddress3,
        first.fcombinedtelephone
      ),
      addressAr: lines(
        first.fcombinedaddress1_a,
        first.fcombinedaddress2_a,
        first.fcombinedaddress4_a,
        first.fcombinedaddress3_a,
        first.fcombinedtelephone_a
      ),
    },

    rows,
  };
}
