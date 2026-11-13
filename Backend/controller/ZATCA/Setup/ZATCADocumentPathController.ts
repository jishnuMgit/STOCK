import { Response } from "express";

import type { AuthenticatedRequest } from "../../../middleware/authMiddleware.js";
import { validateZATCAFilePath } from "../../../validators/ZATCADocumentPathValidator.js";
import {
  browseServerFoldersService,
  getZATCAFilePathService,
  saveZATCAFilePathService,
} from "../../../services/ZATCA/Setup/zatcaDocumentPathService.js";

const errorText = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

// the company comes from the query when the page sends it, else from the session
const coIdOf = (req: AuthenticatedRequest): string =>
  String(req.query.PstrCoID ?? req.body?.PstrCoID ?? req.user?.CoID ?? "").trim();

/* =========================================================
   GET FILE PATH (page load / Cancel) - the saved path of the company
========================================================= */

export const getZATCAFilePath = async (
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

    const data = await getZATCAFilePathService(coId);

    return res.status(200).json({ success: true, data });
  } catch (error: unknown) {
    console.error("getZATCAFilePath error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load ZATCA file path",
      error: errorText(error),
    });
  }
};

/* =========================================================
   SAVE FILE PATH (the Save / Modify button) - insert when the company has
   no row yet, update when it has
========================================================= */

export const saveZATCAFilePath = async (
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

    const filePath: string = req.body?.filePath;
    const invalid = validateZATCAFilePath(filePath);
    if (invalid) {
      return res.status(400).json({ success: false, message: invalid });
    }

    const { mode } = await saveZATCAFilePathService(coId, req.user.userId, filePath);

    return res.status(200).json({
      success: true,
      message: mode === "S" ? "Saved" : "Modified",
      data: { mode },
    });
  } catch (error: unknown) {
    console.error("saveZATCAFilePath error:", error);
    return res.status(500).json({
      success: false,
      message: "Not Saved, try again",
      error: errorText(error),
    });
  }
};

/* =========================================================
   BROWSE FOLDERS (the "..." button) - sub-folders of a folder on the server
========================================================= */

export const browseFolders = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response> => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    const data = await browseServerFoldersService(
      typeof req.query.path === "string" ? req.query.path : ""
    );

    return res.status(200).json({ success: true, data });
  } catch (error: unknown) {
    console.error("browseFolders (zatca document path) error:", error);
    return res.status(400).json({
      success: false,
      message: "Cannot open this folder",
      error: errorText(error),
    });
  }
};
