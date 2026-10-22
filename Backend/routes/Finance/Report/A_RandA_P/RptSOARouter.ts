// routes/Finance/Report/RptSOARouter.ts
import { Router } from "express";
import {
  getBranchList,
  getAccountList,
  getDivisionList,
  getPrintData,
  getExcel,
} from "../../../../controller/Finance/Report/A_RandA_P/RptSOAController.js";

const router = Router();

router.get("/branches", getBranchList);              // lkpBranch
router.get("/accounts", getAccountList);             // customer / supplier ID + name lookups
router.get("/divisions/:accountId", getDivisionList); // divisions of one account
router.post("/print", getPrintData);                 // rows for the preview, the printer and the PDF
router.post("/excel", getExcel);                     // the .xlsx file

export default router;


