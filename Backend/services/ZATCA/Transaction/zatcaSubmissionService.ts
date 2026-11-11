import type { PoolClient } from "pg";
import pool from "../../../DB/db.js";
import {
  submitToZatca,
  type ZatcaSubmitDocument,
} from "./zatcaGateway.js";

/* =========================================================
   ZATCA SUBMISSION - calls dbo.sp_pagezatcafilesubmission (mode G) for the
   list, then submits each ticked document (port of clsZATCAFileSubmission)
========================================================= */

export type ZatcaSearchParams = {
  coId: string;
  year: string;
  docMode: "one" | "all"; // rdgDocument 0 / 1
  docType?: string | null; // SI | SR | DN | CN
  branchId?: string | null; // null = all branches
  customerId?: string | null; // null = all customers
  filterBy: "no" | "date"; // rdgIDorDate
  fromDocNo?: string | null;
  toDocNo?: string | null;
  dateBasis: "issue" | "document";
  fromDate?: string | null; // yyyy-mm-dd
  toDate?: string | null; // yyyy-mm-dd
};

export type ZatcaSubmissionRow = {
  fcoid: string;
  fyear: string;
  fbrid: string;
  forigdoctype: string | null;
  fdoctype: string;
  fdocno: string;
  fdoctypeno: string;
  fslno: number;
  fcustomerid: string;
  fcustomertypeid: string | null;
  faccountname: string | null;
  fbillingamtwovat: string;
  fscvatamt: string;
  fbillingamt: string;
  fdate: string;
  finvdatetime: string | null;
  finvrcntype: string | null;
};

export type ZatcaSubmitContext = { coId: string; year: string; userId: string };

export type ZatcaSubmitResult = {
  docNo: string;
  docType: string;
  brId: string;
  status: "CLEARED" | "REPORTED" | "ALREADY_SUBMITTED" | "REJECTED" | "ERROR";
  message?: string;
};

/* =========================================================
   LOOKUPS
========================================================= */

export async function getZATCABranchListService(
  PstrCoID: string,
  PstrUserID: string
): Promise<{ fbrid: string; fbrname: string }[]> {
  const result = await pool.query(
    `SELECT fbrname, fbrid FROM dbo.fillbranchofuser($1::varchar, $2::varchar)`,
    [PstrCoID, PstrUserID]
  );
  return result.rows;
}

export async function getZATCACustomerListService(
  PstrCoID: string
): Promise<{ fcsaccountid: string; fcsaccountname: string }[]> {
  const result = await pool.query(
    `SELECT fcsaccountid, fcsaccountname FROM dbo.filllookupcustomerid($1::varchar)`,
    [PstrCoID]
  );
  return result.rows;
}

export async function getZATCADocumentTypeListService(
  PstrCoID: string
): Promise<{ fpid: string; fpname: string }[]> {
  const result = await pool.query(
    `SELECT fpid, fpname FROM dbo.filllookupzatcastockparam($1::varchar)`,
    [PstrCoID]
  );
  return result.rows;
}

/* =========================================================
   FILTERS - the proc takes WHERE-clause text, so every value is validated /
   escaped here and the column names are fixed
========================================================= */

const ID_RE = /^[A-Za-z0-9._\-/]{1,20}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const lit = (v: string): string => `'${v.replace(/'/g, "''")}'`;

const asId = (label: string, v: string | null | undefined): string => {
  const s = (v ?? "").trim();
  if (!ID_RE.test(s)) throw new Error(`Invalid ${label}`);
  return s;
};

const asDate = (label: string, v: string | null | undefined): string => {
  const s = (v ?? "").trim();
  if (!DATE_RE.test(s)) throw new Error(`Invalid ${label}`);
  return s;
};

function buildFilters(p: ZatcaSearchParams) {
  const co = lit(asId("company", p.coId));
  const yr = lit(asId("year", p.year));
  const stock: string[] = [`fcoid = ${co}`, `fyear = ${yr}`];
  const fin: string[] = [`fcoid = ${co}`, `fyear = ${yr}`];

  if (p.docMode === "one") {
    const t = lit(asId("document type", p.docType));
    stock.push(`fdoctype = ${t}`);
    fin.push(`fdoctype = ${t}`);
  }

  if (p.branchId) {
    const b = lit(asId("branch", p.branchId));
    stock.push(`fbrid = ${b}`);
    fin.push(`fbrid = ${b}`);
  }

  if (p.filterBy === "no") {
    const from = lit(asId("from document no.", p.fromDocNo));
    const to = lit(asId("to document no.", p.toDocNo || p.fromDocNo));
    stock.push(`fdocno >= ${from}`, `fdocno <= ${to}`);
    fin.push(`fdocno >= ${from}`, `fdocno <= ${to}`);
  } else {
    const f = lit(asDate("from date", p.fromDate));
    const t = lit(asDate("to date", p.toDate));
    if (p.dateBasis === "issue") {
      // stock.push(`finvdatetime::date >= ${f}::date`, `finvdatetime::date <= ${t}::date`);
       stock.push(`fdate::date >= ${f}::date`, `fdate::date <= ${t}::date`);
      fin.push(`fcuserdate::date >= ${f}::date`, `fcuserdate::date <= ${t}::date`);
    } else {
      stock.push(`fdate >= ${f}::date`, `fdate <= ${t}::date`);
      fin.push(`fdate >= ${f}::date`, `fdate <= ${t}::date`);
    }
  }

  if (p.customerId) {
    const c = lit(asId("customer", p.customerId));
    stock.push(`faccountid = ${c}`);
    fin.push(`faccountid = ${c}`);
  }

  return { filter: stock.join(" AND "), finFilter: fin.join(" AND ") };
}

/* =========================================================
   SEARCH (sp_pagezatcafilesubmission, mode G) - a refcursor, so one
   transaction: CALL, then FETCH ALL
========================================================= */

export async function getZATCASubmissionListService(
  p: ZatcaSearchParams
): Promise<ZatcaSubmissionRow[]> {
  const { filter, finFilter } = buildFilters(p);
  const client: PoolClient = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query(
      `CALL dbo.sp_pagezatcafilesubmission($1, $2::smallint, $3, $4, $5, 'zatcafilesubmission_cursor')`,
      [
        "G",
        p.docMode === "one" ? 0 : 1,
        p.docMode === "one" ? p.docType : null,
        filter,
        finFilter,
      ]
    );
    const result = await client.query(`FETCH ALL FROM "zatcafilesubmission_cursor"`);
    await client.query("COMMIT");
    return result.rows as ZatcaSubmissionRow[];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/* =========================================================
   SUBMIT (CreateZATCAFile for each ticked document)
========================================================= */

async function scalar(sql: string, params: unknown[]): Promise<string> {
  const result = await pool.query(sql, params);
  const value = result.rows[0] ? Object.values(result.rows[0])[0] : "";
  return value == null ? "" : String(value);
}

// SP_frmZATCAFileHistory: mode S = the history row, mode M = marks the document
async function saveHistory(
  mode: "S" | "M",
  ctx: ZatcaSubmitContext,
  doc: ZatcaSubmitDocument,
  h: {
    invoiceHash: string;
    xmlHash: string;
    qrCode: string;
    sequenceNo: number;
    status: string;
  } | null
): Promise<void> {
  await pool.query(
    `CALL dbo.sp_pagezatcafilehistory($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
    [
      mode,
      ctx.coId,
      Number(ctx.year),
      doc.brId,
      doc.docType,
      doc.docNo,
      h?.invoiceHash ?? null,
      h?.xmlHash ?? null,
      h?.qrCode ?? null,
      h?.sequenceNo ?? null,
      h?.status ?? null,
      ctx.userId,
    ]
  );
}

export async function submitZATCADocumentsService(
  docs: ZatcaSubmitDocument[],
  ctx: ZatcaSubmitContext
): Promise<{ accepted: number; rejected: number; results: ZatcaSubmitResult[] }> {
  const { coId, year } = ctx;

  const [
    folder,
    privateKey,
    certificate,
    csrData,
    clearanceUrl,
    reportingUrl,
    binaryToken,
    secret,
  ] = await Promise.all([
    scalar(`SELECT fzatcafilepath FROM dbo.tblzatcafile WHERE fcoid = $1`, [coId]),
    scalar(`SELECT dbo.getzatcaprivatekey($1)`, [coId]),
    scalar(`SELECT dbo.getzatcacertificate($1)`, [coId]),
    scalar(`SELECT dbo.getzatcacsrdata($1)`, [coId]),
    scalar(`SELECT dbo.getzatcainvoiceclearanceurl($1)`, [coId]),
    scalar(`SELECT dbo.getzatcainvoicereportingurl($1)`, [coId]),
    scalar(`SELECT dbo.getzatcaproductioncsbinarytoken($1)`, [coId]),
    scalar(`SELECT dbo.getzatcaproductioncssecret($1)`, [coId]),
  ]);

  if (!folder.trim()) {
    throw new Error("ZATCA file path is not configured (tblzatcafile)");
  }

  // one entry per branch + type + no (the old DefaultView.ToTable(True, ...))
  const seen = new Set<string>();
  const unique = docs.filter((d) => {
    const key = `${d.brId}|${d.docType}|${d.docNo}`;
    if (!d.docNo || seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const results: ZatcaSubmitResult[] = [];
  let accepted = 0;
  let rejected = 0;

  for (const doc of unique) {
    const base = { docNo: doc.docNo, docType: doc.docType, brId: doc.brId };

    try {
      const exists = await pool.query(
        `
        SELECT 1 FROM dbo.tblzatcafilehistory
        WHERE fcoid = $1 AND fyear = $2 AND fbrid = $3
          AND fdoctype = $4 AND fdocno = $5 AND fintsequenceno <> 0
        LIMIT 1
        `,
        [coId, year, doc.brId, doc.docType, doc.docNo]
      );

      if (exists.rowCount) {
        results.push({ ...base, status: "ALREADY_SUBMITTED" });
        continue;
      }

      const counterValue = Number(
        (await scalar(`SELECT dbo.getzatcainvoicecountervalue($1,$2)`, [
          coId,
          doc.docType,
        ])) || 0
      );
      const previousInvoiceHash = await scalar(`SELECT dbo.getzatcapih($1,$2)`, [
        coId,
        doc.docType,
      ]);
      const customerType = await scalar(`SELECT dbo.getcustomertype($1,$2)`, [
        coId,
        doc.customerId,
      ]);

      const out = await submitToZatca({
        doc,
        customerType,
        counterValue,
        previousInvoiceHash,
        privateKey,
        certificate,
        csrData,
        clearanceUrl,
        reportingUrl,
        binaryToken,
        secret,
        outputFolder: folder.trim(),
      });

      if (out.status === "CLEARED" || out.status === "REPORTED") {
        accepted += 1;
        await saveHistory("S", ctx, doc, {
          invoiceHash: out.invoiceHash ?? "",
          xmlHash: out.xmlHash ?? "",
          qrCode: out.qrCode ?? "",
          sequenceNo: counterValue,
          status: out.status,
        });
        await saveHistory("M", ctx, doc, null);
        results.push({ ...base, status: out.status });
      } else {
        rejected += 1;
        await saveHistory("S", ctx, doc, {
          invoiceHash: "",
          xmlHash: "",
          qrCode: "",
          sequenceNo: 0,
          status: out.message ?? "Rejected",
        });
        results.push({ ...base, status: "REJECTED", message: out.message });
      }
    } catch (error: unknown) {
      rejected += 1;
      results.push({
        ...base,
        status: "ERROR",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return { accepted, rejected, results };
}
