import type { PoolClient } from "pg";
import pool from "../../../DB/db.js";

/* =========================================================
   ZATCA PDF/A3 PENDING - calls dbo.sp_pagezatcapdfa3pending
   (port of frmZATCAPDFA3Pending / clsZATCAPDFA3Pending)
   Lookups are the same functions as the ZATCA Submission page.
========================================================= */

export type ZatcaPdfA3Params = {
  coId: string;
  year: string;
  documentMode: "one" | "all"; // rdgDocument 0 / 1
  invType?: string | null; // fPID of the INVDT parameter (one document)
  branchMode: "one" | "all"; // rdgBranch 0 / 1
  branchId?: string | null;
  invoiceMode: "id" | "date"; // rdgIDorDate 0 / 1
  fromInvoiceNo: string;
  toInvoiceNo: string;
  fromDate: string; // DD/MM/YYYY
  toDate: string; // DD/MM/YYYY
  customerMode: "one" | "all"; // rdgCustomer 0 / 1
  customerId?: string | null;
};

export type ZatcaPdfA3Row = {
  slNo: number;
  branchId: string;
  docType: string;
  origDocType: string;
  docNo: string;
  docTypeNo: string;
  docDate: string; // dd-MM-yyyy
  issueTime: string; // dd-MM-yyyy HH:mm:ss
  customerId: string;
  customerName: string;
  amountExVat: number;
  vatAmount: number;
  amountInVat: number;
  invRcnType: string;
};

const CURSOR = "zatcapdfa3pending_cursor";

/* =========================================================
   LOOKUPS (same functions as ZATCA Submission)
========================================================= */

const text = (v: unknown): string => String(v ?? "").trim();

export async function getZatcaPdfA3BranchListService(
  coId: string,
  userId: string
): Promise<{ brId: string; brName: string }[]> {
  // FUNCTION returning (fbrname, fbrid) - only the branches the user has a right to
  const { rows } = await pool.query(
    `SELECT * FROM dbo.fillbranchofuser($1::varchar, $2::varchar)`,
    [coId, userId]
  );
  return rows
    .map((r) => ({ brId: text(r.fbrid), brName: text(r.fbrname) }))
    .filter((b) => b.brId !== "");
}

export async function getZatcaPdfA3CustomerListService(
  coId: string
): Promise<{ customerId: string; customerName: string }[]> {
  // FUNCTION returning (fcsaccountid, fcsaccountname)
  const { rows } = await pool.query(`SELECT * FROM dbo.filllookupcustomerid($1::varchar)`, [coId]);
  return rows
    .map((r) => ({
      customerId: text(r.fcsaccountid),
      customerName: text(r.fcsaccountname),
    }))
    .filter((c) => c.customerId !== "");
}

export async function getZatcaPdfA3DocTypeListService(
  coId: string
): Promise<{ pId: string; pName: string }[]> {
  // FUNCTION returning (fpid, fpname) - the INVDT parameters of the stock params
  const { rows } = await pool.query(
    `SELECT * FROM dbo.filllookupzatcastockparam($1::varchar)`,
    [coId]
  );
  return rows
    .map((r) => ({ pId: text(r.fpid), pName: text(r.fpname) }))
    .filter((d) => d.pId !== "");
}

/* =========================================================
   FILTERS
   The procedure puts p_strfilter / p_strfinfilter into dynamic SQL (as the SQL
   Server one did), so every value is escaped here and the dates / numbers are
   validated by the validator before this runs.
========================================================= */

const lit = (v: string): string => `'${v.replace(/'/g, "''")}'`;

const dateLit = (ddmmyyyy: string): string => `to_date(${lit(ddmmyyyy)}, 'DD/MM/YYYY')`;

export const buildZatcaPdfA3Filter = (p: ZatcaPdfA3Params): string => {
  const parts = [`fcoid = ${lit(p.coId)}`, `fyear = ${lit(p.year)}`];

  if (p.documentMode === "one") parts.push(`fdoctype = ${lit(p.invType ?? "")}`);
  if (p.branchMode === "one") parts.push(`fbrid = ${lit(p.branchId ?? "")}`);

  if (p.invoiceMode === "id") {
    // the numbers keep the same prefix and length, so the text range is the number range
    parts.push(
      `fdocno >= ${lit(p.fromInvoiceNo)}`,
      `fdocno <= ${lit(p.toInvoiceNo)}`,
      `length(fdocno) = ${p.fromInvoiceNo.length}`
    );
  } else {
    parts.push(`fdate::date >= ${dateLit(p.fromDate)}`, `fdate::date <= ${dateLit(p.toDate)}`);
  }

  if (p.customerMode === "one") parts.push(`faccountid = ${lit(p.customerId ?? "")}`);

  return parts.join(" AND ");
};

/* =========================================================
   FORMATTING - the procedure returns text dates, so no time-zone shift is possible
========================================================= */

const fmtYmd = (s: string): string => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : "";
};

const fmtYmdTime = (s: string): string => {
  const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}:\d{2}:\d{2})/.exec(s);
  return m ? `${m[3]}-${m[2]}-${m[1]} ${m[4]}` : fmtYmd(s);
};

const num = (v: unknown): number => {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
};

/* =========================================================
   LIST (a refcursor, so one transaction: CALL, then FETCH ALL)
========================================================= */

export async function getZatcaPdfA3PendingService(
  p: ZatcaPdfA3Params
): Promise<ZatcaPdfA3Row[]> {
  const filter = buildZatcaPdfA3Filter(p);
  const client: PoolClient = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query(
      `CALL dbo.sp_pagezatcapdfa3pending($1::varchar, $2::smallint, $3::varchar, $4::varchar, $5::varchar, $6::refcursor)`,
      [
        "G",
        p.documentMode === "one" ? 0 : 1,
        p.documentMode === "one" ? p.invType : null,
        filter,
        filter, // same columns in tblstocktrans and tblfintrans
        CURSOR,
      ]
    );
    const result = await client.query(`FETCH ALL FROM "${CURSOR}"`);
    await client.query("COMMIT");

    return result.rows.map((r) => ({
      slNo: num(r.fslno),
      branchId: text(r.fbrid),
      docType: text(r.fdoctype),
      origDocType: text(r.forigdoctype),
      docNo: text(r.fdocno),
      docTypeNo: text(r.fdoctypeno),
      docDate: fmtYmd(text(r.fdate)),
      issueTime: fmtYmdTime(text(r.finvdatetime)),
      customerId: text(r.fcustomerid),
      customerName: text(r.faccountname),
      amountExVat: num(r.fbillingamtwovat),
      vatAmount: num(r.fscvatamt),
      amountInVat: num(r.fbillingamt),
      invRcnType: text(r.finvrcntype),
    }));
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
