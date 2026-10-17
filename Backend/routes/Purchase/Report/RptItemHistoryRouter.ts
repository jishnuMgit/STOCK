// routes/Stock/Report/RptItemHistoryRouter.ts
import { Router } from "express";
import {
  getLookups,
  getPrintData,
} from "../../../controller/Purchase/Report/RptItemHistoryController.js";

const router = Router();

router.get("/lookups", getLookups);    // the user's branches + the items
router.post("/print", getPrintData);   // rows for the printed report

export default router;


