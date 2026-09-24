import express from "express";

import {
  getYearList,
  getBranchList,
  getModuleList,
} from "../controller/SetdocumentnoController.js";

const router = express.Router();

router.get("/getYearList", getYearList);
router.get("/getBranchList", getBranchList);
router.get("/getModuleList", getModuleList);

export default router;
