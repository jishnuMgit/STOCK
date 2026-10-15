// services/Finance/Report/RptCustomerListService.ts
// Data access for the Customer List REPORT page
// (port of FinBL.rptCustomerList.FillTree / Apply + SP_rptCustomerList).
import pool from "../../../DB/db.js";

export type TreeAccount = {
  accountId: string;
  accountName: string;
  accountGroupId: string | null;
  accountLevel: number;
};

export type ReportRow = {
  accountId: string;
  accountName: string;
  accountLevel: number;
  address: string;
  contact: string;
  phone: string;
  vatNo: string;
  creditLimit: number | null;
  creditDays: number | null;
};

const ACCOUNT_ID_MAX = 12; // VB: @strAccountID varchar(12)
const MAX_IDS = 20000;

const INDENT_BY_LEVEL: Record<number, number> = { 4: 5 };
const indentName = (name: string, level: number) =>
  " ".repeat(INDENT_BY_LEVEL[level] ?? 0) + (name ?? "");

export const getCustomerTree = async (coId: string): Promise<TreeAccount[]> => {
  const { rows } = await pool.query(
    `SELECT a.faccountid      AS "accountId",
            a.faccountname    AS "accountName",
            a.faccountgroupid AS "accountGroupId",
            a.faccountlevel   AS "accountLevel"
       FROM dbo.tblaccount a
       LEFT JOIN dbo.tblaccountcs b ON a.faccountid=b.fcsaccountid
      WHERE a.fcoid = $1 AND b.fcs= 'C'       
      ORDER BY a.faccountlevel, a.faccountid`,
    [coId],
  );
  return rows;
};


export const getReportRows = async (
  coId: string,
  accountIds: unknown,
): Promise<ReportRow[]> => {
  if (!Array.isArray(accountIds)) {
    throw new Error("accountIds must be a list");
  }

  const ids = [
    ...new Set(
      accountIds
        .map((id) => String(id ?? "").trim())
        .filter((id) => id !== "" && id.length <= ACCOUNT_ID_MAX),
    ),
  ];

  if (ids.length === 0) return [];
  if (ids.length > MAX_IDS) throw new Error("Too many accounts selected");

  const { rows } = await pool.query(
    `SELECT a.faccountid    AS "accountId",
            a.faccountname  AS "accountName",
            a.faccountlevel AS "accountLevel",
            b.fstreetname     AS "address",
            b.fcontact     AS "contact",
            b.fphone       AS "phone",
            b.fvatno        AS "vatNo",
            b.fcreditlimit  AS "creditLimit",
            b.fcreditdays   AS "creditDays"
       FROM dbo.tblaccount a
       LEFT JOIN dbo.tblaccountcs b on a.faccountid=b.fcsaccountid
      WHERE a.fcoid = $1
        AND a.faccountid = ANY($2::varchar[])
      ORDER BY faccountid`,
    [coId, ids],
  );


  return rows.map((r) => ({
    accountId: r.accountId,
    accountName: indentName(r.accountName, Number(r.accountLevel)),
    accountLevel: Number(r.accountLevel),
    address: r.address ?? "",
    contact: r.contact ?? "",
    phone: r.phone ?? "",
    vatNo: r.vatNo ?? "",
    // numeric columns come back from pg as strings
    creditLimit: r.creditLimit == null ? null : Number(r.creditLimit),
    creditDays: r.creditDays == null ? null : Number(r.creditDays),
  }));
};
