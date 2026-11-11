import type { PoolClient } from "pg";
import pool from "../../../DB/db.js";

/* =========================================================
   ZATCA DOCUMENT STATUS REPORT - calls dbo.sp_rptzatcadoxstatus
   (port of rptZATCADoxStatus / SP_rptZATCAFileStatus)
========================================================= */

export type ZatcaDocStatusParams = {
  coId: string;
  branchMode: "one" | "all"; // rdgBranch 0 / 1
  branchId?: string | null;
  clearType: 0 | 1; // rdgClear: 0 = Cleared, 1 = Not Cleared
  fromDate: string; // DD/MM/YYYY
  toDate: string; // DD/MM/YYYY
  // rdgDate (0 submission, 1 issue, 2 document) and "Exclude Inter Company"
  dateType?: 0 | 1 | 2;
  excludeInterCompany?: boolean;
};

export type ZatcaDocStatusRow = {
  branchId: string;
  docType: string;
  docNo: string;
  docDate: string; // dd-MM-yyyy
  issueTime: string; // dd-MM-yyyy HH:mm:ss ("" - the SP does not return it)
  submitTime: string; // dd-MM-yyyy HH:mm:ss
  customerId: string;
  customerName: string;
  amountExVat: number;
  vatAmount: number;
  amountInVat: number;
  cleared: boolean;
};

export type ZatcaDocStatusResult = {
  rows: ZatcaDocStatusRow[];
  totals: { amountExVat: number; vatAmount: number; amountInVat: number };
};

const CURSOR = "zatcadoxstatus_cursor";

/* =========================================================
   LOOKUPS
========================================================= */

export async function getZATCAStatusBranchListService(
  PstrCoID: string,
  PstrUserID: string
): Promise<{ fbrid: string; fbrname: string }[]> {
  const result = await pool.query(
    `SELECT fbrname, fbrid FROM dbo.fillbranchofuser($1::varchar, $2::varchar)`,
    [PstrCoID, PstrUserID]
  );
  return result.rows;
}

// the company name the old report took from the application (objCommon.CoName)
export async function getZATCAStatusCompanyNameService(PstrCoID: string): Promise<string> {
  const result = await pool.query(
    `SELECT fconame FROM dbo.tblcompany WHERE fcoid = $1`,
    [PstrCoID]
  );
  return String(result.rows[0]?.fconame ?? "").trim();
}

/* =========================================================
   FORMATTING - done here so the page never shifts a timestamp across time zones
========================================================= */

const p2 = (n: number): string => String(n).padStart(2, "0");

const toDateObj = (v: unknown): Date | null => {
  if (v == null || v === "") return null;
  const d = v instanceof Date ? v : new Date(String(v));
  return Number.isNaN(d.getTime()) ? null : d;
};

const fmtDate = (v: unknown): string => {
  const d = toDateObj(v);
  return d ? `${p2(d.getDate())}-${p2(d.getMonth() + 1)}-${d.getFullYear()}` : "";
};

const fmtDateTime = (v: unknown): string => {
  const d = toDateObj(v);
  return d
    ? `${fmtDate(d)} ${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())}`
    : "";
};

const num = (v: unknown): number => {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
};

const str = (v: unknown): string => (v == null ? "" : String(v));

/* =========================================================
   REPORT (a refcursor, so one transaction: CALL, then FETCH ALL)
========================================================= */

export async function getZATCADocumentStatusService(
  p: ZatcaDocStatusParams
): Promise<ZatcaDocStatusResult> {
  const client: PoolClient = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query(
      `CALL dbo.sp_rptzatcadoxstatus($1::varchar, $2::smallint, $3::varchar, $4::smallint, $5::varchar, $6::varchar, $7::smallint, $8::boolean, '${CURSOR}')`,
      [
        p.coId,
        p.branchMode === "one" ? 0 : 1,
        p.branchMode === "one" ? p.branchId : null,
        p.clearType,
        p.fromDate,
        p.toDate,
        p.dateType ?? 1,
        p.excludeInterCompany ?? true,
      ]
    );
    const result = await client.query(`FETCH ALL FROM "${CURSOR}"`);
    await client.query("COMMIT");

    const rows: ZatcaDocStatusRow[] = result.rows.map((r) => ({
      branchId: str(r.fbrid),
      docType: str(r.finvtype),
      docNo: str(r.finvno),
      docDate: fmtDate(r.finvdate),
      issueTime: fmtDateTime(r.finvdatetime), // not in the SP's result today
      submitTime: fmtDateTime(r.fsubmitdate),
      customerId: str(r.fcustomerid),
      customerName: str(r.fcustomername),
      amountExVat: num(r.fbillingamtwovat),
      vatAmount: num(r.fscvatamt),
      amountInVat: num(r.fbillingamt),
      cleared: !!r.fzatcacleared,
    }));

    // summed in cents so 0.1 + 0.2 style drift never reaches the report
    const cents = (pick: (r: ZatcaDocStatusRow) => number): number =>
      rows.reduce((s, r) => s + Math.round(pick(r) * 100), 0) / 100;

    return {
      rows,
      totals: {
        amountExVat: cents((r) => r.amountExVat),
        vatAmount: cents((r) => r.vatAmount),
        amountInVat: cents((r) => r.amountInVat),
      },
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
