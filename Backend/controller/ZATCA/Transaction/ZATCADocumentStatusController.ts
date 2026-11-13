import { Response } from "express";

import type { AuthenticatedRequest } from "../../../middleware/authMiddleware.js";
import { validateZATCADocumentStatus } from "../../../validators/ZATCADocumentStatusValidator.js";
import {
  getZATCADocumentStatusService,
  getZATCAStatusBranchListService,
  getZATCAStatusCompanyNameService,
  type ZatcaDocStatusParams,
  type ZatcaDocStatusResult,
} from "../../../services/ZATCA/Transaction/zatcaDocumentStatusService.js";
import { buildZatcaDocumentStatusWorkbook } from "../../../services/ZATCA/Transaction/zatcaDocumentStatusExcel.js";

const errorText = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

// the company comes from the query when the page sends it, else from the session
const coIdOf = (req: AuthenticatedRequest): string =>
  String(req.query.PstrCoID ?? req.body?.PstrCoID ?? req.user?.CoID ?? "").trim();

const pad = (n: number) => String(n).padStart(2, "0");
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// the old objCommon.ReportInfo: "<user>  dd/mm/yyyy hh:mm" - bottom right of every page
const reportInfoOf = (userId: string): string => {
  const d = new Date();

  return `${userId}  ${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

// DD/MM/YYYY -> DD-MMM-YYYY
const dmmy = (s: string): string => `${s.slice(0, 2)}-${MONTHS[Number(s.slice(3, 5)) - 1]}-${s.slice(6)}`;

/* =========================================================
   GET BRANCH LIST (the Branch box) - only the branches the logged-in user
   has a right to; the user comes from the SESSION
========================================================= */

export const getBranchList = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    const coId = coIdOf(req);

    if (!coId) {
      return res.status(400).json({ success: false, message: "Company ID is required" });
    }
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    const data = await getZATCAStatusBranchListService(coId, req.user.userId);

    return res.status(200).json({ success: true, data });
  } catch (error: unknown) {
    console.error("getBranchList (zatca document status) error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load branch list",
      error: errorText(error),
    });
  }
};

/* =========================================================
   THE CHECKS AND THE DATA of Print Preview / Print / PDF and Excel -
   one place, so the file always matches what the preview shows
========================================================= */

type PreparedReport =
  | {
      ok: true;
      report: ZatcaDocStatusResult;
      coName: string;
      heading: string;
      branchLabel: string;
      reportInfo: string;
      fileBase: string;
    }
  | { ok: false; status: number; body: Record<string, unknown> };

const prepareReport = async (req: AuthenticatedRequest): Promise<PreparedReport> => {
  const stop = (status: number, message: string): PreparedReport => ({
    ok: false,
    status,
    body: { success: false, message },
  });

  const coId = coIdOf(req);

  if (!coId) return stop(400, "Company ID is required");
  if (!req.user) return stop(401, "Authentication required");

  const b = req.body ?? {};
  const params: ZatcaDocStatusParams = {
    coId,
    branchMode: b.branchMode === "one" ? "one" : "all",
    branchId: b.branchMode === "one" ? (b.branchId ?? null) : null,
    clearType: Number(b.clearType) === 0 ? 0 : 1,
    fromDate: String(b.fromDate ?? "").trim(),
    toDate: String(b.toDate ?? "").trim(),
    dateType: Number(b.dateType) === 0 ? 0 : Number(b.dateType) === 2 ? 2 : 1,
    excludeInterCompany: b.excludeInterCompany !== false,
  };

  const invalid = validateZATCADocumentStatus(params);
  if (invalid) return stop(400, invalid);

  // the branch must be one the user has a right to
  let branchLabel = "";
  if (params.branchMode === "one") {
    const branches = await getZATCAStatusBranchListService(coId, req.user.userId);
    const found = branches.find((x) => x.fbrid === params.branchId);
    if (!found) return stop(403, "You do not have permission to this branch.");
    branchLabel = `Branch : ${found.fbrname}`;
  }

  const report = await getZATCADocumentStatusService(params);
  if (report.rows.length === 0) return stop(404, "No documents found");

  // date + time, so a new download never has the name of a file that is
  // still open (Acrobat / Excel lock the file)
  const d = new Date();
  const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  const safe = (v: string) => v.replace(/[^A-Za-z0-9_-]/g, "_");
  const fileBase = `ZATCADocumentStatus_${params.clearType === 0 ? "Cleared" : "NotCleared"}_${
    params.branchMode === "one" ? safe(String(params.branchId ?? "")) : "AllBranches"
  }_${stamp}`;

  return {
    ok: true,
    report,
    coName: await getZATCAStatusCompanyNameService(coId),
    heading: `ZATCA Document Status (${params.clearType === 0 ? "Cleared" : "Not Cleared"}) For The Period ${dmmy(params.fromDate)} To ${dmmy(params.toDate)}`,
    branchLabel,
    reportInfo: reportInfoOf(req.user.userId),
    fileBase,
  };
};

/* =========================================================
   REPORT (Print Preview, Print and PDF) - the rows + totals + the heading details
========================================================= */

export const getZATCADocumentStatus = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    const prepared = await prepareReport(req);

    if (!prepared.ok) {
      return res.status(prepared.status).json(prepared.body);
    }

    return res.status(200).json({
      success: true,
      data: {
        coName: prepared.coName,
        heading: prepared.heading,
        branchLabel: prepared.branchLabel,
        reportInfo: prepared.reportInfo,
        rows: prepared.report.rows,
        totals: prepared.report.totals,
        fileBase: prepared.fileBase,
      },
    });
  } catch (error: unknown) {
    console.error("getZATCADocumentStatus error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load report",
      error: errorText(error),
    });
  }
};

/* =========================================================
   EXCEL ZATCA DOCUMENT STATUS (Download in the Print Preview, Excel)
   The same body and the same checks as the report; answers with the .xlsx file.
========================================================= */

export const downloadZATCADocumentStatusExcel = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    const prepared = await prepareReport(req);

    if (!prepared.ok) {
      return res.status(prepared.status).json(prepared.body);
    }

    const buffer = await buildZatcaDocumentStatusWorkbook({
      report: prepared.report,
      coName: prepared.coName,
      heading: prepared.heading,
      branchLabel: prepared.branchLabel,
      reportInfo: prepared.reportInfo,
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", `attachment; filename="${prepared.fileBase}.xlsx"`);
    res.setHeader("Access-Control-Expose-Headers", "Content-Disposition");

    return res.status(200).send(buffer);
  } catch (error: unknown) {
    console.error("downloadZATCADocumentStatusExcel error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create the ZATCA Document Status Excel file",
      error: errorText(error),
    });
  }
};
