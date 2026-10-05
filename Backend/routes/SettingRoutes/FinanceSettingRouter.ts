import express from "express";

import {
  getParameterList,
  getAccountList,
  getFinSetting,
  saveFinSetting,
  deleteFinSettingRow,
} from "../../controller/SettingController/FinanceSettingController.js";

const router = express.Router();

router.get("/getParameterList", getParameterList);
router.get("/getAccountList", getAccountList);
router.get("/getFinSetting", getFinSetting);
router.post("/saveFinSetting", saveFinSetting);
router.delete("/deleteFinSettingRow", deleteFinSettingRow);

export default router;
