import pool from "../DB/db.js";

// ============================================================
// 1. FIELD FORMAT VALIDATION (no DB needed)
// ============================================================

const digitsOnly = (v: unknown, len: number) =>
  new RegExp(`^\\d{${len}}$`).test(String(v ?? "").trim());

const isBlank = (v: unknown) =>
  v === undefined || v === null || String(v).trim() === "";

/**
 * Validates the fields that are present in the body.
 * - On create ("S") the whole body is sent, so everything is checked.
 * - On update ("M") only sent fields are checked (partial updates are fine).
 * Returns an error message, or null if OK.
 */
export const validateCustomerFormat = (
  body: Record<string, any>,
): string | null => {
  // [bodyKey, label, exactLength]
  const rules: Array<[string, string, number]> = [
    ["buildingNo", "Building No.", 4],
    ["buildingNoA", "Building No. (Arabic)", 4],
    ["postalCode", "Postal Code", 5],
    ["postalCodeA", "Postal Code (Arabic)", 5],
    ["additionalNo", "Additional No.", 4],
    ["additionalNoA", "Additional No. (Arabic)", 4],
  ];

  for (const [key, label, len] of rules) {
    if (!isBlank(body[key]) && !digitsOnly(body[key], len)) {
      return `'${label}' should be exactly ${len} digits`;
    }
  }

  // VB: VAT No. length must be 15 (when entered)
  for (const [key, label] of [
    ["vatNo", "VAT No."],
    ["vatNoA", "VAT No. (Arabic)"],
  ] as const) {
    if (!isBlank(body[key]) && String(body[key]).trim().length !== 15) {
      return `Length of '${label}' should be 15`;
    }
  }

  // VB: e-mails separated with ';'
  if (!isBlank(body.email)) {
    const emailRe = /^[^\s@;]+@[^\s@;]+\.[^\s@;]+$/;
    const bad = String(body.email)
      .split(";")
      .map((e) => e.trim())
      .filter(Boolean)
      .some((e) => !emailRe.test(e));
    if (bad) return "Please input valid E-mail address separated with ';'";
  }

  return null;
};

// ============================================================
// 2. PORTED VB FUNCTIONS
// ============================================================

/**
 * VB: HaveDuplicateValue(fld, tbl, filter) built raw SQL strings (SQL-injection
 * risk). Ported as two safe, parameterised helpers for tblaccountcs.
 */

// "'Customer ID' already exists!"
export const customerIdExists = async (
  companyId: string,
  csAccountId: string,
) => {
  const r = await pool.query(
    `SELECT COUNT(fcsaccountid)::int AS cnt
       FROM dbo.tblaccountcs
      WHERE fcoid = $1 AND fcsaccountid = $2`,
    [companyId, csAccountId],
  );
  return r.rows[0].cnt > 0;
};

// "'Customer Name' already exists!"  (excludeId is used on modify)
export const customerNameExists = async (
  companyId: string,
  accountName: string,
  csAccountType: string,
  excludeCsAccountId?: string,
) => {
  const params: unknown[] = [companyId, accountName, csAccountType];
  let sql = `SELECT COUNT(fcsaccountid)::int AS cnt
               FROM dbo.tblaccountcs
              WHERE fcoid = $1
                AND faccountname = $2
                AND fcs = $3`; // fcs = fCSAccountType (see getCustomer mapping)
  if (excludeCsAccountId) {
    params.push(excludeCsAccountId);
    sql += ` AND fcsaccountid <> $4`;
  }
  const r = await pool.query(sql, params);
  return r.rows[0].cnt > 0;
};

/**
 * VB: GetAccountIDFromVATNo -> returns "" when nothing found.
 * ASSUMPTION: the function was migrated as dbo.getaccountidfromvatno(coid, vatno).
 */
export const getAccountIdFromVatNo = async (
  companyId: string,
  vatNo: string,
) => {
  const r = await pool.query(
    `SELECT dbo.getaccountidfromvatno($1, $2) AS accountid`,
    [companyId, vatNo],
  );
  return String(r.rows[0]?.accountid ?? "").trim();
};

/**
 * VB: HaveTrans(searchKey, searchValue) -> SP_HaveTrans with OUTPUT param.
 * Postgres procedures can't return OUTPUT like SQL Server's, so this assumes
 * it was migrated as a function: dbo.sp_havetrans(coid, key, value) RETURNS boolean/int.
 * ADJUST the name/signature to match what you actually created.
 */
export const haveTrans = async (
  companyId: string,
  searchKey: string,
  searchValue: string,
) => {
  const r = await pool.query(
    `SELECT dbo.sp_havetrans($1, $2, $3) AS havetrans`,
    [companyId, searchKey, searchValue],
  );
  const v = r.rows[0]?.havetrans;
  return v === true || Number(v) > 0;
};

/**
 * VB: CanModifyAccountID. Customers (tblaccountcs) are "head" accounts, so only
 * the HaveTrans branch applies. (IsAccountHead / HaveChildAccount are for GL
 * group accounts - send me those VB functions if you need them here too.)
 */
export const canModifyCustomerId = async (
  companyId: string,
  oldCsAccountId: string,
) => {
  if (await haveTrans(companyId, "fCSAccountID", oldCsAccountId)) {
    return {
      ok: false,
      message: `You cannot modify the account '${oldCsAccountId}' as transactions exist.`,
    };
  }
  return { ok: true as const, message: "" };
};

// ============================================================
// 3. FULL SERVER-SIDE VALIDATION (port of ValidateMe)
// ============================================================

export type ValidationResult =
  | { ok: true; warning?: undefined }
  | { ok: false; status: number; message: string; code?: string };

const fail = (
  message: string,
  status = 400,
  code?: string,
): ValidationResult => ({
  ok: false,
  status,
  message,
  code,
});

export const validateCustomerCreate = async (
  companyId: string,
  body: Record<string, any>,
): Promise<ValidationResult> => {
  const fmt = validateCustomerFormat(body);
  if (fmt) return fail(fmt);

  if (await customerIdExists(companyId, String(body.csAccountId).trim()))
    return fail("'Customer ID' already exists!", 409);

  if (
    !isBlank(body.accountName) &&
    (await customerNameExists(companyId, body.accountName, body.csAccountType))
  )
    return fail("'Customer Name' already exists!", 409);

  return checkVatNoUsage(companyId, body, String(body.csAccountId).trim());
};

export const validateCustomerUpdate = async (
  companyId: string,
  oldCsAccountId: string,
  body: Record<string, any>,
): Promise<ValidationResult> => {
  const fmt = validateCustomerFormat(body);
  if (fmt) return fail(fmt);

  const newId = String(body.csAccountId ?? oldCsAccountId).trim();

  if (newId !== oldCsAccountId) {
    if (await customerIdExists(companyId, newId))
      return fail("'Customer ID' already exists!", 409);

    const can = await canModifyCustomerId(companyId, oldCsAccountId);
    if (!can.ok) return fail(can.message, 409);
  }

  if (
    !isBlank(body.accountName) &&
    (await customerNameExists(
      companyId,
      body.accountName,
      body.csAccountType,
      oldCsAccountId,
    ))
  )
    return fail("'Customer Name' already exists!", 409);

  return checkVatNoUsage(companyId, body, newId);
};

/**
 * VB asked "VAT No. already exists for Customer ID X, do you want to save it?"
 * (Yes/No dialog). An API can't prompt, so: duplicate VAT is blocked with a
 * 409 + code "VAT_DUPLICATE", unless the client re-sends with
 * `confirmDuplicateVat: true` (the frontend shows the Yes/No dialog).
 */
const checkVatNoUsage = async (
  companyId: string,
  body: Record<string, any>,
  currentId: string,
): Promise<ValidationResult> => {
  if (isBlank(body.vatNo)) return { ok: true };

  const existingId = await getAccountIdFromVatNo(
    companyId,
    String(body.vatNo).trim(),
  );
  if (
    existingId &&
    existingId !== currentId &&
    body.confirmDuplicateVat !== true
  ) {
    return fail(
      `VAT No. already exists for Customer ID ${existingId}. Do you want to save it?`,
      409,
      "VAT_DUPLICATE",
    );
  }
  return { ok: true };
};
