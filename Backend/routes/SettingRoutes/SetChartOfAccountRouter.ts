import express from "express";

import { authenticate } from "../../middleware/authMiddleware.js";

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
// behind the session check: save / delete need to know WHO is acting (rights)
router.post("/saveChartOfAccount", authenticate, saveChartOfAccount);
router.delete("/deleteChartOfAccountRow", authenticate, deleteChartOfAccountRow);

export default router;
