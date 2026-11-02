import { Router } from "express";
import {
  getMatchEnquiry,
  getMatchEnquiryLookups,
} from "../../../controller/Finance/Transaction/MatchEnquiryController.js";
import { authenticate } from "../../../middleware/authMiddleware.js";

const router = Router();

router.use(authenticate);

// Dropdown data (document types)
router.get("/getLookups", getMatchEnquiryLookups);

// Parent / child matched lines of a document
router.post("/getMatchEnquiry", getMatchEnquiry);

export default router;
