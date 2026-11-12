import express from "express";

import { authenticate } from "../../../middleware/authMiddleware.js";
import {
  getBranchList,
  getCustomerList,
  getCustomerNameList,
  getDocumentTypeList,
  searchZATCASubmission,
  submitZATCASubmission,
} from "../../../controller/ZATCA/Transaction/ZATCASubmissionController.js";

const router = express.Router();
router.get("/getBranchList", authenticate, getBranchList);
router.get("/getCustomerList", authenticate, getCustomerList);
router.get("/getCustomerNameList", authenticate, getCustomerNameList);
router.get("/getDocumentTypeList", authenticate, getDocumentTypeList);
router.post("/searchZATCASubmission", authenticate, searchZATCASubmission);
router.post("/submitZATCASubmission", authenticate, submitZATCASubmission);

export default router;
