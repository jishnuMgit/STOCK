import pool from "../DB/db.js";

// ============================================================
// 1. FIELD FORMAT VALIDATION (no DB needed)
// ============================================================

const toEnglishDigits = (value: unknown): string =>
    String(value ?? "")
        .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
        .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));

const digitsOnly = (v: unknown, len: number) =>
    new RegExp(`^\\d{${len}}$`).test(toEnglishDigits(v).trim());

const isBlank = (v: unknown) =>
    v === undefined || v === null || String(v).trim() === "";

export const validateSupplierFormat = (
    body: Record<string, any>,
): string | null => {
    // Saudi national-address / VAT rules apply only to Saudi suppliers.
    const isSaudi = (body.countryId ?? "SA") === "SA";

    if (isSaudi) {
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

        for (const [key, label] of [
            ["vatNo", "VAT No."],
            ["vatNoA", "VAT No. (Arabic)"],
        ] as const) {
            if (
                !isBlank(body[key]) &&
                toEnglishDigits(body[key]).trim().length !== 15
            ) {
                return `Length of '${label}' should be 15`;
            }
        }
    }

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
// 2. DB HELPERS
// ============================================================

// "'Supplier ID' already exists!"
export const supplierIdExists = async (
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

// "'Supplier Name' already exists!"  (excludeId is used on modify)
export const supplierNameExists = async (
    companyId: string,
    accountName: string,
    excludeCsAccountId?: string,
) => {
    const params: unknown[] = [companyId, accountName, "S"];
    let sql = `SELECT COUNT(fcsaccountid)::int AS cnt
               FROM dbo.tblaccountcs
              WHERE fcoid = $1
                AND fcsaccountname = $2
                AND fcs = $3`;
    if (excludeCsAccountId) {
        params.push(excludeCsAccountId);
        sql += ` AND fcsaccountid <> $4`;
    }
    const r = await pool.query(sql, params);
    return r.rows[0].cnt > 0;
};

// ASSUMPTION: dbo.getaccountidfromvatno(coid, vatno) exists (same as customer)
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

// ASSUMPTION: dbo.sp_havetrans(coid, key, value) function (same as customer)
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

export const canModifySupplierId = async (
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
// 3. FULL SERVER-SIDE VALIDATION
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

export const validateSupplierCreate = async (
    companyId: string,
    body: Record<string, any>,
): Promise<ValidationResult> => {
    const fmt = validateSupplierFormat(body);
    if (fmt) return fail(fmt);

    if (await supplierIdExists(companyId, String(body.csAccountId).trim()))
        return fail("'Supplier ID' already exists!", 409);

    if (
        !isBlank(body.accountName) &&
        (await supplierNameExists(companyId, body.accountName))
    )
        return fail("'Supplier Name' already exists!", 409);

    return checkVatNoUsage(companyId, body, String(body.csAccountId).trim());
};

export const validateSupplierUpdate = async (
    companyId: string,
    oldCsAccountId: string,
    body: Record<string, any>,
): Promise<ValidationResult> => {
    const fmt = validateSupplierFormat(body);
    if (fmt) return fail(fmt);

    const newId = String(body.csAccountId ?? oldCsAccountId).trim();

    if (newId !== oldCsAccountId) {
        if (await supplierIdExists(companyId, newId))
            return fail("'Supplier ID' already exists!", 409);

        const can = await canModifySupplierId(companyId, oldCsAccountId);
        if (!can.ok) return fail(can.message, 409);
    }

    if (
        !isBlank(body.accountName) &&
        (await supplierNameExists(companyId, body.accountName, oldCsAccountId))
    )
        return fail("'Supplier Name' already exists!", 409);

    return checkVatNoUsage(companyId, body, newId);
};

// Duplicate VAT -> 409 + code "VAT_DUPLICATE" unless client re-sends
// with `confirmDuplicateVat: true`.
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
            `VAT No. already exists for Supplier ID ${existingId}. Do you want to save it?`,
            409,
            "VAT_DUPLICATE",
        );
    }
    return { ok: true };
};