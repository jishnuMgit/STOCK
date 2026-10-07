import express from "express";

import { authenticate } from "../../middleware/authMiddleware.js";

import {
  getBranchList,
  getDefaultBranch,
  getAccountList,
  getPostingAccount,
  savePostingAccount,
} from "../../controller/SettingController/SetPostingAccountController.js";

const router = express.Router();

router.get("/getBranchList", getBranchList);
router.get("/getDefaultBranch", getDefaultBranch);
router.get("/getAccountList", getAccountList);
router.get("/getPostingAccount", getPostingAccount);
// behind the session check: the save needs to know WHO is saving (rights)
router.post("/savePostingAccount", authenticate, savePostingAccount);

export default router;
