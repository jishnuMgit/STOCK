import express from "express";

import { authenticate } from "../../../middleware/authMiddleware.js";
import {
  getBranchList,
  getAccountList,
  getBeginningBalance,
  saveBeginningBalance,
  deleteBeginningBalance,
  postBeginningBalance,
  printBeginningBalance,
  downloadBeginningBalanceExcel,
} from "../../../controller/Finance/Transaction/BeginningBalanceController.js";

const router = express.Router();

// behind the session check: the branches shown, and the rights, depend on WHO is
// logged in
router.get("/getBranchList", authenticate, getBranchList);
router.get("/getAccountList", authenticate, getAccountList);
router.get("/getBeginningBalance", authenticate, getBeginningBalance);
// POSTs: the lines travel in the body
router.post("/saveBeginningBalance", authenticate, saveBeginningBalance);
router.post("/deleteBeginningBalance", authenticate, deleteBeginningBalance);
router.post("/postBeginningBalance", authenticate, postBeginningBalance);
// a POST: the page asks for the data itself
router.post("/printBeginningBalance", authenticate, printBeginningBalance);
// the same body: the Excel file of the Print Preview
router.post("/downloadBeginningBalanceExcel", authenticate, downloadBeginningBalanceExcel);

export default router;
