import express from "express";

import {
  getYearList,
  getBranchList,
  getModuleList,
  getDocumentList,
  getDocumentNoList,
  saveDocumentNo,
  deleteDocumentNoRow,
} from "../controller/SetdocumentnoController.js";
import { authenticate } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/getYearList", getYearList);
router.get("/getBranchList", authenticate, getBranchList);
router.get("/getModuleList", getModuleList);
router.get("/getDocumentList", getDocumentList);
router.get("/getDocumentNoList", getDocumentNoList);
router.post("/saveDocumentNo", saveDocumentNo);
router.delete("/deleteDocumentNoRow", deleteDocumentNoRow);

export default router;
