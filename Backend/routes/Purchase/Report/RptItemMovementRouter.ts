// routes/Purchase/Report/RptItemMovementRouter.ts
// Mounted as /RptItemMovement in routes/index.ts. Every route is behind the session check: the company, the user and
// the branches the user may use come from WHO is logged in.
import { Router } from "express";

import { authenticate } from "../../../middleware/authMiddleware.js";
import {
  getLookups,
  getPrintData,
  getExcel,
} from "../../../controller/Purchase/Report/RptItemMovementController.js";

const router = Router();

router.get("/lookups", authenticate, getLookups); // branches, default branch, items
router.post("/print", authenticate, getPrintData); // data for the preview, the printer and the PDF
router.post("/excel", authenticate, getExcel); // the .xlsx file

export default router;
