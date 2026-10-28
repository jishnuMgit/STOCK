import express from "express";

import { authenticate } from "../../../middleware/authMiddleware.js";
import {
  getLookups,
  getPrintData,
  getExcel,
} from "../../../controller/Purchase/Report/RptStockAgeingController.js";

const router = express.Router();

router.get("/lookups", authenticate, getLookups); // branches of the user, the default one, items, ageing modes
router.post("/print", authenticate, getPrintData); // data for the preview, the printer and the PDF
router.post("/excel", authenticate, getExcel); // the .xlsx file

export default router;
