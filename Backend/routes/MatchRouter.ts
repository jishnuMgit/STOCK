import express from "express";
import {
  getCSaccounts,
  GetData,
  getDocumentsToMatchController,
  saveMatch,
  getMatchDate,
} from "../controller/MatchController.js";
import { authenticate } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(authenticate);

router.get("/getCSAccounts", getCSaccounts);
router.post("/getMatchAccounts", GetData);
router.post("/getDocumentsToMatch", getDocumentsToMatchController);
router.post("/saveMatch", saveMatch);
router.post("/getMatchDate", getMatchDate);

export default router;
