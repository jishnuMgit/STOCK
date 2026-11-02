import { Router } from "express";
import {
  getMatchAccounts,
  getMatchedTransactions,
  getMatchReversalLookups,
  unmatchTransactions,
} from "../../../controller/Finance/Transaction/MatchReversalController.js";
import { authenticate } from "../../../middleware/authMiddleware.js";

const router = Router();

router.use(authenticate);
// Dropdown data (document types)
router.get("/getLookups", getMatchReversalLookups);

// Load matched lines of a document (GetTL)
router.post("/getMatchedTransactions", getMatchedTransactions);

// Un-match the selected lines (mode 'U')
router.post("/unmatch", unmatchTransactions);

// Matched documents list for the Document No. dropdown (mode 'GM')
router.post("/getMatchAccounts", getMatchAccounts);

export default router;
