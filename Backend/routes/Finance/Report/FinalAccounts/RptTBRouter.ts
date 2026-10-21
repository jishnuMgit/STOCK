// routes/Stock/Report/RptTBRouter.ts
import express from "express";
import { authenticate } from "../../../../middleware/authMiddleware.js";
import {
  getLookups,
  getPrintData,
  getExcel,
} from "../../../../controller/Finance/Report/FinalAccounts/RptTBController.js";

const router = express.Router();
//router.use(authenticate);
router.get("/lookups", getLookups); // the user's branches
router.post("/print", getPrintData); // rows + totals for the printed report
router.post("/excel", getExcel); // the same report as an .xlsx file

export default router;

