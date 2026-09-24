import express from "express";

import {
  getYearList,
  getBranchList,
  getModuleList,
  getDocumentList,
  getDocumentNoList,
  saveDocumentNo,
} from "../controller/SetdocumentnoController.js";

const router = express.Router();

router.get("/getYearList", getYearList);
router.get("/getBranchList", getBranchList);
router.get("/getModuleList", getModuleList);
router.get("/getDocumentList", getDocumentList);
router.get("/getDocumentNoList", getDocumentNoList);
router.post("/saveDocumentNo", saveDocumentNo);

export default router;
