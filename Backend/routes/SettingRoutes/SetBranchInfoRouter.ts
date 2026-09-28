import express from "express";

import {
  getBranchList,
  getDefaultBranch,
  getBranchInfo,
  saveBranchInfo,
} from "../../controller/SettingController/SetBranchInfoController.js";

const router = express.Router();

router.get("/getBranchList", getBranchList);
router.get("/getDefaultBranch", getDefaultBranch);
router.get("/getBranchInfo", getBranchInfo);
router.post("/saveBranchInfo", saveBranchInfo);

export default router;
