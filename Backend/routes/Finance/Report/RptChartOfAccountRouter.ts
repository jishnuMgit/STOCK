// routes/rptChartOfAccountRouter.ts
import { Router } from "express";
import {
  getTree,
  getPrintData,
  getExcel,
} from "../../../controller/Finance/Report/RptChartOfAccountController.js";

const router = Router();

router.get("/", getTree);              // the account tree
router.post("/print", getPrintData);   // rows for the preview, the printer and the PDF
router.post("/excel", getExcel);       // the .xlsx file

export default router;
