import fs from "node:fs/promises";
import path from "node:path";
import QRCode from "qrcode";
import puppeteer, { type Browser } from "puppeteer";
import { AFRelationship, PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { PoolClient } from "pg";
import pool from "../../../DB/db.js";

import { LAYOUTS, type LayoutName } from "./zatcaPdfA3Layouts.js";
import { buildDocumentHtml, pageLabelBox, type DataRow } from "./zatcaPdfA3Html.js";

/* =========================================================
   ZATCA PDF/A3 EXPORT (port of Export_A3PDFWithXMLAttach of frmZATCAPDFA3Pending)
   For one document: find its signed XML, draw the document as an A3 landscape PDF
   (same layouts as the VB reports), attach the XML to the PDF and save it under
   <ZATCA file path>/PDF/<document folder>/<xml file name>.pdf

   Needs:  npm i puppeteer pdf-lib qrcode   (and  npm i -D @types/qrcode)
========================================================= */

export type ExportDocInput = {
  coId: string;
  year: string;
  branchId: string;
  docType: string;
  origDocType: string;
  docNo: string;
  // the XML file to attach, when the caller already knows it (right after a submission);
  // without it the XML is searched for under the ZATCA file path
  xmlPath?: string;
};

export type ExportDocResult = {
  docNo: string;
  docType: string;
  ok: boolean;
  message: string;
  file?: string;
};

/* ---------- what each document type uses (the branches of the VB routine) ---------- */

type Source = "sir" | "srr" | "cn" | "dn";

type DocSpec = {
  layout: LayoutName;
  source: Source;
  folder: string; // the folder name under the branch folder of the XML files
  heading: string;
  invoiceType?: string; // lblInvoiceType1 of the tax invoice layout
};

const SPECS: Record<string, DocSpec> = {
  SIC: {
    layout: "SIR",
    source: "sir",
    folder: "SALES INVOICE CASH",
    heading: "TAX INVOICE - فاتورة ضريبية ",
    invoiceType: "CASH - النقدية",
  },
  SI: {
    layout: "SIR",
    source: "sir",
    folder: "SALES INVOICE CREDIT",
    heading: "TAX INVOICE - فاتورة ضريبية ",
    invoiceType: "CREDIT - أجلة",
  },
  SRC: {
    layout: "SRR",
    source: "srr",
    folder: "SALES RETURN CASH",
    heading: "CASH RETURN - مرتجع نقدي",
  },
  SR: {
    layout: "SRR",
    source: "srr",
    folder: "SALES RETURN CREDIT",
    heading: "CREDIT RETURN -  مرتجع آجل",
  },
  CN: {
    layout: "CN",
    source: "cn",
    folder: "CREDIT NOTE",
    heading: "CREDIT NOTE  - اشعار دائن",
  },
  DN: {
    layout: "DN",
    source: "dn",
    folder: "DEBIT NOTE",
    heading: "DEBIT NOTE  - إشعار مدين",
  },
};

// the Arabic captions the VB code puts on the labels
const CAPTIONS: Record<string, string> = {
  lblTaxableAmt: "إجمالي المبلغ الخاضع للضريبة",
  lblTotalVAT: "إجمالي مبلغ ضريبة  القيمة المضافة",
  lblTotalAmtDueinSAR: "المبلغ الإجمالي المستحق بالريال السعودي",
};
const INVOICE_CAPTIONS: Record<string, string> = {
  lblTotalExclVAT: "(الإجمالي (قبل ضريبة القيمة المضافة",
  lblDiscount: "الخصم",
};

/* =========================================================
   THE ZATCA FILE PATH (clsZATCAPDFA3Pending.SetZATCAFilePath)
========================================================= */

export async function getZatcaFilePathService(coId: string): Promise<string> {
  const { rows } = await pool.query(
    `SELECT fzatcafilepath FROM dbo.tblzatcafile WHERE fcoid = $1`,
    [coId]
  );
  return String(rows[0]?.fzatcafilepath ?? "").trim();
}

/* =========================================================
   THE XML FILE: <root>/<any folder>/<document folder>/<doc no>_*.xml
========================================================= */

const subFolders = async (dir: string): Promise<string[]> => {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  return entries.filter((e) => e.isDirectory()).map((e) => path.join(dir, e.name));
};

const norm = (s: string): string => s.trim().replace(/\s+/g, " ").toLowerCase();

// The VB form looked exactly two levels down (<root>/<any>/<folder>/*.xml). This one looks
// down to 4 levels, ignores upper/lower case and extra spaces in the folder name, and takes
// a file when its name starts with the document no. (followed by "_", "-", "." or the end).
const MAX_DEPTH = 4;

type XmlHit = { xmlPath: string; xmlName: string; baseName: string };

const findXml = async (
  root: string,
  folder: string,
  docNo: string
): Promise<{ hit: XmlHit | null; seen: string[]; xmlCount: number; tree: string[] }> => {
  const wanted = norm(folder);
  const seen: string[] = [];
  const tree: string[] = []; // the folders visited (for the error message)
  let xmlCount = 0;

  const startsWithDoc = (file: string): boolean => {
    const base = path.parse(file).name;
    if (!base.toLowerCase().startsWith(docNo.toLowerCase())) return false;
    const next = base.charAt(docNo.length);
    return next === "" || next === "_" || next === "-" || next === ".";
  };

  const walk = async (dir: string, depth: number, inFolder: boolean): Promise<XmlHit | null> => {
    if (inFolder) {
      for (const file of await fs.readdir(dir)) {
        if (!file.toLowerCase().endsWith(".xml")) continue;
        xmlCount += 1;
        if (startsWithDoc(file)) {
          return { xmlPath: path.join(dir, file), xmlName: file, baseName: path.parse(file).name };
        }
      }
    }
    if (depth >= MAX_DEPTH) return null;

    for (const sub of await subFolders(dir)) {
      const name = path.basename(sub);
      if (depth === 0 && norm(name) === "pdf") continue; // the output folder
      if (tree.length < 25) tree.push(path.relative(root, sub));
      if (norm(name) === wanted) seen.push(sub);
      const found = await walk(sub, depth + 1, inFolder || norm(name) === wanted);
      if (found) return found;
    }
    return null;
  };

  const hit = await walk(root, 0, false);
  return { hit, seen, xmlCount, tree };
};

/* =========================================================
   THE DATA of the document (the print procedures)
========================================================= */

let cursorSeq = 0;

const callCursor = async (sql: string, params: unknown[]): Promise<DataRow[]> => {
  const client: PoolClient = await pool.connect();
  const cursor = `zatcapdfa3_${process.pid}_${++cursorSeq}`;

  try {
    await client.query("BEGIN");
    await client.query(sql, [...params, cursor]);
    const { rows } = await client.query(`FETCH ALL FROM "${cursor}"`);
    await client.query("COMMIT");
    return rows;
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {
      /* ignore */
    }
    throw error;
  } finally {
    client.release();
  }
};

const lit = (v: string): string => `'${v.replace(/'/g, "''")}'`;

const fetchRows = async (spec: DocSpec, d: ExportDocInput): Promise<DataRow[]> => {
  if (spec.source === "sir" || spec.source === "srr") {
    const proc = spec.source === "sir" ? "sp_rptsirtaxinvoiceprint" : "sp_rptsrrtaxinvoiceprint";
    return callCursor(
      `CALL dbo.${proc}($1::varchar, $2::varchar, $3::varchar, $4::varchar, $5::varchar, $6::refcursor)`,
      [d.coId, d.year, d.branchId, d.docType, d.docNo]
    );
  }

  // credit / debit notes: the procedure takes the filter text (values escaped here)
  const filter = [
    `fcoid = ${lit(d.coId)}`,
    `fyear = ${lit(d.year)}`,
    `fbrid = ${lit(d.branchId)}`,
    `fdoctype = ${lit(d.docType)}`,
    `fdocno = ${lit(d.docNo)}`,
    `forigin = 'UI'`,
  ].join(" AND ");
  const proc = spec.source === "cn" ? "sp_rpttaxcnprint" : "sp_rpttaxdnprint";

  return callCursor(
    `CALL dbo.${proc}($1::varchar, $2::varchar, $3::refcursor)`,
    [d.docType, filter]
  );
};

/* =========================================================
   QR CODE (inline SVG) and LOGO
========================================================= */

const qrSvg = (text: string): string => {
  const qr = QRCode.create(text, { errorCorrectionLevel: "M" });
  const n = qr.modules.size;
  const data = qr.modules.data;
  let d = "";
  for (let y = 0; y < n; y += 1) {
    for (let x = 0; x < n; x += 1) {
      if (data[y * n + x]) d += `M${x} ${y}h1v1h-1z`;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n} ${n}" shape-rendering="crispEdges"><rect width="${n}" height="${n}" fill="#fff"/><path d="${d}" fill="#000"/></svg>`;
};

// Application.StartupPath\Images\HeaderLogo.jpg of the VB form; set ZATCA_LOGO_PATH to change
let logoCache: string | null = null;
const logoDataUri = async (): Promise<string> => {
  if (logoCache !== null) return logoCache;
  const file = process.env.ZATCA_LOGO_PATH ?? path.join(process.cwd(), "Images", "HeaderLogo.jpg");
  try {
    const bytes = await fs.readFile(file);
    logoCache = `data:image/jpeg;base64,${bytes.toString("base64")}`;
  } catch {
    logoCache = ""; // no logo: the picture box stays empty, like the VB form
  }
  return logoCache;
};

/* =========================================================
   THE PDF
========================================================= */

let browserPromise: Promise<Browser> | null = null;

const getBrowser = (): Promise<Browser> => {
  if (!browserPromise) {
    browserPromise = puppeteer
      .launch({
        headless: true,
        // set ZATCA_PDF_NO_SANDBOX=1 when the server runs as root / in a container
        args: process.env.ZATCA_PDF_NO_SANDBOX ? ["--no-sandbox", "--disable-setuid-sandbox"] : [],
      })
      .catch((error) => {
        browserPromise = null;
        throw error;
      });
  }
  return browserPromise;
};

export const closeZatcaPdfBrowser = async (): Promise<void> => {
  if (!browserPromise) return;
  const b = await browserPromise;
  browserPromise = null;
  await b.close();
};

const htmlToPdf = async (html: string): Promise<Uint8Array> => {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.emulateMediaType("print");
    await page.setContent(html, { waitUntil: "load" });
    return await page.pdf({ preferCSSPageSize: true, printBackground: true });
  } finally {
    await page.close();
  }
};

/* =========================================================
   ONE DOCUMENT
========================================================= */

export async function exportZatcaPdfA3Document(
  root: string,
  d: ExportDocInput
): Promise<ExportDocResult> {
  const result = (ok: boolean, message: string, file?: string): ExportDocResult => ({
    docNo: d.docNo,
    docType: d.docType,
    ok,
    message,
    file,
  });

  try {
    // the VB routine has a branch for "DNSIR" (rptSIRTaxDNPrint); that layout was not given
    if (d.origDocType === "DNSIR") {
      return result(false, "Debit note against a sales invoice (DNSIR) is not supported yet");
    }

    const spec = SPECS[d.docType];
    if (!spec) return result(false, `Document type '${d.docType}' has no PDF/A3 layout`);

    let xml: XmlHit;
    if (d.xmlPath) {
      xml = {
        xmlPath: d.xmlPath,
        xmlName: path.basename(d.xmlPath),
        baseName: path.parse(d.xmlPath).name,
      };
    } else {
      const found = await findXml(root, spec.folder, d.docNo);
      if (!found.hit) {
        const where =
          found.seen.length === 0
            ? `no folder named '${spec.folder}' under ${root}. Folders found: ${
                found.tree.length ? found.tree.join(" | ") : "(none)"
              }`
            : `${found.xmlCount} xml file(s) in ${found.seen.length} '${spec.folder}' folder(s), none starts with ${d.docNo}`;
        return result(false, `XML file not found: ${where}`);
      }
      xml = found.hit;
    }

    const rows = await fetchRows(spec, d);
    if (rows.length === 0) return result(false, "Document data not found");

    const layout = LAYOUTS[spec.layout];

    const overrides: Record<string, string> = {
      ...CAPTIONS,
      ...(spec.source === "sir" || spec.source === "srr" ? INVOICE_CAPTIONS : {}),
      lblHeading: spec.heading,
      ...(spec.invoiceType ? { lblInvoiceType1: spec.invoiceType } : {}),
    };

    const html = buildDocumentHtml(layout, rows, {
      title: xml.baseName,
      overrides,
      qrSvg,
      logoDataUri: await logoDataUri(),
    });

    const pdf = await PDFDocument.load(await htmlToPdf(html));

    // "Page x of y" of the document (the page count is known only now)
    const box = pageLabelBox(layout);
    if (box) {
      const font = await pdf.embedFont(StandardFonts.Helvetica);
      const pages = pdf.getPages();
      pages.forEach((p, i) => {
        p.drawText(`Page ${i + 1} of ${pages.length}`, {
          x: box.x,
          y: p.getHeight() - box.top - box.h / 2 - box.size * 0.35,
          size: box.size,
          font,
          color: rgb(0, 0, 0),
        });
      });
    }

    // the signed XML travels inside the PDF
    const now = new Date();
    await pdf.attach(await fs.readFile(xml.xmlPath), xml.xmlName, {
      mimeType: "application/xml",
      description: "ZATCA e-invoice XML",
      creationDate: now,
      modificationDate: now,
      afRelationship: AFRelationship.Alternative,
    });
    pdf.setTitle(xml.baseName);

    const outDir = path.join(root, "PDF", spec.folder);
    await fs.mkdir(outDir, { recursive: true });
    const outFile = path.join(outDir, `${xml.baseName}.pdf`);
    await fs.writeFile(outFile, await pdf.save());

    return result(true, "Exported", outFile);
  } catch (error) {
    console.error(`exportZatcaPdfA3Document ${d.docType} ${d.docNo} error:`, error);
    return result(false, error instanceof Error ? error.message : String(error));
  }
}
