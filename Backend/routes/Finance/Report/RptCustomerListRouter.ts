// routes/Finance/Report/RptCustomerListRouter.ts
import { Router } from "express";
import {
  getTree,
  getPrintData,
} from "../../../controller/Finance/Report/RptCustomerListController.js";

const router = Router();

router.get("/", getTree);              // the customer tree
router.post("/print", getPrintData);   // rows for the printed report

export default router;

