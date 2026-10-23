import { Response } from "express";

import type { AuthenticatedRequest } from "../../middleware/authMiddleware.js";
import { UserAudit } from "../../utils/UserAudit.js";
import { validateAdministrationDocument } from "../../validators/DocumentValidator.js";
import {
  getAdministrationDocumentService,
  saveAdministrationDocumentService,
  buildAdministrationDocumentMessage,
  type AdministrationDocumentRowPayload,
} from "../../services/Administration/documentService.js";
import {
  mapRows,
  moduleListKeys,
  administrationDocumentGridKeys,
} from "../../utils/responseKeys.js";

// Administration is not a row of dbo.tblmenu (it is added to the menu for the
// administrator only), so there are no button rights to check: the screen is for
// the admin user (userType AU) alone
const SCREEN_NAME = "Document";

const messageOf = (error: unknown, fallback: string): string =>
  error instanceof Error ? error.message : fallback;

const reject = (
  res: Response,
  status: number,
  message: string,
  field?: string
): Response =>
  res.status(status).json({
    success: false,
    message,
    ...(field ? { field } : {}),
  });

const ADMIN_ONLY = "Only the administrator can maintain the Documents.";

/* =========================================================
   GET DOCUMENT: the modules (the Module dropdown) and the documents of the
   chosen module (the grid). With no lkpModule the first module is used.
========================================================= */

export const getDocument = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    const { PstrCoID, lkpModule } = req.query;

    if (!PstrCoID) {
      return reject(res, 400, "Company ID is required");
    }

    if (!req.user) {
      return reject(res, 401, "Authentication required");
    }

    if (req.user.userType !== "AU") {
      return reject(res, 403, ADMIN_ONLY);
    }

    const result = await getAdministrationDocumentService(
      String(PstrCoID),
      lkpModule ? String(lkpModule) : null
    );

    return res.status(200).json({
      success: true,
      modules: mapRows(result.modules, moduleListKeys),
      lkpModule: result.lkpModule,
      data: mapRows(result.documents, administrationDocumentGridKeys),
    });
  } catch (error: unknown) {
    console.error("getDocument (administration) error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load the Documents",
      error: messageOf(error, String(error)),
    });
  }
};

/* =========================================================
   SAVE / MODIFY DOCUMENT (the Save / Modify button)
   The page sends the new rows, the saved rows it changed, and the documents the
   user took out of the list (deletedRows): those are deleted only here.
   The logged-in user comes from the SESSION, not from the request body.
========================================================= */

export const saveDocument = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    const {
      PstrCoID,
      PstrYear = null,
      lkpModule,
      rows = [],
      deletedRows = [],
    }: {
      PstrCoID: string;
      PstrYear?: string | null;
      lkpModule: string;
      rows: AdministrationDocumentRowPayload[];
      deletedRows?: { txtDocType: string }[];
    } = req.body;

    if (!PstrCoID) {
      return reject(res, 400, "Company ID is required");
    }

    if (!req.user) {
      return reject(res, 401, "Authentication required");
    }

    if (req.user.userType !== "AU") {
      return reject(res, 403, ADMIN_ONLY);
    }

    const PstrUserID = req.user.userId;

    // validators/DocumentValidator.ts: idle user, company, module,
    // then every row and the unique Document Type / Document name - the first
    // rule that fails stops the save
    const check = await validateAdministrationDocument({
      PstrCoID,
      PstrUserID,
      lkpModule,
      rows,
      deletedRows,
    });

    if (!check.valid) {
      return reject(res, check.status, check.message, check.field);
    }

    const saved = await saveAdministrationDocumentService({
      PstrCoID,
      PstrUserID,
      lkpModule: String(lkpModule).trim(),
      rows,
      deletedRows,
    });

    // =====================================================
    // USER AUDIT (only after the save has actually succeeded): one row for each
    // document that was added, changed or deleted
    // =====================================================

    for (const entry of saved) {
      try {
        await UserAudit(
          PstrCoID,
          PstrYear && /^\d+$/.test(String(PstrYear)) ? String(PstrYear) : null,
          null,
          null,
          null,
          SCREEN_NAME,
          entry.mode,
          PstrUserID,
          entry.note
        );
      } catch (auditError: unknown) {
        // the documents are already saved - don't fail the request over an
        // audit-logging problem, just log it
        console.error("UserAudit error (saveDocument):", auditError);
      }
    }

    return res.status(200).json({
      success: true,
      message: buildAdministrationDocumentMessage(saved),
      count: saved.length,
    });
  } catch (error: unknown) {
    console.error("saveDocument error:", error);

    return reject(res, 400, messageOf(error, "Not Saved,try again"));
  }
};
