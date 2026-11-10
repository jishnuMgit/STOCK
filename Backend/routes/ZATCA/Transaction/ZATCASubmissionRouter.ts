import express from "express";

import { authenticate } from "../../../middleware/authMiddleware.js";
import {
  getBranchList,
  getCustomerList,
  getDocumentTypeList,
  searchZATCASubmission,
  submitZATCASubmission,
} from "../../../controller/ZATCA/Transaction/ZATCASubmissionController.js";

const router = express.Router();

// behind the session check: the branches shown depend on WHO is logged in
router.get("/getBranchList", authenticate, getBranchList);
router.get("/getCustomerList", authenticate, getCustomerList);
router.get("/getDocumentTypeList", authenticate, getDocumentTypeList);
// a POST: the filters travel in the body
router.post("/searchZATCASubmission", authenticate, searchZATCASubmission);
// the ticked documents travel in the body
router.post("/submitZATCASubmission", authenticate, submitZATCASubmission);

export default router;
