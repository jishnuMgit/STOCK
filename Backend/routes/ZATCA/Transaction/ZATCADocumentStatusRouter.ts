import express from "express";

import { authenticate } from "../../../middleware/authMiddleware.js";
import {
  downloadZATCADocumentStatusExcel,
  getBranchList,
  getZATCADocumentStatus,
} from "../../../controller/ZATCA/Transaction/ZATCADocumentStatusController.js";

const router = express.Router();

// behind the session check: the branches shown depend on WHO is logged in
router.get("/getBranchList", authenticate, getBranchList);
// a POST: the filters travel in the body
router.post("/getZATCADocumentStatus", authenticate, getZATCADocumentStatus);
// the same body as above; answers with the .xlsx file
router.post("/downloadZATCADocumentStatusExcel", authenticate, downloadZATCADocumentStatusExcel);

export default router;

// app: app.use("/api/zatca-document-status", zatcaDocumentStatusRouter);
