import express from "express";

import { authenticate } from "../../../middleware/authMiddleware.js";
import {
  getBranchList,
  getAccountList,
} from "../../../controller/Finance/Transaction/BeginningBalanceController.js";

const router = express.Router();

// behind the session check: the branches shown depend on WHO is logged in
router.get("/getBranchList", authenticate, getBranchList);
router.get("/getAccountList", authenticate, getAccountList);

export default router;
