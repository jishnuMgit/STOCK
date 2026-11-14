/* =========================================================
   ZATCA GATEWAY - what clsZATCAFileSubmission.vb did for ONE document:

     CreateZATCAFile  -> pick the builder, fetch the data, write the UBL XML
     RearrangeXML     -> IssueTime cut to HH:mm:ss (done inside the builder)
     doSigning        -> sign with the ZATCA SDK, read UUID / invoice hash
     doClearXML       -> B2B  : POST clearance, save the cleared XML
     doReportXML      -> other: POST reporting, keep the signed XML

   The caller (zatcaSubmissionService) writes the history rows (ApplyZATCAFile /
   ApplyZATCAFileHistory) from the output of this function.
========================================================= */

import { randomUUID } from "node:crypto";
import { copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import pool from "../../../../DB/db.js";
import {
  KIND_SPECS,
  buildInvoiceXml,
  pickInvoiceKind,
  type DataProc,
  type Row,
} from ".././zatcaXmlBuilder.js";
import { getZatcaSigner } from ".././zatcaSigner.js";

export type ZatcaSubmitDocument = {
  brId: string;
  docType: string;
  origDocType?: string | null;
  docNo: string;
  invRcnType?: string | null;
  customerId: string;
  docDate: string; // yyyy-mm-dd
  invDateTime: string; // yyyy-mm-dd hh:mm:ss
};

export type ZatcaSubmitInput = {
  coId: string;
  year: string;
  doc: ZatcaSubmitDocument;
  customerType: string; // "B2B" = clearance, anything else = reporting
  counterValue: number;
  previousInvoiceHash: string;
  privateKey: string;
  certificate: string;
  csrData: string;
  clearanceUrl: string;
  reportingUrl: string;
  binaryToken: string;
  secret: string;
  outputFolder: string;
};

export type ZatcaSubmitOutput = {
  status: "CLEARED" | "REPORTED" | "REJECTED";
  xmlHash?: string; // base64 of the signed XML that was sent (the VB's _xmlHash)
  invoiceHash?: string;
  qrCode?: string;
  message?: string; // full reason, shown to the user
  rejectStatus?: string; // short label stored in the history (Unauthorized, BadRequest ...)
  outputFile?: string; // final XML on disk
  dryRun?: boolean; // ZATCA_DRY_RUN: nothing was sent to ZATCA (the caller must not save history)
};

/* =========================================================
   DRY RUN (testing the XML without posting to ZATCA)
     ZATCA_DRY_RUN=1    everything runs as usual (data, XML, signing) but the POST to ZATCA is
                        replaced by a made-up "accepted" answer. The files are written, the
                        history is NOT saved, so the documents stay pending and can be tried again.
     ZATCA_SKIP_SIGN=1  (only together with ZATCA_DRY_RUN) also skips the signing, so no ZATCA SDK
                        is needed: the saved file is the unsigned XML.
   Never set these on the production server.
========================================================= */

const DRY_RUN = process.env.ZATCA_DRY_RUN === "1";
const SKIP_SIGN = DRY_RUN && process.env.ZATCA_SKIP_SIGN === "1";

const fakeAcceptedCall = (isClearance: boolean, signedBase64: string): ApiCall => ({
  httpStatus: 200,
  text: "",
  json: isClearance
    ? { clearanceStatus: "CLEARED", clearedInvoice: signedBase64 }
    : { reportingStatus: "REPORTED" },
});

/* =========================================================
   DATA (the GetData_* functions)
   One refcursor procedure per data source, same pattern as
   sp_pagezatcafilesubmission: CALL, then FETCH ALL, in one transaction.
   Parameters (all varchar): coid, year, branch, doc type, doc no, INOUT cursor.
========================================================= */

export const DATA_PROCS: Record<DataProc, string> = { 
  SI: "sp_pagezatcasi", // credit sales invoice  
  SR: "sp_pagezatcasr", // credit sales return
  DNCN: "sp_pagezatcadncn",
};

async function fetchDocumentRows(
  proc: DataProc,
  coId: string,
  year: string,
  doc: ZatcaSubmitDocument
): Promise<Row[]> {
  const cursor = "zatca_document_cursor";
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query(`CALL dbo.${DATA_PROCS[proc]}($1, $2, $3, $4, $5, '${cursor}')`, [
      coId,
      year,
      doc.brId,
      doc.docType,
      doc.docNo,
    ]);
    const result = await client.query(`FETCH ALL FROM "${cursor}"`);
    await client.query("COMMIT");
    return result.rows as Row[];
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

/* =========================================================
   ZATCA API (doClearXML / doReportXML)
========================================================= */

type ZatcaMessage = { type?: string; code?: string; category?: string; message?: string; status?: string };

type ZatcaApiResponse = {
  clearanceStatus?: string;
  reportingStatus?: string;
  clearedInvoice?: string; // base64 of the cleared XML
  validationResults?: {
    status?: string;
    infoMessages?: ZatcaMessage[];
    warningMessages?: ZatcaMessage[];
    errorMessages?: ZatcaMessage[];
  };
  message?: string;
  error?: string;
};

type ApiCall = { httpStatus: number; json: ZatcaApiResponse | null; text: string };

async function postToZatca(
  url: string,
  binaryToken: string,
  secret: string,
  body: { invoiceHash: string; uuid: string; invoice: string }
): Promise<ApiCall> {
  if (!url.trim()) throw new Error("ZATCA URL is not configured for this company");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60_000);

  try {
    const response = await fetch(url.trim(), {
      method: "POST",
      headers: {
        "Accept-Version": "V2",
        "Accept-Language": "en",
        "Clearance-Status": "1",
        Authorization: `Basic ${Buffer.from(`${binaryToken}:${secret}`, "utf8").toString("base64")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const text = await response.text();
    let json: ZatcaApiResponse | null = null;
    try {
      json = text ? (JSON.parse(text) as ZatcaApiResponse) : null;
    } catch {
      json = null;
    }
    return { httpStatus: response.status, json, text };
  } finally {
    clearTimeout(timer);
  }
}

// the same labels the VB wrote into the history status column
const httpLabel = (status: number): string => {
  switch (status) {
    case 401:
      return "Unauthorized";
    case 500:
      return "InternalServerError";
    case 400:
      return "BadRequest";
    default:
      return "Unknown";
  }
};

const apiProblems = (r: ApiCall): string => {
  const parts: string[] = [];
  const v = r.json?.validationResults;

  for (const m of v?.errorMessages ?? []) {
    parts.push([m.code, m.message].filter(Boolean).join(": "));
  }
  if (r.json?.message) parts.push(r.json.message);
  if (r.json?.error) parts.push(r.json.error);

  if (!parts.length && r.text && !r.json) parts.push(r.text.slice(0, 300));
  return parts.join("; ");
};

/* =========================================================
   FILE HELPERS
========================================================= */

// folder names exactly as the VB code created them
const typeFolder = (docType: string): string => {
  switch (docType) {
    case "SI":
      return "SALES INVOICE CREDIT";
    case "SR":
      return "SALES RETURN CREDIT";
    case "DN":
      return "DEBIT NOTE";
    default:
      return "CREDIT NOTE";
  }
};

const safeName = (s: string): string => s.replace(/[\\/:*?"<>|]/g, "_");

// <docno>_<coid>_<yyyymmdd>T<HHmmss>
const baseFileName = (coId: string, doc: ZatcaSubmitDocument): string => {
  const time = /(\d{2}):(\d{2}):(\d{2})/.exec(doc.invDateTime);
  const hhmmss = time ? `${time[1]}${time[2]}${time[3]}` : "000000";
  return `${safeName(doc.docNo)}_${safeName(coId)}_${doc.docDate.replace(/-/g, "")}T${hhmmss}`;
};

const firstMatch = (xml: string, re: RegExp): string => re.exec(xml)?.[1]?.trim() ?? "";

// invoice UUID - the first cbc:UUID in the file (the ICV one comes later)
const uuidOf = (xml: string): string => firstMatch(xml, /<cbc:UUID>([^<]+)<\/cbc:UUID>/);

// digest of the invoice itself = the invoiceHash the API expects (SignedInfo, Id="invoiceSignedData")
const invoiceHashOf = (xml: string): string =>
  firstMatch(
    xml,
    /<ds:Reference[^>]*Id="invoiceSignedData"[^>]*>[\s\S]*?<ds:DigestValue>([^<]+)<\/ds:DigestValue>/
  );

// QR (AdditionalDocumentReference with ID = QR)
const qrOf = (xml: string): string =>
  firstMatch(
    xml,
    /<cbc:ID>QR<\/cbc:ID>[\s\S]*?<cbc:EmbeddedDocumentBinaryObject[^>]*>([^<]*)<\/cbc:EmbeddedDocumentBinaryObject>/
  );

/* =========================================================
   SUBMIT ONE DOCUMENT
========================================================= */

export async function submitToZatca(input: ZatcaSubmitInput): Promise<ZatcaSubmitOutput> {
  const { coId, year, doc, customerType } = input;
  const isClearance = customerType === "B2B";

  const reject = (message: string, rejectStatus: string): ZatcaSubmitOutput => ({
    status: "REJECTED",
    message,
    rejectStatus,
  });

  /* ---- 1. build the XML (CreateZATCAFile) ---- */
  const kind = pickInvoiceKind(customerType, doc.docType);
  const rows = await fetchDocumentRows(KIND_SPECS[kind].proc, coId, year, doc);
  if (!rows.length) {
    throw new Error(`No data found for ${doc.docType} ${doc.docNo} (branch ${doc.brId})`);
  }

  const xml = buildInvoiceXml(kind, rows, {
    uuid: randomUUID(),
    counterValue: input.counterValue,
    previousInvoiceHash: input.previousInvoiceHash,
  });

  const folder = input.outputFolder;
  await mkdir(folder, { recursive: true });

  const base = baseFileName(coId, doc);
  const unsignedPath = path.join(folder, `${base}.xml`);
  const signedPath = path.join(folder, `${base}_signed.xml`);

  await writeFile(unsignedPath, xml, "utf8");

  try {
    /* ---- 2. sign (doSigning) ---- */
    try {
      if (SKIP_SIGN) {
        await copyFile(unsignedPath, signedPath);
      } else {
        await getZatcaSigner().sign({
          unsignedPath,
          signedPath,
          certificate: input.certificate,
          privateKey: input.privateKey,
        });
      }
    } catch (error: unknown) {
      return reject(error instanceof Error ? error.message : String(error), "SigningFailed");
    }

    const signedBytes = await readFile(signedPath);
    const signedXml = signedBytes.toString("utf8");

    const uuid = uuidOf(signedXml);
    // an unsigned file has no signature digest: a placeholder is enough for the dry run
    const invoiceHash = invoiceHashOf(signedXml) || (SKIP_SIGN ? "DRY-RUN-NOT-SIGNED" : "");
    const xmlHash = signedBytes.toString("base64");

    if (!uuid || !invoiceHash) {
      return reject("Signed XML has no UUID / invoice hash", "HashingFailed");
    }

    /* ---- 3. clearance (B2B) or reporting (everything else) ---- */
    const call = DRY_RUN
      ? fakeAcceptedCall(isClearance, xmlHash)
      : await postToZatca(
          isClearance ? input.clearanceUrl : input.reportingUrl,
          input.binaryToken,
          input.secret,
          { invoiceHash, uuid, invoice: xmlHash }
        );

    const accepted =
      (call.httpStatus === 200 || call.httpStatus === 202) &&
      (isClearance
        ? call.json?.clearanceStatus === "CLEARED"
        : call.json?.reportingStatus === "REPORTED");

    if (!accepted) {
      const label =
        call.httpStatus === 200 || call.httpStatus === 202
          ? (isClearance ? call.json?.clearanceStatus : call.json?.reportingStatus) ?? "NotAccepted"
          : httpLabel(call.httpStatus);
      const detail = apiProblems(call);
      return reject(detail ? `${label}: ${detail}` : label, label);
    }

    /* ---- 4. keep the result ---- */
    const status = isClearance ? "CLEARED" : "REPORTED";
    const outFolder = path.join(folder, status, typeFolder(doc.docType));
    await mkdir(outFolder, { recursive: true });

    const outFile = path.join(outFolder, `${base}_signed_${isClearance ? "Cleared" : "Reported"}.xml`);

    if (isClearance) {
      if (!call.json?.clearedInvoice) {
        return reject("ZATCA cleared the invoice but returned no cleared XML", "NoClearedInvoice");
      }
      await writeFile(outFile, Buffer.from(call.json.clearedInvoice, "base64"));
    } else {
      await writeFile(outFile, signedBytes);
    }

    const finalXml = await readFile(outFile, "utf8");
    await rm(signedPath, { force: true });

    return {
      status,
      xmlHash,
      invoiceHash,
      qrCode: qrOf(finalXml),
      outputFile: outFile,
      dryRun: DRY_RUN || undefined,
    };
  } finally {
    await rm(unsignedPath, { force: true });
  }
}
