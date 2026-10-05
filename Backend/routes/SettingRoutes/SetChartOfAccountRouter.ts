import express from "express";

import {
  getParameterList,
  getAccountList,
  getChartOfAccount,
  saveChartOfAccount,
  deleteChartOfAccountRow,
} from "../../controller/SettingController/SetChartOfAccountController.js";

const router = express.Router();

router.get("/getParameterList", getParameterList);
router.get("/getAccountList", getAccountList);
router.get("/getChartOfAccount", getChartOfAccount);
router.post("/saveChartOfAccount", saveChartOfAccount);
router.delete("/deleteChartOfAccountRow", deleteChartOfAccountRow);

export default router;
