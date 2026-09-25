import express from "express";

import {
  getYearList,
  getBranchList,
  getModuleList,
  getDocumentList,
  getDocumentNoList,
  saveDocumentNo,
  deleteDocumentNoRow,
  getDefaultBranch,
} from "../controller/SetdocumentnoController.js";

const router = express.Router();

router.get("/getYearList", getYearList);
router.get("/getBranchList", getBranchList);
router.get("/getDefaultBranch", getDefaultBranch);
router.get("/getModuleList", getModuleList);
router.get("/getDocumentList", getDocumentList);
router.get("/getDocumentNoList", getDocumentNoList);
router.post("/saveDocumentNo", saveDocumentNo);
router.delete("/deleteDocumentNoRow", deleteDocumentNoRow);

export default router;
