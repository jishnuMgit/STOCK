import express from "express";

import {
  getCompanyList,
  getCompanyDetails,
  saveCompanyDetails,
} from "../../controller/SettingController/SetcompanyinfoController.js";

const router = express.Router();

router.get("/getCompanyList", getCompanyList);
router.post("/getCompanyDetails", getCompanyDetails);
router.post("/saveCompanyDetails", saveCompanyDetails);

export default router;
