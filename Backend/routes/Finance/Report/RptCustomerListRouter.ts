// routes/Finance/Report/RptCustomerListRouter.ts
import { Router } from "express";
import {
  getTree,
  getPrintData,
  getExcel,
} from "../../../controller/Finance/Report/RptCustomerListController.js";

const router = Router();

router.get("/", getTree);              // the customer tree
router.post("/print", getPrintData);   // rows for the preview, the printer and the PDF
router.post("/excel", getExcel);       // the .xlsx file

export default router;
