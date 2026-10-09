import { Response } from "express";
import pool from "../../../DB/db.js";
import { AuthenticatedRequest } from "../../../middleware/authMiddleware.js";

// ============================================================
// Chart Of Account  (port of frmChartOfAccount / frmChartOfAccountSub
// / FinBL.clsChartOfAccount)
//
//   GET    /api/chart-of-accounts                -> tree
//   GET    /api/chart-of-accounts/next-id        -> next auto account id
//   GET    /api/chart-of-accounts/:accountId     -> one account (+ its group)
//   POST   /api/chart-of-accounts                -> mode 'S'
//   PUT    /api/chart-of-accounts/:accountId     -> mode 'M'
//   DELETE /api/chart-of-accounts/:accountId     -> mode 'D'
// ============================================================

const ACCOUNTID_LEN = 7;
const MAX_ACCOUNT_LEVEL = 4; // VB: level 4 can't have children (mnuAdd hidden)
const ROOT_LEVEL = 1; // VB: level 1 can't be modified / deleted

// ---- DB object names (ADJUST if your Postgres names differ) ----
const TREE_FN = 'dbo."SP_pageChartofAccountTree"';
const APPLY_PROC = 'dbo."SP_pageChartofAccount"';

const getSession = (req: AuthenticatedRequest) => ({
  CoID: req.user?.CoID as string | undefined,
  userId: (req.user as any)?.userId as string | undefined,
});

const scalar = async (sql: string, params: unknown[]) => {
  const r = await pool.query(sql, params);
  return r.rows[0]?.v ?? null;
};

// ---- ports of clsChartOfAccount lookups ----
const getAccountLevel = async (coId: string, accountId: string) => {
  const v = await scalar("SELECT dbo.getaccountlevel($1, $2) AS v", [
    coId,
    accountId,
  ]);
  return v === null || v === "" ? null : Number(v);
};

const getAccountTypeId = async (coId: string, accountId: string) => {
  const v = await scalar("SELECT dbo.getaccounttypeid($1, $2) AS v", [
    coId,
    accountId,
  ]);
  return v ? String(v) : "";
};

const getParentAccountId = async (coId: string, accountId: string) => {
  const v = await scalar(
    `SELECT faccountgroupid AS v
       FROM dbo.tblaccount
      WHERE fcoid = $1 AND faccountid = $2`,
    [coId, accountId],
  );
  return v ? String(v) : "";
};

const getAccountName = async (
  coId: string,
  accountId: string,
  accountTypeId: string,
) => {
  const v = await scalar(
    `SELECT faccountname AS v
       FROM dbo.tblaccount
      WHERE fcoid = $1 AND faccountid = $2 AND faccounttypeid = $3`,
    [coId, accountId, accountTypeId],
  );
  return v ? String(v) : "";
};

const accountIdExists = async (coId: string, accountId: string) => {
  const r = await pool.query(
    `SELECT 1 FROM dbo.tblaccount WHERE fcoid = $1 AND faccountid = $2 LIMIT 1`,
    [coId, accountId],
  );
  return r.rows.length > 0;
};

// VB: fAccountID<>@self AND fAccountName=@name AND fAccountGroupID=@group AND fAccountLevel=@level
const accountNameExists = async (
  coId: string,
  excludeAccountId: string,
  name: string,
  groupId: string,
  level: number,
) => {
  const r = await pool.query(
    `SELECT 1
       FROM dbo.tblaccount
      WHERE fcoid = $1
        AND faccountid <> $2
        AND faccountname = $3
        AND faccountgroupid = $4
        AND faccountlevel = $5
      LIMIT 1`,
    [coId, excludeAccountId, name, groupId, level],
  );
  return r.rows.length > 0;
};

// Port of objCommon.GetNextAccountID(groupId, groupLevel).
// Returns "" when no ID can be generated (callers answer 409 "Unable to Generate New Account ID").
const generateNextAccountId = async (
  coId: string,
  groupId: string,
  groupLevel: number,
) => {
  if (!groupId) return "";

  const newLevel = groupLevel + 1; // VB: strAccountLevel + 1
  const val = (s: string) => Number(s) || 0; // VB Val(): non-numeric -> 0

  const maxId = async (where: string, params: unknown[]) => {
    const r = await pool.query(
      `SELECT MAX(faccountid) AS maxid FROM dbo.tblaccount WHERE fcoid = $1 AND ${where}`,
      [coId, ...params],
    );
    return String(r.rows[0]?.maxid ?? "");
  };

  switch (newLevel) {
    // first char + 1 digit serial + last 6 chars
    case 2: {
      const dummy = await maxId(
        "LEFT(faccountid, 1) = $2 AND RIGHT(faccountid, 5) = $3",
        [groupId.slice(0, 1), groupId.slice(-6)],
      );
      const slNo = val(dummy.substring(1, 2)) + 1; // VB Mid(dummy, 2, 1)
      if (slNo > 9) return "";
      return dummy.slice(0, 1) + String(slNo) + dummy.slice(-6);
    }

    // first 2 chars + 2 digit serial + last 4 chars
    case 3: {
      const dummy = await maxId(
        "LEFT(faccountid, 2) = $2 AND RIGHT(faccountid, 3) = $3",
        [groupId.slice(0, 2), groupId.slice(-4)],
      );
      const slNo = val(dummy.substring(2, 4)) + 1; // VB Mid(dummy, 3, 2)
      if (slNo > 99) return "";
      return (
        dummy.slice(0, 2) + String(slNo).padStart(2, "0") + dummy.slice(-4)
      );
    }

    // same first 4 chars, highest id + 1
    case 4: {
      const dummy = await maxId("LEFT(faccountid, 4) = $2", [
        groupId.slice(0, 4),
      ]);
      if (!dummy) return "";
      if (val(dummy.substring(4, 8)) >= 9999) return ""; // VB Mid(dummy, 5, 4)
      return String(val(dummy) + 1);
    }

    default:
      return "";
  }
};

// Calls the stored procedure (S / M / D)
const callApply = async (args: {
  mode: "S" | "M" | "D";
  coId: string;
  userId?: string;
  accountId: string;
  oldAccountId: string;
  accountName: string;
  accountGroupId: string;
  accountTypeId: string;
  accountLevel: number;
  haveCC: boolean;
  menuName?: string;
  accountNameA?: string | null; // Arabic name   (ASSUMED param: p_straccountname_a)
  groupOrHead?: string | null; // G / H / P      (ASSUMED param: p_strgrouporhead)
}) => {
  const names: string[] = [];
  const values: unknown[] = [];
  const add = (param: string, value: unknown) => {
    values.push(value);
    names.push(`${param} => $${values.length}`);
  };

  add("strmode", args.mode);
  add("gstrcoid", args.coId);
  add("straccountid", args.accountId);
  add("stroldaccountid", args.oldAccountId);
  add("straccountname", args.accountName);
  add("straccountgroupid", args.accountGroupId);
  add("straccounttypeid", args.accountTypeId);
  add("intaccountlevel", args.accountLevel);
  add("blnhavecc", args.haveCC);
  add("gstruserid", args.userId ?? null);
  add("strmenuname", args.menuName ?? null);

  await pool.query(`CALL ${APPLY_PROC}(${names.join(", ")})`, values);

  // The procedure has no Arabic-name parameter, so save it with a direct update.
  // (Delete is skipped: the row is already gone.)
  if (args.mode !== "D" && args.accountNameA != null) {
    await pool.query(
      `UPDATE dbo.tblaccount
          SET faccountname_ar = $1
        WHERE fcoid = $2 AND faccountid = $3`,
      [args.accountNameA, args.coId, args.accountId],
    );
  }
};

// G only for level < 4, H only for level >= 4, P always (same rule as the UI)
const resolveGroupOrHead = (input: unknown, level: number): string | null => {
  const v =
    String(input ?? "")
      .trim()
      .toUpperCase() || (level < MAX_ACCOUNT_LEVEL ? "G" : "H");
  if (!["G", "H", "P"].includes(v)) return null;
  if (v === "G" && level >= MAX_ACCOUNT_LEVEL) return null;
  if (v === "H" && level < MAX_ACCOUNT_LEVEL) return null;
  return v;
};

const noCompany = (res: Response) =>
  res
    .status(401)
    .json({ success: false, message: "Company not found in session" });

const bad = (res: Response, message: string, status = 400) =>
  res.status(status).json({ success: false, message });

// ============================================================
// GET /api/chart-of-accounts
// ============================================================
export const getChartOfAccountTree = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const { CoID } = getSession(req);
    if (!CoID) return noCompany(res);

    const result = await pool.query(
      `SELECT faccountid, faccountname, faccountgroupid, faccountlevel
     FROM dbo.tblaccount
    WHERE fcoid = $1
    ORDER BY faccountid`,
      [CoID],
    );

    const data = result.rows.map((r) => ({
      accountId: r.faccountid,
      accountName: r.faccountname,
      accountGroupId: r.faccountgroupid,
      accountLevel: r.faccountlevel,
    }));

    return res.status(200).json({ success: true, count: data.length, data });
  } catch (error) {
    console.error("getChartOfAccountTree error:", error);
    return bad(res, "Failed to fetch chart of accounts", 500);
  }
};

// ============================================================
// GET /api/chart-of-accounts/next-id?accountGroupId=1010000&accountGroupLevel=3
// Port of objCommon.GetNextAccountID(groupId, groupLevel)
// ============================================================
export const getNextAccountId = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const { CoID } = getSession(req);
    if (!CoID) return noCompany(res);

    const groupId = String(req.query.accountGroupId ?? "").trim();
    const groupLevel = Number(req.query.accountGroupLevel);

    if (!groupId) return bad(res, "accountGroupId is required");
    if (!Number.isInteger(groupLevel) || groupLevel < 1)
      return bad(res, "accountGroupLevel is required");
    if (groupLevel + 1 > MAX_ACCOUNT_LEVEL)
      return bad(res, "Cannot add an account under this level");

    const nextAccountId = await generateNextAccountId(
      CoID,
      groupId,
      groupLevel,
    );
    if (!nextAccountId)
      return bad(res, "Unable to Generate New Account ID", 409);

    return res.status(200).json({ success: true, data: { nextAccountId } });
  } catch (error) {
    console.error("getNextAccountId error:", error);
    return bad(res, "Failed to generate next account ID", 500);
  }
};

// ============================================================
// GET /api/chart-of-accounts/:accountId
// Returns the account plus its parent group info. For "Add", call this
// with the PARENT id: you get its level/type and use accountLevel + 1.
// ============================================================
export const getChartOfAccount = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const { CoID } = getSession(req);
    if (!CoID) return noCompany(res);

    const accountId = String(req.params.accountId ?? "").trim();
    if (!accountId) return bad(res, "accountId is required");

    const r = await pool.query(
      `SELECT * FROM dbo.tblaccount WHERE fcoid = $1 AND faccountid = $2`,
      [CoID, accountId],
    );
    if (r.rows.length === 0) return bad(res, "Account not found", 404);

    const row = r.rows[0];
    const accountTypeId = await getAccountTypeId(CoID, accountId);
    const level = await getAccountLevel(CoID, accountId);

    const groupId = await getParentAccountId(CoID, accountId);
    const groupName = groupId
      ? await getAccountName(CoID, groupId, accountTypeId)
      : "";
    const groupLevel = groupId ? await getAccountLevel(CoID, groupId) : null;

    // VB: objCommon.HaveCC(accountId)  -> column name assumed: fhavecc
    const haveCC = Boolean(row.fhavecc);

    return res.status(200).json({
      success: true,
      data: {
        accountId: row.faccountid,
        accountName: row.faccountname,
        accountNameA: row.faccountname_a ?? "",
        groupOrHead: row.fgrouporhead ?? "",
        accountLevel: level,
        accountTypeId,
        haveCC,
        accountGroupId: groupId,
        accountGroupName: groupName,
        accountGroupLevel: groupLevel,
      },
    });
  } catch (error) {
    console.error("getChartOfAccount error:", error);
    return bad(res, "Failed to fetch account", 500);
  }
};

// ============================================================
// POST /api/chart-of-accounts   (mode 'S')
// body: { accountGroupId, accountName, haveCC?, autoId?, accountId?, menuName? }
//   autoId true (default) -> id generated server-side
//   autoId false          -> accountId required (Manual)
// accountType and level are derived from the parent group.
// ============================================================
export const createChartOfAccount = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const { CoID, userId } = getSession(req);
    if (!CoID) return noCompany(res);

    const body = req.body ?? {};
    const groupId = String(body.accountGroupId ?? "").trim();
    const accountName = String(body.accountName ?? "").trim();
    const autoId = body.autoId !== false;
    const haveCC =
      body.haveCC === true || body.haveCC === 1 || body.haveCC === "Yes";

    if (!groupId) return bad(res, "accountGroupId is required");
    if (!accountName) return bad(res, "Please input an 'Account name'");
    const accountNameA = String(body.accountNameA ?? "").trim();

    const groupLevel = await getAccountLevel(CoID, groupId);
    if (groupLevel === null) return bad(res, "Parent account not found", 404);

    const level = groupLevel + 1;
    if (level > MAX_ACCOUNT_LEVEL)
      return bad(res, "Cannot add an account under this level");

    const accountTypeId = await getAccountTypeId(CoID, groupId);

    const groupOrHead = resolveGroupOrHead(body.groupOrHead, level);
    if (!groupOrHead)
      return bad(res, "Invalid Group/Parent/Head for this account level");

    let accountId = String(body.accountId ?? "").trim();
    if (autoId) {
      accountId = await generateNextAccountId(CoID, groupId, groupLevel);
      if (!accountId) return bad(res, "Unable to Generate New Account ID", 409);
    }

    if (!accountId) return bad(res, "Please input an 'Account ID'");
    if (accountId.length !== ACCOUNTID_LEN)
      return bad(res, `'Account ID' must be ${ACCOUNTID_LEN} characters`);

    if (await accountIdExists(CoID, accountId))
      return bad(res, "'Account ID' already exists!", 409);

    if (await accountNameExists(CoID, accountId, accountName, groupId, level))
      return bad(res, "'Account Name' already exists!", 409);

    await callApply({
      mode: "S",
      coId: CoID,
      userId,
      accountId,
      oldAccountId: groupId, // VB passes the parent id as strOldAccountID in Add mode
      accountName,
      accountGroupId: groupId,
      accountTypeId,
      accountLevel: level,
      haveCC,
      menuName: body.menuName,
      accountNameA,
      groupOrHead,
    });

    return res.status(201).json({
      success: true,
      message: "Account saved successfully",
      data: { accountId },
    });
  } catch (error: any) {
    console.error("createChartOfAccount error:", error);
    if (error?.code === "23505") return bad(res, "Account already exists", 409);
    return bad(res, "Failed to save account", 500);
  }
};

// ============================================================
// PUT /api/chart-of-accounts/:accountId   (mode 'M')
// :accountId = current id. body.accountId = (possibly changed) new id.
// body: { accountName, haveCC?, accountId?, menuName? }
// ============================================================
export const updateChartOfAccount = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const { CoID, userId } = getSession(req);
    if (!CoID) return noCompany(res);

    const oldAccountId = String(req.params.accountId ?? "").trim();
    if (!oldAccountId) return bad(res, "accountId is required");

    const body = req.body ?? {};
    const accountName = String(body.accountName ?? "").trim();
    const newAccountId = String(body.accountId ?? oldAccountId).trim();
    const haveCC =
      body.haveCC === true || body.haveCC === 1 || body.haveCC === "Yes";

    const level = await getAccountLevel(CoID, oldAccountId);
    if (level === null) return bad(res, "Account not found", 404);
    if (level === ROOT_LEVEL)
      return bad(res, "This account cannot be modified", 403);

    if (!accountName) return bad(res, "Please input the 'Account Name'");
    const accountNameA = String(body.accountNameA ?? "").trim();
    const groupOrHead = resolveGroupOrHead(body.groupOrHead, level);
    if (!groupOrHead)
      return bad(res, "Invalid Group/Parent/Head for this account level");

    if (newAccountId.length !== ACCOUNTID_LEN)
      return bad(res, `'Account ID' must be ${ACCOUNTID_LEN} characters`);

    if (
      newAccountId !== oldAccountId &&
      (await accountIdExists(CoID, newAccountId))
    )
      return bad(res, "'Account ID' already exists!", 409);

    const groupId = await getParentAccountId(CoID, oldAccountId);
    const accountTypeId = await getAccountTypeId(CoID, oldAccountId);

    if (
      await accountNameExists(CoID, oldAccountId, accountName, groupId, level)
    )
      return bad(res, "'Account Name' already exists!", 409);

    await callApply({
      mode: "M",
      coId: CoID,
      userId,
      accountId: newAccountId,
      oldAccountId,
      accountName,
      accountGroupId: groupId,
      accountTypeId,
      accountLevel: level,
      haveCC,
      menuName: body.menuName,
      accountNameA,
      groupOrHead,
    });

    return res.status(200).json({
      success: true,
      message: "Account modified successfully",
      data: { accountId: newAccountId },
    });
  } catch (error: any) {
    console.error("updateChartOfAccount error:", error);
    if (error?.code === "23505") return bad(res, "Account already exists", 409);
    return bad(res, "Failed to modify account", 500);
  }
};

// ============================================================
// DELETE /api/chart-of-accounts/:accountId   (mode 'D')
// Port of ValidateMe("D") -> objCommon.CanDeleteAccount (see notes)
// ============================================================
export const deleteChartOfAccount = async (
  req: AuthenticatedRequest,
  res: Response,
) => {
  try {
    const { CoID, userId } = getSession(req);
    if (!CoID) return noCompany(res);

    const accountId = String(req.params.accountId ?? "").trim();
    if (!accountId) return bad(res, "accountId is required");

    const level = await getAccountLevel(CoID, accountId);
    if (level === null) return bad(res, "Account not found", 404);
    if (level === ROOT_LEVEL)
      return bad(res, "This account cannot be deleted", 403);

    // Can't delete a group that still has child accounts
    const child = await pool.query(
      `SELECT 1 FROM dbo.tblaccount
        WHERE fcoid = $1 AND faccountgroupid = $2 LIMIT 1`,
      [CoID, accountId],
    );
    if (child.rows.length > 0)
      return bad(res, "Account has sub accounts and cannot be deleted", 409);

    const groupId = await getParentAccountId(CoID, accountId);
    const accountTypeId = await getAccountTypeId(CoID, accountId);
    const accountName = await getAccountName(CoID, accountId, accountTypeId);

    await callApply({
      mode: "D",
      coId: CoID,
      userId,
      accountId,
      oldAccountId: accountId,
      accountName,
      accountGroupId: groupId,
      accountTypeId,
      accountLevel: level,
      haveCC: false,
      menuName:
        req.body?.menuName ?? (req.query.menuName as string | undefined),
    });

    return res
      .status(200)
      .json({ success: true, message: "Account deleted successfully" });
  } catch (error: any) {
    console.error("deleteChartOfAccount error:", error);
    // 23503 = foreign_key_violation (account used in transactions)
    if (error?.code === "23503")
      return bad(res, "Account is in use and cannot be deleted", 409);
    return bad(res, "Failed to delete account", 500);
  }
};
