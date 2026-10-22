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
// a POST: the print page asks for the data itself
router.post("/printBeginningBalance", authenticate, printBeginningBalance);

export default router;
