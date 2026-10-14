// routes/rptChartOfAccountRouter.ts
import { Router } from "express";
import {
  getTree,
  getPrintData,
} from "../../../controller/Finance/Report/RptChartOfAccountController.js";

const router = Router();

router.get("/", getTree);              // the account tree
router.post("/print", getPrintData);   // rows for the printed report

export default router;


