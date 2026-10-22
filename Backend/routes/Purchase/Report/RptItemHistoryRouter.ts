// routes/Stock/Report/RptItemHistoryRouter.ts
import { Router } from "express";
import {
  getLookups,
  getPrintData,
  getExcel,
} from "../../../controller/Purchase/Report/RptItemHistoryController.js";

const router = Router();

router.get("/lookups", getLookups);    // the user's branches + the items
router.post("/print", getPrintData);   // data for the preview, the printer and the PDF
router.post("/excel", getExcel);       // the .xlsx file

export default router;


