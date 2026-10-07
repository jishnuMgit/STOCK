import express from "express";

import { authenticate } from "../../middleware/authMiddleware.js";

import {
  getYearList,
  getBranchList,
  getModuleList,
  getDocumentList,
  getDocumentNoList,
  saveDocumentNo,
  deleteDocumentNoRow,
  getDefaultBranch,
} from "../../controller/SettingController/SetdocumentnoController.js";

const router = express.Router();

router.get("/getYearList", getYearList);
router.get("/getBranchList", getBranchList);
router.get("/getDefaultBranch", getDefaultBranch);
router.get("/getModuleList", getModuleList);
router.get("/getDocumentList", getDocumentList);
router.get("/getDocumentNoList", getDocumentNoList);
// behind the session check: save / delete need to know WHO is acting (rights)
router.post("/saveDocumentNo", authenticate, saveDocumentNo);
router.delete("/deleteDocumentNoRow", authenticate, deleteDocumentNoRow);

export default router;
