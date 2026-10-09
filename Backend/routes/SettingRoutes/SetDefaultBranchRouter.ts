import express from "express";

import { authenticate } from "../../middleware/authMiddleware.js";
import {
  getUserList,
  getBranchList,
  getDefaultBranchList,
  saveDefaultBranch,
} from "../../controller/SettingController/SetDefaultBranchController.js";

const router = express.Router();

// behind the session check: what a user sees depends on WHO is logged in
// (only the user ID ADMIN sees every user)
router.get("/getUserList", authenticate, getUserList);
router.get("/getBranchList", authenticate, getBranchList);
router.get("/getDefaultBranchList", authenticate, getDefaultBranchList);
router.post("/saveDefaultBranch", authenticate, saveDefaultBranch);

export default router;
