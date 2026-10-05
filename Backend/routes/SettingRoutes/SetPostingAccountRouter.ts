import express from "express";

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
router.post("/savePostingAccount", savePostingAccount);

export default router;
