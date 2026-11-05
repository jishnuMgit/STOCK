import { Router } from "express";
import {
  getExcel,
  getMatchEnquiry,
  getMatchEnquiryDivisions,
  getMatchEnquiryDocumentNos,
  getMatchEnquiryLookups,
  getPrintData,
} from "../../../controller/Finance/Transaction/MatchEnquiryController.js";
import { authenticate } from "../../../middleware/authMiddleware.js";

const router = Router();

router.use(authenticate);

// Dropdown data: the document types and the customers (by id and by name)
router.get("/getLookups", getMatchEnquiryLookups);

// The divisions of the chosen customer
router.post("/getDivisions", getMatchEnquiryDivisions);

// The Document No. list (the Search button)
router.post("/getDocumentNos", getMatchEnquiryDocumentNos);

// Parent / child matched lines of a document
router.post("/getMatchEnquiry", getMatchEnquiry);

// The printed report (Print Preview / printer / PDF) and its Excel file
router.post("/print", getPrintData);
router.post("/excel", getExcel);

export default router;
